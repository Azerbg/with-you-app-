"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import { ProgramTier } from "@prisma/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  timezone: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningObjective: string;
  examTarget: string;                // Specific exam when learningObjective = EXAM_PREP
  selfReportedLevel: string;         // BEGINNER | INTERMEDIATE | ADVANCED
  availabilityDays: string[];
  timeWindowPreference: string[];
  sessionFrequency: string;
  programDuration: string;
  country: string;
  tutorLanguages: string[];
  budgetPerSession: number;
  preferredCurrency: string;
  programTier: ProgramTier | null;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TARGET_LANGUAGES = ["French", "English"];
const ALL_LANGUAGES = ["English", "French", "Arabic", "Spanish", "German", "Italian", "Portuguese", "Mandarin", "Japanese", "Korean"];
const TUTOR_LANGUAGES = ["English", "French", "Arabic", "Spanish", "Italian", "German", "Other"];
const TOTAL_STEPS = 10;

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";
const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition";
const btnSecondary = "border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition";
const activeCard = "border-[#F5C400] bg-[#FFF3B0]";
const inactiveCard = "border-[#6B5E44]/20 hover:border-[#F5C400]/50";

// ─── Quick placement test (3.4) ───────────────────────────────────────────────
const QUICK_QUESTIONS = [
  {
    q: { en: "What is the plural of 'child'?", fr: "Quel est le pluriel de 'child' ?" },
    options: ["childs", "children", "childes", "child"],
    correct: 1, level: "BEGINNER",
  },
  {
    q: { en: "Choose the correct sentence:", fr: "Choisissez la phrase correcte :" },
    options: ["She go to school every day.", "She goes to school every day.", "She going to school every day.", "She gone to school every day."],
    correct: 1, level: "BEGINNER",
  },
  {
    q: { en: "He had already _____ when I arrived.", fr: "Il avait déjà _____ quand je suis arrivé." },
    options: ["left", "leave", "leaving", "leaves"],
    correct: 0, level: "INTERMEDIATE",
  },
  {
    q: { en: "The report was _____ by the manager.", fr: "Le rapport a été _____ par le directeur." },
    options: ["write", "written", "wrote", "writing"],
    correct: 1, level: "INTERMEDIATE",
  },
  {
    q: { en: "_____ he worked hard, he failed the exam.", fr: "_____ il a travaillé dur, il a échoué à l'examen." },
    options: ["Because", "Although", "So", "Since"],
    correct: 1, level: "ADVANCED",
  },
];

