import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Generate a human-readable referral code from name + random chars
function generateCode(firstName: string | null, lastName: string | null): string {
  const prefix = [firstName?.slice(0, 3), lastName?.slice(0, 3)]
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5) || "WY";
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, firstName: true, lastName: true,
      referralCode: true, platformCreditBalance: true,
      referralsSent: {
        select: { status: true, createdAt: true, referred: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      referralReceived: { select: { referrerId: true, status: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-generate code if not yet set
  if (!user.referralCode) {
    let code = generateCode(user.firstName, user.lastName);
    // Ensure uniqueness
    let attempt = 0;
    while (attempt < 5) {
      const existing = await db.user.findUnique({ where: { referralCode: code } });
      if (!existing) break;
      code = generateCode(user.firstName, user.lastName);
      attempt++;
    }
    user = await db.user.update({
      where: { id: session.user.id },
      data: { referralCode: code },
      select: {
        id: true, firstName: true, lastName: true,
        referralCode: true, platformCreditBalance: true,
        referralsSent: {
          select: { status: true, createdAt: true, referred: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        referralReceived: { select: { referrerId: true, status: true } },
      },
    });
  }

  const rewarded = user.referralsSent.filter(r => r.status === "REWARDED").length;
  const pending  = user.referralsSent.filter(r => r.status === "PENDING").length;

  return NextResponse.json({
    code: user.referralCode,
    creditBalance: user.platformCreditBalance,
    totalReferred: user.referralsSent.length,
    rewarded,
    pending,
    referrals: user.referralsSent.map(r => ({
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      name: [r.referred.firstName, r.referred.lastName].filter(Boolean).join(" ") || r.referred.email,
    })),
    hasBeenReferred: !!user.referralReceived,
    myReferralStatus: user.referralReceived?.status ?? null,
  });
}
