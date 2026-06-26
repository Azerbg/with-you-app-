import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getIsLocked(threadId: string, studentId: string, tutorId: string): Promise<boolean> {
  const [tutorReplied, hasBooking] = await Promise.all([
    db.message.count({ where: { threadId, senderId: tutorId } }),
    db.booking.count({
      where: {
        studentId,
        tutorId,
        status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] },
      },
    }),
  ]);
  return tutorReplied === 0 && hasBooking === 0;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await params;
  const userId = session.user.id;

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (thread.studentId !== userId && thread.tutorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark messages from the other party as read
  await db.message.updateMany({
    where: { threadId, senderId: { not: userId }, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  const [messages, isLocked] = await Promise.all([
    db.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: { id: true, senderId: true, content: true, type: true, isRead: true, createdAt: true },
    }),
    session.user.role === "STUDENT"
      ? getIsLocked(threadId, thread.studentId, thread.tutorId)
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ messages, isLocked });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  if (thread.studentId !== userId && thread.tutorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Lock check: students can only send 1 message until tutor replies or booking exists
  if (session.user.role === "STUDENT") {
    const locked = await getIsLocked(threadId, thread.studentId, thread.tutorId);
    if (locked) {
      const studentMsgCount = await db.message.count({ where: { threadId, senderId: userId } });
      if (studentMsgCount >= 1) {
        return NextResponse.json({ error: "MESSAGE_LIMIT_REACHED" }, { status: 403 });
      }
    }
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: { threadId, senderId: userId, content: content.trim() },
      select: { id: true, senderId: true, content: true, type: true, isRead: true, createdAt: true },
    }),
    db.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return NextResponse.json(message);
}
