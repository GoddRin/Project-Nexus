# P05. Hydro works

Eight sessions. P05a to P05f build the `powerhouse` location and the tunnels; P05g and P05h add the upstream locations `weir` and `midway`. Model every structure from the photographs in `assets-src/twin/reference/photos/` and the drawings in `reference/INDEX.md`; v1's shapes are a fallback only where no reference exists.

What the powerhouse really looks like: grey reinforced-concrete substructure with expressed columns, white-clad upper storey, blue corrugated roof with six translucent skylight panels, a lower lean-to annex with its own blue roof, steel portal frame with purlins, set in a tight rock-cut with a white shotcreted slope behind and the black penstock arriving from the hill.

Dimensions come from the references first and `INVENTORY.md` second. Every capacity, rating, tag and elevation shown on a model or label comes from the inventory, never from memory.

Common to every sub-phase here:

- **Read first:** `QUALITY-BAR.md` sections 1, 2, 6; the inventory rows for the subject; any drawings or photos in `reference/`.
- Gather 3 or more reference photos of the real type of structure (run-of-river powerhouse, 69 kV outdoor switchyard, steel penstock, and so on) into `reference/<subject>/`.
- Model in `site_master.blend` under the zone collection; trim sheets and shared atlases from `LIB_materials`; three LODs; `check_asset.py`; export; build; place; capture at four moments.
- Tag pickable equipment with `pick` ids equal to the equipment tags Nexus stores (`PlantEquipment.equipmentTag`), so P14 can attach real records.
- Add `STN_` empties wherever a person would work (P09 uses them) and `lights` records for every lamp.

Shared material library to build in P05a and reuse after: board-marked concrete, smooth formed concrete, shotcrete, CHB plastered, corrugated GI (new, weathered, rusted), painted structural steel (SCIC green, safety yellow, grey primer), galvanised steel and grating, checker plate, stainless, glass, rubber, HDPE pipe, cable insulation, ceramic insulator, gravel surfacing, asphalt, timber formwork ply, scaffold tube.

## P05a. Powerhouse exterior and yard

**v1 source.** `RealisticPowerhouseBuilding` (`PowerhouseGeometry.tsx` 224), `AccessRoad`, `PerimeterFence`, `Cistern`.

**Build.** Reinforced-concrete substructure and superstructure with visible lift lines and tie-hole pattern; steel roof trusses, purlins and GI roofing with ridge vent; roller door and personnel doors; louvres; downpipes and gutters; external stairs, handrails, ladders with cages; crane beam corbels showing through; transformer bund; drainage sump; cable trench with covers; yard slab with joints, bollards, lighting poles, fence and gate; signboard with the project name and the SCIC wordmark; fire-water tank and hose reels; safety signage.

**Pass when.** Structure checklist; footprint and height match inventory; exterior LOD0 within budget; night capture shows yard lamps and lit louvres.

## P05b. Turbine hall interior

**v1 source.** Turbine and generator markers in `PlantScene.tsx` (`turbineLayoutPositions`, `TurbineRunnerSpinner`), `ElectricalBusSystem` (1838).

**Reference.** `reference/INDEX.md` R1 is the layout authority: three levels (turbine floor EL. 188.24 m with a lower pit at EL. 183.54 m, ground floor, second floor), a 31.5 m hall, two units of different sizes each with an inlet bend, spiral case and generator alongside, and a second floor with control room, office, pantry and toilet. Confirm the shaft orientation of the units from a mechanical drawing or a site photo before modelling them; if neither is available, ask the owner. Mount the nine CCTV cameras where the drawing puts them.

**Build.** Machine hall floor with the two units from the reference and inventory: spiral case tops, generator housings with slip-ring covers, governor oil units, inlet valves below floor level seen through gratings, cooling-water pipework colour-coded with flow arrows, overhead travelling crane with hook and pendant, control room with windows onto the hall (desks, operator screens, mimic panel), switchgear and control cabinets in line-ups with tags, cable trays and ladders, floor markings, lay-down area, tool boards, fire extinguishers, emergency lighting, ventilation fans, drainage gallery stair.

Moving parts are separate nodes: crane bridge, trolley and hook; generator shaft visible at the coupling (rotates with unit status); cabinet doors; indicator lamps (emissive, driven by status in P14).

**Section view.** Author a cutaway set: with `layers.section` on, the near wall and roof hide and cut faces show hatched concrete, so the hall can be inspected from outside. This replaces v1's X-ray shader.

**Pass when.** Interior loads only inside its stream distance; inside the hall Medium budget holds; exposure adapts on entering; every tagged item is pickable.

## P05c. Switchyard and site electrical

