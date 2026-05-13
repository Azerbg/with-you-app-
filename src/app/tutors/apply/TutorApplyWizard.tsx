"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  fullName:  string;
  email:     string;
  password:  string;
  phone:     string;
  city:      string;
  // Step 2
  languagesTaught: string[];
  specializations: string[];
  yearsExperience: number;
  certifications:  string[];
  // Step 3
  bio:      string;
  videoUrl: string;
  // Step 4
  availabilityDays:     string[];
  timeWindowPreference: string[];
}

const TOTAL_STEPS = 5;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";
const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition";
const btnSecondary = "border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition";
const activeCard = "border-[#F5C400] bg-[#FFF3B0]";
const inactiveCard = "border-[#6B5E44]/20 hover:border-[#F5C400]/50";

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const { lang } = useLanguage();
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs text-[#6B5E44] mb-2">
        <span>{lang === "fr" ? "Étape" : "Step"} {step} {lang === "fr" ? "sur" : "of"} {TOTAL_STEPS}</span>
        <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="w-full bg-[#FAF8F0] rounded-full h-2">
        <div className="bg-[#F5C400] h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function StepPersonal({ data, onChange, onNext }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const [showPass, setShowPass] = useState(false);

  const cities = ["Tunis", "Sfax", "Sousse", "Bizerte", "Gabès", fr ? "Autre" : "Other"];
  const isValid = data.fullName && data.email && data.password.length >= 10 && data.phone && data.city;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Informations personnelles" : "Personal Information"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Dites-nous qui vous êtes." : "Tell us who you are."}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
            {fr ? "Nom complet" : "Full name"}
          </label>
          <input value={data.fullName} onChange={e => onChange("fullName", e.target.value)}
            placeholder={fr ? "Prénom Nom" : "First Last"}
            className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-1">E-mail</label>
          <input type="email" value={data.email} onChange={e => onChange("email", e.target.value)}
            placeholder="vous@exemple.com" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
            {fr ? "Mot de passe" : "Password"}
          </label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={data.password}
              onChange={e => onChange("password", e.target.value)}
              placeholder={fr ? "Min. 10 caractères" : "Min. 10 characters"}
              className={inputCls + " pr-10"} />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E44] text-xs font-semibold">
              {showPass ? (fr ? "Masquer" : "Hide") : (fr ? "Afficher" : "Show")}
            </button>
          </div>
          <p className="text-xs text-[#6B5E44] mt-1">
            {fr ? "Min. 10 caractères" : "Min. 10 characters"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
              {fr ? "Téléphone" : "Phone"}
            </label>
            <input value={data.phone} onChange={e => onChange("phone", e.target.value)}
              placeholder="+216 XX XXX XXX" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5C3D00] mb-1">Ville</label>
            <select value={data.city} onChange={e => onChange("city", e.target.value)} className={inputCls}>
              <option value="">{fr ? "Sélectionner…" : "Select…"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button onClick={onNext} disabled={!isValid} className={`w-full py-2.5 mt-6 ${btnPrimary}`}>
        {fr ? "Continuer" : "Continue"}
      </button>
    </div>
  );
}

// ─── Step 2: Teaching Info ────────────────────────────────────────────────────

