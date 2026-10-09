import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

/**
 * Returns a valid Stripe customer ID for the given user.
 *
 * If the stored ID is stale (resource_missing or soft-deleted in Stripe),
 * silently creates a new customer, persists the new ID, and returns it.
 * Any other Stripe error is re-thrown so the caller can handle it.
 */
export async function resolveStripeCustomer(params: {
  userId: string;
  email?: string | null;
  name?: string | null;
}): Promise<string> {
  const { userId, email, name } = params;

  const stored = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (stored?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stored.stripeCustomerId);
      if (!(customer as Stripe.DeletedCustomer).deleted) return customer.id;
      // Soft-deleted — fall through to recreate
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "resource_missing") throw err;
      // resource_missing — stale ID, fall through to recreate
    }
    console.warn(`[stripe-customer] Stale customer ID ${stored.stripeCustomerId} for user ${userId} — creating new one`);
  }

  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    ...(name  ? { name  } : {}),
    metadata: { userId },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/** Map any Stripe/server error to a UI-safe friendly message. */
export function friendlyStripeError(lang: "fr" | "en" = "fr"): string {
  return lang === "en"
    ? "Payment is temporarily unavailable. Please try again later or contact support."
    : "Le paiement est temporairement indisponible. Veuillez réessayer plus tard ou contacter le support.";
}
