-- CreateEnum
CREATE TYPE "TutorVerificationTier" AS ENUM ('PROVISIONAL', 'VERIFIED', 'TOP_TUTOR');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'CAD', 'EUR', 'TND');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'STAGE1_REVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETE', 'OFFER_PENDING', 'SIGNED', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('DISCOVERY', 'SINGLE', 'PROGRAM', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('NO_SHOW', 'TECHNICAL_FAILURE', 'QUALITY_COMPLAINT', 'BILLING_ERROR', 'CONDUCT_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- AlterEnum
ALTER TYPE "ProgramDuration" ADD VALUE 'PAY_PER_SESSION';

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "preferredCurrency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "timeWindowPreference" TEXT[];

-- AlterTable
ALTER TABLE "tutor_profiles" ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "avgResponseHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "cefrTeachingMax" TEXT,
ADD COLUMN     "cefrTeachingMin" TEXT,
ADD COLUMN     "certifications" TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "languagesTaught" TEXT[],
ADD COLUMN     "maxWeeklyHours" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationTier" "TutorVerificationTier" NOT NULL DEFAULT 'PROVISIONAL',
ADD COLUMN     "yearsExperience" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeConnectAccountId" TEXT;

-- CreateTable
CREATE TABLE "student_program_pricing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programTier" "ProgramTier" NOT NULL,
    "baseRateUsd" DOUBLE PRECISION NOT NULL,
    "monthlyRateUsd" DOUBLE PRECISION NOT NULL,
    "monthlyRateCad" DOUBLE PRECISION NOT NULL,
    "monthlyRateEur" DOUBLE PRECISION NOT NULL,
    "discoveryPriceUsd" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "discoveryPriceCad" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "discoveryPriceEur" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "preferredCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_program_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_compensation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourlyRateTnd" DOUBLE PRECISION,
    "hourlyRateCad" DOUBLE PRECISION,
    "currencyPref" "Currency" NOT NULL DEFAULT 'TND',
    "maxWeeklyHours" INTEGER NOT NULL DEFAULT 20,
    "minimumPayoutTnd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "minimumPayoutCad" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_availability" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "blockedDate" TIMESTAMP(3),
    "blockReason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "durationMins" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "studentPriceUsd" DOUBLE PRECISION,
    "studentCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "tutorPayoutAmount" DOUBLE PRECISION,
    "tutorCurrency" "Currency" NOT NULL DEFAULT 'TND',
    "platformMargin" DOUBLE PRECISION,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "noShowReportedAt" TIMESTAMP(3),
    "noShowReportedBy" TEXT,
    "whiteboardSnapshotUrl" TEXT,
    "chatLogSaved" BOOLEAN NOT NULL DEFAULT false,
    "reviewLeft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT,
    "description" TEXT NOT NULL,
    "desiredResolution" TEXT,
    "evidenceUrls" TEXT[],
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "assignedHrId" TEXT,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "languagesTaught" TEXT[],
    "specializations" TEXT[],
    "certifications" TEXT[],
    "yearsExperience" INTEGER,
    "certificateUrls" TEXT[],
    "bio" TEXT,
    "videoUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "bioFlaggedAt" TIMESTAMP(3),
    "videoFlaggedAt" TIMESTAMP(3),
    "prescreenPassedAt" TIMESTAMP(3),
    "scoreLanguageProficiency" INTEGER,
    "scoreAudioVideoQuality" INTEGER,
    "scoreProfessionalPresentation" INTEGER,
    "scoreTeachingPhilosophy" INTEGER,
    "scoreCulturalFit" INTEGER,
    "interviewScheduledAt" TIMESTAMP(3),
    "interviewCompletedAt" TIMESTAMP(3),
    "interviewNotes" TEXT,
    "interviewLanguage" TEXT,
    "offerSentAt" TIMESTAMP(3),
    "offerSignedAt" TIMESTAMP(3),
    "agreementUrl" TEXT,
    "agreementLanguage" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reapplyAfter" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "preferredLanguage" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationActualMins" INTEGER,
    "recordingConsentStudent" BOOLEAN NOT NULL DEFAULT false,
    "recordingConsentTutor" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "recordingDeletedAt" TIMESTAMP(3),
    "whiteboardSnapshotUrl" TEXT,
    "whiteboardData" JSONB,
    "chatLogSaved" BOOLEAN NOT NULL DEFAULT false,
    "reviewPromptSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluency_reports" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "summaryText" TEXT,
    "tutorEditedSummary" TEXT,
    "summaryApproved" BOOLEAN NOT NULL DEFAULT false,
    "talkTimeStudentPct" DOUBLE PRECISION,
    "talkTimeTutorPct" DOUBLE PRECISION,
    "cefrEstimated" TEXT,
    "flashcardsGenerated" INTEGER NOT NULL DEFAULT 0,
    "corrections" JSONB,
    "vocabBank" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluency_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "tags" TEXT[],
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "ratingCommunication" INTEGER NOT NULL,
    "ratingStructure" INTEGER NOT NULL,
    "ratingAccuracy" INTEGER NOT NULL,
    "ratingValue" INTEGER NOT NULL,
    "ratingComposite" DOUBLE PRECISION NOT NULL,
    "text" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "flaggedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "tutorResponse" TEXT,
    "tutorRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT,
    "lessonId" TEXT,
    "senderId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "flaggedAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_pricing" (
    "id" TEXT NOT NULL,
    "tier" "ProgramTier" NOT NULL,
    "baseRatePerSessionCad" DOUBLE PRECISION NOT NULL,
    "discoverySessionCad" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "frequencyOnceMult" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "frequencyTwiceMult" DOUBLE PRECISION NOT NULL DEFAULT 1.9,
    "frequencyThreeTimesMult" DOUBLE PRECISION NOT NULL DEFAULT 2.7,
    "durationThreeMonthsDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "durationSixMonthsDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "objectiveProfessionalPremium" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "objectiveExamPrepPremium" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payloadBefore" JSONB,
    "payloadAfter" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" "Currency" NOT NULL,
    "toCurrency" "Currency" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_program_pricing_userId_key" ON "student_program_pricing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_compensation_userId_key" ON "tutor_compensation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_applications_userId_key" ON "hr_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_bookingId_key" ON "lessons"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "fluency_reports_lessonId_key" ON "fluency_reports"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "message_threads_studentId_tutorId_key" ON "message_threads"("studentId", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_pricing_tier_key" ON "platform_pricing"("tier");

-- CreateIndex
CREATE INDEX "currency_exchange_rates_fromCurrency_toCurrency_effectiveAt_idx" ON "currency_exchange_rates"("fromCurrency", "toCurrency", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- AddForeignKey
ALTER TABLE "student_program_pricing" ADD CONSTRAINT "student_program_pricing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_compensation" ADD CONSTRAINT "tutor_compensation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_availability" ADD CONSTRAINT "tutor_availability_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_applications" ADD CONSTRAINT "hr_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluency_reports" ADD CONSTRAINT "fluency_reports_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
