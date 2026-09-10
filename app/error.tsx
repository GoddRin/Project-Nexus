"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-scic-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full glass-card p-8 flex flex-col items-center shadow-2xl border border-black/10 dark:border-white/10 rounded-2xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <span className="font-mono text-xs uppercase tracking-widest text-scic-cyan font-semibold mb-1">
          SCIC Portal Status
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary mb-2">
          Service Reconnecting
        </h1>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          The operations portal experienced a temporary connection interruption with the backend database. Click reload to re-establish connection.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-scic-blue hover:bg-scic-blue/90 text-white font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Portal
          </Button>

          <Link href="/dashboard" className="w-full">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 border-border-hairline hover:bg-white/5">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
