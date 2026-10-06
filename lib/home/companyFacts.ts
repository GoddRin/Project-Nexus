/**
 * Company facts used in Nexus Home copy. This is the ONE place to edit them: the hero, the
 * 50-year seal, the legacy timeline and the seeded news posts all read from here.
 *
 * Every entry is a statement about the company supplied by SCIC. Nothing here is computed from
 * live data, and nothing on the page may add figures that are not in this file or the database.
 */

export const COMPANY_NAME = "Sta. Clara International Corporation";
export const COMPANY_SHORT = "SCIC";
export const BRAND_LINE = "Renew Your Energy.";
export const MISSION_LINE = "Engineering, procurement and construction for the infrastructure that powers the Philippines.";

export const FOUNDED_YEAR = 1976;
export const ANNIVERSARY_YEAR = FOUNDED_YEAR + 50; // 2026
/** The current PCAB licence category (the highest), held since 9 April 2017; the company's first large-contractor category was "AAA" in 1995 */
export const PCAB_RATING = "AAAA";
export const PCAB_FIRST_RATING = "AAA";

/** Whole years in service, counted in Philippine time (so it turns over at midnight in Manila) */
export function yearsInService(now: Date = new Date()): number {
  const manilaYear = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric" }).format(now));
  return manilaYear - FOUNDED_YEAR;
}

/** The flagship site shown in the spotlight (database slug and site coordinates) */
export const FLAGSHIP = {
  slug: "tumauini-hepp",
  name: "Tumauini Hydroelectric Power Plant",
  shortName: "Tumauini HEPP",
  capacity: "11.3 MW",
  type: "Run-of-river",
  river: "Pinacanauan River",
  location: "Tumauini, Isabela",
  client: "Philnew Hydro Power Corporation",
  lat: 17.318823,
  lon: 121.974925,
} as const;

/** What the company builds */
export const EPC_SCOPE = [
  "Hydro", "Solar", "Wind", "Thermal", "Battery storage", "Water and sewage treatment",
  "Roads", "Bridges", "Tunnels", "Ports", "Buildings",
] as const;

/** Hydroelectric plants named in the company's history (name, rated capacity as the company states it) */
export const HYDRO_HIGHLIGHTS = [
  { name: "Siguil", capacity: "14.5 MW" },
  { name: "Sabangan", capacity: "14 MW" },
  { name: "Botocan", capacity: "2 × 10 MW" },
  { name: "Loboc", capacity: "1.2 MW" },
  { name: "Maladugao", capacity: "8.4 MW" },
] as const;

export interface TimelineEntry {
  /** shown on the node (a year, or a short figure such as "14+") */
  marker: string;
  /** used for ordering and for the "years ago" arithmetic; null for an entry that is not one year */
  year: number | null;
  title: string;
  caption: string;
}

/** The 50-year legacy timeline, oldest first */
export const TIMELINE: TimelineEntry[] = [
  {
    marker: "1976",
    year: 1976,
    title: "Founded",
    caption: "Established as Sta. Clara Trading & Construction Co.",
  },
  {
    marker: "1990",
    year: 1990,
    title: "Incorporated as SCIC",
    caption: "The company becomes Sta. Clara International Corporation.",
  },
  {
    marker: "1995",
    year: 1995,
    title: `PCAB "${PCAB_FIRST_RATING}"`,
    caption: "Licensed for General Engineering and General Building.",
  },
  {
    marker: "2004",
    year: 2004,
    title: "Middle East and SCPC",
    caption: "Expansion to Qatar, the UAE and Oman; sister developer Sta. Clara Power Corp. is formed.",
  },
  {
    marker: "2017",
    year: 2017,
    title: `PCAB "${PCAB_RATING}"`,
    caption: "Upgraded to Quadruple A, the highest contractor category.",
  },
  {
    marker: "14+",
    year: null,
    title: "Hydro plants delivered",
    caption: `Hydroelectric plants nationwide, among them ${HYDRO_HIGHLIGHTS.slice(0, 3).map((h) => `${h.name} (${h.capacity})`).join(", ")}.`,
  },
  {
    marker: String(ANNIVERSARY_YEAR),
    year: ANNIVERSARY_YEAR,
    title: "50 years",
    caption: "Half a century of building, and the launch of Project Nexus.",
  },
];
