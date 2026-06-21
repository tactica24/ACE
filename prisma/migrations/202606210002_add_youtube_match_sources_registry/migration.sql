CREATE TABLE "YouTubeMatchSource" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "channelUrl" TEXT NOT NULL,
  "sport" TEXT NOT NULL DEFAULT 'Sports',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastCheckedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "YouTubeMatchSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "YouTubeMatchSource_channelId_key" ON "YouTubeMatchSource"("channelId");
CREATE INDEX "YouTubeMatchSource_isActive_createdAt_idx" ON "YouTubeMatchSource"("isActive", "createdAt");

ALTER TABLE "YouTubeMatchSource"
ADD CONSTRAINT "YouTubeMatchSource_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
