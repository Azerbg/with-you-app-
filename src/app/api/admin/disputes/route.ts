import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

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

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, status, resolution } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const updated = await db.dispute.update({
    where: { id },
    data: {
      status,
      resolution: resolution ?? undefined,
      resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : undefined,
    },
    select: { id: true, status: true, resolution: true },
  });

  return NextResponse.json(updated);
}
