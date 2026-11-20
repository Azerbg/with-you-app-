"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HrNote {
  id: string;
  content: string;
  createdAt: string;
  isFromCandidate?: boolean;
  visibleToCandidate?: boolean;
  author: { email: string } | null;
}

interface Application {
  id: string;
  fullName: string;
  // birthday/gender available in full fetch only
  birthday?: string | null;
  gender?: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  languagesTaught: string[];
  specializations: string[];
  certifications: string[];
  englishLevel: string | null;
  yearsExperience: number | null;
  bio: string | null;
  // Document URLs available in full fetch only
  cvUrl?: string | null;
  motivationLetterUrl?: string | null;
  certificateUrls?: string[];
  attestationUrls?: string[];
  availabilityDays: string[];
  timeWindowPreference: string[];
  status: string;
  createdAt: string;
  user: { email: string; id?: string; image?: string | null; tutorProfile?: { profilePhotoUrl?: string | null } | null };
  notes: HrNote[];
  interviewSlots?: string[];
  interviewToken?: string | null;
  interviewSelectedAt?: string | null;
  interviewScheduledAt?: string | null;
  interviewMeetingUrl?: string | null;
  videoSubmissionUrl?: string | null;
  videoSubmittedAt?: string | null;
  // Offer / compensation
  offerHourlyRateTnd?: number | null;
  offerHourlyRateCad?: number | null;
  offerCurrency?: string | null;
  offerMaxWeeklyHours?: number | null;
  // Teaching levels
  cefrTeachingMin?: string | null;
  cefrTeachingMax?: string | null;
  // Timezone
  timezone?: string | null;
}

// ─── Kanban columns ───────────────────────────────────────────────────────────

const COLUMNS: { key: string; labelFr: string; labelEn: string; sublabelFr: string; sublabelEn: string; color: string; icon: string }[] = [
  { key: "INCOMPLETE",          labelFr: "Tri auto",          labelEn: "Auto-sorted",        sublabelFr: "Dossier incomplet",       sublabelEn: "Incomplete file",        color: "bg-gray-50 border-gray-300",     icon: "⚙️" },
  { key: "NEW",                 labelFr: "Nouveau",           labelEn: "New",                sublabelFr: "Reçu, à traiter",         sublabelEn: "Received, to process",   color: "bg-blue-50 border-blue-200",     icon: "📥" },
  { key: "STAGE1_REVIEW",       labelFr: "À évaluer",         labelEn: "To review",          sublabelFr: "Dossier complet",         sublabelEn: "Complete file",          color: "bg-yellow-50 border-yellow-200", icon: "🔍" },
  { key: "VIDEO_REQUESTED",     labelFr: "Vidéo demandée",    labelEn: "Video requested",    sublabelFr: "En attente candidat",     sublabelEn: "Awaiting candidate",     color: "bg-amber-50 border-amber-200",   icon: "🎬" },
  { key: "VIDEO_SUBMITTED",     labelFr: "Vidéo reçue",       labelEn: "Video received",     sublabelFr: "À visionner",             sublabelEn: "To review",              color: "bg-violet-50 border-violet-200", icon: "▶️" },
  { key: "INTERVIEW_SCHEDULED", labelFr: "Entretien",         labelEn: "Interview",          sublabelFr: "RDV planifié",            sublabelEn: "Appointment scheduled",  color: "bg-purple-50 border-purple-200", icon: "🎙️" },
  { key: "INTERVIEW_COMPLETE",  labelFr: "Délibération",      labelEn: "Deliberation",       sublabelFr: "Entretien terminé",       sublabelEn: "Interview done",         color: "bg-orange-50 border-orange-200", icon: "⏳" },
  { key: "RESERVE",             labelFr: "Réserve",           labelEn: "Reserve",            sublabelFr: "Qualifié, en attente",    sublabelEn: "Qualified, on hold",     color: "bg-sky-50 border-sky-200",       icon: "📋" },
  { key: "OFFER_PENDING",       labelFr: "Offre envoyée",     labelEn: "Offer sent",         sublabelFr: "Signature en attente",    sublabelEn: "Awaiting signature",     color: "bg-pink-50 border-pink-200",     icon: "📄" },
  { key: "SIGNED",              labelFr: "Signé ✍️",           labelEn: "Signed ✍️",           sublabelFr: "Contrat accepté",         sublabelEn: "Contract accepted",      color: "bg-teal-50 border-teal-200",     icon: "✅" },
  { key: "ACTIVE",              labelFr: "Actif ✓",           labelEn: "Active ✓",           sublabelFr: "En ligne",                sublabelEn: "Online",                 color: "bg-green-50 border-green-200",   icon: "🟢" },
  { key: "SUSPENDED",           labelFr: "Suspendu",          labelEn: "Suspended",          sublabelFr: "Compte suspendu",         sublabelEn: "Account suspended",      color: "bg-orange-50 border-orange-300", icon: "⛔" },
  { key: "REJECTED",            labelFr: "Rejeté",            labelEn: "Rejected",           sublabelFr: "",                        sublabelEn: "",                       color: "bg-red-50 border-red-200",       icon: "❌" },
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
  ACTIVE:              ["SUSPENDED"],
  SUSPENDED:           ["ACTIVE", "REJECTED"],
  REJECTED:            [],
};

// ─── Video URL helpers ────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#\s]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function getLoomEmbedUrl(url: string): string | null {
  const m = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

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

const LANG_LABELS: Record<string, { fr: string; en: string }> = {
  "French":     { fr: "Français",  en: "French"     },
  "English":    { fr: "Anglais",   en: "English"    },
  "Spanish":    { fr: "Espagnol",  en: "Spanish"    },
  "German":     { fr: "Allemand",  en: "German"     },
  "Arabic":     { fr: "Arabe",     en: "Arabic"     },
  "Italian":    { fr: "Italien",   en: "Italian"    },
  "Portuguese": { fr: "Portugais", en: "Portuguese" },
};
function getLangLabel(langCode: string, uiLang: string): string {
  return LANG_LABELS[langCode]?.[uiLang as "fr" | "en"] ?? langCode;
}

