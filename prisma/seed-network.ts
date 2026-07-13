import { config } from "dotenv";
config();
import { NetworkDeviceType } from "@prisma/client";
import { prisma } from "../lib/db/prisma";

async function main() {

  
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("No project found. Please seed a project first.");
    return;
  }
  const pid = project.id;

  // Clear existing
  await prisma.networkPort.deleteMany();
  await prisma.networkDevice.deleteMany();
  await prisma.networkRack.deleteMany();
  await prisma.networkSubnet.deleteMany();

  // Create Subnets
  await prisma.networkSubnet.create({
    data: {
      projectId: pid,
      name: "Management VLAN",
      cidr: "192.168.10.0/24",
      gateway: "192.168.10.1",
      vlanId: 10,
      description: "Network hardware, servers, and switches",
    }
  });

  await prisma.networkSubnet.create({
    data: {
      projectId: pid,
      name: "Operations & SCADA",
      cidr: "192.168.20.0/24",
      gateway: "192.168.20.1",
      vlanId: 20,
      description: "SCADA systems, PLCs, industrial controllers",
    }
  });

  await prisma.networkSubnet.create({
    data: {
      projectId: pid,
      name: "CCTV Network",
      cidr: "192.168.30.0/24",
      gateway: "192.168.30.1",
      vlanId: 30,
      description: "Site security cameras and NVRs",
    }
  });

  // Create Racks
  const serverRack = await prisma.networkRack.create({
    data: {
      projectId: pid,
      name: "Server Room Rack A",
      location: "Admin Bldg - Server Room",
      totalUnits: 42,
    }
  });

  const phRack = await prisma.networkRack.create({
    data: {
      projectId: pid,
      name: "Powerhouse Wall Rack",
      location: "Powerhouse - Operations Deck",
      totalUnits: 12,
    }
  });

  // Create Devices
  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "RT-MAIN-01",
      deviceType: NetworkDeviceType.ROUTER,
      ipAddress: "192.168.10.1",
      macAddress: "DC:2C:6E:XX:XX:XX",
      brand: "MikroTik",
      model: "RB4011iGS+RM",
      firmwareVersion: "RouterOS 7.12.1",
      location: "Admin Bldg - Server Room",
      rackId: serverRack.id,
      rackUnit: 42,
      vlan: "VLAN10",
      status: "ONLINE",
      notes: "Main site router handling ISP load balancing",
    }
  });

  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "ISP-STARLINK-01",
      deviceType: NetworkDeviceType.STARLINK,
      ipAddress: "192.168.100.1",
      brand: "SpaceX",
      model: "Starlink High Performance",
      location: "Admin Bldg - Roof",
      uplink: "RT-MAIN-01 eth1",
      status: "ONLINE",
      notes: "Primary WAN connection",
    }
  });

  const coreSwitch = await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "SW-CORE-01",
      deviceType: NetworkDeviceType.SWITCH,
      ipAddress: "192.168.10.2",
      brand: "Ubiquiti",
      model: "USW-Pro-48-PoE",
      firmwareVersion: "6.6.61",
      location: "Admin Bldg - Server Room",
      rackId: serverRack.id,
      rackUnit: 40,
      vlan: "VLAN10",
      uplink: "RT-MAIN-01 sfp-sfpplus1",
      status: "ONLINE",
    }
  });

  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "SW-PH-01",
      deviceType: NetworkDeviceType.SWITCH,
      ipAddress: "192.168.10.3",
      brand: "Ubiquiti",
      model: "USW-24-PoE",
      location: "Powerhouse - Operations Deck",
      rackId: phRack.id,
      rackUnit: 10,
      vlan: "VLAN10",
      uplink: "SW-CORE-01 port 48 (Fiber)",
      status: "ONLINE",
    }
  });

  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "AP-ADMIN-01",
      deviceType: NetworkDeviceType.ACCESS_POINT,
      ipAddress: "192.168.10.11",
      brand: "Ubiquiti",
      model: "U6-Pro",
      location: "Admin Bldg - Hallway",
      uplink: "SW-CORE-01 port 5",
      status: "ONLINE",
    }
  });

  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "AP-POWERHOUSE-01",
      deviceType: NetworkDeviceType.ACCESS_POINT,
      ipAddress: "192.168.10.12",
      brand: "Ubiquiti",
      model: "U6-LR",
      location: "Powerhouse - Ceiling",
      uplink: "SW-PH-01 port 1",
      status: "MAINTENANCE",
      notes: "Awaiting replacement mounting bracket",
    }
  });

  await prisma.networkDevice.create({
    data: {
      projectId: pid,
      hostname: "SRV-SCADA-01",
      deviceType: NetworkDeviceType.SERVER,
      ipAddress: "192.168.20.10",
      brand: "Dell",
      model: "PowerEdge R440",
      location: "Admin Bldg - Server Room",
      rackId: serverRack.id,
      rackUnit: 30,
      vlan: "VLAN20",
      uplink: "SW-CORE-01 port 10",
      status: "ONLINE",
    }
  });

  // Create Ports for Core Switch
  await prisma.networkPort.createMany({
    data: [
      {
        deviceId: coreSwitch.id,
        portNumber: "1",
        connectedTo: "Admin PC 1",
        vlan: "VLAN20",
        speed: "1Gbps",
        status: "ACTIVE"
      },
      {
        deviceId: coreSwitch.id,
        portNumber: "5",
        connectedTo: "AP-ADMIN-01",
        vlan: "VLAN10",
        speed: "1Gbps",
        status: "ACTIVE"
      },
      {
        deviceId: coreSwitch.id,
        portNumber: "10",
        connectedTo: "SRV-SCADA-01 (eth0)",
        vlan: "VLAN20",
        speed: "1Gbps",
        status: "ACTIVE"
      },
      {
        deviceId: coreSwitch.id,
        portNumber: "48",
        connectedTo: "SW-PH-01 (Fiber trunk)",
        vlan: "ALL",
        speed: "10Gbps",
        status: "UPLINK"
      }
    ]
  });

  console.log("Seeded network infrastructure documentation data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
