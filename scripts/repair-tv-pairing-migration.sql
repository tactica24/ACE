DO $$
BEGIN
  CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TvPairingSession" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "deviceName" TEXT,
  "platform" TEXT,
  "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
  "claimedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TvPairingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TvPairingSession_code_key" ON "TvPairingSession"("code");
CREATE INDEX IF NOT EXISTS "TvPairingSession_status_expiresAt_idx" ON "TvPairingSession"("status", "expiresAt");

DO $$
BEGIN
  ALTER TABLE "TvPairingSession"
    ADD CONSTRAINT "TvPairingSession_claimedById_fkey"
    FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ninNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "ninVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "idCardUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "idVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "bankVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reliabilityNotes" TEXT;

ALTER TABLE IF EXISTS "CreatorProfile"
  DROP COLUMN IF EXISTS "phoneVerified";
