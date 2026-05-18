import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

const STAGE_INFO: Record<string, { label: string; desc: string; color: string; step: number }> = {
  NEW:                 { label: "Candidature reçue",      desc: "Notre équipe RH va examiner votre dossier sous 3–5 jours ouvrables.",          color: "bg-blue-50 border-blue-200 text-blue-700",    step: 1 },
  STAGE1_REVIEW:       { label: "Examen en cours",         desc: "Un responsable RH examine votre candidature. Nous vous contacterons bientôt.",  color: "bg-yellow-50 border-yellow-200 text-yellow-700", step: 2 },
  INTERVIEW_SCHEDULED: { label: "Entretien planifié",       desc: "Votre entretien est confirmé. Vérifiez votre email pour les détails.",          color: "bg-purple-50 border-purple-200 text-purple-700", step: 3 },
  INTERVIEW_COMPLETE:  { label: "Entretien terminé",        desc: "L'équipe RH délibère. Vous recevrez une réponse très prochainement.",           color: "bg-orange-50 border-orange-200 text-orange-700", step: 4 },
  OFFER_PENDING:       { label: "Offre en attente",         desc: "Une offre vous a été envoyée par email. Veuillez la signer pour continuer.",    color: "bg-pink-50 border-pink-200 text-pink-700",    step: 5 },
  SIGNED:              { label: "Contrat signé",            desc: "Votre contrat a été signé. Activation en cours…",                              color: "bg-teal-50 border-teal-200 text-teal-700",    step: 6 },
  ACTIVE:              { label: "Profil actif",             desc: "Bienvenue dans l'équipe WithYou ! Complétez votre profil pour apparaître dans les recherches.", color: "bg-green-50 border-green-200 text-green-700", step: 7 },
  REJECTED:            { label: "Candidature rejetée",      desc: "Votre candidature n'a pas été retenue cette fois. Vous pouvez postuler à nouveau après 90 jours.", color: "bg-red-50 border-red-200 text-red-700", step: 0 },
};

const STEPS = [
  "Candidature reçue",
  "Examen RH",
  "Entretien",
  "Délibération",
  "Offre",
  "Contrat signé",
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
          interviewScheduledAt: true,
          interviewMeetingUrl: true,
          reapplyAfter: true,
          offerCurrency: true,
          offerHourlyRateTnd: true,
          offerHourlyRateCad: true,
          offerMaxWeeklyHours: true,
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

  // User registered as TUTOR but never submitted an application
  if (!app) {
    const initials = (user.firstName && user.lastName
      ? user.firstName[0] + user.lastName[0]
      : user.email.slice(0, 2)
    ).toUpperCase();

    return (
      <div className="min-h-screen bg-[#FAF8F0]">
        <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
            <span className="text-[#6B5E44] text-sm font-semibold">Espace Tuteur</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-xs">{initials}</div>
            <Link href="/api/auth/signout" className="text-xs text-[#6B5E44] hover:text-[#5C3D00] transition">Déconnexion</Link>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="text-5xl mb-4">🧑‍🏫</div>
          <h1 className="text-2xl font-bold text-[#2D1A00] mb-2">Devenez tuteur WithYou</h1>
          <p className="text-[#6B5E44] mb-8 leading-relaxed">
            Vous n&apos;avez pas encore soumis de candidature. Rejoignez notre équipe de tuteurs et commencez à enseigner.
          </p>
          <Link
            href="/tutors/apply"
            className="inline-block bg-[#F5C400] text-[#5C3D00] font-bold px-8 py-3 rounded-xl hover:bg-[#FFDE59] transition"
          >
            Soumettre ma candidature →
          </Link>
        </div>
      </div>
    );
  }

  const profile = user.tutorProfile;
  const status = app?.status ?? "NEW";
  const stageInfo = STAGE_INFO[status] ?? STAGE_INFO.NEW;
  const isActive = status === "ACTIVE";
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
            {isActive ? "Votre profil est actif sur WithYou." : "Suivez l'avancement de votre candidature ci-dessous."}
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
              {isActive ? "✅" : isRejected ? "❌" : "⏳"}
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

          {/* Offer details */}
          {status === "OFFER_PENDING" && app?.offerCurrency && (
            <div className="mt-4 pt-4 border-t border-current/20 text-sm">
              <p className="font-semibold mb-1">Détails de votre offre :</p>
              <p>
                Taux horaire : <strong>
                  {app.offerCurrency === "TND"
                    ? `${app.offerHourlyRateTnd} TND/h`
                    : `${app.offerHourlyRateCad} CAD/h`}
                </strong>
              </p>
              <p>Plafond hebdomadaire : <strong>{app.offerMaxWeeklyHours}h/semaine</strong></p>
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

        {/* Action cards — only shown when ACTIVE */}
        {isActive && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Profile completion */}
            <div className={`rounded-2xl border-2 p-5 ${profileComplete ? "border-green-300 bg-green-50" : "border-[#F5C400] bg-[#FFF3B0]"}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-bold text-[#5C3D00]">
                  {profileComplete ? "Profil complété ✓" : "Compléter votre profil"}
                </p>
                <span className="text-xl">{profileComplete ? "✅" : "📝"}</span>
              </div>
              <p className="text-xs text-[#6B5E44] mb-4">
                {profileComplete
                  ? "Votre profil est visible dans les recherches."
                  : "Ajoutez votre bio, photo et niveaux CEFR pour apparaître dans les recherches."}
              </p>
              {!profileComplete && (
                <Link href="/dashboard/tutor/complete-profile"
                  className="block w-full text-center bg-[#5C3D00] text-[#F5C400] py-2 rounded-xl text-sm font-bold hover:bg-[#3d2900] transition">
                  Compléter le profil →
                </Link>
              )}
            </div>

            {/* Availability */}
            <div className="rounded-2xl border-2 border-[#6B5E44]/20 bg-white p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-bold text-[#5C3D00]">Mes disponibilités</p>
                <span className="text-xl">📅</span>
              </div>
              <p className="text-xs text-[#6B5E44] mb-4">
                Définissez vos créneaux disponibles pour que les étudiants puissent vous réserver.
              </p>
              <Link href="/dashboard/tutor/availability"
                className="block w-full text-center border-2 border-[#F5C400] text-[#5C3D00] py-2 rounded-xl text-sm font-bold hover:bg-[#FFF3B0] transition">
                Gérer mes disponibilités →
              </Link>
            </div>
          </div>
        )}

        {/* Stats placeholder (future M6) */}
        {isActive && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Séances complétées", value: "0", icon: "📅" },
              { label: "Étudiants actifs",    value: "0", icon: "👨‍🎓" },
              { label: "Revenus ce mois",     value: "—",  icon: "💰" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[#C4BAA8] rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-[#2D1A00]">{s.value}</p>
                <p className="text-xs text-[#7A6B55] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
