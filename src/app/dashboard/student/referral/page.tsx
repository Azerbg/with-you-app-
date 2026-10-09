"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useZone, ZONES } from "@/app/tutors/[id]/PricingCard";
import type { PriceZone } from "@/app/tutors/[id]/PricingCard";

// Fixed display reward amounts per zone (credits are stored in TND server-side)
const REFERRAL_REWARDS: Record<string, { referrer: number; referee: number }> = {
  TND: { referrer: 15, referee: 10 },
  USD: { referrer: 5,  referee: 3  },
  EUR: { referrer: 5,  referee: 3  },
  CAD: { referrer: 7,  referee: 4  },
  GBP: { referrer: 4,  referee: 3  },
};

// Format an amount in the given zone (e.g. "5 $", "5 €", "15 TND ")
function fmt(amount: number, zone: PriceZone): string {
  return `${amount}\u00a0${zone.symbol}`;
}

// Convert a TND credit balance to the display zone using session-price ratio
function creditDisplay(tndAmount: number, zone: PriceZone): string {
  const converted = Math.round(tndAmount * zone.session / ZONES.TND.session);
  return `${converted}\u00a0${zone.symbol}`;
}

interface ReferralData {
  code: string;
  creditBalance: number;
  totalReferred: number;
  rewarded: number;
  pending: number;
  referrals: { status: string; createdAt: string; name: string }[];
  hasBeenReferred: boolean;
  myReferralStatus: string | null;
}

export default function ReferralPage() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const zone = useZone();
  const rewards = REFERRAL_REWARDS[zone.code] ?? REFERRAL_REWARDS.USD;

  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/referral").then(r => r.json()).then(setData);
  }, []);

  function copyCode() {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    if (!data?.code) return;
    const url = `${window.location.origin}/auth/register?ref=${data.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    if (!applyCode.trim()) return;
    setApplying(true);
    setApplyMsg(null);
    const res = await fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: applyCode.trim().toUpperCase() }),
    });
    const d = await res.json();
    if (res.ok) {
      setApplyMsg({ type: "success", text: t(
        `Code appliqué ! Vous recevrez +${fmt(rewards.referee, zone)} après votre première séance.`,
        `Code applied! You'll receive +${fmt(rewards.referee, zone)} after your first session.`
      )});
      setApplyCode("");
      const fresh = await fetch("/api/referral").then(r => r.json());
      setData(fresh);
    } else {
      const msgs: Record<string, { fr: string; en: string }> = {
        ALREADY_APPLIED: { fr: "Vous avez déjà appliqué un code de parrainage.", en: "You've already applied a referral code." },
        INVALID_CODE:    { fr: "Code invalide. Vérifiez et réessayez.",           en: "Invalid code. Please check and try again." },
        SELF_REFERRAL:   { fr: "Vous ne pouvez pas utiliser votre propre code.",  en: "You can't use your own referral code." },
        TOO_LATE:        { fr: "Impossible d'appliquer un code après une séance.", en: "Referral code can't be applied after a session." },
      };
      const msg = msgs[d.error];
      setApplyMsg({ type: "error", text: msg ? (lang === "en" ? msg.en : msg.fr) : t("Erreur. Réessayez.", "Error. Please try again.") });
    }
    setApplying(false);
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <h1 className="text-2xl font-bold text-[#2D1A00]">{t("Parrainage", "Referral")}</h1>

        {/* Hero card */}
        <div className="bg-[#5C3D00] rounded-3xl p-7 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#F5C400]/10" />
          <div className="absolute bottom-0 left-16 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-[#F5C400]/70 text-xs font-bold uppercase tracking-widest mb-1">
              {t("Programme de parrainage", "Referral program")}
            </p>
            <h2 className="text-2xl font-bold mb-1">{t("Invitez un ami", "Invite a friend")}</h2>
            <p className="text-white/60 text-sm mb-5">
              {t(
                "Partagez votre code. Quand votre filleul complète sa première séance :",
                "Share your code. When your referral completes their first session:"
              )}<br />
              <strong className="text-[#F5C400]">+{fmt(rewards.referrer, zone)}</strong> {t("pour vous", "for you")} · <strong className="text-[#F5C400]">+{fmt(rewards.referee, zone)}</strong> {t("pour lui", "for them")}
            </p>

            {/* Code display */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">{t("Votre code", "Your code")}</p>
                <p className="text-2xl font-black tracking-widest text-[#F5C400]">{data.code}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={copyCode}
                  className="bg-[#F5C400] text-[#5C3D00] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#FFDE59] transition">
                  {copied ? t("Copié !", "Copied!") : t("Copier", "Copy")}
                </button>
                <button onClick={copyLink}
                  className="bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/20 transition border border-white/20">
                  {t("Lien", "Link")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t("Invités", "Referred"),       value: data.totalReferred },
            { label: t("Récompensés", "Rewarded"),   value: data.rewarded },
            { label: t("Solde crédits", "Credits"),  value: creditDisplay(data.creditBalance, zone) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-black/5 p-5 text-center">
              <p className="text-2xl font-bold text-[#2D1A00]">{s.value}</p>
              <p className="text-xs text-[#9B8A6B] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Apply a code (if not yet referred) */}
        {!data.hasBeenReferred && (
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <p className="font-bold text-[#2D1A00] mb-1">{t("Vous avez un code de parrainage ?", "Have a referral code?")}</p>
            <p className="text-xs text-[#9B8A6B] mb-4">
              {t(
                `Entrez le code d'un ami pour recevoir +${fmt(rewards.referee, zone)} après votre première séance.`,
                `Enter a friend's code to receive +${fmt(rewards.referee, zone)} after your first session.`
              )}
            </p>
            <div className="flex gap-3">
              <input
                value={applyCode}
                onChange={e => setApplyCode(e.target.value.toUpperCase())}
                placeholder={t("Ex: AZERBR-X4K2", "e.g. AZERBR-X4K2")}
                className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm font-mono tracking-wider text-[#5C3D00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
              />
              <button onClick={handleApply} disabled={applying || !applyCode.trim()}
                className="bg-[#F5C400] text-[#5C3D00] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
                {applying ? "…" : t("Appliquer", "Apply")}
              </button>
            </div>
            {applyMsg && (
              <p className={`text-xs mt-3 px-3 py-2 rounded-xl ${
                applyMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
              }`}>{applyMsg.text}</p>
            )}
          </div>
        )}

        {data.hasBeenReferred && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold text-emerald-700">
              ✓ {t("Vous avez été parrainé.", "You've been referred.")}
              {data.myReferralStatus === "REWARDED"
                ? ` ${t(`Votre bonus de +${fmt(rewards.referee, zone)} a été crédité !`, `Your +${fmt(rewards.referee, zone)} bonus has been credited!`)}`
                : ` ${t(`Complétez votre première séance pour recevoir +${fmt(rewards.referee, zone)}.`, `Complete your first session to receive +${fmt(rewards.referee, zone)}.`)}`}
            </p>
          </div>
        )}

        {/* Referral history */}
        {data.referrals.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00]">{t("Vos filleuls", "Your referrals")}</p>
            </div>
            <div className="divide-y divide-black/4">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2D1A00]">{r.name}</p>
                    <p className="text-xs text-[#9B8A6B]">
                      {new Date(r.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    r.status === "REWARDED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {r.status === "REWARDED" ? `+${fmt(rewards.referrer, zone)} ${t("crédité", "credited")}` : t("En attente", "Pending")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
