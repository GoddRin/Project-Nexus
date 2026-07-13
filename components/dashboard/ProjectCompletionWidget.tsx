import { prisma } from "@/lib/db/prisma";
import { ProjectCompletionChart } from "./ProjectCompletionChart";
import { Activity } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";

export async function ProjectCompletionWidget({ delay = 0 }: { delay?: number }) {
 // Fetch from the seeded project 'tumauini-hepp'
 const project = await prisma.project.findUnique({
 where: { slug: "tumauini-hepp" },
 select: { id: true, percentComplete: true },
 });

 let percent = project?.percentComplete ?? 0;

 if (project) {
 const latestSnapshot = await prisma.progressSnapshot.findFirst({
 where: { projectId: project.id },
 orderBy: { snapshotDate: "desc" },
 });
 if (latestSnapshot) {
 percent = latestSnapshot.percentComplete;
 }
 }

 return (
 <AnimatedSection delay={delay} className="h-full">
 <div
 className="glass-card h-full"
 style={{ padding: "1.5rem" }}
 >
 {/* Accent glow at top */}
 <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flow-teal/40 to-transparent" />

 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-flow-teal/15 ring-1 ring-flow-teal/30 shadow-[0_0_12px_rgba(31,182,166,0.25)]">
 <Activity className="h-4 w-4 text-flow-teal" />
 </div>
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
 Project Completion
 </h3>
 </div>
 <ProjectCompletionChart percentComplete={percent} />
 </div>
 </AnimatedSection>
 );
}