function StepTeaching({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string[] | number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  function toggle(field: "languagesTaught" | "specializations" | "certifications", val: string) {
    const cur = data[field] as string[];
    onChange(field, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  }

  const langs = ["French", "English"];
  const specs = [
    { val: "CONVERSATIONAL", label: fr ? "Conversationnel" : "Conversational" },
    { val: "PROFESSIONAL",   label: fr ? "Professionnel"   : "Professional" },
    { val: "ACADEMIC",       label: fr ? "Académique"       : "Academic" },
    { val: "EXAM_PREP",      label: fr ? "Prépa examens"    : "Exam Prep" },
  ];
  const certs = [
    { val: "CELTA",             label: "CELTA" },
    { val: "DALF",              label: "DALF / DELF" },
    { val: "TESOL",             label: "TESOL / TEFL" },
    { val: "UNIVERSITY_DEGREE", label: fr ? "Diplôme universitaire" : "University Degree" },
    { val: "OTHER",             label: fr ? "Autre" : "Other" },
  ];

  const isValid = data.languagesTaught.length > 0 && data.specializations.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Votre profil d'enseignant" : "Your Teaching Profile"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Dites-nous ce que vous enseignez." : "Tell us what you teach."}
      </p>

      {/* Languages */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Langues enseignées" : "Languages you teach"}
        </label>
        <div className="flex gap-3">
          {langs.map(l => (
            <button key={l} type="button" onClick={() => toggle("languagesTaught", l)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition ${
                data.languagesTaught.includes(l) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {l === "French" ? "Français" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Specializations */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Spécialisations" : "Specializations"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {specs.map(s => (
            <button key={s.val} type="button" onClick={() => toggle("specializations", s.val)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition ${
                data.specializations.includes(s.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Années d'expérience" : "Years of experience"}
        </label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 5, 7, 10].map(n => (
            <button key={n} type="button" onClick={() => onChange("yearsExperience", n)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.yearsExperience === n ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {n === 10 ? "10+" : n === 0 ? (fr ? "Moins d'1 an" : "<1 yr") : `${n}`}
            </button>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Certifications (optionnel)" : "Certifications (optional)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {certs.map(c => (
            <button key={c.val} type="button" onClick={() => toggle("certifications", c.val)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.certifications.includes(c.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: About You ────────────────────────────────────────────────────────

function StepAbout({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const isValid = data.bio.length >= 100;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Parlez-nous de vous" : "About You"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr
          ? "Votre biographie et votre vidéo d'introduction aident les apprenants à vous choisir."
          : "Your bio and intro video help learners choose you."}
      </p>

      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Biographie" : "Bio"}{" "}
          <span className="font-normal text-[#6B5E44]">({fr ? "min. 100 caractères" : "min. 100 chars"})</span>
        </label>
        <textarea
          value={data.bio}
          onChange={e => onChange("bio", e.target.value)}
          rows={6}
          placeholder={fr
            ? "Décrivez votre parcours, votre méthode d'enseignement et ce qui vous rend unique…"
            : "Describe your background, teaching style, and what makes you unique…"}
          className={inputCls + " resize-none"}
        />
        <p className={`text-xs mt-1 ${data.bio.length < 100 ? "text-red-400" : "text-green-600"}`}>
          {data.bio.length} / 100 {fr ? "caractères minimum" : "characters minimum"}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Lien vidéo d'introduction (optionnel)" : "Intro video link (optional)"}
        </label>
        <input
          value={data.videoUrl}
          onChange={e => onChange("videoUrl", e.target.value)}
          placeholder="https://youtube.com/... ou https://loom.com/..."
          className={inputCls}
        />
        <p className="text-xs text-[#6B5E44] mt-1">
          {fr
            ? "YouTube ou Loom · 60–90 secondes · Présentez-vous en tant qu'enseignant"
            : "YouTube or Loom · 60–90 seconds · Introduce yourself as a teacher"}
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Availability ─────────────────────────────────────────────────────

function StepAvailability({ data, onChange, onNext, onBack }: {
  data: FormData;
  onChange: (k: keyof FormData, v: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const dayLabels: Record<string, string> = fr
    ? { MON: "Lun", TUE: "Mar", WED: "Mer", THU: "Jeu", FRI: "Ven", SAT: "Sam", SUN: "Dim" }
    : { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };

  const windows = fr
    ? [{ val: "MORNING", label: "Matin", time: "6h–12h" }, { val: "AFTERNOON", label: "Après-midi", time: "12h–18h" }, { val: "EVENING", label: "Soir", time: "18h–23h" }]
    : [{ val: "MORNING", label: "Morning", time: "6 AM–12 PM" }, { val: "AFTERNOON", label: "Afternoon", time: "12–6 PM" }, { val: "EVENING", label: "Evening", time: "6–11 PM" }];

  function toggleDay(d: string) {
    const cur = data.availabilityDays;
    onChange("availabilityDays", cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  }

  function toggleWindow(w: string) {
    const cur = data.timeWindowPreference;
    onChange("timeWindowPreference", cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w]);
  }

  const isValid = data.availabilityDays.length > 0 && data.timeWindowPreference.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Vos disponibilités" : "Your Availability"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr
          ? "Indiquez quand vous êtes disponible pour donner des cours."
          : "Let us know when you're available to teach."}
      </p>

      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Jours disponibles" : "Available days"}
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(d => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.availabilityDays.includes(d) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              {dayLabels[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">
          {fr ? "Créneaux horaires (heure de Tunis)" : "Time windows (Tunisia time)"}
        </label>
        <div className="flex gap-3">
          {windows.map(w => (
            <button key={w.val} type="button" onClick={() => toggleWindow(w.val)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 text-sm transition ${
                data.timeWindowPreference.includes(w.val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}>
              <span className="font-bold">{w.label}</span>
              <span className="text-xs mt-0.5 text-[#6B5E44]">{w.time}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {fr ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Review & Submit ───────────────────────────────────────────────────

function StepReview({ data, onSubmit, onBack, submitting, error }: {
  data: FormData;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-[#6B5E44]/10 text-sm">
      <span className="text-[#6B5E44]">{label}</span>
      <span className="text-[#5C3D00] font-semibold text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">
        {fr ? "Vérifiez votre candidature" : "Review your application"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr ? "Tout est correct ? Soumettez votre dossier." : "Everything looks good? Submit your application."}
      </p>

      <div className="bg-[#FFFDF4] border border-[#F5C400]/30 rounded-xl p-4 mb-5">
        <Row label={fr ? "Nom" : "Name"} value={data.fullName} />
        <Row label="E-mail" value={data.email} />
        <Row label={fr ? "Téléphone" : "Phone"} value={data.phone} />
        <Row label="Ville" value={data.city} />
        <Row label={fr ? "Langues enseignées" : "Languages"} value={data.languagesTaught.join(", ")} />
        <Row label={fr ? "Spécialisations" : "Specializations"} value={data.specializations.join(", ")} />
        <Row label={fr ? "Expérience" : "Experience"} value={`${data.yearsExperience} ${fr ? "ans" : "yrs"}`} />
        <Row label={fr ? "Certifications" : "Certifications"} value={data.certifications.join(", ")} />
        <Row label={fr ? "Jours dispo." : "Avail. days"} value={data.availabilityDays.join(", ")} />
        <Row label={fr ? "Créneaux" : "Windows"} value={data.timeWindowPreference.join(", ")} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={submitting} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={onSubmit} disabled={submitting} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {submitting
            ? (fr ? "Envoi en cours…" : "Submitting…")
            : (fr ? "Soumettre ma candidature" : "Submit application")}
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const router = useRouter();

  return (
    <div className="text-center py-4">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">
        {fr ? "Candidature envoyée !" : "Application submitted!"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr
          ? "Notre équipe RH examinera votre dossier et vous contactera dans 3 à 5 jours ouvrables."
          : "Our HR team will review your application and contact you within 3–5 business days."}
      </p>
      <button onClick={() => router.push("/")} className={`px-8 py-2.5 ${btnPrimary}`}>
        {fr ? "Retour à l'accueil" : "Back to home"}
      </button>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function TutorApplyWizard() {
  const { lang, setLang } = useLanguage();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<FormData>({
    fullName: "", email: "", password: "", phone: "", city: "",
    languagesTaught: [], specializations: [], yearsExperience: 0, certifications: [],
    bio: "", videoUrl: "",
    availabilityDays: [], timeWindowPreference: [],
  });

  function update(key: keyof FormData, value: string | string[] | number) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tutors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "email_taken") {
          setError(lang === "fr" ? "Cette adresse e-mail est déjà utilisée." : "This email is already in use.");
        } else {
          setError(lang === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "Something went wrong. Please try again.");
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(lang === "fr" ? "Erreur réseau. Veuillez réessayer." : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto" /></Link>
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#6B5E44]/20 text-xs font-bold text-[#5C3D00] hover:bg-[#FFF3B0] hover:border-[#F5C400] transition">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>

        <div className="mb-5" />

        {submitted ? (
          <SuccessScreen />
        ) : (
          <>
            <ProgressBar step={step} />
            {step === 1 && <StepPersonal data={data} onChange={(k, v) => update(k, v as string)} onNext={next} />}
            {step === 2 && <StepTeaching data={data} onChange={(k, v) => update(k, v as string[] | number)} onNext={next} onBack={back} />}
            {step === 3 && <StepAbout data={data} onChange={(k, v) => update(k, v as string)} onNext={next} onBack={back} />}
            {step === 4 && <StepAvailability data={data} onChange={(k, v) => update(k, v as string[])} onNext={next} onBack={back} />}
            {step === 5 && <StepReview data={data} onSubmit={handleSubmit} onBack={back} submitting={submitting} error={error} />}
          </>
        )}
      </div>
    </div>
  );
}
