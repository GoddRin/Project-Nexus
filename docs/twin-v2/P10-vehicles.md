# P10. Vehicles and heavy equipment

Three sessions: P10a, P10b, P10c. Working machines with operators, on real mountain roads. Read the section "The fleet for this site" below before P10a: it lists the vehicles this project really uses.

## P10a. Fleet models and rigs

**Needs.** P05a (material library), P07c (operators).

**Read first.** v1 `AnimatedSiteEntities.tsx`: `SCICHeavyDumpTruck` (2788), `SCICSitePickupTruck` (2934), `PhilippineSiteMotorcycle` (3033), `ToyotaHiaceCrewVan` (3098); `INVENTORY.md` vehicles table; `QUALITY-BAR.md` sections 1 and 2; the P02b pickup.

**Fleet.**

| Class | Machines |
| --- | --- |
| Earthmoving | Hydraulic excavator (20-tonne class), backhoe loader, wheel loader, bulldozer, vibratory roller, motor grader |
| Haulage | 6-wheel and 10-wheel dump trucks, flatbed with crane (boom truck), water truck, fuel truck |
| Concrete | Transit mixer, concrete pump (trailer or boom), portable mixer |
| Lifting | Mobile crane, forklift, chain blocks and A-frame |
| Tunnel | Jackleg drill set with compressor, or single-boom jumbo as the inventory states; low-profile loader; shotcrete machine; ventilation fan and ducting; dewatering pumps |
| Support | Gensets, air compressors, welding machines, tower lights, plate compactor, bar bender and cutter |
| Light | Pickups, crew van, motorcycles (underbone type), tricycle at the gate for visitors, bicycle |

**Steps.**
1. Search Sketchfab (CC0/CC BY) and Poly Haven for each; accept only models that can meet the mesh checklist after clean-up. Model the rest in Blender from reference photos. Remove manufacturer names and logos; use generic liveries with the SCIC wordmark and fleet numbers.
2. Rig each machine as a hierarchy of named nodes with correct pivots: wheels (spin and steer), tracks (scrolling texture plus idlers), suspension, doors, booms, sticks, buckets, cylinders that extend to follow their targets, slewing ring, outriggers, tipper body and tailgate, mixer drum, pump boom, forklift mast and forks, crane boom sections, hook block and cable.
3. Cab interiors good enough to see an operator seated with hands on controls; seat socket named `socket_seat`, hand targets on levers and wheel.
4. Lamps: head, tail, brake, indicator, reverse, beacon, work lights; all emissive with real lights only from the fixed pool.
5. Dirt layers: dust, mud on lower panels and wheels, a wet variant; windscreen wiper arcs in the dust.
6. LODs per budget; a collision footprint for the navmesh.
7. Author work-cycle animations as clips on the machine rigs: excavator dig-swing-dump-return; loader scoop-carry-tip; truck tip; mixer discharge; pump boom unfold; crane hoist-slew-lower; forklift lift-carry-place; roller pass; jumbo boom positioning.

**Pass when.** Each machine passes the mesh checklist and a rig check (every moving part moves about the right pivot through its range without intersecting); contact sheet in the report.

## P10b. Driving, traffic and work cycles

**Needs.** P10a, P09a.

**Read first.** `data/routes.json`; v1 `AutonomousSiteTrafficSystem` (3896 to 4686: routes, gate stop logic, staggered starts, routines such as depot dumping and quarry loading) and `uphillRoadConfig.ts`; `sim/world.ts`.

