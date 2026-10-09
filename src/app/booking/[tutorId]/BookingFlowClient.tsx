"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useZone, type PriceZone } from "@/app/tutors/[id]/PricingCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = "DISCOVERY" | "SINGLE";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ─── Pack definitions ─────────────────────────────────────────────────────────

const PACKS = [
  {
    id: "launch",
    name: { fr: "Pack Décollage",  en: "Launch Pack" },
    sessions: 4,
    discount: 5,
    days: 21,
    tagline: {
      fr: "Le premier pas parfait pour découvrir notre méthode et activer vos compétences linguistiques.",
      en: "The perfect first step to discover our method and activate your language skills.",
    },
  },
  {
    id: "regular",
    name: { fr: "Pack Régulier",   en: "Regular Pack" },
    sessions: 8,
    discount: 10,
    days: 30,
    tagline: {
      fr: "Idéal pour installer un rythme solide, gagner en confiance et obtenir des résultats visibles en un mois.",
      en: "Ideal for building a solid routine, gaining confidence, and achieving visible results in one month.",
    },
  },
  {
    id: "intensive",
    name: { fr: "Pack Intensif",   en: "Intensive Pack" },
    sessions: 12,
    discount: 15,
    days: 45,
    tagline: {
      fr: "Le choix ultime pour booster votre niveau, réussir vos examens (TCF, TEF, etc.) et vous intégrer avec succès.",
      en: "The ultimate choice to boost your level, ace your exams (TCF, TEF, etc.), and integrate successfully.",
    },
  },
] as const;

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function groupSlotsByDate(slots: string[], tz: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const slot of slots) {
    // Group by date in the student's local timezone
    const dateKey = new Date(slot).toLocaleDateString("en-CA", { timeZone: tz }); // "2025-01-15"
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(slot);
  }
  return groups;
}

function formatSlotTime(isoStr: string, lang: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString(lang === "en" ? "en-GB" : "fr-FR", {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
  });
}

function formatDateLabel(dateKey: string, lang: string, tz: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
    weekday: "long", day: "numeric", month: "long", timeZone: tz,
  });
}

function formatTzLabel(tz: string): string {
  return tz.replace(/_/g, " ");
}

// ─── Stripe load-error listener ──────────────────────────────────────────────
// Must be rendered inside <Elements>; listens to the underlying elements instance.
function StripeLoadErrorListener({
  lang,
  onError,
}: {
  lang: string;
  onError: (msg: string) => void;
}) {
  const elements = useElements();
  useEffect(() => {
    if (!elements) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = elements as any;
    const handler = (event: { error: { message: string } }) => {
      console.error("[Stripe] Elements loaderror:", event.error.message);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Sentry = (globalThis as any).__SENTRY__;
        if (Sentry?.captureException) Sentry.captureException(new Error(event.error.message));
      } catch { /* Sentry not available */ }
      onError(
        lang === "en"
          ? "Payment is temporarily unavailable. Please try again later or contact support."
          : "Le paiement est temporairement indisponible. Veuillez réessayer plus tard ou contacter le support.",
      );
    };
    el.on?.("loaderror", handler);
    return () => { el.off?.("loaderror", handler); };
  }, [elements, lang, onError]);
  return null;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "MC", amex: "Amex",
  discover: "Disc", jcb: "JCB", unionpay: "UP", card: "Card",
};

function p(amount: number, zone: PriceZone) {
  return `${amount}\u00a0${zone.symbol}`;
}

// ─── NewCardForm ─────────────────────────────────────────────────────────────

