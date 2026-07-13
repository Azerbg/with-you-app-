import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

  return NextResponse.json({ ok: true });
}
