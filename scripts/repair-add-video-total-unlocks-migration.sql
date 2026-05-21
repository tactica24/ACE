DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Video' AND column_name='totalUnlocks') THEN
      ALTER TABLE "Video" ADD COLUMN "totalUnlocks" INTEGER NOT NULL DEFAULT 0;
   END IF;
END $$;