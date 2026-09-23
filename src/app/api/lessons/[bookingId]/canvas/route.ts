import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props { params: Promise<{ bookingId: string }> }

// Normalise legacy { objects, pageHtml } format to { pages: [...] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(body: any) {
  if (Array.isArray(body.pages)) return { pages: body.pages };
  return { pages: [{ objects: body.objects ?? [], pageHtml: body.pageHtml ?? "" }] };
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const data = normalise(await req.json());

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

  // Normalise legacy format on read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wd = booking.lesson?.whiteboardData as any;
  if (!wd) return NextResponse.json({ whiteboardData: null });

  const normalised = Array.isArray(wd.pages)
    ? wd
    : { pages: [{ objects: wd.objects ?? [], pageHtml: wd.pageHtml ?? "" }] };

  return NextResponse.json({ whiteboardData: normalised });
}
