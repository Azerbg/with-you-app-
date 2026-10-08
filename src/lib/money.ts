/**
 * Format a monetary amount with 2 decimal places.
 * e.g. fmtMoney(202.5, "TND") → "202.50 TND"
 */
export function fmtMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}
