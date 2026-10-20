# P00a report: inventory, data extraction, licence audit

2026-10-09, branch `twin-v2`. Nothing visual was built in this sub-phase.

## What was built

| Deliverable | Where |
| --- | --- |
| Inventory of v1 (12 tables, every row keep / upgrade / drop with file and line) | `docs/twin-v2/INVENTORY.md` |
| v1 data in the contract formats | `components/twin/data/`: `people.json` (35), `people.unverified.json` (not loaded), `named-animals.json`, `ppe-colours.json`, `routes.json` (7), `poles.json` (7), `cameras.json` (31), `flow-path.json` (17 points), `exclusions.json` |
| The real scheme | `locations.json` (5 locations), `site-layout.json` (24 v1 facilities, 18 real structures, 3 traced roads), `structures.json` (28), `progress.json` (92 points), `history.json` (53 events), `crew.json` (473) |
| Height sampler | `lib/twin/terrain.ts`, checked by `scripts/twin/check-terrain.mts` |
| Grid conversion | `lib/twin/grid.ts` (project grid to latitude and longitude; grid to local frame and back) |
| Version switch | `app/(dashboard)/digital-twin/page.tsx`: `?v=2` mounts `components/twin/TwinApp.tsx` (a placeholder); anything else mounts v1 |
| Scripts | `scripts/twin/`: `extract-v1.mts`, `build-site-data.mts`, `check-data.mts`, `check-terrain.mts`, `check-locations.mts`, `draw-scheme-map.mts`; `scripts/twin/reference/`: `georef_site_plan.py`, `collect_photos.py` |
| Folders of CONTRACTS.md section 1, `.gitignore` rules, `DECISIONS.md`, `RISKS.md`, `public/models/twin/CREDITS.md` | as named |
| Reference photographs, 224 files in 25 folders, each with an `INDEX.md` | `assets-src/twin/reference/photos/<location>/<structure>/` (git-ignored) |
| Review images | `scheme-map.png` (the derived scheme, drawn from the data), `v2-placeholder.jpg` |

## Pass checks

| Check | Result |
| --- | --- |
| Every v1 component that renders something appears in the inventory | **Pass at file level**: all 59 files are in `INVENTORY.md` section 1, and the facilities, scenes, vehicles, animals, effects and controls each have a row. Not at prop level for the files that were not read line by line (see "Not done") |
| `people.json` has all v1 people, ids unchanged, and validates | **Pass**: 35 people, ids checked against v1's registry by `check-data.mts`. The 36th registry entry is the dog, moved to `named-animals.json` with its id |
| Terrain sampler matches v1 within 1 cm at the test points | **Pass**: 20 named points and 2,000 random points, worst difference 0.0000 mm |
| `/digital-twin` without `?v=2` behaves exactly as before | **Pass on what was checked**: after a production rebuild, `/digital-twin?preset=overview` and `/digital-twin?v=1` mount v1 (header, canvas, preset chip "OVERVIEW" and "TEMFACIL"); `?v=2` shows the placeholder and no v1 canvas. Checked in the built-in browser pane, which pauses animation, so v1 was not watched running after the change, and the bench was not re-run after it. v1's own files are untouched (`git diff` shows only the page) |
| Baseline bench numbers recorded | **Pass**: `baseline.json`, below |
| Type check and lint | `next build` (which type-checks) passed; `eslint` on the page, `components/twin`, `lib/twin`, `scripts/twin` is clean |

## Baseline (v1, production build, before any change)

Intel Iris Xe, headless Chromium with the GPU on, `node scripts/bench-twin.mjs P00a-baseline`.

| Measure | Desktop 1440 x 900 | Phone 390 x 844 at 2x | v2 medium-tier target |
| --- | --- | --- | --- |
| Frame rate (median) | 11.2 fps | 21.2 fps | 45 fps |
| Frame time, p95 | 109.8 ms | 78.8 ms | 33 ms |
| Draw calls | 2,525 (5,685 with batching off) | 758 (1,470) | 350 |
| Triangles | 1.82 million | 1.68 million | 700 thousand |
| Shader programs | 180 | 213 | 40 |
| Point and spot lights (lit) | 49 (36) | 65 (38) | 1 sun + 8 |
| Time until the scene stops changing | 208 s | 131 s | 6 s to first usable view |
| Page errors | none | none | |

