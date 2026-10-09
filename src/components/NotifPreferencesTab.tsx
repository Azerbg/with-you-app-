"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

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

interface Props {
  isStudent?: boolean;
}

const EMAIL_CATEGORIES = [
  {
    key: "emailBookings",
    label: { fr: "Confirmations de réservation", en: "Booking confirmations" },
    desc:  { fr: "Reçu quand une séance est confirmée ou annulée", en: "Received when a session is confirmed or cancelled" },
  },
  {
    key: "emailReminders",
    label: { fr: "Rappels de séance",   en: "Session reminders"  },
    desc:  { fr: "Rappels 24h et 1h avant chaque séance", en: "Reminders 24h and 1h before each session" },
  },
  {
    key: "emailMessages",
    label: { fr: "Nouveaux messages", en: "New messages" },
    desc:  { fr: "Notification email quand vous recevez un message", en: "Email notification when you receive a message" },
  },
  {
    key: "emailReviews",
    label: { fr: "Avis & évaluations", en: "Reviews & ratings" },
    desc:  { fr: "Invitation à laisser un avis après une séance", en: "Invitation to leave a review after a session" },
  },
  {
    key: "emailPayouts",
    tutorOnly: true,
    label: { fr: "Virements (tuteurs)",  en: "Payouts (tutors)" },
    desc:  { fr: "Confirmation quand un virement est traité", en: "Confirmation when a payout is processed" },
  },
  {
    key: "emailReferrals",
    label: { fr: "Parrainage", en: "Referral" },
    desc:  { fr: "Crédits reçus via le programme de parrainage", en: "Credits received via the referral program" },
  },
] as const;

const INAPP_CATEGORIES = [
  {
    key: "inAppBookings",
    label: { fr: "Réservations", en: "Bookings" },
    desc:  { fr: "Nouvelles réservations et annulations", en: "New bookings and cancellations" },
  },
  {
    key: "inAppReminders",
    label: { fr: "Rappels",  en: "Reminders" },
    desc:  { fr: "Rappels de séance dans l'app", en: "Session reminders in the app" },
  },
  {
    key: "inAppMessages",
    label: { fr: "Messages", en: "Messages" },
    desc:  { fr: "Nouveaux messages dans la messagerie", en: "New messages in the inbox" },
  },
  {
    key: "inAppReviews",
    label: { fr: "Avis",      en: "Reviews"  },
    desc:  { fr: "Invitations et réponses aux avis", en: "Review invitations and responses" },
  },
  {
    key: "inAppReferrals",
    label: { fr: "Parrainage", en: "Referral" },
    desc:  { fr: "Crédits et activité de parrainage", en: "Credits and referral activity" },
  },
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

export default function NotifPreferencesTab({ isStudent }: Props) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

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
    return <div className="py-12 text-center text-sm text-gray-400">{t("Chargement…", "Loading…")}</div>;
  }

  const emailCats = EMAIL_CATEGORIES.filter((c) => !(isStudent && "tutorOnly" in c && c.tutorOnly));

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <div>
        <h3 className="text-sm font-bold text-[#3d2900] uppercase tracking-widest mb-3">
          {t("Notifications par email", "Email notifications")}
        </h3>
        <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
          {emailCats.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2D1A00]">{label[lang as "fr" | "en"] ?? label.fr}</p>
                <p className="text-xs text-[#9B8A6B] mt-0.5">{desc[lang as "fr" | "en"] ?? desc.fr}</p>
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
          {t("Notifications dans l'application", "In-app notifications")}
        </h3>
        <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
          {INAPP_CATEGORIES.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-[#2D1A00]">{label[lang as "fr" | "en"] ?? label.fr}</p>
                <p className="text-xs text-[#9B8A6B] mt-0.5">{desc[lang as "fr" | "en"] ?? desc.fr}</p>
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
          {saving ? t("Enregistrement…", "Saving…") : t("Enregistrer les préférences", "Save preferences")}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            {t("Préférences sauvegardées ✓", "Preferences saved ✓")}
          </span>
        )}
      </div>
    </div>
  );
}
