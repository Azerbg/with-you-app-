import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  bio:             z.string().min(100).max(2000),
  profilePhotoUrl: z.string().url().optional().or(z.literal("")),
  videoIntroUrl:   z.string().url().optional().or(z.literal("")),
  cefrTeachingMin: z.string().min(2),
  cefrTeachingMax: z.string().min(2),
  specializations: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Not activated" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const proposedChanges = {
      bio:             data.bio,
      profilePhotoUrl: data.profilePhotoUrl || null,
      videoIntroUrl:   data.videoIntroUrl   || null,
      cefrTeachingMin: data.cefrTeachingMin,
      cefrTeachingMax: data.cefrTeachingMax,
      specializations: data.specializations,
    };

    // Replace any existing PENDING change with the new submission
    await db.pendingProfileChange.deleteMany({
      where: { tutorId: session.user.id, status: "PENDING" },
    });

    const change = await db.pendingProfileChange.create({
      data: { tutorId: session.user.id, changes: proposedChanges },
    });

    return NextResponse.json({ pending: true, changeId: change.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "validation", issues: err.issues }, { status: 422 });
    }
    console.error("[tutors/profile]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, pendingChange] = await Promise.all([
    db.tutorProfile.findUnique({ where: { userId: session.user.id } }),
    db.pendingProfileChange.findFirst({
      where: { tutorId: session.user.id, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ profile: profile ?? null, pendingChange: pendingChange ?? null });
}
