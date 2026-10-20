import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { FlowLine } from "@/components/shared/FlowLine";
import { ANNIVERSARY_YEAR, BRAND_LINE, FLAGSHIP, FOUNDED_YEAR, MISSION_LINE, yearsInService } from "@/lib/home/companyFacts";
import { getFlagship } from "@/lib/home/flagship";
import { HERO_IMAGES, HERO_TINT, dayPartFor, greetingFor } from "@/lib/home/heroImages";
import { getPortfolioStats } from "@/lib/home/portfolio";
import { manilaHour } from "@/lib/home/time";
import { getWeatherGlance } from "@/lib/home/weatherGlance";
import { JubileeRotator } from "./JubileeVariants";
import { HeroChips } from "./HeroChips";
import { HeroHeadline } from "./HeroHeadline";
import { HeroSlideshow } from "./HeroSlideshow";
import { LiveClock } from "./LiveClock";

/** Capitalize the first letter of each word in a string: "harrold" -> "Harrold" */
function capitalizeWord(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map(capitalizeWord)
    .join(" ");
}

/** First name for the greeting: the Clerk profile, else the first word of the stored name, else "Team" */
async function firstName(fallbackName?: string | null): Promise<string> {
  try {
    const user = await currentUser();
    // 1. Clerk first name or username with capitalized first letter
    const name = user?.firstName?.trim() || user?.username?.trim();
    if (name) return capitalizeWords(name);

    // 2. If no first name is set in Clerk, check primary email (e.g. "harrold@gmail.com" -> "Harrold")
    const email = user?.emailAddresses?.[0]?.emailAddress?.trim();
    if (email) {
      const local = email.split("@")[0].split(/[._]/)[0];
      if (local) return capitalizeWord(local);
    }
  } catch {
    // signed out, or Clerk unreachable
  }

  // 3. Fallback from DB user record
  if (fallbackName?.trim()) {
    const clean = fallbackName.trim();
    if (clean.includes("@")) {
      const local = clean.split("@")[0].split(/[._]/)[0];
      if (local) return capitalizeWord(local);
    } else {
      const first = clean.split(/\s+/)[0];
      if (first) return capitalizeWord(first);
    }
  }

  return "Team";
}

/**
 * The hero of Nexus Home. Server-rendered shell (photograph, overlays, greeting, headline, seal,
 * chips with their first values) with small client islands for what moves: the slideshow, the
 * clock, the word reveal, the seal and the live chips. The greeting is the page's only h1.
 */
export async function HomeHero({ userName }: { userName?: string | null }) {
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
      className="dark relative isolate overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel md:min-h-[min(68vh,640px)]"
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

      <div className="relative z-[2] flex flex-col justify-end gap-6 p-6 pt-14 md:min-h-[min(68vh,640px)] md:p-10 lg:p-12 xl:px-14">
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0 max-w-4xl flex-1">
            <h1 className="font-display text-xl font-semibold tracking-[-0.01em] text-text-primary md:text-2xl">
              {greetingFor(hour)}, <span className="home-hero-accent">{name}</span>
            </h1>
            <LiveClock initialIso={now.toISOString()} className="mt-1.5 block text-sm text-text-secondary" />
            <HeroHeadline
              text={BRAND_LINE}
              className="mt-5 font-display text-[clamp(2.6rem,6.2vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em] text-text-primary"
            />
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">{MISSION_LINE}</p>
          </div>
          <JubileeRotator {...emblem} className="mb-1 hidden sm:flex" />
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
