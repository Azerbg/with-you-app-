import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — fetch tutor's availability slots
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.tutorProfile.findUnique({
    where: { userId: session.user.id },
    include: { availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } },
  });

  if (!profile) return NextResponse.json({ slots: [], bufferMinutes: 30 });

  return NextResponse.json({
    slots: profile.availability,
    bufferMinutes: profile.bufferMinutes,
  });
}

// POST — upsert availability (replace all recurring slots + update buffer)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recurring, bufferMinutes } = await req.json() as {
    recurring: { dayOfWeek: number; startTime: string; endTime: string }[];
    bufferMinutes: number;
  };

  const profile = await db.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Delete existing recurring slots and re-create
  await db.tutorAvailability.deleteMany({
    where: { tutorProfileId: profile.id, isRecurring: true },
  });

  if (recurring.length > 0) {
    await db.tutorAvailability.createMany({
      data: recurring.map(s => ({
        tutorProfileId: profile.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: true,
      })),
    });
  }

  await db.tutorProfile.update({
    where: { id: profile.id },
    data: { bufferMinutes: bufferMinutes ?? 30 },
  });

  return NextResponse.json({ success: true });
}

// DELETE — add a blocked date
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, reason } = await req.json() as { date: string; reason?: string };

  const profile = await db.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await db.tutorAvailability.create({
    data: {
      tutorProfileId: profile.id,
      blockedDate: new Date(date),
      blockReason: reason,
      isRecurring: false,
    },
  });

  return NextResponse.json({ success: true });
}
