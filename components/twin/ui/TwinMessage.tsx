"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";

/** A centred notice over the twin's area: no graphics support, a failed start, or a crash. */
export function TwinMessage({ title, children, onRetry }: { title: string; children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-base,#0B1013)] p-6 text-text-primary">
      <div role="alert" className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-hairline bg-card/95 p-8 text-center shadow-2xl dark:bg-[#0B1013]/90">
        <BrandLogo variant="wordmark" height={28} />
        <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-text-muted">{children}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-scic-green/40 bg-scic-green/10 px-4 py-2 text-sm font-medium text-scic-green transition-colors hover:bg-scic-green/20"
            >
              Try again
            </button>
          )}
          <Link
            href="/digital-twin"
            className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-scic-green/10"
          >
            Open the current twin
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Shown while the renderer starts and until the first frames are on screen. */
export function TwinLoading({ slowStart }: { slowStart: boolean }) {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--bg-base,#0B1013)] text-text-primary">
      <BrandLogo variant="wordmark" height={26} />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-scic-green/15">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-scic-green motion-reduce:animate-none" />
      </div>
      <p className="text-sm text-text-muted">Starting the 3D view</p>
      {slowStart && (
        <p className="max-w-xs text-center text-xs text-text-muted">
          This browser has no WebGPU, so the first start takes longer, up to about 20 seconds.
        </p>
      )}
    </div>
  );
}

type BoundaryProps = { children: ReactNode; onRetry: () => void };

/** Catches a crash anywhere in the twin so the rest of the dashboard keeps working. */
export class TwinErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[twin] crashed", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <TwinMessage
        title="The 3D view stopped"
        onRetry={() => {
          this.setState({ failed: false });
          this.props.onRetry();
        }}
      >
        Something went wrong while drawing the site. You can try again, or open the current twin.
      </TwinMessage>
    );
  }
}
