/**
 * SCIC Atlas Guided Portfolio Tours
 * Client-safe, authoritative guided tour definitions, spatial steps, and dynamic tour synthesis across the entire Philippines.
 */

import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import { SCIC_PROJECTS, SCICProject } from "@/lib/data/scicProjectsData";
import { findProjectInDataset, normalizeSearchText, projectMatchesSearch } from "@/components/atlas/AtlasSearchUtils";

const ALL_PROJECTS: SCICProject[] = [...INITIAL_ATLAS_PROJECTS, ...SCIC_PROJECTS];

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

export function resolveDatabaseProjectId(queryOrId: string | undefined): string | undefined {
  if (!queryOrId) return undefined;
  const match = findProjectInDataset(ALL_PROJECTS, queryOrId);
  return match ? match.id : queryOrId;
}

// ─── 1. NATIONAL FLAGSHIP TOUR (ALL PHILIPPINES) ────────────────
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
        "Welcome to the SCIC National Project Atlas! Sta. Clara International Corporation operates 65+ major heavy civil engineering, clean energy, and public infrastructure works spanning Luzon, Visayas, and Mindanao.",
      camera: {
        center: [121.774, 12.8797],
        zoom: 5.8,
        pitch: 0,
        bearing: 0,
      },
      highlightProjectIds: [
        "cmqvwzn750000r8w1zidk116i",
        "cmu6czvcn0001m496zujvgg79",
        "cmu6czvey0002m496fyfhuq3n",
        "cmu6czyab001cm496jos42tbn",
        "cmu6czy1j0018m496don3vk83",
        "cmu6czxhh000zm496o8b74rrt",
      ],
      discoveryScope: { scope: "national" },
      keyMetrics: {
        "Total Projects": "65 Authoritative Works",
        "Clean Energy Capacity": "1,495+ MW",
        "Water Utilities": "~2,100 MLD",
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
        "In Northern Luzon's Cagayan River Basin, Sta. Clara is constructing the 11.3 MW Tumauini Hydroelectric Power Project, utilizing run-of-river civil engineering to harness the Pinacanauan de Tumauini River.",
      camera: {
        center: [121.9749251, 17.318823],
        zoom: 12.8,
        pitch: 46,
        bearing: 15,
      },
      highlightProjectIds: ["cmqvwzn750000r8w1zidk116i"],
      selectedProjectId: "cmqvwzn750000r8w1zidk116i",
      discoveryScope: { scope: "region", targetName: "Region II (Cagayan Valley)" },
      keyMetrics: {
        Project: "Tumauini HEPP (THEPP)",
        Capacity: "11.3 MW",
        "River Basin": "Pinacanauan de Tumauini",
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
        "In the rugged Cordillera mountain range, SCIC completed the 14.0 MW Sabangan Hydroelectric Plant along the Chico River and the 70 MW Bakun AC Hydroelectric Plant, navigating steep granite geology with advanced rock tunneling.",
      camera: {
        center: [120.9231, 17.0225],
        zoom: 12.5,
        pitch: 44,
        bearing: -10,
      },
      highlightProjectIds: ["cmu6czvcn0001m496zujvgg79", "cmu6czvey0002m496fyfhuq3n"],
      selectedProjectId: "cmu6czvcn0001m496zujvgg79",
      discoveryScope: { scope: "region", targetName: "Cordillera Administrative Region (CAR)" },
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
      subtitle: "Morong Discovery Park, SFEx Mountain Tunnels & Balog-Balog Dam",
      narration:
        "Across Central Luzon, SCIC delivers critical lifelines: the Subic Freeport Expressway Mountain Tunnels, the Morong Discovery Park Water Treatment Plant in Bataan, and the Balog-Balog Multipurpose Dam in Tarlac.",
      camera: {
        center: [120.2828, 14.6811],
        zoom: 12.0,
        pitch: 38,
        bearing: 5,
      },
      highlightProjectIds: [
        "cmu6czyab001cm496jos42tbn",
        "cmu6czvqk0007m4965vosqk8c",
        "cmu7yoxn5000eog96o6spwfk7",
      ],
      selectedProjectId: "cmu6czyab001cm496jos42tbn",
      discoveryScope: { scope: "region", targetName: "Region III (Central Luzon)" },
      keyMetrics: {
        "Morong Discovery Park": "Primary arterial roads & utilities",
        "SFEx Tunnels": "Dual-lane mountain portals",
        "Balog-Balog Dam": "Major irrigation & flood storage",
      },
    },
    {
      step: 5,
      totalSteps: 7,
      id: "tour-step-5-visayas",
      title: "Visayas Archipelago — Landmark Connectivity & Maritime Logistics",
      subtitle: "Bohol PRDP Highway, Loboc Hydro & Cebu Logistics",
      narration:
        "In the Visayas, SCIC completed the Bohol PRDP Agri-Industrial Trade Highway & Bridge Network, modern logistics warehouses in Cebu, and the Loboc Mini-Hydroelectric project.",
      camera: {
        center: [124.15, 9.85],
        zoom: 11.2,
        pitch: 38,
        bearing: 15,
      },
      highlightProjectIds: [
        "cmu6czy1j0018m496don3vk83",
        "cmu6czx8p000vm4962cosp4r7",
        "cmu6czx6i000um4968am2gukb",
      ],
      selectedProjectId: "cmu6czy1j0018m496don3vk83",
      discoveryScope: { scope: "island", targetName: "VISAYAS" },
      keyMetrics: {
        "Bohol PRDP": "Agri-Industrial Trade Highway",
        "S&R Cebu Hub": "Regional cold-chain & distribution",
        "Loboc Hydro": "Renewable river generation",
      },
    },
    {
      step: 6,
      totalSteps: 7,
      id: "tour-step-6-mindanao",
      title: "Mindanao — Industrial Lifelines & Potable Water Security",
      subtitle: "Davao City Bulk Water (300 MLD) & Apex Mining Maco",
      narration:
        "In Southern Philippines, Sta. Clara built the civil works for the Davao City Bulk Water Supply Project—delivering 300 MLD of potable water—alongside deep underground mining infrastructure and tailings storage in Davao de Oro.",
      camera: {
        center: [125.50, 7.15],
        zoom: 11.8,
        pitch: 42,
        bearing: -15,
      },
      highlightProjectIds: [
        "cmu6czxhh000zm496o8b74rrt",
        "cmu6czyci001dm496humy19k0",
        "cmu6czxfs000ym4962x42xi79",
      ],
      selectedProjectId: "cmu6czxhh000zm496o8b74rrt",
      discoveryScope: { scope: "island", targetName: "MINDANAO" },
      keyMetrics: {
        "Davao Bulk Water": "300 MLD treatment & transmission",
        "Apex Maco TSF": "3.4 km drift tunnels & dam raise",
        "Siguil Hydro": "14.5 MW clean energy",
      },
    },
    {
      step: 7,
      totalSteps: 7,
      id: "tour-step-7-conclusion",
      title: "National Strategic Horizon",
      subtitle: "Exploration & Executive GIS Complete",
      narration:
        "This concludes the National Guided Portfolio Tour! You can now freely explore the map, filter by category or status, inspect verified engineering site boundaries, or request another themed tour.",
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

// ─── 2. NORTH LUZON & CORDILLERA TOUR ───────────────────────────
export const NORTH_LUZON_TOUR: AtlasTourData = {
  tourId: "north-luzon-tour",
  tourTitle: "North Luzon & Cordillera Energy Corridor Tour",
  totalSteps: 6,
  steps: [
    {
      step: 1,
      totalSteps: 6,
      id: "north-luzon-step-1-bakun",
      title: "Bakun AC Hydroelectric Power Plant",
      subtitle: "70.0 MW Powerhouse & 9.6 km Deep Rock Tunnel",
      narration:
        "Welcome to North Luzon! Our first destination is the 70.0 MW Bakun AC Hydroelectric Power Plant in Benguet. Sta. Clara completed a historic 9.6-kilometer underground headrace tunnel through complex mountainous faults.",
      camera: {
        center: [120.678, 16.897],
        zoom: 12.8,
        pitch: 48,
        bearing: 25,
      },
      highlightProjectIds: ["cmu6czvey0002m496fyfhuq3n"],
      selectedProjectId: "cmu6czvey0002m496fyfhuq3n",
      discoveryScope: { scope: "region", targetName: "Cordillera Administrative Region (CAR)" },
      keyMetrics: {
        Project: "Bakun AC HEPP",
        Capacity: "70.0 MW",
        "Tunnel Length": "9.6 km Head Tunnel",
        Status: "Operational (Completed)",
      },
    },
    {
      step: 2,
      totalSteps: 6,
      id: "north-luzon-step-2-kapangan",
      title: "Kapangan Hydroelectric Power Project",
      subtitle: "60.0 MW Clean Energy Facility along Amburayan River",
      narration:
        "Continuing south along the Benguet corridor, the 60.0 MW Kapangan HEPP harnesses the Amburayan River with run-of-river civil engineering, penstock slope stabilization, and underground caverns.",
      camera: {
        center: [120.612, 16.583],
        zoom: 12.5,
        pitch: 45,
        bearing: -15,
      },
      highlightProjectIds: ["cmu6czxut0015m496svmbppv0"],
      selectedProjectId: "cmu6czxut0015m496svmbppv0",
      discoveryScope: { scope: "province", targetName: "Benguet" },
      keyMetrics: {
        Project: "Kapangan HEPP",
        Capacity: "60.0 MW",
        River: "Amburayan River",
        Status: "Under Construction",
      },
    },
    {
      step: 3,
      totalSteps: 6,
      id: "north-luzon-step-3-sabangan",
      title: "Sabangan Hydroelectric Power Plant",
      subtitle: "14.0 MW Run-of-River Pioneer along Chico River",
      narration:
        "Heading up into Mountain Province, Sabangan HEPP generates 14.0 MW along the Chico River basin, combining steep-slope intake weirs, pelton impulse units, and high-altitude mountain engineering.",
      camera: {
        center: [120.9231, 17.0225],
        zoom: 12.6,
        pitch: 44,
        bearing: -5,
      },
      highlightProjectIds: ["cmu6czvcn0001m496zujvgg79"],
      selectedProjectId: "cmu6czvcn0001m496zujvgg79",
      discoveryScope: { scope: "province", targetName: "Mountain Province" },
      keyMetrics: {
        Project: "Sabangan HEPP",
        Capacity: "14.0 MW",
        River: "Chico River",
        Status: "Operational (Completed)",
      },
    },
    {
      step: 4,
      totalSteps: 6,
      id: "north-luzon-step-4-tumauini",
      title: "Tumauini Hydroelectric Power Project (THEPP)",
      subtitle: "11.3 MW Clean Energy & River Basin Development",
      narration:
        "Crossing east into the fertile Cagayan Valley, Tumauini Hydroelectric Project (11.3 MW) harnesses the Pinacanauan de Tumauini River, coupling clean peak power generation with downstream irrigation and flood control.",
      camera: {
        center: [121.9749251, 17.318823],
        zoom: 12.8,
        pitch: 46,
        bearing: 15,
      },
      highlightProjectIds: ["cmqvwzn750000r8w1zidk116i"],
      selectedProjectId: "cmqvwzn750000r8w1zidk116i",
      discoveryScope: { scope: "region", targetName: "Region II (Cagayan Valley)" },
      keyMetrics: {
        Project: "Tumauini HEPP",
        Capacity: "11.3 MW",
        Basin: "Cagayan River Basin",
        Status: "Ongoing Construction",
      },
    },
    {
      step: 5,
      totalSteps: 6,
      id: "north-luzon-step-5-pagudpud",
      title: "Pagudpud Wind Farm (160 MW BOP)",
      subtitle: "Flagship Coastal Wind Turbines in Ilocos Norte",
      narration:
        "Traveling to the northern tip of Luzon in Ilocos Norte, SCIC constructed the Balance of Plant civil foundations and crane pads for the 160 MW Pagudpud Wind Farm facing the Luzon Strait.",
      camera: {
        center: [120.85, 18.59],
        zoom: 12.2,
        pitch: 40,
        bearing: 10,
      },
      highlightProjectIds: ["cmu6czvjl0004m4968wt4k4en"],
      selectedProjectId: "cmu6czvjl0004m4968wt4k4en",
      discoveryScope: { scope: "province", targetName: "Ilocos Norte" },
      keyMetrics: {
        Project: "Pagudpud Wind Farm",
        Capacity: "160 MW",
        Type: "Wind Energy BOP",
        Province: "Ilocos Norte",
      },
    },
    {
      step: 6,
      totalSteps: 6,
      id: "north-luzon-step-6-corridor",
      title: "North Luzon Regional Overview",
      subtitle: "369+ MW Clean Energy & Resilient Mountain Civil Works",
      narration:
        "This concludes the North Luzon Tour. Sta. Clara's facilities across Benguet, Mountain Province, Isabela, and Ilocos form one of the highest-density clean energy corridors in Southeast Asia.",
      camera: {
        center: [121.0, 17.2],
        zoom: 8.2,
        pitch: 35,
        bearing: 0,
      },
      highlightProjectIds: [
        "cmu6czvey0002m496fyfhuq3n",
        "cmu6czxut0015m496svmbppv0",
        "cmu6czvcn0001m496zujvgg79",
        "cmqvwzn750000r8w1zidk116i",
        "cmu6czvjl0004m4968wt4k4en",
      ],
      discoveryScope: { scope: "region", targetName: "Cordillera Administrative Region (CAR)" },
      keyMetrics: {
        "Total Clean Generation": "369+ MW",
        "Facilities Visited": "5 Major Renewable Flagships",
        "River Basins": "Agno, Amburayan, Chico & Cagayan",
      },
    },
  ],
};

// ─── 3. VISAYAS ARCHIPELAGO TOUR ────────────────────────────────
export const VISAYAS_TOUR: AtlasTourData = {
  tourId: "visayas-tour",
  tourTitle: "Visayas Connectivity & Infrastructure Tour",
  totalSteps: 5,
  steps: [
    {
      step: 1,
      totalSteps: 5,
      id: "visayas-step-1-bohol-prdp",
      title: "Bohol PRDP Agri-Industrial Trade Highway Network",
      subtitle: "Heavy Civil Road Corridors & Bridge Infrastructure",
      narration:
        "Welcome to the Visayas! In Bohol, SCIC built the PRDP Agri-Industrial Trade Highway network, constructing reinforced concrete bridges and mountain-penetrating arterial roads connecting agricultural communities.",
      camera: {
        center: [124.15, 9.85],
        zoom: 12.0,
        pitch: 42,
        bearing: 15,
      },
      highlightProjectIds: ["cmu6czy1j0018m496don3vk83"],
      selectedProjectId: "cmu6czy1j0018m496don3vk83",
      discoveryScope: { scope: "province", targetName: "Bohol" },
      keyMetrics: {
        Project: "Bohol PRDP Highway",
        Category: "Roads & Highways",
        Province: "Bohol",
        Client: "DA / World Bank / LGU",
      },
    },
    {
      step: 2,
      totalSteps: 5,
      id: "visayas-step-2-loboc",
      title: "Loboc Mini Hydroelectric Power Plant",
      subtitle: "Run-of-River Renewable Power along Loboc River",
      narration:
        "Along the historic Loboc River in Bohol, SCIC constructed the civil intake and powerhouse for the Loboc Mini-Hydro plant, harnessing natural hydraulic head without compromising local river ecosystems.",
      camera: {
        center: [124.03, 9.64],
        zoom: 12.5,
        pitch: 40,
        bearing: -10,
      },
      highlightProjectIds: ["cmu6czx6i000um4968am2gukb"],
      selectedProjectId: "cmu6czx6i000um4968am2gukb",
      discoveryScope: { scope: "province", targetName: "Bohol" },
      keyMetrics: {
        Project: "Loboc Mini HEPP",
        Category: "Hydropower",
        River: "Loboc River",
        Status: "Operational",
      },
    },
    {
      step: 3,
      totalSteps: 5,
      id: "visayas-step-3-hibale",
      title: "Hibale Small Reservoir Irrigation Project (SRIP)",
      subtitle: "Earthfill Storage Dam & Agricultural Irrigation",
      narration:
        "The Hibale SRIP in Bohol features an earthfill embankment dam, spillway, and canal network engineered by SCIC to provide year-round irrigation and agricultural drought protection.",
      camera: {
        center: [124.25, 9.95],
        zoom: 12.2,
        pitch: 38,
        bearing: 20,
      },
      highlightProjectIds: ["cmu7z82um001hjo9622gs3gcq"],
      selectedProjectId: "cmu7z82um001hjo9622gs3gcq",
      discoveryScope: { scope: "province", targetName: "Bohol" },
      keyMetrics: {
        Project: "Hibale SRIP",
        Category: "Water Resources & Dams",
        Client: "National Irrigation Administration (NIA)",
        Status: "Ongoing Construction",
      },
    },
    {
      step: 4,
      totalSteps: 5,
      id: "visayas-step-4-cebu-sr",
      title: "S&R Membership Shopping Cebu Warehouse",
      subtitle: "Commercial Distribution & Cold-Chain Mega Logistics",
      narration:
        "Across the Cebu Strait in Cebu City, SCIC executed the full structural, civil, and specialized MEPFS works for the S&R Membership Shopping warehouse facility, supporting high-capacity regional trade.",
      camera: {
        center: [123.93, 10.32],
        zoom: 12.8,
        pitch: 45,
        bearing: -15,
      },
      highlightProjectIds: ["cmu6czx8p000vm4962cosp4r7"],
      selectedProjectId: "cmu6czx8p000vm4962cosp4r7",
      discoveryScope: { scope: "region", targetName: "Region VII (Central Visayas)" },
      keyMetrics: {
        Project: "S&R Cebu Warehouse",
        Category: "Commercial / Industrial",
        Location: "Cebu City",
        Status: "Completed",
      },
    },
    {
      step: 5,
      totalSteps: 5,
      id: "visayas-step-5-summary",
      title: "Visayas Regional Portfolio Overview",
      subtitle: "Integrated Transport, Clean Power & Water Infrastructure",
      narration:
        "This concludes our Visayas tour! Sta. Clara's projects in Central Visayas combine agricultural highways, irrigation reservoirs, renewable hydro, and regional commerce logistics.",
      camera: {
        center: [124.0, 10.0],
        zoom: 8.8,
        pitch: 35,
        bearing: 0,
      },
      highlightProjectIds: [
        "cmu6czy1j0018m496don3vk83",
        "cmu6czx6i000um4968am2gukb",
        "cmu7z82um001hjo9622gs3gcq",
        "cmu6czx8p000vm4962cosp4r7",
      ],
      discoveryScope: { scope: "island", targetName: "VISAYAS" },
      keyMetrics: {
        "Island Group": "Visayas",
        "Key Provinces": "Cebu, Bohol",
        Impact: "Transport connectivity, irrigation security & clean energy",
      },
    },
  ],
};

// ─── 4. MINDANAO INDUSTRIAL & WATER TOUR ─────────────────────────
export const MINDANAO_TOUR: AtlasTourData = {
  tourId: "mindanao-tour",
  tourTitle: "Mindanao Industrial & Clean Water Tour",
  totalSteps: 6,
  steps: [
    {
      step: 1,
      totalSteps: 6,
      id: "mindanao-step-1-davao-wtp",
      title: "Davao City Bulk Water Supply Project (WTP)",
      subtitle: "300 MLD Potable Water Treatment Plant & Transmission",
      narration:
        "Welcome to Mindanao! In Davao City, SCIC executed major civil and structural packages for the Davao City Bulk Water Supply Project—a landmark facility delivering 300 million liters per day of clean drinking water.",
      camera: {
        center: [125.45, 7.1833],
        zoom: 14.2,
        pitch: 42,
        bearing: -10,
      },
      highlightProjectIds: ["cmu6czxhh000zm496o8b74rrt"],
      selectedProjectId: "cmu6czxhh000zm496o8b74rrt",
      discoveryScope: { scope: "region", targetName: "Region XI (Davao Region)" },
      keyMetrics: {
        Project: "Davao Bulk Water WTP",
        Capacity: "300 MLD",
        Category: "Water Resources",
        Impact: "Supplies 1M+ residents in Davao City",
      },
    },
    {
      step: 2,
      totalSteps: 6,
      id: "mindanao-step-2-apex-maco",
      title: "Apex Mining Maco Underground & TSF Expansion",
      subtitle: "3.4 km Haulage Tunnels & High-Durability Tailings Dam",
      narration:
        "In Davao de Oro, SCIC has been the primary contractor for Apex Mining since 2010, executing 3.4 km of deep underground mine access and drainage tunnels alongside a major Tailings Storage Facility dam raise.",
      camera: {
        center: [126.0461, 7.3711],
        zoom: 14.2,
        pitch: 46,
        bearing: 20,
      },
      highlightProjectIds: ["cmu6czyci001dm496humy19k0"],
      selectedProjectId: "cmu6czyci001dm496humy19k0",
      discoveryScope: { scope: "province", targetName: "Davao de Oro" },
      keyMetrics: {
        Project: "Apex Mining Maco",
        Tunnels: "3.4 km Haulage & Drainage Drifts",
        Category: "Mining & Tunneling",
        Client: "Apex Mining Company, Inc.",
      },
    },
    {
      step: 3,
      totalSteps: 6,
      id: "mindanao-step-3-siguil",
      title: "Siguil Hydroelectric Power Plant",
      subtitle: "14.5 MW Run-of-River Facility in Sarangani",
      narration:
        "In Sarangani province (SOCCSKSARGEN), the 14.5 MW Siguil HEPP captures the fast-flowing Siguil River with advanced weir and desander engineering, powering the southern Mindanao grid.",
      camera: {
        center: [124.9667, 5.8667],
        zoom: 14.2,
        pitch: 44,
        bearing: -15,
      },
      highlightProjectIds: ["cmu6czxfs000ym4962x42xi79"],
      selectedProjectId: "cmu6czxfs000ym4962x42xi79",
      discoveryScope: { scope: "region", targetName: "Region XII (SOCCSKSARGEN)" },
      keyMetrics: {
        Project: "Siguil HEPP",
        Capacity: "14.5 MW",
        River: "Siguil River",
        Province: "Sarangani",
      },
    },
    {
      step: 4,
      totalSteps: 6,
      id: "mindanao-step-4-manolo-fortich",
      title: "Manolo Fortich 1 & 2 Hydroelectric Power Plants",
      subtitle: "68.8 MW Cascading Clean Power in Bukidnon",
      narration:
        "In Bukidnon, Northern Mindanao, SCIC delivered civil engineering works for the Manolo Fortich cascading hydroelectric plants, generating 68.8 MW of clean renewable energy for Northern Mindanao.",
      camera: {
        center: [124.8667, 8.3667],
        zoom: 14.2,
        pitch: 40,
        bearing: 10,
      },
      highlightProjectIds: ["cmu6czxav000wm496g59oe0xw"],
      selectedProjectId: "cmu6czxav000wm496g59oe0xw",
      discoveryScope: { scope: "province", targetName: "Bukidnon" },
      keyMetrics: {
        Project: "Manolo Fortich 1 & 2",
        Capacity: "68.8 MW",
        Category: "Hydropower",
        Client: "Hedcor Bukidnon / AboitizPower",
      },
    },
    {
      step: 5,
      totalSteps: 6,
      id: "mindanao-step-5-cabulig",
      title: "Cabulig Hydroelectric Power Plant",
      subtitle: "8.0 MW Clean Energy in Misamis Oriental",
      narration:
        "Located in Claveria, Misamis Oriental, the 8.0 MW Cabulig HEPP combines high-efficiency run-of-river diversion with low-impact environmental engineering along the Cabulig River.",
      camera: {
        center: [124.8833, 8.6167],
        zoom: 14.2,
        pitch: 42,
        bearing: -5,
      },
      highlightProjectIds: ["cmu7z82wk001ijo96b6vab6o4"],
      selectedProjectId: "cmu7z82wk001ijo96b6vab6o4",
      discoveryScope: { scope: "province", targetName: "Misamis Oriental" },
      keyMetrics: {
        Project: "Cabulig HEPP",
        Capacity: "8.0 MW",
        Location: "Claveria, Misamis Oriental",
        Status: "Operational",
      },
    },
    {
      step: 6,
      totalSteps: 6,
      id: "mindanao-step-6-summary",
      title: "Mindanao Strategic Infrastructure Horizon",
      subtitle: "Powering Southern Philippines with Clean Water, Energy & Mining",
      narration:
        "This concludes the Mindanao tour. Across Regions X, XI, and XII, SCIC operates 11 heavy civil infrastructure, water utility, and renewable energy assets vital to the island's economic transformation.",
      camera: {
        center: [125.2, 7.5],
        zoom: 7.8,
        pitch: 30,
        bearing: 0,
      },
      highlightProjectIds: [
        "cmu6czxhh000zm496o8b74rrt",
        "cmu6czyci001dm496humy19k0",
        "cmu6czxfs000ym4962x42xi79",
        "cmu6czxav000wm496g59oe0xw",
        "cmu7z82wk001ijo96b6vab6o4",
      ],
      discoveryScope: { scope: "island", targetName: "MINDANAO" },
      keyMetrics: {
        "Total Projects": "11 Projects in Mindanao",
        "Potable Water": "300 MLD (Davao)",
        "Clean Hydropower": "98+ MW",
        "Mining Haulage": "3.4 km Underground Drifts",
      },
    },
  ],
};

// ─── 5. CENTRAL LUZON & NCR TOUR ────────────────────────────────
export const CENTRAL_LUZON_TOUR: AtlasTourData = {
  tourId: "central-luzon-tour",
  tourTitle: "Central Luzon & NCR Industrial, Rail & Water Tour",
  totalSteps: 6,
  steps: [
    {
      step: 1,
      totalSteps: 6,
      id: "central-step-1-nscr",
      title: "North-South Commuter Railway (NSCR) Package CP02",
      subtitle: "High-Capacity Mass Transit Viaduct in Central Luzon",
      narration:
        "Welcome to Central Luzon! In Bulacan, SCIC is delivering major viaduct and bridge civil works for Package CP02 of the North-South Commuter Railway, modernizing travel between Manila and Clark.",
      camera: {
        center: [120.81, 14.85],
        zoom: 12.2,
        pitch: 42,
        bearing: 15,
      },
      highlightProjectIds: ["cmu6czvm90005m49601rruv12"],
      selectedProjectId: "cmu6czvm90005m49601rruv12",
      discoveryScope: { scope: "region", targetName: "Region III (Central Luzon)" },
      keyMetrics: {
        Project: "NSCR Package CP02",
        Category: "Rail Transit",
        Client: "DOTr / PNR",
        Status: "Ongoing Construction",
      },
    },
    {
      step: 2,
      totalSteps: 6,
      id: "central-step-2-sfex",
      title: "Subic Freeport Expressway (SFEx) & Mountain Tunnels",
      subtitle: "Dual-Lane Tunnel Portals & Capacity Expansion",
      narration:
        "In Bataan and Zambales, SCIC excavated and lined the SFEx Mountain Tunnels, providing a high-speed, dual-lane expressway portal into the Subic Bay Freeport Zone through complex volcanic terrain.",
      camera: {
        center: [120.35, 14.83],
        zoom: 12.6,
        pitch: 45,
        bearing: -10,
      },
      highlightProjectIds: ["cmu6czvqk0007m4965vosqk8c"],
      selectedProjectId: "cmu6czvqk0007m4965vosqk8c",
      discoveryScope: { scope: "province", targetName: "Bataan" },
      keyMetrics: {
        Project: "SFEx Expansion & Tunnels",
        Category: "Roads & Highways / Tunneling",
        Client: "NLEX Corporation",
        Status: "Completed",
      },
    },
    {
      step: 3,
      totalSteps: 6,
      id: "central-step-3-morong",
      title: "Morong Discovery Park & Water Treatment Plant",
      subtitle: "Phase 1 Civil Infrastructure & Potable Water Network",
      narration:
        "At the Morong Discovery Park in Bataan, SCIC is executing master arterial roads, underground utility duct banks, and the Morong Water Treatment Plant supplying clean potable water.",
      camera: {
        center: [120.2828, 14.6811],
        zoom: 12.5,
        pitch: 40,
        bearing: 5,
      },
      highlightProjectIds: ["cmu6czyab001cm496jos42tbn", "cmu6czvwn000am49610l9pqnw"],
      selectedProjectId: "cmu6czyab001cm496jos42tbn",
      discoveryScope: { scope: "province", targetName: "Bataan" },
      keyMetrics: {
        Project: "Morong Discovery Park Phase 1",
        Client: "BCDA",
        Water: "25–50 MLD WTP",
        Status: "Ongoing Construction",
      },
    },
    {
      step: 4,
      totalSteps: 6,
      id: "central-step-4-balog-balog",
      title: "Balog-Balog Multipurpose Project Phase II (BBMP-II)",
      subtitle: "113.5m High Zoned Earth & Rockfill Dam in Tarlac",
      narration:
        "In San Jose, Tarlac, SCIC is building the massive Balog-Balog Multipurpose Dam, featuring high-volume rockfill embankment placement to irrigate 34,000+ hectares of farmland and mitigate regional flooding.",
      camera: {
        center: [120.48, 15.54],
        zoom: 12.0,
        pitch: 44,
        bearing: -15,
      },
      highlightProjectIds: ["cmu7yoxn5000eog96o6spwfk7"],
      selectedProjectId: "cmu7yoxn5000eog96o6spwfk7",
      discoveryScope: { scope: "province", targetName: "Tarlac" },
      keyMetrics: {
        Project: "Balog-Balog Dam (BBMP-II)",
        Category: "Water Resources & Dams",
        Client: "NIA",
        Irrigation: "34,000+ Hectares",
      },
    },
    {
      step: 5,
      totalSteps: 6,
      id: "central-step-5-lamesa",
      title: "La Mesa Water Treatment Plant 1 Modernization",
      subtitle: "1,500 MLD Mega Water Facility Upgrades in Metro Manila",
      narration:
        "In Quezon City, NCR, SCIC spearheaded the seismic retrofitting and structural modernization of the 1,500 MLD La Mesa Water Treatment Plant 1, securing water supply for millions in Greater Metro Manila.",
      camera: {
        center: [121.07, 14.71],
        zoom: 12.5,
        pitch: 42,
        bearing: 20,
      },
      highlightProjectIds: ["cmu6czvyl000bm496qwy0ss3j"],
      selectedProjectId: "cmu6czvyl000bm496qwy0ss3j",
      discoveryScope: { scope: "region", targetName: "NCR (Metro Manila)" },
      keyMetrics: {
        Project: "La Mesa WTP 1",
        Capacity: "1,500 MLD",
        Category: "Water Treatment",
        Client: "Maynilad Water Services",
      },
    },
    {
      step: 6,
      totalSteps: 6,
      id: "central-step-6-summary",
      title: "Central Luzon & NCR Economic Arteries Summary",
      subtitle: "Essential Rail, Mountain Tunnels, Heavy Industry & Potable Water",
      narration:
        "This concludes the Central Luzon and NCR tour. Across Bulacan, Bataan, Tarlac, and Metro Manila, SCIC powers national connectivity, strategic logistics, and metropolitan water security.",
      camera: {
        center: [120.6, 15.0],
        zoom: 8.5,
        pitch: 30,
        bearing: 0,
      },
      highlightProjectIds: [
        "cmu6czvm90005m49601rruv12",
        "cmu6czvqk0007m4965vosqk8c",
        "cmu6czyab001cm496jos42tbn",
        "cmu7yoxn5000eog96o6spwfk7",
        "cmu6czvyl000bm496qwy0ss3j",
      ],
      discoveryScope: { scope: "region", targetName: "Region III (Central Luzon)" },
      keyMetrics: {
        "Total Projects": "20+ in Central Luzon & NCR",
        "Metro Water": "1,500 MLD",
        "Key Transport": "NSCR Rail & SFEx Tunnels",
      },
    },
  ],
};

// ─── 6. CLEAN ENERGY & DECARBONIZATION TOUR ─────────────────────
export const CLEAN_ENERGY_TOUR: AtlasTourData = {
  tourId: "clean-energy-tour",
  tourTitle: "SCIC Clean Energy & Hydropower Portfolio Tour",
  totalSteps: 6,
  steps: [
    {
      step: 1,
      totalSteps: 6,
      id: "hydro-step-1",
      title: "Bakun AC Hydroelectric Power Plant",
      subtitle: "70.0 MW | Benguet / Ilocos Sur",
      narration: "Our Clean Energy tour launches at Bakun AC (70 MW), featuring a 9.6 km high-head tunneling system.",
      camera: { center: [120.678, 16.897], zoom: 12.8, pitch: 48, bearing: 20 },
      highlightProjectIds: ["cmu6czvey0002m496fyfhuq3n"],
      selectedProjectId: "cmu6czvey0002m496fyfhuq3n",
      discoveryScope: { scope: "region", targetName: "Cordillera Administrative Region (CAR)" },
      keyMetrics: { Capacity: "70.0 MW", Type: "High-Head Hydro", Status: "Operational" },
    },
    {
      step: 2,
      totalSteps: 6,
      id: "hydro-step-2",
      title: "Tumauini Hydroelectric Power Project",
      subtitle: "11.3 MW | Isabela (Region II)",
      narration: "In Isabela, Tumauini Hydroelectric Project (11.3 MW) integrates run-of-river generation with agricultural irrigation.",
      camera: { center: [121.9749251, 17.318823], zoom: 12.8, pitch: 46, bearing: 15 },
      highlightProjectIds: ["cmqvwzn750000r8w1zidk116i"],
      selectedProjectId: "cmqvwzn750000r8w1zidk116i",
      discoveryScope: { scope: "region", targetName: "Region II (Cagayan Valley)" },
      keyMetrics: { Capacity: "11.3 MW", Status: "Under Construction", Basin: "Cagayan River" },
    },
    {
      step: 3,
      totalSteps: 6,
      id: "hydro-step-3",
      title: "Kapangan Hydroelectric Power Project",
      subtitle: "60.0 MW | Benguet (CAR)",
      narration: "Kapangan HEPP (60 MW) along the Amburayan River expands Luzon's clean energy base load.",
      camera: { center: [120.612, 16.583], zoom: 12.5, pitch: 45, bearing: -15 },
      highlightProjectIds: ["cmu6czxut0015m496svmbppv0"],
      selectedProjectId: "cmu6czxut0015m496svmbppv0",
      discoveryScope: { scope: "province", targetName: "Benguet" },
      keyMetrics: { Capacity: "60.0 MW", River: "Amburayan River", Status: "Ongoing" },
    },
    {
      step: 4,
      totalSteps: 6,
      id: "hydro-step-4",
      title: "Sabangan Hydroelectric Power Plant",
      subtitle: "14.0 MW | Mountain Province",
      narration: "Sabangan HEPP (14 MW) delivers run-of-river electricity to the Chico River watershed.",
      camera: { center: [120.9231, 17.0225], zoom: 12.6, pitch: 44, bearing: -10 },
      highlightProjectIds: ["cmu6czvcn0001m496zujvgg79"],
      selectedProjectId: "cmu6czvcn0001m496zujvgg79",
      discoveryScope: { scope: "province", targetName: "Mountain Province" },
      keyMetrics: { Capacity: "14.0 MW", Status: "Completed", River: "Chico River" },
    },
    {
      step: 5,
      totalSteps: 6,
      id: "hydro-step-5",
      title: "Pagudpud Wind Farm (160 MW BOP)",
      subtitle: "160.0 MW | Ilocos Norte",
      narration: "Pagudpud Wind Farm in Ilocos Norte harnesses strong coastal wind corridors to feed clean power into Luzon.",
      camera: { center: [120.85, 18.59], zoom: 12.2, pitch: 40, bearing: 10 },
      highlightProjectIds: ["cmu6czvjl0004m4968wt4k4en"],
      selectedProjectId: "cmu6czvjl0004m4968wt4k4en",
      discoveryScope: { scope: "province", targetName: "Ilocos Norte" },
      keyMetrics: { Capacity: "160.0 MW", Type: "Wind Energy BOP", Province: "Ilocos Norte" },
    },
    {
      step: 6,
      totalSteps: 6,
      id: "hydro-step-6",
      title: "National Clean Energy Matrix",
      subtitle: "1,495+ MW Total Portfolio Impact Across Philippines",
      narration: "Sta. Clara's renewable clean energy portfolio spans hydropower, wind power, and battery storage across the archipelago.",
      camera: { center: [121.774, 12.8797], zoom: 5.8, pitch: 0, bearing: 0 },
      highlightProjectIds: [
        "cmu6czvey0002m496fyfhuq3n",
        "cmqvwzn750000r8w1zidk116i",
        "cmu6czxut0015m496svmbppv0",
        "cmu6czvcn0001m496zujvgg79",
        "cmu6czvjl0004m4968wt4k4en",
      ],
      discoveryScope: { scope: "national" },
      keyMetrics: { "Clean Generation": "1,495+ MW", Projects: "Hydro, Wind & Storage" },
    },
  ],
};

// ─── 7. DYNAMIC TOUR GENERATOR ──────────────────────────────────
export interface DynamicTourOptions {
  query?: string;
  region?: string;
  islandGroup?: string;
  category?: string;
  projectIds?: string[];
  title?: string;
  maxSteps?: number;
}

export function generateDynamicTour(options: DynamicTourOptions): AtlasTourData {
  let matchedProjects: SCICProject[] = [];

  if (options.projectIds && options.projectIds.length > 0) {
    for (const pid of options.projectIds) {
      const p = findProjectInDataset(ALL_PROJECTS, pid);
      if (p && !matchedProjects.some((m) => m.id === p.id)) {
        matchedProjects.push(p);
      }
    }
  }

  if (matchedProjects.length === 0) {
    const searchFilter = options.query || options.region || options.category || options.islandGroup || "";
    matchedProjects = ALL_PROJECTS.filter((p) => {
      if (options.islandGroup && normalizeSearchText(p.islandGroup) !== normalizeSearchText(options.islandGroup)) {
        return false;
      }
      if (options.region && !normalizeSearchText(p.region).includes(normalizeSearchText(options.region))) {
        return false;
      }
      if (options.category && !normalizeSearchText(p.sector).includes(normalizeSearchText(options.category))) {
        return false;
      }
      if (searchFilter) {
        return projectMatchesSearch(p, searchFilter);
      }
      return true;
    });
  }

  // Fallback to top projects if empty
  if (matchedProjects.length === 0) {
    matchedProjects = ALL_PROJECTS.slice(0, 5);
  }

  const limit = Math.min(matchedProjects.length, options.maxSteps || 6);
  const selected = matchedProjects.slice(0, limit);
  const total = selected.length;

  const title = options.title || (options.query ? `Custom Tour: ${options.query}` : "SCIC Curated Portfolio Tour");
  const tourId = `dynamic-tour-${Date.now()}`;

  const steps: AtlasTourStepData[] = selected.map((proj, idx) => ({
    step: idx + 1,
    totalSteps: total,
    id: `dynamic-step-${idx + 1}-${proj.id}`,
    title: proj.name,
    subtitle: `${proj.sector?.replace(/_/g, " ")} • ${proj.region}`,
    narration:
      proj.description ||
      `Here we are at ${proj.name} located in ${proj.province}, ${proj.region}. This facility is a key component of SCIC's heavy engineering portfolio with ${proj.client}.`,
    camera: {
      center: [proj.coordinates.lng, proj.coordinates.lat],
      zoom: 12.5,
      pitch: 45,
      bearing: (idx * 25) % 90,
    },
    highlightProjectIds: [proj.id],
    selectedProjectId: proj.id,
    discoveryScope: {
      scope: "region",
      targetName: proj.region,
    },
    keyMetrics: {
      Category: proj.sector?.replace(/_/g, " "),
      Status: proj.status,
      Location: `${proj.municipality}, ${proj.province}`,
      ...(proj.metrics?.capacity ? { Capacity: proj.metrics.capacity } : {}),
      ...(proj.client ? { Client: proj.client } : {}),
    },
  }));

  return {
    tourId,
    tourTitle: title,
    totalSteps: total,
    steps,
  };
}

// ─── 8. CANONICAL TOUR RESOLVER ─────────────────────────────────
export function getGuidedTourData(tourIdOrQuery: string = "national-flagship-tour"): AtlasTourData {
  const norm = normalizeSearchText(tourIdOrQuery);

  if (norm.includes("visayas") || norm.includes("bohol") || norm.includes("cebu")) {
    return VISAYAS_TOUR;
  }
  if (norm.includes("mindanao") || norm.includes("davao") || norm.includes("bukidnon") || norm.includes("sarangani")) {
    return MINDANAO_TOUR;
  }
  if (
    norm.includes("central") ||
    norm.includes("bataan") ||
    norm.includes("tarlac") ||
    norm.includes("bulacan") ||
    norm.includes("ncr") ||
    norm.includes("manila") ||
    norm.includes("subic")
  ) {
    return CENTRAL_LUZON_TOUR;
  }
  if (
    norm.includes("north") ||
    norm.includes("cordillera") ||
    norm.includes("car") ||
    norm.includes("benguet") ||
    norm.includes("isabela") ||
    norm.includes("cagayan") ||
    norm.includes("mountain")
  ) {
    return NORTH_LUZON_TOUR;
  }
  if (
    norm.includes("hydro") ||
    norm.includes("clean energy") ||
    norm.includes("renewable") ||
    norm.includes("wind") ||
    norm.includes("solar")
  ) {
    return CLEAN_ENERGY_TOUR;
  }
  if (norm === "national-flagship-tour" || norm.includes("flagship") || norm.includes("national") || norm.includes("philippines")) {
    return NATIONAL_FLAGSHIP_TOUR;
  }

  // If query is for a specific region, province, or topic, dynamically synthesize
  if (tourIdOrQuery && tourIdOrQuery !== "national-flagship-tour") {
    return generateDynamicTour({ query: tourIdOrQuery, title: `SCIC Tour: ${tourIdOrQuery}` });
  }

  return NATIONAL_FLAGSHIP_TOUR;
}
