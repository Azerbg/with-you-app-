"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/context/LanguageContext";

// Load the PayPal vault button only client-side (the PayPal SDK uses window)
const PayPalVaultButton = dynamic(() => import("@/components/PayPalVaultButton"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface StripeCard {
  id:        string;
  provider:  "stripe";
  type:      "card";
  brand:     string;
  last4:     string;
  expMonth:  number;
  expYear:   number;
  isDefault: boolean;
}

interface PayPalMethod {
  id:           string;
  provider:     "paypal";
  type:         "paypal";
  displayLabel: string;
  isDefault:    boolean;
  createdAt:    string;
}

type PaymentMethod = StripeCard | PayPalMethod;

interface PaymentHistoryItem {
  id:               string;
  scheduledAt:      string;
  sessionType:      string;
  durationMins:     number;
  tutorName:        string;
  hasPayment:       boolean;
  amountUsd:        number;
  stripeStatus?:    string;
  creditAppliedTnd: number;
  receiptUrl?:      string | null;
  paymentMethod?:   string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "Amex",
  discover: "Discover", jcb: "JCB", unionpay: "UnionPay", card: "Card",
};

function statusLabel(status: string, lang: string): { label: string; cls: string } {
  const en = lang === "en";
  switch (status) {
    case "succeeded":       return { label: en ? "Paid"       : "Payé",       cls: "bg-green-50 text-green-700"  };
    case "refunded":        return { label: en ? "Refunded"   : "Remboursé",  cls: "bg-blue-50 text-blue-700"    };
    case "no_charge":       return { label: en ? "No charge"  : "Gratuit",    cls: "bg-gray-100 text-gray-500"   };
    case "requires_payment_method":
    case "requires_action": return { label: en ? "Pending"    : "En attente", cls: "bg-amber-50 text-amber-700"  };
    case "canceled":        return { label: en ? "Cancelled"  : "Annulé",     cls: "bg-gray-100 text-gray-500"   };
    default:                return { label: en ? "Paid"       : "Payé",       cls: "bg-green-50 text-green-700"  };
  }
}

// ─── Add-method modal ─────────────────────────────────────────────────────────

type AddStep = "choose" | "paypal";

interface AddModalProps {
  onClose:        () => void;
  onPayPalSuccess: () => void;
  onAddCard:       () => void;
  addingCard:      boolean;
}

function AddMethodModal({ onClose, onPayPalSuccess, onAddCard, addingCard }: AddModalProps) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [step, setStep] = useState<AddStep>("choose");
  const [ppError, setPpError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-[#2D1A00]">
            {step === "choose"
              ? t("Ajouter un moyen de paiement", "Add a payment method")
              : t("Connecter PayPal", "Connect PayPal")}
          </p>
          <button onClick={onClose} className="text-[#9B8A6B] hover:text-[#5C3D00] transition text-xl leading-none">×</button>
        </div>

        {step === "choose" && (
          <div className="space-y-3">
            {/* Card via Stripe */}
            <button
              onClick={onAddCard}
              disabled={addingCard}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-[#6B5E44]/20 hover:border-[#F5C400]/60 hover:bg-[#FFF9E0] transition text-left"
            >
              <div className="w-10 h-7 bg-gradient-to-br from-[#1A1F71] to-[#0066B3] rounded flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 14" className="w-6 h-4 text-white" fill="currentColor">
                  <rect width="24" height="14" rx="2" fill="none"/>
                  <rect x="0" y="4" width="24" height="3" fill="currentColor" opacity="0.6"/>
                  <rect x="2" y="9" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.8"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#2D1A00]">{t("Carte bancaire", "Credit / Debit card")}</p>
                <p className="text-xs text-[#9B8A6B]">Visa, Mastercard, Amex…</p>
              </div>
              {addingCard && <div className="ml-auto w-4 h-4 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />}
            </button>

            {/* PayPal */}
            <button
              onClick={() => setStep("paypal")}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-[#6B5E44]/20 hover:border-[#F5C400]/60 hover:bg-[#FFF9E0] transition text-left"
            >
              <img src="/payment-logos/paypal.svg" alt="PayPal" className="h-6 w-auto flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#2D1A00]">PayPal</p>
                <p className="text-xs text-[#9B8A6B]">{t("Compte PayPal enregistré", "Saved PayPal account")}</p>
              </div>
            </button>
          </div>
        )}

        {step === "paypal" && (
          <div className="space-y-4">
            <p className="text-xs text-[#6B5E44]">
              {t(
                "Cliquez sur le bouton PayPal ci-dessous, connectez-vous à votre compte PayPal et autorisez WithYou à l'utiliser pour les paiements futurs.",
                "Click the PayPal button below, log in to your PayPal account, and authorise WithYou to use it for future payments."
              )}
            </p>

            {ppError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{ppError}</p>
            )}

            <PayPalVaultButton
              onSuccess={() => { onPayPalSuccess(); onClose(); }}
              onError={msg => setPpError(msg)}
              onCancel={onClose}
            />

            <button
              onClick={() => { setStep("choose"); setPpError(null); }}
              className="w-full text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition"
            >
              ← {t("Retour", "Back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  setupComplete:    boolean;
  setupCancelled?:  boolean;
  paypalComplete?:  boolean;
  paypalCancelled?: boolean;
  paymentHistory?:  PaymentHistoryItem[];
}

export default function PaymentSetupClient({ setupComplete, setupCancelled = false, paypalComplete = false, paypalCancelled = false, paymentHistory = [] }: Props) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const [methods,       setMethods]       = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [removing,       setRemoving]      = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [addingCard,    setAddingCard]    = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [banner,        setBanner]        = useState<{ type: "success" | "error" | "cancel"; msg: string } | null>(
    paypalComplete  ? { type: "success", msg: t("Compte PayPal enregistré !", "PayPal account saved!") } :
    paypalCancelled ? { type: "cancel",  msg: t("Connexion PayPal annulée.", "PayPal setup was cancelled.") } :
    setupComplete   ? { type: "success", msg: t("Carte enregistrée avec succès !", "Card saved successfully!") } :
    setupCancelled  ? { type: "cancel",  msg: t("Ajout annulé.", "Setup was cancelled.") } :
    null
  );

  useEffect(() => {
    fetchMethods();
    if (setupComplete || setupCancelled || paypalComplete || paypalCancelled) {
      window.history.replaceState({}, "", "/dashboard/student/billing");
    }
  }, [setupComplete, setupCancelled, paypalComplete, paypalCancelled]);

  async function fetchMethods() {
    setLoadingMethods(true);
    try {
      const res = await fetch("/api/payment-methods");
      if (res.ok) {
        const data = await res.json() as { methods: PaymentMethod[] };
        setMethods(data.methods ?? []);
      }
    } finally {
      setLoadingMethods(false);
    }
  }

  async function handleAddCard() {
    setAddingCard(true);
    setShowAddModal(false);
    try {
      const res  = await fetch("/api/stripe/setup-checkout", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBanner({ type: "error", msg: data.error ?? t("Erreur Stripe", "Stripe error") });
        return;
      }
      window.location.href = data.url;
    } catch {
      setBanner({ type: "error", msg: t("Impossible de contacter Stripe.", "Could not reach Stripe.") });
    } finally {
      setAddingCard(false);
    }
  }

  async function handleRemove(method: PaymentMethod) {
    setRemoving(method.id);
    try {
      await fetch(`/api/payment-methods/${method.id}`, { method: "DELETE" });
      setMethods(prev => prev.filter(m => m.id !== method.id));
    } finally {
      setRemoving(null);
    }
  }

  async function handleSetDefault(method: PaymentMethod) {
    if (method.provider !== "paypal") return;
    setSettingDefault(method.id);
    try {
      await fetch(`/api/payment-methods/${method.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "set_default" }),
      });
      setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === method.id })));
    } finally {
      setSettingDefault(null);
    }
  }

  function renderMethodRow(method: PaymentMethod) {
    const isRemoving      = removing === method.id;
    const isSettingDef    = settingDefault === method.id;

    return (
      <div key={method.id} className="flex items-center justify-between px-6 py-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {method.provider === "stripe" ? (
            <div className="w-10 h-7 bg-[#F7F5F0] rounded border border-black/8 flex items-center justify-center text-[10px] font-bold text-[#5C3D00] uppercase flex-shrink-0">
              {BRAND_LABELS[(method as StripeCard).brand] ?? (method as StripeCard).brand}
            </div>
          ) : (
            <img src="/payment-logos/paypal.svg" alt="PayPal" className="h-5 w-auto flex-shrink-0" />
          )}
          <div className="min-w-0">
            {method.provider === "stripe" ? (
              <>
                <p className="text-sm font-semibold text-[#5C3D00]">•••• {(method as StripeCard).last4}</p>
                <p className="text-xs text-[#9B8A6B]">
                  {t("Expire", "Expires")} {String((method as StripeCard).expMonth).padStart(2, "0")}/{(method as StripeCard).expYear}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#5C3D00] truncate">{(method as PayPalMethod).displayLabel}</p>
                <p className="text-xs text-[#9B8A6B]">PayPal</p>
              </>
            )}
          </div>
          {method.isDefault && (
            <span className="text-[10px] font-bold bg-[#FFF3B0] text-[#5C3D00] px-2 py-0.5 rounded-full flex-shrink-0">
              {t("Par défaut", "Default")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!method.isDefault && method.provider === "paypal" && (
            <button
              onClick={() => handleSetDefault(method)}
              disabled={isSettingDef}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] font-medium transition disabled:opacity-50"
            >
              {isSettingDef ? t("…", "…") : t("Par défaut", "Set default")}
            </button>
          )}
          <button
            onClick={() => handleRemove(method)}
            disabled={isRemoving}
            className="text-xs text-red-400 hover:text-red-600 font-semibold transition disabled:opacity-50"
          >
            {isRemoving ? t("Suppression…", "Removing…") : t("Supprimer", "Remove")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAddModal && (
        <AddMethodModal
          onClose={() => setShowAddModal(false)}
          onPayPalSuccess={() => { fetchMethods(); setBanner({ type: "success", msg: t("Compte PayPal enregistré !", "PayPal account saved!") }); }}
          onAddCard={handleAddCard}
          addingCard={addingCard}
        />
      )}

      <div className="min-h-screen p-6 md:p-10" style={{ background: "#F2EFE9" }}>
        <div className="max-w-xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#5C3D00] mb-1">{t("Facturation", "Billing")}</h1>
            <p className="text-sm text-[#6B5E44]">
              {t("Gérez vos moyens de paiement et consultez votre historique.", "Manage your payment methods and view your history.")}
            </p>
          </div>

          {/* Banner */}
          {banner && (
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${
              banner.type === "success" ? "bg-green-50 border border-green-200"
              : banner.type === "cancel" ? "bg-amber-50 border border-amber-200"
              : "bg-red-50 border border-red-200"
            }`}>
              <p className={`text-sm font-medium flex-1 ${
                banner.type === "success" ? "text-green-800"
                : banner.type === "cancel" ? "text-amber-800"
                : "text-red-800"
              }`}>{banner.msg}</p>
              <button
                onClick={() => setBanner(null)}
                className={`text-lg leading-none opacity-60 hover:opacity-100 ${
                  banner.type === "success" ? "text-green-500"
                  : banner.type === "cancel" ? "text-amber-400"
                  : "text-red-400"
                }`}
              >×</button>
            </div>
          )}

          {/* Saved methods */}
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#5C3D00]">{t("Moyens de paiement enregistrés", "Saved payment methods")}</p>
            </div>

            {loadingMethods ? (
              <div className="px-6 py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : methods.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-[#9B8A6B]">
                  {t("Aucun moyen de paiement enregistré.", "No payment method saved yet.")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/4">
                {methods.map(m => renderMethodRow(m))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowAddModal(true)}
            disabled={addingCard}
            className="w-full border-2 border-dashed border-[#F5C400]/40 text-[#C49200] font-semibold py-3 rounded-2xl hover:bg-[#FFFBEA] hover:border-[#F5C400] transition text-sm disabled:opacity-50"
          >
            {addingCard
              ? t("Redirection vers Stripe…", "Redirecting to Stripe…")
              : t("+ Ajouter un moyen de paiement", "+ Add a payment method")}
          </button>

          {/* Payment history */}
          {paymentHistory.length > 0 && (
            <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5">
                <p className="font-bold text-[#5C3D00]">{t("Historique des paiements", "Payment history")}</p>
              </div>
              <div className="divide-y divide-black/4">
                {paymentHistory.map(item => {
                  const date = new Date(item.scheduledAt);
                  const dateStr = date.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  const statusKey = item.hasPayment ? (item.stripeStatus ?? "succeeded") : "no_charge";
                  const st = statusLabel(statusKey, lang);
                  const receiptHref = item.receiptUrl ?? `/api/bookings/${item.id}/receipt`;

                  return (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2D1A00] truncate">{item.tutorName}</p>
                        <p className="text-xs text-[#9B8A6B] mt-0.5">
                          {dateStr} · {item.durationMins} min
                          {item.paymentMethod && (
                            <span className="ml-1.5 text-[#7A6B55]">· {item.paymentMethod}</span>
                          )}
                          {item.creditAppliedTnd > 0 && (
                            <span className="ml-1.5 text-[#C49200]">
                              (−{item.creditAppliedTnd.toFixed(0)} TND {t("crédit", "credit")})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.hasPayment ? (
                          <span className="text-sm font-bold text-[#2D1A00]">
                            ${item.amountUsd.toFixed(2)}
                            <span className="text-[10px] font-normal text-[#9B8A6B] ml-1">USD</span>
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-[#C4BAA8]">—</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        {item.hasPayment && (
                          <a href={receiptHref} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#9B8A6B] hover:text-[#C49200] transition font-medium">
                            {t("Reçu →", "Receipt →")}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security footer */}
          <p className="text-xs text-center text-[#9B8A6B] flex items-center justify-center gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {t(
              "Paiements sécurisés par Stripe et PayPal.",
              "Payments secured by Stripe and PayPal."
            )}
          </p>

        </div>
      </div>
    </>
  );
}
