ALTER TABLE "Video"
ADD COLUMN "originalLanguage" TEXT DEFAULT 'en',
ADD COLUMN "audioLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "SubtitleTrack" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "languageCode" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'subtitles',
  "fileKey" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubtitleTrack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubtitleTrack_videoId_languageCode_idx" ON "SubtitleTrack"("videoId", "languageCode");

ALTER TABLE "SubtitleTrack"
ADD CONSTRAINT "SubtitleTrack_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
