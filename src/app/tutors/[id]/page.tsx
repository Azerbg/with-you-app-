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

  const bookings = await db.booking.findMany({
    where: { tutorId: id, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true },
  });

  const slots = generateAvailableSlots(profile.availability, bookings.map(b => b.scheduledAt), 7);

  const displayName =
    profile.user.firstName && profile.user.lastName
      ? `${profile.user.firstName} ${profile.user.lastName}`
      : profile.user.hrApplication?.fullName ?? "Tutor";

  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const photoUrl = profile.user.image ?? profile.profilePhotoUrl;

  // Video embed
  let videoEmbed: { type: "youtube" | "loom"; id: string } | null = null;
  if (profile.videoIntroUrl) {
    const yt = profile.videoIntroUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const loom = profile.videoIntroUrl.match(/loom\.com\/share\/([^?&\s]+)/);
    if (yt)   videoEmbed = { type: "youtube", id: yt[1] };
    if (loom) videoEmbed = { type: "loom",    id: loom[1] };
  }

  const isStudent = session?.user?.role === "STUDENT";

  // Group slots by date for the 7-day preview
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

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-8 w-auto" /></Link>
        <div className="flex items-center gap-3">
          <Link href="/find-tutors" className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition">
            ← Tous les tuteurs
          </Link>
          {isStudent && (
            <Link href={`/booking/${id}`}
              className="px-4 py-2 bg-[#F5C400] text-[#5C3D00] font-bold rounded-full text-sm hover:bg-[#FFDE59] transition">
              Réserver
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="bg-white border border-[#C4BAA8] rounded-2xl p-6 mb-6 flex gap-5 items-start">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName}
              className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-2xl flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-[#2D1A00]">{displayName}</h1>
              {profile.verificationTier === "TOP_TUTOR" && (
                <span className="text-xs bg-[#F5C400] text-[#5C3D00] font-bold px-2 py-0.5 rounded-full">⭐ Top Tuteur</span>
              )}
              {profile.verificationTier === "VERIFIED" && (
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ Vérifié</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.languagesTaught.map(l => (
                <span key={l} className="text-xs bg-[#F5C400]/20 text-[#5C3D00] font-semibold px-2 py-0.5 rounded-full">
                  {l === "French" ? "🇫🇷 Français" : "🇬🇧 English"}
                </span>
              ))}
              <span className="text-xs bg-[#FAF8F0] text-[#6B5E44] font-semibold px-2 py-0.5 rounded-full border border-[#D9D0C3]">
                {profile.cefrTeachingMin}–{profile.cefrTeachingMax}
              </span>
            </div>
            {profile.totalReviews > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} viewBox="0 0 20 20" className={`w-4 h-4 ${s <= Math.round(profile.averageRating) ? "text-[#F5C400]" : "text-[#E8E0D4]"}`} fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-[#5C3D00]">{profile.averageRating.toFixed(1)}</span>
                <span className="text-xs text-[#9B8A6B]">({profile.totalReviews} avis)</span>
              </div>
            ) : (
              <p className="text-xs text-[#9B8A6B]">Nouveau tuteur</p>
            )}
          </div>
          {isStudent && (
            <Link href={`/booking/${id}`}
              className="shrink-0 px-5 py-2.5 bg-[#F5C400] text-[#5C3D00] font-bold rounded-xl text-sm hover:bg-[#FFDE59] transition hidden sm:block">
              Réserver une séance de découverte
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="md:col-span-2 space-y-5">

            {/* Video */}
            {videoEmbed && (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#D9D0C3]">
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
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
                <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-3">À propos</p>
                <p className="text-sm text-[#5C3D00] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {/* Teaching info */}
            <div className="bg-white border border-[#C4BAA8] rounded-2xl p-5">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-4">Profil d&apos;enseignant</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-[#9B8A6B] uppercase tracking-wide mb-1.5">Spécialisations</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.specializations.map(s => (
                      <span key={s} className="text-xs bg-[#FFF3B0] text-[#C49200] font-semibold px-2 py-0.5 rounded-full">
                        {SPEC_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-[#9B8A6B] uppercase tracking-wide mb-1.5">Niveaux enseignés</p>
                  <p className="text-sm font-bold text-[#5C3D00]">{profile.cefrTeachingMin} → {profile.cefrTeachingMax}</p>
                </div>
                {profile.yearsExperience != null && (
                  <div>
                    <p className="text-[11px] text-[#9B8A6B] uppercase tracking-wide mb-1.5">Expérience</p>
                    <p className="text-sm font-bold text-[#5C3D00]">{profile.yearsExperience} ans</p>
                  </div>
                )}
                {profile.certifications.length > 0 && (
                  <div>
                    <p className="text-[11px] text-[#9B8A6B] uppercase tracking-wide mb-1.5">Certifications</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.certifications.map(c => (
                        <span key={c} className="text-xs bg-[#FAF8F0] text-[#5C3D00] font-semibold px-2 py-0.5 rounded-full border border-[#D9D0C3]">
                          {CERT_LABELS[c] ?? c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            {/* Discovery session CTA */}
            <div className="bg-[#5C3D00] rounded-2xl p-5 text-white">
              <p className="text-[10px] font-bold text-[#F5C400]/60 uppercase tracking-widest mb-1">Séance de découverte</p>
              <p className="text-2xl font-bold text-[#F5C400] mb-0.5">15 USD</p>
              <p className="text-xs text-white/50 mb-4">30 min · Paiement unique</p>
              {isStudent ? (
                <Link href={`/booking/${id}`}
                  className="block w-full text-center bg-[#F5C400] text-[#5C3D00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition">
                  Réserver maintenant →
                </Link>
              ) : (
                <Link href="/auth/login"
                  className="block w-full text-center bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition">
                  Connectez-vous pour réserver
                </Link>
              )}
            </div>

            {/* Availability preview */}
            <div className="bg-white border border-[#C4BAA8] rounded-2xl p-4">
              <p className="text-xs font-bold text-[#7A6B55] uppercase tracking-widest mb-3">
                Disponibilités (7 prochains jours)
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
                          {count} créneau{count > 1 ? "x" : ""}
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

        {/* Mobile CTA */}
        {isStudent && (
          <div className="mt-6 sm:hidden">
            <Link href={`/booking/${id}`}
              className="block w-full text-center bg-[#F5C400] text-[#5C3D00] py-3 rounded-2xl font-bold text-sm hover:bg-[#FFDE59] transition">
              Réserver une séance de découverte — 15 USD
            </Link>
          </div>
        )}
      </div>

      {/* Hidden client component for interactivity if needed */}
      <TutorProfileClient tutorId={id} />
    </div>
  );
}
