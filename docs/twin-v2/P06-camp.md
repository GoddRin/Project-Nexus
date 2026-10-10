# P06. Temfacil camps

Five sessions. There are two camps. The **main Temfacil** is at the powerhouse complex and was built from July 2023 to late 2024: main site office, ESH office, staff accommodation, workers' barracks 1 and 2 with a common toilet block, main warehouse, site clinic, canteen, motor pool and fabrication area, genset and air-compressor shed, with its own access road. The **satellite camp** is at the weir (P06e). The explosives magazine is a separate fenced compound.

The owner has confirmed (2026-10-09) that the **basketball court with its stage** and the **QA/QC office and lab** exist on site even though no monthly review shows them: build both, using v1's layout and contents as the reference since there are no photographs. Other v1-only details (specific room layouts, furniture) give way to the floor plans and photographs where those exist. Model each real building from its photographs in `assets-src/twin/reference/photos/powerhouse/camp-*/`.

v1 also holds a great deal of authored detail here (rooms, meals, routines); the inventory is the checklist, and nothing in it marked **keep** or **upgrade** may be lost.

Common to every sub-phase: the "common" list at the top of `P05-hydro-works.md` applies. Interiors are separate zones that stream in inside about 30 m and are represented from outside by lit window cards and a dim parallax interior.

**From the owner's photographs (R4 `site-08`, `site-03`, `site-04`):** camp houses are single-storey white prefab panel buildings with rust-streaked metal roofs, green window frames and wall air-conditioners, red flexible electrical conduit run along the eaves, solar street lights on poles and small solar panels on roofs; beside them a **bamboo-trellis vegetable patch** (gourds, taro, banana), uncut grass, an **outdoor kitchen** with a concrete counter under a lean-to, parked motorcycles (one under a cover); the yard store has rows of blue and red drums, stacked timber and large used tyres. Build these.

## P06a. Building kit, site, main office (exterior and interior)

**v1 source.** `TemfacilFacility.tsx` 132 to 720 (pad, kerbs, drains, pavers, parking, office shell, doors, yard pole), `TemfacilOfficeInterior.tsx` (all of it: zones 1 to 6, desks, screens, plotter, meeting table, PM office), `screenTextures.ts`, `SharedMaterials.tsx`.

**Build.**
1. **Kit** (`LIB_camp_kit`): container-van modules (20 ft and 40 ft, with door, window, and air-con cut-outs), CHB wall bays, steel portal frames, timber and ply partitions, GI roof bays with ridge, gutter and downpipe, jalousie and sliding windows with insect screen, flush and panel doors, concrete slab and ramp pieces, covered walkway bays, stair and handrail pieces. Every camp building is assembled from these as instances.
2. **Site:** aggregate pad with compaction marks and ponding spots, kerbs, open drains with gratings, paver walkways, painted parking bays, speed humps, flagpoles (Philippine flag and SCIC flag, cloth simulated by wind in the vertex stage), yard lighting poles, perimeter fence with barbed top, signboards, water tanks on a stand, septic vent, clotheslines, garden patches, smoking shed, muster-point sign.
3. **Main office exterior:** from kit, with entrance canopy, shoe mat, notice board, bundy-clock nook, air-con condensers dripping onto the ground.
4. **Main office interior:** every room in the inventory: open engineering bay with desks, dual monitors, drawing table and plotter; planning and QS desks; document control with shelving and box files; PM and deputy PM rooms; meeting room with table, screen and whiteboard; pantry with dispenser and coffee; IT corner with rack and printer; hard-hat and vest rack by the door. Believable clutter: drawings, mugs, calendars, phone chargers, fans, slippers under desks.
5. **Screens:** monitors show static, plausible content rendered once to an atlas (CAD sheet, schedule bars, spreadsheet, email client). No readable invented figures or names; text is at a size that reads as texture. Where v1 drew live canvases, use the atlas.
6. Doors are separate nodes (P09 opens them). Stations for every seat, the plotter, the whiteboard, the pantry.

**Pass when.** Kit pieces snap on a 0.1 m grid; office interior within its budget; walking in from the yard adapts exposure and streams without a hitch over 50 ms.

## P06b. Canteen, kitchens, staff house, QA/QC

**v1 source.** `TemfacilCanteenBuilding` (7691), `FilipinoCanteenFoodCounter` (2770), `FilipinoFoodTrayDish` (2650), cooking pots (4011 to 4250), `TemfacilStaffHouseKitchenExtension` (2538), `StaffHouseLoungeDining` (7552), `TemfacilForemanStaffHouse` (7955), `TemfacilQaqcOffice.tsx`.

