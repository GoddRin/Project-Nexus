# P01a report: renderer decision

2026-10-09, branch `twin-v2`. A throwaway test scene was built, measured on both render paths and deleted. Nothing in the app changed.

## Decision

**Twin v2 uses three.js `WebGPURenderer` (`three/webgpu`) with TSL materials and its automatic WebGL2 fallback.** Decided by the owner on 2026-10-10, overruling this session's result.

What that means for later sessions is in "Building on WebGPU" below. The measurements and the reasoning that follow are unchanged from 2026-10-09 and are kept as the record.

### What the session recommended (2026-10-09, overruled)

The session chose WebGL2. The rule in the prompt was: adopt WebGPU only if its median frame rate is at least 20% higher, there are no visual regressions, the fallback works and the drei pieces work. On the specified scene WebGPU was 12% faster on the desktop profile and 14% faster on the phone profile; against a WebGL path with one obvious fix (ambient occlusion from depth, no second scene pass) the lead was 3% and 8%. That is under 20%, so the rule gives WebGL2.

One thing the owner should know before accepting it: on a lighter scene, sized like the real budget, WebGPU's lead grew to 17 to 26%. That is at the bar, not clearly over it, and it came with a much slower start for visitors whose browser has no WebGPU (see "The case for WebGPU"). I kept to the rule and offered the owner the other side; the owner took it.

## What was measured

- **Machine:** this laptop, Intel Iris Xe (driver 32.0.101.7082), i5-1335U, 16 GB, on mains power, "Ultimate Performance" plan.
- **Browser:** Chrome 154, headless with the GPU on (ANGLE Direct3D 11 for WebGL; WebGPU adapter "intel gen-12lp"), frame cap and vsync off, production build (`next build`, `next start -p 3100`). Every run is a new browser with an empty profile, so shader caches are cold.
- **Profiles:** desktop 1440 x 900; phone 390 x 844 at 2x (a 780 x 1688 canvas). The phone profile is emulated on the same laptop: it shows the effect of the canvas shape, not of a phone's graphics chip.
- **Scene (the same data on every path):** v1's real terrain mesh with a 4-layer blended ground (12 textures: colour, normal and roughness for gravel, dirt, forest floor and rock); 3,000 instances of 6 Poly Haven props (about 500 triangles each); 60 copies of the Atlas Navigator playing its walk clip (66,039 triangles and 10 skinned meshes each); one sun with 3 shadow cascades at 2,048 px; ambient occlusion (GTAO, full resolution, 16 samples); bloom; AgX tone mapping; 8 point lights; drei `CameraControls` and one drei `Html` label.
- **Paths:**
  - **WebGL:** `WebGLRenderer`, three's `CSM`, `EffectComposer` with `GTAOPass`, `UnrealBloomPass`, `OutputPass`; ground material patched with `onBeforeCompile`.
  - **WebGPU:** `WebGPURenderer` (`three/webgpu`), `CSMShadowNode`, `RenderPipeline` with the GTAO and bloom nodes; ground material in TSL.
  - **WebGPU forced to WebGL2:** the same code with `forceWebGL: true`. This is what a visitor without WebGPU would get if WebGPU were adopted.
- Frame rate is frames drawn over 10 seconds, after the scene reports ready and 7 seconds have passed. Three runs each; the table gives the median run.

## Results: the specified scene

About 5.5 million triangles in view, drawn four or five times a frame (3 shadow cascades, the colour pass, and on stock WebGL a normal pass for the occlusion). Far over the budget on purpose.

