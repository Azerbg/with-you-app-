/**
 * CEFR Placement Quiz — Phase 1
 *
 * 10 adaptive questions: 4 grammar + 3 vocabulary + 3 reading comprehension
 * Adaptive logic: correct answer → next question is harder; wrong → easier
 * Final score maps to CEFR level A1–C2
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type QuestionCategory = "GRAMMAR" | "VOCABULARY" | "READING";

export interface QuizQuestion {
  id: string;
  category: QuestionCategory;
  level: CefrLevel;
  difficulty: number; // 1=A1, 2=A2, 3=B1, 4=B2, 5=C1, 6=C2
  question: string;
  options: string[];
  correct: number; // index of correct option
  explanation?: string;
}

// ─── Question Bank ─────────────────────────────────────────────────────────

export const QUESTION_BANK: QuizQuestion[] = [
  // ── GRAMMAR ──────────────────────────────────────────────────────────────
  {
    id: "G-A1",
    category: "GRAMMAR",
    level: "A1",
    difficulty: 1,
    question: 'Complete the sentence: "She ___ a doctor."',
    options: ["am", "is", "are", "be"],
    correct: 1,
  },
  {
    id: "G-A2",
    category: "GRAMMAR",
    level: "A2",
    difficulty: 2,
    question: 'Choose the correct form: "We ___ TV when the phone rang."',
    options: ["watched", "were watching", "have watched", "watch"],
    correct: 1,
  },
  {
    id: "G-B1",
    category: "GRAMMAR",
    level: "B1",
    difficulty: 3,
    question: 'Choose the correct form: "If I ___ you, I would apologize immediately."',
    options: ["am", "was", "were", "had been"],
    correct: 2,
  },
  {
    id: "G-B2",
    category: "GRAMMAR",
    level: "B2",
    difficulty: 4,
    question: 'Select the correct option: "By the time she arrived, we ___ for two hours."',
    options: ["waited", "were waiting", "had been waiting", "have waited"],
    correct: 2,
  },
  {
    id: "G-C1",
    category: "GRAMMAR",
    level: "C1",
    difficulty: 5,
    question: 'Complete correctly: "Had I known about the issue, I ___ earlier."',
    options: ["would arrive", "had arrived", "would have arrived", "will arrive"],
    correct: 2,
  },

  // ── VOCABULARY ────────────────────────────────────────────────────────────
  {
    id: "V-A2",
    category: "VOCABULARY",
    level: "A2",
    difficulty: 2,
    question: 'Choose the word that best completes the sentence: "The weather is very ___ today — I need a coat."',
    options: ["warm", "chilly", "humid", "mild"],
    correct: 1,
  },
  {
    id: "V-B1",
    category: "VOCABULARY",
    level: "B1",
    difficulty: 3,
    question: 'Which word fits best? "The manager ___ the meeting because several team members were absent."',
    options: ["cancelled", "postponed", "prevented", "avoided"],
    correct: 1,
  },
  {
    id: "V-C1",
    category: "VOCABULARY",
    level: "C1",
    difficulty: 5,
    question: 'Choose the most precise word: "The scientist\'s findings ___ the prevailing theory on climate change."',
    options: ["questioned", "undermined", "contradicted", "refuted"],
    correct: 3,
  },

  // ── GRAMMAR (extra) ──────────────────────────────────────────────────────
  {
    id: "G-A1b",
    category: "GRAMMAR",
    level: "A1",
    difficulty: 1,
    question: 'Choose the correct word: "___ your name John?"',
    options: ["Am", "Is", "Are", "Be"],
    correct: 1,
  },
  {
    id: "G-A2b",
    category: "GRAMMAR",
    level: "A2",
    difficulty: 2,
    question: 'Complete: "She has lived here ___ 2010."',
    options: ["for", "since", "during", "until"],
    correct: 1,
  },
  {
    id: "G-B1b",
    category: "GRAMMAR",
    level: "B1",
    difficulty: 3,
    question: 'Choose the correct form: "I wish I ___ more time to study."',
    options: ["have", "had", "would have", "will have"],
    correct: 1,
  },
  {
    id: "G-B2b",
    category: "GRAMMAR",
    level: "B2",
    difficulty: 4,
    question: 'Choose the correct passive: "The report ___ by the manager yesterday."',
    options: ["was written", "is written", "has been written", "wrote"],
    correct: 0,
  },
  {
    id: "G-C1b",
    category: "GRAMMAR",
    level: "C1",
    difficulty: 5,
    question: 'Which is correct? "No sooner ___ the door than the phone rang."',
    options: ["I had opened", "had I opened", "I opened", "did I open"],
    correct: 1,
  },

  // ── VOCABULARY (extra) ────────────────────────────────────────────────────
  {
    id: "V-A1",
    category: "VOCABULARY",
    level: "A1",
    difficulty: 1,
    question: 'Which word means the opposite of "big"?',
    options: ["tall", "small", "heavy", "loud"],
    correct: 1,
  },
  {
    id: "V-B2",
    category: "VOCABULARY",
    level: "B2",
    difficulty: 4,
    question: 'Choose the best word: "The government\'s new policy aims to ___ poverty in rural areas."',
    options: ["remove", "eradicate", "delete", "vanish"],
    correct: 1,
  },

  // ── READING COMPREHENSION ─────────────────────────────────────────────────
  {
    id: "R-A2",
    category: "READING",
    level: "A2",
    difficulty: 2,
    question: 'Read: "Tom woke up late. He missed his bus and had to walk to school. He arrived after the class started."\n\nWhy was Tom late for class?',
    options: [
      "He forgot about school.",
      "He missed his bus.",
      "He walked slowly.",
      "His class started early.",
    ],
    correct: 1,
  },
  {
    id: "R-B1",
    category: "READING",
    level: "B1",
    difficulty: 3,
    question: 'Read: "Despite the heavy rain, the outdoor concert was not cancelled. The organizers set up large tents to keep the audience dry."\n\nWhat did the organizers do?',
    options: [
      "They cancelled the concert.",
      "They moved the concert indoors.",
      "They protected the audience with tents.",
      "They refunded all tickets.",
    ],
    correct: 2,
  },
  {
    id: "R-B2",
    category: "READING",
    level: "B2",
    difficulty: 4,
    question: 'Read: "The proposed legislation has drawn criticism from both environmental groups, who argue it does not go far enough, and industry representatives, who claim the regulations are overly burdensome."\n\nWhat can be inferred about the legislation?',
    options: [
      "It satisfies both groups equally.",
      "It is opposed from opposite perspectives.",
      "Environmental groups support it fully.",
      "Industry representatives wrote it.",
    ],
    correct: 1,
  },
];

// ─── Adaptive Quiz Logic ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QUESTION_SEQUENCE_BY_DIFFICULTY = [3, 4, 3, 5, 2, 4, 3, 5, 2, 4]; // B1 start

/**
 * Determine the next question difficulty based on previous answer.
 * Correct → +1 difficulty (harder), Wrong → -1 difficulty (easier)
 * Clamped to 1–5 (A1–C1 for Phase 1)
 */
