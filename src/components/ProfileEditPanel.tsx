"use client";

import { useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  hasPendingImage: boolean;
  initials: string;
  onClose: () => void;
  onSaved: (firstName: string, lastName: string) => void;
}

// ── Crop utility ────────────────────────────────────────────────────────────
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedImg(src: string, crop: Area, outputSize = 400): Promise<string> {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);
  return canvas.toDataURL("image/jpeg", 0.88);
}
// ────────────────────────────────────────────────────────────────────────────

export default function ProfileEditPanel({
  email, firstName, lastName, image, hasPendingImage, initials, onClose, onSaved,
}: Props) {
  const { lang } = useLanguage();
  const { update } = useSession();

  const [first, setFirst] = useState(firstName ?? "");
  const [last,  setLast]  = useState(lastName  ?? "");

  // Cropper state
  const [rawSrc, setRawSrc]           = useState<string | null>(null);   // original file for cropper
  const [croppedSrc, setCroppedSrc]   = useState<string | null>(null);   // final cropped result
  const [crop, setCrop]               = useState({ x: 0, y: 0 });
  const [zoom, setZoom]               = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const L = {
    title:        lang === "fr" ? "Modifier le profil"              : "Edit Profile",
    firstLabel:   lang === "fr" ? "Prénom"                          : "First name",
    lastLabel:    lang === "fr" ? "Nom de famille"                  : "Last name",
    emailLabel:   lang === "fr" ? "Adresse e-mail"                  : "Email address",
    changePhoto:  lang === "fr" ? "Changer la photo"                : "Change photo",
    pending:      lang === "fr" ? "Photo en attente de validation"  : "Photo pending validation",
    cropTitle:    lang === "fr" ? "Cadrer votre photo"              : "Crop your photo",
    cropHint:     lang === "fr" ? "Déplacez et zoomez pour centrer votre visage" : "Drag and zoom to center your face",
    confirm:      lang === "fr" ? "Confirmer le cadrage"            : "Confirm crop",
    save:         lang === "fr" ? "Enregistrer"                     : "Save",
    saving:       lang === "fr" ? "Enregistrement…"                 : "Saving…",
    cancel:       lang === "fr" ? "Annuler"                         : "Cancel",
    photoSent:    lang === "fr" ? "Photo envoyée pour validation ✓" : "Photo submitted for review ✓",
    photoHint:    lang === "fr" ? "Elle sera visible après approbation par notre équipe." : "It will appear once approved by our team.",
    sizeErr:      lang === "fr" ? "Image trop grande (max 5 Mo)"    : "Image too large (max 5 MB)",
  };

  // ── File picked → open cropper ──
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError(L.sizeErr); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function confirmCrop() {
    if (!rawSrc || !croppedArea) return;
    const result = await getCroppedImg(rawSrc, croppedArea, 400);
    setCroppedSrc(result);
    setShowCropper(false);
    setSaved(false);
  }

  // ── Save ──
  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string | null> = {
        firstName: first.trim(),
        lastName:  last.trim(),
      };
      if (croppedSrc !== null) body.pendingImage = croppedSrc;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");

      const fullName = [first.trim(), last.trim()].filter(Boolean).join(" ");
      await update({ name: fullName });
      onSaved(first.trim(), last.trim());

      if (croppedSrc) {
        setSaved(true); // show "photo sent for review" message
      } else {
        onClose();
      }
    } catch {
      setError(lang === "fr" ? "Une erreur est survenue." : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const currentAvatar = croppedSrc ?? image;

  // ── Cropper modal ──────────────────────────────────────────────────────────
  if (showCropper && rawSrc) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-black/80 backdrop-blur-sm z-10">
          <div>
            <p className="text-white font-bold text-sm">{L.cropTitle}</p>
            <p className="text-white/50 text-xs mt-0.5">{L.cropHint}</p>
          </div>
          <button
            onClick={() => setShowCropper(false)}
            className="text-white/60 hover:text-white text-xs font-medium transition"
          >
            {L.cancel}
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1">
          <Cropper
            image={rawSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#111" },
              cropAreaStyle: { border: "3px solid #F5C400", boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)" },
            }}
          />
          {/* Face guide ring */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-[#F5C400]/40" />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="px-8 py-4 bg-black/80 flex items-center gap-4">
          <span className="text-white/40 text-xs">−</span>
          <input
            type="range" min={1} max={3} step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#F5C400]"
          />
          <span className="text-white/40 text-xs">+</span>
        </div>

        {/* Confirm */}
        <div className="px-5 pb-6 bg-black/80">
          <button
            onClick={confirmCrop}
            className="w-full py-3 rounded-2xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] transition"
          >
            {L.confirm}
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#2D1A00] text-sm mb-1">{L.photoSent}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{L.photoHint}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-xl bg-[#F5C400] text-[#5C3D00] font-bold text-sm hover:bg-[#FFDE59] transition"
          >
            OK
          </button>
        </div>
      </>
    );
  }

  // ── Main panel ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="font-bold text-[#5C3D00] text-sm">{L.title}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {currentAvatar ? (
                <img src={currentAvatar} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-[#F5C400]/40" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-2xl ring-2 ring-[#F5C400]/40">
                  {initials}
                </div>
              )}
              {/* Pending badge */}
              {(hasPendingImage || croppedSrc) && (
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {lang === "fr" ? "En attente" : "Pending"}
                </span>
              )}
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs font-semibold text-[#C49200] hover:text-[#5C3D00] transition flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {L.changePhoto}
            </button>

            {(hasPendingImage && !croppedSrc) && (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center leading-tight">
                {L.pending}
              </p>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
          </div>

          {/* First name */}
          <div>
            <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">{L.firstLabel}</label>
            <input
              type="text" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={50}
              className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
            />
          </div>

          {/* Last name */}
          <div>
            <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">{L.lastLabel}</label>
            <input
              type="text" value={last} onChange={(e) => setLast(e.target.value)} maxLength={50}
              className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
            />
          </div>

          {/* Email read-only */}
          <div>
            <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">{L.emailLabel}</label>
            <p className="text-sm text-[#9B8A6B] px-3 py-2.5 bg-[#FAF8F0] rounded-xl border border-black/5 truncate">{email}</p>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-[#6B5E44]/20 text-sm font-bold text-[#5C3D00] hover:bg-[#FFF3B0] transition">
            {L.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!first.trim() && !last.trim())}
            className="flex-1 py-2.5 rounded-xl bg-[#F5C400] text-sm font-bold text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50 transition"
          >
            {saving ? L.saving : L.save}
          </button>
        </div>
      </div>
    </>
  );
}
