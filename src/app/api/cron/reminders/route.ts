import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSessionReminder } from "@/lib/email";

// Secured: Vercel automatically blocks external calls to cron routes in production.
// For manual testing, pass ?secret=CRON_SECRET as query param.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  let sent24h = 0;
  let sent1h = 0;

  // ── 24h window: scheduledAt between 23h and 25h from now ─────────────────
  const from24 = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to24   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const bookings24h = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminded24h: false,
      scheduledAt: { gte: from24, lte: to24 },
    },
    include: {
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      tutor:   { select: { id: true, email: true, hrApplication: { select: { fullName: true } } } },
    },
  });

  for (const b of bookings24h) {
    const studentName = [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email;
    const tutorName   = b.tutor.hrApplication?.fullName || b.tutor.email;

    await Promise.allSettled([
      sendSessionReminder({
        email: b.student.email, name: studentName, role: "student",
        hoursAhead: 24, scheduledAt: b.scheduledAt, durationMins: b.durationMins, bookingId: b.id,
      }),
      sendSessionReminder({
        email: b.tutor.email, name: tutorName, role: "tutor",
        hoursAhead: 24, scheduledAt: b.scheduledAt, durationMins: b.durationMins, bookingId: b.id,
      }),
      db.notification.createMany({
        data: [
          { userId: b.student.id, type: "REMINDER_24H", title: "Rappel de séance", body: `Votre séance a lieu demain à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(b.scheduledAt)}.`, link: `/classroom/${b.id}` },
          { userId: b.tutor.id,   type: "REMINDER_24H", title: "Rappel de séance", body: `Vous avez une séance demain à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(b.scheduledAt)}.`, link: `/classroom/${b.id}` },
        ],
      }),
      db.booking.update({ where: { id: b.id }, data: { reminded24h: true } }),
    ]);
    sent24h++;
  }

  // ── 1h window: scheduledAt between 45min and 75min from now ──────────────
  const from1h = new Date(now.getTime() + 45 * 60 * 1000);
  const to1h   = new Date(now.getTime() + 75 * 60 * 1000);

  const bookings1h = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminded1h: false,
      scheduledAt: { gte: from1h, lte: to1h },
    },
    include: {
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      tutor:   { select: { id: true, email: true, hrApplication: { select: { fullName: true } } } },
    },
  });

  for (const b of bookings1h) {
    const studentName = [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email;
    const tutorName   = b.tutor.hrApplication?.fullName || b.tutor.email;

    await Promise.allSettled([
      sendSessionReminder({
        email: b.student.email, name: studentName, role: "student",
        hoursAhead: 1, scheduledAt: b.scheduledAt, durationMins: b.durationMins, bookingId: b.id,
      }),
      sendSessionReminder({
        email: b.tutor.email, name: tutorName, role: "tutor",
        hoursAhead: 1, scheduledAt: b.scheduledAt, durationMins: b.durationMins, bookingId: b.id,
      }),
      db.notification.createMany({
        data: [
          { userId: b.student.id, type: "REMINDER_1H", title: "Séance dans 1 heure", body: `Votre séance commence dans 1 heure. Préparez-vous !`, link: `/classroom/${b.id}` },
          { userId: b.tutor.id,   type: "REMINDER_1H", title: "Séance dans 1 heure", body: `Votre prochaine séance commence dans 1 heure.`, link: `/classroom/${b.id}` },
        ],
      }),
      db.booking.update({ where: { id: b.id }, data: { reminded1h: true } }),
    ]);
    sent1h++;
  }

  console.log(`[cron/reminders] 24h: ${sent24h}, 1h: ${sent1h}`);
  return NextResponse.json({ ok: true, sent24h, sent1h });
}
