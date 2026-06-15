import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import StudentSidebar from "@/components/StudentSidebar";
import StudentMessagesClient from "./StudentMessagesClient";

export default async function StudentMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const firstName = profile.user.firstName ?? null;
  const lastName  = profile.user.lastName  ?? null;
  const initials  = firstName && lastName
    ? (firstName[0] + lastName[0]).toUpperCase()
    : (firstName?.slice(0, 2) ?? profile.user.email.slice(0, 2)).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9F7F2]">
      <StudentSidebar
        email={profile.user.email}
        cefrLevel={profile.currentCefrLevel ?? null}
        tier={profile.programTier}
        initials={initials}
        activePage="messages"
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudentMessagesClient currentUserId={session.user.id} />
      </div>
    </div>
  );
}
