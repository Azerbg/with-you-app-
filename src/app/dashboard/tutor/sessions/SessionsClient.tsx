"use client";

import { useState } from "react";

interface Session {
  id: string;
  studentName: string;
  studentInitials: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  earnings: number | null;
  currency: string | null;
}

interface Props {
  fullName: string;
  initials: string;
  photo: string | null;
  profileComplete: boolean;
  sessions: Session[];
  totalEarnings: number;
  currency: string | null;
}

type Tab = "upcoming" | "past" | "all";

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return "Demain";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Tunis",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CONFIRMED: { label: "Confirmé", cls: "bg-emerald-50 text-emerald-700" },
    PENDING:   { label: "En attente", cls: "bg-amber-50 text-amber-700" },
    CANCELLED: { label: "Annulé", cls: "bg-red-50 text-red-600" },
    COMPLETED: { label: "Terminé", cls: "bg-[#F5F0E8] text-[#6B5E44]" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, { icon: string; title: string; sub: string }> = {
    upcoming: { icon: "📅", title: "Aucune séance à venir", sub: "Vos prochaines réservations apparaîtront ici." },
    past:     { icon: "📂", title: "Aucune séance passée", sub: "Vos séances terminées s'afficheront ici." },
    all:      { icon: "📭", title: "Aucune séance pour l'instant", sub: "Les réservations des étudiants apparaîtront ici." },
  };
  const m = msgs[tab];
  return (
    <div className="py-16 text-center">
      <div className="text-5xl mb-4">{m.icon}</div>
      <p className="text-sm font-bold text-[#5C3D00]">{m.title}</p>
      <p className="text-xs text-[#9B8A6B] mt-1">{m.sub}</p>
    </div>
  );
}

function SessionCard({ s }: { s: Session }) {
  const isPast = new Date(s.scheduledAt) < new Date();
  return (
    <div className="px-6 py-4 flex items-center gap-4 hover:bg-[#FFFBEA] transition">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0 text-[#5C3D00] font-bold text-sm">
        {s.studentInitials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#2D1A00] truncate">{s.studentName}</p>
        <p className="text-xs text-[#9B8A6B] mt-0.5">
          <span className={`font-semibold ${isPast ? "text-[#9B8A6B]" : "text-[#5C3D00]"}`}>
            {formatDay(s.scheduledAt)}
          </span>
          {" · "}{formatTime(s.scheduledAt)} · {s.durationMins} min
        </p>
      </div>

      {/* Earnings */}
      {s.earnings != null && s.earnings > 0 && (
        <span className="text-sm font-bold text-[#5C3D00] flex-shrink-0">
          {s.earnings} {s.currency ?? "TND"}
        </span>
      )}

      <StatusBadge status={s.status} />
    </div>
  );
}

export default function SessionsClient({
  fullName, initials, photo, profileComplete, sessions, totalEarnings, currency,
}: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");

  const now = new Date();

  const upcoming = sessions.filter(
    (s) => new Date(s.scheduledAt) >= now && s.status !== "CANCELLED",
  );
  const past = sessions.filter(
    (s) => new Date(s.scheduledAt) < now || s.status === "COMPLETED" || s.status === "CANCELLED",
  );

  const displayed = tab === "upcoming" ? upcoming : tab === "past" ? past : sessions;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: "À venir", count: upcoming.length },
    { key: "past",     label: "Passées",  count: past.length },
    { key: "all",      label: "Toutes",   count: sessions.length },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-xs text-[#9B8A6B] mb-1">Séances à venir</p>
              <p className="text-3xl font-bold text-[#2D1A00]">{upcoming.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <p className="text-xs text-[#9B8A6B] mb-1">Séances passées</p>
              <p className="text-3xl font-bold text-[#2D1A00]">{past.length}</p>
            </div>
            <div className="bg-[#5C3D00] rounded-2xl p-5">
              <p className="text-xs text-white/50 mb-1">Revenus totaux</p>
              <p className="text-3xl font-bold text-[#F5C400]">
                {totalEarnings > 0 ? `${totalEarnings} ${currency ?? "TND"}` : "—"}
              </p>
            </div>
          </div>

          {/* Main card */}
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">

            {/* Tabs */}
            <div className="px-6 pt-5 pb-0 border-b border-black/5 flex items-center gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition -mb-px ${
                    tab === t.key
                      ? "border-[#F5C400] text-[#5C3D00]"
                      : "border-transparent text-[#9B8A6B] hover:text-[#5C3D00]"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.key ? "bg-[#F5C400] text-[#5C3D00]" : "bg-[#F0EAD8] text-[#9B8A6B]"
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Session list */}
            {displayed.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <div className="divide-y divide-black/4">
                {displayed.map((s) => (
                  <SessionCard key={s.id} s={s} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
  );
}
