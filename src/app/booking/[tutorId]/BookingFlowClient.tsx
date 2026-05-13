"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

// ─── Slot grouping helpers ────────────────────────────────────────────────────

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
  // Display in Tunisia time (UTC+1)
  const utcH = d.getUTCHours();
  const tunisiaH = (utcH + 1) % 24;
  return `${String(tunisiaH).padStart(2, "0")}:00`;
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Payment form (inner Stripe Elements component) ───────────────────────────

function PaymentForm({
  tutorId,
  selectedSlot,
  onSuccess,
}: {
  tutorId: string;
  selectedSlot: string;
  onSuccess: (bookingId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message ?? "Paiement refusé");
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Create booking record
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tutorId,
            scheduledAt: selectedSlot,
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Erreur lors de la création de la réservation");
          setLoading(false);
          return;
        }

        const booking = await res.json();
        onSuccess(booking.id);
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-[#F5C400] text-[#5C3D00] font-bold py-3 rounded-xl hover:bg-[#FFDE59] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Traitement en cours…" : "Payer 15 USD →"}
      </button>
    </form>
  );
}

// ─── Main booking flow ────────────────────────────────────────────────────────

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
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const slotsByDate = groupSlotsByDate(availableSlots);
  const dates = Object.keys(slotsByDate).sort();

  const initials = tutorName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSelectSlot = useCallback(
    async (slot: string) => {
      setSelectedSlot(slot);
      setClientSecret(null);
      setIntentError(null);
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

  const handleSuccess = useCallback(
    (bookingId: string) => {
      router.push(`/booking/confirmation/${bookingId}`);
    },
    [router],
  );

  const stripePromise = stripePublishableKey
    ? loadStripe(stripePublishableKey)
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <img src="/logo.svg" alt="WithYou" className="h-8 w-auto" />
        </Link>
        <Link
          href={`/tutors/${tutorId}`}
          className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition"
        >
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
            <p className="text-2xl mb-2">📅</p>
            <p className="font-bold text-amber-900 mb-1">Séance déjà réservée</p>
            <p className="text-sm text-amber-700 mb-4">
              Vous avez déjà une séance de découverte avec ce tuteur.
            </p>
            <Link
              href="/dashboard/student"
              className="inline-block px-5 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-xl text-sm"
            >
              Voir mes séances →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Step 1 — Slot selection */}
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
                ) : loadingIntent ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : intentError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {intentError}
                  </div>
                ) : clientSecret && stripePromise ? (
                  <>
                    <div className="bg-[#FAF8F0] rounded-xl p-3 mb-4 text-xs text-[#6B5E44]">
                      <span className="font-semibold text-[#5C3D00]">Créneau sélectionné :</span>{" "}
                      {formatDateLabel(selectedSlot.slice(0, 10))} à {formatSlotTime(selectedSlot)}
                    </div>
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
                      <PaymentForm
                        tutorId={tutorId}
                        selectedSlot={selectedSlot}
                        onSuccess={handleSuccess}
                      />
                    </Elements>
                  </>
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
