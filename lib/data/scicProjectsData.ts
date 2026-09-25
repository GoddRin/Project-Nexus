export type ProjectSector =
  | "HYDRO_RENEWABLE"
  | "WIND_POWER"
  | "INFRASTRUCTURE_ROADS"
  | "RAILWAYS_TRANSIT"
  | "WATER_DAMS"
  | "POWER_GRID"
  | "MINING_TUNNELING"
  | "BUILDINGS_INDUSTRIAL";

export type ProjectStatus = "ONGOING" | "COMPLETED" | "UPCOMING" | "PLANNING" | "ON_HOLD";

export type IslandGroup = "LUZON" | "VISAYAS" | "MINDANAO";

export interface ProjectManagerInfo {
  name: string;
  role: string;
  division: string;
  avatarUrl?: string;
  licenseNumber?: string;
  contactEmail?: string;
}

export interface SCICProject {
  id: string;
  name: string;
  code: string;
  shortName: string;
  sector: ProjectSector;
  status: ProjectStatus;
  islandGroup: IslandGroup;
  region: string;
  province: string;
  municipality: string;
  barangay?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  metrics: {
    capacity?: string;
    contractValue?: string;
    tunnelLength?: string;
    roadLength?: string;
    generationOutput?: string;
    safeManHours?: string;
    workforcePeak?: number;
  };
  client: string;
  leadPM?: ProjectManagerInfo;
  description: string;
  engineeringScope: string[];
  keyMilestones: {
    date: string;
    title: string;
    status: "ACHIEVED" | "IN_PROGRESS" | "SCHEDULED";
  }[];
  imageUrl: string;
  galleryImages?: string[];
  featured?: boolean;
  completionYear?: number;
  targetCodDate?: string;
  projectStartDate?: string;
  projectEndDate?: string;
}

export const SECTOR_CONFIG: Record<
  ProjectSector,
  {
    label: string;
    shortLabel: string;
    color: string; // Hex color
    twBg: string;
    twText: string;
    twBorder: string;
    icon: string;
    description: string;
  }
> = {
  HYDRO_RENEWABLE: {
    label: "Hydropower & Renewable Energy",
    shortLabel: "Hydro & Renewables",
    color: "#10A51D",
    twBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    twText: "text-emerald-600 dark:text-emerald-400",
    twBorder: "border-emerald-500/30",
    icon: "Zap",
    description: "Run-of-river hydro plants, high-head penstocks, and hydro generation.",
  },
  WIND_POWER: {
    label: "Wind Power & Clean Aerogenerators",
    shortLabel: "Wind Power",
    color: "#06B6D4",
    twBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    twText: "text-cyan-600 dark:text-cyan-400",
    twBorder: "border-cyan-500/30",
    icon: "Wind",
    description: "Utility-scale onshore and offshore wind farms, turbine foundations, and crane pads.",
  },
  INFRASTRUCTURE_ROADS: {
    label: "Highways, Expressways & Bridges",
    shortLabel: "Highways & Civil",
    color: "#F59E0B",
    twBg: "bg-amber-500/10 dark:bg-amber-500/20",
    twText: "text-amber-600 dark:text-amber-400",
    twBorder: "border-amber-500/30",
    icon: "Navigation",
    description: "Arterial expressways, deep rock cuts, and multi-span bridges.",
  },
  RAILWAYS_TRANSIT: {
    label: "Railways & Mass Transit",
    shortLabel: "Rail & Transit",
    color: "#8B5CF6",
    twBg: "bg-purple-500/10 dark:bg-purple-500/20",
    twText: "text-purple-600 dark:text-purple-400",
    twBorder: "border-purple-500/30",
    icon: "Train",
    description: "Elevated viaducts, bored piling foundations, and rail systems.",
  },
  WATER_DAMS: {
    label: "Water Utilities, Treatment & Reservoirs",
    shortLabel: "Water & Dams",
    color: "#00A3E0",
    twBg: "bg-sky-500/10 dark:bg-sky-500/20",
    twText: "text-sky-600 dark:text-sky-400",
    twBorder: "border-sky-500/30",
    icon: "Waves",
    description: "Mega water treatment plants, intake weirs, and resilient reservoirs.",
  },
  POWER_GRID: {
    label: "Power Generation & Grid Substations",
    shortLabel: "Power & Grid",
    color: "#3B82F6",
    twBg: "bg-blue-500/10 dark:bg-blue-500/20",
    twText: "text-blue-600 dark:text-blue-400",
    twBorder: "border-blue-500/30",
    icon: "Cpu",
    description: "Combined cycle facilities, 500kV/230kV EHV lines, and BESS storage.",
  },
  MINING_TUNNELING: {
    label: "Mining & Heavy Underground Tunneling",
    shortLabel: "Mining & Tunnels",
    color: "#EF4444",
    twBg: "bg-rose-500/10 dark:bg-rose-500/20",
    twText: "text-rose-600 dark:text-rose-400",
    twBorder: "border-rose-500/30",
    icon: "Layers",
    description: "Deep subterranean tunnels, drill-and-blast, and tailing dams.",
  },
  BUILDINGS_INDUSTRIAL: {
    label: "Industrial Facilities & Commercial Buildings",
    shortLabel: "Industrial & Facilities",
    color: "#6366F1",
    twBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    twText: "text-indigo-600 dark:text-indigo-400",
    twBorder: "border-indigo-500/30",
    icon: "Building",
    description: "Specialized manufacturing complexes, mega warehouses, and corporate towers.",
  },
};

