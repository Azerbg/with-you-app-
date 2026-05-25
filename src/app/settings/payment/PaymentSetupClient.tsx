"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
  card: "Card",
};

// ─── Inner form — EWCS approach: clientSecret fetched at submit time ──────────

function SetupForm({ onSuccess, lang }: { onSuccess: () => void; lang: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const isFr = lang === "fr";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // Step 1 — validate the form fields
    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Erreur de validation");
      setLoading(false);
      return;
    }

    // Step 2 — create SetupIntent on the server
    let clientSecret: string;
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      clientSecret = data.clientSecret;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur serveur";
      setError(isFr ? `Erreur : ${msg}` : `Error: ${msg}`);
      setLoading(false);
      return;
    }

    // Step 3 — confirm the setup
    const { error: confirmErr } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/student/billing?setup_complete=true`,
      },
    });

    if (confirmErr) {
      setError(confirmErr.message ?? "Paiement refusé");
      setLoading(false);
    }
    // On success Stripe redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition"
      >
        {loading
          ? (isFr ? "Enregistrement…" : "Saving…")
          : (isFr ? "Enregistrer la carte" : "Save card")}
      </button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lang: string;
  setupComplete: boolean;
}

export default function PaymentSetupClient({ lang, setupComplete }: Props) {
  const isFr = lang === "fr";
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [banner, setBanner] = useState(setupComplete);

  useEffect(() => {
    fetchCards();
    if (setupComplete) {
      window.history.replaceState({}, "", "/dashboard/student/billing");
    }
  }, [setupComplete]);

  async function fetchCards() {
    setLoadingCards(true);
    try {
      const res = await fetch("/api/stripe/payment-methods");
      const data = await res.json();
      setCards(data.paymentMethods ?? []);
    } finally {
      setLoadingCards(false);
    }
  }

  async function removeCard(id: string) {
    setRemoving(id);
    try {
      await fetch("/api/stripe/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: id }),
      });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: "#F2EFE9" }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <a href="/dashboard/student" className="inline-flex items-center gap-2 text-sm text-[#6B5E44] hover:text-[#5C3D00] mb-6 transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {isFr ? "Retour au tableau de bord" : "Back to dashboard"}
        </a>

        <h1 className="text-2xl font-bold text-[#5C3D00] mb-1">
          {isFr ? "Moyen de paiement" : "Payment method"}
        </h1>
        <p className="text-sm text-[#6B5E44] mb-8">
          {isFr
            ? "Enregistrez une carte pour réserver des séances en toute simplicité."
            : "Save a card to book sessions quickly and securely."}
        </p>

        {/* Success banner */}
        {banner && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-green-800">
              {isFr ? "Carte enregistrée avec succès !" : "Card saved successfully!"}
            </p>
            <button onClick={() => setBanner(false)} className="ml-auto text-green-500 hover:text-green-700">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Saved cards */}
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-black/5">
            <p className="font-bold text-[#5C3D00]">
              {isFr ? "Cartes enregistrées" : "Saved cards"}
            </p>
          </div>

          {loadingCards ? (
            <div className="px-6 py-8 text-center text-sm text-[#9B8A6B]">
              {isFr ? "Chargement…" : "Loading…"}
            </div>
          ) : cards.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-[#9B8A6B] mb-4">
                {isFr ? "Aucune carte enregistrée." : "No card saved yet."}
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-2.5 rounded-full hover:bg-[#FFDE59] transition text-sm"
                >
                  {isFr ? "+ Ajouter une carte" : "+ Add a card"}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/4">
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 bg-[#F7F5F0] rounded border border-black/8 flex items-center justify-center text-xs font-bold text-[#5C3D00] uppercase">
                      {BRAND_LABELS[card.brand] ?? card.brand}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#5C3D00]">•••• {card.last4}</p>
                      <p className="text-xs text-[#9B8A6B]">
                        {isFr ? "Expire" : "Expires"} {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCard(card.id)}
                    disabled={removing === card.id}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold transition disabled:opacity-50"
                  >
                    {removing === card.id
                      ? (isFr ? "Suppression…" : "Removing…")
                      : (isFr ? "Supprimer" : "Remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add card button (when cards exist) */}
        {cards.length > 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-[#F5C400]/40 text-[#C49200] font-semibold py-3 rounded-2xl hover:bg-[#FFFBEA] hover:border-[#F5C400] transition text-sm mb-4"
          >
            {isFr ? "+ Ajouter une autre carte" : "+ Add another card"}
          </button>
        )}

        {/* Stripe Elements form — EWCS: mode="setup", no clientSecret here */}
        {showForm && (
          <div className="bg-white border border-black/5 rounded-2xl p-6">
            <h2 className="font-bold text-[#5C3D00] mb-5">
              {isFr ? "Nouvelle carte" : "New card"}
            </h2>
            <Elements
              stripe={stripePromise}
              options={{
                mode: "setup",
                currency: "eur",
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#F5C400",
                    colorText: "#5C3D00",
                    borderRadius: "12px",
                    fontFamily: "inherit",
                  },
                },
              }}
            >
              <SetupForm onSuccess={fetchCards} lang={lang} />
            </Elements>
            <button
              onClick={() => setShowForm(false)}
              className="mt-3 w-full text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition"
            >
              {isFr ? "Annuler" : "Cancel"}
            </button>
          </div>
        )}

        {/* Security note */}
        <p className="text-xs text-center text-[#9B8A6B] mt-6 flex items-center justify-center gap-1.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          {isFr
            ? "Paiements sécurisés par Stripe. Vos données de carte ne nous sont jamais transmises."
            : "Payments secured by Stripe. Your card details are never sent to our servers."}
        </p>
      </div>
    </div>
  );
}
