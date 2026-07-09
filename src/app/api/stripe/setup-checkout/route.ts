import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${origin}/dashboard/student?card=added`,
      cancel_url: `${origin}/dashboard/student`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE_SETUP_CHECKOUT]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