| Measure | WebGL | WebGL, occlusion from depth | WebGPU | WebGPU forced to WebGL2 |
| --- | --- | --- | --- | --- |
| **Desktop: frames a second** (3 runs) | **11.5** (11.5, 11.5, 10.9) | **12.5** (12.5, 12.4, 12.8) | **12.9** (12.9, 12.8, 13.1) | **12.4** (12.3, 12.4, 12.4) |
| Desktop: p95 frame time | 97.6 ms | 119.9 ms | 92.3 ms | 96.7 ms |
| Desktop: WebGPU's lead over this column | +12% | +3% | | +4% |
| **Phone profile: frames a second** | **12.0** (12.0, 12.0, 11.8) | **12.7** (12.7, 12.8, 12.7) | **13.7** (13.5, 13.7, 13.9) | **13.0** (13.1, 13.0, 12.9) |
| Phone profile: p95 frame time | 102.4 ms | 120.2 ms | 87.3 ms | 83.6 ms |
| Phone profile: WebGPU's lead | +14% | +8% | | +5% |
| Shader or pipeline compile (desktop) | 0.84 s | 0.85 s | 3.86 s | 8.67 s |
| First full frame after compile (desktop) | 4.15 s | 4.54 s | 2.69 s | 9.62 s |
| **Page open to first frame (desktop)** | **9.2 s** | 9.5 s | **10.8 s** | **22.5 s** |
| Page open to first frame (phone profile) | 8.3 s | 8.9 s | 8.8 s | 17.6 s |
| Draw calls a frame | 3,050 | 2,443 | 2,439 | 2,439 |
| Triangles a frame | 27.3 M | 21.9 M | 21.9 M | 21.9 M |
| Shader programs or pipelines | 39 | 35 | 46 | 46 |
| Textures held | 665 (600 are bone textures) | 665 | 64 | 64 |
| JS heap | 60 MB | 70 MB | 95 MB | 99 MB |
| Graphics process memory (private) | 1,763 MB | 1,805 MB | 2,063 MB | 1,619 MB |

WebGPU with occlusion from depth was also run: 13.1 (desktop) and 13.7 (phone profile), the same as with its normal buffer.

## Results: a budget-sized scene

Not asked for by the prompt; added because the specified scene is limited by triangle count, which the real twin will not be. 8 people and 360 props: about 710 thousand triangles in view, the Medium budget's figure. Everything else unchanged.

| Measure | WebGL | WebGL, occlusion from depth | WebGPU | WebGPU forced to WebGL2 |
| --- | --- | --- | --- | --- |
| **Desktop: frames a second** | **30.0** (28.7, 30.0, 30.0) | **28.9** (28.9, 28.9, 27.7) | **35.2** (35.2, 35.1, 35.4) | **37.3** (37.3, 36.9, 37.7) |
| Desktop: WebGPU's lead | +17% | +22% | | -6% |
| **Phone profile: frames a second** | **30.0** (30.0, 30.0, 30.0) | **28.9** (30.0, 28.1, 28.9) | **36.3** (36.3, 36.7, 35.3) | **37.8** (37.8, 38.3, 37.6) |
| Phone profile: WebGPU's lead | +21% | +26% | | -4% |
| Page open to first frame (desktop) | 8.4 s | 8.8 s | 9.5 s | 21.5 s |
| Draw calls a frame | 450 | 363 | 359 | 359 |

Where the difference comes from (desktop, one run each, same budget-sized scene):

| Switched off | WebGL | WebGPU | WebGPU forced to WebGL2 |
| --- | --- | --- | --- |
| Occlusion and bloom | 54.2 | 63.9 | 51.1 |
| Occlusion, bloom, shadows and point lights | 103.5 | 133.0 | 117.1 |
| Bloom only (occlusion from depth) | 29.1 | 38.0 | not run |

Two things stand out. Occlusion at full resolution costs about half the frame on every path. And the same WebGPU code running on WebGL2 is as fast as on WebGPU once post effects are on, so most of the lead belongs to three's newer renderer and its merged post chain, not to WebGPU itself.

## Chrome and Edge, visible windows

Budget-sized scene, 1440 x 900, the display's 60 Hz cap left on, one run per path.

