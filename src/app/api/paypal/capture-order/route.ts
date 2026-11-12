import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capturePayPalOrder, refundPayPalCapture } from "@/lib/paypal";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { DISCOVERY_SESSION_USD, STANDARD_SESSION_USD } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json() as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  // Capture the payment
  let captured: Awaited<ReturnType<typeof capturePayPalOrder>>;
  try {
    captured = await capturePayPalOrder(orderId);
  } catch (err) {
    console.error("[paypal/capture-order]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "PayPal capture failed" }, { status: 502 });
  }

  if (captured.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  // Parse custom_id: "studentId|tutorId|scheduledAt|sessionType"
  const parts = captured.customId.split("|");
  if (parts.length !== 4) {
    return NextResponse.json({ error: "Invalid order metadata" }, { status: 400 });
  }
  const [studentId, tutorId, scheduledAt, sessionType] = parts;

  // Security: verify captured amount matches expected price
  const expectedUsd = sessionType === "SINGLE" ? STANDARD_SESSION_USD : DISCOVERY_SESSION_USD;
  if (captured.amountUsd < expectedUsd - 0.02) {
    console.error(`[paypal/capture-order] Amount mismatch: captured $${captured.amountUsd}, expected $${expectedUsd} — refunding`);
    try { await refundPayPalCapture(captured.captureId); } catch { /* best effort */ }
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 402 });
  }

  // Security: captured payment must belong to this student
  if (studentId !== session.user.id) {
    return NextResponse.json({ error: "Payment mismatch" }, { status: 403 });
  }

  const slotDate = new Date(scheduledAt);

  // ── Path A: PENDING booking exists (normal flow) ────────────────────────────
  const pendingBooking = await db.booking.findFirst({
    where: { paypalOrderId: orderId, status: "PENDING" },
  });

  let booking;
  if (pendingBooking) {
    // Update the existing PENDING → CONFIRMED + store captureId
    booking = await db.booking.update({
      where: { id: pendingBooking.id },
      data: { status: "CONFIRMED", paypalCaptureId: captured.captureId },
    });
  } else {
    // ── Path B: Idempotency — already CONFIRMED ─────────────────────────────
    const existing = await db.booking.findUnique({ where: { paypalOrderId: orderId } });
    if (existing) return NextResponse.json(existing, { status: 200 });

    // ── Path C: Fallback — no PENDING found (legacy / edge case) ───────────
    const conflict = await db.booking.findFirst({
      where: { tutorId, scheduledAt: slotDate, status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (conflict) {
      try { await refundPayPalCapture(captured.captureId); } catch { /* best-effort */ }
      return NextResponse.json({ error: "Slot already booked — refund initiated" }, { status: 409 });
    }

    const sessionTyped = (sessionType === "SINGLE" ? "SINGLE" : "DISCOVERY") as "DISCOVERY" | "SINGLE";
    const rawDuration  = sessionTyped === "SINGLE" ? 50 : 30;
    const durationMins = Math.min(240, Math.max(15, rawDuration));
    const tutorComp = await db.tutorCompensation.findUnique({
      where:  { userId: tutorId },
      select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true },
    });
    const tutorCurrencyPref = tutorComp?.currencyPref ?? "TND";
    const hourlyRate        = tutorCurrencyPref === "CAD" ? (tutorComp?.hourlyRateCad ?? 0) : (tutorComp?.hourlyRateTnd ?? 0);
    const tutorPayoutAmount = hourlyRate > 0
      ? Math.round((hourlyRate * (durationMins / 60)) * 100) / 100
      : Math.round(captured.amountUsd * 0.70 * 100) / 100;
    const platformMargin = Math.round((captured.amountUsd - tutorPayoutAmount) * 100) / 100;

    booking = await db.booking.create({
      data: {
        studentId: session.user.id,
        tutorId,
        sessionType:      sessionTyped,
        status:           "CONFIRMED",
        durationMins,
        scheduledAt:      slotDate,
        studentPriceUsd:  captured.amountUsd,
        studentCurrency:  "USD",
        tutorPayoutAmount,
        tutorCurrency:    tutorCurrencyPref as "USD" | "CAD" | "EUR" | "TND",
        platformMargin,
        paymentProvider:  "paypal",
        paypalOrderId:    orderId,
        paypalCaptureId:  captured.captureId,
      },
    });
  }

  // Confirmation email (non-blocking)
  const [student, tutorUser] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { email: true } }),
    db.user.findUnique({ where: { id: tutorId }, select: { email: true, hrApplication: { select: { fullName: true } } } }),
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

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/sessions");
  revalidatePath("/dashboard/student/billing");
  revalidatePath("/dashboard/tutor");
  revalidatePath("/dashboard/tutor/sessions");

  return NextResponse.json(booking, { status: 201 });
}
