"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface Existing {
  bio: string | null;
  profilePhotoUrl: string | null;
  videoIntroUrl: string | null;
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  specializations: string[];
}

interface PendingChange {
  id: string;
  status: "PENDING" | "REJECTED";
  hrNote: string | null;
  changes: Record<string, unknown>;
  createdAt: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const SPECS = {
  CONVERSATIONAL: { fr: "Conversationnel",   en: "Conversational" },
  PROFESSIONAL:   { fr: "Professionnel",      en: "Professional" },
  ACADEMIC:       { fr: "Académique",         en: "Academic" },
  EXAM_PREP:      { fr: "Prépa examens",      en: "Exam prep" },
};

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";

export default function ProfileEditClient({
  existing,
  pendingChange,
}: {
  existing: Existing | null;
  pendingChange: PendingChange | null;
}) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;

  const [bio, setBio]           = useState(existing?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.profilePhotoUrl ?? "");
  const [photoName, setPhotoName] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError]     = useState("");
  const [videoUrl, setVideoUrl] = useState(existing?.videoIntroUrl ?? "");
  const [videoName, setVideoName] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError]     = useState("");
  const [cefrMin, setCefrMin]   = useState(existing?.cefrTeachingMin ?? "A1");
  const [cefrMax, setCefrMax]   = useState(existing?.cefrTeachingMax ?? "C2");
  const [specs, setSpecs]       = useState<string[]>(existing?.specializations ?? []);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  const minIdx = CEFR_LEVELS.indexOf(cefrMin);
  const maxIdx = CEFR_LEVELS.indexOf(cefrMax);

  function readFile(file: File, maxMb: number, onDone: (url: string, name: string) => void, onError: (msg: string) => void) {
    if (file.size > maxMb * 1024 * 1024) { onError(t(`Fichier trop lourd (max ${maxMb} Mo)`, `File too large (max ${maxMb} MB)`)); return; }
    const reader = new FileReader();
    reader.onload  = () => onDone(reader.result as string, file.name);
    reader.onerror = () => onError(t("Erreur de lecture", "Read error"));
    reader.readAsDataURL(file);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoError(""); setPhotoLoading(true);
    readFile(file, 5, (url, name) => { setPhotoUrl(url); setPhotoName(name); setPhotoLoading(false); }, msg => { setPhotoError(msg); setPhotoLoading(false); });
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setVideoError(""); setVideoLoading(true);
    readFile(file, 150, (url, name) => { setVideoUrl(url); setVideoName(name); setVideoLoading(false); }, msg => { setVideoError(msg); setVideoLoading(false); });
  }

  function toggleSpec(val: string) {
    setSpecs(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/tutors/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          profilePhotoUrl: photoUrl || undefined,
          videoIntroUrl:   videoUrl || undefined,
          cefrTeachingMin: cefrMin,
          cefrTeachingMax: cefrMax,
          specializations: specs,
        }),
      });
      if (!res.ok) { setError(t("Une erreur est survenue. Veuillez réessayer.", "An error occurred. Please try again.")); return; }
      setSubmitted(true);
    } finally { setSaving(false); }
  }

  // ── Submitted ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8 border border-black/5 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF3B0] border-2 border-[#F5C400] flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2.5" className="w-8 h-8">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#5C3D00] mb-2">
            {t("Modifications soumises", "Changes submitted")}
          </h2>
          <p className="text-[#6B5E44] text-sm mb-6">
            {t(
              "Votre profil est en cours de validation par notre équipe RH. Vous serez notifié par e-mail.",
              "Your profile is being reviewed by our HR team. You'll be notified by email."
            )}
          </p>
          <Link href="/dashboard/tutor" className="inline-block px-6 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] transition">
            {t("Retour au tableau de bord", "Back to dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  // ── Section header helper ────────────────────────────────────────────────
  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-4">
      <p className="font-bold text-[#2D1A00]">{title}</p>
      {subtitle && <p className="text-xs text-[#6B5E44] mt-0.5">{subtitle}</p>}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Top bar */}
      <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10">
        <h1 className="text-base font-bold text-[#5C3D00]">
          {t("Mon profil", "My profile")}
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tutor" className="text-xs text-[#6B5E44] hover:text-[#5C3D00] font-semibold transition">
            {t("← Retour", "← Back")}
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || bio.length < 100 || specs.length === 0}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-[#F5C400] text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50 transition"
          >
            {saving ? t("Envoi…","Submitting…") : t("Soumettre pour validation","Submit for review")}
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Pending / Rejected banner */}
          {pendingChange?.status === "PENDING" && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-amber-500 text-lg mt-0.5">⏳</span>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {t("Modification en attente de validation", "Change pending review")}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {t(
                    `Soumise le ${new Date(pendingChange.createdAt).toLocaleDateString("fr-FR")}. Vous pouvez soumettre une nouvelle version.`,
                    `Submitted on ${new Date(pendingChange.createdAt).toLocaleDateString("en-GB")}. You can submit a new version.`
                  )}
                </p>
              </div>
            </div>
          )}
          {pendingChange?.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-red-500 text-lg mt-0.5">✕</span>
              <div>
                <p className="text-sm font-bold text-red-700">{t("Modification refusée par l'équipe RH","Change rejected by HR")}</p>
                {pendingChange.hrNote && <p className="text-xs text-red-600 mt-1"><strong>{t("Motif","Reason")}:</strong> {pendingChange.hrNote}</p>}
              </div>
            </div>
          )}

          {/* ── BIO ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <SectionHeader
              title={t("Biographie", "Biography")}
              subtitle={t("Ce que vos étudiants liront en premier.", "The first thing your students will read.")}
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={8}
              placeholder={t(
                "Bonjour ! Je m'appelle… Ma méthode ? On parle, on progresse, on s'amuse !",
                "Hi! My name is… My approach? We talk, we practice, and have fun along the way!"
              )}
              className={inputCls + " resize-none"}
            />
            <p className={`text-xs mt-1 ${bio.length < 100 ? "text-red-400" : "text-green-600"}`}>
              {bio.length} / {t("100 caractères minimum", "100 characters minimum")}
            </p>
          </div>

          {/* ── PHOTO ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <SectionHeader
              title={t("Photo de profil", "Profile photo")}
              subtitle={t("Optionnel · JPG, PNG ou WebP · max 5 Mo", "Optional · JPG, PNG or WebP · max 5 MB")}
            />
            {photoUrl && (
              <div className="flex items-center gap-3 mb-3">
                <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-[#F5C400]" />
                <button type="button" onClick={() => { setPhotoUrl(""); setPhotoName(""); }}
                  className="text-xs text-red-500 hover:underline">
                  {t("Supprimer", "Remove")}
                </button>
              </div>
            )}
            <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${photoLoading ? "opacity-50 pointer-events-none" : "border-[#6B5E44]/30 hover:border-[#F5C400] hover:bg-[#FFF3B0]/30"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <span className="text-sm text-[#5C3D00] font-medium">
                {photoLoading ? t("Chargement…","Loading…") : photoUrl ? t("Changer la photo","Change photo") : t("Choisir une photo","Choose a photo")}
              </span>
              {photoName && <span className="text-xs text-[#9B8A6B] truncate ml-1">{photoName}</span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            </label>
            {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
          </div>

          {/* ── VIDEO ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <SectionHeader
              title={t("Vidéo d'introduction", "Introduction video")}
              subtitle={t("Optionnel · 60–90 sec · MP4, MOV · max 150 Mo", "Optional · 60–90 sec · MP4, MOV · max 150 MB")}
            />
            {videoUrl && videoName && (
              <div className="flex items-center gap-3 p-3 bg-[#FFF3B0] border border-[#F5C400]/50 rounded-xl mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <p className="text-xs font-semibold text-[#5C3D00] flex-1 truncate">{videoName}</p>
                <button type="button" onClick={() => { setVideoUrl(""); setVideoName(""); }}
                  className="text-xs text-red-500 hover:underline shrink-0">
                  {t("Supprimer","Remove")}
                </button>
              </div>
            )}
            <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${videoLoading ? "opacity-50 pointer-events-none" : "border-[#6B5E44]/30 hover:border-[#F5C400] hover:bg-[#FFF3B0]/30"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span className="text-sm text-[#5C3D00] font-medium">
                {videoLoading ? t("Chargement…","Loading…") : videoUrl ? t("Changer la vidéo","Change video") : t("Choisir une vidéo","Choose a video")}
              </span>
              <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoChange} />
            </label>
            {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
          </div>

          {/* ── CEFR ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <SectionHeader
              title={t("Niveaux enseignés", "Teaching levels")}
              subtitle={t("Plage de niveaux CEFR que vous pouvez enseigner.", "CEFR level range you can teach.")}
            />
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#5C3D00] mb-2">{t("Niveau minimum","Minimum level")}</label>
              <div className="flex gap-2">
                {CEFR_LEVELS.map((lvl, i) => (
                  <button key={lvl} type="button"
                    onClick={() => { setCefrMin(lvl); if (i > maxIdx) setCefrMax(lvl); }}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition ${cefrMin === lvl ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#5C3D00] mb-2">{t("Niveau maximum","Maximum level")}</label>
              <div className="flex gap-2">
                {CEFR_LEVELS.map((lvl, i) => (
                  <button key={lvl} type="button"
                    onClick={() => { setCefrMax(lvl); if (i < minIdx) setCefrMin(lvl); }}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition ${cefrMax === lvl ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-xl p-3 text-sm text-[#5C3D00]">
              {t(
                `Vous enseignez du niveau ${cefrMin} au niveau ${cefrMax}`,
                `You teach from level ${cefrMin} to level ${cefrMax}`
              )}
            </div>
          </div>

          {/* ── SPECIALIZATIONS ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <SectionHeader
              title={t("Spécialisations", "Specializations")}
              subtitle={t("Sélectionnez vos domaines d'enseignement.", "Select your areas of teaching.")}
            />
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SPECS).map(([val, labels]) => (
                <button key={val} type="button" onClick={() => toggleSpec(val)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition ${specs.includes(val) ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                  {lang === "fr" ? labels.fr : labels.en}
                </button>
              ))}
            </div>
          </div>

          {/* ── MODERATION NOTICE + SUBMIT ──────────────────────────── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 mt-0.5 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <p className="text-xs text-blue-700">
              {t(
                "Vos modifications seront soumises à l'équipe RH avant d'être publiées.",
                "Your changes will be reviewed by the HR team before going live."
              )}
            </p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || bio.length < 100 || specs.length === 0}
            className="w-full py-3 bg-[#F5C400] text-[#5C3D00] font-bold rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition text-sm"
          >
            {saving ? t("Envoi…","Submitting…") : t("Soumettre pour validation","Submit for review")}
          </button>

        </div>
      </div>
    </div>
  );
}
