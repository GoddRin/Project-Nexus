# P02c report: what the slice costs, the new budgets, and the owner's gate

2026-10-14, branch `twin-v2`. One session. This is the owner's decision document for the vertical slice: **nothing in P03 onward starts until you have answered the questions at the end.**

**Status: owner.**
- The budgets are rewritten from measurement.
- The second pass check, your reply, is what is left.

## What I measured, and how

- **The machine:** the office laptop (Intel Iris Xe, Chrome, WebGPU), production build, frame cap off, resolution held still. Blender and the capture window were closed while measuring.
- **How costs were measured:** a new debug hook, `window.__TWIN__.cost`, adds copies of the real assets in front of the gate camera, each held at one level of detail. It can also add lights and change tier settings. The script `scripts/twin/cost.mjs` drives it.
- **Against drift:** every step is timed against a baseline taken just before it, as the median of 4 or 5 runs of 4 seconds. This laptop's frame rate wanders by 10 to 20% between runs.
- **The view:** the gate (`?place=gate-approach`), with its loop held at a quiet moment and all five actors in it.
- **Raw results:** `twin2-cost-*.json` in this folder.

### The finding that shapes everything

- **This laptop is limited by pixels, not by geometry.**
  - At 1440 x 900, cutting the pixels to a quarter took the gate from 26 ms to 8 ms a frame.
  - At your screen's full HD it went from 43 ms to 11 ms.
  - Draw calls, triangles and script are a small part of the frame.
- **The costly things are the ones that touch every pixel:** lights, screen-space occlusion and shadows.
- **Your screen is 1920 x 1080 at 100% scaling.**
  - A full-screen twin shades 1.7 times the pixels of the 1440 x 900 window every earlier bench used.
  - The gate ran at about 23 fps there, against 38 in the bench.
  - The bench now checks full HD too.

## The cost table

Medium tier, gate view, 1440 x 900 unless marked. Milliseconds added to each frame.

| What | Cost |
| --- | --- |
| A person at LOD0 (within 12 m) / LOD1 / LOD2 (beyond 40 m) | 0.45 / 0.22 / 0.07 ms; linear from 5 to 80 people |
| The dog at LOD0 | 0.13 ms |
| The pickup at LOD0 / LOD1 | 0.55 / 0.28 ms |
| A tree species in view (one instanced set) | about 2.5 ms for the first copies, then 0.1 ms a copy (LOD0 or LOD1), 0.03 at LOD2 |
| A shrub or grass clump | 0.03 ms |
| A banana clump | 0.12 ms |
| A point light, no shadow | 1.3 ms (**lit or not**) |
| A point light with a 512 px cube shadow | 11 ms |
| The gate's two lamps at noon (unlit) | 6.3 ms; **9.5 ms at full HD** |
| Sun shadows (3 cascades) | 6.2 ms; 1 cascade saves 1.8; 2 cascades or a larger map make no difference |
| Screen-space occlusion, half resolution | 4.1 ms; **8.4 at full HD** |
| Screen-space occlusion, full resolution | 12 ms; 23 at full HD |
| Drawing at 0.7 / 0.5 / 0.25 of the pixels | -9.5 / -18.8 / -18.1 ms; at full HD -17 / -24 / -32 |
| Low tier instead of Medium | -4.7 ms |

**Not measured:**
- High and Ultra on a faster card. At this screen's pixel ratio of 1 they draw the same pixels as Medium.
- Heavy equipment, buildings beyond the guardhouse, interiors.
- A real phone. The "phone" profile is this laptop drawing a phone-sized window.

### Download, per kind of asset (built files)

| Kind | Download | What is in it |
| --- | --- | --- |
| Three people | 5.7 to 6.6 MB each, 18.9 MB in all | Each: 2K normal map 3.2 MB, 2K colour 1.9 MB, the rest small |
| Guardhouse | 6.3 MB | 2K trim sheet: colour 2.4, normal 2.6 MB |
| Two acacias | 2.7 + 2.4 MB | Both carry the same bark and leaf sheets (2.1 MB shipped twice) |
| Pickup | 2.1 MB | |
| Dog | 1.8 MB | |
| Undergrowth (5 kinds) | 1.0 MB | |
| Ground layers | 6.9 MB built, 4.3 MB read | 2K colour and normal per layer |
| **To the first view** | **38.5 MB** | Budget now 15 MB |

