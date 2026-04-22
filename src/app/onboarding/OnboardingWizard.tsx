"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { T } from "@/lib/translations";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  pickQuestion,
  nextDifficulty,
  scoreCefrQuiz,
  CEFR_LABELS,
  CEFR_DESCRIPTIONS,
  CefrLevel,
  QuizQuestion,
} from "@/lib/cefr-quiz";
import { DISCOVERY_PRICE } from "@/lib/pricing";
import { ProgramTier } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizAnswer {
  question: QuizQuestion;
  selectedIndex: number;
  wasCorrect: boolean;
}

interface WizardData {
  timezone: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningObjective: string;
  selfReportedLevel: string;
  availabilityDays: string[];
  timeWindowPreference: string[];
  sessionFrequency: string;
  programDuration: string;
  preferredCurrency: string;
  cefrLevel: CefrLevel | null;
  programTier: ProgramTier | null;
  pricing: {
    monthlyRateUsd: number;
    monthlyRateCad: number;
    monthlyRateEur: number;
    perSessionRateCad: number;
    sessionsPerMonth: number;
    durationDiscount: number;
  } | null;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Phase 1: French and English ONLY
const TARGET_LANGUAGES = ["French", "English"];

const ALL_LANGUAGES = [
  "English", "French", "Arabic", "Spanish", "German",
  "Italian", "Portuguese", "Mandarin", "Japanese", "Korean",
];

const TOTAL_STEPS = 5;
const QUIZ_LENGTH = 10;

// ─── Shared class constants ────────────────────────────────────────────────────

const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";
const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full hover:bg-[#FFDE59] disabled:opacity-50 transition";
const btnSecondary = "border-2 border-[#6B5E44]/30 text-[#5C3D00] font-bold rounded-full hover:bg-[#FFF3B0] transition";
const activeCard = "border-[#F5C400] bg-[#FFF3B0]";
const inactiveCard = "border-[#6B5E44]/20 hover:border-[#F5C400]/50";

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
        <div
          className="bg-[#F5C400] h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Timezone ─────────────────────────────────────────────────────────

function StepTimezone({
  data, onChange, onNext,
}: {
  data: WizardData;
  onChange: (key: keyof WizardData, value: string) => void;
  onNext: () => void;
}) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.timezone;

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    onChange("timezone", detected || "UTC");
  }, []);

  const timezones = Intl.supportedValuesOf
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC", "America/Toronto", "America/New_York", "Europe/Paris", "Africa/Tunis"];

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{t.title}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{t.sub}</p>
      <select
        value={data.timezone}
        onChange={(e) => onChange("timezone", e.target.value)}
        className={`${inputCls} mb-6`}
      >
        {timezones.map((tz) => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>
      <button onClick={onNext} disabled={!data.timezone} className={`w-full py-2.5 ${btnPrimary}`}>
        {t.continue}
      </button>
    </div>
  );
}

// ─── Step 2: Languages & Goal ─────────────────────────────────────────────────

