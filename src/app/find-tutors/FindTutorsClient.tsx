"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Tutor {
  userId: string;
  profileId: string;
  displayName: string;
  image: string | null;
  bio: string | null;
  languagesTaught: string[];
  specializations: string[];
  certifications: string[];
  yearsExperience: number | null;
  cefrTeachingMin: string | null;
  cefrTeachingMax: string | null;
  averageRating: number;
  totalReviews: number;
  verificationTier: string;
  matchScore: number | null;
}

const SPEC_LABELS: Record<string, string> = {
  CONVERSATIONAL: "Conversation",
  PROFESSIONAL: "Professionnel",
  ACADEMIC: "Académique",
  EXAM_PREP: "Préparation aux examens",
};


function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            viewBox="0 0 20 20"
            className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-[#F5C400]" : "text-[#E8E0D4]"}`}
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {total > 0 ? (
        <span className="text-xs text-[#6B5E44]">
          {rating.toFixed(1)} <span className="text-[#9B8A6B]">({total})</span>
        </span>
      ) : (
        <span className="text-xs text-[#9B8A6B]">Nouveau</span>
      )}
    </div>
  );
}

function TutorCard({ tutor }: { tutor: Tutor }) {
  const initials = tutor.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/tutors/${tutor.userId}`}
      className="bg-white border border-[#C4BAA8] rounded-2xl p-5 flex gap-4 hover:border-[#F5C400] hover:shadow-md transition-all group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {tutor.image ? (
          <img
            src={tutor.image}
            alt={tutor.displayName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-bold text-lg">
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#2D1A00] group-hover:text-[#5C3D00] transition">
              {tutor.displayName}
            </h3>
            {tutor.verificationTier === "TOP_TUTOR" && (
              <span className="text-[10px] bg-[#F5C400] text-[#5C3D00] font-bold px-1.5 py-0.5 rounded-full">
                ⭐ Top
              </span>
            )}
            {tutor.verificationTier === "VERIFIED" && (
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                ✓ Vérifié
              </span>
            )}
          </div>
          {tutor.matchScore !== null && tutor.matchScore >= 70 && (
            <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              tutor.matchScore >= 85
                ? "bg-green-100 text-green-700"
                : "bg-[#FFF3B0] text-[#C49200]"
            }`}>
              {tutor.matchScore >= 85 ? "Excellent match" : "Bon match"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {tutor.languagesTaught.map((l) => (
            <span
              key={l}
              className="text-[11px] bg-[#F5C400]/20 text-[#5C3D00] font-semibold px-2 py-0.5 rounded-full"
            >
              {l === "French" ? "Français" : l === "Arabic" ? "Arabe" : "English"}
            </span>
          ))}
          {tutor.cefrTeachingMin && tutor.cefrTeachingMax && (
            <span className="text-[11px] bg-[#FAF8F0] text-[#6B5E44] font-semibold px-2 py-0.5 rounded-full border border-[#D9D0C3]">
              {tutor.cefrTeachingMin}–{tutor.cefrTeachingMax}
            </span>
          )}
          {tutor.specializations.slice(0, 2).map((s) => (
            <span
              key={s}
              className="text-[11px] bg-[#FFF3B0] text-[#C49200] font-semibold px-2 py-0.5 rounded-full"
            >
              {SPEC_LABELS[s] ?? s}
            </span>
          ))}
        </div>

        {tutor.bio && (
          <p className="text-xs text-[#6B5E44] line-clamp-2 mb-2">{tutor.bio}</p>
        )}

        <div className="flex items-center">
          <StarRating rating={tutor.averageRating} total={tutor.totalReviews} />
        </div>
      </div>
    </Link>
  );
}

const LANG_OPTIONS = [
  { value: "Arabic",  label: "Arabe" },
  { value: "French",  label: "Français" },
  { value: "English", label: "English" },
];

function SpeechIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  );
}