const SPEC_LABELS: Record<string, { fr: string; en: string }> = {
  CONVERSATIONAL: { fr: "Conversation",    en: "Conversational"  },
  PROFESSIONAL:   { fr: "Professionnel",   en: "Professional"    },
  ACADEMIC:       { fr: "Académique",      en: "Academic"        },
  EXAM_PREP:      { fr: "Prépa examens",   en: "Exam prep"       },
};

const DAY_LABELS: Record<string, { fr: string; en: string }> = {
  MON: { fr: "Lun", en: "Mon" },
  TUE: { fr: "Mar", en: "Tue" },
  WED: { fr: "Mer", en: "Wed" },
  THU: { fr: "Jeu", en: "Thu" },
  FRI: { fr: "Ven", en: "Fri" },
  SAT: { fr: "Sam", en: "Sat" },
  SUN: { fr: "Dim", en: "Sun" },
};

const TIME_LABELS: Record<string, { fr: string; en: string }> = {
  MORNING:   { fr: "Matin",      en: "Morning"   },
  AFTERNOON: { fr: "Après-midi", en: "Afternoon" },
  EVENING:   { fr: "Soir",       en: "Evening"   },
};

const CERT_LABELS: Record<string, string> = {
  DELF_A1: "DELF A1", DELF_A2: "DELF A2", DELF_B1: "DELF B1", DELF_B2: "DELF B2",
  DALF_C1: "DALF C1", DALF_C2: "DALF C2",
  TCF: "TCF", DELF: "DELF",
  IELTS: "IELTS", TOEFL: "TOEFL", TOEIC: "TOEIC",
  CAMBRIDGE: "Cambridge", DELE: "DELE",
  GOETHE: "Goethe-Zertifikat",
  TESOL: "TESOL", CELTA: "CELTA",
  DIPLOME_UNIV: "Diplôme universitaire",
  DOCTORAT: "Doctorat",
};

// ─── Application Card ─────────────────────────────────────────────────────────

