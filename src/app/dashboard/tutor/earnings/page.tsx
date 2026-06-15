import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import EarningsClient from "./EarningsClient";

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const [paymentMethod, payouts, compensation] = await Promise.all([
    db.tutorPaymentMethod.findUnique({ where: { userId: session.user.id } }),
    db.payout.findMany({
      where: { tutorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.tutorCompensation.findUnique({ where: { userId: session.user.id } }),
  ]);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true },
  });

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Tuteur";

  return (
    <EarningsClient
      fullName={fullName}
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
