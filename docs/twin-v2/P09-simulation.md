# P09. Workforce simulation

Four sessions. The site runs like a real shift, hour by hour, from data rather than hand-placed scenes. v1 scripts each scene as its own component (`CourtToolboxMeetingDirector`, `TemfacilBasketballGame`, `RovingNightWatchmen`, `CanteenRoutineWorker`, and so on); v2 expresses the same life as stations, activities and a programme.

## P09a. Simulation core: clock, navmesh, stations, agents

**Needs.** P06d, P07d, P08c.

**Read first.** `CONTRACTS.md` 4.3 to 4.8; `sim/clock.ts`; `public/models/twin/nav/walkable.glb`; v1 `uphillRoadConfig.ts` (obstacle avoidance it implements) and `personnelLocations.ts` (live position registry the UI used).

**Steps.**
1. Install `recast-navigation` and its three.js helpers. `scripts/twin/build-navmesh.mjs` bakes navmeshes from the walkable surface plus building floors, stairs and ramps, with off-mesh links for doors and ladders; outputs `public/models/twin/nav/site.navmesh.bin`. Separate agent sizes for people and for vehicles on roads.
2. `sim/world.ts`: plain TypeScript, no React, no three.js scene objects. Holds agents in typed arrays (position, heading, speed, state, activity, station, LOD hints). Fixed 10 Hz tick with interpolation for rendering.
3. `sim/stations.ts`: loads `stations.json`; tracks occupancy; answers "nearest free station for role R doing activity A, valid now, in this weather and stage".
4. `sim/agent.ts`: each agent runs a small goal stack: travel to station, enter, perform activity for a sampled duration, exit, pick next from the programme. Travel uses navmesh paths and crowd avoidance; walking pace varies by person and time of day.
5. Doors open for an approaching agent and close after; stairs and ladders switch locomotion clips through off-mesh links.
6. **Determinism:** the world state at clock time T is a pure function of (seed, date, T, weather). Implement by simulating from the last schedule boundary with a seeded generator, so a shared link shows the same moment and scrubbing the clock lands people in sensible places (fast-forward the sim without rendering).
7. Bridge to rendering: `characters/crowd.ts` reads agent arrays each frame; the animation controller receives activity and locomotion intents.
8. Live position lookup for UI (`sim.locate(personId)`), replacing v1's global maps.
9. Debug overlay under `?debug=1`: navmesh, paths, station occupancy, agent state labels.
10. Unit tests (`sim/__tests__/`): station allocation never exceeds capacity; determinism (same inputs, same positions); no agent off the navmesh after a 24-hour run; scrub lands every agent at a valid place.

**Pass when.** Tests pass; 120 agents tick in under 1.5 ms average on the laptop; a debug run shows people walking believable routes through doors and up stairs.

## P09b. Daily programme and role behaviour

**Read first.** `INVENTORY.md` people and activity tables (what v1 has each named person doing and where); `data/people.json`; `P08` clip catalogue.

**Real workforce.** The latest monthly review counts 473 people on site: management 7, staff 45, superintendents, supervisors and foremen 19, equipment-department staff 17, skilled 252, non-skilled 45, operators and drivers 59, security 15, subcontractor 14. Direct labour is split across work fronts (for example Tunnel 1 about 121, weir about 61, powerhouse and switchyard about 40, desander 32, surge tank 24, Tunnel 2 and pipe bridge 38, penstock 17). `crew.json` keeps these proportions and assigns each crew member a home location; each tier shows as many as its budget allows, never fewer than the gang a work front needs to look staffed. People belong to a location: they do not walk between locations, they arrive and leave by crew vehicle at shift change.

**Real activities to stage** (from the photo captions; each needs stations at the structure it happens on): formwork and rebar installation, concrete pouring by lift, vibrating and finishing, trashrack and gate installation, shotcrete spraying with fibre, tunnel invert and wall-lining pours, drilling, charging, blasting and mucking, steel rib and mesh installation, penstock fit-up, welding, grinding and painting preparation, radiographic testing of joints, hand-railing installation, lean concreting, excavation and dewatering, equipment-pedestal pours in the switchyard, backfilling and compaction, CHB laying and plastering, structural steel and roofing, pipe fabrication at the laydown, landslide clearing on the access roads, survey.

