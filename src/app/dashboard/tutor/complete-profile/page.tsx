import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import CompleteProfileWizard from "./CompleteProfileWizard";
import ProfileEditClient from "./ProfileEditClient";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const lang = (await cookies()).get("wy_lang")?.value === "en" ? "en" : "fr";
  return { title: lang === "en" ? "My Profile — WithYou" : "Mon profil — WithYou" };
}

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
    }).catch(() => null),
  ]);

  const pendingChangeProp = pendingChange
    ? {
        id: pendingChange.id,
        status: pendingChange.status as "PENDING" | "REJECTED",
        hrNote: pendingChange.hrNote,
        changes: pendingChange.changes as Record<string, unknown>,
        createdAt: pendingChange.createdAt.toISOString(),
      }
    : null;

  // First-time setup: bio not filled yet → show onboarding wizard
  // Returning tutor: show single-page edit form
  if (!profile?.bio) {
    return (
      <CompleteProfileWizard
        existing={profile}
        pendingChange={pendingChangeProp}
      />
    );
  }

  return (
    <ProfileEditClient
      existing={profile}
      pendingChange={pendingChangeProp}
    />
  );
}
