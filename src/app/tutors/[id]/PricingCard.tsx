"use client";

import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";

// ─── Zone pricing (fixed psychological prices — no live conversion) ─────────────
// Stripe always charges in USD. Local display is fixed per zone for UX/trust.

export type PriceZone = {
  session:   number; // 50-min single session
  discovery: number; // 30-min discovery session (always 15)
  symbol:    string;
  code:      string;
};

export const ZONES: Record<string, PriceZone> = {
  EUR: { session: 20, discovery: 15, symbol: "€",         code: "EUR" },
  CAD: { session: 30, discovery: 15, symbol: "CA$\u00a0", code: "CAD" },
  GBP: { session: 18, discovery: 15, symbol: "£",         code: "GBP" },
  USD: { session: 22, discovery: 15, symbol: "$",         code: "USD" }, // default
};

// Countries → currency zone
const COUNTRY_ZONE: Record<string, string> = {
  FR: "EUR", BE: "EUR", DE: "EUR", AT: "EUR",
  ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR", LU: "EUR",
  CA: "CAD",
  GB: "GBP",
  // All others → USD (Stripe charges USD; bank converts locally)
};

// Common timezones → ISO country code
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

export function useZone(): PriceZone {
  return useMemo(() => {
    const tz      = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const country = TZ_TO_COUNTRY[tz] ?? "US";
    const zone    = COUNTRY_ZONE[country] ?? "USD";
    return ZONES[zone];
  }, []);
}

function p(amount: number, zone: PriceZone) {
  return `${amount}\u00a0${zone.symbol}`;
}

// ─── Pack definitions ──────────────────────────────────────────────────────────

const PACKS = [
  {
    name: "Décollage",
    sessions: 4,
    discount: 5,
    tagline: {
      fr: "Le premier pas parfait pour découvrir notre méthode et activer vos compétences linguistiques.",
      en: "The perfect first step to discover our method and activate your language skills.",
    },
  },
  {
    name: "Régulier",
    sessions: 8,
    discount: 10,
    tagline: {
      fr: "Idéal pour installer un rythme solide, gagner en confiance et obtenir des résultats visibles en un mois.",
      en: "Ideal for building a solid routine, gaining confidence, and achieving visible results in one month.",
    },
  },
  {
    name: "Intensif",
    sessions: 12,
    discount: 15,
    tagline: {
      fr: "Le choix ultime pour booster votre niveau, réussir vos examens (TCF, TEF, etc.) et vous intégrer avec succès.",
      en: "The ultimate choice to boost your level, ace your exams (TCF, TEF, etc.), and integrate successfully.",
    },
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PricingCard() {
  const zone = useZone();
  const { lang } = useLanguage();

  return (
    <div className="space-y-4">

      {/* Discovery session */}
      <div>
        <p className="text-[10px] font-bold text-[#F5C400]/50 uppercase tracking-widest mb-0.5">
          Séance de découverte — 30 min
        </p>
        <p className="text-2xl font-black text-[#F5C400] leading-tight">
          {p(zone.discovery, zone)}
        </p>
      </div>

      {/* Single session */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-[10px] font-bold text-[#F5C400]/50 uppercase tracking-widest mb-0.5">
          Séance complète — 50 min
        </p>
        <p className="text-xl font-black text-white leading-tight">
          {p(zone.session, zone)}
        </p>
      </div>

      {/* Packs */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-[10px] font-bold text-[#F5C400]/50 uppercase tracking-widest mb-2">
          Packs — jusqu&apos;à −15&nbsp;%
        </p>
        <div className="space-y-2">
          {PACKS.map(pack => {
            const total = Math.round(zone.session * pack.sessions * (1 - pack.discount / 100));
            return (
              <div key={pack.name} className="rounded-xl bg-white/5 p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-white/80">
                    {pack.name} · {pack.sessions} séances
                  </span>
                  <span className="text-xs font-bold text-[#F5C400] whitespace-nowrap flex-shrink-0">
                    {p(total, zone)}
                    <span className="font-normal text-[#F5C400]/50"> −{pack.discount}&nbsp;%</span>
                  </span>
                </div>
                <p className="text-[11px] text-white/45 italic leading-snug">{pack.tagline[lang]}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-white/30 mt-2 italic">Packs bientôt disponibles à la réservation</p>
      </div>
    </div>
  );
}
