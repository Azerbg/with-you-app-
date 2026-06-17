import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  front: z.string().min(1).max(300),
  back: z.string().min(1).max(300),
});

/** GET — list cards in a deck */
export async function GET(_req: Request, { params }: { params: Promise<{ deckId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;
  const deck = await db.flashcardDeck.findUnique({ where: { id: deckId } });
  if (!deck || deck.studentId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await db.flashcard.findMany({
    where: { deckId },
    orderBy: { createdAt: "asc" },
    select: { id: true, front: true, back: true, status: true, reviewCount: true, createdAt: true },
  });

  return NextResponse.json({ cards });
}

/** POST — add a card to a deck */
export async function POST(req: Request, { params }: { params: Promise<{ deckId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId } = await params;
  const deck = await db.flashcardDeck.findUnique({ where: { id: deckId } });
  if (!deck || deck.studentId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const card = await db.flashcard.create({
    data: { deckId, front: parsed.data.front, back: parsed.data.back },
    select: { id: true, front: true, back: true, status: true, reviewCount: true, createdAt: true },
  });

  // bump deck updatedAt
  await db.flashcardDeck.update({ where: { id: deckId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ card });
}
