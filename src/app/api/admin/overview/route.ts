import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now        = new Date();
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000 - 1);

  const r2 = (n: number) => Math.round(n * 100) / 100;

  const [
    // Students
    totalStudents,
    newStudentsWeek,
    // Sessions
    upcomingSessions,
    sessionsToday,
    sessionsWeek,
    sessionsMonth,
    // Revenue
    revenueWeek,
    revenueMonth,
    revenueTotal,
    // Payouts owed
    payoutsOwed,
    payoutsOwedTutorCount,
    // Misc
    openDisputes,
    hrAwaiting,
    // Activity feed
    recentActivity,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { gte: weekStart } } }),

    db.booking.count({ where: { status: "CONFIRMED", scheduledAt: { gte: now } } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, scheduledAt: { gte: todayStart, lte: todayEnd } } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, scheduledAt: { gte: weekStart } } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, scheduledAt: { gte: monthStart } } }),

    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: weekStart } },
      _sum: { studentPriceUsd: true },
    }),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: monthStart } },
      _sum: { studentPriceUsd: true },
    }),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { studentPriceUsd: true },
    }),

    db.booking.aggregate({
      where: { status: "COMPLETED", tutorPaidAt: null, tutorPayoutAmount: { gt: 0 } },
      _sum: { tutorPayoutUsd: true },
      _count: { id: true },
    }),
    db.booking.groupBy({
      by: ["tutorId"],
      where: { status: "COMPLETED", tutorPaidAt: null, tutorPayoutAmount: { gt: 0 } },
      _count: { id: true },
    }).then(rows => rows.length),

    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.hrApplication.count({ where: { status: { in: ["NEW", "STAGE1_REVIEW", "VIDEO_SUBMITTED", "INTERVIEW_COMPLETE"] } } }),

    db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        status: true,
        sessionType: true,
        durationMins: true,
        studentPriceUsd: true,
        paymentProvider: true,
        scheduledAt: true,
        student: { select: { firstName: true, lastName: true, email: true } },
        tutor:   { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    students: {
      total:   totalStudents,
      newWeek: newStudentsWeek,
    },
    sessions: {
      upcoming: upcomingSessions,
      today:    sessionsToday,
      week:     sessionsWeek,
      month:    sessionsMonth,
    },
    revenue: {
      week:  r2(revenueWeek._sum.studentPriceUsd  ?? 0),
      month: r2(revenueMonth._sum.studentPriceUsd ?? 0),
      total: r2(revenueTotal._sum.studentPriceUsd ?? 0),
    },
    payoutsOwed: {
      amountUsd:   r2(payoutsOwed._sum.tutorPayoutUsd ?? 0),
      sessionCount: payoutsOwed._count.id,
      tutorCount:  payoutsOwedTutorCount,
    },
    misc: {
      openDisputes,
      hrAwaiting,
    },
    recentActivity: recentActivity.map(b => ({
      id:          b.id,
      createdAt:   b.createdAt.toISOString(),
      scheduledAt: b.scheduledAt?.toISOString() ?? null,
      status:      b.status,
      sessionType: b.sessionType,
      durationMins: b.durationMins,
      amountUsd:   b.studentPriceUsd ?? 0,
      provider:    b.paymentProvider,
      studentName: [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email,
      tutorName:   b.tutor.hrApplication?.fullName ?? [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ") ?? "—",
    })),
  });
}
