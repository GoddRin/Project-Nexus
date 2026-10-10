# P01c report: asset pipeline, loader, streaming, tiers, bench

2026-10-10, branch `twin-v2`. Twin v2 can now take a model from Blender to the browser: export, check, compress, load, draw many copies cheaply, swap detail by distance, stream a zone in and out, pick a quality tier, and measure itself against the budget. It is proved on five small props placed 2,500 times. Nothing a visitor sees has changed: the test props load only with `?testzone=1`.

## Result

Four of the five "Pass when" checks pass outright. The fifth passes on the numbers but proves little yet, because nothing costly is drawn.

| Pass when | Result | Evidence |
| --- | --- | --- |
| `build-assets.mjs` twice in a row does no work the second time | **Pass** | First run: 5 built. Second run: "0 built, 5 up to date … Nothing to do", no file rewritten |
| The test zone draws 2,500 props in 15 draw calls or fewer | **Pass** | 5 draw calls from the overview, 8 close up with all three detail levels in use, 9 at most in the bench |
| Flying away unloads the zone and GPU memory returns to within 5% of the starting value | **Pass** | 32.5 MB with the zone, 11.6 MB after, 11.6 MB at the start (0.0% apart). Textures 18 back to 3, geometries 17 back to 2. Five more loads and unloads: 11.6 MB every time |
| Empty world plus test zone holds the Medium budget on the laptop | **Pass, with a caveat** | Every budget line passes with a great deal of room (table below). The scene has no shadows, no post effects, no people and no lamps, so this says the pipeline adds little cost, not that the budget is safe |
| Bench prints pass/fail against every budget line | **Pass** | 11 lines per profile, each PASS or FAIL with the measured value and the budget |

One of the steps is only partly met: **"never blocks a frame for more than 8 ms"** holds on WebGPU (3.3 to 4.9 ms) but not reliably on the WebGL2 fallback (4.1 and 8.0 ms in Chrome, 13 ms in the Firefox and WebKit test browsers). Details under "Known gaps".

**KTX2: done in a follow-up the same day**, after the owner installed KTX-Software. See "Follow-up: KTX2" at the end; the sections in between describe the first pass, made with WebP textures.

## The pipeline, measured

Five Poly Haven props (CC0): two steel drums, a cement bag, a jerrycan, a propane tank. Each has three detail levels.

| Asset | As exported from Blender | Shipped | Triangles, LOD0 / 1 / 2 |
| --- | --- | --- | --- |
| `prop.cement-bag` | 4,329 KB | 75 KB | 844 / 400 / 150 |
| `prop.drum-blue` | 5,275 KB | 127 KB | 1,473 / 400 / 150 |
| `prop.drum-red` | 4,282 KB | 159 KB | 1,498 / 399 / 150 |
| `prop.jerrycan` | 6,610 KB | 193 KB | 1,499 / 399 / 195 |
| `prop.propane-tank` | 6,176 KB | 207 KB | 1,475 / 375 / 175 |
| **All five** | **26.7 MB** | **0.76 MB** | |

