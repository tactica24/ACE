ALTER TABLE "Contract"
  ADD COLUMN "platformSignatureKey" TEXT,
  ADD COLUMN "producerSignatureKey" TEXT;

ALTER TABLE "SiteSettings"
  ADD COLUMN "platformSignatureKey" TEXT;
