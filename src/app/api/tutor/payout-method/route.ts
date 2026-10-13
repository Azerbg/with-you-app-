import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pm = await db.tutorPaymentMethod.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(pm ?? null);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { type, accountHolder, iban, email, phone } = await req.json() as {
    type: string; accountHolder?: string; iban?: string; email?: string; phone?: string;
  };

  const VALID = ["WISE", "BANK_TN", "BANK_INTL", "D17"];
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 422 });
  }

  const pm = await db.tutorPaymentMethod.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, type, accountHolder: accountHolder ?? null, iban: iban ?? null, email: email ?? null, phone: phone ?? null },
    update: { type, accountHolder: accountHolder ?? null, iban: iban ?? null, email: email ?? null, phone: phone ?? null },
  });
  return NextResponse.json(pm);
}
