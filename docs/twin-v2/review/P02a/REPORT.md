# P02a report: the camp gate slice — ground, guardhouse, plants

2026-10-13, branch `twin-v2`. The first place in Twin v2 built to be looked at: a 60 m patch at the camp gate with a textured road and verge, a guardhouse checkpoint, trees and undergrowth, a sun and sky that follow the clock, shadows, lamps at night and a wet-day look.

To see it: `http://localhost:3000/digital-twin?v=2&place=gate-approach` on the dev server, then the time field and the "Simulated: …" weather list in the top bar. Other views: `gate-booth`, `gate-over`, `gate-inside`, `gate-verge`, `gate-window`.

## Result

**Two of the three "Pass when" checks are not met.** The slice is built and looks right; it is not yet fast enough, and the per-asset checklists pass only in part.

| Pass when | Result | Evidence |
| --- | --- | --- |
| Mesh, structure and lighting checklists pass for every asset | **Partly.** See the checklists below: the built things and the lighting pass most lines; the plants miss several | Tables below |
| Captures placed beside references in the report | **Done** | "Captures" below; references in `reference/gate/` |
| The patch alone runs above 60 fps on Medium | **Fail.** 57, 45 and 35 fps at three views on the Iris Xe (frame cap off, production build). Low: 63 fps | "Frame rate" below |

## Captures

All in a visible Chrome window, production build, Medium tier, WebGPU, 1184 x 844. Files are in this folder.

| Moment | Clock | File | Against the look target (`QUALITY-BAR.md` section 7) |
| --- | --- | --- | --- |
| Dawn | 05:48 | `gate-approach-dawn.jpg` | Sun on the horizon, red sky low in the east, lamp still lit, warm first light on the tree. No valley mist (P03d) |
| Morning | 08:10 | `gate-approach-morning.jpg` | Crisp dappled tree shade across the road. No dew sheen |
| Noon | 12:15 | `gate-approach-noon.jpg` | Short shadows, bright haze. Contrast under the roof is modest; no heat shimmer (P12a) |
| Golden hour | 17:05 | `gate-approach-golden.jpg` | Long shadows across the road, warm light. No rim light on people yet (P02b) |
| Dusk | 17:45 | `gate-approach-dusk.jpg` | Lamps on, sky glow low in the west. **Too dark and too red for "deep blue"**: see known gaps |
| Night | 21:00 | `gate-approach-night.jpg` | A pool of cool flood light on the road, warm window, dark forest. No stars or moon disc (P03b) |
| Rain | 14:00 | `gate-approach-rain.jpg` | Flat grey sky, sun nearly gone, wet dark road, standing water reflecting the sky. **No falling rain, no low cloud on the ridge** (P03d) |

Other views: `gate-over-*`, `gate-booth-*`, `gate-inside-*`, `gate-verge-*` (`-views`, at noon and golden hour). Blender review: `blender-guardhouse.jpg` (four sides), `blender-acacia.jpg`, `blender-zone-layout.jpg`.

**References** (`docs/twin-v2/reference/gate/INDEX.md`): eleven freely licensed photographs from Wikimedia Commons (guard booths and boom barriers, Philippine dirt roads, Luzon forest), and the owner's own pictures of the camp buildings and the access road (reference R4). **No photograph of the real camp gate was available**, so the booth is designed in the camp's building style: white insulated panels on a concrete base, green steel frame and window frames, rusting corrugated roof, red flexible conduit, a window air-conditioner, a solar street light on a pole. v1's red booth is not kept.

## What was built

