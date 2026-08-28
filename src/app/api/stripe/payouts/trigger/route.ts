import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Currency } from "@prisma/client";

// GET /api/stripe/payouts/trigger
// Called by Vercel Cron every Friday at 08:00 UTC
// Requires Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pendingBookings = await db.booking.findMany({
    where: {
      status: "COMPLETED",
      stripeTransferId: null,
      tutorPayoutAmount: { gt: 0 },
      scheduledAt: { lt: cutoff },
    },
    include: {
      tutor: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          tutorCompensation: { select: { currencyPref: true } },
        },
      },
    },
  });

  if (pendingBookings.length === 0) {
    return NextResponse.json({ processed: 0, message: "No pending payouts" });
  }

  const byTutor = new Map<string, typeof pendingBookings>();
  for (const b of pendingBookings) {
    const tid = b.tutor.id;
    if (!byTutor.has(tid)) byTutor.set(tid, []);
    byTutor.get(tid)!.push(b);
  }

  const results: { tutorId: string; amount: number; currency: string; transferId?: string; error?: string }[] = [];

  for (const [tutorId, bookings] of byTutor.entries()) {
    const tutor = bookings[0].tutor;
    const connectId = tutor.stripeConnectAccountId;
    if (!connectId) {
      results.push({ tutorId, amount: 0, currency: "TND", error: "No Stripe Connect account" });
      continue;
    }

    const currencyPref = (tutor.tutorCompensation?.currencyPref ?? "TND") as Currency;
    const totalAmount = bookings.reduce((sum, b) => sum + (b.tutorPayoutAmount ?? 0), 0);

    // Convert to USD cents for Stripe (phase 1 simplification)
    // TND ≈ 0.32 USD | CAD ≈ 0.73 USD
    const FX: Record<string, number> = { TND: 0.32, CAD: 0.73, USD: 1.0, EUR: 1.08 };
    const rate = FX[currencyPref] ?? 1.0;
    const amountUsdCents = Math.round(totalAmount * rate * 100);

    if (amountUsdCents < 100) {
      results.push({ tutorId, amount: totalAmount, currency: currencyPref, error: "Below minimum ($1 USD)" });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: amountUsdCents,
        currency: "usd",
        destination: connectId,
        description: `WithYou payout — ${bookings.length} séance(s)`,
        metadata: { tutorId, sessionCount: String(bookings.length) },
      });

      await db.booking.updateMany({
        where: { id: { in: bookings.map((b) => b.id) } },
        data: { stripeTransferId: transfer.id },
      });

      await db.payout.create({
        data: {
          tutorId,
          amount: totalAmount,
          currency: currencyPref,
          stripeTransferId: transfer.id,
          sessionCount: bookings.length,
          status: "PAID",
          periodStart,
          periodEnd: now,
          initiatedAt: now,
          completedAt: now,
        },
      });

      results.push({ tutorId, amount: totalAmount, currency: currencyPref, transferId: transfer.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.payout.create({
        data: {
          tutorId,
          amount: totalAmount,
          currency: currencyPref,
          sessionCount: bookings.length,
          status: "FAILED",
          periodStart,
          periodEnd: now,
          failureReason: message,
        },
      });
      results.push({ tutorId, amount: totalAmount, currency: currencyPref, error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
