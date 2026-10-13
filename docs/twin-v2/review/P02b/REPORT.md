# P02b report: the camp dog, the pickup and things that move — the people are still to do

2026-10-13, branch `twin-v2`. **This sub-phase is partly done.** The gate now has a dog and a pickup that move, a barrier that lifts, and the runtime that drives them. The three people (guard, engineer, labourer), which are most of P02b, are not built. The next session picks up at step 2.

To see it: `http://localhost:3000/digital-twin?v=2&place=gate-approach` on the dev server. The loop runs by itself and takes 50 seconds.

## Result against "Pass when"

| Pass when | Result |
| --- | --- |
| Person, motion and animal checklists pass | **Not met.** No person exists. Animal and motion: partly, tables below |
| Side-by-side still with the Atlas Navigator at equal framing | **Not done** (needs a person) |
| No poke-through on any outfit in any test clip | **Not done** (needs the outfits) |

## Steps

| Step | State |
| --- | --- |
| 1. MPFB2 in Blender 5.2 | **Done.** It was not installed at the start; the owner installed it and downloaded the asset packs part-way through, and the packs were then loaded. A test body (Asian male, skin, eyes, teeth, brows, lashes, short hair, long-sleeved shirt, jeans, on MPFB's 52-bone Mixamo-named rig) was made in one call from Python: `blender-mpfb-probe.png`. It was removed again; nothing of it ships |
| 2. One male body at the quality bar | **Not started** |
| 3. Three outfits, two more bodies | **Not started** |
| 4. Clip set | **Not started.** The Mixamo files in `assets-src/mixamo/` are untouched |
| 5. Poke-through test | **Not started** |
| 6. Dog | **Done** |
| 7. Pickup | **Done, with differences from the plan** (single cab; doors not separate) |
| 8. Staged loop | **Done for the pickup, the dog and the barrier.** No guard walks out, nobody talks at the verge |
| 9. Export LODs and build | Done for the dog and the pickup |

## What was built

| Asset | What it is | Triangles LOD0 / 1 / 2 | Shipped | Budget |
| --- | --- | --- | --- | --- |
| `fauna.aspin.a` | A lean, short-coated tan dog, 0.46 m at the withers, 39 bones. Clips: `idle` 3.7 s, `walk` 1.3 s, `trot` 0.47 s, `sit` 3.2 s, `lie` 4.0 s, `lieDown` 1.6 s, `getUp` 1.4 s, `bark` 1.5 s | 9,999 / 2,999 / 800 | 1.8 MB (1K coat and normal map) | large animal 10k / 3k / 800: at the limit |
| `veh.pickup.a` | A white single-cab work pickup, 5.36 m, with bull bar, side steps and a loaded bed; road dust low on the body, SCIC decal on both doors; four wheels and the steering wheel turn; lamps light | 24,347 / 7,999 / 1,999 | 2.1 MB (one 2K sheet: colour, roughness-metal, normal) | light vehicle 25k / 8k / 2k: within |

**Sources** (rows in `public/models/twin/CREDITS.md`): "Dog animated" by MAXDESIGN and "Lightbody '90 MD Pickup" by Daniel Zhabotinsky, both Sketchfab, CC BY 4.0. Each download is kept as it arrived in `assets-src/twin/downloads/sketchfab/`.

**The dog's motion.** The download had one take: a walk and a stand. `walk` and `idle` are cut from it. The other six clips were authored here by script: body, spine, head, jaw, ears and tail are posed by numbers, and each leg is solved to a point on the ground so planted paws stay planted (`scripts/blender/twin/build_gate_dog.py`). Blender stills: `blender-dog-sit.png`, `-lie.png`, `-getup.png`, `-trot.png`, `-bark.png`.

**The pickup.** Its eight materials were baked into one sheet with the body repainted white and a dust mask (heavy below the sills, thinning by the waistline); badges removed; decals laid on the doors (`blender-pickup.png`). Why not a double cab: the double cabs offered under CC BY carried a stock-model vendor's plates or a game mod's part names, so their licences could not be trusted. This one is plainly its author's own design of an invented make.

**Runtime** (new or changed):

- `components/twin/engine/actors.ts`: loads a model that moves, makes actors from it (own skeleton, animation mixer, part pivots, lamp materials), plays and cross-fades clips, picks the level of detail by distance.
- `engine/instances.ts`, `engine/streaming.ts`: one placed copy can be moved (`InstanceSet.move`, `streaming.instancesOf`). The barrier arm is raised that way.
- `components/twin/sim/gate-scene.ts`, `structures/GateSlice.tsx`: the loop. The pickup's axles follow the road line and the ground under each wheel (pitch and roll with a little spring), wheels roll with distance, the front pair and the steering wheel turn into the bend; headlamps and tail lamps come on in the dark and in rain. The dog lies by the booth, gets up when the pickup is 26 m out, barks, trots to the roadside, sits and watches, then walks back and lies down. `window.__TWIN__.gate` seeks and holds the loop.
- Asset pipeline: moving parts (`twin_part`, `twin_pivot`), clips from NLA tracks, bounds for skinned assets, `scripts/twin/inspect-glb.mjs`.
- `scripts/twin/capture-gate.mjs --gate=…` and `scripts/twin/record-gate.mjs`.

## Captures

Dev build, visible Chrome, Medium, WebGPU. In this folder:

| File | Moment |
| --- | --- |
| `gate-approach-noon-g11.jpg`, `-night-g11.jpg` | The pickup stopped at the barrier (night: tail lamps lit, headlamps on the road) |
| `gate-approach-noon-g20.jpg`, `-night-g20.jpg` | Barrier up, the dog sitting at the roadside |
| `gate-approach-noon-g27.jpg`, `-night-g27.jpg` | The pickup driving in |
| `gate-booth-*` | The same three moments from the guardhouse view (at g11 only the pickup's bonnet is in frame: this view stands where it stops) |
| `gate-approach-noon.webm`, `gate-approach-night.webm` | 30 seconds of the loop each (the loop is the last 30 s of each file). **Not in git** (7 MB each); on this machine only |

No reference photographs of a real aspin or of the site's own pickups were collected for this report (`QUALITY-BAR.md` section 8 asks for three each). The owner's photographs (reference R4) show the site's Kia cab-over truck, not a pickup.

## Numbers

Not a benchmark: dev build, Blender open, one run each.

| | Value |
| --- | --- |
| Frame rate with the loop running, Medium | 17 to 27 fps in the capture runs; 36 to 40 fps while recording the videos |
| Draw calls | 88 to 136 (budget 350) |
| Triangles, all passes | 0.60 to 1.0 million |
| Pipelines | 82 to 91 (budget 40; 69 to 72 before the actors) |
| Real-time lights | 4 (sun, two zone lamps, the pickup's headlamps) |
| GPU memory | 85 to 89 MB |
| Download added | 3.9 MB (dog 1.8, pickup 2.1) |

No production build was made and `bench.mjs`, `check-shell.mjs` and `check-pipeline.mjs` were **not run** this session. Type check and lint pass for the files touched.

## Checklists

**Animal** (`QUALITY-BAR.md` section 5)

| Line | Result |
| --- | --- |
| Correct species and local form | Pass by eye: lean, short tan coat, prick ears. Not compared with photographs |
| Fur direction and wear read at 5 m | **Not judged.** The coat is the download's painted texture with one roughness value |
| Gait matches speed; feet do not slide | Trot: diagonal pairs, made for 1.34 m/s and played at it. Walk: its planted paws move at 0.29 to 0.39 m/s (the four paws disagree), played at 0.55 m/s by running the clip 1.5 times faster. **Foot slide was not measured in the browser** |
| Idle includes ear, tail, head and breathing | Sit and lie: breathing, a slow head turn, a tail wag (sit) or an ear flick (lie). The standing idle is the download's and barely moves |
| Reacts to people, vehicles, rain and time | To the pickup only, by script. Rain, time and people: P11b |

**Motion** (section 4), for the dog: no snapping seen between clips in the videos; loops close (the cut clips have their ends blended); the dog turns to face the pickup. Not checked: weight shift, and "two nearby never in step" (there is one animal).

**Any mesh asset** (section 2), both: real-world size pass (dog 0.46 m at the withers; pickup 5.36 x 2.0 x 1.66 m, wheels 0.71 m); origin at base centre pass; no loose geometry pass; credits pass; within budget pass. LODs are made by collapse, and **were not flown through for pops**. Roughness varies on the pickup (baked) and not on the dog. The pickup's dust is placed by height, not at particular arches or handles.

## Known gaps

- **The three people**, their outfits, clips and tests: everything in the steps table marked not started.
- **The pickup is a single cab**, and its doors are part of the body (the plan asks for separate doors). Its number plates are the download's invented ones.
- **The pickup appears and disappears** at the two ends of the road line, in view from above.
- **Lying down, the dog's folded hind legs sink a few centimetres into the ground.**
- **Actors do not get wet**: the rain look darkens placed things, not the dog or the pickup.
- **No shadow from the pickup's headlamps**; brake lamps and tail lamps are one material, so they brighten together.
- With reduced motion set, the loop stands still at its start (the dog lying, no pickup).
- Not checked: the WebGL2 fallback, Edge, Firefox, WebKit, a phone, Low, High and Ultra tiers, leaving and re-entering the location, a lost device.
- Mesh2Motion clips were not fetched.

## Faults found on the way

- **Blender's glTF import failed in the master scene** ("Iridescence Factor not found"): an older importer's helper node group in the file. Renamed before importing.
- **The pickup drew in one flat grey.** A joined mesh had lost the mark saying which UV layer renders, the exporter wrote textures that name no layer, and the build dropped the layer. Fixed in `build_gate_pickup.py`; `inspect-glb.mjs` shows it.
- **The door decal was mirrored** on both sides. Fixed.
- **The exporter wrote every action in the file**, the download's raw take included. It now writes NLA tracks only.
- **Captures came out from the wrong place**: the capture window is on the owner's screen and the view was moved while it ran. The script now puts the named view back before each still.

## For the owner

1. **MPFB2 is working.** Thank you for installing it. Nothing more is needed for the people.
2. **Is a single-cab pickup acceptable for the slice?** If you want a double cab, it means modelling the second row onto this one, or the paid-model option already noted for P10a.
3. **An interim commit was made during this session** (`acba6c2`, 22:03, by you or another tool): it holds an early state of `build_gate_dog.py`. This session's commit follows it.
4. Blender has `assets-src/twin/site_master.blend` open and saved, with `LIB_fauna` and `LIB_veh` added.
5. Next: start a session with "Read `docs/twin-v2/README.md` and follow it for sub-phase **P02b**" again. It continues at the people.
