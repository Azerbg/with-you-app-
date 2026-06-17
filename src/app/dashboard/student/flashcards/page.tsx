import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import FlashcardsClient from "./FlashcardsClient";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, firstName: true, lastName: true, image: true } } },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const fn = profile.user.firstName;
  const ln = profile.user.lastName;
  const initials = fn && ln
    ? (fn[0] + ln[0]).toUpperCase()
    : (fn?.slice(0, 2) ?? profile.user.email.slice(0, 2)).toUpperCase();

  return (
    <FlashcardsClient
      email={profile.user.email}
      name={fn && ln ? `${fn} ${ln}` : fn ?? null}
      cefrLevel={profile.cefrLevel ?? null}
      tier={profile.programTier ?? "STARTER"}
      initials={initials}
      image={profile.user.image ?? null}
    />
  );
}