| Asset | What it is | Triangles LOD0 / 1 / 2 | Shipped | Budget |
| --- | --- | --- | --- | --- |
| `struct.guardhouse` | The whole checkpoint as one set piece: booth with desk, chair, fan, tube light, logbook shelf, door ajar; plinth and step; boom post and rest post; two speed humps; STOP and 10 kph sign posts; visitor rules, PPE and no-smoking boards; convex mirror; solar flood-light pole; sandbags; bench; fire extinguisher | 4,210 / 1,420 / 678 | 6.2 MB | 120k / 35k / 8k: far under |
| `kit.boom-arm` | Barrier arm with concrete counterweight and pull rope, origin at the pivot (so P02b can raise it) | 204 / 48 / 24 | 0.16 MB | within |
| `prop.traffic-cone` | A cone | 98 / 42 / 30 | 0.16 MB | within |
| `ground.camp-gate` | 60 m of ground: level gate pad, road falling away outside, ditch and bank on the uphill side, wheel tracks, potholes | 45,000 | 0.2 MB (+ 4.3 MB of ground textures) | new class, 60k |
| `flora.acacia.a` | Large spreading acacia, 12.5 m | 14,989 / 3,296 / 768 | 2.7 MB | 25k / 6k / (1.5k optional) |
| `flora.acacia.b` | Young acacia, 6.4 m | 5,196 / 1,210 / 352 | 2.3 MB | within |
| `flora.banana.a` | Banana clump, four stems | 816 / 140 | 0.15 MB | 1.5k / 300 |
| `flora.shrub.a`, `.broadleaf.a`, `.fern.a`, `.grass.a` | Undergrowth adopted from Poly Haven (CC0) | 700 to 1,199 / 159 to 260 | 0.14 to 0.32 MB each | within |

The zone `powerhouse.camp-gate` places 634 of them: 1 ground patch, the checkpoint, the arm, 5 cones, 5 large and 11 young trees, 8 banana clumps, 46 shrubs, 55 broad-leaved clumps, 60 ferns, 441 grass clumps; two lamps (flood, window) lit 17:30 to 06:15; six cameras.

