export type NewsChannelId = "all" | "pagasa" | "gma" | "abscbn" | "tv5";

export interface TyphoonNewsVideo {
  id: string; // YouTube Video ID
  title: string;
  channelId: Exclude<NewsChannelId, "all">;
  channelName: string;
  publishedAt: string; // ISO 8601 string
  timeAgo: string; // e.g. "2 hours ago", "Yesterday"
  thumbnailUrl: string; // e.g. https://i.ytimg.com/vi/{id}/hqdefault.jpg
  watchUrl: string; // e.g. https://www.youtube.com/watch?v={id}
  embedUrl: string; // e.g. https://www.youtube-nocookie.com/embed/{id}
  isLive: boolean;
  isPAGASABriefing: boolean;
  matchedKeywords: string[];
  relevanceScore: number;
}

export type StormThreatLevel = "RED" | "ORANGE" | "YELLOW" | "FAIR_DISTANT" | "NORMAL";

export interface ChannelMeta {
  id: Exclude<NewsChannelId, "all">;
  name: string;
  tagline: string;
  channelId: string;
  badgeColor: string;
  accentBorder: string;
}

export interface TyphoonNewsFeedResponse {
  activeStormName?: string;
  hasStormInPar: boolean;
  highestSignal: number;
  threatLevel: StormThreatLevel;
  updateIntervalHours: number; // 1, 3, or 6
  nextRefreshAt: string;
  cachedAt: string;
  featuredVideo: TyphoonNewsVideo | null;
  channels: {
    pagasa: TyphoonNewsVideo[];
    gma: TyphoonNewsVideo[];
    abscbn: TyphoonNewsVideo[];
    tv5: TyphoonNewsVideo[];
  };
  latestBulletins: TyphoonNewsVideo[];
  sourcesChecked: string[];
  isPAGASAFallbackForecast: boolean;
}
