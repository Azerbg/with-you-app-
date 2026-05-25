import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { reason } = await req.json() as { reason?: string };

  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only student or tutor on this booking can cancel
  const uid = session.user.id;
  if (booking.studentId !== uid && booking.tutorId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  const now = new Date();
  const sessionStart = new Date(booking.scheduledAt);
  const hoursUntil = (sessionStart.getTime() - now.getTime()) / 3_600_000;

  // Cancellation policy: >24h = full refund, <24h = credit only
  let refundType: "FULL" | "CREDIT" | "NONE" = "NONE";
  if (booking.stripePaymentIntentId) {
    refundType = hoursUntil >= 24 ? "FULL" : "CREDIT";
  }

  // Process refund or credit
  if (refundType === "FULL" && booking.stripePaymentIntentId) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover" as import("stripe").Stripe.LatestApiVersion,
    });
    await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
  } else if (refundType === "CREDIT" && booking.studentPriceUsd) {
    await db.user.update({
      where: { id: booking.studentId },
      data: { platformCreditBalance: { increment: booking.studentPriceUsd } },
    });
  }

  await db.booking.update({
    where: { id },
    data: {
      status:             "CANCELLED",
      cancelledAt:        now,
      cancelledBy:        booking.studentId === uid ? "STUDENT" : "TUTOR",
      cancellationReason: reason,
    },
  });

  return NextResponse.json({ success: true, refundType });
}
