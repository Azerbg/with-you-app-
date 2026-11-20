import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import { getUsdToTndRate } from "@/lib/adminSettings";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const selectedYear = yearParam ? parseInt(yearParam) : null;

  const now        = new Date();
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000 - 1);

  // Year-filter date ranges
  const yearStart  = selectedYear ? new Date(selectedYear, 0, 1) : null;
  const yearEnd    = selectedYear ? new Date(selectedYear, 11, 31, 23, 59, 59, 999) : null;
  const h1Start    = selectedYear ? new Date(selectedYear, 0, 1) : null;
  const h1End      = selectedYear ? new Date(selectedYear, 5, 30, 23, 59, 59, 999) : null;
  const h2Start    = selectedYear ? new Date(selectedYear, 6, 1) : null;
  const h2End      = selectedYear ? new Date(selectedYear, 11, 31, 23, 59, 59, 999) : null;

  const r2 = (n: number) => Math.round(n * 100) / 100;

  const usdToTnd = await getUsdToTndRate();

  const [
    // Students
    totalStudents,
    newStudentsWeek,
    // Sessions
    upcomingSessions,
    sessionsToday,
    sessionsWeek,
    sessionsMonth,
    // Revenue (default or year-filtered)
    revenuePeriod1,
    revenuePeriod2,
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
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, scheduledAt: { gte: selectedYear ? yearStart! : weekStart } } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, scheduledAt: { gte: selectedYear ? yearStart! : monthStart } } }),

    // Period 1: H1 of year OR current week
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        scheduledAt: selectedYear
          ? { gte: h1Start!, lte: h1End! }
          : { gte: weekStart },
      },
      _sum: { studentPriceUsd: true },
    }),
    // Period 2: H2 of year OR current month
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        scheduledAt: selectedYear
          ? { gte: h2Start!, lte: h2End! }
          : { gte: monthStart },
      },
      _sum: { studentPriceUsd: true },
    }),
    // Total: full year OR all-time
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        ...(selectedYear ? { scheduledAt: { gte: yearStart!, lte: yearEnd! } } : {}),
      },
      _sum: { studentPriceUsd: true },
    }),

    db.booking.aggregate({
      where: { status: "COMPLETED", tutorPaidAt: null, tutorPayoutAmount: { gt: 0 } },
      _sum: { tutorPayoutUsd: true, tutorPayoutAmount: true },
      _count: { id: true },
    }),
    db.booking.groupBy({
      by: ["tutorId"],
      where: { status: "COMPLETED", tutorPaidAt: null, tutorPayoutAmount: { gt: 0 } },
      _count: { id: true },
    }).then(rows => rows.length),

    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.hrApplication.count({ where: { status: { notIn: ["ACTIVE", "SUSPENDED", "REJECTED"] } } }),

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
    usdToTnd,
    selectedYear,
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
      period1: r2(revenuePeriod1._sum.studentPriceUsd ?? 0),
      period2: r2(revenuePeriod2._sum.studentPriceUsd ?? 0),
      total:   r2(revenueTotal._sum.studentPriceUsd   ?? 0),
    },
    payoutsOwed: {
      amountUsd:   r2(payoutsOwed._sum.tutorPayoutUsd ?? 0),
      amountTnd:   r2(payoutsOwed._sum.tutorPayoutAmount ?? 0),
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
