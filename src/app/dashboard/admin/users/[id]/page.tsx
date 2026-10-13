import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import Link from "next/link";
import UserDetailClient from "./UserDetailClient";
import TutorPricingCard from "./TutorPricingCard";
import TutorPaymentMethodCard from "./TutorPaymentMethodCard";

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

const BOOKING_STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  PENDING:   { fr: "En attente",  en: "Pending"   },
  CONFIRMED: { fr: "Confirmé",    en: "Confirmed" },
  COMPLETED: { fr: "Terminé",     en: "Completed" },
  CANCELLED: { fr: "Annulé",      en: "Cancelled" },
  NO_SHOW:   { fr: "Absent",      en: "No show"   },
};

const SESSION_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  DISCOVERY: { fr: "Découverte", en: "Discovery" },
  SINGLE:    { fr: "Séance",     en: "Session"   },
  PACK_5:    { fr: "Pack 5",     en: "Pack 5"    },
  PACK_10:   { fr: "Pack 10",    en: "Pack 10"   },
};

const SESSION_TYPE_BADGE: Record<string, string> = {
  DISCOVERY: "bg-violet-100 text-violet-700",
  SINGLE:    "bg-[#FFF3B0] text-[#C49200]",
  PACK_5:    "bg-blue-100 text-blue-700",
  PACK_10:   "bg-green-100 text-green-700",
};

