# P02e report: paying for the look

2026-10-15, branch `twin-v2`. One session. The slice now keeps screen-space occlusion on Medium, and the lamps, textures and loading pay for it.

**Status: done, with three pass checks not fully met** (frame rate at full HD, download to first view, and the 50 ms line read with the frame cap off). Each is explained below with what is left.

## What changed

1. **Lamps are lights only while lit** (`world/lamps.ts`).
   - By day the gate's two lamps are not in the scene; only their surfaces glow at dusk.
   - They join and leave as one set (in from the first lamp lit until the last has faded). Each still fades on its own hours, now staggered 0 to 8 minutes by position, so they come on one after the other.
   - The pickup's headlamp (High and Ultra only) follows the same rule.
2. **Everything is compiled ahead for both sets of lights and every pass** (`engine/precompile.ts`, new).
   - Each draw is compiled in stand-in scenes that borrow the real lights for the instant of each call.
   - It is then drawn once, out of sight, into one scissored pixel: the graphics driver on this laptop finishes a pipeline only on its first draw, and that alone cost the lamps' first frame 1.4 s.
   - Before the lamps are allowed in, they rehearse for one frame, dark, during loading.
   - The lamps-in set is compiled in a background lane after loading, so it does not delay what is in view.
3. **Faults found and fixed on the way** (all measured as stalls at dusk):
   - The sky's environment light was made into a new target each refresh; three then rebuilt every material, 1.5 to 2 s at a time through dusk. It now reuses one target, at 128 px, and is made twice at load.
   - The pickup's brake lamps switched their glow between exactly 0 and more; three builds a material again at that crossing, so the lamp shader was rebuilt every loop, all day. The glow now never quite reaches 0.
   - Two-sided glass was drawn in two passes, which three cannot compile ahead; it is now one pass.
   - The depth-and-normals pass (for occlusion) is drawn with lighting off. It needs no light, and with lights it redrew the shadow maps and doubled its shader variants. Pipelines went from 179 to 134.
4. **Occlusion is back on Medium**: half resolution, 6 samples (`engine/tiers.ts`).
5. **Textures in ETC1S** (`scripts/twin/build-assets.mjs`).
   - ETC1S at quality 255 for everything except hero structures; normal maps in ETC1S's normal mode, with Z rebuilt in the material (`engine/normals.ts`, three's GA packing).
   - The guardhouse (hero structure) keeps UASTC, now with rate-distortion 4; its normal map is encoded by the build itself, because gltf-transform leaves rate-distortion off for normal maps.
6. **Shared textures**: images used by more than one placed asset are written once to `public/models/twin/shared/` (6 files, 1.6 MB) and loaded by address (`engine/assets.ts`). People, the dog and the pickup keep their own.
7. **Streaming** (`engine/streaming.ts`, `sim/gate-scene.ts`).
   - The gate's actors load after the gate zone is in, nearest first, two at a time.
   - Up to four pipelines compile at once (started a frame apart); one at a time took over a second each.
   - A draw is shown only after its out-of-sight draw.
8. **New tools**: `scripts/twin/check-dusk.mjs` (plays dusk or dawn at speed and logs every frame; `--vsync` for display pacing), `scripts/twin/ao-trial.mjs` (occlusion settings timed at full HD), debug switches `?ao=&aosamples=`, `?envhold=1`, `?envsize=`, and `window.__TWIN__.lamps`.

## Numbers before and after

Production build, Iris Xe, Chrome, WebGPU, Medium. Before = P02c's after-numbers.

| | P02c | P02e | Budget |
| --- | --- | --- | --- |
| Gate, full HD (cost view, 1920 x 1080, loop held) | 43 ms without occlusion | **23.7 ms (42 fps) with occlusion**; 18.8 ms without | 22 ms (45 fps) |
| Gate in the bench, full HD profile | 42 fps | 37.4 fps, p95 47 ms (with occlusion) | 45 fps |
| Gate in the bench, 1440 x 900 | 57 fps | 67.4 fps (with occlusion) | 45 fps |
| Overview, 1440 x 900 / full HD | 120 / 84 fps | 124 / 84 fps | 45 fps |
| Pipelines | 68 (occlusion off) | 134 (occlusion on, both light sets) | 160 |
| First usable view, warm | 5.2 s (5.8 full HD) | 3.2 s (4.3 full HD) | 6 s |
| Everything in, warm | 90 s (120 full HD) | **20.2 s (29.1 full HD; 3.8 phone)** | 20 s |
| Download to first view | 38.5 MB | **16.3 MB** (the actors, about 9 MB, arrive after the zone) | 15 MB |
| Download, one location | 38.5 MB | 21.9 MB | 60 MB |
| Phone profile (Low), gate | 147 fps | 217 fps | 30 fps |

