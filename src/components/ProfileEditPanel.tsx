"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  email: string;
  displayName: string;
  image: string | null;
  initials: string;
  onClose: () => void;
  onSaved: (nickname: string, image: string | null) => void;
}

function resizeImage(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileEditPanel({ email, displayName, image, initials, onClose, onSaved }: Props) {
  const { lang } = useLanguage();
  const { update } = useSession();
  const [nickname, setNickname] = useState(displayName);
  const [avatar, setAvatar] = useState<string | null>(image);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const labels = {
    title:       lang === "fr" ? "Modifier le profil"      : "Edit Profile",
    avatarHint:  lang === "fr" ? "Cliquer pour changer"    : "Click to change",
    nameLabel:   lang === "fr" ? "Nom affiché"             : "Display name",
    emailLabel:  lang === "fr" ? "Adresse e-mail"          : "Email address",
    save:        lang === "fr" ? "Enregistrer"             : "Save",
    saving:      lang === "fr" ? "Enregistrement…"         : "Saving…",
    cancel:      lang === "fr" ? "Annuler"                 : "Cancel",
    sizeErr:     lang === "fr" ? "Image trop grande (max 2 Mo)" : "Image too large (max 2 MB)",
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError(labels.sizeErr); return; }
    setError("");
    try {
      const resized = await resizeImage(file);
      setAvatar(resized);
    } catch {
      setError("Failed to process image");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), image: avatar }),
      });
      if (!res.ok) throw new Error("Failed");
      // Refresh JWT so session.user.name updates everywhere (homepage avatar, etc.)
      await update({ name: nickname.trim() });
      onSaved(nickname.trim(), avatar);
      onClose();
    } catch {
      setError(lang === "fr" ? "Une erreur est survenue." : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="font-bold text-[#5C3D00] text-sm">{labels.title}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative group"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#F5C400]/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-2xl ring-2 ring-[#F5C400]/40">
                  {initials}
                </div>
              )}
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-6 h-6">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
            <p className="text-xs text-[#9B8A6B]">{labels.avatarHint}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">
              {labels.nameLabel}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              className="w-full border border-[#6B5E44]/25 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-[#6B5E44] uppercase tracking-wide mb-1.5">
              {labels.emailLabel}
            </label>
            <p className="text-sm text-[#9B8A6B] px-3 py-2.5 bg-[#FAF8F0] rounded-xl border border-black/5 truncate">
              {email}
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-[#6B5E44]/20 text-sm font-bold text-[#5C3D00] hover:bg-[#FFF3B0] transition"
          >
            {labels.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#F5C400] text-sm font-bold text-[#5C3D00] hover:bg-[#FFDE59] disabled:opacity-50 transition"
          >
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </>
  );
}