function NewCardForm({
  clientSecret,
  amountUsd,
  displayPrice,
  onSuccess,
  onCancel,
  lang,
}: {
  clientSecret: string;
  amountUsd: number;
  displayPrice: string;
  onSuccess: (paymentIntentId: string) => Promise<void>;
  onCancel?: () => void;
  lang: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/dashboard/student` },
    });

    if (stripeError) {
      setError(stripeError.message ?? t("Paiement refusé", "Payment declined"));
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
        {loading ? t("Traitement en cours...", "Processing...") : `${t("Payer", "Pay")} ${displayPrice}`}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition">
          {t("Utiliser ma carte enregistrée", "Use my saved card")}
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
  alreadyHadSession: boolean;
  sessionPriceUsd: number;
  discoveryPriceUsd: number;
  studentCountry: string;
  studentTimezone: string | null;
}

export default function BookingFlowClient({
  tutorId,
  tutorName,
  tutorPhoto,
  availableSlots,
  stripePublishableKey,
  alreadyHadSession,
  sessionPriceUsd,
  discoveryPriceUsd,
  studentCountry,
  studentTimezone,
}: Props) {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  // Use the student's chosen currency (reads localStorage preferred_currency first)
  const zone = useZone();

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  // Resolve display timezone: browser local tz (most accurate), fallback to DB timezone
  const [displayTz, setDisplayTz] = useState(studentTimezone ?? "UTC");
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setDisplayTz(tz);
  }, []);

  const slotsByDate = useMemo(() => groupSlotsByDate(availableSlots, displayTz), [availableSlots, displayTz]);
  const dates = Object.keys(slotsByDate).sort();
  const initials = tutorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // ── State ──
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  const [amountUsd, setAmountUsd] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [useNewCard, setUseNewCard] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [stripeLoadError, setStripeLoadError] = useState<string | null>(null);

  // ── Load saved cards once ──
  useEffect(() => {
    fetch("/api/stripe/payment-methods")
      .then((r) => r.json())
      .then((d) => setSavedCards(d.paymentMethods ?? []))
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  // ── Confirm booking after payment ──
  const confirmBooking = useCallback(
    async (paymentIntentId: string) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, scheduledAt: selectedSlot, paymentIntentId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPayError(d.error ?? t("Erreur lors de la création de la réservation", "Error creating booking"));
        return;
      }
      const booking = await res.json();
      router.push(`/booking/confirmation/${booking.id}`);
    },
    [tutorId, selectedSlot, router],
  );

  // ── Select slot ──
  function handleSelectSlot(slot: string) {
    setSelectedSlot(slot);
    setSelectedProduct(null);
    setClientSecret(null);
    setIntentError(null);
    setPayError(null);
    setUseNewCard(false);
  }

  // ── Select product → fetch intent ──
  const handleSelectProduct = useCallback(
    async (product: ProductType) => {
      const fallbackUsd = product === "SINGLE" ? sessionPriceUsd : discoveryPriceUsd;
      setSelectedProduct(product);
      setAmountUsd(fallbackUsd);
      setClientSecret(null);
      setIntentError(null);
      setPayError(null);
      setUseNewCard(false);
      setLoadingIntent(true);

      try {
        const res = await fetch("/api/bookings/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tutorId, scheduledAt: selectedSlot, sessionType: product }),
        });
        const data = await res.json();
        if (!res.ok) {
          setIntentError(data.error ?? t("Erreur lors de l'initialisation du paiement", "Error initialising payment"));
          return;
        }
        setClientSecret(data.clientSecret);
        setAmountUsd(data.amountUsd ?? fallbackUsd);
      } catch {
        setIntentError(t("Impossible de contacter le serveur de paiement", "Could not reach the payment server"));
      } finally {
        setLoadingIntent(false);
      }
    },
    [tutorId, selectedSlot],
  );

  // ── Pay with saved card ──
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
      setPayError(error.message ?? t("Paiement refusé", "Payment declined"));
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

  // ── Slot summary line ──
  const slotLabel = selectedSlot
    ? `${formatDateLabel(selectedSlot.slice(0, 10), lang, displayTz)} ${t("à", "at")} ${formatSlotTime(selectedSlot, lang, displayTz)}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">

      {/* Progress steps */}
      <div className="bg-white border-b border-[#E8E0D4] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-xs font-semibold">
          <span className={selectedSlot ? "text-[#9B8A6B]" : "text-[#5C3D00]"}>
            {t("1. Choisir un créneau", "1. Choose a slot")}
          </span>
          <span className="text-[#D9D0C3]">›</span>
          <span className={selectedProduct ? "text-[#9B8A6B]" : selectedSlot ? "text-[#5C3D00]" : "text-[#C4BAA8]"}>
            {t("2. Choisir une offre", "2. Choose an offer")}
          </span>
          <span className="text-[#D9D0C3]">›</span>
          <span className={selectedProduct ? "text-[#5C3D00]" : "text-[#C4BAA8]"}>
            {t("3. Paiement", "3. Payment")}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Tutor summary */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-4 mb-6 flex items-center gap-4">
          {tutorPhoto ? (
            <img src={tutorPhoto} alt={tutorName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-base flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#2D1A00]">{tutorName}</p>
            {slotLabel && (
              <p className="text-xs text-[#6B5E44] mt-0.5">
                {t("Créneau choisi :", "Selected slot:")} <span className="font-semibold">{slotLabel}</span>
              </p>
            )}
          </div>
          {selectedSlot && !selectedProduct && (
            <button
              onClick={() => { setSelectedSlot(null); setSelectedProduct(null); }}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition flex-shrink-0"
            >
              {t("Modifier", "Change")}
            </button>
          )}
          {selectedProduct && (
            <button
              onClick={() => { setSelectedProduct(null); setClientSecret(null); }}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition flex-shrink-0"
            >
              {t("Modifier l'offre", "Change offer")}
            </button>
          )}
        </div>

        {/* ── STEP 1: Slot picker ── */}
        {!selectedSlot && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest">
                {t("Choisissez votre créneau", "Choose your slot")}
              </p>
              <p className="text-[11px] text-[#9B8A6B]">
                🕐 {formatTzLabel(displayTz)}
              </p>
            </div>
            {dates.length === 0 ? (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-8 text-center">
                <p className="text-sm text-[#9B8A6B]">{t("Aucun créneau disponible dans les 4 prochaines semaines.", "No slots available in the next 4 weeks.")}</p>
                <Link href={`/tutors/${tutorId}`} className="text-sm font-semibold text-[#5C3D00] hover:underline mt-2 inline-block">
                  {t("Revenir au profil", "Back to profile")}
                </Link>
              </div>
            ) : (
              <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                {dates.map((dateKey) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold text-[#5C3D00] capitalize mb-2">
                      {formatDateLabel(dateKey, lang, displayTz)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {slotsByDate[dateKey].map((slot) => (
                        <button
                          key={slot}
                          onClick={() => handleSelectSlot(slot)}
                          className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#FAF8F0] text-[#5C3D00] border border-[#D9D0C3] hover:bg-[#F5C400]/20 hover:border-[#F5C400] transition"
                        >
                          {formatSlotTime(slot, lang, displayTz)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Product selection ── */}
        {selectedSlot && !selectedProduct && (
          <div>
            <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-4">
              {t("Choisissez votre offre", "Choose your offer")}
            </p>

            <div className="space-y-3">

              {/* Option 1: Discovery session */}
              <div className={`bg-white border rounded-2xl p-5 transition ${alreadyHadSession ? "opacity-50 cursor-not-allowed border-[#D9D0C3]" : "border-[#C4BAA8] hover:border-[#F5C400] cursor-pointer"}`}
                onClick={() => !alreadyHadSession && handleSelectProduct("DISCOVERY")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-[#F5C400]/20 text-[#5C3D00] px-2 py-0.5 rounded-full">{t("Découverte", "Discovery")}</span>
                      {alreadyHadSession && (
                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t("Déjà utilisée", "Already used")}</span>
                      )}
                    </div>
                    <p className="font-bold text-[#2D1A00] text-lg">{t("Séance de découverte", "Discovery session")}</p>
                    <p className="text-xs text-[#7A6B55] mt-0.5">{t("30 min — Faire connaissance et définir vos objectifs", "30 min — Get acquainted and define your goals")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-[#5C3D00]">{p(zone.discovery, zone)}</p>
                  </div>
                </div>
                {!alreadyHadSession && (
                  <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
                    <p className="text-xs text-[#9B8A6B]">{t("Remboursée si non satisfait — testez autant de tuteurs que nécessaire", "Refunded if not satisfied — try as many tutors as you need")}</p>
                    <span className="text-sm font-bold text-[#5C3D00]">{t("Choisir", "Choose")}</span>
                  </div>
                )}
              </div>

              {/* Option 2: Full single session */}
              <div
                className="bg-white border border-[#C4BAA8] rounded-2xl p-5 hover:border-[#F5C400] cursor-pointer transition"
                onClick={() => handleSelectProduct("SINGLE")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-[#E8F4EC] text-green-700 px-2 py-0.5 rounded-full">{t("Séance complète", "Full session")}</span>
                    </div>
                    <p className="font-bold text-[#2D1A00] text-lg">{t("Première vraie séance", "First real session")}</p>
                    <p className="text-xs text-[#7A6B55] mt-0.5">{t("50 min — Entrer directement dans l'apprentissage", "50 min — Dive straight into learning")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-[#5C3D00]">{p(zone.session, zone)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
                  <p className="text-xs text-[#9B8A6B]">{t("Idéale si vous avez déjà eu une séance découverte", "Ideal if you've already had a discovery session")}</p>
                  <span className="text-sm font-bold text-[#5C3D00]">{t("Choisir", "Choose")}</span>
                </div>
              </div>

              {/* Option 3: Packs */}
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t("Meilleure valeur", "Best value")}</span>
                </div>
                <p className="font-bold text-[#2D1A00] text-lg mb-0.5">{t("Packs de séances", "Session packs")}</p>
                <p className="text-xs text-[#7A6B55] mb-4">{t("Économisez jusqu'à 15\u00a0% en vous engageant sur un rythme régulier", "Save up to 15\u00a0% by committing to a regular schedule")}</p>

                <div className="space-y-3">
                  {PACKS.map((pack) => {
                    const normalPrice     = zone.session * pack.sessions;
                    const discountedPrice = Math.round(normalPrice * (1 - pack.discount / 100));
                    return (
                      <div key={pack.id} className="rounded-xl border border-[#E8E0D4] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#2D1A00] text-sm">{pack.name[lang]}</p>
                            <p className="text-xs text-[#7A6B55] mb-1">{pack.sessions} {t("séances", "sessions")} × 50{'\u00A0'}min</p>
                            <p className="text-xs text-[#5C3D00] italic leading-snug">{pack.tagline[lang]}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-black text-[#5C3D00]">{p(discountedPrice, zone)}</p>
                            <p className="text-[11px] text-[#9B8A6B] line-through">{p(normalPrice, zone)}</p>
                            <p className="text-[11px] font-bold text-green-700">−{pack.discount}{'\u00A0'}%</p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-[11px] text-amber-800 font-semibold">
                            {t(
                              `Condition : consommer les ${pack.sessions} séances en ${pack.days} jours après achat. Les séances non utilisées à expiration sont perdues.`,
                              `Condition: use all ${pack.sessions} sessions within ${pack.days} days of purchase. Unused sessions expire.`
                            )}
                          </p>
                        </div>
                        <div className="mt-2 p-2 bg-[#FAF8F0] rounded-lg text-center">
                          <p className="text-xs font-bold text-[#9B8A6B]">{t("Bientôt disponible", "Coming soon")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {selectedSlot && selectedProduct && (
          <div>
            <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-4">
              {t("Paiement sécurisé", "Secure payment")}
            </p>

            {/* Order summary */}
            <div className="bg-[#FAF8F0] border border-[#E8E0D4] rounded-xl p-4 mb-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B5E44]">
                  {selectedProduct === "DISCOVERY"
                    ? t("Séance de découverte (30 min)", "Discovery session (30 min)")
                    : t("Séance complète (50 min)", "Full session (50 min)")}
                </span>
                <span className="font-bold text-[#2D1A00]">${amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#9B8A6B]">
                <span>{t("Créneau", "Slot")}</span>
                <span className="font-medium">{slotLabel}</span>
              </div>
            </div>

            <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
              {loadingIntent || loadingCards ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#F5C400] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : intentError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {intentError}
                </div>
              ) : clientSecret ? (
                <div className="space-y-4">
                  {payError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                      {payError}
                    </div>
                  )}

                  {showSavedCardUI ? (
                    <div className="space-y-3">
                      <div className="border border-[#E0D8CC] rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-7 bg-[#F7F5F0] rounded border border-black/8 flex items-center justify-center text-[10px] font-bold text-[#5C3D00] uppercase flex-shrink-0">
                          {BRAND_LABELS[primaryCard.brand] ?? primaryCard.brand}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#5C3D00]">•••• {primaryCard.last4}</p>
                          <p className="text-xs text-[#9B8A6B]">
                            {t("Expire", "Expires")} {String(primaryCard.expMonth).padStart(2, "0")}/{primaryCard.expYear}
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
                            {t("Traitement en cours...", "Processing...")}
                          </span>
                        ) : (
                          `${t("Payer", "Pay")} $${amountUsd.toFixed(2)}`
                        )}
                      </button>
                      <button onClick={() => setUseNewCard(true)} className="w-full text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition py-1">
                        {t("Utiliser une autre carte", "Use a different card")}
                      </button>
                    </div>
                  ) : stripePromise ? (
                    <>
                      {stripeLoadError && (
                        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                          {stripeLoadError}
                        </div>
                      )}
                      {!stripeLoadError && (
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret,
                            appearance: {
                              theme: "stripe",
                              variables: { colorPrimary: "#F5C400", colorText: "#2D1A00", borderRadius: "10px" },
                            },
                          }}
                        >
                          <StripeLoadErrorListener lang={lang} onError={setStripeLoadError} />
                          <NewCardForm
                            clientSecret={clientSecret}
                            amountUsd={amountUsd}
                            displayPrice={`$${amountUsd.toFixed(2)}`}
                            onSuccess={confirmBooking}
                            onCancel={hasSavedCard ? () => setUseNewCard(false) : undefined}
                            lang={lang}
                          />
                        </Elements>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-[#9B8A6B] text-center mt-2">
              {t("Paiement sécurisé par Stripe — vos données ne sont jamais stockées", "Secured by Stripe — your card details are never stored")}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
