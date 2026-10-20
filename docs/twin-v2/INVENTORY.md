# Inventory of v1

Written in P00a (2026-10-09) from `components/digital-twin/` (59 files, 48,805 lines). Every row is marked:

- **keep**: the content carries into v2 as data or behaviour (already extracted to `components/twin/data/` where it says so).
- **upgrade**: the thing stays, but v2 rebuilds it as a modelled asset or a proper system.
- **drop**: not carried into v2. It stays reachable in v1 at `?v=1`.

Positions are in the v1 scene frame: metres, Y up, powerhouse at the origin. That frame is the `powerhouse` location frame of v2. Line numbers are v1 lines at commit `822194a`.

**How far this was read.** `PlantScene.tsx` (from line 1111), `TemfacilFacility.tsx` (132 to 720), `AnimatedSiteEntities.tsx` (3882 to 4022 and 5115 to the end), the data files and the small files named in the P00a prompt were read line by line. The rest (the 8,900 remaining lines of `TemfacilFacility.tsx`, the two office interiors, most of `PowerhouseGeometry.tsx`, the tunnel files, the effects files) was inventoried from its component list, its mesh counts and its comments, not line by line. Rows from those files give the component and its first line; per-prop detail is left to the phase that rebuilds it.

## 1. Every v1 file

| File | Lines | `<mesh>` | What it draws or does | v2 |
| --- | --- | --- | --- | --- |
| `PlantScene.tsx` | 3,458 | 21 | Canvas, lighting by four times of day, camera controller, 31 presets, markers, labels, HUD, default equipment list | upgrade (P01b, P13) |
| `PlantSceneLoading.tsx` | 33 | 0 | Loading card | upgrade (P13a) |
| `PowerhouseGeometry.tsx` | 2,573 | 308 | Powerhouse, switchyard, terrain mesh, far mountains, tailrace water, river, floodwalls and gate, bus system, transmission span and tower, surge tank, penstock, hillside, trench walls, road, fence, guardhouse, cistern | upgrade (P05a to P05d) |
| `terrainData.ts` | 130 | 0 | Terrain heights and sampler | keep: `lib/twin/terrain.ts` |
| `uphillRoadConfig.ts` | 522 | 0 | Road and walking routes, building colliders, ground-level rules | keep: `routes.json`; colliders replaced by the navmesh (P09a) |
| `SiteElectricalDistribution.tsx` | 580 | 65 | Generator set, 7 roadside poles, overhead lines, streetlights, camp substation | upgrade (P05c); poles in `poles.json` |
| `TemfacilFacility.tsx` | 9,627 | 1,170 | The whole camp: pad, office shell, staff house, kitchens, canteen, barracks, warehouse, court, drainage, lawns, and about 30 animated people scenes | upgrade (P06a to P06d, P09b) |
| `TemfacilOfficeInterior.tsx` | 4,331 | 402 | Site office interior: desks, screens, partitions, seated staff | upgrade (P06a) |
| `TemfacilQaqcOffice.tsx` | 911 | 98 | QA/QC office and materials lab | upgrade (P06b) |
| `RealisticBlenderAssets.tsx` | 319 | 0 | Loader for the nine in-house GLBs (barracks block, roofs, canteen pavilion, tables, dispensers) | drop (replaced by the asset pipeline, P01c) |
| `AnimatedSiteEntities.tsx` | 5,431 | 402 | Primitive people, four vehicles and their traffic logic, gate officer and checkpoint, toolbox meeting, basketball, watchmen, warehouse work | upgrade (P07 to P10) |
| `RealisticHumanoidMesh.tsx` | 1,232 | 139 | The primitive human body | drop (rule 1) |
| `PerimeterSecurityPatrol.tsx` | 218 | 0 | Two guards walking the fence line (GLB `security_patrol.glb`) | upgrade (P09b) |
| `personnelData.ts`, `personnelLocations.ts` | 850, 509 | 0 | The registry and where each person stands | keep: `people.json` |
| `PersonnelInfoCard.tsx`, `PersonnelProfileModal.tsx`, `PersonnelLocatorBeacon.tsx` | 178, 304, 130 | 6 | Person card, roster and profile modal, locator beacon | upgrade (P09d, P13) |
| `ForestVegetation.tsx` | 400 | 1 | Instanced trees from cones and dodecahedra, exclusion rules | upgrade (P04); rules in `exclusions.json` |
| `ForestWildlife.tsx` | 1,560 | 149 | Nine primitive species | upgrade (P11) |
| `SierraMadreStorkFlock.tsx`, `HighlandTrailHorse.tsx` | 177, 81 | 0 | Stork flock and a horse from GLBs | upgrade (P11) |
| `MountainAtmosphereEffects.tsx` | 1,024 | 63 | Mist, steam, swallows, clouds, heat shimmer, raptor, room lights, vehicle lights, flashlights, fireflies, shooting stars, strobe, night lighting | upgrade (P03, P12a) |
| `RealisticSkyAtmosphere.tsx` | 183 | 1 | Sky dome by time of day | upgrade (P03b) |
| `VolumetricLightBeam.tsx` | 222 | 1 | Light cone shader | upgrade (P12a) |
| `SharedMaterials.tsx`, `proceduralTextures.ts`, `screenTextures.ts`, `tunnelTextures.ts` | 329, 530, 1,325, 395 | 0 | Materials and canvas-drawn textures (office screens, signs, rock) | drop (PBR textures replace them); screen content ideas kept for P06a |
| `StaticBatcher.tsx`, `LightCountStabilizer.tsx` | 457, 343 | 0 | Run-time draw-call batching; fixed light count | drop (v2 batches at build time and uses a fixed light pool) |
| `FacilityHolographicBeaconLabel.tsx` | 405 | 18 | Two rotating facility beacons with badges | drop (figures on them are not real); labels rebuilt in P13b |
| `EquipmentDetailDrawer.tsx` | 203 | 0 | Equipment record drawer | upgrade (P13a, P14a) |
| `SierraMadreSoundEngine.ts`, `SiteAudioControls.tsx` | 479, 74 | 0 | Ambient sound engine and its controls | keep, ported in P12b |
| `TunnelSegment.tsx`, `TunnelGeometry.ts`, `TunnelShaderMaterial.ts`, `TunnelLighting.tsx`, `TunnelChainageMarkers.tsx`, `TunnelWaterSeepage.tsx`, `TunnelDustParticles.tsx`, `TunnelAtmosphereState.ts`, `TunnelPositionalAudio.tsx` | 882, 335, 386, 429, 173, 330, 250, 74, 221 | 32 | The tunnel heading: lining zones, ribs, lights, chainage stencils, seepage, dust, sound | upgrade (P05e) |
| `TunnelFaceCycleTypes.ts`, `TunnelFaceCycleActors.tsx`, `TunnelFaceCycleHUD.tsx` | 99, 880, 306 | 130 | The five-stage drill and blast cycle, its machines and its HUD | keep the cycle (P09c); upgrade the actors |
| `TunnelWorker*.tsx/ts`, `TunnelPersonnelCrew.tsx` | 1,214, 419 | 70 | Tunnel crew figures, props, impostors, roster | upgrade (P07, P09c) |
| `SupercarEntity.tsx`, `SupercarConfiguratorOverlay.tsx`, `carAudio.ts`, `GTAPlayerController.tsx`, `gtaRuntime.ts`, `LocomotionLaboratoryModal.tsx` | 1,266, 560, 182, 614, 194, 468 | 74 | Supercar, GTA mode, Locomotion Lab | drop (rule 12) |

