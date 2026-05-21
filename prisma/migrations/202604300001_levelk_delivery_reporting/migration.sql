ALTER TABLE "VideoTechnicalMetadata"
  ADD COLUMN "vendorId" TEXT,
  ADD COLUMN "studioReleaseTitle" TEXT,
  ADD COLUMN "countriesOfOrigin" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "productionCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "copyrightLine" TEXT,
  ADD COLUMN "licensedTerritories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "localizations" JSONB,
  ADD COLUMN "productAvailability" JSONB,
  ADD COLUMN "landscapeArtworkKey" TEXT,
  ADD COLUMN "masterKey" TEXT,
  ADD COLUMN "masterFileName" TEXT,
  ADD COLUMN "masterFileSize" INTEGER,
  ADD COLUMN "masterUploadedAt" TIMESTAMP(3),
  ADD COLUMN "processingStatus" TEXT NOT NULL DEFAULT 'NO_MASTER',
  ADD COLUMN "encodingStartedAt" TIMESTAMP(3),
  ADD COLUMN "encodingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "hlsUploadedAt" TIMESTAMP(3),
  ADD COLUMN "hlsVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "readyToStreamAt" TIMESTAMP(3),
  ADD COLUMN "playbackUrl" TEXT;

CREATE INDEX "VideoTechnicalMetadata_vendorId_idx" ON "VideoTechnicalMetadata"("vendorId");
