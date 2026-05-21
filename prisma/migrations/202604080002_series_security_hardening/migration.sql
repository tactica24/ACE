ALTER TABLE "Video"
ADD COLUMN "seriesId" TEXT,
ADD COLUMN "seasonNumber" INTEGER,
ADD COLUMN "episodeNumber" INTEGER;

ALTER TABLE "Video"
ALTER COLUMN "r2Key" DROP NOT NULL;

ALTER TABLE "Video"
ADD CONSTRAINT "Video_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "Video"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Video_seriesId_seasonNumber_episodeNumber_idx"
ON "Video"("seriesId", "seasonNumber", "episodeNumber");

CREATE UNIQUE INDEX "Video_seriesId_seasonNumber_episodeNumber_key"
ON "Video"("seriesId", "seasonNumber", "episodeNumber");

UPDATE "Wallet"
SET "credits" = "credits" * 2
WHERE "credits" <> 0;

UPDATE "SubscriptionPass"
SET "creditsRemaining" = "creditsRemaining" * 2
WHERE "creditsRemaining" <> 0;

UPDATE "AdminSupportAction"
SET
  "creditsDelta" = "creditsDelta" * 2,
  "resultingCredits" = CASE
    WHEN "resultingCredits" IS NULL THEN NULL
    ELSE "resultingCredits" * 2
  END
WHERE "creditsDelta" <> 0 OR "resultingCredits" IS NOT NULL;
