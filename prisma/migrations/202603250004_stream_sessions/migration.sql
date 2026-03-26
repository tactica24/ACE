CREATE TABLE "StreamSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceSessionId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "StreamSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreamSession_userId_deviceSessionId_key" ON "StreamSession"("userId", "deviceSessionId");
CREATE INDEX "StreamSession_userId_lastSeenAt_idx" ON "StreamSession"("userId", "lastSeenAt");
CREATE INDEX "StreamSession_videoId_lastSeenAt_idx" ON "StreamSession"("videoId", "lastSeenAt");

ALTER TABLE "StreamSession"
ADD CONSTRAINT "StreamSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StreamSession"
ADD CONSTRAINT "StreamSession_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
