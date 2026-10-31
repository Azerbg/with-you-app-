"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

interface Review {
  text: string;
  name: string;
  learningLang: string;
  rating: number;
}

interface Props {
  languages: string[];
  tutorCount: number;
  studentCount: number;
  avgRating: number | null;
  reviewCount: number;
  reviews: Review[];
}

// ── Slideshow banner ────────────────────────────────────────────────────────

function SlideShow({ lang }: { lang: "en" | "fr" }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  // pos = CSS object-position pour cadrer le sujet principal de chaque photo
  const slides = lang === "fr" ? [
    { img: "/images/marquee/b1.webp", pos: "60% 45%", quote: "Je progresse à mon rythme, depuis chez moi.", name: "Lina K.", role: "Apprenante en espagnol" },
    { img: "/images/marquee/b2.webp", pos: "55% 35%", quote: "J'ai progressé de A2 à B2 en seulement 4 mois.", name: "Sofia M.", role: "Apprenante en français" },
    { img: "/images/marquee/b3.webp", pos: "50% 45%", quote: "La première séance gratuite m'a convaincu immédiatement.", name: "Adam R.", role: "Apprenant en allemand" },
  ] : [
    { img: "/images/marquee/b1.webp", pos: "60% 45%", quote: "I make real progress, from the comfort of home.", name: "Lina K.", role: "Spanish learner" },
    { img: "/images/marquee/b2.webp", pos: "55% 35%", quote: "I went from A2 to B2 in just 4 months.", name: "Sofia M.", role: "French learner" },
    { img: "/images/marquee/b3.webp", pos: "50% 45%", quote: "The free trial session convinced me right away.", name: "Adam R.", role: "German learner" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % slides.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const slide = slides[current];

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] overflow-hidden">
      {/* Background images — all rendered, only current visible */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ opacity: i === current ? 1 : 0, transition: "opacity 700ms ease" }}
        >
          <img src={s.img} alt="" className="w-full h-full object-cover" style={{ objectPosition: s.pos }} />
        </div>
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A0D00]/80 via-[#1A0D00]/50 to-transparent" />

      {/* Text content */}
      <div
        className="absolute inset-0 z-10 flex items-center px-8 sm:px-14 lg:px-20"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 400ms ease, transform 400ms ease" }}
      >
        <div className="max-w-xl">
          <svg className="w-10 h-10 text-[#F5C400]/50 mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-5">
            {slide.quote}
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-[#F5C400]" />
            <span className="text-sm font-semibold text-white/80">{slide.name}</span>
            <span className="text-xs text-white/40">{slide.role}</span>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-8 sm:left-14 lg:left-20 flex items-center gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true); }, 400); }}
            aria-label={`Slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              background: i === current ? "#F5C400" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const LANG_DISPLAY: Record<string, { fr: string; en: string }> = {
  French:     { fr: "Français",  en: "French" },
  English:    { fr: "Anglais",   en: "English" },
  Spanish:    { fr: "Espagnol",  en: "Spanish" },
  German:     { fr: "Allemand",  en: "German" },
  Italian:    { fr: "Italien",   en: "Italian" },
  Arabic:     { fr: "Arabe",     en: "Arabic" },
  Mandarin:   { fr: "Mandarin",  en: "Mandarin" },
  Portuguese: { fr: "Portugais", en: "Portuguese" },
  Japanese:   { fr: "Japonais",  en: "Japanese" },
  Korean:     { fr: "Coréen",    en: "Korean" },
};

export default function LandingPage({ languages, tutorCount, studentCount, avgRating, reviewCount, reviews }: Props) {
  const { lang, setLang } = useLanguage();
  const t = T[lang];
  const [menuOpen, setMenuOpen] = useState(false);

  const hasStats = tutorCount > 0 || studentCount > 0;
  const hasRating = avgRating !== null && reviewCount > 0;

  const footerHrefs: Record<string, Record<number, string>> = {
    "0": { 0: "/find-tutors", 1: "#how-it-works", 2: "/auth/register", 3: "/onboarding" },
    "1": { 0: "/tutors/apply", 1: "/tutors/requirements" },
    "2": { 0: "/about", 1: "/contact", 2: "/legal/privacy", 3: "/legal/cgu" },
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "linear-gradient(135deg, #fdfaf4 0%, #fffef9 40%, #f8f3e8 100%)" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.05); }
          66%       { transform: translate(-20px, 15px) scale(0.97); }
        }
        .blob   { animation: blob 10s ease-in-out infinite; }
        .blob-2 { animation: blob 13s ease-in-out 2s infinite; }
        .blob-3 { animation: blob 11s ease-in-out 4s infinite; }
        .a1 { animation: fadeUp 0.6s ease 0s both; }
        .a2 { animation: fadeUp 0.6s ease 0.1s both; }
        .a3 { animation: fadeUp 0.6s ease 0.2s both; }
        .a4 { animation: fadeUp 0.6s ease 0.3s both; }
        .a5 { animation: fadeUp 0.6s ease 0.4s both; }
        .a6 { animation: fadeUp 0.6s ease 0.5s both; }
        .nav-in { animation: fadeIn 0.4s ease both; }
        .shimmer {
          background: linear-gradient(90deg, #5C3D00 20%, #C49200 40%, #F5C400 50%, #C49200 60%, #5C3D00 80%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }
        .btn-glow {
          box-shadow: 0 4px 20px rgba(245,196,0,0.45);
          transition: all 0.25s ease;
        }
        .btn-glow:hover {
          box-shadow: 0 8px 28px rgba(245,196,0,0.65);
          transform: translateY(-2px);
        }
        .lang-chip { transition: all 0.2s ease; }
        .lang-chip:hover {
          background: #5C3D00;
          color: white;
          transform: scale(1.05);
        }
        @media (prefers-reduced-motion: reduce) {
          .a1,.a2,.a3,.a4,.a5,.a6,.blob,.blob-2,.blob-3 { animation: none; }
          .shimmer { animation: none; background: #5C3D00; -webkit-text-fill-color: #5C3D00; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="nav-in sticky top-0 z-30 bg-[#fdfaf4]/90 backdrop-blur-md border-b border-[#F5C400]/15 shadow-[0_1px_12px_rgba(92,61,0,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[62px] flex items-center justify-between gap-4">

          <div className="flex items-center gap-6 min-w-0">
            <Link href="/" className="flex-shrink-0">
              <img src="/logo.svg" alt="WithYou" className="h-8 w-auto" />
            </Link>
            <div className="hidden md:block w-px h-5 bg-gray-200" />
            <nav className="hidden md:flex items-center gap-6 text-[13px] text-gray-500 font-medium">
              <a href="#how-it-works" className="hover:text-[#5C3D00] transition-colors">{t.nav.howItWorks}</a>
              <Link href="/tutors/apply" className="hover:text-[#5C3D00] transition-colors">{t.nav.becomeTutor}</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-500 hover:border-[#F5C400] hover:text-[#5C3D00] hover:bg-[#FFFBEA] transition-all"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <Link
              href="/auth/login"
              className="hidden sm:flex h-8 px-4 rounded-lg text-[13px] font-bold text-gray-600 hover:text-[#5C3D00] hover:bg-gray-50 transition-colors items-center"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/auth/register"
              className="h-8 px-4 rounded-lg bg-[#F5C400] text-[#5C3D00] text-[13px] font-bold hover:bg-[#FFDE59] transition-colors shadow-sm flex items-center"
            >
              {t.nav.getStarted}
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#F5C400] hover:text-[#5C3D00] transition-all"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#fdfaf4] flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <img src="/logo.svg" alt="WithYou" className="h-8 w-auto" />
            <button
              onClick={() => setMenuOpen(false)}
              className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red-200 hover:text-red-500 transition-all"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-5">
            {[
              { href: "#how-it-works", label: t.nav.howItWorks, onClick: () => setMenuOpen(false) },
              { href: "/tutors/apply", label: t.nav.becomeTutor },
              { href: "/auth/login",   label: t.nav.login },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.onClick}
                className="text-xl font-semibold text-[#2D1A00] hover:text-[#5C3D00] transition-colors py-2 border-b border-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <Link
              href="/auth/register"
              onClick={() => setMenuOpen(false)}
              className="btn-glow block w-full bg-[#F5C400] text-[#5C3D00] px-8 py-4 rounded-full font-bold text-base text-center"
            >
              {t.nav.getStarted}
            </Link>
          </div>
        </div>
      )}

      {/* ── Decorative background blobs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #F5C400, transparent 70%)" }} />
        <div className="blob-2 absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #C49200, transparent 70%)" }} />
        <div className="blob-3 absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #5C3D00, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(#5C3D00 1px, transparent 1px), linear-gradient(90deg, #5C3D00 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_2fr] gap-12 items-center min-h-[calc(100vh-62px)] py-12 lg:py-8">

          {/* Left — content */}
          <div className="flex flex-col justify-center">

            <div className="a1 inline-flex items-center gap-2 bg-[#FFF3B0] border border-[#F5C400]/40 rounded-full px-4 py-1.5 text-xs font-bold text-[#C49200] w-fit mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse inline-block" aria-hidden="true" />
              {lang === "fr" ? "Cours 100% personnalisés en direct" : "100% personalized live lessons"}
            </div>

            <h1 className="a2 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-[#2D1A00] leading-[1.05] mb-6">
              {t.hero.heading1}<br />
              {t.hero.heading2}{" "}
              <span className="shimmer">{t.hero.shimmer}</span>
            </h1>

            <p className="a3 text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
              {t.hero.sub}{" "}
              <strong className="text-[#5C3D00]">{(t.hero as unknown as { subBold: string }).subBold}</strong>
            </p>

            {/* Language chips */}
            <div className="a4 flex flex-wrap gap-2 mb-8">
              {languages.map((l) => {
                const display = LANG_DISPLAY[l]?.[lang] ?? l;
                return (
                  <Link
                    key={l}
                    href={`/find-tutors?lang=${encodeURIComponent(l)}`}
                    className="lang-chip px-4 py-1.5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm"
                  >
                    {display}
                  </Link>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="a5 flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/auth/register" className="btn-glow bg-[#F5C400] text-[#5C3D00] px-8 py-4 rounded-full font-bold text-base text-center">
                {t.hero.cta1}
              </Link>
              <Link href="/find-tutors" className="border-2 border-[#5C3D00]/20 text-[#5C3D00] bg-white px-8 py-4 rounded-full font-semibold text-base text-center hover:border-[#5C3D00] hover:bg-[#FAF8F0] transition">
                {lang === "fr" ? "Voir les tuteurs →" : "Browse tutors →"}
              </Link>
            </div>

            {/* Trust row */}
            {hasStats && (
              <div className="a6 flex items-center gap-5">
                {tutorCount > 0 && (
                  <div className="flex -space-x-2" aria-hidden="true">
                    {["#F5C400","#5C3D00","#C49200","#FFDE59","#3d2900"].slice(0, Math.min(tutorCount, 5)).map((c, i) => (
                      <div key={i} className="w-9 h-9 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </div>
                )}
                <div>
                  {hasRating && (
                    <div className="flex items-center gap-1" aria-label={`Rated ${avgRating!.toFixed(1)} out of 5`}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} aria-hidden="true" className={s <= Math.round(avgRating!) ? "text-[#F5C400]" : "text-gray-300"}>★</span>
                      ))}
                      <span className="text-sm font-bold text-[#5C3D00] ml-1">{avgRating!.toFixed(1)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {studentCount >= 50
                      ? lang === "fr" ? `${studentCount}+ apprenants` : `${studentCount}+ learners`
                      : reviewCount >= 50
                        ? lang === "fr" ? `${reviewCount}+ séances données` : `${reviewCount}+ sessions given`
                        : lang === "fr" ? "Tuteurs vérifiés" : "Verified tutors"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — rounded image card */}
          <div className="relative">
            <div className="relative h-[500px] lg:h-[700px] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-black/5">
              <Image
                src="/hero-tutor.webp"
                alt={lang === "fr" ? "Tuteur WithYou en session en direct" : "WithYou tutor in a live session"}
                fill
                priority
                quality={90}
                className="object-cover object-[60%_15%]"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── Slideshow banner ── */}
      <SlideShow lang={lang} />

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-8 bg-[#FAF8F0]">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#FFF3B0] border border-[#F5C400]/50 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] inline-block" />
              <span className="text-xs font-bold text-[#C49200] uppercase tracking-[0.15em]">{t.how.label}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1A00] leading-tight mb-5">
              {lang === "fr" ? (
                <>De votre niveau actuel<br />à la <span className="text-[#C49200]">fluidité</span> en 3 étapes</>
              ) : (
                <>From your current level<br />to <span className="text-[#C49200]">fluency</span> in 3 steps</>
              )}
            </h2>
            <p className="text-[#6B5E44] text-base max-w-md mx-auto leading-relaxed">
              {lang === "fr"
                ? "De l'inscription à votre première séance en quelques minutes."
                : "From sign-up to your first session in minutes."}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-12 left-[calc(16.66%+20px)] right-[calc(16.66%+20px)] h-px bg-gradient-to-r from-[#F5C400]/30 via-[#F5C400] to-[#F5C400]/30 z-0" />

            {t.how.steps.map((s, i) => (
              <div
                key={i}
                className="relative bg-white border border-[#E8DFC8] rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 z-10"
                style={{ animation: `fadeUp 0.6s ease ${0.15 + i * 0.15}s both` }}
              >
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={i === 0 ? "/step-1.jpg" : i === 1 ? "/step-2.png" : "/step-3.png"}
                    alt={lang === "fr" ? `Étape ${i + 1}` : `Step ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute top-4 left-4 bg-[#F5C400] text-[#5C3D00] text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                    0{i + 1}
                  </div>
                </div>

                <div className="p-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5C400] flex items-center justify-center shadow-[0_4px_12px_rgba(245,196,0,0.35)] mb-5">
                    <span className="text-xl">{["🎯","🤝","🚀"][i]}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#2D1A00] mb-3">{s.title.replace(/^\p{Emoji_Presentation}\s*/u, "")}</h3>
                  <p className="text-base text-[#6B5E44] leading-relaxed">{s.desc}</p>
                </div>

                {i < 2 && (
                  <div className="sm:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#F5C400] rounded-full flex items-center justify-center shadow-md z-20">
                    <svg className="w-4 h-4 text-[#5C3D00]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/auth/register" className="btn-glow inline-block bg-[#5C3D00] text-[#F5C400] px-10 py-4 rounded-full font-bold text-base hover:bg-[#3d2900] transition">
              {lang === "fr" ? "Commencer gratuitement →" : "Get started free →"}
            </Link>
          </div>

        </div>
      </section>

      {/* ── Testimonials — only if real reviews exist ── */}
      {reviews.length > 0 && (
        <section className="py-24 px-8 bg-[#2D1A00]">
          <div className="max-w-5xl mx-auto">

            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-[#F5C400]/10 border border-[#F5C400]/30 rounded-full px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] inline-block" />
                <span className="text-xs font-bold text-[#F5C400] uppercase tracking-[0.15em]">
                  {lang === "fr" ? "Témoignages" : "Testimonials"}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                {lang === "fr" ? (
                  <>Ce que disent<br />nos <span className="text-[#F5C400]">apprenants</span></>
                ) : (
                  <>What our<br /><span className="text-[#F5C400]">learners</span> say</>
                )}
              </h2>
              <p className="text-white/50 text-base max-w-sm mx-auto leading-relaxed">
                {lang === "fr" ? "Des progrès réels, des apprenants réels." : "Real progress, real learners."}
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {reviews.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-7 flex flex-col gap-5 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-[#F5C400]/40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-white/80 text-sm leading-relaxed flex-1">{item.text}</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                    <div className="w-10 h-10 rounded-full bg-[#F5C400] flex items-center justify-center text-[#5C3D00] font-black text-sm flex-shrink-0">
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {LANG_DISPLAY[item.learningLang]?.[lang] ?? item.learningLang}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section id="cta" className="relative w-full overflow-hidden" style={{ minHeight: "420px", background: "linear-gradient(135deg, #1A0D00 0%, #3d2900 100%)" }}>

        <div className="absolute inset-0">
          <Image
            src="/cta-bg.webp"
            alt=""
            fill
            className="object-cover object-[center_35%]"
            sizes="100vw"
            quality={90}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A0D00]/85 via-[#1A0D00]/60 to-[#1A0D00]/20" />

        <div className="relative z-10 max-w-5xl mx-auto px-8 md:px-10 lg:px-20 py-24 flex flex-col justify-center h-full">

          <div className="inline-flex items-center gap-2 bg-[#F5C400]/15 border border-[#F5C400]/30 rounded-full px-4 py-1.5 w-fit mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5C400] animate-pulse inline-block" />
            <span className="text-xs font-bold text-[#F5C400] uppercase tracking-[0.15em]">
              {lang === "fr" ? "Commencez aujourd'hui" : "Start today"}
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 max-w-xl">
            {lang === "fr" ? (
              <>Prêt à faire de<br />vrais <span className="text-[#F5C400]">progrès</span> ?</>
            ) : (
              <>Ready to make<br />real <span className="text-[#F5C400]">progress</span>?</>
            )}
          </h2>

          <p className="text-white/60 text-lg leading-relaxed max-w-md mb-10">
            {lang === "fr"
              ? "Commencez avec une séance découverte de 30 min sans engagement avec un tuteur dédié."
              : "Start with a 30-min discovery session, no commitment, with a dedicated tutor."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href="/auth/register" className="btn-glow bg-[#F5C400] text-[#5C3D00] px-10 py-4 rounded-full font-bold text-base text-center hover:bg-[#FFDE59] transition">
              {lang === "fr" ? "Créer mon compte gratuitement" : "Create my free account"}
            </Link>
            <Link href="/find-tutors" className="border-2 border-white/20 text-white px-10 py-4 rounded-full font-semibold text-base text-center hover:border-white/50 hover:bg-white/5 transition">
              {lang === "fr" ? "Voir les tuteurs →" : "Browse tutors →"}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {[
              { text: lang === "fr" ? "Sans engagement"          : "No commitment" },
              { text: lang === "fr" ? "Tuteurs vérifiés"         : "Verified tutors" },
              { text: lang === "fr" ? "Séance découverte 30 min" : "30-min discovery session" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5C400]/20 flex items-center justify-center text-[#F5C400] text-xs font-bold flex-shrink-0">✓</span>
                <span className="text-white/50 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#3d2900] bg-[#3d2900] px-8 py-10 mt-auto">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <img src="/logo.svg" alt="WithYou" className="h-7 w-auto brightness-0 invert mb-4" />
            <p className="text-xs text-white/50 leading-relaxed">{t.footer.tagline}</p>
          </div>
          {t.footer.cols.map((col, colIdx) => (
            <div key={col.title}>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{col.title}</p>
              <div className="flex flex-col gap-2">
                {col.links.map((l, linkIdx) => {
                  const href = footerHrefs[String(colIdx)]?.[linkIdx] ?? "#";
                  return (
                    <Link key={l} href={href} className="text-xs text-white/60 hover:text-[#F5C400] transition">
                      {l}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} WithYou. {t.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}
