import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET /api/admin/payouts ───────────────────────────────────────────────────
// Returns completed bookings grouped by tutor with pending payout amounts.
// A booking is "unpaid" when status=COMPLETED and stripeTransferId is null.

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [unpaidBookings, allPaidThisMonth] = await Promise.all([
    // Unpaid: COMPLETED, no payout reference yet
    db.booking.findMany({
      where: { status: "COMPLETED", stripeTransferId: null, tutorPayoutAmount: { gt: 0 } },
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
    // Paid this month for summary stat
    db.booking.aggregate({
      where: {
        status: "COMPLETED",
        stripeTransferId: { not: null },
        scheduledAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { tutorPayoutAmount: true },
      _count: { id: true },
    }),
  ]);

  // Platform revenue (student price minus payout) for completed bookings this month
  const revenueThisMonth = await db.booking.aggregate({
    where: {
      status: "COMPLETED",
      createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
    _sum: { platformMargin: true, studentPriceUsd: true },
    _count: { id: true },
  });

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

  const tutors = Array.from(tutorMap.values()).sort((a, b) => b.totalOwed - a.totalOwed);

  return NextResponse.json({
    tutors,
    summary: {
      pendingTutorCount:  tutors.length,
      pendingBookingCount: unpaidBookings.length,
      paidThisMonthAmount: allPaidThisMonth._sum.tutorPayoutAmount ?? 0,
      paidThisMonthCount:  allPaidThisMonth._count.id,
      platformRevenueUsd:  revenueThisMonth._sum.platformMargin ?? 0,
      platformGrossUsd:    revenueThisMonth._sum.studentPriceUsd ?? 0,
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

  const { bookingIds, reference } = await req.json() as {
    bookingIds?: string[];
    reference?: string;
  };

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return NextResponse.json({ error: "bookingIds required" }, { status: 400 });
  }

  const ref = (reference?.trim()) || `MANUAL-${Date.now()}`;

  await db.booking.updateMany({
    where: {
      id: { in: bookingIds },
      status: "COMPLETED",
      stripeTransferId: null,
    },
    data: { stripeTransferId: ref },
  });

  return NextResponse.json({ success: true, reference: ref, count: bookingIds.length });
}
