-- Add payout tracking fields to bookings (idempotent)
DO $$ BEGIN
  ALTER TABLE "bookings" ADD COLUMN "tutorPayoutUsd" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD COLUMN "tutorPaidAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD COLUMN "tutorPaidBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD COLUMN "tutorPaidMethod" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create settings table (idempotent)
CREATE TABLE IF NOT EXISTS "settings" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
