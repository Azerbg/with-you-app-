"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ZONES, useZone, type PriceZone } from "@/app/tutors/[id]/PricingCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = "DISCOVERY" | "SINGLE";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ─── Zone pricing (fixed psychological prices — no live conversion) ─────────────
// Stripe always charges USD. Local display uses fixed round numbers per zone.

// Timezone → ISO country code (fallback when DB country is not set)
const TZ_TO_COUNTRY: Record<string, string> = {
  "America/Toronto":    "CA", "America/Vancouver":   "CA",
  "America/Montreal":   "CA", "America/Halifax":     "CA",
  "America/Winnipeg":   "CA", "America/Regina":      "CA",
  "America/Edmonton":   "CA", "America/St_Johns":    "CA",
  "Europe/Paris":       "FR", "Europe/Brussels":     "BE",
  "Europe/Berlin":      "DE", "Europe/Vienna":       "AT",
  "Europe/Madrid":      "ES", "Europe/Rome":         "IT",
  "Europe/Amsterdam":   "NL", "Europe/Lisbon":       "PT",
  "Europe/Luxembourg":  "LU", "Europe/Zurich":       "CH",
  "Europe/London":      "GB",
  "Australia/Sydney":   "AU", "Australia/Melbourne": "AU",
  "Australia/Perth":    "AU", "Australia/Brisbane":  "AU",
  "Africa/Casablanca":  "MA", "Africa/Algiers":      "DZ",
};

const COUNTRY_ZONE: Record<string, string> = {
  FR: "EUR", BE: "EUR", DE: "EUR", AT: "EUR",
  ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR", LU: "EUR",
  CA: "CAD",
  GB: "GBP",
};

function p(amount: number, zone: PriceZone) {
  return `${amount}\u00a0${zone.symbol}`;
}

// ─── Pack definitions ─────────────────────────────────────────────────────────

