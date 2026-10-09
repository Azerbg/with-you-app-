import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import PaymentSetupClient from "@/app/settings/payment/PaymentSetupClient";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "Billing — WithYou" : "Facturation — WithYou" };
}

interface Props {
  searchParams: Promise<{ setup_complete?: string }>;
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const params = await searchParams;
  const setupComplete = params.setup_complete === "true";

  const [bookings, studentUser] = await Promise.all([
    db.booking.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ["CONFIRMED", "COMPLETED", "CANCELLED"] },
      },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      select: {
        id: true,
        scheduledAt: true,
        sessionType: true,
        durationMins: true,
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

  // Fetch real amounts + receipt URLs from Stripe, expanding latest_charge
  type StripeEntry = { amountUsd: number; status: string; receiptUrl: string | null };
  const stripeData = new Map<string, StripeEntry>();
  if (studentUser?.stripeCustomerId) {
    try {
      const intents = await stripe.paymentIntents.list({
        customer: studentUser.stripeCustomerId,
        limit: 100,
        expand: ["data.latest_charge"],
      });
      for (const pi of intents.data) {
        const charge = pi.latest_charge as Stripe.Charge | null;
        stripeData.set(pi.id, {
          amountUsd: pi.amount_received / 100,
          status: charge?.refunded ? "refunded" : pi.status,
          receiptUrl: charge?.receipt_url ?? null,
        });
      }
    } catch {
      // Stripe unavailable — fall back to DB values
    }
  }

  const paymentHistory = bookings.map((b) => {
    const pi = b.stripePaymentIntentId ? stripeData.get(b.stripePaymentIntentId) : undefined;
    const hasPayment = !!b.stripePaymentIntentId;
    return {
      id: b.id,
      scheduledAt: b.scheduledAt.toISOString(),
      sessionType: b.sessionType,
      durationMins: b.durationMins,
      tutorName:
        b.tutor.firstName && b.tutor.lastName
          ? `${b.tutor.firstName} ${b.tutor.lastName}`
          : b.tutor.hrApplication?.fullName ?? "—",
      hasPayment,
      amountUsd: pi?.amountUsd ?? (hasPayment ? (b.studentPriceUsd ?? 0) : 0),
      stripeStatus: pi?.status ?? (hasPayment ? "succeeded" : "no_charge"),
      creditAppliedTnd: b.creditAppliedTnd,
      receiptUrl: pi?.receiptUrl ?? null,
    };
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PaymentSetupClient setupComplete={setupComplete} paymentHistory={paymentHistory} />
    </div>
  );
}
