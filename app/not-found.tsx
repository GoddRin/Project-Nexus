import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-flow-teal/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full glass-card p-8 flex flex-col items-center shadow-2xl border border-black/10 dark:border-white/10 rounded-2xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-amber/10 ring-1 ring-signal-amber/30 text-signal-amber shadow-[0_0_20px_rgba(232,163,61,0.2)]">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <span className="font-mono text-xs uppercase tracking-widest text-flow-teal font-semibold mb-1">
          404 Error
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          The requested route does not exist or may have been moved within the site portal.
        </p>

        <Link href="/dashboard" className="w-full">
          <Button className="w-full flex items-center justify-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