**v1 source.** `RealisticSwitchyard` (665), `ElectricalBusSystem`, `DynamicTransmissionSpan` (1980), `TransmissionTakeoffTower` (2053), `SiteElectricalDistribution.tsx`, `data/poles.json`, `data/flow-path.json`.

**Build.** Step-up transformer with radiators, conservator, bushings, oil-containment bund and firewall; circuit breaker; disconnect switches; surge arresters; instrument transformers; busbars and droppers; steel gantries; post insulators; earthing strips to a visible grid riser; crushed-stone surfacing; cable trenches; control kiosk; palisade fence with danger signs; lightning masts; yard floodlights. Take-off tower and first spans of the transmission line with sagging conductors that sway in wind. Site distribution: genset in an enclosure, roadside poles with crossarms, insulators, pole-mounted transformer and service drops to the camp, following `poles.json`.

**Energy-flow layer.** Rebuild v1's animated flow line as a subtle pulse travelling along the real conductors and penstock when `layers.energy` is on; speed and brightness tied to output (real or labelled simulated in P14).

**Pass when.** Conductors have believable sag and clearances; no part floats; night capture reads correctly; pickable tags in place.

## P05d. Waterways: penstock, surge tank, tailrace, flood protection

**v1 source.** `RealisticPenstockAssembly` (2224), `PenstockTrenchWalls` (2408), `RealisticSurgeTank` (2128), `SurgeTankHillside` (2334), `TailraceWater`, `TailraceFloodwall` (1329), `TailraceFloodgate` (1786).

**Build.** Steel penstock in can sections with weld seams, stiffener rings, expansion joints, saddle supports and anchor blocks, a manhole, coating with site wear; trench with shotcrete slopes, drains and an inspection stair with handrail. Surge tank with lift lines, access ladder and cage, platform, vent, aviation light. Tunnel portal structure with headwall and wing walls. Tailrace channel with training walls, stoplog slots, gate hoists and rails, water-level staff gauge, safety chains and life-buoy posts. Floodwalls and floodgates with seals and operating gear.

Gates and hoists are separate nodes that can animate. Leave a clean seam with P03c water.

**Pass when.** Penstock alignment and slope match inventory; structures meet terrain without gaps; water meets walls correctly at normal and flood levels.

## P05e. Headrace tunnels 1 and 2

**What is real.** There are two tunnels. Tunnel 1 is about 2.58 km (Sta. 0+021 to 2+579), driven from an inlet portal and an adit at the weir side and from an outlet portal at the midway side; in 2026 it is being lined (initial and final shotcrete with fibre, wall lining, invert slab). Tunnel 2 is about 535 m and is still being excavated by drill and blast from its outlet in poor ground, with steel rib sets, wire mesh and top lagging. Photos show a conglomerate of rounded boulders in a matrix at some faces, grey-green rock at others, steel arch ribs, standing water on the invert, workers in green and red hard hats.

**Build as locations `tunnel1` and `tunnel2`.** Neither is modelled at full length:

- `tunnel1.inlet-drive` and `tunnel1.outlet-drive`: about 120 m of interior from each portal, showing lining work: shotcrete zone, wall-lining formwork and pours, invert slab pours with a transit mixer, the real chainage stencils.
- `tunnel2.drive`: about 120 m ending at the active face. This is where the drill-and-blast cycle is staged (P09c).

The four-zone method below applies to both; choose zones per drive to match the stage on the project date.

**v1 source.** `TunnelSegment.tsx`, `TunnelGeometry.ts`, `TunnelShaderMaterial.ts`, `TunnelLighting.tsx`, `TunnelWaterSeepage.tsx`, `TunnelDustParticles.tsx`, `TunnelChainageMarkers.tsx`, `TunnelFaceCycleTypes.ts`, `docs/tunnel-scene-brief.md` (read in full).

**Build.** Keep the tunnel alignment, length and D-shaped profile from v1. Replace the single blended shader with modelled, textured sections for the four zones in the brief:

1. Active face: fractured rock with drill-hole half-barrels, paint marks, muck pile.
2. Ribs and mesh: steel arch sets, welded mesh, rock-bolt plates, timber blocking, chalk rock-class notes.
3. Shotcrete: rough sprayed texture, fibre glints, seepage stains, weep pipes, stencilled chainage.
4. Final lining: formed concrete with joints and invert.

Zone boundaries move with the face-advance value, so build each zone as repeating ring modules that instance along the alignment; the face and muck pile are movable set pieces. Services along the whole drive: ventilation duct on hangers, air and water lines, cable brackets, string lights, floodlight tripods, refuge bay, signage, drainage channel with flowing seepage, puddles.

Lighting: no sunlight past the portal; the fixed light pool gives the tunnel its own lamps; dust in the beams; exposure adapts.

