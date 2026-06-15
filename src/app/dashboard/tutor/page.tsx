import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import TutorDashboardContent from "./TutorDashboardContent";
import VideoSubmissionPanel from "./VideoSubmissionPanel";
import OfferAcceptancePanel from "./OfferAcceptancePanel";

const STAGE_INFO: Record<string, { label: string; desc: string; color: string; step: number }> = {
  INCOMPLETE:          { label: "Dossier incomplet",        desc: "Votre dossier est incomplet. Veuillez le compléter pour continuer.",           color: "bg-gray-50 border-gray-300 text-gray-700",    step: 1 },
  NEW:                 { label: "Candidature reçue",        desc: "Notre équipe RH va examiner votre dossier sous 3–5 jours ouvrables.",          color: "bg-blue-50 border-blue-200 text-blue-700",    step: 1 },
  STAGE1_REVIEW:       { label: "Examen en cours",          desc: "Un responsable RH examine votre candidature. Nous vous contacterons bientôt.", color: "bg-yellow-50 border-yellow-200 text-yellow-700", step: 2 },
  VIDEO_REQUESTED:     { label: "Vidéo demandée",           desc: "L'équipe RH a examiné votre dossier et souhaite vous voir en vidéo. Suivez les consignes ci-dessous.", color: "bg-amber-50 border-amber-300 text-amber-800", step: 3 },
  VIDEO_SUBMITTED:     { label: "Vidéo en cours d'examen", desc: "Votre vidéo a bien été reçue. L'équipe RH l'examine et reviendra vers vous sous 3–5 jours.", color: "bg-amber-50 border-amber-200 text-amber-700", step: 3 },
  INTERVIEW_SCHEDULED: { label: "Entretien planifié",       desc: "Votre entretien est confirmé. Vérifiez votre email pour les détails.",          color: "bg-purple-50 border-purple-200 text-purple-700", step: 4 },
  INTERVIEW_COMPLETE:  { label: "Entretien terminé",        desc: "L'équipe RH délibère. Vous recevrez une réponse très prochainement.",           color: "bg-orange-50 border-orange-200 text-orange-700", step: 4 },
  RESERVE:             { label: "Candidature en réserve",   desc: "Votre profil est retenu mais nous n'avons pas de poste disponible pour le moment. Nous vous contacterons en priorité.", color: "bg-sky-50 border-sky-200 text-sky-700", step: 2 },
  OFFER_PENDING:       { label: "Offre à accepter",         desc: "Félicitations ! Une offre vous a été préparée. Lisez-la attentivement et acceptez-la ci-dessous.", color: "bg-pink-50 border-pink-300 text-pink-800", step: 5 },
  SIGNED:              { label: "Contrat signé",            desc: "Votre offre a été acceptée. L'activation de votre profil est en cours…",       color: "bg-teal-50 border-teal-200 text-teal-700",    step: 5 },
  ACTIVE:              { label: "Profil actif",             desc: "Bienvenue dans l'équipe WithYou ! Complétez votre profil pour apparaître dans les recherches.", color: "bg-green-50 border-green-200 text-green-700", step: 6 },
  REJECTED:            { label: "Candidature rejetée",      desc: "Votre candidature n'a pas été retenue cette fois. Vous pouvez postuler à nouveau après 90 jours.", color: "bg-red-50 border-red-200 text-red-700", step: 0 },
};

const STEPS = [
  "Candidature",
  "Examen RH",
  "Vidéo",
  "Entretien",
  "Offre",
  "Actif",
];

