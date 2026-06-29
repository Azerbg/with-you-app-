import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface ProfileChanges {
  bio?: string;
  profilePhotoUrl?: string | null;
  videoIntroUrl?: string | null;
  cefrTeachingMin?: string;
  cefrTeachingMax?: string;
  specializations?: string[];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, hrNote } = body as { action: "APPROVE" | "REJECT"; hrNote?: string };

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const pendingChange = await db.pendingProfileChange.findUnique({ where: { id } });
  if (!pendingChange || pendingChange.status !== "PENDING") {
    return NextResponse.json({ error: "Not found or already reviewed" }, { status: 404 });
  }

  const now = new Date();

  if (action === "APPROVE") {
    const changes = pendingChange.changes as ProfileChanges;

    // Apply proposed changes to TutorProfile
    await db.$transaction([
      db.tutorProfile.update({
        where: { userId: pendingChange.tutorId },
        data: {
          ...(changes.bio             !== undefined && { bio:             changes.bio }),
          ...(changes.profilePhotoUrl !== undefined && { profilePhotoUrl: changes.profilePhotoUrl }),
          ...(changes.videoIntroUrl   !== undefined && { videoIntroUrl:   changes.videoIntroUrl }),
          ...(changes.cefrTeachingMin !== undefined && { cefrTeachingMin: changes.cefrTeachingMin }),
          ...(changes.cefrTeachingMax !== undefined && { cefrTeachingMax: changes.cefrTeachingMax }),
          ...(changes.specializations !== undefined && { specializations: changes.specializations }),
        },
      }),
      db.pendingProfileChange.update({
        where: { id },
        data: { status: "APPROVED", reviewedBy: session.user.id, reviewedAt: now, hrNote: hrNote ?? null },
      }),
    ]);

    return NextResponse.json({ success: true, action: "APPROVED" });
  }

  // REJECT
  if (!hrNote?.trim()) {
    return NextResponse.json({ error: "hrNote is required for rejection" }, { status: 400 });
  }

  await db.pendingProfileChange.update({
    where: { id },
    data: { status: "REJECTED", hrNote: hrNote.trim(), reviewedBy: session.user.id, reviewedAt: now },
  });

  return NextResponse.json({ success: true, action: "REJECTED" });
}
