-- AlterTable (safe — adds column only if it doesn't exist)
DO $$ BEGIN
  ALTER TABLE "tutor_profiles" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
