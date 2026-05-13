-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LearningObjective" ADD VALUE 'TRAVEL';
ALTER TYPE "LearningObjective" ADD VALUE 'CULTURAL';

-- AlterEnum
ALTER TYPE "SessionFrequency" ADD VALUE 'INTENSIVE';

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "budgetPerSession" INTEGER,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "tutorLanguages" TEXT[];