Close to the benchmark saved on 2026-10-08 (9.2 fps, 2,535 calls, 1.81 million triangles).

## What the references showed

1. **Where the site is.** The key plans in the August 2026 deck print grid coordinates for six points: the Tunnel 1 start and end, both Tunnel 2 portals, and three penstock points. The grid is PRS92 Philippines Zone III. Converted, the powerhouse is at **17.3163 N, 121.9720 E**, on the Tumauini River in the Sierra Madre foothills. **v1's label (17.0621 N, 121.8410 E) is about 31 km from there**; v1's terrain file, though, was fetched around 17.3188 N, 121.9749 E, which is the real main camp, so the ground v1 draws under its powerhouse is really the camp's hillside.
2. **Derived positions** (`locations.json`; `scheme-map.png`):

   | Location | Easting | Northing | Latitude, longitude | Local Y = 0 | How | Error |
   | --- | --- | --- | --- | --- | --- | --- |
   | `weir` | 605,938.8 | 1,917,902.1 | 17.33748 N, 121.99796 E | EL 296.00 | Scaled off the Tunnel 1 key plan; the 2023 site plan agrees within 11 m | 15 m |
   | `tunnel1` | 605,981.401 | 1,917,792.154 | 17.33648 N, 121.99836 E | EL 296.00 | Printed (inlet, STA 0+000) | 5 m |
   | `midway` | 603,414.6 | 1,916,185.2 | 17.32208 N, 121.97413 E | about EL 275 | Midpoint of two printed portals 38.8 m apart; level from contours | 5 m; level 5 m |
   | `tunnel2` | 603,146.606 | 1,915,714.938 | 17.31785 N, 121.97159 E | EL 271.465 | Printed (outlet, STA 0+535) | 5 m |
   | `powerhouse` | 603,188.4 | 1,915,549.3 | 17.31635 N, 121.97198 E | EL 188.04 | Scaled off the penstock plan from printed point TB-04 | 5 m |

   Add about 10 m to the latitude and longitude for the datum step. All are well inside the 50 m needed to fetch terrain. The drawings mark the Tunnel 1 start and both Tunnel 2 portals "to be verified".
3. **Reality check** (`location-check.txt`): in two open elevation models the powerhouse reads 210 to 221 m (drawing: 188), the Tunnel 2 outlet 282 to 290 (271), the weir 309 to 312 (296; flood wall 303), and the ridge over the middle of Tunnel 1 717 to 755. The models are 30 to 90 m canopy surfaces, so reading 15 to 30 m high in a gorge is expected; the pattern is right. The other reading of the grid puts the powerhouse at 237 to 259 m, on a slope.
4. **How the real layout differs from v1:**
   - The main camp is about **400 m** from the powerhouse (to the north-east, about 25 to 40 m higher by the open elevation data), a bench about 160 m long beside the road. v1 puts it 150 m away on an 84 m square pad.
   - The surge tank is **137 m** up the penstock and about 83 m above the powerhouse yard. v1 draws it 26 m away and 17 m up.
   - The penstock is 2.70 m inside diameter (v1 has that right), 111 m between its printed bends, with a bifurcation 17 m before the powerhouse and a branch at 52 degrees to the small unit.
   - The machine hall is 31.5 m by about 12 m with the two unit axes 11.5 m apart; the switchyard is on the same side as in v1.
   - Tunnel 2 runs 391 m from its inlet, bends 26.4 degrees left, and runs 144 m to the outlet beside the surge tank.
