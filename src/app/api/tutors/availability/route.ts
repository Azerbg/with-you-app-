import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),  // "HH:MM"
  endTime:   z.string(),  // "HH:MM"
});

const bodySchema = z.object({
  slots:        z.array(slotSchema),
  blockedDates: z.array(z.string()).default([]), // ISO date strings
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: { availability: true },
  });

  if (!profile) return NextResponse.json({ slots: [], blockedDates: [] });

  const slots = profile.availability
    .filter(a => a.isRecurring && a.dayOfWeek !== null)
    .map(a => ({ id: a.id, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));

  const blockedDates = profile.availability
    .filter(a => !a.isRecurring && a.blockedDate !== null)
    .map(a => ({ id: a.id, date: a.blockedDate!.toISOString().slice(0, 10), reason: a.blockReason }));

  return NextResponse.json({ slots, blockedDates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not activated" }, { status: 403 });
  }

  const profile = await db.tutorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = bodySchema.parse(body);

    // Replace all recurring slots with the new set
    await db.tutorAvailability.deleteMany({
      where: { tutorProfileId: profile.id, isRecurring: true },
    });

    if (data.slots.length > 0) {
      await db.tutorAvailability.createMany({
        data: data.slots.map(s => ({
          tutorProfileId: profile.id,
          dayOfWeek:  s.dayOfWeek,
          startTime:  s.startTime,
          endTime:    s.endTime,
          isRecurring: true,
        })),
      });
    }

    // Replace blocked dates
    await db.tutorAvailability.deleteMany({
      where: { tutorProfileId: profile.id, isRecurring: false },
    });

    if (data.blockedDates.length > 0) {
      await db.tutorAvailability.createMany({
        data: data.blockedDates.map(d => ({
          tutorProfileId: profile.id,
          blockedDate: new Date(d),
          isRecurring: false,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 422 });
    }
    console.error("[tutors/availability]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
