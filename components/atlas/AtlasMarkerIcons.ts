/**
 * ============================================================
 * AtlasMarkerIcons.ts
 * Sta. Clara Project Atlas — Engineering Marker Symbology & Registry
 * ============================================================
 *
 * Provides the single source of truth for:
 * 1. Canonical Category -> Marker Icon Identity (Phase 2 taxonomy)
 * 2. High-DPI Vector SVG Marker Badges (64x64 Retina artwork)
 * 3. MapLibre Image Registration Pipeline with Deduplication
 */

import type * as maplibregl from "maplibre-gl";
import { ProjectCategoryId } from "@/lib/validations/projectAtlasSchema";

export interface CategoryMarkerConfig {
  categoryId: ProjectCategoryId;
  iconName: string; // e.g., "marker-hydro"
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  svgInnerPath: string;
  dataUrl?: string;
}

/**
 * High-precision vector paths designed for 64x64 canvas.
 * Center circle: cx=32, cy=32, r=22.
 * Inner glyphs centered within the 20x20 bounding box (x: 22..42, y: 22..42).
 */
export const CATEGORY_ICON_REGISTRY: Record<ProjectCategoryId, CategoryMarkerConfig> = {
  HYDROPOWER: {
    categoryId: "HYDROPOWER",
    iconName: "marker-hydro",
    label: "Hydropower & Renewable Energy",
    shortLabel: "Hydropower",
    color: "#10A51D",
    textColor: "#ffffff",
    // Runner blade turbine with integrated lightning bolt energy core
    svgInnerPath: `
      <path d="M32 18 L25 31 L31 31 L29 46 L39 30 L33 30 Z" fill="#ffffff" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="11" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>
    `,
  },
  WIND_POWER: {
    categoryId: "WIND_POWER",
    iconName: "marker-wind",
    label: "Wind Power & Clean Aerogenerators",
    shortLabel: "Wind Power",
    color: "#06B6D4",
    textColor: "#ffffff",
    // 3-blade aerodynamic wind turbine generator with tower and air current trails
    svgInnerPath: `
      <polygon points="31,28 33,28 34.5,47 29.5,47" fill="#ffffff" opacity="0.9"/>
      <circle cx="32" cy="28" r="3" fill="#ffffff"/>
      <path d="M32 28 C30.8 23 30.8 17 32 13 C33.2 17 33.2 23 32 28 Z" fill="#ffffff"/>
      <path d="M32 28 C36.5 27 41.5 30.5 45 35.5 C41 36.2 36 33.5 32 28 Z" fill="#ffffff"/>
      <path d="M32 28 C32.5 33.5 27.5 36.2 19 35.5 C22.5 30.5 27.5 27 32 28 Z" fill="#ffffff"/>
      <circle cx="32" cy="28" r="1.2" fill="#06B6D4"/>
      <path d="M21 21 Q25 18 29 20" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <path d="M35 39 Q39 41 43 38" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    `,
  },
  WATER_RESOURCES: {
    categoryId: "WATER_RESOURCES",
    iconName: "marker-water",
    label: "Water Utilities, Treatment & Reservoirs",
    shortLabel: "Water Resources",
    color: "#00A3E0",
    textColor: "#ffffff",
    // Water drop with dual hydrodynamic flow waves
    svgInnerPath: `
      <path d="M32 18 C28 24 23 29 23 35 C23 40 27 44 32 44 C37 44 41 40 41 35 C41 29 36 24 32 18 Z" fill="#ffffff"/>
      <path d="M26 36 C28 39 30 39 32 39 C34 39 36 39 38 36" fill="none" stroke="#00A3E0" stroke-width="1.8" stroke-linecap="round"/>
    `,
  },
  ROADS_HIGHWAYS: {
    categoryId: "ROADS_HIGHWAYS",
    iconName: "marker-roads",
    label: "Highways, Expressways & Roads",
    shortLabel: "Roads & Highways",
    color: "#F59E0B",
    textColor: "#ffffff",
    // Perspective dual-lane highway with dashed centerline
    svgInnerPath: `
      <path d="M24 45 L29 19 L35 19 L40 45 Z" fill="#ffffff" opacity="0.95"/>
      <line x1="32" y1="21" x2="32" y2="27" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="31" x2="32" y2="37" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
      <line x1="32" y1="41" x2="32" y2="44" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  BRIDGES: {
    categoryId: "BRIDGES",
    iconName: "marker-bridge",
    label: "Major Bridges & Flyovers",
    shortLabel: "Bridges",
    color: "#EC4899",
    textColor: "#ffffff",
    // Arch suspension bridge with deck and vertical stay cables
    svgInnerPath: `
      <path d="M22 35 L42 35" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 35 Q32 21 42 35" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="26" y1="31" x2="26" y2="35" stroke="#ffffff" stroke-width="1.6"/>
      <line x1="32" y1="28" x2="32" y2="35" stroke="#ffffff" stroke-width="1.6"/>
      <line x1="38" y1="31" x2="38" y2="35" stroke="#ffffff" stroke-width="1.6"/>
      <path d="M21 35 L21 43 M43 35 L43 43" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  RAIL_TRANSIT: {
    categoryId: "RAIL_TRANSIT",
    iconName: "marker-rail",
    label: "Railways & Mass Transit",
    shortLabel: "Rail & Transit",
    color: "#8B5CF6",
    textColor: "#ffffff",
    // Front locomotive / mass transit train
    svgInnerPath: `
      <rect x="25" y="20" width="14" height="18" rx="4" fill="#ffffff"/>
      <rect x="27" y="23" width="10" height="5" rx="1.5" fill="#8B5CF6"/>
      <circle cx="28" cy="33" r="1.5" fill="#8B5CF6"/>
      <circle cx="36" cy="33" r="1.5" fill="#8B5CF6"/>
      <path d="M23 43 L41 43 M26 40 L24 44 M38 40 L40 44" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    `,
  },
  BUILDINGS: {
    categoryId: "BUILDINGS",
    iconName: "marker-buildings",
    label: "Commercial & Institutional Buildings",
    shortLabel: "Buildings",
    color: "#6366F1",
    textColor: "#ffffff",
    // Dual commercial towers with structural architectural grid
    svgInnerPath: `
      <rect x="24" y="25" width="8" height="19" rx="1" fill="#ffffff"/>
      <rect x="33" y="19" width="8" height="25" rx="1" fill="#ffffff"/>
      <line x1="26" y1="29" x2="30" y2="29" stroke="#6366F1" stroke-width="1.2"/>
      <line x1="26" y1="34" x2="30" y2="34" stroke="#6366F1" stroke-width="1.2"/>
      <line x1="35" y1="24" x2="39" y2="24" stroke="#6366F1" stroke-width="1.2"/>
      <line x1="35" y1="29" x2="39" y2="29" stroke="#6366F1" stroke-width="1.2"/>
      <line x1="35" y1="34" x2="39" y2="34" stroke="#6366F1" stroke-width="1.2"/>
    `,
  },
  INDUSTRIAL: {
    categoryId: "INDUSTRIAL",
    iconName: "marker-industrial",
    label: "Industrial Facilities & Manufacturing",
    shortLabel: "Industrial",
    color: "#14B8A6",
    textColor: "#ffffff",
    // Industrial plant with sawtooth roofline and smokestack
    svgInnerPath: `
      <path d="M22 43 L22 34 L27 28 L27 34 L32 28 L32 34 L37 28 L37 43 Z" fill="#ffffff"/>
      <rect x="38" y="21" width="4" height="22" rx="0.5" fill="#ffffff"/>
      <circle cx="28" cy="38" r="2" fill="#14B8A6"/>
    `,
  },
  ENERGY_GRID: {
    categoryId: "ENERGY_GRID",
    iconName: "marker-grid",
    label: "Power Generation & Grid Substations",
    shortLabel: "Energy Grid",
    color: "#3B82F6",
    textColor: "#ffffff",
    // High-voltage transmission pylon / lattice tower
    svgInnerPath: `
      <path d="M32 18 L26 44 M32 18 L38 44" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="23" y1="26" x2="41" y2="26" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="34" x2="40" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="27" y1="41" x2="37" y2="41" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="27" y1="26" x2="37" y2="34" stroke="#ffffff" stroke-width="1.2"/>
      <line x1="37" y1="26" x2="27" y2="34" stroke="#ffffff" stroke-width="1.2"/>
    `,
  },
  MINING_TUNNELING: {
    categoryId: "MINING_TUNNELING",
    iconName: "marker-tunnel",
    label: "Mining & Heavy Underground Tunneling",
    shortLabel: "Tunnels & Mining",
    color: "#EF4444",
    textColor: "#ffffff",
    // Subterranean mountain slope with reinforced tunnel portal
    svgInnerPath: `
      <path d="M21 43 L27 24 L32 30 L38 20 L44 43 Z" fill="#ffffff" opacity="0.5"/>
      <path d="M27 43 L27 33 C27 29 37 29 37 33 L37 43 Z" fill="#ffffff"/>
      <path d="M29 43 L29 35 C29 32.5 35 32.5 35 35 L35 43 Z" fill="#EF4444"/>
    `,
  },
  OTHER: {
    categoryId: "OTHER",
    iconName: "marker-other",
    label: "Specialized Infrastructure & Heavy Civil",
    shortLabel: "Specialized Civil",
    color: "#64748B",
    textColor: "#ffffff",
    // Surveyor compass / drafting calipers symbol
    svgInnerPath: `
      <circle cx="32" cy="22" r="3" fill="#ffffff"/>
      <line x1="32" y1="25" x2="23" y2="44" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="32" y1="25" x2="41" y2="44" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M26 36 Q32 34 38 36" fill="none" stroke="#ffffff" stroke-width="1.6"/>
    `,
  },
};

/**
 * Normalizes any category, sector string, or project context to the canonical ProjectCategoryId.
 * Intelligently identifies Bridges and Industrial facilities when present in composite sectors.
 */
export function toCanonicalCategory(
  raw: string | undefined | null,
  projectName?: string,
  description?: string
): ProjectCategoryId {
  if (!raw && !projectName) return "OTHER";
  const upper = (raw || "").trim().toUpperCase();
  const contextText = `${projectName || ""} ${description || ""}`.toLowerCase();

  // 1. Contextual override: Check for explicit Wind Power (differentiated from generic Hydro)
  if (
    contextText.includes("wind farm") ||
    contextText.includes("wind power") ||
    contextText.includes("wind energy") ||
    contextText.includes("aerogenerator") ||
    contextText.includes("wtg") ||
    upper === "WIND_POWER" ||
    upper === "WIND"
  ) {
    return "WIND_POWER";
  }

  // 2. Contextual override: Check for explicit Bridges (unless mass transit railway)
  if (
    contextText.includes("interlink bridge") ||
    contextText.includes("bridge network") ||
    contextText.includes("bridge project") ||
    contextText.includes("suspension bridge") ||
    contextText.includes("flyover")
  ) {
    if (!upper.includes("RAIL")) {
      return "BRIDGES";
    }
  }

  // 3. Contextual override: Check for Industrial manufacturing / processing / mills / logistics
  if (
    upper === "BUILDINGS_INDUSTRIAL" ||
    upper === "INDUSTRIAL" ||
    upper === "BUILDINGS"
  ) {
    if (
      contextText.includes("manufacturing") ||
      contextText.includes("flour mill") ||
      contextText.includes("distribution mega hub") ||
      contextText.includes("logistics") ||
      contextText.includes("industrial facility") ||
      contextText.includes("monde nissin") ||
      contextText.includes("jti flex") ||
      contextText.includes("pmftc")
    ) {
      return "INDUSTRIAL";
    }
    if (
      contextText.includes("headquarters") ||
      contextText.includes("corporate") ||
      contextText.includes("shopping") ||
      contextText.includes("warehouse") ||
      contextText.includes("plaza")
    ) {
      return "BUILDINGS";
    }
  }

  switch (upper) {
    case "WIND_POWER":
    case "WIND":
      return "WIND_POWER";

    case "HYDROPOWER":
    case "HYDRO_RENEWABLE":
      return "HYDROPOWER";

    case "WATER_RESOURCES":
    case "WATER_DAMS":
      return "WATER_RESOURCES";

    case "ROADS_HIGHWAYS":
    case "INFRASTRUCTURE_ROADS":
      return "ROADS_HIGHWAYS";

    case "BRIDGES":
      return "BRIDGES";

    case "RAIL_TRANSIT":
    case "RAILWAYS_TRANSIT":
      return "RAIL_TRANSIT";

    case "BUILDINGS":
      return "BUILDINGS";

    case "INDUSTRIAL":
      return "INDUSTRIAL";

    case "ENERGY_GRID":
    case "POWER_GRID":
      return "ENERGY_GRID";

    case "MINING_TUNNELING":
      return "MINING_TUNNELING";

    case "BUILDINGS_INDUSTRIAL":
      return "BUILDINGS";

    default:
      if (upper in CATEGORY_ICON_REGISTRY) {
        return upper as ProjectCategoryId;
      }
      return "OTHER";
  }
}

/**
 * Generates a complete 64x64 SVG badge string for an engineering category.
 * Designed without complex filters so it can be reliably rasterized across all browsers and WebGL canvases.
 */
export function generateMarkerSvg(config: CategoryMarkerConfig): string {
  const darkerColor = adjustBrightness(config.color, -22);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="grad-${config.iconName}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${config.color}"/>
          <stop offset="1" stop-color="${darkerColor}"/>
        </linearGradient>
      </defs>
      
      <!-- Outer Drop Shadow Circle -->
      <circle cx="32" cy="34.5" r="22" fill="rgba(0, 0, 0, 0.45)"/>
      
      <!-- Base Pin Badge with Crisp White Border -->
      <circle cx="32" cy="32" r="22" fill="url(#grad-${config.iconName})" stroke="#ffffff" stroke-width="2.8"/>
      <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1"/>
      
      <!-- Category Vector Glyph -->
      <g>
        ${config.svgInnerPath}
      </g>
    </svg>
  `.trim();
}

/**
 * Helper to adjust hex color brightness for subtle 3D gradients.
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * Renders an SVG string onto an HTMLCanvasElement and returns ImageData for MapLibre WebGL.
 */
function renderSvgToImageData(
  svgString: string,
  width = 64,
  height = 64
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => {
      reject(new Error(`Failed to load SVG into Image: ${err}`));
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  });
}

/**
 * Registers all category SVG markers into MapLibre GL instance.
 * Deduplicates automatically via `map.hasImage(iconName)`.
 * Configures `pixelRatio: 2` so 64x64 source renders as a crisp 32x32 badge on HiDPI.
 */
export async function ensureAtlasMarkerIcons(map: maplibregl.Map): Promise<void> {
  for (const config of Object.values(CATEGORY_ICON_REGISTRY)) {
    if (map.hasImage(config.iconName)) continue;

    try {
      const svg = generateMarkerSvg(config);
      const imageData = await renderSvgToImageData(svg, 64, 64);
      if (!map.hasImage(config.iconName)) {
        map.addImage(config.iconName, imageData, { pixelRatio: 2 });
      }
    } catch (err) {
      console.warn(`[AtlasMarkerIcons] Failed to register image ${config.iconName}:`, err);
    }
  }
}
