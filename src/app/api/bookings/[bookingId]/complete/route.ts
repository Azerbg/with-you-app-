import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const REFERRER_CREDIT = 15; // TND
const REFERRED_CREDIT = 10; // TND

async function triggerReferralReward(studentId: string) {
  // Check if student has a pending referral
  const referral = await db.referral.findUnique({
    where: { referredId: studentId },
    select: { id: true, referrerId: true, status: true },
  });
  if (!referral || referral.status !== "PENDING") return;

  // Only reward on first completed booking
  const completedCount = await db.booking.count({
    where: { studentId, status: "COMPLETED" },
  });
  if (completedCount !== 1) return; // not first booking

  await db.$transaction([
    // Mark referral rewarded
    db.referral.update({
      where: { id: referral.id },
      data: { status: "REWARDED", rewardedAt: new Date() },
    }),
    // Credit the referrer
    db.user.update({
      where: { id: referral.referrerId },
      data: { platformCreditBalance: { increment: REFERRER_CREDIT } },
    }),
    // Credit the referred (student)
    db.user.update({
      where: { id: studentId },
      data: { platformCreditBalance: { increment: REFERRED_CREDIT } },
    }),
    // Notify referrer
    db.notification.create({
      data: {
        userId: referral.referrerId,
        type: "REFERRAL_REWARDED",
        title: "Parrainage récompensé !",
        body: `Votre filleul a complété sa première séance. +${REFERRER_CREDIT} TND ajoutés à votre solde.`,
        link: "/dashboard/student/referral",
      },
    }),
    // Notify referred
    db.notification.create({
      data: {
        userId: studentId,
        type: "REFERRAL_REWARDED",
        title: "Bonus de parrainage !",
        body: `+${REFERRED_CREDIT} TND ajoutés à votre solde grâce à votre parrain.`,
        link: "/dashboard/student/referral",
      },
    }),
  ]);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true, status: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const userId = session.user.id;
  if (booking.studentId !== userId && booking.tutorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status === "COMPLETED") {
    return NextResponse.json({ ok: true }); // already done
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Booking is not CONFIRMED" }, { status: 400 });
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  // ── Referral reward: trigger on student's first completed booking ──────────
  // Fire and forget — non-blocking
  triggerReferralReward(booking.studentId).catch(() => {});

  return NextResponse.json({ ok: true });
}
