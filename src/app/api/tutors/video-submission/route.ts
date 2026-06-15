import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  videoUrl: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  if (app.status !== "VIDEO_REQUESTED") {
    return NextResponse.json({ error: "Soumission de video non attendue pour ce statut" }, { status: 409 });
  }

  await db.hrApplication.update({
    where: { id: app.id },
    data: {
      videoSubmissionUrl: parsed.data.videoUrl,
      videoSubmittedAt: new Date(),
      status: "VIDEO_SUBMITTED",
    },
  });

  return NextResponse.json({ ok: true });
}
