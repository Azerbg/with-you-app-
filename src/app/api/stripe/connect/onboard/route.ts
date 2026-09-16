import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    ?? process.env.AUTH_URL
    ?? "https://with-you-app-red.vercel.app";
  // strip trailing slash
  return url.replace(/\/$/, "");
})();

const SUPPORTED_COUNTRIES = [
  "AU","AT","BE","BR","BG","CA","HR","CY","CZ","DK","EE","FI","FR","DE",
  "GH","GI","GR","HK","HU","IN","ID","IE","IT","JP","KE","LV","LI","LT",
  "LU","MY","MT","MX","NL","NZ","NG","NO","PL","PT","RO","SG","SK","SI",
  "ES","SE","CH","TH","AE","GB","US",
];

function getSupportedCountry(country: string | null | undefined): string {
  if (country && SUPPORTED_COUNTRIES.includes(country)) return country;
  return "FR";
}

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

    // Reset if account is missing or doesn't have both required configurations
    if (accountId) {
      let needsReset = false;
      try {
        const existing = await stripe.v2.core.accounts.retrieve(accountId);
        const configs = existing.applied_configurations ?? [];
        if (!configs.includes("recipient") || !configs.includes("merchant")) {
          needsReset = true;
        }
      } catch {
        needsReset = true;
      }
      if (needsReset) {
        accountId = null;
        await db.user.update({
          where: { id: user.id },
          data: { stripeConnectAccountId: null },
        });
      }
    }

    if (!accountId) {
      const country = getSupportedCountry(user.hrApplication?.country);

      const account = await stripe.v2.core.accounts.create({
        ...(user.email ? { contact_email: user.email } : {}),
        dashboard: "express",
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        identity: { country },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
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

    // Read applied_configurations directly from the account to avoid mismatch
    const currentAccount = await stripe.v2.core.accounts.retrieve(accountId);
    type Configuration = "merchant" | "recipient";
    const appliedConfigs = (currentAccount.applied_configurations ?? []) as Configuration[];

    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: appliedConfigs,
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
