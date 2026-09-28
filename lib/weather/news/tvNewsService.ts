import {
  NewsChannelId,
  TyphoonNewsVideo,
  TyphoonNewsFeedResponse,
  StormThreatLevel,
} from "./tvNewsTypes";
import { getMergedStorms } from "@/lib/weather/storms";
import { fetchPagasaSignals } from "@/lib/weather/pagasa";

interface ChannelConfig {
  id: Exclude<NewsChannelId, "all">;
  name: string;
  channelId: string;
  handle: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "pagasa",
    name: "DOST-PAGASA Weather",
    channelId: "UCpyLikj1x70S8UPxVqsPr6g",
    handle: "@dost_pagasa",
  },
  {
    id: "gma",
    name: "GMA Integrated News",
    channelId: "UCqYw-CTd1dU2yGI71sEyqNw",
    handle: "@gmanews",
  },
  {
    id: "abscbn",
    name: "ABS-CBN News",
    channelId: "UCE2606prvXQc_noEqKxVJXA",
    handle: "@abscbnnews",
  },
  {
    id: "tv5",
    name: "News5 Everywhere",
    channelId: "UCGEbMwiX774cseKvJqF9R2g",
    handle: "@News5Everywhere",
  },
];

// In-memory cache for news feed response
interface CacheEntry {
  data: TyphoonNewsFeedResponse;
  expiresAt: number;
}
let memoryCache: CacheEntry | null = null;

/**
 * Format relative time (e.g., "2 hours ago", "45 mins ago", "Yesterday")
 */
function getRelativeTimeAgo(isoDate: string): string {
  try {
    const published = new Date(isoDate).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - published) / 1000));

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoDate).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return "Recent";
  }
}

/**
 * Convert relative time text (e.g. "2 hours ago", "3 days ago", "1 year ago") to ISO string
 */
function parseRelativeTimeToIso(relText: string, index = 0): string {
  const now = Date.now() - index * 60000;
  if (!relText) return new Date(now).toISOString();

  const text = relText.toLowerCase().replace("streamed", "").replace("premiered", "").trim();
  const minMatch = text.match(/(\d+)\s*(?:m|min|minute)/);
  if (minMatch) return new Date(now - parseInt(minMatch[1], 10) * 60 * 1000).toISOString();

  const hrMatch = text.match(/(\d+)\s*(?:h|hr|hour)/);
  if (hrMatch) return new Date(now - parseInt(hrMatch[1], 10) * 3600 * 1000).toISOString();

  const dayMatch = text.match(/(\d+)\s*(?:d|day)/);
  if (dayMatch) return new Date(now - parseInt(dayMatch[1], 10) * 86400 * 1000).toISOString();

  const wkMatch = text.match(/(\d+)\s*(?:w|week)/);
  if (wkMatch) return new Date(now - parseInt(wkMatch[1], 10) * 7 * 86400 * 1000).toISOString();

  const moMatch = text.match(/(\d+)\s*(?:mo|month)/);
  if (moMatch) return new Date(now - parseInt(moMatch[1], 10) * 30 * 86400 * 1000).toISOString();

  const yrMatch = text.match(/(\d+)\s*(?:y|yr|year)/);
  if (yrMatch) return new Date(now - parseInt(yrMatch[1], 10) * 365 * 86400 * 1000).toISOString();

  return new Date(now).toISOString();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Extract text within XML tag helper
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  let text = match[1].trim();
  if (text.startsWith("<![CDATA[") && text.endsWith("]]>")) {
    text = text.substring(9, text.length - 3).trim();
  }
  return decodeHtmlEntities(text);
}

/**
 * Parses YouTube Atom XML feed into standard video objects
 */
