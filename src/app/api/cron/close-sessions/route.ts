import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/cron/close-sessions
 * Called daily at 02:00 UTC by Vercel Cron (see vercel.json).
 * 1. Clamps any booking with durationMins > 240 (bad data) to 240.
 * 2. Marks CONFIRMED bookings as COMPLETED when scheduledAt + durationMins < now.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fix bad data: clamp durationMins > 240 to 240
  const { count: fixed } = await db.booking.updateMany({
    where: { durationMins: { gt: 240 } },
    data:  { durationMins: 240 },
  });

  const now = new Date();

  const stale = await db.booking.findMany({
    where: { status: "CONFIRMED" },
    select: { id: true, scheduledAt: true, durationMins: true },
  });

  const toClose = stale.filter((b) => {
    const endAt = new Date(b.scheduledAt.getTime() + b.durationMins * 60_000);
    return endAt < now;
  });

  if (toClose.length === 0) {
    return NextResponse.json({ fixed, closed: 0, message: "Nothing to close" });
  }

  await db.booking.updateMany({
    where: { id: { in: toClose.map((b) => b.id) } },
    data:  { status: "COMPLETED" },
  });

  return NextResponse.json({ fixed, closed: toClose.length });
}
