import React from "react";
import dotmap from "@/public/data/ph-dotmap.json";
import { FlagshipSpotlight } from "@/components/home/flagship/FlagshipSpotlight";
import { LegacyTimeline } from "@/components/home/legacy/LegacyTimeline";
import { FeaturedCarousel } from "@/components/home/portfolio/FeaturedCarousel";
import { PortfolioFigures } from "@/components/home/portfolio/PortfolioFigures";
import { PhDotMap, type DotMapGrid } from "@/components/home/portfolio/PhDotMap";
import { SectorBars } from "@/components/home/portfolio/SectorBars";
import { HomeSection } from "@/components/home/primitives/HomeSection";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { ANNIVERSARY_YEAR, BRAND_LINE, FLAGSHIP, FOUNDED_YEAR, TIMELINE, yearsInService } from "@/lib/home/companyFacts";
import { getFlagship } from "@/lib/home/flagship";
import { ATLAS_HREF } from "@/lib/home/links";
import { olderThan } from "@/lib/home/time";
import { getPortfolioStats } from "@/lib/home/portfolio";

/** The land cells of the dot map as one SVG path per grid row (a dot is a zero-length round-capped stroke) */
function dotGrid(): DotMapGrid {
  const byRow = new Map<number, string[]>();
  for (const [c, r] of dotmap.dots as [number, number][]) {
    const row = byRow.get(r) ?? [];
    row.push(`M${c + 0.5} ${r + 0.5}h.01`);
    byRow.set(r, row);
  }
  return {
    cols: dotmap.cols,
    rows: dotmap.rows,
    bounds: dotmap.bounds,
    latStep: dotmap.latStep,
    lonStep: dotmap.lonStep,
    rowPaths: [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([row, parts]) => ({ row, d: parts.join("") })),
  };
}

/**
 * Server loader for the national portfolio: the figures (all from the Project Atlas records),
 * the dot map with every project on it, the featured projects and the split by sector. If the
 * records cannot be read at all, the section is left out.
 */
export async function PortfolioSection() {
  const [stats, flagship] = await Promise.all([getPortfolioStats(), getFlagship()]);
  if (!stats) return null;
  // the flagship card shows its latest logged reading (the project record's own percentage is older)
  const progress = flagship?.progress ? { [flagship.slug]: flagship.progress.percent } : undefined;
  const featured = [...stats.featured].sort((a, b) => Number(b.slug === FLAGSHIP.slug) - Number(a.slug === FLAGSHIP.slug));
  return (
    <HomeSection
      id="portfolio"
      eyebrow="National portfolio"
      title="Built across the archipelago"
      aside={<LivePulse updatedAt={stats.status.updatedAt} isStale={!stats.status.ok} />}
      action={{ href: ATLAS_HREF, label: "Open the Atlas" }}
    >
      <PortfolioFigures
        total={stats.totalProjects}
        ongoing={stats.activeProjects}
        completed={stats.completedProjects}
        totalMw={stats.totalMw}
        renewableMw={stats.renewableMw}
        provinces={stats.provinces}
      />
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-text-muted">
        Plant capacity is the rated megawatts of the power plants the company has worked on, as the records state them; renewable is the hydro, wind and solar share. Records not confirmed by public sources are left out.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="glass-scic-card min-w-0 p-4 md:p-5 lg:col-span-5">
          <PhDotMap grid={dotGrid()} points={stats.mapPoints} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          {featured.length > 0 && <FeaturedCarousel items={featured} progress={progress} />}
          <div className="glass-scic-card min-w-0 flex-1 p-4 md:p-5">
            <p className="home-eyebrow mb-3">Projects by sector</p>
            <SectorBars byCategory={stats.byCategory} />
          </div>
        </div>
      </div>
    </HomeSection>
  );
}

const STALE_LOG_MS = 3 * 86_400_000;

/** Server loader for the flagship spotlight (left out if the project record cannot be read) */
export async function FlagshipSection() {
  const f = await getFlagship();
  if (!f) return null;
  const photos = [...new Set([f.image, ...f.gallery].filter((p): p is string => !!p))].slice(0, 6);
  return (
    <section id="flagship" aria-labelledby="flagship-title" className="scroll-mt-24">
      <FlagshipSpotlight
        slug={f.slug}
        name={FLAGSHIP.name}
        ongoing={f.status === "ONGOING" || f.status === "ACTIVE"}
        facts={{ capacity: FLAGSHIP.capacity, type: FLAGSHIP.type, river: FLAGSHIP.river, location: FLAGSHIP.location, client: FLAGSHIP.client }}
        photos={photos}
        progress={f.progress}
        readings={f.readings}
        targetCodDate={f.targetCodDate}
        dailyLog={f.dailyLog ? { ...f.dailyLog, stale: olderThan(f.dailyLog.date, STALE_LOG_MS) } : null}
      />
    </section>
  );
}

/** The 50-year timeline (company statements only: no data source to wait for) */
export function LegacySection() {
  return (
    <section id="legacy" aria-labelledby="legacy-title" className="scroll-mt-24">
      <LegacyTimeline entries={TIMELINE} founded={FOUNDED_YEAR} anniversary={ANNIVERSARY_YEAR} thisYear={FOUNDED_YEAR + yearsInService()} brandLine={BRAND_LINE} />
    </section>
  );
}
