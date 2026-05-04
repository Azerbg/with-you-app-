import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    await db.studentProfile.update({
      where: { userId: session.user.id },
      data: { cefrLevel: parsed.data.cefrLevel },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PLACEMENT-TEST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
