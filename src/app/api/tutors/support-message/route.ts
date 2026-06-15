import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(5).max(2000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  try {
    const app = await db.hrApplication.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!app) return NextResponse.json([]);

    const notes = await db.hrNote.findMany({
      where: {
        applicationId: app.id,
        OR: [
          { isFromCandidate: true },
          { visibleToCandidate: true },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        isFromCandidate: true,
        createdAt: true,
        author: { select: { email: true } },
      },
    });

    return NextResponse.json(notes);
  } catch (err) {
    console.error("[support-message GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message invalide" }, { status: 400 });

  try {
    const app = await db.hrApplication.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

    const note = await db.hrNote.create({
      data: {
        applicationId: app.id,
        authorId: null,
        content: parsed.data.content.trim(),
        isFromCandidate: true,
        visibleToCandidate: true,
      },
      select: {
        id: true,
        content: true,
        isFromCandidate: true,
        createdAt: true,
        author: { select: { email: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("[support-message POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
