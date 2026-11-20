import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

/**
 * POST /api/admin/messages/[threadId]/moderate
 * Body: { action: "FLAG" | "BLOCK_STUDENT" | "BLOCK_TUTOR", note?: string }
 *
 * FLAG        — records a moderation flag in the audit log (no DB field needed)
 * BLOCK_STUDENT / BLOCK_TUTOR — sets accountStatus = FROZEN on the user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { threadId } = await params;
  const { action, note } = (await req.json()) as {
    action: "FLAG" | "BLOCK_STUDENT" | "BLOCK_TUTOR";
    note?: string;
  };

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
    },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "FLAG") {
    await db.auditLog.create({
      data: {
        actorId:      session!.user.id,
        action:       "FLAG_CONVERSATION",
        targetEntity: "MessageThread",
        targetId:     threadId,
        reason:       note?.trim() || "Signalement sans motif",
      },
    });
    return NextResponse.json({ ok: true });
  }

  const targetId = action === "BLOCK_STUDENT" ? thread.studentId : thread.tutorId;

  await db.user.update({
    where: { id: targetId },
    data: {
      accountStatus:   "FROZEN",
      statusReason:    note?.trim() || "Bloqué suite à une modération des messages",
      statusUpdatedAt: new Date(),
      statusUpdatedBy: session!.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorId:      session!.user.id,
      action:       `MODERATION_FREEZE_${action === "BLOCK_STUDENT" ? "STUDENT" : "TUTOR"}`,
      targetEntity: "User",
      targetId,
      reason:       note?.trim() || undefined,
      payloadBefore: { accountStatus: "ACTIVE" },
      payloadAfter:  { accountStatus: "FROZEN" },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, targetId });
}
