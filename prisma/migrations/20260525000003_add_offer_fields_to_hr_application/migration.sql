-- AlterTable
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "offerHourlyRateTnd" DOUBLE PRECISION;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "offerHourlyRateCad" DOUBLE PRECISION;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "offerCurrency" TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "offerMaxWeeklyHours" INTEGER;
