import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { threadId } = await params;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      tutor:   { select: { id: true, email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, content: true, type: true, isRead: true, createdAt: true },
      },
    },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Audit: admin read this conversation
  db.auditLog.create({
    data: {
      actorId: session!.user.id,
      action: "READ_CONVERSATION",
      targetEntity: "MessageThread",
      targetId: threadId,
    },
  }).catch(() => {});

  return NextResponse.json({
    ...thread,
    messages: thread.messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}
