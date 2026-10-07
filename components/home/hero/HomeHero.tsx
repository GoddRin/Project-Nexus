import { Suspense } from "react";
import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { FlowLine } from "@/components/shared/FlowLine";
import { ANNIVERSARY_YEAR, BRAND_LINE, FLAGSHIP, FOUNDED_YEAR, MISSION_LINE, yearsInService } from "@/lib/home/companyFacts";
import { getFlagship } from "@/lib/home/flagship";
import { HERO_IMAGES, HERO_TINT, dayPartFor, greetingFor } from "@/lib/home/heroImages";
import { getPortfolioStats } from "@/lib/home/portfolio";
import { manilaHour } from "@/lib/home/time";
import { getWeatherGlance } from "@/lib/home/weatherGlance";
import type { JubileeVariant } from "@/lib/home/jubilee";
import { JubileeEmblem, JubileePicker } from "./JubileeVariants";
import { HeroChips } from "./HeroChips";
import { HeroHeadline } from "./HeroHeadline";
import { HeroSlideshow } from "./HeroSlideshow";
import { LiveClock } from "./LiveClock";

/** First name for the greeting: the Clerk profile, else the first word of the stored name, else "Team" */
async function firstName(fallbackName?: string | null): Promise<string> {
  try {
    const user = await currentUser();
    const name = user?.firstName?.trim() || user?.username?.trim();
    if (name) return name;
  } catch {
    // signed out, or Clerk unreachable
  }
  const fromDb = fallbackName?.trim().split(/\s+/)[0];
  return fromDb && !/@/.test(fromDb) ? fromDb : "Team";
}

/**
 * The hero of Nexus Home. Server-rendered shell (photograph, overlays, greeting, headline, seal,
 * chips with their first values) with small client islands for what moves: the slideshow, the
 * clock, the word reveal, the seal and the live chips. The greeting is the page's only h1.
 */
export async function HomeHero({ userName, seal = "medal" }: { userName?: string | null; seal?: JubileeVariant }) {
  const now = new Date();
  const hour = manilaHour(now);
  const [name, weather, portfolio, flagship] = await Promise.all([
    firstName(userName),
    getWeatherGlance("tumauini").catch(() => null),
    getPortfolioStats().catch(() => null),
    getFlagship(),
  ]);

  const emblem = { years: yearsInService(now), founded: FOUNDED_YEAR, anniversary: ANNIVERSARY_YEAR, targetId: "legacy" };

  return (
    <header
      // (class "dark": the hero wears the dark theme's colours in both themes, since it is a photograph)
      className="dark relative isolate overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel md:min-h-[min(76vh,720px)]"
      style={{ ["--hero-tint" as string]: HERO_TINT[dayPartFor(hour)] }}
    >
      <HeroSlideshow images={HERO_IMAGES} />
      <div className="home-hero-grade z-[1]" aria-hidden />
      <div className="home-hero-screen z-[1]" aria-hidden />
      <div className="home-hero-tint z-[1]" aria-hidden />
      <div className="home-hero-overlay z-[1]" aria-hidden />
      <div className="home-aurora z-[1]" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="home-contours z-[1]" aria-hidden />

      {seal === "ribbon" && <JubileeEmblem variant="ribbon" {...emblem} />}
      {/* TEMPORARY: the emblem designs can be tried from here in development */}
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <JubileePicker current={seal} />
        </Suspense>
      )}

      <div className="relative z-[2] flex flex-col justify-end gap-5 p-6 pt-16 md:min-h-[min(76vh,720px)] md:p-10 lg:p-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <h1 className="font-display text-xl font-semibold tracking-[-0.01em] text-text-primary md:text-2xl">
              {greetingFor(hour)}, <span className="home-hero-accent">{name}</span>
            </h1>
            <LiveClock initialIso={now.toISOString()} className="mt-1.5 block text-sm text-text-secondary" />
            <HeroHeadline
              text={BRAND_LINE}
              className="mt-6 font-display text-[clamp(2.6rem,7vw,5.5rem)] font-extrabold leading-[0.98] tracking-[-0.03em] text-text-primary"
            />
            <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary md:text-lg">{MISSION_LINE}</p>
          </div>
          {seal !== "ribbon" && <JubileeEmblem variant={seal} {...emblem} className="mb-1 hidden sm:inline-flex" />}
        </div>

        <HeroChips
          weather={weather}
          activeProjects={portfolio?.activeProjects ?? null}
          flagship={flagship?.progress ? { name: FLAGSHIP.shortName, percent: flagship.progress.percent } : null}
        />
      </div>

      {/* the river line: a thin band along the hero's bottom edge (FlowLine fills whatever box it is given) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-12 opacity-60 md:h-16" aria-hidden>
        <FlowLine className="h-full w-full" />
      </div>
    </header>
  );
}
