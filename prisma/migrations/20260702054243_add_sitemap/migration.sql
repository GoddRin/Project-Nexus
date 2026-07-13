-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "SiteLocation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percentComplete" DOUBLE PRECISION,
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteLocationEngineer" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "SiteLocationEngineer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteLocationPhoto" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLocationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteLocation_projectId_slug_key" ON "SiteLocation"("projectId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SiteLocationEngineer_locationId_userId_key" ON "SiteLocationEngineer"("locationId", "userId");

-- AddForeignKey
ALTER TABLE "SiteLocation" ADD CONSTRAINT "SiteLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLocationEngineer" ADD CONSTRAINT "SiteLocationEngineer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SiteLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLocationEngineer" ADD CONSTRAINT "SiteLocationEngineer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLocationPhoto" ADD CONSTRAINT "SiteLocationPhoto_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SiteLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLocationPhoto" ADD CONSTRAINT "SiteLocationPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
