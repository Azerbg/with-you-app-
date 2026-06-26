import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import UserDetailClient from "./UserDetailClient";

interface Props { params: Promise<{ id: string }> }

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:  "bg-green-100 text-green-700",
  FROZEN:  "bg-orange-100 text-orange-700",
  BLOCKED: "bg-red-100 text-red-600",
};

const ROLE_BADGE: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700",
  TUTOR:   "bg-[#FFF3B0] text-[#C49200]",
  HR:      "bg-purple-100 text-purple-700",
  ADMIN:   "bg-gray-200 text-gray-700",
};

const BOOKING_STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-500",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW:   "bg-orange-100 text-orange-700",
};

export default async function UserDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/auth/login");

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      accountStatus: true, statusReason: true, statusUpdatedAt: true,
      createdAt: true, emailVerified: true, timezone: true,
      hrApplication: { select: { fullName: true, status: true } },
      studentProfile: { select: { cefrLevel: true, programTier: true, country: true, targetLanguage: true } },
      tutorProfile: { select: { averageRating: true, totalReviews: true, verificationTier: true, languagesTaught: true } },
      bookingsAsStudent: {
        orderBy: { createdAt: "desc" }, take: 20,
        select: {
          id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true, createdAt: true,
          tutor: { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
        },
      },
      bookingsAsTutor: {
        orderBy: { createdAt: "desc" }, take: 20,
        select: {
          id: true, status: true, sessionType: true, studentPriceUsd: true, studentCurrency: true, scheduledAt: true, createdAt: true,
          student: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      messageThreadsAsStudent: {
        orderBy: { lastMessageAt: "desc" }, take: 10,
        select: {
          id: true, lastMessageAt: true,
          tutor: { select: { firstName: true, lastName: true, hrApplication: { select: { fullName: true } } } },
          _count: { select: { messages: true } },
        },
      },
      messageThreadsAsTutor: {
        orderBy: { lastMessageAt: "desc" }, take: 10,
        select: {
          id: true, lastMessageAt: true,
          student: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true } },
        },
      },
    },
  });

  if (!user) notFound();

  const displayName = (user.hrApplication?.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ")) || user.email;

  const bookings = user.role === "STUDENT" ? user.bookingsAsStudent : user.bookingsAsTutor;
  const threads  = user.role === "STUDENT" ? user.messageThreadsAsStudent : user.messageThreadsAsTutor;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-[#9B8A6B]">
          <Link href="/dashboard/admin/users" className="hover:text-[#5C3D00] transition">Utilisateurs</Link>
          <span>/</span>
          <span className="text-[#2D1A00] font-medium truncate">{displayName}</span>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C400]/20 flex items-center justify-center text-[#5C3D00] font-black text-2xl flex-shrink-0">
              {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-black text-[#1A0F00]">{displayName}</h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? ""}`}>{user.role}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[user.accountStatus] ?? ""}`}>
                  {user.accountStatus === "ACTIVE" ? "Actif" : user.accountStatus === "FROZEN" ? "Gelé" : "Bloqué"}
                </span>
              </div>
              <p className="text-sm text-[#9B8A6B] mb-3">{user.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Inscrit</p>
                  <p className="text-[#2D1A00]">{new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Email vérifié</p>
                  <p className={user.emailVerified ? "text-green-600" : "text-red-500"}>
                    {user.emailVerified ? "Oui" : "Non"}
                  </p>
                </div>
                {user.studentProfile && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Niveau CECR</p>
                      <p className="text-[#2D1A00]">{user.studentProfile.cefrLevel ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Pays</p>
                      <p className="text-[#2D1A00]">{user.studentProfile.country ?? "—"}</p>
                    </div>
                  </>
                )}
                {user.tutorProfile && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Note moyenne</p>
                      <p className="text-[#2D1A00]">{user.tutorProfile.averageRating.toFixed(1)} / 5</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">Avis</p>
                      <p className="text-[#2D1A00]">{user.tutorProfile.totalReviews}</p>
                    </div>
                  </>
                )}
              </div>
              {user.statusReason && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-xs text-orange-700">
                  <span className="font-bold">Raison : </span>{user.statusReason}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <UserDetailClient userId={user.id} currentStatus={user.accountStatus} currentReason={user.statusReason ?? ""} />
          </div>
        </div>

        {/* Bookings */}
        {bookings.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00] text-sm">
                {user.role === "STUDENT" ? "Réservations" : "Séances tutorées"}
                <span className="text-[#9B8A6B] font-normal ml-2">({bookings.length})</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-6 py-3">Avec</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Type</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Statut</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Prix</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {bookings.map((b) => {
                    const other = "tutor" in b
                      ? ((b.tutor.hrApplication?.fullName ?? [b.tutor.firstName, b.tutor.lastName].filter(Boolean).join(" ")) || "—")
                      : ("student" in b ? [b.student.firstName, b.student.lastName].filter(Boolean).join(" ") || b.student.email : "—");
                    return (
                      <tr key={b.id} className="hover:bg-[#FAF8F0] transition">
                        <td className="px-6 py-3 text-sm text-[#2D1A00]">{other}</td>
                        <td className="px-4 py-3 text-xs text-[#9B8A6B]">{b.sessionType}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${BOOKING_STATUS_BADGE[b.status] ?? ""}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#2D1A00]">
                          {b.studentPriceUsd ? `$${b.studentPriceUsd.toFixed(0)} ${b.studentCurrency}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                          {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Message threads */}
        {threads.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00] text-sm">Conversations
                <span className="text-[#9B8A6B] font-normal ml-2">({threads.length})</span>
              </p>
            </div>
            <div className="divide-y divide-black/5">
              {threads.map((t) => {
                const other = "tutor" in t
                  ? (t.tutor.hrApplication?.fullName ?? [t.tutor.firstName, t.tutor.lastName].filter(Boolean).join(" "))
                  : ("student" in t ? [t.student.firstName, t.student.lastName].filter(Boolean).join(" ") || t.student.email : "—");
                return (
                  <Link key={t.id} href={`/dashboard/admin/messages?thread=${t.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-[#FAF8F0] transition">
                    <p className="flex-1 text-sm text-[#2D1A00]">Avec {other}</p>
                    <span className="text-xs text-[#9B8A6B]">{t._count.messages} messages</span>
                    {t.lastMessageAt && (
                      <span className="text-xs text-[#9B8A6B]">
                        {new Date(t.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span className="text-[#9B8A6B] text-xs">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
