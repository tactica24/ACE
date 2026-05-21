ALTER TABLE "FinanceConfig"
ALTER COLUMN "snackNaira" SET DEFAULT 50,
ALTER COLUMN "standardNaira" SET DEFAULT 50,
ALTER COLUMN "premiereNaira" SET DEFAULT 50;

UPDATE "FinanceConfig"
SET
  "snackNaira" = 50,
  "standardNaira" = 50,
  "premiereNaira" = 50,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'default';

UPDATE "Video"
SET "unlockPrice" = NULL
WHERE "unlockPrice" IS NOT NULL;
