# P01. Foundation

Three sessions. At the end there is an empty but fast v2 that can load compressed assets, stream zones and report its own cost.

## P01a. Renderer decision

**Needs.** P00a.

**Read first.** three's WebGPU entry points in `node_modules/three/` (`build/three.webgpu.js`, `examples/jsm/tsl/`, `examples/jsm/csm/`), `@react-three/fiber` v9 notes on the async `gl` prop, `scripts/bench-twin.mjs`.

**Steps.**
1. Build a throwaway page `app/(dashboard)/digital-twin/spike/page.tsx` (not linked anywhere) with one scene, switchable by `?r=webgl|webgpu`:
   - the real terrain mesh with a 4-layer blended ground material;
   - 3,000 instances of 6 different meshes (use Poly Haven CC0 props via the Blender MCP);
   - 60 skinned characters playing a walk clip (use the existing `public/models/characters/scic_atlas_navigator_pro.web.glb`, cloned with `SkeletonUtils`);
   - one sun with 3-cascade shadows, ambient occlusion, bloom, tone mapping;
   - 8 point lights.
2. Bench both on the Iris Xe laptop at 1440x900 and in the phone profile: fps, p95, time to first frame, pipeline or program compile time, memory. Run each three times.
3. Check in Chrome and Edge. Force the WebGPU build onto its WebGL2 fallback and confirm it still renders.
4. Decide. Adopt WebGPU only if all hold: median fps at least 20% higher, no visual regressions, fallback works, drei pieces we need work (`CameraControls`, `Html`, KTX2 and Meshopt loaders). Otherwise WebGL2.
5. Write the decision and numbers to `DECISIONS.md`. Delete the spike page; keep the bench numbers.

**Deliver.** `review/P01a/REPORT.md` with the table of results and the decision.

**Pass when.**
- [ ] Both paths measured three times each on the target laptop.
- [ ] Decision recorded with numbers. Every later prompt's "chosen renderer" now has a meaning.

## P01b. Scene shell, store, camera, clock

**Needs.** P01a.

**Read first.** `CONTRACTS.md` sections 5 to 7; v1 `CameraController` in `PlantScene.tsx` lines 1420 to 1892 (behaviour to match: zoom to cursor, double-click focus, WASD pan, Escape); `components/twin/data/cameras.json`.

**Steps.**
1. Install `zustand`, `three-mesh-bvh`, `suncalc`. Add types.
2. `components/twin/TwinApp.tsx`: client component, dynamically imported with SSR off, full-bleed canvas, error boundary, WebGL/WebGPU-unavailable fallback message.
3. `engine/renderer.ts`: creates the chosen renderer; sRGB output; AgX tone mapping; pixel ratio from tier; context-loss handler that rebuilds.
4. `engine/loop.ts`: a single frame loop with ordered stages (sim, animation, camera, render). Feature modules register callbacks; no scattered `useFrame`.
5. `state/store.ts`: the store from `CONTRACTS.md`, with URL sync both ways (`replaceState`, debounced) for the keys in section 6.
6. `engine/camera.tsx`: drei `CameraControls`. Requirements:
   - `flyTo(placeId)` eases position and target; any pointer, wheel, touch or key input cancels it within one frame.
   - Wheel zooms toward the point under the cursor; double-click focuses the clicked point; WASD/arrow keys pan; Q/E lower and raise; Shift speeds up.
   - Escape clears selection, stops following, and flies to `overview`.
   - Camera cannot go below terrain (clamp with `lib/twin/terrain.ts`).
   - `prefers-reduced-motion` turns eases into cuts.
7. `sim/clock.ts`: minutes after midnight, `live` mode reads Asia/Manila time, `manual` mode advances by `speed`. Emits to the store at most 4 times a second; exposes an exact value to the loop.
8. Temporary lighting (one sun, flat sky) and the v1 terrain mesh untextured, so there is something to move around.
9. `window.__TWIN__` debug hook as specified.

**Deliver.** The files above; a moving camera over grey terrain at `/digital-twin?v=2`.

