-- CreateTable
CREATE TABLE "VideoTechnicalMetadata" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "deliveryResolution" TEXT NOT NULL DEFAULT 'HD',
  "has4kMaster" BOOLEAN NOT NULL DEFAULT false,
  "deliveryFormat" TEXT,
  "deliveryNotes" TEXT,
  "promotionalStillKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "castCredits" JSONB,
  "crewCredits" JSONB,
  "englishSubtitlesProvided" BOOLEAN NOT NULL DEFAULT false,
  "cleanAudioMasterKey" TEXT,
  "masterDeliveryKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VideoTechnicalMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTechnicalMetadata_videoId_key" ON "VideoTechnicalMetadata"("videoId");

-- CreateIndex
CREATE INDEX "VideoTechnicalMetadata_videoId_idx" ON "VideoTechnicalMetadata"("videoId");

-- AddForeignKey
ALTER TABLE "VideoTechnicalMetadata"
ADD CONSTRAINT "VideoTechnicalMetadata_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
