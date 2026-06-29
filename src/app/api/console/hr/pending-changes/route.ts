import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["HR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const changes = await db.pendingProfileChange.findMany({
    where: { status: "PENDING" },
    include: {
      tutor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: {
            select: {
              bio: true,
              profilePhotoUrl: true,
              videoIntroUrl: true,
              cefrTeachingMin: true,
              cefrTeachingMax: true,
              specializations: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(
    (changes as any[]).map((c) => ({
      id: c.id,
      tutorId: c.tutorId,
      tutorName:
        c.tutor.firstName && c.tutor.lastName
          ? `${c.tutor.firstName} ${c.tutor.lastName}`
          : c.tutor.hrApplication?.fullName ?? c.tutor.email,
      tutorEmail: c.tutor.email,
      currentProfile: c.tutor.tutorProfile ?? null,
      proposedChanges: c.changes,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}
