import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManageEngineers } from "./ManageEngineers";
import { PhotoGallery } from "./PhotoGallery";

export default async function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await prisma.siteLocation.findFirst({
    where: { slug },
    include: {
      assignedEngineers: { include: { user: true } },
      photos: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!location) notFound();

  const allUsers = await prisma.user.findMany({
    orderBy: { name: "asc" }
  });

  const comboboxUsers = allUsers.map(u => ({
    id: u.id,
    name: u.name || u.email,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard/sitemap">
          <Button variant="ghost" size="icon" className="text-text-muted hover:text-white rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">
            {location.name}
          </h1>
          <p className="text-text-muted text-sm mt-1">{location.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-bg-panel border border-white/5 shadow-lg relative overflow-hidden">
             <div 
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ 
                  backgroundColor: location.percentComplete === 100 ? "#1FB6A6" : 
                                   (location.percentComplete! > 0 ? "#E8A33D" : "#E35A5A")
                }}
              />
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Zone Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm text-text-muted">Completion</span>
                <span className="text-2xl font-display font-bold text-text-primary">
                  {location.percentComplete}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    location.percentComplete === 100 ? "bg-flow-teal" : "bg-signal-amber"
                  }`}
                  style={{ width: `${location.percentComplete}%` }}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Status</span>
                <span className={`font-semibold ${
                  location.percentComplete === 100 ? "text-flow-teal" : "text-signal-amber"
                }`}>
                  {location.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Created</span>
                <span className="text-text-primary">{location.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <ManageEngineers
            locationId={location.id}
            assignedEngineers={location.assignedEngineers}
            users={comboboxUsers}
          />
        </div>

        {/* Right Column: Photos Gallery */}
        <div className="lg:col-span-2 space-y-6">
          <PhotoGallery photos={location.photos} />
        </div>
      </div>
    </div>
  );
}
