import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
 icon: LucideIcon;
 title: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 actionHref?: string;
 actionDisabled?: boolean;
 className?: string;
 intent?: "neutral" | "primary" | "warning";
}

/**
 * EmptyState — Elevated Glass style. Displays when a section has no data yet.
 */
export function EmptyState({
 icon: Icon,
 title,
 description,
 actionLabel,
 onAction,
 actionHref,
 actionDisabled,
 className,
 intent = "neutral",
}: EmptyStateProps) {
 const intentStyles = {
 neutral: {
 wrapper: "bg-white/[0.04] ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
 icon: "text-text-muted",
 },
 primary: {
 wrapper: "bg-flow-teal/10 ring-1 ring-flow-teal/25 shadow-[0_0_20px_rgba(31,182,166,0.12),inset_0_1px_0_rgba(31,182,166,0.15)]",
 icon: "text-flow-teal drop-shadow-[0_0_10px_rgba(31,182,166,0.5)]",
 },
 warning: {
 wrapper: "bg-signal-amber/10 ring-1 ring-signal-amber/25 shadow-[0_0_20px_rgba(232,163,61,0.12),inset_0_1px_0_rgba(232,163,61,0.15)]",
 icon: "text-signal-amber drop-shadow-[0_0_10px_rgba(232,163,61,0.5)]",
 },
 };
 
 const { wrapper, icon: iconClass } = intentStyles[intent];

 const ButtonElement = actionLabel && (
 <Button
 onClick={onAction}
 disabled={actionDisabled}
 variant={actionDisabled ? "outline" : "default"}
 className="transition-colors duration-150"
 >
 {actionLabel}
 </Button>
 );

 return (
 <div
 className={cn(
 "flex flex-col items-center justify-center py-8 px-6 text-center",
 className
 )}
 >
 <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ", wrapper)}>
 <Icon className={cn("h-6 w-6", iconClass)} />
 </div>
 <h3 className="mb-1.5 font-display text-sm font-semibold text-text-primary">
 {title}
 </h3>
 <p className="mb-6 max-w-xs text-xs leading-relaxed text-text-muted">{description}</p>
 {actionHref && ButtonElement ? (
 <Link href={actionHref}>{ButtonElement}</Link>
 ) : (
 ButtonElement
 )}
 </div>
 );
}
