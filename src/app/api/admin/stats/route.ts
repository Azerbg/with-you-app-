import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalStudents,
    totalTutors,
    activeTutors,
    totalBookings,
    monthBookings,
    openDisputes,
    monthRevenue,
    recentUsers,
    recentBookings,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TUTOR" } }),
    db.user.count({ where: { role: "TUTOR", hrApplication: { status: "ACTIVE" } } }),
    db.booking.count(),
    db.booking.count({ where: { createdAt: { gte: monthStart } } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: monthStart } },
      _sum: { studentPriceUsd: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, accountStatus: true },
    }),
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true, createdAt: true,
        student: { select: { firstName: true, lastName: true, email: true } },
        tutor: { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    totalStudents,
    totalTutors,
    activeTutors,
    totalBookings,
    monthBookings,
    openDisputes,
    monthRevenue: monthRevenue._sum.studentPriceUsd ?? 0,
    recentUsers: recentUsers.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
    recentBookings: recentBookings.map(b => ({
      ...b,
      scheduledAt: b.scheduledAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
