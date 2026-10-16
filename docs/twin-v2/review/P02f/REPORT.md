# P02f report: the detail kit

2026-10-15 to 16, branch `twin-v2`, over two chats (the first ran out of usage before the bench).

**Status: done, with two pass checks not met.** The kit, the dressed gate, credits and before/after stills are all in. The gate at full HD on Medium with occlusion is 34.4 fps (budget 45; it was 37.4 before P02f, so the kit costs about 2.3 ms). The download to the first view is 18.2 MB (budget 15; 16.3 before P02f).

## What was built

Everything new is a reusable kit for P05 and P06 except the gate's own decals and wiring.

**One shared sheet for every small prop.** `trim-dressing`, 2K colour with 1K normal and roughness (`scripts/twin/atlases/dressing.json`, painted by `scripts/twin/build-atlases.mjs`). It has bands for sacking, pallet wood, drum steel, five plastics, rubber, painted tyre, cord, galvanised pipe, rust, concrete, soil, umbrella cloth, stainless and hard-hat shell. A band of prints carries a calendar, rice and feed sacks, an open logbook, a bin label, a breaker label, a pallet stamp, a diesel label, a radio face and a slipper.

**Props** (`scripts/blender/twin/build_gate_dressing.py`, small-prop class, one material each, three levels where it matters):

| Group | Assets |
| --- | --- |
| Outside | `prop.rice-sacks.a`, `prop.chair-monobloc.a`, `prop.fan-stand.a`, `prop.slippers.a`, `prop.pipe-offcuts.a`, `prop.pallet.a`, `prop.standpipe.a` (boot-wash tap and hose), `prop.jerrycan.a`, `prop.umbrella-hung.a`, `prop.drum-bin.a` |
| On the booth | `prop.hardhat-hung.a`, `prop.cctv.a` |
| Inside | `prop.desk-things.a` (open logbook with a pen on a string, tumbler, thermos, radio on its charger), `prop.fan-desk.a`, `prop.calendar.a` |
| Planters | `prop.tyre-planter.a`, `prop.drum-planter.a` |
| Drainage | `prop.culvert-end.a` (600 mm pipe end in a headwall), one at each end of the ditch, under the gate yard |

**Perimeter and services:**
- Fence kit: `kit.fence-frame.a`, `kit.fence-post.a`, `kit.fence-mesh.a`, `kit.fence-mesh-vine.a`. Chain link on 50 mm GI posts, three strands of barbed wire on arms leaning out, a wild vine on some bays.
  - Six bays run up the bank to the back of the booth, five down the slope from the barrier's rest post.
- `struct.power-pole.a`: three 9 m concrete poles along the uphill side of the road, guyed at both ends.
- `kit.gate-services`: the line's wires, a triplex drop to a weatherhead on the booth's back wall, conduit down to a breaker box, an outlet on the camp-side wall, and the stand fan's cord.

**Ground storytelling and weathering:**
- The mask now holds water in the wheel ruts beyond the gate pad, so they fill in rain.
- `kit.gate-decals` is one asset with one material (`DECAL_gate`, 1K sheet), laid by casting rays onto the ground, the humps and the booth in Blender. It carries:
  - on the road: tread prints in the ruts, tyre scrub and oil where vehicles stop, mud carried over the humps, gravel spilled at the road edges;
  - by the booth: a worn path with boot prints from the guard's post to the driver's window and the barrier, drip lines under the roof edges and the downpipe's splash, silt in the culverts;
  - under the acacias: leaf litter and pods;
  - at every post and pole: damp splashed soil at the foot;
  - on the booth: rust under the air-conditioner brackets and the switch box, water stains under the AC and the window corners, moss low on the shaded plinth, dust on the AC and the window shelf.
- The sandbags at the barrier post are now soft filled jute bags (Hessian 230) instead of quilted boxes.

**Signs:** "No hard hat, no entry", "All visitors report here" and "CCTV in operation", in the camp's existing sign style. No safety-statistic boards.

