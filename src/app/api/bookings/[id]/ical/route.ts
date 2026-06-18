import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(d: Date) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uid = session.user.id;
  if (booking.studentId !== uid && booking.tutorId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tutorName =
    booking.tutor.firstName && booking.tutor.lastName
      ? `${booking.tutor.firstName} ${booking.tutor.lastName}`
      : booking.tutor.hrApplication?.fullName ?? "Votre tuteur";

  const start = new Date(booking.scheduledAt);
  const end = new Date(start.getTime() + booking.durationMins * 60 * 1000);
  const now = new Date();

  const baseUrl = process.env.AUTH_URL ?? "https://with-you-app-red.vercel.app";
  const confirmUrl = `${baseUrl}/booking/confirmation/${booking.id}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WithYou//WithYou Platform//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@withyou.com`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:Séance de découverte avec ${tutorName}`,
    `DESCRIPTION:Séance de ${booking.durationMins} minutes avec ${tutorName}.\\nVoir la réservation : ${confirmUrl}`,
    `URL:${confirmUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="seance-withyou-${booking.id.slice(0, 8)}.ics"`,
    },
  });
}
