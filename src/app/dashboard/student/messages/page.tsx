import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import StudentMessagesClient from "./StudentMessagesClient";

export default async function StudentMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[#9B8A6B]">Chargement…</div>}>
      <StudentMessagesClient currentUserId={session.user.id} />
    </Suspense>
  );
}
