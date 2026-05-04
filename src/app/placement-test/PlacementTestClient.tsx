"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QuizQuestion,
  pickQuestion,
  nextDifficulty,
  scoreCefrQuiz,
  selfReportedLevelToDifficulty,
  CEFR_LABELS,
  CEFR_DESCRIPTIONS,
  CefrLevel,
} from "@/lib/cefr-quiz";

const TOTAL_QUESTIONS = 10;

const btnPrimary = "bg-[#F5C400] text-[#5C3D00] font-bold rounded-full px-6 py-2.5 hover:bg-[#FFDE59] disabled:opacity-50 transition";
const activeCard = "border-[#F5C400] bg-[#FFF3B0]";
const inactiveCard = "border-[#6B5E44]/20 hover:border-[#F5C400]/50";

interface Props {
  selfReportedLevel: string | null;
  lang: string;
}

type Answer = { question: QuizQuestion; wasCorrect: boolean };
type Phase = "quiz" | "result";

export default function PlacementTestClient({ selfReportedLevel, lang }: Props) {
  const router = useRouter();
  const isFr = lang === "fr";

  // ── initialise first question at correct difficulty (fix 4.1)
  const [startDifficulty] = useState(() => selfReportedLevelToDifficulty(selfReportedLevel));
  const [currentDifficulty, setCurrentDifficulty] = useState(startDifficulty);
  const [usedIds] = useState<Set<string>>(() => new Set());
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    () => pickQuestion(selfReportedLevelToDifficulty(selfReportedLevel), new Set()),
  );
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [result, setResult] = useState<CefrLevel | null>(null);
  const [saving, setSaving] = useState(false);

  // fix 4.3 — correct counter
  const questionNumber = answers.length + 1;

  function handleSelect(i: number) {
    if (showFeedback || !currentQuestion) return;
    setSelected(i);
    const wasCorrect = i === currentQuestion.correct;
    setShowFeedback(true);

    setTimeout(() => {
      const newAnswers = [...answers, { question: currentQuestion, wasCorrect }];
      usedIds.add(currentQuestion.id);

      if (newAnswers.length >= TOTAL_QUESTIONS) {
        const level = scoreCefrQuiz(newAnswers);
        setAnswers(newAnswers);
        setResult(level);
        setPhase("result");
        saveResult(level);
      } else {
        const nextDiff = nextDifficulty(currentDifficulty, wasCorrect);
        const next = pickQuestion(nextDiff, usedIds);
        setAnswers(newAnswers);
        setCurrentDifficulty(nextDiff);
        setCurrentQuestion(next);
        setSelected(null);
        setShowFeedback(false);
      }
    }, 800);
  }

  async function saveResult(level: CefrLevel) {
    setSaving(true);
    try {
      await fetch("/api/placement-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cefrLevel: level }),
      });
    } catch {
      // non-blocking — user still sees result
    } finally {
      setSaving(false);
    }
  }

  // ── Result screen (fix 4.4 — no prices)
  if (phase === "result" && result) {
    const correct = answers.filter((a) => a.wasCorrect).length;
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F2EFE9" }}>
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FFF3B0] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C49200" strokeWidth="2" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#6B5E44] uppercase tracking-wide mb-2">
            {isFr ? "Votre niveau" : "Your level"}
          </p>
          <h1 className="text-5xl font-black text-[#5C3D00] mb-1">{result}</h1>
          <p className="text-lg font-bold text-[#C49200] mb-4">{CEFR_LABELS[result].split("—")[1]?.trim()}</p>
          <p className="text-sm text-[#6B5E44] mb-6 leading-relaxed">{CEFR_DESCRIPTIONS[result]}</p>
          <p className="text-xs text-[#9B8A6B] mb-8">
            {isFr
              ? `${correct} bonne${correct > 1 ? "s" : ""} réponse${correct > 1 ? "s" : ""} sur ${TOTAL_QUESTIONS}`
              : `${correct} correct answer${correct !== 1 ? "s" : ""} out of ${TOTAL_QUESTIONS}`}
          </p>
          <button
            onClick={() => { router.push("/dashboard/student"); }}
            className={`w-full py-3 ${btnPrimary}`}
            disabled={saving}
          >
            {saving
              ? (isFr ? "Enregistrement…" : "Saving…")
              : (isFr ? "Voir mon tableau de bord" : "Go to my dashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F2EFE9" }}>
        <p className="text-[#6B5E44]">{isFr ? "Chargement…" : "Loading…"}</p>
      </div>
    );
  }

  // ── Quiz screen
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F2EFE9" }}>
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[#6B5E44]">
            {isFr ? "Test de placement" : "Placement test"}
          </span>
          <span className="text-sm font-bold text-[#5C3D00]">
            {/* fix 4.3 — correct counter */}
            {isFr
              ? `Question ${questionNumber} sur ${TOTAL_QUESTIONS}`
              : `Question ${questionNumber} of ${TOTAL_QUESTIONS}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#FAF8F0] rounded-full h-2 mb-8">
          <div
            className="bg-[#F5C400] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answers.length / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        {/* Category badge */}
        <span className="inline-block text-xs font-semibold text-[#9B8A6B] uppercase tracking-wide bg-[#FAF8F0] px-3 py-1 rounded-full mb-4">
          {currentQuestion.category === "GRAMMAR"
            ? (isFr ? "Grammaire" : "Grammar")
            : currentQuestion.category === "VOCABULARY"
            ? (isFr ? "Vocabulaire" : "Vocabulary")
            : (isFr ? "Compréhension écrite" : "Reading")}
        </span>

        {/* Question */}
        <p className="text-base font-medium text-[#5C3D00] mb-6 leading-relaxed whitespace-pre-line">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((opt, i) => {
            let cls = `${inactiveCard} text-[#5C3D00]`;
            if (showFeedback) {
              if (i === currentQuestion.correct) cls = "border-green-500 bg-green-50 text-green-800";
              else if (i === selected) cls = "border-red-400 bg-red-50 text-red-700";
              else cls = `${inactiveCard} text-[#5C3D00] opacity-50`;
            } else if (selected === i) {
              cls = `${activeCard} text-[#5C3D00]`;
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={showFeedback}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition ${cls}`}
              >
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
