"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function groupSlotsByDate(slots: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const slot of slots) {
    const dateKey = slot.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(slot);
  }
  return groups;
}

function formatSlotTime(isoStr: string): string {
  const d = new Date(isoStr);
  const tunisiaH = (d.getUTCHours() + 1) % 24;
  return `${String(tunisiaH).padStart(2, "0")}:00`;
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "MC", amex: "Amex",
  discover: "Disc", jcb: "JCB", unionpay: "UP", card: "Card",
};

// ─── New card form (inside <Elements>) ────────────────────────────────────────

function NewCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (paymentIntentId: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/student`,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Paiement refusé");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      await onSuccess(paymentIntent.id);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-xl hover:bg-[#FFDE59] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Traitement en cours…" : "Payer 15 USD →"}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition">
          ← Utiliser ma carte enregistrée
        </button>
      )}
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  tutorId: string;
  tutorName: string;
  tutorPhoto: string | null;
  availableSlots: string[];
  stripePublishableKey: string;
  alreadyBooked: boolean;
}

export default function BookingFlowClient({
  tutorId,
  tutorName,
  tutorPhoto,
  availableSlots,
  stripePublishableKey,
  alreadyBooked,
}: Props) {
  const router = useRouter();

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  const slotsByDate = groupSlotsByDate(availableSlots);
  const dates = Object.keys(slotsByDate).sort();
  const initials = tutorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // ── State ──
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [useNewCard, setUseNewCard] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // ── Load saved cards on mount ──
  useEffect(() => {
    fetch("/api/stripe/payment-methods")
      .then((r) => r.json())
      .then((d) => setSavedCards(d.paymentMethods ?? []))
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  // ── After payment succeeds → create booking record ──
  const confirmBooking = useCallback(
    async (paymentIntentId: string) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, scheduledAt: selectedSlot, paymentIntentId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPayError(d.error ?? "Erreur lors de la création de la réservation");
        return;
      }
      const booking = await res.json();
      router.push(`/booking/confirmation/${booking.id}`);
    },
    [tutorId, selectedSlot, router],
  );

  // ── Select slot → fetch PaymentIntent ──
  const handleSelectSlot = useCallback(
    async (slot: string) => {
      setSelectedSlot(slot);
      setClientSecret(null);
      setIntentError(null);
      setPayError(null);
      setUseNewCard(false);
      setLoadingIntent(true);

      try {
        const res = await fetch("/api/bookings/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tutorId, scheduledAt: slot }),
        });
        const data = await res.json();
        if (!res.ok) {
          setIntentError(data.error ?? "Erreur lors de l'initialisation du paiement");
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        setIntentError("Impossible de contacter le serveur de paiement");
      } finally {
        setLoadingIntent(false);
      }
    },
    [tutorId],
  );

  // ── Pay with saved card (no form needed) ──
  const handlePayWithSavedCard = async () => {
    if (!clientSecret || !savedCards[0]) return;
    const stripe = await stripePromise;
    if (!stripe) return;

    setPaying(true);
    setPayError(null);

    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: savedCards[0].id,
    });

    if (error) {
      setPayError(error.message ?? "Paiement refusé");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      await confirmBooking(paymentIntent.id);
    }
    setPaying(false);
  };

  const hasSavedCard = !loadingCards && savedCards.length > 0;
  const primaryCard = savedCards[0];
  const showSavedCardUI = hasSavedCard && !useNewCard;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#F5C400] rounded-xl flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[#2D1A00] text-[15px] tracking-tight">WithYou</span>
        </Link>
        <Link href={`/tutors/${tutorId}`} className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition">
          ← Profil du tuteur
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Tutor summary */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5 mb-6 flex items-center gap-4">
          {tutorPhoto ? (
            <img src={tutorPhoto} alt={tutorName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-lg flex-shrink-0">
              {initials}
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold text-[#9B8A6B] uppercase tracking-widest">Séance de découverte</p>
            <p className="font-bold text-[#2D1A00] text-lg">{tutorName}</p>
            <p className="text-sm text-[#6B5E44]">30 min · 15 USD · Paiement unique</p>
          </div>
        </div>

        {alreadyBooked ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="font-bold text-amber-900 mb-1">Séance déjà réservée</p>
            <p className="text-sm text-amber-700 mb-4">Vous avez déjà une séance de découverte avec ce tuteur.</p>
            <Link
              href="/dashboard/student"
              className="inline-block px-5 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-xl text-sm"
            >
              Voir mes séances →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Step 1 — Slot */}
            <div>
              <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
                1 · Choisissez un créneau
              </p>
              {dates.length === 0 ? (
                <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 text-center">
                  <p className="text-sm text-[#9B8A6B]">Aucun créneau disponible dans les 14 prochains jours.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {dates.map((dateKey) => (
                    <div key={dateKey}>
                      <p className="text-xs font-semibold text-[#5C3D00] capitalize mb-1.5">
                        {formatDateLabel(dateKey)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slotsByDate[dateKey].map((slot) => (
                          <button
                            key={slot}
                            onClick={() => handleSelectSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                              selectedSlot === slot
                                ? "bg-[#F5C400] text-[#5C3D00] ring-2 ring-[#F5C400] ring-offset-1"
                                : "bg-[#FAF8F0] text-[#5C3D00] border border-[#D9D0C3] hover:bg-[#F5C400]/20"
                            }`}
                          >
                            {formatSlotTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 — Payment */}
            <div>
              <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
                2 · Paiement sécurisé
              </p>
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
                {!selectedSlot ? (
                  <p className="text-sm text-[#9B8A6B] text-center py-8">
                    Sélectionnez un créneau pour continuer.
                  </p>
                ) : loadingIntent || loadingCards ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : intentError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {intentError}
                  </div>
                ) : clientSecret ? (
                  <div className="space-y-4">
                    {/* Slot recap */}
                    <div className="bg-[#FAF8F0] rounded-xl p-3 text-xs text-[#6B5E44]">
                      <span className="font-semibold text-[#5C3D00]">Créneau :</span>{" "}
                      {formatDateLabel(selectedSlot.slice(0, 10))} à {formatSlotTime(selectedSlot)}
                    </div>

                    {payError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                        {payError}
                      </div>
                    )}

                    {showSavedCardUI ? (
                      /* ── Pay with saved card ── */
                      <div className="space-y-3">
                        <div className="border border-[#E0D8CC] rounded-xl p-4 flex items-center gap-3">
                          <div className="w-10 h-7 bg-[#F7F5F0] rounded border border-black/8 flex items-center justify-center text-[10px] font-bold text-[#5C3D00] uppercase flex-shrink-0">
                            {BRAND_LABELS[primaryCard.brand] ?? primaryCard.brand}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#5C3D00]">•••• {primaryCard.last4}</p>
                            <p className="text-xs text-[#9B8A6B]">
                              Expire {String(primaryCard.expMonth).padStart(2, "0")}/{primaryCard.expYear}
                            </p>
                          </div>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500 flex-shrink-0">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>

                        <button
                          onClick={handlePayWithSavedCard}
                          disabled={paying}
                          className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-xl hover:bg-[#FFDE59] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {paying ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-[#5C3D00]/40 border-t-[#5C3D00] rounded-full animate-spin" />
                              Traitement en cours…
                            </span>
                          ) : (
                            "Payer 15 USD →"
                          )}
                        </button>

                        <button
                          onClick={() => setUseNewCard(true)}
                          className="w-full text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition py-1"
                        >
                          Utiliser une autre carte
                        </button>
                      </div>
                    ) : stripePromise ? (
                      /* ── Enter new card ── */
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: "stripe",
                            variables: {
                              colorPrimary: "#F5C400",
                              colorText: "#2D1A00",
                              borderRadius: "10px",
                            },
                          },
                        }}
                      >
                        <NewCardForm
                          onSuccess={confirmBooking}
                          onCancel={hasSavedCard ? () => setUseNewCard(false) : undefined}
                        />
                      </Elements>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <p className="text-[11px] text-[#9B8A6B] text-center mt-2">
                🔒 Paiement sécurisé par Stripe
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