function FilterSidebar({
  langs,
  spec,
  cefr,
  studentCefrLevel,
  onLangToggle,
  onChange,
}: {
  langs: string[];
  spec: string;
  cefr: string;
  studentCefrLevel: string | null;
  onLangToggle: (value: string) => void;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <aside className="space-y-6">
      {/* Language — communication language of the tutor */}
      <div>
        <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-1">
          Parle aussi
        </p>
        <p className="text-[11px] text-[#9B8A6B] mb-3 leading-relaxed">
          Langue que le tuteur utilise pour expliquer (utile pour les débutants)
        </p>
        <div className="space-y-2">
          {LANG_OPTIONS.map((opt) => {
            const checked = langs.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition select-none ${
                  checked ? "bg-[#F5C400]/20" : "hover:bg-[#FAF8F0]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onLangToggle(opt.value)}
                  className="w-4 h-4 rounded accent-[#F5C400] cursor-pointer flex-shrink-0"
                />
                <span className={`flex items-center gap-2 text-sm font-medium ${checked ? "text-[#5C3D00] font-bold" : "text-[#5C3D00]"}`}>
                  <SpeechIcon />
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Specialization */}
      <div>
        <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-2">
          Spécialisation
        </p>
        <div className="space-y-1.5">
          {[
            { value: "", label: "Toutes" },
            { value: "CONVERSATIONAL", label: "Conversation" },
            { value: "PROFESSIONAL", label: "Professionnel" },
            { value: "ACADEMIC", label: "Académique" },
            { value: "EXAM_PREP", label: "Préparation aux examens" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange("spec", opt.value)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${
                spec === opt.value
                  ? "bg-[#F5C400] text-[#5C3D00] font-bold"
                  : "text-[#5C3D00] hover:bg-[#FAF8F0]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* CEFR level */}
      <div>
        <p className="text-[11px] font-bold text-[#7A6B55] uppercase tracking-widest mb-2">
          Niveau
        </p>
        <div className="space-y-1.5">
          {[
            { value: "", label: "Tous les niveaux" },
            { value: "beginner", label: "Débutant", sub: "A1 - A2" },
            { value: "intermediate", label: "Intermédiaire", sub: "B1 - B2" },
            { value: "advanced", label: "Avancé", sub: "C1 - C2" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange("cefr", opt.value)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${
                cefr === opt.value
                  ? "bg-[#F5C400] text-[#5C3D00] font-bold"
                  : "text-[#5C3D00] hover:bg-[#FAF8F0]"
              }`}
            >
              {opt.label}
              {"sub" in opt && (
                <span className={`ml-1.5 text-[11px] font-normal ${cefr === opt.value ? "text-[#5C3D00]/70" : "text-[#9B8A6B]"}`}>
                  {opt.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function FindTutorsClient({
  searchParamsPromise,
  studentCefrLevel,
}: {
  searchParamsPromise: Promise<{ lang?: string; spec?: string; cefr?: string }>;
  studentCefrLevel: string | null;
}) {
  const searchParams = use(searchParamsPromise);
  const router = useRouter();
  const pathname = usePathname();

  const [langs, setLangs] = useState<string[]>(
    searchParams.lang ? searchParams.lang.split(",").filter(Boolean) : []
  );
  const [spec, setSpec] = useState(searchParams.spec ?? "");
  const [cefr, setCefr] = useState(searchParams.cefr ?? "");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const buildQs = useCallback((l: string[], s: string, c: string) => {
    const qs = new URLSearchParams();
    if (l.length) qs.set("lang", l.join(","));
    if (s) qs.set("spec", s);
    if (c) qs.set("cefr", c);
    return qs.toString();
  }, []);

  const fetchTutors = useCallback(async (l: string[], s: string, c: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutors?${buildQs(l, s, c)}`);
      if (res.ok) setTutors(await res.json());
    } finally {
      setLoading(false);
    }
  }, [buildQs]);

  useEffect(() => {
    fetchTutors(langs, spec, cefr);
  }, [langs, spec, cefr, fetchTutors]);

  const handleLangToggle = useCallback((value: string) => {
    const newLangs = langs.includes(value)
      ? langs.filter(l => l !== value)
      : [...langs, value];
    setLangs(newLangs);
    const qsStr = buildQs(newLangs, spec, cefr);
    router.replace(qsStr ? `${pathname}?${qsStr}` : pathname, { scroll: false });
  }, [langs, spec, cefr, router, pathname, buildQs]);

  const handleFilter = useCallback(
    (key: string, value: string) => {
      const newSpec = key === "spec" ? value : spec;
      const newCefr = key === "cefr" ? value : cefr;
      if (key === "spec") setSpec(value);
      if (key === "cefr") setCefr(value);
      const qsStr = buildQs(langs, newSpec, newCefr);
      router.replace(qsStr ? `${pathname}?${qsStr}` : pathname, { scroll: false });
      setMobileFiltersOpen(false);
    },
    [langs, spec, cefr, router, pathname, buildQs],
  );

  return (
    <div className="min-h-screen bg-[#FAF8F0]">
      {/* Nav */}
      <div className="bg-white border-b border-[#6B5E44]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <img src="/logo.svg" alt="WithYou" className="h-8 w-auto" />
        </Link>
        <Link
          href="/dashboard/student"
          className="text-sm text-[#6B5E44] hover:text-[#5C3D00] transition"
        >
          Mon espace →
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2D1A00] mb-1">
            Trouver un tuteur
          </h1>
          <p className="text-sm text-[#6B5E44]">
            {loading ? "Chargement…" : `${tutors.length} tuteur${tutors.length !== 1 ? "s" : ""} disponible${tutors.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Mobile filter button */}
        <button
          className="md:hidden mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-[#C4BAA8] rounded-xl text-sm font-semibold text-[#5C3D00]"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          Filtres {(langs.length || spec || cefr) && "•"}
        </button>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
            <div className="relative ml-auto w-72 bg-white h-full p-6 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <p className="font-bold text-[#2D1A00]">Filtres</p>
                <button onClick={() => setMobileFiltersOpen(false)} className="text-[#6B5E44]">✕</button>
              </div>
              <FilterSidebar langs={langs} spec={spec} cefr={cefr} studentCefrLevel={studentCefrLevel} onLangToggle={handleLangToggle} onChange={handleFilter} />
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block w-52 flex-shrink-0">
            <FilterSidebar langs={langs} spec={spec} cefr={cefr} studentCefrLevel={studentCefrLevel} onLangToggle={handleLangToggle} onChange={handleFilter} />
          </div>

          {/* Results */}
          <div className="flex-1">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#C4BAA8] rounded-2xl p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#E8E0D4]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-[#E8E0D4] rounded w-1/3" />
                        <div className="h-3 bg-[#E8E0D4] rounded w-1/2" />
                        <div className="h-3 bg-[#E8E0D4] rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tutors.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-bold text-[#2D1A00] mb-1">Aucun tuteur trouvé</p>
                <p className="text-sm text-[#6B5E44]">
                  Essayez d&apos;ajuster vos filtres.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tutors.map((t) => (
                  <TutorCard key={t.userId} tutor={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
