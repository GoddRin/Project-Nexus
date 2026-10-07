import { unstable_cache } from "next/cache";
import { withLastGood } from "./lastGood";
import { isWorkplaceAppropriate, NEWS_CATEGORIES } from "./newsAggregator";
import { CACHE_TAGS, SERVER_TTL } from "./refreshPolicy";
import { domainOf, fetchRss, normaliseTitle, titleId, type RssItem } from "./rss";
import type { NewsCategoryKey, PhotoStory } from "./types";

/**
 * Stories with their photographs, for the Headlines slideshow.
 *
 * Google News carries no pictures, so these come from the four publishers whose own RSS feeds
 * include one with every story: BusinessWorld, GMA News, The Manila Times and Rappler. Each
 * picture is the one the publisher chose for that story. A story is shown with its publisher's
 * name and links to the publisher's own page; nothing is copied or stored here (the browser
 * loads each picture from the publisher).
 *
 * The four tabs read the publishers' matching sections. "Energy & Infra" has no section of its
 * own anywhere, so it is picked by subject from the business and national sections.
 */

interface Feed {
  url: string;
  source: string;
}
const BW = "BusinessWorld";
const GMA = "GMA News";
const MT = "The Manila Times";
const RAPPLER = "Rappler";

const SECTION_FEEDS: Record<Exclude<NewsCategoryKey, "ENERGY">, Feed[]> = {
  PH: [
    { url: "https://data.gmanetwork.com/gno/rss/news/nation/feed.xml", source: GMA },
    { url: "https://www.manilatimes.net/news/feed/", source: MT },
    { url: "https://www.rappler.com/nation/feed/", source: RAPPLER },
    { url: "https://www.bworldonline.com/the-nation/feed/", source: BW },
  ],
  BUSINESS: [
    { url: "https://www.bworldonline.com/top-stories/feed/", source: BW },
    { url: "https://data.gmanetwork.com/gno/rss/money/feed.xml", source: GMA },
    { url: "https://www.manilatimes.net/business/feed/", source: MT },
    { url: "https://www.rappler.com/business/feed/", source: RAPPLER },
  ],
  WORLD: [
    { url: "https://data.gmanetwork.com/gno/rss/news/world/feed.xml", source: GMA },
    { url: "https://www.manilatimes.net/world/feed/", source: MT },
    { url: "https://www.rappler.com/world/feed/", source: RAPPLER },
    { url: "https://www.bworldonline.com/world/feed/", source: BW },
  ],
};
/** Extra sections read only for the Energy & Infra pick */
const ENERGY_EXTRA: Feed[] = [
  { url: "https://www.bworldonline.com/economy/feed/", source: BW },
  { url: "https://www.bworldonline.com/corporate/feed/", source: BW },
];
/** What makes a story an energy or infrastructure story (whole words, in the title or summary) */
const ENERGY_TERMS =
  /\b(energy|power plant|power supply|power rates?|electricity|electric|hydro\w*|solar|wind (?:farm|power|energy)|geothermal|renewables?|nuclear|lng|natural gas|coal|fuel|oil prices?|pump prices?|grid|ngcp|meralco|aboitiz power|acen|doe|erc|transmission|substation|megawatts?|mw|dam|reservoir|water supply|maynilad|manila water|infrastructure|dpwh|dotr|expressway|tollway|nlex|slex|bridge|railway|rail|subway|mrt|lrt|airport|seaport|port|flood control|public works|construction|ppp|cement|steel)\b/i;

const PER_CATEGORY = 8;
/** stories older than this are not news any more */
const MAX_AGE_MS = 4 * 86_400_000;

/**
 * The picture's address as the publisher serves it at full size: WordPress thumbnail suffixes
 * ("-300x169") and resize queries are removed, and a doubled host is repaired.
 */
