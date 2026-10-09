import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile?.onboardingCompleted) redirect("/dashboard/student");

  return <OnboardingWizard stripeKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""} />;
}
