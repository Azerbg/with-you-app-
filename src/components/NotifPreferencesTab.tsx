"use client";

import { useEffect, useState } from "react";

interface NotifPreferences {
  emailBookings: boolean;
  emailReminders: boolean;
  emailMessages: boolean;
  emailReviews: boolean;
  emailPayouts: boolean;
  emailReferrals: boolean;
  inAppBookings: boolean;
  inAppReminders: boolean;
  inAppMessages: boolean;
  inAppReviews: boolean;
  inAppReferrals: boolean;
}

const EMAIL_CATEGORIES = [
  { key: "emailBookings",  label: "Confirmations de réservation", desc: "Reçu quand une séance est confirmée ou annulée" },
  { key: "emailReminders", label: "Rappels de séance",            desc: "Rappels 24h et 1h avant chaque séance" },
  { key: "emailMessages",  label: "Nouveaux messages",            desc: "Notification email quand vous recevez un message" },
  { key: "emailReviews",   label: "Avis & évaluations",          desc: "Invitation à laisser un avis après une séance" },
  { key: "emailPayouts",   label: "Virements (tuteurs)",         desc: "Confirmation quand un virement est traité" },
  { key: "emailReferrals", label: "Parrainage",                  desc: "Crédits reçus via le programme de parrainage" },
] as const;

const INAPP_CATEGORIES = [
  { key: "inAppBookings",  label: "Réservations",   desc: "Nouvelles réservations et annulations" },
  { key: "inAppReminders", label: "Rappels",         desc: "Rappels de séance dans l'app" },
  { key: "inAppMessages",  label: "Messages",        desc: "Nouveaux messages dans la messagerie" },
  { key: "inAppReviews",   label: "Avis",            desc: "Invitations et réponses aux avis" },
  { key: "inAppReferrals", label: "Parrainage",      desc: "Crédits et activité de parrainage" },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        checked ? "bg-[#F5C400]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotifPreferencesTab() {
  const [prefs, setPrefs] = useState<NotifPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile/notifications")
      .then((r) => r.json())
      .then(setPrefs);
  }, []);

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggle(key: keyof NotifPreferences) {
    setPrefs((p) => p ? { ...p, [key]: !p[key] } : p);
    setSaved(false);
  }

  if (!prefs) {
    return <div className="py-12 text-center text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <div>
        <h3 className="text-sm font-bold text-[#3d2900] uppercase tracking-widest mb-3">
          Notifications par email
        </h3>
        <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
          {EMAIL_CATEGORIES.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2D1A00]">{label}</p>
                <p className="text-xs text-[#9B8A6B] mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={prefs[key as keyof NotifPreferences]}
                onChange={() => toggle(key as keyof NotifPreferences)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* In-app notifications */}
      <div>
        <h3 className="text-sm font-bold text-[#3d2900] uppercase tracking-widest mb-3">
          Notifications dans l&apos;application
        </h3>
        <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
          {INAPP_CATEGORIES.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2D1A00]">{label}</p>
                <p className="text-xs text-[#9B8A6B] mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={prefs[key as keyof NotifPreferences]}
                onChange={() => toggle(key as keyof NotifPreferences)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#FFDE59] transition disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer les préférences"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Préférences sauvegardées ✓</span>
        )}
      </div>
    </div>
  );
}
