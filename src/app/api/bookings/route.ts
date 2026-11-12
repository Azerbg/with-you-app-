import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  const { tutorId: bodyTutorId, scheduledAt: bodyScheduledAt, paymentIntentId } = body as {
    tutorId?: string;
    scheduledAt?: string;
    paymentIntentId?: string;
  };

  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
  }

  // Retrieve PI first — needed for metadata fallback (redirect-payment return flow)
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "Invalid payment intent ID" }, { status: 400 });
  }

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
  }

  // When tutorId/scheduledAt are not supplied (redirect return), derive from PI metadata
  const tutorId = bodyTutorId ?? paymentIntent.metadata.tutorId;
  const scheduledAt = bodyScheduledAt ?? paymentIntent.metadata.scheduledAt;

  if (!tutorId || !scheduledAt) {
    return NextResponse.json({ error: "Missing booking parameters" }, { status: 400 });
  }

  const slotDate = new Date(scheduledAt);

  // Verify the payment belongs to this student
  if (paymentIntent.metadata.studentId !== session.user.id) {
    return NextResponse.json({ error: "Payment metadata mismatch" }, { status: 400 });
  }

  // ── Path A: PENDING booking already exists (normal flow) ────────────────────
  // The payment-intent route pre-created it to hold the slot.
  const pendingBooking = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntentId, status: "PENDING" },
  });

  if (pendingBooking) {
    const creditAppliedTnd = parseFloat(paymentIntent.metadata.creditAppliedTnd ?? "0") || 0;
    // Atomically confirm + deduct credits
    const [booking] = await db.$transaction([
      db.booking.update({
        where: { id: pendingBooking.id },
        data: { status: "CONFIRMED" },
      }),
      ...(creditAppliedTnd > 0
        ? [db.user.update({
            where: { id: session.user.id },
            data: { platformCreditBalance: { decrement: creditAppliedTnd } },
          })]
        : []),
    ]);
    // Notify + revalidate below (fall-through using the booking variable)
    return await finalizeBooking({ booking, session, paymentIntent });
  }

  // ── Path B: Idempotency — booking already CONFIRMED (double call / webhook race) ─
  const alreadyConfirmed = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (alreadyConfirmed) return NextResponse.json(alreadyConfirmed, { status: 200 });

  // ── Path C: Fallback — no PENDING booking (legacy / redirect flow) ───────────
  // Should not happen in normal flow, but handles edge cases.
  const conflict = await db.booking.findFirst({
    where: { tutorId, scheduledAt: slotDate, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  if (conflict) return NextResponse.json({ error: "Slot already booked" }, { status: 409 });

  const sessionType = (paymentIntent.metadata.sessionType ?? "DISCOVERY") as "DISCOVERY" | "SINGLE";
  const rawDuration = sessionType === "SINGLE" ? 50 : 30;
  const durationMins = Math.min(240, Math.max(15, rawDuration));
  const studentPriceUsd = paymentIntent.amount / 100;
  const creditAppliedTnd = parseFloat(paymentIntent.metadata.creditAppliedTnd ?? "0") || 0;

  const tutorComp = await db.tutorCompensation.findUnique({
    where: { userId: tutorId },
    select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true },
  });
  const tutorCurrencyPref = tutorComp?.currencyPref ?? "TND";
  const hourlyRate = tutorCurrencyPref === "CAD" ? (tutorComp?.hourlyRateCad ?? 0) : (tutorComp?.hourlyRateTnd ?? 0);
  const tutorPayoutAmount = hourlyRate > 0
    ? Math.round((hourlyRate * (durationMins / 60)) * 100) / 100
    : Math.round(studentPriceUsd * 0.70 * 100) / 100;
  const platformMargin = Math.round((studentPriceUsd - tutorPayoutAmount) * 100) / 100;

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

  return await finalizeBooking({ booking, session, paymentIntent });
}

// ── Shared: send email + revalidate + return response ───────────────────────
import type { Session } from "next-auth";
import type Stripe from "stripe";

async function finalizeBooking({
  booking,
  session,
  paymentIntent,
}: {
  booking: { id: string; tutorId: string; scheduledAt: Date; durationMins: number };
  session: Session;
  paymentIntent: Stripe.PaymentIntent;
}) {
  const tutorId = booking.tutorId;
  const [student, tutorUser] = await Promise.all([
    db.user.findUnique({ where: { id: session.user!.id }, select: { email: true } }),
    db.user.findUnique({ where: { id: tutorId }, select: { email: true, hrApplication: { select: { fullName: true } } } }),
  ]);

  if (student?.email && tutorUser) {
    sendBookingConfirmationEmail({
      studentEmail: student.email,
      tutorEmail: tutorUser.email,
      scheduledAt: booking.scheduledAt,
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

  return NextResponse.json(booking, { status: 201 });
}

export async function GET() {
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
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  return NextResponse.json(bookings);
}
