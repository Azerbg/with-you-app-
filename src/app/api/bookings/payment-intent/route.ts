import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { generateAvailableSlots } from "@/lib/slots";

// Pricing by session type + tutor tier (in USD cents)
const DISCOVERY_PRICE_CENTS = 1500; // $15.00 — fixed regardless of tier

const SINGLE_PRICE_CENTS: Record<string, number> = {
  BASIC:     2500, // $25.00
  VERIFIED:  3000, // $30.00
  TOP_TUTOR: 3500, // $35.00
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tutorId, scheduledAt, sessionType = "DISCOVERY" } = body as {
    tutorId?: string;
    scheduledAt?: string;
    sessionType?: "DISCOVERY" | "SINGLE";
  };

  if (!tutorId || !scheduledAt) {
    return NextResponse.json({ error: "tutorId and scheduledAt are required" }, { status: 400 });
  }

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

  // For DISCOVERY: enforce 1-per-tutor limit
  if (sessionType === "DISCOVERY") {
    const existing = await db.booking.findFirst({
      where: {
        studentId: session.user.id,
        tutorId,
        sessionType: "DISCOVERY",
        status: { not: "CANCELLED" },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already booked a discovery session with this tutor" },
        { status: 409 },
      );
    }
  }

  // Compute price
  const amountCents =
    sessionType === "DISCOVERY"
      ? DISCOVERY_PRICE_CENTS
      : (SINGLE_PRICE_CENTS[profile.verificationTier] ?? SINGLE_PRICE_CENTS.BASIC);

  // Get or create Stripe customer
  let stripeCustomerId = (
    await db.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
  )?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;
    await db.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId },
    });
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    metadata: {
      studentId: session.user.id,
      tutorId,
      scheduledAt: slotDate.toISOString(),
      sessionType,
      amountCents: String(amountCents),
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountUsd: amountCents / 100,
    sessionType,
  });
}
