import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import EarningsClient from "./EarningsClient";

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const [paymentMethod, payouts, compensation] = await Promise.all([
    db.tutorPaymentMethod.findUnique({ where: { userId: session.user.id } }).catch(() => null),
    db.payout.findMany({
      where: { tutorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => []),
    db.tutorCompensation.findUnique({ where: { userId: session.user.id } }).catch(() => null),
  ]);

  return (
    <EarningsClient
      paymentMethod={paymentMethod}
      payouts={payouts.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        initiatedAt: p.initiatedAt?.toISOString() ?? null,
        completedAt: p.completedAt?.toISOString() ?? null,
      }))}
      hourlyRateTnd={compensation?.hourlyRateTnd ?? null}
      currency={compensation?.currencyPref ?? "TND"}
    />
  );
}
