import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  image: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const updateData: Record<string, string | null> = {};
    if (parsed.data.nickname !== undefined) updateData.nickname = parsed.data.nickname;
    if (parsed.data.image !== undefined) updateData.image = parsed.data.image;

    await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PROFILE PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
