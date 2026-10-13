/**
 * Shared finance helpers — consistent margin formula across:
 *   - booking detail page
 *   - /api/admin/payouts summary
 *   - /api/admin/finance
 *
 * Formula: margin = studentPriceUsd − tutorPayoutUsd
 * where tutorPayoutUsd = tutorPayoutTnd / usdToTnd  (for TND tutors)
 */

/** Compute margin in USD for a single booking.
 *  Prefers the stored tutorPayoutUsd (populated by backfill);
 *  falls back to live currency conversion when null. */
export function computeMarginUsd(
  studentPriceUsd: number | null | undefined,
  tutorPayoutUsd: number | null | undefined,
  tutorPayoutAmount: number | null | undefined,
  tutorCurrency: string | null | undefined,
  usdToTnd: number,
): number | null {
  if (studentPriceUsd == null) return null;

  // Prefer stored USD-normalized value (populated by backfill script)
  if (tutorPayoutUsd != null) return studentPriceUsd - tutorPayoutUsd;

  // Fall back: convert tutorPayoutAmount to USD on the fly
  if (tutorPayoutAmount != null) {
    const cur = tutorCurrency ?? "USD";
    const payoutUsd =
      cur === "TND" ? tutorPayoutAmount / usdToTnd
      : cur === "CAD" ? tutorPayoutAmount * 0.74
      : tutorPayoutAmount;
    return studentPriceUsd - payoutUsd;
  }

  return null;
}
