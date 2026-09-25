import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  process.env.AUTH_URL ??
  "https://with-you-app-red.vercel.app"
).replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/tutor/earnings?error=paypal_cancelled`
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE_URL}/auth/login`);
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const redirectUri = `${BASE_URL}/api/paypal/callback`;

  const paypalApiBase =
    process.env.PAYPAL_MODE === "sandbox"
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

  // Exchange code for access token
  const tokenRes = await fetch(
    `${paypalApiBase}/v1/identity/openidconnect/tokenservice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenRes.ok) {
    console.error("[paypal/callback] token exchange failed", await tokenRes.text());
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/tutor/earnings?error=paypal_token_failed`
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Get verified email from PayPal
  const userInfoRes = await fetch(
    `${paypalApiBase}/v1/identity/openidconnect/userinfo?schema=openid`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!userInfoRes.ok) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/tutor/earnings?error=paypal_userinfo_failed`
    );
  }

  const userInfo = await userInfoRes.json();
  const paypalEmail: string | undefined = userInfo.email;

  if (!paypalEmail) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/tutor/earnings?error=paypal_no_email`
    );
  }

  // Save verified PayPal email to DB
  await db.tutorPaymentMethod.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, type: "PAYPAL", email: paypalEmail },
    update: { type: "PAYPAL", email: paypalEmail },
  });

  return NextResponse.redirect(
    `${BASE_URL}/dashboard/tutor/earnings?paypal=connected`
  );
}
