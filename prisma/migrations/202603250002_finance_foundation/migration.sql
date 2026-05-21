ALTER TABLE "CreatorProfile"
  ADD COLUMN "creatorNumber" TEXT,
  ADD COLUMN "earningsBalanceNaira" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "CreatorProfile_creatorNumber_key" ON "CreatorProfile"("creatorNumber");

CREATE TABLE "FinanceConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "creatorSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 60,
  "platformSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 29.5,
  "gatewayFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 3,
  "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformWallet" (
  "id" TEXT NOT NULL DEFAULT 'ace-platform',
  "balanceNaira" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnlockSettlement" (
  "id" TEXT NOT NULL,
  "unlockId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "creatorProfileId" TEXT,
  "grossNaira" INTEGER NOT NULL,
  "creatorNaira" INTEGER NOT NULL DEFAULT 0,
  "platformNaira" INTEGER NOT NULL DEFAULT 0,
  "gatewayFeeNaira" INTEGER NOT NULL DEFAULT 0,
  "taxNaira" INTEGER NOT NULL DEFAULT 0,
  "referralNaira" INTEGER NOT NULL DEFAULT 0,
  "platformNetNaira" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnlockSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnlockSettlement_unlockId_key" ON "UnlockSettlement"("unlockId");
CREATE INDEX "UnlockSettlement_videoId_createdAt_idx" ON "UnlockSettlement"("videoId", "createdAt");
CREATE INDEX "UnlockSettlement_creatorProfileId_createdAt_idx" ON "UnlockSettlement"("creatorProfileId", "createdAt");

ALTER TABLE "UnlockSettlement"
  ADD CONSTRAINT "UnlockSettlement_unlockId_fkey"
  FOREIGN KEY ("unlockId") REFERENCES "Unlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnlockSettlement"
  ADD CONSTRAINT "UnlockSettlement_videoId_fkey"
  FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnlockSettlement"
  ADD CONSTRAINT "UnlockSettlement_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FinanceConfig" ("id", "creatorSharePercent", "platformSharePercent", "gatewayFeePercent", "taxPercent", "updatedAt")
VALUES ('default', 60, 29.5, 3, 7.5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PlatformWallet" ("id", "balanceNaira", "updatedAt")
VALUES ('ace-platform', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
