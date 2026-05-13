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
  const [videoUrl, setVideoUrl] = useState(existing?.videoIntroUrl ?? "");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAF8F0]">
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

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                Photo de profil (optionnel)
              </label>
              <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls} />
              <p className="text-xs text-[#6B5E44] mt-1">Lien direct vers une image (JPG/PNG)</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
                Vidéo d'introduction (optionnel)
              </label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/... ou https://loom.com/..."
                className={inputCls} />
              <p className="text-xs text-[#6B5E44] mt-1">YouTube ou Loom · 60–90 secondes</p>
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
