DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Video' AND column_name = 'r2Key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Video' AND column_name = 'primaryStorageKey'
  ) THEN
    ALTER TABLE "Video" RENAME COLUMN "r2Key" TO "primaryStorageKey";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Video' AND column_name = 'fallbackR2Key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Video' AND column_name = 'fallbackStorageKey'
  ) THEN
    ALTER TABLE "Video" RENAME COLUMN "fallbackR2Key" TO "fallbackStorageKey";
  END IF;
END $$;
