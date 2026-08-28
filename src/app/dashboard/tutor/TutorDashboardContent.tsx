"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface ConnectStatus {
  connected: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  sessionCount: number;
  createdAt: string;
  stripeTransferId?: string | null;
}

function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    fetch("/api/stripe/connect/status")
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false }));
    fetch("/api/stripe/payouts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPayouts(data); });
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      let data: { url?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* empty body */ }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setConnectError(data.error ?? `Erreur serveur (${res.status}). Vérifiez les logs Vercel.`);
        setConnecting(false);
      }
    } catch {
      setConnectError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setConnecting(false);
    }
  }

  if (!status) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-5">
        <div className="h-4 bg-[#F2EFE9] rounded animate-pulse w-32 mb-3" />
        <div className="h-3 bg-[#F2EFE9] rounded animate-pulse w-48" />
      </div>
    );
  }

  const isFullySetup = status.connected && status.detailsSubmitted && status.payoutsEnabled;
  const isPartial = status.connected && !isFullySetup;

  return (
    <>
      {/* Connect card */}
      <div className={`rounded-2xl border p-5 ${isFullySetup ? "bg-emerald-50 border-emerald-200" : isPartial ? "bg-amber-50 border-amber-200" : "bg-white border-black/5"}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isFullySetup ? "bg-emerald-100 text-emerald-600" : isPartial ? "bg-amber-100 text-amber-600" : "bg-[#F5C400]/20 text-[#C49200]"}`}>
            {isFullySetup ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="font-bold text-[#2D1A00] text-sm">Compte bancaire</p>
        </div>

        {isFullySetup ? (
          <>
            <p className="text-xs text-emerald-700 font-semibold mb-1">✓ Compte connecté et actif</p>
            <p className="text-xs text-emerald-600">Les virements hebdomadaires sont activés (chaque vendredi).</p>
          </>
        ) : isPartial ? (
          <>
            <p className="text-xs text-amber-700 font-semibold mb-1">Finalisation requise</p>
            <p className="text-xs text-amber-600 mb-3">Votre onboarding Stripe est incomplet.</p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-amber-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition disabled:opacity-50"
            >
              {connecting ? "Chargement…" : "Finaliser l'inscription →"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6B5E44] mb-3">Connectez votre compte bancaire pour recevoir vos virements chaque vendredi.</p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-[#5C3D00] text-[#F5C400] py-2 rounded-xl text-xs font-bold hover:bg-[#3d2900] transition disabled:opacity-50"
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
                  Chargement…
                </span>
              ) : "Connecter mon compte →"}
            </button>
          </>
        )}
        {connectError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {connectError}
          </p>
        )}
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <p className="font-bold text-[#2D1A00] text-sm">Historique des virements</p>
          </div>
          <div className="divide-y divide-black/4">
            {payouts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-bold text-[#2D1A00]">
                    {p.amount.toFixed(0)} {p.currency}
                  </p>
                  <p className="text-[11px] text-[#9B8A6B] mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{p.sessionCount} séance{p.sessionCount > 1 ? "s" : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  p.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                  p.status === "FAILED" ? "bg-red-50 text-red-600" :
                  "bg-amber-50 text-amber-700"
                }`}>
                  {p.status === "PAID" ? "Versé" : p.status === "FAILED" ? "Échec" : "En cours"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface UpcomingSession {
  id: string;
  studentName: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
}

interface Props {
  fullName: string;
  initials: string;
  photo: string | null;
  profileComplete: boolean;
  stats: {
    sessionsCompleted: number;
    upcomingSessions: number;
    studentsCount: number;
    earningsThisMonth: number;
  };
  upcomingSessions: UpcomingSession[];
  offerHourlyRate: number | null;
  offerCurrency: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
  });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Tunis" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" });
}

export default function TutorDashboardContent({
  fullName, initials, photo, profileComplete, stats, upcomingSessions, offerHourlyRate, offerCurrency,
}: Props) {
  const firstName = fullName.split(" ")[0];

  const statCards = [
    {
      label: "Séances complétées",
      value: stats.sessionsCompleted,
      icon: "✅",
      bg: "bg-emerald-500",
      light: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Séances à venir",
      value: stats.upcomingSessions,
      icon: "📅",
      bg: "bg-blue-500",
      light: "bg-blue-50 text-blue-700",
    },
    {
      label: "Étudiants actifs",
      value: stats.studentsCount,
      icon: "👥",
      bg: "bg-purple-500",
      light: "bg-purple-50 text-purple-700",
    },
    {
      label: "Revenus ce mois",
      value: stats.earningsThisMonth > 0 ? `${stats.earningsThisMonth} ${offerCurrency ?? "TND"}` : "—",
      icon: "💰",
      bg: "bg-[#F5C400]",
      light: "bg-[#FFF3B0] text-[#5C3D00]",
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">

          {/* Hero greeting */}
          <div className="relative bg-[#5C3D00] rounded-3xl p-7 mb-8 overflow-hidden">
            {/* decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#F5C400]/10" />
            <div className="absolute top-4 right-24 w-16 h-16 rounded-full bg-[#F5C400]/5" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[#F5C400]/60 text-xs font-bold uppercase tracking-widest mb-1">Espace tuteur</p>
                <h2 className="text-3xl font-bold text-white mb-1">Bonjour, {firstName} 👋</h2>
                <p className="text-white/50 text-sm">Bienvenue sur WithYou — continuez à faire la différence.</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-2xl flex-shrink-0 overflow-hidden shadow-lg">
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
            </div>
            {offerHourlyRate && (
              <div className="mt-5 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                <span className="text-[#F5C400] font-bold text-lg">{offerHourlyRate} {offerCurrency ?? "TND"}/h</span>
                <span className="text-white/40 text-xs">· taux horaire</span>
              </div>
            )}
          </div>

          {/* Profile incomplete banner */}
          {!profileComplete && (
            <div className="bg-[#FFF3B0] border border-[#F5C400] rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F5C400] flex items-center justify-center flex-shrink-0 text-base">⚠️</div>
                <div>
                  <p className="text-sm font-bold text-[#5C3D00]">Profil incomplet</p>
                  <p className="text-xs text-[#6B5E44]">Complétez votre profil pour apparaître dans les recherches des étudiants.</p>
                </div>
              </div>
              <Link href="/dashboard/tutor/complete-profile"
                className="flex-shrink-0 bg-[#5C3D00] text-[#F5C400] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#3d2900] transition whitespace-nowrap">
                Compléter →
              </Link>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] transition-shadow">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-4 ${s.light}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-[#2D1A00]">{s.value}</p>
                <p className="text-xs text-[#9B8A6B] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Two-col layout */}
          <div className="grid xl:grid-cols-3 gap-6">

            {/* Upcoming sessions — 2/3 */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <p className="font-bold text-[#2D1A00]">Prochaines séances</p>
                <Link href="/dashboard/tutor/sessions" className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition font-semibold">
                  Tout voir →
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm font-semibold text-[#5C3D00]">Aucune séance planifiée</p>
                  <p className="text-xs text-[#9B8A6B] mt-1">Les réservations des étudiants apparaîtront ici</p>
                </div>
              ) : (
                <div className="divide-y divide-black/4">
                  {upcomingSessions.slice(0, 5).map((s) => (
                    <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FFFBEA] transition">
                      <div className="w-10 h-10 rounded-xl bg-[#F5C400]/15 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00]">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#2D1A00] truncate">{s.studentName}</p>
                        <p className="text-xs text-[#9B8A6B] mt-0.5">
                          <span className="font-semibold text-[#5C3D00]">{formatDay(s.scheduledAt)}</span>
                          {" · "}{formatTime(s.scheduledAt)} · {s.durationMins} min
                        </p>
                      </div>
                      {(() => {
                        const now = Date.now();
                        const sessionMs = new Date(s.scheduledAt).getTime();
                        const canJoin = sessionMs - now <= 30 * 60 * 1000 && sessionMs - now > -s.durationMins * 60 * 1000;
                        return canJoin ? (
                          <a
                            href={`/classroom/${s.id}`}
                            className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#FFDE59] transition"
                          >
                            Rejoindre →
                          </a>
                        ) : (
                          <a
                            href={`/classroom/${s.id}`}
                            className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-[#E8E0D4] text-[#9B8A6B] bg-[#FAF8F0] hover:bg-[#F0EAD8] transition"
                          >
                            Salle de classe →
                          </a>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column — 1/3 */}
            <div className="space-y-4">

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-black/5">
                  <p className="font-bold text-[#2D1A00] text-sm">Actions rapides</p>
                </div>
                <div className="divide-y divide-black/4">
                  {[
                    { href: "/dashboard/tutor/availability", icon: "🗓️", title: "Disponibilités" },
                    { href: "/dashboard/tutor/complete-profile", icon: "✏️", title: "Mon profil" },
                    { href: "/dashboard/tutor/sessions", icon: "📋", title: "Mes séances" },
                  ].map((a) => (
                    <Link key={a.href} href={a.href}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FFFBEA] transition group">
                      <span className="text-lg">{a.icon}</span>
                      <span className="text-sm font-semibold text-[#2D1A00] flex-1">{a.title}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#C4BAA8] group-hover:text-[#5C3D00] transition">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stripe Connect + Payout history */}
              <StripeConnectCard />

              {/* Tips card */}
              <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
                  <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-wide">Conseil du jour</p>
                </div>
                <p className="text-sm text-[#6B5E44] leading-relaxed">
                  Complétez votre profil et définissez vos disponibilités pour recevoir vos premières réservations.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
  );
}
