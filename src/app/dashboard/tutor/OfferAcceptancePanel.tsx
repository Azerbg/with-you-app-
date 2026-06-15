"use client";

import { useState } from "react";

interface Props {
  currency: string;
  rateTnd: number | null;
  rateCad: number | null;
  maxWeeklyHours: number | null;
}

export default function OfferAcceptancePanel({ currency, rateTnd, rateCad, maxWeeklyHours }: Props) {
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const rate = currency === "TND" ? `${rateTnd} TND/h` : `${rateCad} CAD/h`;

  async function accept() {
    if (!signed) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tutors/offer-acceptance", { method: "POST" });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue. Veuillez reessayer.");
      }
    } catch {
      setError("Une erreur reseau est survenue.");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-base font-bold text-green-800">Offre acceptee avec succes !</p>
        <p className="text-sm text-green-700 mt-2">
          Bienvenue dans l&apos;equipe WithYou !<br />
          Votre profil tuteur sera active sous peu.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 space-y-5">
      <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest">
        Etape 5 — Acceptation de l&apos;offre
      </p>

      {/* Offer details card */}
      <div className="bg-[#FFF8E1] border border-[#F5C400]/50 rounded-xl p-4">
        <p className="text-sm font-bold text-[#5C3D00] mb-3">Recapitulatif de votre offre :</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 text-center border border-black/5">
            <p className="text-[10px] text-[#9B8A6B] uppercase tracking-wide font-semibold">Taux horaire</p>
            <p className="text-xl font-bold text-[#2D1A00] mt-1">{rate}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-black/5">
            <p className="text-[10px] text-[#9B8A6B] uppercase tracking-wide font-semibold">Maximum hebdo</p>
            <p className="text-xl font-bold text-[#2D1A00] mt-1">{maxWeeklyHours ?? "—"}h/sem</p>
          </div>
        </div>
      </div>

      {/* E-signature checkbox */}
      <div className="bg-[#FAF8F0] border border-[#C4BAA8] rounded-xl p-4">
        <p className="text-xs font-bold text-[#5C3D00] mb-3">Signature electronique</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={signed}
            onChange={e => setSigned(e.target.checked)}
            className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#5C3D00]"
          />
          <span className="text-xs text-[#5C3D00] leading-relaxed">
            En cochant cette case, je confirme avoir lu et accepte les termes de l&apos;offre WithYou,
            incluant un taux horaire de <strong>{rate}</strong> et une limite de{" "}
            <strong>{maxWeeklyHours ?? "—"}h par semaine</strong>. Cette action constitue
            ma <strong>signature electronique</strong> et engage les deux parties.
          </span>
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={accept}
        disabled={!signed || submitting}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-xl hover:bg-[#FFDE59] disabled:opacity-40 transition text-sm"
      >
        {submitting ? "Traitement en cours…" : "J\u2019accepte l\u2019offre et rejoins WithYou \u2192"}
      </button>
    </div>
  );
}
