/**
 * Adds Sta. Clara projects that were missing from the Project Atlas map (2026-10-03).
 *
 *   npx tsx --env-file=.env scripts/add-verified-atlas-projects.ts          # dry run: prints what it would do
 *   npx tsx --env-file=.env scripts/add-verified-atlas-projects.ts --apply  # writes the database and the JSON copy
 *
 * Every record below was checked against Sta. Clara's own website on 2026-10-03:
 *   completed works   https://staclara.com.ph/what-we-do/completed/<sector>/
 *   ongoing works     https://staclara.com.ph/what-we-do/ongoing/<sector>/
 * Only what those pages state is recorded (name, size, place, client, role, scope, completion
 * date). Contract values, man-hours, workforce and progress figures are NOT on those pages and are
 * left empty: nothing here is estimated.
 *
 * Status: the company's "ongoing" pages are older than some of the projects. Where the facility
 * is publicly known to be operating, the project is recorded as COMPLETED and the description
 * says so, with the source.
 *
 * Location: `precise: true` means the coordinates are the facility itself as mapped in
 * OpenStreetMap (power plant, treatment plant or building of that name). Otherwise the marker is
 * at the barangay, town or start point the company page names, and the record says so.
 *
 * It also files the five wind farms already on the map under WIND_POWER (they were under
 * HYDROPOWER, which made "21 hydropower projects" count wind farms).
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const ORG = "scic-org-001";
const SITE = "https://staclara.com.ph/what-we-do";

interface NewProject {
  slug: string;
  code: string;
  name: string;
  category: string;
  status: "COMPLETED" | "ONGOING";
  lat: number;
  lng: number;
  precise: boolean;
  /** what the marker is on, when it is not the facility itself */
  placedAt?: string;
  island: "LUZON" | "VISAYAS" | "MINDANAO";
  region: string;
  province: string;
  municipality: string;
  barangay?: string;
  capacity?: string;
  capacityMw?: number;
  client: string;
  role?: string;
  completed?: string; // YYYY-MM
  scope: string[];
  note?: string; // status note
  source: string;
}

const R = {
  ncr: "NCR (Metro Manila)",
  r2: "Region II (Cagayan Valley)",
  r3: "Region III (Central Luzon)",
  r4a: "Region IV-A (CALABARZON)",
  r4b: "MIMAROPA (Region IV-B)",
  r6: "Region VI (Western Visayas)",
  r7: "Region VII (Central Visayas)",
  r10: "Region X (Northern Mindanao)",
  r11: "Region XI (Davao Region)",
  r13: "Region XIII (Caraga)",
  car: "Cordillera Administrative Region (CAR)",
};

