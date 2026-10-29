import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyPayPalWebhook, refundPayPalCapture } from "@/lib/paypal";
import { sendBookingConfirmationEmail } from "@/lib/email";

// PayPal requires the raw body for signature verification — disable body parsing.
export const runtime = "nodejs";

/** Mask an email for display */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}•••@${domain}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal/webhook] PAYPAL_WEBHOOK_ID is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Build headers map (lower-case keys for consistent lookup)
  const headersMap: Record<string, string> = {};
  for (const [k, v] of req.headers.entries()) headersMap[k.toLowerCase()] = v;

  const isValid = await verifyPayPalWebhook({ headers: headersMap, body, webhookId });
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  type PayPalEvent = { id: string; event_type: string; resource: Record<string, unknown> };
  const event = JSON.parse(body) as PayPalEvent;

  // ── Idempotency: skip already-processed events ────────────────────────────────
  if (event.id) {
    const already = await db.paypalWebhookEvent.findUnique({ where: { id: event.id } }).catch(() => null);
    if (already) return NextResponse.json({ received: true });

    await db.paypalWebhookEvent.create({
      data: { id: event.id, eventType: event.event_type },
    }).catch(() => {});
  }

  // ── PAYMENT.CAPTURE.COMPLETED ────────────────────────────────────────────────
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = event.resource as {
      id:     string;
      amount: { value: string };
      custom_id: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
    };

    const captureId = resource.id;
    const orderId   = resource.supplementary_data?.related_ids?.order_id ?? "";
    const customId  = resource.custom_id ?? "";
    const amountUsd = parseFloat(resource.amount?.value ?? "0");

    if (!orderId || !customId) return NextResponse.json({ received: true });

    // Idempotency: skip if booking already created (e.g. by capture-order route)
    const alreadyBooked = await db.booking.findUnique({ where: { paypalOrderId: orderId } }).catch(() => null);
    if (alreadyBooked) return NextResponse.json({ received: true });

    const parts = customId.split("|");
    if (parts.length !== 4) return NextResponse.json({ received: true });

    const [studentId, tutorId, scheduledAt, sessionType] = parts;
    const slotDate = new Date(scheduledAt);

    // Check slot conflict
    const conflict = await db.booking.findFirst({
      where: { tutorId, scheduledAt: slotDate, status: { in: ["PENDING", "CONFIRMED"] } },
    }).catch(() => null);

    if (conflict) {
      try { await refundPayPalCapture(captureId); } catch { /* best effort */ }
      return NextResponse.json({ received: true });
    }

    const sessionTyped  = (sessionType === "SINGLE" ? "SINGLE" : "DISCOVERY") as "DISCOVERY" | "SINGLE";
    const rawDuration   = sessionTyped === "SINGLE" ? 50 : 30;
    const durationMins  = Math.min(240, Math.max(15, rawDuration));

    const tutorComp = await db.tutorCompensation.findUnique({
      where:  { userId: tutorId },
      select: { hourlyRateTnd: true, hourlyRateCad: true, currencyPref: true },
    }).catch(() => null);

    const tutorCurrencyPref = tutorComp?.currencyPref ?? "TND";
    const hourlyRate        = tutorCurrencyPref === "CAD" ? (tutorComp?.hourlyRateCad ?? 0) : (tutorComp?.hourlyRateTnd ?? 0);
    const tutorPayoutAmount = hourlyRate > 0
      ? Math.round((hourlyRate * (durationMins / 60)) * 100) / 100
      : Math.round(amountUsd * 0.70 * 100) / 100;
    const platformMargin = Math.round((amountUsd - tutorPayoutAmount) * 100) / 100;

    try {
      const booking = await db.booking.create({
        data: {
          studentId,
          tutorId,
          sessionType:      sessionTyped,
          status:           "CONFIRMED",
          durationMins,
          scheduledAt:      slotDate,
          studentPriceUsd:  amountUsd,
          studentCurrency:  "USD",
          tutorPayoutAmount,
          tutorCurrency:    tutorCurrencyPref as "USD" | "CAD" | "EUR" | "TND",
          platformMargin,
          paymentProvider:  "paypal",
          paypalOrderId:    orderId,
          paypalCaptureId:  captureId,
        },
      });

      const [student, tutorUser] = await Promise.all([
        db.user.findUnique({ where: { id: studentId }, select: { email: true } }),
        db.user.findUnique({ where: { id: tutorId },   select: { email: true, hrApplication: { select: { fullName: true } } } }),
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
    } catch (err) {
      console.error("[paypal/webhook] booking create failed:", err instanceof Error ? err.message : err);
    }
  }

  // ── PAYMENT.CAPTURE.DENIED ───────────────────────────────────────────────────
  if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
    const resource = event.resource as {
      supplementary_data?: { related_ids?: { order_id?: string } };
    };
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    if (orderId) {
      // Mark any PENDING booking as CANCELLED so the student is notified
      await db.booking.updateMany({
        where: { paypalOrderId: orderId, status: "PENDING" },
        data:  { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "SYSTEM", cancellationReason: "PAYMENT_DENIED" },
      }).catch(() => {});
    }
  }

  // ── PAYMENT.CAPTURE.REFUNDED ─────────────────────────────────────────────────
  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
    const resource = event.resource as {
      supplementary_data?: { related_ids?: { order_id?: string } };
    };
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    if (orderId) {
      await db.booking.updateMany({
        where: { paypalOrderId: orderId, status: { not: "CANCELLED" } },
        data:  { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "SYSTEM" },
      }).catch(() => {});
      revalidatePath("/dashboard/student/sessions");
    }
  }

  // ── VAULT.PAYMENT-TOKEN.CREATED ──────────────────────────────────────────────
  // Sync: if created via another channel, ensure a DB record exists.
  if (event.event_type === "VAULT.PAYMENT-TOKEN.CREATED") {
    const resource = event.resource as {
      id:             string;
      customer?:      { id?: string };
      payment_source?: { paypal?: { email_address?: string; customer?: { id?: string } } };
      metadata?:      { order_id?: string };
    };

    const vaultId    = resource.id;
    const customerId = resource.customer?.id ?? resource.payment_source?.paypal?.customer?.id ?? "";
    const email      = resource.payment_source?.paypal?.email_address ?? "";

    if (vaultId && customerId) {
      // Check if we already have it (created via /api/paypal/payment-token)
      const existing = await db.studentPaymentMethod.findFirst({
        where: { providerRef: vaultId, deletedAt: null },
      }).catch(() => null);

      if (!existing) {
        // Try to locate the user from the PayPal customer id
        const user = await db.studentPaymentMethod.findFirst({
          where: { paypalCustomerId: customerId, deletedAt: null },
          select: { userId: true },
        }).catch(() => null);

        if (user?.userId) {
          await db.studentPaymentMethod.create({
            data: {
              userId:          user.userId,
              provider:        "paypal",
              type:            "paypal",
              providerRef:     vaultId,
              paypalCustomerId: customerId,
              displayLabel:    email ? maskEmail(email) : "PayPal",
              isDefault:       false,
            },
          }).catch(() => {});
        }
      }
    }
  }

  // ── VAULT.PAYMENT-TOKEN.DELETED ──────────────────────────────────────────────
  if (event.event_type === "VAULT.PAYMENT-TOKEN.DELETED") {
    const resource = event.resource as { id?: string };
    const vaultId = resource.id;
    if (vaultId) {
      await db.studentPaymentMethod.updateMany({
        where: { providerRef: vaultId, deletedAt: null },
        data:  { deletedAt: new Date(), isDefault: false },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
