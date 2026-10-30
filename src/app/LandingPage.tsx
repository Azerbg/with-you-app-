"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import { TUTORS } from "@/data/tutors";

// ── Inline SVG icons (lucide-style, 1.5px stroke) ──────────────────────────

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
  </svg>
);

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "none" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Fade-up animation hook (scroll-triggered, once) ─────────────────────────

function useInView(ref: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.07 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

function AnimateIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const visible = useInView(ref);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        mounted
          ? {
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(12px)",
              transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// ── UI Mockups (How it works) ────────────────────────────────────────────────

function PlacementTestMockup({ lang }: { lang: "en" | "fr" }) {
  const question =
    lang === "fr"
      ? "Elle ___ au café chaque matin."
      : "She ___ to the café every morning.";
  const options =
    lang === "fr"
      ? ["mange", "manges", "mangez", "manger"]
      : ["go", "goes", "going", "gone"];
  const correctIndex = 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-4">
        {lang === "fr" ? "Test de placement" : "Placement test"}
      </p>
      <p className="text-sm font-medium text-ink mb-4 leading-snug">{question}</p>
      <div className="space-y-2 mb-5">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`px-3 py-2.5 rounded-lg border text-sm ${
              i === correctIndex
                ? "border-accent text-accent font-medium"
                : "border-border text-muted"
            }`}
            style={i === correctIndex ? { background: "rgba(183,121,31,.06)" } : undefined}
          >
            {opt}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">{lang === "fr" ? "Niveau estimé" : "Level estimate"}</span>
        <span className="text-xs font-semibold text-ink">B1 — {lang === "fr" ? "Intermédiaire" : "Intermediate"}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

function TutorMatchMockup({ lang }: { lang: "en" | "fr" }) {
  const rows = [
    { init: "A", name: "Amara S.", sub: lang === "fr" ? "Français · C2" : "French · C2", rating: "4.9" },
    { init: "C", name: "Carlos R.", sub: lang === "fr" ? "Espagnol · Natif" : "Spanish · Native", rating: "4.8" },
  ];
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {lang === "fr" ? "Tuteurs recommandés" : "Recommended tutors"}
        </p>
      </div>
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-ink flex-shrink-0"
            style={{ background: "#E7E1D8" }}
          >
            {row.init}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{row.name}</p>
            <p className="text-xs text-muted">{row.sub}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-ink">★ {row.rating}</p>
            <p className="text-[10px] text-accent mt-0.5">{lang === "fr" ? "Disponible" : "Available today"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoSessionMockup({ lang }: { lang: "en" | "fr" }) {
  return (
    <div className="bg-ink rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="grid grid-cols-2 gap-1.5 p-2.5">
        {[{ init: "C", color: "#3d3330" }, { init: "Y", color: "#2a1f0d" }].map((tile) => (
          <div
            key={tile.init}
            className="rounded-lg aspect-video flex items-center justify-center"
            style={{ background: tile.color }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)" }}
            >
              {tile.init}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface mx-2.5 mb-2.5 rounded-lg p-3.5">
        <p className="text-xs font-semibold text-ink mb-1.5">
          {lang === "fr" ? "Notes de séance" : "Session notes"}
        </p>
        <p className="text-xs text-muted leading-relaxed">
          {lang === "fr"
            ? "Présent — conjugaison régulière · Son /r/"
            : "Present tense — regular verbs · The /r/ sound"}
        </p>
      </div>
    </div>
  );
}

// ── FAQ accordion item ───────────────────────────────────────────────────────

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-base font-medium text-ink">{q}</span>
        <IconChevronDown open={open} />
      </button>
      <div
        style={{
          maxHeight: open ? "400px" : "0",
          overflow: "hidden",
          transition: "max-height 280ms ease",
        }}
      >
        <p className="text-base text-muted leading-relaxed pb-5 pr-6">{a}</p>
      </div>
    </div>
  );
}

// ── Language display ─────────────────────────────────────────────────────────

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

// ── Interfaces ───────────────────────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

export default function LandingPage({
  languages,
  tutorCount,
  studentCount,
  avgRating,
  reviewCount,
  reviews,
}: Props) {
  const { lang, setLang } = useLanguage();
  const t = T[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Suppress unused-vars warnings — still referenced in trust row and footer
  void studentCount;

  const hasRating = avgRating !== null && reviewCount > 0;
  const showTrustRow = tutorCount >= 3 || reviewCount >= 10;

  const footerHrefs: Record<string, Record<number, string>> = {
    "0": { 0: "/find-tutors", 1: "#how-it-works", 2: "/auth/register", 3: "/onboarding" },
    "1": { 0: "/tutors/apply", 1: "/tutors/requirements" },
    "2": { 0: "/about", 1: "/contact", 2: "/legal/privacy", 3: "/legal/cgu" },
  };

  // ── Pricing plans ──────────────────────────────────────────────────────────

  const plans = [
    {
      key: "discovery",
      name:    lang === "fr" ? "Découverte"  : "Discovery",
      price:   "25",
      period:  lang === "fr" ? "/ séance"    : "/ lesson",
      desc:    lang === "fr" ? "1 séance d'essai, sans engagement" : "1 trial lesson, no commitment",
      features: lang === "fr"
        ? ["Séance 30 min", "Tuteur au choix", "Sans abonnement"]
        : ["30-min session", "Any available tutor", "No subscription"],
      highlight: false,
    },
    {
      key: "regular",
      name:    lang === "fr" ? "Régulier"    : "Regular",
      price:   "35",
      period:  lang === "fr" ? "/ séance"    : "/ lesson",
      desc:    lang === "fr" ? "4 séances/mois avec votre tuteur" : "4 sessions/month, same tutor",
      features: lang === "fr"
        ? ["Séance 60 min", "Tuteur dédié", "Matériel inclus", "Suivi de progression"]
        : ["60-min session", "Dedicated tutor", "Materials included", "Progress tracking"],
      highlight: true,
    },
    {
      key: "intensive",
      name:    lang === "fr" ? "Intensif"    : "Intensive",
      price:   "30",
      period:  lang === "fr" ? "/ séance"    : "/ lesson",
      desc:    lang === "fr" ? "8 séances/mois — tarif dégressif" : "8 sessions/month — volume rate",
      features: lang === "fr"
        ? ["Séance 60 min", "Tuteur dédié", "Matériel inclus", "Suivi de progression", "Priorité de réservation"]
        : ["60-min session", "Dedicated tutor", "Materials included", "Progress tracking", "Priority booking"],
      highlight: false,
    },
  ];

  // ── FAQ ────────────────────────────────────────────────────────────────────

  const faqs =
    lang === "fr"
      ? [
          { q: "Comment est évalué mon niveau ?", a: "À l'inscription, nous vous proposons un court test de placement. En quelques minutes, notre système estime votre niveau (A1–C2) et vous suggère des tuteurs adaptés." },
          { q: "Puis-je annuler ou reporter une séance ?", a: "Oui, jusqu'à 24 heures avant le début de la séance, sans frais. Au-delà, des frais d'annulation peuvent s'appliquer." },
          { q: "Quand puis-je réserver des séances ?", a: "Les créneaux sont disponibles 7j/7, de 7h à 22h (heure de Paris). Vous réservez directement dans le calendrier du tuteur." },
          { q: "Puis-je changer de tuteur ?", a: "Bien sûr. Si votre tuteur actuel ne vous convient pas, vous pouvez en choisir un autre à tout moment, sans justification ni frais supplémentaires." },
          { q: "Quels modes de paiement sont acceptés ?", a: "Nous acceptons les cartes Visa, Mastercard et American Express, ainsi que PayPal. Tous les paiements sont sécurisés via Stripe." },
          { q: "Ai-je besoin d'un équipement spécial ?", a: "Non. Une connexion internet stable, un ordinateur ou tablette, et un micro suffisent. Les séances ont lieu dans notre salle de classe intégrée — aucun logiciel à télécharger." },
        ]
      : [
          { q: "How is my level assessed?", a: "At signup we offer a short placement test. In a few minutes our system estimates your level (A1–C2) and suggests tutors who match your needs." },
          { q: "Can I cancel or reschedule a lesson?", a: "Yes — up to 24 hours before the lesson at no charge. Cancellations inside 24 hours may incur a fee." },
          { q: "When can I book sessions?", a: "Slots are available 7 days a week, 7am–10pm (Paris time). You book directly in your tutor's calendar." },
          { q: "Can I switch tutors?", a: "Absolutely. If your current tutor isn't the right fit, you can switch at any time — no questions asked, no extra cost." },
          { q: "What payment methods are accepted?", a: "We accept Visa, Mastercard and American Express cards, as well as PayPal. All payments are secured via Stripe." },
          { q: "Do I need special equipment?", a: "No. A stable internet connection, a computer or tablet, and a microphone are all you need. Sessions run in our built-in classroom — nothing to install." },
        ];

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-bg overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md"
        style={{ borderBottom: scrolled ? "1px solid var(--color-border)" : "1px solid transparent", transition: "border-color 200ms ease" }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">

          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0">
              <span className="font-serif text-[1.35rem] font-normal tracking-tight text-ink">
                With<em>You</em>
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
              <a href="#how-it-works" className="hover:text-ink transition-colors">{t.nav.howItWorks}</a>
              <a href="#tutors"        className="hover:text-ink transition-colors">{lang === "fr" ? "Tuteurs" : "Tutors"}</a>
              <a href="#pricing"       className="hover:text-ink transition-colors">{lang === "fr" ? "Tarifs" : "Pricing"}</a>
              <Link href="/tutors/apply" className="hover:text-ink transition-colors">{t.nav.becomeTutor}</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs font-semibold text-muted hover:text-ink transition-colors"
              aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <Link
              href="/auth/login"
              className="hidden sm:block text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/auth/register"
              className="h-9 px-5 rounded-full bg-ink text-white text-sm font-medium hover:opacity-85 transition-opacity flex items-center"
            >
              {lang === "fr" ? "Commencer" : "Get started"}
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden text-ink"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ────────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-bg flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <span className="font-serif text-[1.35rem] font-normal text-ink">With<em>You</em></span>
            <button onClick={() => setMenuOpen(false)} className="text-muted hover:text-ink" aria-label="Close menu">
              <IconX />
            </button>
          </div>
          <nav className="flex flex-col">
            {[
              { href: "#how-it-works", label: t.nav.howItWorks },
              { href: "#tutors",       label: lang === "fr" ? "Tuteurs"  : "Tutors" },
              { href: "#pricing",      label: lang === "fr" ? "Tarifs"   : "Pricing" },
              { href: "/tutors/apply", label: t.nav.becomeTutor },
              { href: "/auth/login",   label: t.nav.login },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-lg font-medium text-ink hover:text-accent transition-colors py-4 border-b border-border"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
            <Link
              href="/auth/register"
              onClick={() => setMenuOpen(false)}
              className="block w-full bg-ink text-white py-4 rounded-full font-medium text-base text-center hover:opacity-85 transition-opacity"
            >
              {lang === "fr" ? "Commencer gratuitement" : "Get started free"}
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — copy */}
          <div>
            <AnimateIn delay={0}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-5">
                {lang === "fr" ? "Cours 1-sur-1 en direct" : "Live 1-on-1 language lessons"}
              </p>
            </AnimateIn>

            <AnimateIn delay={60}>
              <h1 className="font-serif text-[2.6rem] sm:text-5xl lg:text-[3.2rem] leading-[1.1] font-normal text-ink mb-6">
                {lang === "fr" ? (
                  <>Parlez avec <em>assurance</em>,<br />guidé par le bon tuteur</>
                ) : (
                  <>Speak with <em>confidence</em>,<br />guided by the right tutor</>
                )}
              </h1>
            </AnimateIn>

            <AnimateIn delay={120}>
              <p className="text-lg text-muted leading-relaxed mb-8 max-w-md">
                {lang === "fr"
                  ? "Cours particuliers en direct avec des tuteurs experts vérifiés. Votre rythme, vos objectifs, vos progrès."
                  : "Live 1-on-1 lessons with verified expert tutors. Your pace, your goals, your progress."}
              </p>
            </AnimateIn>

            <AnimateIn delay={180}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
                <Link
                  href="/auth/register"
                  className="h-12 px-7 rounded-full bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  {lang === "fr" ? "Réserver un cours d'essai gratuit" : "Book a free trial lesson"}
                </Link>
                <Link
                  href="/find-tutors"
                  className="text-sm font-medium text-ink hover:text-accent transition-colors inline-flex items-center gap-1.5"
                >
                  {lang === "fr" ? "Voir les tuteurs" : "Browse tutors"} <IconArrowRight />
                </Link>
              </div>
            </AnimateIn>

            {/* Trust row — only rendered when there is real data */}
            {showTrustRow && (
              <AnimateIn delay={240}>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {(["#D4C5B0", "#B8A898", "#C9B89A", "#A8957E"] as string[])
                      .slice(0, Math.min(tutorCount, 4))
                      .map((c, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-full border-2 border-bg"
                          style={{ background: c }}
                        />
                      ))}
                  </div>
                  <div>
                    {hasRating && (
                      <p
                        className="text-sm font-medium text-ink"
                        aria-label={`Rated ${avgRating!.toFixed(1)} out of 5`}
                      >
                        ★ {avgRating!.toFixed(1)}
                        {reviewCount >= 20
                          ? ` · ${reviewCount}+ ${lang === "fr" ? "séances" : "lessons"}`
                          : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      {lang === "fr" ? "Tuteurs vérifiés" : "Verified tutors"}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            )}
          </div>

          {/* Right — portrait image + one floating card */}
          <AnimateIn delay={80} className="relative">
            <div className="relative h-[460px] lg:h-[580px] rounded-xl overflow-hidden">
              <Image
                src="/hero-tutor.webp"
                alt={
                  lang === "fr"
                    ? "Tutrice en session de cours en direct, lumière naturelle"
                    : "Tutor in a live language session, natural window light"
                }
                fill
                priority
                quality={90}
                className="object-cover object-[50%_20%]"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
            </div>
            {/* One discreet floating card */}
            <div
              className="absolute bottom-6 left-4 bg-surface/96 backdrop-blur-sm border border-border rounded-xl px-4 py-3"
              style={{ boxShadow: "var(--shadow-card)" }}
              aria-hidden="true"
            >
              <p className="text-sm font-medium text-ink">Yasmine B.</p>
              <p className="text-xs text-muted mt-0.5">
                {lang === "fr" ? "Tutrice de français · ★ 4.9" : "French tutor · ★ 4.9"}
              </p>
            </div>
          </AnimateIn>

        </div>
      </section>

      {/* ── Credibility strip ───────────────────────────────────────────────── */}
      <section className="border-y border-border py-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted text-center mb-8">
            {lang === "fr" ? "Tuteurs certifiés par" : "Tutors certified by"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            {["CELTA", "DELF / DALF", "TOEFL", "IELTS"].map((cert) => (
              <span key={cert} className="text-base font-semibold tracking-tight" style={{ color: "rgba(107,101,96,.35)" }}>
                {cert}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">

          <AnimateIn className="text-center mb-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-4">{t.how.label}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink">
              {lang === "fr"
                ? <>De votre niveau actuel à la <em>fluidité</em> en 3 étapes</>
                : <>From where you are now to <em>fluency</em>, in 3 steps</>}
            </h2>
          </AnimateIn>

          <div className="space-y-24">
            {[
              {
                num: "01",
                title:   lang === "fr" ? "Découvrez votre niveau"         : "Discover your level",
                desc:    lang === "fr"
                  ? "Quelques questions suffisent. Notre test de placement estime votre niveau en quelques minutes et vous oriente vers les tuteurs les plus adaptés."
                  : "A few questions is all it takes. Our placement test estimates your level in minutes and points you toward the most suitable tutors.",
                mockup:  <PlacementTestMockup lang={lang} />,
                reverse: false,
              },
              {
                num: "02",
                title:   lang === "fr" ? "Trouvez votre tuteur idéal"     : "Find your ideal tutor",
                desc:    lang === "fr"
                  ? "Selon votre niveau, vos objectifs et vos disponibilités — explorez des tuteurs vérifiés qui correspondent vraiment à vos besoins."
                  : "Based on your level, goals and schedule — browse verified tutors who genuinely match what you're looking for.",
                mockup:  <TutorMatchMockup lang={lang} />,
                reverse: true,
              },
              {
                num: "03",
                title:   lang === "fr" ? "Commencez à progresser"         : "Start making progress",
                desc:    lang === "fr"
                  ? "Une séance en direct, personnalisée, à votre rythme. Les notes de chaque cours restent accessibles pour que vous puissiez réviser entre les séances."
                  : "A live, personalized session at your own pace. Notes from every lesson stay available so you can review between sessions.",
                mockup:  <VideoSessionMockup lang={lang} />,
                reverse: false,
              },
            ].map((step) => (
              <AnimateIn key={step.num}>
                <div
                  className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${step.reverse ? "lg:[direction:rtl]" : ""}`}
                >
                  <div className={step.reverse ? "lg:[direction:ltr]" : ""}>
                    <p className="font-serif text-6xl font-normal text-border mb-5 leading-none">{step.num}</p>
                    <h3 className="font-serif text-2xl font-normal text-ink mb-4">{step.title}</h3>
                    <p className="text-base text-muted leading-relaxed max-w-sm">{step.desc}</p>
                  </div>
                  <div className={step.reverse ? "lg:[direction:ltr]" : ""}>{step.mockup}</div>
                </div>
              </AnimateIn>
            ))}
          </div>

        </div>
      </section>

      {/* ── Featured tutors ─────────────────────────────────────────────────── */}
      <section id="tutors" className="py-20 lg:py-28 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">

          <AnimateIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-3">
                {lang === "fr" ? "Nos tuteurs" : "Our tutors"}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink">
                {lang === "fr"
                  ? <>Rencontrez vos <em>futurs</em> tuteurs</>
                  : <>Meet your <em>future</em> tutors</>}
              </h2>
            </div>
            <Link
              href="/find-tutors"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              {lang === "fr" ? "Voir tous les tuteurs" : "See all tutors"} <IconArrowRight />
            </Link>
          </AnimateIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TUTORS.map((tutor, i) => (
              <AnimateIn key={tutor.id} delay={i * 60}>
                <div className="group border border-border rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 cursor-default" style={{ background: "#FAF7F2" }}>
                  {/* Portrait placeholder */}
                  <div
                    className="relative h-52 flex items-center justify-center overflow-hidden"
                    style={{ background: tutor.avatarBg }}
                  >
                    <span className="font-serif text-5xl font-normal" style={{ color: "rgba(255,255,255,.5)" }}>
                      {tutor.name[0]}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-ink">{tutor.name}</p>
                      <span className="text-xs text-muted">★ {tutor.rating}</span>
                    </div>
                    <p className="text-xs text-muted mb-1">
                      {tutor.flag} {lang === "fr" ? tutor.langsFr : tutor.langsEn}
                    </p>
                    <p className="text-xs mb-3" style={{ color: "rgba(107,101,96,.6)" }}>
                      {lang === "fr" ? tutor.specialtyFr : tutor.specialtyEn}
                    </p>
                    <p className="text-xs text-muted border-t border-border pt-3">
                      {lang === "fr" ? "Cours découverte · 30 min" : "Trial lesson · 30 min"}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              href="/find-tutors"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-accent transition-colors"
            >
              {lang === "fr" ? "Voir tous les tuteurs" : "See all tutors"} <IconArrowRight />
            </Link>
          </div>

        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">

            <AnimateIn className="text-center mb-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-4">
                {lang === "fr" ? "Témoignages" : "Testimonials"}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink">
                {lang === "fr"
                  ? <>Ce que disent nos <em>apprenants</em></>
                  : <>What our <em>learners</em> say</>}
              </h2>
            </AnimateIn>

            {/* Featured quote */}
            <AnimateIn className="mb-8">
              <div
                className="border border-border rounded-xl p-8 sm:p-12"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="sm:grid sm:grid-cols-[1fr_auto] gap-8 items-start">
                  <div>
                    <blockquote className="font-serif text-2xl sm:text-[1.7rem] font-normal text-ink leading-relaxed mb-6">
                      "{reviews[0].text}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-ink flex-shrink-0"
                        style={{ background: "#E7E1D8" }}
                      >
                        {reviews[0].name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{reviews[0].name}</p>
                        <p className="text-xs text-muted">
                          {LANG_DISPLAY[reviews[0].learningLang]?.[lang] ?? reviews[0].learningLang}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <span className="inline-block px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted whitespace-nowrap">
                      {lang === "fr" ? "A2 → B2 en 4 mois" : "A2 → B2 in 4 months"}
                    </span>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Smaller cards */}
            {reviews.length > 1 && (
              <div className="grid sm:grid-cols-3 gap-5">
                {reviews.slice(1).map((item, idx) => (
                  <AnimateIn key={idx} delay={idx * 60}>
                    <div className="border border-border rounded-xl p-6 flex flex-col gap-4 h-full">
                      <p className="text-xs text-muted">★ {item.rating.toFixed(1)}</p>
                      <p className="text-sm text-ink leading-relaxed flex-1">"{item.text}"</p>
                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-ink flex-shrink-0"
                          style={{ background: "#E7E1D8" }}
                        >
                          {item.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{item.name}</p>
                          <p className="text-xs text-muted">
                            {LANG_DISPLAY[item.learningLang]?.[lang] ?? item.learningLang}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">

          <AnimateIn className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-4">
              {lang === "fr" ? "Tarifs" : "Pricing"}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink mb-3">
              {lang === "fr"
                ? <>Choisissez votre <em>formule</em></>
                : <>Choose your <em>plan</em></>}
            </h2>
            <p className="text-sm text-muted">
              {lang === "fr"
                ? "Essai découverte 30 min gratuit, sans engagement."
                : "Free 30-min trial lesson, no commitment."}
            </p>
          </AnimateIn>

          <div className="grid sm:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <AnimateIn key={plan.key} delay={i * 60}>
                <div
                  className="rounded-xl p-7 border flex flex-col h-full"
                  style={{
                    borderColor: plan.highlight ? "var(--color-accent)" : "var(--color-border)",
                    boxShadow:   plan.highlight ? "0 0 0 1px var(--color-accent)" : undefined,
                    background:  plan.highlight ? "var(--color-surface)" : "var(--color-bg)",
                  }}
                >
                  {plan.highlight && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-4">
                      {lang === "fr" ? "Le plus populaire" : "Most popular"}
                    </p>
                  )}
                  <p className="font-serif text-xl font-normal text-ink mb-1">{plan.name}</p>
                  <p className="text-xs text-muted mb-6">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="font-serif text-3xl font-normal text-ink">${plan.price}</span>
                    <span className="text-sm text-muted">{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                        <span className="text-accent flex-shrink-0"><IconCheck /></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/register"
                    className="h-11 rounded-full flex items-center justify-center text-sm font-medium transition-opacity hover:opacity-85"
                    style={{
                      background: plan.highlight ? "var(--color-accent)" : "var(--color-ink)",
                      color: "#fff",
                    }}
                  >
                    {lang === "fr" ? "Commencer" : "Get started"}
                  </Link>
                </div>
              </AnimateIn>
            ))}
          </div>

        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">

          <AnimateIn className="text-center mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted mb-4">FAQ</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink">
              {lang === "fr"
                ? <>Questions <em>fréquentes</em></>
                : <>Frequently asked <em>questions</em></>}
            </h2>
          </AnimateIn>

          <div className="border-t border-border">
            {faqs.map((item, i) => (
              <FAQItem
                key={i}
                q={item.q}
                a={item.a}
                open={faqOpen === i}
                onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-surface border-t border-border">
        <div className="max-w-xl mx-auto px-5 sm:px-6 text-center">
          <AnimateIn>
            <h2 className="font-serif text-[2.1rem] sm:text-5xl font-normal text-ink leading-tight mb-5">
              {lang === "fr"
                ? <>Votre premier cours<br />est <em>offert</em></>
                : <>Your first lesson<br />is on <em>us</em></>}
            </h2>
            <p className="text-base text-muted leading-relaxed mb-8 max-w-sm mx-auto">
              {lang === "fr"
                ? "Commencez avec une séance découverte de 30 min sans engagement avec un tuteur dédié."
                : "Start with a free 30-min discovery session, no commitment, with a dedicated tutor."}
            </p>
            <Link
              href="/auth/register"
              className="inline-flex h-12 px-8 rounded-full bg-accent text-white font-semibold text-sm items-center hover:opacity-90 transition-opacity mb-8"
            >
              {lang === "fr" ? "Réserver ma séance gratuite" : "Book my free session"}
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                lang === "fr" ? "Sans engagement"    : "No commitment",
                lang === "fr" ? "Tuteurs vérifiés"   : "Verified tutors",
                lang === "fr" ? "Séance 30 min"      : "30-min session",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="text-accent"><IconCheck /></span>
                  {item}
                </span>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-ink text-white/60 py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-14 pb-14 border-b border-white/10">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <p className="font-serif text-xl font-normal text-white mb-3">With<em>You</em></p>
              <p className="text-sm leading-relaxed text-white/40">{t.footer.tagline}</p>
            </div>

            {/* Link columns */}
            {t.footer.cols.map((col, colIdx) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-4">{col.title}</p>
                <div className="flex flex-col gap-2.5">
                  {col.links.map((l, linkIdx) => (
                    <Link
                      key={l}
                      href={footerHrefs[String(colIdx)]?.[linkIdx] ?? "#"}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} WithYou. {t.footer.rights}</p>
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              {lang === "fr" ? "English" : "Français"}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
