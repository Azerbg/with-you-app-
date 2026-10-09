import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { generateAvailableSlots } from "@/lib/slots";
import { DISCOVERY_SESSION_CENTS, STANDARD_SESSION_CENTS } from "@/lib/pricing";
import { resolveStripeCustomer, friendlyStripeError } from "@/lib/stripe-customer";

const schema = z.object({
  tutorId:     z.string().min(1),
  scheduledAt: z.string().min(1),
  sessionType: z.enum(["DISCOVERY", "SINGLE"]).default("DISCOVERY"),
  saveCard:    z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { tutorId, scheduledAt, sessionType, saveCard } = parsed.data;

  const slotDate = new Date(scheduledAt);
  if (isNaN(slotDate.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  // Fetch tutor profile with availability + tier
  const profile = await db.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: {
      user: { select: { hrApplication: { select: { status: true } } } },
      availability: true,
    },
  });

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
  }

  // Validate the requested slot is available
  const existingBookings = await db.booking.findMany({
    where: {
      tutorId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: new Date() },
    },
    select: { scheduledAt: true },
  });

  const slots = generateAvailableSlots(
    profile.availability,
    existingBookings.map((b) => b.scheduledAt),
    21,
  );

  const isValid = slots.some((s) => s.utc.toISOString() === slotDate.toISOString());
  if (!isValid) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  // For DISCOVERY: only allow if student has no prior session of any type with this tutor
  if (sessionType === "DISCOVERY") {
    const existingSession = await db.booking.findFirst({
      where: {
        studentId: session.user.id,
        tutorId,
        status: { not: "CANCELLED" },
      },
    });
    if (existingSession) {
      return NextResponse.json(
        { error: "Discovery sessions are only available for new tutor relationships" },
        { status: 409 },
      );
    }
  }

  // Compute price (shared with booking UI via lib/pricing.ts)
  const baseCents = sessionType === "DISCOVERY" ? DISCOVERY_SESSION_CENTS : STANDARD_SESSION_CENTS;

  // Apply platform credits (TND → USD cents, fixed rate: 1 TND = 32 cents)
  const TND_TO_CENTS = 32;
  const student = await db.user.findUnique({
    where: { id: session.user.id },
    select: { platformCreditBalance: true },
  });
  const creditBalanceTnd = student?.platformCreditBalance ?? 0;
  // Max discount: keep at least $0.50 for Stripe minimum
  const maxDiscountCents = Math.max(baseCents - 50, 0);
  const creditDiscountCents = Math.min(Math.floor(creditBalanceTnd * TND_TO_CENTS), maxDiscountCents);
  const creditAppliedTnd = creditDiscountCents > 0 ? creditDiscountCents / TND_TO_CENTS : 0;
  const amountCents = baseCents - creditDiscountCents;

  try {
    const stripeCustomerId = await resolveStripeCustomer({
      userId: session.user.id,
      email: session.user.email,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      ...(saveCard ? { setup_future_usage: "off_session" } : {}),
      metadata: {
        studentId: session.user.id,
        tutorId,
        scheduledAt: slotDate.toISOString(),
        sessionType,
        amountCents: String(amountCents),
        creditAppliedTnd: String(creditAppliedTnd),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountUsd: amountCents / 100,
      baseAmountUsd: baseCents / 100,
      creditAppliedTnd,
      sessionType,
    });
  } catch (err) {
    console.error("[payment-intent] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: friendlyStripeError() }, { status: 502 });
  }
}
