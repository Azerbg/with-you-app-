import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await params;
  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.studentId !== session.user.id && thread.tutorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.threadId !== threadId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reactions = (message.reactions as Record<string, string[]> | null) ?? {};
  const users = reactions[emoji] ?? [];
  const userId = session.user.id;

  if (users.includes(userId)) {
    const filtered = users.filter(u => u !== userId);
    if (filtered.length === 0) delete reactions[emoji];
    else reactions[emoji] = filtered;
  } else {
    reactions[emoji] = [...users, userId];
  }

  const updated = await db.message.update({
    where: { id: messageId },
    data: { reactions },
    select: { id: true, reactions: true },
  });

  return NextResponse.json(updated);
}
