import { db } from "@/lib/db";

/** Default USD→TND rate if not set in DB */
export const DEFAULT_USD_TO_TND = 2.95;

/** Approximate CAD→USD conversion (no DB setting — update here if needed) */
export const DEFAULT_CAD_TO_USD = 0.73;

/** Reads usdToTnd from the settings table, falls back to default. */
export async function getUsdToTndRate(): Promise<number> {
  try {
    const s = await db.setting.findUnique({ where: { key: "usdToTnd" } });
    const v = s ? parseFloat(s.value) : NaN;
    return isNaN(v) || v <= 0 ? DEFAULT_USD_TO_TND : v;
  } catch {
    return DEFAULT_USD_TO_TND;
  }
}

/**
 * Convert a tutor's local-currency payout amount to USD.
 * Used at booking creation to populate tutorPayoutUsd and compute a correct platformMargin.
 */
export function computePayoutUsd(
  payoutAmountLocal: number,
  tutorCurrency: string,
  usdToTnd: number,
): number {
  if (tutorCurrency === "USD") return Math.round(payoutAmountLocal * 100) / 100;
  if (tutorCurrency === "CAD") return Math.round(payoutAmountLocal * DEFAULT_CAD_TO_USD * 100) / 100;
  // TND (default): divide by the current rate
  return Math.round((payoutAmountLocal / usdToTnd) * 100) / 100;
}

/**
 * Format a USD amount correctly for negative margins:
 * -$31.00  (not $-31.00)
 */
export function formatUsd(amount: number | null | undefined, decimals = 2): string {
  if (amount == null) return "—";
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toFixed(decimals)}`;
}
