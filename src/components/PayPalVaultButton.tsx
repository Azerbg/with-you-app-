"use client";

/**
 * PayPalVaultButton — renders the official PayPal button in vault/tokenize mode.
 *
 * Uses @paypal/react-paypal-js (already installed).
 * The SDK is loaded with vault=true and intent=tokenize so the button saves the
 * PayPal account without an immediate payment.
 *
 * Flow:
 *   1. User clicks the PayPal button.
 *   2. createVaultSetupToken  → POST /api/paypal/setup-token  → returns setup token id.
 *   3. PayPal popup: payer logs in and approves.
 *   4. onApprove({ vaultSetupToken }) → POST /api/paypal/payment-token → saves vault token.
 *   5. onSuccess() is called — parent refreshes the payment methods list.
 */

import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useLanguage } from "@/context/LanguageContext";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

interface Props {
  onSuccess: () => void;
  onError?:  (msg: string) => void;
  onCancel?: () => void;
}

function InnerButton({ onSuccess, onError, onCancel }: Props) {
  const [{ isPending }] = usePayPalScriptReducer();
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-11 rounded-xl bg-[#F7F5F0] border border-black/8">
        <div className="w-4 h-4 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "horizontal", color: "gold", shape: "pill", label: "paypal", height: 44 }}
      fundingSource="paypal"
      createVaultSetupToken={async () => {
        const res = await fetch("/api/paypal/setup-token", { method: "POST" });
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Setup token error");
        }
        const { setupTokenId } = await res.json() as { setupTokenId: string };
        return setupTokenId;
      }}
      onApprove={async (data) => {
        const vaultSetupToken = (data as { vaultSetupToken?: string }).vaultSetupToken;
        if (!vaultSetupToken) {
          onError?.(t("Approbation PayPal invalide.", "Invalid PayPal approval."));
          return;
        }
        const res = await fetch("/api/paypal/payment-token", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ setupTokenId: vaultSetupToken }),
        });
        if (res.ok) {
          onSuccess();
        } else {
          const d = await res.json().catch(() => ({})) as { error?: string };
          onError?.(d.error ?? t("Impossible d'enregistrer le compte PayPal.", "Could not save your PayPal account."));
        }
      }}
      onError={(err) => {
        console.error("[PayPalVaultButton] onError:", err);
        onError?.(t("Une erreur PayPal s'est produite.", "A PayPal error occurred."));
      }}
      onCancel={() => onCancel?.()}
    />
  );
}

export default function PayPalVaultButton(props: Props) {
  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-red-500 text-center">
        PayPal client ID not configured (NEXT_PUBLIC_PAYPAL_CLIENT_ID).
      </p>
    );
  }

  return (
    <PayPalScriptProvider options={{
      clientId:   CLIENT_ID,
      vault:      true,
      intent:     "tokenize",
      components: "buttons",
    }}>
      <InnerButton {...props} />
    </PayPalScriptProvider>
  );
}