const PACKS = [
  {
    id: "launch",
    name: "Pack Décollage",
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
    name: "Pack Régulier",
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
    name: "Pack Intensif",
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
  // Display in user's local timezone
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "MC", amex: "Amex",
  discover: "Disc", jcb: "JCB", unionpay: "UP", card: "Card",
};

// ─── NewCardForm ─────────────────────────────────────────────────────────────

function NewCardForm({
  clientSecret,
  amountUsd,
  displayPrice,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amountUsd: number;
  displayPrice: string;
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
      clientSecret,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/dashboard/student` },
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
        {loading ? "Traitement en cours..." : `Payer ${displayPrice}`}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-sm text-[#9B8A6B] hover:text-[#5C3D00] transition">
          Utiliser ma carte enregistrée
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
  alreadyHadDiscovery: boolean;
  sessionPriceUsd: number;   // USD amount charged by Stripe (22)
  discoveryPriceUsd: number; // USD amount charged by Stripe (15)
  studentCountry: string;    // DB country, used as hint (timezone detection overrides if missing)
}

export default function BookingFlowClient({
  tutorId,
  tutorName,
  tutorPhoto,
  availableSlots,
  stripePublishableKey,
  alreadyHadDiscovery,
  sessionPriceUsd,
  discoveryPriceUsd,
  studentCountry,
}: Props) {
  const router = useRouter();
  const { lang } = useLanguage();

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  const slotsByDate = groupSlotsByDate(availableSlots);
  const dates = Object.keys(slotsByDate).sort();
  const initials = tutorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // ── Zone de prix : DB country → fallback timezone navigateur ──
  const zone: PriceZone = useMemo(() => {
    const country = studentCountry !== "US"
      ? studentCountry
      : (TZ_TO_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? "US");
    const zoneKey = COUNTRY_ZONE[country.toUpperCase()] ?? "USD";
    return ZONES[zoneKey];
  }, [studentCountry]);

  // ── State ──
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [showPackDetail, setShowPackDetail] = useState(true);

  const [amountUsd, setAmountUsd] = useState<number>(15);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [useNewCard, setUseNewCard] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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
        setPayError(d.error ?? "Erreur lors de la création de la réservation");
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
    setShowPackDetail(false);
  }

  // ── Select product → fetch intent ──
  const handleSelectProduct = useCallback(
    async (product: ProductType) => {
      setSelectedProduct(product);
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
          setIntentError(data.error ?? "Erreur lors de l'initialisation du paiement");
          return;
        }
        setClientSecret(data.clientSecret);
        setAmountUsd(data.amountUsd ?? 15);
      } catch {
        setIntentError("Impossible de contacter le serveur de paiement");
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
      setPayError(error.message ?? "Paiement refuse");
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
    ? `${formatDateLabel(selectedSlot.slice(0, 10))} à ${formatSlotTime(selectedSlot)}`
    : null;

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
          Profil du tuteur
        </Link>
      </div>

      {/* Progress steps */}
      <div className="bg-white border-b border-[#E8E0D4] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-xs font-semibold">
          <span className={selectedSlot ? "text-[#9B8A6B]" : "text-[#5C3D00]"}>1. Choisir un créneau</span>
          <span className="text-[#D9D0C3]">›</span>
          <span className={selectedProduct ? "text-[#9B8A6B]" : selectedSlot ? "text-[#5C3D00]" : "text-[#C4BAA8]"}>
            2. Choisir une offre
          </span>
          <span className="text-[#D9D0C3]">›</span>
          <span className={selectedProduct ? "text-[#5C3D00]" : "text-[#C4BAA8]"}>3. Paiement</span>
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
                Créneau choisi : <span className="font-semibold">{slotLabel}</span>
              </p>
            )}
          </div>
          {selectedSlot && !selectedProduct && (
            <button
              onClick={() => { setSelectedSlot(null); setSelectedProduct(null); }}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition flex-shrink-0"
            >
              Modifier
            </button>
          )}
          {selectedProduct && (
            <button
              onClick={() => { setSelectedProduct(null); setClientSecret(null); }}
              className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition flex-shrink-0"
            >
              Modifier l&apos;offre
            </button>
          )}
        </div>

        {/* ── STEP 1: Slot picker ── */}
        {!selectedSlot && (
          <div>
            <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
              Choisissez votre créneau
            </p>
            {dates.length === 0 ? (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-8 text-center">
                <p className="text-sm text-[#9B8A6B]">Aucun créneau disponible dans les 21 prochains jours.</p>
                <Link href={`/tutors/${tutorId}`} className="text-sm font-semibold text-[#5C3D00] hover:underline mt-2 inline-block">
                  Revenir au profil
                </Link>
              </div>
            ) : (
              <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                {dates.map((dateKey) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold text-[#5C3D00] capitalize mb-2">
                      {formatDateLabel(dateKey)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {slotsByDate[dateKey].map((slot) => (
                        <button
                          key={slot}
                          onClick={() => handleSelectSlot(slot)}
                          className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#FAF8F0] text-[#5C3D00] border border-[#D9D0C3] hover:bg-[#F5C400]/20 hover:border-[#F5C400] transition"
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
        )}

        {/* ── STEP 2: Product selection ── */}
        {selectedSlot && !selectedProduct && (
          <div>
            <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-4">
              Choisissez votre offre
            </p>

            <div className="space-y-3">

              {/* Option 1: Discovery session */}
              <div className={`bg-white border rounded-2xl p-5 transition ${alreadyHadDiscovery ? "opacity-50 cursor-not-allowed border-[#D9D0C3]" : "border-[#C4BAA8] hover:border-[#F5C400] cursor-pointer"}`}
                onClick={() => !alreadyHadDiscovery && handleSelectProduct("DISCOVERY")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-[#F5C400]/20 text-[#5C3D00] px-2 py-0.5 rounded-full">Découverte</span>
                      {alreadyHadDiscovery && (
                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Déjà utilisée</span>
                      )}
                    </div>
                    <p className="font-bold text-[#2D1A00] text-lg">Séance de découverte</p>
                    <p className="text-xs text-[#7A6B55] mt-0.5">30 min — Faire connaissance et définir vos objectifs</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-[#5C3D00]">{p(zone.discovery, zone)}</p>
                  </div>
                </div>
                {!alreadyHadDiscovery && (
                  <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
                    <p className="text-xs text-[#9B8A6B]">Remboursée si non satisfait — testez autant de tuteurs que nécessaire</p>
                    <span className="text-sm font-bold text-[#5C3D00]">Choisir</span>
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
                      <span className="text-xs font-bold bg-[#E8F4EC] text-green-700 px-2 py-0.5 rounded-full">Séance complète</span>
                    </div>
                    <p className="font-bold text-[#2D1A00] text-lg">Première vraie séance</p>
                    <p className="text-xs text-[#7A6B55] mt-0.5">50 min — Entrer directement dans l&apos;apprentissage</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-[#5C3D00]">{p(zone.session, zone)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center justify-between">
                  <p className="text-xs text-[#9B8A6B]">Idéale si vous avez déjà eu une séance découverte</p>
                  <span className="text-sm font-bold text-[#5C3D00]">Choisir</span>
                </div>
              </div>

              {/* Option 3: Packs */}
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Meilleure valeur</span>
                </div>
                <p className="font-bold text-[#2D1A00] text-lg mb-0.5">Packs de séances</p>
                <p className="text-xs text-[#7A6B55] mb-4">Économisez jusqu&apos;à 15&nbsp;% en vous engageant sur un rythme régulier</p>

                <div className="space-y-3">
                  {PACKS.map((pack) => {
                    const normalPrice     = zone.session * pack.sessions;
                    const discountedPrice = Math.round(normalPrice * (1 - pack.discount / 100));
                    return (
                      <div key={pack.id} className="rounded-xl border border-[#E8E0D4] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#2D1A00] text-sm">{pack.name}</p>
                            <p className="text-xs text-[#7A6B55] mb-1">{pack.sessions} séances × 50&nbsp;min</p>
                            <p className="text-xs text-[#5C3D00] italic leading-snug">{pack.tagline[lang]}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-black text-[#5C3D00]">{p(discountedPrice, zone)}</p>
                            <p className="text-[11px] text-[#9B8A6B] line-through">{p(normalPrice, zone)}</p>
                            <p className="text-[11px] font-bold text-green-700">−{pack.discount}&nbsp;%</p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-[11px] text-amber-800 font-semibold">
                            Condition : consommer les {pack.sessions} séances en {pack.days} jours après achat. Les séances non utilisées à expiration sont perdues.
                          </p>
                        </div>
                        <div className="mt-2 p-2 bg-[#FAF8F0] rounded-lg text-center">
                          <p className="text-xs font-bold text-[#9B8A6B]">Bientôt disponible</p>
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
              Paiement sécurisé
            </p>

            {/* Order summary */}
            <div className="bg-[#FAF8F0] border border-[#E8E0D4] rounded-xl p-4 mb-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B5E44]">
                  {selectedProduct === "DISCOVERY" ? "Séance de découverte (30 min)" : "Séance complète (50 min)"}
                </span>
                <span className="font-bold text-[#2D1A00]">{p(selectedProduct === "DISCOVERY" ? zone.discovery : zone.session, zone)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#9B8A6B]">
                <span>Créneau</span>
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
                            Traitement en cours...
                          </span>
                        ) : (
                          `Payer ${p(selectedProduct === "DISCOVERY" ? zone.discovery : zone.session, zone)}`
                        )}
                      </button>
                      <button onClick={() => setUseNewCard(true)} className="w-full text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition py-1">
                        Utiliser une autre carte
                      </button>
                    </div>
                  ) : stripePromise ? (
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
                      <NewCardForm
                        clientSecret={clientSecret}
                        amountUsd={amountUsd}
                        displayPrice={p(selectedProduct === "DISCOVERY" ? zone.discovery : zone.session, zone)}
                        onSuccess={confirmBooking}
                        onCancel={hasSavedCard ? () => setUseNewCard(false) : undefined}
                      />
                    </Elements>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-[#9B8A6B] text-center mt-2">
              Paiement sécurisé par Stripe — vos données ne sont jamais stockées
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
