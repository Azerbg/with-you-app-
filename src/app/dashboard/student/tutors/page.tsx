import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import ContactButton from "./ContactButton";

export default async function MyTutorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  // Get all unique tutors this student has booked
  const bookings = await db.booking.findMany({
    where: {
      studentId: session.user.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      tutor: {
        select: {
          id: true,
          email: true,
          tutorProfile: {
            select: {
              id: true,
              bio: true,
              profilePhotoUrl: true,
              languagesTaught: true,
              specializations: true,
              certifications: true,
              averageRating: true,
              totalReviews: true,
              verificationTier: true,
            },
          },
        },
      },
    },
  });

  // Deduplicate tutors — keep first occurrence (most recent booking)
  const seen = new Set<string>();
  const tutors = bookings
    .filter(b => {
      if (seen.has(b.tutorId)) return false;
      seen.add(b.tutorId);
      return true;
    })
    .map(b => ({
      userId:    b.tutorId,
      email:     b.tutor.email,
      profile:   b.tutor.tutorProfile,
      sessionCount: bookings.filter(x => x.tutorId === b.tutorId).length,
      lastSession:  b.scheduledAt,
    }));

  const email    = session.user.email ?? "";
  const fn = studentProfile?.user?.firstName;
  const ln = studentProfile?.user?.lastName;
  const initials = fn && ln ? (fn[0] + ln[0]).toUpperCase() : email.slice(0, 2).toUpperCase();

  const SPEC_LABELS: Record<string, string> = {
    CONVERSATIONAL: "Conversation",
    PROFESSIONAL:   "Professionnel",
    ACADEMIC:       "Académique",
    EXAM_PREP:      "Préparation examens",
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-base font-bold text-[#5C3D00]">Mes tuteurs</h1>
          <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">
            {initials}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Find more CTA */}
          <div className="bg-[#1C1008] rounded-2xl p-6 flex items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-[#F5C400] font-bold text-lg mb-1">Trouver un nouveau tuteur</p>
              <p className="text-white/50 text-sm">Parcourez notre liste de tuteurs vérifiés et réservez une séance découverte.</p>
            </div>
            <Link
              href="/find-tutors"
              className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#FFDE59] transition shadow-[0_4px_14px_rgba(245,196,0,0.35)] whitespace-nowrap"
            >
              Parcourir les tuteurs →
            </Link>
          </div>

          {/* Tutor list */}
          {tutors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
              <p className="text-4xl mb-4">👨‍🏫</p>
              <h2 className="text-lg font-bold text-[#5C3D00] mb-2">Aucun tuteur pour l'instant</h2>
              <p className="text-sm text-[#6B5E44] mb-6">
                Réservez votre première séance pour commencer votre apprentissage.
              </p>
              <Link
                href="/find-tutors"
                className="inline-block bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-[#FFDE59] transition"
              >
                Trouver un tuteur
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {tutors.map(t => {
                const p = t.profile;
                const bioSnippet = p?.bio ? p.bio.slice(0, 90) + (p.bio.length > 90 ? "…" : "") : null;

                return (
                  <div key={t.userId} className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-md hover:border-[#F5C400]/50 transition flex flex-col">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#5C3D00] flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                        {p?.profilePhotoUrl
                          ? <img src={p.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                          : (t.email.slice(0, 2).toUpperCase())}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {p?.languagesTaught.map(l => (
                            <span key={l} className="text-[10px] bg-[#F5C400]/20 text-[#5C3D00] font-bold px-1.5 py-0.5 rounded-full">{l}</span>
                          ))}
                          {p?.verificationTier === "VERIFIED" && (
                            <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">✓</span>
                          )}
                        </div>
                        {p && p.totalReviews > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[#F5C400] text-xs">{"★".repeat(Math.round(p.averageRating))}</span>
                            <span className="text-[10px] text-[#6B5E44]">{p.averageRating.toFixed(1)} ({p.totalReviews})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {bioSnippet && (
                      <p className="text-xs text-[#6B5E44] leading-relaxed mb-3 flex-1">{bioSnippet}</p>
                    )}

                    {/* Specs */}
                    {p && p.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.specializations.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {SPEC_LABELS[s] ?? s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sessions info */}
                    <div className="flex items-center justify-between text-[10px] text-[#6B5E44] mb-4">
                      <span>{t.sessionCount} séance{t.sessionCount > 1 ? "s" : ""}</span>
                      <span>
                        Dernière : {new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric", month: "short",
                          timeZone: "Africa/Tunis",
                        }).format(t.lastSession)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <ContactButton tutorUserId={t.userId} />
                      <Link
                        href={`/booking/${t.userId}`}
                        className="flex-1 text-center text-xs font-bold bg-[#F5C400] text-[#5C3D00] rounded-full py-2 hover:bg-[#FFDE59] transition"
                      >
                        Réserver →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
