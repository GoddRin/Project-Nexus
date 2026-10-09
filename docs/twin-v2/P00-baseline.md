# P00. Baseline and inventory

One session. Nothing visual is built; this protects what v1 holds and gives later sessions data instead of 48,900 lines of JSX to dig through.

## P00a. Inventory, data extraction, licence audit

**Needs.** Nothing.

**Read first.**
- `components/digital-twin/PlantScene.tsx` (scene composition from line 1111, camera presets from 1437, UI from 2858)
- `components/digital-twin/TemfacilFacility.tsx` lines 132 to 720 (camp layout)
- `components/digital-twin/AnimatedSiteEntities.tsx` lines 3882 to 4000 and 5115 to end (vehicles and who stands where)
- `components/digital-twin/PowerhouseGeometry.tsx` (function list and dimensions)
- `components/digital-twin/personnelData.ts`, `personnelLocations.ts`, `uphillRoadConfig.ts`, `terrainData.ts`, `SiteElectricalDistribution.tsx`, `TunnelFaceCycleTypes.ts`, `ForestWildlife.tsx` lines 1428 to end
- `docs/tunnel-scene-brief.md`, `scripts/bench-twin.mjs`, `proxy.ts`

**Steps.**
1. Switch to branch `twin-v2` (it already exists and holds these prompts; create it only if missing) and create the folders in `CONTRACTS.md` section 1. Add `assets-src/twin/**/*.blend` and raw downloads to `.gitignore`; keep small text sources tracked.
2. Create `STATE.md` rows for every sub-phase (already seeded), plus empty `DECISIONS.md` and `RISKS.md`. Seed `RISKS.md` with the list at the end of this file.
3. Build v1 and run the existing bench; save as `review/P00a/baseline.json`.
4. Write `INVENTORY.md` with these tables, each row marked **keep / upgrade / drop** and with its v1 file and line:
   - Facilities and rooms (name, world position, footprint, height, source of dimensions).
   - Prop groups per facility.
   - People: all entries of `FILIPINO_PERSONNEL_REGISTRY` with role, department, where v1 places them, what they are doing.
   - Activity scenes: toolbox meeting, calisthenics, basketball, canteen meals by time of day, staff-house dining, night watchmen, gate inspection, warehouse operations, welding bay, tailrace QC, tunnel crew, barracks evening life (phone, smoking, chat, laundry), kitchen cooking.
   - Vehicles and routes.
   - Animals with counts and positions.
   - Effects (river mist, aeration steam, cumulus, heat shimmer, fireflies, shooting stars, aviation strobe, rain, energy-flow line, X-ray).
   - UI controls and all 31 camera presets.
   - Every number shown to the user (capacity, elevation, ratings, counts) with its source; mark those that exist only as literals in v1 code.
5. Extract to `components/twin/data/` in the formats of `CONTRACTS.md`:
   - `people.json` from `personnelData.ts`. Map each `role` to a `roleGroup`. Move `licenseNumber`, `yearsOfExp`, `originProvince` into a separate `people.unverified.json` that the app does **not** load. List in the report every `avatarUrl` whose file name does not match the person's name.
   - `site-layout.json`: facility positions and footprints; `routes.json` from `uphillRoadConfig.ts`; `poles.json` from `SITE_UTILITY_POLES`; `cameras.json` from the presets; `flow-path.json` from `FLOW_PATH_POINTS`; `exclusions.json` from the vegetation exclusion rectangles.
   - `lib/twin/terrain.ts`: a pure height sampler ported from `terrainData.ts` with a unit check that it returns the same heights as v1 at 20 sample points.
6. Licence audit: list every file in `public/models/` and `public/textures/` with origin and licence where it can be established. Anything unknown is marked "replace in v2".
7. Check what the public page can reach: read `getEquipmentByLocation` in `app/(dashboard)/dashboard/sitemap/actions.ts` and list the fields it returns to a signed-out visitor.
8. Add the version switch to the route: `?v=2` mounts `components/twin/TwinApp.tsx` (a placeholder that says "Twin v2 under construction" for now); anything else mounts v1 unchanged. Read the Next docs in `node_modules/next/dist/docs/` first.
9. **Mine the owner's references** (`reference/INDEX.md`; files in `assets-src/twin/reference/`, git-ignored):
   - Read `mpr-index/*.md` (text of all 53 monthly reviews) and the unpacked decks. For anything only present as a picture (site development plan, tunnel key plans, weir and desander layouts, the 3D structure models), open the image and read it.
   - `data/locations.json`: for each of the five locations, an origin with grid coordinates and elevation taken from a drawing (the Tunnel 2 key plan gives portal coordinates; the site development plan and other key plans give the rest). Record the source image for each number. Where a number cannot be read, leave it null and list it for the owner. Never estimate silently.
   - `data/site-layout.json`: add the real structures per location with footprints measured from the plans, and the access roads AR01 to AR05 with their stationing.
   - `data/progress.json`: physical progress only, from `mpr-progress-series.csv` (Oct 2025 onward, per work front) and from the older decks' overall figures where they can be read.
   - `data/history.json`: dated events per structure from the deck captions (which lift was poured when, when excavation started, and so on), each with its deck and slide.
   - `data/crew.json`: head-count by category in the proportions of the latest deck's manpower table.
   - `reference/photos/<location>/<structure>/`: copy the best 5 to 15 photographs per structure from the unpacked decks into the git-ignored reference folder with an `INDEX.md` saying date and source slide. These are what P05 and P06 model from.
   - Never copy cost, billing, KPI, survey or incident content anywhere.
10. Ask the owner, in the report, for what is still missing: powerhouse sections and elevations, a mechanical general arrangement, weir and desander drawings, the site development plan as a drawing file, and the PPE colour standard.

**Deliver.** `INVENTORY.md`, data files, `lib/twin/terrain.ts`, baseline numbers, licence table, the `?v=` switch, `review/P00a/REPORT.md`.

**Pass when.**
- [ ] Every v1 component that renders something appears in the inventory.
- [ ] `people.json` has all v1 people, ids unchanged, and validates against the type.
- [ ] Terrain sampler matches v1 within 1 cm at the test points.
- [ ] `/digital-twin` without `?v=2` behaves exactly as before.
- [ ] Baseline bench numbers recorded.

## Seed risks for `RISKS.md`

| Risk | Early test | Fallback |
| --- | --- | --- |
| WebGPU slower or unstable on Iris Xe | P01a spike | WebGL2 path |
| Free human bases do not beat the navigator | P02b: one finished person side by side | Derive bodies from the navigator's Sketchfab base; fewer body shapes, more variation by texture and outfit |
| 80 skinned people too slow | P02c measurement | Lower crew count in view; vertex-animated far crowd; throttle animation by distance |
| No good free model for a species or machine | Search in the phase before modelling | Model it in Blender from references; drop the species rather than ship a poor one |
| Mixamo lacks a trade-specific motion | P08a list review | Author the clip in Blender with IK |
| Download too large | P01c pipeline numbers | Stream by zone, lower texture sizes on Low and Medium |
| MPFB2 not compatible with Blender 5.2 | P02b first step | Install a supported Blender alongside, or use the navigator base |
| Session context runs out mid sub-phase | Any | Commit partial work, record exact stopping point in `STATE.md` |
