ALTER TABLE "VideoTechnicalMetadata"
  ADD COLUMN IF NOT EXISTS "orchestrationProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "orchestrationJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "transcodeProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "transcodeTaskId" TEXT,
  ADD COLUMN IF NOT EXISTS "transcodeRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transcodeFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transcodeError" TEXT,
  ADD COLUMN IF NOT EXISTS "hlsManifestKey" TEXT,
  ADD COLUMN IF NOT EXISTS "hlsOutputPath" TEXT,
  ADD COLUMN IF NOT EXISTS "hlsReadyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "masterDeletionEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "masterDeletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "eventType" TEXT,
  "externalId" TEXT,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookEvent_endpoint_createdAt_idx" ON "WebhookEvent"("endpoint", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_createdAt_idx" ON "WebhookEvent"("processed", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_externalId_idx" ON "WebhookEvent"("externalId");
