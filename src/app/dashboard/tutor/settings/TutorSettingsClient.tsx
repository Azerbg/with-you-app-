"use client";

import { useState } from "react";

interface Contact {
  fullName: string;
  phone: string | null;
  city: string | null;
  country: string | null;
}

interface Props {
  email: string;
  hasPassword: boolean;
  isHidden: boolean;
  contact: Contact;
}

type Tab = "compte" | "contact";

export default function TutorSettingsClient({ email, hasPassword, isHidden: initialHidden, contact }: Props) {
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
      setVisibilityMsg(!isHidden ? "Profil masqué aux étudiants." : "Profil visible aux étudiants.");
    } catch {
      setVisibilityMsg("Une erreur est survenue.");
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ text: "Les mots de passe ne correspondent pas.", ok: false });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ text: "Le mot de passe doit contenir au moins 8 caractères.", ok: false });
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
        setPwMsg({ text: data.error ?? "Erreur.", ok: false });
      } else {
        setPwMsg({ text: "Mot de passe mis à jour.", ok: true });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch {
      setPwMsg({ text: "Une erreur est survenue.", ok: false });
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
      setDeactivateMsg("Votre demande a été envoyée à l'équipe WithYou. Nous vous contacterons sous 48h.");
      setDeactivateConfirm(false);
    } catch {
      setDeactivateMsg("Une erreur est survenue. Contactez support@withyou.com directement.");
    } finally {
      setDeactivateLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "compte", label: "Compte" },
    { key: "contact", label: "Informations de contact" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center px-8 flex-shrink-0">
        <h1 className="text-base font-bold text-[#5C3D00]">Paramètres</h1>
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
                    <p className="font-bold text-[#2D1A00] text-sm mb-1">Visibilité du profil</p>
                    <p className="text-xs text-[#6B5E44] leading-relaxed">
                      {isHidden
                        ? "Votre profil est masqué. Les étudiants ne peuvent pas vous trouver dans la recherche."
                        : "Votre profil est visible. Les étudiants peuvent vous trouver et vous contacter."}
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
                  <p className="font-bold text-[#2D1A00] text-sm mb-4">Changer le mot de passe</p>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">Mot de passe actuel</label>
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
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                        minLength={8}
                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-[#2D1A00] bg-[#FAFAF8] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20"
                        placeholder="Min. 8 caractères"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B5E44] mb-1.5 font-medium">Confirmer le nouveau mot de passe</label>
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
                      {pwLoading ? "Enregistrement…" : "Mettre à jour"}
                    </button>
                  </form>
                </div>
              )}

              {!hasPassword && (
                <div className="bg-white border border-black/5 rounded-2xl p-6">
                  <p className="font-bold text-[#2D1A00] text-sm mb-1">Mot de passe</p>
                  <p className="text-xs text-[#6B5E44]">
                    Vous utilisez la connexion Google. Aucun mot de passe n&apos;est défini sur ce compte.
                  </p>
                </div>
              )}

              {/* Deactivate account */}
              <div className="bg-white border border-red-100 rounded-2xl p-6">
                <p className="font-bold text-red-700 text-sm mb-1">Désactiver mon compte</p>
                <p className="text-xs text-[#6B5E44] mb-4 leading-relaxed">
                  En désactivant votre compte, votre profil sera masqué et aucune nouvelle réservation ne sera possible.
                  Les séances déjà planifiées seront maintenues. Vous pouvez réactiver votre compte à tout moment en contactant l&apos;équipe WithYou.
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
                      {deactivateLoading ? "Envoi…" : "Confirmer la demande"}
                    </button>
                    <button
                      onClick={() => setDeactivateConfirm(false)}
                      className="px-4 py-2 text-sm text-[#6B5E44] hover:text-[#5C3D00] font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeactivateConfirm(true)}
                    className="px-4 py-2 border border-red-200 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition"
                  >
                    Demander la désactivation
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
                  <p className="font-bold text-[#2D1A00] text-sm">Informations personnelles</p>
                  <span className="text-xs text-[#9B8A6B] bg-[#F7F5F0] px-2.5 py-1 rounded-lg">Lecture seule</span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Nom complet", value: contact.fullName || "—" },
                    { label: "Adresse e-mail", value: email },
                    { label: "Téléphone", value: contact.phone || "—" },
                    { label: "Ville", value: contact.city || "—" },
                    { label: "Pays", value: contact.country || "—" },
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
                  Pour modifier vos informations personnelles (nom, téléphone, adresse), contactez l&apos;équipe WithYou à{" "}
                  <span className="font-bold">support@withyou.com</span>. Toute modification est soumise à validation RH.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
