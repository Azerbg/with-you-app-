import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId, content, visibleToCandidate } = await req.json();
  if (!applicationId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 422 });
  }

  const note = await db.hrNote.create({
    data: {
      applicationId,
      authorId: session.user.id!,
      content: content.trim(),
      visibleToCandidate: visibleToCandidate === true,
    },
    select: {
      id: true,
      content: true,
      isFromCandidate: true,
      visibleToCandidate: true,
      createdAt: true,
      author: { select: { email: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
