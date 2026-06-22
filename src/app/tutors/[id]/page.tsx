import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateAvailableSlots } from "@/lib/slots";
import type { Metadata } from "next";
import Link from "next/link";
import TutorProfileClient from "./TutorProfileClient";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await db.tutorProfile.findUnique({
    where: { userId: id },
    include: { user: { select: { hrApplication: { select: { fullName: true } } } } },
  });
  if (!profile) return { title: "Tutor — WithYou" };
  const name = profile.user.hrApplication?.fullName ?? "Tutor";
  return {
    title: `${name} — Tuteur WithYou`,
    description: profile.bio?.slice(0, 160) ?? `Réservez une séance de découverte avec ${name} sur WithYou.`,
  };
}

const SPEC_LABELS: Record<string, string> = {
  CONVERSATIONAL: "Conversationnel",
  PROFESSIONAL:   "Professionnel",
  ACADEMIC:       "Académique",
  EXAM_PREP:      "Prépa examens",
};

const CERT_LABELS: Record<string, string> = {
  CELTA: "CELTA", DALF: "DALF/DELF", TESOL: "TESOL/TEFL",
  UNIVERSITY_DEGREE: "Diplôme universitaire", OTHER: "Autre certification",
};

function StarFull({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} viewBox="0 0 20 20" className={`${sz} ${s <= Math.round(rating) ? "text-[#F5C400]" : "text-[#E8E0D4]"}`} fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#7A6B55] w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#F0EBE0] rounded-full overflow-hidden">
        <div className="h-full bg-[#F5C400] rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-[#5C3D00] w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default async function TutorProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const profile = await db.tutorProfile.findUnique({
    where: { userId: id },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, image: true,
          hrApplication: { select: { fullName: true, status: true } },
        },
      },
      availability: true,
    },
  });

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") notFound();

  const [bookingsRaw, reviewsRaw] = await Promise.all([
    db.booking.findMany({
      where: { tutorId: id, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
      select: { scheduledAt: true },
    }),
    db.review.findMany({
      where: { tutorId: id, isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        ratingComposite: true,
        ratingCommunication: true,
        ratingStructure: true,
        ratingAccuracy: true,
        ratingValue: true,
        text: true,
        createdAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const slots = generateAvailableSlots(profile.availability, bookingsRaw.map(b => b.scheduledAt), 7);

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tutor";

  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const photoUrl = profile.user.image ?? profile.profilePhotoUrl;

  // Bio split: tagline = first paragraph, bioBody = rest
  const bioParagraphs = (profile.bio ?? "").split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const tagline = bioParagraphs[0] ?? null;
  const bioBody = bioParagraphs.slice(1).join("\n\n") || null;

  // Rating dimension averages
  const hasReviews = reviewsRaw.length > 0;
  const avg = (key: "ratingCommunication" | "ratingStructure" | "ratingAccuracy" | "ratingValue") =>
    hasReviews ? reviewsRaw.reduce((s, r) => s + r[key], 0) / reviewsRaw.length : 0;
  const avgComm   = avg("ratingCommunication");
  const avgStruct = avg("ratingStructure");
  const avgAcc    = avg("ratingAccuracy");
  const avgVal    = avg("ratingValue");

  // Serialize reviews for client component
  const serializedReviews = reviewsRaw.map(r => ({
    id: r.id,
    ratingComposite: r.ratingComposite,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    student: r.student,
  }));

  // Video embed
  let videoEmbed: { type: "youtube" | "loom"; id: string } | null = null;
  if (profile.videoIntroUrl) {
    const yt   = profile.videoIntroUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const loom = profile.videoIntroUrl.match(/loom\.com\/share\/([^?&\s]+)/);
    if (yt)   videoEmbed = { type: "youtube", id: yt[1] };
    if (loom) videoEmbed = { type: "loom",    id: loom[1] };
  }

  const isStudent  = session?.user?.role === "STUDENT";
  const isLoggedIn = !!session?.user;

  // Group slots by date for 7-day preview
  const slotsByDate: Record<string, number> = {};
  for (const s of slots) {
    const dateKey = s.utc.toISOString().slice(0, 10);
    slotsByDate[dateKey] = (slotsByDate[dateKey] ?? 0) + 1;
  }

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i + 1);
    return d.toISOString().slice(0, 10);
  });

  const bookingHref = isStudent
    ? `/booking/${id}`
    : `/auth/login?callbackUrl=/booking/${id}`;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">

      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
        <div className="flex items-center gap-3">
          <Link href="/find-tutors" className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition">
            &larr; Tous les tuteurs
          </Link>
          {(isStudent || !isLoggedIn) && (
            <Link href={bookingHref}
              className="hidden sm:block px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FFDE59] transition">
              Réserver
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* A — Hero */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 mb-5">
          <div className="flex gap-5 items-start">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName}
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-3xl flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-[#2D1A00]">{displayName}</h1>
                {profile.verificationTier === "TOP_TUTOR" && (
                  <span className="text-xs bg-[#F5C400] text-[#5C3D00] font-bold px-2 py-0.5 rounded-full">Top Tuteur</span>
                )}
                {profile.verificationTier === "VERIFIED" && (
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Verifie</span>
                )}
              </div>

              {tagline && (
                <p className="text-sm text-[#5C3D00] italic leading-relaxed mb-2">{tagline}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.languagesTaught.map(l => (
                  <span key={l} className="text-xs bg-[#F5C400]/20 text-[#5C3D00] font-semibold px-2 py-0.5 rounded-full">
                    {l === "French" ? "Francais" : l === "Arabic" ? "Arabe" : "English"}
                  </span>
                ))}
              </div>

              {profile.totalReviews > 0 ? (
                <div className="flex items-center gap-2">
                  <StarFull rating={profile.averageRating} size="sm" />
                  <span className="text-sm font-bold text-[#5C3D00]">{profile.averageRating.toFixed(1)}</span>
                  <span className="text-xs text-[#9B8A6B]">({profile.totalReviews} avis)</span>
                </div>
              ) : (
                <p className="text-xs text-[#9B8A6B]">Nouveau tuteur</p>
              )}
            </div>

            {(isStudent || !isLoggedIn) && (
              <Link href={bookingHref}
                className="shrink-0 px-4 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-xl text-sm hover:bg-[#FFDE59] transition hidden sm:block">
                Reserver
              </Link>
            )}
          </div>
        </div>

        {/* B — Quick info pills */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-[#C4BAA8] rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">Specialisations</p>
            <div className="flex flex-wrap gap-1">
              {profile.specializations.map(s => (
                <span key={s} className="text-[11px] bg-[#FFF3B0] text-[#C49200] font-semibold px-1.5 py-0.5 rounded-full">
                  {SPEC_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#C4BAA8] rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">Niveaux</p>
            <p className="text-sm font-bold text-[#5C3D00]">{profile.cefrTeachingMin} a {profile.cefrTeachingMax}</p>
            {profile.yearsExperience != null && (
              <p className="text-xs text-[#9B8A6B] mt-0.5">{profile.yearsExperience} ans d&apos;experience</p>
            )}
          </div>
          <div className="bg-white border border-[#C4BAA8] rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-2">Certifications</p>
            {profile.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {profile.certifications.map(c => (
                  <span key={c} className="text-[11px] bg-[#FAF8F0] text-[#5C3D00] font-semibold px-1.5 py-0.5 rounded-full border border-[#D9D0C3]">
                    {CERT_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9B8A6B]">—</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Left col */}
          <div className="md:col-span-2 space-y-5">

            {/* Video */}
            {videoEmbed ? (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#D9D0C3]">
                  <p className="font-bold text-[#2D1A00] text-sm">Video d&apos;introduction</p>
                </div>
                <div className="aspect-video">
                  <iframe
                    src={videoEmbed.type === "youtube"
                      ? `https://www.youtube.com/embed/${videoEmbed.id}`
                      : `https://www.loom.com/embed/${videoEmbed.id}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5 flex items-center gap-4 text-[#9B8A6B]">
                <div className="w-12 h-12 rounded-xl bg-[#F0EBE0] flex items-center justify-center text-2xl flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#5C3D00]">Video a venir</p>
                  <p className="text-xs">Ce tuteur n&apos;a pas encore ajoute de video d&apos;introduction.</p>
                </div>
              </div>
            )}

            {/* C — Ratings & avis */}
            {hasReviews && (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">

                {/* Overall score */}
                <div className="flex items-center gap-5 pb-5 border-b border-[#F0EBE0] mb-5">
                  <div className="text-center">
                    <div className="text-5xl font-black text-[#2D1A00] leading-none">
                      {profile.averageRating.toFixed(1)}
                    </div>
                    <p className="text-xs text-[#9B8A6B] mt-1">sur 5</p>
                  </div>
                  <div>
                    <StarFull rating={profile.averageRating} size="lg" />
                    <p className="text-xs text-[#7A6B55] mt-1.5">
                      {profile.totalReviews} avis verifies
                    </p>
                  </div>
                </div>

                {/* Dimension bars */}
                <div className="space-y-3 pb-5 border-b border-[#F0EBE0] mb-5">
                  <RatingBar label="Communication" value={avgComm} />
                  <RatingBar label="Structure des seances" value={avgStruct} />
                  <RatingBar label="Correction linguistique" value={avgAcc} />
                  <RatingBar label="Rapport qualite/prix" value={avgVal} />
                </div>

                {/* AI summary placeholder */}
                <div className="border border-dashed border-[#C4BAA8] rounded-xl p-4 mb-5 bg-[#FAF8F0]">
                  <p className="text-[11px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-1">
                    Resume IA des avis
                  </p>
                  <p className="text-xs text-[#9B8A6B] italic">
                    Bientot disponible — un resume intelligent des points forts mentionnes par les etudiants.
                  </p>
                </div>

                {/* Reviews list */}
                <TutorProfileClient reviews={serializedReviews} />
              </div>
            )}

          </div>

          {/* Right col */}
          <div className="space-y-4">

            {/* CTA card */}
            <div className="bg-[#5C3D00] rounded-2xl p-5 text-white">
              <p className="text-[10px] font-bold text-[#F5C400]/60 uppercase tracking-widest mb-1">Seance de decouverte</p>
              <p className="text-2xl font-bold text-[#F5C400] mb-0.5">15 USD</p>
              <p className="text-xs text-white/50 mb-4">30 min · Paiement unique</p>
              {(isStudent || !isLoggedIn) && (
                <Link href={bookingHref}
                  className="block w-full text-center bg-[#F5C400] text-[#5C3D00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition">
                  Reserver maintenant
                </Link>
              )}
            </div>

            {/* Availability preview */}
            <div className="bg-white border border-[#C4BAA8] rounded-2xl p-4">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
                Disponibilites (7 prochains jours)
              </p>
              <div className="space-y-1.5">
                {next7Days.map(dateStr => {
                  const count = slotsByDate[dateStr] ?? 0;
                  const date = new Date(dateStr + "T12:00:00Z");
                  const label = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                  return (
                    <div key={dateStr} className="flex items-center justify-between text-xs">
                      <span className="text-[#5C3D00] font-medium capitalize">{label}</span>
                      {count > 0 ? (
                        <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                          {count} creneau{count > 1 ? "x" : ""}
                        </span>
                      ) : (
                        <span className="text-[#9B8A6B]">Indisponible</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* D — Biographie longue (pleine largeur) */}
        {(bioBody || (!hasReviews && tagline)) && (
          <div className="mt-5 bg-white border border-[#C4BAA8] rounded-2xl p-6">
            <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-4">A propos de {displayName.split(" ")[0]}</p>
            <p className="text-sm text-[#5C3D00] leading-relaxed whitespace-pre-wrap">
              {bioBody ?? tagline}
            </p>
          </div>
        )}

        {/* Mobile CTA */}
        {(isStudent || !isLoggedIn) && (
          <div className="mt-6 sm:hidden">
            <Link href={bookingHref}
              className="block w-full text-center bg-[#F5C400] text-[#5C3D00] py-3 rounded-2xl font-bold text-sm hover:bg-[#FFDE59] transition">
              Reserver une seance de decouverte — 15 USD
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