function fullSize(url: string): string {
  let u = url.trim().replace(/^http:\/\//i, "https://");
  u = u.replace(/^(https:\/\/[^/]+)\/\1?(?:www\.[^/]+\/)(?=tachyon\/)/i, "$1/"); // "host/host/tachyon/..."
  u = u.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(\?.*)?$/i, "$1");
  if (/[?&](?:resize|w|width|fit|crop_strategy)=/i.test(u)) u = u.split("?")[0];
  return u;
}
const usable = (url: string | undefined): url is string => !!url && /^https:\/\/[^\s"'<>]+$/i.test(url) && !/\.(?:gif|svg)(?:\?|$)/i.test(url) && !/logo|placeholder|default[-_]?(?:image|thumb)/i.test(url);

function toStories(items: RssItem[], source: string, category: NewsCategoryKey, now: number): PhotoStory[] {
  const out: PhotoStory[] = [];
  for (const item of items) {
    const image = item.image ? fullSize(item.image) : undefined;
    if (!usable(image) || !isWorkplaceAppropriate(item.title) || !isWorkplaceAppropriate(item.summary ?? "")) continue;
    const time = item.pubDate ? Date.parse(item.pubDate) : NaN;
    if (Number.isFinite(time) && now - time > MAX_AGE_MS) continue;
    out.push({
      id: titleId(item.title),
      title: item.title,
      summary: item.summary || undefined,
      url: item.link,
      source,
      sourceDomain: domainOf(item.link),
      image,
      publishedAt: item.pubDate,
      category,
    });
  }
  return out;
}

/** Newest first, but dealt one publisher at a time, so no single outlet fills the slideshow */
function dealByPublisher(stories: PhotoStory[], limit: number): PhotoStory[] {
  const seen = new Set<string>();
  const queues = new Map<string, PhotoStory[]>();
  for (const s of [...stories].sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))) {
    const key = normaliseTitle(s.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    queues.set(s.source, [...(queues.get(s.source) ?? []), s]);
  }
  // the publisher with the newest story leads
  const order = [...queues.entries()].sort((a, b) => (b[1][0].publishedAt || "").localeCompare(a[1][0].publishedAt || "")).map(([k]) => k);
  const out: PhotoStory[] = [];
  while (out.length < limit && order.some((k) => queues.get(k)!.length)) {
    for (const k of order) {
      const next = queues.get(k)!.shift();
      if (next) out.push(next);
      if (out.length >= limit) break;
    }
  }
  return out;
}

async function loadPhotoStories(): Promise<Record<NewsCategoryKey, PhotoStory[]>> {
  const now = Date.now();
  const feeds = new Map<string, Feed>();
  for (const f of [...Object.values(SECTION_FEEDS).flat(), ...ENERGY_EXTRA]) feeds.set(f.url, f);
  // every feed is read once; one that fails simply contributes nothing
  const fetched = new Map<string, RssItem[]>();
  await Promise.all(
    [...feeds.values()].map(async (f) => {
      // (one more try: these are ordinary web servers and the odd request is slow)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          fetched.set(f.url, await fetchRss(f.url));
          return;
        } catch (err) {
          if (attempt === 1) console.warn(`[home] photo stories: ${f.source} feed not read:`, err instanceof Error ? err.message : err);
        }
      }
    })
  );
  // with fewer than two publishers answering, a slideshow would be one outlet's front page:
  // keep the last good set instead (the caller falls back to it)
  const publishers = new Set([...fetched.keys()].map((url) => feeds.get(url)!.source));
  if (publishers.size < 2) throw new Error(`only ${publishers.size} publisher feed(s) could be read`);

  const from = (list: Feed[], category: NewsCategoryKey) => list.flatMap((f) => toStories(fetched.get(f.url) ?? [], f.source, category, now));
  const energyPool = from([...SECTION_FEEDS.BUSINESS, ...ENERGY_EXTRA, ...SECTION_FEEDS.PH], "ENERGY").filter((s) => ENERGY_TERMS.test(`${s.title} ${s.summary ?? ""}`));
  const out = {
    PH: dealByPublisher(from(SECTION_FEEDS.PH, "PH"), PER_CATEGORY),
    BUSINESS: dealByPublisher(from(SECTION_FEEDS.BUSINESS, "BUSINESS"), PER_CATEGORY),
    WORLD: dealByPublisher(from(SECTION_FEEDS.WORLD, "WORLD"), PER_CATEGORY),
    ENERGY: dealByPublisher(energyPool, PER_CATEGORY),
  };
  if (!NEWS_CATEGORIES.some((c) => out[c].length)) throw new Error("the publisher feeds held no story with a photograph");
  return out;
}

const cached = unstable_cache(loadPhotoStories, ["home-photo-stories", "v2"], { revalidate: SERVER_TTL.trending, tags: [CACHE_TAGS.trending, `${CACHE_TAGS.trending}:photos`] });
const NONE: Record<NewsCategoryKey, PhotoStory[]> = { PH: [], ENERGY: [], BUSINESS: [], WORLD: [] };

/** Stories with photographs for each tab; empty lists when the publishers cannot be reached (the tabs then show plain headlines) */
export async function getPhotoStories(): Promise<Record<NewsCategoryKey, PhotoStory[]>> {
  return (await withLastGood("photo-stories", cached)).data ?? NONE;
}
