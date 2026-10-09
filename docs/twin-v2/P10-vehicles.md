# P10. Vehicles and heavy equipment

Two sessions. Working machines with operators, on real routes.

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
