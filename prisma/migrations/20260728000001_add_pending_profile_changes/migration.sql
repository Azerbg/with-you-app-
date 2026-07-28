-- CreateEnum (safe — skips if already exists)
DO $$ BEGIN
  CREATE TYPE "PendingChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "pending_profile_changes" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" "PendingChangeStatus" NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "pending_profile_changes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (safe — skips if already exists)
DO $$ BEGIN
  ALTER TABLE "pending_profile_changes" ADD CONSTRAINT "pending_profile_changes_tutorId_fkey"
    FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pending_profile_changes" ADD CONSTRAINT "pending_profile_changes_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