Raw: `twin2-p02e.json` (bench), `twin2-cost-p02e-fullhd.json`, `twin2-ao-p02e.json`, `twin2-dusk-*.json`.

**Cost at full HD** (`cost.mjs --size=1920x1080 --only=lamps,occlusion`):
- The two lamps held in the scene by day, as before: **+8.1 ms** (the step asked for about 9.5).
- Occlusion, half resolution, 6 samples: 4.9 ms. Full resolution would add 3.7 ms more.

**Per asset** (download):

| Asset | P02c | P02e |
| --- | --- | --- |
| Engineer / guard / labourer | 6.63 / 6.64 / 5.67 MB | 2.81 / 3.03 / 2.23 MB |
| Guardhouse | 6.31 MB | 4.24 MB |
| Pickup / dog | 2.14 / 1.82 MB | 1.11 / 1.07 MB |
| Acacias | 2.72 + 2.40 MB | 0.51 + 0.21 MB, plus 1.49 MB shared |
| Barrier arm, cone | 0.17, 0.16 MB | 0.01, 0.01 MB, plus 0.13 MB shared |
| Undergrowth (5 kinds) | 1.0 MB | 1.2 MB (quality 255 instead of 160; three over the 0.2 MB line by 0.02 to 0.17) |
| All assets | 38.0 MB | 19.9 MB with the shared files |

## Dusk and dawn (`check-dusk.mjs`)

Played 17:15 to 18:30 at 60 times speed, full HD, Medium with occlusion.

| | Display-paced (`--vsync`) | Frame cap off |
| --- | --- | --- |
| Frame as the lamps come in | 33 ms | 29 ms |
| First lamp lit / flood lamp lit | 33 / 33 ms | 164 / 39 ms |
| Longest frame 17:15 to 18:30 | 67 ms | 224 ms |
| Dawn, frame as the lamps leave | 33 ms (longest 67 ms) | not run |
| New shader builds at the switch | none | none |

- Before the fixes the lamps' first frame took 1.4 to 2.7 s, and the sky's refreshes 1.5 to 2 s each.
- With display pacing the frame is 33 ms most of the time (the gate at full HD is above 16.7 ms), so single frames of 50 and 67 ms are ordinary pacing, not stalls.
- With the frame cap off the page queues GPU work seconds ahead, so a cost shows up wherever the queue fills. The 164 and 224 ms frames there are back-pressure, mostly the sky's environment refresh, which costs about 140 ms of GPU each time (see "Left").
- Lamps still come on in sequence: the window lamp at 17:32, the flood lamp at 17:38.

**Pass check "no frame over 50 ms at the dusk switch":** met at the switch itself in both modes. Not met as "the longest frame across 17:30 to 18:30": 67 ms paced, 224 ms with the cap off, from the sky's refreshes.

## The occlusion trial

Full HD, gate held, median of 5 runs of 4 s (`ao-trial.mjs`). Cost over no occlusion:

