import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAvailableSlots } from "@/lib/slots";
import { DISCOVERY_SESSION_CENTS, STANDARD_SESSION_CENTS } from "@/lib/pricing";
import { createPayPalOrder } from "@/lib/paypal";

const schema = z.object({
  tutorId:     z.string().min(1),
  scheduledAt: z.string().min(1),
  sessionType: z.enum(["DISCOVERY", "SINGLE"]).default("DISCOVERY"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { tutorId, scheduledAt, sessionType } = parsed.data;
  const slotDate = new Date(scheduledAt);
  if (isNaN(slotDate.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  // Verify tutor exists and is active
  const profile = await db.tutorProfile.findUnique({
    where:   { userId: tutorId },
    include: {
      user:         { select: { hrApplication: { select: { status: true } } } },
      availability: true,
    },
  });

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
  }

  // Validate the slot is still available
  const existingBookings = await db.booking.findMany({
    where:  { tutorId, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true },
  });

  const slots    = generateAvailableSlots(profile.availability, existingBookings.map((b) => b.scheduledAt), 21);
  const isValid  = slots.some((s) => s.utc.toISOString() === slotDate.toISOString());
  if (!isValid) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  // Discovery rule: only for first session with this tutor
  if (sessionType === "DISCOVERY") {
    const prior = await db.booking.findFirst({
      where: { studentId: session.user.id, tutorId, status: { not: "CANCELLED" } },
    });
    if (prior) {
      return NextResponse.json(
        { error: "Discovery sessions are only available for new tutor relationships" },
        { status: 409 },
      );
    }
  }

  const amountUsd = (sessionType === "DISCOVERY" ? DISCOVERY_SESSION_CENTS : STANDARD_SESSION_CENTS) / 100;
  // custom_id encodes all booking parameters — parsed by capture + webhook routes
  const customId = `${session.user.id}|${tutorId}|${slotDate.toISOString()}|${sessionType}`;

  try {
    const orderId = await createPayPalOrder({ amountUsd, customId });
    return NextResponse.json({ orderId, amountUsd });
  } catch (err) {
    console.error("[paypal/create-order]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not create PayPal order" }, { status: 502 });
  }
}
