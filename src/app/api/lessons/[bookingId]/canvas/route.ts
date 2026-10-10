import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props { params: Promise<{ bookingId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const body = await req.json();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.studentId !== session.user.id && booking.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Accept either tldraw snapshot ({ snapshot }) or legacy format
  const data = body.snapshot ? { snapshot: body.snapshot } : body;

  await db.lesson.upsert({
    where: { bookingId },
    update: { whiteboardData: data },
    create: { bookingId, whiteboardData: data },
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

  const uid  = session.user.id;
  const role = (session.user as { role?: string }).role;
  if (booking.studentId !== uid && booking.tutorId !== uid && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wd = booking.lesson?.whiteboardData as any;
  if (!wd) return NextResponse.json({ snapshot: null });

  // Return tldraw snapshot if present, otherwise null (legacy format not supported in viewer)
  if (wd.snapshot) return NextResponse.json({ snapshot: wd.snapshot });

  return NextResponse.json({ snapshot: null });
}
