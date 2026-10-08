import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
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

  const [unreadMessages, unreadNotifications] = await Promise.all([
    db.message.count({
      where: {
        isRead: false,
        senderId: { not: session.user.id },
        thread: { studentId: session.user.id },
      },
    }).catch(() => 0),
    db.notification.count({
      where: { userId: session.user.id, isRead: false },
    }).catch(() => 0),
  ]);

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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-end px-6 flex-shrink-0 gap-3">
          <LanguageSwitcher />

          {/* Messages */}
          <Link href="/dashboard/student/messages" prefetch={false}
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

          {/* Notifications */}
          <Link href="/dashboard/student/notifications" prefetch={false}
            className="relative w-9 h-9 rounded-xl hover:bg-[#5C3D00]/5 flex items-center justify-center text-[#6B5E44] transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-[#5C3D00] flex items-center justify-center text-[#F5C400] font-bold text-xs overflow-hidden flex-shrink-0">
            {profile.user.image
              ? <img src={profile.user.image} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
