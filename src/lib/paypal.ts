/**
 * PayPal Orders API v2 helpers — student booking payments
 * Uses PAYPAL_ENV (sandbox | live) to select the base URL.
 * Credentials: PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET (server-only).
 */

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// In-memory access-token cache (per server instance)
let _token: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_token && _token.expiresAt > Date.now() + 60_000) return _token.value;

  const clientId     = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body:    "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);

  const data = await res.json() as { access_token: string; expires_in: number };
  _token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _token.value;
}

/**
 * Create a PayPal order (intent: CAPTURE).
 * @param amountUsd  Charge amount in USD (e.g. 15.00)
 * @param customId   Opaque string stored on the order: "studentId|tutorId|scheduledAt|sessionType"
 * @returns PayPal orderId
 */
export async function createPayPalOrder(params: {
  amountUsd: number;
  customId: string;
}): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method:  "POST",
    headers: {
      Authorization:      `Bearer ${token}`,
      "Content-Type":     "application/json",
      // Idempotency key (max 40 chars, safe chars only)
      "PayPal-Request-Id": `wy-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount:    { currency_code: "USD", value: params.amountUsd.toFixed(2) },
        custom_id: params.customId,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PayPal createOrder failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export interface PayPalCaptureResult {
  orderId:    string;
  status:     string;
  captureId:  string;
  amountUsd:  number;
  customId:   string;
}

/** Capture an approved PayPal order. */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PayPal capture failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as {
    id: string;
    status: string;
    purchase_units: Array<{
      custom_id?: string;
      payments: { captures: Array<{ id: string; amount: { value: string } }> };
    }>;
  };

  const unit    = data.purchase_units[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    orderId:   data.id,
    status:    data.status,
    captureId: capture?.id ?? "",
    amountUsd: parseFloat(capture?.amount?.value ?? "0"),
    customId:  unit?.custom_id ?? "",
  };
}

/** Full refund of a PayPal capture. */
export async function refundPayPalCapture(captureId: string): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${captureId}/refund`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PayPal refund failed: ${JSON.stringify(err)}`);
  }
}

// ─── Vault v3 ─────────────────────────────────────────────────────────────────

/**
 * Create a vault setup token (step 1 of the vault flow).
 * The token is passed to the PayPal JS SDK button so the payer can approve it.
 * Returns the setup token id and the approval URL (SDK handles the redirect).
 */
export async function createVaultSetupToken(params: {
  returnUrl: string;
  cancelUrl: string;
  paypalCustomerId?: string;
}): Promise<{ id: string }> {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {
    payment_source: {
      paypal: {
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        experience_context: {
          return_url:          params.returnUrl,
          cancel_url:          params.cancelUrl,
          brand_name:          "WithYou",
          shipping_preference: "NO_SHIPPING",
        },
      },
    },
  };

  if (params.paypalCustomerId) {
    body.customer = { id: params.paypalCustomerId };
  }

  const res = await fetch(`${PAYPAL_BASE}/v3/vault/setup-tokens`, {
    method:  "POST",
    headers: {
      Authorization:      `Bearer ${token}`,
      "Content-Type":     "application/json",
      "PayPal-Request-Id": `wy-vst-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { debug_id?: string };
    throw new Error(`PayPal createVaultSetupToken failed [${err.debug_id ?? "?"}]: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as { id: string };
  return { id: data.id };
}

/**
 * Exchange an approved vault setup token for a permanent payment token (step 2).
 * Stores the vault in PayPal — no further user interaction needed for future charges.
 */
export interface VaultPaymentToken {
  id:              string; // payment token id — store as providerRef
  customerId:      string; // PayPal customer.id — store for reuse
  payerEmail:      string; // e.g. buyer@example.com — mask before storing
}

export async function createPaymentToken(setupTokenId: string): Promise<VaultPaymentToken> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v3/vault/payment-tokens`, {
    method:  "POST",
    headers: {
      Authorization:      `Bearer ${token}`,
      "Content-Type":     "application/json",
      "PayPal-Request-Id": `wy-vpt-${Date.now()}`,
    },
    body: JSON.stringify({
      payment_source: {
        token: { id: setupTokenId, type: "SETUP_TOKEN" },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { debug_id?: string };
    throw new Error(`PayPal createPaymentToken failed [${err.debug_id ?? "?"}]: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as {
    id:             string;
    customer:       { id: string };
    payment_source: { paypal: { email_address?: string } };
  };

  return {
    id:         data.id,
    customerId: data.customer?.id ?? "",
    payerEmail: data.payment_source?.paypal?.email_address ?? "",
  };
}

/**
 * Delete a vault payment token (removes the saved PayPal account).
 * 404 is treated as success (already deleted).
 */
export async function deletePaymentToken(vaultId: string): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v3/vault/payment-tokens/${vaultId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({})) as { debug_id?: string };
    throw new Error(`PayPal deletePaymentToken failed [${err.debug_id ?? "?"}]: ${JSON.stringify(err)}`);
  }
}

/**
 * Charge a vaulted PayPal account off-session (no user popup needed).
 * Throws "PAYMENT_DECLINED" when the instrument is declined so the caller
 * can surface a clear message to the student.
 */
export interface VaultChargeResult {
  orderId:   string;
  captureId: string;
  amountUsd: number;
}

export async function chargeVaultedPayPal(params: {
  vaultId:      string;
  amountValue:  string; // e.g. "15.00"
  currencyCode: string; // "USD" | "EUR"
  referenceId:  string; // bookingId for idempotency key
}): Promise<VaultChargeResult> {
  const token      = await getAccessToken();
  const requestId  = `wy-vault-${params.referenceId}`;

  // Create order with vault_id — no payer action required for MERCHANT vaults
  const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method:  "POST",
    headers: {
      Authorization:      `Bearer ${token}`,
      "Content-Type":     "application/json",
      "PayPal-Request-Id": requestId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: params.referenceId,
        amount: { currency_code: params.currencyCode, value: params.amountValue },
      }],
      payment_source: {
        paypal: { vault_id: params.vaultId },
      },
    }),
  });

  if (!createRes.ok) {
    const err  = await createRes.json().catch(() => ({})) as { debug_id?: string; details?: { issue: string }[] };
    const isDeclined = err.details?.some(d => d.issue === "INSTRUMENT_DECLINED");
    if (isDeclined) throw new Error("PAYMENT_DECLINED");
    throw new Error(`PayPal vault order failed [${err.debug_id ?? "?"}]: ${JSON.stringify(err.details ?? err)}`);
  }

  const order = await createRes.json() as { id: string; status: string };

  // Some vault orders auto-complete without a separate capture call
  if (order.status === "COMPLETED") {
    return { orderId: order.id, captureId: "", amountUsd: parseFloat(params.amountValue) };
  }

  // Otherwise, explicitly capture
  const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/capture`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!captureRes.ok) {
    const err = await captureRes.json().catch(() => ({})) as { debug_id?: string; details?: { issue: string }[] };
    const isDeclined = err.details?.some(d => d.issue === "INSTRUMENT_DECLINED");
    if (isDeclined) throw new Error("PAYMENT_DECLINED");
    throw new Error(`PayPal vault capture failed [${err.debug_id ?? "?"}]: ${JSON.stringify(err.details ?? err)}`);
  }

  const captured = await captureRes.json() as {
    id: string;
    purchase_units: Array<{
      payments: { captures: Array<{ id: string; amount: { value: string } }> };
    }>;
  };

  const capture = captured.purchase_units[0]?.payments?.captures?.[0];
  return {
    orderId:   order.id,
    captureId: capture?.id ?? "",
    amountUsd: parseFloat(capture?.amount?.value ?? params.amountValue),
  };
}

/** Verify a PayPal webhook signature via the PayPal verification API. */
export async function verifyPayPalWebhook(params: {
  headers: Record<string, string>;
  body:    string;
  webhookId: string;
}): Promise<boolean> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo:         params.headers["paypal-auth-algo"],
      cert_url:          params.headers["paypal-cert-url"],
      transmission_id:   params.headers["paypal-transmission-id"],
      transmission_sig:  params.headers["paypal-transmission-sig"],
      transmission_time: params.headers["paypal-transmission-time"],
      webhook_id:        params.webhookId,
      webhook_event:     JSON.parse(params.body),
    }),
  });

  if (!res.ok) return false;
  const data = await res.json() as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
