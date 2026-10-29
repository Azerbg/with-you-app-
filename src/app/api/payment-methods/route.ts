import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { resolveStripeCustomer } from "@/lib/stripe-customer";

/**
 * GET /api/payment-methods
 * Returns a unified list of saved payment methods: Stripe cards + PayPal vault tokens.
 * Shape: { methods: PaymentMethod[] }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user, paypalMethods] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true, stripeCustomerId: true } }),
    db.studentPaymentMethod.findMany({
      where: { userId, provider: "paypal", deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Stripe cards
  type StripeCard = { id: string; provider: "stripe"; type: "card"; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };
  let stripeCards: StripeCard[] = [];

  try {
    const customerId = await resolveStripeCustomer({
      userId,
      email:  user?.email,
      name:   [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
    });
    const list = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
    stripeCards = list.data.map((pm, i) => ({
      id:        pm.id,
      provider:  "stripe" as const,
      type:      "card" as const,
      brand:     pm.card?.brand ?? "card",
      last4:     pm.card?.last4 ?? "••••",
      expMonth:  pm.card?.exp_month ?? 0,
      expYear:   pm.card?.exp_year ?? 0,
      isDefault: i === 0, // first card shown as default (Stripe has no default in this app)
    }));
  } catch {
    // Stripe unavailable — return only PayPal methods
  }

  // PayPal methods
  type PayPalMethod = { id: string; provider: "paypal"; type: "paypal"; displayLabel: string; isDefault: boolean; createdAt: string };
  const paypalList: PayPalMethod[] = paypalMethods.map(m => ({
    id:           m.id,
    provider:     "paypal" as const,
    type:         "paypal" as const,
    displayLabel: m.displayLabel,
    isDefault:    m.isDefault,
    createdAt:    m.createdAt.toISOString(),
  }));

  return NextResponse.json({ methods: [...stripeCards, ...paypalList] });
}
