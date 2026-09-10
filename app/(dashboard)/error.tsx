"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="relative z-10 max-w-md w-full glass-scic-card p-8 flex flex-col items-center shadow-2xl rounded-2xl border border-red-500/20 scic-card-accent-red">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <AlertCircle className="h-7 w-7" />
        </div>

        <span className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold mb-1">
          Telemetry & Service Offline
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight text-text-primary mb-2">
          Unable to Load Section
        </h2>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          A transient connection timeout or server response delay occurred while querying site telemetry. You can retry immediately or return to the main dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-scic-blue hover:bg-scic-blue/90 text-white font-semibold text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry Connection
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-border-hairline hover:bg-white/5 font-semibold text-xs"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
