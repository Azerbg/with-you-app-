import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const app = await db.hrApplication.findUnique({
    where: { interviewToken: token },
    select: {
      id: true,
      fullName: true,
      interviewSlots: true,
      interviewSelectedAt: true,
      interviewMeetingUrl: true,
    },
  });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(app);
}
