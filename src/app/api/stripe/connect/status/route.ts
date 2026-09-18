import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TUTOR") return NextResponse.json({ error: "Tutors only" }, { status: 403 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  }

  try {
    const account = await stripe.v2.core.accounts.retrieve(user.stripeConnectAccountId);

    const payoutsEnabled = account.applied_configurations.includes("recipient");
    const hasOutstandingRequirements =
      Array.isArray(account.requirements?.entries) && account.requirements.entries.length > 0;

    return NextResponse.json({
      connected: true,
      accountId: user.stripeConnectAccountId,
      detailsSubmitted: !hasOutstandingRequirements,
      payoutsEnabled,
    });
  } catch {
    return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false });
  }
}
