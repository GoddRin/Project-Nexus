import { unstable_cache } from "next/cache";
import { withLastGood } from "./lastGood";
import { CACHE_TAGS, SERVER_TTL, nextRefreshAt } from "./refreshPolicy";
import { domainOf, fetchRss, normaliseTitle, stripSourceSuffix, titleId } from "./rss";
import type { Headline, NewsCategoryKey, TrendingResult } from "./types";

/**
 * Trending headlines from Google News RSS (no API key). Twelve per category, newest first,
 * de-duplicated, and passed through a workplace filter. Cached thirty minutes per category.
 */

const GN = "hl=en-PH&gl=PH&ceid=PH:en";
const ENERGY_QUERY = '(hydropower OR "renewable energy" OR "Department of Energy" OR infrastructure OR DPWH) Philippines when:3d';
export const TRENDING_FEEDS: Record<NewsCategoryKey, string> = {
  PH: `https://news.google.com/rss?${GN}`,
  WORLD: `https://news.google.com/rss/headlines/section/topic/WORLD?${GN}`,
  BUSINESS: `https://news.google.com/rss/headlines/section/topic/BUSINESS?${GN}`,
  ENERGY: `https://news.google.com/rss/search?q=${encodeURIComponent(ENERGY_QUERY)}&${GN}`,
};
export const NEWS_CATEGORIES: NewsCategoryKey[] = ["PH", "ENERGY", "BUSINESS", "WORLD"];
export const NEWS_CATEGORY_LABEL: Record<NewsCategoryKey, string> = { PH: "Philippines", ENERGY: "Energy & Infra", BUSINESS: "Business", WORLD: "World" };
const PER_CATEGORY = 12;

/**
 * Workplace filter: a headline containing any of these is left off the office front page
 * (graphic crime, gore, explicit content). Whole words, case-insensitive. Edit freely.
 */
export const HEADLINE_DENYLIST: string[] = [
  "rape", "raped", "rapist", "gang-rape", "molest", "molested", "incest", "sexual assault", "sex video", "sex scandal", "nude", "nudes", "porn",
  "beheaded", "beheading", "dismembered", "mutilated", "chop-chop", "decapitated", "gore", "gruesome", "massacre",
  "hacked to death", "stabbed to death", "shot dead", "found dead", "burned alive", "suicide", "kills self", "killed himself", "killed herself",
  "child abuse", "pedophile", "paedophile", "trafficked",
];
/** Not news for an office front page: puzzle answers, horoscopes, lottery draws, shopping deals */
export const HEADLINE_NOISE: string[] = [
  "wordle", "connections hints", "nyt connections", "strands hints", "crossword", "horoscope", "zodiac", "lotto result", "lotto results", "lotto draw",
  "swertres", "ez2", "promo code", "coupon", "best deals", "prime day",
  // promotions, shopping and celebrity items
  "pop-up", "wedding dress", "bridal", "shopping experience", "on sale", "discount", "giveaway", "raffle", "fashion week", "red carpet",
  "guesting", "love team", "pageant", "showbiz", "celebrity", "birthday bash", "music video", "concert tickets", "box office",
];
const DENY = new RegExp(`(?:^|[^a-z])(?:${[...HEADLINE_DENYLIST, ...HEADLINE_NOISE].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[ -]")).join("|")})(?:[^a-z]|$)`, "i");
/** Not publishers: a "headline" from one of these is somebody's post, not news */
export const SOURCE_DENYLIST = ["facebook.com", "m.facebook.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "instagram.com", "reddit.com", "threads.net", "linkedin.com"];

export function isWorkplaceAppropriate(title: string): boolean {
  return !DENY.test(title);
}

export function toHeadlines(items: Awaited<ReturnType<typeof fetchRss>>, category: Headline["category"], limit: number): Headline[] {
  const seen = new Set<string>();
  const out: Headline[] = [];
  for (const item of items) {
    const title = stripSourceSuffix(item.title, item.source);
    const key = normaliseTitle(title);
    if (!key || seen.has(key) || !isWorkplaceAppropriate(title)) continue;
    if (SOURCE_DENYLIST.includes(domainOf(item.sourceUrl)) || SOURCE_DENYLIST.includes(item.source.toLowerCase())) continue;
    seen.add(key);
    out.push({
      id: titleId(title),
      title,
      url: item.link,
      source: item.source || domainOf(item.sourceUrl) || "Google News",
      sourceDomain: domainOf(item.sourceUrl),
      publishedAt: item.pubDate,
      category,
    });
  }
  return out.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "")).slice(0, limit);
}

async function loadCategory(category: NewsCategoryKey): Promise<{ items: Headline[]; updatedAt: string }> {
  const items = toHeadlines(await fetchRss(TRENDING_FEEDS[category]), category, PER_CATEGORY);
  if (!items.length) throw new Error(`no headlines for ${category}`);
  return { items, updatedAt: new Date().toISOString() };
}

const cached = Object.fromEntries(
  NEWS_CATEGORIES.map((c) => [
    c,
    unstable_cache(() => loadCategory(c), ["home-trending", c, "v2"], { revalidate: SERVER_TTL.trending, tags: [CACHE_TAGS.trending, `${CACHE_TAGS.trending}:${c}`] }),
  ])
) as Record<NewsCategoryKey, () => Promise<{ items: Headline[]; updatedAt: string }>>;

/** One category. On failure: the last good list, marked not-ok; an empty list if there never was one. */
export async function getTrending(category: NewsCategoryKey): Promise<TrendingResult> {
  const { data, ok } = await withLastGood(`trending:${category}`, cached[category]);
  return {
    category,
    items: data?.items ?? [],
    status: { source: "Google News", updatedAt: data?.updatedAt ?? new Date().toISOString(), ok, nextRefreshAt: nextRefreshAt(SERVER_TTL.trending) },
  };
}

export async function getAllTrending(): Promise<Record<NewsCategoryKey, TrendingResult>> {
  const results = await Promise.all(NEWS_CATEGORIES.map((c) => getTrending(c)));
  return Object.fromEntries(results.map((r) => [r.category, r])) as Record<NewsCategoryKey, TrendingResult>;
}
