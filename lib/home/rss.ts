import { createHash } from "node:crypto";
import { UPSTREAM_TIMEOUT_MS, USER_AGENT } from "./refreshPolicy";

/**
 * A small RSS reader for Google News feeds, with regular expressions in the manner of
 * lib/weather/gdacs.ts (no XML library).
 */

export interface RssItem {
  title: string;
  link: string;
  pubDate: string; // ISO, or "" when the feed gave none
  source: string;
  sourceUrl: string;
  /** the story's picture, when the feed carries one (publishers' own feeds do; Google News does not) */
  image?: string;
  /** the feed's summary, as plain text (at most 240 characters) */
  summary?: string;
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** &amp; &#8217; &#x2019; -> characters (twice, because feeds double-encode titles) */
export function decodeEntities(input: string): string {
  const once = (s: string) =>
    s
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
  return once(once(input));
}

function field(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  return decodeEntities(m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim());
}

/**
 * The picture a feed attaches to a story: media:content, media:thumbnail or an image enclosure,
 * else the first <img> in the item (publishers put one at the head of the description).
 */
function imageOf(block: string): string | undefined {
  const tagged =
    block.match(/<media:content\b[^>]*\burl="([^"]+)"[^>]*>/i)?.[1] ??
    block.match(/<enclosure\b[^>]*\burl="([^"]+)"[^>]*\btype="image\/[^"]*"[^>]*>/i)?.[1] ??
    block.match(/<enclosure\b[^>]*\btype="image\/[^"]*"[^>]*\burl="([^"]+)"[^>]*>/i)?.[1] ??
    block.match(/<media:thumbnail\b[^>]*\burl="([^"]+)"[^>]*>/i)?.[1];
  const inline = block.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ?? decodeEntities(block).match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
  const url = tagged ?? inline;
  return url ? decodeEntities(url).trim() : undefined;
}

function summaryOf(block: string): string | undefined {
  const text = field(block, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 240 ? `${text.slice(0, 239).replace(/\s+\S*$/, "")}…` : text;
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = field(block, "title").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const link = field(block, "link");
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const rawDate = field(block, "pubDate");
    const time = rawDate ? Date.parse(rawDate) : NaN;
    const sourceUrl = decodeEntities(block.match(/<source[^>]*\surl="([^"]*)"/i)?.[1] ?? "");
    items.push({
      title,
      link,
      pubDate: Number.isFinite(time) ? new Date(time).toISOString() : "",
      source: field(block, "source"),
      sourceUrl,
      image: imageOf(block),
      summary: summaryOf(block),
    });
  }
  return items;
}

/** Fetches a feed. Throws on a network error, a timeout, a non-200 answer or a body that is not RSS. */
export async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    cache: "no-store", // (the caller caches the parsed result with unstable_cache)
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8" },
  });
  if (!res.ok) throw new Error(`RSS ${res.status} from ${new URL(url).hostname}`);
  const xml = await res.text();
  if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) throw new Error(`not an RSS document from ${new URL(url).hostname}`);
  return parseRss(xml);
}

/** "inquirer.net" from "https://www.inquirer.net/..." */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Lower case, no punctuation: two wordings of one headline compare equal */
export function normaliseTitle(title: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function titleId(title: string): string {
  return createHash("sha1").update(normaliseTitle(title)).digest("hex").slice(0, 16);
}

/** Google News titles end with " - Publisher": remove that tail when it names the item's source */
export function stripSourceSuffix(title: string, source: string): string {
  const cut = title.lastIndexOf(" - ");
  if (cut <= 0) return title;
  const tail = title.slice(cut + 3).trim();
  if (!source || normaliseTitle(tail) === normaliseTitle(source) || tail.length <= 40) return title.slice(0, cut).trim();
  return title;
}
