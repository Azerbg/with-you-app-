-- Add TRAVEL, CULTURAL to LearningObjective enum
ALTER TYPE "LearningObjective" ADD VALUE IF NOT EXISTS 'TRAVEL';
ALTER TYPE "LearningObjective" ADD VALUE IF NOT EXISTS 'CULTURAL';

-- Add INTENSIVE to SessionFrequency enum
ALTER TYPE "SessionFrequency" ADD VALUE IF NOT EXISTS 'INTENSIVE';

-- Add birthday to hr_applications
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3);

-- Create temp_phone_verifications table
CREATE TABLE IF NOT EXISTS "temp_phone_verifications" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "temp_phone_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "temp_phone_verifications_phone_key" ON "temp_phone_verifications"("phone");
