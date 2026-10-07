/** Data contracts of Nexus Home: what the server sends and the client islands render. */

export type SourceStatus = { source: string; updatedAt: string; ok: boolean; nextRefreshAt: string };

export type WeatherSiteKey = "tumauini" | "manila";
export type WeatherGlyphKind =
  | "clear-day" | "clear-night" | "partly-cloudy" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog" | "wind";

export interface WeatherGlance {
  siteKey: WeatherSiteKey;
  site: { name: string; lat: number; lon: number };
  now: {
    tempC: number; feelsLikeC: number; humidity: number; windKph: number; windDir: number; precipMm: number;
    code: number; label: string; icon: WeatherGlyphKind; isNight: boolean;
  };
  today: { maxC: number; minC: number; rainChance: number; rainMm: number };
  /** the next 24 hours, hour by hour (local time of the site, "2026-10-06T14:00") */
  hours: { time: string; tempC: number; rainChance: number; rainMm: number; windKph: number; code: number; icon: WeatherGlyphKind }[];
  /** the days after today, as the forecast gives them (date is the site's local day, "2026-10-07") */
  outlook?: { date: string; maxC: number; minC: number; rainChance: number; rainMm: number; icon: WeatherGlyphKind }[];
  /** Go / caution / hold for site work. Construction sites only: absent for Manila HQ. */
  operational?: {
    verdict: "GO" | "CAUTION" | "HOLD";
    headline: string;
    detail: string;
    /** rain expected in the day shift (07:00-16:00) and the night shift (19:00-04:00), in mm */
    dayShiftMm: number;
    nightShiftMm: number;
    dayShiftMaxWindKph: number;
    /** when the heaviest rain is expected, if any ("2 PM - 4 PM") */
    peakRainWindow: string | null;
  };
  /** A wind signal raised over this site's own area */
  alert?: { level: "YELLOW" | "ORANGE" | "RED"; signal: number; stormName?: string; message: string };
  /** PAGASA has a tropical cyclone bulletin out (anywhere in the country) */
  bulletin: { active: boolean; stormName?: string; available: boolean };
  status: SourceStatus;
}

export type NewsCategoryKey = "PH" | "ENERGY" | "BUSINESS" | "WORLD";
export interface Headline {
  id: string; // hash of the normalised title
  title: string; // without the trailing " - Source"
  url: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  category: NewsCategoryKey | "SCIC_PRESS";
}
/** A story with the photograph its publisher attached to it (see lib/home/newsPhotos.ts) */
export interface PhotoStory {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  sourceDomain: string;
  /** the publisher's own picture for this story, loaded from the publisher */
  image: string;
  publishedAt: string;
  category: NewsCategoryKey;
}
export interface TrendingResult {
  category: NewsCategoryKey;
  items: Headline[];
  /** stories with photographs for the slideshow; empty when the publishers' feeds cannot be read */
  photos: PhotoStory[];
  status: SourceStatus;
}

export type FeedItemKind = "POST" | "PULSE" | "PRESS";
export interface CompanyFeedItem {
  id: string;
  kind: FeedItemKind;
  category: string; // NewsCategory enum value, or the pulse type
  title: string;
  excerpt?: string;
  href: string; // internal route or external url
  external: boolean;
  coverImage?: string;
  projectName?: string;
  source?: string; // PRESS: publisher and its domain
  sourceDomain?: string;
  publishedAt: string;
  pinned?: boolean;
}
export interface CompanyFeedResult {
  items: CompanyFeedItem[];
  status: SourceStatus;
}

export interface PortfolioStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  /** megawatts of the power plants worked on (plant ratings; unconfirmed records left out) */
  totalMw: number;
  /** of which hydro, wind and solar */
  renewableMw: number;
  provinces: number;
  yearsInService: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  mapPoints: { slug: string; name: string; lat: number; lon: number; status: string; category: string; capacity?: string; location?: string }[];
  featured: { slug: string; id: string; name: string; image?: string; status: string; percentComplete?: number; capacity?: string; location?: string; category: string }[];
  status: SourceStatus;
}

export type BriefSlot = "MORNING" | "MIDDAY" | "EVENING";
export interface DailyBrief {
  slot: BriefSlot;
  headline: string;
  bullets: string[];
  mood: "CALM" | "WATCH" | "ALERT";
  generatedAt: string;
  /** provider and model that wrote it, or "template" for the automatic summary */
  model: string;
  fallback: boolean;
}

export interface ForexRate {
  phpPerUsd: number;
  asOf: string;
}
