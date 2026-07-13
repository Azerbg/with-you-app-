import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bookingId, ratingCommunication, ratingStructure, ratingAccuracy, ratingValue, text } = body;

  // Validate ratings
  for (const r of [ratingCommunication, ratingStructure, ratingAccuracy, ratingValue]) {
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "Ratings must be integers 1–5" }, { status: 400 });
    }
  }

  if (text && (text.length < 20 || text.length > 500)) {
    return NextResponse.json({ error: "Comment must be 20–500 characters" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { studentId: true, tutorId: true, status: true, review: { select: { id: true } } },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.studentId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.review) return NextResponse.json({ error: "Review already submitted" }, { status: 409 });

  // Accept CONFIRMED too — client may have failed to call /complete (network drop)
  if (booking.status !== "COMPLETED" && booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Session not available for review" }, { status: 400 });
  }

  const ratingComposite = (ratingCommunication + ratingStructure + ratingAccuracy + ratingValue) / 4;
  const now = new Date();

  await db.$transaction(async (tx) => {
    // Mark completed if still CONFIRMED (fallback for network failures on leave)
    if (booking.status === "CONFIRMED") {
      await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
    }

    await tx.review.create({
      data: {
        bookingId,
        studentId: session.user.id,
        tutorId: booking.tutorId,
        ratingCommunication,
        ratingStructure,
        ratingAccuracy,
        ratingValue,
        ratingComposite,
        text: text?.trim() || null,
        isPublished: true,
        publishedAt: now,
      },
    });

    // L30 — recalculate tutor average rating
    const allReviews = await tx.review.findMany({
      where: { tutorId: booking.tutorId, isPublished: true },
      select: { ratingComposite: true },
    });

    const totalReviews = allReviews.length;
    const averageRating = allReviews.reduce((sum, r) => sum + r.ratingComposite, 0) / totalReviews;

    // Bug 4 fix: only update if profile exists (all active tutors have one, but defensive)
    const profileExists = await tx.tutorProfile.findUnique({ where: { userId: booking.tutorId } });
    if (profileExists) {
      await tx.tutorProfile.update({
        where: { userId: booking.tutorId },
        data: { totalReviews, averageRating },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
