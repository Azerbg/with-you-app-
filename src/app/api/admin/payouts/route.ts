import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET /api/admin/payouts ───────────────────────────────────────────────────
// Pending = COMPLETED bookings where tutorPaidAt IS NULL (all-time).
// Revenue = sum of studentPriceUsd for CONFIRMED/COMPLETED bookings created this month.

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [unpaidBookings, allPaidThisMonth, revenueThisMonth] = await Promise.all([
    // Unpaid: COMPLETED, not yet manually paid
    db.booking.findMany({
      where: { status: "COMPLETED", tutorPaidAt: null },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        scheduledAt: true,
        sessionType: true,
        durationMins: true,
        tutorPayoutAmount: true,
        tutorCurrency: true,
        studentPriceUsd: true,
        paymentProvider: true,
        tutorId: true,
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hrApplication: { select: { fullName: true } },
            tutorCompensation: { select: { currencyPref: true } },
            paymentMethod: {
              select: {
                type: true,
                accountHolder: true,
                rib: true,
                iban: true,
                swift: true,
                bankNameTn: true,
                bankNameIntl: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    // Paid this month (tutorPaidAt in current month)
    db.booking.aggregate({
      where: {
        status: "COMPLETED",
        tutorPaidAt: { gte: monthStart },
      },
      _sum: { tutorPayoutAmount: true },
      _count: { id: true },
    }),
    // Revenue this month = paid bookings by createdAt (= student payment date)
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: monthStart },
      },
      _sum: { tutorPayoutUsd: true, studentPriceUsd: true },
      _count: { id: true },
    }),
  ]);

  const r2 = (n: number) => Math.round(n * 100) / 100;

  // Group unpaid bookings by tutor
  const tutorMap = new Map<string, {
    tutorId: string;
    tutorName: string;
    currency: string;
    totalOwed: number;
    paymentMethod: typeof unpaidBookings[0]["tutor"]["paymentMethod"];
    bookings: typeof unpaidBookings;
  }>();

  for (const b of unpaidBookings) {
    const tutorName =
      (b.tutor.hrApplication?.fullName ??
      [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ")) ||
      "—";
    const currency = b.tutor.tutorCompensation?.currencyPref ?? b.tutorCurrency ?? "TND";

    if (!tutorMap.has(b.tutorId)) {
      tutorMap.set(b.tutorId, {
        tutorId: b.tutorId,
        tutorName,
        currency,
        totalOwed: 0,
        paymentMethod: b.tutor.paymentMethod,
        bookings: [],
      });
    }
    const entry = tutorMap.get(b.tutorId)!;
    entry.totalOwed += b.tutorPayoutAmount ?? 0;
    entry.bookings.push(b);
  }

  const tutors = Array.from(tutorMap.values())
    .map(e => ({ ...e, totalOwed: r2(e.totalOwed) }))
    .sort((a, b) => b.totalOwed - a.totalOwed);

  return NextResponse.json({
    tutors,
    summary: {
      pendingTutorCount:  tutors.length,
      pendingBookingCount: unpaidBookings.length,
      paidThisMonthAmount: r2(allPaidThisMonth._sum.tutorPayoutAmount ?? 0),
      paidThisMonthCount:  allPaidThisMonth._count.id,
      platformGrossUsd:    r2(revenueThisMonth._sum.studentPriceUsd ?? 0),
      platformRevenueUsd:  r2((revenueThisMonth._sum.studentPriceUsd ?? 0) - (revenueThisMonth._sum.tutorPayoutUsd ?? 0)),
    },
  });
}

// ─── POST /api/admin/payouts/mark-paid ───────────────────────────────────────
// Body: { bookingIds: string[], reference?: string }
// Sets stripeTransferId = reference (or "MANUAL-{timestamp}") on each booking.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingIds, reference, method } = await req.json() as {
    bookingIds?: string[];
    reference?: string;
    method?: string;
  };

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return NextResponse.json({ error: "bookingIds required" }, { status: 400 });
  }

  const ref = (reference?.trim()) || `MANUAL-${Date.now()}`;
  const now = new Date();

  await db.booking.updateMany({
    where: {
      id: { in: bookingIds },
      status: "COMPLETED",
      tutorPaidAt: null,
    },
    data: {
      stripeTransferId: ref,
      tutorPaidAt: now,
      tutorPaidBy: session.user.id,
      tutorPaidMethod: method ?? null,
    },
  });

  return NextResponse.json({ success: true, reference: ref, count: bookingIds.length });
}