5. **Tunnel 1 length does not agree.** The printed portal coordinates are **3,008.95 m** apart, and the drawing labels the end "STA 3+008.95". The owner's decision of 2026-10-09 is about 2.58 km, from the latest decks, where the highest chainage on the lining chart is 2+579.28. Both portals are built, so the tunnel cannot be shorter than the distance between them unless a portal moved. Recorded as found, not resolved (see "For the owner").
6. **Tunnel 1 broke through on 4 July 2026** (MPR-51 slide 57). In `history.json`.
7. **Photo audit.** 14 of 35 people use a photo file named for someone else, so no photo is listed for them: Romeo Sese (`pm_danilo_roxas.jpg`); Elgine Mangcupang (`engr_maria_reyes.jpg`); Jhon Jayme and Jon-Jon Bucsit (`planning_may_parallag.jpg`); Ronald Malto (`esh_alfredo_ariz.jpg`); Eduardo De Francia (`deputy_nathaniel_principe.jpg`); and Jairuz Batac, Henry Estrada, Richard Pinasen, Rudy Marcos, Anthony Rosales, Benjamin Fomeg-as, Josue Abellera, Warlito De Francia (all `civil_jaime_cano.jpg`). Harrold Salva's file is `it_marc_salva.jpg`: the surname matches, so it is kept. Full list: `photo-audit.json`.
8. **Public data exposure.** The public page's equipment call returns whole database rows to signed-out visitors, including serial numbers, internal user ids and free-text maintenance findings (`INVENTORY.md` section 11). Read from the code; the live response was not captured.
9. **Licences.** Only the lighting map (CC0) and the Atlas Navigator (credited) have a recorded origin. Everything else under `public/models/` and `public/textures/` is marked "replace in v2", and nothing was copied into the v2 folders. Five Blender working files (about 9 MB) sit in `public/models/characters/` and can be downloaded by anyone.

## Not done, or done only in part

- **Inventory depth.** About 40% of v1 was read line by line (the files and ranges the prompt names). `TemfacilFacility.tsx` beyond line 720, both office interiors, most of `PowerhouseGeometry.tsx`, the tunnel files and the effects were inventoried from component lists, mesh counts and comments. Heights of several v1 buildings were not read and are `null` in `site-layout.json`.
- **Footprints of real structures.** Only the powerhouse has a measured footprint. The weir length (63 m), the pipe bridge span (39 m) and the camp bench length (about 160 m) are scaled from small plans. The desander is uncertain: the key plan draws about 46 m and the aerial photographs suggest more.
- **Access roads.** AR01 and AR02 are traced from the 2023 plan (the traces come out short: 2.7 km against a stated 3.5, and 6.3 km against 7.1, because the plan is cropped and a raster trace cuts hairpins). AR03, AR04 and AR05 are not located. Stationing is recorded only as the decks state it, not along the traces.
- **Progress before October 2025.** Not read: the earlier overall figures exist only inside S-curve pictures. Planned percent is known for one point (overall, August 2026: 89.40).
- **History.** 53 events, chosen from first mentions found by searching the text of all 53 decks. It is not every pour. Stage values (`excavation`, `poured` and so on) are my reading of each caption; P14b's stage-mapping rules go to the owner for review as planned.
- **Reference photographs** were picked by slide and size, not looked at one by one.
- **Eyes-on in Chrome** was not done: there is nothing visual to look at yet.
- **`README.md` says v1 has 57 files; there are 59.** Not corrected (the prompts are the owner's).

## For the owner

Decisions and documents needed. None blocks P01a.

1. **Tunnel 1 length** (needed by P05e): is it 3,009 m (drawing) or about 2,580 m (decks)? The current Tunnel 1 plan, or the chainage painted at the outlet portal, would settle it.
2. **Drawings still wanted:** powerhouse sections and elevations; a mechanical general arrangement (unit type, sizes and ratings: v1's "8.5 MW and 2.8 MW", "600 RPM" and "2x Francis" have no source); weir, intake and desander general arrangements; the site development plan as a drawing file; a layout or fresh drone photograph of each camp; the PPE colour standard.
3. **Staff details** (needed by P09d): which licence numbers, years of experience and provinces are real and cleared; and correct photographs for the 14 people listed above.
4. **The public equipment call** returns internal fields today, in v1. The plan fixes it in P14a; say if it should be closed sooner.
5. **The `.blend` files in `public/models/characters/`** are publicly downloadable. Say if they should be moved out.
6. **To look at:** `scheme-map.png`. If any location is visibly in the wrong place, say which.

## Commands to repeat this session's checks

```
npx tsx scripts/twin/extract-v1.mts
python -I scripts/twin/reference/georef_site_plan.py
npx tsx scripts/twin/build-site-data.mts
npx tsx scripts/twin/check-data.mts
npx tsx scripts/twin/check-terrain.mts
npx tsx scripts/twin/check-locations.mts
npx tsx scripts/twin/draw-scheme-map.mts
```
