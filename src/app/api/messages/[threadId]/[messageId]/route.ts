import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ threadId: string; messageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, messageId } = await params;

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.threadId !== threadId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (message.senderId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.message.delete({ where: { id: messageId } });
  return NextResponse.json({ ok: true });
}
