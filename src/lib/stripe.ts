import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("[Stripe] STRIPE_SECRET_KEY is not set — all Stripe calls will fail.");
} else if (!secretKey.startsWith("sk_")) {
  console.error(`[Stripe] STRIPE_SECRET_KEY looks wrong (prefix: "${secretKey.slice(0, 7)}…") — must start with sk_test_ or sk_live_.`);
}

const pubKey = process.env.STRIPE_PUBLISHABLE_KEY;
if (!pubKey) {
  console.error("[Stripe] STRIPE_PUBLISHABLE_KEY is not set — Payment Element will fail.");
} else if (!pubKey.startsWith("pk_")) {
  console.error(`[Stripe] STRIPE_PUBLISHABLE_KEY looks wrong (prefix: "${pubKey.slice(0, 7)}…") — must start with pk_test_ or pk_live_. Ensure both keys are from the SAME Stripe account and mode.`);
}

export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  apiVersion: "2026-02-25.clover",
});
