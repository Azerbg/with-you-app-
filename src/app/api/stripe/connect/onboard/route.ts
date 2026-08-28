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

    // Verify the saved account still exists in Stripe (clear stale IDs from old environments)
    if (accountId) {
      try {
        await stripe.v2.core.accounts.retrieve(accountId);
      } catch {
        accountId = null;
        await db.user.update({
          where: { id: user.id },
          data: { stripeConnectAccountId: null },
        });
      }
    }

    if (!accountId) {
      // Accounts v2 API — required for Stripe API version 2026-02-25.clover+
      // Must specify configuration.recipient so the account has the "recipient"
      // applied_configuration — required to create an account_link with configurations: ["recipient"]
      const account = await stripe.v2.core.accounts.create({
        ...(user.email ? { contact_email: user.email } : {}),
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
      });
      accountId = account.id;
      await db.user.update({
        where: { id: user.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Account Links v2 — use_case replaces the flat type/refresh_url/return_url
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${BASE_URL}/dashboard/tutor?connect=refresh`,
          return_url: `${BASE_URL}/api/stripe/connect/return?account=${accountId}`,
        },
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[stripe/connect/onboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
