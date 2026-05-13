-- AlterTable: add offer rate fields to hr_applications
ALTER TABLE "hr_applications"
  ADD COLUMN "offerHourlyRateTnd"  DOUBLE PRECISION,
  ADD COLUMN "offerHourlyRateCad"  DOUBLE PRECISION,
  ADD COLUMN "offerCurrency"       TEXT,
  ADD COLUMN "offerMaxWeeklyHours" INTEGER;
