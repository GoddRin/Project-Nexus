import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
 title: string;
 subtitle?: string;
 actionLabel?: string;
 onAction?: () => void;
 children?: React.ReactNode;
 className?: string;
}

/**
 * PageHeader — top of every content page.
 * Title in Space Grotesk display, optional subtitle, optional action button.
 * FlowLine is positioned behind this component by the parent layout.
 */
export function PageHeader({
 title,
 subtitle,
 actionLabel,
 onAction,
 children,
 className,
}: PageHeaderProps) {
 return (
 <div className={cn("relative z-10 mb-8", className)}>
 <div className="flex items-start justify-between">
 <div>
 <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
 {title}
 </h1>
 {subtitle && (
 <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
 )}
 </div>
 <div className="flex items-center gap-3">
 {actionLabel && onAction && (
 <Button onClick={onAction}>
 {actionLabel}
 </Button>
 )}
 {children}
 </div>
 </div>
 </div>
 );
}
