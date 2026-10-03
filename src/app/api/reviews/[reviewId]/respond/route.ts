import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR") return NextResponse.json({ error: "Tutors only" }, { status: 403 });

  const { reviewId } = await params;
  const { response } = await req.json();

  if (!response?.trim()) return NextResponse.json({ error: "Response required" }, { status: 400 });
  if (response.trim().length > 300) return NextResponse.json({ error: "Max 300 characters" }, { status: 400 });

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { tutorId: true, tutorResponse: true },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.tutorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (review.tutorResponse) return NextResponse.json({ error: "Already responded" }, { status: 409 });

  const updated = await db.review.update({
    where: { id: reviewId },
    data: { tutorResponse: response.trim(), tutorRespondedAt: new Date() },
    select: { id: true, tutorResponse: true, tutorRespondedAt: true },
  });

  return NextResponse.json(updated);
}
