import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 25;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { student: { email:     { contains: search, mode: "insensitive" } } },
      { student: { firstName: { contains: search, mode: "insensitive" } } },
      { tutor:   { firstName: { contains: search, mode: "insensitive" } } },
      { tutor:   { hrApplication: { fullName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true,
        scheduledAt: true, durationMins: true, createdAt: true,
        student: { select: { id: true, email: true, firstName: true, lastName: true } },
        tutor:   { select: { id: true, email: true, firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      },
    }),
    db.booking.count({ where }),
  ]);

  return NextResponse.json({
    bookings: bookings.map(b => ({
      ...b,
      scheduledAt: b.scheduledAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}
