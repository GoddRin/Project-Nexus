import { prisma } from "@/lib/db/prisma";
import { ProjectCompletionChart } from "./ProjectCompletionChart";
import { Activity, ChevronRight } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import Link from "next/link";

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
      <div className="glass-scic-card scic-card-accent-blue h-full p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20">
                <Activity className="h-4.5 w-4.5 text-scic-blue dark:text-scic-cyan" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-text-primary">
                  Project Physical Progress
                </h3>
                <p className="text-xs text-text-muted">EPC Milestones & Civil Works</p>
              </div>
            </div>
            <Link
              href="/dashboard/progress"
              className="inline-flex items-center gap-1 text-xs font-semibold text-scic-blue dark:text-scic-cyan hover:underline"
            >
              Progress S-Curve <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ProjectCompletionChart percentComplete={percent} />

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-primary">Civil Works & Weir Intake</span>
                  <span className="font-mono text-scic-blue dark:text-scic-cyan">78.5%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-scic-blue dark:bg-scic-cyan" style={{ width: "78.5%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-primary">Electro-Mechanical & Turbines</span>
                  <span className="font-mono text-scic-cyan">62.0%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-scic-cyan" style={{ width: "62%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-primary">Switchyard & 69kV Transmission</span>
                  <span className="font-mono text-emerald-500">88.0%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: "88%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
