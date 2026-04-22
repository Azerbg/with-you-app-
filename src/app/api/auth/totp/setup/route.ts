import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSecret, keyUri } from "@/lib/totp";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "HR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = generateSecret();

  await db.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const otpauth = keyUri(session.user.email!, "WithYou", secret);

  return NextResponse.json({ secret, otpauth });
}
