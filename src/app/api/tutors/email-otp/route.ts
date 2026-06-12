import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailOtpCode } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Reuse TempPhoneVerification table — store email as the "phone" key
    await db.tempPhoneVerification.upsert({
      where:  { phone: email },
      create: { phone: email, otp, expires, verified: false },
      update: { otp, expires, verified: false },
    });

    const devMode = !process.env.EMAIL_SERVER_HOST;

    if (!devMode) {
      await sendEmailOtpCode(email, otp);
    }

    return NextResponse.json({
      success: true,
      devMode,
      ...(devMode ? { otp } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_email" }, { status: 422 });
    }
    console.error("[email-otp]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
