import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await db.hrApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { email: true } } },
      },
    },
  });

  return NextResponse.json(applications);
}
