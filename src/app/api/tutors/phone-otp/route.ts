import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSmsOtp } from "@/lib/twilio";
import { z } from "zod";

const schema = z.object({ phone: z.string().min(8) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.tempPhoneVerification.upsert({
      where: { phone },
      create: { phone, otp, expires, verified: false },
      update: { otp, expires, verified: false },
    });

    const result = await sendSmsOtp(phone, otp);

    if (!result.success) {
      return NextResponse.json({ error: "sms_failed" }, { status: 500 });
    }

    // In dev mode (no Twilio configured), return the OTP so it can be shown in UI
    return NextResponse.json({
      success: true,
      devMode: result.devMode,
      ...(result.devMode ? { otp } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 422 });
    }
    console.error("[phone-otp]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
