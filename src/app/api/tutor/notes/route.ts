import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const getSchema = z.object({
  studentId: z.string().min(1).max(100),
});

const postSchema = z.object({
  studentId: z.string().min(1).max(100),
  content:   z.string().max(5000),
});

// GET /api/tutor/notes?studentId=xxx  — fetch note for a student
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = getSchema.safeParse({ studentId: req.nextUrl.searchParams.get("studentId") });
  if (!parsed.success) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const { studentId } = parsed.data;

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

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { studentId, content } = parsed.data;

  const note = await db.tutorStudentNote.upsert({
    where: { tutorId_studentId: { tutorId: session.user.id, studentId } },
    update: { content },
    create: { tutorId: session.user.id, studentId, content },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json(note);
}
