/**
 * How fresh each part of Nexus Home is kept. Server values are cache lifetimes in SECONDS
 * (unstable_cache revalidate); client values are polling intervals in MILLISECONDS (useLiveFeed).
 */
const MIN = 60;
const S = 1000;

export const SERVER_TTL = {
  weather: 10 * MIN,
  pagasa: 10 * MIN,
  trending: 30 * MIN,
  press: 60 * MIN,
  companyFeed: 5 * MIN,
  portfolio: 5 * MIN,
  /** a brief lives for its slot; this only bounds how long one stays cached */
  brief: 8 * 60 * MIN,
  forex: 6 * 60 * MIN,
} as const;

export const CLIENT_REFRESH = {
  clock: 1 * S,
  weather: 15 * MIN * S,
  pagasa: 10 * MIN * S,
  /** while a wind signal is up over the site */
  pagasaActive: 5 * MIN * S,
  trending: 15 * MIN * S,
  press: 30 * MIN * S,
  companyFeed: 5 * MIN * S,
  /** how often the brief card checks whether the slot has changed */
  brief: 10 * MIN * S,
  /** the "updated x ago" text */
  agoTick: 30 * S,
  /** manual refresh: at most one per */
  manualThrottle: 30 * S,
  /** error backoff: at most this many times the normal interval */
  maxBackoffFactor: 4,
} as const;

export const CACHE_TAGS = {
  weather: "home-weather",
  news: "home-news",
  trending: "home-trending",
  portfolio: "home-portfolio",
  brief: "home-brief",
  forex: "home-forex",
} as const;

/** Daily brief slots, by the hour in Asia/Manila at which each begins */
export const BRIEF_SLOTS = [
  { slot: "MORNING", fromHour: 6 },
  { slot: "MIDDAY", fromHour: 12 },
  { slot: "EVENING", fromHour: 18 },
] as const;

export const UPSTREAM_TIMEOUT_MS = 6000;
export const USER_AGENT = "ProjectNexus-Home/1.0 (Sta. Clara International Corporation internal portal)";

/** ISO time of the next refresh, for SourceStatus */
export function nextRefreshAt(ttlSeconds: number, from: Date = new Date()): string {
  return new Date(from.getTime() + ttlSeconds * 1000).toISOString();
}
