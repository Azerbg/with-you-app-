-- CreateTable: Email OTP codes (no user FK)
CREATE TABLE "email_otps" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "expires"   TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_otps_email_code_key" ON "email_otps"("email", "code");

-- AlterTable: Add new fields to hr_applications
ALTER TABLE "hr_applications"
ADD COLUMN "firstName"            TEXT,
ADD COLUMN "lastName"             TEXT,
ADD COLUMN "gender"               TEXT,
ADD COLUMN "country"              TEXT,
ADD COLUMN "englishLevel"         TEXT,
ADD COLUMN "linguisticCerts"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "teachingCerts"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "academicDegrees"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "attestationUrls"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "cvUrl"                TEXT,
ADD COLUMN "motivationLetterUrl"  TEXT,
ADD COLUMN "timezone"             TEXT,
ADD COLUMN "interviewSlots"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "interviewToken"       TEXT,
ADD COLUMN "interviewSelectedAt"  TIMESTAMP(3),
ADD COLUMN "interviewMeetingUrl"  TEXT;

CREATE UNIQUE INDEX "hr_applications_interviewToken_key" ON "hr_applications"("interviewToken");
