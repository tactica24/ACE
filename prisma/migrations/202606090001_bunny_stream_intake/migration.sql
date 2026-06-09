ALTER TABLE "VideoTechnicalMetadata"
  ADD COLUMN IF NOT EXISTS "bunnyStreamLibraryId" TEXT,
  ADD COLUMN IF NOT EXISTS "bunnyStreamVideoId" TEXT,
  ADD COLUMN IF NOT EXISTS "bunnyStreamStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "bunnyStreamReadyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bunnyStreamError" TEXT,
  ADD COLUMN IF NOT EXISTS "trailerStreamLibraryId" TEXT,
  ADD COLUMN IF NOT EXISTS "trailerStreamVideoId" TEXT,
  ADD COLUMN IF NOT EXISTS "trailerStreamStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "trailerStreamReadyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trailerStreamError" TEXT;
