// ─── Currency utility ─────────────────────────────────────────────────────────
// Supported display currencies for student payments

export type DisplayCurrency = "USD" | "EUR" | "CAD";

export const SUPPORTED_CURRENCIES: DisplayCurrency[] = ["USD", "EUR", "CAD"];

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  USD: "$",
  EUR: "€",
  CAD: "CA$",
};

// Fallback rates (used when API is unavailable)
// These are approximate and should be refreshed from an exchange rate API in production
const FALLBACK_RATES: Record<DisplayCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  CAD: 1.36,
};

let cachedRates: Record<DisplayCurrency, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fetch exchange rates from Open Exchange Rates (free tier: USD base)
export async function getExchangeRates(): Promise<Record<DisplayCurrency, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;
  if (!apiKey) {
    return FALLBACK_RATES;
  }

  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&symbols=EUR,CAD`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const rates = data.rates as Record<string, number>;
    cachedRates = {
      USD: 1.0,
      EUR: rates.EUR ?? FALLBACK_RATES.EUR,
      CAD: rates.CAD ?? FALLBACK_RATES.CAD,
    };
    cacheTimestamp = now;
    return cachedRates;
  } catch {
    return FALLBACK_RATES;
  }
}

// Convert USD amount to target currency
export function convertFromUsd(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate * 100) / 100;
}

// Format amount with currency symbol
export function formatCurrency(amount: number, currency: DisplayCurrency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toFixed(2)}`;
}

// Detect currency from Accept-Language or country header (basic heuristic)
export function detectCurrencyFromHeaders(acceptLanguage: string | null): DisplayCurrency {
  if (!acceptLanguage) return "USD";
  const lang = acceptLanguage.toLowerCase();
  if (lang.includes("fr-ca") || lang.includes("en-ca")) return "CAD";
  if (lang.includes("-fr") || lang.includes("fr-") || lang.startsWith("fr")) return "EUR";
  return "USD";
}
