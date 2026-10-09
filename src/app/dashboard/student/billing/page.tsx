import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PaymentSetupClient from "@/app/settings/payment/PaymentSetupClient";

interface Props {
  searchParams: Promise<{ setup_complete?: string }>;
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const params = await searchParams;
  const setupComplete = params.setup_complete === "true";

  const completedBookings = await db.booking.findMany({
    where: { studentId: session.user.id, status: "COMPLETED" },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    select: {
      id: true,
      scheduledAt: true,
      sessionType: true,
      studentPriceUsd: true,
      studentCurrency: true,
      creditAppliedTnd: true,
      tutor: {
        select: {
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
        },
      },
    },
  });

  const paymentHistory = completedBookings.map((b) => ({
    id: b.id,
    scheduledAt: b.scheduledAt.toISOString(),
    sessionType: b.sessionType,
    tutorName:
      b.tutor.firstName && b.tutor.lastName
        ? `${b.tutor.firstName} ${b.tutor.lastName}`
        : b.tutor.hrApplication?.fullName ?? "—",
    amountUsd: b.studentPriceUsd ?? 0,
    currency: b.studentCurrency,
    creditAppliedTnd: b.creditAppliedTnd,
  }));

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PaymentSetupClient setupComplete={setupComplete} paymentHistory={paymentHistory} />
    </div>
  );
}
