"use client";

import { useState, useRef, useEffect } from "react";
import type { TutorStats } from "@/lib/tutorStats";
import { useLanguage } from "@/context/LanguageContext";
import { fmtMoney } from "@/lib/money";

interface Session {
  id: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentImage: string | null;
  scheduledAt: string;
  durationMins: number;
  status: string;
  earnings: number | null;
  currency: string | null;
  hasCanvas: boolean;
}

interface Props {
  fullName: string;
  initials: string;
  photo: string | null;
  profileComplete: boolean;
  sessions: Session[];
  tutorStats: TutorStats;
  currency: string | null;
}

type Tab = "upcoming" | "past" | "all";

function formatDay(iso: string, lang: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return lang === "fr" ? "Aujourd'hui" : "Today";
  if (d.toDateString() === tomorrow.toDateString()) return lang === "fr" ? "Demain" : "Tomorrow";
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Tunis",
  });
}

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });
}

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const map: Record<string, { fr: string; en: string; cls: string }> = {
    CONFIRMED: { fr: "Confirmé",   en: "Confirmed",  cls: "bg-emerald-50 text-emerald-700" },
    PENDING:   { fr: "En attente", en: "Pending",    cls: "bg-amber-50 text-amber-700" },
    CANCELLED: { fr: "Annulé",     en: "Cancelled",  cls: "bg-red-50 text-red-600" },
    COMPLETED: { fr: "Terminé",    en: "Completed",  cls: "bg-[#F5F0E8] text-[#6B5E44]" },
  };
  const entry = map[status];
  const label = entry ? (lang === "fr" ? entry.fr : entry.en) : status;
  const cls   = entry?.cls ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function EmptyState({ tab, lang }: { tab: Tab; lang: string }) {
  const msgs: Record<Tab, { icon: string; fr: { title: string; sub: string }; en: { title: string; sub: string } }> = {
    upcoming: { icon: "📅", fr: { title: "Aucune séance à venir",       sub: "Vos prochaines réservations apparaîtront ici." }, en: { title: "No upcoming sessions",  sub: "Your upcoming bookings will appear here." } },
    past:     { icon: "📂", fr: { title: "Aucune séance passée",         sub: "Vos séances terminées s'afficheront ici." },       en: { title: "No past sessions",      sub: "Your completed sessions will appear here." } },
    all:      { icon: "📭", fr: { title: "Aucune séance pour l'instant", sub: "Les réservations des étudiants apparaîtront ici." }, en: { title: "No sessions yet",      sub: "Student bookings will appear here." } },
  };
  const m = msgs[tab];
  const txt = lang === "fr" ? m.fr : m.en;
  return (
    <div className="py-16 text-center">
      <div className="text-5xl mb-4">{m.icon}</div>
      <p className="text-sm font-bold text-[#5C3D00]">{txt.title}</p>
      <p className="text-xs text-[#9B8A6B] mt-1">{txt.sub}</p>
    </div>
  );
}

// ─── Note panel (slide-in) ────────────────────────────────────────────────────

