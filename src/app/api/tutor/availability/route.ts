import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
});

const postSchema = z.object({
  recurring:     z.array(slotSchema).max(50),
  bufferMinutes: z.number().int().min(0).max(120).default(30),
});

const deleteSchema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  reason: z.string().max(500).optional(),
});

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

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { recurring, bufferMinutes } = parsed.data;

  const profile = await db.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await db.tutorAvailability.deleteMany({
    where: { tutorProfileId: profile.id, isRecurring: true },
  });

  if (recurring.length > 0) {
    await db.tutorAvailability.createMany({
      data: recurring.map(s => ({
        tutorProfileId: profile.id,
        dayOfWeek:      s.dayOfWeek,
        startTime:      s.startTime,
        endTime:        s.endTime,
        isRecurring:    true,
      })),
    });
  }

  await db.tutorProfile.update({
    where: { id: profile.id },
    data: { bufferMinutes },
  });

  return NextResponse.json({ success: true });
}

// DELETE — add a blocked date
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { date, reason } = parsed.data;

  const profile = await db.tutorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await db.tutorAvailability.create({
    data: {
      tutorProfileId: profile.id,
      blockedDate:    new Date(date),
      blockReason:    reason,
      isRecurring:    false,
    },
  });

  return NextResponse.json({ success: true });
}