function QuickTest({ onResult, onSkip, lang }: { onResult: (level: string) => void; onSkip: () => void; lang: string }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  function handleAnswer(i: number) {
    if (showFeedback) return;
    setSelected(i);
    const correct = i === QUICK_QUESTIONS[current].correct;
    if (correct) setScore((s) => s + 1);
    setShowFeedback(true);
    setTimeout(() => {
      if (current + 1 >= QUICK_QUESTIONS.length) {
        const total = score + (correct ? 1 : 0);
        const level = total <= 1 ? "BEGINNER" : total <= 3 ? "INTERMEDIATE" : "ADVANCED";
        onResult(level);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
        setShowFeedback(false);
      }
    }, 700);
  }

  const q = QUICK_QUESTIONS[current];
  return (
    <div>
      <h3 className="text-lg font-bold text-[#5C3D00] mb-1">
        {lang === "fr" ? "Test rapide" : "Quick test"} — {current + 1}/{QUICK_QUESTIONS.length}
      </h3>
      <div className="flex gap-1 mb-4">
        {QUICK_QUESTIONS.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < current ? "bg-[#F5C400]" : "bg-gray-100"}`} />
        ))}
      </div>
      <p className="text-sm text-[#5C3D00] font-medium mb-3 bg-[#FFF3B0] rounded-xl p-3 border border-[#F5C400]/30">
        {q.q[lang as "en" | "fr"] ?? q.q.en}
      </p>
      <div className="space-y-2 mb-4">
        {q.options.map((opt, i) => {
          let cls = `${inactiveCard} text-[#5C3D00]`;
          if (showFeedback) {
            if (i === q.correct) cls = "border-green-500 bg-green-50 text-green-800";
            else if (i === selected) cls = "border-red-400 bg-red-50 text-red-700";
          } else if (selected === i) cls = `${activeCard} text-[#5C3D00]`;
          return (
            <button key={i} onClick={() => handleAnswer(i)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition ${cls}`}>
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      <button onClick={onSkip} className="text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition">
        {lang === "fr" ? "Passer le test →" : "Skip test →"}
      </button>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding;
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs text-[#6B5E44] mb-2">
        <span>{t.step} {step} {t.of} {total}</span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="w-full bg-[#FAF8F0] rounded-full h-2">
        <div className="bg-[#F5C400] h-2 rounded-full transition-all duration-300" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Step 1: Native language ──────────────────────────────────────────────────
function StepNativeLanguage({ data, onChange, onNext }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void }) {
  const { lang } = useLanguage();
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">
        {lang === "fr" ? "Quelle est votre langue maternelle ?" : "What is your native language?"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {lang === "fr" ? "Cela nous aide à personnaliser votre expérience." : "This helps us personalise your experience."}
      </p>
      <select value={data.nativeLanguage} onChange={(e) => onChange("nativeLanguage", e.target.value)} className={`${inputCls} mb-6`}>
        <option value="">{lang === "fr" ? "Sélectionner…" : "Select…"}</option>
        {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <button onClick={onNext} disabled={!data.nativeLanguage} className={`w-full py-2.5 ${btnPrimary}`}>
        {lang === "fr" ? "Continuer" : "Continue"}
      </button>
    </div>
  );
}

// ─── Step 2: Target language ──────────────────────────────────────────────────
function StepTargetLanguage({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const same = data.nativeLanguage && data.targetLanguage && data.nativeLanguage === data.targetLanguage;
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">
        {lang === "fr" ? "Quelle langue voulez-vous apprendre ?" : "Which language do you want to learn?"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {lang === "fr" ? "Français & Anglais disponibles en Phase 1." : "French & English available in Phase 1."}
      </p>
      <div className="flex gap-4 mb-4">
        {TARGET_LANGUAGES.map((l) => (
          <button key={l} onClick={() => onChange("targetLanguage", l)}
            className={`flex-1 py-6 rounded-2xl border-2 text-lg font-bold transition ${data.targetLanguage === l ? activeCard : inactiveCard + " text-[#5C3D00]"}`}>
            {l === "French" ? "🇫🇷 Français" : "🇬🇧 English"}
          </button>
        ))}
      </div>
      {same && <p className="text-xs text-red-500 mb-4">{lang === "fr" ? "La langue maternelle et la langue cible ne peuvent pas être identiques." : "Native and target language can't be the same."}</p>}
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!data.targetLanguage || !!same} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 3: Objective ────────────────────────────────────────────────────────
function StepObjective({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.languages;
  const values = (t as unknown as { objectiveValues: string[] }).objectiveValues;
  const examTargets = (t as unknown as { examTargets: { value: string; label: string; desc: string }[] }).examTargets;
  const examLabel = (t as unknown as { examLabel: string }).examLabel;

  const isExamPrep = data.learningObjective === "EXAM_PREP";
  const canContinue = data.learningObjective && (!isExamPrep || !!data.examTarget);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Quel est votre objectif principal ?" : "What is your main goal?"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Choisissez ce qui vous correspond le mieux." : "Choose what fits you best."}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {t.objectives.map((o, i) => (
          <button key={i} type="button"
            onClick={() => {
              onChange("learningObjective", values[i]);
              if (values[i] !== "EXAM_PREP") onChange("examTarget", "");
            }}
            className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition ${data.learningObjective === values[i] ? activeCard : inactiveCard}`}>
            <span className="text-sm font-bold text-[#5C3D00]">{o.label}</span>
            <span className="text-xs text-[#6B5E44] mt-1">{o.desc}</span>
          </button>
        ))}
      </div>

      {/* Exam sub-selection — appears when EXAM_PREP is selected */}
      {isExamPrep && (
        <div className="mb-5 border border-[#F5C400]/50 rounded-2xl p-4 bg-[#FFFBEA]">
          <p className="text-sm font-semibold text-[#5C3D00] mb-3">{examLabel}</p>
          <div className="grid grid-cols-2 gap-2">
            {examTargets.map((e) => (
              <button key={e.value} type="button" onClick={() => onChange("examTarget", e.value)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition ${data.examTarget === e.value ? activeCard : inactiveCard}`}>
                <span className="text-sm font-bold text-[#5C3D00]">{e.label}</span>
                <span className="text-xs text-[#9B8A6B] mt-0.5 leading-tight">{e.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!canContinue} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 4: Level (grouped) + quick test (3.3 + 3.4) ────────────────────────
const LEVEL_GROUPS = [
  {
    value: "BEGINNER",
    icon: "🟢",
    label: { en: "Beginner", fr: "Débutant" },
    range: "A1–A2",
    desc: { en: "You're starting out or can use simple phrases in familiar situations.", fr: "Vous débutez ou pouvez utiliser des phrases simples dans des situations familières." },
  },
  {
    value: "INTERMEDIATE",
    icon: "🟡",
    label: { en: "Intermediate", fr: "Intermédiaire" },
    range: "B1–B2",
    desc: { en: "You can communicate on familiar topics and handle most situations.", fr: "Vous pouvez communiquer sur des sujets familiers et gérer la plupart des situations." },
  },
  {
    value: "ADVANCED",
    icon: "🔵",
    label: { en: "Advanced", fr: "Avancé" },
    range: "C1–C2",
    desc: { en: "You express yourself fluently and precisely in complex situations.", fr: "Vous vous exprimez avec fluidité et précision dans des situations complexes." },
  },
];

function StepLevel({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const [showTest, setShowTest] = useState(false);

  if (showTest) {
    return (
      <QuickTest
        lang={lang}
        onResult={(level) => { onChange("selfReportedLevel", level); setShowTest(false); }}
        onSkip={() => setShowTest(false)}
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Quel est votre niveau actuel ?" : "What is your current level?"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Estimez votre niveau — votre tuteur affinera cela lors de la 1ère séance." : "Estimate your level — your tutor will refine this in the first session."}</p>
      <div className="space-y-3 mb-4">
        {LEVEL_GROUPS.map((g) => (
          <button key={g.value} type="button" onClick={() => onChange("selfReportedLevel", g.value)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition ${data.selfReportedLevel === g.value ? activeCard : inactiveCard}`}>
            <span className="text-2xl mt-0.5">{g.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#5C3D00]">{g.label[lang as "en"|"fr"]}</span>
                <span className="text-xs text-[#9B8A6B] bg-white border border-[#E8DDD0] px-2 py-0.5 rounded-full">{g.range}</span>
              </div>
              <p className="text-xs text-[#6B5E44] mt-0.5">{g.desc[lang as "en"|"fr"]}</p>
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => setShowTest(true)} className="w-full text-sm text-[#C49200] hover:text-[#5C3D00] font-semibold py-2 border border-dashed border-[#F5C400]/50 rounded-xl mb-5 transition hover:bg-[#FFFBEA]">
        {lang === "fr" ? "Je ne connais pas mon niveau → Faire un test rapide" : "I don't know my level → Take a quick test"}
      </button>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!data.selfReportedLevel} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 5: Schedule (days + time windows) ───────────────────────────────────
function StepSchedule({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string | string[]) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.assessment;
  function toggleDay(d: string) { const c = data.availabilityDays; onChange("availabilityDays", c.includes(d) ? c.filter((x) => x !== d) : [...c, d]); }
  function toggleWindow(w: string) { const c = data.timeWindowPreference; onChange("timeWindowPreference", c.includes(w) ? c.filter((x) => x !== w) : [...c, w]); }
  const isValid = data.availabilityDays.length > 0 && data.timeWindowPreference.length > 0;
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Vos jours et créneaux préférés" : "Your preferred days and time slots"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Choisissez quand vous êtes disponible." : "Choose when you're available."}</p>
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.daysLabel}</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${data.availabilityDays.includes(d) ? activeCard : inactiveCard + " text-[#5C3D00]"}`}>
              {(t.dayLabels as Record<string, string>)[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.windowsLabel}</label>
        <div className="flex gap-3">
          {(["MORNING","AFTERNOON","EVENING"] as const).map((val, i) => (
            <button key={val} type="button" onClick={() => toggleWindow(val)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 text-sm transition ${data.timeWindowPreference.includes(val) ? activeCard : inactiveCard + " text-[#5C3D00]"}`}>
              <span className="font-bold">{t.windows[i].label}</span>
              <span className="text-xs mt-0.5 text-[#6B5E44]">{t.windows[i].time}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 6: Frequency + Program (without discounts) ─────────────────────────
function StepProgram({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.assessment;
  const freqValues = ["ONCE","TWICE","THREE_TIMES","INTENSIVE"];
  const progValues = ["PAY_PER_SESSION","ONE_MONTH","THREE_MONTHS","SIX_MONTHS"];
  const isValid = data.sessionFrequency && data.programDuration;
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Votre programme" : "Your program"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Choisissez votre rythme et votre engagement." : "Choose your pace and commitment."}</p>
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.freqLabel}</label>
        <div className="grid grid-cols-4 gap-2">
          {t.freqs.map((f, i) => (
            <button key={i} type="button" onClick={() => onChange("sessionFrequency", freqValues[i])}
              className={`py-2.5 rounded-xl border-2 text-sm font-bold transition flex flex-col items-center ${data.sessionFrequency === freqValues[i] ? activeCard : inactiveCard + " text-[#5C3D00]"}`}>
              <span>{f.label}</span>
              {f.note && <span className="text-xs font-normal text-[#6B5E44]">{f.note}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.programLabel}</label>
        <div className="grid grid-cols-2 gap-2">
          {t.programs.map((p, i) => (
            <button key={i} type="button" onClick={() => onChange("programDuration", progValues[i])}
              className={`py-3 px-3 rounded-xl border-2 text-left text-sm transition ${data.programDuration === progValues[i] ? activeCard : inactiveCard}`}>
              <span className="font-bold text-[#5C3D00] block">{p.label}</span>
              <span className="text-xs text-[#6B5E44]">{p.note}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 7: Country (3.8) ────────────────────────────────────────────────────
const COUNTRIES = ["Anywhere / N'importe où","Tunisia","France","Algeria","Morocco","Belgium","Switzerland","Canada","United States","Germany","United Kingdom","Italy","Spain","Portugal","Senegal","Ivory Coast","Other"];

function StepCountry({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const filtered = COUNTRIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Où souhaitez-vous apprendre ?" : "Where are you learning from?"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Cela nous aide à adapter le fuseau horaire et les recommandations." : "This helps us adapt timezone and recommendations."}</p>
      <input
        type="text"
        placeholder={lang === "fr" ? "Rechercher un pays…" : "Search a country…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputCls} mb-2`}
      />
      <div className="max-h-48 overflow-y-auto rounded-xl border border-[#D9CDBA] mb-6">
        {filtered.map((c) => (
          <button key={c} type="button" onClick={() => { onChange("country", c); setQuery(c); }}
            className={`w-full text-left px-4 py-2.5 text-sm transition border-b border-[#FAF8F0] last:border-0 ${data.country === c ? "bg-[#FFF3B0] font-semibold text-[#5C3D00]" : "hover:bg-[#FFFBEA] text-[#5C3D00]"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={!data.country} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 8: Tutor languages (3.9) ────────────────────────────────────────────
function StepTutorLanguages({ data, onChange, onNext, onBack }: { data: WizardData; onChange: (k: keyof WizardData, v: string[]) => void; onNext: () => void; onBack: () => void }) {
  const { lang } = useLanguage();
  function toggle(l: string) { const c = data.tutorLanguages; onChange("tutorLanguages", c.includes(l) ? c.filter((x) => x !== l) : [...c, l]); }
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Langue(s) souhaitée(s) pour votre tuteur" : "Preferred language(s) for your tutor"}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{lang === "fr" ? "Sélection multiple possible." : "Multiple selection possible."}</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {TUTOR_LANGUAGES.map((l) => (
          <button key={l} type="button" onClick={() => toggle(l)}
            className={`py-3 px-4 rounded-xl border-2 text-sm font-bold text-left transition ${data.tutorLanguages.includes(l) ? activeCard : inactiveCard + " text-[#5C3D00]"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={data.tutorLanguages.length === 0} className={`flex-1 py-2.5 ${btnPrimary}`}>{lang === "fr" ? "Continuer" : "Continue"}</button>
      </div>
    </div>
  );
}

// ─── Step 9: Budget slider (3.10) ─────────────────────────────────────────────
function StepBudget({ data, onChange, onNext, onBack, saving }: { data: WizardData; onChange: (k: keyof WizardData, v: number) => void; onNext: () => void; onBack: () => void; saving: boolean }) {
  const { lang } = useLanguage();
  const budget = data.budgetPerSession || 30;
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{lang === "fr" ? "Votre budget par séance" : "Your budget per session"}</h2>
      <p className="text-[#6B5E44] text-sm mb-8">{lang === "fr" ? "Glissez pour définir votre budget maximum." : "Slide to set your maximum budget."}</p>
      <div className="text-center mb-6">
        <span className="text-5xl font-bold text-[#5C3D00]">${budget}</span>
        <span className="text-[#6B5E44] text-lg ml-1">USD</span>
        <p className="text-xs text-[#9B8A6B] mt-1">{lang === "fr" ? "par séance" : "per session"}</p>
      </div>
      <input
        type="range"
        min={15}
        max={150}
        step={5}
        value={budget}
        onChange={(e) => onChange("budgetPerSession", parseInt(e.target.value))}
        className="w-full accent-[#F5C400] mb-2"
      />
      <div className="flex justify-between text-xs text-[#9B8A6B] mb-8">
        <span>$15</span>
        <span>$150</span>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{lang === "fr" ? "Retour" : "Back"}</button>
        <button onClick={onNext} disabled={saving} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {saving ? (
            <span className="flex items-center justify-center gap-2 pointer-events-none">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {lang === "fr" ? "Enregistrement…" : "Saving…"}
            </span>
          ) : (lang === "fr" ? "Continuer" : "Continue")}
        </button>
      </div>
    </div>
  );
}

// ─── Step 10: Payment setup ───────────────────────────────────────────────────

let _stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise(key: string) {
  if (!_stripePromise && key) _stripePromise = loadStripe(key);
  return _stripePromise;
}

function StepPaymentInner({ onComplete, onBack, saving }: {
  onComplete: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const { lang } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fr = lang === "fr";

  async function handleSave() {
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.clientSecret) {
        setError(fr ? "Erreur Stripe. Réessayez." : "Stripe error. Try again.");
        return;
      }
      const card = elements.getElement(CardElement);
      if (!card) return;
      const { error: stripeErr } = await stripe.confirmCardSetup(json.clientSecret, {
        payment_method: { card },
      });
      if (stripeErr) {
        setError(stripeErr.message ?? (fr ? "Carte refusée." : "Card declined."));
        return;
      }
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">
        {fr ? "Moyen de paiement" : "Payment method"}
      </h2>
      <p className="text-[#6B5E44] text-sm mb-6">
        {fr
          ? "Enregistrez votre carte pour vos futures séances. Aucun débit aujourd'hui."
          : "Save your card for future sessions. No charge today."}
      </p>

      <div className="border-2 border-[#6B5E44]/20 rounded-xl px-4 py-3 mb-5 focus-within:border-[#F5C400] transition">
        <CardElement options={{
          style: {
            base: { fontSize: "15px", color: "#2D1A00", fontFamily: "inherit", "::placeholder": { color: "#9B8A6B" } },
            invalid: { color: "#e53e3e" },
          },
        }} />
      </div>

      <div className="bg-[#FFFBEA] border border-[#F5C400]/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="#C49200" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
          <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
        </svg>
        <p className="text-xs text-[#7A6B55]">
          {fr
            ? "Paiement sécurisé par Stripe. Vos données ne sont jamais stockées sur nos serveurs."
            : "Secured by Stripe. Your card data is never stored on our servers."}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading || saving} className={`flex-1 py-2.5 ${btnSecondary}`}>
          {fr ? "Retour" : "Back"}
        </button>
        <button onClick={handleSave} disabled={loading || saving || !stripe} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {loading || saving
            ? <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {fr ? "Enregistrement…" : "Saving…"}
              </span>
            : (fr ? "Enregistrer la carte →" : "Save card →")}
        </button>
      </div>

      <button
        onClick={onComplete}
        disabled={loading || saving}
        className="w-full mt-3 text-xs text-[#9B8A6B] hover:text-[#5C3D00] transition underline"
      >
        {fr ? "Ignorer pour l'instant" : "Skip for now"}
      </button>
    </div>
  );
}

function StepPayment({ stripeKey, onComplete, onBack, saving }: {
  stripeKey: string;
  onComplete: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <Elements stripe={getStripePromise(stripeKey)}>
      <StepPaymentInner onComplete={onComplete} onBack={onBack} saving={saving} />
    </Elements>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function OnboardingWizard({ stripeKey }: { stripeKey: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<WizardData>({
    timezone: "UTC",
    nativeLanguage: "",
    targetLanguage: "",
    learningObjective: "",
    examTarget: "",
    selfReportedLevel: "",
    availabilityDays: [],
    timeWindowPreference: [],
    sessionFrequency: "",
    programDuration: "",
    country: "",
    tutorLanguages: [],
    budgetPerSession: 30,
    preferredCurrency: "USD",
    programTier: null,
  });

  // Auto-detect timezone silently (3.7)
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setData((prev) => ({ ...prev, timezone: tz }));
  }, []);

  function update(key: keyof WizardData, value: string | string[] | number) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); }

  async function handleFinish() {
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone: data.timezone,
        nativeLanguage: data.nativeLanguage,
        targetLanguage: data.targetLanguage,
        learningObjective: data.learningObjective,
        selfReportedLevel: data.selfReportedLevel,
        availabilityDays: data.availabilityDays,
        timeWindowPreference: data.timeWindowPreference,
        sessionFrequency: data.sessionFrequency,
        programDuration: data.programDuration,
        country: data.country,
        tutorLanguages: data.tutorLanguages,
        budgetPerSession: data.budgetPerSession,
        examTarget: data.examTarget || undefined,
        preferredCurrency: data.preferredCurrency,
      }),
    });
    setSaving(false);
    const lang = data.targetLanguage;
    router.push(lang ? `/find-tutors?lang=${encodeURIComponent(lang)}` : "/find-tutors");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">
        <Link href="/"><img src="/logo.svg" alt="WithYou" className="h-9 w-auto mb-1" /></Link>
        <div className="mb-5" />
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {step === 1 && <StepNativeLanguage data={data} onChange={update} onNext={nextStep} />}
        {step === 2 && <StepTargetLanguage data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <StepObjective data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <StepLevel data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 5 && <StepSchedule data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 6 && <StepProgram data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 7 && <StepCountry data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 8 && <StepTutorLanguages data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 9 && <StepBudget data={data} onChange={update} onNext={nextStep} onBack={prevStep} saving={false} />}
        {step === 10 && <StepPayment stripeKey={stripeKey} onComplete={handleFinish} onBack={prevStep} saving={saving} />}
      </div>
    </div>
  );
}
