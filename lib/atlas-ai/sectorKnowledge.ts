/**
 * What the Atlas assistant knows about each KIND of project the company builds: solar, hydro,
 * wind, thermal and storage, transmission, water, tunnels, roads and bridges, flood control,
 * buildings, mining.
 *
 * Two layers per sector, never mixed:
 *
 *  1. TRACK RECORD: the company's completed works of that kind, taken from Sta. Clara's own
 *     "What we do" pages and checked on 2026-10-03:
 *       https://staclara.com.ph/what-we-do/completed/renewable-energy-power-plants/
 *       https://staclara.com.ph/what-we-do/completed/energy-power-plants-transmission-lines-and-substations/
 *       https://staclara.com.ph/what-we-do/completed/water-and-wastewater-systems/
 *       https://staclara.com.ph/what-we-do/completed/mining-and-tunnelling-works/
 *       https://staclara.com.ph/what-we-do/completed/roads-bridges-and-railways/
 *       https://staclara.com.ph/what-we-do/completed/flood-control-and-dams/
 *       https://staclara.com.ph/what-we-do/completed/buildings/
 *       https://staclara.com.ph/what-we-do/completed/site-development-works/
 *     These are company facts even when the Atlas map has no record of the project (the map did
 *     not list a single solar project, so the assistant said the company had none). Nothing may
 *     be added here from memory: update it from those pages.
 *
 *  2. BACKGROUND: general engineering knowledge of how such a project works and what its parts
 *     are, so he can explain a headrace tunnel or "balance of plant". It is NOT a statement about
 *     any particular Sta. Clara project and must never be presented as one.
 *
 * Only the sectors a question touches are sent to the model (the free model tiers limit prompt
 * size), see sectorKnowledgeFor().
 */
export const SECTOR_KNOWLEDGE_AS_OF = "October 2026";

interface Sector {
  id: string;
  label: string;
  match: RegExp;
  trackRecord: string;
  background: string;
  /** Said when the Atlas map has no project of this kind but the company has built them */
  atlasGapNote?: string;
  /** The same, as he says it aloud */
  atlasGapSpoken?: string;
}

