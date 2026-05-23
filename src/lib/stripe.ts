import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY not set — Stripe features disabled.");
}

// API version matches @stripe/stripe-js client version (2025-09-30.clover)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion,
});
