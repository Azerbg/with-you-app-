import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uid = session.user.id;
  if (booking.studentId !== uid && booking.tutorId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const past = await db.booking.findMany({
    where: {
      id:        { not: bookingId },
      studentId: booking.studentId,
      tutorId:   booking.tutorId,
      status:    "COMPLETED",
      lesson:    { isNot: null },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    select: {
      id: true,
      scheduledAt: true,
      lesson: { select: { whiteboardData: true } },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = past.map(b => {
    const wd = b.lesson?.whiteboardData as any;
    if (!wd) return null;
    // Normalise legacy format
    const pages: { objects: unknown[]; pageHtml: string }[] = Array.isArray(wd.pages)
      ? wd.pages
      : [{ objects: wd.objects ?? [], pageHtml: wd.pageHtml ?? "" }];
    return { bookingId: b.id, scheduledAt: b.scheduledAt.toISOString(), pages };
  })
  .filter((b): b is NonNullable<typeof b> =>
    b !== null && b.pages.some(p => p.objects.length > 0 || p.pageHtml.trim())
  );

  return NextResponse.json(result);
}
