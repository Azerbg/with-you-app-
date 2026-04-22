import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!Object.values(ApplicationStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const updated = await db.hrApplication.update({
    where: { id },
    data: {
      status,
      ...(status === "REJECTED" ? { rejectedAt: new Date(), reapplyAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } : {}),
      ...(status === "ACTIVE"   ? { activatedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}
