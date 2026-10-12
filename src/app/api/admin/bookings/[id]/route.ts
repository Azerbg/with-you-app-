import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true, status: true, sessionType: true,
      studentPriceUsd: true, studentCurrency: true,
      tutorPayoutAmount: true, tutorCurrency: true,
      platformMargin: true, durationMins: true,
      scheduledAt: true, startedAt: true, endedAt: true,
      createdAt: true, updatedAt: true,
      paymentProvider: true, stripePaymentIntentId: true,
      stripeTransferId: true, paypalOrderId: true, paypalCaptureId: true,
      cancelledAt: true, cancelledBy: true, cancellationReason: true,
      noShowReportedAt: true, noShowReportedBy: true,
      creditAppliedTnd: true,
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      tutor:   { select: { id: true, email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      disputes: { select: { id: true, type: true, status: true, description: true, createdAt: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...booking,
    scheduledAt: booking.scheduledAt?.toISOString() ?? null,
    startedAt:   booking.startedAt?.toISOString() ?? null,
    endedAt:     booking.endedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    noShowReportedAt: booking.noShowReportedAt?.toISOString() ?? null,
    createdAt:   booking.createdAt.toISOString(),
    updatedAt:   booking.updatedAt.toISOString(),
    disputes: booking.disputes.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { action, reason } = await req.json() as { action: string; reason?: string };

  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, status: true, paymentProvider: true, stripePaymentIntentId: true, paypalCaptureId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "CANCEL") {
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot cancel this booking" }, { status: 422 });
    }
    await db.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "ADMIN", cancellationReason: reason ?? null },
    });
    db.auditLog.create({ data: { actorId: session!.user.id, action: "CANCEL_BOOKING", targetEntity: "Booking", targetId: id, reason: reason ?? undefined } }).catch(() => {});
  }

  if (action === "NO_SHOW") {
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Only confirmed bookings can be marked no-show" }, { status: 422 });
    }
    await db.booking.update({
      where: { id },
      data: { status: "NO_SHOW", noShowReportedAt: new Date(), noShowReportedBy: "ADMIN" },
    });
    db.auditLog.create({ data: { actorId: session!.user.id, action: "MARK_NO_SHOW", targetEntity: "Booking", targetId: id, reason: reason ?? undefined } }).catch(() => {});
  }

  if (action === "REFUND") {
    // Attempt refund via payment provider
    let refundResult: { ok: boolean; error?: string } = { ok: false, error: "No payment ID found" };

    if (booking.paymentProvider === "stripe" && booking.stripePaymentIntentId) {
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
        refundResult = { ok: true };
      } catch (e) {
        refundResult = { ok: false, error: e instanceof Error ? e.message : "Stripe refund failed" };
      }
    } else if (booking.paymentProvider === "paypal" && booking.paypalCaptureId) {
      // PayPal refunds require the capture ID
      try {
        const { refundPayPalCapture } = await import("@/lib/paypal");
        await refundPayPalCapture(booking.paypalCaptureId);
        refundResult = { ok: true };
      } catch (e) {
        refundResult = { ok: false, error: e instanceof Error ? e.message : "PayPal refund failed" };
      }
    }

    if (!refundResult.ok) {
      return NextResponse.json({ error: refundResult.error }, { status: 502 });
    }

    await db.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "ADMIN", cancellationReason: reason ?? "Refunded by admin" },
    });
    db.auditLog.create({ data: { actorId: session!.user.id, action: "REFUND_BOOKING", targetEntity: "Booking", targetId: id, reason: reason ?? undefined } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
