-- AlterTable
ALTER TABLE "VideoTechnicalMetadata" ADD COLUMN "masterUploadKey" TEXT;
ALTER TABLE "VideoTechnicalMetadata" ADD COLUMN "masterProcessingStatus" TEXT;
ALTER TABLE "VideoTechnicalMetadata" ADD COLUMN "hlsPlaybackUrl" TEXT;