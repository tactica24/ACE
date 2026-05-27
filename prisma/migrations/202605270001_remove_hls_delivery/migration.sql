-- Remove the abandoned HLS delivery path while keeping existing titles recoverable
-- through the MP4 validation flow.
UPDATE "Video"
SET "status" = 'PENDING'
WHERE "status" = 'HLS_UPLOADED';

ALTER TABLE "Video"
  DROP COLUMN IF EXISTS "hlsUrl",
  DROP COLUMN IF EXISTS "hlsVersion";

ALTER TABLE "VideoTechnicalMetadata"
  DROP COLUMN IF EXISTS "hlsUploadedAt",
  DROP COLUMN IF EXISTS "hlsPlaybackUrl",
  DROP COLUMN IF EXISTS "hlsVerifiedAt";

CREATE TYPE "VideoStatus_new" AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'MASTER_UPLOADED',
  'PROCESSING',
  'READY',
  'PUBLISHED',
  'ARCHIVED'
);

ALTER TABLE "Video" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Video"
  ALTER COLUMN "status" TYPE "VideoStatus_new"
  USING ("status"::text::"VideoStatus_new");
ALTER TYPE "VideoStatus" RENAME TO "VideoStatus_old";
ALTER TYPE "VideoStatus_new" RENAME TO "VideoStatus";
DROP TYPE "VideoStatus_old";
ALTER TABLE "Video" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
