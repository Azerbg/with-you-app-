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
  birthday: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  languagesTaught: string[];
  specializations: string[];
  certifications: string[];
  englishLevel: string | null;
  yearsExperience: number | null;
  bio: string | null;
  cvUrl: string | null;
  motivationLetterUrl: string | null;
  certificateUrls: string[];
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
  videoSubmissionUrl?: string | null;
  videoSubmittedAt?: string | null;
}

// ─── Kanban columns ───────────────────────────────────────────────────────────

const COLUMNS: { key: string; label: string; sublabel: string; color: string; icon: string }[] = [
  { key: "INCOMPLETE",          label: "Tri auto",          sublabel: "Dossier incomplet",       color: "bg-gray-50 border-gray-300",     icon: "⚙️" },
  { key: "NEW",                 label: "Nouveau",           sublabel: "Reçu, à traiter",          color: "bg-blue-50 border-blue-200",     icon: "📥" },
  { key: "STAGE1_REVIEW",       label: "À évaluer",         sublabel: "Dossier complet",          color: "bg-yellow-50 border-yellow-200", icon: "🔍" },
  { key: "VIDEO_REQUESTED",     label: "Vidéo demandée",    sublabel: "En attente candidat",      color: "bg-amber-50 border-amber-200",   icon: "🎬" },
  { key: "VIDEO_SUBMITTED",     label: "Vidéo reçue",       sublabel: "À visionner",              color: "bg-violet-50 border-violet-200", icon: "▶️" },
  { key: "INTERVIEW_SCHEDULED", label: "Entretien",         sublabel: "RDV planifié",             color: "bg-purple-50 border-purple-200", icon: "🎙️" },
  { key: "INTERVIEW_COMPLETE",  label: "Délibération",      sublabel: "Entretien terminé",        color: "bg-orange-50 border-orange-200", icon: "⏳" },
  { key: "RESERVE",             label: "Réserve",           sublabel: "Qualifié, en attente",     color: "bg-sky-50 border-sky-200",       icon: "📋" },
  { key: "OFFER_PENDING",       label: "Offre envoyée",     sublabel: "Signature en attente",     color: "bg-pink-50 border-pink-200",     icon: "📄" },
  { key: "SIGNED",              label: "Signé ✍️",           sublabel: "Contrat accepté",          color: "bg-teal-50 border-teal-200",     icon: "✅" },
  { key: "ACTIVE",              label: "Actif ✓",           sublabel: "En ligne",                 color: "bg-green-50 border-green-200",   icon: "🟢" },
  { key: "REJECTED",            label: "Rejeté",            sublabel: "",                         color: "bg-red-50 border-red-200",       icon: "❌" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  INCOMPLETE:          ["NEW", "REJECTED"],
  NEW:                 ["STAGE1_REVIEW", "INCOMPLETE", "REJECTED"],
  STAGE1_REVIEW:       ["VIDEO_REQUESTED", "RESERVE", "REJECTED"],
  VIDEO_REQUESTED:     ["VIDEO_SUBMITTED", "STAGE1_REVIEW", "REJECTED"],
  VIDEO_SUBMITTED:     ["INTERVIEW_SCHEDULED", "RESERVE", "REJECTED"],
  INTERVIEW_SCHEDULED: ["INTERVIEW_COMPLETE", "REJECTED"],
  INTERVIEW_COMPLETE:  ["OFFER_PENDING", "RESERVE", "REJECTED"],
  RESERVE:             ["STAGE1_REVIEW", "VIDEO_REQUESTED", "OFFER_PENDING", "REJECTED"],
  OFFER_PENDING:       ["SIGNED", "REJECTED"],
  SIGNED:              ["ACTIVE", "REJECTED"],
  ACTIVE:              [],
  REJECTED:            [],
};

// ─── Language tabs ────────────────────────────────────────────────────────────

const LANG_FLAGS: Record<string, string> = {
  "French":   "🇫🇷",
  "English":  "🇬🇧",
  "Spanish":  "🇪🇸",
  "German":   "🇩🇪",
  "Arabic":   "🇹🇳",
  "Italian":  "🇮🇹",
  "Portuguese": "🇵🇹",
};

const LANG_LABELS: Record<string, string> = {
  "French":   "Français",
  "English":  "Anglais",
  "Spanish":  "Espagnol",
  "German":   "Allemand",
  "Arabic":   "Arabe",
  "Italian":  "Italien",
  "Portuguese": "Portugais",
};

const SPEC_LABELS: Record<string, string> = {
  "CONVERSATIONAL": "Conversation",
  "PROFESSIONAL":   "Professionnel",
  "ACADEMIC":       "Académique",
  "EXAM_PREP":      "Prépa examens",
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
      {/* Language tags */}
      <div className="flex flex-wrap gap-1 mb-1">
        {app.languagesTaught.map(l => (
          <span key={l} className="text-[10px] bg-[#F5C400]/20 text-[#5C3D00] font-bold px-1.5 py-0.5 rounded-full">
            {LANG_FLAGS[l] ?? "🌐"} {LANG_LABELS[l] ?? l}
          </span>
        ))}
        {app.city && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{app.city}</span>
        )}
      </div>
      {/* Specialty chips */}
      {app.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {app.specializations.map(s => (
            <span key={s} className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">
              {SPEC_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[#6B5E44]/60 mt-1.5">
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
            <Row label="E-mail"           value={app.user.email} />
            <Row label="Téléphone"        value={app.phone} />
            <Row label="Pays"             value={app.country} />
            <Row label="Ville"            value={app.city} />
            <Row label="Date de naissance" value={app.birthday ? new Date(app.birthday).toLocaleDateString("fr-FR") : null} />
            <Row label="Sexe"             value={
              app.gender === "M" ? "Homme" :
              app.gender === "F" ? "Femme" :
              app.gender === "PREFER_NOT_TO_SAY" ? "Préfère ne pas dire" : null
            } />
          </Section>

          {/* Teaching */}
          <Section title="Profil d'enseignant">
            <Row label="Langues"          value={app.languagesTaught.join(", ")} />
            <Row label="Spécialisations"  value={app.specializations.join(", ")} />
            <Row label="Expérience"       value={app.yearsExperience != null ? `${app.yearsExperience} ans` : null} />
            <Row label="Niveau en anglais" value={
              app.englishLevel === "BEGINNER"      ? "Débutant" :
              app.englishLevel === "INTERMEDIATE"  ? "Intermédiaire" :
              app.englishLevel === "ADVANCED"      ? "Avancé" :
              app.englishLevel === "VERY_ADVANCED" ? "Très avancé" :
              app.englishLevel === "PROFESSIONAL"  ? "Maîtrise professionnelle" : null
            } />
            <Row label="Certifications"   value={app.certifications.join(", ") || "Aucune"} />
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
          {(app.cvUrl || app.motivationLetterUrl || app.certificateUrls?.length > 0) && (
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
                {app.certificateUrls?.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    download={`Document_${i + 1}.pdf`}
                    className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-red-600">PDF</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Document justificatif {i + 1}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 ml-auto">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                ))}
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

          {/* Video viewer — shown when VIDEO_SUBMITTED */}
          {app.status === "VIDEO_SUBMITTED" && app.videoSubmissionUrl && (
            <Section title="Video de presentation">
              {app.videoSubmittedAt && (
                <p className="text-xs text-[#6B5E44] mb-3">
                  Recue le {new Date(app.videoSubmittedAt).toLocaleString("fr-FR")}
                </p>
              )}
              {app.videoSubmissionUrl.startsWith("data:video") ? (
                <video
                  src={app.videoSubmissionUrl}
                  controls
                  className="w-full rounded-xl border border-[#C4BAA8] bg-black"
                  style={{ maxHeight: 280 }}
                />
              ) : (
                <a
                  href={app.videoSubmissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition"
                >
                  <span className="text-xl">▶️</span>
                  <div>
                    <p className="text-sm font-bold text-violet-800">Visionner la video</p>
                    <p className="text-xs text-violet-500 truncate max-w-xs">{app.videoSubmissionUrl}</p>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400 ml-auto flex-shrink-0">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                  </svg>
                </a>
              )}
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
        if (d.devMode) setError(`[DEV] Pas d'e-mail envoyé. Lien : ${d.selectionUrl}`);
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [search, setSearch] = useState("");
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/console/hr/applications")
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setFetchError(`Erreur ${r.status}: ${data.error ?? JSON.stringify(data)}`);
          setLoading(false);
          return;
        }
        setApps(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => { setFetchError(String(e)); setLoading(false); });
  }, []);

  function handleStatusChange(id: string, status: string) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }

  function handleNoteAdded(id: string, note: HrNote) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, notes: [note, ...a.notes] } : a));
    setSelected(prev => prev?.id === id ? { ...prev, notes: [note, ...prev.notes] } : prev);
  }

  // All languages present in applications
  const allLanguages = Array.from(new Set(apps.flatMap(a => a.languagesTaught))).sort();

  // All specializations for selected language
  const specsForLang = activeLang
    ? Array.from(new Set(
        apps
          .filter(a => a.languagesTaught.includes(activeLang))
          .flatMap(a => a.specializations)
      )).sort()
    : [];

  // Reset specialty when language changes
  function selectLang(lang: string | null) {
    setActiveLang(lang);
    setActiveSpec(null);
  }

  // Apply all filters
  const filtered = apps.filter(a => {
    if (activeLang && !a.languagesTaught.includes(activeLang)) return false;
    if (activeSpec && !a.specializations.includes(activeSpec)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.languagesTaught.some(l => l.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#F5C400] font-bold text-xl bg-[#5C3D00] px-3 py-1 rounded-lg">WithYou</Link>
          <span className="text-[#6B5E44] text-sm font-semibold">Console RH</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un candidat…"
            className="border border-[#6B5E44]/30 rounded-full px-4 py-1.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] w-56"
          />
          <span className="text-xs text-[#6B5E44]">{hrEmail}</span>
        </div>
      </div>

      {/* ── LANGUAGE FILTER ── */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-3">
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">Filtrer par langue</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectLang(null)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition ${
              !activeLang
                ? "bg-[#5C3D00] border-[#5C3D00] text-white"
                : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#5C3D00]/40"
            }`}
          >
            Toutes
            <span className="text-xs opacity-70">({apps.length})</span>
          </button>
          {allLanguages.map(lang => {
            const count = apps.filter(a => a.languagesTaught.includes(lang)).length;
            const flag = LANG_FLAGS[lang] ?? "🌐";
            const label = LANG_LABELS[lang] ?? lang;
            return (
              <button
                key={lang}
                onClick={() => selectLang(lang)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition ${
                  activeLang === lang
                    ? "bg-[#F5C400] border-[#F5C400] text-[#5C3D00]"
                    : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#F5C400]/60"
                }`}
              >
                {flag} {label}
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Specialty sub-filter */}
        {activeLang && specsForLang.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#6B5E44]/10">
            <span className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest self-center">Spécialité :</span>
            <button
              onClick={() => setActiveSpec(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                !activeSpec ? "bg-[#5C3D00] border-[#5C3D00] text-white" : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#5C3D00]/40"
              }`}
            >
              Toutes
            </button>
            {specsForLang.map(spec => (
              <button
                key={spec}
                onClick={() => setActiveSpec(activeSpec === spec ? null : spec)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                  activeSpec === spec
                    ? "bg-[#FFF3B0] border-[#F5C400] text-[#5C3D00]"
                    : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#F5C400]/60"
                }`}
              >
                {SPEC_LABELS[spec] ?? spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-6 py-2 flex flex-wrap gap-4 border-b border-[#6B5E44]/10 bg-white/50">
        {COLUMNS.map(col => {
          const count = filtered.filter(a => a.status === col.key).length;
          if (count === 0) return null;
          return (
            <div key={col.key} className="text-xs text-[#6B5E44]">
              <span className="font-bold text-[#5C3D00]">{count}</span> {col.label}
            </div>
          );
        })}
        <div className="ml-auto text-xs text-[#6B5E44]">
          <span className="font-bold text-[#5C3D00]">{filtered.length}</span>
          {filtered.length !== apps.length && <span className="text-[#9B8A6B]"> / {apps.length} total</span>}
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#6B5E44]">Chargement…</div>
      ) : fetchError ? (
        <div className="flex items-center justify-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm max-w-lg text-center">
            <p className="font-bold mb-1">Impossible de charger les candidatures</p>
            <p className="font-mono text-xs">{fetchError}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 p-6 min-w-max">
            {COLUMNS.map(col => {
              const colApps = filtered.filter(a => a.status === col.key);
              return (
                <div key={col.key} className="w-60 shrink-0">
                  {/* Column header */}
                  <div className={`rounded-xl border px-3 py-2 mb-3 ${col.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5C3D00]">{col.icon} {col.label}</span>
                      <span className="text-xs font-bold text-[#6B5E44] bg-white/60 rounded-full px-2 py-0.5">
                        {colApps.length}
                      </span>
                    </div>
                    {col.sublabel && (
                      <p className="text-[10px] text-[#6B5E44]/60 mt-0.5">{col.sublabel}</p>
                    )}
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