function AppCard({ app, onClick, lang = "fr" }: { app: Application; onClick: () => void; lang?: string }) {
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
            {LANG_FLAGS[l] ?? "🌐"} {getLangLabel(l, lang)}
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
              {SPEC_LABELS[s]?.[lang as "fr" | "en"] ?? s}
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
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const [noteText, setNoteText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const [movingTo, setMovingTo] = useState("");
  const [interviewToken, setInterviewToken] = useState(app.interviewToken ?? null);
  const [cefrMin, setCefrMin] = useState(app.cefrTeachingMin ?? null);
  const [cefrMax, setCefrMax] = useState(app.cefrTeachingMax ?? null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPreset, setRejectPreset] = useState("");
  const [rejectCustom, setRejectCustom] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  // Lazy-loaded full application data (documents, video, interviewToken)
  const [fullApp, setFullApp] = useState<Application | null>(null);
  const [fullLoading, setFullLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/console/hr/applications/${app.id}`)
      .then(r => r.json())
      .then(d => {
        setFullApp(d);
        if (d.interviewToken) setInterviewToken(d.interviewToken);
      })
      .catch(() => {})
      .finally(() => setFullLoading(false));
  }, [app.id]);

  const nextStatuses = STATUS_TRANSITIONS[app.status] ?? [];

  // Pre-compute ACTIVE blocking reasons (shown as tooltips)
  function getActiveBlockReason(): string | null {
    if (fullLoading) return null;
    if (!fullApp?.videoSubmissionUrl)
      return t("Vidéo de présentation manquante", "Presentation video missing");
    if (!fullApp?.certificateUrls?.length)
      return t("Aucun diplôme / certificat fourni", "No diploma / certificate provided");
    if (!app.phone)
      return t("Numéro de téléphone manquant", "Phone number missing");
    const ok = ["ADVANCED", "VERY_ADVANCED", "PROFESSIONAL"];
    if (!app.englishLevel || !ok.includes(app.englishLevel))
      return t("Niveau d'anglais insuffisant (B2+ requis)", "Insufficient English level (B2+ required)");
    return null;
  }
  const activeBlockReason = getActiveBlockReason();

  const candidateMessages = app.notes.filter(n => n.isFromCandidate || n.visibleToCandidate);
  const internalNotes = app.notes.filter(n => !n.isFromCandidate && !n.visibleToCandidate);

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

  async function handleReply() {
    if (!replyText.trim()) return;
    setSavingReply(true);
    const res = await fetch("/api/console/hr/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: app.id, content: replyText, visibleToCandidate: true }),
    });
    if (res.ok) {
      const note = await res.json();
      onNoteAdded(app.id, note);
      setReplyText("");
    }
    setSavingReply(false);
  }

  const colInfo = COLUMNS.find(c => c.key === app.status);
  const videoUrl = fullApp?.videoSubmissionUrl;
  const VIDEO_STAGES = ["VIDEO_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "RESERVE", "OFFER_PENDING", "SIGNED", "ACTIVE"];

  function fmtDays(days: string[]) {
    return days.map(d => DAY_LABELS[d]?.[lang] ?? d).join(", ");
  }
  function fmtTimes(times: string[]) {
    return times.map(t2 => TIME_LABELS[t2]?.[lang] ?? t2).join(", ");
  }
  function fmtSpecs(specs: string[]) {
    return specs.map(s => SPEC_LABELS[s]?.[lang] ?? s).join(", ");
  }
  function fmtCerts(certs: string[]) {
    return certs.map(c => CERT_LABELS[c] ?? c).join(", ") || t("Aucune", "None");
  }
  function fmtEnglish(lvl: string | null) {
    if (!lvl) return null;
    const map: Record<string, { fr: string; en: string }> = {
      BEGINNER:      { fr: "Débutant",               en: "Beginner"         },
      INTERMEDIATE:  { fr: "Intermédiaire",           en: "Intermediate"     },
      ADVANCED:      { fr: "Avancé",                  en: "Advanced"         },
      VERY_ADVANCED: { fr: "Très avancé",             en: "Very advanced"    },
      PROFESSIONAL:  { fr: "Maîtrise professionnelle", en: "Professional"    },
    };
    return map[lvl]?.[lang] ?? lvl;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto overflow-x-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Profile photo */}
            {(() => {
              const photo = fullApp?.user?.tutorProfile?.profilePhotoUrl ?? app.user.image;
              return photo ? (
                <img src={photo} alt={app.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-[#F5C400]/50 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#F5C400]/30 flex items-center justify-center flex-shrink-0 border-2 border-[#F5C400]/30">
                  <span className="text-lg font-black text-[#5C3D00]">{app.fullName.charAt(0)}</span>
                </div>
              );
            })()}
            <div className="min-w-0">
              <h2 className="font-bold text-[#5C3D00] text-lg leading-tight truncate">{app.fullName}</h2>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colInfo?.color}`}>
                  {lang === "fr" ? colInfo?.labelFr : colInfo?.labelEn}
                </span>
                {app.status === "ACTIVE" && app.user.id && (
                  <a
                    href={`/tutors/${app.user.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {t("Voir le profil public", "View public profile")} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6B5E44] hover:text-[#5C3D00] text-2xl leading-none flex-shrink-0">×</button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {/* Incohérence warnings for ACTIVE tutors */}
          {app.status === "ACTIVE" && !fullLoading && (() => {
            const warnings: string[] = [];
            if (!fullApp?.videoSubmissionUrl) warnings.push(t("Aucune vidéo de présentation soumise", "No presentation video submitted"));
            if (!fullApp?.certificateUrls?.length) warnings.push(t("Aucun diplôme fourni", "No diploma provided"));
            if (!app.phone) warnings.push(t("Numéro de téléphone manquant", "Phone number missing"));
            const ok = ["ADVANCED", "VERY_ADVANCED", "PROFESSIONAL"];
            if (!app.englishLevel || !ok.includes(app.englishLevel)) warnings.push(t("Niveau d'anglais insuffisant (B2+ requis)", "Insufficient English level (B2+ required)"));
            if (warnings.length === 0) return null;
            return (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2">{t("Incohérences détectées", "Inconsistencies detected")}</p>
                <ul className="space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="mt-0.5">⚠️</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Contact */}
          <Section title={t("Contact", "Contact")}>
            <Row label="E-mail"          value={app.user.email} />
            <Row label={t("Téléphone", "Phone")} value={app.phone} />
            <Row label={t("Pays", "Country")}    value={app.country} />
            <Row label={t("Ville", "City")}      value={app.city} />
          </Section>

          {/* Teaching */}
          <Section title={t("Profil d'enseignant", "Teacher profile")}>
            <Row label={t("Langues enseignées", "Languages taught")} value={app.languagesTaught.map(l => getLangLabel(l, lang)).join(", ")} />
            <Row label={t("Spécialisations", "Specializations")} value={fmtSpecs(app.specializations)} />
            <Row label={t("Expérience", "Experience")}      value={app.yearsExperience != null ? `${app.yearsExperience} ${t("ans", "yrs")}` : null} />
            <Row label={t("Niveau en anglais", "English level")} value={fmtEnglish(app.englishLevel)} />
            <Row label={t("Certifications", "Certifications")} value={fmtCerts(app.certifications)} />
            {/* CEFR teaching levels — RH#9 */}
            <div className="py-2 border-b border-[#6B5E44]/10">
              <p className="text-xs text-[#6B5E44] mb-2">{t("Niveaux d'enseignement acceptés (CECR)", "Accepted teaching levels (CEFR)")}</p>
              <CefrLevelEditor
                appId={app.id}
                min={cefrMin}
                max={cefrMax}
                onSaved={(mn, mx) => { setCefrMin(mn); setCefrMax(mx); }}
              />
            </div>
          </Section>

          {/* Availability */}
          <Section title={t("Disponibilités", "Availability")}>
            <Row label={t("Jours", "Days")}     value={fmtDays(app.availabilityDays)} />
            <Row label={t("Créneaux", "Slots")} value={fmtTimes(app.timeWindowPreference)} />
            {/* Timezone — RH#10 */}
            <Row
              label={t("Fuseau horaire", "Time zone")}
              value={app.timezone
                ? `${app.timezone} (${new Intl.DateTimeFormat("fr-FR", { timeZone: app.timezone, timeZoneName: "short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? app.timezone})`
                : t("Non renseigné", "Not provided")}
            />
          </Section>

          {/* Compensation — shown from OFFER_PENDING onwards */}
          {["OFFER_PENDING", "SIGNED", "ACTIVE", "SUSPENDED"].includes(app.status) && (
            <Section title={t("Rémunération & Paiement", "Compensation & Payment")}>
              {app.offerHourlyRateTnd != null ? (
                <Row label={t("Tarif horaire (TND)", "Hourly rate (TND)")} value={`${app.offerHourlyRateTnd} TND`} />
              ) : (
                <div className="flex items-center gap-2 py-1.5 border-b border-[#6B5E44]/10 text-sm">
                  <span className="text-[#6B5E44]">{t("Tarif horaire (TND)", "Hourly rate (TND)")}</span>
                  <span className="ml-auto text-red-500 font-semibold text-xs">{t("Non défini", "Not set")}</span>
                </div>
              )}
              {app.offerHourlyRateCad != null && (
                <Row label={t("Tarif horaire (CAD)", "Hourly rate (CAD)")} value={`${app.offerHourlyRateCad} CAD`} />
              )}
              {app.offerMaxWeeklyHours != null && (
                <Row label={t("Max heures/semaine", "Max hours/week")} value={`${app.offerMaxWeeklyHours}h`} />
              )}
              <div className="flex justify-between py-1.5 border-b border-[#6B5E44]/10 text-sm items-center">
                <span className="text-[#6B5E44]">{t("Moyen de paiement tuteur", "Tutor payment method")}</span>
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {t("À configurer dans l'espace tuteur", "To be set in tutor dashboard")}
                </span>
              </div>
            </Section>
          )}

          {/* Bio */}
          {app.bio && (
            <Section title={t("Biographie", "Biography")}>
              <p className="text-sm text-[#5C3D00] leading-relaxed whitespace-pre-wrap">{app.bio}</p>
            </Section>
          )}

          {/* Documents — always visible, lazy-loaded */}
          <Section title={t("Documents & Pièces justificatives", "Documents & Supporting files")}>
            {fullLoading ? (
              <p className="text-xs text-[#6B5E44]">{t("Chargement…", "Loading…")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* CV */}
                {fullApp?.cvUrl ? (
                  <a
                    href={fullApp.cvUrl.startsWith("data:") ? fullApp.cvUrl : `/api/hr/document?url=${encodeURIComponent(fullApp.cvUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 bg-[#FFF3B0] border border-[#F5C400]/50 rounded-xl hover:bg-[#FFDE59]/30 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 18 15 15"/><line x1="12" y1="10" x2="12" y2="18"/>
                    </svg>
                    <span className="text-sm font-bold text-[#5C3D00]">{t("CV", "CV")}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#9B8A6B] ml-auto flex-shrink-0">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-sm text-red-600 font-semibold">{t("CV — non fourni", "CV — not provided")}</span>
                  </div>
                )}

                {/* Lettre de motivation */}
                {fullApp?.motivationLetterUrl ? (
                  <a
                    href={fullApp.motivationLetterUrl.startsWith("data:") ? fullApp.motivationLetterUrl : `/api/hr/document?url=${encodeURIComponent(fullApp.motivationLetterUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 bg-[#F0F7FF] border border-blue-200 rounded-xl hover:bg-blue-50 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span className="text-sm font-bold text-blue-700">{t("Lettre de motivation", "Motivation letter")}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-400 ml-auto flex-shrink-0">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-sm text-red-600 font-semibold">{t("Lettre de motivation — non fournie", "Motivation letter — not provided")}</span>
                  </div>
                )}

                {/* Diplômes / certificats */}
                {(fullApp?.certificateUrls?.length ?? 0) > 0 ? (
                  fullApp!.certificateUrls!.map((url, i) => (
                    <a
                      key={i}
                      href={url.startsWith("data:") ? url : `/api/hr/document?url=${encodeURIComponent(url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-red-600">PDF</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{t("Diplôme / Certificat", "Diploma / Certificate")} {i + 1}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </a>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-sm text-red-600 font-semibold">{t("Diplômes — non fournis", "Diplomas — not provided")}</span>
                  </div>
                )}

                {/* Attestations de travail */}
                {(fullApp?.attestationUrls?.length ?? 0) > 0 && fullApp!.attestationUrls!.map((url, i) => (
                  <a
                    key={i}
                    href={url.startsWith("data:") ? url : `/api/hr/document?url=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-green-700">ATT</span>
                    </div>
                    <span className="text-sm font-bold text-green-800">{t("Attestation de travail", "Work attestation")} {i + 1}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </a>
                ))}

                {/* Note pièce d'identité */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-sm text-amber-700">
                    {t("Pièce d'identité (CIN/Passeport) — champ à ajouter lors de la prochaine mise à jour du formulaire de candidature.", "ID document (CIN/Passport) — field to be added in the next onboarding update.")}
                  </span>
                </div>
              </div>
            )}
          </Section>

          {/* Video — shown for VIDEO_SUBMITTED and all subsequent stages */}
          {VIDEO_STAGES.includes(app.status) && !fullLoading && (
            <Section title={t("Vidéo de présentation", "Presentation video")}>
              {!videoUrl ? (
                <p className="text-sm text-[#9B8A6B] italic py-2">{t("Aucune vidéo soumise.", "No video submitted.")}</p>
              ) : (
                <>
                  {app.videoSubmittedAt && (
                    <p className="text-xs text-[#6B5E44] mb-3">
                      {t("Reçue le", "Received on")} {new Date(app.videoSubmittedAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")}
                    </p>
                  )}
                  {(() => {
                    const ytEmbed = getYouTubeEmbedUrl(videoUrl);
                    const loomEmbed = getLoomEmbedUrl(videoUrl);
                    if (ytEmbed || loomEmbed) {
                      return (
                        <div className="rounded-xl overflow-hidden border border-violet-200 aspect-video">
                          <iframe
                            src={ytEmbed ?? loomEmbed!}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(videoUrl)) {
                      return (
                        <div className="rounded-xl overflow-hidden border border-violet-200 bg-black">
                          <video src={videoUrl} controls className="w-full max-h-72 object-contain" preload="metadata" />
                          <a href={videoUrl} target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-2 py-2 text-xs text-violet-500 hover:text-violet-700 transition bg-violet-50">
                            {t("Ouvrir dans un nouvel onglet", "Open in new tab")} ↗
                          </a>
                        </div>
                      );
                    }
                    return (
                      <a href={videoUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition">
                        <span className="text-xl">▶️</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-violet-800">{t("Visionner la vidéo", "Watch video")}</p>
                          <p className="text-xs text-violet-500 truncate">{videoUrl}</p>
                        </div>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400 ml-auto flex-shrink-0">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                      </a>
                    );
                  })()}
                </>
              )}
            </Section>
          )}

          {/* Interview Scheduler — shown in STAGE1_REVIEW */}
          {app.status === "STAGE1_REVIEW" && (
            <Section title={t("Planifier un entretien", "Schedule an interview")}>
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
            <Section title={t("Entretien", "Interview")}>
              <InterviewStatus app={{ ...app, interviewToken }} />
            </Section>
          )}

          {/* Post-signature meeting scheduler — shown for SIGNED and ACTIVE */}
          {["SIGNED", "ACTIVE"].includes(app.status) && (
            <Section title={t("Proposer un créneau de réunion", "Propose a meeting slot")}>
              <InterviewScheduler
                app={app}
                onScheduled={() => {}}
                label={t("Envoyer l'invitation au tuteur", "Send meeting invitation to tutor")}
                hint={t(
                  "Proposez 1 à 3 créneaux pour votre réunion de suivi avec ce tuteur.",
                  "Propose 1 to 3 slots for your follow-up meeting with this tutor."
                )}
              />
            </Section>
          )}

          {/* Move actions */}
          {nextStatuses.length > 0 && (
            <Section title={t("Actions", "Actions")}>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(s => {
                  const col = COLUMNS.find(c => c.key === s);
                  const isRejected = s === "REJECTED";
                  const isSuspend = s === "SUSPENDED";
                  const isReactivate = s === "ACTIVE" && app.status === "SUSPENDED";
                  const noVideo = s === "VIDEO_SUBMITTED" && !fullLoading && !fullApp?.videoSubmissionUrl;
                  const isActivate = s === "ACTIVE" && app.status !== "SUSPENDED";
                  const blockReason = isActivate ? activeBlockReason : (noVideo ? t("Aucune vidéo soumise par le candidat", "No video submitted by candidate") : null);

                  // Action label mapping
                  const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
                    STAGE1_REVIEW:       { fr: "Passer en évaluation", en: "Move to review" },
                    VIDEO_REQUESTED:     { fr: "Demander la vidéo",   en: "Request video"  },
                    VIDEO_SUBMITTED:     { fr: "Vidéo reçue",         en: "Video received" },
                    INTERVIEW_SCHEDULED: { fr: "Planifier entretien", en: "Schedule interview" },
                    INTERVIEW_COMPLETE:  { fr: "Entretien terminé",   en: "Interview done" },
                    OFFER_PENDING:       { fr: "Envoyer l'offre",     en: "Send offer"     },
                    SIGNED:              { fr: "Contrat signé",       en: "Contract signed" },
                    ACTIVE:              isReactivate
                      ? { fr: "Réactiver le compte", en: "Reactivate account" }
                      : { fr: "Activer le compte",   en: "Activate account"   },
                    SUSPENDED:           { fr: "Suspendre le compte", en: "Suspend account" },
                    RESERVE:             { fr: "Mettre en réserve",   en: "Put on reserve" },
                    INCOMPLETE:          { fr: "Dossier incomplet",   en: "Mark incomplete" },
                    REJECTED:            { fr: "Rejeter",             en: "Reject"         },
                  };
                  const label = ACTION_LABELS[s]?.[lang as "fr" | "en"] ?? (lang === "fr" ? col?.labelFr : col?.labelEn);

                  if (isRejected) {
                    return (
                      <button key={s}
                        onClick={() => setShowRejectModal(true)}
                        disabled={!!movingTo}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-red-400 bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {label}
                      </button>
                    );
                  }
                  return (
                    <button key={s}
                      onClick={() => handleMove(s)}
                      disabled={!!movingTo || !!blockReason}
                      title={blockReason ?? undefined}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSuspend
                          ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                          : isReactivate
                          ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                          : "border-[#F5C400] text-[#5C3D00] hover:bg-[#FFF3B0]"
                      }`}>
                      {movingTo === s ? "…" : label}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Candidate exchanges */}
          <Section title={t(`Échanges avec le candidat (${candidateMessages.length})`, `Exchanges with candidate (${candidateMessages.length})`)}>
            <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
              {candidateMessages.length === 0 && (
                <p className="text-xs text-[#6B5E44]">{t("Aucun message pour l'instant.", "No messages yet.")}</p>
              )}
              {candidateMessages.map(n => (
                <div
                  key={n.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    n.isFromCandidate
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-[#FFF3B0] border border-[#F5C400]/30 ml-4"
                  }`}
                >
                  <p className="text-[10px] font-bold text-[#9B7A00] mb-0.5">
                    {n.isFromCandidate
                      ? t("Candidat", "Candidate")
                      : `${n.author?.email ?? "RH"} — ${t("Votre réponse (visible par le candidat)", "Your reply (visible to candidate)")}`}
                  </p>
                  <p className="text-[#5C3D00] whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-[#6B5E44] mt-1">
                    {new Date(n.createdAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")}
                  </p>
                </div>
              ))}
            </div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              placeholder={t("Répondre au candidat (visible dans son espace)…", "Reply to candidate (visible in their space)…")}
              className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-blue-50 focus:outline-none focus:border-blue-400 resize-none"
            />
            <button
              onClick={handleReply}
              disabled={savingReply || !replyText.trim()}
              className="mt-1.5 px-4 py-1.5 bg-blue-600 text-white font-bold rounded-full text-sm hover:bg-blue-700 disabled:opacity-50 transition">
              {savingReply ? t("Envoi…", "Sending…") : t("Répondre au candidat", "Reply to candidate")}
            </button>
          </Section>

          {/* Internal HR notes */}
          <Section title={t(`Notes internes (${internalNotes.length})`, `Internal notes (${internalNotes.length})`)}>
            <div className="space-y-3 mb-3">
              {internalNotes.length === 0 && (
                <p className="text-xs text-[#6B5E44]">{t("Aucune note interne.", "No internal notes.")}</p>
              )}
              {internalNotes.map(n => (
                <div key={n.id} className="bg-[#FAF8F0] rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-[#9B8A6B] mb-0.5">{n.author?.email ?? "RH"}</p>
                  <p className="text-sm text-[#5C3D00] whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-[#6B5E44] mt-1">
                    {new Date(n.createdAt).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")}
                  </p>
                </div>
              ))}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              placeholder={t("Note interne (non visible par le candidat)…", "Internal note (not visible to candidate)…")}
              className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="mt-2 px-4 py-1.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition">
              {savingNote ? t("Enregistrement…", "Saving…") : t("Ajouter note interne", "Add internal note")}
            </button>
          </Section>
        </div>
      </div>

      {/* Reject Modal — RH#12 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-[#5C3D00] text-lg">{t("Motif de refus", "Rejection reason")}</h3>
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest">{t("Motif prédéfini", "Preset reason")}</p>
              {[
                { fr: "Qualité audio/vidéo insuffisante",           en: "Insufficient audio/video quality"       },
                { fr: "Diplôme ou certification manquant(e)",       en: "Missing diploma or certification"       },
                { fr: "Niveau d'anglais insuffisant (B2+ requis)",  en: "Insufficient English level (B2+ required)" },
                { fr: "Bio à reformuler / trop courte",             en: "Bio to rework / too short"              },
                { fr: "Profil incomplet (documents manquants)",     en: "Incomplete profile (missing documents)" },
                { fr: "Pas de disponibilité compatible",            en: "No compatible availability"             },
                { fr: "Niveau d'enseignement non conforme",         en: "Teaching level not compliant"           },
                { fr: "Comportement non professionnel en entretien", en: "Unprofessional behavior in interview"  },
              ].map(opt => (
                <button key={opt.fr}
                  onClick={() => setRejectPreset(lang === "fr" ? opt.fr : opt.en)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm border-2 transition ${
                    rejectPreset === (lang === "fr" ? opt.fr : opt.en)
                      ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                      : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-red-200 hover:bg-red-50/50"
                  }`}
                >
                  {lang === "fr" ? opt.fr : opt.en}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-1">{t("Ou message personnalisé", "Or custom message")}</p>
              <textarea
                value={rejectCustom}
                onChange={e => setRejectCustom(e.target.value)}
                rows={3}
                placeholder={t("Précisez le motif…", "Specify reason…")}
                className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowRejectModal(false); setRejectPreset(""); setRejectCustom(""); }}
                disabled={rejectSaving}
                className="flex-1 py-2.5 text-sm font-bold border-2 border-[#6B5E44]/30 text-[#5C3D00] rounded-full hover:bg-gray-50 transition">
                {t("Annuler", "Cancel")}
              </button>
              <button
                onClick={async () => {
                  const reason = rejectCustom.trim() || rejectPreset;
                  if (!reason) return;
                  setRejectSaving(true);
                  const res = await fetch(`/api/console/hr/applications/${app.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "REJECTED", rejectionReason: reason }),
                  });
                  setRejectSaving(false);
                  if (res.ok) {
                    onStatusChange(app.id, "REJECTED");
                    setShowRejectModal(false);
                    setRejectPreset("");
                    setRejectCustom("");
                  }
                }}
                disabled={rejectSaving || (!rejectPreset && !rejectCustom.trim())}
                className="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 transition">
                {rejectSaving ? t("Envoi…", "Sending…") : t("Confirmer le refus", "Confirm rejection")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Interview Scheduler ──────────────────────────────────────────────────────

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function InterviewScheduler({ app, onScheduled, label, hint }: { app: Application; onScheduled: (token: string) => void; label?: string; hint?: string }) {
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
        {hint ?? "Proposez 1 à 3 créneaux (en heure locale de votre navigateur — ils seront convertis en heure de Tunis pour le candidat)."}
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
        {sending ? "Envoi…" : (label ?? "Envoyer le lien au candidat")}
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

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function CefrLevelEditor({
  appId,
  min,
  max,
  onSaved,
}: {
  appId: string;
  min: string | null | undefined;
  max: string | null | undefined;
  onSaved: (min: string, max: string) => void;
}) {
  const [localMin, setLocalMin] = useState(min ?? "");
  const [localMax, setLocalMax] = useState(max ?? "");
  const [saving, setSaving] = useState(false);

  async function save(newMin: string, newMax: string) {
    setSaving(true);
    await fetch(`/api/console/hr/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cefrTeachingMin: newMin || null, cefrTeachingMax: newMax || null }),
    });
    setSaving(false);
    if (newMin && newMax) onSaved(newMin, newMax);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-[#9B8A6B] font-bold uppercase mb-1">Niveau min</p>
          <div className="flex gap-1 flex-wrap">
            {CEFR_LEVELS.map(l => (
              <button key={l} onClick={() => { setLocalMin(l); save(l, localMax); }}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${localMin === l ? "bg-[#5C3D00] text-white border-[#5C3D00]" : "border-[#6B5E44]/30 text-[#6B5E44] hover:border-[#5C3D00]/40"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-[#9B8A6B] font-bold uppercase mb-1">Niveau max</p>
          <div className="flex gap-1 flex-wrap">
            {CEFR_LEVELS.map(l => (
              <button key={l} onClick={() => { setLocalMax(l); save(localMin, l); }}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${localMax === l ? "bg-[#F5C400] text-[#5C3D00] border-[#F5C400]" : "border-[#6B5E44]/30 text-[#6B5E44] hover:border-[#F5C400]/60"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      {localMin && localMax && (
        <p className="text-xs text-green-700 font-semibold">
          {saving ? "Enregistrement…" : `Niveaux acceptés : ${localMin} → ${localMax}`}
        </p>
      )}
      {(!localMin || !localMax) && (
        <p className="text-xs text-amber-600">{saving ? "Enregistrement…" : "Niveaux non définis — cliquez pour les renseigner"}</p>
      )}
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

// ─── Pending Profile Changes View ─────────────────────────────────────────────

interface ProfileSnapshot {
  bio: string | null;
  profilePhotoUrl: string | null;
  videoIntroUrl: string | null;
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  specializations: string[];
}

interface PendingChange {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  currentProfile: ProfileSnapshot | null;
  proposedChanges: Record<string, unknown>;
  createdAt: string;
}

function toDisplayStr(val: unknown): string {
  if (val == null) return "—";
  if (Array.isArray(val)) return (val as string[]).join(", ") || "—";
  return String(val) || "—";
}

function DiffRow({ label, current, proposed }: { label: string; current: unknown; proposed: unknown }) {
  const cur = toDisplayStr(current);
  const prop = toDisplayStr(proposed);
  const changed = cur !== prop;
  return (
    <div className={`grid grid-cols-[100px_1fr_1fr] gap-2 py-2 border-b border-[#6B5E44]/10 text-xs ${changed ? "bg-amber-50/60 -mx-4 px-4" : ""}`}>
      <span className="text-[#6B5E44] font-semibold self-start pt-0.5">{label}</span>
      <span className="text-[#5C3D00] whitespace-pre-wrap break-words">{cur}</span>
      <span className={`whitespace-pre-wrap break-words font-semibold ${changed ? "text-amber-800" : "text-[#5C3D00]"}`}>
        {changed && "→ "}{prop}
      </span>
    </div>
  );
}

function PendingChangeCard({
  change,
  onReviewed,
}: {
  change: PendingChange;
  onReviewed: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const proposed = change.proposedChanges as Record<string, unknown>;
  const current = change.currentProfile;

  async function handleAction(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !rejectNote.trim()) {
      setActionError("Veuillez indiquer un motif de refus.");
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      const res = await fetch(`/api/console/hr/pending-changes/${change.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hrNote: rejectNote.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setActionError(d.error ?? "Erreur serveur");
        return;
      }
      onReviewed(change.id);
    } catch {
      setActionError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#6B5E44]/15 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-bold text-[#5C3D00]">{change.tutorName}</p>
          <p className="text-xs text-[#6B5E44]">{change.tutorEmail}</p>
          <p className="text-[10px] text-[#9B8A6B] mt-0.5">
            Soumis le {new Date(change.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs font-bold text-[#5C3D00] bg-[#FFF3B0] border border-[#F5C400]/50 rounded-full px-3 py-1 hover:bg-[#FFDE59] transition shrink-0"
        >
          {expanded ? "Réduire" : "Voir le détail"}
        </button>
      </div>

      {/* Photo preview if changed */}
      {typeof proposed.profilePhotoUrl === "string" && proposed.profilePhotoUrl !== current?.profilePhotoUrl && (
        <div className="px-5 pb-3 flex items-center gap-4">
          {current?.profilePhotoUrl && (
            <div className="text-center">
              <p className="text-[10px] text-[#6B5E44] mb-1">Actuel</p>
              <img src={current.profilePhotoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#6B5E44]/20" />
            </div>
          )}
          <div className="text-[#6B5E44] text-sm font-bold">→</div>
          <div className="text-center">
            <p className="text-[10px] text-amber-700 mb-1 font-bold">Proposé</p>
            <img src={proposed.profilePhotoUrl as string} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-amber-400" />
          </div>
        </div>
      )}

      {/* Diff table */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-[#6B5E44]/10 pt-3">
          <div className="grid grid-cols-[100px_1fr_1fr] gap-2 mb-1">
            <span />
            <span className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest">Actuel</span>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Proposé</span>
          </div>
          <DiffRow label="Bio" current={current?.bio} proposed={proposed.bio} />
          <DiffRow label="Niv. min" current={current?.cefrTeachingMin} proposed={proposed.cefrTeachingMin} />
          <DiffRow label="Niv. max" current={current?.cefrTeachingMax} proposed={proposed.cefrTeachingMax} />
          <DiffRow label="Spécialisations" current={current?.specializations} proposed={proposed.specializations} />
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-[#6B5E44]/10 px-5 py-4 bg-[#FAF8F0] space-y-3">
        {rejecting ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#5C3D00]">Motif du refus (visible par le tuteur) *</label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={2}
              placeholder="Ex : La biographie est trop courte, veuillez développer votre méthode d'enseignement."
              className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-red-400 resize-none"
            />
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setRejecting(false); setRejectNote(""); setActionError(""); }}
                disabled={saving}
                className="flex-1 py-2 text-xs font-bold border-2 border-[#6B5E44]/30 text-[#5C3D00] rounded-full hover:bg-white transition">
                Annuler
              </button>
              <button onClick={() => handleAction("REJECT")}
                disabled={saving || !rejectNote.trim()}
                className="flex-1 py-2 text-xs font-bold bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 transition">
                {saving ? "Envoi…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {actionError && <p className="text-xs text-red-600 w-full">{actionError}</p>}
            <button
              onClick={() => setRejecting(true)}
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold border-2 border-red-300 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50 transition"
            >
              Refuser
            </button>
            <button
              onClick={() => handleAction("APPROVE")}
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition"
            >
              {saving ? "…" : "Approuver ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingChangesView() {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/console/hr/pending-changes")
      .then(r => r.json())
      .then(data => { setChanges(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  function handleReviewed(id: string) {
    setChanges(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6B5E44]">Chargement…</div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-600 text-sm">{error}</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {changes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✓</p>
          <p className="font-bold text-[#5C3D00] text-lg">Aucune modification en attente</p>
          <p className="text-sm text-[#6B5E44] mt-1">Tous les profils tuteurs sont à jour.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changes.map(c => (
            <PendingChangeCard key={c.id} change={c} onReviewed={handleReviewed} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

export default function HrKanban({ hrEmail, role }: { hrEmail: string; role?: string }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const [view, setView] = useState<"kanban" | "pending">("kanban");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [search, setSearch] = useState("");
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [activeSpec, setActiveSpec] = useState<string | null>(null);
  const [hideEmpty, setHideEmpty] = useState(true);

  useEffect(() => {
    // Fetch pending profile changes count for badge
    fetch("/api/console/hr/pending-changes")
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPendingCount(data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/console/hr/applications")
      .then(async r => {
        const text = await r.text();
        let data: unknown;
        try { data = JSON.parse(text); } catch {
          setFetchError(`Erreur ${r.status} — réponse invalide: ${text.slice(0, 300)}`);
          setLoading(false);
          return;
        }
        if (!r.ok) {
          setFetchError(`Erreur ${r.status}: ${(data as { error?: string }).error ?? text.slice(0, 300)}`);
          setLoading(false);
          return;
        }
        setApps(Array.isArray(data) ? data as Application[] : []);
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

  // All specializations for selected language (always show full list when a language is active)
  const ALL_SPECS = ["CONVERSATIONAL", "PROFESSIONAL", "ACADEMIC", "EXAM_PREP"];
  const specsForLang = activeLang ? ALL_SPECS : [];

  // Reset specialty when language changes
  function selectLang(langCode: string | null) {
    setActiveLang(langCode);
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
    <div className="min-h-screen bg-[#FAF8F0] overflow-x-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-3 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <Link href="/" className="bg-[#5C3D00] px-2.5 py-1.5 rounded-lg flex-shrink-0 inline-flex items-center"><img src="/logo.svg" alt="WithYou" className="h-12 w-auto brightness-0 invert" /></Link>
          <span className="text-[#6B5E44] text-sm font-semibold whitespace-nowrap hidden lg:block">{t("Console RH", "HR Console")}</span>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-[#FAF8F0] rounded-full p-1 border border-[#6B5E44]/15 flex-shrink-0">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${view === "kanban" ? "bg-white text-[#5C3D00] shadow-sm" : "text-[#6B5E44] hover:text-[#5C3D00]"}`}
            >
              {t("Candidatures", "Applications")}
            </button>
            <button
              onClick={() => setView("pending")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${view === "pending" ? "bg-white text-[#5C3D00] shadow-sm" : "text-[#6B5E44] hover:text-[#5C3D00]"}`}
            >
              {t("Modifications en attente", "Pending changes")}
              {pendingCount !== null && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {view === "kanban" && (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("Rechercher…", "Search…")}
                className="border border-[#6B5E44]/30 rounded-full px-3 py-1.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] w-32 min-w-0"
              />
              <button
                onClick={() => setHideEmpty(v => !v)}
                className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition whitespace-nowrap flex-shrink-0 ${
                  hideEmpty
                    ? "bg-[#5C3D00] border-[#5C3D00] text-white"
                    : "border-[#6B5E44]/30 text-[#6B5E44] hover:border-[#5C3D00]/40"
                }`}
              >
                {t("Cacher vides", "Hide empty")}
              </button>
            </>
          )}
          <span className="text-xs text-[#6B5E44] truncate max-w-[110px] hidden md:block">{hrEmail}</span>
          {role === "ADMIN" && (
            <Link href="/dashboard/admin"
              className="text-xs font-semibold text-[#9B8A6B] hover:text-[#5C3D00] transition px-2 py-1 rounded-lg hover:bg-black/5 whitespace-nowrap flex-shrink-0">
              ← Admin
            </Link>
          )}
          <button onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="text-xs font-semibold text-[#9B8A6B] hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50 whitespace-nowrap flex-shrink-0">
            {t("Déconnexion", "Sign out")}
          </button>
          <div className="flex-shrink-0"><LanguageSwitcher /></div>
        </div>
      </div>

      {/* Pending profile changes view */}
      {view === "pending" && <PendingChangesView />}

      {view === "kanban" && <>
      {/* ── LANGUAGE FILTER ── */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-3">
        <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{t("Filtrer par langue", "Filter by language")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectLang(null)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition ${
              !activeLang
                ? "bg-[#5C3D00] border-[#5C3D00] text-white"
                : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#5C3D00]/40"
            }`}
          >
            {t("Toutes", "All")}
            <span className="text-xs opacity-70">({apps.length})</span>
          </button>
          {allLanguages.map(langCode => {
            const count = apps.filter(a => a.languagesTaught.includes(langCode)).length;
            const label = getLangLabel(langCode, lang);
            return (
              <button
                key={langCode}
                onClick={() => selectLang(langCode)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition ${
                  activeLang === langCode
                    ? "bg-[#F5C400] border-[#F5C400] text-[#5C3D00]"
                    : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#F5C400]/60"
                }`}
              >
                {label}
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Specialty sub-filter */}
        {activeLang && specsForLang.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#6B5E44]/10">
            <span className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest self-center">{t("Spécialité :", "Specialty:")}</span>
            <button
              onClick={() => setActiveSpec(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                !activeSpec ? "bg-[#5C3D00] border-[#5C3D00] text-white" : "border-[#6B5E44]/25 text-[#6B5E44] hover:border-[#5C3D00]/40"
              }`}
            >
              {t("Toutes", "All")}
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
                {SPEC_LABELS[spec]?.[lang] ?? spec}
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
              <span className="font-bold text-[#5C3D00]">{count}</span> {lang === "fr" ? col.labelFr : col.labelEn}
            </div>
          );
        })}
        <div className="ml-auto text-xs text-[#6B5E44]">
          <span className="font-bold text-[#5C3D00]">{filtered.length}</span>
          {" "}{t("candidat", "candidate")}{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== apps.length && <span className="text-[#9B8A6B]"> / {apps.length} {t("total", "total")}</span>}
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#6B5E44]">{t("Chargement…", "Loading…")}</div>
      ) : fetchError ? (
        <div className="flex items-center justify-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm max-w-lg text-center">
            <p className="font-bold mb-1">{t("Impossible de charger les candidatures", "Could not load applications")}</p>
            <p className="font-mono text-xs">{fetchError}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 p-6 min-w-max">
            {COLUMNS.filter(col => !hideEmpty || filtered.some(a => a.status === col.key)).map(col => {
              const colApps = filtered.filter(a => a.status === col.key);
              return (
                <div key={col.key} className="w-60 shrink-0">
                  {/* Column header */}
                  <div className={`rounded-xl border px-3 py-2 mb-3 ${col.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5C3D00]">{col.icon} {lang === "fr" ? col.labelFr : col.labelEn}</span>
                      <span className="text-xs font-bold text-[#6B5E44] bg-white/60 rounded-full px-2 py-0.5">
                        {colApps.length}
                      </span>
                    </div>
                    {(lang === "fr" ? col.sublabelFr : col.sublabelEn) && (
                      <p className="text-[10px] text-[#6B5E44]/60 mt-0.5">{lang === "fr" ? col.sublabelFr : col.sublabelEn}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {colApps.length === 0 && (
                      <p className="text-xs text-[#6B5E44]/40 text-center py-4">{t("Vide", "Empty")}</p>
                    )}
                    {colApps.map(app => (
                      <AppCard key={app.id} app={app} lang={lang} onClick={() => setSelected(app)} />
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
      </>}
    </div>
  );
}
