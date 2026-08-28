import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.AUTH_URL ?? "https://with-you-app-red.vercel.app";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "TUTOR") {
      return NextResponse.json({ error: "Tutors only" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, stripeConnectAccountId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let accountId = user.stripeConnectAccountId;

    if (!accountId) {
      // Accounts v2 API (required for Stripe API version 2026-02-25.clover+)
      const account = await stripe.v2.core.accounts.create({
        ...(user.email ? { contact_email: user.email } : {}),
      });
      accountId = account.id;
      await db.user.update({
        where: { id: user.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${BASE_URL}/dashboard/tutor?connect=refresh`,
      return_url: `${BASE_URL}/api/stripe/connect/return?account=${accountId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[stripe/connect/onboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
