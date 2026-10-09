import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendBookingConfirmationEmail } from "@/lib/email";

/**
 * Stripe webhook — handles payment_intent.succeeded as a safety net for
 * bookings where the browser closed before the client could call POST /api/bookings.
 *
 * Set STRIPE_WEBHOOK_SECRET to the signing secret from the Stripe dashboard
 * (Developers → Webhooks → your endpoint → "Signing secret").
 *
 * Events to enable in the Stripe dashboard:
 *   payment_intent.succeeded
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET is not set — skipping all events.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await handlePaymentIntentSucceeded(pi).catch((err) => {
      // Log but don't return 500 — Stripe would retry and we'd create duplicates.
      // The unique constraint on stripePaymentIntentId prevents duplicates anyway.
      console.error("[Webhook] handlePaymentIntentSucceeded error:", err);
    });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const {
    studentId,
    tutorId,
    scheduledAt,
    sessionType,
    creditAppliedTnd: creditStr,
  } = pi.metadata;

  if (!studentId || !tutorId || !scheduledAt) {
    // Payment not from the booking flow (e.g. test event) — ignore safely.
    console.warn("[Webhook] payment_intent.succeeded missing booking metadata:", pi.id);
    return;
  }

  // Idempotency: booking may already exist (created by the browser flow).
  const existing = await db.booking.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });
  if (existing) return;

  const slotDate          = new Date(scheduledAt);
  const type              = (sessionType ?? "DISCOVERY") as "DISCOVERY" | "SINGLE";
  const durationMins      = type === "SINGLE" ? 50 : 30;
  const studentPriceUsd   = pi.amount / 100;
  const creditAppliedTnd  = parseFloat(creditStr ?? "0") || 0;

  // Tutor payout (mirror logic from POST /api/bookings)
  const tutorComp = await db.tutorCompensation.findUnique({
    where: { userId: tutorId },
    select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true },
  });
  const tutorCurrencyPref = tutorComp?.currencyPref ?? "TND";
  const hourlyRate        = tutorCurrencyPref === "CAD"
    ? (tutorComp?.hourlyRateCad ?? 0)
    : (tutorComp?.hourlyRateTnd ?? 0);
  const tutorPayoutAmount = hourlyRate > 0
    ? Math.round((hourlyRate * (durationMins / 60)) * 100) / 100
    : Math.round(studentPriceUsd * 0.70 * 100) / 100;
  const platformMargin    = Math.round((studentPriceUsd - tutorPayoutAmount) * 100) / 100;

  // Atomic: create booking + deduct credits (unique constraint guards against races)
  const [booking] = await db.$transaction([
    db.booking.create({
      data: {
        studentId,
        tutorId,
        sessionType: type,
        status:      "CONFIRMED",
        durationMins,
        scheduledAt: slotDate,
        studentPriceUsd,
        studentCurrency:    "USD",
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
          data:  { platformCreditBalance: { decrement: creditAppliedTnd } },
        })]
      : []),
  ]);

  // Confirmation email (non-blocking)
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
      tutorEmail:   tutorUser.email,
      scheduledAt:  slotDate,
      durationMins: booking.durationMins,
      bookingId:    booking.id,
      meetingUrl:   null,
    }).catch(console.error);
  }
}