## 2. Facilities and rooms

Extracted to `components/twin/data/site-layout.json` (`v1.facilities`). Footprint is along X by along Z.

| Facility | v1 position (x, y, z) | Footprint (m) | Height (m) | Source of dimensions | v1 line | v2 |
| --- | --- | --- | --- | --- | --- | --- |
| Powerhouse building | 0, 0, 0 | 21 x 15 (collider) | not read | v1 comment "38.65m DED layout"; shape is v1's | `PowerhouseGeometry.tsx:224` | upgrade from R1 and the penstock plan: hall 31.5 x 12 m, annex 7.3 m, turbine floor, ground floor, second floor |
| Two unit markers | (-4, 6, 0), (4, 6, 0) | | | v1 literals | `PlantScene.tsx:1172` | upgrade: two different horizontal units, axes 11.5 m apart |
| Powerhouse yard | x -28 to 42, z -16 to 18 | 70 x 34 | 0.05 to 0.65 | v1 literals | `uphillRoadConfig.ts:429` | upgrade |
| Switchyard platform and floodwall | 25, 0.65, 0 | 19.6 x 17.6 | | v1 literals; four pads at (±3, ±3) | `PowerhouseGeometry.tsx:665` | upgrade (P05c) |
| Generator set | 26, 0, 6 | 4.4 x 2.4 | 2.1 | v1 literals | `SiteElectricalDistribution.tsx:128` | upgrade |
| Tailrace channel | x -12 to 12, z 5.5 to 48 | 24 x 42.5 | -1.35 | v1 literals | `terrainData.ts:25` | upgrade: real tailrace has a big-turbine and a small-turbine side |
| Tailrace floodwalls, piers, gate | along z 26 to 30, x -55 to 55 | | crest 7.8 to 5.2 (labelled EL. 195.50) | v1 literals | `PowerhouseGeometry.tsx:1329, 1786` | upgrade (P05a, P05d) |
| River | centre z = 42 + 9 sin(...), 24 m wide | | | v1 formula | `PowerhouseGeometry.tsx:1170, 1315` | upgrade (P03c): real course to be traced |
| Penstock | (-6, 17.5, -26) to (-4, 4.5, -6) | 2.70 m pipe | | diameter matches the penstock plan | `PowerhouseGeometry.tsx:2224` | upgrade: real one is 111 m long and falls 83 m |
| Surge tank | -6, 17.5, -26 | about 9 m across | 16 lifts | "EL. 271.46m, 16 lifts" matches the plan | `PowerhouseGeometry.tsx:2128` | upgrade at its real distance |
| Tunnel heading | -6, 16.8, -24.5, yaw 0.12 pi | 3.2 m D-shape | | `docs/tunnel-scene-brief.md` | `PlantScene.tsx:1253` | upgrade: moves to `tunnel2` (active drive) and `tunnel1` (lining) |
| Transmission take-off tower and span | beside the switchyard | | | v1 literals | `PowerhouseGeometry.tsx:1980, 2053` | upgrade (P05c) |
| Access road, powerhouse to camp | 14 waypoints, (20, 0.5, 18) to (98, 14.15, -79) | 7.2 wide | | v1's arrangement | `uphillRoadConfig.ts:11` | upgrade: real road is about 500 m |
| Perimeter fence, guardhouse, cistern | around the yard | | | v1 literals | `PowerhouseGeometry.tsx:1283, 1287, 2464` | upgrade |
| Camp pad | centre 127, 14, -111 | 84 x 82 | slab top 14.15 | v1 literals | `TemfacilFacility.tsx:199` | upgrade: real camp is a bench about 160 m long |
| Entrance ramp and gate | 96, 13.7, -69 | 16 x 10.2 | 13.20 to 14.15 | v1 literals | `TemfacilFacility.tsx:237` | upgrade |
| Main site office | 114, 14, -107 | 14.4 x 22 | walls 4.2, ridge 5.5 | v1 literals | `TemfacilFacility.tsx:328` | upgrade (P06a) |
| Office rooms: entrance, document control, engineering, mechanical and IT, HR and admin, ESH, clinic, rear | inside the office | | | camera zones 1 to 6 | `TemfacilOfficeInterior.tsx:1468` | upgrade (P06a) |
| Staff house with lounge and kitchen extension | 130, 14, -107 | 12.6 x 15 | 3.8 | v1 literals | `TemfacilFacility.tsx:423, 2538` | upgrade (P06b): real plan has RM1 to RM3, a female room, laundry, common area, senior rooms |
| Foreman and staff house | 136, 14, -135.5 | 16 x 15 | | v1 literals | `TemfacilFacility.tsx:7955` | upgrade (P06b) |
| Workers' barracks (3 dormitories, breezeway, washroom block) | 155, 14, -107 | 20 x 26 | | v1 literals | `TemfacilFacility.tsx:7997` | upgrade (P06c): real ones are two-storey prefabricated blocks |
| Warehouse and laydown yard | 90, 14.8, -109 | 13.5 x 16.5 | 6.4 | v1 literals | `TemfacilFacility.tsx:565` | upgrade (P06c) |
| Tool and equipment shed | 108, 14, -85 | 8.6 x 4 | 3 | v1 literals | `TemfacilFacility.tsx:625` | upgrade: real motor pool is an open steel shed on gravel |
| Basketball court and stage | 128, 14, -81 | | | v1 literals | `TemfacilFacility.tsx:9268` | upgrade (P06c); exists per the owner |
| QA/QC office and materials lab | 140.5, 14, -74.5 | 5.2 x 8.8 | | v1 literals | `TemfacilQaqcOffice.tsx:320` | upgrade (P06b); exists per the owner |
| Canteen | 150, 14, -81 | 12 x 14 | | v1 literals | `TemfacilFacility.tsx:7691` | upgrade (P06b) |
| Drainage canal, two lawns, two light towers, internal road | around the pad | | | v1 literals | `TemfacilFacility.tsx:9041, 9097, 676` | upgrade (P06a, P06d) |

