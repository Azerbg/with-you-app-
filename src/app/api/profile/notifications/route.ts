import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PREFS, type NotifPreferences } from "@/lib/notifPreferences";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notifPreferences: true },
  });

  const prefs = { ...DEFAULT_PREFS, ...(user?.notifPreferences as Partial<NotifPreferences> ?? {}) };
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Only allow known keys
  const allowed = Object.keys(DEFAULT_PREFS);
  const filtered: Partial<NotifPreferences> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") {
      (filtered as Record<string, boolean>)[key] = body[key];
    }
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notifPreferences: true },
  });

  const current = { ...DEFAULT_PREFS, ...(user?.notifPreferences as Partial<NotifPreferences> ?? {}) };
  const updated = { ...current, ...filtered };

  await db.user.update({
    where: { id: session.user.id },
    data: { notifPreferences: updated },
  });

  return NextResponse.json(updated);
}
