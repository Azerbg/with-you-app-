-- CreateTable: Email OTP codes (no user FK)
CREATE TABLE IF NOT EXISTS "email_otps" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "expires"   TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_otps_email_code_key" ON "email_otps"("email", "code");

-- AlterTable: Add new fields to hr_applications
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "firstName"            TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "lastName"             TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "gender"               TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "country"              TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "englishLevel"         TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "linguisticCerts"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "teachingCerts"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "academicDegrees"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "attestationUrls"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "cvUrl"                TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "motivationLetterUrl"  TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "timezone"             TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "interviewSlots"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "interviewToken"       TEXT;
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "interviewSelectedAt"  TIMESTAMP(3);
ALTER TABLE "hr_applications" ADD COLUMN IF NOT EXISTS "interviewMeetingUrl"  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "hr_applications_interviewToken_key" ON "hr_applications"("interviewToken");
