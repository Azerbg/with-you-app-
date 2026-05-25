-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "tutorLanguages" TEXT[] DEFAULT '{}';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "budgetPerSession" DOUBLE PRECISION;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "examTarget" TEXT;
