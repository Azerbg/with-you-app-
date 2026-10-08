"use client";

import Link from "next/link";
import ContactButton from "./ContactButton";
import { useLanguage } from "@/context/LanguageContext";

interface TutorProfile {
  id: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  languagesTaught: string[];
  specializations: string[];
  certifications: string[];
  averageRating: number;
  totalReviews: number;
  verificationTier: string | null;
}

interface TutorEntry {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  profile: TutorProfile | null;
  sessionCount: number;
  lastSession: string;
}

const SPEC_LABELS: Record<string, { fr: string; en: string }> = {
  CONVERSATIONAL: { fr: "Conversation",        en: "Conversational" },
  PROFESSIONAL:   { fr: "Professionnel",        en: "Professional" },
  ACADEMIC:       { fr: "Académique",           en: "Academic" },
  EXAM_PREP:      { fr: "Préparation examens",  en: "Exam prep" },
};

export default function MyTutorsClient({ tutors }: { tutors: TutorEntry[] }) {
  const { lang } = useLanguage();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-auto">
      <div className="flex-1 overflow-auto p-8">
        {/* Find more CTA */}
        <div className="bg-[#1C1008] rounded-2xl p-6 flex items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-[#F5C400] font-bold text-lg mb-1">{t("Trouver un nouveau tuteur", "Find a new tutor")}</p>
            <p className="text-white/50 text-sm">{t("Parcourez notre liste de tuteurs vérifiés et réservez une séance découverte.", "Browse our list of verified tutors and book a discovery session.")}</p>
          </div>
          <Link
            href="/find-tutors"
            className="flex-shrink-0 bg-[#F5C400] text-[#5C3D00] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#FFDE59] transition shadow-[0_4px_14px_rgba(245,196,0,0.35)] whitespace-nowrap"
          >
            {t("Parcourir les tuteurs →", "Browse tutors →")}
          </Link>
        </div>

        {/* Tutor list */}
        {tutors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
            <p className="text-4xl mb-4">👨‍🏫</p>
            <h2 className="text-lg font-bold text-[#5C3D00] mb-2">{t("Aucun tuteur pour l'instant", "No tutors yet")}</h2>
            <p className="text-sm text-[#6B5E44] mb-6">
              {t("Réservez votre première séance pour commencer votre apprentissage.", "Book your first session to start learning.")}
            </p>
            <Link
              href="/find-tutors"
              className="inline-block bg-[#F5C400] text-[#5C3D00] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-[#FFDE59] transition"
            >
              {t("Trouver un tuteur", "Find a tutor")}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {tutors.map(tutor => {
              const p = tutor.profile;
              const displayName =
                tutor.firstName && tutor.lastName
                  ? `${tutor.firstName} ${tutor.lastName}`
                  : tutor.fullName ?? tutor.email;
              const nameInitials = tutor.firstName && tutor.lastName
                ? (tutor.firstName[0] + tutor.lastName[0]).toUpperCase()
                : displayName.slice(0, 2).toUpperCase();
              const bioSnippet = p?.bio ? p.bio.slice(0, 90) + (p.bio.length > 90 ? "…" : "") : null;

              return (
                <div key={tutor.userId} className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-md hover:border-[#F5C400]/50 transition flex flex-col">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C3D00] flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                      {p?.profilePhotoUrl
                        ? <img src={p.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        : nameInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2D1A00] text-sm truncate">{displayName}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p?.languagesTaught.map(l => (
                          <span key={l} className="text-[10px] bg-[#F5C400]/20 text-[#5C3D00] font-bold px-1.5 py-0.5 rounded-full">{l}</span>
                        ))}
                        {p?.verificationTier === "VERIFIED" && (
                          <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                      </div>
                      {p && p.totalReviews > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
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
                          {SPEC_LABELS[s]?.[lang] ?? s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sessions info */}
                  <div className="flex items-center justify-between text-[10px] text-[#6B5E44] mb-4">
                    <span>{tutor.sessionCount} {t("séance", "session")}{tutor.sessionCount > 1 ? "s" : ""}</span>
                    <span>
                      {t("Dernière :", "Last:")} {new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", {
                        day: "numeric", month: "short",
                      }).format(new Date(tutor.lastSession))}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <ContactButton tutorUserId={tutor.userId} />
                    <Link
                      href={`/booking/${tutor.userId}`}
                      className="flex-1 text-center text-xs font-bold bg-[#F5C400] text-[#5C3D00] rounded-full py-2 hover:bg-[#FFDE59] transition"
                    >
                      {t("Réserver →", "Book →")}
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
