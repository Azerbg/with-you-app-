import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tutorId, scheduledAt, paymentIntentId } = body as {
    tutorId?: string;
    scheduledAt?: string;
    paymentIntentId?: string;
  };

  if (!tutorId || !scheduledAt || !paymentIntentId) {
    return NextResponse.json(
      { error: "tutorId, scheduledAt, and paymentIntentId are required" },
      { status: 400 },
    );
  }

  const slotDate = new Date(scheduledAt);

  // Verify the payment was successful
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
  }

  // Verify the payment metadata matches this booking
  if (
    paymentIntent.metadata.studentId !== session.user.id ||
    paymentIntent.metadata.tutorId !== tutorId ||
    paymentIntent.metadata.scheduledAt !== slotDate.toISOString()
  ) {
    return NextResponse.json({ error: "Payment metadata mismatch" }, { status: 400 });
  }

  // Idempotency: check if booking already created from this payment
  const existing = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  // Final check: slot not already taken
  const conflict = await db.booking.findFirst({
    where: {
      tutorId,
      scheduledAt: slotDate,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
  }

  // Read session type and amount from PaymentIntent metadata
  const sessionType = (paymentIntent.metadata.sessionType ?? "DISCOVERY") as "DISCOVERY" | "SINGLE";
  const rawDuration = sessionType === "SINGLE" ? 50 : 30;
  // Clamp to valid range (15–240 min) to prevent bad data
  const durationMins = Math.min(240, Math.max(15, rawDuration));
  const studentPriceUsd = paymentIntent.amount / 100;
  const creditAppliedTnd = parseFloat(paymentIntent.metadata.creditAppliedTnd ?? "0") || 0;

  // Calculate tutor payout from their compensation rate
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
    : Math.round(studentPriceUsd * 0.70 * 100) / 100; // fallback: 70% of student price
  const platformMargin = Math.round((studentPriceUsd - tutorPayoutAmount) * 100) / 100;

  // Create booking (+ deduct credits atomically)
  const [booking] = await db.$transaction([
    db.booking.create({
      data: {
        studentId: session.user.id,
        tutorId,
        sessionType,
        status: "CONFIRMED",
        durationMins,
        scheduledAt: slotDate,
        studentPriceUsd,
        studentCurrency: "USD",
        tutorPayoutAmount,
        tutorCurrency: tutorCurrencyPref as "USD" | "CAD" | "EUR" | "TND",
        platformMargin,
        stripePaymentIntentId: paymentIntentId,
        creditAppliedTnd,
      },
    }),
    ...(creditAppliedTnd > 0
      ? [db.user.update({
          where: { id: session.user.id },
          data: { platformCreditBalance: { decrement: creditAppliedTnd } },
        })]
      : []),
  ]);

  // Send confirmation email (non-blocking)
  const [student, tutorUser] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    }),
    db.user.findUnique({
      where: { id: tutorId },
      select: {
        email: true,
        hrApplication: { select: { fullName: true } },
      },
    }),
  ]);

  if (student?.email && tutorUser) {
    const tutorName = tutorUser.hrApplication?.fullName ?? "Votre tuteur";

    sendBookingConfirmationEmail({
      studentEmail: student.email,
      tutorEmail: tutorUser.email,
      scheduledAt: slotDate,
      durationMins: booking.durationMins,
      bookingId: booking.id,
      meetingUrl: null,
    }).catch(console.error);
  }

  return NextResponse.json(booking, { status: 201 });
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await db.booking.findMany({
    where: { studentId: session.user.id },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      status: true,
      sessionType: true,
      scheduledAt: true,
      durationMins: true,
      studentPriceUsd: true,
      studentCurrency: true,
      cancelledAt: true,
      cancelledBy: true,
      reviewLeft: true,
      tutor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  return NextResponse.json(bookings);
}
