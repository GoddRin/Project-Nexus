import React from "react";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_LINE, COMPANY_NAME, FOUNDED_YEAR } from "@/lib/home/companyFacts";
import { getPhpUsd } from "@/lib/home/forex";

/** Where each kind of outside data on Nexus Home comes from (the licences ask for these credits) */
const SOURCES: { what: string; who: string; href: string }[] = [
  { what: "Weather forecast", who: "Open-Meteo", href: "https://open-meteo.com/" },
  { what: "Storm signals", who: "PAGASA", href: "https://www.pagasa.dost.gov.ph/" },
  { what: "Headlines", who: "Google News", href: "https://news.google.com/" },
  { what: "Stories and photographs", who: "BusinessWorld", href: "https://www.bworldonline.com/" },
  { what: "Stories and photographs", who: "GMA News", href: "https://www.gmanetwork.com/news/" },
  { what: "Stories and photographs", who: "The Manila Times", href: "https://www.manilatimes.net/" },
  { what: "Stories and photographs", who: "Rappler", href: "https://www.rappler.com/" },
  { what: "Exchange rate", who: "ExchangeRate-API", href: "https://www.exchangerate-api.com" },
  { what: "Map outline", who: "Natural Earth", href: "https://www.naturalearthdata.com/" },
];

const manilaYear = () => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date());
const day = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/**
 * The strip that closes Nexus Home: the company's mark and line, the day's peso-dollar rate
 * (left out when the rate service cannot be reached), and the credits for every outside source
 * the page draws on. Project figures on the page come from the company's own records.
 */
export async function HomeFooterStrip() {
  const fx = await getPhpUsd().catch(() => null);
  return (
    <footer aria-label="Nexus Home sources and credits" className="rounded-3xl border border-border-hairline bg-bg-panel-subtle p-5 md:p-6">
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
          </p>
        )}
      </div>

      <div className="mt-5 border-t border-border-hairline pt-4">
        <p className="home-eyebrow">Outside data on this page</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {SOURCES.map((s) => (
            <li key={s.who} className="text-xs text-text-secondary">
              {s.what}:{" "}
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-0.5 font-medium text-text-primary underline-offset-2 hover:text-scic-green hover:underline focus-visible:outline-none focus-visible:underline dark:hover:text-scic-green-bright"
              >
                {s.who}
                <ArrowUpRight className="h-3 w-3 text-text-muted" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-text-muted">
          Project, progress and site figures come from the company&apos;s own records in Project Nexus. Forecasts and headlines are provided by the services above and may be delayed. © {manilaYear()}{" "}
          {COMPANY_NAME}.
        </p>
      </div>
    </footer>
  );
}
