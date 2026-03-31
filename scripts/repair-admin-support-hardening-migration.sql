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

CREATE TABLE IF NOT EXISTS "AdminSupportAction" (
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

CREATE INDEX IF NOT EXISTS "AdminSupportAction_userId_createdAt_idx" ON "AdminSupportAction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminSupportAction_adminUserId_createdAt_idx" ON "AdminSupportAction"("adminUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminSupportAction_paymentId_createdAt_idx" ON "AdminSupportAction"("paymentId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "AdminSupportAction"
    ADD CONSTRAINT "AdminSupportAction_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AdminSupportAction"
    ADD CONSTRAINT "AdminSupportAction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AdminSupportAction"
    ADD CONSTRAINT "AdminSupportAction_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'phoneVerified'
  ) THEN
    EXECUTE $dedupe$
      WITH ranked_users AS (
        SELECT
          id,
          phone,
          ROW_NUMBER() OVER (
            PARTITION BY phone
            ORDER BY
              "phoneVerified" DESC,
              ("firebaseUid" IS NOT NULL) DESC,
              CASE "role" WHEN 'ADMIN' THEN 2 WHEN 'CREATOR' THEN 1 ELSE 0 END DESC,
              "createdAt" ASC,
              id ASC
          ) AS duplicate_rank
        FROM "User"
      ),
      duplicate_users AS (
        SELECT
          id,
          phone
        FROM ranked_users
        WHERE duplicate_rank > 1
      )
      UPDATE "User" AS u
      SET phone = CONCAT(duplicate_users.phone, '__dedup__', u.id)
      FROM duplicate_users
      WHERE u.id = duplicate_users.id
        AND u.phone = duplicate_users.phone
    $dedupe$;
  ELSE
    EXECUTE $dedupe$
      WITH ranked_users AS (
        SELECT
          id,
          phone,
          ROW_NUMBER() OVER (
            PARTITION BY phone
            ORDER BY
              ("firebaseUid" IS NOT NULL) DESC,
              CASE "role" WHEN 'ADMIN' THEN 2 WHEN 'CREATOR' THEN 1 ELSE 0 END DESC,
              "createdAt" ASC,
              id ASC
          ) AS duplicate_rank
        FROM "User"
      ),
      duplicate_users AS (
        SELECT
          id,
          phone
        FROM ranked_users
        WHERE duplicate_rank > 1
      )
      UPDATE "User" AS u
      SET phone = CONCAT(duplicate_users.phone, '__dedup__', u.id)
      FROM duplicate_users
      WHERE u.id = duplicate_users.id
        AND u.phone = duplicate_users.phone
    $dedupe$;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Unlock_userId_videoId_key" ON "Unlock"("userId", "videoId");
