import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import CompleteProfileWizard from "./CompleteProfileWizard";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR") redirect("/dashboard");

  const app = await db.hrApplication.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (app?.status !== "ACTIVE") redirect("/dashboard/tutor");

  const [profile, pendingChange] = await Promise.all([
    db.tutorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        bio: true,
        profilePhotoUrl: true,
        videoIntroUrl: true,
        cefrTeachingMin: true,
        cefrTeachingMax: true,
        specializations: true,
      },
    }),
    db.pendingProfileChange.findFirst({
      where: { tutorId: session.user.id, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <CompleteProfileWizard
      existing={profile}
      pendingChange={
        pendingChange
          ? {
              id: pendingChange.id,
              status: pendingChange.status as "PENDING" | "REJECTED",
              hrNote: pendingChange.hrNote,
              changes: pendingChange.changes as Record<string, unknown>,
              createdAt: pendingChange.createdAt.toISOString(),
            }
          : null
      }
    />
  );
}