**Steps.**
1. Place `STN_` empties in the master scene for every activity below and export `stations.json`. Complete `activities.json`.
2. Write `programme.json`. Base programme (adjust to what v1's labels state, for example the toolbox meeting window and office door hours):

| Time | Day shift | Office staff | Night shift | Camp services |
| --- | --- | --- | --- | --- |
| 04:30 to 05:30 | Asleep; early risers wash | Asleep | Tunnel work | Kitchen lights on, cooking |
| 05:30 to 06:30 | Wake, wash, breakfast queue, eat | Wake, breakfast at staff house | Tunnel work | Serve breakfast |
| 06:30 to 07:10 | Toolbox meeting on the court: formation, warm-up, safety talk from the stage, head count | Attend, some present | Hand over, walk back, breakfast | Wash up |
| 07:10 to 09:30 | Travel to work fronts; work | Desks, site walks | Bathe, sleep | Clean, market delivery arrives |
| 09:30 to 09:45 | Merienda break in shade | Coffee | Sleep | |
| 09:45 to 12:00 | Work | Desks, meetings, inspections | Sleep | Cook lunch |
| 12:00 to 13:00 | Lunch at canteen, short rest | Lunch at staff house or desk | Sleep | Serve, wash up |
| 13:00 to 15:00 | Work | Work | Sleep | Prep |
| 15:00 to 15:15 | Break | | Wake | |
| 15:15 to 17:00 | Work; tidy; tools back to store | Reports | Dinner early | Cook dinner |
| 17:00 to 17:30 | End-of-shift head count; walk or ride back | Leave desks | Toolbox talk at portal | |
| 17:30 to 19:00 | Bathe, laundry, dinner, basketball | Dinner, veranda | Tunnel work | Serve dinner |
| 19:00 to 21:30 | Phones, chat, guitar, TV | Rest; some work late (lit window) | Tunnel work | Close kitchen |
| 21:30 to 04:30 | Lights out; asleep | Asleep | Tunnel work; meal at midnight | Night guards patrol |

3. Role behaviour, as activity pools per role group and work front:

| Role | Behaviour |
| --- | --- |
| Project manager | Morning site walk along a route through every work front with the deputy and the safety head following; stops at each front to talk with the foreman (paired talk and point); back to the office for desk work and a meeting; receives visitors at the gate when one arrives; evening review at the drawing table |
| Deputy PM | Accompanies the PM, then tours fronts alone in the afternoon; radio calls |
| Engineers | Inspection rounds with tablet; check rebar before a pour (measure, count, photograph); sign off with the foreman; desk time typing; walk drawings to the plotter |
| Planning, QS | Mostly desk; one site visit a day to measure and photograph progress |
| Surveyors | Two-person party: set up instrument, sight, move prism, record; locations follow the active construction stage |
| Geologist | Maps the tunnel face after scaling; samples rock at the cut slope |
| QA/QC | Slump and cubes at every pour; lab testing; inspection at formwork before pour |
| Supervisors, foremen | Stand where the gang works; direct, point, signal machines, check with tape and level, walk between sub-gangs |
| Powerhouse gang | By stage: excavate and trim; fix rebar; erect formwork; pour, vibrate, screed, finish; strip and cure. The gang moves through stations in order as the stage requires |
| Penstock and mechanical | Fit-up, weld, grind, bolt, paint; rigging with a crane and tag lines |
| Switchyard and electrical | Erect steel, pull cable, terminate, test |
| Road and drainage | Fill potholes, clear drains, cut grass, place gravel |
| Camp maintenance | Carpentry repairs, sweeping, bin collection, water-tank filling |
| Operators, drivers | Assigned to a vehicle cycle (P10); idle beside the machine at breaks |
| Riggers | Signal and guide lifts |
| Safety | Rove between fronts; stop and correct (a worker without a chin strap puts it on); lead the toolbox talk; gas test at the tunnel before re-entry; inspect scaffolds and tag them |
| Warehouse | Receive a delivery (count, sign), issue materials at the counter, move pallets |
| Security | Gate post, inspect every vehicle, log visitors, perimeter patrol with the dog, night rounds with flashlights |
| Nurse | Clinic; morning blood-pressure checks at the toolbox meeting; treats a minor case when the sim raises one (rare, labelled simulated) |
| Office, HR, IT, document control, CAD | Desk work, printing, filing, pantry trips, short meetings; IT visits a desk or the rack |
| Kitchen | Prep, cook, serve by meal time, wash, receive market goods |

4. Weather rules: rain moves outdoor gangs under cover (stations flagged `rain: false` close) and brings out raincoats and umbrellas; typhoon state stops outdoor work, crews secure loose materials and return to camp, guards stay at post.
5. Small behaviours injected between activities by context: wipe sweat and drink at noon, seek shade, yawn on night shift, greet when passing, pet the dog, step aside for a truck.
6. Office staff put on hard hat and vest when they leave the office zone and hang them on return.
7. Occupancy drives window lights and the bunk-room glow at night.
8. Run a full 24-hour time-lapse capture and review it against the table.

**Pass when.** The time-lapse shows the programme; nobody idles without an activity for more than 60 seconds of sim time; nobody passes through walls or stands in a rest pose; every named person is somewhere consistent with their role at 08:00, 12:15, 15:00, 18:30 and 23:00.

## P09c. Tunnel face cycle and set-piece scenes

**Read first.** `docs/tunnel-scene-brief.md`; v1 `TunnelFaceCycleActors.tsx`, `TunnelPersonnelCrew.tsx`, `TunnelFaceCycleHUD.tsx`, `TunnelFaceCycleTypes.ts`; v1 `CourtToolboxMeetingDirector`, `TemfacilBasketballGame`.

**Steps.**
0. Staging by project date: the drill-and-blast cycle runs in `tunnel2.drive` (and in Tunnel 1 for project dates before its excavation finished); Tunnel 1 on current dates shows the lining crews (shotcrete, wall-lining formwork and pours, invert pours with a transit mixer).
1. Tunnel cycle as a director that reserves the tunnel crew and equipment and runs v1's five stages in order, each staged with the detail of the brief's ten steps:
   - **Drilling:** survey marks on the face, jacklegs or jumbo drilling the pattern, water spray and dust.
   - **Charge and blast:** charging holes, leads connected, everyone withdraws to the refuge, siren, blast (flash, pressure wave of dust, camera shake unless reduced motion), fans purge fumes down the duct, safety officer's gas check before re-entry.
   - **Mucking:** loader and truck shuttle the muck pile out.
   - **Scaling and support:** barring down, rib and mesh or bolts installed.
   - **Shotcrete:** nozzle operator sprays, surface changes zone.
   The face advances by the configured round length. Keep v1's HUD controls (play, stage select, speed, advance, shake toggle) working against the new director.
2. Toolbox meeting: formation by gang, warm-up led from the stage, safety talk with the whiteboard, questions, head count, dispersal. Timings from the programme.
3. Basketball after work: a simple game logic (possession, pass, shot, rebound) driving the basketball clips, with spectators.
4. Concrete pour at the powerhouse when its stage is `formwork` moving to `poured`: mixer arrives, pump or chute, vibrate, screed, QA takes cubes.
5. Delivery: truck arrives, guard inspection, warehouse receives.
6. Each set piece is cancellable and resumable when the clock is scrubbed.

**Pass when.** Each scene plays end to end at 1x and looks coherent when entered midway by scrubbing; the blast respects reduced motion.

## P09d. Selecting, following, and what a person's card shows

**Read first.** `MASTER-BRIEF.md` rule 6; v1 `PersonnelInfoCard.tsx`, `PersonnelProfileModal.tsx`, `PersonnelLocatorBeacon.tsx`; `data/people.json`.

**Steps.**
1. Click or tap a person selects them: outline, ground ring, and the inspector shows the card.
2. Card for a named person: photo if present, name, role, department, shift, and **what they are doing right now** taken from the simulation ("Inspecting rebar at Powerhouse Bay 2", marked as simulated activity). Verified extras only when present in `verified`. Unnamed crew show role and current activity only.
3. Locate: fly to a framing that shows the person and their surroundings. Follow: the camera tracks them; any user input ends following.
4. Roster data source for the People panel (P13): list with live activity and zone.
5. The card never shows a field that is empty or unverified, and never shows v1's invented licence numbers.

**Pass when.** Select, locate and follow work for every named person at five different clock times; following is cancelled by drag, wheel, key and touch; no unverified field appears.
