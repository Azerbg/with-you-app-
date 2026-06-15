import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  if (app.status !== "OFFER_PENDING") {
    return NextResponse.json({ error: "Aucune offre en attente d'acceptation" }, { status: 409 });
  }

  await db.hrApplication.update({
    where: { id: app.id },
    data: {
      offerAcceptedAt: new Date(),
      offerSignedAt: new Date(),
      status: "SIGNED",
    },
  });

  return NextResponse.json({ ok: true });
}
