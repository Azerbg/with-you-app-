import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format"); // "csv"

  const now = new Date();

  // Last 6 months
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    months.push({ label, start, end });
  }

  const [monthlyRevenue, totals, payouts, recentBookings] = await Promise.all([
    // Revenue per month
    Promise.all(months.map(m =>
      db.booking.aggregate({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          scheduledAt: { gte: m.start, lte: m.end },
        },
        _sum: { studentPriceUsd: true, platformMargin: true },
        _count: { id: true },
      }).then(r => ({
        label: m.label,
        revenue: r._sum.studentPriceUsd ?? 0,
        margin:  r._sum.platformMargin  ?? 0,
        count:   r._count.id,
      }))
    )),
    // All-time totals
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { studentPriceUsd: true, tutorPayoutAmount: true, platformMargin: true },
      _count: { id: true },
    }),
    // Payout summary
    db.payout.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    // For CSV: all completed bookings
    format === "csv" ? db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true, status: true, sessionType: true, durationMins: true,
        scheduledAt: true, createdAt: true,
        studentPriceUsd: true, studentCurrency: true,
        tutorPayoutAmount: true, tutorCurrency: true,
        platformMargin: true, paymentProvider: true,
        stripePaymentIntentId: true, paypalOrderId: true,
        student: { select: { email: true, firstName: true, lastName: true } },
        tutor:   { select: { email: true, hrApplication: { select: { fullName: true } } } },
      },
      take: 10000,
    }) : Promise.resolve(null),
  ]);

  if (format === "csv" && recentBookings) {
    const header = "id,status,type,duration,scheduledAt,studentEmail,tutorName,priceUSD,currency,payoutAmount,payoutCurrency,margin,provider,paymentId\n";
    const rows = recentBookings.map(b => {
      const tutorName = b.tutor.hrApplication?.fullName ??
        [b.tutor.email].join("");
      const paymentId = b.stripePaymentIntentId ?? b.paypalOrderId ?? "";
      return [
        b.id, b.status, b.sessionType, b.durationMins,
        b.scheduledAt?.toISOString() ?? "",
        b.student.email, `"${tutorName}"`,
        b.studentPriceUsd ?? "", b.studentCurrency,
        b.tutorPayoutAmount ?? "", b.tutorCurrency,
        b.platformMargin ?? "", b.paymentProvider, paymentId,
      ].join(",");
    });
    const csv = header + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="revenue_${now.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    monthly: monthlyRevenue,
    totals: {
      revenue: totals._sum.studentPriceUsd ?? 0,
      payouts: totals._sum.tutorPayoutAmount ?? 0,
      margin:  totals._sum.platformMargin  ?? 0,
      bookings: totals._count.id,
    },
    payouts: payouts.map(p => ({ status: p.status, amount: p._sum.amount ?? 0, count: p._count.id })),
  });
}
