-- CreateEnum
CREATE TYPE "OfflinePackageStatus" AS ENUM ('PREPARING', 'READY', 'REVOKED');

-- CreateTable
CREATE TABLE "OfflinePackage" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "aceFileKey" TEXT NOT NULL,
  "wrappedKey" TEXT NOT NULL,
  "status" "OfflinePackageStatus" NOT NULL DEFAULT 'PREPARING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfflinePackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflinePackage_aceFileKey_key" ON "OfflinePackage"("aceFileKey");

-- CreateIndex
CREATE INDEX "OfflinePackage_ownerId_createdAt_idx" ON "OfflinePackage"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "OfflinePackage_videoId_createdAt_idx" ON "OfflinePackage"("videoId", "createdAt");

-- AddForeignKey
ALTER TABLE "OfflinePackage" ADD CONSTRAINT "OfflinePackage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflinePackage" ADD CONSTRAINT "OfflinePackage_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
