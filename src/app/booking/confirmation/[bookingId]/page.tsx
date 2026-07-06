import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Réservation confirmée — WithYou" };

interface Props { params: Promise<{ bookingId: string }> }

export default async function BookingConfirmationPage({ params }: Props) {
  const { bookingId } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/auth/login");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      tutor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
          hrApplication: { select: { fullName: true } },
          tutorProfile: { select: { profilePhotoUrl: true } },
        },
      },
    },
  });

  if (!booking || booking.studentId !== session.user.id) notFound();

  const tutorName =
    booking.tutor.firstName && booking.tutor.lastName
      ? `${booking.tutor.firstName} ${booking.tutor.lastName}`
      : booking.tutor.hrApplication?.fullName ?? "Votre tuteur";

  const tutorPhoto = booking.tutor.image ?? booking.tutor.tutorProfile?.profilePhotoUrl ?? null;

  const dateStr = booking.scheduledAt.toLocaleString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  });

  const initials = tutorName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAF8F0] flex flex-col">
      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4">
        <Link href="/">
          <img src="/logo.svg" alt="WithYou" className="h-8 w-auto" />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          {/* Success card */}
          <div className="bg-white border border-[#C4BAA8] rounded-2xl overflow-hidden shadow-sm">
            {/* Green header */}
            <div className="bg-green-500 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white font-bold text-xl">Réservation confirmée !</h1>
              <p className="text-green-100 text-sm mt-1">Un email de confirmation vous a été envoyé.</p>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Tutor */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#E8E0D4]">
                {tutorPhoto ? (
                  <img src={tutorPhoto} alt={tutorName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-[#9B8A6B] font-semibold uppercase tracking-wide">Tuteur</p>
                  <p className="font-bold text-[#2D1A00]">{tutorName}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B5E44]">Type de séance</span>
                  <span className="font-semibold text-[#2D1A00]">Découverte · 30 min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B5E44]">Date et heure</span>
                  <span className="font-semibold text-[#2D1A00] text-right capitalize">{dateStr}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B5E44]">Montant payé</span>
                  <span className="font-semibold text-[#2D1A00]">15 USD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B5E44]">Référence</span>
                  <span className="font-mono text-xs font-semibold text-[#5C3D00] bg-[#FAF8F0] px-2 py-0.5 rounded">
                    {bookingId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-[#FFF3B0] border border-[#F5C400] rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-[#5C3D00] mb-1">Prochaines étapes</p>
                <p className="text-xs text-[#6B5E44] leading-relaxed">
                  Rejoignez la salle de classe 5 minutes avant le début. Pensez à tester votre caméra et microphone.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard/student/sessions"
                  className="block w-full text-center bg-[#F5C400] text-[#5C3D00] py-3 rounded-xl font-bold text-sm hover:bg-[#FFDE59] transition"
                >
                  Voir mes séances →
                </Link>
                <a
                  href={`/api/bookings/${bookingId}/ical`}
                  download
                  className="block w-full text-center bg-white text-[#5C3D00] py-3 rounded-xl font-semibold text-sm hover:bg-[#FAF8F0] transition border border-[#D9D0C3] flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Ajouter au calendrier (.ics)
                </a>
                <Link
                  href="/find-tutors"
                  className="block w-full text-center bg-[#FAF8F0] text-[#5C3D00] py-3 rounded-xl font-semibold text-sm hover:bg-[#F0EAD8] transition border border-[#D9D0C3]"
                >
                  Explorer d&apos;autres tuteurs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
