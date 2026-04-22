import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { email } = session.user;
  const initials = email?.slice(0, 2).toUpperCase() ?? "AD";

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
              <p className="text-xs text-gray-400 font-medium">Admin Dashboard</p>
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

        {/* Quick nav */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Link href="/console/hr" className="bg-[#5C3D00] text-white rounded-2xl p-5 shadow-sm hover:bg-[#3d2900] transition">
            <p className="text-2xl mb-2">👥</p>
            <p className="font-bold">HR Console</p>
            <p className="text-xs text-white/60 mt-1">Manage tutor applications</p>
          </Link>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm opacity-60">
            <p className="text-2xl mb-2">📊</p>
            <p className="font-bold text-[#5C3D00]">Analytics</p>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm opacity-60">
            <p className="text-2xl mb-2">⚙️</p>
            <p className="font-bold text-[#5C3D00]">Settings</p>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>
        </div>

        <div className="bg-white border border-[#F5C400]/40 rounded-2xl shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500">
            Full admin panel is coming in a future update. Use the <strong>HR Console</strong> to manage tutor applications.
          </p>
        </div>
      </div>
    </div>
  );
}