**Plants:** croton (San Francisco), santan (ixora) and cogon grass with its plumes, as painted cut-out cards on one sheet with wind. Santan grows in the half-drum and croton and santan in the tyre planters; cogon grows along the fence lines and the downhill verge.

**The driver:** `char.driver.a`, a fourth man from the P02 people pipeline: a company driver in his forties in a pale shirt with the company mark, jeans, black shoes and a watch.
- He ships one authored clip, `drive`: Mixamo's sitting pose with both hands on the wheel rim at ten and two, making small corrections.
- He is seated so the wheel he holds is the pickup's own (his LOD0 carries `twin_wheel`). His neck and head turn to the guard while the guard is at his door (`sim/gate-scene.ts`).
- This retires the RISKS row about the empty cab.

**Small life** (`components/twin/fx/small-life.ts`): two instanced draws, built ahead like everything else.
- Dust behind the pickup on a dry road.
- Drips from three edges of the roof while it is wet.
- Moths round the flood lamp at night.
- Five birds that perch in the large acacias and fly between them by day.

## Engine changes

- **Decal materials** (`engine/assets.ts`, any material named `DECAL_...`): blended, no depth write, pulled forward in depth, darkened in rain like bare earth.
- **Chain link:** a built asset's cut-out material is now blended and casts no shadow. Cut, its far mips filled solid grey from about 15 m, and its shadow would have been the whole panel. Plants keep their cut-out.
- **Pipelines** (this was the work of the second chat; the first bench showed 180 against a budget of 160):
  - Plant wind amounts and the cut-out softening's texture size were constants in the shader code, so every plant species compiled its own shaders. They are now uniforms, and all plants share one shader. This saved about 30.
  - Dust, drips and moths are one draw with per-copy colour and shape; the birds are unlit.
  - Materials that are identical down to their shared textures are one material across assets (`sharedMaterialKey` in `engine/assets.ts`).
  - Packed vertex attributes are unpacked in the per-draw copy (`engine/instances.ts`), so every draw of a material has one vertex layout.
  - Result: 148 / 137 / 96 pipelines in the desktop, full-HD and phone profiles (budget 160 / 160 / 100; P02e 134 / 134 / 89).

## Numbers

Bench (`node scripts/twin/bench.mjs p02f`), production build, Iris Xe, Chrome, WebGPU, Medium, frame cap off. Raw file: `twin2-p02f.json`.

| | P02e | P02f | Budget |
| --- | --- | --- | --- |
| Gate, full HD | 37.4 fps, p95 47.2 ms | **34.4 fps**, p95 46.7 ms | 45 fps |
| Gate, 1440 x 900 | 67.4 fps | 58.2 fps | 45 fps |
| Overview, 1440 x 900 / full HD | 124 / 84 fps | 80 / 80 fps | 45 fps |
| Pipelines (desktop / full HD / phone) | 134 / 134 / 89 | 148 / 137 / 96 | 160 / 160 / 100 |
| Draw calls at most | 152 | 268 | 350 |
| Triangles at most | 767,642 | 985,958 | 1,000,000 |
| First usable view, warm | 3.2 s | 2.3 s (4.7 s full HD) | 6 s |
| Everything in, warm | 20.2 s | 22.2 s (30.3 s full HD) | 20 s |
| Download to first view | 16.3 MB | **18.2 MB** | 15 MB |
| Download, one location | 21.9 MB | 25.7 MB | 60 MB |
| Phone profile (Low), gate | 217 fps | 134 fps | 30 fps |

Downloads added:

| Item | Size |
| --- | --- |
| Dressing sheet (shared) | 0.83 MB |
| Fence sheet (shared) | 0.36 MB |
| Plant cards (shared) | 0.17 MB |
| Decals | 0.61 MB |
| 26 kit assets | 7 to 41 KB each |
| Driver | 1.91 MB (arrives after the first view, with the other actors) |

The dressing sheet's normal and roughness maps were halved to 1K for this, saving 0.6 MB. No difference shows at the gate cameras.

