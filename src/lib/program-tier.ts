import { ProgramTier, SessionFrequency, ProgramDuration, LearningObjective } from "@prisma/client";

interface TierInput {
  cefrLevel: string;
  sessionFrequency: SessionFrequency;
  programDuration: ProgramDuration;
  learningObjective: LearningObjective;
}

export function calculateProgramTier(input: TierInput): ProgramTier {
  let score = 0;

  // Frequency
  if (input.sessionFrequency === "THREE_TIMES") score += 2;
  else if (input.sessionFrequency === "TWICE") score += 1;
  // ONCE → 0

  // Duration
  if (input.programDuration === "SIX_MONTHS") score += 2;
  else if (input.programDuration === "THREE_MONTHS") score += 1;
  // ONE_MONTH → 0

  // Objective
  if (input.learningObjective === "EXAM_PREP") score += 2;
  else if (input.learningObjective === "PROFESSIONAL" || input.learningObjective === "ACADEMIC") score += 1;
  // CONVERSATIONAL → 0

  // CEFR level
  if (["C1", "C2"].includes(input.cefrLevel)) score += 1;
  else if (["A1", "A2"].includes(input.cefrLevel)) score -= 1;

  if (score >= 5) return ProgramTier.INTENSIVE;
  if (score >= 2) return ProgramTier.CORE;
  return ProgramTier.STARTER;
}

export const TIER_DESCRIPTIONS: Record<ProgramTier, { label: string; sessions: string; desc: string }> = {
  STARTER: {
    label: "Starter",
    sessions: "4 sessions/month",
    desc: "Perfect for beginners building confidence at a relaxed pace.",
  },
  CORE: {
    label: "Core",
    sessions: "8 sessions/month",
    desc: "Balanced progress for learners with clear goals and steady commitment.",
  },
  INTENSIVE: {
    label: "Intensive",
    sessions: "12 sessions/month",
    desc: "Maximum results for learners who need rapid, structured progression.",
  },
};
