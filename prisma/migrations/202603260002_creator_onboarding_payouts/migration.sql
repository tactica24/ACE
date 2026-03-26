CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

ALTER TABLE "CreatorProfile"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "idCardNumber" TEXT;

CREATE TABLE "CreatorPayoutRequest" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "amountNaira" INTEGER NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankAccountName" TEXT NOT NULL,
  "bankAccountNumber" TEXT NOT NULL,
  "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "reviewerId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),

  CONSTRAINT "CreatorPayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorPayoutRequest_creatorProfileId_requestedAt_idx" ON "CreatorPayoutRequest"("creatorProfileId", "requestedAt");
CREATE INDEX "CreatorPayoutRequest_status_requestedAt_idx" ON "CreatorPayoutRequest"("status", "requestedAt");

ALTER TABLE "CreatorPayoutRequest"
  ADD CONSTRAINT "CreatorPayoutRequest_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
