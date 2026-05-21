CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'EXPIRED');

CREATE TABLE "TvPairingSession" (
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

CREATE UNIQUE INDEX "TvPairingSession_code_key" ON "TvPairingSession"("code");
CREATE INDEX "TvPairingSession_status_expiresAt_idx" ON "TvPairingSession"("status", "expiresAt");
ALTER TABLE "TvPairingSession" ADD CONSTRAINT "TvPairingSession_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorProfile"
  ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ninNumber" TEXT,
  ADD COLUMN "ninVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "idCardUrl" TEXT,
  ADD COLUMN "idVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountName" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reliabilityNotes" TEXT;
