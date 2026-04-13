CREATE TYPE "ReportStatementStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'ISSUED', 'PAID', 'SUPERSEDED');

CREATE TABLE "ReportStatement" (
  "id" TEXT NOT NULL,
  "reportCode" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "reportingEntity" TEXT NOT NULL,
  "rightsHolder" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "ReportStatementStatus" NOT NULL DEFAULT 'DRAFT',
  "titleCount" INTEGER NOT NULL DEFAULT 0,
  "unlockCount" INTEGER NOT NULL DEFAULT 0,
  "uniqueAccounts" INTEGER NOT NULL DEFAULT 0,
  "watchHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossNaira" INTEGER NOT NULL DEFAULT 0,
  "approvedDeductionsNaira" INTEGER NOT NULL DEFAULT 0,
  "netRevenueNaira" INTEGER NOT NULL DEFAULT 0,
  "licensorSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "platformSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creatorNaira" INTEGER NOT NULL DEFAULT 0,
  "platformNaira" INTEGER NOT NULL DEFAULT 0,
  "platformNetNaira" INTEGER NOT NULL DEFAULT 0,
  "openingBalanceNaira" INTEGER NOT NULL DEFAULT 0,
  "amountPreviouslyPaidNaira" INTEGER NOT NULL DEFAULT 0,
  "currentAmountDueNaira" INTEGER NOT NULL DEFAULT 0,
  "closingBalanceNaira" INTEGER NOT NULL DEFAULT 0,
  "exchangeRateLabel" TEXT,
  "paymentDueLabel" TEXT,
  "activeTerritories" INTEGER NOT NULL DEFAULT 0,
  "topTerritory" TEXT,
  "topDeviceType" TEXT,
  "topDeviceTypeStatus" TEXT,
  "promotionalAdjustmentsNote" TEXT,
  "contentStatus" TEXT,
  "preparedBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "issuedBy" TEXT,
  "issuedAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "statementData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReportStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportStatementItem" (
  "id" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "videoId" TEXT,
  "title" TEXT NOT NULL,
  "territoryLabel" TEXT,
  "periodLabel" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "watchHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revenueBaseNaira" INTEGER NOT NULL DEFAULT 0,
  "sharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amountDueNaira" INTEGER NOT NULL DEFAULT 0,
  "itemData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReportStatementItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportStatement_reportCode_key" ON "ReportStatement"("reportCode");
CREATE INDEX "ReportStatement_monthKey_createdAt_idx" ON "ReportStatement"("monthKey", "createdAt");
CREATE INDEX "ReportStatement_status_createdAt_idx" ON "ReportStatement"("status", "createdAt");
CREATE INDEX "ReportStatementItem_statementId_createdAt_idx" ON "ReportStatementItem"("statementId", "createdAt");

ALTER TABLE "ReportStatement"
ADD CONSTRAINT "ReportStatement_updatedAt_check"
CHECK ("updatedAt" >= "createdAt");

ALTER TABLE "ReportStatementItem"
ADD CONSTRAINT "ReportStatementItem_statementId_fkey"
FOREIGN KEY ("statementId") REFERENCES "ReportStatement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
