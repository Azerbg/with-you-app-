// scripts/backfill-pricing.mjs
// Idempotent backfill: populates null studentPriceUsd, tutorPayoutAmount, tutorPayoutUsd
// and recomputes platformMargin on all bookings.
// Run automatically during `npm run build`.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEFAULT_USD_TO_TND = 2.95;
const STANDARD_SESSION_USD = 22;
const DISCOVERY_SESSION_USD = 15;

async function getUsdToTndRate() {
  try {
    const s = await db.setting.findUnique({ where: { key: "usdToTnd" } });
    const v = s ? parseFloat(s.value) : NaN;
    return isNaN(v) || v <= 0 ? DEFAULT_USD_TO_TND : v;
  } catch {
    return DEFAULT_USD_TO_TND;
  }
}

function toUsd(amount, currency, rate) {
  if (currency === "TND") return amount / rate;
  if (currency === "CAD") return amount * 0.74;
  return amount; // USD
}

async function run() {
  console.log("[backfill] Starting pricing backfill…");
  const usdToTnd = await getUsdToTndRate();
  console.log(`[backfill] USD→TND rate: ${usdToTnd}`);

  // 1. Fix null studentPriceUsd
  const nullPrice = await db.booking.findMany({
    where: { studentPriceUsd: null },
    select: {
      id: true, sessionType: true, durationMins: true, tutorCurrency: true,
      tutor: { select: { tutorCompensation: { select: { hourlyRateTnd: true, hourlyRateCad: true } } } },
    },
  });

  // 2. Fix null tutorPayoutAmount (studentPriceUsd already set)
  const nullPayout = await db.booking.findMany({
    where: { studentPriceUsd: { not: null }, tutorPayoutAmount: null },
    select: {
      id: true, sessionType: true, durationMins: true, studentPriceUsd: true, tutorCurrency: true,
      tutor: { select: { tutorCompensation: { select: { hourlyRateTnd: true, hourlyRateCad: true } } } },
    },
  });

  // 3. Fix null tutorPayoutUsd (conversion for existing rows with amount)
  const nullPayoutUsd = await db.booking.findMany({
    where: { tutorPayoutAmount: { not: null }, tutorPayoutUsd: null },
    select: { id: true, tutorPayoutAmount: true, tutorCurrency: true, studentPriceUsd: true },
  });

  let updated = 0;

  for (const b of nullPrice) {
    const studentPriceUsd = b.sessionType === "DISCOVERY" ? DISCOVERY_SESSION_USD : STANDARD_SESSION_USD;
    const comp = b.tutor?.tutorCompensation;
    let tutorPayoutAmount, tutorCurrency;

    if (comp?.hourlyRateTnd) {
      tutorPayoutAmount = Math.round(comp.hourlyRateTnd * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = "TND";
    } else if (comp?.hourlyRateCad) {
      tutorPayoutAmount = Math.round(comp.hourlyRateCad * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = "CAD";
    } else {
      tutorPayoutAmount = Math.round(studentPriceUsd * 0.8 * 100) / 100;
      tutorCurrency = "USD";
    }

    const tutorPayoutUsd = toUsd(tutorPayoutAmount, tutorCurrency, usdToTnd);
    await db.booking.update({
      where: { id: b.id },
      data: { studentPriceUsd, tutorPayoutAmount, tutorCurrency, tutorPayoutUsd, platformMargin: studentPriceUsd - tutorPayoutUsd },
    });
    updated++;
  }

  for (const b of nullPayout) {
    const comp = b.tutor?.tutorCompensation;
    let tutorPayoutAmount, tutorCurrency;

    if (comp?.hourlyRateTnd) {
      tutorPayoutAmount = Math.round(comp.hourlyRateTnd * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = "TND";
    } else if (comp?.hourlyRateCad) {
      tutorPayoutAmount = Math.round(comp.hourlyRateCad * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = "CAD";
    } else {
      tutorPayoutAmount = Math.round(b.studentPriceUsd * 0.8 * 100) / 100;
      tutorCurrency = "USD";
    }

    const tutorPayoutUsd = toUsd(tutorPayoutAmount, tutorCurrency, usdToTnd);
    await db.booking.update({
      where: { id: b.id },
      data: { tutorPayoutAmount, tutorCurrency, tutorPayoutUsd, platformMargin: b.studentPriceUsd - tutorPayoutUsd },
    });
    updated++;
  }

  for (const b of nullPayoutUsd) {
    const tutorPayoutUsd = toUsd(b.tutorPayoutAmount, b.tutorCurrency, usdToTnd);
    const data = { tutorPayoutUsd };
    if (b.studentPriceUsd != null) data.platformMargin = b.studentPriceUsd - tutorPayoutUsd;
    await db.booking.update({ where: { id: b.id }, data });
    updated++;
  }

  console.log(`[backfill] Done — updated ${updated} booking(s).`);
}

run()
  .catch(e => { console.error("[backfill] Error:", e); process.exit(1); })
  .finally(() => db.$disconnect());
