import { prisma } from "@/lib/db/prisma";
import { requireProjectMember } from "@/lib/auth/index";
import { PageHeader } from "@/components/shared/PageHeader";
import { Network, Link } from "lucide-react";
import LinkComponent from "next/link";

export default async function SubnetsPage() {
  const membership = await requireProjectMember();

  const subnets = await prisma.networkSubnet.findMany({
    where: { projectId: membership.projectId },
    orderBy: { vlanId: 'asc' }
  });

  return (
    <div className="relative">
      <PageHeader 
        title="Subnets & VLANs" 
        subtitle="IP address spaces and logical network segmentation."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subnets.map(subnet => (
          <div key={subnet.id} className="glass-card p-6 border-t-2 border-t-flow-teal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-text-primary flex items-center gap-2">
                <Network className="h-5 w-5 text-flow-teal" />
                {subnet.name}
              </h3>
              {subnet.vlanId && (
                <div className="rounded px-2 py-1 bg-white/[0.05] border border-white/10 text-xs font-mono font-bold text-text-primary">
                  VLAN {subnet.vlanId}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">CIDR Block</p>
                <p className="font-mono text-text-primary bg-black/40 px-3 py-1.5 rounded border border-white/5 inline-block">{subnet.cidr}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">Gateway</p>
                <p className="font-medium text-text-primary">{subnet.gateway || "None specified"}</p>
              </div>

              {subnet.description && (
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">Description</p>
                  <p className="text-sm text-text-primary">{subnet.description}</p>
                </div>
              )}
            </div>
            
            {/* Find devices link */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <LinkComponent href={`/dashboard/network?vlan=VLAN${subnet.vlanId}`} className="text-sm text-flow-teal hover:text-white transition-colors flex items-center gap-1 font-medium">
                <Link className="h-4 w-4" />
                View devices on this VLAN
              </LinkComponent>
            </div>
          </div>
        ))}

        {subnets.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-lg">
            <Network className="mx-auto h-8 w-8 text-white/20 mb-3" />
            <p className="text-text-muted">No subnets documented yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
