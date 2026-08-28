import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Currency } from "@prisma/client";

// POST /api/stripe/payouts — triggered by Vercel Cron every Friday or by ADMIN
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  // Only pay out sessions completed more than 24h ago
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Period = last 7 days
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

  // Group by tutor
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
    const amountUsdCents = Math.round(totalAmount * 100);
    if (amountUsdCents < 100) {
      results.push({ tutorId, amount: totalAmount, currency: currencyPref, error: "Below minimum payout ($1 USD)" });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: amountUsdCents,
        currency: "usd",
        destination: connectId,
        description: `WithYou payout — ${bookings.length} séance(s)`,
        metadata: {
          tutorId,
          bookingIds: bookings.map((b) => b.id).join(","),
          sessionCount: String(bookings.length),
        },
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

// GET /api/stripe/payouts — list payout history for current tutor
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payouts = await db.payout.findMany({
    where: { tutorId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      currency: true,
      stripeTransferId: true,
      sessionCount: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
    },
  });

  return NextResponse.json(payouts);
}
