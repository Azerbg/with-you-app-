"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Existing {
  bio: string | null;
  profilePhotoUrl: string | null;
  videoIntroUrl: string | null;
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  specializations: string[];
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

export default function CompleteProfileWizard({ existing }: { existing: Existing | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [bio, setBio] = useState(existing?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.profilePhotoUrl ?? "");
  const [photoName, setPhotoName] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [videoUrl, setVideoUrl] = useState(existing?.videoIntroUrl ?? "");
  const [videoName, setVideoName] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");

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
  const [cefrMin, setCefrMin] = useState(existing?.cefrTeachingMin ?? "A1");
  const [cefrMax, setCefrMax] = useState(existing?.cefrTeachingMax ?? "C2");
  const [specs, setSpecs] = useState<string[]>(existing?.specializations ?? []);

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
      router.push("/dashboard/tutor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center px-4 py-12 bg-[#FAF8F0]">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">

        <div className="flex items-center justify-between mb-1">
          <Link href="/dashboard/tutor"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto" /></Link>
          <Link href="/dashboard/tutor" className="text-xs text-[#6B5E44] hover:text-[#5C3D00]">← Retour</Link>
        </div>

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
            <p className="text-[#6B5E44] text-sm mb-6">Ces informations seront visibles par les étudiants.</p>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                Biographie <span className="font-normal text-[#6B5E44]">(100–2000 caractères)</span>
              </label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={6}
                placeholder="Décrivez votre parcours, votre méthode d'enseignement et ce qui vous rend unique…"
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
                Vidéo d'introduction <span className="font-normal text-[#6B5E44]">(optionnel · 60–90 sec)</span>
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
            <p className="text-[#6B5E44] text-sm mb-6">Confirmez vos domaines d'enseignement.</p>

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
                {saving ? "Enregistrement…" : "Enregistrer le profil"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
