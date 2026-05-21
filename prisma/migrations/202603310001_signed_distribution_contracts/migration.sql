ALTER TABLE "Contract"
  ADD COLUMN "documentHtml" TEXT,
  ADD COLUMN "producerLegalName" TEXT,
  ADD COLUMN "producerSignedName" TEXT,
  ADD COLUMN "producerAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "effectiveDate" TIMESTAMP(3),
  ADD COLUMN "producerSignedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Contract_creatorId_createdAt_idx" ON "Contract"("creatorId", "createdAt");
CREATE INDEX "Contract_videoId_createdAt_idx" ON "Contract"("videoId", "createdAt");
