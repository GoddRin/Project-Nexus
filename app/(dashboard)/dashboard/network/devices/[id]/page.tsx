import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireProjectMember } from "@/lib/auth/index";
import { cn } from "@/lib/utils";
import { Server, Activity, Hash, Layers, Save } from "lucide-react";
import { NetworkDeviceStatus } from "@prisma/client";

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const membership = await requireProjectMember();
  
  const device = await prisma.networkDevice.findUnique({
    where: { 
      id: resolvedParams.id,
      projectId: membership.projectId
    },
    include: {
      rack: true,
      ports: {
        orderBy: { portNumber: "asc" }
      }
    }
  });

  if (!device) notFound();

  const isOffline = device.status === "OFFLINE";
  const isMaintenance = device.status === "MAINTENANCE";

  return (
    <div className="relative space-y-6">
      <PageHeader 
        title={device.hostname}
        subtitle={`${device.brand || "Unknown Brand"} ${device.model || ""}`}
      >
        <a href={`/dashboard/network/devices/${device.id}/edit`} className="px-4 py-2 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-colors">
          Edit Device
        </a>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-flow-teal" />
              Device Information
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Type</p>
                <p className="font-medium text-text-primary capitalize">{device.deviceType.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">IP Address</p>
                <p className="font-medium text-text-primary">{device.ipAddress || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">MAC Address</p>
                <p className="font-mono text-text-primary">{device.macAddress || "Unknown"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">VLAN</p>
                <p className="font-medium text-text-primary">{device.vlan || "None"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Firmware</p>
                <p className="font-medium text-text-primary">{device.firmwareVersion || "Unknown"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Uplink</p>
                <p className="font-medium text-text-primary">{device.uplink || "None"}</p>
              </div>
            </div>

            {device.notes && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Notes</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{device.notes}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
                <Activity className="h-5 w-5 text-flow-teal" />
                Port Map
              </h3>
            </div>
            
            {device.ports.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.02]">
                <p className="text-sm text-text-muted">No ports documented for this device.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {device.ports.map(port => (
                  <div key={port.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded flex items-center justify-center font-mono text-xs font-bold",
                        port.status === "ACTIVE" ? "bg-flow-teal/20 text-flow-teal" :
                        port.status === "UPLINK" ? "bg-purple-500/20 text-purple-400" :
                        "bg-white/5 text-text-muted"
                      )}>
                        {port.portNumber}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{port.connectedTo || "Empty"}</p>
                        <div className="flex gap-2 text-xs text-text-muted">
                          {port.vlan && <span>{port.vlan}</span>}
                          {port.vlan && port.speed && <span>&bull;</span>}
                          {port.speed && <span>{port.speed}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cn(
            "glass-card p-6 border-t-4",
            isOffline ? "border-t-signal-red" : isMaintenance ? "border-t-signal-amber" : "border-t-flow-teal"
          )}>
            <p className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-2">Current Status</p>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-3 w-3 rounded-full animate-pulse",
                isOffline ? "bg-signal-red" : isMaintenance ? "bg-signal-amber" : "bg-flow-teal"
              )} />
              <span className={cn(
                "font-display text-2xl font-bold",
                isOffline ? "text-signal-red" : isMaintenance ? "text-signal-amber" : "text-flow-teal"
              )}>
                {device.status}
              </span>
            </div>
            
            {/* Minimal inline form for status update (IT/Admin only) */}
            {(membership.role === "IT_SUPPORT" || membership.role === "ADMINISTRATOR") && (
              <form className="mt-4 pt-4 border-t border-white/10" action={async (formData) => {
                "use server";
                const { updateDeviceStatus } = await import("../../actions");
                await updateDeviceStatus(device.id, formData.get("status") as NetworkDeviceStatus);
              }}>
                <label className="text-xs text-text-muted mb-2 block">Quick Update Status</label>
                <div className="flex gap-2">
                  <select name="status" defaultValue={device.status} className="flex-1 bg-white/[0.03] border border-white/10 rounded px-3 py-1.5 text-sm text-text-primary outline-none focus:border-flow-teal">
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                  </select>
                  <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded px-3 py-1.5 transition-colors">
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-flow-teal" />
              Physical Location
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Location Area</p>
                <p className="font-medium text-text-primary">{device.location || "Not specified"}</p>
              </div>
              
              {device.rack && (
                <div className="p-4 rounded-lg bg-bg-panel-raised border border-white/5">
                  <p className="text-text-muted mb-1 text-xs uppercase tracking-wider font-semibold">Rack Assignment</p>
                  <p className="font-medium text-text-primary mb-2">{device.rack.name}</p>
                  
                  {device.rackUnit ? (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-flow-teal" />
                      <span className="text-sm font-semibold text-flow-teal">Unit {device.rackUnit}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-text-muted">No U-position assigned</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
