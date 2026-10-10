# State

The hand-off between sessions. Update at the end of every session. Status is one of: `todo`, `doing`, `done`, `blocked`, `owner` (waiting on the owner).

**Renderer decision (P01a):** three.js `WebGPURenderer` (`three/webgpu`), TSL materials, automatic WebGL2 fallback. Decided by the owner on 2026-10-10, overruling the session's WebGL2 result. Notes for building on it: `review/P01a/REPORT.md`, "Building on WebGPU".
**Budget table:** starting targets (rewritten in P02c).
**Waiting on the owner:** Tunnel 1 length (before P05e); desander and camp layout drawings (before P05g, P06a). Nothing blocks P01c.
**Checking the shell:** `node scripts/twin/check-shell.mjs` against a running server (`--base`, `--browser`, `--force-webgl`, `--headed`). Run it after any change to `engine/`, `state/` or `TwinApp.tsx`.
**Site position (P00a):** project grid is PRS92 Zone III; origins, levels and errors are in `components/twin/data/locations.json`. v1's terrain file is centred on the real main camp, not the powerhouse: P03a fetches new terrain per location.

| Sub-phase | Title | Status | Date | Numbers / notes | Left to do |
| --- | --- | --- | --- | --- | --- |
| P00a | Inventory, data extraction, licence audit | done | 2026-10-09 | v1 baseline on Iris Xe: desktop 11.2 fps, p95 110 ms, 2,525 draw calls, 1.82 M triangles, 180 programs, 208 s to settle; phone 21.2 fps, 758 calls. 35 people, 31 cameras, 7 routes extracted; terrain port matches v1 to 0 mm at 2,020 points. Grid is PRS92 Zone III; powerhouse at 17.3163 N, 121.9720 E (v1's label is 31 km off). Report: `review/P00a/REPORT.md` | Owner: Tunnel 1 length (3,009 m on the drawing against 2.58 km); drawings listed in the report. Inventory is at component level, not prop level, for files not read line by line |
| P01a | Renderer decision | done | 2026-10-10 | **WebGPU** (owner's decision 2026-10-10; the session measured and recommended WebGL2 on 2026-10-09). Iris Xe, Chrome 154, production build, median of 3 runs. Specified scene (60 navigators, 3,000 props, 3 cascades, GTAO, bloom, 8 lights): WebGL 11.5 fps desktop / 12.0 phone profile; WebGPU 12.9 / 13.7; WebGPU on its WebGL2 fallback 12.4 / 13.0. Open to first frame 9.2 s / 10.8 s / 22.5 s. Budget-sized scene: WebGL 30.0, WebGPU 35.2, fallback 37.3. All three paths correct in Chrome and Edge. Report: `review/P01a/REPORT.md` | For P01b: size the canvas before the first frame, check Firefox and Safari, cover the fallback's slow start in the loading screen. For P01c: prove KTX2 on WebGPU and shorten the fallback's start. No real phone measured. Spike deleted; source kept as text in `review/P01a/spike-src/` |
| P01b | Scene shell, store, camera, clock | done | 2026-10-10 | All five pass checks pass. `scripts/twin/check-shell.mjs`: 23 of 23 on the dev server (Chrome 154, WebGPU), 22 of 22 on the production build in Chrome (WebGPU), Chrome forced to WebGL2, Edge 155 (WebGPU), Playwright's Firefox 153 and WebKit 26.5 (both WebGL2 fallback). 0 React commits in 5 s of orbiting (303 frames). 200 loads, none black or empty. Empty shell in visible Chrome: 60.0 fps, p95 17.2 ms, 2 draw calls, 8,193 triangles, 2 pipelines, 27 MB heap (the display cap, not a benchmark). Found and fixed: React Three Fiber configuring the canvas twice at start left about 1 load in 13 with sky and no ground. Report: `review/P01b/REPORT.md` | For P01c: tiers and dynamic resolution (pixel-ratio caps are provisional in `engine/renderer.ts`); measure the fallback's start with real assets; keep the renderer, camera and scene as objects the twin owns. Real Safari, a real phone and pinch zoom not checked. Places exist only at the powerhouse; other locations show a flat disc until P03a |
| P01c | Asset pipeline, loader, streaming, tiers, bench | todo | | | |
| P02a | Slice: ground, guardhouse, plants | todo | | | |
| P02b | Slice: three people, dog, pickup | todo | | | |
| P02c | Measure, recalibrate, owner gate | todo | | | |
| P03a | Terrain and ground | todo | | | |
| P03b | Sky, sun, shadows, night lighting | todo | | | |
| P03c | Water | todo | | | |
| P03d | Weather | todo | | | |
| P04a | Plant library | todo | | | |
| P04b | Scatter and wind | todo | | | |
| P05a | Powerhouse exterior and yard | todo | | | |
| P05b | Turbine hall interior | todo | | | |
| P05c | Switchyard and site electrical | todo | | | |
| P05d | Waterways | todo | | | |
| P05e | Headrace tunnel | todo | | | |
| P05f | Construction-stage kit | todo | | | |
| P05g | Weir location: weir, intake, desander | todo | | | |
| P05h | Midway location: Tunnel 1 outlet, pipe bridge, Tunnel 2 inlet | todo | | | |
| P06a | Kit, site, main office | todo | | | |
| P06b | Canteen, kitchens, staff house, QA/QC | todo | | | |
| P06c | Barracks, warehouse, yard, court, gate | todo | | | |
| P06d | Prop library and dressing pass | todo | | | |
| P06e | Weir satellite camp and aggregate plant | todo | | | |
| P07a | Body set and skeleton | todo | | | |
| P07b | Outfits, PPE and gear | todo | | | |
| P07c | Variation system and named staff | todo | | | |
| P07d | Character runtime | todo | | | |
| P08a | Clip plan and acquisition | todo | | | |
| P08b | Retarget, clean, review | todo | | | |
| P08c | Animation runtime | todo | | | |
| P08d | Authored clips and paired actions | todo | | | |
| P09a | Simulation core | todo | | | |
| P09b | Daily programme and role behaviour | todo | | | |
| P09c | Tunnel cycle and set pieces | todo | | | |
| P09d | Selecting, following, person card | todo | | | |
| P09e | Site calendar: weekly, monthly, seasonal routines | todo | | | |
| P09f | Personal routines and a full day for every group | todo | | | |
| P10a | Fleet models and rigs | todo | | | |
| P10b | Driving, traffic, work cycles | todo | | | |
| P10c | Mountain logistics: roads, convoys, deliveries, machine care | todo | | | |
| P11a | Fauna models and clips | todo | | | |
| P11b | Fauna behaviour | todo | | | |
| P11c | Sierra Madre wildlife and animal routines | todo | | | |
| P12a | Visual effects and post | todo | | | |
| P12b | Sound | todo | | | |
| P12c | Live site weather and a sky that follows it | todo | | | |
| P12d | People, animals and machines respond to conditions (heat, rain, wind) | todo | | | |
| P12e | Small nature details and the camp at night | todo | | | |
| P12f | The environment through the day, the month and the year | todo | | | |
| P12g | Surfaces that change: ground, vehicles and people (mud, dust, wear) | todo | | | |
| P13a | Shell, dock, inspector, loading | todo | | | |
| P13b | Search, labels, phone | todo | | | |
| P13c | Tools | todo | | | |
| P13d | Walk mode: character controller, cameras, input | todo | | | |
| P13e | Walk mode: interaction, site rules, guidance | todo | | | |
| P13f | Walk mode: rides, guided visits, extras | todo | | | |
| P14a | Real records and labels | todo | | | |
| P14b | Progress timeline, second-project readiness | todo | | | |
| P15a | Optimisation and full QA | todo | | | |
| P15b | Cut-over and documentation | todo | | | |

## Owner inputs

| Item | Needed by | Status |
| --- | --- | --- |
| Site photographs, DED drawings, PPE colour standard | P02a onward (optional; improves accuracy) | partly supplied 2026-10-09: powerhouse CCTV layout drawing (R1) read; monthly review decks (R2) linked but only the cover seen. Still wanted: powerhouse sections and elevations, a mechanical general arrangement, switchyard and camp layouts, PPE colour standard |
| Permission to download the monthly review decks for local extraction | P00a | given 2026-10-09 for the latest deck only; MPR-53 downloaded and indexed (reference R2) |
| Scope: add upstream works (weir, intake, desander, pipe bridge, tunnel portals) as extra locations? | before P05 | **yes** (2026-10-09): added as P05g, P05h, P06e |
| Approval to show progress percentages and dates publicly | P14b | **yes** (2026-10-09): physical progress and completion dates only |
| Coordinates of the weir and midway locations | P00a | **derived in P00a** (2026-10-09) from grid coordinates printed on the key plans; weir good to about 15 m, the rest to about 5 m |
| Which v1-only camp features really exist (basketball court and stage, QA/QC lab) | P06a | **both exist** (2026-10-09): build them from v1's layout |
| Tunnel 1 length | P05e | **use the latest decks: about 2.58 km** (2026-10-09). **Reopened by P00a:** the printed portal coordinates are 3,008.95 m apart; the owner to confirm which is right |
| Desander general arrangement; a layout or drone photograph of each camp; mechanical general arrangement of the units | P05b, P05g, P06a | asked in the P00a report |
| Whether to close the public equipment call and move the `.blend` files out of `public/` before the plan reaches them | any time | asked in the P00a report |
| Approval of the vertical slice | P02c | pending |
| Mixamo sign-in and downloads from the list | P08a | pending |
| Confirmation of which staff details are real and cleared (licence, experience, province) and that photos match names | P09d | pending |
| Stage-mapping rules reviewed | P14b | pending |
| Which Kia truck model the site uses, and local vehicles | P10a | **answered** (2026-10-10): Kia K2500-type white cab-over drop-side truck (photo shown by the owner); include the hired passenger motorcycle, the tricycle at the lower gate and the carabao sled |
| Optional phone captures (scans of real PPE, tools and vehicles; short videos of real tasks; ground photos; sounds): see `TOOLBOX.md` | any time before P06d, P07b, P08a, P10a | optional |
| Wildlife list | P11c | **approved** (2026-10-10): build all recommended species |
| Go-ahead to make v2 the default | P15b | pending |
