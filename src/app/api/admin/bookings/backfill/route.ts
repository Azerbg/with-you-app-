import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISCOVERY_SESSION_USD, STANDARD_SESSION_USD } from "@/lib/pricing";
import { Currency } from "@prisma/client";

// POST /api/admin/bookings/backfill
// Backfills studentPriceUsd / platformMargin for bookings with null prices.
// Uses fixed Phase-1 pricing: DISCOVERY=$15, all other types=$22.
// tutorPayoutAmount is derived from tutor's TutorCompensation if available,
// otherwise falls back to 80% of USD equivalent.

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nullPriceBookings = await db.booking.findMany({
    where: { studentPriceUsd: null },
    select: {
      id: true,
      sessionType: true,
      tutorId: true,
      tutor: {
        select: {
          tutorCompensation: {
            select: { hourlyRateTnd: true, currencyPref: true },
          },
        },
      },
    },
  });

  if (nullPriceBookings.length === 0) {
    return NextResponse.json({ updated: 0, message: "No bookings with null price found." });
  }

  let updated = 0;

  for (const b of nullPriceBookings) {
    const studentPriceUsd = b.sessionType === "DISCOVERY"
      ? DISCOVERY_SESSION_USD
      : STANDARD_SESSION_USD;

    // Derive tutorPayoutAmount: use hourlyRateTnd if set, else 80% of student USD as TND proxy
    const comp = b.tutor.tutorCompensation;
    let tutorPayoutAmount: number;
    let tutorCurrency: Currency;
    if (comp?.hourlyRateTnd) {
      // 30-min discovery = half hour rate, 50-min standard ≈ 5/6 hour
      const fraction = b.sessionType === "DISCOVERY" ? 0.5 : 50 / 60;
      tutorPayoutAmount = Math.round(comp.hourlyRateTnd * fraction * 100) / 100;
      tutorCurrency = comp.currencyPref ?? "TND";
    } else {
      // Rough fallback: 80% of student USD (in USD, since we have no TND rate)
      tutorPayoutAmount = Math.round(studentPriceUsd * 0.8 * 100) / 100;
      tutorCurrency = Currency.USD;
    }

    const platformMargin = studentPriceUsd - (tutorCurrency === "USD" ? tutorPayoutAmount : 0);

    await db.booking.update({
      where: { id: b.id },
      data: {
        studentPriceUsd,
        tutorPayoutAmount,
        tutorCurrency,
        platformMargin: platformMargin > 0 ? platformMargin : null,
      },
    });
    updated++;
  }

  return NextResponse.json({ updated, message: `Backfilled ${updated} booking(s).` });
}
