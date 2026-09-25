/**
 * SCIC Atlas Guided Portfolio Tours
 * Client-safe, zero-server-dependency guided tour definitions and spatial steps.
 */

export interface AtlasTourStepData {
  step: number;
  totalSteps: number;
  id: string;
  title: string;
  subtitle: string;
  narration: string;
  camera: {
    center: [number, number]; // [lng, lat] (RFC 7946)
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  highlightProjectIds: string[];
  selectedProjectId?: string;
  discoveryScope?: {
    scope: "national" | "island" | "region" | "province";
    targetName?: string;
  };
  keyMetrics: Record<string, string>;
}

export interface AtlasTourData {
  tourId: string;
  tourTitle: string;
  totalSteps: number;
  steps: AtlasTourStepData[];
}

export const NATIONAL_FLAGSHIP_TOUR: AtlasTourData = {
  tourId: "national-flagship-tour",
  tourTitle: "SCIC National Portfolio Guided Tour",
  totalSteps: 7,
  steps: [
    {
      step: 1,
      totalSteps: 7,
      id: "tour-step-1-national",
      title: "The Philippine Archipelago — National Portfolio",
      subtitle: "65+ Major Civil, Energy & Water Projects",
      narration:
        "Welcome to the SCIC National Project Atlas. Sta. Clara International Corporation operates 65+ major heavy civil engineering, clean energy, and public infrastructure works spanning Luzon, Visayas, and Mindanao.",
      camera: {
        center: [121.774, 12.8797],
        zoom: 5.8,
        pitch: 0,
        bearing: 0,
      },
      highlightProjectIds: [
        "scic-thepp-isabela",
        "scic-sabangan-hydro",
        "scic-morong-discovery",
        "scic-cclex-cebu",
        "scic-davao-wtp",
      ],
      discoveryScope: { scope: "national" },
      keyMetrics: {
        "Total Projects": "65+",
        "Clean Energy Capacity": "140+ MW",
        "Geographic Span": "Luzon, Visayas, Mindanao",
      },
    },
    {
      step: 2,
      totalSteps: 7,
      id: "tour-step-2-region-ii",
      title: "Region II (Cagayan Valley) — Clean Energy & River Basins",
      subtitle: "Tumauini HEPP (11.3 MW) & Irrigation Synergy",
      narration:
        "In Northern Luzon's Cagayan River Basin, Sta. Clara is constructing the 11.3 MW Tumauini Hydroelectric Power Project (THEPP), utilizing run-of-river civil engineering to harness the Pinacanauan de Tumauini River.",
      camera: {
        center: [121.9749, 17.3188],
        zoom: 8.8,
        pitch: 35,
        bearing: 15,
      },
      highlightProjectIds: ["scic-thepp-isabela"],
      selectedProjectId: "scic-thepp-isabela",
      discoveryScope: { scope: "region", targetName: "Region II" },
      keyMetrics: {
        Project: "Tumauini HEPP",
        Capacity: "11.3 MW",
        "River Basin": "Cagayan River Basin",
        Status: "Ongoing Construction",
      },
    },
    {
      step: 3,
      totalSteps: 7,
      id: "tour-step-3-car",
      title: "Cordillera Administrative Region (CAR) — High-Head Hydro",
      subtitle: "Sabangan (14 MW) & Bakun AC (70 MW)",
      narration:
        "In the rugged Cordillera mountain range, SCIC completed the 14.0 MW Sabangan HEPP along the Chico River and the 70 MW Bakun AC Hydroelectric Plant, navigating steep granite geology with advanced rock tunneling and Pelton impulse turbines.",
      camera: {
        center: [120.9167, 17.0],
        zoom: 9.0,
        pitch: 42,
        bearing: -10,
      },
      highlightProjectIds: ["scic-sabangan-hydro", "scic-bakun-hydro"],
      selectedProjectId: "scic-sabangan-hydro",
      discoveryScope: { scope: "region", targetName: "CAR" },
      keyMetrics: {
        "Sabangan HEPP": "14.0 MW (Completed)",
        "Bakun AC HEPP": "70.0 MW (Completed)",
        Topography: "High-altitude Cordillera granite",
      },
    },
    {
      step: 4,
      totalSteps: 7,
      id: "tour-step-4-central-luzon",
      title: "Central Luzon — Strategic Corridors, Water & Expressways",
      subtitle: "Morong WTP, SFEx Mountain Tunnels & Balog-Balog Dam",
      narration:
        "Across Central Luzon, SCIC delivers critical lifelines: the Subic Freeport Expressway (SFEx) Mountain Tunnels, the Morong Discovery Park Water Treatment Plant in Bataan, and the Balog-Balog Multipurpose Dam in Tarlac.",
      camera: {
        center: [120.55, 15.0],
        zoom: 8.5,
        pitch: 30,
        bearing: 5,
      },
      highlightProjectIds: [
        "scic-morong-discovery",
        "scic-sfex-tunnels",
        "scic-balog-balog-dam",
      ],
      selectedProjectId: "scic-morong-discovery",
      discoveryScope: { scope: "region", targetName: "Region III" },
      keyMetrics: {
        "Morong WTP": "Water Treatment & Distribution",
        "SFEx Tunnels": "Dual-lane mountain portals",
        "Balog-Balog": "Irrigation & flood storage",
      },
    },
    {
      step: 5,
      totalSteps: 7,
      id: "tour-step-5-visayas",
      title: "Visayas Archipelago — Landmark Connectivity & Maritime Logistics",
      subtitle: "CCLEX Bridge Works, BCIB Geotechnical & Regional Hubs",
      narration:
        "In the Visayas, SCIC contributed to the landmark Cebu-Cordova Link Expressway (CCLEX), Bataan-Cavite Interlink Bridge geotechnical packages, and modern logistics hubs connecting Cebu and Bohol.",
      camera: {
        center: [123.9, 10.3],
        zoom: 8.0,
        pitch: 35,
        bearing: 20,
      },
      highlightProjectIds: ["scic-cclex-cebu", "scic-bcib-bataan", "scic-snr-cebu"],
      selectedProjectId: "scic-cclex-cebu",
      discoveryScope: { scope: "island", targetName: "VISAYAS" },
      keyMetrics: {
        CCLEX: "Iconic 8.9 km expressway bridge",
        "Logistics Hubs": "Cebu & Mandaue cold-chain / retail",
        "Inter-Island Scope": "Bohol PRDP & coastal roads",
      },
    },
    {
      step: 6,
      totalSteps: 7,
      id: "tour-step-6-mindanao",
      title: "Mindanao — Industrial Lifelines & Potable Water Security",
      subtitle: "Davao City Bulk Water (300 MLD) & Siguil Hydro",
      narration:
        "In Southern Philippines, Sta. Clara built the civil works for the Davao City Bulk Water Supply Project—delivering 300 MLD of potable water—alongside industrial tailings storage and renewable hydropower in SOCCSKSARGEN.",
      camera: {
        center: [125.6, 7.1907],
        zoom: 8.2,
        pitch: 35,
        bearing: -15,
      },
      highlightProjectIds: ["scic-davao-wtp", "scic-apex-maco-tsf", "scic-siguil-hydro"],
      selectedProjectId: "scic-davao-wtp",
      discoveryScope: { scope: "island", targetName: "MINDANAO" },
      keyMetrics: {
        "Davao Bulk Water": "300 MLD treatment & transmission",
        "Apex Maco TSF": "High-durability tailings dam",
        "Siguil HEPP": "Renewable run-of-river hydro",
      },
    },
    {
      step: 7,
      totalSteps: 7,
      id: "tour-step-7-conclusion",
      title: "National Strategic Horizon",
      subtitle: "Exploration & Executive GIS Complete",
      narration:
        "This concludes the Guided Portfolio Tour. You can now freely explore the map, filter by category or status, inspect verified engineering site boundaries, or ask the assistant any specific project question.",
      camera: {
        center: [121.774, 12.8797],
        zoom: 5.8,
        pitch: 0,
        bearing: 0,
      },
      highlightProjectIds: [],
      discoveryScope: { scope: "national" },
      keyMetrics: {
        Exploration: "Interactive & Free",
        "Next Steps": "Filter projects, search nearby, or inspect footprints",
      },
    },
  ],
};

export function getGuidedTourData(tourId: string = "national-flagship-tour"): AtlasTourData {
  // Default to national flagship tour; future expansions can add regional/themed tours here
  return NATIONAL_FLAGSHIP_TOUR;
}
