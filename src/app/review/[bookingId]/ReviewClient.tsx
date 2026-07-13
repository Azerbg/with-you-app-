"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  tutorName: string;
  tutorPhoto: string | null;
  scheduledAt: string;
}

const DIMENSIONS = [
  {
    key: "ratingCommunication",
    label: "Communication",
    desc: "Clarté, réactivité, écoute",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    key: "ratingStructure",
    label: "Structure",
    desc: "Organisation, rythme, progression",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: "ratingAccuracy",
    label: "Soutien & Motivation",
    desc: "Encouragement, accompagnement, bienveillance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: "ratingValue",
    label: "Pédagogie",
    desc: "Clarté des explications, compréhension",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
] as const;

const STAR_LABELS = ["", "Insuffisant", "Passable", "Bien", "Très bien", "Excellent"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value) ? "text-[#F5C400]" : "text-[#D9D0C3]"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="ml-2 text-xs font-semibold text-[#C49200]">
          {STAR_LABELS[hovered || value]}
        </span>
      )}
    </div>
  );
}

export default function ReviewClient({ bookingId, tutorName, tutorPhoto, scheduledAt }: Props) {
  const router = useRouter();
  const initials = tutorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const dateStr = new Date(scheduledAt).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const [ratings, setRatings] = useState<Record<string, number>>({
    ratingCommunication: 0,
    ratingStructure: 0,
    ratingAccuracy: 0,
    ratingValue: 0,
  });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRated = Object.values(ratings).every((v) => v > 0);
  const textOk = text.length === 0 || text.length >= 20;
  const composite = allRated
    ? (Object.values(ratings).reduce((s, v) => s + v, 0) / 4).toFixed(1)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRated) { setError("Veuillez noter les 4 dimensions."); return; }
    if (!textOk) { setError("Le commentaire doit faire au moins 20 caractères."); return; }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, ...ratings, text: text.trim() || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de l'envoi.");
      setLoading(false);
      return;
    }

    router.push("/dashboard/student?reviewed=1");
  }

  return (
    <div className="min-h-screen bg-[#F2EFE9] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xl shadow-[0_4px_20px_rgba(245,196,0,0.25)]">
            {tutorPhoto ? (
              <img src={tutorPhoto} alt={tutorName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#2D1A00] mb-1">Comment s&apos;est passée votre séance ?</h1>
          <p className="text-sm text-[#9B8A6B]">
            Séance avec <span className="font-semibold text-[#5C3D00]">{tutorName}</span> · <span className="capitalize">{dateStr}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Star ratings */}
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            {DIMENSIONS.map((dim, i) => (
              <div
                key={dim.key}
                className={`px-6 py-4 ${i < DIMENSIONS.length - 1 ? "border-b border-black/5" : ""}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF3B0] text-[#C49200] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {dim.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[#2D1A00] text-sm">{dim.label}</p>
                    <p className="text-xs text-[#9B8A6B]">{dim.desc}</p>
                  </div>
                </div>
                <StarRating
                  value={ratings[dim.key]}
                  onChange={(v) => setRatings((prev) => ({ ...prev, [dim.key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Composite score */}
          {composite && (
            <div className="bg-[#FFF3B0] border border-[#F5C400]/30 rounded-2xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#5C3D00]">Note globale</p>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#F5C400]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-lg font-bold text-[#5C3D00]">{composite}</span>
                <span className="text-xs text-[#9B8A6B]">/ 5</span>
              </div>
            </div>
          )}

          {/* Text comment */}
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <label className="block text-sm font-semibold text-[#2D1A00] mb-2">
              Commentaire <span className="text-[#9B8A6B] font-normal">(facultatif)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Partagez votre expérience avec ce tuteur…"
              maxLength={500}
              rows={4}
              className="w-full text-sm text-[#2D1A00] placeholder-[#C4BAA8] resize-none outline-none bg-[#FAF8F0] border border-[#E8E0D4] rounded-xl px-3 py-2.5 focus:border-[#F5C400] transition"
            />
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${text.length > 0 && text.length < 20 ? "text-red-500" : "text-[#C4BAA8]"}`}>
                {text.length > 0 && text.length < 20 ? `Minimum 20 caractères (${text.length}/20)` : `${text.length}/500`}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !allRated}
            className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-4 rounded-2xl text-sm hover:bg-[#FFDE59] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(245,196,0,0.3)]"
          >
            {loading ? "Envoi en cours…" : "Envoyer mon avis"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/student")}
            className="w-full text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition py-2"
          >
            Passer pour l&apos;instant
          </button>
        </form>
      </div>
    </div>
  );
}
