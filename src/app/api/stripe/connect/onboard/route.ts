import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.AUTH_URL ?? "https://with-you-app-red.vercel.app";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR") return NextResponse.json({ error: "Tutors only" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeConnectAccountId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let accountId = user.stripeConnectAccountId;

  // Create a new Connect Express account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: { interval: "weekly", weekly_anchor: "friday" },
        },
      },
    });
    accountId = account.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  // Generate onboarding link (valid for 24h)
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${BASE_URL}/api/stripe/connect/onboard`,
    return_url: `${BASE_URL}/api/stripe/connect/return?account=${accountId}`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