**Not in v1 and to be built:** everything at the weir (weir, sluiceway, intake, fish pass, feeder canal, abutment, flood wall, desander, Tunnel 1 inlet and adit, cofferdam, satellite camp, concrete plant), the pipe bridge and its two portals, Tunnel 2 as a second tunnel, the powerhouse second floor, the magazine, the clinic as its own building. Real positions are in `site-layout.json` (`real`).

## 3. Prop groups per facility

| Facility | Props (v1 line) | v2 |
| --- | --- | --- |
| Warehouse yard | Tarp stacks, timber logs on sleepers, pipe and rebar bundles, pallet crates, storage racks, dumpster, traffic cones (`TemfacilFacility.tsx:586` to `712`) | upgrade (P06d) |
| Tool shed | Racks, yellow tool chests, tarp bundles (`:646`) | upgrade (P06d) |
| Office interior | Desks, monitors with drawn screens, chairs, partitions, whiteboards, server rack, mouse and keyboards, instanced small props (`TemfacilOfficeInterior.tsx:1362, 4302`) | upgrade (P06a) |
| Kitchens and canteen | Food counter and trays, six cooking pots and pans with steam and burner flame, LED fixtures, stand fan, radio, condiments, dining table sets, warming station, water dispenser (`TemfacilFacility.tsx:2650` to `4374`, `7574`; GLBs in `public/models/props/`) | upgrade (P06b, P06d) |
| Court | Whiteboard sign, raised stage with whiteboard (`:9462, 9507`) | upgrade (P06c) |
| Gate | Barrier, guardhouse checkpoint, inspection HUD (`AnimatedSiteEntities.tsx:3586, 3667`) | upgrade (P06c) |
| Switchyard | Transformer, breaker, disconnect, arrester on four pads; bus ducts, gantries (`PowerhouseGeometry.tsx:716, 1838`) | upgrade (P05c) from the real foundations list: TG, DS, SA, VT, equipment pedestals, cable trench |
| Tunnel | Vent duct, cables, pipes, string lights, floodlight stands, muck pile, ribs, bolts, chainage stencils, puddles (`docs/tunnel-scene-brief.md` section 4) | upgrade (P05e) |
| Roadside | 7 poles (one with transformer), streetlights, guy wires (`poles.json`) | upgrade (P05c) |

## 4. People

35 people and the dog, all in `people.json` and `named-animals.json` with v1 ids. "v1 position" is the fallback target in `personnelLocations.ts`; several people also appear in time-of-day scenes (section 5). All rows are **keep** for identity and **upgrade** for the figure.

