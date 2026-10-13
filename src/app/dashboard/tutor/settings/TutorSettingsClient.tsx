"use client";

import { useState } from "react";
import NotifPreferencesTab from "@/components/NotifPreferencesTab";
import { useLanguage } from "@/context/LanguageContext";

interface Contact {
  fullName: string;
  phone: string | null;
  city: string | null;
  country: string | null;
}

interface PaymentMethod {
  type: string;
  accountHolder: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  email: string;
  hasPassword: boolean;
  isHidden: boolean;
  contact: Contact;
  paymentMethod: PaymentMethod | null;
}

type Tab = "compte" | "contact" | "notifications" | "virements";

export default function TutorSettingsClient({ email, hasPassword, isHidden: initialHidden, contact, paymentMethod: initialPm }: Props) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [tab, setTab] = useState<Tab>("compte");

  // Visibility
  const [isHidden, setIsHidden] = useState(initialHidden);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityMsg, setVisibilityMsg] = useState<string | null>(null);

  // Change password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Deactivate
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateMsg, setDeactivateMsg] = useState<string | null>(null);

  // Payout method
  const [pmType, setPmType] = useState(initialPm?.type ?? "WISE");
  const [pmHolder, setPmHolder] = useState(initialPm?.accountHolder ?? "");
  const [pmIban, setPmIban] = useState(initialPm?.iban ?? "");
  const [pmEmail, setPmEmail] = useState(initialPm?.email ?? "");
  const [pmPhone, setPmPhone] = useState(initialPm?.phone ?? "");
  const [pmLoading, setPmLoading] = useState(false);
  const [pmMsg, setPmMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function savePm(e: React.FormEvent) {
    e.preventDefault();
    setPmLoading(true);
    setPmMsg(null);

    // Client-side validation
    if (pmType === "BANK_TN") {
      const ribClean = pmIban.replace(/\s/g, "");
      if (ribClean && !/^\d{20}$/.test(ribClean)) {
        setPmMsg({ text: t("Le RIB doit contenir exactement 20 chiffres.", "RIB must be exactly 20 digits."), ok: false });
        setPmLoading(false);
        return;
      }
    }
    if (pmType === "BANK_INTL") {
      const ibanClean = pmIban.replace(/\s/g, "").toUpperCase();
      if (ibanClean && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(ibanClean)) {
        setPmMsg({ text: t("Format IBAN invalide (ex : FR76…).", "Invalid IBAN format (e.g. FR76…)."), ok: false });
        setPmLoading(false);
        return;
      }
    }
    if (pmType === "D17") {
      const phoneClean = pmPhone.replace(/\s/g, "");
      if (phoneClean && !/^\+216\d{8}$/.test(phoneClean)) {
        setPmMsg({ text: t("Le numéro D17 doit être au format +216 suivi de 8 chiffres.", "D17 number must be +216 followed by 8 digits."), ok: false });
        setPmLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/tutor/payout-method", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: pmType, accountHolder: pmHolder || null, iban: pmIban || null, email: pmEmail || null, phone: pmPhone || null }),
      });
      if (!res.ok) throw new Error();
      setPmMsg({ text: t("Méthode de paiement mise à jour.", "Payout method updated."), ok: true });
    } catch {
      setPmMsg({ text: t("Une erreur est survenue.", "An error occurred."), ok: false });
    } finally {
      setPmLoading(false);
    }
  }

  async function toggleVisibility() {
    setVisibilityLoading(true);
    setVisibilityMsg(null);
    try {
      const res = await fetch("/api/tutor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !isHidden }),
      });
      if (!res.ok) throw new Error();
      setIsHidden((v) => !v);
      setVisibilityMsg(!isHidden
        ? t("Profil masqué aux étudiants.", "Profile hidden from students.")
        : t("Profil visible aux étudiants.", "Profile visible to students."));
    } catch {
      setVisibilityMsg(t("Une erreur est survenue.", "An error occurred."));
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ text: t("Les mots de passe ne correspondent pas.", "Passwords do not match."), ok: false });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ text: t("Le mot de passe doit contenir au moins 8 caractères.", "Password must be at least 8 characters."), ok: false });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/tutor/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ text: data.error ?? t("Erreur.", "Error."), ok: false });
      } else {
        setPwMsg({ text: t("Mot de passe mis à jour.", "Password updated."), ok: true });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch {
      setPwMsg({ text: t("Une erreur est survenue.", "An error occurred."), ok: false });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeactivate() {
    setDeactivateLoading(true);
    setDeactivateMsg(null);
    try {
      // Send a support message to WithYou team
      const res = await fetch("/api/tutors/support-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Demande de désactivation de compte",
          message: "Je souhaite désactiver mon compte tuteur WithYou. Merci de traiter cette demande.",
        }),
      });
      if (!res.ok) throw new Error();
      setDeactivateMsg(t(
        "Votre demande a été envoyée à l'équipe WithYou. Nous vous contacterons sous 48h.",
        "Your request has been sent to the WithYou team. We will contact you within 48h."
      ));
      setDeactivateConfirm(false);
    } catch {
      setDeactivateMsg(t(
        "Une erreur est survenue. Contactez support@withyou.com directement.",
        "An error occurred. Please contact support@withyou.com directly."
      ));
    } finally {
      setDeactivateLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "compte", label: t("Compte", "Account") },
    { key: "contact", label: t("Informations de contact", "Contact") },
    { key: "notifications", label: "Notifications" },
    { key: "virements", label: t("Virements", "Payouts") },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center px-8 flex-shrink-0">
        <h1 className="text-base font-bold text-[#5C3D00]">{t("Paramètres", "Settings")}</h1>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 bg-[#F7F5F0] p-1 rounded-xl w-fit">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  tab === t.key
                    ? "bg-white text-[#5C3D00] shadow-sm"
                    : "text-[#9B8A6B] hover:text-[#5C3D00]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── COMPTE TAB ── */}
          {tab === "compte" && (
            <div className="space-y-5">

              {/* Visibility toggle */}
              <div className="bg-white border border-black/5 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#2D1A00] text-sm mb-1">{t("Visibilité du profil", "Profile visibility")}</p>
                    <p className="text-xs text-[#6B5E44] leading-relaxed">
                      {isHidden
                        ? t("Votre profil est masqué. Les étudiants ne peuvent pas vous trouver dans la recherche.", "Your profile is hidden. Students cannot find you in search.")
                        : t("Votre profil est visible. Les étudiants peuvent vous trouver et vous contacter.", "Your profile is visible. Students can find and contact you.")}
                    </p>
                    {visibilityMsg && (
                      <p className="text-xs text-[#C49200] mt-2 font-semibold">{visibilityMsg}</p>
                    )}
                  </div>
                  <button
                    onClick={toggleVisibility}
                    disabled={visibilityLoading}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                      isHidden ? "bg-[#E8E0D4]" : "bg-[#F5C400]"
                    } ${visibilityLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    role="switch"
                    aria-checked={!isHidden}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        isHidden ? "translate-x-0" : "translate-x-6"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Change password */}
              {hasPassword && (
                <div className="bg-white border border-black/5 rounded-2xl p-6">
                  <p className="font-bold text-[#2D1A00] text-sm mb-4">{t("Changer le mot de passe", "Change password")}</p>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Mot de passe actuel", "Current password")}</label>
                      <input
                        type="password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Nouveau mot de passe", "New password")}</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                        minLength={8}
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20"
                        placeholder={t("Min. 8 caractères", "Min. 8 characters")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Confirmer le nouveau mot de passe", "Confirm new password")}</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20"
                        placeholder="••••••••"
                      />
                    </div>
                    {pwMsg && (
                      <p className={`text-xs font-semibold ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>
                        {pwMsg.text}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="mt-1 px-5 py-2.5 bg-[#5C3D00] text-[#F5C400] font-bold text-sm rounded-xl hover:bg-[#3d2900] transition disabled:opacity-50"
                    >
                      {pwLoading ? t("Enregistrement…", "Saving…") : t("Mettre à jour", "Update")}
                    </button>
                  </form>
                </div>
              )}

              {!hasPassword && (
                <div className="bg-white border border-black/5 rounded-2xl p-6">
                  <p className="font-bold text-[#2D1A00] text-sm mb-1">{t("Mot de passe", "Password")}</p>
                  <p className="text-xs text-[#6B5E44]">
                    {t(
                      "Vous utilisez la connexion Google. Aucun mot de passe n'est défini sur ce compte.",
                      "You use Google sign-in. No password is set on this account."
                    )}
                  </p>
                </div>
              )}

              {/* Deactivate account */}
              <div className="bg-white border border-red-100 rounded-2xl p-6">
                <p className="font-bold text-red-700 text-sm mb-1">{t("Désactiver mon compte", "Deactivate my account")}</p>
                <p className="text-xs text-[#6B5E44] mb-4 leading-relaxed">
                  {t(
                    "En désactivant votre compte, votre profil sera masqué et aucune nouvelle réservation ne sera possible. Les séances déjà planifiées seront maintenues. Vous pouvez réactiver votre compte à tout moment en contactant l'équipe WithYou.",
                    "By deactivating your account, your profile will be hidden and no new bookings will be possible. Already scheduled sessions will be maintained. You can reactivate your account at any time by contacting the WithYou team."
                  )}
                </p>
                {deactivateMsg ? (
                  <p className="text-xs text-green-700 font-semibold bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    {deactivateMsg}
                  </p>
                ) : deactivateConfirm ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivateLoading}
                      className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {deactivateLoading ? t("Envoi…", "Sending…") : t("Confirmer la demande", "Confirm request")}
                    </button>
                    <button
                      onClick={() => setDeactivateConfirm(false)}
                      className="px-4 py-2 text-sm text-[#6B5E44] hover:text-[#5C3D00] font-semibold"
                    >
                      {t("Annuler", "Cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeactivateConfirm(true)}
                    className="px-4 py-2 border border-red-200 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition"
                  >
                    {t("Demander la désactivation", "Request deactivation")}
                  </button>
                )}
              </div>

            </div>
          )}

          {/* ── CONTACT TAB ── */}
          {tab === "contact" && (
            <div className="space-y-5">
              <div className="bg-white border border-black/5 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <p className="font-bold text-[#2D1A00] text-sm">{t("Informations personnelles", "Personal information")}</p>
                  <span className="text-xs text-[#9B8A6B] bg-[#F7F5F0] px-2.5 py-1 rounded-lg">{t("Lecture seule", "Read only")}</span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: t("Nom complet", "Full name"), value: contact.fullName || "—" },
                    { label: t("Adresse e-mail", "Email address"), value: email },
                    { label: t("Téléphone", "Phone"), value: contact.phone || "—" },
                    { label: t("Ville", "City"), value: contact.city || "—" },
                    { label: t("Pays", "Country"), value: contact.country || "—" },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-2 gap-4 py-3 border-b border-black/4 last:border-0">
                      <p className="text-xs font-medium text-[#6B5E44]/70 uppercase tracking-wide">{row.label}</p>
                      <p className="text-sm font-semibold text-[#2D1A00]">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFF3B0] border border-[#F5C400]/40 rounded-2xl px-5 py-4 flex gap-3">
                <svg className="w-4 h-4 text-[#C49200] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-[#5C3D00] leading-relaxed">
                  {t(
                    "Pour modifier vos informations personnelles (nom, téléphone, adresse), contactez l'équipe WithYou à",
                    "To update your personal information (name, phone, address), contact the WithYou team at"
                  )}{" "}
                  <span className="font-bold">support@withyou.com</span>.{" "}
                  {t("Toute modification est soumise à validation RH.", "All changes are subject to HR review.")}
                </p>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {tab === "notifications" && <NotifPreferencesTab />}

          {/* ── VIREMENTS TAB ── */}
          {tab === "virements" && (
            <div className="space-y-5">
              <div className="bg-white border border-black/5 rounded-2xl p-6">
                <p className="font-bold text-[#2D1A00] text-sm mb-1">{t("Méthode de paiement", "Payout method")}</p>
                <p className="text-xs text-[#6B5E44] mb-5">
                  {t("Vos coordonnées bancaires pour recevoir vos virements.", "Your banking details to receive your payouts.")}
                </p>
                <form onSubmit={savePm} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Méthode", "Method")}</label>
                    <select value={pmType} onChange={e => setPmType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20">
                      <option value="WISE">Wise</option>
                      <option value="BANK_TN">{t("Banque TN (RIB)", "Tunisian bank (RIB)")}</option>
                      <option value="BANK_INTL">{t("Banque internationale (IBAN)", "International bank (IBAN)")}</option>
                      <option value="D17">D17</option>
                    </select>
                  </div>
                  {(pmType === "BANK_TN" || pmType === "BANK_INTL") && (
                    <>
                      <div>
                        <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Titulaire du compte", "Account holder")}</label>
                        <input type="text" value={pmHolder} onChange={e => setPmHolder(e.target.value)}
                          placeholder={t("Nom complet", "Full name")}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20" />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{pmType === "BANK_TN" ? "RIB" : "IBAN"}</label>
                        <input type="text" value={pmIban} onChange={e => setPmIban(e.target.value)}
                          placeholder={pmType === "BANK_TN" ? t("20 chiffres", "20 digits") : "FR76..."}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm font-mono text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20" />
                      </div>
                    </>
                  )}
                  {pmType === "WISE" && (
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Email Wise", "Wise email")}</label>
                      <input type="email" value={pmEmail} onChange={e => setPmEmail(e.target.value)}
                        placeholder="email@wise.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20" />
                    </div>
                  )}
                  {pmType === "D17" && (
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">{t("Numéro de téléphone", "Phone number")}</label>
                      <input type="tel" value={pmPhone} onChange={e => setPmPhone(e.target.value)}
                        placeholder="+216 XX XXX XXX"
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20" />
                    </div>
                  )}
                  {pmMsg && (
                    <p className={`text-xs font-semibold ${pmMsg.ok ? "text-green-600" : "text-red-500"}`}>{pmMsg.text}</p>
                  )}
                  <button type="submit" disabled={pmLoading}
                    className="px-5 py-2.5 bg-[#5C3D00] text-[#F5C400] font-bold text-sm rounded-xl hover:bg-[#3d2900] transition disabled:opacity-50">
                    {pmLoading ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
