import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISCOVERY_SESSION_USD, STANDARD_SESSION_USD } from "@/lib/pricing";
import { getUsdToTndRate } from "@/lib/adminSettings";
import { Currency } from "@prisma/client";

// POST /api/admin/bookings/backfill
// Fixes two classes of problems:
//   1. Null studentPriceUsd  → set from pricing constants (DISCOVERY=$15, rest=$22)
//   2. Null tutorPayoutAmount → derive from TutorCompensation (rate × duration)
// Also populates tutorPayoutUsd and recomputes platformMargin for all fixed rows.
// Safe to run multiple times (only touches null fields).

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usdToTnd = await getUsdToTndRate();

  // 1. Fix null studentPriceUsd
  const nullPriceBookings = await db.booking.findMany({
    where: { studentPriceUsd: null },
    select: {
      id: true, sessionType: true, durationMins: true,
      tutor: { select: { tutorCompensation: { select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true } } } },
    },
  });

  // 2. Fix null tutorPayoutAmount (but studentPriceUsd already set)
  const nullPayoutBookings = await db.booking.findMany({
    where: { studentPriceUsd: { not: null }, tutorPayoutAmount: null },
    select: {
      id: true, sessionType: true, durationMins: true, studentPriceUsd: true,
      tutor: { select: { tutorCompensation: { select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true } } } },
    },
  });

  // 3. Fix null tutorPayoutUsd (conversion for existing rows)
  const nullPayoutUsdBookings = await db.booking.findMany({
    where: { tutorPayoutAmount: { not: null }, tutorPayoutUsd: null },
    select: { id: true, tutorPayoutAmount: true, tutorCurrency: true },
  });

  let updated = 0;

  for (const b of nullPriceBookings) {
    const studentPriceUsd = b.sessionType === "DISCOVERY" ? DISCOVERY_SESSION_USD : STANDARD_SESSION_USD;
    const comp = b.tutor.tutorCompensation;
    let tutorPayoutAmount: number;
    let tutorCurrency: Currency;

    if (comp?.hourlyRateTnd) {
      const fraction = b.durationMins / 60;
      tutorPayoutAmount = Math.round(comp.hourlyRateTnd * fraction * 100) / 100;
      tutorCurrency = Currency.TND;
    } else if (comp?.hourlyRateCad) {
      const fraction = b.durationMins / 60;
      tutorPayoutAmount = Math.round(comp.hourlyRateCad * fraction * 100) / 100;
      tutorCurrency = Currency.CAD;
    } else {
      tutorPayoutAmount = Math.round(studentPriceUsd * 0.8 * 100) / 100;
      tutorCurrency = Currency.USD;
    }

    const tutorPayoutUsd = tutorCurrency === Currency.TND
      ? tutorPayoutAmount / usdToTnd
      : tutorCurrency === Currency.CAD
        ? tutorPayoutAmount * 0.74
        : tutorPayoutAmount;

    const platformMargin = studentPriceUsd - tutorPayoutUsd;

    await db.booking.update({
      where: { id: b.id },
      data: { studentPriceUsd, tutorPayoutAmount, tutorCurrency, tutorPayoutUsd, platformMargin },
    });
    updated++;
  }

  for (const b of nullPayoutBookings) {
    const studentPriceUsd = b.studentPriceUsd!;
    const comp = b.tutor.tutorCompensation;
    let tutorPayoutAmount: number;
    let tutorCurrency: Currency;

    if (comp?.hourlyRateTnd) {
      tutorPayoutAmount = Math.round(comp.hourlyRateTnd * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = Currency.TND;
    } else if (comp?.hourlyRateCad) {
      tutorPayoutAmount = Math.round(comp.hourlyRateCad * (b.durationMins / 60) * 100) / 100;
      tutorCurrency = Currency.CAD;
    } else {
      tutorPayoutAmount = Math.round(studentPriceUsd * 0.8 * 100) / 100;
      tutorCurrency = Currency.USD;
    }

    const tutorPayoutUsd = tutorCurrency === Currency.TND
      ? tutorPayoutAmount / usdToTnd
      : tutorCurrency === Currency.CAD
        ? tutorPayoutAmount * 0.74
        : tutorPayoutAmount;

    await db.booking.update({
      where: { id: b.id },
      data: { tutorPayoutAmount, tutorCurrency, tutorPayoutUsd, platformMargin: studentPriceUsd - tutorPayoutUsd },
    });
    updated++;
  }

  for (const b of nullPayoutUsdBookings) {
    const amount = b.tutorPayoutAmount!;
    const tutorPayoutUsd = b.tutorCurrency === "TND"
      ? amount / usdToTnd
      : b.tutorCurrency === "CAD"
        ? amount * 0.74
        : amount;
    await db.booking.update({
      where: { id: b.id },
      data: { tutorPayoutUsd },
    });
    updated++;
  }

  if (updated === 0) {
    return NextResponse.json({ updated: 0, message: "All bookings already have complete pricing data." });
  }

  return NextResponse.json({ updated, message: `Backfilled ${updated} booking(s).` });
}
