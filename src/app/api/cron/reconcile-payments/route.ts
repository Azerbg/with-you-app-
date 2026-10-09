import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendBookingConfirmationEmail } from "@/lib/email";

/**
 * Reconciliation cron — runs daily.
 * Scans payment_intent.succeeded events from the last 48 h and creates any
 * missing bookings (e.g. webhook was missed or the browser closed after
 * payment but before POST /api/bookings).
 *
 * Add to vercel.json:
 *   { "path": "/api/cron/reconcile-payments", "schedule": "0 3 * * *" }
 *
 * Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = Math.floor(Date.now() / 1000) - 48 * 3600; // last 48 h
  let created = 0;
  let skipped = 0;
  let alerts = 0;

  try {
    const events = await stripe.events.list({
      type: "payment_intent.succeeded",
      limit: 100,
      created: { gte: since },
    });

    for (const event of events.data) {
      const pi = event.data.object as Stripe.PaymentIntent;

      const existing = await db.booking.findFirst({
        where: { stripePaymentIntentId: pi.id },
      });
      if (existing) { skipped++; continue; }

      const { studentId, tutorId, scheduledAt, sessionType, creditAppliedTnd: creditStr } = pi.metadata;
      if (!studentId || !tutorId || !scheduledAt) {
        console.warn(`[reconcile] PI ${pi.id} has no booking metadata — skipping`);
        alerts++;
        continue;
      }

      try {
        const slotDate         = new Date(scheduledAt);
        const type             = (sessionType ?? "DISCOVERY") as "DISCOVERY" | "SINGLE";
        const durationMins     = type === "SINGLE" ? 50 : 30;
        const studentPriceUsd  = pi.amount_received / 100;
        const creditAppliedTnd = parseFloat(creditStr ?? "0") || 0;

        const tutorComp = await db.tutorCompensation.findUnique({
          where: { userId: tutorId },
          select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true },
        });
        const tutorCurrencyPref = tutorComp?.currencyPref ?? "TND";
        const hourlyRate = tutorCurrencyPref === "CAD"
          ? (tutorComp?.hourlyRateCad ?? 0)
          : (tutorComp?.hourlyRateTnd ?? 0);
        const tutorPayoutAmount = hourlyRate > 0
          ? Math.round((hourlyRate * (durationMins / 60)) * 100) / 100
          : Math.round(studentPriceUsd * 0.70 * 100) / 100;
        const platformMargin = Math.round((studentPriceUsd - tutorPayoutAmount) * 100) / 100;

        const [booking] = await db.$transaction([
          db.booking.create({
            data: {
              studentId, tutorId,
              sessionType: type,
              status: "CONFIRMED",
              durationMins,
              scheduledAt: slotDate,
              studentPriceUsd,
              studentCurrency: "USD",
              tutorPayoutAmount,
              tutorCurrency: tutorCurrencyPref as "USD" | "CAD" | "EUR" | "TND",
              platformMargin,
              stripePaymentIntentId: pi.id,
              creditAppliedTnd,
            },
          }),
          ...(creditAppliedTnd > 0
            ? [db.user.update({
                where: { id: studentId },
                data: { platformCreditBalance: { decrement: creditAppliedTnd } },
              })]
            : []),
        ]);

        const [student, tutorUser] = await Promise.all([
          db.user.findUnique({ where: { id: studentId }, select: { email: true } }),
          db.user.findUnique({
            where: { id: tutorId },
            select: { email: true, hrApplication: { select: { fullName: true } } },
          }),
        ]);
        if (student?.email && tutorUser) {
          sendBookingConfirmationEmail({
            studentEmail: student.email,
            tutorEmail: tutorUser.email,
            scheduledAt: slotDate,
            durationMins: booking.durationMins,
            bookingId: booking.id,
            meetingUrl: null,
          }).catch(console.error);
        }

        revalidatePath("/dashboard/student");
        revalidatePath("/dashboard/student/sessions");
        revalidatePath("/dashboard/student/billing");
        revalidatePath("/dashboard/tutor");
        revalidatePath("/dashboard/tutor/sessions");
        created++;
        console.log(`[reconcile] Created missing booking for PI ${pi.id}, student ${studentId}`);
      } catch (err) {
        console.error(`[reconcile] Failed to create booking for PI ${pi.id}:`, err instanceof Error ? err.message : err);
        alerts++;
      }
    }
  } catch (err) {
    console.error("[reconcile] Stripe events fetch failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 502 });
  }

  return NextResponse.json({ created, skipped, alerts });
}