function parseYouTubeAtom(xml: string, channel: ChannelConfig): TyphoonNewsVideo[] {
  const entries: TyphoonNewsVideo[] = [];
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const entryXml of entryMatches) {
    const videoId =
      extractTag(entryXml, "yt:videoId") ||
      extractTag(entryXml, "id").replace("yt:video:", "");
    const title = extractTag(entryXml, "title");
    const published = extractTag(entryXml, "published");

    if (!videoId || !title) continue;

    const lowerTitle = title.toLowerCase();
    // Atom feeds only syndicate finished uploads, not active live streams
    const isLive = false;

    const isPAGASABriefing =
      channel.id === "pagasa" &&
      (lowerTitle.includes("press briefing") ||
        lowerTitle.includes("bulletin") ||
        lowerTitle.includes("severe weather") ||
        lowerTitle.includes("tropical cyclone") ||
        lowerTitle.includes("public weather forecast") ||
        lowerTitle.includes("presscon") ||
        lowerTitle.includes("special weather"));

    entries.push({
      id: videoId,
      title,
      channelId: channel.id,
      channelName: channel.name,
      publishedAt: published,
      timeAgo: getRelativeTimeAgo(published),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      isLive,
      isPAGASABriefing,
      matchedKeywords: [],
      relevanceScore: 0,
    });
  }

  return entries;
}

