"use client";

import { useState } from "react";

interface Review {
  id: string;
  ratingComposite: number;
  text: string | null;
  createdAt: string;
  student: { firstName: string | null; lastName: string | null };
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} viewBox="0 0 20 20" className={`${sz} ${s <= Math.round(rating) ? "text-[#F5C400]" : "text-[#E8E0D4]"}`} fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TutorProfileClient({ reviews }: { reviews: Review[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? reviews : reviews.slice(0, 3);

  if (reviews.length === 0) return null;

  return (
    <div className="mt-5 space-y-4">
      {shown.map(r => {
        const firstName = r.student.firstName ?? "";
        const lastInitial = r.student.lastName ? r.student.lastName[0] + "." : "";
        const name = [firstName, lastInitial].filter(Boolean).join(" ");
        const initials = [r.student.firstName?.[0], r.student.lastName?.[0]].filter(Boolean).join("").toUpperCase();
        const date = new Date(r.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

        return (
          <div key={r.id} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F5C400]/25 flex items-center justify-center text-[#5C3D00] font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-bold text-[#2D1A00]">{name}</span>
                <StarRow rating={r.ratingComposite} size="xs" />
                <span className="text-[10px] text-[#9B8A6B]">{date}</span>
              </div>
              {r.text && (
                <p className="text-sm text-[#5C3D00] leading-relaxed">{r.text}</p>
              )}
            </div>
          </div>
        );
      })}

      {reviews.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-2.5 rounded-xl border border-[#D9D0C3] text-sm font-semibold text-[#6B5E44] hover:bg-[#FAF8F0] transition"
        >
          {expanded ? "Voir moins" : `Voir les ${reviews.length - 3} autres avis`}
        </button>
      )}
    </div>
  );
}
