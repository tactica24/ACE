CREATE TABLE "WatchHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "progressSec" INTEGER NOT NULL DEFAULT 0,
  "durationSec" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WatchHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchHistory_userId_videoId_key" ON "WatchHistory"("userId", "videoId");
CREATE INDEX "WatchHistory_userId_updatedAt_idx" ON "WatchHistory"("userId", "updatedAt");

ALTER TABLE "WatchHistory"
ADD CONSTRAINT "WatchHistory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WatchHistory"
ADD CONSTRAINT "WatchHistory_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
