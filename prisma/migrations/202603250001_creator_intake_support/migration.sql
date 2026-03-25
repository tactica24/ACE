CREATE TYPE "SignupIntent" AS ENUM ('VIEWER', 'CREATOR');
CREATE TYPE "CreatorAccessStatus" AS ENUM ('NONE', 'REQUESTED', 'INVITED', 'SUBMITTED');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "SupportTicketCategory" AS ENUM (
  'PAYMENT',
  'ACCOUNT_ACCESS',
  'CATALOG_HELP',
  'CREATOR_ONBOARDING',
  'VIDEO_UPLOAD',
  'CONTRACTS',
  'OTHER'
);

ALTER TABLE "User"
  ADD COLUMN "signupIntent" "SignupIntent" NOT NULL DEFAULT 'VIEWER',
  ADD COLUMN "creatorAccessStatus" "CreatorAccessStatus" NOT NULL DEFAULT 'NONE';

UPDATE "User"
SET
  "signupIntent" = 'CREATOR',
  "creatorAccessStatus" = 'SUBMITTED'
WHERE "role" = 'CREATOR';

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
