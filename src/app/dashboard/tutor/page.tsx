import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TutorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN" && session.user.role !== "HR") {
    redirect("/dashboard");
  }

  const { email } = session.user;
  const initials = email?.slice(0, 2).toUpperCase() ?? "TU";

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5C3D00] flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Tutor Dashboard</p>
              <p className="font-bold text-[#5C3D00]">{email}</p>
            </div>
          </div>
          <Link
            href="/api/auth/signout"
            className="text-sm text-gray-500 hover:text-[#5C3D00] font-medium transition"
          >
            Sign out
          </Link>
        </div>

        {/* Coming soon banner */}
        <div className="bg-white border border-[#F5C400]/40 rounded-2xl shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-[#FFF3B0] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🧑‍🏫
          </div>
          <h1 className="text-2xl font-bold text-[#5C3D00] mb-2">Tutor Dashboard</h1>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Your dashboard is being set up. Once your application is approved and your profile is activated,
            you&apos;ll see your sessions, students, and earnings here.
          </p>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFF3B0] text-[#C49200] rounded-full text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#F5C400] animate-pulse" />
            Coming in next update
          </span>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Application status</p>
            <p className="font-semibold text-[#5C3D00]">Under review</p>
            <p className="text-xs text-gray-400 mt-1">Our HR team will contact you shortly.</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Need help?</p>
            <p className="font-semibold text-[#5C3D00]">Contact support</p>
            <p className="text-xs text-gray-400 mt-1">Reach out at support@withyou.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
