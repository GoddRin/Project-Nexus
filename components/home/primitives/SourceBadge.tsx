"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface SourceBadgeProps {
  /** publisher's name as shown ("Philippine Daily Inquirer") */
  source: string;
  /** its domain ("inquirer.net"); used for the favicon */
  domain?: string;
  size?: number;
  /** show only the favicon */
  iconOnly?: boolean;
  className?: string;
}

/**
 * A publisher's favicon and name. The favicon is the only third-party request the page makes
 * from the browser (Google's favicon service); if it fails, the publisher's initial is shown.
 */
export function SourceBadge({ source, domain, size = 16, iconOnly = false, className }: SourceBadgeProps) {
  const [failed, setFailed] = useState(false);
  const initial = (source.trim()[0] || "?").toUpperCase();
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted", className)}>
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- a 16 px third-party favicon: not worth the image optimiser
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="shrink-0 rounded-[4px]"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-scic-green/15 font-mono font-semibold text-scic-green dark:text-scic-green-bright"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
        >
          {initial}
        </span>
      )}
      {iconOnly ? <span className="sr-only">{source}</span> : <span className="truncate">{source}</span>}
    </span>
  );
}
