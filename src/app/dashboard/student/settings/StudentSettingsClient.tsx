"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import NotifPreferencesTab from "@/components/NotifPreferencesTab";

type Tab = "notifications" | "security" | "account";

export default function StudentSettingsClient() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  const [tab, setTab] = useState<Tab>("notifications");

  // Password change state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwError, setPwError]       = useState<string | null>(null);
  const [pwSuccess, setPwSuccess]   = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPw !== confirmPw) {
      setPwError(t("Les mots de passe ne correspondent pas.", "Passwords do not match."));
      return;
    }
    if (newPw.length < 8) {
      setPwError(t("Le nouveau mot de passe doit faire au moins 8 caractères.", "New password must be at least 8 characters."));
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/tutor/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? t("Erreur inconnue.", "Unknown error."));
      } else {
        setPwSuccess(true);
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      }
    } finally {
      setDeleting(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "notifications", label: t("Notifications", "Notifications") },
    { id: "security",      label: t("Sécurité", "Security") },
    { id: "account",       label: t("Compte", "Account") },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#2D1A00] mb-2">{t("Paramètres", "Settings")}</h1>
        <p className="text-sm text-[#9B8A6B] mb-8">{t("Gérez vos préférences et votre compte.", "Manage your preferences and account.")}</p>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[#F2EFE9] p-1 rounded-xl mb-8">
          {TABS.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                tab === tb.id
                  ? "bg-white text-[#5C3D00] shadow-sm"
                  : "text-[#6B5E44] hover:text-[#5C3D00]"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Notifications tab */}
        {tab === "notifications" && <NotifPreferencesTab isStudent />}

        {/* Security tab */}
        {tab === "security" && (
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#3d2900] uppercase tracking-widest mb-4">
                {t("Changer le mot de passe", "Change password")}
              </h2>

              <div>
                <label className="block text-sm font-semibold text-[#2D1A00] mb-1.5">
                  {t("Mot de passe actuel", "Current password")}
                </label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  required
                  className="w-full border border-[#D9D0C3] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2D1A00] mb-1.5">
                  {t("Nouveau mot de passe", "New password")}
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-[#D9D0C3] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2D1A00] mb-1.5">
                  {t("Confirmer le nouveau mot de passe", "Confirm new password")}
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  className="w-full border border-[#D9D0C3] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                />
              </div>

              {pwError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
                  {t("Mot de passe mis à jour avec succès.", "Password updated successfully.")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pwSaving}
              className="bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#FFDE59] transition disabled:opacity-50"
            >
              {pwSaving ? t("Enregistrement…", "Saving…") : t("Mettre à jour le mot de passe", "Update password")}
            </button>
          </form>
        )}

        {/* Account tab */}
        {tab === "account" && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-2">
                {t("Zone de danger", "Danger zone")}
              </h2>
              <p className="text-sm text-red-700 mb-5">
                {t(
                  "La suppression de votre compte est permanente. Toutes vos données, séances et historique seront définitivement effacés.",
                  "Deleting your account is permanent. All your data, sessions, and history will be permanently erased."
                )}
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition"
              >
                {t("Supprimer mon compte", "Delete my account")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-[#2D1A00] mb-2">
              {t("Supprimer le compte ?", "Delete account?")}
            </h3>
            <p className="text-sm text-[#6B5E44] mb-5">
              {t(
                "Tapez SUPPRIMER pour confirmer. Cette action est irréversible.",
                "Type DELETE to confirm. This action cannot be undone."
              )}
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={t("SUPPRIMER", "DELETE")}
              className="w-full border border-[#D9D0C3] rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 py-2.5 rounded-xl border border-[#D9D0C3] text-sm font-semibold text-[#6B5E44] hover:bg-[#FAF8F0] transition"
              >
                {t("Annuler", "Cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || (deleteConfirm !== "SUPPRIMER" && deleteConfirm !== "DELETE")}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40"
              >
                {deleting ? t("Suppression…", "Deleting…") : t("Supprimer", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
