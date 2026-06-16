import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import StudentProfileClient from "./StudentProfileClient";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      image: true,
      pendingImage: true,
      timezone: true,
      studentProfile: {
        select: {
          cefrLevel: true,
          nativeLanguage: true,
          targetLanguage: true,
          learningObjective: true,
          sessionFrequency: true,
          programDuration: true,
          availabilityDays: true,
          timeWindowPreference: true,
          country: true,
          programTier: true,
          onboardingCompleted: true,
        },
      },
    },
  });

  if (!user?.studentProfile?.onboardingCompleted) redirect("/onboarding");

  const p = user.studentProfile!;
  const initials = (
    user.firstName && user.lastName
      ? user.firstName[0] + user.lastName[0]
      : user.email.slice(0, 2)
  ).toUpperCase();

  return (
    <StudentProfileClient
      email={user.email}
      firstName={user.firstName ?? null}
      lastName={user.lastName ?? null}
      image={user.image ?? null}
      hasPendingImage={!!user.pendingImage}
      initials={initials}
      cefrLevel={p.cefrLevel ?? null}
      nativeLanguage={p.nativeLanguage ?? null}
      targetLanguage={p.targetLanguage ?? null}
      learningObjective={p.learningObjective ?? null}
      sessionFrequency={p.sessionFrequency ?? null}
      programDuration={p.programDuration ?? null}
      availabilityDays={p.availabilityDays}
      timeWindowPreference={p.timeWindowPreference}
      country={p.country ?? null}
      programTier={p.programTier ?? "STARTER"}
      timezone={user.timezone}
    />
  );
}
