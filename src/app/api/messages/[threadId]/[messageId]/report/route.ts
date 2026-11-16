import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ threadId: string; messageId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, messageId } = await params;

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  if (thread.studentId !== userId && thread.tutorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reason } = await req.json().catch(() => ({ reason: "" }));

  await db.message.update({
    where: { id: messageId },
    data: {
      isFlagged: true,
      flagReason: reason || "Reported by user",
      flaggedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
