import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  language: z.string().max(40).optional(),
});

/** GET — list all decks for current student with card counts */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decks = await db.flashcardDeck.findMany({
    where: { studentId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { cards: true } },
      cards: { select: { status: true } },
    },
  });

  return NextResponse.json({
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      language: d.language,
      cardCount: d._count.cards,
      knownCount: d.cards.filter((c) => c.status === "known").length,
      newCount: d.cards.filter((c) => c.status === "new").length,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

/** POST — create a deck */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const deck = await db.flashcardDeck.create({
    data: {
      studentId: session.user.id,
      name: parsed.data.name,
      language: parsed.data.language ?? "",
    },
  });

  return NextResponse.json({ deck: { id: deck.id, name: deck.name, language: deck.language, cardCount: 0, knownCount: 0, newCount: 0, createdAt: deck.createdAt.toISOString() } });
}

/** DELETE — delete a deck */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deckId = searchParams.get("deckId");
  if (!deckId) return NextResponse.json({ error: "Missing deckId" }, { status: 400 });

  const deck = await db.flashcardDeck.findUnique({ where: { id: deckId } });
  if (!deck || deck.studentId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.flashcardDeck.delete({ where: { id: deckId } });
  return NextResponse.json({ ok: true });
}
