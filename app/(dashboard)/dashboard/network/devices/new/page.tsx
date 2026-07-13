import { prisma } from "@/lib/db/prisma";
import { requireProjectMember } from "@/lib/auth/index";
import { PageHeader } from "@/components/shared/PageHeader";
import { NetworkDeviceType } from "@prisma/client";
import { Cpu, Hash, Tag } from "lucide-react";

export default async function NewDevicePage() {
  const membership = await requireProjectMember();

  if (membership.role !== "IT_SUPPORT" && membership.role !== "ADMINISTRATOR") {
    return (
      <div className="relative">
        <PageHeader title="Add Network Device" subtitle="Register a new piece of infrastructure." />
        <div className="mt-8 glass-card p-12 text-center text-signal-amber border-signal-amber">
          You do not have permission to add network devices. Only IT Support and Administrators can perform this action.
        </div>
      </div>
    );
  }

  const racks = await prisma.networkRack.findMany({
    where: { projectId: membership.projectId },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="relative max-w-3xl">
      <PageHeader 
        title="Add Network Device" 
        subtitle="Register a new piece of infrastructure to the site network."
      />

      <form action={async (formData) => {
        "use server";
        const { createDevice } = await import("../../actions");
        const { redirect } = await import("next/navigation");
        
        await createDevice(membership.projectId, {
          hostname: formData.get("hostname") as string,
          deviceType: formData.get("deviceType") as NetworkDeviceType,
          ipAddress: formData.get("ipAddress") as string || undefined,
          macAddress: formData.get("macAddress") as string || undefined,
          brand: formData.get("brand") as string || undefined,
          model: formData.get("model") as string || undefined,
          firmwareVersion: formData.get("firmwareVersion") as string || undefined,
          location: formData.get("location") as string || undefined,
          rackId: formData.get("rackId") as string || undefined,
          rackUnit: formData.get("rackUnit") ? parseInt(formData.get("rackUnit") as string) : undefined,
          vlan: formData.get("vlan") as string || undefined,
          uplink: formData.get("uplink") as string || undefined,
          notes: formData.get("notes") as string || undefined,
        });

        redirect("/dashboard/network");
      }} className="mt-8 space-y-8">
        
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
            <Cpu className="h-5 w-5 text-flow-teal" />
            Core Identity
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="hostname" className="text-sm font-medium text-text-primary">Hostname <span className="text-signal-red">*</span></label>
              <input 
                id="hostname" 
                name="hostname" 
                required 
                placeholder="e.g. SW-CORE-01"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="deviceType" className="text-sm font-medium text-text-primary">Device Type <span className="text-signal-red">*</span></label>
              <select 
                id="deviceType" 
                name="deviceType" 
                required
                className="w-full bg-bg-panel border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors"
              >
                {Object.values(NetworkDeviceType).map(type => (
                  <option key={type} value={type}>{type.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
            <Hash className="h-5 w-5 text-flow-teal" />
            Network details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="ipAddress" className="text-sm font-medium text-text-primary">IP Address</label>
              <input 
                id="ipAddress" 
                name="ipAddress" 
                placeholder="e.g. 192.168.10.5"
                className="w-full font-mono bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="macAddress" className="text-sm font-medium text-text-primary">MAC Address</label>
              <input 
                id="macAddress" 
                name="macAddress" 
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                className="w-full font-mono bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="vlan" className="text-sm font-medium text-text-primary">VLAN</label>
              <input 
                id="vlan" 
                name="vlan" 
                placeholder="e.g. VLAN10"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="uplink" className="text-sm font-medium text-text-primary">Uplink</label>
              <input 
                id="uplink" 
                name="uplink" 
                placeholder="e.g. SW-CORE-01 Port 24"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
            <Tag className="h-5 w-5 text-flow-teal" />
            Hardware & Location
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="brand" className="text-sm font-medium text-text-primary">Brand</label>
              <input 
                id="brand" 
                name="brand" 
                placeholder="e.g. Ubiquiti"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="model" className="text-sm font-medium text-text-primary">Model</label>
              <input 
                id="model" 
                name="model" 
                placeholder="e.g. U6-Pro"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="location" className="text-sm font-medium text-text-primary">Physical Location</label>
              <input 
                id="location" 
                name="location" 
                placeholder="e.g. Admin Bldg - Server Room"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rackId" className="text-sm font-medium text-text-primary">Rack Assignment</label>
              <select 
                id="rackId" 
                name="rackId" 
                className="w-full bg-bg-panel border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors"
              >
                <option value="">-- No Rack --</option>
                {racks.map(rack => (
                  <option key={rack.id} value={rack.id}>{rack.name} ({rack.location})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="rackUnit" className="text-sm font-medium text-text-primary">Rack Unit (U)</label>
              <input 
                id="rackUnit" 
                name="rackUnit" 
                type="number"
                min="1"
                placeholder="e.g. 42"
                className="w-full bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <a href="/dashboard/network" className="px-4 py-2 text-sm font-medium text-text-muted hover:text-white transition-colors">Cancel</a>
          <button type="submit" className="px-4 py-2 bg-flow-teal text-bg-base font-semibold rounded-md hover:bg-flow-teal/90 transition-colors shadow-[0_0_15px_rgba(31,182,166,0.3)]">
            Register Device
          </button>
        </div>

      </form>
    </div>
  );
}