const SECTORS: Sector[] = [
  {
    id: "solar",
    label: "SOLAR POWER",
    match: /\b(solar|photo ?voltaic|pv (plant|farm|module|panel)|solar (farm|plant|park|panel))\b/i,
    trackRecord: `- 60 MW Toledo Solar Power Plant, Toledo, Cebu. Client: Citicore Power, Inc. Sole contractor. Completed February 2016. Scope: design and build of the balance of plant, site development design and build (73.81 hectares), drainage system works, installation, electrical, cabling and termination of solar modules.
- 5,012 kW (about 5 MW) Photovoltaic Plant, Morong, Bataan. Client: Solar Powered Agri-rural Communities Corp. Sole contractor. Completed March 2016. Scope: site development design and build, drainage system works, installation, electrical, cabling and termination of solar modules.
- Solar is also listed among the company's plant-works services, and its subsidiary Sta. Clara Power Corporation states it is expanding into wind and solar.`,
    background: `- A utility-scale solar plant turns sunlight into DC electricity in photovoltaic modules; inverters convert it to AC; transformers step it up; a substation and a transmission line connect it to the grid.
- Main parts: PV modules on mounting structures (fixed-tilt or single-axis trackers) on driven or bored piles, DC cabling and combiner boxes, inverters, medium-voltage collection, the substation, SCADA and weather stations, perimeter fence, access roads and drainage.
- "Balance of plant" (BOP) is everything except the modules and inverters themselves: site development, foundations, structures, cabling, drainage, roads, substation civil works. That is typically the contractor's scope.
- Capacity is quoted in MWp (DC, the modules) or MWac (what reaches the grid). Land take is roughly 1 to 1.5 hectares per MW. Output follows the sun: a capacity factor of roughly 15 to 20 percent in the Philippines is typical.
- What decides a site: solar irradiance, flat or gently sloping land, flood and typhoon exposure (module wind loading, drainage), distance to a substation.
- Construction risks: earthworks and drainage on large open sites, pile refusal in rock, cable theft, rain-season access, grid connection timing.`,
    atlasGapNote:
      "The Atlas map has no solar project on record, but the company has built them: the 60 MW Toledo Solar Power Plant in Cebu for Citicore Power (completed February 2016) and a 5 MW photovoltaic plant in Morong, Bataan (completed March 2016), both as sole contractor. [Source: Sta. Clara company website]",
    atlasGapSpoken:
      "The map has none on record, but the company has built two: the 60 megawatt Toledo solar plant in Cebu and a 5 megawatt plant in Morong, Bataan, both finished in 2016.",
  },
  {
    id: "hydro",
    label: "HYDROELECTRIC POWER",
    match: /\b(hydro|hydroelectric|hydropower|hepp|run[- ]of[- ]river|pumped storage|penstock|headrace|weir|powerhouse|turbine|surge (shaft|tank)|desander|forebay|tailrace)\b/i,
    trackRecord: `- 70 MW Bakun AC Hydroelectric Power Plant, Ilocos Sur and Benguet. Client: Transfield Philippines, Inc. Subcontractor for civil and tunnel works. Completed April 2000. Tunnel excavation 3.4 m diameter x 10.5 km, desander chambers, underground penstock 2.1 m diameter x 1.5 km, switchyard.
- CBK rehabilitation (client CBK Hydro Power Consortium, completed August 2004): 4 x 8 MW Caliraya (Laguna), subcontractor for civil works: dam face rehabilitation, new spillway, tunnel rehabilitation; 2 x 10 MW Botocan (Majayjay, Laguna): dam, reservoir, headrace tunnel 1.18 km, powerhouse; 2 x 150 MW Kalayaan (Laguna), subcontractor for civil and underground penstock works: inclined shaft, access tunnel, twin penstock gallery, bifurcation cavern.
- Irisan 1 Hydroelectric Power Plant, Benguet. Client: Hedcor, Inc. Sole contractor. Completed January 2012.
- 8 MW Cabulig Hydroelectric Power Plant, Claveria, Misamis Oriental. Client: Mindanao Energy Systems, Inc. Sole contractor. Completed December 2012. Concrete gravity dam 38 m high, headrace 3 m x 3 m x 6 km box culvert, powerhouse, substation.
- 7 MW Bubunawan Hydroelectric Power Plant rehabilitation, Baungon, Bukidnon. Client: Bubunawan Power Company, Inc. Sole contractor. Completed October 2013.
- 14 MW Sabangan Hydroelectric Power Plant, Sabangan, Mountain Province. Client: Hedcor Sabangan, Inc. / Aboitiz Power Corporation. Sole contractor. Completed May 2015. Access roads 12 km, weir intake, desander, underground penstock 1.5 m diameter x 700 m, headrace tunnel 3 m diameter x 3.1 km.
- 8 MW Catuiran Hydroelectric Power Plant, Naujan, Oriental Mindoro. Client: Catuiran Hydro Power Corp. Sole contractor, engineering, procurement and construction. Completed December 2018. Intake dam, underground desander, headrace tunnel 3.2 m diameter x 3.2 km, surge shaft, penstock, powerhouse, switchyard, 69 kV transmission line.
- Manolo Fortich Hydroelectric Power Plant, Bukidnon. Client: Hedcor Bukidnon, Inc. / Aboitiz Power Corporation. Sole contractor. Completed December 2018. Weir, desander, headrace tunnel 4 m diameter x 6 km, surge tank, penstock, powerhouse, switchyard.
- 1.2 MW Loboc Mini Hydroelectric Power Plant, Loboc, Bohol. Client: Sta. Clara Power Corporation. Penstock 2.1 m diameter x 260 m, intake, inflatable dam, powerhouse.
- Hydro is the company's oldest speciality: its first major hydro project was Bakun (1996), and its subsidiary Sta. Clara Power Corporation operates the Amlan, Catuiran, Loboc 1 and Loboc 2 plants.`,
    background: `- A hydro plant turns falling water into electricity: power is roughly 9.81 x flow (m3/s) x head (m) x efficiency, in kilowatts. More head or more flow means more power.
- Run-of-river (most Philippine mid-size plants): a weir diverts part of the river through an intake and a desander (settles out sand that would erode the turbines), along a headrace (tunnel, canal or box culvert) to a forebay or surge shaft, then down a steel penstock to the powerhouse; the water returns to the river through the tailrace. Little or no storage, so output follows river flow.
- Storage and pumped storage: a dam holds a reservoir; pumped storage (such as Kalayaan) pumps water uphill when power is cheap and generates when it is needed.
- Turbines by head: Pelton for high head, Francis for medium, Kaplan for low head and large flow.
- The headrace tunnel is usually the critical path: drill-and-blast excavation, rock bolts, wire mesh, shotcrete, steel ribs in poor ground, then concrete lining. Geology, water ingress and access decide the schedule.
- Other typical risks: river diversion and floods during weir construction, steep access roads and slope protection, penstock installation on steep slopes, grid interconnection.`,
  },
  {
    id: "wind",
    label: "WIND POWER",
    match: /\b(wind (farm|power|energy|turbine|project)|wind\b|wtg|turbine foundation)\b/i,
    trackRecord: `- 54 MW San Lorenzo Wind Farm, San Lorenzo, Guimaras. Client: Trans-Asia Renewable Energy Corp. and Kanematsu Corporation. Sole contractor. Completed January 2015. Balance of plant: access roads, 27 turbine foundations, earthworks, anchor bolts for 27 wind turbine generators.
- 54 MW Pililla Wind Farm, Pililla, Rizal. Client: Gamesa Eolica S.L. Unipersonal Phils; owner: Alternergy Philippine Holdings Corp. Sole contractor. Completed August 2015. Balance of plant: access roads, 27 foundations, earthworks, anchor bolts.
- 16 MW Puerto Galera Wind Energy Power, Mindoro. Client: Philippine Hybrid Energy Systems, Inc. Sole contractor. Completed September 2018. Earthworks, 8 foundations, laydown pads and hardstands, access roads, drainage.
- 160 MW Pagudpud Wind Farm: commissioned May 2023.`,
    background: `- A wind farm is a set of wind turbine generators (WTGs), each a tower, nacelle and three blades, on a large reinforced-concrete foundation, connected by buried cables to a substation.
- The contractor's "balance of plant" is the civil and electrical work around the turbines: access roads wide and gentle enough for blades 60 m or longer, crane hardstands, foundations with anchor-bolt cages, cable trenches, the substation and the transmission line.
- A typical modern onshore turbine is 2 to 6 MW; a foundation takes several hundred cubic metres of concrete poured in one continuous pour.
- Capacity factor in good Philippine sites (north Luzon, Guimaras, Mindoro) is roughly 25 to 40 percent; output is seasonal, strongest in the northeast monsoon.
- Risks: transporting blades on mountain roads, typhoon wind loading, foundation ground conditions, crane availability, the weather window for lifting.`,
  },
  {
    id: "thermal-storage",
    label: "THERMAL POWER AND BATTERY STORAGE",
    match: /\b(thermal|coal|diesel|bunker|combined cycle|ccpp|gas[- ]fired|battery|bess|energy storage)\b/i,
    trackRecord: `- 3 x 55 MW Balingasag Thermal Power Plant, Misamis Oriental. Client: Mitsubishi Corporation. Sole contractor. Completed April 2017. Site development, access roads, foundations, sheet and concrete piling, buildings, electrical and structural steel works.
- 7.5 MW Coron Bunker-Fired Power Plant, Coron, Palawan. Client: Calamian Islands Power Corporation. Completed August 2014.
- 10 MW Masinloc Battery Energy Storage System, Masinloc, Zambales. Client: Masinloc Power Partners Co. Ltd. / AES Philippines. Completed November 2016. Balance of plant and battery storage core.
- Site development for the 1,000 MW Sta. Rita combined cycle power plant, Batangas (client First Philippine Balfour Beatty Inc., completed November 1999, 35 hectares).
- Hill removal for the 375 MW coal-fired Pagbilao Unit 3, Quezon (client Team Energy Corporation, completed October 2014; 422,633 cubic metres excavated).`,
    background: `- A battery energy storage system (BESS) stores electricity in lithium-ion battery containers, with power conversion systems (inverters), transformers and controls. It is rated in MW (how fast it can deliver) and MWh (how long). It smooths solar and wind output and supplies grid ancillary services.
- For a thermal plant the civil contractor's work is site development, piling, heavy foundations for turbines and boilers, buildings, tanks, cooling-water structures and structural steel; the generating equipment comes from the technology supplier.`,
  },
  {
    id: "grid",
    label: "TRANSMISSION LINES AND SUBSTATIONS",
    match: /\b(transmission( line)?|substation|switchyard|kv\b|500 ?kv|230 ?kv|69 ?kv|ehv|grid|ngcp|conductor|tower)\b/i,
    trackRecord: `- 500 kV extra-high-voltage Mariveles to Balsik (Hermosa) Transmission Line, Bataan. Client: National Grid Corporation of the Philippines. Main civil works and installation of conductors. Completed April 2022.`,
    background: `- Transmission lines carry bulk power at high voltage (69, 138, 230 or 500 kV in the Philippines) to cut losses; substations step the voltage up or down and switch circuits.
- Line construction is tower foundations, steel lattice tower erection, then stringing the conductors and ground wire. Right-of-way acquisition is the usual schedule risk, along with access in mountain terrain and typhoon loading.`,
  },
  {
    id: "water",
    label: "WATER AND WASTEWATER",
    match: /\b(water (treatment|supply|plant|system)|wtp\b|stp\b|sewage|sewerage|wastewater|waste water|mld\b|reservoir|pumping station|bulk water|maynilad|manila water|pipeline)\b/i,
    trackRecord: `- Rizal Province Water Supply Improvement Project, Phases 1 and 2, Cardona, Rizal. Client: Manila Water Company, Inc. Consortium member. Completed April 2019. Raw water intake, pump station, pipelines, water treatment plant, treated water reservoir.
- 25 MLD Morong Water Treatment Plant, Morong, Bataan. Client: Morong Power and Water Corporation. Sole contractor.
- 100 MLD Marikina North Sewage Treatment Plant, Marikina City. Client: Manila Water Company, Inc. Consortium member. Completed August 2017.
- Bahay Toro Sewage Treatment Plant, Quezon City. Client: Maynilad Water Services, Inc. Sole contractor. Completed October 2016. 13,400 cubic metres a day average dry-weather flow.
- Marikina North Terminal Pumping Station (Manila Water, sole contractor, completed May 2015).
- Marcos Alvarez Extension Reservoir and Pumping Station, Bacoor, Cavite. Client: Maynilad. Sole contractor. Completed March 2017. 40 ML reinforced-concrete reservoir and pump station.`,
    background: `- Plant size is given in MLD, million litres a day. 1 MLD supplies roughly 5,000 to 7,000 people.
- A water treatment plant takes raw water through intake and screening, coagulation and flocculation, sedimentation, filtration and disinfection, then to a treated-water reservoir and the distribution pipelines.
- A sewage treatment plant does the reverse for wastewater: screening and grit removal, biological treatment (activated sludge or similar), clarification, disinfection, and sludge handling, before the effluent is discharged.
- The civil work is mostly large water-retaining reinforced-concrete tanks (watertightness and crack control matter), deep excavation, pipe laying and electromechanical installation. Risks: groundwater, working in built-up areas, tie-ins to live networks.`,
  },
  {
    id: "tunnel",
    label: "TUNNELLING AND UNDERGROUND WORKS",
    match: /\b(tunnel|tunnelling|tunneling|underground|drill[- ]and[- ]blast|shotcrete|rock bolt|tbm|cavern|shaft)\b/i,
    trackRecord: `- Bakun AC hydro: tunnel 3.4 m diameter x 10.5 km and underground penstock 2.1 m diameter x 1.5 km (completed April 2000).
- Manolo Fortich hydro: headrace tunnel 4 m diameter x 6 km (completed December 2018).
- Catuiran hydro: headrace tunnel 3.2 m diameter x 3.2 km (completed December 2018).
- Sabangan hydro: headrace tunnel 3 m diameter x 3.1 km and underground penstock 1.5 m diameter x 700 m (completed May 2015).
- Kalayaan: inclined shaft, access tunnel, twin penstock gallery and bifurcation cavern (completed August 2004).
- Subic Freeport Expressway expansion: road bypass tunnel 12.3 m diameter x 110 m, with rock bolting, wire mesh, shotcrete, steel ribs and concrete lining. Client: NLEX Corporation. Sole contractor. Completed March 2021.`,
    background: `- Most Philippine hydro and road tunnels are driven by drill-and-blast: drill the face, charge and blast, ventilate, muck out, then support the rock (rock bolts, wire mesh, shotcrete, steel ribs where the ground is poor) and finally line it with concrete.
- Progress is measured in metres a day per face and depends on rock class; fault zones and water inflow are what slow a drive. Working from both portals, or from an adit, doubles the faces.
- Breakthrough (the two headings meeting) is the milestone everyone watches.`,
  },
  {
    id: "roads",
    label: "ROADS, BRIDGES AND RAILWAYS",
    match: /\b(road|highway|expressway|bridge|viaduct|railway|rail|lrt|mrt|nscr|slex|nlex|sctex|sfex|toll)\b/i,
    trackRecord: `- Subic Freeport Expressway (SFEX) Capacity Expansion, Hermosa, Bataan to the Subic Bay freeport. Client: NLEX Corporation. Sole general contractor. Completed March 2021. A 108 m tunnel, the 180 m Jadjad Bridge, the 23.7 m Argonaut Bridge, earthworks, roadworks, drainage.
- Subic-Clark-Tarlac Expressway Package 1, Dinalupihan, Bataan. Client: Obayashi Corporation. Completed 2007. 1.2 million cubic metres of embankment over 8 km, 8 bridges, 2 underpasses, four-lane asphalt expressway.
- Urgent Bridges Construction Project for Rural Development, Package III, Laguna and Batangas. Client: TOYO Construction Co., Ltd. Completed 2008. Six two-lane reinforced-concrete deck girder bridges.
- Tipo Expressway, Olongapo City to Hermosa, Bataan. Client: Samsung Construction Co. Philippines Inc. 8.5 km expressway with bridge and tunnel.`,
    background: `- Expressway work is earthworks (cut and fill, embankment), drainage, pavement (asphalt or concrete), structures (bridges, underpasses, culverts) and slope protection.
- Bridges and viaducts: bored piles or spread footings, piers, then girders (precast or cast in place) and the deck. Rail viaducts add tight alignment tolerances and work beside live traffic.
- Usual risks: right-of-way, utility relocation, traffic management, rain-season earthworks.`,
  },
  {
    id: "flood",
    label: "FLOOD CONTROL, DAMS AND IRRIGATION",
    match: /\b(flood( control)?|dike|dyke|sabo|river improvement|dam\b|dams\b|irrigation|spillway|sluice)\b/i,
    trackRecord: `- Laoag River Basin Flood Control and Sabo Project, Ilocos Norte. Client: TOYO Construction Co., Ltd. Subcontractor. Completed June 2007. Laoag-Bongo and alluvial fan river improvement: earth dikes, sluiceway and spur dikes.
- Dams built as part of hydro plants: the 38 m concrete gravity dam at Cabulig (completed December 2012), and dam rehabilitation and a new spillway at Caliraya (completed August 2004).`,
    background: `- Flood control combines dikes and river walls to contain high water, channel improvement to carry it faster, spur dikes and revetments to stop bank erosion, sluiceways and floodgates to release it, and sabo dams, which trap sediment and debris in mountain streams.
- Dams are concrete gravity, roller-compacted concrete, or earth and rockfill; the foundation (and its grouting) and the spillway capacity are what make a dam safe.`,
  },
  {
    id: "buildings",
    label: "BUILDINGS AND INDUSTRIAL FACILITIES",
    match: /\b(building|factory|warehouse|manufacturing|industrial (plant|facility)|flour mill|mall|city hall|office building|facility)\b/i,
    trackRecord: `- Project Alviera, Porac, Pampanga, for Monde Nissin Corporation (sole contractor, completed July 2019): 9,000 sqm building and 4,000 sqm site development.
- JTI Flex factory, Malvar, Batangas, for JTI International Manufacturing Corporation (sole contractor, completed September 2018).
- Subic Bay Flour Mill, for Mabuhay Interflour Mill Inc. (sole contractor, completed February 2017): mill building and storage silos.
- Monde Nissin office and automated warehouse, Sta. Rosa, Laguna (completed January 2016); Monde Nissin manufacturing plant, Davao City (completed December 2012).
- S&R Membership Shopping facilities at four locations, for Kareila Management Corporation (sole contractor, completed October 2013).
- Highway 54 Plaza, EDSA, Mandaluyong (completed August 2006): the four-storey building that houses the company's head office.`,
    background: `- Industrial building work is site development, foundations (often piled), a structural steel or concrete frame, heavy-duty floor slabs, roofing and cladding, and the mechanical, electrical and fire-protection systems, usually on a fixed handover date set by the client's production start.`,
  },
  {
    id: "mining",
    label: "MINING WORKS",
    match: /\b(mining|mine\b|tailings|tsf\b|apex|maco)\b/i,
    trackRecord: `- Five-metre raise (elevation 650 to 655, Phase 3B) of the Maco Tailings Management Facility, Maco, Davao de Oro. Client: Apex Mining Company, Inc. Sole contractor. Completed January 2019. Tailings dam construction.`,
    background: `- A tailings storage facility is an engineered dam that holds the fine waste slurry from ore processing. It is raised in stages as the mine produces; compaction, drainage and seepage control decide its safety, and each raise is designed and monitored closely.`,
  },
];

