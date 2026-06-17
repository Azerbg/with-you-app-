import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["new", "learning", "known"]).optional(),
  front: z.string().min(1).max(300).optional(),
  back: z.string().min(1).max(300).optional(),
});

async function ownsCard(userId: string, cardId: string) {
  const card = await db.flashcard.findUnique({
    where: { id: cardId },
    include: { deck: { select: { studentId: true } } },
  });
  return card && card.deck.studentId === userId ? card : null;
}

/** PATCH — update card status or content */
export async function PATCH(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await ownsCard(session.user.id, cardId);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const updated = await db.flashcard.update({
    where: { id: cardId },
    data: {
      ...(parsed.data.status !== undefined && { status: parsed.data.status, reviewCount: { increment: 1 } }),
      ...(parsed.data.front !== undefined && { front: parsed.data.front }),
      ...(parsed.data.back !== undefined && { back: parsed.data.back }),
    },
    select: { id: true, front: true, back: true, status: true, reviewCount: true },
  });

  return NextResponse.json({ card: updated });
}

/** DELETE — remove a card */
export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await ownsCard(session.user.id, cardId);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.flashcard.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
