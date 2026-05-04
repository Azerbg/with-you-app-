"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";

export default function HomePage() {
  const { lang, setLang } = useLanguage();
  const t = T[lang];
  const { data: session } = useSession();

  const tutors = [
    { name: "Amira B.", lang: "French", level: "Native", rating: "4.9", reviews: 312, price: 35, tag: "Top rated", avatar: "AB", color: "#F5C400" },
    { name: "Sami T.",  lang: "English", level: "C2",    rating: "4.8", reviews: 198, price: 28, tag: "Popular",   avatar: "ST", color: "#5C3D00" },
    { name: "Leila M.", lang: "French",  level: "Native", rating: "5.0", reviews: 87,  price: 42, tag: "New",       avatar: "LM", color: "#C49200" },
  ];

  const languages = t.languages as string[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdfaf4 0%, #fffef9 40%, #f8f3e8 100%)" }}>
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes ping-slow {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.05); }
          66%       { transform: translate(-20px, 15px) scale(0.97); }
        }
        .blob { animation: blob 10s ease-in-out infinite; }
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
        .card-float { animation: float 5s ease-in-out infinite; }
        .card-float-2 { animation: float 6s ease-in-out 1s infinite; }
        .card-float-3 { animation: float 5.5s ease-in-out 0.5s infinite; }
        .btn-glow {
          box-shadow: 0 4px 20px rgba(245,196,0,0.45);
          transition: all 0.25s ease;
        }
        .btn-glow:hover {
          box-shadow: 0 8px 28px rgba(245,196,0,0.65);
          transform: translateY(-2px);
        }
        .tutor-card { transition: all 0.3s ease; }
        .tutor-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(92,61,0,0.12);
        }
        .lang-chip { transition: all 0.2s ease; }
        .lang-chip:hover {
          background: #5C3D00;
          color: white;
          transform: scale(1.05);
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="nav-in sticky top-0 z-30 bg-[#fdfaf4]/90 backdrop-blur-md border-b border-[#F5C400]/15 shadow-[0_1px_12px_rgba(92,61,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 h-[62px] flex items-center justify-between">

          {/* Left — logo + nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#5C3D00] flex items-center justify-center">
                <span className="text-[#F5C400] font-black text-xs">W</span>
              </div>
              <span className="text-[15px] font-bold text-[#5C3D00] tracking-tight">WithYou</span>
            </Link>

            {/* Divider */}
            <div className="hidden md:block w-px h-5 bg-gray-200" />

            {/* Nav links — hide when logged in */}
            {!session?.user && (
              <nav className="hidden md:flex items-center gap-6 text-[13px] text-gray-500 font-medium">
                <a href="#how-it-works" className="hover:text-[#5C3D00] transition-colors">{t.nav.howItWorks}</a>
                <Link href="/tutors/apply" className="hover:text-[#5C3D00] transition-colors">{t.nav.becomeTutor}</Link>
                <a href="#pricing" className="hover:text-[#5C3D00] transition-colors">{lang === "fr" ? "Commencer" : "Get started"}</a>
              </nav>
            )}

            {/* When logged in — show role breadcrumb */}
            {session?.user && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {(session.user as { role?: string }).role ?? "User"}
              </span>
            )}
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-500 hover:border-[#F5C400] hover:text-[#5C3D00] hover:bg-[#FFFBEA] transition-all"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>

            {session?.user ? (
              <>
                {/* Avatar + email */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#5C3D00] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {session.user.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[12px] text-gray-500 font-medium max-w-[120px] truncate">
                    {session.user.email}
                  </span>
                </div>

                {/* Dashboard */}
                <Link
                  href="/dashboard"
                  className="h-8 px-4 rounded-lg bg-[#5C3D00] text-white text-[13px] font-semibold hover:bg-[#3d2900] transition-colors flex items-center"
                >
                  {lang === "fr" ? "Tableau de bord" : "Dashboard"}
                </Link>

                {/* Sign out */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title={lang === "fr" ? "Déconnexion" : "Sign out"}
                  className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="h-8 px-4 rounded-lg text-[13px] font-semibold text-gray-600 hover:text-[#5C3D00] hover:bg-gray-50 transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/auth/register"
                  className="h-8 px-4 rounded-lg bg-[#F5C400] text-[#5C3D00] text-[13px] font-bold hover:bg-[#FFDE59] transition-colors shadow-sm flex items-center"
                >
                  {t.nav.getStarted}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Decorative background blobs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #F5C400, transparent 70%)" }} />
        <div className="blob-2 absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #C49200, transparent 70%)" }} />
        <div className="blob-3 absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #5C3D00, transparent 70%)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(#5C3D00 1px, transparent 1px), linear-gradient(90deg, #5C3D00 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ══════════════════════════════════════════════
          LOGGED-IN HOME — shown only when authenticated
      ══════════════════════════════════════════════ */}
      {session?.user && (() => {
        const role = (session.user as { role?: string }).role;
        const email = session.user.email ?? "";
        const initials = email.slice(0, 2).toUpperCase();
        const firstName = email.split("@")[0];

        const roleCards: Record<string, { icon: string; label: string; desc: string; href: string; primary?: boolean }[]> = {
          STUDENT: [
            { icon: "📚", label: lang === "fr" ? "Mon tableau de bord" : "My dashboard",   desc: lang === "fr" ? "Reprendre là où vous vous étiez arrêté" : "Pick up where you left off", href: "/dashboard/student", primary: true },
            { icon: "🎯", label: lang === "fr" ? "Test de niveau CECR" : "CEFR quiz",        desc: lang === "fr" ? "Évaluer votre niveau actuel" : "Assess your current level",           href: "/onboarding" },
            { icon: "🧑‍🏫", label: lang === "fr" ? "Trouver un tuteur" : "Find a tutor",   desc: lang === "fr" ? "Parcourir les tuteurs vérifiés" : "Browse verified tutors",            href: "#tutors" },
          ],
          TUTOR: [
            { icon: "🧑‍🏫", label: lang === "fr" ? "Mon espace tuteur" : "Tutor dashboard", desc: lang === "fr" ? "Voir vos sessions et élèves" : "View your sessions & students",    href: "/dashboard/tutor", primary: true },
            { icon: "📋", label: lang === "fr" ? "Mon dossier" : "My application",           desc: lang === "fr" ? "Suivre l'état de ma candidature" : "Track your application status", href: "/dashboard/tutor" },
          ],
          HR: [
            { icon: "👥", label: "Console RH",          desc: lang === "fr" ? "Gérer les candidatures tuteurs" : "Manage tutor applications", href: "/console/hr", primary: true },
            { icon: "📝", label: lang === "fr" ? "Candidatures" : "Applications", desc: lang === "fr" ? "Voir toutes les candidatures" : "View all applications",                    href: "/console/hr" },
          ],
          ADMIN: [
            { icon: "⚙️",  label: lang === "fr" ? "Administration" : "Admin panel", desc: lang === "fr" ? "Gérer la plateforme" : "Manage the platform",                              href: "/dashboard/admin", primary: true },
            { icon: "👥", label: "Console RH",           desc: lang === "fr" ? "Gérer les candidatures tuteurs" : "Manage tutor applications", href: "/console/hr" },
          ],
        };

        const cards = roleCards[role ?? ""] ?? roleCards.STUDENT;
        const greeting = lang === "fr" ? "Bon retour," : "Welcome back,";

        return (
          <section className="flex-1 bg-[#FAFAF9]">
            {/* Personal welcome banner */}
            <div className="max-w-4xl mx-auto px-8 pt-14 pb-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#5C3D00] flex items-center justify-center text-white font-bold text-xl">
                  {initials}
                </div>
                <div>
                  <p className="text-sm text-gray-400 font-medium">{greeting}</p>
                  <p className="text-2xl font-bold text-[#5C3D00]">{firstName}</p>
                </div>
                <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-[#FFF3B0] text-[#C49200] border border-[#F5C400]/40">
                  {role}
                </span>
              </div>

              {/* Quick action cards */}
              <div className="grid sm:grid-cols-3 gap-4 mb-10">
                {cards.map((card) => (
                  <Link
                    key={card.href + card.label}
                    href={card.href}
                    className={`rounded-2xl p-5 border transition hover:-translate-y-1 hover:shadow-md ${
                      card.primary
                        ? "bg-[#5C3D00] text-white border-transparent"
                        : "bg-white border-gray-100 text-[#5C3D00]"
                    }`}
                  >
                    <p className="text-2xl mb-2">{card.icon}</p>
                    <p className="font-bold text-sm mb-1">{card.label}</p>
                    <p className={`text-xs ${card.primary ? "text-white/60" : "text-gray-400"}`}>{card.desc}</p>
                  </Link>
                ))}
              </div>

              {/* Info strip */}
              <div className="bg-white border border-[#F5C400]/30 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-[#5C3D00] text-sm">
                    {lang === "fr" ? "Besoin d'aide ?" : "Need help?"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === "fr"
                      ? "Notre équipe est disponible du lundi au vendredi, 9h–18h."
                      : "Our team is available Monday to Friday, 9am–6pm."}
                  </p>
                </div>
                <a
                  href="mailto:support@withyou.com"
                  className="text-sm font-semibold text-[#C49200] hover:text-[#5C3D00] transition whitespace-nowrap"
                >
                  support@withyou.com →
                </a>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Hero — shown only when NOT logged in ── */}
      {!session?.user && <section className="max-w-7xl mx-auto w-full px-8 pt-16 pb-12 grid md:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div>
          <h1 className="a2 text-5xl md:text-7xl font-bold text-[#5C3D00] leading-[1.05] mb-5">
            {t.hero.heading1}<br />
            {t.hero.heading2}{" "}
            <span className="shimmer">{t.hero.shimmer}</span>
          </h1>

          <p className="a3 text-xl text-gray-500 mb-8 leading-relaxed max-w-md">
            {t.hero.sub}<br />
            <strong className="text-[#5C3D00]">{(t.hero as unknown as { subBold: string }).subBold}</strong>
          </p>

          {/* Language chips */}
          <div className="a4 flex flex-wrap gap-2 mb-8">
            {languages.map((l) => (
              <span key={l} className="lang-chip cursor-pointer px-4 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600">
                {l}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="a5 flex flex-col sm:flex-row gap-3 mb-8">
            <Link href="/auth/register" className="btn-glow bg-[#F5C400] text-[#5C3D00] px-8 py-3.5 rounded-full font-bold text-base text-center">
              {t.hero.cta1}
            </Link>
            <Link href="/tutors/apply" className="border-2 border-gray-200 text-gray-700 px-8 py-3.5 rounded-full font-semibold text-base text-center hover:border-[#5C3D00] hover:text-[#5C3D00] transition">
              {t.hero.cta2}
            </Link>
          </div>

          {/* Trust row */}
          <div className="a6 flex items-center gap-5">
            <div className="flex -space-x-2">
              {["#F5C400","#5C3D00","#C49200","#FFDE59","#3d2900"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => <span key={s} className="text-[#F5C400] text-sm">★</span>)}
                <span className="text-sm font-bold text-[#5C3D00] ml-1">4.9</span>
              </div>
              <p className="text-xs text-gray-400">{t.hero.trust}</p>
            </div>
          </div>
        </div>

        {/* Right — Tutor cards */}
        <div id="tutors" className="hidden md:flex flex-col gap-4 relative">
          {tutors.map((tutor, i) => (
            <div
              key={tutor.name}
              className={`tutor-card bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.07)] flex items-center gap-4 ${i === 0 ? "card-float" : i === 1 ? "card-float-2 ml-8" : "card-float-3 ml-4"}`}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: tutor.color }}>
                {tutor.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-[#5C3D00] text-sm">{tutor.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tutor.color + "30", color: tutor.color }}>{tutor.tag}</span>
                </div>
                <p className="text-xs text-gray-400">{tutor.lang}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[#F5C400] text-xs">★</span>
                  <span className="text-xs font-semibold text-[#5C3D00]">{tutor.rating}</span>
                  <span className="text-xs text-gray-400">({tutor.reviews} {t.tutorCard.reviews})</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Link href="/auth/register" className="mt-2 text-[10px] font-bold bg-[#F5C400] text-[#5C3D00] px-3 py-1 rounded-full hover:bg-[#FFDE59] transition inline-block">
                  {t.tutorCard.book}
                </Link>
              </div>
            </div>
          ))}

        </div>
      </section>}

      {/* ── Stats bar — shown only when NOT logged in ── */}
      {!session?.user &&
      <section className="border-y border-[#F5C400]/10 bg-white/50 backdrop-blur-sm py-8">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 sm:grid-cols-2 gap-8 text-center">
          {[
            { val: "500+", label: t.stats.students },
            { val: "50+",  label: t.stats.tutors },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-[#5C3D00]">{s.val}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>}

      {!session?.user && <>
      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-8 py-20 relative">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-[#C49200] uppercase tracking-widest mb-2">{t.how.label}</p>
          <h2 className="text-3xl font-bold text-[#5C3D00]">{t.how.title}</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {t.how.steps.map((s, i) => (
            <div key={i} className="relative" style={{ animation: `fadeUp 0.6s ease ${0.2 + i * 0.15}s both` }}>
              <div className="bg-[#FFF3B0] w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4">
                {["🎯","🤝","🚀"][i]}
              </div>
              <span className="text-xs font-bold text-[#F5C400] mb-2 block">0{i + 1}</span>
              <h3 className="font-bold text-[#5C3D00] mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-white/40 backdrop-blur-sm border-y border-[#F5C400]/10 py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-[#C49200] uppercase tracking-widest mb-2">{t.testimonials.label}</p>
            <h2 className="text-3xl font-bold text-[#5C3D00]">{t.testimonials.title}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {t.testimonials.items.map((item) => (
              <div key={item.name} className="tutor-card bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map((i) => <span key={i} className="text-[#F5C400]">★</span>)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">&ldquo;{item.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#FFF3B0] flex items-center justify-center text-[#C49200] font-bold text-xs">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#5C3D00]">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.lang}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Become a tutor ── */}
      {(() => { const bt = (t as unknown as {becomeTutor: {label:string;title:string;desc:string;badge:string;cta:string}}).becomeTutor; return (
      <section className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-[#5C3D00] rounded-3xl p-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold text-[#F5C400] uppercase tracking-widest mb-2">{bt.label}</p>
            <h2 className="text-3xl font-bold text-white mb-3">{bt.title}</h2>
            <p className="text-white/70 text-base leading-relaxed mb-4">{bt.desc}</p>
            <p className="text-[#F5C400] text-sm font-semibold">{bt.badge}</p>
          </div>
          <Link href="/tutors/apply" className="whitespace-nowrap bg-[#F5C400] text-[#5C3D00] px-8 py-4 rounded-full font-bold text-base hover:bg-[#FFDE59] transition shadow-lg">
            {bt.cta}
          </Link>
        </div>
      </section>
      ); })()}

      {/* ── Bottom CTA ── */}
      <section id="pricing" className="max-w-4xl mx-auto px-8 py-20 text-center">
        <p className="text-xs font-bold text-[#C49200] uppercase tracking-widest mb-3">{t.cta.label}</p>
        <h2 className="text-4xl font-bold text-[#5C3D00] mb-4">{t.cta.title}</h2>
        <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
          {t.cta.sub}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/auth/register" className="btn-glow bg-[#F5C400] text-[#5C3D00] px-10 py-4 rounded-full font-bold text-base">
            {t.cta.btn1}
          </Link>
          <Link href="/auth/register" className="border-2 border-gray-200 text-gray-600 px-10 py-4 rounded-full font-semibold text-base hover:border-[#5C3D00] transition">
            {t.cta.btn2}
          </Link>
        </div>
        <p className="text-sm text-gray-400 max-w-md mx-auto">{(t.cta as unknown as {micro: string}).micro}</p>
      </section>
      </>}

      {/* ── Footer ── */}
      <footer className="border-t border-[#3d2900] bg-[#3d2900] px-8 py-10 mt-auto">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-bold text-[#F5C400] mb-4 text-lg">WithYou</p>
            <p className="text-xs text-white/50 leading-relaxed">{t.footer.tagline}</p>
          </div>
          {t.footer.cols.map((col, colIdx) => (
            <div key={col.title}>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l, linkIdx) => (
                  <li key={l}>
                    {colIdx === 1 && linkIdx === 0 ? (
                      <Link href="/tutors/apply" className="text-xs text-white/60 hover:text-[#F5C400] transition">{l}</Link>
                    ) : (
                      <span className="text-xs text-white/60 hover:text-[#F5C400] cursor-pointer transition">{l}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} WithYou. {t.footer.rights}</p>
          <p className="text-xs text-white/30">{t.footer.phase}</p>
        </div>
      </footer>
    </div>
  );
}
