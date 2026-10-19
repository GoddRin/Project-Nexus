-- AlterEnum
ALTER TYPE "ChunkSourceType" ADD VALUE 'SITE_REPORT';

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SiteReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "hasSafety" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "safetyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReport_projectId_reportDate_idx" ON "SiteReport"("projectId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "SiteReport_projectId_reportDate_key" ON "SiteReport"("projectId", "reportDate");

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
