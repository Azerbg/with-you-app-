-- CreateEnum
CREATE TYPE "LearningObjective" AS ENUM ('CONVERSATIONAL', 'PROFESSIONAL', 'ACADEMIC', 'EXAM_PREP');

-- CreateEnum
CREATE TYPE "SessionFrequency" AS ENUM ('ONCE', 'TWICE', 'THREE_TIMES');

-- CreateEnum
CREATE TYPE "ProgramDuration" AS ENUM ('ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "availabilityDays" TEXT[],
ADD COLUMN     "learningObjective" "LearningObjective",
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "programDuration" "ProgramDuration",
ADD COLUMN     "selfReportedLevel" TEXT,
ADD COLUMN     "sessionFrequency" "SessionFrequency";
