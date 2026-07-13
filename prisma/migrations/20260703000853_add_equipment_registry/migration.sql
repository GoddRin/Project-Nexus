-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('TURBINE', 'GENERATOR', 'TRANSFORMER', 'GOVERNOR', 'EXCITATION_SYSTEM', 'CIRCUIT_BREAKER', 'PROTECTION_RELAY', 'GATE_VALVE', 'CRANE_HOIST', 'SCADA_PLC', 'METERING_PANEL', 'DC_SYSTEM', 'FIRE_SUPPRESSION', 'DIESEL_GENERATOR', 'PUMP', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('INSTALLED', 'COMMISSIONED', 'UNDER_MAINTENANCE', 'DECOMMISSIONED', 'PENDING_DELIVERY');

-- CreateEnum
CREATE TYPE "EquipmentCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- CreateTable
CREATE TABLE "PlantEquipment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "equipmentTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installationDate" TIMESTAMP(3),
    "commissionDate" TIMESTAMP(3),
    "location" TEXT,
    "siteLocationId" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'INSTALLED',
    "condition" "EquipmentCondition" NOT NULL DEFAULT 'GOOD',
    "specifications" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDocument" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentMaintenanceLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "actionTaken" TEXT,
    "nextServiceDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentMaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlantEquipment" ADD CONSTRAINT "PlantEquipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantEquipment" ADD CONSTRAINT "PlantEquipment_siteLocationId_fkey" FOREIGN KEY ("siteLocationId") REFERENCES "SiteLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantEquipment" ADD CONSTRAINT "PlantEquipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "PlantEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceLog" ADD CONSTRAINT "EquipmentMaintenanceLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "PlantEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceLog" ADD CONSTRAINT "EquipmentMaintenanceLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
