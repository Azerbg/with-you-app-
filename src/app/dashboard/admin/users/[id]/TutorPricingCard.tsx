"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tutorId: string;
  currentPrice: number | null;
}

export default function TutorPricingCard({ tutorId, currentPrice }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentPrice?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    const parsed = value.trim() === "" ? null : parseFloat(value);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setError("Prix invalide.");
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/admin/tutors/${tutorId}/price`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionPriceUsd: parsed }),
    });
    if (res.ok) {
      router.refresh();
      setEditing(false);
    } else {
      setError("Erreur lors de la sauvegarde.");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Prix de séance</p>
          <p className="text-xs text-[#9B8A6B]">Affiché aux étudiants lors de la réservation</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] transition"
          >
            Modifier
          </button>
        )}
      </div>

      {!editing ? (
        <div className="flex items-baseline gap-1.5">
          {currentPrice != null ? (
            <>
              <span className="text-3xl font-black text-[#1A0F00]">${currentPrice.toFixed(0)}</span>
              <span className="text-sm text-[#9B8A6B]">USD / séance</span>
            </>
          ) : (
            <span className="text-[#9B8A6B] text-sm italic">Aucun prix défini — utilise le tarif plateforme</span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B8A6B] text-sm font-semibold">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="ex: 35"
                className="w-full pl-7 pr-12 py-2.5 border border-[#6B5E44]/30 rounded-xl text-sm text-[#2D1A00] focus:outline-none focus:border-[#F5C400] transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8A6B] text-xs">USD</span>
            </div>
            <button
              onClick={save}
              disabled={loading}
              className="px-4 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold text-sm rounded-xl hover:bg-[#FFDE59] disabled:opacity-50 transition"
            >
              {loading ? "…" : "Enregistrer"}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(currentPrice?.toString() ?? ""); setError(null); }}
              disabled={loading}
              className="px-4 py-2.5 border border-black/10 text-[#9B8A6B] font-semibold text-sm rounded-xl hover:bg-black/5 transition"
            >
              Annuler
            </button>
          </div>
          <p className="text-[11px] text-[#9B8A6B]">Laisser vide pour utiliser le tarif plateforme par défaut.</p>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
