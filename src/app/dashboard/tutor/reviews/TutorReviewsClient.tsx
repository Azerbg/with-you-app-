"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getDisplayName, getInitials } from "@/lib/userUtils";

interface Review {
  id: string;
  ratingComposite: number;
  text: string | null;
  tutorResponse: string | null;
  tutorRespondedAt: string | null;
  createdAt: string;
  student: { firstName: string | null; lastName: string | null; email?: string | null };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} viewBox="0 0 20 20" className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-[#F5C400]" : "text-[#E8E0D4]"}`} fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review, onResponded }: { review: Review; onResponded: (id: string, text: string) => void }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const studentName = getDisplayName(review.student, t("Élève", "Student"));
  const initials    = getInitials(studentName);
  const date = new Date(review.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  async function handleSubmit() {
    if (!text.trim()) return;
    if (text.trim().length > 300) { setError(t("Max 300 caractères", "Max 300 characters")); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/reviews/${review.id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: text.trim() }),
    });
    if (res.ok) {
      onResponded(review.id, text.trim());
      setOpen(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? t("Erreur serveur", "Server error"));
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#FFF3B0] flex items-center justify-center text-[#5C3D00] font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-[#2D1A00]">{studentName}</span>
            <Stars rating={review.ratingComposite} />
            <span className="text-[10px] text-[#9B8A6B]">{date}</span>
          </div>
          {review.text && (
            <p className="text-sm text-[#5C3D00] leading-relaxed">{review.text}</p>
          )}

          {/* Existing response */}
          {review.tutorResponse && (
            <div className="mt-3 pl-3 border-l-2 border-[#F5C400]">
              <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-wide mb-1">
                {t("Votre réponse", "Your reply")}
              </p>
              <p className="text-xs text-[#5C3D00] leading-relaxed">{review.tutorResponse}</p>
            </div>
          )}

          {/* Reply form */}
          {!review.tutorResponse && (
            <div className="mt-3">
              {!open ? (
                <button
                  onClick={() => setOpen(true)}
                  className="text-xs font-semibold text-[#5C3D00] border border-[#F5C400] px-3 py-1.5 rounded-xl hover:bg-[#FFF3B0] transition"
                >
                  {t("Répondre à cet avis", "Reply to this review")}
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder={t("Votre réponse (max 300 caractères)…", "Your reply (max 300 characters)…")}
                    className="w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2 text-sm text-[#5C3D00] focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 resize-none transition"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] ${text.length > 280 ? "text-red-500" : "text-[#9B8A6B]"}`}>
                      {text.length}/300
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => { setOpen(false); setText(""); }}
                        className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] px-3 py-1.5 transition">
                        {t("Annuler", "Cancel")}
                      </button>
                      <button onClick={handleSubmit} disabled={saving || !text.trim()}
                        className="text-xs font-bold bg-[#F5C400] text-[#5C3D00] px-4 py-1.5 rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition">
                        {saving ? t("Envoi…", "Sending…") : t("Publier", "Publish")}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TutorReviewsClient({ reviews: initial }: { reviews: Review[] }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [reviews, setReviews] = useState<Review[]>(initial);

  function handleResponded(id: string, responseText: string) {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, tutorResponse: responseText, tutorRespondedAt: new Date().toISOString() } : r
    ));
  }

  const pending = reviews.filter(r => !r.tutorResponse).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto space-y-4">

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[#2D1A00]">{t("Mes avis", "My reviews")}</h1>
            {pending > 0 && (
              <span className="text-xs font-bold bg-[#FFF3B0] text-[#5C3D00] px-3 py-1 rounded-full border border-[#F5C400]">
                {pending} {t("sans réponse", "without reply")}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/5 px-6 py-16 text-center">
              <p className="text-4xl mb-3">⭐</p>
              <p className="text-sm font-semibold text-[#5C3D00]">
                {t("Aucun avis pour l'instant", "No reviews yet")}
              </p>
              <p className="text-xs text-[#9B8A6B] mt-1">
                {t("Les avis de vos étudiants apparaîtront ici", "Your students' reviews will appear here")}
              </p>
            </div>
          ) : (
            reviews.map(r => (
              <ReviewCard key={r.id} review={r} onResponded={handleResponded} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
