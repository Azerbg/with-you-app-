import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const userId = session.user.id;

  // Can't apply twice
  const alreadyReferred = await db.referral.findUnique({ where: { referredId: userId } });
  if (alreadyReferred) return NextResponse.json({ error: "ALREADY_APPLIED" }, { status: 409 });

  // Can only apply before making any booking
  const hasBooking = await db.booking.findFirst({ where: { studentId: userId }, select: { id: true } });
  if (hasBooking) return NextResponse.json({ error: "TOO_LATE" }, { status: 409 });

  // Find referrer by code
  const referrer = await db.user.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
    select: { id: true },
  });

  if (!referrer) return NextResponse.json({ error: "INVALID_CODE" }, { status: 404 });
  if (referrer.id === userId) return NextResponse.json({ error: "SELF_REFERRAL" }, { status: 400 });

  await db.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: userId,
      code: code.trim().toUpperCase(),
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
