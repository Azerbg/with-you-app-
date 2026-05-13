-- AlterTable
ALTER TABLE "hr_applications" ADD COLUMN     "interviewMeetingUrl" TEXT;

-- CreateTable
CREATE TABLE "temp_phone_verifications" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "temp_phone_verifications_phone_key" ON "temp_phone_verifications"("phone");
