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
  searchParams: Promise<{ setup?: string; setup_complete?: string; paypal?: string }>;
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const params = await searchParams;
  // Support both new ?setup=success and legacy ?setup_complete=true
  const setupComplete   = params.setup === "success" || params.setup_complete === "true";
  const setupCancelled  = params.setup === "cancel";
  const paypalComplete  = params.paypal === "success";
  const paypalCancelled = params.paypal === "cancel";

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
        paymentProvider: true,
        paypalOrderId: true,
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

  // Fetch real amounts, receipt URLs and payment method from Stripe, expanding latest_charge
  type StripeEntry = { amountUsd: number; status: string; receiptUrl: string | null; paymentMethod: string | null };
  const stripeData = new Map<string, StripeEntry>();

  function getPaymentMethodLabel(charge: Stripe.Charge | null): string | null {
    const pmd = charge?.payment_method_details;
    if (!pmd) return null;
    if (pmd.type === "card" && pmd.card) {
      const wallet = pmd.card.wallet;
      if (wallet?.type === "apple_pay")  return "Apple Pay";
      if (wallet?.type === "google_pay") return "Google Pay";
      if (wallet?.type === "link")       return "Link";
      const brand = pmd.card.brand ?? "card";
      const last4 = pmd.card.last4;
      const label = brand.charAt(0).toUpperCase() + brand.slice(1);
      return last4 ? `${label} ···· ${last4}` : label;
    }
    if (pmd.type === "paypal") return "PayPal";
    if (pmd.type === "link")   return "Link";
    return null;
  }

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
          paymentMethod: getPaymentMethodLabel(charge),
        });
      }
    } catch {
      // Stripe unavailable — fall back to DB values
    }
  }

  const paymentHistory = bookings.map((b) => {
    const isPayPal   = b.paymentProvider === "paypal" || !!b.paypalOrderId;
    const pi         = b.stripePaymentIntentId ? stripeData.get(b.stripePaymentIntentId) : undefined;
    const hasPayment = !!(b.stripePaymentIntentId || b.paypalOrderId);
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
      amountUsd:        isPayPal ? (b.studentPriceUsd ?? 0) : (pi?.amountUsd ?? (hasPayment ? (b.studentPriceUsd ?? 0) : 0)),
      stripeStatus:     isPayPal ? "succeeded" : (pi?.status ?? (hasPayment ? "succeeded" : "no_charge")),
      creditAppliedTnd: b.creditAppliedTnd,
      receiptUrl:       isPayPal ? null : (pi?.receiptUrl ?? null),
      paymentMethod:    isPayPal ? "PayPal" : (pi?.paymentMethod ?? null),
    };
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <PaymentSetupClient setupComplete={setupComplete} setupCancelled={setupCancelled} paypalComplete={paypalComplete} paypalCancelled={paypalCancelled} paymentHistory={paymentHistory} />
    </div>
  );
}
