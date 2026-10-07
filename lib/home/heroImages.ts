/**
 * The hero's photographs: sixteen sharp, single-frame shots of the works themselves (a weir,
 * solar fields, bridges, a tunnel portal, transmission towers, treatment plants, a power plant),
 * with no people as the subject and no collages. They are the company's own photographs of
 * these projects, from its website, at full size: scripts/fetch-hero-images.mjs fetches the
 * originals (the Atlas uses the 768 px renditions of the same uploads) and writes them to
 * public/hero at up to 2400 px wide. The list of originals is scripts/hero-images.json.
 *
 * `focus` is the CSS object-position that keeps the subject in frame: the wide desktop hero
 * crops top and bottom (so the vertical figure matters there), the tall phone hero crops the
 * sides (so the horizontal one matters there). The first entry is the page's LCP image.
 */
export interface HeroImage {
  src: string;
  alt: string;
  project: string;
  location: string;
  /** project slug in the Atlas, for the caption link */
  slug: string;
  focus: string;
}

export const HERO_IMAGES: HeroImage[] = [
  {
    src: "/hero/catuiran-weir.jpg",
    alt: "Water running over the concrete intake weir of the Catuiran hydroelectric plant, between rock banks",
    project: "Catuiran HEPP", location: "Naujan, Oriental Mindoro", slug: "catuiran-hydro", focus: "62% 46%",
  },
  {
    src: "/hero/toledo-solar-aerial.jpg",
    alt: "Aerial view of the Toledo solar power plant: rows of panels across rolling ground, hills behind",
    project: "Toledo Solar Power Plant", location: "Toledo, Cebu", slug: "toledo-solar", focus: "60% 55%",
  },
  {
    src: "/hero/sfex-bridge.jpg",
    alt: "The Subic Freeport Expressway crossing a forested valley on a bridge, seen from the air",
    project: "SFEX Capacity Expansion", location: "Bataan to Subic Bay", slug: "sfex-tunnel", focus: "58% 50%",
  },
  {
    src: "/hero/mariveles-tower.jpg",
    alt: "A steel lattice tower of the Mariveles to Balsik 500 kV transmission line against a blue sky",
    project: "Mariveles–Balsik 500 kV Line", location: "Bataan", slug: "mariveles-500kv", focus: "58% 40%",
  },
  {
    src: "/hero/la-mesa-wtp.jpg",
    alt: "Aerial view of the La Mesa water treatment plant: rows of filter basins among trees",
    project: "La Mesa Water Treatment Plant 1", location: "Novaliches, Quezon City", slug: "la-mesa-wtp", focus: "55% 50%",
  },
  {
    src: "/hero/sfex-portal.jpg",
    alt: "The concrete portal of the Subic Freeport Expressway bypass tunnel, cut into a rock face",
    project: "SFEX Bypass Tunnel", location: "Bataan to Subic Bay", slug: "sfex-tunnel", focus: "70% 50%",
  },
  {
    src: "/hero/tuguegarao-tower.jpg",
    alt: "A transmission tower of the Tuguegarao to Lal-lo 230 kV line standing over green fields",
    project: "Tuguegarao–Lal-lo 230 kV Line", location: "Cagayan", slug: "tuguegarao-lallo-230kv", focus: "70% 45%",
  },
  {
    src: "/hero/toledo-solar-rows.jpg",
    alt: "Solar panel rows of the Toledo plant running to the horizon",
    project: "Toledo Solar Power Plant", location: "Toledo, Cebu", slug: "toledo-solar", focus: "55% 60%",
  },
  {
    src: "/hero/marikina-north-stp.jpg",
    alt: "Aerial view of the Marikina North sewage treatment plant beside the city",
    project: "Marikina North Sewage Treatment Plant", location: "Marikina City", slug: "marikina-north-stp", focus: "55% 62%",
  },
  {
    src: "/hero/sfex-valley.jpg",
    alt: "The Subic Freeport Expressway running through forest, seen from above",
    project: "SFEX Capacity Expansion", location: "Bataan to Subic Bay", slug: "sfex-tunnel", focus: "55% 50%",
  },
  {
    src: "/hero/balingasag-thermal.jpg",
    alt: "Aerial view of the Balingasag thermal power plant: turbine halls, switchyard and coal yard",
    project: "Balingasag Thermal Power Plant", location: "Balingasag, Misamis Oriental", slug: "balingasag-thermal", focus: "55% 45%",
  },
  {
    src: "/hero/mariveles-line.jpg",
    alt: "Towers of the Mariveles to Balsik 500 kV line crossing wooded hills under a wide sky",
    project: "Mariveles–Balsik 500 kV Line", location: "Bataan", slug: "mariveles-500kv", focus: "60% 45%",
  },
  {
    src: "/hero/subic-flour-mill.jpg",
    alt: "Aerial view of the Subic Bay flour mill: silos, mill buildings and warehouses",
    project: "Subic Bay Flour Mill", location: "Subic Bay Freeport Zone", slug: "subic-flour-mill", focus: "50% 55%",
  },
  {
    src: "/hero/sctex.jpg",
    alt: "The Subic-Clark-Tarlac Expressway running along an embankment toward the mountains",
    project: "SCTEX Package 1", location: "Subic to Clark", slug: "sctex-pkg1", focus: "60% 55%",
  },
  {
    src: "/hero/toledo-solar-field.jpg",
    alt: "The Toledo solar field from the air, with its service road and control building",
    project: "Toledo Solar Power Plant", location: "Toledo, Cebu", slug: "toledo-solar", focus: "62% 60%",
  },
  {
    src: "/hero/la-mesa-basins.jpg",
    alt: "Settling ponds and clarifiers of the La Mesa water treatment plant from the air",
    project: "La Mesa Water Treatment Plant 1", location: "Novaliches, Quezon City", slug: "la-mesa-wtp", focus: "50% 50%",
  },
];

/** Seconds each photograph stays before the cross-fade */
export const HERO_SLIDE_SECONDS = 9;

export type DayPart = "dawn" | "day" | "dusk" | "night";

/** dawn 05-08, day 08-16, dusk 16-19, night 19-05 (hour in Asia/Manila) */
export function dayPartFor(hour: number): DayPart {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

/** The time-of-day wash over the hero photograph, as a CSS background made of SCIC tokens */
export const HERO_TINT: Record<DayPart, string> = {
  dawn: "linear-gradient(120deg, color-mix(in srgb, var(--scic-green-energy) 6%, transparent), color-mix(in srgb, var(--scic-amber) 6%, transparent))",
  day: "color-mix(in srgb, var(--scic-cyan) 6%, transparent)",
  dusk: "linear-gradient(120deg, color-mix(in srgb, var(--scic-amber) 8%, transparent), color-mix(in srgb, var(--scic-navy) 8%, transparent))",
  night: "color-mix(in srgb, var(--scic-navy) 12%, transparent)",
};

/** "Magandang umaga / tanghali / hapon / gabi" by the hour in Manila */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return "Magandang umaga";
  if (hour >= 11 && hour < 13) return "Magandang tanghali";
  if (hour >= 13 && hour < 18) return "Magandang hapon";
  return "Magandang gabi";
}
