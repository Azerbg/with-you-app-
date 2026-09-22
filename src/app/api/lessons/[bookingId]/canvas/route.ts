import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props { params: Promise<{ bookingId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const body = await req.json();
  const { objects, pageHtml } = body;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.studentId !== session.user.id && booking.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.lesson.upsert({
    where: { bookingId },
    update: { whiteboardData: { objects: objects ?? [], pageHtml: pageHtml ?? "" } },
    create: { bookingId, whiteboardData: { objects: objects ?? [], pageHtml: pageHtml ?? "" } },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      studentId: true,
      tutorId: true,
      lesson: { select: { whiteboardData: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uid = session.user.id;
  const role = (session.user as { role?: string }).role;
  if (booking.studentId !== uid && booking.tutorId !== uid && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ whiteboardData: booking.lesson?.whiteboardData ?? null });
}
