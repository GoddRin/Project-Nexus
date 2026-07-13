-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GUARD';

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "purpose" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "vehicle" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "loggedById" TEXT NOT NULL,
    "timeIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOut" TIMESTAMP(3),
    "status" "VisitorStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