async function fetchYouTubeHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[NewsFeed] Fallback scraper HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[NewsFeed] Scraper error for ${url}:`, err);
    return null;
  }
}

function extractVideosFromYtHtml(html: string, channel: ChannelConfig): TyphoonNewsVideo[] {
  const match =
    html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
    html.match(/ytInitialData = ({[\s\S]*?});/);
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    const videos: TyphoonNewsVideo[] = [];
    let idx = 0;

    // 1. Channel Tabs (Live Streams / Uploaded Videos)
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    // Prioritize the tab that actually has richGridRenderer contents loaded!
    const activeTab =
      tabs.find(
        (t: any) =>
          (t.tabRenderer?.content?.richGridRenderer?.contents?.length ?? 0) > 0
      ) ||
      tabs.find((t: any) => t.tabRenderer?.selected) ||
      tabs.find(
        (t: any) =>
          t.tabRenderer?.title?.toLowerCase() === "live" ||
          t.tabRenderer?.title?.toLowerCase() === "videos"
      );
    const gridContents =
      activeTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    for (const item of gridContents) {
      const lockup = item.richItemRenderer?.content?.lockupViewModel;
      if (!lockup) continue;

      const videoId =
        lockup.rendererContext?.commandContext?.onTap?.innertubeCommand
          ?.watchEndpoint?.videoId || lockup.contentId;
      const title =
        lockup.metadata?.lockupMetadataViewModel?.title?.content ||
        lockup.rendererContext?.accessibilityContext?.label ||
        "";

      if (!videoId || !title) continue;

      const metadataRows =
        lockup.metadata?.lockupMetadataViewModel?.metadata
          ?.contentMetadataViewModel?.metadataRows || [];
      let relText = "";
      for (const row of metadataRows) {
        for (const part of row.metadataParts || []) {
          const partLabel = part.accessibilityLabel || part.text?.content || "";
          if (
            partLabel.includes("ago") ||
            partLabel.includes("Streamed") ||
            partLabel.includes("Premiered")
          ) {
            relText = partLabel;
            break;
          }
        }
        if (relText) break;
      }

      const published = parseRelativeTimeToIso(relText, idx++);
      const lowerTitle = title.toLowerCase();
      const lowerRel = relText.toLowerCase();

      // Only mark isLive if stream is currently live now, not finished VOD
      const isLive =
        (lowerRel.includes("watching") ||
          lowerRel.includes("live now") ||
          lowerRel.includes("started streaming")) &&
        !lowerRel.includes("streamed") &&
        !lowerRel.includes("premiered");

      const isPAGASABriefing =
        channel.id === "pagasa" &&
        (isLive ||
          lowerTitle.includes("press briefing") ||
          lowerTitle.includes("bulletin") ||
          lowerTitle.includes("severe weather") ||
          lowerTitle.includes("tropical cyclone") ||
          lowerTitle.includes("public weather forecast") ||
          lowerTitle.includes("presscon") ||
          lowerTitle.includes("special weather"));

      videos.push({
        id: videoId,
        title,
        channelId: channel.id,
        channelName: channel.name,
        publishedAt: published,
        timeAgo: relText || getRelativeTimeAgo(published),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        isLive,
        isPAGASABriefing,
        matchedKeywords: [],
        relevanceScore: 0,
      });
    }

    // 2. Search Results List (used when querying targeted meteorological updates for networks)
    const searchSections =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];
    for (const section of searchSections) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (!vr) continue;

        const videoId = vr.videoId;
        const title =
          vr.title?.runs?.[0]?.text ||
          vr.title?.accessibility?.accessibilityData?.label ||
          "";
        if (!videoId || !title) continue;

        const relText = vr.publishedTimeText?.simpleText || "";
        const published = parseRelativeTimeToIso(relText, idx++);
        const lowerTitle = title.toLowerCase();
        const isLive =
          vr.badges?.some(
            (b: any) =>
              b.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW"
          ) || false;

        const isPAGASABriefing =
          channel.id === "pagasa" &&
          (isLive ||
            lowerTitle.includes("press briefing") ||
            lowerTitle.includes("bulletin") ||
            lowerTitle.includes("severe weather") ||
            lowerTitle.includes("tropical cyclone") ||
            lowerTitle.includes("public weather forecast") ||
            lowerTitle.includes("presscon") ||
            lowerTitle.includes("special weather"));

        videos.push({
          id: videoId,
          title,
          channelId: channel.id,
          channelName: channel.name,
          publishedAt: published,
          timeAgo: relText || getRelativeTimeAgo(published),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          isLive,
          isPAGASABriefing,
          matchedKeywords: [],
          relevanceScore: 0,
        });
      }
    }

    return videos;
  } catch {
    return [];
  }
}

/**
 * Resilient Tier 2 Scraper Fallback: Extracts videos directly from public YouTube HTML
 * For DOST-PAGASA, checks /streams first because official forecasts & storm briefings are live streamed!
 * For commercial channels (GMA, ABS-CBN, TV5), queries targeted meteorology searches so political/crime stories are avoided.
 */
async function scrapeChannelVideosFallback(channel: ChannelConfig): Promise<TyphoonNewsVideo[]> {
  const targetUrls: string[] = [];

  if (channel.id === "pagasa") {
    targetUrls.push(
      `https://www.youtube.com/${channel.handle}/streams`,
      `https://www.youtube.com/results?search_query=dost+pagasa+public+weather+forecast+press+briefing&sp=CAI%253D`,
      `https://www.youtube.com/${channel.handle}/videos`
    );
  } else {
    const query =
      channel.id === "gma"
        ? "gma news bagyo weather update"
        : channel.id === "abscbn"
        ? "abs-cbn news bagyo weather update"
        : "news5 everywhere bagyo weather update";

    targetUrls.push(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAI%253D`,
      `https://www.youtube.com/${channel.handle}/videos`
    );
  }

  const htmlResults = await Promise.all(targetUrls.map((u) => fetchYouTubeHtml(u)));
  const allVids: TyphoonNewsVideo[] = [];
  const seenIds = new Set<string>();

  for (const html of htmlResults) {
    if (!html) continue;
    const vids = extractVideosFromYtHtml(html, channel);
    for (const v of vids) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        allVids.push(v);
      }
    }
  }

  return allVids;
}

/**
 * STRICT METEOROLOGICAL KEYWORDS ONLY
 * Program titles (24 Oras, TV Patrol, Frontline Pilipinas) are intentionally purged
 * so general political, crime, or celebrity stories never match.
 */
const STRICT_WEATHER_KEYWORDS = [
  "bagyo",
  "typhoon",
  "tropical cyclone",
  "super typhoon",
  "tropical depression",
  "tropical storm",
  "signal no",
  "signal #",
  "tcws",
  "storm surge",
  "habagat",
  "amihan",
  "southwest monsoon",
  "northeast monsoon",
  "landfall",
  "philippine area of responsibility",
  "flash flood",
  "flood advisory",
  "heavy rainfall",
  "severe weather",
  "weather update",
  "weather report",
  "dost-pagasa",
  "pagasa",
  "public weather forecast",
  "baha",
  "low pressure area",
  "lpa",
];

