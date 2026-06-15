import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TutorSidebar from "@/components/TutorSidebar";
import Link from "next/link";

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

  // Unread messages count
  const unreadMessages = await db.message.count({
    where: {
      isRead: false,
      senderId: { not: session.user.id },
      thread: { tutorId: session.user.id },
    },
  }).catch(() => 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F2EFE9" }}>
      <TutorSidebar
        fullName={fullName}
        initials={initials}
        photo={photo}
        profileComplete={profileComplete}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Shared top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-end px-6 flex-shrink-0 gap-2">
          {/* Messages */}
          <Link href="/dashboard/tutor/messages"
            className="relative w-9 h-9 rounded-xl hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
            </svg>
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F5C400] text-[#5C3D00] text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>

          {/* Notifications (placeholder) */}
          <button className="w-9 h-9 rounded-xl hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
          </button>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-[#5C3D00] flex items-center justify-center text-[#F5C400] font-bold text-xs overflow-hidden flex-shrink-0">
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
