import type { WeatherGlance } from "./types";

/**
 * Development only: a forced wind-signal state, to check how the alert banner, the chips and the
 * verdict look (`?mockAlert=1`, `2` or `3` on /home). In any other environment the reading is
 * returned untouched, so a mocked alert can never be shown to real users.
 */
export function withMockAlert(glance: WeatherGlance | null, signal: string | undefined): WeatherGlance | null {
  if (process.env.NODE_ENV !== "development" || !glance) return glance;
  const n = Number(signal);
  if (!(n >= 1 && n <= 5)) return glance;
  return {
    ...glance,
    alert: {
      level: n >= 3 ? "RED" : n === 2 ? "ORANGE" : "YELLOW",
      signal: n,
      stormName: "MOCK (dev only)",
      message: `Tropical Cyclone Wind Signal No. ${n} is up over ${glance.siteKey === "tumauini" ? "the Tumauini site" : "Metro Manila"} (MOCK: development test, not a real bulletin).`,
    },
    bulletin: { available: true, active: true, stormName: "MOCK (dev only)" },
    operational: glance.operational
      ? { ...glance.operational, verdict: n >= 2 ? "HOLD" : "CAUTION", headline: "MOCK: signal raised over the site", detail: "Development test of the alert state. Not a real evaluation." }
      : undefined,
  };
}