export const SCIC_PROJECTS: SCICProject[] = [
  // ==========================================
  // LUZON — NORTH & CENTRAL
  // ==========================================
  {
    id: "scic-thepp-isabela",
    name: "Tumauini Hydroelectric Power Project (THEPP)",
    code: "SCIC-HEPP-01",
    shortName: "Tumauini HEPP",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region II (Cagayan Valley)",
    province: "Isabela",
    municipality: "Tumauini",
    barangay: "Antagan Uno",
    coordinates: {
      lat: 17.318823,
      lng: 121.9749251,
    },
    metrics: {
      capacity: "11.3 MW",
      contractValue: "₱2.85 Billion",
      generationOutput: "62.4 GWh / year",
      safeManHours: "1,450,000 Safe Hours",
      workforcePeak: 420,
    },
    client: "Philnew Hydro Power Corp. (PHPC)",
    description:
      "A flagship run-of-river hydroelectric development harnessing the high volumetric discharge of the Tumauini River. Featuring a reinforced concrete diversion weir, automated desilting basin, high-pressure penstock, and an advanced dual-turbine powerhouse feeding clean green energy directly into the Luzon grid. EPC design by EDCOP.",
    engineeringScope: [
      "Concrete gravity diversion weir & intake gatehouse structure",
      "Multi-chamber settling basin with automated scouring sluiceways",
      "1.8-kilometer low-loss buried steel penstock conduit",
      "Semi-underground powerhouse equipped with 2x Francis turbine generating units",
      "Step-up 69kV transmission switchyard linking to NGCP Ilagan Substation",
    ],
    keyMilestones: [
      { date: "Q1 2023", title: "Diversion Channel Completion", status: "ACHIEVED" },
      { date: "Q3 2024", title: "Penstock Hydrostatic Testing", status: "ACHIEVED" },
      { date: "Q2 2025", title: "Turbine Electro-Mechanical Alignment", status: "ACHIEVED" },
      { date: "Q4 2026", title: "Grid Synchronized Commercial Operation (COD)", status: "IN_PROGRESS" },
    ],
    imageUrl: "/sitemap-photos/desander-1.jpg",
    galleryImages: [
          "/sitemap-photos/desander-1.jpg",
          "/sitemap-photos/desander-2.jpg",
          "/sitemap-photos/desander-3.jpg",
          "/sitemap-photos/desander-4.jpg"
    ],
    featured: true,
    targetCodDate: "December 2026",
  },
  {
    id: "scic-sabangan-hydro",
    name: "Sabangan Hydroelectric Power Plant",
    code: "SCIC-HEPP-02",
    shortName: "Sabangan Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Cordillera Administrative Region (CAR)",
    province: "Mountain Province",
    municipality: "Sabangan",
    barangay: "Namatec",
    coordinates: {
      lat: 17.0225,
      lng: 120.9231,
    },
    metrics: {
      capacity: "14.0 MW",
      contractValue: "₱2.4 Billion",
      tunnelLength: "3.1 km headrace tunnel",
      safeManHours: "2,100,000 Safe Hours",
      generationOutput: "55 GWh / year",
    },
    client: "Hedcor Sabangan, Inc. / AboitizPower",
    description:
      "A monumental engineering feat in the rugged Cordillera mountain range. SCIC was the sole general contractor, delivering a 12-kilometer rugged mountain access road, high-velocity intake weir, desander, 3.1-kilometer rock-hewn headrace tunnel, and a modern riverside powerhouse. Commissioned May 2015.",
    engineeringScope: [
      "12 km mountain access road construction across treacherous cliffs",
      "Intake weir with high-capacity radial sluice gates",
      "3.1 km drill-and-blast headrace tunnel with shotcrete and rock bolting",
      "High-head steel penstock and Pelton turbine installation",
    ],
    keyMilestones: [
      { date: "May 2015", title: "Commercial Commissioning (Inauguration)", status: "ACHIEVED" },
      { date: "2016", title: "National Award for Engineering Excellence", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2015,
  },
  {
    id: "scic-bakun-hydro",
    name: "Bakun AC Hydroelectric Power Plant",
    code: "SCIC-HEPP-03",
    shortName: "Bakun Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "CAR / Region I",
    province: "Benguet / Ilocos Sur",
    municipality: "Bakun & Alilem",
    coordinates: {
      lat: 16.897,
      lng: 120.678,
    },
    metrics: {
      capacity: "70.0 MW",
      contractValue: "₱4.8 Billion",
      tunnelLength: "9.6 km deep rock tunnel",
      safeManHours: "3,500,000 Safe Hours",
    },
    client: "Luzon Hydro Corporation (LHC) / AboitizPower",
    description:
      "SCIC's legendary underground tunnel breakthrough: excavation, rock stabilization, and concrete lining of a massive 9.6-kilometer headrace tunnel through complex geological faults in Northern Luzon, delivering 70 MW of clean peak power. One of the longest hydro tunnels in the Philippines.",
    engineeringScope: [
      "9.6 km deep rock tunneling with sequential excavation and steel arches",
      "High-pressure underground surge shaft and penstock incline",
      "Weir diversion structures along the Bakun River",
      "Overground powerhouse and tailrace canal",
    ],
    keyMilestones: [
      { date: "Feb 2001", title: "Tunnel Breakthrough Milestone", status: "ACHIEVED" },
      { date: "Aug 2001", title: "Commercial Grid Synchronization", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2001,
  },
  {
    id: "scic-kiangan-mini-hydro",
    name: "Kiangan Mini-Hydroelectric Power Project (17.5 MW)",
    code: "SCIC-HEPP-04",
    shortName: "Kiangan Mini Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Cordillera Administrative Region (CAR)",
    province: "Ifugao",
    municipality: "Kiangan",
    coordinates: {
      lat: 16.7833,
      lng: 121.0833,
    },
    metrics: {
      capacity: "17.5 MW",
      tunnelLength: "2.8 km",
      contractValue: "₱2.30 Billion",
      workforcePeak: 480,
      safeManHours: "1,800,000 Safe Hours",
    },
    client: "Ifugao Renewable Energy Corporation",
    description:
      "A high-head run-of-river mini hydroelectric installation in the scenic highlands of Ifugao. SCIC is executing the construction of a 2.8 km drill-and-blast headrace tunnel, concrete diversion weir, surface desander tanks, steel surface penstock, and powerhouse with high-efficiency Pelton turbines.",
    engineeringScope: [
      "2.8 km Drill-and-Blast Headrace Tunnel in High-Altitude Cordillera",
      "Surface Steel Penstock on Reinforced Concrete Anchor Blocks",
      "Run-of-River Diversion Weir with Sand Flushing Gates",
      "Powerhouse Construction & Pelton Turbine Installation",
    ],
    keyMilestones: [
      { date: "2023-Q2", title: "Access Road Construction to Mountain Portal", status: "ACHIEVED" },
      { date: "2024-Q3", title: "Tunnel Excavation & Headrace Development", status: "IN_PROGRESS" },
      { date: "2026-Q4", title: "Target Commercial Commissioning (COD)", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    targetCodDate: "Q4 2026",
  },
  {
    id: "scic-pagudpud-wind",
    name: "Pagudpud Wind Farm (160 MW BOP Civil Works)",
    code: "SCIC-WIND-01",
    shortName: "Pagudpud Wind Farm",
    sector: "WIND_POWER",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region I (Ilocos)",
    province: "Ilocos Norte",
    municipality: "Pagudpud",
    barangay: "Balaoi & Caunayan",
    coordinates: {
      lat: 18.5917,
      lng: 120.825,
    },
    metrics: {
      capacity: "160 MW (Largest in PH)",
      contractValue: "₱5.40 Billion",
      roadLength: "28 km internal heavy crane roads",
      safeManHours: "3,200,000 Safe Hours",
      workforcePeak: 850,
    },
    client: "ACEN Corporation / North Luzon Renewables (Ayala Group)",
    description:
      "Civil Balance of Plant (BOP) execution for the largest wind farm in the Philippines, generating 160 MW of zero-carbon electricity. SCIC delivered 32 reinforced monolithic wind turbine foundations, heavy-lift crane installation pads, and 28 kilometers of rugged ridge access roads. Officially inaugurated by national leadership in May 2023.",
    engineeringScope: [
      "32 massive reinforced concrete turbine foundation footings",
      "28 km ridge-top heavy-haul access arterials in mountain terrain",
      "Substation platform civil foundations & regional stormwater drainage",
      "Slope stabilization & geotextile reinforcement along coastal cliffs",
    ],
    keyMilestones: [
      { date: "2021-Q2", title: "Groundbreaking & Forest Access Roads", status: "ACHIEVED" },
      { date: "2022-Q4", title: "32 Turbine Foundations Completed", status: "ACHIEVED" },
      { date: "2023-05", title: "Official Presidential & Ayala Inauguration", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-wind-farm-inauguration.jpg",
    galleryImages: [
          "/project-images/scic-wind-farm-inauguration.jpg"
    ],
    featured: true,
    completionYear: 2023,
  },
  {
    id: "scic-kapangan-hepp",
    name: "Kapangan Hydroelectric Power Project (60 MW)",
    code: "SCIC-HEPP-KAPANGAN",
    shortName: "Kapangan HEPP",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Cordillera Administrative Region (CAR)",
    province: "Benguet",
    municipality: "Kapangan",
    barangay: "Cuba & Beleng-Belis",
    coordinates: {
      lat: 16.5833,
      lng: 120.5833,
    },
    metrics: {
      capacity: "60.0 MW",
      contractValue: "₱9.20 Billion",
      tunnelLength: "8.2 km",
      workforcePeak: 680,
      safeManHours: "1,450,000 Safe Hours",
    },
    client: "Cordillera Hydroelectric Power Corporation (COHECO)",
    description:
      "A flagship 60 MW run-of-river hydroelectric power generation facility harnessing the high hydraulic head of the Amburayan River basin in Kapangan, Benguet. SCIC's civil scope features an 8.2 km low-pressure headrace tunnel through complex metamorphic Cordillera geology, 110-meter surge shaft, surface powerhouse, and heavy switchyard installation.",
    engineeringScope: [
      "8.2 km Drill-and-Blast Headrace Tunnel (3.8m dia) with Steel Rib Supports",
      "110-meter Vertical Surge Shaft and High-Pressure Underground Penstock",
      "Concrete Gravity Diversion Weir & Automated Desander Sand Flushing Basins",
      "Surface Powerhouse housing 3x High-Efficiency Francis Turbine Units",
      "69 kV High-Voltage Transmission Interconnection to La Trinidad Grid",
    ],
    keyMilestones: [
      { date: "2024-Q3", title: "Site Mobilization & Tunnel Portal Stabilization", status: "ACHIEVED" },
      { date: "2025-Q2", title: "Headrace Tunnel Underground Breakthrough", status: "IN_PROGRESS" },
      { date: "2026-Q4", title: "Commercial Operations Date (COD) & Grid Synchronization", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },
  {
    id: "scic-libmanan-wind",
    name: "Libmanan Wind Energy & WTG Foundation Infrastructure",
    code: "SCIC-WIND-LIBMANAN",
    shortName: "Libmanan Wind Complex",
    sector: "WIND_POWER",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region V (Bicol Region)",
    province: "Camarines Sur",
    municipality: "Libmanan",
    barangay: "Tanag",
    coordinates: {
      lat: 13.6942,
      lng: 123.0617,
    },
    metrics: {
      capacity: "70.0 MW",
      contractValue: "₱3.80 Billion",
      workforcePeak: 420,
      safeManHours: "820,000 Safe Hours",
    },
    client: "Bicol Wind Energy Dev Corp / Clean Energy Consortium",
    description:
      "Construction of Wind Turbine Generator (WTG) gravity base foundations, heavy crawler crane hardstands, and specialized deep ground improvement across the rolling coastal terrain of Libmanan, Camarines Sur. Features deep mass soil stabilization, crawler crane operational platforms, reinforced concrete footing caps, and heavy equipment access corridors.",
    engineeringScope: [
      "Mass Concrete Gravity Foundations for 16x Wind Turbine Towers",
      "Specialized Deep Geotechnical Ground Improvement & Compaction Grouting",
      "14.5 km Heavy-Haul Blade Transport Access Corridors and Drainage",
      "Crawler Crane Hardstand Assembly Platforms (1,200-ton capacity)",
      "Medium Voltage Underground Collector Trenching and Padmount Substations",
    ],
    keyMilestones: [
      { date: "2024-Q4", title: "Geotechnical Survey & Soil Grouting", status: "ACHIEVED" },
      { date: "2025-Q3", title: "WTG Foundation Cap Concreting", status: "IN_PROGRESS" },
      { date: "2026-Q2", title: "Substation Interconnection & Energization", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },

  // ==========================================
  // LUZON — RAILWAYS & TRANSIT
  // ==========================================
  {
    id: "scic-nscr-cp02",
    name: "North-South Commuter Railway (NSCR) Package CP02",
    code: "SCIC-RAIL-01",
    shortName: "NSCR Package CP02",
    sector: "RAILWAYS_TRANSIT",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Bulacan",
    municipality: "Bocaue to Malolos",
    coordinates: {
      lat: 14.8295,
      lng: 120.841,
    },
    metrics: {
      contractValue: "₱7.2 Billion (Joint Scope)",
      roadLength: "14 km elevated viaduct",
      safeManHours: "3,800,000 Safe Hours",
      workforcePeak: 850,
    },
    client: "Department of Transportation (DOTr) / Bouygues Travaux Publics",
    description:
      "A flagship national rail corridor contract connecting NCR and Central Luzon. Scope involves bored piling foundations up to 60 meters deep, casting of reinforced concrete viaduct piers, precast girder launching, and substructure civil works for elevated passenger stations along the Bocaue–Malolos segment.",
    engineeringScope: [
      "Over 1,200 large-diameter cast-in-place bored piles",
      "Reinforced concrete hammerhead pier columns & portal frames",
      "Precast segmental box girder erection with high-capacity launching gantries",
      "Underground drainage corridors and station foundation tie-ins",
    ],
    keyMilestones: [
      { date: "2021", title: "Piling Operations Commencement", status: "ACHIEVED" },
      { date: "2024", title: "Viaduct Pier Substructure Completion", status: "ACHIEVED" },
      { date: "2026", title: "Superstructure Track Bed Handover", status: "IN_PROGRESS" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "Late 2026",
  },
  {
    id: "scic-lrt1-cavite",
    name: "LRT-1 Cavite Extension Viaduct Works",
    code: "SCIC-RAIL-02",
    shortName: "LRT-1 Cavite Extension",
    sector: "RAILWAYS_TRANSIT",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "NCR / Region IV-A",
    province: "Metro Manila / Cavite",
    municipality: "Parañaque to Bacoor",
    coordinates: {
      lat: 14.4792,
      lng: 120.9856,
    },
    metrics: {
      contractValue: "₱4.5 Billion",
      roadLength: "11.7 km rail corridor",
      safeManHours: "4,200,000 Safe Hours",
    },
    client: "Light Rail Manila Corporation (LRMC) / Bouygues Travaux Publics Philippines, Inc.",
    description:
      "Civil works, substructure piers, and elevated guideway construction extending the Light Rail Transit Line 1 southward from Baclaran to Niog, Bacoor, easing traffic congestion for over 300,000 daily commuters.",
    engineeringScope: [
      "Urban viaduct bored piling in dense utility-rich right-of-way",
      "Specialized girder launching over major arterial highways and tollways",
      "Intermodal station substructures and pedestrian overpass civil works",
    ],
    keyMilestones: [
      { date: "Nov 2024", title: "Phase 1 (Dr. Santos Station) Opening", status: "ACHIEVED" },
      { date: "2026", title: "Phase 2 Bacoor Extension Completion", status: "IN_PROGRESS" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },

  // ==========================================
  // LUZON — HIGHWAYS & INFRASTRUCTURE
  // ==========================================
  {
    id: "scic-tipo-expressway",
    name: "Subic Freeport Expressway (SFEx) Expansion & Mountain Tunnels",
    code: "SCIC-HWY-01",
    shortName: "SFEx Tunnel & Highway",
    sector: "INFRASTRUCTURE_ROADS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Bataan",
    municipality: "Hermosa / Dinalupihan",
    coordinates: {
      lat: 14.8512,
      lng: 120.3541,
    },
    metrics: {
      roadLength: "8.2 km",
      tunnelLength: "1.2 km twin tunnels",
      contractValue: "₱1.60 Billion",
      workforcePeak: 620,
      safeManHours: "2,400,000 Safe Hours",
    },
    client: "NLEX Corporation / Metro Pacific Tollways",
    description:
      "Major expansion of the Subic Freeport Expressway traversing the rugged Bataan mountain pass. SCIC executed the construction of twin mountain highway tunnels excavated through volcanic rock via NATM, two major viaduct bridges (Jalandoni Bridge and Argonaut), and modernized slope stabilization. Opened to commercial tolling in February 2021.",
    engineeringScope: [
      "Twin Highway Mountain Tunnels (Drill-and-Blast with NATM Permanent Lining)",
      "Jalandoni Bridge and Argonaut Highway Viaducts",
      "8.2 km Expressway Pavement & LED Intelligent Tunnel Lighting",
      "High-Capacity Dynamic Rockfall Barriers and Shotcrete Slope Protection",
    ],
    keyMilestones: [
      { date: "2019-Q3", title: "Tunnel Portal Excavation", status: "ACHIEVED" },
      { date: "2020-Q4", title: "SFEx Tunnel Underground Breakthrough", status: "ACHIEVED" },
      { date: "2021-Q1", title: "Full Commercial Operations & Tollway Opening", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2021,
  },
  {
    id: "scic-sctex-pkg1",
    name: "Subic-Clark-Tarlac Expressway (SCTEX) Package 1",
    code: "SCIC-HWY-02",
    shortName: "SCTEX Package 1",
    sector: "INFRASTRUCTURE_ROADS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Bataan & Pampanga",
    municipality: "Subic to Clark",
    coordinates: {
      lat: 14.9833,
      lng: 120.4833,
    },
    metrics: {
      roadLength: "50.5 km expressway segment",
      contractValue: "₱6.5 Billion (Consortium)",
      safeManHours: "4,000,000 Safe Hours",
    },
    client: "Bases Conversion and Development Authority (BCDA)",
    description:
      "SCIC's critical role in the landmark Subic-Clark-Tarlac Expressway. Earthworks, river bridges, drainage structures, and asphalt pavements connecting Central Luzon's premier economic freeport zones.",
    engineeringScope: [
      "Over 4 million cubic meters of cut-and-fill bulk earthworks",
      "Multiple river bridge crossings including pre-stressed girder spans",
      "Toll plazas, interchange ramps, and high-spec drainage culverts",
    ],
    keyMilestones: [{ date: "2008", title: "Full Commercial Inauguration", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2008,
  },
  {
    id: "scic-upper-wawa-roads",
    name: "Upper Wawa Dam Access Roads & Infrastructure",
    code: "SCIC-DAM-01",
    shortName: "Upper Wawa Access Roads",
    sector: "INFRASTRUCTURE_ROADS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Rizal",
    municipality: "Rodriguez (Montalban)",
    coordinates: {
      lat: 14.7317,
      lng: 121.2056,
    },
    metrics: {
      roadLength: "16 km heavy mountainous roads",
      contractValue: "₱1.45 Billion",
      safeManHours: "1,350,000 Safe Hours",
    },
    client: "Wawa JVCo / Prime Infra",
    description:
      "Permanent and temporary heavy-haul access roads, deep ravine bridges, and massive slope stabilization built to support construction of the Philippines' newest mega water security dam across the Sierra Madre.",
    engineeringScope: [
      "16 km all-weather heavy transport corridors for quarry equipment",
      "Reinforced concrete river crossing bridges and high-capacity box culverts",
      "Extensive soil-nailing, shotcreting, and rockfall barrier installations",
    ],
    keyMilestones: [{ date: "2023", title: "Access Corridor Completion", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2023,
  },
  {
    id: "scic-slex-tr4",
    name: "SLEX Toll Road 4 (TR4) San Pablo to Tiaong / Lucena",
    code: "SCIC-HWY-03",
    shortName: "SLEX TR4 Expressway",
    sector: "INFRASTRUCTURE_ROADS",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Laguna & Quezon",
    municipality: "San Pablo to Tiaong",
    coordinates: {
      lat: 14.03,
      lng: 121.36,
    },
    metrics: {
      roadLength: "22 km expressway package",
      contractValue: "₱3.8 Billion",
      safeManHours: "1,900,000 Safe Hours",
      workforcePeak: 450,
    },
    client: "San Miguel Corporation (SMC Tollways)",
    description:
      "Construction of expressway viaducts, overpass bridges, highway grading, and drainage systems extending the South Luzon Expressway into Quezon province, drastically cutting travel time to the Bicol corridor.",
    engineeringScope: [
      "Dual four-lane rigid concrete and asphalt pavement",
      "River crossing bridges using pre-stressed AASHTO girders",
      "Automated electronic toll collection plazas and interchange flyovers",
    ],
    keyMilestones: [
      { date: "2023", title: "Viaduct Superstructure Erection", status: "ACHIEVED" },
      { date: "2026", title: "Target Segment Substantial Completion", status: "IN_PROGRESS" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },
  {
    id: "scic-laoag-bongo-flood",
    name: "Laoag-Bongo River Flood Control & River Basin Protection",
    code: "SCIC-FLOOD-01",
    shortName: "Laoag Flood Control",
    sector: "INFRASTRUCTURE_ROADS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region I (Ilocos Region)",
    province: "Ilocos Norte",
    municipality: "Laoag City & San Nicolas",
    coordinates: {
      lat: 18.196,
      lng: 120.5927,
    },
    metrics: {
      capacity: "15.8 km Revetment",
      contractValue: "₱1.70 Billion",
      workforcePeak: 420,
      safeManHours: "1,350,000 Safe Hours",
    },
    client: "DPWH Unified Project Management Office (UPMO) / JICA",
    description:
      "Comprehensive river basin protection and alluvial fan training along the Laoag and Bongo rivers in Ilocos Norte. SCIC built 15.8 kilometers of reinforced concrete dikes, steel sheet pile cutoff walls, and spur dikes to protect vital provincial communities from extreme monsoon floods.",
    engineeringScope: [
      "15.8 km Heavy Concrete Revetments and Dike Embankments",
      "Interlocking Steel Sheet Pile Cutoff Walls",
      "Boulder Riprap Toe Protection & Spur Dike Groyne Structures",
      "Channel Dredging and Flow Training",
    ],
    keyMilestones: [
      { date: "2020-Q1", title: "Bongo River Dredging & Dike Foundation", status: "ACHIEVED" },
      { date: "2021-Q3", title: "Sheet Piling & Concrete Revetment", status: "ACHIEVED" },
      { date: "2022-Q4", title: "Final Inspection & Commissioning", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2022,
  },

  // ==========================================
  // LUZON — WATER & DAMS
  // ==========================================
  {
    id: "scic-balog-balog-dam",
    name: "Balog-Balog Multipurpose Project Phase II (BBMP-II)",
    code: "SCIC-DAM-02",
    shortName: "Balog-Balog Dam",
    sector: "WATER_DAMS",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Tarlac",
    municipality: "San Jose",
    barangay: "Maamot",
    coordinates: {
      lat: 15.4282,
      lng: 120.356,
    },
    metrics: {
      capacity: "559M cu.m Storage • 43.5 MW Hydro • 34,410 ha Irrigation",
      contractValue: "₱20.54 Billion (Phase II)",
      tunnelLength: "Diversion & Power Tunnels",
      generationOutput: "43.5 MW Clean Hydro",
      safeManHours: "1,850,000 Safe Hours",
      workforcePeak: 680,
    },
    client: "National Irrigation Administration (NIA)",
    description:
      "A strategic mega multipurpose dam development by the National Irrigation Administration (NIA) along the Bulsa River in San Jose, Tarlac. Featuring a 105.5-meter high zoned earthfill dam impounding a 559 million cubic meter reservoir to irrigate 34,410 hectares of Central Luzon agricultural land benefiting over 21,700 farming families, mitigate downstream flood risks, and generate 43.5 MW of hydroelectric power. SCIC is executing critical high dam civil works, subterranean diversion and power tunnel drill-and-blast excavation, shotcreting, pressure grouting, and heavy embankment construction.",
    engineeringScope: [
      "105.5-meter high zoned earthfill dam embankment on the Bulsa River (559M cu.m capacity)",
      "Subterranean diversion and power tunnel drill-and-blast excavation, rock bolting, and shotcreting",
      "Comprehensive curtain and consolidation pressure grouting across dam foundations",
      "Reinforced concrete intake tower, spillway chute structure, and outlet works",
      "43.5 MW hydroelectric powerhouse civil works and high-pressure penstock conduits",
      "Access road restoration, mountain slope stabilization, and drainage networks",
    ],
    keyMilestones: [
      { date: "Q1 2024", title: "Site Mobilization & Heavy Haul Road Rehabilitation", status: "ACHIEVED" },
      { date: "Q2 2026", title: "Tunnel Excavation, Grouting & Dam Embankment (45.79% Progress)", status: "IN_PROGRESS" },
      { date: "CY 2028", title: "Target Reservoir Impounding & Commercial Commissioning", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "CY 2028",
  },
  {
    id: "scic-morong-wtp",
    name: "Morong Water Treatment Plant (25–50 MLD)",
    code: "SCIC-WTP-01",
    shortName: "Morong WTP",
    sector: "WATER_DAMS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Bataan",
    municipality: "Morong",
    coordinates: {
      lat: 14.685,
      lng: 120.292,
    },
    metrics: {
      capacity: "50 MLD (Million Liters per Day)",
      contractValue: "₱1.10 Billion",
      safeManHours: "850,000 Safe Hours",
    },
    client: "Subic Water & Sewerage Co. / BCDA",
    description:
      "EPC contract for an advanced potable water purification plant featuring coagulation, rapid sand filtration, chlorination disinfection, treated water reservoirs, and booster pump distribution. Provides clean drinking water to Morong and the Subic Bay Freeport Zone. Completed February 2020.",
    engineeringScope: [
      "50 MLD Multi-Stage Potable Water Treatment Facility",
      "Raw Water River Intake Structure & Screens",
      "Clarifiers, Flocculators, and Rapid Sand Filters",
      "Clearwater Storage Reservoir (15,000 cu.m) & SCADA Automation",
    ],
    keyMilestones: [{ date: "Feb 2020", title: "Commissioning & Potable Water Delivery", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2020,
  },
  {
    id: "scic-la-mesa-wtp",
    name: "La Mesa Water Treatment Plant 1 Modernization (1,500 MLD)",
    code: "SCIC-WTP-02",
    shortName: "La Mesa WTP 1",
    sector: "WATER_DAMS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "NCR (Metro Manila)",
    province: "Quezon City",
    municipality: "Novaliches",
    coordinates: {
      lat: 14.7128,
      lng: 121.0722,
    },
    metrics: {
      capacity: "1,500 MLD (Mega Facility)",
      contractValue: "₱2.8 Billion (Process Improvement)",
      safeManHours: "3,100,000 Safe Hours",
    },
    client: "Maynilad Water Services, Inc. / JFE Engineering Corp. (JV)",
    description:
      "Modernization and seismic upgrading of Southeast Asia's critical water lifeline facility. SCIC executed process improvement works in JV with JFE Engineering Corp., including sedimentation basin retrofits and sloped plate settler installations serving 6 million residents of Metro Manila.",
    engineeringScope: [
      "Overhaul of 12 primary sedimentation basins with inclined tube settlers",
      "Upgrading of chemical dosing systems (coagulants, polymers, chlorine)",
      "Structural seismic strengthening of aged concrete clearwater reservoirs",
    ],
    keyMilestones: [{ date: "2020", title: "Completion with Zero Interruption", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2020,
  },
  {
    id: "scic-magdiwang-reservoir",
    name: "Magdiwang Reservoir Seismic Resiliency Enhancement (40 ML)",
    code: "SCIC-RES-01",
    shortName: "Magdiwang Reservoir",
    sector: "WATER_DAMS",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Cavite",
    municipality: "Bacoor City",
    coordinates: {
      lat: 14.4580,
      lng: 120.9740,
    },
    metrics: {
      capacity: "40 Million Liters (40 ML)",
      contractValue: "₱750 Million",
      safeManHours: "650,000 Safe Hours",
    },
    client: "Maynilad Water Services, Inc.",
    description:
      "High-magnitude seismic retrofitting of a massive 40-megaliter covered water reservoir in Bacoor, Cavite, utilizing carbon-fiber reinforced polymer (CFRP) wraps, post-tensioned tendon stabilization, and leak-proof interior lining.",
    engineeringScope: [
      "Seismic shear wall retrofitting and foundation micro-piling",
      "Advanced waterproofing membrane replacement over 15,000 sq.m",
      "Pressure-equalizing overflow and telemetry monitoring conduits",
    ],
    keyMilestones: [{ date: "2021", title: "Structural Certification Handover", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2021,
  },
  {
    id: "scic-cagayan-corridor",
    name: "Cagayan Valley Agro-Industrial & Flood Mitigation Corridor",
    code: "SCIC-PIPE-02",
    shortName: "Cagayan Flood & Agri Corridor",
    sector: "WATER_DAMS",
    status: "UPCOMING",
    islandGroup: "LUZON",
    region: "Region II",
    province: "Cagayan & Isabela",
    municipality: "Tuguegarao to Ilagan",
    coordinates: {
      lat: 17.5,
      lng: 121.75,
    },
    metrics: {
      roadLength: "45 km canal & dike network",
      contractValue: "₱3.5 Billion (Planned)",
    },
    client: "National Irrigation Administration (NIA) / DPWH",
    description:
      "Strategic regional water management and flood control infrastructure safeguarding the Cagayan River basin, creating reliable irrigation canals and flood diversion channels.",
    engineeringScope: [
      "Multi-basin retention canals and automated regulating gates",
      "Heavy revetment dykes protecting agricultural lowlands",
      "Integrated regional farm-to-market service roads along canal alignments",
    ],
    keyMilestones: [{ date: "2026", title: "Feasibility & Civil Tender", status: "SCHEDULED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
  },

  // ==========================================
  // LUZON — HYDRO REHABILITATION (CBK COMPLEX)
  // ==========================================
  {
    id: "scic-caliraya-hydro",
    name: "Caliraya Hydroelectric Power Plant Rehabilitation",
    code: "SCIC-HEPP-05",
    shortName: "Caliraya Hydro (Rehab)",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Laguna",
    municipality: "Lumban",
    coordinates: {
      lat: 14.2981,
      lng: 121.5033,
    },
    metrics: {
      capacity: "32.0 MW (4x8 MW)",
      contractValue: "₱1.2 Billion",
      safeManHours: "980,000 Safe Hours",
    },
    client: "CBK Power Company Ltd. / NPC",
    description:
      "Comprehensive civil rehabilitation, penstock structural re-sleeving, spillway restoration, and intake gate overhaul for the historic Caliraya hydroelectric plant, part of the Caliraya-Botocan-Kalayaan (CBK) complex.",
    engineeringScope: [
      "Penstock structural relining and anchor block reinforcement",
      "Spillway concrete resurfacing and automated gate refurbishment",
      "Powerhouse tailrace de-silting and underwater inspection",
    ],
    keyMilestones: [{ date: "2004", title: "Restoration Commissioning", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2004,
  },
  {
    id: "scic-botocan-hydro",
    name: "Botocan Hydroelectric Power Plant Rehabilitation",
    code: "SCIC-HEPP-06",
    shortName: "Botocan Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Laguna",
    municipality: "Majayjay",
    coordinates: {
      lat: 14.1436,
      lng: 121.4989,
    },
    metrics: {
      capacity: "20.0 MW (2x10 MW)",
      contractValue: "₱950 Million",
      safeManHours: "820,000 Safe Hours",
    },
    client: "CBK Power Company Ltd.",
    description:
      "Restoration of penstock, intake structures, and mechanical balance of plant for one of the oldest operating hydro power facilities in the country, part of the CBK complex.",
    engineeringScope: [
      "Intake tunnel descaling and concrete re-lining",
      "Penstock saddle reinforcement on steep volcanic terrain",
      "Powerhouse machine hall civil retrofitting",
    ],
    keyMilestones: [{ date: "2004", title: "Handover & Grid Energization", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2004,
  },
  {
    id: "scic-kalayaan-hydro",
    name: "Kalayaan Pumped Storage Hydroelectric Plant",
    code: "SCIC-HEPP-07",
    shortName: "Kalayaan Pumped Storage",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Laguna",
    municipality: "Kalayaan",
    coordinates: {
      lat: 14.3564,
      lng: 121.5089,
    },
    metrics: {
      capacity: "300 MW (Expansion Units)",
      contractValue: "₱3.8 Billion",
      safeManHours: "2,600,000 Safe Hours",
    },
    client: "CBK Power Company Ltd. / IMPSA",
    description:
      "Civil works, underground high-pressure penstock, and intake channel enlargement for the Kalayaan Pumped Storage Hydroelectric Power Plant — the primary spinning reserve and grid stabilizer for Luzon.",
    engineeringScope: [
      "High-pressure underground penstock tunnel excavation and encasement",
      "Tailrace channel dredging and concrete stabilization at Laguna de Bay",
      "Upper reservoir intake tower structural modifications",
    ],
    keyMilestones: [{ date: "2004", title: "Commercial Pumped-Storage Operations", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2004,
  },

  // ==========================================
  // LUZON — POWER & GRID
  // ==========================================
  {
    id: "scic-sta-rita-ccpp",
    name: "Sta. Rita 1,000 MW Combined Cycle Power Plant",
    code: "SCIC-PWR-01",
    shortName: "Sta. Rita Power Station",
    sector: "POWER_GRID",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Batangas",
    municipality: "Batangas City",
    barangay: "Sta. Rita Aplaya",
    coordinates: {
      lat: 13.75,
      lng: 121.0333,
    },
    metrics: {
      capacity: "1,000 MW Combined Cycle",
      contractValue: "₱4.2 Billion (Civil & Site Works)",
      safeManHours: "5,000,000 Safe Hours",
    },
    client: "First Gas Power Corporation / Siemens",
    description:
      "35-hectare coastal site preparation, massive earthworks, heavy turbine foundations, and seawater cooling conduits for one of the largest natural gas-fired power stations in Southeast Asia. Site development completed November 1999.",
    engineeringScope: [
      "Bulk excavation and engineered fill of 35-hectare industrial complex",
      "Vibration-isolated reinforced concrete gas turbine foundation blocks",
      "Large-diameter offshore seawater intake pipelines and discharge canal",
    ],
    keyMilestones: [{ date: "Nov 1999", title: "Site Development & Civil Handover", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 1999,
  },
  {
    id: "scic-pagbilao-unit3",
    name: "Pagbilao Power Plant Unit 3 Hill Removal",
    code: "SCIC-PWR-02",
    shortName: "Pagbilao Unit 3",
    sector: "POWER_GRID",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Quezon",
    municipality: "Pagbilao",
    coordinates: {
      lat: 13.8967,
      lng: 121.745,
    },
    metrics: {
      capacity: "420 MW Supercritical Unit",
      contractValue: "₱1.85 Billion",
      safeManHours: "2,200,000 Safe Hours",
    },
    client: "Team Energy / San Buenaventura Power Ltd.",
    description:
      "Extensive rock hill removal, benching, terracing, and civil site development on Pagbilao Grande Island for the 375 MW supercritical expansion unit. Completed October 2014.",
    engineeringScope: [
      "Controlled blasting and excavation of 1.2 million cubic meters of rock",
      "Reinforced sea wall revetments and heavy industrial platform drainage",
      "Switchyard foundation pads and transformer blast barrier walls",
    ],
    keyMilestones: [{ date: "Oct 2014", title: "Civil Site Works Handover", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2014,
  },
  {
    id: "scic-mariveles-500kv",
    name: "Mariveles–Hermosa (Balsik) 500kV Transmission Line",
    code: "SCIC-GRID-01",
    shortName: "Mariveles 500kV Line",
    sector: "POWER_GRID",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Bataan",
    municipality: "Mariveles to Hermosa",
    coordinates: {
      lat: 14.5,
      lng: 120.5,
    },
    metrics: {
      capacity: "500kV Extra-High Voltage (EHV)",
      roadLength: "45 km line route",
      contractValue: "₱2.1 Billion",
      safeManHours: "1,600,000 Safe Hours",
    },
    client: "National Grid Corporation of the Philippines (NGCP)",
    description:
      "Erection of heavy steel lattice transmission towers and quadruple-bundle conductor stringing across rugged mountainous terrain in the Bataan peninsula, transmitting power from major power plants into the Luzon 500kV grid backbone.",
    engineeringScope: [
      "Foundation micropiling on steep mountain ridges",
      "Erection of over 140 self-supporting double-circuit 500kV steel towers",
      "Helicopter and drone-assisted conductor stringing across deep valleys",
    ],
    keyMilestones: [{ date: "2023", title: "Energization Milestone", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2023,
  },
  {
    id: "scic-marilao-substation",
    name: "Marilao 500kV/230kV EHV Substation",
    code: "SCIC-GRID-02",
    shortName: "Marilao Substation",
    sector: "POWER_GRID",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Bulacan",
    municipality: "Marilao",
    coordinates: {
      lat: 14.7583,
      lng: 120.9583,
    },
    metrics: {
      capacity: "500kV / 230kV Substation",
      contractValue: "₱1.3 Billion",
      safeManHours: "1,100,000 Safe Hours",
    },
    client: "National Grid Corporation of the Philippines (NGCP)",
    description:
      "Turnkey civil works, high-voltage transformer foundations, blast shield walls, control building, and switchyard grounding for NGCP's crucial Bulacan power hub.",
    engineeringScope: [
      "Massive reinforced concrete oil containment pits and transformer pads",
      "Switchyard control building with modern SCADA automation",
      "Heavy perimeter blast walls, stormwater drainage, and switchyard graveling",
    ],
    keyMilestones: [{ date: "2022", title: "Substation Energization", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2022,
  },
  {
    id: "scic-masinloc-bess",
    name: "Masinloc 20 MW Battery Energy Storage System (BESS)",
    code: "SCIC-BESS-01",
    shortName: "Masinloc BESS",
    sector: "POWER_GRID",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Zambales",
    municipality: "Masinloc",
    coordinates: {
      lat: 15.5342,
      lng: 119.9531,
    },
    metrics: {
      capacity: "20 MW / 40 MWh Storage",
      contractValue: "₱890 Million (Civil & Balance of Plant)",
      safeManHours: "750,000 Safe Hours",
    },
    client: "SMC Global Power",
    description:
      "Civil works, containerized lithium-ion battery array plinths, power conversion system (PCS) foundations, fire suppression vaults, and medium-voltage switchyard for fast-response frequency regulation. Initially 10 MW, expanded to 20 MW. Completed November 2016.",
    engineeringScope: [
      "Vibration and seismic-resistant container plinths for 30+ BESS units",
      "Automated clean-agent gas fire suppression and blast containment",
      "Underground MV cable duct banks and connection to thermal plant bus",
    ],
    keyMilestones: [{ date: "Nov 2016", title: "Commercial Frequency Support COD", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2016,
  },

  // ==========================================
  // LUZON — BUILDINGS & INDUSTRIAL
  // ==========================================
  {
    id: "scic-monde-nissin",
    name: "Monde Nissin Corporation Facility (Project Alviera)",
    code: "SCIC-IND-01",
    shortName: "Project Alviera",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Pampanga",
    municipality: "Porac",
    coordinates: {
      lat: 15.0833,
      lng: 120.5333,
    },
    metrics: {
      contractValue: "₱1.75 Billion",
      safeManHours: "1,900,000 Safe Hours",
    },
    client: "Monde Nissin Corporation",
    description:
      "A massive modern food manufacturing and automated distribution facility built to strict international hygiene and seismic standards inside Alviera Industrial Park. Sole contractor. Completed July 2019.",
    engineeringScope: [
      "Large-span structural steel manufacturing halls and high-bay warehouse",
      "Heavy industrial post-tensioned slab-on-grade floors",
      "Industrial effluent treatment and automated logistics docking bays",
    ],
    keyMilestones: [{ date: "Jul 2019", title: "Handover & Production Launch", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2019,
  },
  {
    id: "scic-jti-flex",
    name: "JTI Flex Manufacturing Facility",
    code: "SCIC-IND-02",
    shortName: "JTI Flex Batangas",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A",
    province: "Batangas",
    municipality: "Malvar",
    coordinates: {
      lat: 14.0333,
      lng: 121.1556,
    },
    metrics: {
      contractValue: "₱2.1 Billion",
      safeManHours: "2,500,000 Safe Hours",
    },
    client: "Japan Tobacco International (JTI)",
    description:
      "A high-precision, cleanroom-standard manufacturing complex inside Lima Technology Center featuring climate-controlled process halls and state-of-the-art HVAC systems. Sole contractor. Completed September 2018.",
    engineeringScope: [
      "Precision structural steel framing with high thermal performance envelope",
      "Epoxy terrazzo and dust-free production floor slabs",
      "Advanced industrial utility piping (compressed air, chilled water, steam)",
    ],
    keyMilestones: [{ date: "Sep 2018", title: "Factory Completion & Handover", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2018,
  },
  {
    id: "scic-subic-flour-mill",
    name: "Subic Bay Flour Mill & Marine Offloading Terminal",
    code: "SCIC-IND-03",
    shortName: "Subic Bay Flour Mill",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III",
    province: "Zambales",
    municipality: "Subic Bay Freeport Zone",
    coordinates: {
      lat: 14.82,
      lng: 120.27,
    },
    metrics: {
      contractValue: "₱1.4 Billion",
      safeManHours: "1,400,000 Safe Hours",
    },
    client: "Subic Bay Flour Mill Inc.",
    description:
      "Specialized slip-form concrete grain storage silos, pneumatic ship offloading conveyors, and deep-water berth integration for industrial grain import and processing.",
    engineeringScope: [
      "Slip-form continuous pour vertical concrete storage silos (60m height)",
      "Heavy marine piling for ship unloader rail trackway",
      "Automated bulk bagging and logistics warehouse facilities",
    ],
    keyMilestones: [{ date: "2018", title: "Terminal Handover", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2018,
  },
  {
    id: "scic-maersk-calamba",
    name: "Maersk - LF Logistics South Luzon Distribution Mega Hub",
    code: "SCIC-LOG-MAERSK",
    shortName: "Maersk Calamba Mega Hub",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Laguna",
    municipality: "Calamba",
    coordinates: {
      lat: 14.2117,
      lng: 121.1656,
    },
    metrics: {
      contractValue: "₱2.80 Billion",
      workforcePeak: 750,
      safeManHours: "1,900,000 Safe Hours",
    },
    client: "A.P. Moller - Maersk / LF Logistics Philippines",
    description:
      "A 100,000-square-meter automated distribution center in Calamba, Laguna. SCIC served as the general contractor on a 10-hectare site, constructing high-bay multi-temperature warehouses, massive structural steel truss systems, 75 loading docks, and high-efficiency logistics aprons. Groundbreaking November 2022.",
    engineeringScope: [
      "10-Hectare Master Site Civil Development & Industrial Grading",
      "High-Bay Structural Steel Warehouse Enclosures with Insulated Panels",
      "Laser-Screed Post-Tensioned Superflat Floor Slabs (FM2 Tolerance)",
      "Complete MEPF, Fire Suppression, and Automated Sorting Infrastructure",
    ],
    keyMilestones: [
      { date: "2022-11", title: "Groundbreaking Ceremony", status: "ACHIEVED" },
      { date: "2023-Q4", title: "Structural Steel Frame Completion", status: "ACHIEVED" },
      { date: "2024-Q3", title: "Turnkey Handover to Maersk Logistics", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-maersk-logistics-groundbreaking.jpg",
    galleryImages: [
          "/project-images/scic-maersk-logistics-groundbreaking.jpg"
    ],
    featured: true,
    completionYear: 2024,
  },
  {
    id: "scic-pmftc-tanauan",
    name: "PMFTC Tanauan Manufacturing Facility Extension",
    code: "SCIC-IND-PMFTC",
    shortName: "PMFTC Tanauan Plant",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Batangas",
    municipality: "Tanauan",
    coordinates: {
      lat: 14.0867,
      lng: 121.15,
    },
    metrics: {
      contractValue: "₱1.90 Billion",
      workforcePeak: 450,
      safeManHours: "1,250,000 Safe Hours",
    },
    client: "PMFTC Inc. (Philip Morris Fortune Tobacco Corp.)",
    description:
      "Multi-billion extension of PMFTC's premier manufacturing plant in Tanauan, Batangas. SCIC delivered complex structural additions, clean room manufacturing bays, high-capacity utility networks, and specialized heavy equipment foundation blocks under strict operational safety standards.",
    engineeringScope: [
      "Industrial Steel Superstructure & Specialized Thermal Cladding",
      "Clean Room Production Floors with Anti-Static Epoxy Coating",
      "Heavy Vibration-Isolated Machine Foundations",
      "Stormwater Detention & Industrial Environmental Containment Systems",
    ],
    keyMilestones: [
      { date: "2022-11", title: "Contract Execution", status: "ACHIEVED" },
      { date: "2023-Q3", title: "Structural Framing Completion", status: "ACHIEVED" },
      { date: "2024-Q2", title: "Operational Turnkey Handover", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2024,
  },
  {
    id: "scic-morong-discovery-park",
    name: "Morong Discovery Park Phase 1 Civil Infrastructure",
    code: "SCIC-BCDA-MORONG",
    shortName: "Morong Discovery Park",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Bataan",
    municipality: "Morong",
    coordinates: {
      lat: 14.6811,
      lng: 120.2828,
    },
    metrics: {
      contractValue: "₱1.40 Billion",
      workforcePeak: 380,
      safeManHours: "520,000 Safe Hours",
    },
    client: "Bases Conversion and Development Authority (BCDA)",
    description:
      "Package 1 construction for the new Morong Discovery Park in Bataan under BCDA. SCIC is undertaking primary arterial road networks, comprehensive drainage, underground power and communication duct banks, and master site grading for the Philippine Marine Corps Headquarters and strategic defense complex. Groundbreaking September 2023.",
    engineeringScope: [
      "Primary & Secondary Arterial Concrete Road Networks",
      "Underground Utility Ducting (Power, Telco, Water Mains)",
      "Master Site Earthworks and Geotechnical Retaining Structures",
      "Green Buffer Zones & Stormwater Retention Reservoirs",
    ],
    keyMilestones: [
      { date: "2023-09", title: "Official Groundbreaking Ceremony", status: "ACHIEVED" },
      { date: "2025-Q2", title: "Underground Utilities & Drainage Networks", status: "IN_PROGRESS" },
      { date: "2026-Q1", title: "Phase 1 Complete Commissioning", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-morong-discovery-park.jpg",
    galleryImages: [
          "/project-images/scic-morong-discovery-park.jpg"
    ],
    featured: true,
  },
  {
    id: "scic-hq-mandaluyong",
    name: "SCIC National Headquarters (Highway 54 Plaza)",
    code: "SCIC-HQ-01",
    shortName: "SCIC Central Command HQ",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "NCR",
    province: "Metro Manila",
    municipality: "Mandaluyong City",
    barangay: "Wack-Wack Greenhills",
    coordinates: {
      lat: 14.588,
      lng: 121.0545,
    },
    metrics: {
      contractValue: "₱1.2 Billion",
      safeManHours: "Corporate Central",
    },
    client: "Sta. Clara International Corporation",
    description:
      "The national nerve center and engineering headquarters of Sta. Clara International Corporation at 986 EDSA, Mandaluyong City, housing centralized project monitoring, executive operations, and geospatial engineering laboratories. Founded 1976.",
    engineeringScope: [
      "Commercial office tower development with subterranean parking",
      "Centralized project monitoring telemetry hub and BIM design studios",
      "Corporate boardrooms, engineering library, and mission command centers",
    ],
    keyMilestones: [{ date: "1976 - Present", title: "Continuous Operations", status: "ACHIEVED" }],
    imageUrl: "https://staclara.com.ph/wp-content/uploads/2025/11/Untitled-design-3.png",
    galleryImages: [
          "https://staclara.com.ph/wp-content/uploads/2025/11/Untitled-design-3.png"
    ],
    featured: true,
  },

  // ==========================================
  // LUZON — PIPELINE / UPCOMING
  // ==========================================
  {
    id: "scic-bcib-interlink",
    name: "Bataan-Cavite Interlink Bridge (BCIB) Preliminary Civil Works",
    code: "SCIC-PIPE-01",
    shortName: "Bataan-Cavite Interlink Bridge",
    sector: "INFRASTRUCTURE_ROADS",
    status: "UPCOMING",
    islandGroup: "LUZON",
    region: "Region III / Region IV-A",
    province: "Bataan & Cavite",
    municipality: "Mariveles to Naic",
    coordinates: {
      lat: 14.38,
      lng: 120.6,
    },
    metrics: {
      roadLength: "32.15 km maritime bridge corridor",
      contractValue: "Mega National Project (Tender / Preparation)",
    },
    client: "DPWH / Asian Development Bank (ADB)",
    description:
      "A game-changing 32-kilometer maritime mega-bridge across Manila Bay connecting Mariveles, Bataan and Naic, Cavite. SCIC's specialized deep marine engineering, tunneling, and viaduct expertise is positioned for major civil packages.",
    engineeringScope: [
      "Deep marine bored piling in high-seismic marine waters",
      "Cable-stayed navigation channel span substructures",
      "Land approach viaducts and interchange connections in Bataan and Cavite",
    ],
    keyMilestones: [
      { date: "2025-2026", title: "Tendering & Civil Packages Award", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },

  // ==========================================
  // MIMAROPA
  // ==========================================
  {
    id: "scic-catuiran-hydro",
    name: "Catuiran Hydroelectric Power Plant",
    code: "SCIC-HEPP-08",
    shortName: "Catuiran Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "MIMAROPA (Region IV-B)",
    province: "Oriental Mindoro",
    municipality: "Naujan & Baco",
    coordinates: {
      lat: 13.2833,
      lng: 121.1333,
    },
    metrics: {
      capacity: "8.0 MW",
      contractValue: "₱1.5 Billion",
      tunnelLength: "Headrace tunnel & 4km canal",
      safeManHours: "1,000,000+ Safe Hours",
    },
    client: "Sta. Clara Power Corporation / Catuiran Hydro",
    description:
      "A landmark off-grid renewable energy investment delivering clean, reliable baseload electricity to Oriental Mindoro. SCIC served as sole EPC contractor, delivering an intake weir, 4km canal, tunnel, desander, and modern powerhouse. Won recognition for achieving 1 Million Safe Man-Hours. Completed December 2018.",
    engineeringScope: [
      "Concrete diversion intake weir and sediment flushing bypass",
      "4 km open conveyance canal and drill-and-blast rock tunnel",
      "Two-unit Francis hydro turbine powerhouse and 69kV transmission link",
    ],
    keyMilestones: [
      { date: "2016", title: "1 Million Safe Man-Hours Safety Award", status: "ACHIEVED" },
      { date: "Dec 2018", title: "Commercial Plant Energization", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2018,
  },

  // ==========================================
  // VISAYAS
  // ==========================================
  {
    id: "scic-prdp-bohol-highway",
    name: "Bohol PRDP Agri-Industrial Trade Highway & Bridge Network",
    code: "SCIC-INFRA-BOHOL-PRDP",
    shortName: "Bohol PRDP Highway",
    sector: "INFRASTRUCTURE_ROADS",
    status: "ONGOING",
    islandGroup: "VISAYAS",
    region: "Region VII (Central Visayas)",
    province: "Bohol",
    municipality: "Calape & Antequera",
    barangay: "Desamparados to Tabuan",
    coordinates: {
      lat: 9.8833,
      lng: 123.95,
    },
    metrics: {
      roadLength: "24.5 km road & 4 bridges",
      contractValue: "₱625 Million (Largest PRDP in PH History)",
      workforcePeak: 380,
      safeManHours: "650,000 Safe Hours",
    },
    client: "Provincial Government of Bohol / World Bank / Department of Agriculture",
    description:
      "The largest single contract awarded under the World Bank-assisted Philippine Rural Development Project (PRDP) in national history. SCIC is constructing 24.5 kilometers of high-capacity reinforced concrete trade highway and four major prestressed girder bridges linking the agricultural heartland of Antequera directly to the maritime port of Calape. Groundbreaking February 2025.",
    engineeringScope: [
      "24.5 km Two-Lane Concrete Highway with Heavy Reinforced Pavements",
      "4 Heavy Prestressed Concrete Girder River Bridges",
      "Extensive Mountain Slope Protection & Mechanically Stabilized Earth (MSE) Walls",
      "Reinforced Concrete Box Culverts (RCBC) and Cross Drainage Systems",
    ],
    keyMilestones: [
      { date: "2025-01", title: "Official Groundbreaking in Bohol", status: "ACHIEVED" },
      { date: "2025-Q4", title: "Bridge Pier & Abutment Completion", status: "IN_PROGRESS" },
      { date: "2026-Q3", title: "Final Asphalt Overlay & Handover", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-bohol-prdp-groundbreaking.jpg",
    galleryImages: [
          "/project-images/scic-bohol-prdp-groundbreaking.jpg"
    ],
    featured: true,
  },
  {
    id: "scic-loboc-hydro",
    name: "Loboc Mini Hydroelectric Power Plant",
    code: "SCIC-HEPP-09",
    shortName: "Loboc Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "VISAYAS",
    region: "Region VII",
    province: "Bohol",
    municipality: "Loboc",
    coordinates: {
      lat: 9.6417,
      lng: 124.0333,
    },
    metrics: {
      capacity: "1.2 MW",
      contractValue: "₱380 Million",
      safeManHours: "480,000 Safe Hours",
    },
    client: "Sta. Clara Power / Loboc Hydro",
    description:
      "A run-of-river mini hydro installation on the renowned Loboc River in Bohol, combining eco-sensitive architectural design with dependable clean energy production.",
    engineeringScope: [
      "Concrete gravity weir and automated intake screen",
      "Short penstock conduit feeding compact horizontal Francis turbines",
      "Architectural riverside powerhouse blending into tourism corridor",
    ],
    keyMilestones: [{ date: "2012", title: "Plant Commissioning", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2012,
  },
  {
    id: "scic-sr-cebu",
    name: "S&R Membership Shopping Cebu Warehouse",
    code: "SCIC-COM-01",
    shortName: "S&R Cebu Mandaue",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "VISAYAS",
    region: "Region VII",
    province: "Cebu",
    municipality: "Mandaue City",
    barangay: "Subangdaku",
    coordinates: {
      lat: 10.3217,
      lng: 123.9283,
    },
    metrics: {
      contractValue: "₱650 Million",
      safeManHours: "720,000 Safe Hours",
    },
    client: "S&R / Kareila Management Corp.",
    description:
      "Turnkey general construction of the iconic S&R membership retail warehouse in Metro Cebu, featuring post-tensioned super-flat floor slabs and cold storage freezers.",
    engineeringScope: [
      "Pre-engineered structural steel building with clear-span roof trusses",
      "Super-flat commercial warehouse concrete floor slab system",
      "Industrial walk-in refrigeration units and rooftop solar array integration",
    ],
    keyMilestones: [{ date: "2010", title: "Commercial Grand Opening", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2010,
  },

  // ==========================================
  // MINDANAO
  // ==========================================
  {
    id: "scic-manolo-fortich",
    name: "Manolo Fortich 1 & 2 Hydroelectric Power Plants",
    code: "SCIC-HEPP-10",
    shortName: "Manolo Fortich Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "MINDANAO",
    region: "Region X (Northern Mindanao)",
    province: "Bukidnon",
    municipality: "Manolo Fortich",
    coordinates: {
      lat: 8.3667,
      lng: 124.8667,
    },
    metrics: {
      capacity: "68.8 MW (Combined)",
      contractValue: "₱5.8 Billion",
      tunnelLength: "6.0 km headrace tunnel",
      safeManHours: "2,000,000+ Safe Hours",
      generationOutput: "360 GWh / year",
    },
    client: "Hedcor Bukidnon, Inc. / AboitizPower",
    description:
      "A monumental cascading run-of-river hydro development in Mindanao. SCIC served as sole contractor for the massive 6-kilometer headrace tunnel, complex desander basins, and tandem powerhouses (MF1: 43.4 MW, MF2: 25.4 MW), achieving 2 Million Safe Man-Hours without loss-time injuries. Completed December 2018.",
    engineeringScope: [
      "6 km continuous headrace rock tunnel with sequential drill-and-blast excavation",
      "Twin concrete overflow diversion weirs along the Tagoloan River basin",
      "Two distinct powerhouse facilities housing 4x Francis and 4x Pelton generating units",
      "Substation switchyards and 138kV transmission grid interconnect",
    ],
    keyMilestones: [
      { date: "Dec 2018", title: "Full Commercial Operations Handover", status: "ACHIEVED" },
      { date: "2019", title: "2 Million Safe Hours National Award", status: "ACHIEVED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2018,
  },
  {
    id: "scic-maladugao-hydro",
    name: "Maladugao (Upper Cascade) Hydroelectric Power Project",
    code: "SCIC-HEPP-11",
    shortName: "Maladugao Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "MINDANAO",
    region: "Region X",
    province: "Bukidnon",
    municipality: "Kalilangan",
    coordinates: {
      lat: 7.7333,
      lng: 124.75,
    },
    metrics: {
      capacity: "8.4 MW",
      contractValue: "₱1.7 Billion",
      safeManHours: "780,000 Safe Hours",
      workforcePeak: 310,
    },
    client: "Bukidnon Power / Maladugao Hydro Corp.",
    description:
      "A high-efficiency run-of-river cascading hydro plant under active construction in Kalilangan, Bukidnon. Contract signed late 2022; will feed green baseload power directly into the Mindanao transmission grid.",
    engineeringScope: [
      "Reinforced concrete diversion weir and desander basin",
      "Surface penstock and steep slope rock excavation",
      "Reinforced concrete powerhouse machine hall with dual turbine units",
    ],
    keyMilestones: [
      { date: "Oct 2022", title: "EPC Contract Signing", status: "ACHIEVED" },
      { date: "2024", title: "Intake & Weir Substructure Completion", status: "ACHIEVED" },
      { date: "2026", title: "Target Commercial Operation Date", status: "IN_PROGRESS" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "Late 2026",
  },
  {
    id: "scic-siguil-hydro",
    name: "Siguil Hydroelectric Power Plant",
    code: "SCIC-HEPP-12",
    shortName: "Siguil Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "MINDANAO",
    region: "Region XII (SOCCSKSARGEN)",
    province: "Sarangani Province",
    municipality: "Maasim",
    coordinates: {
      lat: 5.8667,
      lng: 124.9667,
    },
    metrics: {
      capacity: "14.5 MW",
      contractValue: "₱2.7 Billion",
      tunnelLength: "1.2 km headrace tunnel",
      safeManHours: "1,750,000 Safe Hours",
    },
    client: "Alsons Power Group / Siguil Hydro Power Corp.",
    description:
      "SCIC was the sole EPC contractor for this 14.5 MW renewable energy facility in Southern Mindanao. Works included complex cliff access roads, intake weir, desander, 1.2-kilometer headrace tunnel, penstock, and a riverside powerhouse.",
    engineeringScope: [
      "River intake structure with automated sediment sluice gates",
      "1.2 km drill-and-blast rock tunnel and high-pressure steel penstock",
      "Powerhouse machine hall, electromechanical turbine erection, and switchyard",
    ],
    keyMilestones: [{ date: "2023", title: "Commercial Grid Synchronization", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2023,
  },
  {
    id: "scic-davao-wtp",
    name: "Davao City Bulk Water Supply Project (WTP)",
    code: "SCIC-WTP-03",
    shortName: "Davao Bulk Water WTP",
    sector: "WATER_DAMS",
    status: "COMPLETED",
    islandGroup: "MINDANAO",
    region: "Region XI (Davao Region)",
    province: "Davao del Sur",
    municipality: "Davao City",
    barangay: "Calinan District",
    coordinates: {
      lat: 7.1833,
      lng: 125.45,
    },
    metrics: {
      capacity: "300 MLD (Mega Facility)",
      contractValue: "₱4.8 Billion (JV Scope)",
      safeManHours: "3,200,000 Safe Hours",
    },
    client: "Apo Agua Infrastructura / J.V. Angeles / DCWD",
    description:
      "One of the most ambitious bulk water supply facilities in Southeast Asia. Powered completely by an integrated hydroelectric plant from the Tamugan River, delivering 300 Million Liters per Day (300 MLD) of treated potable water to over 1 million Davao residents.",
    engineeringScope: [
      "Massive coagulation, flocculation, and lamella clarifier basins",
      "Rapid gravity dual-media filtration gallery with backwash recovery",
      "Twin 50-megaliter post-tensioned treated water storage reservoirs",
    ],
    keyMilestones: [{ date: "2023", title: "Full Commercial Water Supply COD", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    completionYear: 2023,
  },
  {
    id: "scic-apex-mining-maco",
    name: "Apex Mining Maco Underground Infrastructure & TSF Expansion",
    code: "SCIC-MINE-01",
    shortName: "Apex Mining Maco",
    sector: "MINING_TUNNELING",
    status: "ONGOING",
    islandGroup: "MINDANAO",
    region: "Region XI (Davao Region)",
    province: "Davao de Oro",
    municipality: "Maco",
    barangay: "Masara",
    coordinates: {
      lat: 7.3711,
      lng: 126.0461,
    },
    metrics: {
      tunnelLength: "3.4 km underground drifts",
      contractValue: "₱2.10 Billion",
      workforcePeak: 520,
      safeManHours: "1,680,000 Safe Hours",
    },
    client: "Apex Mining Company, Inc.",
    description:
      "Underground haulage and drainage drift tunneling, raise boring, and Tailings Storage Facility (TSF) dam raise at the Maco Gold & Silver Mine in Davao de Oro. SCIC has been sole contractor since 2010, utilizing jumbo drills and mechanized mucking equipment in rugged mountainous geology with highest environmental protection standards. Scope includes 8m dam raise and 2M+ m³ embankment.",
    engineeringScope: [
      "3.4 km Underground Mine Access & Drainage Drift Tunnels",
      "Tailings Storage Facility (TSF) Upstream Dam Raise (Phase 3C)",
      "Mechanized Shotcreting & Rock Bolting Underground Support",
      "Surface Drainage Diversion Canals & Runoff Management",
    ],
    keyMilestones: [
      { date: "2023-Q1", title: "Portal Opening & Drift Development", status: "ACHIEVED" },
      { date: "2025-Q2", title: "TSF Dam Raise Concreting & Buttressing", status: "IN_PROGRESS" },
      { date: "2026-Q4", title: "Deep Drainage Drift Integration", status: "SCHEDULED" },
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
  },
  {
    id: "scic-sr-davao",
    name: "S&R Membership Shopping Davao Warehouse",
    code: "SCIC-COM-02",
    shortName: "S&R Davao Matina",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "MINDANAO",
    region: "Region XI",
    province: "Davao del Sur",
    municipality: "Davao City",
    barangay: "Matina",
    coordinates: {
      lat: 7.0583,
      lng: 125.5833,
    },
    metrics: {
      contractValue: "₱680 Million",
      safeManHours: "810,000 Safe Hours",
    },
    client: "S&R / Kareila Management Corp.",
    description:
      "Construction of Davao City's premier membership warehouse shopping facility along McArthur Highway, featuring clear-span steel portals, modern loading docks, and customer amenities.",
    engineeringScope: [
      "Turnkey structural steel building and wide-span truss erection",
      "Industrial floor slab with chemical hardening and joint sealing",
      "Refrigerated perishables warehouse and multi-bay receiving dock",
    ],
    keyMilestones: [{ date: "2013", title: "Commercial Grand Opening", status: "ACHIEVED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2013,
  },
  {
    id: "scic-mindanao-rail",
    name: "Mindanao Railway Project (MRP Phase 1 Civil Preparation)",
    code: "SCIC-PIPE-03",
    shortName: "Mindanao Railway (Phase 1)",
    sector: "RAILWAYS_TRANSIT",
    status: "UPCOMING",
    islandGroup: "MINDANAO",
    region: "Region XI",
    province: "Davao Region",
    municipality: "Tagum–Davao–Digos (TDD)",
    coordinates: {
      lat: 7.25,
      lng: 125.6,
    },
    metrics: {
      roadLength: "102 km railway corridor",
      contractValue: "Mega Rail Initiative",
    },
    client: "DOTr / Mindanao Development Authority",
    description:
      "The historic first railway system for Mindanao, connecting Tagum, Davao City, and Digos. SCIC's proven railway viaduct and tunneling expertise positions the firm for key civil and bridge packages.",
    engineeringScope: [
      "Embankment civil works and pre-stressed river bridges",
      "Station substructures and maintenance depot civil works",
      "Right-of-way ground improvement across varied terrain",
    ],
    keyMilestones: [{ date: "2026-2027", title: "Civil Works Implementation", status: "SCHEDULED" }],
    imageUrl: "/project-images/scic-project-placeholder.png",
  },
  {
    id: "scic-kalayaan-wind-farm",
    name: "Kalayaan 2 Wind Power Project (100 MW Balance of Plant)",
    code: "SCIC-WIND-02",
    shortName: "Kalayaan 2 Wind Farm",
    sector: "WIND_POWER",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Laguna",
    municipality: "Paete & Kalayaan",
    barangay: "Paete Mountain Ridge",
    coordinates: {
      lat: 14.354,
      lng: 121.505,
    },
    metrics: {
          "capacity": "100 MW (17 Heavy WTGs)",
          "contractValue": "₱6.20 Billion",
          "roadLength": "14 km Mountain Access Roads",
          "workforcePeak": 450,
          "safeManHours": "750,000 Safe Hours"
    },
    client: "Laguna Wind Energy Corp. / The Blue Circle / ACCIONA JV",
    description:
      "A high-capacity mountain ridgeline wind development along the rugged crests of Paete and Kalayaan overlooking Laguna de Bay. SCIC and ACCIONA are constructing the comprehensive Civil Balance of Plant (CBOP) and Electrical Balance of Plant (EBOP), including 17 heavy wind turbine gravity foundations, specialized subsoil ground improvement, mountain haul roads (KLY2-AR), and the 115kV/230kV Paete Main Substation.",
    engineeringScope: [
          "17 Reinforced concrete wind turbine generator (WTG) gravity spread foundations",
          "Specialized subsoil ground improvement (vibro-replacement stone columns and soil stabilization)",
          "14 km heavy-haul mountain ridge transport roads and crane hardstand platforms (KLY2-AR)",
          "Electrical Balance of Plant (EBOP): 33kV subterranean collector network and 115kV/230kV Paete Substation",
          "Mountain slope stabilization, drainage gullies, and environmental erosion control structures"
    ],
    keyMilestones: [
          {
                "date": "2024-Q1",
                "title": "Site Mobilization & Paete Logistics Yard Setup",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q2",
                "title": "Foundation Excavation & Subsoil Stabilization",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2026-Q4",
                "title": "Turbine Erection & 230kV Grid Energization",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    galleryImages: [
      "/project-images/scic-project-placeholder.png",
    ],
    featured: true,
    targetCodDate: "Q4 2026",
  },
  {
    id: "scic-quezon-north-wind",
    name: "Quezon North Wind Power Project - Isla Wind (335 MW)",
    code: "SCIC-WIND-03",
    shortName: "Quezon North Wind",
    sector: "WIND_POWER",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Quezon",
    municipality: "Real, Infanta & General Nakar",
    coordinates: {
      lat: 14.6833,
      lng: 121.6167,
    },
    metrics: {
          "capacity": "335 MW (Multi-Cluster Wind Farm)",
          "contractValue": "₱14.80 Billion",
          "roadLength": "32 km Heavy Access Corridors",
          "workforcePeak": 620,
          "safeManHours": "920,000 Safe Hours"
    },
    client: "Isla Wind Energy Corp. / ACEN",
    description:
      "A flagship mega renewable development spanning the northern ridges of the Sierra Madre in Quezon province. Divided into North (ISLA-N), Middle (ISLA-M), and South (ISLA-S) sectors, SCIC is executing civil site works, steep mountain access corridors, heavy crane erection pads, and substation foundations across challenging tropical rainforest terrain.",
    engineeringScope: [
          "Heavy civil earthworks across Isla North (ISLA-N), Middle (ISLA-M), and South (ISLA-S) sectors",
          "32 km all-weather heavy-haul transport corridors for 70-meter turbine blade convoys",
          "High-bearing capacity crane hardstand pads and assembly laydown zones on mountain ridges",
          "Substation structural foundations and high-voltage grid interconnection corridors"
    ],
    keyMilestones: [
          {
                "date": "2024-Q3",
                "title": "Access Road Right-of-Way & Environmental Compliance",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q3",
                "title": "Sierra Madre Ridge Earthworks & Hardstand Preparation",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2027",
                "title": "Full Commercial Grid Interconnection",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "CY 2027",
  },
  {
    id: "scic-eastbay-wtp",
    name: "East Bay Phase 2 Water Treatment Plant (200 MLD)",
    code: "SCIC-WTP-04",
    shortName: "East Bay WTP",
    sector: "WATER_DAMS",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region IV-A (CALABARZON)",
    province: "Laguna",
    municipality: "Pakil",
    barangay: "Kabulusan",
    coordinates: {
      lat: 14.3985,
      lng: 121.488,
    },
    metrics: {
          "capacity": "200 MLD Potable Water Output",
          "contractValue": "₱4.50 Billion",
          "workforcePeak": 520,
          "safeManHours": "1,150,000 Safe Hours"
    },
    client: "Manila Water Company, Inc. (ACCIONA – PrimeBMD – SCIC Consortium)",
    description:
      "A strategic water security lifeline plant tapping the eastern bay of Laguna de Bay in Pakil, Laguna. SCIC as part of the EPC consortium is constructing an advanced multi-barrier treatment facility featuring dissolved air flotation (DAF), multi-media filtration, ultrafiltration membranes, reverse osmosis, and clearwater storage reservoirs supplying clean potable water to over 2 million residents across Rizal and eastern Metro Manila.",
    engineeringScope: [
          "Offshore/shoreline raw water intake structure and low-lift pumping station",
          "Dissolved Air Flotation (DAF) clarifying basins and chemical coagulation-flocculation systems",
          "High-flux ultrafiltration membrane filtration and automated backwash facility",
          "Reverse Osmosis (RO) brackish desalination treatment units for dry-season salinity control",
          "50,000 cu.m reinforced concrete treated water reservoir and high-head distribution pumps"
    ],
    keyMilestones: [
          {
                "date": "2023-Q4",
                "title": "Consortium EPC Award & Groundbreaking",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q1",
                "title": "Civil Foundations & Intake Basin Construction",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2026-Q4",
                "title": "Full Commercial Commissioning & Potable Water Delivery",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "December 2026",
  },
  {
    id: "scic-pasig-city-hall",
    name: "New Pasig City Hall Complex Redevelopment Project",
    code: "SCIC-CIVIC-01",
    shortName: "New Pasig City Hall",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "NCR (Metro Manila)",
    province: "Metro Manila",
    municipality: "Pasig City",
    barangay: "San Nicolas",
    coordinates: {
      lat: 14.5583,
      lng: 121.0827,
    },
    metrics: {
          "contractValue": "₱9.26 Billion",
          "workforcePeak": 750,
          "safeManHours": "850,000 Safe Hours"
    },
    client: "City Government of Pasig / Pasig City Hall Construction Consortium (PCHCC)",
    description:
      "A generational civic redevelopment replacing the aged municipal hall with a resilient, seismically isolated urban civic center. SCIC leads the Pasig City Hall Construction Consortium (PCHCC) constructing three interconnected towers equipped with elastomeric base seismic isolators, civic plaza parklands, subterranean multi-level parking, emergency disaster coordination hub, and integrated government service offices.",
    engineeringScope: [
          "Three interconnected institutional towers (up to 8 stories) with high-performance curtain walls",
          "Lead-rubber elastomeric seismic base isolator system for catastrophic earthquake resilience",
          "Extensive diaphragm deep foundation retaining walls and multi-level subterranean basement parking",
          "Centralized Command and Control Disaster Operations Center (C4i) and smart building automation",
          "Public civic park, rainwater harvesting retention cisterns, and solar rooftop installations"
    ],
    keyMilestones: [
          {
                "date": "2024-Q3",
                "title": "Official Groundbreaking & Phased Demolition",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q2",
                "title": "Diaphragm Wall Piling & Substructure Excavation",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2027-Q4",
                "title": "Target Complex Handover & Inauguration",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "Late 2027",
  },
  {
    id: "scic-hann-reserve",
    name: "Hann Reserve Mixed-Use Resort & Housing Complex",
    code: "SCIC-RESORT-01",
    shortName: "Hann Reserve NCC",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Tarlac",
    municipality: "Capas",
    barangay: "New Clark City",
    coordinates: {
      lat: 15.345,
      lng: 120.485,
    },
    metrics: {
          "contractValue": "₱3.20 Billion (Phase 1 Package)",
          "workforcePeak": 480,
          "safeManHours": "620,000 Safe Hours"
    },
    client: "Bases Conversion and Development Authority (BCDA) / Hann Philippines Inc.",
    description:
      "A 6-hectare masterplanned development enclave within New Clark City supporting the 450-hectare Hann Reserve ultra-luxury integrated mountain resort. SCIC, in consortium with Saekyung Realty Corp. and the Korea Overseas Infrastructure and Urban Development Corp. (KIND), is executing site grading, staff and executive housing complexes, arterial access roads, and comprehensive wet and dry utility networks.",
    engineeringScope: [
          "6-hectare site grading, heavy cut-and-fill slope formation, and retaining wall systems",
          "Multi-building residential village and modern staff accommodations for resort operations",
          "Underground power distribution, telecommunication ductbanks, and street lighting",
          "Potable water distribution lines, sewage collection, and modern drainage infrastructure"
    ],
    keyMilestones: [
          {
                "date": "2024-Q2",
                "title": "BCDA Partnership Signing & Site Turnover",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q1",
                "title": "Civil Grading & Substructure Construction",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2026-Q4",
                "title": "Phase 1 Housing Handover & Civil Handover",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    targetCodDate: "Q4 2026",
  },
  {
    id: "scic-ups-clark-hub",
    name: "UPS Express Air Cargo Services Hub Expansion",
    code: "SCIC-LOG-UPS",
    shortName: "UPS Clark Hub",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "ONGOING",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Pampanga",
    municipality: "Clark Freeport Zone (Mabalacat)",
    coordinates: {
      lat: 15.1858,
      lng: 120.5597,
    },
    metrics: {
          "contractValue": "₱2.10 Billion",
          "workforcePeak": 380,
          "safeManHours": "580,000 Safe Hours"
    },
    client: "United Parcel Service (UPS) / Luzon International Premiere Airport Development Corp. (LIPAD)",
    description:
      "A world-class international air cargo sorting and logistics facility situated within the Clark Civil Aviation Complex at Clark International Airport. SCIC is delivering the heavy-duty industrial structural package featuring super-flat reinforced concrete floor slabs, automated parcel conveyor mezzanines, aircraft airside tarmac interface gates, cold-chain temperature vaults, and customs clearance staging.",
    engineeringScope: [
          "High-clearance pre-engineered steel warehouse superstructure with wide column spacing",
          "Heavy-duty laser-guided super-flat concrete industrial floor slabs designed for automated robotics",
          "Airside aircraft parking apron interface, security boundary perimeter, and customs inspection gates",
          "Integrated cold-storage pharmaceutical rooms and high-capacity electrical backup substations"
    ],
    keyMilestones: [
          {
                "date": "2024-Q1",
                "title": "Airport Land Lease & Civil Mobilization",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q2",
                "title": "Warehouse Steel Erection & Super-Flat Slabs",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2026-Q3",
                "title": "Automated Sortation Testing & Operations Launch",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    targetCodDate: "Q3 2026",
  },
  {
    id: "scic-san-simon-rolling-mill",
    name: "Steel Rolling Mill Industrial Complex & Specialized Facilities",
    code: "SCIC-IND-ROLLING-MILL",
    shortName: "San Simon Rolling Mill",
    sector: "BUILDINGS_INDUSTRIAL",
    status: "COMPLETED",
    islandGroup: "LUZON",
    region: "Region III (Central Luzon)",
    province: "Pampanga",
    municipality: "San Simon",
    barangay: "Quezon Road Industrial Corridor",
    coordinates: {
      lat: 14.9922,
      lng: 120.7831,
    },
    metrics: {
          "contractValue": "₱3.85 Billion",
          "workforcePeak": 550,
          "safeManHours": "1,600,000 Safe Hours"
    },
    client: "SteelAsia Manufacturing Corp. / Industrial Sector",
    description:
      "A premier heavy industrial steel processing facility along the Quezon Road industrial corridor in San Simon, Pampanga. SCIC executed the specialized heavy civil, structural, and electro-mechanical packages including the Medium Section Mill bay foundations, Electrical Control Rooms (ECR 1 & ECR 2), industrial closed-loop Water Treatment Plant (Rolling Mill WTP), and the heavy reinforced concrete Scale Pit for continuous casting and rolling operations.",
    engineeringScope: [
          "Rolling Mill Medium Section: Heavy reinforced concrete foundation blocks for rolling stands and runout tables",
          "Electrical Control Rooms (ECR 1 & ECR 2): Blast-resistant, dust-sealed, and climate-controlled switchgear rooms",
          "Industrial Process Water Treatment Plant (Rolling Mill WTP) with cooling towers and sedimentation clarifiers",
          "Deep reinforced concrete Scale Pit with heavy abrasion-resistant linings for continuous scale flushing",
          "SCIC central fabrication and staging yard supporting regional equipment deployment"
    ],
    keyMilestones: [
          {
                "date": "2022",
                "title": "Heavy Machine Foundation Block Completion",
                "status": "ACHIEVED"
          },
          {
                "date": "2023",
                "title": "ECR 1 & 2 Substation Energization",
                "status": "ACHIEVED"
          },
          {
                "date": "2024",
                "title": "WTP Process Testing & Commercial Handover",
                "status": "ACHIEVED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2024,
  },
  {
    id: "scic-hibale-dam",
    name: "Hibale Small Reservoir Irrigation Project (SRIP)",
    code: "SCIC-DAM-03",
    shortName: "Hibale Irrigation Dam",
    sector: "WATER_DAMS",
    status: "ONGOING",
    islandGroup: "VISAYAS",
    region: "Region VII (Central Visayas)",
    province: "Bohol",
    municipality: "Danao",
    barangay: "Hibale",
    coordinates: {
      lat: 9.95,
      lng: 124.2,
    },
    metrics: {
          "capacity": "4.5M cu.m Water Storage • 400+ ha Irrigation",
          "contractValue": "₱970 Million",
          "workforcePeak": 320,
          "safeManHours": "480,000 Safe Hours"
    },
    client: "National Irrigation Administration (NIA)",
    description:
      "A vital agricultural water security dam project undertaken by the National Irrigation Administration (NIA) in upland Bohol. SCIC is constructing a zoned earthfill reservoir storage dam, reinforced concrete chute spillway, outlet works, and primary irrigation canal networks to irrigate over 400 hectares of rice paddies and high-value crops, transforming agricultural productivity in the municipality of Danao.",
    engineeringScope: [
          "Zoned earthfill embankment dam across the local catchment with impervious clay core",
          "Reinforced concrete overflow spillway with energy dissipating stilling basin",
          "Submerged intake conduit and multi-level outlet works with hydraulic gate controls",
          "12 km trapezoidal concrete-lined main and secondary irrigation distribution canals"
    ],
    keyMilestones: [
          {
                "date": "2025-07",
                "title": "Official Groundbreaking in Danao, Bohol",
                "status": "ACHIEVED"
          },
          {
                "date": "2026-Q2",
                "title": "River Diversion & Dam Embankment Fill",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2028",
                "title": "Target Reservoir Impounding & Irrigation Handover",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    targetCodDate: "CY 2028",
  },
  {
    id: "scic-cabulig-hydro",
    name: "Cabulig Hydroelectric Power Plant (8 MW)",
    code: "SCIC-HEPP-13",
    shortName: "Cabulig Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "COMPLETED",
    islandGroup: "MINDANAO",
    region: "Region X (Northern Mindanao)",
    province: "Misamis Oriental",
    municipality: "Claveria",
    coordinates: {
      lat: 8.6167,
      lng: 124.8833,
    },
    metrics: {
          "capacity": "8.0 MW (38m Concrete Dam)",
          "contractValue": "₱1.80 Billion",
          "generationOutput": "48 GWh / year",
          "safeManHours": "1,400,000 Safe Hours"
    },
    client: "Cabulig Hydro Electric Power Corp. / Claveria LGU",
    description:
      "A flagship run-of-river clean power generation facility in Claveria, Misamis Oriental, where SCIC served as the sole general contractor. Features a 38-meter high concrete gravity dam across the Cabulig River, intake tower, low-loss headrace tunnel, cylindrical surge tank, high-pressure surface penstock, and an overground powerhouse with two 4 MW Francis turbines. Commissioned in December 2012.",
    engineeringScope: [
          "38-meter high concrete gravity dam with gated crest spillway across Cabulig River",
          "Low-loss underground headrace tunnel excavated through mixed volcanic rock geology",
          "Steel-lined surge tank structure and high-pressure surface penstock conduit",
          "Powerhouse civil installation housing 2x 4.0 MW horizontal Francis turbine generator sets",
          "69kV step-up substation and transmission line connection to CEPALCO grid"
    ],
    keyMilestones: [
          {
                "date": "2009",
                "title": "Project Commencement & River Diversion",
                "status": "ACHIEVED"
          },
          {
                "date": "2011",
                "title": "38-meter Dam Embankment & Headrace Breakthrough",
                "status": "ACHIEVED"
          },
          {
                "date": "2012-12",
                "title": "Commercial Commissioning & COD Energization",
                "status": "ACHIEVED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    completionYear: 2012,
  },
  {
    id: "scic-mangima-hydro",
    name: "Mangima Hydroelectric Power Plant (12 MW)",
    code: "SCIC-HEPP-14",
    shortName: "Mangima Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "MINDANAO",
    region: "Region X (Northern Mindanao)",
    province: "Bukidnon",
    municipality: "Manolo Fortich",
    barangay: "Dahilayan / Tankulan",
    coordinates: {
      lat: 8.3667,
      lng: 124.8667,
    },
    metrics: {
          "capacity": "12.0 MW",
          "contractValue": "₱2.40 Billion",
          "generationOutput": "64 GWh / year",
          "workforcePeak": 420,
          "safeManHours": "950,000 Safe Hours"
    },
    client: "Philnew River Power Corporation (PRPC) / SCIC Affiliate",
    description:
      "A high-head run-of-river hydroelectric development harnessing the pristine waters of the Mangima River in Manolo Fortich, Bukidnon. Designed by EDCOP and built by SCIC as EPC contractor, the project features a low-environmental-impact diversion weir, automated sand settling desander, 3.2 km high-pressure penstock, and an advanced powerhouse equipped with multi-jet Pelton turbines feeding clean energy to the Mindanao grid.",
    engineeringScope: [
          "Reinforced concrete overflow diversion weir and automated trash rack intake structure",
          "Two-chamber desander settling basin with continuous sediment scouring sluiceway",
          "3.2 km high-pressure surface and buried steel penstock conduit on concrete saddle blocks",
          "Multi-jet Pelton turbine powerhouse equipped with brushless synchronous generators",
          "69kV switchyard with SF6 circuit breakers feeding the local electric cooperative grid"
    ],
    keyMilestones: [
          {
                "date": "2023-Q2",
                "title": "Access Roads & Intake Weir Excavation",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q1",
                "title": "Penstock Line Assembly & Powerhouse Civil Works",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2026-Q4",
                "title": "Commercial Grid Synchronization & COD",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    featured: true,
    targetCodDate: "Q4 2026",
  },
  {
    id: "scic-malitbog-siloo-hydro",
    name: "Malitbog-Siloo Mini Hydroelectric Power Project (7.4 MW)",
    code: "SCIC-HEPP-15",
    shortName: "Malitbog-Siloo Hydro",
    sector: "HYDRO_RENEWABLE",
    status: "ONGOING",
    islandGroup: "MINDANAO",
    region: "Region X (Northern Mindanao)",
    province: "Bukidnon",
    municipality: "Malitbog",
    barangay: "Siloo",
    coordinates: {
      lat: 8.5333,
      lng: 124.9,
    },
    metrics: {
          "capacity": "7.4 MW",
          "contractValue": "₱1.65 Billion",
          "workforcePeak": 350,
          "safeManHours": "620,000 Safe Hours"
    },
    client: "Philnew Hydro Power Corp. (PHPC) / Northern Mindanao Renewables",
    description:
      "A run-of-river mini hydroelectric installation in the mountainous hinterlands of Siloo, Malitbog, Bukidnon. SCIC is actively deploying heavy equipment and skilled civil tunneling crews to construct the diversion weir, mountain water conduit channel, surge chamber, steel penstock, and semi-underground powerhouse to supply localized clean green power.",
    engineeringScope: [
          "Concrete diversion intake weir across the Siloo River with fish passage and sand flushes",
          "Subterranean conveyance conduit channel and mountain slope stabilization",
          "Reinforced concrete surge chamber and high-strength surface steel penstock",
          "Semi-underground powerhouse civil works and electro-mechanical installation",
          "Dedicated 34.5kV distribution tie-line linking to the regional power distribution grid"
    ],
    keyMilestones: [
          {
                "date": "2024-Q1",
                "title": "Camp Construction & Heavy Equipment Deployment",
                "status": "ACHIEVED"
          },
          {
                "date": "2025-Q2",
                "title": "Weir Foundation Grouting & Conduit Trenching",
                "status": "IN_PROGRESS"
          },
          {
                "date": "2027",
                "title": "Commercial Operations & Power Generation",
                "status": "SCHEDULED"
          }
    ],
    imageUrl: "/project-images/scic-project-placeholder.png",
    targetCodDate: "CY 2027",
  },
];

export interface NationalKPIs {
  totalProjects: number;
  totalOngoing: number;
  totalRenewableCapacityMw: number;
  totalTunnelLengthKm: number;
  totalWaterCapacityMld: number;
}

export function computeNationalKPIs(projects: SCICProject[]): NationalKPIs {
  let totalProjects = projects.length;
  let totalOngoing = 0;
  let totalRenewableCapacityMw = 0;
  let totalTunnelLengthKm = 0;
  let totalWaterCapacityMld = 0;

  for (const p of projects) {
    if (p.status === "ONGOING") {
      totalOngoing++;
    }

    // Renewable capacity parsing (MW)
    const cat = String(p.sector || "").toUpperCase();
    const isRenewable =
      cat === "HYDRO_RENEWABLE" ||
      cat === "HYDROPOWER" ||
      cat === "WIND_POWER" ||
      cat === "SOLAR_POWER" ||
      cat === "GEOTHERMAL" ||
      cat.includes("HYDRO") ||
      cat.includes("WIND") ||
      cat.includes("SOLAR") ||
      cat.includes("RENEWABLE");

    if (isRenewable && p.metrics?.capacity) {
      const match = String(p.metrics.capacity).match(/([\d,.]+)\s*MW/i);
      if (match) {
        totalRenewableCapacityMw += parseFloat(match[1].replace(/,/g, ""));
      }
    }

    // Tunnel length parsing (km)
    if (p.metrics.tunnelLength) {
      const match = p.metrics.tunnelLength.match(/([\d,.]+)\s*km/i);
      if (match) {
        totalTunnelLengthKm += parseFloat(match[1].replace(/,/g, ""));
      }
    }

    // Water capacity parsing (MLD)
    if (p.metrics.capacity) {
      const match = p.metrics.capacity.match(/([\d,.]+)\s*MLD/i);
      if (match) {
        totalWaterCapacityMld += parseFloat(match[1].replace(/,/g, ""));
      }
    }
  }

  return {
    totalProjects,
    totalOngoing,
    totalRenewableCapacityMw: Math.round(totalRenewableCapacityMw * 10) / 10,
    totalTunnelLengthKm: Math.round(totalTunnelLengthKm * 10) / 10,
    totalWaterCapacityMld: Math.round(totalWaterCapacityMld),
  };
}