export function nextDifficulty(current: number, wasCorrect: boolean): number {
  const next = wasCorrect ? current + 1 : current - 1;
  return Math.max(1, Math.min(5, next));
}

/**
 * Pick a question from the bank at a given difficulty level.
 * Avoids repeating already-used question IDs.
 */
export function pickQuestion(
  difficulty: number,
  usedIds: Set<string>,
): QuizQuestion | null {
  const candidates = QUESTION_BANK.filter(
    (q) => q.difficulty === difficulty && !usedIds.has(q.id),
  );
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  // Fall back to adjacent difficulty
  const adjacent = QUESTION_BANK.filter(
    (q) => Math.abs(q.difficulty - difficulty) === 1 && !usedIds.has(q.id),
  );
  if (adjacent.length > 0) return adjacent[0];
  // Last resort: any remaining unused question
  const remaining = QUESTION_BANK.filter((q) => !usedIds.has(q.id));
  return remaining[0] ?? null;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

const DIFFICULTY_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

/**
 * Score the quiz and return a CEFR level.
 * @param answers Array of { question, wasCorrect }
 */
export function scoreCefrQuiz(
  answers: Array<{ question: QuizQuestion; wasCorrect: boolean }>,
): CefrLevel {
  if (answers.length === 0) return "A1";

  const maxScore = answers.reduce((sum, a) => sum + DIFFICULTY_WEIGHT[a.question.difficulty], 0);
  const score = answers.reduce(
    (sum, a) => sum + (a.wasCorrect ? DIFFICULTY_WEIGHT[a.question.difficulty] : 0),
    0,
  );
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

  if (pct >= 80) return "C1";
  if (pct >= 63) return "B2";
  if (pct >= 47) return "B1";
  if (pct >= 30) return "A2";
  return "A1";
}

export const CEFR_LABELS: Record<CefrLevel, string> = {
  A1: "A1 — Beginner",
  A2: "A2 — Elementary",
  B1: "B1 — Intermediate",
  B2: "B2 — Upper-Intermediate",
  C1: "C1 — Advanced",
  C2: "C2 — Proficient",
};

export const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "You're starting from scratch. Welcome — we'll take it step by step.",
  A2: "You know the basics and can handle simple conversations.",
  B1: "You can manage most everyday situations in the language.",
  B2: "You communicate fluently with native speakers.",
  C1: "You express yourself precisely, even on complex topics.",
  C2: "Near-native mastery — you're exceptional.",
};
