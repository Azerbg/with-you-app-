/**
 * Student-facing pricing engine — Phase 1
 *
 * FRD §3.16: Prices are set by the ops team via the admin pricing management
 * module (PlatformPricing table). In Phase 1, we use these constants as
 * placeholder values until the admin pricing UI (M6) is built.
 *
 * Confidentiality rule (FRD §3.7.2):
 * - Tutors see ONLY their own agreed hourly rate
 * - Students see ONLY their personalized program price
 * - Platform margin (difference) is NEVER exposed to either party
 *
 * Internal reporting currency: CAD (all amounts stored in CAD, displayed
 * in student's selected currency: CAD / USD / EUR)
 *
 * Discovery Session: fixed introductory rate, charged immediately on booking.
 * Required before program enrollment. Max 1 per student.
 */

import { LearningObjective, SessionFrequency, ProgramDuration, Currency } from "@prisma/client";

// ─── Constants (Phase 1 placeholders — replaced by PlatformPricing DB table) ─

/** Fixed price for the 30-min Discovery Session */
export const DISCOVERY_PRICE = { CAD: 20, USD: 15, EUR: 13 };

/**
 * Base rate per session in CAD (internal reporting currency).
 * FRD: "Exact prices set by the operations team based on market research,
 * cost structure, and competitive positioning."
 * Phase 1 placeholder — will be admin-configurable via PlatformPricing table.
 */
export const BASE_RATE_CAD: Record<string, number> = {
  A1: 34, A2: 34,  // STARTER (~$25 USD)
  B1: 47, B2: 47,  // CORE    (~$35 USD)
  C1: 61, C2: 61,  // INTENSIVE (~$45 USD)
};

/** Objective pricing premiums (FRD §3.16.2) */
const OBJECTIVE_MULTIPLIER: Record<LearningObjective, number> = {
  CONVERSATIONAL: 1.0,
  ACADEMIC:       1.0,
  TRAVEL:         1.0,
  CULTURAL:       1.0,
  PROFESSIONAL:   1.1,
  EXAM_PREP:      1.15,
};

/** Session frequency — sessions per month and bundle discount factor (FRD §3.16) */
const FREQUENCY_CONFIG: Record<SessionFrequency, { sessionsPerMonth: number; multiplier: number }> = {
  ONCE:        { sessionsPerMonth: 4,  multiplier: 1.0 },
  TWICE:       { sessionsPerMonth: 8,  multiplier: 1.9 },
  THREE_TIMES: { sessionsPerMonth: 12, multiplier: 2.7 },
  INTENSIVE:   { sessionsPerMonth: 16, multiplier: 3.5 },
};

/** Program duration discounts (FRD §3.16) */
const DURATION_DISCOUNT: Record<ProgramDuration, number> = {
  PAY_PER_SESSION: 0,
  ONE_MONTH:       0,
  THREE_MONTHS:    0.10, // 10%
  SIX_MONTHS:      0.18, // 18%
};

/**
 * FX rates relative to CAD (approximate Phase 1 placeholders).
 * In production: updated weekly via Open Exchange Rates API,
 * stored in CurrencyExchangeRate table, used for financial reporting.
 */
const FX_FROM_CAD: Record<Exclude<Currency, "TND">, number> = {
  CAD: 1.0,
  USD: 0.74,  // 1 CAD ≈ 0.74 USD
  EUR: 0.68,  // 1 CAD ≈ 0.68 EUR
};

// ─── Calculation ──────────────────────────────────────────────────────────────

export interface PricingResult {
  /** Per-session base rate in CAD (internal reporting currency) */
  baseRateCad: number;
  /** Monthly rate in CAD (stored internally — FRD §3.16.2: stored in CAD) */
  monthlyRateCad: number;
  /** Monthly rates in student-facing currencies */
  monthlyRateUsd: number;
  monthlyRateEur: number;
  /** Per-session effective price in CAD (for PAY_PER_SESSION display) */
  perSessionRateCad: number;
  /** Total sessions included per month */
  sessionsPerMonth: number;
  /** Breakdown factors */
  objectiveMultiplier: number;
  durationDiscount: number;
  frequencyMultiplier: number;
}

export function calculateStudentPricing(
  cefrLevel: string,
  objective: LearningObjective,
  frequency: SessionFrequency,
  duration: ProgramDuration,
): PricingResult {
  const baseRateCad = BASE_RATE_CAD[cefrLevel] ?? 47;
  const objectiveMultiplier = OBJECTIVE_MULTIPLIER[objective];
  const { sessionsPerMonth, multiplier: frequencyMultiplier } = FREQUENCY_CONFIG[frequency];
  const durationDiscount = DURATION_DISCOUNT[duration];

  // Monthly price in CAD (internal reporting currency)
  // frequencyMultiplier encodes the bundle discount (e.g. TWICE = 1.9 not 2.0)
  const monthlyRateCad = duration === "PAY_PER_SESSION"
    ? baseRateCad * objectiveMultiplier // per-session price
    : baseRateCad * frequencyMultiplier * 4 * objectiveMultiplier * (1 - durationDiscount);

  const perSessionRateCad = duration === "PAY_PER_SESSION"
    ? monthlyRateCad
    : monthlyRateCad / sessionsPerMonth;

  return {
    baseRateCad: round(baseRateCad),
    monthlyRateCad: round(monthlyRateCad),
    monthlyRateUsd: round(monthlyRateCad * FX_FROM_CAD.USD),
    monthlyRateEur: round(monthlyRateCad * FX_FROM_CAD.EUR),
    perSessionRateCad: round(perSessionRateCad),
    sessionsPerMonth,
    objectiveMultiplier,
    durationDiscount,
    frequencyMultiplier,
  };
}

/** Format a price amount with currency symbol */
export function formatPrice(amount: number, currency: Currency): string {
  const symbols: Record<string, string> = { USD: "$", CAD: "CA$", EUR: "€", TND: "TND " };
  return `${symbols[currency] ?? ""}${amount.toFixed(0)}`;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
