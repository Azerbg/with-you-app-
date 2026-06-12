import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp:   z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = schema.parse(body);

    const record = await db.tempPhoneVerification.findUnique({
      where: { phone: email },
    });

    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (record.expires < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 400 });
    }
    if (record.otp !== otp) {
      return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
    }

    await db.tempPhoneVerification.update({
      where: { phone: email },
      data:  { verified: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 422 });
    }
    console.error("[email-verify]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
