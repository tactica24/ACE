-- CreateTable
CREATE TABLE "P2PUnlockSettlement" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "amountNaira" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "P2PUnlockSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "P2PUnlockSettlement_transferId_key" ON "P2PUnlockSettlement"("transferId");
CREATE INDEX "P2PUnlockSettlement_senderUserId_createdAt_idx" ON "P2PUnlockSettlement"("senderUserId", "createdAt");
CREATE INDEX "P2PUnlockSettlement_recipientUserId_createdAt_idx" ON "P2PUnlockSettlement"("recipientUserId", "createdAt");
CREATE INDEX "P2PUnlockSettlement_videoId_createdAt_idx" ON "P2PUnlockSettlement"("videoId", "createdAt");

-- AddForeignKey
ALTER TABLE "P2PUnlockSettlement"
  ADD CONSTRAINT "P2PUnlockSettlement_transferId_fkey"
  FOREIGN KEY ("transferId") REFERENCES "P2PTransfer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "P2PUnlockSettlement"
  ADD CONSTRAINT "P2PUnlockSettlement_senderUserId_fkey"
  FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "P2PUnlockSettlement"
  ADD CONSTRAINT "P2PUnlockSettlement_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "P2PUnlockSettlement"
  ADD CONSTRAINT "P2PUnlockSettlement_videoId_fkey"
  FOREIGN KEY ("videoId") REFERENCES "Video"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
