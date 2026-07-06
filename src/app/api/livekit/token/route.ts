import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      status: true,
      scheduledAt: true,
      durationMins: true,
      student: { select: { firstName: true, lastName: true, email: true } },
      tutor: {
        select: {
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const isStudent = booking.studentId === userId;
  const isTutor = booking.tutorId === userId;

  if (!isStudent && !isTutor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Session is not available" },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const roomName = `booking-${bookingId}`;

  let displayName: string;
  if (isStudent) {
    const s = booking.student;
    displayName = [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email;
  } else {
    displayName =
      booking.tutor.hrApplication?.fullName ||
      [booking.tutor.firstName, booking.tutor.lastName].filter(Boolean).join(" ") ||
      "Tutor";
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName,
    ttl: 7200, // 2 hours in seconds
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({
    token: jwt,
    roomName,
    identity: userId,
    displayName,
    role: isStudent ? "student" : "tutor",
  });
}
