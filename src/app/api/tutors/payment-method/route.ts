import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["BANK_TN", "BANK_INTL", "PAYPAL", "WISE", "D17"]),
  bankNameTn:    z.string().optional(),
  accountHolder: z.string().optional(),
  rib:           z.string().optional(),
  iban:          z.string().optional(),
  swift:         z.string().optional(),
  bankNameIntl:  z.string().optional(),
  email:         z.string().email().optional().or(z.literal("")),
  phone:         z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const method = await db.tutorPaymentMethod.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(method ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });

  const data = parsed.data;

  const method = await db.tutorPaymentMethod.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: { ...data },
  });

  return NextResponse.json(method);
}
