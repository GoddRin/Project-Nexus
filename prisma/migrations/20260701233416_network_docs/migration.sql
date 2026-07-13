-- CreateEnum
CREATE TYPE "NetworkDeviceType" AS ENUM ('ROUTER', 'SWITCH', 'FIREWALL', 'ACCESS_POINT', 'STARLINK', 'PATCH_PANEL', 'SERVER', 'NVR', 'UPS', 'OTHER');

-- CreateEnum
CREATE TYPE "NetworkDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "PortStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UPLINK');

-- CreateTable
CREATE TABLE "NetworkDevice" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "deviceType" "NetworkDeviceType" NOT NULL,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "location" TEXT,
    "rackId" TEXT,
    "rackUnit" INTEGER,
    "vlan" TEXT,
    "uplink" TEXT,
    "status" "NetworkDeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkPort" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "portNumber" TEXT NOT NULL,
    "connectedTo" TEXT,
    "vlan" TEXT,
    "speed" TEXT,
    "status" "PortStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,

    CONSTRAINT "NetworkPort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkRack" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 42,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkRack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkSubnet" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "gateway" TEXT,
    "vlanId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkSubnet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NetworkDevice" ADD CONSTRAINT "NetworkDevice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkDevice" ADD CONSTRAINT "NetworkDevice_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "NetworkRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkPort" ADD CONSTRAINT "NetworkPort_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "NetworkDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkRack" ADD CONSTRAINT "NetworkRack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkSubnet" ADD CONSTRAINT "NetworkSubnet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
