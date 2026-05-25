"use client";

import Link from "next/link";
import TutorSidebar from "@/components/TutorSidebar";

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
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });
}

export default function TutorDashboardContent({
  fullName,
  initials,
  photo,
  profileComplete,
  stats,
  upcomingSessions,
  offerHourlyRate,
  offerCurrency,
}: Props) {
  const firstName = fullName.split(" ")[0];

  return (
    <div className="flex min-h-screen bg-[#FAF8F0]">
      <TutorSidebar
        fullName={fullName}
        initials={initials}
        photo={photo}
        profileComplete={profileComplete}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-4xl mx-auto px-5 py-8 space-y-7">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#2D1A00]">
              Bonjour, {firstName} 👋
            </h1>
            <p className="text-sm text-[#6B5E44] mt-1">
              Bienvenue dans votre espace tuteur WithYou.
            </p>
          </div>

          {/* Profile incomplete banner */}
          {!profileComplete && (
            <div className="bg-[#FFF3B0] border border-[#F5C400] rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F5C400] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#5C3D00]">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#5C3D00]">Profil incomplet</p>
                  <p className="text-xs text-[#6B5E44]">Complétez votre profil pour apparaître dans les recherches des étudiants.</p>
                </div>
              </div>
              <Link
                href="/dashboard/tutor/complete-profile"
                className="flex-shrink-0 bg-[#5C3D00] text-[#F5C400] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#3d2900] transition"
              >
                Compléter →
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Séances complétées",
                value: stats.sessionsCompleted,
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ),
                color: "text-green-600 bg-green-50",
              },
              {
                label: "Séances à venir",
                value: stats.upcomingSessions,
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                ),
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Étudiants actifs",
                value: stats.studentsCount,
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                ),
                color: "text-purple-600 bg-purple-50",
              },
              {
                label: "Revenus ce mois",
                value: stats.earningsThisMonth > 0
                  ? `${stats.earningsThisMonth} ${offerCurrency ?? "TND"}`
                  : "—",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                ),
                color: "text-yellow-600 bg-yellow-50",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-[#E8E0D4] rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-[#2D1A00]">{stat.value}</p>
                <p className="text-xs text-[#7A6B55] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Upcoming sessions */}
            <div className="bg-white border border-[#E8E0D4] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F0EAD8] flex items-center justify-between">
                <p className="font-bold text-[#2D1A00] text-sm">Prochaines séances</p>
                <Link href="/dashboard/tutor/sessions" className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">
                  Tout voir →
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#9B8A6B]">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#9B8A6B]">Aucune séance planifiée</p>
                  <p className="text-xs text-[#C4BAA8] mt-1">Les réservations des étudiants apparaîtront ici</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0EAD8]">
                  {upcomingSessions.slice(0, 4).map((s) => (
                    <div key={s.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#5C3D00]">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2D1A00] truncate">{s.studentName}</p>
                        <p className="text-xs text-[#9B8A6B]">{formatDate(s.scheduledAt)} · {s.durationMins} min</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                        {s.status === "CONFIRMED" ? "Confirmé" : "En attente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest px-1">Actions rapides</p>

              {[
                {
                  href: "/dashboard/tutor/availability",
                  title: "Gérer mes disponibilités",
                  desc: "Définissez vos créneaux pour recevoir des réservations",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00]">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  ),
                },
                {
                  href: "/dashboard/tutor/complete-profile",
                  title: "Modifier mon profil",
                  desc: "Bio, photo, niveaux et spécialisations",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00]">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  ),
                },
                {
                  href: "/dashboard/tutor/sessions",
                  title: "Historique des séances",
                  desc: "Consultez toutes vos séances passées et à venir",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#5C3D00]">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  ),
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 bg-white border border-[#E8E0D4] rounded-2xl px-5 py-4 hover:border-[#F5C400] hover:bg-[#FFFBEA] transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center flex-shrink-0 group-hover:bg-[#F5C400]/20 transition">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2D1A00]">{action.title}</p>
                    <p className="text-xs text-[#9B8A6B] truncate">{action.desc}</p>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#C4BAA8] group-hover:text-[#5C3D00] transition flex-shrink-0">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              ))}

              {/* Rate card */}
              {offerHourlyRate && (
                <div className="bg-[#2D1A00] rounded-2xl px-5 py-4">
                  <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">Votre taux horaire</p>
                  <p className="text-2xl font-bold text-[#F5C400]">
                    {offerHourlyRate} <span className="text-base">{offerCurrency ?? "TND"}/h</span>
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
