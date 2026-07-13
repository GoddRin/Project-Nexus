-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('CIVIL', 'MECHANICAL', 'ELECTRICAL', 'TESTING', 'DOCUMENTATION', 'REGULATORY');

-- CreateEnum
CREATE TYPE "MilestoneStatus2" AS ENUM ('LOCKED', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "targetCodDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CodMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "MilestoneCategory" NOT NULL,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "MilestoneStatus2" NOT NULL DEFAULT 'LOCKED',
    "order" INTEGER NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodMilestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodMilestone" ADD CONSTRAINT "CodMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
