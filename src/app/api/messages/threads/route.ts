import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  const threads = await db.messageThread.findMany({
    where: role === "TUTOR" || role === "ADMIN"
      ? { tutorId: userId }
      : { studentId: userId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      tutor:   { select: { id: true, firstName: true, lastName: true, email: true, hrApplication: { select: { fullName: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true, isRead: true },
      },
    },
  });

  const withUnread = threads.map(t => ({
    ...t,
    unreadCount: t.messages.filter(m => !m.isRead && m.senderId !== userId).length,
  }));

  return NextResponse.json(withUnread);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tutorId } = await req.json();
  if (!tutorId) return NextResponse.json({ error: "tutorId required" }, { status: 400 });

  const studentId = session.user.id;

  const thread = await db.messageThread.upsert({
    where: { studentId_tutorId: { studentId, tutorId } },
    create: { studentId, tutorId },
    update: {},
    select: { id: true },
  });

  return NextResponse.json(thread);
}