| Setting | Cost |
| --- | --- |
| Half, 8 samples (P02c's) | 5.5 ms |
| Half, 6 samples | 5.0 ms |
| Half, 4 samples | 5.1 ms |
| Full, 16 samples | 18.8 ms |
| Quarter with a depth-aware upscale (8, 6, 4 samples), half 6 with the upscale | **not valid**: 2.8 to 4 ms measured, but the upscale sampled the depth-and-normals pass's depth in a way WebGPU rejects ("writable usage and another usage in the same synchronization scope"), and those frames were dropped. Removed |
| Every other frame with reprojection | not tried: three's GTAO only rotates its pattern per frame and needs a separate temporal resolve with motion vectors |

- Sample count barely matters: most of the cost is the second pass over the scene and the filter.
- **Stills** in `occlusion/`: today's half-8 beside half-6 and half-4 at noon, golden hour and night, at the gate view and close to the engineer and labourer; side-by-side sheets `cmp-*.jpg`. I could not tell 8, 6 and 4 apart: canopy shading, the booth's base, the pickup's underside and the shirt folds match. No banding or halos seen.
- **Kept: half resolution, 6 samples** on Medium; 6 rather than 4 for margin against banding in motion, at the same cost. Moving-camera flicker was not checked frame by frame.

## Textures judged by eye

- `beside-p02c/*.jpg`: P02c's seven moments (left; UASTC, occlusion half-8) beside P02e's (right; ETC1S, occlusion half-6), same view, loop held 12 s in. I see no loss: the acacia leaves, bark, booth trim, cones, sign and people read the same. The loop moment differs slightly (the pickup is a little further on in some pairs).
- Close views: `verge-pair-noon-g12.jpg`, `verge-pair-night-g12.jpg`, `guard-close-noon-g12.jpg`. Folds, seams and the vest tape read as before.
- **Not done:** a "before" picture at the close poses (the old build was not kept), and a face close-up in the app; P02d's face renders were in Blender.
- The labourer's towel covering his face in white streaks is the known P02d towel issue (it is the same in P02c's pictures), left to P07b.

## Checks

- `check-pipeline.mjs` (production, Chrome): **10 of 15, no console errors** (P02c: 11 of 15).
  - Three failures are the lines that assume the test yard is the only zone, as before.
  - "Streaming in: nothing holds the page for more than 8 ms" still fails: longest streaming task 27 to 47 ms (`instances`, varies between runs), longest shader-build step 11 to 29 ms. The worst frame while the test zone streams in fell from 633 ms to 83 ms.
  - "Five loads and unloads" kept one texture more after the first unload (35, then 36 four times), then flat.
- `check-shell.mjs`: 21 of 22. The failure is night brightness, carried since P02a (19 at 18:30 against 20).
- Type check and lint pass for every file touched.

## Pass checks

- [ ] **Gate holds 45 fps at full HD on Medium with occlusion on.** Closest: 23.7 ms (42 fps) in the cost view, 37.4 fps in the bench's full-HD gate view. Without occlusion it is 18.8 ms (53 fps). Reaching 45 with occlusion needs about 1.5 ms more in the cost view and about 5 ms in the bench view. Options: dynamic resolution at 0.9 (on by default, off in the bench) covers the first; 1 shadow cascade saves 1.8 ms; the sky refresh (P03b). P02f should spend no more until P03b's lighting work frees time.
- [x] **No frame over 50 ms at the dusk switch; lamps still come on in sequence.** Met at the switch (33 ms paced). Not met across the whole hour with the cap off (224 ms, the sky refresh, P03b).
- [ ] **Download to first view 15 MB or less.** 16.3 MB, of which 14.8 MB twin assets. Left: the guardhouse (4.2 MB, UASTC by the plan), the ground layers (about 4.3 MB, UASTC, not touched), and the actors (about 9 MB) that come in after the first view.
- [x] **Occlusion and texture changes judged side by side: no visible loss at the gate cameras.** Judged in the stills above.

## Left, and for whom

- **The sky's environment refresh costs about 140 ms of GPU** each time, at 128 or 256 px alike (fixed cost of the filtering passes). With display pacing it does not show as a stall at 60x speed; at real speed it happens every few minutes. P03b: refresh less, blend two, or spread the filtering over frames.
- **The `instances` streaming step** (27 to 47 ms on the test yard of 3,134 placements) was not split.
- **The precompile relies on three 0.185 internals** (render contexts, call depth, a pass's cached context). Listed in RISKS with the check to run after an upgrade.
- Not checked: the WebGL2 fallback, Edge, Firefox and WebKit, a 20-minute heap soak (1.6 minutes: -4.7 to +1.3 MB a minute), High and Ultra, another machine or a real phone, the headlamp on High.

## For the owner

Nothing to do. The pictures to look at, if you want to: `beside-p02c/golden.jpg` and `beside-p02c/night.jpg` (before and after), and `occlusion/cmp-verge-noon-8v4.jpg` (the occlusion settings side by side).
