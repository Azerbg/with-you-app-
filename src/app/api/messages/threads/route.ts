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
      _count: {
        select: {
          messages: { where: { isRead: false, senderId: { not: userId } } },
        },
      },
    },
  });

  // Compute isLocked for students only
  let lockedThreadIds = new Set<string>();
  if (role === "STUDENT" && threads.length > 0) {
    const threadIds = threads.map(t => t.id);
    const tutorIds  = threads.map(t => t.tutorId);

    const [tutorReplied, bookedTutors] = await Promise.all([
      db.message.findMany({
        where: { threadId: { in: threadIds }, senderId: { in: tutorIds } },
        select: { threadId: true },
        distinct: ["threadId"],
      }),
      db.booking.findMany({
        where: {
          studentId: userId,
          tutorId: { in: tutorIds },
          status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] },
        },
        select: { tutorId: true },
        distinct: ["tutorId"],
      }),
    ]);

    const tutorRepliedSet = new Set(tutorReplied.map(m => m.threadId));
    const bookedTutorSet  = new Set(bookedTutors.map(b => b.tutorId));

    lockedThreadIds = new Set(
      threads
        .filter(t => !tutorRepliedSet.has(t.id) && !bookedTutorSet.has(t.tutorId))
        .map(t => t.id)
    );
  }

  const result = threads.map(t => ({
    ...t,
    unreadCount: t._count.messages,
    isLocked: lockedThreadIds.has(t.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tutorId } = await req.json();
  if (!tutorId) return NextResponse.json({ error: "tutorId required" }, { status: 400 });

  // Validate tutor is active
  const tutor = await db.user.findUnique({
    where: { id: tutorId },
    select: { hrApplication: { select: { status: true } } },
  });
  if (tutor?.hrApplication?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
  }

  const studentId = session.user.id;
  const thread = await db.messageThread.upsert({
    where: { studentId_tutorId: { studentId, tutorId } },
    create: { studentId, tutorId },
    update: {},
    select: { id: true },
  });

  return NextResponse.json(thread);
}