Keep `FaceCycleStage`, `FaceCycleState` and `FaceCycleConfig` as the contract; P09c drives it.

**Pass when.** A walk from portal to face shows all four zones with correct order and transitions; inside the tunnel Medium budget holds; changing the advance value moves the zones without rebuilding geometry.

## P05f. Construction-stage kit

**Why.** The owner asked to see workers building the powerhouse. That needs things to build.

**Build.** A kit of stage assets and, for the powerhouse and at least one camp building, stage variants tagged with `stage` in zone placements:

- Excavation: cut faces, sump with pump, access ramp, survey pegs and batter boards.
- Rebar: mats, column cages, starter bars with caps, bar chairs, tie-wire coils, bar bundles on timbers, bending and cutting bench.
- Formwork: ply panels with walers, soldiers and props, tie rods, release-oil staining, kickers, column boxes, access scaffolds with ladders, toe boards and green netting.
- Concrete: fresh pour areas (wet, darker), vibrator and hose, screed rails, curing blankets and ponding, stripped faces with fresh tie holes, cube moulds, slump cone.
- Steel erection: trusses on the ground, bolted connections, a part-sheeted roof.
- General: tower light, welding sets, gas cylinders in a cage, spoil and aggregate heaps, cement store, water tank, barricades, safety nets, toolbox-talk board, waste skips.

- Temporary works seen in the monthly reviews: ring scaffold and climbing formwork for the surge tank lifts; river diversion channel and rock-armoured cofferdam; dewatering pumps and a siltation pond; slope stabilisation with shotcrete and mesh; safety barricades at portals; pipe laydown with temporary supports and on-site pipe fabrication (fit-up, full welding, grinding, blasting and painting); the explosives magazine compound; access-road cross drains and landslide clearing.

Each structure defines which parts exist at which `StageId`. Changing `stage` in the store cross-fades parts in and out. Stage sequences follow `data/history.json`, so the powerhouse goes: rock excavation and dewatering (from December 2024), raft footings by unit (from September 2025), walls and columns, structural steel and roofing (from October 2025), architectural works, electromechanical installation.

## P05g. Weir location: weir, intake, desander

**Needs.** P05f; `weir` coordinates in `data/locations.json`; reference photos.

**Read first.** `reference/INDEX.md`; `assets-src/twin/reference/photos/weir/`; P03a, P03c, P03d (terrain, water and weather systems to reuse).

**Build.**
1. Terrain for the `weir` location with the P03a tools; the river here is wide, clear green water over cobbles and boulders, with gravel bars.
2. **Weir:** concrete overflow section across the river with a low-flow notch spilling water, sluiceway with four gates and gantry, energy-dissipation apron, left abutment in RCC built in segments, retaining and flood walls (flood wall at Elev. 303).
3. **Intake:** structure with two gates, trashracks and their guide frames, feeder canal to the desander.
4. **Fish pass:** stepped channel beside the weir.
5. **Desander:** long multi-cell basin in nine segments with dividing walls, inlet and outlet platforms, flushing channel, control room, and the transition into Tunnel 1.
6. **Tunnel 1 inlet portal and adit portal:** headwalls, canopy, ventilation fan and duct, barricades, signage.
7. Water: P03c water system set up for a ponded reach above the weir, the overflow nappe and plunge, sluice discharge, flow through the intake and desander cells when commissioned, dry cells before.
8. Construction stages from `history.json`: river diversion and cofferdam (2024 to 2025, including typhoon damage and restoration), excavation, segment-by-segment pours, gate installation.
9. Stations for every activity photographed there (formwork, rebar, pours, trashrack installation, gate erection).

**Pass when.** Structure checklist; side-by-side with the drone photographs; the water path reads correctly from river to tunnel; location holds the Medium budget.

## P05h. Midway location: Tunnel 1 outlet, pipe bridge, Tunnel 2 inlet

**Needs.** P05g; `midway` coordinates.

**Build.** Terrain for `midway`; Tunnel 1 outlet portal; the headrace pipe leaving the portal on supports; the pipe bridge with wing walls built in lifts, piers and a catwalk with handrails; Tunnel 2 inlet portal; the access road AR04 bench; a small temporary facility (workers' barracks at Tunnel 1, compressor and genset shed, batching for shotcrete). Stages: portal development, pipe fabrication at the laydown, lift-by-lift wing walls, pipe stringing.

**Pass when.** Structure checklist; photographs side by side; the pipe line is continuous from portal to portal.

**Pass when.** Stepping the powerhouse through every stage shows a coherent build sequence; stage change costs no hitch over 50 ms; stations for rebar, formwork, pour and finishing exist at the right stages.