/**
 * BLOCKLIST OF PROMOTIONAL / EDUCATIONAL / PR CONTENT
 * Explicitly rejects non-bulletin PR campaigns like "Typhoon and Flood Awareness Week" or "PANaHON App"
 */
const BLOCKED_TITLE_KEYWORDS = [
  "awareness week",
  "tfaw",
  "panahon app",
  "everyday weather companion",
  "what is el niño",
  "what is la niña",
  "what is el nino",
  "what is la nina",
  "infomercial",
  "anniversary",
  "documentary",
  "climate forum",
  "meteorological day",
  "podcast",
  "ep1:", "ep2:", "ep3:", "ep4:", "ep5:", "ep6:", "ep7:", "ep8:", "ep9:", "ep10:",
  "ep 1", "ep 2", "ep 3", "ep 4", "ep 5", "ep 6", "ep 7", "ep 8", "ep 9", "ep 10",
  "ep. 1", "ep. 2", "ep. 3", "ep. 4", "ep. 5", "ep. 6", "ep. 7", "ep. 8",
];

/**
 * MANDATORY AUTHORITATIVE METEOROLOGY TERMS FOR DOST-PAGASA
 */
const PAGASA_AUTHORITATIVE_TERMS = [
  "press briefing",
  "severe weather bulletin",
  "tropical cyclone",
  "weather forecast",
  "weather update",
  "weather report",
  "public weather forecast",
  "special weather",
  "tropical storm",
  "tropical depression",
  "super typhoon",
  "typhoon",
  "bagyo",
  "habagat",
  "amihan",
  "low pressure area",
  "lpa",
  "southwest monsoon",
  "northeast monsoon",
];

/**
 * Scores and filters video candidates based on authentic meteorological context
 */