export default async function UserDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/auth/login");

  const jar = await cookies();
  const lang = jar.get("wy_lang")?.value === "fr" ? "fr" : "en";
  const t = (fr: string, en: string) => lang === "fr" ? fr : en;
  const dateLocale = lang === "fr" ? "fr-FR" : "en-GB";

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      accountStatus: true, statusReason: true, statusUpdatedAt: true, statusUpdatedBy: true,
      createdAt: true, emailVerified: true, timezone: true,
      hrApplication: { select: { fullName: true, status: true } },
      studentProfile: { select: { cefrLevel: true, programTier: true, country: true, targetLanguage: true } },
      tutorProfile: { select: { averageRating: true, totalReviews: true, verificationTier: true, languagesTaught: true, sessionPriceUsd: true } },
      paymentMethod: { select: { type: true, accountHolder: true, iban: true, email: true, phone: true } },
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

  const statusUpdatedByAdmin = user.statusUpdatedBy
    ? await db.user.findUnique({ where: { id: user.statusUpdatedBy }, select: { email: true, firstName: true, lastName: true } })
    : null;

  const displayName = (user.hrApplication?.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ")) || user.email;

  const bookings = user.role === "STUDENT" ? user.bookingsAsStudent : user.bookingsAsTutor;
  const threads  = user.role === "STUDENT" ? user.messageThreadsAsStudent : user.messageThreadsAsTutor;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-[#9B8A6B]">
          <Link href="/dashboard/admin/users" className="hover:text-[#5C3D00] transition">{t("Utilisateurs", "Users")}</Link>
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
                  {user.accountStatus === "ACTIVE" ? t("Actif", "Active") : user.accountStatus === "FROZEN" ? t("Gelé", "Frozen") : t("Bloqué", "Blocked")}
                </span>
              </div>
              <p className="text-sm text-[#9B8A6B] mb-3">{user.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Inscrit", "Joined")}</p>
                  <p className="text-[#2D1A00]">{new Date(user.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Email vérifié", "Email verified")}</p>
                  <p className={user.emailVerified ? "text-green-600" : "text-red-500"}>
                    {user.emailVerified ? t("Oui", "Yes") : t("Non", "No")}
                  </p>
                </div>
                {user.studentProfile && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Niveau CECR", "CEFR Level")}</p>
                      <p className="text-[#2D1A00]">{user.studentProfile.cefrLevel ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Pays", "Country")}</p>
                      <p className="text-[#2D1A00]">{user.studentProfile.country ?? "—"}</p>
                    </div>
                  </>
                )}
                {user.tutorProfile && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Note moyenne", "Avg. rating")}</p>
                      <p className="text-[#2D1A00]">{user.tutorProfile.averageRating.toFixed(1)} / 5</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-0.5">{t("Avis", "Reviews")}</p>
                      <p className="text-[#2D1A00]">{user.tutorProfile.totalReviews}</p>
                    </div>
                  </>
                )}
              </div>
              {(user.statusReason || statusUpdatedByAdmin) && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-xs text-orange-700 space-y-0.5">
                  {user.statusReason && (
                    <p><span className="font-bold">{t("Raison : ", "Reason: ")}</span>{user.statusReason}</p>
                  )}
                  {statusUpdatedByAdmin && (
                    <p className="text-orange-500">
                      {t("Par", "By")} {[statusUpdatedByAdmin.firstName, statusUpdatedByAdmin.lastName].filter(Boolean).join(" ") || statusUpdatedByAdmin.email}
                      {user.statusUpdatedAt && (
                        <> {t("le", "on")} {new Date(user.statusUpdatedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}</>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <UserDetailClient userId={user.id} userEmail={user.email} currentStatus={user.accountStatus} currentReason={user.statusReason ?? ""} lang={lang} />
          </div>
        </div>

        {/* Tutor pricing */}
        {user.tutorProfile && (
          <TutorPricingCard
            tutorId={user.id}
            currentPrice={user.tutorProfile.sessionPriceUsd ?? null}
            lang={lang}
          />
        )}

        {/* Tutor payout method */}
        {user.role === "TUTOR" && (
          <TutorPaymentMethodCard
            tutorId={user.id}
            paymentMethod={user.paymentMethod ?? null}
            lang={lang}
          />
        )}

        {/* Bookings */}
        {bookings.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-black/5">
              <p className="font-bold text-[#2D1A00] text-sm">
                {user.role === "STUDENT" ? t("Réservations", "Bookings") : t("Séances tutorées", "Tutored sessions")}
                <span className="text-[#9B8A6B] font-normal ml-2">({bookings.length})</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-6 py-3">{t("Avec", "With")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Type", "Type")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Statut", "Status")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Prix", "Price")}</th>
                    <th className="text-left text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest px-4 py-3">{t("Date", "Date")}</th>
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
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SESSION_TYPE_BADGE[b.sessionType] ?? "bg-gray-100 text-gray-500"}`}>
                            {SESSION_TYPE_LABELS[b.sessionType]?.[lang] ?? b.sessionType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${BOOKING_STATUS_BADGE[b.status] ?? ""}`}>
                            {BOOKING_STATUS_LABELS[b.status]?.[lang] ?? b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#2D1A00]">
                          {b.studentPriceUsd ? `$${b.studentPriceUsd.toFixed(0)} ${b.studentCurrency}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#9B8A6B]">
                          {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
              <p className="font-bold text-[#2D1A00] text-sm">{t("Conversations", "Conversations")}
                <span className="text-[#9B8A6B] font-normal ml-2">({threads.length})</span>
              </p>
            </div>
            <div className="divide-y divide-black/5">
              {threads.map((thread) => {
                const other = "tutor" in thread
                  ? (thread.tutor.hrApplication?.fullName ?? [thread.tutor.firstName, thread.tutor.lastName].filter(Boolean).join(" "))
                  : ("student" in thread ? [thread.student.firstName, thread.student.lastName].filter(Boolean).join(" ") || thread.student.email : "—");
                return (
                  <Link key={thread.id} href={`/dashboard/admin/messages?thread=${thread.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-[#FAF8F0] transition">
                    <p className="flex-1 text-sm text-[#2D1A00]">{t("Avec", "With")} {other}</p>
                    <span className="text-xs text-[#9B8A6B]">{thread._count.messages} {t("messages", "messages")}</span>
                    {thread.lastMessageAt && (
                      <span className="text-xs text-[#9B8A6B]">
                        {new Date(thread.lastMessageAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
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