const PROJECTS: NewProject[] = [
  // ── Hydro ──
  {
    slug: "lake-mainit-hepp", code: "SCIC-HEPP-16", name: "Lake Mainit Hydroelectric Power Plant (25 MW)", category: "HYDROPOWER", status: "COMPLETED",
    lat: 9.34923, lng: 125.48517, precise: true, island: "MINDANAO", region: R.r13, province: "Agusan del Norte", municipality: "Jabonga",
    capacity: "25 MW", capacityMw: 25, client: "Agusan Power Corporation",
    scope: ["Tunnel by drill and blast", "Rock bolting, wire mesh and shotcrete", "Steel rib support, spiling rods with lagging", "Concrete tunnel lining", "Surface works"],
    note: "Sta. Clara's website still lists this under ongoing works; the plant itself has been in commercial operation since March 2023 (J-POWER announcement, July 2023).",
    source: `${SITE}/ongoing/mining-and-tunnelling-works/`,
  },
  {
    slug: "bubunawan-hepp-rehab", code: "SCIC-HEPP-17", name: "Bubunawan Hydroelectric Power Plant Rehabilitation (7 MW)", category: "HYDROPOWER", status: "COMPLETED",
    lat: 8.37427, lng: 124.66148, precise: false, placedAt: "the Bubunawan River at Liboran, Baungon (the plant itself is not mapped)",
    island: "MINDANAO", region: R.r10, province: "Bukidnon", municipality: "Baungon",
    capacity: "7 MW", capacityMw: 7, client: "Bubunawan Power Company, Inc.", role: "Sole Contractor", completed: "2013-10",
    scope: ["Powerhouse", "River channel and spillway", "Penstock (2.6 m diameter x 240 m)", "Access road (378 m) with slope protection and concrete retaining wall"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  {
    slug: "irisan-1-hepp", code: "SCIC-HEPP-18", name: "Irisan 1 Hydroelectric Power Plant", category: "HYDROPOWER", status: "COMPLETED",
    lat: 16.41792, lng: 120.56091, precise: false, placedAt: "the Irisan area (the company page gives only \"Benguet Province\"; the plant itself is not mapped)",
    island: "LUZON", region: R.car, province: "Benguet", municipality: "Benguet Province (Irisan area)",
    client: "Hedcor, Inc.", role: "Sole Contractor", completed: "2012-01",
    scope: ["Weir intake", "Headrace culvert", "Desander", "Penstock", "Powerhouse", "Tailrace channel"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  // ── Wind ──
  {
    slug: "puerto-galera-wind", code: "SCIC-WIND-04", name: "Puerto Galera Wind Energy Power Project (16 MW)", category: "WIND_POWER", status: "COMPLETED",
    lat: 13.46727, lng: 120.92105, precise: true, island: "LUZON", region: R.r4b, province: "Oriental Mindoro", municipality: "Puerto Galera",
    capacity: "16 MW", capacityMw: 16, client: "Philippine Hybrid Energy Systems, Inc. (PHESI)", role: "Sole Contractor", completed: "2018-09",
    scope: ["Earthworks", "Foundations for 8 wind turbines", "Equipment laydown pads and hardstands", "Access roads", "Drainage and landscaping works"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  {
    slug: "pililla-wind-farm", code: "SCIC-WIND-05", name: "Pililla Wind Farm (54 MW Balance of Plant)", category: "WIND_POWER", status: "COMPLETED",
    lat: 14.47208, lng: 121.34999, precise: true, island: "LUZON", region: R.r4a, province: "Rizal", municipality: "Pililla",
    capacity: "54 MW", capacityMw: 54, client: "Gamesa Eolica S.L. Unipersonal - Phils (owner: Alternergy Philippine Holdings Corp.)", role: "Sole Contractor", completed: "2015-08",
    scope: ["Balance of plant", "Access roads", "Foundations for 27 wind turbines", "Earthworks", "Installation of anchor bolts for 27 wind turbine generators"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  {
    slug: "san-lorenzo-wind-farm", code: "SCIC-WIND-06", name: "San Lorenzo Wind Farm, Guimaras (54 MW Balance of Plant)", category: "WIND_POWER", status: "COMPLETED",
    lat: 10.5901, lng: 122.69301, precise: true, island: "VISAYAS", region: R.r6, province: "Guimaras", municipality: "San Lorenzo",
    capacity: "54 MW", capacityMw: 54, client: "Trans-Asia Renewable Energy Corp. and Kanematsu Corporation", role: "Sole Contractor", completed: "2015-01",
    scope: ["Balance of plant", "Access roads", "Foundations for 27 wind turbines", "Earthworks", "Installation of anchor bolts for 27 wind turbine generators"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  // ── Solar ──
  {
    slug: "toledo-solar", code: "SCIC-SOLAR-01", name: "Toledo Solar Power Plant (60 MW)", category: "SOLAR_POWER", status: "COMPLETED",
    lat: 10.41564, lng: 123.67835, precise: true, island: "VISAYAS", region: R.r7, province: "Cebu", municipality: "Toledo City",
    capacity: "60 MW", capacityMw: 60, client: "Citicore Power, Inc.", role: "Sole Contractor", completed: "2016-02",
    scope: ["Design and build of the balance of plant", "Site development design and build (73.81 hectares)", "Drainage system works", "Installation, electrical, cabling and termination of solar modules"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  {
    slug: "morong-solar-pv", code: "SCIC-SOLAR-02", name: "Morong Solar Photovoltaic Plant (5 MW)", category: "SOLAR_POWER", status: "COMPLETED",
    lat: 14.69145, lng: 120.2666, precise: true, island: "LUZON", region: R.r3, province: "Bataan", municipality: "Morong",
    capacity: "5,012 kW (about 5 MW)", capacityMw: 5.012, client: "Solar Powered Agri-rural Communities Corp.", role: "Sole Contractor", completed: "2016-03",
    scope: ["Site development design and build", "Drainage system works", "Installation, electrical, cabling and termination of solar modules"],
    source: `${SITE}/completed/renewable-energy-power-plants/`,
  },
  // ── Thermal power, transmission, site development for power ──
  {
    slug: "balingasag-thermal", code: "SCIC-PWR-03", name: "Balingasag Thermal Power Plant (3 x 55 MW)", category: "ENERGY_GRID", status: "COMPLETED",
    lat: 8.76606, lng: 124.7676, precise: true, island: "MINDANAO", region: R.r10, province: "Misamis Oriental", municipality: "Balingasag",
    capacity: "3 x 55 MW", capacityMw: 165, client: "Mitsubishi Corporation", role: "Sole Contractor", completed: "2017-04",
    scope: ["Site development and access roads", "Foundations", "Sheet piling and concrete piling works", "Building construction", "Electrical works", "Structural steel works"],
    source: `${SITE}/completed/energy-power-plants-transmission-lines-and-substations/`,
  },
  {
    slug: "coron-bunker-power-plant", code: "SCIC-PWR-04", name: "Coron Bunker-Fired Power Plant (7.5 MW)", category: "ENERGY_GRID", status: "COMPLETED",
    lat: 11.99855, lng: 120.20516, precise: false, placedAt: "Coron town (the plant itself is not mapped)",
    island: "LUZON", region: R.r4b, province: "Palawan", municipality: "Coron",
    capacity: "7.5 MW (heavy fuel oil)", capacityMw: 7.5, client: "Calamian Islands Power Corporation (CIPC)", role: "Contractor", completed: "2014-08",
    scope: ["Site development, access roads and perimeter fence", "Powerhouse and administration building", "Storage tank for diesel and bunker fuel", "Piping works"],
    source: `${SITE}/completed/energy-power-plants-transmission-lines-and-substations/`,
  },
  {
    slug: "tuguegarao-lallo-230kv", code: "SCIC-GRID-03", name: "Tuguegarao - Lal-lo (Magapit) 230 kV Transmission Line", category: "ENERGY_GRID", status: "ONGOING",
    lat: 17.61189, lng: 121.73004, precise: false, placedAt: "Tuguegarao City, the southern end of the 65 km line",
    island: "LUZON", region: R.r2, province: "Cagayan", municipality: "Tuguegarao City",
    capacity: "230 kV, 65 km", client: "National Grid Corporation of the Philippines (NGCP)", role: "Joint venture member (Sta. Clara - AER Joint Venture)",
    scope: ["Concrete foundations (166 units)", "Tower erection (166 towers)", "Stringing of conductors"],
    note: "NGCP had not yet energised the line as of September 2026 (Philippine Star, 18 September 2026).",
    source: `${SITE}/ongoing/energy-power-plants-transmission-lines-and-substations/`,
  },
  {
    slug: "ilijan-lng-site-development", code: "SCIC-PWR-05", name: "Ilijan Combined Cycle Power Plant - LNG Area Site Development", category: "ENERGY_GRID", status: "COMPLETED",
    lat: 13.62263, lng: 121.0786, precise: true, placedAt: "the Ilijan power plant complex, beside which the LNG terminal stands",
    island: "LUZON", region: R.r4a, province: "Batangas", municipality: "Batangas City", barangay: "Ilijan and Dela Paz",
    capacity: "15-hectare LNG terminal area", client: "D & L Industries, Inc.", role: "Subcontractor for EPC, with Atlantic Gulf & Pacific Company of Manila Inc.",
    scope: ["Design, engineering and construction of site development for the LNG terminal area (15 hectares)"],
    note: "Sta. Clara's website still lists this under ongoing works; the LNG terminal began commissioning in April 2023.",
    source: `${SITE}/ongoing/site-development-works/`,
  },
  {
    slug: "project-epic-bauan", code: "SCIC-IND-04", name: "Project EPIC (AG&P Bauan)", category: "INDUSTRIAL", status: "ONGOING",
    lat: 13.79209, lng: 120.98585, precise: false, placedAt: "Barangay San Roque, Bauan (the yard itself is not mapped)",
    island: "LUZON", region: R.r4a, province: "Batangas", municipality: "Bauan", barangay: "San Roque",
    client: "AG&P / D & L Industries Inc.", role: "Civil works",
    scope: ["Site development for building works", "Two-storey office, laboratory and warehouse (1,066 sqm)", "Utilities building (324 sqm)", "TTLR (794 sqm)", "Control room and MCC (72 sqm)"],
    note: "Listed under ongoing works on Sta. Clara's website; no completion has been published.",
    source: `${SITE}/ongoing/site-development-works/`,
  },
  {
    slug: "batangas-ccpp-site-development", code: "SCIC-PWR-06", name: "Batangas Combined Cycle Power Plant Site Development", category: "ENERGY_GRID", status: "COMPLETED",
    lat: 13.62667, lng: 121.08278, precise: true, island: "LUZON", region: R.r4a, province: "Batangas", municipality: "Batangas City", barangay: "Dela Paz",
    client: "Black & Veatch Singapore Pte. Ltd.", role: "Subcontractor",
    scope: ["Excavation, earth fill and compaction", "Slope protection", "Roadworks", "Perimeter fence and guard houses", "Drainage system", "Perimeter lighting system"],
    note: "Sta. Clara's website still lists this under ongoing works; the power plant has been operating since 2025.",
    source: `${SITE}/ongoing/site-development-works/`,
  },
  // ── Water and wastewater ──
  {
    slug: "rizal-province-water-supply", code: "SCIC-WTP-05", name: "Rizal Province Water Supply Improvement Project (Phases 1 and 2)", category: "WATER_RESOURCES", status: "COMPLETED",
    lat: 14.49517, lng: 121.2197, precise: true, placedAt: "the Cardona Water Treatment Plant",
    island: "LUZON", region: R.r4a, province: "Rizal", municipality: "Cardona",
    client: "Manila Water Company, Inc.", role: "Consortium member", completed: "2019-04",
    scope: ["Raw water intake and pump station", "Raw water pipeline", "Water treatment plant with waste treatment", "Treated water reservoir", "Optimization facility", "Treated water pipeline, effluent pipeline and outfall"],
    source: `${SITE}/completed/water-and-wastewater-systems/`,
  },
  {
    slug: "marikina-north-stp", code: "SCIC-STP-01", name: "Marikina North Sewage Treatment Plant (100 MLD)", category: "WATER_RESOURCES", status: "COMPLETED",
    lat: 14.66703, lng: 121.1004, precise: true, island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Marikina City", barangay: "Nangka",
    capacity: "100 MLD", client: "Manila Water Company, Inc. (MWCI)", role: "Consortium member", completed: "2017-08",
    scope: ["Site development", "Structural and building works", "Drainage", "Concrete grouting in the foundation"],
    source: `${SITE}/completed/water-and-wastewater-systems/`,
  },
  {
    slug: "marikina-north-pumping-station", code: "SCIC-STP-02", name: "Marikina North Terminal Pumping Station", category: "WATER_RESOURCES", status: "COMPLETED",
    lat: 14.6676, lng: 121.1012, precise: false, placedAt: "Barangay Nangka, beside the Marikina North Sewage Treatment Plant (the station is not mapped separately)",
    island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Marikina City", barangay: "Nangka",
    client: "Manila Water Company, Inc. (MWCI)", role: "Sole Contractor", completed: "2015-05",
    scope: ["Sub-catchment sewer system", "Sewer lines", "Lift stations", "Terminal pumping station"],
    source: `${SITE}/completed/water-and-wastewater-systems/`,
  },
  {
    slug: "bahay-toro-stp", code: "SCIC-STP-03", name: "Bahay Toro Sewage Treatment Plant", category: "WATER_RESOURCES", status: "COMPLETED",
    lat: 14.6645, lng: 121.02145, precise: false, placedAt: "Barangay Bahay Toro (the plant on Ferna Road is not mapped)",
    island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Quezon City", barangay: "Bahay Toro",
    capacity: "13,400 cubic metres a day (average dry-weather flow)", client: "Maynilad Water Services, Inc. (MWSI)", role: "Sole Contractor", completed: "2016-10",
    scope: ["Sewage treatment plant with 13,400 cubic metres a day average dry-weather flow capacity"],
    source: `${SITE}/completed/water-and-wastewater-systems/`,
  },
  {
    slug: "valenzuela-stp", code: "SCIC-STP-04", name: "Valenzuela Sewage Treatment Plant (60 MLD)", category: "WATER_RESOURCES", status: "COMPLETED",
    lat: 14.67618, lng: 120.97468, precise: true, placedAt: "the Valenzuela Water Reclamation Facility",
    island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Valenzuela City",
    capacity: "60 MLD", client: "VA Tech Wabag (Philippines) Inc. (for Maynilad Water Services, Inc.)", role: "Subcontractor for civil works",
    scope: ["Site development", "Structural and building works", "Drainage", "Concrete grouting in the foundation"],
    note: "Sta. Clara's website still lists this under ongoing works; Maynilad began operating the plant in February 2024.",
    source: `${SITE}/ongoing/water-and-wastewater-systems/`,
  },
  {
    slug: "valenzuela-sewerage-interceptor", code: "SCIC-STP-05", name: "Combined Sewerage Interceptor System for Valenzuela STP", category: "WATER_RESOURCES", status: "ONGOING",
    lat: 14.69169, lng: 120.96945, precise: false, placedAt: "Valenzuela City (the pipe network runs across the city)",
    island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Valenzuela City",
    client: "Maynilad Water Services, Inc. (MWSI)", role: "Contractor",
    scope: ["Sewerage pipelines", "Pump stations", "Trenchless pipelaying of 900 mm and 1,200 mm reinforced concrete jacking pipe", "Waterline system with uPVC pipe"],
    note: "Listed under ongoing works on Sta. Clara's website; no completion has been published.",
    source: `${SITE}/ongoing/water-and-wastewater-systems/`,
  },
  // ── Bridges and trenchless works ──
  {
    slug: "urgent-bridges-package-3", code: "SCIC-BRG-01", name: "Urgent Bridges Construction Project for Rural Development (Package III)", category: "BRIDGES", status: "COMPLETED",
    lat: 14.24538, lng: 121.507, precise: false, placedAt: "Cavinti, Laguna, one of the six bridge sites (the others are in Laguna and Batangas)",
    island: "LUZON", region: R.r4a, province: "Laguna and Batangas", municipality: "Cavinti (and five other sites)",
    capacity: "Six two-lane bridges", client: "TOYO Construction Co., Ltd.", role: "General Contractor", completed: "2008-01",
    scope: ["Six two-lane reinforced concrete deck girder bridges: Catmon, Cavinti, Lipa, Mabacao, Pajo and Payapa", "Approach slabs", "Slope protection", "Drainage systems"],
    note: "The company page gives the completion year (2008) without a month.",
    source: `${SITE}/completed/roads-bridges-and-railways/`,
  },
  {
    slug: "meralco-hdd-pnr-north-1-batch-1", code: "SCIC-HDD-01", name: "Meralco HDD Relocation Works for PNR North 1 (Batch 1)", category: "MINING_TUNNELING", status: "ONGOING",
    lat: 14.69169, lng: 120.9701, precise: false, placedAt: "Valenzuela City, the southern end of the Valenzuela to Guiguinto stretch",
    island: "LUZON", region: "NCR / Region III", province: "Metro Manila and Bulacan", municipality: "Valenzuela City to Guiguinto",
    capacity: "12 crossings", client: "Manila Electric Company (MERALCO)", role: "Sole Contractor",
    scope: ["EPC of underground civil works for the relocation of facilities affected by the DOTr PNR North 1 project", "Horizontal directional drilling for Meralco lines crossing the North-South Commuter Railway", "12 crossings"],
    note: "Listed under ongoing works on Sta. Clara's website; no completion has been published.",
    source: `${SITE}/ongoing/hdd-projects/`,
  },
  {
    slug: "meralco-hdd-pnr-north-1-batch-2", code: "SCIC-HDD-02", name: "Meralco HDD Relocation Works for PNR North 1 (Batch 2)", category: "MINING_TUNNELING", status: "ONGOING",
    lat: 14.64319, lng: 120.98239, precise: false, placedAt: "4th Avenue, Caloocan, the southern end of the Caloocan to Malolos stretch",
    island: "LUZON", region: "NCR / Region III", province: "Metro Manila and Bulacan", municipality: "Caloocan City to Malolos",
    capacity: "29 sites", client: "Manila Electric Company (MERALCO)",
    scope: ["EPC of underground civil works using horizontal directional drilling", "Relocation of underground distribution facilities along the PNR crossing", "29 sites, from 4th Avenue, Caloocan to Paseo del Congreso Street, Malolos"],
    note: "Listed under ongoing works on Sta. Clara's website; no completion has been published.",
    source: `${SITE}/ongoing/hdd-projects/`,
  },
  // ── Buildings ──
  {
    slug: "monde-nissin-megamall-sta-rosa", code: "SCIC-IND-05", name: "Monde Nissin Megamall Project (Office and Warehouse)", category: "BUILDINGS", status: "COMPLETED",
    lat: 14.29305, lng: 121.10013, precise: false, placedAt: "the Monde Nissin plant in Balibago, Santa Rosa (the building itself is not mapped)",
    island: "LUZON", region: R.r4a, province: "Laguna", municipality: "Santa Rosa City",
    client: "Monde Nissin Corporation", role: "CSAP Contractor", completed: "2016-01",
    scope: ["Five-storey office building with multi-floor warehouse", "Automated storage and retrieval system", "Distribution centre"],
    source: `${SITE}/completed/buildings/`,
  },
  {
    slug: "monde-nissin-pomelo-davao", code: "SCIC-IND-06", name: "Monde Nissin Pomelo Project (Manufacturing Plant)", category: "BUILDINGS", status: "COMPLETED",
    lat: 7.06483, lng: 125.60806, precise: false, placedAt: "Davao City (the company page gives only the city; the plant itself is not mapped)",
    island: "MINDANAO", region: R.r11, province: "Davao del Sur", municipality: "Davao City",
    client: "Monde Nissin Corporation", role: "CSAP and Electrical Contractor", completed: "2012-12",
    scope: ["Manufacturing plant", "Office", "Warehouse facility"],
    source: `${SITE}/completed/buildings/`,
  },
  {
    slug: "sr-shaw", code: "SCIC-COM-03", name: "S&R Membership Shopping Shaw Boulevard", category: "BUILDINGS", status: "COMPLETED",
    lat: 14.58738, lng: 121.04477, precise: true, island: "LUZON", region: R.ncr, province: "Metro Manila", municipality: "Mandaluyong City",
    client: "Kareila Management Corporation", role: "Sole Contractor", completed: "2013-10",
    scope: ["Building establishment", "Parking areas"],
    note: "One of four S&R facilities on the company's page (Shaw Boulevard, Davao City, San Fernando and Mandaue City), listed together with a single completion date.",
    source: `${SITE}/completed/buildings/`,
  },
  {
    slug: "sr-pampanga", code: "SCIC-COM-04", name: "S&R Membership Shopping San Fernando, Pampanga", category: "BUILDINGS", status: "COMPLETED",
    lat: 15.04757, lng: 120.69052, precise: true, island: "LUZON", region: R.r3, province: "Pampanga", municipality: "City of San Fernando",
    client: "Kareila Management Corporation", role: "Sole Contractor", completed: "2013-10",
    scope: ["Building establishment", "Parking areas"],
    note: "One of four S&R facilities on the company's page (Shaw Boulevard, Davao City, San Fernando and Mandaue City), listed together with a single completion date.",
    source: `${SITE}/completed/buildings/`,
  },
  // ── Added later the same day (on the company's pages, not on the user's first list) ──
  // (the slug "tipo-expressway" is taken by an older record that is in fact a second copy of the
  //  SFEX expansion for NLEX; this is the original expressway, built for Samsung)
  {
    slug: "subic-tipo-expressway", code: "SCIC-HWY-04", name: "Tipo Expressway (Subic-Tipo Expressway, 8.5 km)", category: "ROADS_HIGHWAYS", status: "COMPLETED",
    lat: 14.82397, lng: 120.31897, precise: true, placedAt: "the expressway itself, as mapped in OpenStreetMap under the name Subic-Tipo Expressway (a point along the road, between Olongapo and the Tipo toll plaza)",
    island: "LUZON", region: R.r3, province: "Zambales and Bataan", municipality: "Olongapo City to Hermosa",
    capacity: "8.5 km, 7.30 m wide", client: "Samsung Construction Co. Philippines Inc.",
    scope: ["Construction of 8.5 km of 7.30 m wide expressway, the main gateway to Subic Bay Freeport", "A bridge", "A tunnel", "Border fencing"],
    note: "The company lists this under completed works and gives neither a completion date nor Sta. Clara's role.",
    source: `${SITE}/completed/roads-bridges-and-railways/`,
  },
  {
    slug: "masinloc-bess-10mw", code: "SCIC-BESS-02", name: "Masinloc Battery Energy Storage System (10 MW)", category: "ENERGY_GRID", status: "COMPLETED",
    lat: 15.56753, lng: 119.92408, precise: false, placedAt: "the Masinloc Power Plant complex in Barangay Bani (the company page gives only \"Masinloc, Zambales\"; the battery yard itself is not mapped separately)",
    island: "LUZON", region: R.r3, province: "Zambales", municipality: "Masinloc",
    capacity: "10 MW", capacityMw: 10, client: "Masinloc Power Partners Co. Ltd. / AES Philippines", completed: "2016-11",
    scope: ["Balance of plant", "Battery storage core"],
    note: "The company page does not state Sta. Clara's role. This is the first, 10 MW system; the later 20 MW expansion is a separate record.",
    source: `${SITE}/completed/energy-power-plants-transmission-lines-and-substations/`,
  },
];

/** Wind farms already on the map, filed under HYDROPOWER until now */
const WIND_SLUGS_NAME = /\bwind\b/i;

function describe(p: NewProject): string {
  const parts: string[] = [];
  const done = p.completed ? new Date(`${p.completed}-01T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : null;
  parts.push(
    `${p.role ? `${p.role} to` : "Works for"} ${p.client}${p.status === "COMPLETED" && done && !p.slug.startsWith("urgent-bridges") ? `, completed ${done}` : p.slug.startsWith("urgent-bridges") ? ", completed 2008" : ""}.`
  );
  parts[0] = parts[0].replace(/\.\.$/, "."); // a client name ending in "Inc."
  parts.push(`Scope: ${p.scope.join("; ")}.`);
  if (p.note) parts.push(p.note);
  parts.push(p.precise && !p.placedAt ? "Map position: the facility as mapped in OpenStreetMap." : `Map position: ${p.precise ? "" : "approximate, at "}${p.placedAt}.`);
  parts.push(`Source: Sta. Clara International Corporation website (${p.source}), checked 3 October 2026.`);
  return parts.join(" ");
}

async function main() {
  const existing = await prisma.project.findMany({ select: { id: true, slug: true, name: true, category: true, projectCode: true } });
  const bySlug = new Map(existing.map((e) => [e.slug, e]));
  const codes = new Set(existing.map((e) => e.projectCode));
  console.log(`${existing.length} projects in the database`);

  const toCreate = PROJECTS.filter((p) => !bySlug.has(p.slug));
  for (const p of PROJECTS) {
    if (bySlug.has(p.slug)) console.log(`  exists   ${p.slug}`);
    else if (codes.has(p.code)) throw new Error(`project code already used: ${p.code}`);
  }
  const wind = existing.filter((e) => WIND_SLUGS_NAME.test(e.name) && e.category !== "WIND_POWER");
  console.log(`to add: ${toCreate.length}; wind farms to refile under WIND_POWER: ${wind.map((w) => w.slug).join(", ") || "none"}`);
  for (const p of toCreate) console.log(`  + ${p.code.padEnd(14)} ${p.category.padEnd(16)} ${p.status.padEnd(9)} ${p.lat.toFixed(4)},${p.lng.toFixed(4)} ${p.precise ? "exact " : "approx"} ${p.name}`);

  if (!APPLY) {
    console.log("\ndry run: nothing written. Re-run with --apply.");
    return;
  }

  for (const p of toCreate) {
    const place = [p.barangay, p.municipality, p.province].filter(Boolean).join(", ");
    await prisma.project.create({
      data: {
        organizationId: ORG,
        name: p.name,
        slug: p.slug,
        projectCode: p.code,
        category: p.category,
        status: p.status,
        description: describe(p),
        latitude: p.lat,
        longitude: p.lng,
        islandGroup: p.island,
        region: p.region,
        province: p.province,
        municipality: p.municipality,
        barangay: p.barangay ?? null,
        locationDescription: `${p.name} - ${place} (${p.region})${p.precise && !p.placedAt ? "" : `. Marker ${p.precise ? "" : "approximate: "}${p.placedAt}`}`,
        location: place,
        capacity: p.capacity ?? null,
        capacityMw: p.capacityMw ?? null,
        client: p.client,
        projectEndDate: p.status === "COMPLETED" && p.completed ? new Date(`${p.completed}-01T00:00:00Z`) : null,
        engineeringScope: p.scope,
        keyMilestones:
          p.status === "COMPLETED" && p.completed
            ? [{ date: p.completed, title: "Completed (per the company's project list)", status: "ACHIEVED" }]
            : [],
        metrics: p.capacity ? { capacity: p.capacity } : {},
        featured: false,
      },
    });
  }
  if (wind.length) await prisma.project.updateMany({ where: { id: { in: wind.map((w) => w.id) } }, data: { category: "WIND_POWER" } });

  // the JSON copy the map starts from (same shape as the rows, no relations)
  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<{ id: string }>;
  const keys = Object.keys(before[0]);
  const rows = all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null])));
  fs.writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
  console.log(`\nwritten: ${toCreate.length} added, ${wind.length} refiled; JSON copy now has ${rows.length} projects (was ${before.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
