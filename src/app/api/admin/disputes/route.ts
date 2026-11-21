import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import { sendDisputeResolutionEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/adminNotify";
import { DisputeStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 25;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const [disputes, total] = await Promise.all([
    db.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, type: true, status: true, description: true, resolution: true,
        createdAt: true, resolvedAt: true,
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
        tutor:   { select: { id: true, email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
        booking: { select: { id: true, scheduledAt: true, sessionType: true, studentPriceUsd: true } },
      },
    }),
    db.dispute.count({ where }),
  ]);

  return NextResponse.json({
    disputes: disputes.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      booking: d.booking ? { ...d.booking, scheduledAt: d.booking.scheduledAt?.toISOString() ?? null } : null,
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { bookingId, type, description } = await req.json() as {
    bookingId: string;
    type: string;
    description: string;
  };

  if (!bookingId || !type || !description?.trim()) {
    return NextResponse.json({ error: "bookingId, type and description are required" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, studentId: true, tutorId: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const dispute = await db.dispute.create({
    data: {
      bookingId: booking.id,
      studentId: booking.studentId,
      tutorId:   booking.tutorId,
      type:      type as import("@prisma/client").DisputeType,
      description: description.trim(),
      slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    select: { id: true, type: true, status: true },
  });

  db.auditLog.create({
    data: { actorId: session!.user.id, action: "OPEN_DISPUTE", targetEntity: "Dispute", targetId: dispute.id },
  }).catch(() => {});

  notifyAdmins({
    type: "DISPUTE_OPENED",
    title: `Nouveau litige ouvert`,
    body: description.trim().slice(0, 80),
    link: `/dashboard/admin/disputes`,
  }).catch(() => {});

  return NextResponse.json(dispute, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, status, resolution, internalNote, notify } = await req.json() as {
    id: string;
    status: DisputeStatus;
    resolution?: string;
    internalNote?: string;
    notify?: boolean;
  };
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const parts = [resolution?.trim(), internalNote?.trim()].filter(Boolean);
  const finalResolution = parts.length > 0 ? parts.join("\n\nNote : ") : undefined;

  const updated = await db.dispute.update({
    where: { id },
    data: {
      status,
      resolution: finalResolution,
      resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : undefined,
    },
    select: { id: true, status: true, resolution: true },
  });

  if (notify && ["RESOLVED", "CLOSED"].includes(status) && resolution?.trim()) {
    const dispute = await db.dispute.findUnique({
      where: { id },
      select: {
        type: true,
        student: { select: { email: true, firstName: true, lastName: true } },
        tutor:   { select: { email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      },
    });
    if (dispute) {
      const studentName = [dispute.student.firstName, dispute.student.lastName].filter(Boolean).join(" ") || dispute.student.email;
      const tutorName   = dispute.tutor.hrApplication?.fullName ?? [dispute.tutor.firstName, dispute.tutor.lastName].filter(Boolean).join(" ") ?? dispute.tutor.email;
      await Promise.allSettled([
        sendDisputeResolutionEmail(dispute.student.email, studentName, resolution.trim(), internalNote?.trim(), dispute.type),
        sendDisputeResolutionEmail(dispute.tutor.email,   tutorName,   resolution.trim(), internalNote?.trim(), dispute.type),
      ]);
    }
  }

  return NextResponse.json(updated);
}
