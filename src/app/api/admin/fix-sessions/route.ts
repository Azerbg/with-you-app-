import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/fix-sessions
 * One-off admin endpoint:
 * 1. Sets durationMins = 60 for any booking with durationMins > 240 (e.g. the 9999 bad record).
 * 2. Closes (→ COMPLETED) any CONFIRMED booking whose session has already ended.
 * Protected: ADMIN role only.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cronSecret && bearer === `Bearer ${cronSecret}`) {
    // allowed via CRON_SECRET (for CLI/PowerShell use)
  } else {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Step 1: fix bad durationMins
  const { count: fixed } = await db.booking.updateMany({
    where: { durationMins: { gt: 240 } },
    data:  { durationMins: 60 },
  });

  // Step 2: close sessions that have already ended
  const now = new Date();
  const confirmed = await db.booking.findMany({
    where:  { status: "CONFIRMED" },
    select: { id: true, scheduledAt: true, durationMins: true },
  });

  const toClose = confirmed.filter((b) => {
    const endAt = new Date(b.scheduledAt.getTime() + b.durationMins * 60_000);
    return endAt < now;
  });

  let closed = 0;
  if (toClose.length > 0) {
    const result = await db.booking.updateMany({
      where: { id: { in: toClose.map((b) => b.id) } },
      data:  { status: "COMPLETED" },
    });
    closed = result.count;
  }

  return NextResponse.json({ fixed, closed });
}
