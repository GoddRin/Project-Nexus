import { prisma } from "@/lib/db/prisma";
import { requireProjectMember } from "@/lib/auth/index";
import { PageHeader } from "@/components/shared/PageHeader";
import { Server, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function RacksPage() {
  const membership = await requireProjectMember();

  const racks = await prisma.networkRack.findMany({
    where: { projectId: membership.projectId },
    include: {
      devices: {
        orderBy: { rackUnit: 'desc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="relative">
      <PageHeader 
        title="Rack Layouts" 
        subtitle="Physical cabinet allocations and U-space management."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {racks.map(rack => {
          // Generate array of units from totalUnits down to 1 (top to bottom)
          const units = Array.from({ length: rack.totalUnits }, (_, i) => rack.totalUnits - i);
          
          return (
            <div key={rack.id} className="glass-card flex flex-col">
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center gap-3 mb-1">
                  <Server className="h-5 w-5 text-flow-teal" />
                  <h3 className="font-display text-lg font-semibold text-text-primary">{rack.name}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-2">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{rack.location} &bull; {rack.totalUnits}U</span>
                </div>
              </div>
              
              <div className="p-4 bg-bg-base overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <div className="flex flex-col gap-1 w-full max-w-[300px] mx-auto bg-black/40 p-2 rounded border border-white/5 shadow-inner">
                  {units.map(u => {
                    const device = rack.devices.find(d => d.rackUnit === u);
                    return (
                      <div key={u} className="flex items-stretch h-8">
                        <div className="w-8 flex-shrink-0 flex items-center justify-center border-r border-white/10 bg-black/60 text-[10px] font-mono text-text-muted select-none">
                          {u}
                        </div>
                        <div className={cn(
                          "flex-1 flex items-center px-3 border border-white/5 overflow-hidden text-xs truncate",
                          device 
                            ? (device.deviceType === "SERVER" ? "bg-blue-500/20 text-blue-200 border-blue-500/30" :
                               device.deviceType === "SWITCH" ? "bg-flow-teal/20 text-flow-teal border-flow-teal/30" :
                               device.deviceType === "ROUTER" ? "bg-purple-500/20 text-purple-200 border-purple-500/30" :
                               "bg-signal-amber/20 text-signal-amber border-signal-amber/30")
                            : "bg-bg-panel-raised text-text-muted/30"
                        )}>
                          {device ? (
                            <span className="font-medium tracking-wide truncate">
                              {device.hostname} <span className="opacity-50 font-normal ml-1">({device.model || device.deviceType})</span>
                            </span>
                          ) : (
                            <span className="italic">Empty</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {racks.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-lg">
            <Server className="mx-auto h-8 w-8 text-white/20 mb-3" />
            <p className="text-text-muted">No racks documented yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