function NotePanel({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/tutor/notes?studentId=${studentId}`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content ?? "");
        setUpdatedAt(data.updatedAt ?? null);
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
      });
  }, [studentId]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/tutor/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setUpdatedAt(data.updatedAt);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:w-96 sm:h-full sm:max-h-screen flex flex-col rounded-t-2xl sm:rounded-none sm:rounded-l-2xl shadow-2xl z-50 max-h-[70vh] sm:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 flex-shrink-0">
          <div>
            <p className="font-bold text-[#5C3D00] text-sm">Notes privées</p>
            <p className="text-xs text-[#9B8A6B] mt-0.5">{studentName} — visible uniquement par vous</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F2EFE9] flex items-center justify-center text-[#9B8A6B] transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Vos notes sur ${studentName}...\n\nEx: Points à travailler, niveau réel, objectifs, comportement, progression...`}
              className="w-full h-64 sm:h-full min-h-[200px] resize-none border border-[#D9D0C3] rounded-xl px-4 py-3 text-sm text-[#2D1A00] bg-[#FDFAF6] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/20 transition placeholder:text-[#C4BAA8] leading-relaxed"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-[#9B8A6B]">
            {updatedAt
              ? `Mis à jour le ${new Date(updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Aucune note enregistrée"}
          </span>
          <button
            onClick={save}
            disabled={saving || loading}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50"
            }`}
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-[#5C3D00] border-t-transparent rounded-full animate-spin" /> Sauvegarde…</>
            ) : saved ? (
              <>✓ Sauvegardé</>
            ) : (
              <>Sauvegarder</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ s, onOpenNote, lang }: { s: Session; onOpenNote: (s: Session) => void; lang: string }) {
  const isPast = new Date(s.scheduledAt) < new Date();
  const now = Date.now();
  const sessionMs = new Date(s.scheduledAt).getTime();
  const canJoin = sessionMs - now <= 30 * 60 * 1000 && sessionMs - now > -s.durationMins * 60 * 1000;

  return (
    <div className="px-6 py-4 flex items-center gap-4 hover:bg-[#FFFBEA] transition">
      {/* Student avatar — never falls back to logged-in user's image */}
      <div className="w-10 h-10 rounded-xl bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0 text-[#5C3D00] font-bold text-sm overflow-hidden">
        {s.studentImage
          ? <img src={s.studentImage} alt={s.studentName} className="w-full h-full object-cover" />
          : s.studentInitials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#2D1A00] truncate">{s.studentName}</p>
        <p className="text-xs text-[#9B8A6B] mt-0.5">
          <span className={`font-semibold ${isPast ? "text-[#9B8A6B]" : "text-[#5C3D00]"}`}>
            {formatDay(s.scheduledAt, lang)}
          </span>
          {" · "}{formatTime(s.scheduledAt, lang)} · {s.durationMins} min
        </p>
      </div>

      {/* Earnings */}
      {s.earnings != null && s.earnings > 0 && (
        <span className="text-sm font-bold text-[#5C3D00] flex-shrink-0">
          {s.earnings} {s.currency ?? "TND"}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Canvas button (COMPLETED with canvas) */}
        {s.status === "COMPLETED" && s.hasCanvas && (
          <a
            href={`/classroom/${s.id}/canvas`}
            title="Voir la Toile de la séance"
            className="w-8 h-8 rounded-lg border border-[#D9D0C3] flex items-center justify-center text-[#9B8A6B] hover:bg-[#FFF3B0] hover:border-[#F5C400] hover:text-[#5C3D00] transition"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path strokeLinecap="round" d="M6 13l2.5-3 2 2.5 2-3L15 13" />
            </svg>
          </a>
        )}

        {/* Note button */}
        <button
          onClick={() => onOpenNote(s)}
          title="Notes privées"
          className="w-8 h-8 rounded-lg border border-[#D9D0C3] flex items-center justify-center text-[#9B8A6B] hover:bg-[#FFF3B0] hover:border-[#F5C400] hover:text-[#5C3D00] transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {/* Join button (if joinable) */}
        {canJoin ? (
          <a
            href={`/classroom/${s.id}`}
            className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-[#FFDE59] transition"
          >
            {lang === "fr" ? "Rejoindre →" : "Join →"}
          </a>
        ) : (
          <StatusBadge status={s.status} lang={lang} />
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SessionsClient({
  sessions, tutorStats, currency,
}: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [noteTarget, setNoteTarget] = useState<Session | null>(null);
  const { lang } = useLanguage();

  const now = new Date();

  // upcoming = scheduledAt > now, not cancelled (consistent with getTutorStats)
  const upcoming = sessions.filter(
    (s) => new Date(s.scheduledAt) > now && s.status !== "CANCELLED",
  );
  // past = endAt < now (scheduledAt + durationMins), not cancelled
  const past = sessions.filter((s) => {
    const endAt = new Date(new Date(s.scheduledAt).getTime() + s.durationMins * 60 * 1000);
    return endAt < now && s.status !== "CANCELLED";
  });

  const displayed = tab === "upcoming" ? upcoming : tab === "past" ? past : sessions;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: lang === "fr" ? "À venir"  : "Upcoming", count: upcoming.length },
    { key: "past",     label: lang === "fr" ? "Passées"  : "Past",     count: past.length },
    { key: "all",      label: lang === "fr" ? "Toutes"   : "All",      count: sessions.length },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <p className="text-xs text-[#9B8A6B] mb-1">{lang === "fr" ? "Séances à venir" : "Upcoming sessions"}</p>
            <p className="text-3xl font-bold text-[#2D1A00]">{tutorStats.upcoming}</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <p className="text-xs text-[#9B8A6B] mb-1">{lang === "fr" ? "Séances complétées" : "Completed sessions"}</p>
            <p className="text-3xl font-bold text-[#2D1A00]">{tutorStats.completed}</p>
          </div>
          <div className="bg-[#5C3D00] rounded-2xl p-5">
            <p className="text-xs text-white/50 mb-1">{lang === "fr" ? "Revenus totaux" : "Total earnings"}</p>
            <p className="text-3xl font-bold text-[#F5C400]">
              {fmtMoney(tutorStats.earningsTotal, currency ?? "TND")}
            </p>
          </div>
        </div>

        {/* Notes info banner */}
        <div className="mb-6 bg-[#FFFBEA] border border-[#F5C400]/30 rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#F5C400]/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#C49200]">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <p className="text-xs text-[#6B5E44]">
            <span className="font-bold text-[#5C3D00]">{lang === "fr" ? "Notes privées" : "Private notes"}</span>
            {lang === "fr"
              ? " — Cliquez sur l'icône ✏️ d'une séance pour ajouter vos notes personnelles. Ces notes ne sont jamais visibles par l'étudiant."
              : " — Click the ✏️ icon on a session to add personal notes. These notes are never visible to the student."}
          </p>
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
            <EmptyState tab={tab} lang={lang} />
          ) : (
            <div className="divide-y divide-black/4">
              {displayed.map((s) => (
                <SessionCard key={s.id} s={s} onOpenNote={setNoteTarget} lang={lang} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Note slide-in panel */}
      {noteTarget && (
        <NotePanel
          studentId={noteTarget.studentId}
          studentName={noteTarget.studentName}
          onClose={() => setNoteTarget(null)}
        />
      )}
    </div>
  );
}
