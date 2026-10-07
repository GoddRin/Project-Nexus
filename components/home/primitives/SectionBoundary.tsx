"use client";

import React, { useEffect } from "react";
import { unstable_catchError, type ErrorInfo } from "next/error";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What a section of Nexus Home shows when it fails to render: a quiet card of the section's own
 * footprint, naming what is missing, with a way to try again. The rest of the page carries on.
 */
function SectionFallback({ label, className }: { label: string; className?: string }, { error, unstable_retry }: ErrorInfo) {
  useEffect(() => {
    console.error(`[home] the ${label} section failed to render:`, error);
  }, [error, label]);
  return (
    <div role="alert" className={cn("glass-scic-card min-h-[160px] items-center justify-center gap-3 p-6 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-scic-amber/10 text-scic-amber">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-text-primary">The {label} could not be shown.</p>
      <p className="max-w-sm text-xs text-text-secondary">The rest of the page is unaffected. This is usually a brief connection problem.</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="home-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-text-primary transition-colors hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Try again
      </button>
    </div>
  );
}

/**
 * Wrap one section of Nexus Home so that an error inside it stays inside it. Built on Next's
 * own boundary (`unstable_catchError`), so redirects and not-found still pass through and
 * "Try again" re-fetches the section from the server.
 */
export const SectionBoundary = unstable_catchError(SectionFallback);