Build time 0.2 to 0.3 s per asset. Textures are 512 px WebP (the small-prop class's size), geometry is quantized and Meshopt-compressed.

## Bench: against the budget

Iris Xe laptop, Chrome 154, production build (`next start -p 3100`), 1440 x 900 window (canvas 1184 x 844). Desktop profile on Medium, phone profile (390 x 844 at 2x) on Low. Dynamic resolution off. Raw results: `twin2-p01c-*.json` in this folder.

| Budget line | Budget (Medium / Low) | Desktop, Medium | Phone profile, Low |
| --- | --- | --- | --- |
| Median frame rate, overview | 45 / 30 fps or better | 320.5 fps (frame cap off); 60.1 in a visible window | 854.6; 60.1 |
| Frame rate over the fly-through (31 places) | 45 / 30 fps or better | 367.1 fps; worst place 176.8 | 928; worst 475.6 |
| p95 frame time, overview | 33 / 50 ms or less | 4.3 ms; 16.9 ms in a visible window | 1.8; 16.9 |
| Draw calls, most seen | 350 / 200 or fewer | 11 | 7 |
| Triangles in view, most seen | 700k / 300k or fewer | 415,768 | 171,678 |
| Pipelines | 40 / 30 or fewer | 17 | 17 |
| Real-time lights | 9 / 5 or fewer | 1 (the temporary sun) | 1 |
| First usable view, warm cache | 6 / 8 s or less | 1.76 s (0.96 s in a visible window) | 1.11 s |
| Download to first view | 12 / 8 MB or less | 2.14 MB (scripts 1.2, twin assets 0.62) | 2.14 MB |
| Download, whole site | 70 / 40 MB or less | 2.95 MB | 2.95 MB |
| JS heap after 20 minutes | no growth trend | -0.04 MB a minute over 22.5 minutes: 22 MB throughout (17 laps of the fly-through) | not run for 20 minutes; -0.15 to +0.65 MB a minute over 1.6 minutes |

Other runs:

| Run | Overview | Fly-through | Zone seen from above |
| --- | --- | --- | --- |
| WebGL2 fallback (`--force-webgl`), desktop | 155.9 fps | 254 fps, with one place at 33.6 fps | 132.6 fps |
| WebGL2 fallback, phone profile | 488.3 fps | 559.8 fps | 538.4 fps |
| Empty world (no zone), desktop | 432.9 fps, 2 draw calls, 8,193 triangles | 637 fps | |
| Test zone from above, desktop, WebGPU | | | 219.2 fps, 9 draw calls, 353,480 triangles, LOD0/1/2 = 0 / 60 / 1,918 |

So the zone costs about a quarter of the frame rate of an empty world (432.9 down to 320.5 fps) for 411 thousand triangles and 5 draw calls.

## Checks: `scripts/twin/check-pipeline.mjs`

14 checks, plus KTX2 reported as not measured. Raw results: `check-prod-*.json`.

| Run | Backend | Result | Zone in after the page is usable | Longest task while streaming in |
| --- | --- | --- | --- | --- |
| Chrome 154 | WebGPU | 14 of 14 | 0.5 to 0.9 s | 3.3 and 4.5 ms |
| Chrome 154, `--force-webgl` | WebGL2 fallback | 14 of 14 | 1.0 to 1.7 s | 4.1 and 8.0 ms |
| Edge 155 | WebGPU | 14 of 14 | 0.8 s | 4.9 ms |
| Firefox 153 (Playwright build) | WebGL2 fallback | 13 of 14 | 1.2 s | **13.0 ms (fails the 8 ms line)** |
| WebKit 26.5 (Playwright build) | WebGL2 fallback | 13 of 14 | 6.2 s | **13.0 ms (fails)** |

What the checks cover, with Chrome's numbers:

- **Streams in:** 2,500 placements of 5 assets, 760 KB.
- **Draw calls:** 5 from the overview (2,462 props in view, all at LOD2, 38 outside the view).
- **Detail levels:** close up, LOD0/1/2 = 9 / 328 / 1,649, the rest outside the view. With the camera still, no prop changes level in 90 frames.
- **Unloads, memory returns:** above.
- **No stall while streaming in:** worst frame 17.5 ms and p95 17.0 ms while the zone loads, against 16.7 ms with nothing loading.
- **Stand-in shell:** shown while the zone is out, hidden while it is in, removed cleanly. Tested with a prop standing in as the shell, because no real shell asset exists.
- **Tiers set the pixel ratio:** on a 2x screen, Low 1, Medium 1.25, High 1.5, Ultra 2.
- **Dynamic resolution:** fed slow frames it steps 0.9, 0.8, 0.7, 0.6 and stops (pixel ratio 1.25 down to 0.75); fed quick frames it climbs back one step at a time. It survives a window resize.
- **Start-up probe:** scores 3.5 on WebGPU and 0.9 to 1.2 on the fallback and picks Medium for this laptop; the second visit uses the remembered tier.
- **No console errors.**

Also run: `scripts/twin/check-lod.mts` (5 of 5: levels by distance, hysteresis, no flicker on a boundary), and P01b's `check-shell.mjs` again as a regression test: 22 of 22 on the production build (WebGPU and forced WebGL2), 23 of 23 on the dev server with 0 React commits over 301 frames. `npx tsc --noEmit` and `eslint` are clean for `components/twin`, `lib/twin` and `scripts/twin`; `npx next build` compiles.

## What was built

| File | What it does |
| --- | --- |
| `scripts/blender/twin/twin_lib.py` | Shared helpers; documents how an asset and a zone are laid out in a .blend |
| `scripts/blender/twin/check_asset.py` | Fails an asset on: missing LOD0, negative scale, origin not at the base centre, loose vertices or edges, n-gons on a skinned mesh, more than 4 bone weights, too many bones, no UV map, triangles or materials over budget, a level not lighter than the one before. Warns on non-manifold edges and zero-area faces |
| `scripts/blender/twin/export_asset.py` | Exports an asset collection to a source GLB with its LOD meshes, transforms applied, custom properties as extras, and a sidecar file. Refuses a failing asset. `make_lods` builds stand-in LODs by decimation |
| `scripts/blender/twin/export_zone.py` | Writes `zones/<id>.json` from a `ZONE_` collection: placements, lights, cameras; stations go to `stations.json` |
| `scripts/twin/asset-budgets.json` | The budgets of `QUALITY-BAR.md` section 1, read by the checker and the build |
| `scripts/twin/build-assets.mjs` | The build: dedupe, weld, prune, resample, textures, Meshopt, hash, `assets.json`, `zones/index.json`, budget and credit checks |
| `scripts/twin/sync-vendor.mjs` | Copies the Basis transcoder into `public/vendor/twin/basis/` after every install |
| `components/twin/engine/assets.ts` | The loader: Meshopt and KTX2 wired, cache by asset id, reference counts, full disposal |
| `components/twin/engine/lod.ts` | Level selection by size on screen, with hysteresis |
| `components/twin/engine/instances.ts` | One instanced draw per LOD part; per-copy level and view culling |
| `components/twin/engine/streaming.ts` | Zones in and out by camera distance, shells, 2 at once, on-frame work in small tasks |
| `components/twin/engine/tiers.ts` | The four tiers, the start-up probe, dynamic resolution |
| `components/twin/engine/Engine.tsx` | Now also runs the probe, applies the pixel ratio, starts streaming, reports more in `stats()` |
| `scripts/twin/bench.mjs` | The bench: tiers, fly-through, per-zone runs, heap sampling, pass/fail per budget line |
| `scripts/twin/check-pipeline.mjs`, `check-lod.mts` | The checks above |
| `assets-src/twin/site_master.blend` | The master scene: v1's terrain for reference, the five props in `LIB_prop`, the test zone. **On this machine only** (git-ignored, 20.7 MB) |
| `next.config.mjs` | Cache headers for `/textures/twin` and `/vendor/twin` |
| `components/twin/ui/ShellHud.tsx` | A quality selector (Auto, Low, Medium, High, Ultra) in the stand-in controls |

Installed (dev dependencies): `@gltf-transform/cli`, `core`, `extensions`, `functions` 4.5.1, `meshoptimizer` 1.1.1, `sharp` 0.35.5. `npm` reported audit findings after the install; they were not looked into.

## Faults found on the way

- **Two versions of `sharp` in one process.** The first build failed on every asset with "colourspace: parameter space not set". The root had sharp 0.34 and a gltf-transform dependency loaded 0.35. Fixed by setting the root dev dependency to 0.35.5; Next keeps its own copy.
- **Decimation leaves stray vertices and overshoots.** The checker caught two props whose LOD2 had loose vertices and too many triangles. `make_lods` now cleans, measures and tightens. Two props would not go below about 175 to 195 triangles, so the optional LOD2 allowance for small props is 200, not 150.
- **The probe measured loading, not the card.** With the zone streaming in during the probe, fallback scores ranged from 0.39 to 7.06. Streaming now waits for the probe, and the score is the middle of the three best quarter-seconds: 0.9 to 1.2 since.
- **My own test runs disturbed each other.** The first Edge, Firefox and WebKit checks ran while the 20-minute soak was running. Dynamic resolution did its job and shrank the canvas, which showed up as "memory not returned". They were run again alone, with dynamic resolution held still for the memory comparison; the files in this folder are from those runs.

## Known gaps and things not checked

- **KTX2: not exercised at all.** The build's KTX2 branch and the loader's KTX2 wiring have never run. The risk row stays open.
- **The 8 ms line on the WebGL2 fallback.** Compiling one material's pipeline is a single step inside three.js and cannot be cut smaller. It took 3 to 5 ms on WebGPU, 4.1 and 8.0 ms on Chrome's fallback, 13 ms in the Firefox and WebKit test browsers (worst frame there 133 ms and 85 ms). With real materials this will be worse on the fallback.
- **The budget is not really tested.** No shadows, post effects, people or lamps exist. P02c is where it is.
- **Skinned assets.** `export_asset.py` and `check_asset.py` have code for rigged meshes; none has been through it.
- **Lights and stations in `export_zone.py`** are written but the test zone has none. The zone's one camera is exported but the app does not read zone cameras yet.
- **A placement's `stage` and `pick`** are ignored by streaming for now.
- **The texture size cap by tier** has not run: the props' textures are 512 px and the lowest cap is 512.
- **Tier fields with no consumer yet:** shadows, occlusion, crowd, vegetation, lights.
- **The probe is calibrated on this laptop only**, and measures shading speed, not triangle throughput.
- **The props are test props**, reduced by decimation and looked at once in Blender, not reviewed against `QUALITY-BAR.md`. The yard of 2,500 is not a real layout.
- **First visit is slower:** 3.9 to 4.5 s to a usable view while the probe runs, against 1.0 to 1.2 s afterwards.
- **One unexplained dip:** on the fallback, one place of the fly-through ran at 33.6 fps while the rest ran at 250 and more. Not reproduced or traced.
- **The page around the twin keeps downloading:** during the 20-minute soak about 12 MB arrived that was not twin assets (the dashboard's own polling; not traced further). The bench's "whole site" line now counts the first view plus twin assets only.
- **Not a real phone, not a real Safari or Firefox.** As in P01b.
- **Frame rates from the soak run** (`twin2-p01c-soak20.json`) were taken while other tests ran and should not be quoted; only its heap figures are used.

## For the owner

1. **Install KTX-Software** (free, Apache-2.0) so textures can be built as KTX2: the Windows installer from `https://github.com/KhronosGroup/KTX-Software/releases`, with the option that adds it to the PATH. Then say so; the next session runs `node scripts/twin/build-assets.mjs --force` and the checks on both backends. Until then textures are WebP, which works.
2. **To look at it:** `http://localhost:3000/digital-twin?v=2&testzone=1` on the dev server. The props are on the camp pad; fly in close to see the detail levels change. The Quality list is in the top bar.
3. **Someone else was editing the plan while this ran.** `STATE.md`, `README.md`, `MASTER-BRIEF.md`, `TOOLBOX.md`, `reference/INDEX.md` and several phase files changed on disk during the session. This commit holds only this session's lines in `STATE.md`; the other edits are left uncommitted, as found.
4. **Blender now has `assets-src/twin/site_master.blend` open**, saved.
5. Speech clips written by the dashboard into `public/voice/` and `voice-bank/`, if any appeared, are left out of this commit as before.

## Files in this folder

- `check-prod-<browser>.json`, `check-dev-chrome.json`: every pipeline check with its measured detail.
- `check-shell-*.json`, `shell-shell-*.jpg`: P01b's shell checks, run again.
- `twin2-p01c-zone.json` (the budget table above), `-zone-visible`, `-zone-webgl2`, `-empty`, `-soak20`: bench results.
- `zone-<run>-overview.jpg`, `-near.jpg`: the test zone per browser.
- `props-close-<time>.jpg`: the props at 05:40, 12:00, 17:10 and 21:00 under the temporary light; `props-close-<prop>-noon.jpg`; `zone-visible-yard-noon.jpg`.

## Follow-up: KTX2 (2026-10-10, after KTX-Software was installed)

The owner installed KTX-Software (`ktx` v5.0.0-rc2). The five props were rebuilt with `node scripts/twin/build-assets.mjs --force` and everything was run again on the production build.

**Result: KTX2 works on WebGPU and on the WebGL2 fallback.** All 15 textures of the zone reach the graphics card still compressed (as BC7, 512 px, 10 mip levels), and the picture matches the WebP one (`props-close-noon-1200-ktx2.jpg` beside `props-close-noon-1200.jpg`).

A fault was found and fixed on the way: **the sign-in proxy was sending the texture decoder's `.wasm` file to the sign-in page.** For a signed-out visitor no KTX2 texture could have loaded, and the zone stayed "loading" for ever with no message. Fixed in three places:

- `proxy.ts`: `/vendor/twin/` and `/textures/twin/` are public, like `/models/`. This is the one file changed outside the twin's own folders; it only adds two static paths.
- `engine/assets.ts`: a file that has not loaded and decoded in 45 seconds counts as failed.
- `engine/streaming.ts`: a zone that fails to load is released and tried again after 30 seconds, instead of holding a loading slot.

| Measure | WebP (first pass) | KTX2 |
| --- | --- | --- |
| Five props, shipped | 0.76 MB | 2.10 MB |
| Download to first view, with the test zone | 2.14 MB | 3.69 MB (0.58 MB of it the decoder, fetched once) |
| GPU memory the zone adds, by the renderer's own count | 20.9 MB | 0.9 MB |
| Build time per asset | 0.2 to 0.3 s | about 1 s |
| Overview, Medium, frame cap off | 320.5 fps | 326.1 fps |
| Zone in, after the page is usable (WebGPU / fallback) | 0.5 to 0.9 s / 1.0 to 1.7 s | 1.0 to 1.3 s / 2.0 s |

So KTX2 trades a larger download for far less graphics memory. Most of the size is the normal maps, kept in the higher-quality mode (265 KB each against 61 KB for a colour map). The 0.9 MB is three.js's own count and looks low for 15 compressed textures (about 5 MB would be expected), so read it as "much less", not as an exact figure.

`check-pipeline.mjs` now has a real KTX2 check in place of "not measured":

| Run | Backend | Result | Longest task while streaming in |
| --- | --- | --- | --- |
| Chrome 154 | WebGPU | 15 of 15 | 6.9 ms |
| Chrome 154, `--force-webgl` | WebGL2 fallback | 15 of 15 | 3.0 ms |
| Edge 155 | WebGPU | 15 of 15 | |
| Firefox 153 (Playwright build) | WebGL2 fallback | 14 of 15 | 11.0 ms (over the 8 ms line, as before) |
| WebKit 26.5 (Playwright build) | WebGL2 fallback | 14 of 15 | 14.0 ms (as before) |

Bench with KTX2 (`twin2-p01c-ktx2.json`): every budget line passes on both profiles; desktop 326.1 fps at the overview, 401.5 over the fly-through, first usable view 1.48 s; phone profile 882.4 fps.

Still open after this follow-up (both taken up in "Follow-up 2" below):

- The 8 ms line on the WebGL2 fallback in the Firefox and WebKit test browsers (unchanged).
- KTX2 sizes are not tuned: the settings are the first ones tried. P02c should weigh download against memory on real assets.
- This session's terminal did not see `ktx` on its PATH (it was started before the install), so the build was run with `C:\Program Files\KTX-Software\bin` added by hand. A new terminal has it.
- Files from the first pass (`check-prod-*.json`, `twin2-p01c-zone*.json`, `-empty`, `-soak20`) are WebP runs; `check-ktx2-*.json` and `twin2-p01c-ktx2.json` are the KTX2 runs. The 20-minute heap soak was not repeated with KTX2.

## Follow-up 2: the 8 ms line in Firefox and WebKit, and the KTX2 soak (2026-10-10)

The owner asked for the two items left open above.

### The 20-minute heap soak with KTX2: done, passes

`twin2-p01c-ktx2-soak20.json`: 17 laps of the fly-through over 22.4 minutes, desktop profile, Medium, nothing else running. The heap sat at 27 to 28 MB from the fifth sample to the last (-0.16 MB a minute; the first sample, 41 MB, was taken before the first clean-up). Every other budget line passes in the same run: 306 fps at the overview, 365.8 over the fly-through, first usable view 1.43 s.

### The 8 ms line: much improved, still 1 to 4 ms over in the two test browsers

**What was actually wrong was worse than the first report said.** The old check timed only streaming's own tasks. Timing what three.js does after a task hands over showed:

- **Firefox froze for about 95 ms, fifteen times, every time the zone streamed in** (1.3 s in all). The old check reported "13 ms".
- three.js was building a separate shader for every instanced draw: 15 builds and 15 programs for 5 materials.

Three changes:

1. **Draws now share shaders.** three's `InstancedMesh` ties each instanced mesh to a shader of its own. The twin now draws a plain mesh over an instanced geometry whose per-copy matrices are named attributes, so the shader depends only on the material and the vertex layout. Result: 5 shader builds instead of 15, and 5 pipelines in all instead of 17, shared across LODs and zones.
2. **Firefox no longer freezes on a shader compile.** Firefox compiles in the background and only blocks when asked for the result; three.js asked at once. A small stand-in (`engine/renderer.ts`, `deferLinkStatus`) makes it ask 300 ms later, when the answer is ready. Measured: the longest wait went from 95 ms to 1 ms.
3. **The shader-build step gets a frame to itself**, instead of being stacked on texture uploads in the same frame.

`check-pipeline.mjs` now times all three things that can hold the page: streaming's tasks, the first step of three.js's shader build, and the wait on the browser's compile. Results (`check-shared-*.json`), production build:

| Run | Backend | Result | Longest task | Longest shader-build step | Longest wait on the browser's compile |
| --- | --- | --- | --- | --- | --- |
| Chrome 154 | WebGPU | 15 of 15 | 5.3 ms | 4.9 ms | 1.6 ms |
| Chrome 154, `--force-webgl` | WebGL2 fallback | 15 of 15 | 4.6 ms | 4.3 ms | 0.5 ms |
| Edge 155 | WebGPU | 15 of 15 | 4.4 ms | 3.9 ms | 0.4 ms |
| Firefox 153 (Playwright build) | WebGL2 fallback | 14 of 15 | **11.0 ms** | 9.0 ms | 1.0 ms (was about 95 ms) |
| WebKit 26.5 (Playwright build) | WebGL2 fallback | 14 of 15 | **12.0 ms** | 12.0 ms | 1.0 ms |

**Why the last two still fail.** What remains is one step: the first part of three.js building a material's shader, which happens once per material when a zone streams in. It takes 4 to 5 ms in Chrome and Edge and 9 to 12 ms in the Firefox and WebKit test browsers, whose JavaScript runs this code about twice as slowly. three.js already splits the rest of the build across frames; this first part is a single call that cannot be cut from outside the library. So the 8 ms line is met in Chrome and Edge on both backends and missed by 1 to 4 ms in those two browsers.

What that miss means in practice: a 60 Hz frame has 16.7 ms and the twin's own work in a frame is about 2 ms, so a 12 ms step should still fit without a dropped frame. That could not be shown in those two browsers, because their headless builds draw the zone at about 12 frames a second whatever streaming is doing (83 ms frames with the zone simply in view, measured), which is why the "worst frame" figures for them say nothing about streaming. In Chrome's fallback, where frames can be judged, the worst frame while streaming in was 17.8 ms.

Also changed on the way:

- **A fault in my own first version of change 1, caught by the checks:** draws shared vertex buffer objects, and unloading one destroyed buffers another was still using ("buffer used in submit while destroyed" on WebGPU). Each draw now has its own buffer objects over the same data.
- **The build drops Blender's index-of-refraction and specular extensions** unless an asset's sidecar says `"physical": true`. They turn a plain material into three's larger "physical" one. It did not change the timings measured here; one prop's file changed.
- GPU memory the zone adds is now 2.2 MB by the renderer's count (0.9 MB before): each draw holds its own copy of the vertex buffers.

Not checked: a real Firefox or Safari. Current desktop Firefox has WebGPU, so it would take the WebGPU path rather than this fallback; that was not tried on this machine.
