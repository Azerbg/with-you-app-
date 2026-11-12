"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  createdAt: string;
  scheduledAt: string | null;
  status: string;
  sessionType: string;
  durationMins: number;
  amountUsd: number;
  provider: string;
  studentName: string;
  tutorName: string;
}

interface OverviewData {
  generatedAt: string;
  students:    { total: number; newWeek: number };
  sessions:    { upcoming: number; today: number; week: number; month: number };
  revenue:     { week: number; month: number; total: number };
  payoutsOwed: { amountUsd: number; sessionCount: number; tutorCount: number };
  misc:        { openDisputes: number; hrAwaiting: number };
  recentActivity: ActivityItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return `$${n.toFixed(dec)}`;
}

function timeAgo(iso: string, lang: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return lang === "fr" ? "à l'instant" : "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" });
}

function ProviderBadge({ p }: { p: string }) {
  if (p === "paypal")
    return <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">PayPal</span>;
  if (p === "stripe")
    return <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">Stripe</span>;
  return null;
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function Card({
  label, value, sub, color = "text-[#2D1A00]", href,
}: {
  label: string; value: string | number; sub?: string;
  color?: string; href?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-black/5 p-5 shadow-sm h-full ${href ? "hover:shadow-md transition cursor-pointer" : ""}`}>
      <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#9B8A6B] mt-1">{sub}</p>}
    </div>
  );
  return href ? <a href={href}>{inner}</a> : <div>{inner}</div>;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OverviewClient() {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const [data, setData]       = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pulse, setPulse]     = useState(false);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/admin/overview");
      if (!r.ok) return;
      const d = await r.json() as OverviewData;
      setData(d);
      setLastSync(new Date().toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-[#1A0F00]">{t("Vue d'ensemble", "Overview")}</h1>
            <p className="text-sm text-[#9B8A6B] mt-1 capitalize">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs text-[#9B8A6B] transition-opacity ${pulse ? "opacity-100" : "opacity-60"}`}>
              <span className={`w-2 h-2 rounded-full ${pulse ? "bg-green-500 animate-ping" : "bg-green-400"}`} />
              {t("Mis à jour", "Updated")} {lastSync}
            </span>
            <button onClick={() => load(true)}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] border border-[#D9D0C3] px-3 py-1 rounded-full transition">
              ↻ {t("Actualiser", "Refresh")}
            </button>
          </div>
        </div>

        {/* ── REVENUS ─────────────────────────────────────────────────── */}
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">{t("Revenus reçus", "Revenue received")}</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card label={t("Cette semaine", "This week")}  value={fmt(data.revenue.week)}  color="text-green-700" sub="USD" />
          <Card label={t("Ce mois",       "This month")} value={fmt(data.revenue.month)} color="text-green-700" sub="USD" />
          <Card label={t("Total (tout temps)", "All time")} value={fmt(data.revenue.total)} color="text-[#5C3D00]" sub="USD" />
        </div>

        {/* ── VIREMENTS À FAIRE ───────────────────────────────────────── */}
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">{t("À payer aux tuteurs", "Owed to tutors")}</p>
        {data.payoutsOwed.amountUsd > 0 ? (
          <a href="/dashboard/admin/payouts" className="block mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-3xl font-black text-orange-700">{fmt(data.payoutsOwed.amountUsd, 2)}</p>
                  <p className="text-sm text-orange-600 mt-1">
                    {data.payoutsOwed.sessionCount} {t("séance(s)", "session(s)")} · {data.payoutsOwed.tutorCount} {t("tuteur(s)", "tutor(s)")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">{t("En attente de paiement", "Awaiting payment")}</p>
                    <p className="text-xs text-orange-500 mt-0.5">{t("Payer manuellement via PayPal", "Pay manually via PayPal")}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </a>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm font-semibold text-green-700">{t("Tous les tuteurs sont à jour — aucun virement en attente.", "All tutors are up to date — no pending payouts.")}</p>
          </div>
        )}

        {/* ── SÉANCES ─────────────────────────────────────────────────── */}
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">{t("Séances", "Sessions")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card label={t("Aujourd'hui",    "Today")}      value={data.sessions.today}    sub={t("confirmées", "confirmed")} />
          <Card label={t("Cette semaine",  "This week")}  value={data.sessions.week}     sub={t("tenues/confirmées", "held/confirmed")} />
          <Card label={t("Ce mois",        "This month")} value={data.sessions.month}    />
          <Card label={t("À venir",        "Upcoming")}   value={data.sessions.upcoming} color="text-blue-700" sub={t("programmées", "scheduled")} href="/dashboard/admin/bookings" />
        </div>

        {/* ── ÉTUDIANTS + DIVERS ──────────────────────────────────────── */}
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">{t("Plateforme", "Platform")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card label={t("Étudiants",         "Students")}         value={data.students.total}        sub={`+${data.students.newWeek} ${t("cette semaine", "this week")}`} href="/dashboard/admin/users" />
          <Card label={t("Nouveaux (semaine)", "New (week)")}       value={data.students.newWeek}      color="text-blue-700" />
          <Card label={t("Litiges ouverts",   "Open disputes")}     value={data.misc.openDisputes}     color={data.misc.openDisputes > 0 ? "text-red-600" : "text-[#2D1A00]"} href="/dashboard/admin/disputes" />
          <Card label={t("Candidats RH",      "HR candidates")}    value={data.misc.hrAwaiting}       color={data.misc.hrAwaiting > 0 ? "text-purple-600" : "text-[#2D1A00]"} href="/console/hr" />
        </div>

        {/* ── ACTIVITÉ RÉCENTE ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <p className="font-bold text-[#2D1A00] text-sm">{t("Paiements récents", "Recent payments")}</p>
            <a href="/dashboard/admin/finance" className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">{t("Voir tous →", "View all →")}</a>
          </div>
          <div className="divide-y divide-black/5">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-[#9B8A6B] text-center py-8">{t("Aucun paiement reçu", "No payments yet")}</p>
            ) : data.recentActivity.map(a => (
              <a key={a.id} href={`/dashboard/admin/bookings/${a.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F0] transition">
                {/* Provider icon */}
                <div className="w-8 h-8 rounded-lg bg-[#F2EFE9] flex items-center justify-center flex-shrink-0 text-sm">
                  {a.provider === "paypal" ? "🅿" : "💳"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D1A00] truncate">{a.studentName}</p>
                  <p className="text-xs text-[#9B8A6B] truncate">
                    {t("avec", "with")} {a.tutorName} · {a.sessionType === "DISCOVERY" ? t("Découverte", "Discovery") : t("Séance", "Session")} {a.durationMins} min
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-700">+{fmt(a.amountUsd, 2)}</p>
                  <p className="text-[10px] text-[#9B8A6B]">{timeAgo(a.createdAt, lang)}</p>
                </div>
                <ProviderBadge p={a.provider} />
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
