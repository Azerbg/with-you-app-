"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { fmtMoney } from "@/lib/money";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  type: string;
  bankNameTn: string | null;
  accountHolder: string | null;
  rib: string | null;
  iban: string | null;
  swift: string | null;
  bankNameIntl: string | null;
  email: string | null;
  phone: string | null;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  sessionCount: number;
  completedAt: string | null;
  createdAt: string;
}

interface Props {
  paymentMethod: PaymentMethod | null;
  payouts: Payout[];
  hourlyRateTnd: number | null;
  currency: string;
  earnings: { thisMonth: number; total: number; currency: string };
}

// ─── Payment Method Types ─────────────────────────────────────────────────────

const METHOD_TYPES = [
  {
    key: "BANK_TN",
    label: { fr: "Virement bancaire (Tunisie)", en: "Bank transfer (Tunisia)" },
    sublabel: { fr: "RIB tunisien", en: "Tunisian RIB" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    key: "BANK_INTL",
    label: { fr: "Virement international", en: "International wire transfer" },
    sublabel: { fr: "IBAN / SWIFT", en: "IBAN / SWIFT" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
  },
  {
    key: "PAYPAL",
    label: { fr: "PayPal", en: "PayPal" },
    sublabel: { fr: "Compte PayPal", en: "PayPal account" },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
        <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.72A.766.766 0 015.71 2h7.5c2.6 0 4.45.624 5.495 1.856.97 1.145 1.19 2.573.67 4.336l-.009.032-.008.032C18.424 11.1 16.18 13 12.37 13H9.928l-.872 5.516a.641.641 0 01-.633.54l-1.347-.719z"/>
      </svg>
    ),
  },
  {
    key: "WISE",
    label: { fr: "Wise", en: "Wise" },
    sublabel: { fr: "Transfert international", en: "International transfer" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-green-600">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    key: "PAYONEER",
    label: { fr: "Payoneer", en: "Payoneer" },
    sublabel: { fr: "Paiement international", en: "International payment" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8l4 4-4 4"/>
      </svg>
    ),
  },
  {
    key: "D17",
    label: { fr: "D17 / Flouci", en: "D17 / Flouci" },
    sublabel: { fr: "Paiement mobile tunisien", en: "Tunisian mobile payment" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/>
      </svg>
    ),
  },
];

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { lang } = useLanguage();
  const map: Record<string, string> = {
    PENDING:    "bg-yellow-50 text-yellow-700",
    PROCESSING: "bg-blue-50 text-blue-700",
    PAID:       "bg-emerald-50 text-emerald-700",
    FAILED:     "bg-red-50 text-red-700",
  };
  const labels: Record<string, { fr: string; en: string }> = {
    PENDING:    { fr: "En attente",  en: "Pending" },
    PROCESSING: { fr: "En cours",    en: "Processing" },
    PAID:       { fr: "Versé",       en: "Paid" },
    FAILED:     { fr: "Échoué",      en: "Failed" },
  };
  const label = labels[status] ? labels[status][lang === "en" ? "en" : "fr"] : status;
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

// ─── Payment Method Form ──────────────────────────────────────────────────────

function PaymentForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: PaymentMethod | null;
  onSaved: (pm: PaymentMethod) => void;
  onCancel: () => void;
}) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const l = lang === "en" ? "en" : "fr";
  const [type, setType] = useState(initial?.type ?? "BANK_TN");
  const [bankNameTn, setBankNameTn] = useState(initial?.bankNameTn ?? "");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? "");
  const [rib, setRib] = useState(initial?.rib ?? "");
  const [iban, setIban] = useState(initial?.iban ?? "");
  const [swift, setSwift] = useState(initial?.swift ?? "");
  const [bankNameIntl, setBankNameIntl] = useState(initial?.bankNameIntl ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tutors/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, bankNameTn, accountHolder, rib, iban, swift, bankNameIntl, email, phone }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? t("Erreur serveur", "Server error"));
        return;
      }
      const saved = await res.json();
      onSaved(saved);
    } catch {
      setError(t("Erreur réseau", "Network error"));
    } finally {
      setSaving(false);
    }
  }

  const selectedType = METHOD_TYPES.find(m => m.key === type);

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div>
        <p className="text-sm font-semibold text-[#5C3D00] mb-3">{t("Choisissez votre méthode de paiement", "Choose your payment method")}</p>
        <div className="grid grid-cols-1 gap-2">
          {METHOD_TYPES.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setType(m.key)}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-left transition ${
                type === m.key
                  ? "border-[#F5C400] bg-[#FFF3B0]"
                  : "border-[#6B5E44]/20 hover:border-[#F5C400]/50 bg-white"
              }`}
            >
              <span className={type === m.key ? "text-[#5C3D00]" : "text-[#9B8A6B]"}>{m.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#5C3D00]">{m.label[l]}</p>
                <p className="text-xs text-[#9B8A6B]">{m.sublabel[l]}</p>
              </div>
              {type === m.key && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#F5C400] shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fields per type */}
      {type === "BANK_TN" && (
        <div className="space-y-3 bg-[#FAF8F0] rounded-xl p-4">
          <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest">{t("Informations bancaires", "Bank details")}</p>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Nom de la banque", "Bank name")}</label>
            <input value={bankNameTn} onChange={e => setBankNameTn(e.target.value)} placeholder="STB, BIAT, Attijari…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Titulaire du compte", "Account holder")}</label>
            <input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder={t("Prénom et nom complet", "Full name")} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("RIB (20 chiffres)", "RIB (20 digits)")}</label>
            <input value={rib} onChange={e => setRib(e.target.value.replace(/\D/g, "").slice(0, 20))}
              placeholder="00 000 0000000000000 00" className={inputCls} maxLength={20} />
            {rib && rib.length !== 20 && (
              <p className="text-xs text-red-500 mt-1">{t(`Le RIB doit contenir exactement 20 chiffres (${rib.length}/20)`, `RIB must be exactly 20 digits (${rib.length}/20)`)}</p>
            )}
          </div>
        </div>
      )}

      {type === "BANK_INTL" && (
        <div className="space-y-3 bg-[#FAF8F0] rounded-xl p-4">
          <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest">{t("Virement international", "International wire transfer")}</p>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Nom de la banque", "Bank name")}</label>
            <input value={bankNameIntl} onChange={e => setBankNameIntl(e.target.value)} placeholder={t("Nom de votre banque", "Your bank name")} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Titulaire du compte", "Account holder")}</label>
            <input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder={t("Prénom et nom complet", "Full name")} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">IBAN</label>
            <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="TN59 0000 0000 0000 0000 0000" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Code SWIFT / BIC", "SWIFT / BIC code")}</label>
            <input value={swift} onChange={e => setSwift(e.target.value.toUpperCase())} placeholder="STBKTNTT" className={inputCls} />
          </div>
        </div>
      )}

      {type === "PAYPAL" && (
        <div className="space-y-3 bg-[#FAF8F0] rounded-xl p-4">
          <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest">{t("Compte PayPal", "PayPal account")}</p>
          <p className="text-xs text-[#6B5E44]">
            {t(
              "Connectez votre compte PayPal en toute sécurité via l'authentification officielle PayPal. Votre e-mail sera vérifié automatiquement.",
              "Connect your PayPal account securely via official PayPal authentication. Your email will be verified automatically."
            )}
          </p>
          <a
            href="/api/paypal/connect"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#003087] text-white font-bold rounded-xl text-sm hover:bg-[#002069] transition"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.72A.766.766 0 015.71 2h7.5c2.6 0 4.45.624 5.495 1.856.97 1.145 1.19 2.573.67 4.336-.009.032-.018.064-.009.032C18.424 11.1 16.18 13 12.37 13H9.928l-.872 5.516a.641.641 0 01-.633.54l-1.347-.719z"/>
            </svg>
            {t("Se connecter avec PayPal", "Connect with PayPal")}
          </a>
          {initial?.type === "PAYPAL" && initial.email && (
            <p className="text-xs text-emerald-600 font-semibold text-center">
              ✓ {t("Compte connecté", "Account connected")} : {initial.email.slice(0, 3)}•••@{initial.email.split("@")[1]}
            </p>
          )}
        </div>
      )}

      {(type === "WISE" || type === "PAYONEER") && (
        <div className="space-y-3 bg-[#FAF8F0] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest">
              {t("Compte", "Account")} {type === "WISE" ? "Wise" : "Payoneer"}
            </p>
            <a
              href={type === "WISE" ? "https://wise.com" : "https://www.payoneer.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {t("Ouvrir", "Open")} {type === "WISE" ? "Wise" : "Payoneer"} →
            </a>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">
              {t("Adresse e-mail du compte", "Email address for your")} {type === "WISE" ? "Wise" : "Payoneer"}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" className={inputCls} />
          </div>
          <p className="text-xs text-[#9B8A6B]">
            {type === "WISE"
              ? t("Entrez l'e-mail associé à votre compte Wise.", "Enter the email associated with your Wise account.")
              : t("Entrez l'e-mail associé à votre compte Payoneer.", "Enter the email associated with your Payoneer account.")}
          </p>
        </div>
      )}

      {type === "D17" && (
        <div className="space-y-3 bg-[#FAF8F0] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest">{t("Compte D17 / Flouci", "D17 / Flouci account")}</p>
            <a
              href="https://d17.com.tn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {t("Ouvrir D17", "Open D17")} →
            </a>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C3D00] mb-1">{t("Numéro de téléphone D17", "D17 phone number")}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" className={inputCls} />
          </div>
          <p className="text-xs text-[#9B8A6B]">
            {t("Entrez le numéro associé à votre compte D17.", "Enter the phone number associated with your D17 account.")}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {type !== "PAYPAL" && (
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition text-sm">
            {t("Annuler", "Cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition text-sm">
            {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
        </div>
      )}
      {type === "PAYPAL" && (
        <button onClick={onCancel} className="w-full py-2.5 border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition text-sm">
          {t("Annuler", "Cancel")}
        </button>
      )}
    </div>
  );
}

// ─── Payment Method Display ───────────────────────────────────────────────────

function PaymentMethodCard({ pm, onEdit }: { pm: PaymentMethod; onEdit: () => void }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const l = lang === "en" ? "en" : "fr";
  const typeInfo = METHOD_TYPES.find(m => m.key === pm.type);

  function maskRib(rib: string) {
    return rib.slice(0, 4) + " •••• •••• •••• " + rib.slice(-2);
  }

  function maskIban(iban: string) {
    return iban.slice(0, 4) + " •••• •••• •••• " + iban.slice(-4);
  }

  function maskEmail(email: string) {
    const [local, domain] = email.split("@");
    return local.slice(0, 2) + "•••@" + domain;
  }

  return (
    <div className="relative bg-gradient-to-br from-[#5C3D00] to-[#3d2900] rounded-2xl p-6 text-white overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[#F5C400]/10" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[#F5C400]">
            {typeInfo?.icon}
            <span className="text-sm font-bold">{typeInfo?.label[l]}</span>
          </div>
          <button onClick={onEdit}
            className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/50 rounded-lg px-3 py-1.5 transition">
            {t("Modifier", "Edit")}
          </button>
        </div>

        {pm.accountHolder && (
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t("Titulaire", "Holder")}</p>
        )}
        {pm.accountHolder && (
          <p className="text-white font-bold text-lg mb-4">{pm.accountHolder}</p>
        )}

        {pm.rib && (
          <>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">RIB</p>
            <p className="font-mono text-white/80 text-sm">{maskRib(pm.rib)}</p>
            {pm.bankNameTn && <p className="text-white/40 text-xs mt-1">{pm.bankNameTn}</p>}
          </>
        )}
        {pm.iban && (
          <>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">IBAN</p>
            <p className="font-mono text-white/80 text-sm">{maskIban(pm.iban)}</p>
            {pm.swift && <p className="text-white/40 text-xs mt-1">SWIFT: {pm.swift}</p>}
          </>
        )}
        {pm.email && (
          <>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t("Compte", "Account")}</p>
            <p className="text-white/80 text-sm">{maskEmail(pm.email)}</p>
          </>
        )}
        {pm.phone && (
          <>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t("Numéro", "Number")}</p>
            <p className="text-white/80 text-sm">{pm.phone}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EarningsClient({ paymentMethod, payouts, hourlyRateTnd, currency, earnings }: Props) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [pm, setPm] = useState<PaymentMethod | null>(paymentMethod);
  const [editing, setEditing] = useState(false);
  const searchParams = useSearchParams();

  const paypalStatus = searchParams.get("paypal");
  const errorParam = searchParams.get("error");

  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (paypalStatus === "connected") {
      setBanner({ type: "success", msg: lang === "en" ? "PayPal account connected successfully!" : "Compte PayPal connecté avec succès !" });
    } else if (errorParam === "paypal_cancelled") {
      setBanner({ type: "error", msg: lang === "en" ? "PayPal connection cancelled." : "Connexion PayPal annulée." });
    } else if (errorParam === "paypal_not_configured") {
      setBanner({ type: "error", msg: lang === "en" ? "PayPal is not yet configured on this platform." : "PayPal n'est pas encore configuré sur cette plateforme." });
    } else if (errorParam) {
      setBanner({ type: "error", msg: lang === "en" ? "Error connecting PayPal. Please try again." : "Erreur lors de la connexion PayPal. Réessayez." });
    }
  }, [paypalStatus, errorParam]);

  // Payout-based (actual disbursements)
  const pending = payouts.filter(p => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* PayPal connect banner */}
            {banner && (
              <div className={`rounded-2xl px-5 py-4 flex items-center justify-between gap-4 ${
                banner.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <p className="text-sm font-semibold">{banner.msg}</p>
                <button onClick={() => setBanner(null)} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t("Ce mois-ci", "This month"),    value: fmtMoney(earnings.thisMonth, currency), color: "text-emerald-600" },
                { label: t("En attente", "Pending"),       value: fmtMoney(pending, currency),            color: "text-amber-600" },
                { label: t("Total gagné", "Total earned"), value: fmtMoney(earnings.total, currency),     color: "text-[#5C3D00]" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-black/5 p-5">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-[#9B8A6B] mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {hourlyRateTnd && (
              <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00] shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
                <div>
                  <p className="text-sm font-bold text-[#5C3D00]">{t("Taux horaire", "Hourly rate")} : {hourlyRateTnd} TND / h</p>
                  <p className="text-xs text-[#6B5E44]">{t("Défini lors de votre entretien RH · modifiable par l'équipe WithYou", "Set during your HR interview · editable by the WithYou team")}</p>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#2D1A00]">{t("Méthode de paiement", "Payment method")}</p>
                  <p className="text-xs text-[#9B8A6B] mt-0.5">{t("Vos coordonnées bancaires pour recevoir vos virements", "Your banking details to receive your payouts")}</p>
                </div>
                {pm && !editing && (
                  <button onClick={() => setEditing(true)}
                    className="text-xs font-bold text-[#5C3D00] border-2 border-[#F5C400] px-3 py-1.5 rounded-xl hover:bg-[#FFF3B0] transition">
                    {t("Modifier", "Edit")}
                  </button>
                )}
              </div>

              <div className="p-6">
                {!pm || editing ? (
                  <PaymentForm
                    initial={pm}
                    onSaved={saved => { setPm(saved); setEditing(false); }}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <PaymentMethodCard pm={pm} onEdit={() => setEditing(true)} />
                )}
              </div>
            </div>

            {/* Payout history */}
            <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5">
                <p className="font-bold text-[#2D1A00]">{t("Historique des virements", "Payout history")}</p>
              </div>

              {payouts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-4xl mb-3">💳</p>
                  <p className="text-sm font-semibold text-[#5C3D00]">{t("Aucun virement pour l'instant", "No payouts yet")}</p>
                  <p className="text-xs text-[#9B8A6B] mt-1">{t("Les virements hebdomadaires apparaîtront ici", "Weekly payouts will appear here")}</p>
                </div>
              ) : (
                <div className="divide-y divide-black/4">
                  {payouts.map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#2D1A00]">
                          {new Date(p.periodStart).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short" })}
                          {" – "}
                          {new Date(p.periodEnd).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-[#9B8A6B] mt-0.5">
                          {p.sessionCount} {lang === "en" ? `session${p.sessionCount > 1 ? "s" : ""}` : `séance${p.sessionCount > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#2D1A00]">{fmtMoney(p.amount, p.currency)}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
  );
}