| Id | Name | Role | Department | Role group | Where v1 places them | v1 position | What v1 says they are doing | `personnelData.ts` line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PM_ROMEO_SESE | Engr. Romeo Sese | Resident Project Manager (In-Charge of Whole Tumauini HEPP) | MANAGEMENT | management | TEMFACIL Central Briefing Stage & Executive Wing | 126.0, 15.25, -82.5 | Overall Project Management & Directing Site Operations across Tumauini HEPP | 39 |
| DEPUTY_NATHANIEL_PRINCIPE | Nathaniel P. Principe | Deputy Project Manager | MANAGEMENT | management | TEMFACIL Main Office Executive Veranda | 115.5, 15.25, -94.5 | Assisting Project Manager in daily contractor coordination, milestone tracking & | 61 |
| ENGR_NOEL_LAVAPIE | Engr. Noel G. Lavapie | Lead Technical & Project Engineering Head | ENGINEERING | engineer | TEMFACIL Main Technical & Project Engineering Office (Lead Standing Desk) | 108.95, 15.20, -104.28 | Checking project emails (Submittals & RFIs), monitoring engineering team (CADD/B | 85 |
| ENGR_ELGINE_MANGCUPANG | Engr. Elgine Mangcupang | QA/QC Engineering Head | QA_QC | qaqc | Main Site Access Corridor (Active QA/QC Field Inspection) | 114.0, 15.30, -91.0 | Directing non-destructive testing (NDT), concrete compressive batch validation & | 108 |
| QC_JAIRUZ_BATAC | Engr. Jairuz O. Batac | QC Engineer II - Tunnel & Geotechnical | QA_QC | qaqc | Surge Tank / Headrace Tunnel Portal Concrete Foundation Bench | -6.0, 18.65, -27.5 | Conducting tunnel convergence rock bolt pull-out tests, shotcrete thickness veri | 130 |
| QC_JIMMY_AQUINO | Engr. Jimmy M. Aquino | QC Engineer - Civil Structures | QA_QC | qaqc | Tailrace Outfall Dry Concrete Walkway & Training Wall | -10.8, 1.70, 12.0 | Performing pre-pour reinforcement inspections, slump testing & rebound hammer no | 152 |
| QC_JHON_JAYME | Jhon Charles C. Jayme | Jr. QA/QC Engineer | QA_QC | qaqc | TEMFACIL QA/QC Materials Testing Laboratory | 141.3, 15.25, -72.9 | Assisting QA/QC material sampling, concrete cylinder curing bath tests & field i | 174 |
| PLANNING_MAY_PARALLAG | Engr. May Ann A. Parallag | Jr. Planning Engineer | ENGINEERING | engineer | TEMFACIL Project Planning & Scheduling Office | 109.58, 15.20, -108.80 | Updating baseline Gantt schedules, critical path delay analysis & weekly S-curve | 196 |
| QS_JOHN_RICK_HERNAEZ | John Rick Hernaez | Quantity Surveyor (QS) | ENGINEERING | engineer | TEMFACIL Quantity Surveying & Cost Control Office (Lead QS) | 108.02, 15.20, -108.80 | Leading BOQ taking-off, interim progress payment valuations & variation order cl | 218 |
| QS_CRISTINE_ALMAZAN | Christine Joy Almazan | Junior Quantity Surveyor (Junior QS) | ENGINEERING | engineer | TEMFACIL Quantity Surveying & Cost Control Office (Junior QS) | 108.80, 15.20, -110.12 | Preparing quantity take-offs (QTO), subcontractor progress billings & cost evalu | 240 |
| SURVEYOR_JOHNNY_FARONGEY | Johnny P. Farong-ey | Surveyor III (Lead Geodetic Surveyor) | ENGINEERING | surveyor | Penstock Ridge Geodetic Sighting Station | 14.0, ground, -22.0 | Executing precision GPS benchmark control, penstock axis layout & dam crest defo | 262 |
| GEO_AMOR_FLORESCA | Amor Floresca | Geomapper (Geological Mapper & Engineering Geologist) | ENGINEERING | geologist | Mountain Slope Rock Cut (Geotechnical & Geomapper Station) | 3.0, ground, -18.0 | Conducting site geomapping, rock mass rating (RMR), joint discontinuity survey & | 284 |
| PCO_JONJON_BUCSIT | Jon-Jon Bucsit | Pollution Control Officer (PCO) | SAFETY | safety | TEMFACIL ESH Command & Environmental Operations Center (Pollution Control Desk) | 115.50, 15.10, -108.90 | Directing site environmental compliance, Pinacanauan river water quality & turbi | 306 |
| DOC_JAYSON_AGGABAO | Jayson Z. Aggabao | Document Controller | ENGINEERING | office | TEMFACIL Document Control Command Center | 110.20, 14.80, -99.15 | Archiving approved submittals, transmittals, RFI logs & managing project drawing | 329 |
| CAD_ELBERT_FIGURACION | Elbert Figuracion | AutoCAD Operator | ENGINEERING | office | TEMFACIL AutoCAD 3D Drafting Station | 111.50, 15.20, -107.62 | Drafting structural as-built revisions, penstock alignment detailing & updating  | 351 |
| CIVIL_JAIME_CANO | Jaime B. Caño Jr. | Supervisor III - Civil Works | CIVIL | supervisor | Powerhouse Entrance Apron & Access Area | 8.0, 1.70, -12.0 | Supervising heavy concrete pouring, tunnel excavation & civil structures alignme | 375 |
| CIVIL_HENRY_ESTRADA | Henry V. Estrada | Supervisor III - Civil Works & 4S | CIVIL | supervisor | Dam Spillway Outfall Bank & 4S Safety Observation Area | -14.0, 1.70, 22.0 | Managing dam spillway batching, formwork structural integrity & civil 4S safety  | 397 |
| TUNNEL_RICHARD_PINASEN | Richard A. Pinasen | Foreman III - Head Tunneling & Underground Works | CIVIL | foreman | Headrace Tunnel Excavation Portal Heading | -8.2, 18.65, -27.0 | Directing headrace tunnel drill-and-blast advance, shotcrete rock support & stee | 419 |
| TUNNEL_RUDY_MARCOS | Rudy C. Marcos | Foreman III - Underground Tunneling Excavation | CIVIL | foreman | Headrace Portal Laydown Staging Area | -10.0, 18.65, -25.5 | Directing daily mucking cycles, ventilation line extensions & tunnel lining stee | 441 |
| FOREMAN_ANTHONY_ROSALES | Anthony B. Rosales | Foreman III - Civil Structures | CIVIL | foreman | Penstock Lower Anchor Block (TB-04) Platform | -4.0, 5.15, -7.5 | Coordinating powerhouse substructure concrete form setting and anchor bolt place | 463 |
| WORKER_BENJAMIN_FOMEGAS | Benjamin C. Fomeg-as | Tunnel Worker III (Lead Jumbo Drill & Rock Support Specialist) | CIVIL | tunnel-crew | Surge Tank / Headrace Portal Jumbo Drill Staging | -4.2, 18.65, -28.5 | Operating twin-boom hydraulic jumbo drill rig for blast holes, rock bolt setting | 485 |
| ESH_ALFREDO_ARIZ | Alfredo T. Ariz | Environmental, Safety & Health (ESH) Head | SAFETY | safety | TEMFACIL ESH Command & Safety Operations Center | 116.00, 15.20, -108.90 | Directing site-wide safety compliance, emergency response protocols & environmen | 509 |
| NURSE_RUSSELLE_ALCANTARA | Russelle P. Alcantara, RN | Project Nurse | MEDICAL | nurse | TEMFACIL Medical Clinic & First Aid Post | 119.20, 15.20, -110.40 | Conducting daily worker health screenings, emergency first-aid care & administer | 531 |
| SEC_RONALD_MALTO | Ronald D. Malto | Security Officer | SAFETY | security | TEMFACIL Perimeter Security Checkpoint Gate | 90.8, 14.35, -64.2 | Patrolling project perimeter, monitoring compound surveillance cameras & access  | 553 |
| HR_ROVIGAIL_ABELLAR | Rovigail Joy G. Abellar | HR Officer | HR | office | TEMFACIL Human Resources Office | 115.80, 15.20, -97.20 | Leading the HR department, managing site timekeeping, employee relations, recrui | 577 |
| HR_JOSHUA_ADMIN | Joshua | Admin Officer | ADMINISTRATION | office | TEMFACIL Administration Office | 117.80, 15.20, -99.30 | Leading Administration Department operations, logistical coordination, gate pass | 601 |
| HR_RANDY_GAMBOA | Randy Gamboa | Admin Assistant | ADMINISTRATION | office | TEMFACIL Administration Office | 119.00, 15.20, -99.30 | Assisting site administrative operations, office records, supplies & documentati | 623 |
| IT_MARC_SALVA | Harrold Salva | IT Support Specialist | IT_SYSTEMS | office | TEMFACIL Communications & IT Server Facility | 111.90, 15.20, -111.48 | Managing site Starlink telemetry links, local server racks, SCADA network relays | 645 |
| EQUIP_HOWELL_SAMSON | Howell Gene E. Samson | Supervisor - Heavy Equipment & Fleet | LOGISTICS | supervisor | TEMFACIL Heavy Equipment Yard & Dispatch Bay | 86.5, 16.00, -94.8 | Directing preventive maintenance schedules, fuel logistics & equipment deploymen | 669 |
| WAREHOUSE_VINCENT_ANDALLO | Vincent Dickenson Andallo | Warehouse Area Lead | LOGISTICS | warehouse | TEMFACIL Warehouse Materials & Spare Parts Facility | 89.5, 16.00, -97.0 | Overseeing bulk cement shipments, rebar deliveries, spare parts inventory & ware | 691 |
| MECH_ANDREW_SILVA | Andrew Silva | Mechanical Supervisor | ENGINEERING | supervisor | TEMFACIL Mechanical Works Engineering Station | 109.90, 15.20, -111.48 | Supervising powerhouse turbine TU-01 scroll case installation, overhead crane lo | 715 |
| SUPT_EUGENIO_HANOPOL | Eugenio D. Hanopol | Superintendent I - Mechanical | ELECTRICAL | management | TEMFACIL Mechanical Superintendent Desk & Powerhouse Unit 1 | 108.10, 15.20, -111.52 | Reviewing mechanical P&ID diagrams, turbine layout submittals & coordinating pow | 737 |
| SUPT_EDUARDO_DEFRANCIA | Eduardo G. De Francia | Electrical Superintendent | ELECTRICAL | management | Outdoor Switchyard & 69kV Substation Bay | 18.0, 1.70, -6.0 | Directing 69kV switchyard construction, step-up transformer bay wiring & high-vo | 760 |
| ELEC_JOSUE_ABELLERA | Josue A. Abellera | Supervisor III - Electrical Works | ELECTRICAL | supervisor | Powerhouse Electrical Gallery & IPB Busduct Yard | 12.0, 1.70, 2.0 | Supervising cable ladder installation, generator feeder conduits & powerhouse au | 782 |
| FOREMAN_WARLITO_DEFRANCIA | Warlito D. De Francia | Foreman I - Electrical | ELECTRICAL | foreman | Powerhouse Control Room & Switchgear Bay | 4.0, 7.35, -2.0 | Leading electrical roughing-ins, switchgear busbar connections & grounding grid  | 828 |
| DOG_BRUNSON_CHUCHU | Brunson "Chuchu" | Site mascot (aspin) | CAMP_SERVICES | (animal) | Warehouse ramp and yard | 90.0, 14.80, -96.0 | Patrols the warehouse and laydown yard | 806 |

Things to know about the registry:

- **Licence numbers, years of experience and provinces are in `people.unverified.json`, which the app does not load.** They came from v1's code. None is shown until the owner confirms it (rule 6).
- v1 places Anthony Rosales twice (`AnimatedSiteEntities.tsx:5229` and `:5344`).
- v1's descriptions mention a "dam spillway" and "Pinacanauan River": the scheme has a weir, on the Tumauini River.
- The registry id `IT_MARC_SALVA` belongs to Harrold Salva; the id is kept so links do not break.
- **Photo audit:** 14 of 35 photo files do not carry the person's name and are left out of `people.json` (list in `review/P00a/REPORT.md`).

## 5. Activity scenes

| Scene | When | Where (v1 frame) | v1 component and line | v2 |
| --- | --- | --- | --- | --- |
| Toolbox meeting, full formation facing the stage | morning | court, 128, -81 | `CourtToolboxMeetingDirector`, `AnimatedSiteEntities.tsx:1999`; v1 labels it "Tuesday 6:30 to 7:40 AM" | keep as a programme block (P09b) |
| Calisthenics | morning | court | inside the toolbox meeting director (not read line by line) | keep (P09b) |
| Basketball, 3 on 3 with spectators | sunset | court | `TemfacilBasketballGame`, `:2299` | keep (P09b, P08d paired clips) |
| Canteen breakfast, water refill, packed lunch | morning | canteen, 150, -81 | `MorningBreakfastWorker`, `MorningWaterRefillWorker`, `MorningBaonWorker`, `TemfacilFacility.tsx:5008` to `5297` | keep (P09b) |
| Canteen lunch, tray wash, pantry porter, servers, seated diners, tray walkers | day | canteen | `DaytimeLunchWorkerDuo` `:5427`, `DaytimeTrayWashWorker` `:5699`, `DaytimePantryPorter` `:6068`, `CanteenSeatedDiner` `:2843`, `CanteenAteServer` `:3147`, `CanteenTrayWalker` `:3782` | keep (P09b) |
| Staff-house dining for staff and heads | day | staff house, 130, -107 | `StaffHouseLoungeDining` `:7552`, `PlanningControlHeadOfficeLunch` `:7338` | keep (P09b) |
| Kitchen cooking | meal times | staff-house kitchen and barracks kitchen | `ProfessionalStaffKitchenWorker` `:2263`, `AnimatedBarracksChef` `:6899`, pots `:4011` to `4248` | keep (P09b, P12a steam) |
| Barracks evening life: phone, smoking, chatting pairs, laundry, lounging | night | barracks, 155, -107 | `NighttimeSmartphoneWorker` `:4537`, `NighttimeSmokingWorker` `:4681`, `NighttimeKwuntuhanDuo` `:4821`, `NighttimeLaundryWorker` `:6436`, `NighttimeLoungingWorker` `:6808` | keep (P09b) |
| Night watchmen with torches | night | perimeter and warehouse | `RovingNightWatchmen`, `AnimatedSiteEntities.tsx:2516`; `GuardFlashlights`, `MountainAtmosphereEffects.tsx:659` | keep (P09b) |
| Gate inspection of each vehicle | all day | gate, 92, -67.5 | `AnimatedSecurityGateOfficer` `:3222`, checkpoint state machine `:3920` | keep (P09b, P10b) |
| Fence patrol by two guards | all day | camp perimeter | `PerimeterSecurityPatrol.tsx` | keep (P09b) |
| Warehouse operations | day | warehouse apron, 88, -96 | `WarehouseDynamicOperations`, `AnimatedSiteEntities.tsx:4994` | keep (P09b) |
| Welding bay, shovelling at the stockpile, rebar tying | morning and day | laydown yard: (82, -96), (69, -114), (70, -102) | `ActiveConstructionWorkerMesh`, `:2684`, placed at `:5403` to `5420` | keep (P09b, P12a sparks) |
| Tailrace QC inspection | day | tailrace wall, -10.8, 12 | `TailraceCivilQCEngineer`, `:4687` | keep (P09b) |
| Tunnel crew through the five-stage cycle | continuous | tunnel heading | `TunnelPersonnelCrew.tsx`, `TunnelFaceCycleActors.tsx` | keep (P09c) at Tunnel 2 |
| Office work at desks; executives on verandas at sunset and night | office hours | site office | `TemfacilHeadquartersWorkforce`, `TemfacilFacility.tsx:723`; `DaytimeExecutiveAndAdminStaff`, `AnimatedSiteEntities.tsx:2593` | keep (P09b) |
| Office doors open by hour | 07:00 to 17:00 | site office | `AnimatedOfficeEntranceDoor` `:1752`, `AnimatedOfficeBackDoor` `:2189` | keep (P09a clock) |

Activities photographed on site that v1 does not have (reference index): formwork and rebar installation, concrete pouring by lift with a boom pump, trashrack installation, shotcrete spraying, tunnel invert and wall lining, steel rib installation, penstock grinding and painting, hand-rail welding, lean concreting, excavation, pedestal pours, backfilling, block laying and plastering. These are the station list for P09b.

## 6. Vehicles and routes

Routes are in `routes.json` with their stops.

| Vehicle | v1 component (line) | Route | Cycle | v2 |
| --- | --- | --- | --- | --- |
| Dump truck | `SCICHeavyDumpTruck` (`AnimatedSiteEntities.tsx:2788`) | `powerhouse.dump-truck`, 43 points, loop | Loads at the powerhouse "quarry hub", stops at the gate, tips at the camp stockpile (bed to 0.48 rad for 4 s) | upgrade (P10) |
| Crew van | `ToyotaHiaceCrewVan` (`:3098`) | `powerhouse.crew-van`, 40 points, loop | Boards at the powerhouse, gate, drops at the office | upgrade (P10) |
| QA/QC pickup | `SCICSitePickupTruck` (`:2934`) | `powerhouse.qaqc-pickup`, 43 points, loop | QA/QC bay, gate, switchyard stop, tailrace stop, back | upgrade (P10) |
| Safety patrol pickup | same model | `powerhouse.safety-patrol`, 34 points, loop | Tool shed check, gate, road check | upgrade (P10) |
| Parked pickup | same model | static at 77, -95 | | upgrade |
| Two motorcycles | `PhilippineSiteMotorcycle` (`:3033`) | static at (108, -56), (112, -56) | | upgrade |
| Tunnel loader, muck truck, drill jumbo, shotcrete rig | `TunnelFaceCycleActors.tsx` | inside the tunnel | The face cycle | upgrade (P09c, P10) |
| Supercar | `SupercarEntity.tsx` | parked at 116.5, -90.5; drivable | Lab feature | drop |
| Walkers | | `powerhouse.walk.admin-circuit`, `powerhouse.walk.road-shoulder` | Three pedestrians on fixed loops | drop the loops (navmesh, P09a); keep as desire lines |

Seen in the site photographs and not in v1: tracked excavators, a red truck-mounted boom pump, a portable mixer, a volumetric concrete plant, a crusher.

## 7. Animals

| Animal | Count | Positions (x, z) | v1 component (`ForestWildlife.tsx` line) | v2 |
| --- | --- | --- | --- | --- |
| Carabao | 4 | (52, -148), (62, -152), (42, -145), (18, -48) | `RealisticPhilippineCarabao` 99 | upgrade (P11) |
| Philippine eagle | 2 | orbits centred (25, -20) at 65 m and (-20, -60) at 72 m | `RealisticPhilippineEagle` 315 | upgrade |
| Rufous hornbill | 3 | (-22, 14), (38, -38), (-12, -75) | `RealisticRufousHornbill` 390 | upgrade |
| Philippine brown deer | 3 | (-38, -58), (-46, -65), (-52, -50) | `RealisticPhilippineDeer` 588 | upgrade |
| Wild boar | 3 | (72, -135), (78, -142), (84, -138) | `RealisticPhilippineWildBoar` 715 | upgrade |
| Long-tailed macaque | 2 | (32, -18), (42, -22) | `RealisticPhilippineMacaque` 937 | upgrade |
| Goat | 3 | (45, -72), (38, -78), (52, -84) | `RealisticPhilippineGoat` 986 | upgrade |
| Monitor lizard | 2 | (-18, 22), (18, 25) | `RealisticMonitorLizard` 1076 | upgrade |
| Aspin dog | 4 | courtyard, gate, warehouse ramp (Chuchu), forest trail | `RealisticPhilippineAspinDog` 1124 | upgrade; Chuchu stays a named animal |
| Storks | flock | above the river, about (8, 76, 18) | `SierraMadreStorkFlock.tsx` | upgrade |
| Swallows, a high raptor | flock, 1 | sky | `MountainAtmosphereEffects.tsx:192, 424` | upgrade |
| Horse | 1 | trail near (-14, 24.5, -22) | `HighlandTrailHorse.tsx` | upgrade |

P11a checks each species against what lives in the Sierra Madre foothills of Isabela before modelling it.

## 8. Effects

| Effect | v1 component (line) | v2 |
| --- | --- | --- |
| River mist | `NaturalRiverSurfaceMist`, `MountainAtmosphereEffects.tsx:111` | upgrade (P12a) |
| Tailrace aeration steam | `TailraceAerationSteam`, `:141` | upgrade |
| Cumulus clouds | `PhotorealisticMountainCumulus`, `:254` | upgrade (P03b) |
| Switchyard heat shimmer | `SwitchyardHeatShimmer`, `:376` | upgrade (noon only) |
| Fireflies | `BioluminescentForestFireflies`, `:845` | upgrade |
| Shooting stars | `CelestialShootingStars`, `:925` | upgrade (rare) |
| Aviation strobe on the surge tank | `SurgeTankAviationStrobe`, `:958` | keep only if the real tank has one (ask in P05d) |
| Rain | `RainParticles`, `PlantScene.tsx:501`; storm from PAGASA signal or the simulate button | upgrade (P03d) |
| Energy-flow line | `EnergyFlowParticles`, `PlantScene.tsx:463`; path in `flow-path.json` | upgrade into "follow the water" (P13) |
| X-ray wireframe | `isXRay` through the structures | upgrade into the section tool (P13c) |
| Room, vehicle and yard lights at night | `:461, 511, 990` | upgrade (P03b light pool) |
| Cooking steam and burner flame | `TemfacilFacility.tsx:3950, 3983` | upgrade |
| Welding arc and sparks | `ActiveConstructionWorkerMesh`, `AnimatedSiteEntities.tsx:2684` | upgrade |
| Tunnel dust, seepage drips, puddles, blast flash and camera shake, light beams | `Tunnel*.tsx` | upgrade (P05e, P12a) |
| Bloom, brightness and contrast, SMAA; ACES tone mapping; fog by time of day | `PlantScene.tsx:2103, 2005` | upgrade (AgX, AO, P12a) |

## 9. Interface

| Control | Where | v1 line (`PlantScene.tsx`) | v2 |
| --- | --- | --- | --- |
| Page header "Digital Twin", "Architectural model" tag, orbit hint, "Active Control" chip | top | `app/(dashboard)/digital-twin/page.tsx` | upgrade (P13a) |
| Philippine time chip | top left | 592 | keep (clock, P01b) |
| Sound controls | top left | `SiteAudioControls.tsx` | keep (P12b) |
| Weather chip (clear, tracking, typhoon, simulation) | top left | 2868 | keep, with the source shown (P03d) |
| Commissioning percent and MW chip | top left | 2905 | drop (not real) |
| Equipment counts chip (online, maintenance, critical, total) | top left | 2920 | upgrade (P14a): real records only |
| Free-navigation or preset chip | top left | 2944 | drop the lock idea: navigation is always free |
| Alerts and logs panel | top right | 2132 | upgrade (P14a): fixed log times dropped |
| Equipment drawer | top right | `EquipmentDetailDrawer.tsx` | upgrade |
| Facility navigation card: 10 preset buttons | bottom left | 3027 | upgrade into Places (P13a) |
| Time of day: morning, afternoon, sunset, night | bottom left | 3161 | upgrade into a 24-hour clock |
| Zoom in, zoom out, reset | bottom left | 3220 | keep |
| X-ray toggle, labels toggle | bottom left | 3255 | upgrade (layers) |
| Personnel roster, Supercar, GTA mode, Locomotion Lab, typhoon simulation | bottom left | 3280 | roster kept (P13b search); the rest dropped or moved to tools |
| Model badge "11.3 MW THEPP" | bottom centre | 3329 | drop |
| Performance chip (fps, ms, calls, triangles) | bottom right | 3335 | keep behind `?debug=1` |
| Tunnel face-cycle HUD | overlay | `TunnelFaceCycleHUD.tsx` | upgrade (P09c) |
| Person card and profile modal | overlay | `PersonnelInfoCard.tsx`, `PersonnelProfileModal.tsx` | upgrade (P09d) |
| Keys: WASD, arrows, space, Q, shift; wheel zoom to cursor; double-click focus | canvas | 1568 to 1736 | keep; Escape returns to the overview |
| URL `?preset=<key>` and the `plant-scene-select-preset` event | | 2572, 2690 | keep: mapped to `?place=` |

All 31 camera presets are in `cameras.json` with v1 keys, positions and targets (`PlantScene.tsx:1437`): overview, turbine-hall, switchyard, tailrace-floodgate, eight headrace-tunnel views, temfacil, temfacil-guardhouse, temfacil-patrol, temfacil-barracks, temfacil-canteen, temfacil-office, temfacil-office-interior and ten office zones, wildlife-storks, highland-horse. `headrace-tunnel-normals` is a debug view and is marked to drop. Ten have buttons; the rest are reached by URL or by clicking.

## 10. Every number shown to the user

"v1 literal" means the figure exists only as text in v1's code. Those are not shown in v2 until a record or drawing supports them.

| Shown | Value | Where (v1 line) | Source | v2 |
| --- | --- | --- | --- | --- |
| Plant capacity | 11.3 MW | beacon `PlantScene.tsx:1338`, badge `:3329`, penstock label `:1290` | DED title block (R1) | keep |
| Unit sizes | "8.5 MW" and "2.8 MW" in comments; equipment name "Unit 1 (5.65 MW)" | `PowerhouseGeometry.tsx:345, 369`; `PlantScene.tsx:2257` | v1 literal; the two disagree with each other | drop until a mechanical drawing gives them |
| Units | "2x Francis" | `:1339` | v1 literal; the deck names spiral casings, so Francis is likely | confirm from a mechanical drawing |
| Speed | 600 RPM | `:1340` | v1 literal | drop |
| Grid | "69kV Online" | `:1341` | v1 literal; the plant is not commissioned | drop |
| Powerhouse elevation | "EL. 0.5m MSL" | `:1329` | wrong: the yard is EL 188.04 m, the turbine floor EL 188.24 m | replaced by real levels |
| Powerhouse coordinates | 17.0621 N, 121.8410 E | `:1330` | wrong: about 31 km away. Real: 17.3163 N, 121.9720 E (`locations.json`) | replaced |
| Camp elevation and coordinates | "EL. 14.0m MSL", 17.0654 N, 121.8471 E | `:1385` | wrong: the camp is at about 17.3187 N, 121.9749 E | replaced |
| Surge tank | "EL. 271.46m, 16-lift concrete shaft" | `:1244` | matches the penstock plan (EL 271.465) and the decks (16 lifts) | keep |
| Penstock | "2.70m steel penstock", "32 degree" trench | `:1249` | diameter matches the penstock plan; the angle is a v1 literal | keep the diameter |
| Floodwall crest | "EL. 195.50m" | `PowerhouseGeometry.tsx:1341` | v1 literal | confirm |
| Camp badges | "28 On-Duty", "4 Logistics", "Active Sentry", "Operational" | `PlantScene.tsx:1394` | v1 literals | drop |
| Output | `11.3 x flow x commissioned share` MW | `:2803` | computed from nothing real | drop |
| Commissioning percent, equipment counts | from the equipment list | `:2777` | real when the database answers; otherwise from `DEFAULT_EQUIPMENTS` | keep for real records only |
| Default equipment list | 10 items with makers, models, serial numbers, ratings (for example "15 MVA", "45 m head", "14.2 m3/s") | `:2252` | v1 literals, invented | drop |
| Log times | "14:35 PM", "09:15 AM", "11:10 AM" | `:2159` | v1 literals | drop |
| Tunnel | "3.2m D-shape", chainage from STA 1+200, round advance 2.0 m, 45-hole pattern, stage durations | `PlantScene.tsx:1252`, `TunnelFaceCycleTypes.ts` | v1 literals and the tunnel brief (general practice, not this project) | chainages from the decks; the rest carries a "Simulated" tag |
| Generator set | "500 kVA" | `SiteElectricalDistribution.tsx:126` | v1 literal | drop the rating |
| Poles | P0 to P6 labels | `poles.json` | v1 literals | internal names only |
| Person fields | licence, years of experience, province | profile modal | v1 literals | hidden until confirmed |
| Performance | fps, ms, draw calls, triangles | `:2500` | measured live | keep in debug |
| Time | Philippine time | `:567` | the clock | keep |
| Storm signal | PAGASA signal number and storm name | `:2761` | live from `/api/weather/pagasa-signals` | keep |

## 11. What the public page can reach

`getEquipmentByLocation` (`app/(dashboard)/dashboard/sitemap/actions.ts:31`) is called by the public page and runs with `requireAuth` false, so a signed-out visitor receives, for every plant equipment record of the project:

- the whole equipment row: `id`, `projectId`, `equipmentTag`, `name`, `category`, `manufacturer`, `model`, `serialNumber`, `installationDate`, `commissionDate`, `location`, `siteLocationId`, `positionX`, `positionY`, `zone`, `status`, `condition`, `specifications` (free JSON), `createdById`, `createdAt`, `updatedAt`;
- the linked site location row: `id`, `projectId`, `slug`, `name`, `description`, `percentComplete`, `status`, `createdAt`, `updatedAt`;
- the three newest maintenance logs: `id`, `equipmentId`, `loggedById`, `type`, `description`, `findings`, `actionTaken`, `nextServiceDue`, `createdAt`.

More than a public twin needs: serial numbers, internal user ids (`createdById`, `loggedById`), and free-text `findings` and `actionTaken`. P14a replaces this call with one that selects only the fields shown. This was read from the code and the schema; the live response was not captured.

## 12. Licence audit of shipped assets

| File (under `public/`) | Used by v1 | Origin | Licence | v2 |
| --- | --- | --- | --- | --- |
| `models/hdri/lebombo_1k.hdr` | yes | "Lebombo", Greg Zaal, Poly Haven (`CREDITS.md` beside it) | CC0 | may be reused |
| `models/characters/scic_atlas_navigator_pro.glb`, `.web.glb` | national map | Three Sketchfab models, Mesh2Motion and Mixamo clips (`models/characters/CREDITS.md`) | CC BY 4.0, CC0, Mixamo terms | fallback body base (risk table); credits carried over if used |
| `models/characters/scic_atlas_navigator.glb`, `scic_atlas_engineer.glb`, `scic_civil_foreman.glb` | foreman: yes | Exported from Blender 5.2 in this project; no source noted | not established | replace in v2 |
| `models/characters/*.blend`, `*.blend1` (5 files, 9 MB) | no | Blender working files, served publicly by mistake | | not v2's to move; flagged in the report |
| `models/characters/michelle.glb` | no | Matches the three.js example of the Mixamo character Michelle | Mixamo terms; redistribution unclear | replace in v2 (not used) |
| `models/characters/readyplayer.me.glb` | no | Ready Player Me (stated in the file) | Ready Player Me terms | replace in v2 (not used) |
| `models/characters/security_patrol.glb` | yes | Exporter signature of the three.js example soldier; no note | not established | replace in v2 |
| `models/ferrari.glb` | yes | Matches the three.js example Ferrari 458 Italia | believed CC BY (three.js examples credit vicent091036); not confirmed | not ported (Lab feature) |
| `models/wildlife/horse.glb`, `stork.glb` | yes | Exporter signature of the three.js example animals | not established | replace in v2 |
| `models/wildlife/philippine_carabao.glb`, `philippine_eagle.glb`, `philippine_wild_boar.glb` | yes | Exported from Blender 5.2 in this project; no source noted | not established | replace in v2 |
| `models/architecture/*.glb` (6), `models/props/*.glb` (3) | yes | Exported from Blender 5.2 in this project (procedural scripts) | in-house | replace in v2 (below the quality bar) |
| `models/tumauini_powerhouse.glb` | yes | Generated with trimesh in this project | in-house | replace in v2 |
| `textures/*.png`, `*.webp` (trees, grass, canal, canteen food; 14 files) | yes | No note anywhere in the repo | not established | replace in v2 |
| `textures/faces/<PERSON>.png` (10) | yes | Face textures of named staff, presumably from their photographs | personal images | P07c decides with the owner; not reused without consent |
| `textures/faces/GENERIC_*.png` (6), `textures/faces_stock/*.jpg` (6), `textures/head_planning_engineer.jpg` | yes | Stock or generated faces; no note | not established | replace in v2 |

Origin was judged from the metadata inside each GLB and the two existing credits files. Nothing was traced back to a download page, so "matches the three.js example" is a likelihood, not proof. No v1 asset is copied into `public/models/twin/`; `public/models/twin/CREDITS.md` starts empty and gets a row per asset from P02a.
