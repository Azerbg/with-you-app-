import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTOTP } from "@/lib/totp";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "HR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "No secret found. Call /setup first." }, { status: 400 });
  }

  const isValid = verifyTOTP(code, user.totpSecret);
  if (!isValid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return NextResponse.json({ ok: true });
}
