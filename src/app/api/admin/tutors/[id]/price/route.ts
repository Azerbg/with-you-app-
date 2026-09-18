import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const price = body.sessionPriceUsd;

  if (price !== null && (typeof price !== "number" || price < 0)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const profile = await db.tutorProfile.findUnique({ where: { userId: id } });
  if (!profile) {
    return NextResponse.json({ error: "Tutor profile not found" }, { status: 404 });
  }

  await db.tutorProfile.update({
    where: { userId: id },
    data: { sessionPriceUsd: price ?? null },
  });

  return NextResponse.json({ ok: true });
}
