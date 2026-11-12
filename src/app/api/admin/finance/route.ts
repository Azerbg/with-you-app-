import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import { getUsdToTndRate } from "@/lib/adminSettings";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const r2 = (n: number) => Math.round(n * 100) / 100;

  try {
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

    // Platform account settings
    const accountSettings = await db.setting.findMany({
      where: { key: { in: ["platformPaypalEmail", "platformAccountHolder", "platformAccountNote"] } },
    });
    const accountMap: Record<string, string> = {};
    for (const s of accountSettings) accountMap[s.key] = s.value;

    const [monthlyRevenue, totals, recentBookings, recentPayments] = await Promise.all([
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
          revenue: r2(r._sum.studentPriceUsd ?? 0),
          payouts: r2(r._sum.tutorPayoutUsd ?? 0),
          margin: r2((r._sum.studentPriceUsd ?? 0) - (r._sum.tutorPayoutUsd ?? 0)),
          count:  r._count.id,
        }))
      )),
      // All-time totals
      db.booking.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { studentPriceUsd: true, tutorPayoutUsd: true },
        _count: { id: true },
      }),
      // For CSV export
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
      // Recent incoming payments (last 50 confirmed/completed)
      db.booking.findMany({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          scheduledAt: true,
          sessionType: true,
          durationMins: true,
          studentPriceUsd: true,
          platformMargin: true,
          paymentProvider: true,
          status: true,
          student: { select: { firstName: true, lastName: true, email: true } },
          tutor:   { select: { hrApplication: { select: { fullName: true } }, firstName: true, lastName: true } },
        },
      }),
    ]);

    // Payouts owed = COMPLETED bookings where tutorPaidAt IS NULL
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
          b.studentPriceUsd?.toFixed(2) ?? "", b.studentCurrency,
          b.tutorPayoutAmount?.toFixed(2) ?? "", b.tutorCurrency,
          b.tutorPayoutUsd?.toFixed(2) ?? "",
          b.platformMargin?.toFixed(2) ?? "", b.paymentProvider, paymentId,
        ].join(",");
      });
      return new NextResponse(header + rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="revenue_${now.toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const allTimeRevenue    = totals._sum.studentPriceUsd ?? 0;
    const allTimePayoutsUsd = totals._sum.tutorPayoutUsd ?? 0;

    return NextResponse.json({
      usdToTnd,
      platformAccount: {
        paypalEmail:     accountMap.platformPaypalEmail ?? "",
        accountHolder:   accountMap.platformAccountHolder ?? "",
        note:            accountMap.platformAccountNote ?? "",
      },
      monthly: monthlyRevenue,
      totals: {
        revenue:    r2(allTimeRevenue),
        payoutsUsd: r2(allTimePayoutsUsd),
        margin:     r2(allTimeRevenue - allTimePayoutsUsd),
        bookings:   totals._count.id,
      },
      payoutsOwed: {
        amountLocal: r2(payoutsOwed._sum.tutorPayoutAmount ?? 0),
        amountUsd:   r2(payoutsOwed._sum.tutorPayoutUsd ?? 0),
        count:       payoutsOwed._count.id,
      },
      payoutsPaid: {
        amountLocal: r2(payoutsPaid._sum.tutorPayoutAmount ?? 0),
        amountUsd:   r2(payoutsPaid._sum.tutorPayoutUsd ?? 0),
        count:       payoutsPaid._count.id,
      },
      recentPayments: recentPayments.map(b => ({
        id:            b.id,
        createdAt:     b.createdAt.toISOString(),
        scheduledAt:   b.scheduledAt?.toISOString() ?? null,
        sessionType:   b.sessionType,
        durationMins:  b.durationMins,
        amountUsd:     r2(b.studentPriceUsd ?? 0),
        marginUsd:     r2(b.platformMargin ?? 0),
        provider:      b.paymentProvider,
        status:        b.status,
        studentName:   [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email,
        tutorName:     b.tutor.hrApplication?.fullName ?? [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ") ?? "—",
      })),
    });
  } catch (err) {
    console.error("[finance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
