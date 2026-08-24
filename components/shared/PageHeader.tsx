import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
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
  actionHref,
  onAction,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("relative z-10 mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20 text-[10px] font-mono font-bold uppercase tracking-wider text-scic-blue dark:text-scic-cyan">
              <span className="h-1.5 w-1.5 rounded-full bg-scic-blue dark:bg-scic-cyan animate-pulse" />
              SCIC · Tumauini HEPP
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-text-muted font-medium max-w-3xl">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {actionLabel && actionHref && (
            <Link href={actionHref}>
              <Button 
                className="bg-scic-blue hover:bg-scic-blue/90 dark:bg-scic-cyan dark:hover:bg-scic-cyan/90 text-white dark:text-slate-950 font-semibold shadow-md transition-all duration-150"
              >
                {actionLabel}
              </Button>
            </Link>
          )}
          {actionLabel && onAction && !actionHref && (
            <Button 
              onClick={onAction}
              className="bg-scic-blue hover:bg-scic-blue/90 dark:bg-scic-cyan dark:hover:bg-scic-cyan/90 text-white dark:text-slate-950 font-semibold shadow-md transition-all duration-150"
            >
              {actionLabel}
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
