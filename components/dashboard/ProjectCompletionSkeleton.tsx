import { Activity } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";

export function ProjectCompletionSkeleton({ delay = 0 }: { delay?: number }) {
 return (
 <AnimatedSection delay={delay} className="h-full">
 <div
 className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-xl"
 style={{ padding: "1.5rem" }}
 >
 <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flow-teal/20 to-transparent" />
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-flow-teal/10 ring-1 ring-flow-teal/20">
 <Activity className="h-4 w-4 text-flow-teal/50" />
 </div>
 <h3 className="font-display text-sm font-semibold text-text-primary/70">
 Project Completion
 </h3>
 </div>
 <div className="flex flex-1 items-center justify-center">
 <div className="h-40 w-40 animate-pulse rounded-full bg-white/[0.04]" />
 </div>
 </div>
 </AnimatedSection>
 );
}
