import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTOTP } from "@/lib/totp";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: "TOTP not set up" }, { status: 400 });
  }

  const isValid = verifyTOTP(code, user.totpSecret);
  if (!isValid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  return NextResponse.json({ ok: true });

}
