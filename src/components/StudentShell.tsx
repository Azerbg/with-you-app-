import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";

export default async function StudentShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true, image: true } },
    },
  });

  if (!profile?.onboardingCompleted) redirect("/onboarding");

  const firstName = profile.user.firstName ?? null;
  const lastName = profile.user.lastName ?? null;
  const initials =
    firstName && lastName
      ? (firstName[0] + lastName[0]).toUpperCase()
      : firstName
      ? firstName.slice(0, 2).toUpperCase()
      : profile.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <StudentSidebar
        email={profile.user.email}
        name={firstName && lastName ? `${firstName} ${lastName}` : firstName ?? null}
        cefrLevel={profile.cefrLevel}
        tier={profile.programTier ?? ""}
        initials={initials}
        image={profile.user.image ?? null}
      />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