| Browser | WebGL | WebGPU | WebGPU forced to WebGL2 |
| --- | --- | --- | --- |
| Chrome 154 | 30.7 fps, p95 33.6 ms | 37.6 fps, p95 33.5 ms | 37.0 fps, p95 33.6 ms |
| Edge 154 | 26.9 fps, p95 50.1 ms | 32.2 fps, p95 33.5 ms | 33.1 fps, p95 33.7 ms |

All three paths drew the scene correctly in both browsers. The forced fallback worked and looked the same; its cost is the start-up time above.

## The four conditions

| Condition | Result |
| --- | --- |
| Median frame rate at least 20% higher | **Not met** on the specified scene: +12% desktop, +14% phone profile (+3% and +8% against WebGL with occlusion from depth). On the budget-sized scene: +17% to +26% |
| No visual regressions | Met in the captures: terrain blend, props, skinned people, cascaded shadows, occlusion, bloom and tone mapping match between paths (`spec-*.jpg`, `budget-*.jpg`). One incident, in the dev server only: a WebGPU page stayed black with a validation error about a 300 x 150 depth buffer. It did not recur in 45 production runs |
| Fallback works | Works, and draws the same picture. Starts in 17 to 22 s against 8 to 9 s for plain WebGL |
| drei pieces work | `CameraControls`: yes on both. `Html`: yes on both. Meshopt loader: yes on both (the navigator file is Meshopt-compressed). **KTX2: not tested with a real file**: there is no KTX2 encoder on this machine yet (that is P01c's first step). `KTX2Loader` has a WebGPU branch in its source; that is all I can say |

## The case for WebGPU, so the owner can overrule

- At a realistic load it is 17 to 26% faster here, which is worth about 5 to 7 frames a second at 30.
- It holds 64 textures where WebGL holds 665, because WebGL keeps one bone texture per skinned mesh.
- TSL materials are written once for both backends.

Against it:

- The specified test, the one the rule names, came in under the bar.
- A visitor without WebGPU waits about twice as long for the first frame (17 to 22 s). Those visitors are likely to be on the weaker devices.
- First frame is not faster on WebGPU either (9.5 to 10.8 s against 8.4 to 9.2 s on the desktop profile).
- Part of the lead can be had on WebGL: drawing shadow maps once a frame and taking occlusion from depth removed a fifth of the triangles; a merged post chain (the `postprocessing` library already in the project, not tested here) should close more.
- KTX2 under WebGPU is unproven on this machine.

## Building on WebGPU

What the spike already proved, and what it leaves for P01b and P01c to deal with.

1. **Set-up that worked:** `import * as THREE from "three/webgpu"`; the R3F `Canvas` takes `gl={async (props) => { const r = new THREE.WebGPURenderer({ canvas: props.canvas, antialias: false }); await r.init(); return r; }}`; shadows through `CSMShadowNode` set on `light.shadow.shadowNode`; post effects through `RenderPipeline` with `pass()`, the GTAO node and the bloom node; `renderer.toneMapping = AgXToneMapping`. The working code is in `spike-src/SpikeWebGPU.tsx.txt`.
2. **Plain glTF materials need no rewriting.** `MeshStandardMaterial` from `GLTFLoader` rendered as it was. Only custom shading has to be TSL: `onBeforeCompile` and `ShaderMaterial` do not work on this renderer.
3. **The `postprocessing` and `@react-three/postprocessing` packages do not work with this renderer.** Post effects are TSL nodes (`three/examples/jsm/tsl/display/`). v1 keeps using the old packages; v2 must not import them.
4. **Visitors without WebGPU start slowly.** The WebGL2 fallback took 17 to 22 s from page open to first frame against 8 to 11 s on WebGPU, almost all of it shader compilation. P01b's loading screen must cover it, and P01c should try the obvious remedies (fewer material variants, compiling zone by zone with `compileAsync`, a lighter post chain on the fallback) and measure again. The fallback's frame rate is not the problem: it ran as fast as WebGPU.
5. **The canvas must have its real size before the first frame.** The one failure seen (dev server, a black page, a validation error about a 300 x 150 depth buffer) fits a first frame drawn at the canvas's default size. P01b should size the renderer before rendering and handle the renderer's error event by rebuilding.
6. **KTX2 under WebGPU is still to be proved.** P01c must load a real Basis file on WebGPU and on the fallback before the asset pipeline depends on it; WebP is the stand-by.
7. **Firefox and Safari were not checked.** P01b should check both, since they decide who gets the fallback.
8. **Debug figures differ:** draw calls are `renderer.info.render.drawCalls` (`calls` counts passes), and there is no `info.programs`; the spike read the pipeline cache. `CONTRACTS.md` section 7's `stats()` should report pipelines for `programs`.

## What later phases should take from this

1. **Sixty full-detail people cannot be afforded on either path.** 60 navigators at 66 thousand triangles gave 11 to 13 fps. P07 and P02c need the planned LODs (20k, 6k, 1.5k) and a crowd count per tier. The risk "80 skinned people too slow" stays open with this as its first evidence.
2. **Ambient occlusion at full resolution is too dear for Medium on Iris Xe**: it halves the frame rate. P12a should use half resolution or fewer samples and keep it off on Low.
3. (WebGL only, no longer needed: with a multi-pass composer, set `shadowMap.autoUpdate = false` and request one update a frame, or every scene pass redraws all the shadow maps.)
4. **Occlusion from the depth buffer or from a normal buffer cost the same on WebGPU** (13.1 against 12.9 fps); either will do.
5. **Pass `shadows` to the R3F `Canvas`.** Without it R3F switches shadows off again when it reconfigures, which silently voided one early run.
6. With the frame cap off, WebGL frames arrive in bursts with stalls of 0.3 to 0.45 s between them; with the cap on, pacing is even (33 ms). Frames per second is the figure to trust from an uncapped bench, not p95. P01c's bench should say so or run capped.

## Not done, or done only in part

- **KTX2** was not exercised (above).
- **The phone profile is not a phone.** No real handset was measured.
- **The probes and the browser checks are single runs**; only the two main scenes have three runs.
- **Graphics memory** is the browser's GPU process as Windows reports it, not a per-page figure. Iris Xe shares system memory.
- **Firefox and Safari** were not checked. Only the forced fallback stands in for a browser without WebGPU.
- **The props were cut to about 500 triangles with a decimate modifier** and are not review-quality assets; they and four ground textures (all Poly Haven, CC0: Barrel_01, Barrel_02, cement_bag, concrete_road_barrier, metal_jerrycan, plastic_crate_02; forrest_ground_01, dirt_floor, rocky_trail, rock_face_03) were deleted with the spike, so `CREDITS.md` has no rows for them.
- **The first matrix was re-run in part.** A bug of mine (an explicit `undefined` depth texture) made the stock WebGL rows fail the first time; they were re-run after a rebuild and are in `bench-spec-webgl.json` and `bench-budget-webgl.json`. The failed rows are still in `bench-spec.json` and `bench-budget.json` beside the valid WebGPU rows.

## For the owner

1. **Decided 2026-10-10: WebGPU.** Nothing further is needed from you on this.
2. **The app wrote 36 new speech clips** into `public/voice/` and `voice-bank/atlas-tts/` (and touched `public/voice/manifest.json`) while the bench was loading pages. They are not part of this commit and are left as they are.
3. Blender's open scene was the unsaved default; I emptied it to bring the props in and left it empty.

## Files

- `bench-*.json`: every run, raw. `spike-src/summarise.cjs.txt` prints the medians.
- `spec-*.jpg`, `budget-*.jpg`, `chrome-vsync-*.jpg`, `edge-vsync-*.jpg`: captures per path.
- `spike-src/`: the deleted spike page, both render paths, the shared scene and the bench script, kept as text so the test can be rebuilt.
