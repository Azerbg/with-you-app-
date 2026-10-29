-- CreateTable: student_payment_methods (PayPal Vault v3 tokens)
CREATE TABLE IF NOT EXISTS "student_payment_methods" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "provider"         TEXT NOT NULL DEFAULT 'paypal',
  "type"             TEXT NOT NULL DEFAULT 'paypal',
  "providerRef"      TEXT NOT NULL,
  "paypalCustomerId" TEXT,
  "displayLabel"     TEXT NOT NULL,
  "isDefault"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"        TIMESTAMP(3),

  CONSTRAINT "student_payment_methods_pkey" PRIMARY KEY ("id")
);

-- ForeignKey: student_payment_methods.userId → users.id
DO $$ BEGIN
  ALTER TABLE "student_payment_methods"
    ADD CONSTRAINT "student_payment_methods_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index on userId for fast per-user lookups
CREATE INDEX IF NOT EXISTS "student_payment_methods_userId_idx"
  ON "student_payment_methods"("userId");

-- CreateTable: paypal_webhook_events (idempotency — store processed event IDs)
CREATE TABLE IF NOT EXISTS "paypal_webhook_events" (
  "id"          TEXT NOT NULL,
  "eventType"   TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "paypal_webhook_events_pkey" PRIMARY KEY ("id")
);
