-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'STORM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AccomplishmentReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "workArea" TEXT NOT NULL,
    "weatherCondition" "WeatherCondition" NOT NULL,
    "accomplishments" TEXT NOT NULL,
    "equipmentUsed" TEXT,
    "materialsUsed" TEXT,
    "delays" TEXT,
    "remarks" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccomplishmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPhoto" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccomplishmentReport" ADD CONSTRAINT "AccomplishmentReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccomplishmentReport" ADD CONSTRAINT "AccomplishmentReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccomplishmentReport" ADD CONSTRAINT "AccomplishmentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPhoto" ADD CONSTRAINT "ReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AccomplishmentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
