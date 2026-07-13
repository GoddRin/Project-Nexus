"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireProjectMember } from "@/lib/auth/index";
import { NetworkDeviceStatus, NetworkDeviceType } from "@prisma/client";

async function requireITOrAdmin(projectId: string) {
  const membership = await requireProjectMember(projectId);
  
  if (membership.role !== "IT_SUPPORT" && membership.role !== "ADMINISTRATOR") {
    throw new Error("Unauthorized. Only IT Support and Administrators can modify network infrastructure.");
  }
  return membership.dbUser;
}

export async function createDevice(projectId: string, data: {
  hostname: string;
  deviceType: NetworkDeviceType;
  ipAddress?: string;
  macAddress?: string;
  brand?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  rackId?: string;
  rackUnit?: number;
  vlan?: string;
  uplink?: string;
  notes?: string;
}) {
  await requireITOrAdmin(projectId);

  await prisma.networkDevice.create({
    data: {
      projectId,
      ...data,
      status: "ONLINE", // default
    }
  });

  revalidatePath("/dashboard/network");
}

export async function updateDeviceStatus(deviceId: string, status: NetworkDeviceStatus) {
  const device = await prisma.networkDevice.findUnique({
    where: { id: deviceId },
    select: { projectId: true }
  });

  if (!device) throw new Error("Device not found");
  
  await requireITOrAdmin(device.projectId);

  await prisma.networkDevice.update({
    where: { id: deviceId },
    data: { status }
  });

  revalidatePath("/dashboard/network");
  revalidatePath(`/dashboard/network/devices/${deviceId}`);
}

export async function deleteDevice(deviceId: string) {
  const device = await prisma.networkDevice.findUnique({
    where: { id: deviceId },
    include: { ports: true }
  });

  if (!device) throw new Error("Device not found");

  await requireITOrAdmin(device.projectId);

  if (device.ports.length > 0) {
    throw new Error("Cannot delete device with registered ports. Remove ports first.");
  }

  await prisma.networkDevice.delete({
    where: { id: deviceId }
  });

  revalidatePath("/dashboard/network");
}

export async function createRack(projectId: string, data: {
  name: string;
  location: string;
  totalUnits?: number;
}) {
  await requireITOrAdmin(projectId);

  await prisma.networkRack.create({
    data: {
      projectId,
      name: data.name,
      location: data.location,
      totalUnits: data.totalUnits || 42,
    }
  });

  revalidatePath("/dashboard/network/racks");
}

export async function createSubnet(projectId: string, data: {
  name: string;
  cidr: string;
  gateway?: string;
  vlanId?: number;
  description?: string;
}) {
  await requireITOrAdmin(projectId);

  await prisma.networkSubnet.create({
    data: {
      projectId,
      ...data,
    }
  });

  revalidatePath("/dashboard/network/subnets");
}
