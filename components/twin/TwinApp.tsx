"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";

/**
 * Twin v2, top-level client component. Mounted by the digital-twin route for `?v=2`.
 * A placeholder until P01b builds the scene shell: it says so plainly and links back to v1.
 */
export default function TwinApp() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-base,#0B1013)] p-6 text-text-primary">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-hairline bg-card/95 p-8 text-center shadow-2xl dark:bg-[#0B1013]/90">
        <BrandLogo variant="wordmark" height={28} />
        <h1 className="font-display text-lg font-semibold tracking-tight">Twin v2 under construction</h1>
        <p className="text-sm text-text-muted">
          The rebuilt Tumauini digital twin is not ready to view yet. The current twin is still available.
        </p>
        <Link
          href="/digital-twin"
          className="rounded-lg border border-scic-green/40 bg-scic-green/10 px-4 py-2 text-sm font-medium text-scic-green transition-colors hover:bg-scic-green/20"
        >
          Open the current twin
        </Link>
      </div>
    </div>
  );
}