export default async function TutorDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "TUTOR" && session.user.role !== "ADMIN") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      hrApplication: {
        select: {
          status: true,
          fullName: true,
          languagesTaught: true,
          interviewScheduledAt: true,
          interviewMeetingUrl: true,
          reapplyAfter: true,
          offerCurrency: true,
          offerHourlyRateTnd: true,
          offerHourlyRateCad: true,
          offerMaxWeeklyHours: true,
          videoSubmissionUrl: true,
          videoSubmittedAt: true,
        },
      },
      tutorProfile: {
        select: {
          bio: true,
          profilePhotoUrl: true,
          cefrTeachingMin: true,
          cefrTeachingMax: true,
          verificationTier: true,
        },
      },
    },
  });

  if (!user) redirect("/auth/login");

  const app = user.hrApplication;

  // ── ACTIVE tutor: full dashboard with sidebar ──────────────────────────────
  if (app?.status === "ACTIVE") {
    const profile = user.tutorProfile;
    const profileComplete = !!(profile?.bio && profile?.cefrTeachingMin && profile?.cefrTeachingMax);
    const fullName = app.fullName ?? user.email;
    const initials = fullName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

    // Fetch bookings as tutor
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [upcoming, completed, monthBookings] = await Promise.all([
      db.booking.findMany({
        where: { tutorId: session.user.id, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
        take: 4,
        include: { student: { select: { firstName: true, lastName: true, email: true } } },
      }),
      db.booking.count({
        where: { tutorId: session.user.id, status: "CONFIRMED", scheduledAt: { lt: now } },
      }),
      db.booking.findMany({
        where: { tutorId: session.user.id, status: "CONFIRMED", scheduledAt: { gte: startOfMonth, lt: now } },
        select: { studentPriceUsd: true },
      }),
    ]);

    const uniqueStudents = new Set(upcoming.map((b) => b.studentId)).size;
    const earningsThisMonth = monthBookings.reduce((sum, b) => sum + (b.studentPriceUsd ?? 0), 0);

    const offerHourlyRate = app.offerCurrency === "TND"
      ? app.offerHourlyRateTnd
      : app.offerHourlyRateCad;

    return (
      <TutorDashboardContent
        fullName={fullName}
        initials={initials}
        photo={profile?.profilePhotoUrl ?? null}
        profileComplete={profileComplete}
        stats={{
          sessionsCompleted: completed,
          upcomingSessions: upcoming.length,
          studentsCount: uniqueStudents,
          earningsThisMonth,
        }}
        upcomingSessions={upcoming.map((b) => ({
          id: b.id,
          studentName: b.student.firstName && b.student.lastName
            ? `${b.student.firstName} ${b.student.lastName}`
            : b.student.email,
          scheduledAt: b.scheduledAt.toISOString(),
          durationMins: b.durationMins,
          status: b.status,
        }))}
        offerHourlyRate={offerHourlyRate ?? null}
        offerCurrency={app.offerCurrency ?? null}
      />
    );
  }

  // User registered as TUTOR but never submitted an application
  if (!app) {
    const initials = (user.firstName && user.lastName
      ? user.firstName[0] + user.lastName[0]
      : user.email.slice(0, 2)
    ).toUpperCase();

    return (
      <div className="min-h-screen bg-[#FAF8F0] relative">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/tutor-apply-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,6,0,0.55) 0%, rgba(10,6,0,0.40) 100%)" }} />
        </div>
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Top bar */}
          <div className="px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#F5C400] rounded-xl flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M5 6l4.5 8 2.5-4.5L14.5 14 19 6" stroke="#5C3D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-bold text-white text-[15px] tracking-tight drop-shadow">WithYou</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">{initials}</div>
              <Link href="/api/auth/signout" className="text-xs text-white/70 hover:text-white transition">Déconnexion</Link>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="max-w-4xl w-full">
              {/* Hero */}
              <div className="text-center mb-12">
                <span className="inline-block text-xs font-bold text-[#5C3D00] bg-[#F5C400] px-3 py-1 rounded-full mb-5 uppercase tracking-widest shadow">
                  Candidature requise
                </span>
                <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                  Rejoignez l&apos;équipe<br /><span className="text-[#F5C400]">WithYou</span>
                </h1>
                <p className="text-white/75 text-base max-w-xl mx-auto leading-relaxed">
                  Complétez votre dossier en quelques minutes et commencez à enseigner dès aujourd&apos;hui.
                </p>
              </div>

              {/* Steps + Perks */}
              <div className="grid md:grid-cols-2 gap-5 mb-10">
                {/* Process steps */}
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <p className="text-xs font-bold text-[#F5C400] uppercase tracking-widest mb-5">Comment ça marche</p>
                  <div className="space-y-5">
                    {[
                      { n: "1", title: "Soumettez votre dossier", desc: "Remplissez le formulaire en 5 étapes (~10 min)." },
                      { n: "2", title: "Examen RH", desc: "Notre équipe examine votre profil sous 3–5 jours ouvrables." },
                      { n: "3", title: "Entretien vidéo", desc: "Un court entretien pour vous évaluer." },
                      { n: "4", title: "Activation du profil", desc: "Vous apparaissez dans les recherches et recevez vos premiers étudiants." },
                    ].map((s, i, arr) => (
                      <div key={s.n} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-black text-xs flex-shrink-0">{s.n}</div>
                          {i < arr.length - 1 && <div className="w-px flex-1 bg-white/15 mt-1 h-5" />}
                        </div>
                        <div className="pb-1">
                          <p className="text-sm font-semibold text-white">{s.title}</p>
                          <p className="text-xs text-white/50 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perks */}
                <div className="space-y-3">
                  {[
                    { icon: "💰", title: "Revenus attractifs", desc: "Gagnez selon votre profil, vos disponibilités et votre engagement." },
                    { icon: "🕐", title: "Horaires flexibles", desc: "Choisissez vos créneaux et gérez votre agenda librement." },
                    { icon: "🌍", title: "100% en ligne", desc: "Enseignez depuis chez vous, sans déplacements ni contraintes." },
                    { icon: "📈", title: "Croissance garantie", desc: "Plus vous enseignez, plus votre réputation augmente." },
                  ].map(p => (
                    <div key={p.icon} className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{p.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{p.title}</p>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Link
                  href="/tutors/apply"
                  className="inline-flex items-center gap-2 bg-[#F5C400] text-[#5C3D00] font-bold px-10 py-4 rounded-2xl hover:bg-[#FFDE59] transition text-base shadow-[0_4px_24px_rgba(245,196,0,0.5)]"
                >
                  Soumettre ma candidature
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <p className="text-xs text-white/40 mt-3">Prend environ 10 minutes · Gratuit</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profile = user.tutorProfile;
  const status = app?.status ?? "NEW";
  const stageInfo = STAGE_INFO[status] ?? STAGE_INFO.NEW;
  const isRejected = status === "REJECTED";

  const profileComplete = !!(profile?.bio && profile?.cefrTeachingMin && profile?.cefrTeachingMax);

  const initials = (app?.fullName ?? user.email ?? "TU")
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
          <span className="text-[#6B5E44] text-sm font-semibold">Espace Tuteur</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">
            {initials}
          </div>
          <Link href="/api/auth/signout" className="text-xs text-[#6B5E44] hover:text-[#5C3D00] transition">
            Déconnexion
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-[#2D1A00]">
            Bonjour{app?.fullName ? `, ${app.fullName.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-[#6B5E44] mt-1">
            {"Suivez l'avancement de votre candidature ci-dessous."}
          </p>
        </div>

        {/* Status card */}
        <div className={`rounded-2xl border-2 p-5 ${stageInfo.color}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Statut actuel</p>
              <p className="text-lg font-bold">{stageInfo.label}</p>
              <p className="text-sm mt-1 opacity-80">{stageInfo.desc}</p>
            </div>
            <div className="text-3xl shrink-0">
              {isRejected ? "❌" : "⏳"}
            </div>
          </div>

          {/* Interview details */}
          {status === "INTERVIEW_SCHEDULED" && app?.interviewScheduledAt && (
            <div className="mt-4 pt-4 border-t border-current/20">
              <p className="text-sm font-semibold mb-2">Votre entretien :</p>
              <p className="text-sm font-bold">
                {new Date(app.interviewScheduledAt).toLocaleString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long",
                  hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
                })} (heure de Tunis)
              </p>
              {app.interviewMeetingUrl && (
                <a href={app.interviewMeetingUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#5C3D00] text-[#F5C400] rounded-xl text-sm font-bold hover:bg-[#3d2900] transition">
                  Rejoindre l&apos;entretien →
                </a>
              )}
            </div>
          )}

          {/* Video submitted confirmation */}
          {status === "VIDEO_SUBMITTED" && app?.videoSubmittedAt && (
            <div className="mt-4 pt-4 border-t border-current/20 text-sm">
              <p className="font-semibold">
                Vidéo reçue le{" "}
                {new Date(app.videoSubmittedAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
          )}

          {/* Reapply date */}
          {isRejected && app?.reapplyAfter && (
            <p className="mt-3 text-sm opacity-70">
              Vous pouvez postuler à nouveau à partir du{" "}
              <strong>{new Date(app.reapplyAfter).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong>.
            </p>
          )}
        </div>

        {/* Pipeline progress (not shown for rejected) */}
        {!isRejected && (
          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
            <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-4">Progression du recrutement</p>
            <div className="flex items-center gap-0">
              {STEPS.map((label, i) => {
                const stepNum = i + 1;
                const done = stageInfo.step > stepNum;
                const active = stageInfo.step === stepNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                        done   ? "bg-[#F5C400] border-[#F5C400] text-[#5C3D00]" :
                        active ? "bg-[#5C3D00] border-[#5C3D00] text-white" :
                                 "bg-white border-[#D9D0C3] text-[#9B8A6B]"
                      }`}>
                        {done ? "✓" : stepNum}
                      </div>
                      <p className={`text-[9px] mt-1 text-center leading-tight w-14 ${active ? "font-bold text-[#5C3D00]" : "text-[#9B8A6B]"}`}>
                        {label}
                      </p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${done ? "bg-[#F5C400]" : "bg-[#E8E0D4]"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Video submission panel */}
        {status === "VIDEO_REQUESTED" && (
          <VideoSubmissionPanel languages={app?.languagesTaught ?? []} />
        )}

        {/* Offer acceptance panel */}
        {status === "OFFER_PENDING" && app?.offerCurrency && (
          <OfferAcceptancePanel
            currency={app.offerCurrency}
            rateTnd={app.offerHourlyRateTnd ?? null}
            rateCad={app.offerHourlyRateCad ?? null}
            maxWeeklyHours={app.offerMaxWeeklyHours ?? null}
          />
        )}

      </div>
    </div>
  );
}
