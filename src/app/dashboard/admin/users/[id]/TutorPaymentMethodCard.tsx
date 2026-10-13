"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentMethod {
  type: string;
  accountHolder: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  tutorId: string;
  paymentMethod: PaymentMethod | null;
  lang: string;
}

export default function TutorPaymentMethodCard({ tutorId, paymentMethod: initial, lang }: Props) {
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(initial?.type ?? "WISE");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? "");
  const [iban, setIban] = useState(initial?.iban ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    WISE: "Wise",
    BANK_TN: t("Banque TN", "Tunisian bank"),
    BANK_INTL: t("Banque internationale", "International bank"),
    D17: "D17",
  };

  async function save() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${tutorId}/payout-method`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, accountHolder: accountHolder || null, iban: iban || null, email: email || null, phone: phone || null }),
    });
    if (res.ok) {
      router.refresh();
      setEditing(false);
    } else {
      setError(t("Erreur lors de la sauvegarde.", "Save failed."));
    }
    setLoading(false);
  }

  function cancel() {
    setType(initial?.type ?? "WISE");
    setAccountHolder(initial?.accountHolder ?? "");
    setIban(initial?.iban ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setError(null);
    setEditing(false);
  }

  const inputCls = "w-full px-3 py-2 border border-[#6B5E44]/30 rounded-xl text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition";

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Méthode de paiement tuteur", "Tutor payout method")}</p>
          <p className="text-xs text-[#9B8A6B]">{t("Coordonnées pour les virements", "Payout details")}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition"
          >
            {t("Modifier", "Edit")}
          </button>
        )}
      </div>

      {!editing ? (
        initial ? (
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-[#9B8A6B] w-32 shrink-0">{t("Méthode", "Method")}</span>
              <span className="font-semibold text-[#2D1A00]">{TYPE_LABELS[initial.type] ?? initial.type}</span>
            </div>
            {initial.accountHolder && (
              <div className="flex gap-3">
                <span className="text-[#9B8A6B] w-32 shrink-0">{t("Titulaire", "Holder")}</span>
                <span className="text-[#2D1A00]">{initial.accountHolder}</span>
              </div>
            )}
            {initial.iban && (
              <div className="flex gap-3">
                <span className="text-[#9B8A6B] w-32 shrink-0">IBAN / RIB</span>
                <span className="font-mono text-[#2D1A00]">{initial.iban}</span>
              </div>
            )}
            {initial.email && (
              <div className="flex gap-3">
                <span className="text-[#9B8A6B] w-32 shrink-0">{t("Email Wise", "Wise email")}</span>
                <span className="text-[#2D1A00]">{initial.email}</span>
              </div>
            )}
            {initial.phone && (
              <div className="flex gap-3">
                <span className="text-[#9B8A6B] w-32 shrink-0">{t("Téléphone D17", "D17 phone")}</span>
                <span className="text-[#2D1A00]">{initial.phone}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#9B8A6B] italic">{t("Aucune méthode de paiement définie.", "No payment method set.")}</p>
        )
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#6B5E44] mb-1 font-medium">{t("Méthode", "Method")}</label>
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              <option value="WISE">Wise</option>
              <option value="BANK_TN">{t("Banque TN (RIB)", "Tunisian bank (RIB)")}</option>
              <option value="BANK_INTL">{t("Banque internationale (IBAN)", "International bank (IBAN)")}</option>
              <option value="D17">D17</option>
            </select>
          </div>
          {(type === "BANK_TN" || type === "BANK_INTL") && (
            <>
              <div>
                <label className="block text-xs text-[#6B5E44] mb-1 font-medium">{t("Titulaire du compte", "Account holder")}</label>
                <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder={t("Nom complet", "Full name")} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-[#6B5E44] mb-1 font-medium">{type === "BANK_TN" ? "RIB" : "IBAN"}</label>
                <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder={type === "BANK_TN" ? t("20 chiffres", "20 digits") : "FR76..."} className={inputCls} />
              </div>
            </>
          )}
          {type === "WISE" && (
            <div>
              <label className="block text-xs text-[#6B5E44] mb-1 font-medium">{t("Email Wise", "Wise email")}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@wise.com" className={inputCls} />
            </div>
          )}
          {type === "D17" && (
            <div>
              <label className="block text-xs text-[#6B5E44] mb-1 font-medium">{t("Numéro de téléphone", "Phone number")}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" className={inputCls} />
            </div>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={loading}
              className="px-4 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
              {loading ? "…" : t("Enregistrer", "Save")}
            </button>
            <button onClick={cancel} disabled={loading}
              className="px-4 py-2.5 border border-black/10 text-[#9B8A6B] font-semibold text-sm rounded-xl hover:bg-black/5 transition">
              {t("Annuler", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
