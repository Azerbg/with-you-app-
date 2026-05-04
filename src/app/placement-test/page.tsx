import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import PlacementTestClient from "./PlacementTestClient";

export default async function PlacementTestPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { selfReportedLevel: true, onboardingCompleted: true },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const locale = (session.user as { locale?: string }).locale ?? "en";

  return (
    <PlacementTestClient
      selfReportedLevel={profile.selfReportedLevel ?? null}
      lang={locale}
    />
  );
}
