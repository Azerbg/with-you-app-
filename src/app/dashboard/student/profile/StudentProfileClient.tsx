"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import StudentSidebar from "@/components/StudentSidebar";

// ─── Crop utility ─────────────────────────────────────────────────────────────

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedImg(src: string, crop: Area): Promise<string> {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = 400; canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, 400, 400);
  return canvas.toDataURL("image/jpeg", 0.88);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DAY_LABELS: Record<string,string> = { MON:"Lun",TUE:"Mar",WED:"Mer",THU:"Jeu",FRI:"Ven",SAT:"Sam",SUN:"Dim" };
const LANGUAGES = ["French","English","Arabic","Spanish","German","Italian","Portuguese","Mandarin","Japanese","Korean","Other"];
const OBJECTIVES: { value: string; label: string }[] = [
  { value: "CONVERSATIONAL", label: "Conversation" },
  { value: "PROFESSIONAL",   label: "Professionnel" },
  { value: "ACADEMIC",       label: "Académique" },
  { value: "EXAM_PREP",      label: "Préparation exam" },
  { value: "TRAVEL",         label: "Voyage" },
  { value: "CULTURAL",       label: "Culturel" },
];
const FREQUENCIES = [
  { value: "ONCE",        label: "1×/sem" },
  { value: "TWICE",       label: "2×/sem" },
  { value: "THREE_TIMES", label: "3×/sem" },
  { value: "INTENSIVE",   label: "4+×/sem" },
];
const DURATIONS = [
  { value: "PAY_PER_SESSION", label: "À la séance" },
  { value: "ONE_MONTH",       label: "1 mois" },
  { value: "THREE_MONTHS",    label: "3 mois" },
  { value: "SIX_MONTHS",      label: "6 mois" },
];
const TIME_WINDOWS = [
  { value: "MORNING",   label: "Matin" },
  { value: "AFTERNOON", label: "Après-midi" },
  { value: "EVENING",   label: "Soir" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  hasPendingImage: boolean;
  initials: string;
  cefrLevel: string | null;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  learningObjective: string | null;
  sessionFrequency: string | null;
  programDuration: string | null;
  availabilityDays: string[];
  timeWindowPreference: string[];
  country: string | null;
  programTier: string;
  timezone: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentProfileClient(p: Props) {
  const { update } = useSession();

  // Personal
  const [firstName, setFirstName] = useState(p.firstName ?? "");
  const [lastName,  setLastName]  = useState(p.lastName  ?? "");
  const [rawSrc,    setRawSrc]    = useState<string | null>(null);
  const [croppedSrc, setCroppedSrc] = useState<string | null>(null);
  const [savedImage, setSavedImage] = useState<string | null>(p.image);
  const [crop,  setCrop]  = useState({ x: 0, y: 0 });
  const [zoom,  setZoom]  = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Learning
  const [nativeLang,  setNativeLang]  = useState(p.nativeLanguage  ?? "");
  const [targetLang,  setTargetLang]  = useState(p.targetLanguage  ?? "");
  const [objective,   setObjective]   = useState(p.learningObjective ?? "");
  const [frequency,   setFrequency]   = useState(p.sessionFrequency ?? "");
  const [duration,    setDuration]    = useState(p.programDuration  ?? "");
  const [availDays,   setAvailDays]   = useState<string[]>(p.availabilityDays);
  const [timeWindows, setTimeWindows] = useState<string[]>(p.timeWindowPreference);
  const [country,     setCountry]     = useState(p.country ?? "");

  // UI state
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedArea(pixels), []);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image trop grande (max 5 Mo)"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => { setRawSrc(reader.result as string); setCrop({ x:0,y:0 }); setZoom(1); setShowCropper(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function confirmCrop() {
    if (!rawSrc || !croppedArea) return;
    const result = await getCroppedImg(rawSrc, croppedArea);
    setCroppedSrc(result);
    setShowCropper(false);
  }

  function toggleDay(d: string) {
    setAvailDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }
  function toggleWindow(w: string) {
    setTimeWindows(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nativeLanguage: nativeLang,
        targetLanguage: targetLang,
        learningObjective: objective,
        sessionFrequency: frequency,
        programDuration: duration,
        availabilityDays: availDays,
        timeWindowPreference: timeWindows,
        country: country,
      };
      if (croppedSrc) body.image = croppedSrc;

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue.");
      } else {
        const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await update({ name: fullName });
        if (croppedSrc) setSavedImage(croppedSrc);
        setSaved(true);
        setCroppedSrc(null);
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    }
    setSaving(false);
  }

  const avatar = croppedSrc ?? savedImage;
  const initials = (firstName[0] ?? p.initials[0] ?? "").toUpperCase() + (lastName[0] ?? p.initials[1] ?? "").toUpperCase();

  // ── Cropper fullscreen ──
  if (showCropper && rawSrc) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 bg-black/80">
          <div>
            <p className="text-white font-bold text-sm">Cadrer votre photo</p>
            <p className="text-white/50 text-xs mt-0.5">Déplacez et zoomez pour centrer votre visage</p>
          </div>
          <button onClick={() => setShowCropper(false)} className="text-white/60 hover:text-white text-xs font-medium transition">Annuler</button>
        </div>
        <div className="relative flex-1">
          <Cropper
            image={rawSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            style={{ containerStyle: { background: "#111" }, cropAreaStyle: { border: "3px solid #F5C400", boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)" } }}
          />
        </div>
        <div className="px-8 py-4 bg-black/80 flex items-center gap-4">
          <span className="text-white/40 text-xs">−</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-[#F5C400]" />
          <span className="text-white/40 text-xs">+</span>
        </div>
        <div className="px-5 pb-6 bg-black/80">
          <button onClick={confirmCrop} className="w-full py-3 rounded-2xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] transition">
            Confirmer le cadrage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <StudentSidebar
        email={p.email}
        name={firstName && lastName ? `${firstName} ${lastName}` : firstName || null}
        cefrLevel={p.cefrLevel}
        tier={p.programTier}
        initials={initials || p.initials}
        image={avatar}
        activePage="profile"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-base font-bold text-[#5C3D00]">Mon profil</h1>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                Modifications enregistrées ✓
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#F5C400] text-[#5C3D00] font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Photo + Name */}
          <div className="bg-white border border-black/5 rounded-2xl p-6">
            <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-5">Informations personnelles</p>

            {/* Avatar */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-[#F5C400]/40" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-2xl ring-2 ring-[#F5C400]/40">
                    {initials || p.initials}
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm font-semibold text-[#5C3D00] bg-[#FFF3B0] border border-[#F5C400]/50 px-4 py-2 rounded-xl hover:bg-[#FFDE59] transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Changer la photo
                </button>
                <p className="text-xs text-[#9B8A6B] mt-1.5">JPG ou PNG · max 5 Mo · visible après validation</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Prénom</label>
                <input
                  type="text" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={50}
                  className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Nom de famille</label>
                <input
                  type="text" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={50}
                  className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
                />
              </div>
            </div>

            {/* Email read-only */}
            <div>
              <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Adresse e-mail</label>
              <p className="text-sm text-[#9B8A6B] px-3 py-2.5 bg-[#FAF8F0] rounded-xl border border-black/5">{p.email}</p>
            </div>
          </div>

          {/* Learning profile */}
          <div className="bg-white border border-black/5 rounded-2xl p-6 space-y-5">
            <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest">Profil d'apprentissage</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Langue maternelle</label>
                <select value={nativeLang} onChange={e => setNativeLang(e.target.value)}
                  className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] transition">
                  <option value="">— Sélectionner —</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Langue apprise</label>
                <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
                  className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] transition">
                  <option value="">— Sélectionner —</option>
                  <option value="French">French</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">Objectif principal</label>
              <div className="grid grid-cols-3 gap-2">
                {OBJECTIVES.map(o => (
                  <button key={o.value} type="button" onClick={() => setObjective(o.value)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition ${objective === o.value ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">Pays de résidence</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Ex: Tunisie, France…"
                className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition" />
            </div>

            {p.cefrLevel && (
              <div className="bg-[#FAF8F0] border border-[#C4BAA8] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-[#6B5E44] font-semibold">Niveau CECRL évalué</span>
                <span className="text-lg font-bold text-[#5C3D00]">{p.cefrLevel}</span>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-black/5 rounded-2xl p-6 space-y-5">
            <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest">Rythme & disponibilités</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">Fréquence</label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCIES.map(f => (
                    <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition ${frequency === f.value ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">Engagement</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition ${duration === d.value ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">Créneaux préférés</label>
              <div className="flex gap-2">
                {TIME_WINDOWS.map(w => (
                  <button key={w.value} type="button" onClick={() => toggleWindow(w.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${timeWindows.includes(w.value) ? "border-[#F5C400] bg-[#FFF3B0] text-[#5C3D00]" : "border-[#6B5E44]/20 text-[#5C3D00] hover:border-[#F5C400]/50"}`}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">Jours disponibles</label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold border-2 transition ${availDays.includes(d) ? "bg-[#F5C400] border-[#F5C400] text-[#5C3D00] shadow-[0_2px_8px_rgba(245,196,0,0.4)]" : "border-[#6B5E44]/20 text-[#6B5E44] hover:border-[#F5C400]/50"}`}>
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save button at bottom */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3.5 rounded-2xl text-sm hover:bg-[#FFDE59] disabled:opacity-50 transition shadow-[0_4px_14px_rgba(245,196,0,0.35)]"
          >
            {saving ? "Enregistrement en cours…" : "Enregistrer les modifications"}
          </button>

        </div>
      </div>
    </div>
  );
}
