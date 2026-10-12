import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import { getUsdToTndRate } from "@/lib/adminSettings";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const lang   = searchParams.get("lang") === "fr" ? "fr" : "en";

  const now = new Date();
  const usdToTnd = await getUsdToTndRate();

  // Last 6 months — grouped by session date (scheduledAt)
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { month: "short", year: "2-digit" });
    months.push({ label, start, end });
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyRevenue, totals, recentBookings] = await Promise.all([
    // Revenue per month by session date
    Promise.all(months.map(m =>
      db.booking.aggregate({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          scheduledAt: { gte: m.start, lte: m.end },
        },
        _sum: { studentPriceUsd: true, tutorPayoutUsd: true, platformMargin: true },
        _count: { id: true },
      }).then(r => ({
        label: m.label,
        revenue: r._sum.studentPriceUsd ?? 0,
        payouts: r._sum.tutorPayoutUsd ?? 0,
        // Recompute margin server-side in case stored value is stale
        margin: (r._sum.studentPriceUsd ?? 0) - (r._sum.tutorPayoutUsd ?? 0),
        count:  r._count.id,
      }))
    )),
    // All-time totals
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { studentPriceUsd: true, tutorPayoutUsd: true },
      _count: { id: true },
    }),
    // For CSV
    format === "csv" ? db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true, status: true, sessionType: true, durationMins: true,
        scheduledAt: true, createdAt: true,
        studentPriceUsd: true, studentCurrency: true,
        tutorPayoutAmount: true, tutorCurrency: true, tutorPayoutUsd: true,
        platformMargin: true, paymentProvider: true,
        stripePaymentIntentId: true, paypalOrderId: true,
        student: { select: { email: true, firstName: true, lastName: true } },
        tutor:   { select: { email: true, hrApplication: { select: { fullName: true } } } },
      },
      take: 10000,
    }) : Promise.resolve(null),
  ]);

  // Payouts owed = COMPLETED bookings where tutorPaidAt IS NULL (matches Payouts page)
  const payoutsOwed = await db.booking.aggregate({
    where: { status: "COMPLETED", tutorPaidAt: null, tutorPayoutAmount: { not: null } },
    _sum: { tutorPayoutAmount: true, tutorPayoutUsd: true },
    _count: { id: true },
  });

  // Payouts paid this month
  const payoutsPaid = await db.booking.aggregate({
    where: { status: "COMPLETED", tutorPaidAt: { gte: monthStart } },
    _sum: { tutorPayoutAmount: true, tutorPayoutUsd: true },
    _count: { id: true },
  });

  if (format === "csv" && recentBookings) {
    const header = "id,status,type,duration,scheduledAt,studentEmail,tutorName,priceUSD,currency,payoutAmountLocal,payoutCurrency,payoutUSD,margin,provider,paymentId\n";
    const rows = recentBookings.map(b => {
      const tutorName = b.tutor.hrApplication?.fullName ?? b.tutor.email;
      const paymentId = b.stripePaymentIntentId ?? b.paypalOrderId ?? "";
      return [
        b.id, b.status, b.sessionType, b.durationMins,
        b.scheduledAt?.toISOString() ?? "",
        b.student.email, `"${tutorName}"`,
        b.studentPriceUsd ?? "", b.studentCurrency,
        b.tutorPayoutAmount ?? "", b.tutorCurrency,
        b.tutorPayoutUsd ?? "",
        b.platformMargin ?? "", b.paymentProvider, paymentId,
      ].join(",");
    });
    return new NextResponse(header + rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="revenue_${now.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const allTimeRevenue = totals._sum.studentPriceUsd ?? 0;
  const allTimePayoutsUsd = totals._sum.tutorPayoutUsd ?? 0;

  return NextResponse.json({
    usdToTnd,
    monthly: monthlyRevenue,
    totals: {
      revenue: allTimeRevenue,
      payoutsUsd: allTimePayoutsUsd,
      margin: allTimeRevenue - allTimePayoutsUsd,
      bookings: totals._count.id,
    },
    payoutsOwed: {
      amountLocal: payoutsOwed._sum.tutorPayoutAmount ?? 0,
      amountUsd:   payoutsOwed._sum.tutorPayoutUsd ?? 0,
      count:       payoutsOwed._count.id,
    },
    payoutsPaid: {
      amountLocal: payoutsPaid._sum.tutorPayoutAmount ?? 0,
      amountUsd:   payoutsPaid._sum.tutorPayoutUsd ?? 0,
      count:       payoutsPaid._count.id,
    },
  });
}
