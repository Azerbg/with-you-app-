"use client";

import { useState } from "react";
import Link from "next/link";

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
const SPECS = [
  { val: "CONVERSATIONAL", label: "Conversationnel" },
  { val: "PROFESSIONAL",   label: "Professionnel" },
  { val: "ACADEMIC",       label: "Académique" },
  { val: "EXAM_PREP",      label: "Prépa examens" },
];

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";
const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition";
const btnSecondary = "border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition";

const TOTAL_STEPS = 3;

export default function CompleteProfileWizard({
  existing,
  pendingChange,
}: {
  existing: Existing | null;
  pendingChange: PendingChange | null;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill with existing approved data (not pending — tutors see what's live)
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.profilePhotoUrl ?? "");
  const [photoName, setPhotoName] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [videoUrl, setVideoUrl] = useState(existing?.videoIntroUrl ?? "");
  const [videoName, setVideoName] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [cefrMin, setCefrMin] = useState(existing?.cefrTeachingMin ?? "A1");
  const [cefrMax, setCefrMax] = useState(existing?.cefrTeachingMax ?? "C2");
  const [specs, setSpecs] = useState<string[]>(existing?.specializations ?? []);

  function readFile(file: File, maxMb: number, onDone: (dataUrl: string, name: string) => void, onError: (msg: string) => void) {
    if (file.size > maxMb * 1024 * 1024) {
      onError(`Fichier trop lourd (max ${maxMb} Mo)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onDone(reader.result as string, file.name);
    reader.onerror = () => onError("Erreur de lecture du fichier");
    reader.readAsDataURL(file);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoLoading(true);
    readFile(file, 5, (dataUrl, name) => { setPhotoUrl(dataUrl); setPhotoName(name); setPhotoLoading(false); }, (msg) => { setPhotoError(msg); setPhotoLoading(false); });
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError("");
    setVideoLoading(true);
    readFile(file, 150, (dataUrl, name) => { setVideoUrl(dataUrl); setVideoName(name); setVideoLoading(false); }, (msg) => { setVideoError(msg); setVideoLoading(false); });
  }

  function toggleSpec(val: string) {
    setSpecs(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  }

  const minIdx = CEFR_LEVELS.indexOf(cefrMin);
  const maxIdx = CEFR_LEVELS.indexOf(cefrMax);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tutors/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          profilePhotoUrl: photoUrl || undefined,
          videoIntroUrl: videoUrl || undefined,
          cefrTeachingMin: cefrMin,
          cefrTeachingMax: cefrMax,
          specializations: specs,
        }),
      });
      if (!res.ok) {
        setError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  // ── Submitted confirmation screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center px-4 py-12 bg-[#FAF8F0]">
        <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF3B0] border-2 border-[#F5C400] flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2.5" className="w-8 h-8">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">Modifications soumises</h2>
          <p className="text-[#6B5E44] text-sm mb-6">
            Votre profil est en cours de validation par notre équipe RH. Vous serez notifié par e-mail dès qu&apos;une décision sera prise.
          </p>
          <Link
            href="/dashboard/tutor"
            className="inline-block px-6 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] transition"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center px-4 py-12 bg-[#FAF8F0]">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">

        <div className="flex items-center justify-between mb-1">
          <Link href="/dashboard/tutor"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto" /></Link>
          <Link href="/dashboard/tutor" className="text-xs text-[#6B5E44] hover:text-[#5C3D00]">← Retour</Link>
        </div>

        {/* Pending / Rejected banner */}
        {pendingChange?.status === "PENDING" && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Modification en attente de validation</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Une modification a été soumise le {new Date(pendingChange.createdAt).toLocaleDateString("fr-FR")} et attend la validation de l&apos;équipe RH. Vous pouvez soumettre une nouvelle version pour la remplacer.
              </p>
            </div>
          </div>
        )}
        {pendingChange?.status === "REJECTED" && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 text-lg mt-0.5">✕</span>
            <div>
              <p className="text-sm font-bold text-red-700">Modification refusée par l&apos;équipe RH</p>
              {pendingChange.hrNote && (
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  <strong>Motif :</strong> {pendingChange.hrNote}
                </p>
              )}
              <p className="text-xs text-red-500 mt-1">Veuillez corriger votre profil et resoumettre.</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#6B5E44] mb-2">
            <span>Étape {step} sur {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="w-full bg-[#FAF8F0] rounded-full h-2">
            <div className="bg-[#F5C400] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Bio + Media */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">Votre présentation</h2>
            <p className="text-[#6B5E44] text-sm mb-5">
              C&apos;est la première chose que vos futurs étudiants liront. Soyez vous-même — pas un CV.
            </p>

            {/* Bio writing tips */}
            <div className="bg-[#FFF8E1] border border-[#F5C400]/40 rounded-xl p-4 mb-4 space-y-1.5">
              <p className="text-xs font-bold text-[#5C3D00] uppercase tracking-wide mb-2">✦ Comment écrire une bio qui attire des étudiants</p>
              {[
                "Parlez de votre passion pour la langue, pas de vos diplômes.",
                "Décrivez votre style : êtes-vous structuré, ludique, orienté conversation ?",
                "Citez un ou deux résultats concrets que vous avez aidé à atteindre.",
                "Soyez chaleureux — l'étudiant doit avoir envie de vous rencontrer.",
                "Évitez le jargon académique. Écrivez comme si vous parliez à un ami.",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#6B5E44]">
                  <span className="text-[#F5C400] font-bold mt-0.5 flex-shrink-0">→</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                Biographie <span className="font-normal text-[#6B5E44]">(100–2000 caractères)</span>
              </label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={7}
                placeholder={"Bonjour ! Je m'appelle [Prénom] et j'adore faire tomber les barrières linguistiques.\n\nMa méthode ? On parle. Beaucoup. Et on s'amuse aussi ! Je m'adapte à votre rythme et à vos objectifs — que vous vouliez briller en réunion professionnelle, réussir le TCF, ou simplement commander un café à Paris sans rougir.\n\nAvec moi, vous progresserez vite parce qu'on vise directement ce dont vous avez besoin."}
                className={inputCls + " resize-none"} />
              <p className={`text-xs mt-1 ${bio.length < 100 ? "text-red-400" : "text-green-600"}`}>
                {bio.length} / 100 caractères minimum
              </p>
            </div>

            {/* Photo upload */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
                Photo de profil <span className="font-normal text-[#6B5E44]">(optionnel)</span>
              </label>
              {photoUrl && photoUrl.startsWith("data:image") ? (
                <div className="flex items-center gap-3 mb-2">
                  <img src={photoUrl} alt="Photo" className="w-14 h-14 rounded-full object-cover border-2 border-[#F5C400]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#5C3D00] truncate">{photoName}</p>
                    <button type="button" onClick={() => { setPhotoUrl(""); setPhotoName(""); }}
                      className="text-xs text-red-500 hover:underline mt-0.5">Supprimer</button>
                  </div>
                </div>
              ) : photoUrl ? (
                <div className="flex items-center gap-3 mb-2">
                  <img src={photoUrl} alt="Photo" className="w-14 h-14 rounded-full object-cover border-2 border-[#F5C400]" />
                  <button type="button" onClick={() => setPhotoUrl("")}
                    className="text-xs text-red-500 hover:underline">Changer</button>
                </div>
              ) : null}
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${photoLoading ? "opacity-50 pointer-events-none" : "border-[#6B5E44]/30 hover:border-[#F5C400] hover:bg-[#FFF3B0]/30"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <span className="text-sm text-[#5C3D00] font-medium">
                  {photoLoading ? "Chargement…" : photoUrl ? "Changer la photo" : "Choisir une photo (JPG / PNG / WebP · max 5 Mo)"}
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </label>
              {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
            </div>

            {/* Video upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
                Vidéo d&apos;introduction <span className="font-normal text-[#6B5E44]">(optionnel · 60–90 sec)</span>
              </label>
              {videoUrl && videoName ? (
                <div className="flex items-center gap-3 p-3 bg-[#FFF3B0] border border-[#F5C400]/50 rounded-xl mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  <p className="text-xs font-semibold text-[#5C3D00] flex-1 truncate">{videoName}</p>
                  <button type="button" onClick={() => { setVideoUrl(""); setVideoName(""); }}
                    className="text-xs text-red-500 hover:underline shrink-0">Supprimer</button>
                </div>
              ) : null}
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${videoLoading ? "opacity-50 pointer-events-none" : "border-[#6B5E44]/30 hover:border-[#F5C400] hover:bg-[#FFF3B0]/30"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#5C3D00" strokeWidth="2" className="w-5 h-5 shrink-0">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span className="text-sm text-[#5C3D00] font-medium">
                  {videoLoading ? "Chargement…" : videoUrl ? "Changer la vidéo" : "Choisir une vidéo (MP4 / MOV · max 150 Mo)"}
                </span>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoChange} />
              </label>
              {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
            </div>

            <button onClick={() => setStep(2)} disabled={bio.length < 100}
              className={`w-full py-2.5 ${btnPrimary}`}>
              Continuer
            </button>
          </div>
        )}

        {/* Step 2: CEFR Range */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">Niveaux enseignés</h2>
            <p className="text-[#6B5E44] text-sm mb-6">Indiquez la plage de niveaux CEFR que vous pouvez enseigner.</p>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-2">Niveau minimum</label>
              <div className="flex gap-2">
                {CEFR_LEVELS.map((lvl, i) => (
                  <button key={lvl} type="button"
                    onClick={() => { setCefrMin(lvl); if (i > maxIdx) setCefrMax(lvl); }}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition ${
                      cefrMin === lvl
                        ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]"
                        : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"
                    }`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-2">Niveau maximum</label>
              <div className="flex gap-2">
                {CEFR_LEVELS.map((lvl, i) => (
                  <button key={lvl} type="button"
                    onClick={() => { setCefrMax(lvl); if (i < minIdx) setCefrMin(lvl); }}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition ${
                      cefrMax === lvl
                        ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]"
                        : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"
                    }`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-xl p-3 mb-6 text-sm text-[#5C3D00]">
              Vous enseignez du niveau <strong>{cefrMin}</strong> au niveau <strong>{cefrMax}</strong>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className={`flex-1 py-2.5 ${btnSecondary}`}>Retour</button>
              <button onClick={() => setStep(3)} disabled={minIdx > maxIdx}
                className={`flex-1 py-2.5 ${btnPrimary}`}>Continuer</button>
            </div>
          </div>
        )}

        {/* Step 3: Specializations + Submit */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">Spécialisations</h2>
            <p className="text-[#6B5E44] text-sm mb-6">Confirmez vos domaines d&apos;enseignement.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {SPECS.map(s => (
                <button key={s.val} type="button" onClick={() => toggleSpec(s.val)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition ${
                    specs.includes(s.val)
                      ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]"
                      : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Moderation notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 mt-0.5 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <p className="text-xs text-blue-700">
                Vos modifications seront soumises à l&apos;équipe RH avant d&apos;être publiées sur votre profil public.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} disabled={saving}
                className={`flex-1 py-2.5 ${btnSecondary}`}>Retour</button>
              <button onClick={handleSave} disabled={saving || specs.length === 0}
                className={`flex-1 py-2.5 ${btnPrimary}`}>
                {saving ? "Envoi…" : "Soumettre pour validation"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
