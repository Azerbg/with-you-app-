"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const BRAND_ICONS: Record<string, string> = {
  visa: "VISA", mastercard: "MC", amex: "AMEX",
  discover: "DISC", jcb: "JCB", unionpay: "UP",
};

export default function PaymentMethodsCard() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function loadCards() {
    try {
      const res = await fetch("/api/stripe/payment-methods");
      const data = await res.json();
      setCards(data.paymentMethods ?? []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  // Show success flash if redirected back from Stripe Checkout
  const justAdded = searchParams.get("card") === "added";

  async function handleAddCard() {
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/stripe/setup-checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) { setError(data.error ?? "Erreur"); setAdding(false); return; }
      window.location.href = data.url;
    } catch {
      setError("Impossible de contacter Stripe");
      setAdding(false);
    }
  }

  async function handleDelete(paymentMethodId: string) {
    setDeletingId(paymentMethodId);
    try {
      await fetch("/api/stripe/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });
      setCards((prev) => prev.filter((c) => c.id !== paymentMethodId));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
        <p className="font-bold text-[#5C3D00] text-sm">Moyens de paiement</p>
        <button
          onClick={handleAddCard}
          disabled={adding}
          className="text-xs font-bold text-[#5C3D00] bg-[#F5C400]/20 hover:bg-[#F5C400]/40 px-3 py-1 rounded-full transition disabled:opacity-50"
        >
          {adding ? "Redirection..." : "+ Ajouter"}
        </button>
      </div>

      <div className="p-4 space-y-3">

        {justAdded && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            ✓ Carte ajoutée avec succès
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 bg-[#FAF8F0] rounded-xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-[#C4BAA8]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-xs text-[#9B8A6B]">Aucune carte enregistrée</p>
            <button onClick={handleAddCard} className="mt-2 text-xs font-semibold text-[#5C3D00] hover:underline">
              Ajouter une carte →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 bg-[#FAF8F0] border border-[#E8E0D4] rounded-xl px-3 py-2.5">
                <div className="w-10 h-7 bg-white border border-[#D9D0C3] rounded-md flex items-center justify-center text-[9px] font-black text-[#5C3D00] tracking-wide flex-shrink-0">
                  {BRAND_ICONS[card.brand] ?? card.brand.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#2D1A00]">•••• {card.last4}</p>
                  <p className="text-[10px] text-[#9B8A6B]">
                    Expire {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(card.id)}
                  disabled={deletingId === card.id}
                  className="text-[#C4BAA8] hover:text-red-500 transition disabled:opacity-50 flex-shrink-0"
                  title="Supprimer"
                >
                  {deletingId === card.id ? (
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-[#9B8A6B] text-center">
          Sécurisé par Stripe — vos données ne sont jamais stockées sur nos serveurs
        </p>
      </div>
    </div>
  );
}
