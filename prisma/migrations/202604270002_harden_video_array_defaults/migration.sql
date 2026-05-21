UPDATE "Video"
SET
  "audioLanguages" = COALESCE("audioLanguages", ARRAY[]::TEXT[]),
  "contentWarnings" = COALESCE("contentWarnings", ARRAY[]::TEXT[]),
  "genres" = COALESCE("genres", ARRAY[]::TEXT[]),
  "tags" = COALESCE("tags", ARRAY[]::TEXT[]),
  "highlightSeconds" = COALESCE("highlightSeconds", ARRAY[]::INTEGER[]);

ALTER TABLE "Video"
  ALTER COLUMN "audioLanguages" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "audioLanguages" SET NOT NULL,
  ALTER COLUMN "contentWarnings" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "contentWarnings" SET NOT NULL,
  ALTER COLUMN "genres" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "genres" SET NOT NULL,
  ALTER COLUMN "tags" SET NOT NULL,
  ALTER COLUMN "highlightSeconds" SET DEFAULT ARRAY[]::INTEGER[],
  ALTER COLUMN "highlightSeconds" SET NOT NULL;
