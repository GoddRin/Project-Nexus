/**
 * The hero's photographs. Chosen by looking at every landscape photograph in
 * public/project-images (5 October 2026): sharp single-frame shots of the works themselves
 * (a weir, a dam, solar fields, a bridge, a tunnel portal, transmission towers, a power plant),
 * with no people as the subject and no collages. They are the company's own photographs of
 * these projects, taken from its website.
 *
 * `focus` is the CSS object-position that keeps the subject in frame: the wide desktop hero
 * crops top and bottom (so the vertical figure matters there), the tall phone hero crops the
 * sides (so the horizontal one matters there). The first entry is the page's LCP image.
 *
 * Note: the company publishes these at about 770 px wide, so on a large screen they are shown
 * enlarged under the overlay. Replace a file with a larger original when one is available.
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
    src: "/project-images/catuiran-hydro-2.jpg",
    alt: "Water running over the concrete intake weir of the Catuiran hydroelectric plant, between rock banks",
    project: "Catuiran HEPP", location: "Naujan, Oriental Mindoro", slug: "catuiran-hydro", focus: "62% 46%",
  },
  {
    src: "/project-images/toledo-solar-1.jpg",
    alt: "Aerial view of the Toledo solar power plant: rows of panels across rolling ground, hills behind",
    project: "Toledo Solar Power Plant", location: "Toledo, Cebu", slug: "toledo-solar", focus: "60% 55%",
  },
  {
    src: "/project-images/sfex-tunnel-3.jpg",
    alt: "The Subic Freeport Expressway crossing a forested valley on a bridge, seen from the air",
    project: "SFEX Capacity Expansion", location: "Bataan to Subic Bay", slug: "sfex-tunnel", focus: "58% 50%",
  },
  {
    src: "/project-images/catuiran-hydro-1.jpg",
    alt: "The Catuiran intake dam and its green reservoir in a steep river gorge",
    project: "Catuiran HEPP", location: "Naujan, Oriental Mindoro", slug: "catuiran-hydro", focus: "45% 45%",
  },
  {
    src: "/project-images/mariveles-500kv-1.jpg",
    alt: "A steel lattice tower of the Mariveles to Balsik 500 kV transmission line against a blue sky",
    project: "Mariveles–Balsik 500 kV Line", location: "Bataan", slug: "mariveles-500kv", focus: "58% 40%",
  },
  {
    src: "/project-images/toledo-solar-2.jpg",
    alt: "Solar panel arrays of the Toledo plant stretching to the horizon along a service road",
    project: "Toledo Solar Power Plant", location: "Toledo, Cebu", slug: "toledo-solar", focus: "62% 60%",
  },
  {
    src: "/project-images/sfex-tunnel-1.jpg",
    alt: "The concrete portal of the Subic Freeport Expressway bypass tunnel, cut into a rock face",
    project: "SFEX Bypass Tunnel", location: "Bataan to Subic Bay", slug: "sfex-tunnel", focus: "70% 50%",
  },
  {
    src: "/project-images/balingasag-thermal-1.jpg",
    alt: "Aerial view of the Balingasag thermal power plant: turbine halls, switchyard and coal yard",
    project: "Balingasag Thermal Power Plant", location: "Balingasag, Misamis Oriental", slug: "balingasag-thermal", focus: "55% 45%",
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
