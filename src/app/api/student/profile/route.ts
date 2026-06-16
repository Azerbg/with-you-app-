import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  firstName:            z.string().max(50).optional(),
  lastName:             z.string().max(50).optional(),
  pendingImage:         z.string().optional(),
  nativeLanguage:       z.string().optional(),
  targetLanguage:       z.string().optional(),
  learningObjective:    z.string().optional(),
  sessionFrequency:     z.string().optional(),
  programDuration:      z.string().optional(),
  availabilityDays:     z.array(z.string()).optional(),
  timeWindowPreference: z.array(z.string()).optional(),
  country:              z.string().optional(),
  timezone:             z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const d = parsed.data;

  try {
    const userUpdate: Record<string, string | null> = {};
    if (d.firstName !== undefined) userUpdate.firstName = d.firstName || null;
    if (d.lastName  !== undefined) userUpdate.lastName  = d.lastName  || null;
    if (d.pendingImage !== undefined) userUpdate.pendingImage = d.pendingImage;
    if (d.timezone !== undefined) userUpdate.timezone = d.timezone;

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({ where: { id: session.user.id }, data: userUpdate });
    }

    const profileUpdate: Record<string, unknown> = {};
    if (d.nativeLanguage       !== undefined) profileUpdate.nativeLanguage       = d.nativeLanguage;
    if (d.targetLanguage       !== undefined) profileUpdate.targetLanguage       = d.targetLanguage;
    if (d.learningObjective    !== undefined) profileUpdate.learningObjective    = d.learningObjective;
    if (d.sessionFrequency     !== undefined) profileUpdate.sessionFrequency     = d.sessionFrequency;
    if (d.programDuration      !== undefined) profileUpdate.programDuration      = d.programDuration;
    if (d.availabilityDays     !== undefined) profileUpdate.availabilityDays     = d.availabilityDays;
    if (d.timeWindowPreference !== undefined) profileUpdate.timeWindowPreference = d.timeWindowPreference;
    if (d.country              !== undefined) profileUpdate.country              = d.country || null;

    if (Object.keys(profileUpdate).length > 0) {
      await db.studentProfile.update({ where: { userId: session.user.id }, data: profileUpdate });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[student/profile PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
