import { getCompanyFeed } from "./companyFeed";
import { NEWS_CATEGORIES, getAllTrending } from "./newsAggregator";
import type { Headline } from "./types";

export interface TickerItem {
  id: string;
  title: string;
  href: string;
  external: boolean;
  source?: string;
  scic?: boolean;
}

const MAX_ITEMS = 15;
const MAX_SCIC = 4;

/**
 * The live ticker's items: up to fifteen, mixing the company's own news (Newsroom posts and
 * project events, at most four, newest first) into the headlines, which are dealt in turn from
 * each category so no one section fills the strip.
 */
export async function getTickerItems(): Promise<TickerItem[]> {
  const [trending, feed] = await Promise.all([getAllTrending().catch(() => null), getCompanyFeed({ limit: 30 }).catch(() => null)]);
  const scic: TickerItem[] = (feed?.items ?? [])
    .filter((i) => i.kind !== "PRESS")
    .slice(0, MAX_SCIC)
    .map((i) => ({ id: i.id, title: i.title, href: i.href, external: i.external, scic: true }));

  const queues: Headline[][] = NEWS_CATEGORIES.map((c) => [...(trending?.[c]?.items ?? [])]);
  const headlines: TickerItem[] = [];
  const seen = new Set<string>();
  while (headlines.length < MAX_ITEMS && queues.some((q) => q.length)) {
    for (const q of queues) {
      const h = q.shift();
      if (!h || seen.has(h.id)) continue;
      seen.add(h.id);
      headlines.push({ id: h.id, title: h.title, href: h.url, external: true, source: h.source });
    }
  }

  // one company item after every third headline
  const out: TickerItem[] = [];
  const company = [...scic];
  for (let i = 0; i < headlines.length && out.length < MAX_ITEMS; i++) {
    if (i > 0 && i % 3 === 0 && company.length && out.length < MAX_ITEMS - 1) out.push(company.shift() as TickerItem);
    out.push(headlines[i]);
  }
  return [...out, ...company].slice(0, MAX_ITEMS);
}