function StepLanguages({
  data, onChange, onNext, onBack,
}: {
  data: WizardData;
  onChange: (key: keyof WizardData, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.languages;
  const icons = ["💬","💼","📚","🎯"];

  const isValid =
    data.nativeLanguage && data.targetLanguage && data.learningObjective &&
    data.nativeLanguage !== data.targetLanguage;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{t.title}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{t.sub}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.native}</label>
          <select value={data.nativeLanguage} onChange={(e) => onChange("nativeLanguage", e.target.value)} className={inputCls}>
            <option value="">{t.select}</option>
            {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#5C3D00] mb-1">{t.learn}</label>
          <select value={data.targetLanguage} onChange={(e) => onChange("targetLanguage", e.target.value)} className={inputCls}>
            <option value="">{t.select}</option>
            {TARGET_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <p className="text-xs text-[#6B5E44] mt-1">{t.phase1}</p>
        </div>
      </div>
      {data.nativeLanguage && data.targetLanguage && data.nativeLanguage === data.targetLanguage && (
        <p className="text-xs text-red-500 mb-4">{t.sameError}</p>
      )}

      <label className="block text-sm font-semibold text-[#5C3D00] mb-2 mt-4">{t.goal}</label>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {t.objectives.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange("learningObjective", ["CONVERSATIONAL","PROFESSIONAL","ACADEMIC","EXAM_PREP"][i])}
            className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition ${
              data.learningObjective === ["CONVERSATIONAL","PROFESSIONAL","ACADEMIC","EXAM_PREP"][i] ? activeCard : inactiveCard
            }`}
          >
            <span className="text-xl mb-1">{icons[i]}</span>
            <span className="text-sm font-bold text-[#5C3D00]">{o.label}</span>
            <span className="text-xs text-[#6B5E44]">{o.desc}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{t.back}</button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>{t.continue}</button>
      </div>
    </div>
  );
}

// ─── Step 3: Assessment Preferences ──────────────────────────────────────────

function StepAssessment({
  data, onChange, onNext, onBack,
}: {
  data: WizardData;
  onChange: (key: keyof WizardData, value: string | string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function toggleDay(day: string) {
    const cur = data.availabilityDays;
    onChange("availabilityDays", cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]);
  }

  function toggleWindow(w: string) {
    const cur = data.timeWindowPreference;
    onChange("timeWindowPreference", cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]);
  }

  const isValid =
    data.selfReportedLevel &&
    data.availabilityDays.length > 0 &&
    data.timeWindowPreference.length > 0 &&
    data.sessionFrequency &&
    data.programDuration;

  const { lang } = useLanguage();
  const t = T[lang].onboarding.assessment;
  const cefrLabels = t.cefrLabels;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-2">{t.title}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{t.sub}</p>

      {/* Self-reported level */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.levelLabel}</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(cefrLabels).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChange("selfReportedLevel", val)}
              className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition ${
                data.selfReportedLevel === val ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}
            >
              {val}
            </button>
          ))}
        </div>
        {data.selfReportedLevel && (
          <p className="text-xs text-[#6B5E44] mt-1">{cefrLabels[data.selfReportedLevel]}</p>
        )}
      </div>

      {/* Preferred days */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.daysLabel}</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold transition ${
                data.availabilityDays.includes(d) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}
            >
              {(t.dayLabels as Record<string,string>)[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Time windows */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.windowsLabel}</label>
        <div className="flex gap-3">
          {(["MORNING","AFTERNOON","EVENING"] as const).map((val, i) => (
            <button key={val} type="button" onClick={() => toggleWindow(val)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 text-sm transition ${
                data.timeWindowPreference.includes(val) ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}
            >
              <span className="font-bold">{t.windows[i].label}</span>
              <span className="text-xs mt-0.5 text-[#6B5E44]">{t.windows[i].time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session frequency */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.freqLabel}</label>
        <div className="flex gap-3">
          {(["ONCE","TWICE","THREE_TIMES"] as const).map((val, i) => (
            <button key={val} type="button" onClick={() => onChange("sessionFrequency", val)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition flex flex-col items-center ${
                data.sessionFrequency === val ? activeCard : `${inactiveCard} text-[#5C3D00]`
              }`}
            >
              <span>{t.freqs[i].label}</span>
              {"note" in t.freqs[i] && t.freqs[i].note && <span className="text-xs font-normal text-green-600">{t.freqs[i].note}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Program duration */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-2">{t.programLabel}</label>
        <div className="grid grid-cols-2 gap-2">
          {(["PAY_PER_SESSION","ONE_MONTH","THREE_MONTHS","SIX_MONTHS"] as const).map((val, i) => (
            <button key={val} type="button" onClick={() => onChange("programDuration", val)}
              className={`py-2.5 px-3 rounded-xl border-2 text-left text-sm transition ${
                data.programDuration === val ? activeCard : inactiveCard
              }`}
            >
              <span className="font-bold text-[#5C3D00] block">{t.programs[i].label}</span>
              <span className="text-xs text-green-600">{t.programs[i].note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{t.back}</button>
        <button onClick={onNext} disabled={!isValid} className={`flex-1 py-2.5 ${btnPrimary}`}>
          {t.startQuiz}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Adaptive CEFR Quiz ───────────────────────────────────────────────

function StepCefrQuiz({
  onComplete,
  onBack,
}: {
  onComplete: (answers: QuizAnswer[]) => void;
  onBack: () => void;
}) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.quiz;

  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [usedIds] = useState(new Set<string>());
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(() =>
    pickQuestion(3, new Set()) // Start at B1 difficulty
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const questionNumber = answers.length + 1;
  const isLastQuestion = questionNumber >= QUIZ_LENGTH;

  if (!currentQ) {
    return <p className="text-sm text-[#6B5E44]">{t.loading}</p>;
  }

  function handleSelect(i: number) {
    if (showFeedback) return;
    setSelectedIndex(i);
  }

  function handleConfirm() {
    if (selectedIndex === null || !currentQ) return;
    const wasCorrect = selectedIndex === currentQ.correct;
    const newAnswer: QuizAnswer = { question: currentQ, selectedIndex, wasCorrect };
    const newAnswers = [...answers, newAnswer];

    usedIds.add(currentQ.id);
    setAnswers(newAnswers);
    setShowFeedback(true);

    setTimeout(() => {
      if (newAnswers.length >= QUIZ_LENGTH) {
        onComplete(newAnswers);
      } else {
        const difficulty = nextDifficulty(currentQ.difficulty, wasCorrect);
        const next = pickQuestion(difficulty, usedIds);
        setCurrentQ(next);
        setSelectedIndex(null);
        setShowFeedback(false);
      }
    }, 800);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">{t.title}</h2>
      <p className="text-[#6B5E44] text-sm mb-4">
        {t.question} {questionNumber} {t.of} {QUIZ_LENGTH} · {t.categories[currentQ.category as keyof typeof t.categories]}
      </p>

      {/* Mini progress */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: QUIZ_LENGTH }).map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < answers.length ? "bg-[#F5C400]" : "bg-[#FAF8F0]"}`} />
        ))}
      </div>

      <div className="bg-[#FFF3B0] rounded-xl p-4 mb-4 border border-[#F5C400]/40">
        <span className="text-xs font-bold text-[#C49200] uppercase tracking-wide">{t.levelLabel} {currentQ.level}</span>
        <p className="text-[#5C3D00] font-medium mt-1 whitespace-pre-line">{currentQ.question}</p>
      </div>

      <div className="space-y-2 mb-6">
        {currentQ.options.map((option, i) => {
          let cls = `${inactiveCard} text-[#5C3D00]`;
          if (showFeedback) {
            if (i === currentQ.correct) cls = "border-green-500 bg-green-50 text-green-800";
            else if (i === selectedIndex) cls = "border-red-400 bg-red-50 text-red-700";
          } else if (selectedIndex === i) {
            cls = `${activeCard} text-[#5C3D00] font-semibold`;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition ${cls}`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              {option}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        {answers.length === 0 && (
          <button onClick={onBack} className={`flex-1 py-2.5 ${btnSecondary}`}>{t.back}</button>
        )}
        <button
          onClick={handleConfirm}
          disabled={selectedIndex === null || showFeedback}
          className={`flex-1 py-2.5 ${btnPrimary}`}
        >
          {showFeedback ? (isLastQuestion ? t.calculating : t.next) : t.confirm}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Results + Pricing + Stripe ──────────────────────────────────────

function CardSetupForm({ onSuccess, onSkip }: { onSuccess: () => void; onSkip: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { lang } = useLanguage();
  const t = T[lang].onboarding.results;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/stripe/setup-intent", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.clientSecret) setClientSecret(d.clientSecret); else setError("Could not load payment form."); })
      .catch(() => setError("Could not load payment form."))
      .finally(() => setFetching(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    setError("");
    const card = elements.getElement(CardElement);
    if (!card) return;
    const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
    setLoading(false);
    if (stripeError) setError(stripeError.message ?? t.cardFailed);
    else onSuccess();
  }

  if (fetching) return <p className="text-sm text-[#6B5E44]">{t.loadingPayment}</p>;
  if (error && !clientSecret) return (
    <div>
      <p className="text-sm text-red-500 mb-3">{error}</p>
      <button onClick={onSkip} className="text-sm text-[#C49200] hover:text-[#5C3D00] font-semibold">{t.skip}</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-[#6B5E44]/30 rounded-xl px-4 py-3 mb-3 bg-white">
        <CardElement options={{ style: { base: { fontSize: "14px", color: "#5C3D00" } } }} />
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <button type="submit" disabled={loading || !stripe}
        className={`w-full py-2.5 mb-2 ${btnPrimary}`}>
        {loading ? t.saving2 : t.saveCard}
      </button>
      <button type="button" onClick={onSkip} className="w-full text-sm text-[#6B5E44] hover:text-[#5C3D00] py-1 font-medium">
        {t.skip}
      </button>
    </form>
  );
}

function StepResults({
  data,
  stripeKey,
  onFinish,
  onCurrencyChange,
  saving,
}: {
  data: WizardData;
  stripeKey: string;
  onFinish: () => void;
  onCurrencyChange: (c: string) => void;
  saving: boolean;
}) {
  const { lang } = useLanguage();
  const t = T[lang].onboarding.results;
  const stripePromise = stripeKey ? loadStripe(stripeKey) : null;
  const p = data.pricing;

  const currencySymbols: Record<string, string> = { USD: "$", CAD: "CA$", EUR: "€" };
  const preferredRate = data.preferredCurrency === "CAD"
    ? p?.monthlyRateCad
    : data.preferredCurrency === "EUR"
    ? p?.monthlyRateEur
    : p?.monthlyRateUsd;

  const currSymbol = currencySymbols[data.preferredCurrency] ?? "$";

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#5C3D00] mb-1">{t.title}</h2>
      <p className="text-[#6B5E44] text-sm mb-6">{t.sub}</p>

      {/* CEFR Result */}
      <div className="bg-[#F5C400] rounded-xl p-4 mb-4">
        <p className="text-xs font-bold text-[#5C3D00]/70 uppercase tracking-wide mb-1">{t.cefrLabel}</p>
        <p className="text-5xl font-bold text-[#5C3D00]">{data.cefrLevel}</p>
        <p className="text-sm text-[#5C3D00] mt-1 font-semibold">
          {data.cefrLevel ? CEFR_LABELS[data.cefrLevel] : ""}
        </p>
        <p className="text-xs text-[#5C3D00]/70 mt-1">
          {data.cefrLevel ? CEFR_DESCRIPTIONS[data.cefrLevel] : ""}
        </p>
      </div>

      {/* Pricing */}
      {p && (
        <div className="bg-[#FFFDF4] border border-[#F5C400]/30 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-[#C49200] uppercase tracking-wide mb-3">{t.pricingLabel}</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-bold text-[#5C3D00]">
              {currSymbol}{data.programDuration === "PAY_PER_SESSION"
                ? (data.preferredCurrency === "USD" ? (p.perSessionRateCad * 0.74).toFixed(0)
                  : data.preferredCurrency === "EUR" ? (p.perSessionRateCad * 0.68).toFixed(0)
                  : p.perSessionRateCad.toFixed(0))
                : preferredRate?.toFixed(0)}
            </span>
            <span className="text-[#6B5E44] text-sm mb-1">{t.durations[data.programDuration as keyof typeof t.durations] ?? ""}</span>
          </div>
          <div className="text-xs text-[#6B5E44] space-y-0.5">
            <p>{p.sessionsPerMonth} {t.sessionsMonth}</p>
            {p.durationDiscount > 0 && (
              <p className="text-green-600 font-semibold">✓ {Math.round(p.durationDiscount * 100)}{t.discount}</p>
            )}
          </div>

          {/* Currency selector */}
          <div className="flex gap-2 mt-3">
            {["USD", "CAD", "EUR"].map((c) => (
              <button key={c} type="button"
                onClick={() => onCurrencyChange(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                  data.preferredCurrency === c
                    ? "bg-[#5C3D00] text-[#F5C400] border-[#5C3D00]"
                    : "border-[#6B5E44]/30 text-[#6B5E44] hover:border-[#F5C400]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Discovery session note */}
      <div className="bg-[#FFF3B0] border border-[#F5C400]/40 rounded-xl px-4 py-3 mb-6 text-sm text-[#5C3D00]">
        <p className="font-bold mb-0.5">{t.discoveryTitle}</p>
        <p className="text-xs text-[#6B5E44]">{t.discoverySub} ${DISCOVERY_PRICE.USD} USD · CA${DISCOVERY_PRICE.CAD} · €{DISCOVERY_PRICE.EUR} {t.discoverySub2}</p>
      </div>

      {/* Stripe card setup */}
      {saving ? (
        <p className="text-sm text-[#6B5E44] text-center py-4">{t.saving}</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#5C3D00] mb-3">{t.addPayment}</p>
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <CardSetupForm onSuccess={onFinish} onSkip={onFinish} />
            </Elements>
          ) : (
            <div>
              <p className="text-xs text-[#C49200] bg-[#FFF3B0] border border-[#F5C400]/40 rounded-xl p-3 mb-3">
                {t.noStripe}
              </p>
              <button onClick={onFinish}
                className={`w-full py-2.5 ${btnPrimary}`}>
                {t.dashboard}
              </button>
            </div>
          )}
        </>
      )}
    </div>
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
    selfReportedLevel: "",
    availabilityDays: [],
    timeWindowPreference: [],
    sessionFrequency: "",
    programDuration: "",
    preferredCurrency: "USD",
    cefrLevel: null,
    programTier: null,
    pricing: null,
  });

  function update(key: keyof WizardData, value: string | string[]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); }

  async function handleQuizComplete(answers: QuizAnswer[]) {
    const cefrLevel = scoreCefrQuiz(answers);
    setSaving(true);

    const res = await fetch("/api/onboarding", {
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
        preferredCurrency: data.preferredCurrency,
        cefrLevel,
      }),
    });

    const result = await res.json();
    setSaving(false);

    setData((prev) => ({
      ...prev,
      cefrLevel,
      programTier: result.tier ?? null,
      pricing: result.pricing ?? null,
    }));

    setStep(5);
  }

  function handleFinish() {
    router.push("/dashboard/student");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(92,61,0,0.12)] p-8 border border-[#F5C400]/30">
        <Link href="/" className="text-[#F5C400] font-bold text-xl mb-1 bg-[#5C3D00] inline-block px-3 py-1 rounded-lg">WithYou</Link>
        <div className="mb-5" />
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {step === 1 && <StepTimezone data={data} onChange={update} onNext={nextStep} />}
        {step === 2 && <StepLanguages data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <StepAssessment data={data} onChange={update} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <StepCefrQuiz onComplete={handleQuizComplete} onBack={prevStep} />}
        {step === 5 && <StepResults data={data} stripeKey={stripeKey} onFinish={handleFinish} onCurrencyChange={(c) => update("preferredCurrency", c)} saving={saving} />}
      </div>
    </div>
  );
}
