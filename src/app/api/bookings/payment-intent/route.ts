import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { generateAvailableSlots } from "@/lib/slots";

// Discovery session fixed price in cents
const DISCOVERY_PRICE_USD_CENTS = 1500; // $15.00

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tutorId, scheduledAt } = body as { tutorId?: string; scheduledAt?: string };

  if (!tutorId || !scheduledAt) {
    return NextResponse.json({ error: "tutorId and scheduledAt are required" }, { status: 400 });
  }

  const slotDate = new Date(scheduledAt);
  if (isNaN(slotDate.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  // Fetch tutor profile with availability
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

  // Check the requested slot is actually available
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
    14,
  );

  const isValid = slots.some(
    (s) => s.utc.toISOString() === slotDate.toISOString(),
  );

  if (!isValid) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  // Check student hasn't already had a discovery session with this tutor
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
    amount: DISCOVERY_PRICE_USD_CENTS,
    currency: "usd",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    metadata: {
      studentId: session.user.id,
      tutorId,
      scheduledAt: slotDate.toISOString(),
      sessionType: "DISCOVERY",
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