In the app: a blended ground material (four layers by a painted mask and each layer's own height; wetness and puddles); sun, moon and sky by the clock with the sky as environment light; three shadow cascades; ambient occlusion; lamps as real lights; wind in the vertex stage; a weather selector marked "Simulated".

## Frame rate

Iris Xe, Chrome, production build, 1184 x 844 canvas, dynamic resolution off, frame cap off (`capture-gate.mjs --uncapped`; `fps-uncapped-*.json`).

| View at noon | Medium | Draw calls | Triangles (all passes) |
| --- | --- | --- | --- |
| `gate-approach` | 56.8 fps (p95 20 ms) | 79 | 634,110 |
| `gate-over` | 45.1 fps (p95 24 ms) | 87 | 539,944 |
| `gate-booth` | 35.1 fps (p95 52 ms) | 79 | 698,930 |
| `gate-approach`, Low | 63.0 fps (p95 17 ms) | 43 | 225,577 |

Before this session's cuts the same three views ran 37.7, 36.5 and 35.8 fps. In a normal (capped) window the captures ran 27 to 50 fps.

What was found, by hiding parts in turn on the dev build: the **ground patch** costs about 5 ms of a 23 ms frame, the **two lamp lights** about 2 ms (all day, although unlit), **sun shadows** about 6 ms; **hiding every plant made no measurable difference.** So the cost is in what is done per pixel, not in triangles. Cuts made: ground textures read with little or no anisotropy and relief read for two layers of four; plants carry colour only; three cascades of 1024 with plain filtering, the far two redrawn every second and third frame; only trees, bananas and built things cast shadows.

**Measurements wander.** The same view measured 37 to 57 fps across runs in this session, and once Low measured slower than Medium. Treat single figures as rough; P02c should measure with the machine idle and several runs each.

Other budget lines seen at the gate: draw calls 65 to 107 (budget 350); pipelines **69 to 72 (budget 40)**; real-time lights 3 (budget 9); GPU memory 83 to 87 MB. `scripts/twin/bench.mjs` (the full budget bench with its fly-through) **was not run** in this session.

## Checklists

**Any mesh asset** (`QUALITY-BAR.md` section 2)

| Line | Built things (guardhouse, arm, cone) | Trees and banana | Adopted undergrowth |
| --- | --- | --- | --- |
| Real-world size | Pass: door 2.05 m, sill 0.95 m, booth 2.4 x 3.0 m, boom 6.6 m at 1.0 m | Pass: 12.5 m and 6.4 m; banana to 3.6 m | Scaled up 1.25 to 2.3 times from the source; plausible, not measured against a species |
| Origin at base centre, transforms applied | Pass, with the new `twin_origin` exemptions (set piece; arm at its pivot) | Pass | Pass (`free` origin: clumps are lopsided) |
| No loose vertices, inverted normals | Pass (checker) | Pass | Pass |
| UVs, texel density | Wall 341 px/m, roof 400 px/m. Small stretching on bevel faces. No density target is written down for the class, so "within 25%" is not judged | Bark tiles; fronds from a 2K sheet | As supplied |
| No baked light; base colour 30 to 240 | Pass (clamped when the sheets are painted) | Not checked for the Poly Haven leaf sheet | Not checked |
| Roughness varies; metal 0 or 1 | Pass | **Fail by choice:** leaves carry one roughness value (maps dropped for cost) | **Fail by choice**, same |
| Edges bevelled | Pass at LOD0 (weighted normals) | n/a | n/a |
| Wear where it would happen | Splash dirt and algae at wall foot, streaks from the top, rust on roof and steel, damp and moss at the concrete's foot. Painted along bands, so **not placed at particular handles or fixings** | n/a | n/a |
| LODs keep the silhouette; no pop | Modelled levels. **Fly-through for pops not done** | Same skeleton at all levels. Not flown | Decimated. Not flown |
| Within budget | Pass | Pass | Pass |
| Credits row | Pass | Pass | Pass |

**A structure** (section 6)

| Line | Result |
| --- | --- |
| Dimensions match the P00 inventory | The inventory gives v1's booth as 2.4 x 2.4 x 2.6 m on a 3.8 m plinth. Built 2.4 x 3.0 m, 2.4 m walls, on a 3.1 x 3.7 m plinth: a little longer, to hold a desk and a door. v1's 15.5 m boom is now 6.6 m, the width of the road |
| Believable construction | Posts under rafters, purlins under overlapping roof sheets, door frame, gutter with downpipe, conduit to a switch box. **No visible roof fixings; the conduit does not reach the lamp pole** |
| Ground contact | Plinth, apron and step, splash dirt, weeds at the base and at every post |
| Tropical weathering | Rain streaks, rust, moss and damp: pass. No dust on horizontal surfaces |
| Glass reflects and shows a dim interior; lit at night | Pass |
| Signage | Official SCIC wordmark, unaltered. STOP / HUMINTO, visitor rules, PPE, no smoking, 10 kph. **In the road-side view the boom post stands in front of the wordmark board** |

**Lighting** (section 7)

| Line | Result |
| --- | --- |
| Nothing pure white or black except lamps and deep night shadow | Pass by day. At dusk and night the sky and the forest away from the lamp are near black |
| Shadows present and anchored | Pass (after a fault that turned them off on about one load in two was found and fixed) |
| Interiors darker by day, brighter by night | Pass for the booth |
| Exposure adapts into a tunnel or room | Not applicable yet; exposure follows the time of day only |
| Skin tones | Not applicable (P02b) |

## Faults found on the way

- **The shell's sun had been in the wrong place since P01b.** `suncalc` 2 answers in degrees clockwise from north; the code read radians from south. Golden hour came out black because the sun was computed 33 degrees under the horizon. Fixed.
- **Sun shadows were off on about one load in two.** React Three Fiber resets the renderer's shadow switch whenever it configures the canvas. Now set as a canvas prop and re-asserted each frame.
- **Night was black away from the lamps**, which failed P01b's shell check. A floor of moonlight and sky light was added; the gate still reads as night with a pool of lamp light, and the hills stay visible.
- **A lamp's shadow map was not freed** when its zone unloaded (4 MB a cycle). Shadow-casting lamps are now kept and reused.
- **The asset build drops UVs that no texture uses**, which left the ground with no mask. The mask is now read by position.
- **Blender's glTF export took a hidden, selected test prop into every file.** `export_asset.py` now deselects everything in the view layer first.
- **Downloading Poly Haven's tree froze Blender for ten minutes** (230 MB on this connection). Only its leaf and bark textures are used; the trees are built here.

## Regression checks

Run on the production build, Chrome, WebGPU, after the fixes above (`checks/`).

- **`check-shell.mjs`: 21 of 22, 1 not measured.** The failing line is "night is darker than noon and not black": mean brightness of the overview is 15 of 255 at 18:30 and at 02:00, and the check asks for more than 20. P01b set that line for a placeholder night that was kept bright on purpose; a real night over unlit, untextured terrain is darker. It was 1 and 3 before the night floor was raised. Left failing rather than brightened further or the line changed: the owner or P03b should decide how bright night is.
- **`check-pipeline.mjs`: 12 of 15.** It was written when the test yard was the only zone. With the gate zone streaming in beside it, two failing lines are no longer about the test yard alone (3,134 placements of 16 assets where it expects 2,500 of 5; 74 draw calls where it expects 15). The third is real: **while the gate streams in, one step holds the page for 24 ms** (making the ground patch's instance set and its ray hierarchy; 38 ms before it was built the quick way) and one shader-build step takes 14.8 ms, against the 8 ms line; the zone takes 15 s to arrive, with a worst frame of 0.58 s. Unload and five load-unload cycles pass again now that the lamp's shadow map is kept. The check needs rewriting per zone, or the test yard removing, in P02c.

## Known gaps

- **Frame rate**, above.
- **Download:** the slice is about 17 MB of models plus 4.3 MB of ground textures (about 21 MB), against 12 MB to a first view. The guardhouse is 6.2 MB (a 2K trim sheet in the high-quality mode); the two trees carry the same leaf sheet twice.
- **Dusk is too dark and too red**, and the sky is black once the sun is 13 degrees down: the sky model has no twilight of its own and what was added is crude. No stars, no moon disc. P03b.
- **Rain is a wet day without rain.** P03d.
- **The far terrain is v1's**, flat green and untextured, and v1's flat pad shows beyond the patch edge. P03a.
- **The forest edge is thin:** sixteen trees and undergrowth, not the wall of bamboo and forest in the owner's photographs. The frond cards read as oversized leaves close up. P04.
- **Grass clumps are sparse dark sprigs** rather than the knee-high grass on site.
- **The road's wheel tracks and potholes are faint**; the big soft mud patches are cruder than the reference road.
- **The gate takes about 15 s to stream in** on a first visit, with stalls (see regression checks): 70 pipelines are built one at a time.
- **Not checked:** the WebGL2 fallback, Edge, Firefox, WebKit, a phone, High and Ultra tiers, reduced motion, `prefers-reduced-motion` on the wind, the zone's unload under the new lights, LOD pops in motion.
- **Texture sharing between assets** does not exist (each file carries its own).
- The five P01c test props and their zone are still there.

## For the owner

1. **Is this the look?** Open the captures, or the page itself, and say what should change before it is multiplied. P02c is the formal gate; early comments save work in P02b.
2. **A photograph of the real camp gate and guardhouse**, if one can be taken. The booth is a design in the camp's style, not a copy.
3. **An interim commit was made during this session** (`c1698b3`, 17:42, by you or another session): it holds an early state of the gate's models and data and 20 speech clips. This session's commit follows it.
4. Blender has `assets-src/twin/site_master.blend` open and saved; the zone is `ZONE_powerhouse.camp-gate`.

## Files

`scripts/twin/`: `build-atlases.mjs` (trim and sign sheets), `build-flora-textures.mjs`, `build-ground-textures.mjs`, `fetch-polyhaven.mjs`, `fetch-polyhaven-model.mjs`, `capture-gate.mjs`, `atlases/gate.json`, `reference/commons-fetch.mjs`. `scripts/blender/twin/`: `model_kit.py`, `build_gate_structures.py`, `build_gate_flora.py`, `gate_ground.py`, `build_gate_zone.py`. `components/twin/world/`: `SkyLight.tsx`, `air.ts`, `ground.ts`, `lamps.ts`; `engine/post.ts`. To rebuild everything: the three texture scripts, the three Blender build scripts and the zone script in that order, `export_asset.py` and `export_zone.py`, then `build-assets.mjs`.
