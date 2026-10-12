import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { headers, cookies } from "next/headers";
import { resolveStripeCustomer, friendlyStripeError } from "@/lib/stripe-customer";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lang = ((await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr") as "en" | "fr";

  try {
    const headersList = await headers();
    const referer = headersList.get("referer") ?? "";
    let origin = headersList.get("origin") ?? "";
    if (!origin && referer) {
      try { origin = new URL(referer).origin; } catch { /* ignore */ }
    }
    if (!origin) origin = "https://with-you-app-red.vercel.app";

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // resolveStripeCustomer handles stale/deleted customer IDs automatically
    const customerId = await resolveStripeCustomer({
      userId: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      // currency required when payment_method_types is omitted (dynamic payment methods)
      currency: "usd",
      success_url: `${origin}/dashboard/student/billing?setup=success`,
      cancel_url:  `${origin}/dashboard/student/billing?setup=cancel`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const err = error as { type?: string; code?: string; message?: string };
    console.error("[STRIPE_SETUP_CHECKOUT]", err.type, err.code, err.message ?? error);
    return NextResponse.json({ error: friendlyStripeError(lang) }, { status: 500 });
  }
}
