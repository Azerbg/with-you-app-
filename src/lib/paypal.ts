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
