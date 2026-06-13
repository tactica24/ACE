CREATE TABLE IF NOT EXISTS "PlaybackSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastProgressAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "progressSeconds" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlaybackSession_userId_startedAt_idx" ON "PlaybackSession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "PlaybackSession_videoId_startedAt_idx" ON "PlaybackSession"("videoId", "startedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PlaybackSession_userId_fkey'
  ) THEN
    ALTER TABLE "PlaybackSession"
      ADD CONSTRAINT "PlaybackSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PlaybackSession_videoId_fkey'
  ) THEN
    ALTER TABLE "PlaybackSession"
      ADD CONSTRAINT "PlaybackSession_videoId_fkey"
      FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
