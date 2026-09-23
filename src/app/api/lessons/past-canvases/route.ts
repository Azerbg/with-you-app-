import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  // Find the current booking to get the student/tutor pair
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uid = session.user.id;
  if (booking.studentId !== uid && booking.tutorId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find past bookings between the same pair that have canvas data
  const past = await db.booking.findMany({
    where: {
      id:        { not: bookingId },
      studentId: booking.studentId,
      tutorId:   booking.tutorId,
      status:    "COMPLETED",
      lesson: { isNot: null },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    select: {
      id: true,
      scheduledAt: true,
      lesson: { select: { whiteboardData: true } },
    },
  });

  const result = past
    .map(b => ({
      bookingId:   b.id,
      scheduledAt: b.scheduledAt.toISOString(),
      objects:     (b.lesson?.whiteboardData as { objects?: unknown[] })?.objects ?? [],
      pageHtml:    (b.lesson?.whiteboardData as { pageHtml?: string })?.pageHtml   ?? "",
    }))
    .filter(b => b.objects.length > 0 || b.pageHtml.trim());

  return NextResponse.json(result);
}
