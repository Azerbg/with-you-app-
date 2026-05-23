import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  firstName:    z.string().min(1).max(50).optional(),
  lastName:     z.string().min(0).max(50).optional(),
  pendingImage: z.string().nullable().optional(), // photo goes to review, not live immediately
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const updateData: Record<string, string | null> = {};
    if (parsed.data.firstName    !== undefined) updateData.firstName    = parsed.data.firstName;
    if (parsed.data.lastName     !== undefined) updateData.lastName     = parsed.data.lastName;
    if (parsed.data.pendingImage !== undefined) updateData.pendingImage = parsed.data.pendingImage;

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
