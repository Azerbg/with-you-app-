import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import TutorProfileClient from "./TutorProfileClient";
import ContactTutorButton from "./ContactTutorButton";

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
  CONVERSATIONAL: "Conversation",
  PROFESSIONAL:   "Professionnel",
  ACADEMIC:       "Académique",
  EXAM_PREP:      "Préparation aux examens",
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
      <span className="text-xs text-[#7A6B55] w-40 shrink-0">{label}</span>
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
    },
  });

  if (!profile || profile.user.hrApplication?.status !== "ACTIVE") notFound();

  const reviewsRaw = await db.review.findMany({
    where: { tutorId: id, isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  });

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tutor";

  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const photoUrl = profile.user.image ?? profile.profilePhotoUrl;

  const bioParagraphs = (profile.bio ?? "").split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const tagline = bioParagraphs[0] ?? null;
  const bioBody = bioParagraphs.slice(1).join("\n\n") || null;

  const hasReviews = reviewsRaw.length > 0;
  const avg = (key: "ratingCommunication" | "ratingStructure" | "ratingAccuracy" | "ratingValue") =>
    hasReviews ? reviewsRaw.reduce((s, r) => s + r[key], 0) / reviewsRaw.length : 0;
  const avgComm    = avg("ratingCommunication");
  const avgStruct  = avg("ratingStructure");
  const avgSupport = avg("ratingAccuracy");
  const avgClarity = avg("ratingValue");

  const serializedReviews = reviewsRaw.slice(0, 8).map(r => ({
    id: r.id,
    ratingComposite: r.ratingComposite,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    student: r.student,
  }));

  let videoEmbed: { type: "youtube" | "loom"; id: string } | null = null;
  if (profile.videoIntroUrl) {
    const yt   = profile.videoIntroUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const loom = profile.videoIntroUrl.match(/loom\.com\/share\/([^?&\s]+)/);
    if (yt)   videoEmbed = { type: "youtube", id: yt[1] };
    if (loom) videoEmbed = { type: "loom",    id: loom[1] };
  }

  const isStudent  = session?.user?.role === "STUDENT";
  const isLoggedIn = !!session?.user;

  const bookingHref = isStudent
    ? `/booking/${id}`
    : `/auth/login?callbackUrl=/booking/${id}`;

  const showBookingCta = isStudent || !isLoggedIn;

  return (
    <div className="min-h-screen bg-[#FAF8F0]">

      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
        <Link href="/find-tutors" className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tous les tuteurs
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* ── A: Hero ── */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 sm:p-8">
          <div className="flex gap-6 items-start">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName}
                className="w-28 h-28 rounded-2xl object-cover flex-shrink-0 shadow-sm" />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-4xl flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-[#2D1A00]">{displayName}</h1>
                {profile.verificationTier === "TOP_TUTOR" && (
                  <span className="text-xs bg-[#F5C400] text-[#5C3D00] font-bold px-2.5 py-0.5 rounded-full">Top Tuteur</span>
                )}
                {profile.verificationTier === "VERIFIED" && (
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-0.5 rounded-full">Vérifié</span>
                )}
              </div>

              {tagline && (
                <p className="text-sm text-[#5C3D00] leading-relaxed mb-3">{tagline}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.languagesTaught.map(l => (
                  <span key={l} className="text-xs bg-[#F5C400]/20 text-[#5C3D00] font-semibold px-2.5 py-0.5 rounded-full">
                    {l === "French" ? "Français" : l === "Arabic" ? "Arabe" : "English"}
                  </span>
                ))}
              </div>

              {hasReviews ? (
                <div className="flex items-center gap-2">
                  <StarFull rating={profile.averageRating} size="sm" />
                  <span className="text-sm font-bold text-[#5C3D00]">{profile.averageRating.toFixed(1)}</span>
                  <span className="text-xs text-[#9B8A6B]">({profile.totalReviews} avis)</span>
                  {profile.yearsExperience != null && (
                    <>
                      <span className="text-[#D9D0C3]">·</span>
                      <span className="text-xs text-[#9B8A6B]">{profile.yearsExperience} ans d&apos;expérience</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#9B8A6B]">Nouveau tuteur</p>
                  {profile.yearsExperience != null && (
                    <span className="text-xs text-[#9B8A6B]">· {profile.yearsExperience} ans d&apos;expérience</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── B: Video intro ── */}
        {videoEmbed ? (
          <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D9D0C3]">
              <p className="font-bold text-[#2D1A00] text-sm">Vidéo d&apos;introduction</p>
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
        ) : null}

        {/* ── C: About ── */}
        {(bioBody || tagline) && (
          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6">
            <p className="text-xs font-bold text-[#9B8A6B] uppercase tracking-widest mb-4">
              À propos de {displayName.split(" ")[0]}
            </p>
            <p className="text-sm text-[#5C3D00] leading-relaxed whitespace-pre-wrap">
              {bioBody ?? tagline}
            </p>
          </div>
        )}

        {/* ── D: Specs / Levels / Certs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">Spécialisations</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.specializations.map(s => (
                <span key={s} className="text-xs bg-[#FFF3B0] text-[#C49200] font-semibold px-2 py-0.5 rounded-full">
                  {SPEC_LABELS[s] ?? s}
                </span>
              ))}
              {profile.specializations.length === 0 && (
                <span className="text-xs text-[#C4BAA8]">—</span>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">Niveaux enseignés</p>
            <p className="text-sm font-bold text-[#5C3D00]">{profile.cefrTeachingMin} → {profile.cefrTeachingMax}</p>
            <p className="text-xs text-[#9B8A6B] mt-1">Tous les niveaux du CECR</p>
          </div>

          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
            <p className="text-[10px] font-bold text-[#9B8A6B] uppercase tracking-widest mb-3">Certifications</p>
            {profile.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.certifications.map(c => (
                  <span key={c} className="text-xs bg-[#FAF8F0] text-[#5C3D00] font-semibold px-2 py-0.5 rounded-full border border-[#D9D0C3]">
                    {CERT_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#C4BAA8]">—</span>
            )}
          </div>
        </div>

        {/* ── E: Ratings & Reviews ── */}
        {hasReviews && (
          <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-[#F0EBE0] mb-6">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-6xl font-black text-[#2D1A00] leading-none">
                    {profile.averageRating.toFixed(1)}
                  </div>
                  <p className="text-xs text-[#9B8A6B] mt-1">sur 5</p>
                </div>
                <div>
                  <StarFull rating={profile.averageRating} size="lg" />
                  <p className="text-xs text-[#7A6B55] mt-1.5">{profile.totalReviews} avis vérifiés</p>
                </div>
              </div>
              <div className="space-y-3">
                <RatingBar label="Communication" value={avgComm} />
                <RatingBar label="Structure des séances" value={avgStruct} />
                <RatingBar label="Soutien & Motivation" value={avgSupport} />
                <RatingBar label="Clarté des explications" value={avgClarity} />
              </div>
            </div>

            <TutorProfileClient
              reviews={serializedReviews}
              tutorId={id}
              totalReviews={profile.totalReviews}
            />
          </div>
        )}

        {/* ── F: Contact ── */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[#2D1A00] text-sm">Une question avant de réserver ?</p>
            <p className="text-xs text-[#9B8A6B] mt-0.5">Envoyez un message à {displayName.split(" ")[0]} directement.</p>
          </div>
          <ContactTutorButton
            tutorId={id}
            tutorName={displayName}
            isStudent={isStudent}
            loginUrl={`/auth/login?callbackUrl=/tutors/${id}`}
          />
        </div>

        {/* ── G: Big bottom CTA ── */}
        {showBookingCta && (
          <div className="bg-[#1C1008] rounded-2xl p-8 text-center">
            <p className="text-[#F5C400] font-bold text-xl mb-1">Prêt à commencer avec {displayName.split(" ")[0]} ?</p>
            <p className="text-white/40 text-sm mb-6">Séance de découverte · 30 min · Tarif réduit</p>
            <Link
              href={bookingHref}
              className="inline-flex items-center gap-2 bg-[#F5C400] text-[#5C3D00] px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#FFDE59] transition shadow-[0_4px_20px_rgba(245,196,0,0.3)]"
            >
              Voir disponibilité et réserver
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
