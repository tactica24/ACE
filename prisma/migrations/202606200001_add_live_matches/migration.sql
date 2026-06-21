-- CreateEnum
CREATE TYPE "LiveMatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'ENDED', 'POSTPONED');

-- CreateTable
CREATE TABLE "LiveMatch" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sport" TEXT NOT NULL DEFAULT 'Football',
  "competition" TEXT NOT NULL,
  "homeTeam" TEXT NOT NULL,
  "awayTeam" TEXT NOT NULL,
  "kickoffAt" TIMESTAMP(3) NOT NULL,
  "status" "LiveMatchStatus" NOT NULL DEFAULT 'UPCOMING',
  "embedUrl" TEXT NOT NULL,
  "posterUrl" TEXT,
  "description" TEXT,
  "venue" TEXT,
  "sourceLabel" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveChatProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "avatarEmoji" TEXT NOT NULL DEFAULT '⚽',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveChatProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveChatMessage" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveChatReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveChatReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveMatch_slug_key" ON "LiveMatch"("slug");
CREATE INDEX "LiveMatch_isPublished_status_kickoffAt_idx" ON "LiveMatch"("isPublished", "status", "kickoffAt");
CREATE INDEX "LiveMatch_createdAt_idx" ON "LiveMatch"("createdAt");
CREATE UNIQUE INDEX "LiveChatProfile_userId_key" ON "LiveChatProfile"("userId");
CREATE UNIQUE INDEX "LiveChatProfile_handle_key" ON "LiveChatProfile"("handle");
CREATE INDEX "LiveChatMessage_matchId_createdAt_idx" ON "LiveChatMessage"("matchId", "createdAt");
CREATE INDEX "LiveChatMessage_userId_createdAt_idx" ON "LiveChatMessage"("userId", "createdAt");
CREATE INDEX "LiveChatMessage_parentId_idx" ON "LiveChatMessage"("parentId");
CREATE UNIQUE INDEX "LiveChatReaction_messageId_userId_emoji_key" ON "LiveChatReaction"("messageId", "userId", "emoji");
CREATE INDEX "LiveChatReaction_messageId_idx" ON "LiveChatReaction"("messageId");

ALTER TABLE "LiveMatch" ADD CONSTRAINT "LiveMatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LiveChatProfile" ADD CONSTRAINT "LiveChatProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "LiveMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LiveChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveChatReaction" ADD CONSTRAINT "LiveChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "LiveChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatReaction" ADD CONSTRAINT "LiveChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
