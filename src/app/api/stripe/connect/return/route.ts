import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const BASE_URL = process.env.AUTH_URL ?? "https://with-you-app-red.vercel.app";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE_URL}/auth/login`);
  }

  const accountId = req.nextUrl.searchParams.get("account");
  if (!accountId) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/tutor?connect=error`);
  }

  // Verify this account belongs to the current tutor
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user || user.stripeConnectAccountId !== accountId) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/tutor?connect=error`);
  }

  // Check if onboarding is complete
  const account = await stripe.accounts.retrieve(accountId);
  const isComplete = account.details_submitted;

  if (isComplete) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/tutor?connect=success`);
  } else {
    // Onboarding incomplete — redirect back
    return NextResponse.redirect(`${BASE_URL}/dashboard/tutor?connect=incomplete`);
  }
}