function scoreAndFilterVideos(
  videos: TyphoonNewsVideo[],
  stormName?: string,
  isParActive = false
): TyphoonNewsVideo[] {
  const stormTerm = stormName ? stormName.toLowerCase().trim() : null;

  return videos
    .filter((vid) => {
      const lower = vid.title.toLowerCase();

      // 1. Immediately drop any video containing PR, awareness campaigns, educational series, or app promos
      if (BLOCKED_TITLE_KEYWORDS.some((kw) => lower.includes(kw))) {
        return false;
      }

      // 2. DOST-PAGASA videos MUST be authentic meteorological forecasts or cyclone bulletins
      if (vid.channelId === "pagasa") {
        const isStormNamed =
          (stormTerm && lower.includes(stormTerm)) ||
          lower.includes("queenie") ||
          lower.includes("surigae");
        const hasPagasaTerm = PAGASA_AUTHORITATIVE_TERMS.some((kw) => lower.includes(kw));

        if (!isStormNamed && !hasPagasaTerm && !vid.isLive) {
          return false;
        }
      }

      // 3. Absolute age cut-off: Discard anything older than 14 days (336 hours)
      const ageHours = (Date.now() - new Date(vid.publishedAt).getTime()) / (1000 * 3600);
      if (ageHours > 336) {
        return false;
      }

      return true;
    })
    .map((vid) => {
      let score = 0;
      const matched: string[] = [];
      const lower = vid.title.toLowerCase();

      // If active storm name matches, major score boost
      if (stormTerm && lower.includes(stormTerm)) {
        score += 150;
        matched.push(stormName!.toUpperCase());
      }
      if (lower.includes("queenie") || lower.includes("surigae")) {
        score += 120;
        matched.push("SURIGAE");
      }

      // Check for strict meteorological keywords
      for (const kw of STRICT_WEATHER_KEYWORDS) {
        if (lower.includes(kw)) {
          score += 20;
          matched.push(kw.toUpperCase());
        }
      }

      // DOST-PAGASA channel bonus
      if (vid.channelId === "pagasa") {
        score += 30; // PAGASA channel is 100% official meteorology
        if (lower.includes("press briefing") || lower.includes("severe weather")) {
          score += 45;
        } else if (lower.includes("weather update") || lower.includes("public weather forecast")) {
          score += 35;
        }
      }

      // Live stream major priority boost
      if (vid.isLive) {
        score += 250;
      }

      // Recency bonus / heavy penalty for stale videos
      const ageHours = (Date.now() - new Date(vid.publishedAt).getTime()) / (1000 * 3600);
      if (ageHours <= 6) {
        score += 50; // Hot fresh (within 6h)
      } else if (ageHours <= 24) {
        score += 30; // Today (within 24h)
      } else if (ageHours <= 72) {
        score += 15; // Within 3 days
      } else if (ageHours > 168) {
        score -= 60; // Older than 7 days
      }

      return {
        ...vid,
        matchedKeywords: Array.from(new Set(matched)),
        relevanceScore: score,
      };
    })
    .filter((vid) => {
      // Commercial news networks (GMA, ABS-CBN, TV5) MUST match at least one strict meteorological term
      if (vid.channelId !== "pagasa") {
        return vid.matchedKeywords.length > 0 && vid.relevanceScore >= 20;
      }
      return true;
    })
    .sort((a, b) => {
      // Genuine live streams always take absolute priority at the top
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;

      // If one matches the active storm name directly, it ranks highest
      if (stormTerm) {
        const aStorm = a.matchedKeywords.includes(stormName!.toUpperCase()) || a.title.toLowerCase().includes("queenie");
        const bStorm = b.matchedKeywords.includes(stormName!.toUpperCase()) || b.title.toLowerCase().includes("queenie");
        if (aStorm && !bStorm) return -1;
        if (!aStorm && bStorm) return 1;
      }
      // Otherwise sort by combined relevance and recency
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

/**
 * Evaluates the current storm threat level and determines the adaptive cache TTL
 */
async function evaluateThreatLevel(): Promise<{
  threatLevel: StormThreatLevel;
  ttlMinutes: number;
  updateIntervalHours: number;
  activeStormName?: string;
  hasStormInPar: boolean;
  highestSignal: number;
}> {
  try {
    const [stormsResult, pagasaSignals] = await Promise.all([
      getMergedStorms(false).catch(() => null),
      fetchPagasaSignals().catch(() => null),
    ]);

    const parStorms = stormsResult?.parStorms || [];
    const activeStormName =
      pagasaSignals?.tcName || (parStorms.length > 0 ? parStorms[0]?.name : undefined);
    const hasStormInPar = parStorms.length > 0 || (pagasaSignals?.hasActiveBulletin ?? false);
    const highestSignal = pagasaSignals?.siteSignalNumber || 0;

    // Check closest approach distance to Tumauini HEPP (Site coordinates)
    const closestDistKm = parStorms[0]?.distanceKm ?? 9999;
    const isSuperTyphoon =
      parStorms.some((s) => s.category?.toLowerCase().includes("super") || (s.windSpeedKph ?? 0) >= 185) ||
      pagasaSignals?.tcCategory?.toLowerCase().includes("super");

    // Tier 1: RED (Super Typhoon, Signal 3-5, or within 200km)
    if (highestSignal >= 3 || isSuperTyphoon || (hasStormInPar && closestDistKm <= 200)) {
      return {
        threatLevel: "RED",
        ttlMinutes: 45, // Cache for 45 mins -> 1 to 2 hour update cadence
        updateIntervalHours: 1,
        activeStormName,
        hasStormInPar: true,
        highestSignal,
      };
    }

    // Tier 2: ORANGE (Active Cyclone in PAR / Signal 1-2)
    if (hasStormInPar || highestSignal >= 1) {
      return {
        threatLevel: "ORANGE",
        ttlMinutes: 120, // Cache for 2 hours -> 3 hour update cadence
        updateIntervalHours: 3,
        activeStormName,
        hasStormInPar: true,
        highestSignal,
      };
    }

    // Tier 3: YELLOW (Regional storm near PAR boundary)
    if ((stormsResult?.regionalStorms || []).length > 0) {
      return {
        threatLevel: "YELLOW",
        ttlMinutes: 240, // Cache for 4 hours -> 4 to 6 hour update cadence
        updateIntervalHours: 6,
        activeStormName: stormsResult?.regionalStorms[0]?.name,
        hasStormInPar: false,
        highestSignal: 0,
      };
    }

    // Tier 4: NORMAL (PAR Clear)
    return {
      threatLevel: "NORMAL",
      ttlMinutes: 360, // Cache for 6 hours
      updateIntervalHours: 6,
      activeStormName: undefined,
      hasStormInPar: false,
      highestSignal: 0,
    };
  } catch (err) {
    console.warn("Failed to evaluate storm threat level, defaulting to NORMAL:", err);
    return {
      threatLevel: "NORMAL",
      ttlMinutes: 360,
      updateIntervalHours: 6,
      activeStormName: undefined,
      hasStormInPar: false,
      highestSignal: 0,
    };
  }
}

/**
 * Main syndication service: Fetches, parses, filters, and caches Filipino TV news broadcasts
 */
export async function getTyphoonNewsFeed(forceRefresh = false): Promise<TyphoonNewsFeedResponse> {
  const now = Date.now();

  if (!forceRefresh && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.data;
  }

  // 1. Evaluate threat level to set dynamic refresh policy
  const { threatLevel, ttlMinutes, updateIntervalHours, activeStormName, hasStormInPar, highestSignal } =
    await evaluateThreatLevel();

  // 2. Fetch all 4 YouTube Atom feeds in parallel with 6s timeout
  const sourcesChecked: string[] = [];
  const channelVideos: {
    pagasa: TyphoonNewsVideo[];
    gma: TyphoonNewsVideo[];
    abscbn: TyphoonNewsVideo[];
    tv5: TyphoonNewsVideo[];
  } = {
    pagasa: [],
    gma: [],
    abscbn: [],
    tv5: [],
  };

  // 2. Fetch all 4 feeds in parallel: Tier 1 (Atom XML) -> Tier 2 (Direct HTML Scraper) -> Tier 3 (Stale Cache Guard)
  await Promise.all(
    CHANNELS.map(async (channel) => {
      let rawVideos: TyphoonNewsVideo[] = [];
      const atomUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;

      // Tier 1: Try Atom XML Feed
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(atomUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "ProjectNexus-WeatherDesk/1.0 (Mozilla/5.0 compatible)",
          },
          cache: "no-store",
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const xml = await res.text();
          rawVideos = parseYouTubeAtom(xml, channel);
        } else {
          console.warn(`[NewsFeed] Channel ${channel.id} Atom feed HTTP ${res.status}`);
        }
      } catch (atomErr) {
        console.warn(`[NewsFeed] Channel ${channel.id} Atom feed error:`, atomErr);
      }

      // Tier 2: If Atom XML failed, rate-limited, or returned 0 entries, trigger direct HTML channel scraper
      if (rawVideos.length === 0) {
        try {
          rawVideos = await scrapeChannelVideosFallback(channel);
          if (rawVideos.length > 0) {
            console.info(`[NewsFeed] Recovered ${rawVideos.length} videos for ${channel.id} via direct scraper fallback.`);
          }
        } catch (scraperErr) {
          console.warn(`[NewsFeed] Fallback scraper error for ${channel.id}:`, scraperErr);
        }
      }

      // Tier 3: Score and apply cache guard
      if (rawVideos.length > 0) {
        const scored = scoreAndFilterVideos(rawVideos, activeStormName, hasStormInPar);
        channelVideos[channel.id] = scored;
        sourcesChecked.push(channel.name);
      } else if (memoryCache?.data?.channels[channel.id]?.length) {
        // Stale-While-Revalidate: preserve previously cached items so transient network issues don't wipe valid state
        channelVideos[channel.id] = memoryCache.data.channels[channel.id];
        sourcesChecked.push(`${channel.name} (cached)`);
        console.warn(`[NewsFeed] Using cached bulletins for ${channel.id} due to upstream network failure.`);
      }
    })
  );

  // 3. Select Featured Video
  // Priority:
  // 1) Currently Live On-Air Broadcast (PAGASA first, then commercial networks)
  // 2) Active Storm Briefing from DOST-PAGASA (matching SURIGAE or Queenie or activeStormName)
  // 3) Active Storm Briefing from GMA / ABS-CBN / TV5
  // 4) Today's official DOST-PAGASA Public Weather Forecast (5 AM / 5 PM)
  let featuredVideo: TyphoonNewsVideo | null = null;
  let isPAGASAFallbackForecast = false;

  const pagasaVideos = channelVideos.pagasa;
  const allChannelVideos = [
    ...channelVideos.pagasa,
    ...channelVideos.gma,
    ...channelVideos.abscbn,
    ...channelVideos.tv5,
  ];

  // Priority 1: Genuine Live Stream
  const liveStream = allChannelVideos.find((v) => v.isLive);
  if (liveStream) {
    featuredVideo = liveStream;
  }

  // Priority 2: Active storm match from DOST-PAGASA
  if (!featuredVideo && activeStormName) {
    const stormUpper = activeStormName.toUpperCase();
    const pagasaStormMatch = pagasaVideos.find((v) => {
      const lower = v.title.toLowerCase();
      return (
        v.matchedKeywords.includes(stormUpper) ||
        lower.includes(stormUpper.toLowerCase()) ||
        lower.includes("queenie") ||
        lower.includes("surigae")
      );
    });

    if (pagasaStormMatch) {
      featuredVideo = pagasaStormMatch;
    }
  }

  // Priority 3: Active storm match from GMA / ABS-CBN / TV5
  if (!featuredVideo && activeStormName) {
    const stormUpper = activeStormName.toUpperCase();
    const commercialMatch = allChannelVideos.find((v) => {
      if (v.channelId === "pagasa") return false;
      const lower = v.title.toLowerCase();
      return (
        v.matchedKeywords.includes(stormUpper) ||
        lower.includes(stormUpper.toLowerCase()) ||
        lower.includes("queenie") ||
        lower.includes("surigae")
      );
    });

    if (commercialMatch) {
      featuredVideo = commercialMatch;
    }
  }

  // Priority 4: Fall back to DOST-PAGASA's latest public forecast or briefing
  if (!featuredVideo && pagasaVideos.length > 0) {
    featuredVideo = pagasaVideos[0];
    isPAGASAFallbackForecast = true;
  }

  // 4. Create Unified Latest Bulletins (Top 12 across all channels sorted by freshness and relevance)
  const allVideos = [
    ...channelVideos.pagasa,
    ...channelVideos.gma,
    ...channelVideos.abscbn,
    ...channelVideos.tv5,
  ];

  // Deduplicate by ID
  const uniqueMap = new Map<string, TyphoonNewsVideo>();
  for (const vid of allVideos) {
    if (!uniqueMap.has(vid.id)) {
      uniqueMap.set(vid.id, vid);
    }
  }

  const latestBulletins = Array.from(uniqueMap.values())
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 12);

  const responseData: TyphoonNewsFeedResponse = {
    activeStormName,
    hasStormInPar,
    highestSignal,
    threatLevel,
    updateIntervalHours,
    nextRefreshAt: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
    cachedAt: new Date(now).toISOString(),
    featuredVideo,
    channels: channelVideos,
    latestBulletins,
    sourcesChecked,
    isPAGASAFallbackForecast,
  };

  // Save to memory cache
  memoryCache = {
    data: responseData,
    expiresAt: now + ttlMinutes * 60 * 1000,
  };

  return responseData;
}
