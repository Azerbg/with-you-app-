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
  cvUrl: string | null;
  motivationLetterUrl: string | null;
  availabilityDays: string[];
  timeWindowPreference: string[];
  status: string;
  createdAt: string;
  user: { email: string };
  notes: HrNote[];
  interviewSlots?: string[];
  interviewToken?: string | null;
  interviewSelectedAt?: string | null;
  interviewScheduledAt?: string | null;
  interviewMeetingUrl?: string | null;
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
  hrEmail,
}: {
  app: Application;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNoteAdded: (id: string, note: HrNote) => void;
  hrEmail: string;
}) {
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [movingTo, setMovingTo] = useState("");
  const [interviewToken, setInterviewToken] = useState(app.interviewToken ?? null);

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

          {/* Documents */}
          {(app.cvUrl || app.motivationLetterUrl) && (
            <Section title="Documents">
              <div className="flex flex-col gap-2">
                {app.cvUrl && (
                  <a
                    href={app.cvUrl}
                    download="CV.pdf"
                    className="flex items-center gap-3 px-4 py-2.5 bg-[#FFF3B0] border border-[#F5C400]/50 rounded-xl hover:bg-[#FFDE59]/30 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="10" x2="12" y2="18"/>
                    </svg>
                    <span className="text-sm font-bold text-[#5C3D00]">Télécharger le CV</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#9B8A6B] ml-auto">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                )}
                {app.motivationLetterUrl && (
                  <a
                    href={app.motivationLetterUrl}
                    download="Lettre_de_motivation.pdf"
                    className="flex items-center gap-3 px-4 py-2.5 bg-[#F0F7FF] border border-blue-200 rounded-xl hover:bg-blue-50 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span className="text-sm font-bold text-blue-700">Télécharger la lettre de motivation</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-400 ml-auto">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Interview Scheduler — shown in STAGE1_REVIEW */}
          {app.status === "STAGE1_REVIEW" && (
            <Section title="Planifier un entretien">
              <InterviewScheduler
                app={app}
                onScheduled={token => {
                  setInterviewToken(token);
                  onStatusChange(app.id, "INTERVIEW_SCHEDULED");
                }}
              />
            </Section>
          )}

          {/* Interview status — shown when scheduled */}
          {["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE"].includes(app.status) && (
            <Section title="Entretien">
              <InterviewStatus app={{ ...app, interviewToken }} />
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
                <p className="text-xs text-[#6B5E44]">Aucune note pour l'instant.</p>
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

// ─── Interview Scheduler ──────────────────────────────────────────────────────

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function InterviewScheduler({ app, onScheduled }: { app: Application; onScheduled: (token: string) => void }) {
  const [slots, setSlots] = useState(["", "", ""]);
  const [meetingUrl, setMeetingUrl] = useState(app.interviewMeetingUrl ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const filledSlots = slots.filter(s => s.trim() !== "");

  async function handleSend() {
    if (filledSlots.length === 0) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/console/hr/interviews/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          slots: filledSlots.map(s => new Date(s).toISOString()),
          meetingUrl: meetingUrl || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erreur serveur");
      } else {
        const d = await res.json();
        setSent(true);
        onScheduled(d.token);
      }
    } catch {
      setError("Erreur réseau");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        Invitation envoyée ! Le candidat recevra un e-mail pour choisir son créneau.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#6B5E44]">
        Proposez 1 à 3 créneaux (en heure locale de votre navigateur — ils seront convertis en heure de Tunis pour le candidat).
      </p>
      {slots.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-[#6B5E44] w-20 shrink-0">Créneau {i + 1}{i === 0 ? " *" : ""}</span>
          <input
            type="datetime-local"
            value={val}
            onChange={e => setSlots(prev => prev.map((s, j) => j === i ? e.target.value : s))}
            className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400]"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6B5E44] w-20 shrink-0">Lien réunion</span>
        <input
          type="url"
          value={meetingUrl}
          onChange={e => setMeetingUrl(e.target.value)}
          placeholder="https://zoom.us/j/… (optionnel)"
          className="flex-1 border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400]"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleSend}
        disabled={sending || filledSlots.length === 0}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold rounded-full py-2 text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition"
      >
        {sending ? "Envoi…" : "Envoyer le lien au candidat"}
      </button>
    </div>
  );
}

function InterviewStatus({ app }: { app: Application }) {
  if (!app.interviewToken) return null;
  const selectionUrl = `${BASE_URL}/interview/${app.interviewToken}`;
  const selectedAt = app.interviewSelectedAt ?? app.interviewScheduledAt;

  return (
    <div className="space-y-3">
      {selectedAt ? (
        <div className="bg-[#FFF3B0] rounded-xl p-4">
          <p className="text-xs font-bold text-[#6B5E44] uppercase tracking-widest mb-1">Créneau confirmé</p>
          <p className="text-sm font-bold text-[#5C3D00]">
            {new Intl.DateTimeFormat("fr-FR", {
              timeZone: "Africa/Tunis",
              weekday: "long", day: "numeric", month: "long",
              hour: "2-digit", minute: "2-digit", timeZoneName: "short",
            }).format(new Date(selectedAt))}
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700">En attente de la sélection du candidat.</p>
        </div>
      )}
      {app.interviewMeetingUrl && (
        <a href={app.interviewMeetingUrl} target="_blank" rel="noreferrer"
          className="block text-xs text-blue-600 hover:underline break-all">
          {app.interviewMeetingUrl}
        </a>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6B5E44] shrink-0">Lien sélection :</span>
        <input
          readOnly
          value={selectionUrl}
          onClick={e => (e.target as HTMLInputElement).select()}
          className="flex-1 border border-[#6B5E44]/20 rounded-xl px-3 py-1.5 text-xs text-[#5C3D00] bg-[#FAF8F0] cursor-text"
        />
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
          <Link href="/" className="text-[#F5C400] font-bold text-xl bg-[#5C3D00] px-3 py-1 rounded-lg">WithYou</Link>
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
