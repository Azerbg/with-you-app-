import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
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

  const [completedBookings, studentUser] = await Promise.all([
    db.booking.findMany({
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
        stripePaymentIntentId: true,
        tutor: {
          select: {
            firstName: true,
            lastName: true,
            hrApplication: { select: { fullName: true } },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    }),
  ]);

  // Fetch real amounts from Stripe in one call if we have a customer ID
  const stripeAmounts = new Map<string, { amountUsd: number; status: string }>();
  if (studentUser?.stripeCustomerId) {
    try {
      const intents = await stripe.paymentIntents.list({
        customer: studentUser.stripeCustomerId,
        limit: 100,
      });
      for (const pi of intents.data) {
        stripeAmounts.set(pi.id, {
          amountUsd: pi.amount / 100,
          status: pi.status,
        });
      }
    } catch {
      // Stripe unavailable — fall back to DB values
    }
  }

  const paymentHistory = completedBookings.map((b) => {
    const pi = b.stripePaymentIntentId ? stripeAmounts.get(b.stripePaymentIntentId) : undefined;
    return {
      id: b.id,
      scheduledAt: b.scheduledAt.toISOString(),
      sessionType: b.sessionType,
      tutorName:
        b.tutor.firstName && b.tutor.lastName
          ? `${b.tutor.firstName} ${b.tutor.lastName}`
          : b.tutor.hrApplication?.fullName ?? "—",
      amountUsd: pi?.amountUsd ?? b.studentPriceUsd ?? 0,
      stripeStatus: pi?.status ?? "succeeded",
      creditAppliedTnd: b.creditAppliedTnd,
    };
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PaymentSetupClient setupComplete={setupComplete} paymentHistory={paymentHistory} />
    </div>
  );
}