**Texture trial** (`scripts/twin/texture-trial.mjs`, the engineer's sheets, results in `texture-trial/`):

| Encoding | Normal map | Colour sheet |
| --- | --- | --- |
| UASTC 2K, as built | 1.9 MB, mean error 1.0 deg | 1.3 MB, 46.7 dB |
| UASTC 2K, stronger reduction | 1.6 MB, 1.7 deg | 1.0 MB, 40.4 dB |
| ETC1S 2K | **0.73 MB, 1.7 deg** | **0.36 MB, 36.0 dB** |
| UASTC or ETC1S 1K | 0.24 to 0.53 MB, 3.1 to 3.2 deg | 28.6 to 29.6 dB |

- **ETC1S at 2K roughly halves a person**, from 6.6 to about 3.5 MB, with a small loss close up.
- **A 1K sheet loses visible detail**, so halving the resolution is the wrong way to save.
- **ETC1S normal maps need a runtime change first:** they come back with two channels, so the shader must rebuild the third. Not done here.
- **The trial was compared by numbers, not judged in a render.**

## What I changed on the strength of it

1. **The tiers** (`components/twin/engine/tiers.ts`):
   - **Medium:** draws at 1:1 pixels (it was 1.25), with no screen-space occlusion (it was half resolution). The assets' baked occlusion carries the look.
   - **Light caps:** 2 lights beside the sun on Medium, 1 on Low, 4 on High, 6 on Ultra (each tier had 8).
   - **Crowd caps:** 24 animated people on Medium, 12 on Low, 48 on High, 80 on Ultra.
2. **The budgets:**
   - `MASTER-BRIEF.md` section 5 now has the measured table, a frame plan for Medium, the cost per item and what each tier keeps.
   - `QUALITY-BAR.md` section 1 gains a download line and a measured frame cost per asset class.
   - `scripts/twin/asset-budgets.json` carries the download line; the asset build warns over it.
   - `bench.mjs` checks the new lines and runs a full-HD profile by default.
3. **Tools:**
   - `engine/cost-probe.ts` and `scripts/twin/cost.mjs`, to measure marginal cost again after any change.
   - `scripts/twin/texture-trial.mjs`.
   - `stats().cpuMs`. Its limit: on WebGPU it also counts the wait for the graphics card, so it cannot split the two. The resolution test did that instead.

### Before and after (`bench.mjs`, production build, frame cap off)

| | Before (`twin2-p02c.json`) | After (`twin2-p02c-after.json`) | Budget now |
| --- | --- | --- | --- |
| Gate, 1440 x 900, Medium | 41 fps, p95 31 ms | **57 fps**, p95 28 ms | 45 fps |
| Gate, full HD, Medium | about 23 fps (cost run) | **42 fps**, p95 51 ms | 45 fps |
| Overview, 1440 x 900 | 77 fps | 120 fps | 45 fps |
| Overview, full HD | not measured | 84 fps | 45 fps |
| Worst place on the fly-through (v1's gate view) | 15 fps | 47 fps (31 at full HD) | 45 fps |
| Pipelines | 157 | 68 | 160 |
| First usable view, warm | 6.3 s | 5.2 s (5.8 full HD) | 6 s |
| Everything in | 97 s | 90 s (120 full HD) | 20 s |
| Download to first view | 38.5 MB | 38.5 MB | 15 MB |
| Phone profile (Low), gate | 143 fps | 147 fps | 30 fps |

`check-shell.mjs` (production, Chrome): 21 of 22. The failure is the night-brightness line carried since P02a (18 against 20).

`check-pipeline.mjs`: 11 of 15, as in P02b:
- Three of the failures are lines that assume the test yard is the only zone.
- One is real: a streaming step holds the page 27 ms, and three.js's shader build 19 ms (budget 8).

**Still failing the budget:**
- **The gate at full HD (42 fps).** Making lamps lights only while they are lit measured another 9.5 ms. That is P03b's work (night lighting): switching lights rebuilds shaders, and P03b must hide that.
- **Download to the first view (38.5 MB).** The route is ETC1S sheets and shared textures.
- **Everything in, 90 s.** Not worked on.
- **The streaming stall (27 ms).** Not worked on.

## What the full site can show on each tier

The full site will be heavier than the gate: more people, buildings and lights.

### Medium (the office laptop)

A frame of 22 ms (45 fps) at full HD is spent roughly as:
- **Fixed work, about 9 ms:** draws, skinning, script.
- **The world, 6 to 9 ms:** ground, sky, buildings, undergrowth.
- **Sun shadows, 6 ms.**

That leaves only a few milliseconds, so dynamic resolution (down to 0.75 before anything is removed) is part of the plan.

**In one close view:**
- About 4 people near, 8 at middle distance and 12 far: 24 animated in all.
- One or two vehicles, a dog or two.
- Three or four tree species, and undergrowth by the hundred.
- Sun shadows everywhere.
- At night, 2 real lamp lights near the camera. Every other lamp is a glow with a light pool painted on the ground.

**What it will not show:**
- Screen-space occlusion.
- Dozens of animated people close together. A shift change at the camp shows the far ones as cheaper figures (P07d).
- Shadows from lamps beyond one floodlight.
- Every window as a real light.

### Low (phones, weak laptops)

- 12 people, 1 shadow cascade, 1 lamp light, 512 px textures.
- On this laptop's GPU in a phone-sized window it runs at 147 fps. A real phone is untested.

### High and Ultra (cards about 3 and 8 times faster, by the probe's lines)

- **High:** occlusion at half resolution, 1.5 times the pixels, 48 people, 4 lights.
- **Ultra:** full-resolution occlusion, 2 times the pixels, 80 people, 6 lights.

No such card was available. These are placed relative to Medium, not measured.

## The slice, as it looks now

Gate approach, loop held 12 s in, Medium as it was (with occlusion), in your visible Chrome:

| Dawn 05:48 | Morning 08:10 | Noon 12:15 | Golden 17:05 |
| --- | --- | --- | --- |
| `gate-approach-dawn-g12.jpg` | `gate-approach-morning-g12.jpg` | `gate-approach-noon-g12.jpg` | `gate-approach-golden-g12.jpg` |

| Dusk 17:58 | Night 21:00 | Rain 14:00 |
| --- | --- | --- |
| `gate-approach-dusk-g12.jpg` | `gate-approach-night-g12.jpg` | `gate-approach-rain-g12.jpg` |

The new Medium (no occlusion), same view: `gate-approach-noon-after-g12.jpg`, `gate-approach-golden-after-g12.jpg`, `gate-approach-night-after-g12.jpg`. Compare `noon` with `noon-after`:
- The tree canopies lose some inner shading and look flatter and lighter.
- The booth's base and the pickup's underside sit a little less firmly.
- Shadows and everything else are unchanged.

The frame rates printed by the capture window (`captures*.json`) are not benchmarks. Golden and rain read 6 and 2 fps while the window was covered.

**The people beside the Atlas Navigator**, same camera and light (from P02d, unchanged since):
- `navigator-beside-guard-full.jpg`
- `navigator-beside-engineer-close.jpg`
- `navigator-beside-labourer-close.jpg`
- the rest of `navigator-beside-*.jpg`

**Where they are still behind** (P02d's list):
- Skin reads orange in Blender's studio light.
- The glasses have no lenses.
- The towel spreads like a stiff collar.
- The vest's edges are a little uneven close up.
- The hair edge under a cap is hard.
- The faces are MakeHuman faces. Faces from your staff photographs are P07c's.

**Also in view and owned by later phases:**
- The hills beyond the patch are v1's coarse terrain (P03a).
- No stars, and no falling rain (P03b, P03d).
- No forest edge (P04).

## Not done or not checked

- No 20-minute heap soak. 1.6 minutes showed +0.3 to +0.6 MB a minute on the after-run.
- Not run: the WebGL2 fallback, Edge, Firefox and WebKit.
- The probe on another machine, and a real phone.
- The download fixes (ETC1S sheets, shared textures), the lamp fix and the streaming stall are recommended, not done.
- High and Ultra measured only at pixel ratio 1.
- Pipeline counts rise each time the tier is switched in a session, because old ones stay cached. Seen in the cost run; harmless to the frame rate, not investigated.

## Questions for you

1. **Is this the look?**
   - Look at the seven moments, then at `noon` against `noon-after`.
   - If yes, the slice is approved and P03 can start.
2. **Are the people good enough to be multiplied?**
   - The "still behind" list above is what remains.
   - You can approve them as they are and let P07c (faces from photographs) and P07b close the gap, or ask for another polish first.
3. **Medium without screen-space occlusion: acceptable?**
   - It buys 4 to 8 ms, the difference between about 42 and about 30 fps at full HD.
   - If you would rather keep it, Medium gets it back at half resolution, and dynamic resolution will draw the view at about 0.8 of full HD to pay for it.
4. **Textures in ETC1S:** may I switch the people's and trees' sheets to it?
   - Close up it is a little softer; numbers in the texture trial.
   - It would bring the slice from 38.5 MB toward the 15 MB line, together with sharing textures between assets.
   - My recommendation is yes, done in P03's first session or a small follow-up.
5. **Anything you want changed before this is multiplied across the site?**
   - If there are changes, they are done in a follow-up before P03 starts, as the plan says.
