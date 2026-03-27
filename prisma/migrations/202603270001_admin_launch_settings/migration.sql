-- CreateEnum
CREATE TYPE "HomePageMode" AS ENUM ('LIVE', 'LAUNCH');

-- AlterTable
ALTER TABLE "FinanceConfig"
ADD COLUMN "snackNaira" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "standardNaira" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN "premiereNaira" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "snackUsdMinor" INTEGER NOT NULL DEFAULT 149,
ADD COLUMN "standardUsdMinor" INTEGER NOT NULL DEFAULT 199,
ADD COLUMN "premiereUsdMinor" INTEGER NOT NULL DEFAULT 249,
ADD COLUMN "snackGbpMinor" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN "standardGbpMinor" INTEGER NOT NULL DEFAULT 149,
ADD COLUMN "premiereGbpMinor" INTEGER NOT NULL DEFAULT 199,
ADD COLUMN "snackCadMinor" INTEGER NOT NULL DEFAULT 199,
ADD COLUMN "standardCadMinor" INTEGER NOT NULL DEFAULT 249,
ADD COLUMN "premiereCadMinor" INTEGER NOT NULL DEFAULT 299,
ADD COLUMN "familyPassUsdMinor" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "familyPassGbpMinor" INTEGER NOT NULL DEFAULT 800,
ADD COLUMN "familyPassCadMinor" INTEGER NOT NULL DEFAULT 1300;

-- CreateTable
CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "homePageMode" "HomePageMode" NOT NULL DEFAULT 'LIVE',
  "launchTitle" TEXT NOT NULL DEFAULT 'ACE is launching soon',
  "launchMessage" TEXT NOT NULL DEFAULT 'We are getting the catalog, producers, and launch details ready.',
  "launchCountdownAt" TIMESTAMP(3),
  "launchCtaLabel" TEXT,
  "launchCtaHref" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
