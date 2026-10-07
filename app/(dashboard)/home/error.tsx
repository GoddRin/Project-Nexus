"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Globe, LayoutDashboard, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ATLAS_HREF, COMMAND_CENTER_HREF } from "@/lib/home/links";

/**
 * Nexus Home could not be built at all (each section has its own boundary, so this is rare:
 * it means the page itself failed). Offers a retry and the two places most people are headed.
 */
export default function NexusHomeError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error("[home] the page failed to render:", error);
  }, [error]);
  const link =
    "home-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40";
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center px-4 py-10">
      <div role="alert" className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel p-8 text-center">
        <div className="home-aurora" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="relative flex flex-col items-center">
          <BrandLogo variant="mark" height={48} />
          <p className="home-eyebrow mt-5">Nexus Home</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.02em] text-text-primary">The front page could not be loaded</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            This is usually a brief connection problem. Your data is safe; try again, or go straight to where you were headed.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex items-center gap-2 rounded-full bg-scic-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-scic-green-energy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Try again
            </button>
            <Link href={COMMAND_CENTER_HREF} className={link}>
              <LayoutDashboard className="h-4 w-4 text-scic-green dark:text-scic-green-bright" aria-hidden />
              Command Center
            </Link>
            <Link href={ATLAS_HREF} className={link}>
              <Globe className="h-4 w-4 text-scic-green dark:text-scic-green-bright" aria-hidden />
              Project Atlas
            </Link>
          </div>
          {error.digest && <p className="mt-5 font-mono text-[10px] text-text-muted">Reference: {error.digest}</p>}
        </div>
      </div>
    </div>
  );
}
