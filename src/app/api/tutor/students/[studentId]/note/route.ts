import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const body = await req.json();
  const content: string = (body.content ?? "").trim();

  // Verify the tutor has at least one booking with this student
  const booking = await db.booking.findFirst({
    where: { tutorId: session.user.id, studentId },
    select: { id: true },
  });
  if (!booking) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  if (!content) {
    // Delete note if empty
    await db.tutorStudentNote.deleteMany({
      where: { tutorId: session.user.id, studentId },
    });
    return NextResponse.json({ deleted: true });
  }

  const note = await db.tutorStudentNote.upsert({
    where: { tutorId_studentId: { tutorId: session.user.id, studentId } },
    create: { tutorId: session.user.id, studentId, content },
    update: { content },
  });

  return NextResponse.json({ content: note.content, updatedAt: note.updatedAt.toISOString() });
}
