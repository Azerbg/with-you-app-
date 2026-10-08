import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * DELETE /api/account/delete
 * Soft-deletes the current user's account by anonymizing PII and marking as deleted.
 * Protected: authenticated users only.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Anonymize user PII and mark account as deleted
  await db.user.update({
    where: { id: userId },
    data: {
      email:        `deleted-${userId}@deleted.invalid`,
      firstName:    null,
      lastName:     null,
      image:        null,
      password:     null,
      nickname:     null,
    },
  });

  return NextResponse.json({ ok: true });
}
