ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "entitlementAppliedAt" TIMESTAMP(3);

UPDATE "Payment"
SET "entitlementAppliedAt" = "updatedAt"
WHERE "status" = 'SUCCESS'
  AND "entitlementAppliedAt" IS NULL;
