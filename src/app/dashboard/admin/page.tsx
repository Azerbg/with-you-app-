import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function generateMetadata() {
  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  return { title: lang === "fr" ? "Vue d'ensemble — Admin" : "Overview — Admin" };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
      <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-black text-[#2D1A00]">{value}</p>
      {sub && <p className="text-xs text-[#9B8A6B] mt-1">{sub}</p>}
    </div>
  );
}

const ROLE_BADGE: Record<string, string> = {
  STUDENT: "bg-blue-50 text-blue-700",
  TUTOR:   "bg-[#FFF3B0] text-[#C49200]",
  HR:      "bg-purple-50 text-purple-700",
  ADMIN:   "bg-[#1A0F00] text-[#F5C400]",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-gray-50 text-gray-500",
  CONFIRMED: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-600",
  NO_SHOW:   "bg-orange-50 text-orange-700",
};

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/auth/login");

  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000 - 1);

  const [
    totalStudents, activeTutors, openDisputes,
    monthBookings, monthRevenue,
    recentUsers, recentBookings,
    pendingPayouts, todaySessions, hrAwaiting,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TUTOR", hrApplication: { status: "ACTIVE" } } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    db.booking.count({ where: { createdAt: { gte: monthStart } } }),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: monthStart } },
      _sum: { studentPriceUsd: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, accountStatus: true },
    }),
    db.booking.findMany({
      orderBy: { scheduledAt: "desc" }, take: 8,
      select: {
        id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true,
        student: { select: { firstName: true, lastName: true, email: true } },
        tutor:   { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
      },
    }),
    db.booking.count({ where: { status: "COMPLETED", tutorPaidAt: null } }),
    db.booking.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.hrApplication.count({ where: { status: { in: ["NEW", "STAGE1_REVIEW", "VIDEO_SUBMITTED", "INTERVIEW_COMPLETE"] } } }),
  ]);

  const revenue = monthRevenue._sum.studentPriceUsd ?? 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[#1A0F00]">{lang === "fr" ? "Vue d'ensemble" : "Overview"}</h1>
          <p className="text-sm text-[#9B8A6B] mt-1">
            {now.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label={lang === "fr" ? "Étudiants" : "Students"} value={totalStudents.toLocaleString()} />
          <StatCard label={lang === "fr" ? "Tuteurs actifs" : "Active tutors"} value={activeTutors} />
          <StatCard label={lang === "fr" ? "Réservations (mois)" : "Bookings (month)"} value={monthBookings} />
          <StatCard label={lang === "fr" ? "Revenus (mois)" : "Revenue (month)"} value={`$${revenue.toFixed(0)}`} sub="USD" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label={lang === "fr" ? "Séances aujourd'hui" : "Today's sessions"} value={todaySessions} sub={lang === "fr" ? "confirmées" : "confirmed"} />
          <StatCard label={lang === "fr" ? "Candidats RH en attente" : "HR candidates awaiting"} value={hrAwaiting} sub={lang === "fr" ? "à traiter" : "to action"} />
          <StatCard label={lang === "fr" ? "Litiges ouverts" : "Open disputes"} value={openDisputes} />
          <StatCard label={lang === "fr" ? "Virements en attente" : "Pending payouts"} value={pendingPayouts} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Recent registrations */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <p className="font-bold text-[#2D1A00] text-sm">{lang === "fr" ? "Derniers inscrits" : "Recent registrations"}</p>
              <Link href="/dashboard/admin/users" className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">{lang === "fr" ? "Voir tous →" : "View all →"}</Link>
            </div>
            <div className="divide-y divide-black/5">
              {recentUsers.map(u => (
                <a key={u.id} href={`/dashboard/admin/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F0] transition">
                  <div className="w-8 h-8 rounded-lg bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] font-bold text-xs flex-shrink-0">
                    {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D1A00] truncate">
                      {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                    </p>
                    <p className="text-xs text-[#9B8A6B] truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? ""}`}>
                    {u.role}
                  </span>
                  {u.accountStatus !== "ACTIVE" && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      u.accountStatus === "BLOCKED" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-700"
                    }`}>
                      {u.accountStatus}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <p className="font-bold text-[#2D1A00] text-sm">{lang === "fr" ? "Dernières réservations" : "Recent bookings"}</p>
              <a href="/dashboard/admin/bookings" className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">{lang === "fr" ? "Voir toutes →" : "View all →"}</a>
            </div>
            <div className="divide-y divide-black/5">
              {recentBookings.map(b => {
                const tutorName = (b.tutor.hrApplication?.fullName ??
                  [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ")) || "—";
                const studentName = [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email;
                return (
                  <a key={b.id} href={`/dashboard/admin/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F0] transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2D1A00] truncate">{studentName}</p>
                      <p className="text-xs text-[#9B8A6B] truncate">{lang === "fr" ? "avec" : "with"} {tutorName}</p>
                      {b.scheduledAt && (
                        <p className="text-[10px] text-[#9B8A6B]">
                          {new Date(b.scheduledAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[b.status] ?? "bg-gray-50 text-gray-500"}`}>
                        {b.status}
                      </span>
                      <p className="text-xs text-[#9B8A6B] mt-0.5">{b.studentPriceUsd != null ? `$${b.studentPriceUsd.toFixed(0)}` : "—"}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
