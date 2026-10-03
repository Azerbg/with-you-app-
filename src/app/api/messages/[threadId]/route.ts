import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendNewMessageNotification } from "@/lib/email";

// ─── Anti-bypass: detect contact info sharing ────────────────────────────────
const BYPASS_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,                          // email
  /(\+?[\d\s\-().]{7,15}\d)/,                                   // phone numbers
  /\b(wa\.me|whatsapp\.com|t\.me|telegram\.me)\b/i,             // WhatsApp / Telegram links
  /\b(whatsapp|watsapp|whats.?app)\b/i,                         // WhatsApp keyword
  /\b(telegram|signal|viber|skype|discord|snapchat|instagram|facebook)\b/i,
  /\b(mon num[eé]ro|my number|appelle.?moi|call me|contacte.?moi|contact me)\b/i,
];

function containsContactInfo(text: string): boolean {
  return BYPASS_PATTERNS.some(p => p.test(text));
}

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

  if (containsContactInfo(content)) {
    return NextResponse.json(
      { error: "CONTACT_INFO_BLOCKED", message: "Les coordonnées personnelles (email, téléphone, réseaux sociaux) ne sont pas autorisées dans les messages." },
      { status: 400 }
    );
  }

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

  // Notify the recipient — fire and forget
  const recipientId = userId === thread.studentId ? thread.tutorId : thread.studentId;
  db.user.findUnique({
    where: { id: recipientId },
    select: { email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } },
  }).then(async (recipient) => {
    if (!recipient) return;
    const recipientName =
      recipient.hrApplication?.fullName ||
      [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") ||
      recipient.email;
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } },
    });
    const senderName =
      sender?.hrApplication?.fullName ||
      [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") ||
      "Quelqu'un";

    await Promise.allSettled([
      db.notification.create({
        data: {
          userId: recipientId,
          type: "NEW_MESSAGE",
          title: `Message de ${senderName}`,
          body: content.trim().slice(0, 100),
          link: `/dashboard/${session.user.role === "TUTOR" ? "student" : "tutor"}/messages`,
        },
      }),
      sendNewMessageNotification({
        recipientEmail: recipient.email,
        recipientName,
        senderName,
        preview: content.trim(),
        threadId,
      }),
    ]);
  }).catch(() => {/* non-blocking */});

  return NextResponse.json(message);
}