/** Every sector's text (the self-review step may find figures in an answer here) */
export const ALL_SECTOR_TEXT = SECTORS.map((s) => `${s.trackRecord}\n${s.background}`).join("\n");

function matched(text: string): Sector[] {
  return SECTORS.filter((s) => s.match.test(text || ""));
}

/**
 * The knowledge for the sectors a question touches (at most three), ready for the system prompt.
 * Empty when the question is not about a kind of project.
 */
export function sectorKnowledgeFor(...texts: string[]): string {
  const seen = new Set<string>();
  const picked: Sector[] = [];
  for (const t of texts) for (const s of matched(t)) if (!seen.has(s.id) && picked.length < 3) (seen.add(s.id), picked.push(s));
  return picked
    .map(
      (s) =>
        `${s.label}\nCompany track record (completed works, from Sta. Clara's website, as of ${SECTOR_KNOWLEDGE_AS_OF}):\n${s.trackRecord}\nEngineering background (general knowledge, not a statement about any one project):\n${s.background}`
    )
    .join("\n\n");
}

/**
 * For an exact-count answer that found nothing of a kind the company HAS built: the sentence that
 * says so (otherwise "no solar projects" reads as "the company does no solar").
 */
export function atlasGapNoteFor(question: string, answer: string): { note: string; spoken: string } | null {
  if (!/\b(no|0|zero|none|not (have|find|found)|don'?t have|couldn'?t find)\b/i.test(answer)) return null;
  const s = matched(question).find((x) => x.atlasGapNote);
  return s?.atlasGapNote ? { note: s.atlasGapNote, spoken: s.atlasGapSpoken ?? "" } : null;
}
