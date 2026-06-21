ALTER TABLE "LiveMatch"
ADD COLUMN "youtubeVideoId" TEXT,
ADD COLUMN "youtubeChannelId" TEXT;

CREATE UNIQUE INDEX "LiveMatch_youtubeVideoId_key" ON "LiveMatch"("youtubeVideoId");