**Build.**
- **Canteen:** open-sided dining hall with long tables and benches, serving counter with bain-marie trays, rice cooker and caldero, tray stack, drinking-water station, dish-return and wash area with basins and racks, condiment sets on tables, wall fans, radio, menu board (dish names only), hand-wash sinks, waste bins, cats' corner.
- **Food** as small modelled and photo-textured assets, by meal: breakfast (garlic rice, egg, dried fish or longganisa, coffee), lunch and dinner (rice, adobo, sinigang, ginataang kalabasa, fried tilapia, pancit), merienda (bread, banana cue). Steam from hot trays.
- **Kitchen:** LPG burners with kawali and caldero, prep tables, chopping boards and cleavers, vegetable crates, rice sacks, chest freezer, shelves of condiments (generic labels, no trademarks), extractor hood, wet floor near the sink.
- **Staff house:** bedrooms seen through windows, lounge and dining area, veranda with chairs; women's quarters entrance as in v1.
- **Foreman house.**
- **QA/QC office and materials lab:** desks, compression-test machine, curing tank with cubes, sieve set and shaker, oven, balance, slump cones, sample bags with tags, test-record board (blank grid).

**Pass when.** Meal sets swap by clock without a hitch; kitchen and canteen pass at dawn (breakfast service lit by tubes) and at noon; stations exist for queue, serve, eat, wash, cook, prep, each lab task.

## P06c. Barracks, warehouse, yard, court, gate

**v1 source.** `TemfacilWorkerBarracksCompound` (7997), nighttime and morning worker scenes (4537 to 6900), warehouse and laydown (TemfacilFacility 560 to 620), tool shed, `TemfacilBasketballCourtAndToolboxMeeting` (9268), `ElevatedSafetyStageWithWhiteboard` (9507), `SecurityGuardhouseCheckpoint` (3667), light towers.

**Build.**
- **Barracks:** three dormitory blocks that are not identical, breezeway, wash and toilet block, laundry area with basins and lines of clothes that move in wind, bunk rooms with double-deck beds, thin mattresses, mosquito nets, lockers, electric fans, phone-charging strips, slippers at doors, a sari-sari style shelf, a TV corner, benches outside, a guitar.
- **Warehouse:** steel shed with roller door, racking, bins, issue counter with logbook, cement and pipe storage, forklift bay; laydown yard with rebar bundles, pipe stacks, timber, tarped loads, pallets, drum store with bund, gas-cylinder cage.
- **Tool and equipment shed, motor pool and fuel point** with spill kit and fire point; **clinic** (examination bed, cabinet, BP set, stretcher, first-aid signage).
- **Court:** concrete court with painted lines, backboards with chain nets, the raised safety stage with whiteboard and PA speaker, bleacher bench, scoreboard.
- **Gate:** the P02 slice, integrated.
- Mobile light towers and waste segregation bins.

**Pass when.** All inventory facilities exist at their recorded positions; a walk gate to office to canteen to barracks holds Medium budget; night capture shows the lived-in look (lit windows, charging phones glowing, laundry).

## P06d. Prop library completion and dressing pass

**Build.** Finish `LIB_props` so every station has what its activity needs and no area looks empty:

- **Hand tools:** shovel, pick, mattock, hammer, sledge, saw, pliers and tie-wire reel, trowel, float, bolt cutter, spanner set, grinder, drill, welding torch and electrode holder, tape, level, plumb bob, spray can, broom, hose and nozzle, scaling bar, jackleg drill.
- **Instruments:** total station and tripod, prism pole, level and staff, gas monitor, rebound hammer, tablet, laptop, clipboard, radio, megaphone, camera.
- **Site goods:** wheelbarrow, buckets, cement bags, rebar offcuts, formwork ply, scaffold tubes and couplers, cones, barriers, caution tape, signage set, extinguishers, first-aid box, water jugs, tool boxes, cable reels, hoses, lights on stands, ladders.
- **Personal:** hard hats in rack colours, vests, gloves, boots, raincoats, umbrellas, backpacks, lunch containers, water bottles, towels, phones.

Then a dressing pass across all camp and works zones: place clutter, stains, decals and wear so each area tells what happens there. Every hand prop has a grip frame (an empty at the hold point) named `GRIP_R` and, for two-handed tools, `GRIP_L`.

**Pass when.** Every activity in `activities.json` (drafted here, completed in P09) can name its props from the library; every prop passes the mesh checklist; total prop materials stay within the atlas plan.

## P06e. Weir satellite camp and aggregate plant

**Needs.** P05g, P06d.

**Build** in the `weir` location, from the kit and the photographs: satellite workers' barracks 1 and 2, staff house (living quarters), canteen (posts and CHB walls), clinic, office, satellite warehouse, motor pool; the volumetric concrete plant on its foundation with ramp, aggregate bins and cement silo; the size-reducing equipment (crusher) with feed hopper, conveyors and stockpiles; the dewatering and siltation pond. Construction stages follow `history.json` (site development March 2024, barracks October 2024, mixing facility foundation December 2024, canteen April 2025, plant and crusher mid-2025).

**Pass when.** Structure checklist; stations for plant operator, loader feeding the hopper, mixer trucks loading; location still within budget with the camp loaded.
