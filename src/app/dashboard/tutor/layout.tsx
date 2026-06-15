import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TutorSidebar from "@/components/TutorSidebar";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      hrApplication: { select: { status: true, fullName: true } },
      tutorProfile: {
        select: { profilePhotoUrl: true, bio: true, cefrTeachingMin: true, cefrTeachingMax: true },
      },
    },
  });

  const isActive = user?.hrApplication?.status === "ACTIVE";

  // Non-active tutors (pending application, no application, rejected):
  // render without sidebar — those pages handle their own layout
  if (!isActive) return <>{children}</>;

  const fullName =
    user?.hrApplication?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    "Tuteur";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const photo = user?.tutorProfile?.profilePhotoUrl ?? null;
  const profileComplete = !!(
    user?.tutorProfile?.bio &&
    user?.tutorProfile?.cefrTeachingMin &&
    user?.tutorProfile?.cefrTeachingMax
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <TutorSidebar
        fullName={fullName}
        initials={initials}
        photo={photo}
        profileComplete={profileComplete}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
