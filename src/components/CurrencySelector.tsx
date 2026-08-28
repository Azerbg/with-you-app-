"use client";

import { useState, useEffect } from "react";
import { ZONES } from "@/app/tutors/[id]/PricingCard";

const CURRENCY_NAMES: Record<string, string> = {
  USD: "Dollar US",
  EUR: "Euro",
  CAD: "Dollar CA",
  GBP: "Livre sterling",
};

interface Props {
  className?: string;
  onChanged?: () => void;
}

export default function CurrencySelector({ className = "", onChanged }: Props) {
  const [currency, setCurrency] = useState("USD");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("preferred_currency");
    if (saved && ZONES[saved]) setCurrency(saved);
    else {
      // Auto-detect from timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const TZ_TO_COUNTRY: Record<string, string> = {
        "America/Toronto": "CA", "America/Vancouver": "CA", "America/Montreal": "CA",
        "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Berlin": "DE",
        "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/London": "GB",
      };
      const COUNTRY_ZONE: Record<string, string> = {
        FR: "EUR", BE: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", AT: "EUR",
        CA: "CAD", GB: "GBP",
      };
      const country = TZ_TO_COUNTRY[tz] ?? "US";
      const zone = COUNTRY_ZONE[country] ?? "USD";
      setCurrency(zone);
    }
  }, []);

  function select(c: string) {
    localStorage.setItem("preferred_currency", c);
    setCurrency(c);
    setOpen(false);
    onChanged?.();
  }

  const zone = ZONES[currency] ?? ZONES.USD;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-bold text-[#6B5E44] border border-[#6B5E44]/20 px-2.5 py-1.5 rounded-full hover:bg-[#FFF3B0] hover:border-[#F5C400] transition"
      >
        <span>{zone.symbol.trim()}</span>
        <span>{zone.code}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#9B8A6B]">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-white border border-[#E8E0D4] rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
            {Object.values(ZONES).map((z) => (
              <button
                key={z.code}
                onClick={() => select(z.code)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#FFFBEA] transition ${currency === z.code ? "bg-[#FFF3B0]" : ""}`}
              >
                <span className="text-sm font-bold text-[#5C3D00] w-7">{z.symbol.trim()}</span>
                <div>
                  <p className="text-xs font-bold text-[#2D1A00]">{z.code}</p>
                  <p className="text-[10px] text-[#9B8A6B]">{CURRENCY_NAMES[z.code] ?? z.code}</p>
                </div>
                {currency === z.code && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#F5C400] ml-auto">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
