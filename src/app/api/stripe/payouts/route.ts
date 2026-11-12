import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendPayPalPayout } from "@/lib/paypal";
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
          tutorPaymentMethod: { select: { type: true, email: true } },
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

  const results: { tutorId: string; amount: number; currency: string; method: string; transferId?: string; error?: string }[] = [];

  for (const [tutorId, bookings] of byTutor.entries()) {
    const tutor = bookings[0].tutor;
    const connectId = tutor.stripeConnectAccountId;
    const paypalEmail = tutor.tutorPaymentMethod?.type === "PAYPAL" ? tutor.tutorPaymentMethod.email : null;

    if (!connectId && !paypalEmail) {
      results.push({ tutorId, amount: 0, currency: "TND", method: "none", error: "No payout method (no Stripe Connect, no PayPal)" });
      continue;
    }

    const currencyPref = (tutor.tutorCompensation?.currencyPref ?? "TND") as Currency;
    const totalAmount = bookings.reduce((sum, b) => sum + (b.tutorPayoutAmount ?? 0), 0);

    // Period = actual range of session dates (not a fixed 7-day window)
    const sessionTimes = bookings.map(b => b.scheduledAt.getTime());
    const periodStart = new Date(Math.min(...sessionTimes));
    const periodEnd   = new Date(Math.max(...sessionTimes));

    const amountUsdCents = Math.round(totalAmount * 100);
    if (amountUsdCents < 100) {
      results.push({ tutorId, amount: totalAmount, currency: currencyPref, method: "none", error: "Below minimum payout ($1 USD)" });
      continue;
    }

    // ── Stripe Connect payout ──
    if (connectId) {
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
            periodEnd,
            initiatedAt: now,
            completedAt: now,
          },
        });

        await db.notification.create({
          data: {
            userId: tutorId,
            type: "PAYOUT_PROCESSED",
            title: "Virement traité",
            body: `Votre virement de ${totalAmount.toFixed(2)} ${currencyPref} pour ${bookings.length} séance(s) a été envoyé.`,
            link: `/dashboard/tutor/earnings`,
          },
        });

        results.push({ tutorId, amount: totalAmount, currency: currencyPref, method: "stripe", transferId: transfer.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const failedPayout = await db.payout.create({
          data: {
            tutorId,
            amount: totalAmount,
            currency: currencyPref,
            sessionCount: bookings.length,
            status: "FAILED",
            periodStart,
            periodEnd,
            failureReason: message,
          },
        });
        await db.booking.updateMany({
          where: { id: { in: bookings.map((b) => b.id) } },
          data: { stripeTransferId: `FAILED_${failedPayout.id}` },
        });
        results.push({ tutorId, amount: totalAmount, currency: currencyPref, method: "stripe", error: message });
      }
    }

    // ── PayPal payout (fallback when no Stripe Connect) ──
    else if (paypalEmail) {
      const bookingIds = bookings.map((b) => b.id).join("-").slice(0, 40);
      try {
        const payout = await sendPayPalPayout({
          recipientEmail: paypalEmail,
          amountUsd:      totalAmount,
          note:           `WithYou payout — ${bookings.length} séance(s)`,
          senderItemId:   bookingIds,
        });

        // Store the PayPal batch ID in stripeTransferId field (prefixed)
        const paypalRef = `PAYPAL_${payout.batchId}`;
        await db.booking.updateMany({
          where: { id: { in: bookings.map((b) => b.id) } },
          data: { stripeTransferId: paypalRef },
        });

        await db.payout.create({
          data: {
            tutorId,
            amount: totalAmount,
            currency: currencyPref,
            stripeTransferId: paypalRef,
            sessionCount: bookings.length,
            status: "PAID",
            periodStart,
            periodEnd,
            initiatedAt: now,
            completedAt: now,
          },
        });

        await db.notification.create({
          data: {
            userId: tutorId,
            type: "PAYOUT_PROCESSED",
            title: "Virement traité",
            body: `Votre virement PayPal de ${totalAmount.toFixed(2)} ${currencyPref} pour ${bookings.length} séance(s) a été envoyé.`,
            link: `/dashboard/tutor/earnings`,
          },
        });

        results.push({ tutorId, amount: totalAmount, currency: currencyPref, method: "paypal", transferId: payout.batchId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const failedPayout = await db.payout.create({
          data: {
            tutorId,
            amount: totalAmount,
            currency: currencyPref,
            sessionCount: bookings.length,
            status: "FAILED",
            periodStart,
            periodEnd,
            failureReason: message,
          },
        });
        await db.booking.updateMany({
          where: { id: { in: bookings.map((b) => b.id) } },
          data: { stripeTransferId: `FAILED_${failedPayout.id}` },
        });
        results.push({ tutorId, amount: totalAmount, currency: currencyPref, method: "paypal", error: message });
      }
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
