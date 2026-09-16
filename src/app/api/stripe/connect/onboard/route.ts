import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.AUTH_URL ?? "https://with-you-app-red.vercel.app";

// Countries not supported by Stripe Connect — fall back to FR
const UNSUPPORTED_COUNTRIES = ["TN", "DZ", "MA", "LY"];

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
      select: {
        id: true,
        email: true,
        stripeConnectAccountId: true,
        hrApplication: { select: { country: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let accountId = user.stripeConnectAccountId;

    // Validate existing account — if it no longer exists on Stripe, reset
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch {
        accountId = null;
        await db.user.update({
          where: { id: user.id },
          data: { stripeConnectAccountId: null },
        });
      }
    }

    if (!accountId) {
      const rawCountry = user.hrApplication?.country ?? "FR";
      const country = UNSUPPORTED_COUNTRIES.includes(rawCountry) ? "FR" : rawCountry;

      const account = await stripe.accounts.create({
        type: "express",
        country,
        ...(user.email ? { email: user.email } : {}),
        capabilities: {
          transfers: { requested: true },
        },
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
