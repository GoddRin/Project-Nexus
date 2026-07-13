import { PageHeader } from "@/components/shared/PageHeader";
import { prisma } from "@/lib/db/prisma";
import { requireProjectMember } from "@/lib/auth/index";
import { NetworkDeviceType } from "@prisma/client";
import { Router, Wifi, Server, Network, Radio, Link, Shield, Box, HelpCircle, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import LinkComponent from "next/link";

const iconMap: Record<NetworkDeviceType, React.ElementType> = {
  ROUTER: Router,
  SWITCH: Network,
  FIREWALL: Shield,
  ACCESS_POINT: Wifi,
  STARLINK: Radio,
  PATCH_PANEL: Link,
  SERVER: Server,
  NVR: Box,
  UPS: HardDrive,
  OTHER: HelpCircle,
};

export default async function NetworkPage() {
  const membership = await requireProjectMember();
  const canManage = membership.role === "IT_SUPPORT" || membership.role === "ADMINISTRATOR";

  const devices = await prisma.networkDevice.findMany({
    where: { projectId: membership.projectId },
    include: { rack: true },
    orderBy: { createdAt: 'desc' }
  });

  const typeCounts = devices.reduce((acc, dev) => {
    acc[dev.deviceType] = (acc[dev.deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const types = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="relative">
      <PageHeader 
        title="Network Infrastructure" 
        subtitle="Manage physical network devices, IP addresses, and routing."
      >
        {canManage && (
          <LinkComponent href="/dashboard/network/devices/new">
            <button className="px-4 py-2 bg-flow-teal text-bg-base font-semibold rounded-md hover:bg-flow-teal/90 transition-colors">
              Add Device
            </button>
          </LinkComponent>
        )}
      </PageHeader>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-white/10">
        <LinkComponent href="/dashboard/network/racks" className="glass-card shrink-0 px-6 py-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors border border-flow-teal/20">
          <Server className="h-8 w-8 text-flow-teal" />
          <div>
            <h3 className="font-semibold text-text-primary">Rack Layouts</h3>
            <p className="text-xs text-text-muted">View physical cabinets</p>
          </div>
        </LinkComponent>
        <LinkComponent href="/dashboard/network/subnets" className="glass-card shrink-0 px-6 py-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors border border-signal-amber/20">
          <Network className="h-8 w-8 text-signal-amber" />
          <div>
            <h3 className="font-semibold text-text-primary">Subnets & IPs</h3>
            <p className="text-xs text-text-muted">View VLANs and CIDR blocks</p>
          </div>
        </LinkComponent>

        {types.map(([type, count]) => {
          const Icon = iconMap[type as NetworkDeviceType] || HelpCircle;
          return (
            <div key={type} className="glass-card shrink-0 px-6 py-4 flex items-center gap-4">
              <Icon className="h-8 w-8 text-text-muted opacity-80" />
              <div>
                <h3 className="font-semibold text-text-primary capitalize">{type.replace("_", " ")}</h3>
                <p className="text-xl font-display font-bold text-white">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">All Devices</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => {
            const Icon = iconMap[device.deviceType] || HelpCircle;
            const isOffline = device.status === "OFFLINE";
            const isMaintenance = device.status === "MAINTENANCE";

            return (
              <LinkComponent 
                key={device.id} 
                href={`/dashboard/network/devices/${device.id}`}
                className={cn(
                  "glass-card p-5 transition-all duration-300 hover:bg-white/[0.04] block border-l-4",
                  isOffline ? "border-l-signal-red" : isMaintenance ? "border-l-signal-amber" : "border-l-flow-teal/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white/[0.05] p-2 ring-1 ring-white/10">
                      <Icon className="h-5 w-5 text-text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-wide text-text-primary">{device.hostname}</h3>
                      <p className="text-xs text-text-muted">{device.ipAddress || "No IP"}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    isOffline ? "bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30" : 
                    isMaintenance ? "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30" : 
                    "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30"
                  )}>
                    {device.status}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div className="rounded bg-white/[0.02] px-3 py-2">
                    <span className="block font-medium text-text-primary">{device.brand} {device.model}</span>
                    Model
                  </div>
                  <div className="rounded bg-white/[0.02] px-3 py-2 truncate">
                    <span className="block font-medium text-text-primary truncate">{device.location}</span>
                    Location
                  </div>
                </div>
              </LinkComponent>
            );
          })}
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <Network className="mx-auto h-12 w-12 text-white/10 mb-4" />
        <h3 className="text-lg font-medium text-text-primary">Interactive Topology</h3>
        <p className="text-sm text-text-muted mt-2">Interactive network topology diagram — coming in Phase 4.</p>
      </div>
    </div>
  );
}
