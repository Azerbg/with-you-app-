import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/payouts/history
// Returns all bookings that have been manually paid (tutorPaidAt IS NOT NULL),
// grouped by payout batch (stripeTransferId = reference).
// Supports ?format=csv for CSV export.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  const paidBookings = await db.booking.findMany({
    where: { tutorPaidAt: { not: null } },
    orderBy: { tutorPaidAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      sessionType: true,
      durationMins: true,
      tutorPayoutAmount: true,
      tutorCurrency: true,
      studentPriceUsd: true,
      stripeTransferId: true,
      tutorPaidAt: true,
      tutorPaidBy: true,
      tutorPaidMethod: true,
      tutorId: true,
      tutor: {
        select: {
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
          tutorCompensation: { select: { currencyPref: true } },
        },
      },
    },
  });

  // Fetch admin names for paidBy IDs
  const adminIds = [...new Set(paidBookings.map(b => b.tutorPaidBy).filter(Boolean))] as string[];
  const admins = adminIds.length > 0
    ? await db.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, email: true, firstName: true, lastName: true } })
    : [];
  const adminMap = Object.fromEntries(admins.map(a => [a.id, a]));

  if (format === "csv") {
    const header = "reference,paidAt,tutorName,method,amount,currency,sessions,paidBy\n";
    // Group by reference for CSV (one row per batch)
    const batches = new Map<string, { ref: string; paidAt: Date; tutorName: string; method: string; amount: number; currency: string; count: number; paidBy: string }>();
    for (const b of paidBookings) {
      const ref = b.stripeTransferId ?? `MANUAL-${b.tutorPaidAt?.getTime()}`;
      const batchKey = `${b.tutorId}::${ref}`;
      const tutorName = b.tutor.hrApplication?.fullName ?? [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ") || "—";
      const admin = b.tutorPaidBy ? adminMap[b.tutorPaidBy] : null;
      const paidByLabel = admin ? ([admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email) : "";
      if (!batches.has(batchKey)) {
        batches.set(batchKey, { ref, paidAt: b.tutorPaidAt!, tutorName, method: b.tutorPaidMethod ?? "", amount: 0, currency: b.tutor.tutorCompensation?.currencyPref ?? b.tutorCurrency, count: 0, paidBy: paidByLabel });
      }
      const entry = batches.get(batchKey)!;
      entry.amount += b.tutorPayoutAmount ?? 0;
      entry.count += 1;
    }
    const rows = Array.from(batches.values()).map(r =>
      [r.ref, r.paidAt.toISOString(), `"${r.tutorName}"`, r.method, r.amount.toFixed(2), r.currency, r.count, `"${r.paidBy}"`].join(",")
    );
    const csv = header + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payout_history_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Group into payout batches: key = tutorId + stripeTransferId
  const batchMap = new Map<string, {
    reference: string;
    paidAt: string;
    tutorId: string;
    tutorName: string;
    method: string | null;
    amount: number;
    currency: string;
    bookingCount: number;
    paidByEmail: string;
  }>();

  for (const b of paidBookings) {
    const ref = b.stripeTransferId ?? `MANUAL-${b.tutorPaidAt?.getTime()}`;
    const batchKey = `${b.tutorId}::${ref}`;
    const tutorName = b.tutor.hrApplication?.fullName ?? [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ") || "—";
    const admin = b.tutorPaidBy ? adminMap[b.tutorPaidBy] : null;
    const paidByEmail = admin ? ([admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email) : "—";
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        reference: ref,
        paidAt: b.tutorPaidAt!.toISOString(),
        tutorId: b.tutorId,
        tutorName,
        method: b.tutorPaidMethod,
        amount: 0,
        currency: b.tutor.tutorCompensation?.currencyPref ?? b.tutorCurrency,
        bookingCount: 0,
        paidByEmail,
      });
    }
    const entry = batchMap.get(batchKey)!;
    entry.amount += b.tutorPayoutAmount ?? 0;
    entry.bookingCount += 1;
  }

  const history = Array.from(batchMap.values());
  return NextResponse.json({ history });
}