**Steps.**
1. `vehicles/drive.ts`: path following on road splines with speed limits by section, acceleration and braking, steering that turns the front wheels, body roll and pitch, suspension travel over road roughness, wheels that stay on the terrain.
2. Traffic rules in the sim: keep right, give way at single-lane sections, stop at the gate for inspection (the guard's activity releases it), slow near people, reverse with alarm and a signalman.
3. Vehicle cycles from v1, re-expressed as data in `vehicles.json`: dump truck between the loading point and the stockpile; crew van shuttling shifts between camp and works; pickup for supervisors' rounds; patrol; motorcycles for runners; plus mixer deliveries tied to the pour set piece and the tunnel loader and truck tied to the mucking stage.
4. Operators: a person is assigned, walks to the machine, climbs in (door opens, seat socket), drives or operates with hands on controls, gets out at breaks.
5. Stationary machines run their work cycles at stations with matching ground crews (excavator loading a truck, a signalman directing).
6. Ground interaction: tyre tracks on wet ground, dust plumes when dry, mud spray in rain, puddle splashes, spilled muck near the tunnel portal.
7. Lights by time and weather; beacons when working; hazard lights when stopped on the road.
8. Sound hooks for P12 (engine load, reverse alarm, horn at blind bends).
9. Parking: machines return to the motor pool at night, light vehicles to marked bays.

**Pass when.** A 30-minute time-lapse shows no vehicle leaving the road, clipping a building or person, or deadlocking; the gate inspection loop works with the guard; excavator-to-truck loading stays in sync; vehicle cost within the measured budget.

## The fleet for this site (owner's input, 2026-10-10)

The project is in the Sierra Madre on steep, narrow, often muddy access roads (about 3.5 km to the powerhouse and 7.1 km to the weir, gradients up to 15%). The owner states the site runs mainly on **4x4 vehicles, L300 vans and Kia trucks**, with heavy equipment. The monthly reviews name the tunnel plant: jumbo drills, LHD loaders, mini dump trucks (MDT), wet shotcrete machines, 2 cubic-metre transit mixers, a mobile concrete pump, submersible pumps, gensets, portable air compressors, ventilation ducting, and the powerhouse overhead crane. Photographs show tracked excavators, a truck-mounted boom pump, a transit mixer and a portable mixer.

**This list replaces the generic fleet table in P10a where they differ.** Before modelling, P10a looks through `assets-src/twin/reference/` photographs for each vehicle type actually on site (the drone views of the camp and work fronts show parked vehicles) and notes which are confirmed by a photo and which are assumed.

**Naming and badges.** The owner's names (L300, Kia) identify the type. Model each so a site person recognises it at once (proportions, cab shape, body type, typical colour), but with no maker's name, logo or model badge on it, and refer to it in the interface by type ("crew van", "4x4 light truck"). Fleet numbers and the SCIC wordmark go on the doors.

| Group | Vehicle or machine | Site-specific detail to model |
| --- | --- | --- |
| Light 4x4 | Double-cab 4x4 pickup (the supervisors' and engineers' service vehicle) | Raised suspension, all-terrain tyres caked in mud, snorkel on some, roll bar or steel rack in the bed, tow hooks and a front winch on one or two, mud flaps, a whip flag and amber beacon for the tunnel and haul roads, tools and a spare in the bed, seat covers, a radio |
| Light 4x4 | 4x4 SUV or wagon (project manager, visitors) | Cleaner than the rest; same flag and beacon when on site |
| Crew transport | L300-type cab-over van and its flat-bed "FB" version with a rear cabin and bench seats | The standard crew shuttle: sliding windows, roof rack with a tarp-covered load, a rear step, workers climbing in at shift change; a closed-van version for admin runs and the market run |
| Light truck | Kia K2500-type light truck (confirmed by the owner with a photograph, 2026-10-10): a small white cab-over, single cab, low drop-side cargo bed with hinged side and tail boards and rope hooks along the edge, a headboard frame behind the cab, single rear wheels, short bonnet-less nose with a wide windscreen and large door mirrors | White, usually dusty and mud-splashed to the sills. Carries cement bags, rebar, formwork, water jugs, gas cylinders and tools under a tarp; also seen with a few workers and their gear in the bed on short runs inside the site at walking pace. No maker badge or model plate on the model |
| Light truck | Small dump truck, 4 to 6 wheels | For aggregates on narrow sections where the big trucks do not fit |
| Two-wheel | Underbone and trail motorcycles | The quickest way along the roads for runners, surveyors and foremen; mud guards, a crate or bag on the back; helmets worn; a covered motorcycle bay at the camp |
| Haulage | 6x4 and 6x6 dump trucks | Tailgate chains, mud to the axles, tarp over the load, wheel chocks carried, engine brake sound on descents |
| Haulage | Flat-bed truck with loader crane (boom truck) | Carrying penstock pipe sections, rebar bundles, formwork; outriggers down when lifting |
| Haulage | Low-bed trailer and prime mover | Rare: brings an excavator or the transformer up the road as a calendar event |
| Liquids | Water truck with spray bar; fuel bowser truck | Road dust control in the dry months; field refuelling of machines with a hose and a spill tray |
| Earthmoving | Tracked excavators, 20-tonne class, some with a hydraulic rock breaker | The commonest machine on site; also clears landslides |
| Earthmoving | Backhoe loader | The road gang's machine: drains, small slides, pothole fill |
| Earthmoving | Wheel loader | At the aggregate stockpiles, the crusher and the concrete plant |
| Earthmoving | Bulldozer, motor grader, vibratory roller | Road forming and upkeep; the grader after rain |
| Concrete | Volumetric concrete plant (P06e), transit mixers including the small 2 cubic-metre tunnel type, truck-mounted boom pump, trailer line pump, portable drum mixer | Mixers queueing at a pour; wash-out at a pit afterwards |
| Tunnel | Jumbo drill, LHD loaders, mini dump trucks, wet shotcrete machine, ventilation fan and yellow ducting, submersible pumps and discharge hoses, portable compressor, tunnel gensets, a man-carrier or pickup with a cage | Low-profile, battered, lamp-covered; reversing alarms and strobes; a traffic light or signalman at the portal |
| Lifting | Mobile crane, the powerhouse overhead crane, chain blocks, a forklift at the warehouse | The overhead crane's load test is a recorded event |
| Support | Gensets on skids, welding machines, tower lights, plate compactors, bar benders and cutters, concrete vibrators, dewatering pumps | Each with cables and hoses that lie where they would |
| Emergency | A pickup or van fitted as the site ambulance; a fire-water trailer or tank with pump | Parked nose-out at the clinic; used in drills |
| Local (owner asked for all three, 2026-10-10) | A passenger motorcycle for hire (habal-habal) | A trail-capable underbone with an extended seat and side planks, carrying one or two passengers and a sack up the access road; waits at the lower gate; the rider wears a helmet and a jacket |
| Local | A tricycle (motorcycle with a roofed sidecar) | Parked at the lower gate as the ride to town for visitors and workers on leave; does not climb the steep sections |
| Local | A carabao drawing a wooden sled (paragos) | A farmer leading the animal along the forest trail and across the lower road with firewood, bananas or sacks; traffic waits for it; the carabao is the P11 model with a yoke and rope |

## P10c. Mountain logistics: how machines live on a difficult site

**Needs.** P10b, P09e (calendar), P12d (conditions).

The roads are the hard part of this project: the monthly reviews are full of piloting, widening, cross drains, landslide clearing and repairs. This sub-phase makes moving things up and down the mountain a visible part of site life.

**Steps.**
1. **The road has character** (`data/routes.json` gains per-section data: width, gradient, surface, blind bend, passing bay, drain crossing, slide-prone slope). Add: steep-grade and blind-bend signs, convex mirrors, painted chainage stakes, passing bays, concrete-paved steep ramps with grooves, cross drains and culverts, rock walls and gabions on the cut side, guard stones and a drop on the valley side, a spoil tip, a borrow pit, a spring washing over the road in the wet season.
2. **Driving that suits the terrain:**
   - low gear and slow speed uphill with engine labouring and darker exhaust; engine braking downhill; loaded trucks slower than empty ones;
   - one-way working on narrow sections: the downhill vehicle waits in a passing bay, drivers flash lights or raise a hand, horn before every blind bend;
   - wheels follow ruts; bodies rock over cross drains; trucks crawl through the spring crossing with spray;
   - in rain: slower still, wipers, headlights on, wheel spin and a little slide on mud, deeper ruts forming over the day; some sections closed to heavy trucks when the ground is soaked;
   - at night: headlights picking out the bends, eyes of animals at the roadside, slower convoy to the tunnel shift.
3. **Getting stuck and getting out** (occasional, by conditions): a truck bogged on a soft shoulder; the crew places stones and timber, a 4x4 with a winch or the excavator pulls it free; everyone waves it on. A flat tyre changed at the roadside with chocks and a jack. Shown as routine competence, not an accident.
4. **Landslides and road upkeep:** after heavy rain a slide blocks a section; a flagman stops traffic, the excavator and a dump truck clear it, the grader reshapes, the road reopens. The road gang's ordinary days: clearing drains, filling potholes with a backhoe and a small truck, cutting back growth, re-gravelling, the water truck laying dust in the dry months.
5. **Convoys and timetable:** the shift-change convoy (crew vans and trucks together), the morning materials run, the concrete supply chain from the plant to a pour (mixers cycling, one loading, one travelling, one discharging, one returning), the muck haul from the tunnel portal to the spoil tip, the market run, the fuel round.
6. **Loads you can see:** cement bags under a tarp, rebar overhanging with a red flag, pipe sections chained on timbers, formwork panels, gas cylinders upright in a rack, water jugs, a generator on skids, a load of people on the benches of the crew truck holding on round the bends.
7. **Heavy and special deliveries as calendar events** (only on dates in `history.json`): an excavator arriving on the low-bed and walking off the ramps; penstock pipes coming up one by one and being unloaded by the boom truck; the transformer or a turbine component crawling up with an escort vehicle in front, spotters walking beside it at the bends, and the gang watching it arrive.
8. **Tunnel traffic:** a stop-go light or signalman at the portal; mini dump trucks and the loader shuttling with passing niches; strobes and reversing alarms in the dark; the man-carrier taking the shift in; a tally of vehicles in and out; water trucks and mixers squeezing past the ventilation duct.
9. **Daily care of machines:** walk-round checks at start, greasing, a wash bay where mud is hosed off into a silt trap, refuelling from the bowser with a spill tray, the mechanic's service truck visiting a broken-down machine in the field (bonnet up, tools on a tarp), tyres and tracks repaired at the motor pool, machines parked in line at night with buckets grounded and keys on the board. A machine "under repair" stays so across days (ties to P09f continuity).
10. **Wear tells the story:** each vehicle carries mud level, dust, dents, a cracked lamp, faded paint, hand-painted fleet numbers, tarps and ropes, a driver's charm or towel in the cab; mud level rises and falls with the weather and the wash bay.
11. **Operators as people:** the same driver for the same vehicle, cleaning his windscreen in the morning, napping in the cab at lunch, a wave to the guard.
12. In walk mode (P13f) the drivable vehicle is the 4x4 pickup: low range engages by itself on the steep sections, it can splash through the spring crossing, and it must give way on the one-way sections like everyone else.

**Pass when.**
- [ ] A full simulated day of road traffic on the weir road and the powerhouse road shows no head-on meeting on a one-way section, no vehicle off the road, and no deadlock.
- [ ] The concrete supply chain keeps a pour fed without mixers piling up.
- [ ] A simulated wet week shows a slide, its clearing, slower traffic and muddier vehicles; a dry week shows dust and the water truck.
- [ ] Special deliveries occur only on recorded dates.
- [ ] Vehicle cost stays inside the P02c budget with the full timetable running.
