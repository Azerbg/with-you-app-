import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/tutor/notes?studentId=xxx  — fetch note for a student
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const note = await db.tutorStudentNote.findUnique({
    where: { tutorId_studentId: { tutorId: session.user.id, studentId } },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json({ content: note?.content ?? "", updatedAt: note?.updatedAt ?? null });
}

// POST /api/tutor/notes  — create or update a note
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId, content } = await req.json();
  if (!studentId || typeof content !== "string") {
    return NextResponse.json({ error: "studentId and content required" }, { status: 400 });
  }

  const note = await db.tutorStudentNote.upsert({
    where: { tutorId_studentId: { tutorId: session.user.id, studentId } },
    update: { content },
    create: { tutorId: session.user.id, studentId, content },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json(note);
}
