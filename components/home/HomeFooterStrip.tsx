import React from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_LINE, COMPANY_NAME, FOUNDED_YEAR, yearsInService } from "@/lib/home/companyFacts";
import { getPhpUsd } from "@/lib/home/forex";

const manilaYear = () => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date());
const day = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/**
 * The strip that closes Nexus Home: the company's mark and line, the day's peso-dollar rate
 * (left out when the rate service cannot be reached), and the copyright line with the 50-year mark.
 * Outside sources are credited where their data is shown (weather card, headlines card, rate chip).
 */
export async function HomeFooterStrip() {
  const fx = await getPhpUsd().catch(() => null);
  return (
    <footer aria-label="Sta. Clara International Corporation" className="rounded-3xl border border-border-hairline bg-bg-panel-subtle p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo variant="mark" height={36} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-text-primary">{COMPANY_NAME}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
              Since {FOUNDED_YEAR} · {BRAND_LINE}
            </p>
          </div>
        </div>
        {fx && (
          <p className="home-chip inline-flex items-baseline gap-2 rounded-full px-4 py-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">PHP / USD</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">₱{fx.phpPerUsd.toFixed(2)}</span>
            <span className="font-mono text-[10px] text-text-muted">per US$1 · {day(fx.asOf)}</span>
            {/* the rate service's terms ask for this credit */}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-text-muted hover:text-text-secondary hover:underline">
              ExchangeRate-API
            </a>
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border-hairline pt-4">
        <p className="text-xs text-text-secondary">
          © {manilaYear()} {COMPANY_NAME}. All rights reserved.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          <span className="font-semibold text-scic-green dark:text-scic-green-bright">{yearsInService()} years</span> of building the nation · {FOUNDED_YEAR}–{manilaYear()}
        </p>
      </div>
    </footer>
  );
}
