import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH — update tutor settings (visibility toggle)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { isHidden } = body;

  if (typeof isHidden !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await db.tutorProfile.update({
    where: { userId: session.user.id },
    data: { isHidden },
  });

  return NextResponse.json({ ok: true });
}
