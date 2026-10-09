import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const REFERRER_CREDIT = 15; // TND
const REFERRED_CREDIT = 10; // TND

async function triggerReferralReward(studentId: string) {
  const referral = await db.referral.findUnique({
    where: { referredId: studentId },
    select: { id: true, referrerId: true, status: true },
  });
  if (!referral || referral.status !== "PENDING") return;

  const completedCount = await db.booking.count({
    where: { studentId, status: "COMPLETED" },
  });
  if (completedCount !== 1) return;

  await db.$transaction([
    db.referral.update({
      where: { id: referral.id },
      data: { status: "REWARDED", rewardedAt: new Date() },
    }),
    db.user.update({
      where: { id: referral.referrerId },
      data: { platformCreditBalance: { increment: REFERRER_CREDIT } },
    }),
    db.user.update({
      where: { id: studentId },
      data: { platformCreditBalance: { increment: REFERRED_CREDIT } },
    }),
    db.notification.create({
      data: {
        userId: referral.referrerId,
        type:   "REFERRAL_REWARDED",
        title:  "Parrainage récompensé !",
        body:   `Votre filleul a complété sa première séance. +${REFERRER_CREDIT} TND ajoutés à votre solde.`,
        link:   "/dashboard/student/referral",
      },
    }),
    db.notification.create({
      data: {
        userId: studentId,
        type:   "REFERRAL_REWARDED",
        title:  "Bonus de parrainage !",
        body:   `+${REFERRED_CREDIT} TND ajoutés à votre solde grâce à votre parrain.`,
        link:   "/dashboard/student/referral",
      },
    }),
  ]);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true, status: true, scheduledAt: true, durationMins: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Only the tutor or student on this booking may call this
  const isParticipant = booking.tutorId === session.user.id || booking.studentId === session.user.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status === "COMPLETED") {
    return NextResponse.json({ ok: true });
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Booking is not CONFIRMED" }, { status: 400 });
  }

  // Reject if session has not yet ended
  const durationMins = Math.min(240, booking.durationMins);
  const endAt = new Date(booking.scheduledAt.getTime() + durationMins * 60_000);
  if (new Date() < endAt) {
    return NextResponse.json({ error: "Session has not ended yet" }, { status: 403 });
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  triggerReferralReward(booking.studentId).catch(() => {});

  return NextResponse.json({ ok: true });
}
