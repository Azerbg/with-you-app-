import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { type, accountHolder, iban, email, phone } = await req.json() as {
    type: string; accountHolder?: string; iban?: string; email?: string; phone?: string;
  };

  const VALID = ["WISE", "BANK_TN", "BANK_INTL", "D17"];
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 422 });
  }

  const pm = await db.tutorPaymentMethod.upsert({
    where: { userId: id },
    create: { userId: id, type, accountHolder: accountHolder ?? null, iban: iban ?? null, email: email ?? null, phone: phone ?? null },
    update: { type, accountHolder: accountHolder ?? null, iban: iban ?? null, email: email ?? null, phone: phone ?? null },
  });
  return NextResponse.json(pm);
}
