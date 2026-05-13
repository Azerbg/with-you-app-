"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HrNote {
  id: string;
  content: string;
  createdAt: string;
  author: { email: string };
}

interface Application {
  id: string;
  fullName: string;
  city: string | null;
  phone: string | null;
  languagesTaught: string[];
  specializations: string[];
  certifications: string[];
  yearsExperience: number | null;
  bio: string | null;
  videoUrl: string | null;
  availabilityDays: string[];
  timeWindowPreference: string[];
  status: string;
  createdAt: string;
  user: { email: string };
  notes: HrNote[];
}

// ─── Kanban columns ───────────────────────────────────────────────────────────

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "NEW",                  label: "Nouveau",            color: "bg-blue-50 border-blue-200" },
  { key: "STAGE1_REVIEW",        label: "Examen",             color: "bg-yellow-50 border-yellow-200" },
  { key: "INTERVIEW_SCHEDULED",  label: "Entretien planifié", color: "bg-purple-50 border-purple-200" },
  { key: "INTERVIEW_COMPLETE",   label: "Entretien terminé",  color: "bg-orange-50 border-orange-200" },
  { key: "OFFER_PENDING",        label: "Offre envoyée",      color: "bg-pink-50 border-pink-200" },
  { key: "SIGNED",               label: "Signé",              color: "bg-teal-50 border-teal-200" },
  { key: "ACTIVE",               label: "Actif ✓",            color: "bg-green-50 border-green-200" },
  { key: "REJECTED",             label: "Rejeté",             color: "bg-red-50 border-red-200" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW:                 ["STAGE1_REVIEW", "REJECTED"],
  STAGE1_REVIEW:       ["INTERVIEW_SCHEDULED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["INTERVIEW_COMPLETE", "REJECTED"],
  INTERVIEW_COMPLETE:  ["OFFER_PENDING", "REJECTED"],
  OFFER_PENDING:       ["SIGNED", "REJECTED"],
  SIGNED:              ["ACTIVE", "REJECTED"],
  ACTIVE:              [],
  REJECTED:            [],
};

// ─── Application Card ─────────────────────────────────────────────────────────

function AppCard({ app, onClick }: { app: Application; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#6B5E44]/15 p-3 cursor-pointer hover:border-[#F5C400] hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-bold text-[#5C3D00] text-sm leading-tight">{app.fullName}</p>
        {app.notes.length > 0 && (
          <span className="text-xs bg-[#FFF3B0] text-[#C49200] font-bold px-1.5 py-0.5 rounded-full shrink-0">
            {app.notes.length}
          </span>
        )}
      </div>
      <p className="text-xs text-[#6B5E44] mb-2">{app.user.email}</p>
      <div className="flex flex-wrap gap-1">
        {app.languagesTaught.map(l => (
          <span key={l} className="text-[10px] bg-[#F5C400]/20 text-[#5C3D00] font-semibold px-1.5 py-0.5 rounded-full">{l}</span>
        ))}
        {app.city && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{app.city}</span>
        )}
      </div>
      <p className="text-[10px] text-[#6B5E44]/60 mt-2">
        {new Date(app.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// ─── Application Detail Panel ─────────────────────────────────────────────────

function DetailPanel({
  app,
  onClose,
  onStatusChange,
  onNoteAdded,
}: {
  app: Application;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNoteAdded: (id: string, note: HrNote) => void;
  hrEmail?: string;
}) {
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [movingTo, setMovingTo] = useState("");

  const nextStatuses = STATUS_TRANSITIONS[app.status] ?? [];

  async function handleMove(status: string) {
    setMovingTo(status);
    const res = await fetch(`/api/console/hr/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) onStatusChange(app.id, status);
    setMovingTo("");
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await fetch("/api/console/hr/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id, content: noteText }),
    });
    if (res.ok) {
      const note = await res.json();
      onNoteAdded(app.id, note);
      setNoteText("");
    }
    setSavingNote(false);
  }

  const colInfo = COLUMNS.find(c => c.key === app.status);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#5C3D00] text-lg">{app.fullName}</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colInfo?.color}`}>
              {colInfo?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-[#6B5E44] hover:text-[#5C3D00] text-2xl leading-none">×</button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {/* Contact */}
          <Section title="Contact">
            <Row label="E-mail"    value={app.user.email} />
            <Row label="Téléphone" value={app.phone} />
            <Row label="Ville"     value={app.city} />
          </Section>

          {/* Teaching */}
          <Section title="Profil d'enseignant">
            <Row label="Langues"        value={app.languagesTaught.join(", ")} />
            <Row label="Spécialisations" value={app.specializations.join(", ")} />
            <Row label="Expérience"     value={app.yearsExperience != null ? `${app.yearsExperience} ans` : null} />
            <Row label="Certifications" value={app.certifications.join(", ") || "Aucune"} />
          </Section>

          {/* Availability */}
          <Section title="Disponibilités">
            <Row label="Jours"    value={app.availabilityDays.join(", ")} />
            <Row label="Créneaux" value={app.timeWindowPreference.join(", ")} />
          </Section>

          {/* Bio */}
          {app.bio && (
            <Section title="Biographie">
              <p className="text-sm text-[#5C3D00] leading-relaxed whitespace-pre-wrap">{app.bio}</p>
            </Section>
          )}

          {/* Video */}
          {app.videoUrl && (
            <Section title="Vidéo d'introduction">
              <a href={app.videoUrl} target="_blank" rel="noreferrer"
                className="text-sm text-blue-600 hover:underline break-all">
                {app.videoUrl}
              </a>
            </Section>
          )}

          {/* Move actions */}
          {nextStatuses.length > 0 && (
            <Section title="Déplacer vers">
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => {
                  const col = COLUMNS.find(c => c.key === s);
                  const isRejected = s === "REJECTED";
                  return (
                    <button key={s}
                      onClick={() => handleMove(s)}
                      disabled={!!movingTo}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition disabled:opacity-50 ${
                        isRejected
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "border-[#F5C400] text-[#5C3D00] hover:bg-[#FFF3B0]"
                      }`}>
                      {movingTo === s ? "…" : col?.label}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title={`Notes (${app.notes.length})`}>
            <div className="space-y-3 mb-3">
              {app.notes.length === 0 && (
                <p className="text-xs text-[#6B5E44]">Aucune note pour l&apos;instant.</p>
              )}
              {app.notes.map(n => (
                <div key={n.id} className="bg-[#FAF8F0] rounded-xl px-3 py-2">
                  <p className="text-sm text-[#5C3D00] whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-[#6B5E44] mt-1">
                    {n.author.email} · {new Date(n.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              placeholder="Ajouter une note…"
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="mt-2 px-4 py-1.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition">
              {savingNote ? "Enregistrement…" : "Ajouter la note"}
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#6B5E44]/10 text-sm">
      <span className="text-[#6B5E44]">{label}</span>
      <span className="text-[#5C3D00] font-semibold text-right">{value || "—"}</span>
    </div>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

export default function HrKanban({ hrEmail }: { hrEmail: string }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/console/hr/applications")
      .then(r => r.json())
      .then(data => { setApps(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleStatusChange(id: string, status: string) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }

  function handleNoteAdded(id: string, note: HrNote) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes: [note, ...a.notes] } : a));
    setSelected(prev => prev?.id === id ? { ...prev, notes: [note, ...prev.notes] } : prev);
  }

  const filtered = filter
    ? apps.filter(a =>
        a.fullName.toLowerCase().includes(filter.toLowerCase()) ||
        a.user.email.toLowerCase().includes(filter.toLowerCase()) ||
        a.city?.toLowerCase().includes(filter.toLowerCase()) ||
        a.languagesTaught.some(l => l.toLowerCase().includes(filter.toLowerCase()))
      )
    : apps;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
          <span className="text-[#6B5E44] text-sm font-semibold">Console RH</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Rechercher un candidat…"
            className="border border-[#6B5E44]/30 rounded-full px-4 py-1.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] w-56"
          />
          <span className="text-xs text-[#6B5E44]">{hrEmail}</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 flex gap-4 border-b border-[#6B5E44]/10 bg-white/50">
        {COLUMNS.map(col => {
          const count = apps.filter(a => a.status === col.key).length;
          if (count === 0) return null;
          return (
            <div key={col.key} className="text-xs text-[#6B5E44]">
              <span className="font-bold text-[#5C3D00]">{count}</span> {col.label}
            </div>
          );
        })}
        <div className="ml-auto text-xs text-[#6B5E44]">
          <span className="font-bold text-[#5C3D00]">{apps.length}</span> total
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#6B5E44]">Chargement…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 p-6 min-w-max">
            {COLUMNS.map(col => {
              const colApps = filtered.filter(a => a.status === col.key);
              return (
                <div key={col.key} className="w-60 shrink-0">
                  {/* Column header */}
                  <div className={`rounded-xl border px-3 py-2 mb-3 flex items-center justify-between ${col.color}`}>
                    <span className="text-xs font-bold text-[#5C3D00]">{col.label}</span>
                    <span className="text-xs font-bold text-[#6B5E44] bg-white/60 rounded-full px-2 py-0.5">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {colApps.length === 0 && (
                      <p className="text-xs text-[#6B5E44]/40 text-center py-4">Vide</p>
                    )}
                    {colApps.map(app => (
                      <AppCard key={app.id} app={app} onClick={() => setSelected(app)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          app={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onNoteAdded={handleNoteAdded}
          hrEmail={hrEmail}
        />
      )}
    </div>
  );
}