**Pass when.**
- [ ] Fly-to is cancelled by each of: drag, wheel, key, touch.
- [ ] Escape returns to overview from any state.
- [ ] Reloading a URL with `?place=` and `?t=` restores that view and time.
- [ ] No React re-render occurs per frame (verify with the React profiler for 5 seconds of orbiting).
- [ ] Type check and lint clean.

## P01c. Asset pipeline, loader, streaming, tiers, bench

**Needs.** P01b.

**Read first.** `CONTRACTS.md` sections 2 and 4.1 to 4.2; `next.config.mjs` (cache headers for `/models`); `scripts/bench-twin.mjs`; gltf-transform CLI help (`npx gltf-transform --help`, and `optimize --help`).

**Steps.**
1. Install `@gltf-transform/cli` as a dev dependency. Check whether KTX-Software (`ktx` or `toktx`) is on the machine; if not, tell the owner the free installer to run and fall back to WebP textures until it is present.
2. `scripts/blender/twin/export_asset.py`: exports a named collection to GLB with LOD meshes, applies transforms, writes custom properties as extras. `scripts/blender/twin/check_asset.py`: fails on the mesh checklist items that can be automated (scale, n-gons on skinned meshes, loose verts, more than 4 weights, triangle and material budgets from `QUALITY-BAR.md`).
3. `scripts/blender/twin/export_zone.py`: walks a `ZONE_` collection and writes `zones/<id>.json` (placements from `PLACE_` empties, stations from `STN_` empties, lights, cameras).
4. `scripts/twin/build-assets.mjs`: for each source GLB: dedupe, weld, prune, resample animations, Meshopt, KTX2 (UASTC for normals and hero base colour, ETC1S elsewhere), content-hash the file name, write `assets.json`. Idempotent; only rebuilds changed sources.
5. Copy the Basis transcoder and Meshopt decoder from `node_modules/three/examples/jsm/libs/` to `public/vendor/twin/` in a `postinstall` step (same pattern as `scripts/sync-maplibre-worker.mjs`).
6. `engine/assets.ts`: one loader with KTX2 and Meshopt wired, a cache keyed by asset id, reference counting and full disposal (geometry, textures, materials) on release.
7. `engine/lod.ts`: LOD selection by screen-space size with hysteresis; `engine/instances.ts`: turns a zone's placements into instanced or batched draws, one per asset LOD.
8. `engine/streaming.ts`: loads and unloads zones by camera distance using `streamIn`/`streamOut`, shows `shell` stand-ins meanwhile, loads at most 2 zones at once, never blocks a frame for more than 8 ms (upload work is sliced).
9. `engine/tiers.ts`: the four tiers (pixel ratio, shadow size and cascades, AO on/off, draw distance, crowd count, vegetation density, texture size cap) and the 2-second start-up probe; dynamic resolution between 0.6 and 1.0 of the tier's pixel ratio when p95 exceeds budget for 2 seconds.
10. `scripts/twin/bench.mjs`: port the v1 bench to `?v=2`; add tier selection, a scripted fly-through read from `data/cameras.json`, per-zone runs, heap sampling, and a JSON result compared against the budget table with pass/fail per line.
11. Prove it: take 5 Poly Haven props through the whole pipeline, place 500 of each in a test zone in the master scene, export, build, stream.
12. Add cache headers for `/textures/twin` and `/vendor/twin` in `next.config.mjs` (read the Next docs first).

**Deliver.** The scripts and engine modules, `assets-src/twin/site_master.blend` (with the terrain imported for reference and one test zone), a working streamed test zone, bench output.

**Pass when.**
- [ ] `node scripts/twin/build-assets.mjs` twice in a row does no work the second time.
- [ ] The test zone draws 2,500 props in 15 draw calls or fewer.
- [ ] Flying away unloads the zone and GPU memory returns to within 5% of the starting value.
- [ ] Empty world plus test zone holds the Medium budget on the laptop.
- [ ] Bench prints pass/fail against every budget line.
