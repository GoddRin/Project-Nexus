/**
 * Rewrites the older Atlas descriptions from published sources (2026-10-05). Dry run by default.
 *
 *   npx tsx --env-file=.env scripts/rewrite-atlas-descriptions.ts [--apply]
 *
 * The 43 records written before the verification pass carried promotional wording and figures
 * found on no published page ("300,000 daily commuters", "17 heavy WTGs", "75 loading docks").
 * Each is rewritten here from what the source actually says, and nothing more:
 *   - 32 from Sta. Clara's own "What we do" project lists (completed and ongoing, by sector);
 *   - 9 from a company news post, a client's press release or the designer's project page
 *     (the same sources that gave the client names in scripts/verify-atlas-clients.ts);
 *   - 1 (the Bataan-Cavite bridge) is flagged unconfirmed: only a bid is reported, no award.
 * Tumauini is left as it is: it is the user's own project.
 *
 * Capacity labels lose their unverified additions; where the company's figure differs from the
 * record, the company's figure is used and the difference is stated in the text.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const CHECKED = "checked 5 October 2026";
const done = (page: string) => `Source: Sta. Clara International Corporation, completed projects list (${page}), ${CHECKED}.`;
const ongoing = (page: string) => `Source: Sta. Clara International Corporation, ongoing projects list (${page}), ${CHECKED}.`;
const NO_VALUE = "The company does not publish the contract value.";

interface Rewrite {
  description: string;
  scope: string[];
  capacity?: string | null; // null clears it
  name?: string;
  status?: "COMPLETED" | "ONGOING";
}

const R: Record<string, Rewrite> = {
  // ── Completed: renewable energy ──
  "bakun-hydro": {
    capacity: "70 MW",
    description: `Civil and tunnel works for the 70 MW Bakun AC hydroelectric power plant on the Ilocos Sur - Benguet boundary, where Sta. Clara was subcontractor to Transfield Philippines, Inc. Completed April 2000. The work covered excavation and permanent support of the 10.5 km tunnel (3.4 m diameter), twin desander chambers with a transition tunnel, a 1.5 km underground penstock (2.1 m diameter), grouting and the switchyard. ${NO_VALUE} ${done("Mining and Tunnelling Works")}`,
    scope: ["Tunnel excavation, 3.4 m diameter x 10.5 km, with shotcrete, rock bolts, steel ribs and concrete lining", "Twin desander chambers and transition tunnel", "Underground penstock, 2.1 m diameter x 1.5 km", "Consolidation and contact grouting", "Switchyard"],
  },
  "botocan-hydro": {
    capacity: "2 x 10 MW",
    description: `Works at the 2 x 10 MW Botocan hydroelectric power plant in Majayjay, Laguna, for the CBK Hydro Power Consortium. Completed August 2004. The company lists the dam, the reservoir, rehabilitation and improvement of the 1.18 km headrace tunnel, and the powerhouse. ${NO_VALUE} ${done("Renewable Energy Power Plants")}`,
    scope: ["Dam and reservoir", "Rehabilitation and improvement of the headrace tunnel (1.18 km)", "Powerhouse"],
  },
  "cabulig-hydro": {
    capacity: "8 MW",
    description: `The 8 MW Cabulig hydroelectric power plant in Claveria, Misamis Oriental, built for Mindanao Energy Systems, Inc. Completed December 2012. The company lists a 38 m high concrete gravity dam (94,000 cubic metres) with foundation grouting, the dam intake, a 6 km reinforced-concrete box culvert headrace (3 m x 3 m), silting basin, forebay and surge pool, powerhouse, tailrace, substation and outlet channel. ${NO_VALUE} ${done("Renewable Energy Power Plants")}`,
    scope: ["Concrete gravity dam, 38 m high, with consolidation grouting", "Dam intake (38 m depth)", "Headrace: 3 m x 3 m box culvert, 6 km", "Silting basin, forebay and surge pool", "Powerhouse, tailrace, substation and outlet channel"],
  },
  "caliraya-hydro": {
    capacity: "4 x 8 MW",
    description: `Civil works at the 4 x 8 MW Caliraya hydroelectric power plant in Laguna, where Sta. Clara was subcontractor for civil works to the CBK Hydro Power Consortium. Completed August 2004. The company lists work on the upstream and downstream dam faces, rehabilitation of the Lumot-Caliraya waterway, a new open gated spillway (ogee crest at elevation 284.46 m, designed for more than 500 cubic metres per second) and rehabilitation of the existing tunnel. ${NO_VALUE} ${done("Renewable Energy Power Plants")}`,
    scope: ["Upstream and downstream dam face works", "Rehabilitation of the Lumot-Caliraya waterway", "New open gated spillway (ogee crest at elevation 284.46 m)", "Rehabilitation and improvement of the existing tunnel"],
  },
  "catuiran-hydro": {
    capacity: "8 MW",
    description: `Engineering, procurement and construction of the 8 MW Catuiran hydroelectric power plant in Naujan, Oriental Mindoro, for Catuiran Hydro Power Corp. Completed December 2018. The company lists an access road and bailey bridge, the intake dam, an underground twin-chamber desander, a 3.2 km headrace tunnel (3.2 m diameter), a surge shaft, a 160 m penstock, the powerhouse with tailrace, the switchyard and a 19 km, 69 kV transmission line. ${NO_VALUE} ${done("Renewable Energy Power Plants")}`,
    scope: ["Access road and bailey bridge", "Intake dam and underground twin-chamber desander", "Headrace tunnel, 3.2 m diameter x 3.2 km", "Surge shaft (5 m diameter x 25 m) and penstock (2.7 m diameter x 160 m)", "Powerhouse with tailrace, switchyard", "69 kV transmission line, 19 km"],
  },
  "kalayaan-hydro": {
    capacity: "2 x 150 MW",
    description: `Civil and underground penstock works at the 2 x 150 MW Kalayaan hydroelectric power plant in Kalayaan, Laguna, where Sta. Clara was subcontractor to the CBK Hydro Power Consortium. Completed August 2004. The company lists new access and service roads, upper penstock earthworks, the sub-horizontal penstock, an inclined shaft (9 m diameter x 154 m), an access tunnel (5 m diameter x 120 m), a twin penstock gallery, a bifurcation cavern and concrete backfill of the penstock along the inclined shaft. ${NO_VALUE} ${done("Renewable Energy Power Plants")}`,
    scope: ["New access roads and service roads", "Upper penstock earthworks and sub-horizontal penstock", "Inclined shaft excavation, 9 m diameter x 154 m", "Access tunnel, 5 m diameter x 120 m", "Twin penstock gallery and bifurcation cavern"],
  },
  "loboc-hydro": {
    capacity: "1.2 MW",
    description: `The 1.2 MW Loboc mini hydroelectric power plant in Loboc, Bohol, built for Sta. Clara Power Corporation. The company lists an access road and temporary bridge, a 260 m penstock (2.1 m diameter), the intake structure, an inflatable dam, the powerhouse, slope protection, fencing and landscaping. The company does not publish the completion date or the contract value. ${done("Renewable Energy Power Plants")}`,
    scope: ["Access road and temporary bridge", "Penstock, 2.1 m diameter x 260 m", "Intake structure and inflatable dam", "Powerhouse", "Slope protection, fencing and landscaping"],
  },
  "manolo-fortich": {
    capacity: "68.8 MW",
    description: `The Manolo Fortich hydroelectric power plant in Manolo Fortich, Bukidnon, built for Hedcor Bukidnon, Inc. (Aboitiz Power Corporation). Completed December 2018. The company lists the weir, a 700 m concrete box culvert, the desander, a 6 km headrace tunnel (4 m diameter, drill and blast), a surge tank (13 m diameter x 24 m), a 440 m penstock, the powerhouse, the switchyard and an 8 km access road with river crossings. The company's page does not state the plant's capacity; 68.8 MW is the figure already on this record. ${NO_VALUE} ${done("Renewable Energy Power Plants; Mining and Tunnelling Works")}`,
    scope: ["Weir and concrete box culvert (3 m x 3 m x 700 m)", "Desander", "Headrace tunnel, 4 m diameter x 6 km (drill and blast)", "Surge tank and penstock (2.17 m diameter x 440 m)", "Powerhouse and switchyard", "Access road (8 km) and river crossing structures"],
  },
  "sabangan-hydro": {
    capacity: "14 MW",
    description: `The 14 MW Sabangan hydroelectric power plant in Sabangan, Mountain Province, built for Hedcor Sabangan, Inc. (Aboitiz Power Corporation). Completed May 2015. The company lists 12 km of access roads, slope protection, the powerhouse and switchyard, the weir intake, the desander, a 700 m underground penstock (1.5 m diameter) and a 3.1 km headrace tunnel (3 m diameter, 7.8% gradient, drill and blast). ${NO_VALUE} ${done("Renewable Energy Power Plants; Mining and Tunnelling Works")}`,
    scope: ["Access roads (12 km) and slope protection", "Weir intake structure and desander", "Headrace tunnel, 3 m diameter x 3.1 km", "Underground penstock, 1.5 m diameter x 700 m", "Powerhouse and switchyard"],
  },

  // ── Completed: energy, site development ──
  "mariveles-500kv": {
    capacity: "500 kV",
    description: `Erection and construction of the Mariveles - Balsik (Hermosa) 500 kV extra-high-voltage transmission line in Bataan for the National Grid Corporation of the Philippines. Completed April 2022. The company lists the main civil works and installation of conductors: 136 concrete foundations, 136 double-circuit steel towers and stringing over a 51 km span. ${NO_VALUE} ${done("Energy")} Tower count and span are from the company's ongoing projects list.`,
    scope: ["Steel tower foundations (pad and chimney; bored pile with tie beam), 136 units", "Erection of 136 double-circuit steel towers", "Stringing and installation of conductors, 51 km span"],
  },
  "sta-rita-ccpp": {
    capacity: "1,000 MW",
    description: `Site development for the 1,000 MW Sta. Rita combined cycle power station in Batangas, for First Philippine Balfour Beatty Inc. Completed November 1999. The company lists site development of a 35-hectare area: clearing, levelling, drainage, roads and sheet piling for wall structures. The megawatt figure is the plant's rating, not a measure of Sta. Clara's share of the work. ${NO_VALUE} ${done("Site Development Works")}`,
    scope: ["Site development, 35 hectares", "Clearing, levelling and drainage", "Roads", "Sheet piling for wall structures"],
  },
  "pagbilao-unit3": {
    capacity: "375 MW",
    description: `Hill removal and site development for the coal-fired Pagbilao Unit 3 project in Pagbilao, Quezon, a civil works contract for Team Energy Corporation. Completed October 2014. The company lists site development, hill removal, excavation for the proposed Unit 3 and landfill of the existing raw water lagoon, over 77,580 square metres with 422,633 cubic metres excavated. The company lists the project as 375 MW; other public sources give Unit 3 as 420 MW. ${NO_VALUE} ${done("Site Development Works")}`,
    scope: ["Hill removal and site development (77,580 sq m)", "Excavation for the proposed Unit 3 (422,633 cubic metres in total)", "Landfill of the existing raw water lagoon"],
  },

  // ── Completed: buildings ──
  "monde-nissin": {
    description: `Project Alviera in Porac, Pampanga, built for Monde Nissin Corporation. Completed July 2019. The company lists 4,000 square metres of site development and a 9,000 square metre building. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Site development, 4,000 sq m", "Building, 9,000 sq m"],
  },
  "jti-flex": {
    description: `The JTI Flex project in Malvar, Batangas, built for JTI International Manufacturing Corporation. Completed September 2018. The company lists the main factory building, roads and connection pipes. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Main factory building", "Roads", "Connection pipes"],
  },
  "subic-flour-mill": {
    name: "Subic Bay Flour Mill (MP1284)",
    description: `The Subic Bay flour mill in the Subic Bay Freeport Zone, Zambales, built for Mabuhay Interflour Mill Inc. Completed February 2017. The company lists the mill building and storage silos. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Mill building", "Storage silos"],
  },
  "sr-cebu": {
    description: `The S&R Membership Shopping facility in Mandaue City, Cebu, one of four S&R stores (Shaw, Davao, Pampanga and Cebu) the company built for Kareila Management Corporation. Completed October 2013. The company lists the building and its parking areas. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Store building", "Parking areas"],
  },
  "sr-davao": {
    description: `The S&R Membership Shopping facility in Davao City, one of four S&R stores (Shaw, Davao, Pampanga and Cebu) the company built for Kareila Management Corporation. Completed October 2013. The company lists the building and its parking areas. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Store building", "Parking areas"],
  },
  "hq-mandaluyong": {
    name: "Highway 54 Plaza",
    description: `Highway 54 Plaza, a four-storey building on EDSA in Mandaluyong City, built for BC Manila. Completed August 2006. ${NO_VALUE} ${done("Buildings")}`,
    scope: ["Four-storey building"],
  },

  // ── Completed: flood control, mining, roads ──
  "laoag-bongo": {
    description: `River improvement under the Laoag River Basin Flood Control and Sabo Project in Ilocos Norte, where Sta. Clara was subcontractor to TOYO Construction Co., Ltd. Completed June 2007. The company lists the Laoag-Bongo and alluvial fan river improvement: preparatory works, earth dike works, sluiceway and spur dike works. ${NO_VALUE} ${done("Flood Control and Dams")}`,
    scope: ["Preparatory works", "Earth dike works", "Sluiceway works", "Spur dike works"],
  },
  "apex-mining-maco": {
    name: "Maco Tailings Management Facility Phase 3B (Apex Mining)",
    status: "COMPLETED",
    description: `A five-metre raise of the tailings dam (elevation 650 m to 655 m, Phase 3B) at the Maco Tailings Management Facility in Maco, Davao de Oro, for Apex Mining Company, Inc. Completed January 2019. The company says it has worked for Apex Mining at Maco since 2010; the later raise is recorded separately as Phase 3C. ${NO_VALUE} ${done("Mining and Tunnelling Works")}`,
    scope: ["Tailings dam raise, 5.0 m (elevation 650.00 to 655.00, Phase 3B)"],
  },
  "sctex-pkg1": {
    description: `Package 1 of the Subic-Clark-Tarlac Expressway at Dinalupihan, Bataan, built for Obayashi Corporation. Completed 2007. The company lists an embankment of 1.2 million cubic metres of lahar for an 8 km section with base course and cement-treated base, eight reinforced-concrete deck girder bridges, two underpasses, box and pipe culverts, drainage structures, slope protection and a four-lane asphalt pavement. ${NO_VALUE} ${done("Roads, Bridges and Railways")}`,
    scope: ["Embankment, 1.2 million cubic metres of lahar over an 8 km section", "Base course and cement-treated base; four-lane asphalt pavement", "Eight reinforced-concrete deck girder bridges and two underpasses", "Culverts, drainage structures and slope protection"],
  },

  // ── Ongoing lists ──
  "maco-tmf": {
    description: `Phase 3C of the Maco Tailings Management Facility in Maco, Davao de Oro, for Apex Mining Company, Inc.: an eight-metre dam raise from elevation 655 m to 663 m. The company says the combined rockfill and earthfill embankment (Phase 1 to Phase 3C) totals more than 2 million cubic metres, 106 m high, with a crest 300 m long and 34 m wide. ${NO_VALUE} ${ongoing("Mining and Tunnelling Works")}`,
    scope: ["Dam raise, 8.0 m (elevation 655.00 to 663.00)", "Rockfill and earthfill embankment"],
  },
  "kiangan-mini-hydro": {
    name: "Kiangan Mini Hydro Project (17.8 MW)",
    capacity: "17.8 MW",
    description: `Construction of the 17.8 MW Kiangan mini hydro project in Barangays Munggayang, Bokiawan and Dalligan, Kiangan, Ifugao, for Kiangan Mini Hydro Corporation. The company lists works on the Ibulao, Asin and Hungduan schemes: weirs, open channels, desanders, headrace conduits (3,798 m, 2,300 m and 3,575 m), forebays, penstocks, spillways, powerhouses, stilling basins, substations and bridges. ${NO_VALUE} ${ongoing("Renewable Energy Power Plants")}`,
    scope: ["Weirs, open channels and desanders (Asin and Hungduan)", "Headrace conduits: 3,798 m (Ibulao), 2,300 m (Asin), 3,575 m (Hungduan)", "Forebays, penstocks (2,300 mm diameter) and spillways", "Powerhouses, stilling basins and substations", "Bridges"],
  },
  "siguil-hydro": {
    capacity: "14.5 MW",
    description: `Engineering, procurement and construction of the 14.5 MW Siguil hydro power plant in Maasim, Sarangani, for Siguil Hydro Power Corporation. The company lists access roads, the weir, the desander, a 2.1 m diameter headrace (16 km basic section, 4 km of pipe bridges and a 1.2 km tunnel), the forebay, a 1.2 km penstock, the powerhouse, the substation, electrical and mechanical works, and testing and commissioning. The company still shows it on its ongoing list and gives no completion date. ${NO_VALUE} ${ongoing("Renewable Energy Power Plants")}`,
    scope: ["Access roads, weir and desander", "Headrace, 2.1 m diameter: 16 km basic section, 4 km pipe bridges, 1.2 km tunnel", "Forebay and penstock (1.8 m diameter x 1.2 km)", "Powerhouse and substation", "Electrical and mechanical works, testing and commissioning"],
  },
  "marilao-substation": {
    name: "Marilao EHV Substation",
    capacity: "EHV substation",
    description: `The Marilao extra-high-voltage substation at La Loma de Gato, Marilao, Bulacan, for the National Grid Corporation of the Philippines. The company lists electrical, protection, control and communication, civil, architectural and mechanical works, and a transmission line. The company shows it on its ongoing list and gives no completion date. ${NO_VALUE} ${ongoing("Energy")}`,
    scope: ["Electrical, protection, control and communication works", "Civil and architectural works", "Mechanical works", "Transmission line"],
  },
  "masinloc-bess": {
    name: "Masinloc 20 MW Battery Energy Storage System Expansion",
    capacity: "20 MW",
    description: `The 20 MW battery energy storage system expansion at the Masinloc power plant (Barangay Bani, Masinloc, Zambales), for Fluence Energy, Inc. The company's scope is to design, engineer, procure, permit, fabricate, construct, deliver, install, integrate, commission, start up and test the balance of plant and complete the works for the battery system. The earlier 10 MW system is recorded separately. The company shows the expansion on its ongoing list and gives no completion date. ${NO_VALUE} ${ongoing("Energy")}`,
    scope: ["Balance of plant: design, engineering, procurement and construction", "Installation, integration, commissioning, start-up and testing", "Completion of works for the battery energy storage system"],
  },
  "slex-tr4": {
    name: "SLEX Toll Road 4 (TR4)",
    description: `The South Luzon Expressway Toll Road 4 project, from San Pablo, Laguna to Lucena, Quezon, for South Luzon Tollway Corporation. The company lists earthworks, sub-base and base course, surface courses, a bridge, drainage and slope protection structures, miscellaneous structures, electrical works, an interchange pass and a toll plaza. The company does not say which sections it is building. ${NO_VALUE} ${ongoing("Roads, Bridges and Railways")}`,
    scope: ["Earthworks, sub-base, base and surface courses", "Bridge", "Drainage and slope protection structures", "Electrical works", "Interchange pass and toll plaza"],
  },
  "upper-wawa-roads": {
    name: "Upper Wawa Dam Access Roads Improvement Works",
    description: `Improvement works for the Upper Wawa Dam access roads in San Mateo and Rodriguez (Montalban), Rizal, as road general contractor for Wawa Joint Venture Corp., Inc. The company lists temporary access roads to the dam structure (1,762 m and 1,784 m), a permanent access road to the quarry (2,850 m), earthworks, drainage structures, slope protection and concrete pavements, 6,396 m in total. The company shows it on its ongoing list and gives no completion date. ${NO_VALUE} ${ongoing("Roads, Bridges and Railways")}`,
    scope: ["Temporary access roads to the dam structure (1,762 m and 1,784 m)", "Permanent access road to the quarry (2,850 m)", "Earthworks and drainage structures", "Slope protection and concrete pavements"],
  },
  "lrt1-cavite": {
    name: "LRT-1 Cavite Extension Railway Viaduct",
    description: `Railway viaduct works on the LRT-1 Cavite Extension, for Bouygues Travaux Publics Philippines, Inc. The company gives the location as Cavite and the component as the railway viaduct; it does not publish the length, the stations served or the contract value. ${ongoing("Roads, Bridges and Railways")}`,
    scope: ["Railway viaduct"],
  },
  "nscr-cp02": {
    description: `Package CP02 of the North-South Commuter Railway, from Bocaue to Malolos, Bulacan, for Sumitomo Mitsui Construction Co. Ltd. The company lists elevated structures and three stations: bored piling and foundations, substructure works and building works, including demolition. ${NO_VALUE} ${ongoing("Roads, Bridges and Railways")}`,
    scope: ["Bored piling and foundations", "Substructure works for the elevated structures", "Building works for three stations", "Demolition works"],
  },
  "magdiwang-reservoir": {
    capacity: "40 ML",
    description: `Seismic resiliency enhancement of the 40 ML Magdiwang reservoir on Marcos Alvarez Extension, Bacoor City, Cavite, for Maynilad Water Services, Inc. The company lists a seismic evaluation and analysis to the latest code requirements, the detailed engineering drawings and the structural strengthening works. The company shows it on its ongoing list and gives no completion date. ${NO_VALUE} ${ongoing("Water and Wastewater Systems")}`,
    scope: ["Seismic evaluation and analysis", "Detailed engineering drawings", "Structural strengthening works"],
  },
  "maersk-calamba": {
    description: `Main building works for the Maersk - LF Logistics South Luzon facility in Calamba, Laguna, which the company lists as "Solid LF Main Building Works", as general contractor for Precos, Inc. The company lists civil, structural, architectural, mechanical, electrical, fire protection, plumbing and sanitary works. The company shows it on its ongoing list and does not publish the floor area, the completion date or the contract value. Source: Sta. Clara International Corporation, ongoing projects list (Buildings) and news post on the Maersk - LF Logistics South Luzon facility (December 2022), ${CHECKED}.`,
    scope: ["Civil and structural works", "Architectural works", "Mechanical, electrical and fire protection works", "Plumbing and sanitary works"],
  },

  // ── From a news post, a client's press release or the designer's page ──
  "davao-wtp": {
    capacity: "300 MLD",
    description: `Works on the Davao City Bulk Water Supply Project for Apo Agua Infrastructura, Inc. A Sta. Clara news post of December 2022 reports that Apo Agua tapped the company for the project. The post is the only source used here: the company's project lists do not describe its scope, completion date or contract value, so none is given. 300 MLD is the project's published capacity. Source: Sta. Clara International Corporation news post on the Davao City Bulk Water Supply Project (December 2022), ${CHECKED}.`,
    scope: [],
  },
  "eastbay-wtp": {
    capacity: "200 MLD",
    description: `The East Bay Phase 2 water treatment plant in Pakil, Laguna, for Manila Water Company, Inc. ACCIONA's press release states that Manila Water awarded the contract to the consortium of ACCIONA, PrimeBMD and Sta. Clara. Sta. Clara's own share of the work, the completion date and the contract value are not published, so none is given. Source: ACCIONA press release on the East Bay Phase 2 contract, ${CHECKED}.`,
    scope: [],
  },
  "hibale-dam": {
    capacity: null,
    description: `The Hibale Small Reservoir Irrigation Project in Danao, Bohol, for the National Irrigation Administration, Region VII. According to NIA Region VII and the Provincial Government of Bohol (July 2025), the zoned earthfill dam and its structures were awarded to Sta. Clara in October 2024. The storage volume, the irrigated area and the contract value are not given here because the source used does not state them. Source: NIA Region VII and Provincial Government of Bohol announcements (July 2025), ${CHECKED}.`,
    scope: ["Zoned earthfill dam and appurtenant structures"],
  },
  "mangima-hydro": {
    capacity: "12 MW",
    description: `Engineering, procurement and construction of the 12 MW Mangima hydroelectric power plant in Manolo Fortich, Bukidnon, for Mangima Hydro Power Corporation (MHPC). The designer, EDCOP, states on its project page that MHPC awarded the EPC contract to Sta. Clara and that EDCOP prepared the detailed engineering design. The plant's components and the contract value are not given here because that page is the only source used. Source: EDCOP project page, detailed engineering design of the 12 MW Mangima hydroelectric power plant, ${CHECKED}.`,
    scope: ["Engineering, procurement and construction (EPC)"],
  },
  "pasig-city-hall": {
    description: `The new Pasig City Hall complex in Pasig City, Metro Manila, for the City Government of Pasig. The contract was signed on 13 January 2025 with the Pasig City Hall Construction Consortium, of which Sta. Clara is a member. Sta. Clara's own share of the work, the building details and the contract value are not given here. Source: press reports of the contract signing (January 2025), ${CHECKED}.`,
    scope: [],
  },
  "pmftc-tanauan": {
    name: "PMFTC Batangas Factory Extension Project",
    description: `The factory extension for Philip Morris Fortune Tobacco Corporation (PMFTC) in Tanauan, Batangas. A Sta. Clara news post of December 2022 reports that the company secured the deal. The post is the only source used here: the scope, the completion date and the contract value are not published, so none is given. Source: Sta. Clara International Corporation news post "SCIC Secures Deal for PMFTC Batangas Factory Extension Project" (December 2022), ${CHECKED}.`,
    scope: [],
  },
  "maladugao-hydro": {
    description: `The Maladugao hydroelectric power project in Kalilangan, Bukidnon. A Sta. Clara news post of October 2022 reports the project and names Investco BHPI Inc. as the partner; it does not say who awarded the contract, so no client is recorded. The plant's components, the completion date and the contract value are not published. The 8.4 MW on this record is not stated in the source used. Source: Sta. Clara International Corporation news post on the Maladugao project (October 2022), ${CHECKED}.`,
    scope: [],
  },
  "kalayaan-wind-farm": {
    capacity: "100 MW",
    description: `Works on the Kalayaan 2 wind power project in Laguna. The ground-improvement specialist Menard names Sta. Clara as its client on this project, which is the only published link found; who Sta. Clara's own client is was not found, so none is recorded. The number of turbines, the scope and the contract value are not published. Source: Menard project reference for the Kalayaan 2 wind power project, ${CHECKED}.`,
    scope: [],
  },
  "ups-clark-hub": {
    name: "UPS Warehouse at Clark",
    description: `A warehouse for UPS at Clark, Pampanga. A consultant's project page states that Sta. Clara is building it; who the contract is with is not stated, so no client is recorded. The floor area, the scope and the contract value are not published. Source: consultant's project page for the UPS warehouse at Clark, ${CHECKED}.`,
    scope: [],
  },

  // ── A bid only: flagged, like the other unconfirmed records ──
  "bcib-interlink": {
    name: "Bataan-Cavite Interlink Bridge (bid)",
    description: `The Bataan-Cavite Interlink Bridge across Manila Bay, between Mariveles, Bataan and Naic, Cavite. Press reports (September 2025) describe only a bid by POSCO E&C with Sta. Clara; no award has been found. Not confirmed by public sources: as of 5 October 2026, no public source confirms that Sta. Clara holds a contract on this project. The details in this record are unverified.`,
    scope: [],
  },
};

async function main() {
  const rows = await prisma.project.findMany({ where: { deletedAt: null } });
  const missing = Object.keys(R).filter((s) => !rows.some((r) => r.slug === s));
  if (missing.length) throw new Error(`slugs not found: ${missing.join(", ")}`);
  let n = 0;
  for (const row of rows) {
    const w = R[row.slug];
    if (!w) continue;
    const metrics = { ...((row.metrics as Record<string, unknown>) || {}) };
    const data: Record<string, unknown> = { description: w.description, engineeringScope: w.scope };
    if (w.capacity !== undefined) {
      data.capacity = w.capacity;
      if (w.capacity) metrics.capacity = w.capacity;
      else delete metrics.capacity;
      data.metrics = metrics;
    }
    if (w.name) data.name = w.name;
    if (w.status) data.status = w.status;
    n++;
    if (!APPLY) console.log(`${row.slug}: ${w.name ? `name -> "${w.name}"; ` : ""}${w.capacity !== undefined ? `capacity "${row.capacity ?? ""}" -> "${w.capacity ?? ""}"; ` : ""}${w.description.length} chars`);
    else await prisma.project.update({ where: { id: row.id }, data: data as never });
  }
  console.log(`${n} records`);
  if (!APPLY) return console.log("dry run: nothing written. Re-run with --apply.");

  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((r) => Object.fromEntries(keys.map((k) => [k, (r as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`written; ${all.length} projects`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
