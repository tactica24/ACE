ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminSupportActionType') THEN
    CREATE TYPE "AdminSupportActionType" AS ENUM (
      'PAYMENT_VERIFY',
      'PAYMENT_STATUS_UPDATE',
      'WALLET_ADJUSTMENT',
      'CREDIT_ADJUSTMENT',
      'SUPPORT_COMPENSATION'
    );
  END IF;
END $$;

DELETE FROM "Unlock" a
USING "Unlock" b
WHERE a.id < b.id
  AND a."userId" = b."userId"
  AND a."videoId" = b."videoId";

CREATE TABLE "AdminSupportAction" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentId" TEXT,
  "actionType" "AdminSupportActionType" NOT NULL,
  "amountNairaDelta" INTEGER NOT NULL DEFAULT 0,
  "creditsDelta" INTEGER NOT NULL DEFAULT 0,
  "resultingBalanceNaira" INTEGER,
  "resultingCredits" INTEGER,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminSupportAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminSupportAction_userId_createdAt_idx" ON "AdminSupportAction"("userId", "createdAt");
CREATE INDEX "AdminSupportAction_adminUserId_createdAt_idx" ON "AdminSupportAction"("adminUserId", "createdAt");
CREATE INDEX "AdminSupportAction_paymentId_createdAt_idx" ON "AdminSupportAction"("paymentId", "createdAt");

ALTER TABLE "AdminSupportAction"
ADD CONSTRAINT "AdminSupportAction_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminSupportAction"
ADD CONSTRAINT "AdminSupportAction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminSupportAction"
ADD CONSTRAINT "AdminSupportAction_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "Unlock_userId_videoId_key" ON "Unlock"("userId", "videoId");