Other checks:
- `check-shell.mjs`: 21 of 22. The failure is night brightness, carried since P02a.
- `check-pipeline.mjs`: 11 of 15 (P02e 10). The failures are the three lines that assume the test yard is the only zone, and the 8 ms streaming line (34 ms `instances` step).
- Type check and lint pass for every file touched. Every new asset passes `check_asset.py`.

## Pass checks

- [x] **Mesh and structure checklists pass for every new asset; credits written.**
  - The checker passes all 26 kit assets and the driver.
  - The Blender review is in `kit-contact-sheet.jpg`: front, side, three-quarter and close-up of each piece.
  - New credit rows: Hessian 230, Wood Planks Grey, Blue Metal Plate, Metal Plate 02, Gravel Floor; the driver is added to the MPFB2, fabric and Mixamo rows.
  - Ground contact is handled: damp rings at every post foot, moss on the shaded plinth, splash and drip lines.
- [ ] **The gate holds 45 fps at full HD with occlusion on.**
  - It did not before P02f either: 37.4 fps in P02e, which said P02f should spend no more until P03b frees time. P02f spent about 2.3 ms (34.4 fps).
  - Most of it is the driver (a person at LOD0, about 0.45 ms by P02c's table), the blended decals and chain link over a large share of the gate views, and about 30 more shadow casters.
  - Reaching 45 still needs the P03b lighting work (the sky refresh), or dynamic resolution at 0.85 (on by default, off in the bench).
- [ ] **Download to the first view 15 MB or less.**
  - 18.2 MB: P02e's 16.3 plus 1.9 MB of kit. What is left to cut is as P02e listed: the guardhouse's UASTC sheet (4.1 MB) and the ground layers (4.3 MB).
- [x] **Before and after stills at the same cameras; what was cut and why.**
  - `before/` and the after files at the six gate cameras, noon and rain; side by side in `beside-before/`.
  - The seven moments at the approach camera: `gate-approach-<moment>-g12.jpg`.
  - Close-ups in `close/`: window, barrier, verge pair, planters and back of the booth at noon and night, and the driver at the guard's check (`cab-noon-g18.jpg`).

## Cut, and why

- Nothing in the brief's list was cut.
- Two items were simplified:
  - The extension cord runs to a stand fan by a chair under the camp-side eave rather than across a walkway.
  - The birds are unlit tiny meshes rather than lit models, to save shaders; they are a few pixels from every camera.
- Not done in the app: the fence vine is a strip of cards, not leaves modelled on the wire.

## Known gaps

- Kit props are modelled in code from primitives. They are good at the gate cameras but plainer than scans at arm's length: the chair's back, the fans and the hard hat. Listed in RISKS for P06d's scans or Tripo models.
- Decals are seated by rays cast at zone build: a change to the ground or the guardhouse needs `build_gate_zone.py` again (RISKS).
- The heap trend over 1.6 minutes was -2 to +5.5 MB a minute between profiles. The 20-minute soak was not run.
- Not checked: the WebGL2 fallback, Edge, Firefox and WebKit, High and Ultra, another machine or a real phone.

## Files

- Blender:
  - `scripts/blender/twin/build_gate_dressing.py`: the kit, plus `Layout`, `Decals` and `Services`, called by `build_gate_zone.py`.
  - `model_kit.py` gains `lathe`, `sweep`, `tube`, `pillow`, `label` and `Prints`/`Stamps`.
  - `build_gate_people.py` and `build_gate_people_clips.py` gain the driver.
- Textures: `scripts/twin/atlases/dressing.json`, painted by `node scripts/twin/build-atlases.mjs dressing`.
- To rebuild: run the dressing builder, then the zone builder, then `export_asset.py` and `export_zone.py`, then `bake_walkmap.py`, then `node scripts/twin/build-assets.mjs`.

## For the owner

Nothing you need to do. If you want to see the change, the side-by-side pictures are `beside-before/approach-noon.jpg`, `beside-before/over-noon.jpg` and `beside-before/approach-rain.jpg` (the ruts hold water). Close-ups: `close/back-noon-g12.jpg` and `close/cab-noon-g18.jpg`.
