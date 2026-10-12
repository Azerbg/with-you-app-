import { db } from "@/lib/db";

/** Default USD→TND rate if not set in DB */
export const DEFAULT_USD_TO_TND = 2.95;

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
 * Format a USD amount correctly for negative margins:
 * -$31.00  (not $-31.00)
 */
export function formatUsd(amount: number | null | undefined, decimals = 2): string {
  if (amount == null) return "—";
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toFixed(decimals)}`;
}
