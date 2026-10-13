# P02b report: three people, a dog and a pickup at the camp gate

2026-10-14, branch `twin-v2`. Second session of this sub-phase. The first (2026-10-13) made the dog, the pickup and the runtime for things that move; this one made the three people, their clothes and motion, and put them in the gate's loop.

**Status: built, with one pass check not met.** The guard, the engineer and the labourer are in the slice and the loop plays through. Beside the Atlas Navigator they are not yet as convincing as he is, which the person checklist asks for. That is the owner's call at the P02c gate, and the part most worth improving before people are mass-produced.

To see it: `http://localhost:3000/digital-twin?v=2&place=gate-approach` on the dev server. The loop takes 56 seconds.

## Result against "Pass when"

| Pass when | Result |
| --- | --- |
| Person, motion and animal checklists pass | **Partly.** Tables below. The line that fails outright is "at least as convincing as the Atlas Navigator" |
| Side-by-side still with the Atlas Navigator at equal framing | **Done:** `navigator-beside-engineer-full.jpg`, `-close.jpg` (rendered in Blender, same camera and light; taken before the cloth was rumpled and the collar bones corrected) |
| No poke-through on any outfit in any test clip | **None found at the size checked.** Every clip on every outfit is on the contact sheets (`sheet-guard.jpg`, `sheet-engineer.jpg`, `sheet-labourer.jpg`: 37 clips, four moments each, front and side) and about 40 of the stills were looked at full size. A still is 300 pixels wide, so an intersection of a centimetre or two (the baton against the thigh in the walk, the tablet against the leg) would not show. The test set the checklist names includes squat, overhead reach, arm across chest, sit and bend to floor: **those clips do not exist yet** (not among the Mixamo files on this machine), so the outfits are untested in them |

## What was built

| Asset | Who | Triangles LOD0 / 1 / 2 | Shipped | Clips |
| --- | --- | --- | --- | --- |
| `char.guard.a` | Security guard, about 40, stocky, 1.66 m. White uniform shirt tucked into navy trousers, black belt with buckle, radio and baton, epaulettes, shoulder patches, badge, name tape, ID, navy cap with badge, black shoes | 19,499 / 5,899 / 1,446 | 6.8 MB | 12 |
| `char.engineer.a` | Site engineer, late twenties, slim, 1.72 m. Slate-blue long-sleeved shirt, hi-vis vest with silver tape and orange edging, ID, jeans, tan safety boots, white hard hat, glasses frame, tablet in the left hand | 19,495 / 5,879 / 1,407 | 6.9 MB | 12 |
| `char.labourer.a` | Labourer, about 50, wiry, darker from the sun, 1.60 m. Faded green long sleeves with yellow reflective bands, grey cotton gloves, work trousers tucked into black rubber boots, mud to the knee, green hard hat over a neck cloth, long-handled shovel in the right hand | 19,086 / 5,900 / 1,447 | 6.6 MB | 13 |

Budget for a named person is 20,000 / 6,000 / 1,500 triangles, a 2K sheet and two materials: all three are inside it. Each has 52 bones (limit 65) and at most four bone weights a vertex.

**How they are made** (`scripts/blender/twin/build_gate_people.py`, stages `body`, `dress`, `bake`, `lods`; the whole of it runs from the script):

- Bodies are MPFB2 humans (CC0) shaped by age, build and 24 to 36 face targets each, including asymmetry, so the three are different men. Skin is toned and given pores and a little shine.
- Garments are MPFB2 library pieces (CC0 and CC BY, credited) recoloured to the site's clothing in reference R4; everything else is modelled in the script: hard hats with ribs, peak and suspension band, the vest (cut from the shirt's own torso and worn 7 mm over it), belt, buckle, radio, baton, patches, glasses, tablet, neck cloth, shovel.
- Skin under clothing is removed; the shirt under the vest is removed; the guard's shirt is pulled in and cut at the belt; the labourer's trouser legs are pulled inside his boots and cut there.
- Cloth is rumpled (a few millimetres of layered noise along the surface) and carries fine creases in its normal map.
- Each man is baked to one 2K sheet (colour, normal, occlusion with roughness and metal) and a 1K cut-out sheet for hair, brows and lashes.
- Height is set exactly at the end (head height comes out between 1/7.3 and 1/7.6 of stature as MPFB2 makes it; not measured separately).

**Motion** (`scripts/blender/twin/build_gate_people_clips.py`):

- From Mixamo files already on this machine, retargeted to each man's skeleton: `idle` (9.9 s, breathing), `idleShift` (8.8 s, weight shifts), `walk` (1.03 s, recorded at 1.38 m/s), `talk`, `talk2`, `point`, `waveThrough`, `listen`, `acknowledge`, `lookAround`, `wave`.
- Authored here on a two-bone solver: `tablet` (engineer: raises the tablet, looks down, taps and swipes with the other hand; 8 s), `barrier` (guard: leans in, takes the counterweight end in both hands and bears down; 4.5 s), `restShovel` (labourer: stands with the blade on the ground, hand on the shaft), `shovel` (labourer: sets the blade, drives it in, levers, lifts and throws; 3.2 s, with a crouch that keeps his feet planted).
- **Not made:** stop and turn (no Mixamo file for them here; in the loop a man turns on the spot while his clip plays). Mesh2Motion clips were not fetched.

**In the loop** (`components/twin/sim/gate-scene.ts`): the guard stands at his post, walks to the driver's door as the pickup brakes, talks for four seconds, walks to the barrier, bears down on the counterweight as the arm rises, waves the pickup through, lowers the barrier and walks back. On the booth's side of the road outside the gate the engineer talks, reads his tablet, listens and points while the labourer rests on his shovel and digs. The dog does what it did before.

**Runtime changes:** people are ordinary actors (`engine/actors.ts`), which now turns every actor's materials into ones that darken and shine in rain; `Beat` lists drive each person's part.

## Captures

Production build, visible Chrome, Medium, WebGPU. In this folder:

| File | What |
| --- | --- |
| `gate-approach-noon-people-g05/14/24/31.jpg`, `gate-approach-night-people-g…` | The loop at four moments: waiting, guard at the driver's door, guard at the barrier with the arm rising, pickup driving in |
| `gate-booth-noon-people-booth-g14/24.jpg` | The same from the guardhouse view |
| `verge-pair-dawn/noon/golden/rain/night-verge-g12.jpg` | The engineer and the labourer from 4 m at five moments |
| `face-guard/engineer/labourer-noon-…-g03.jpg` | Each face from about 1.2 m |
| `sheet-*.jpg` | Every clip on every outfit |
| `navigator-beside-engineer-*.jpg` | The comparison |
| `gate-approach-noon.webm`, `gate-approach-night.webm` | 34 seconds of the loop each, recorded before the last rebuild of the people (same motion; smoother cloth, wider vest tape). **Not in git**; on this machine only |

No reference photographs were added to `reference/` for the people beyond the owner's set R4, which is what the clothing follows.

## Numbers

Production build, Iris Xe, Chrome, Medium, frame cap off, loop running, five actors. One run each; Blender was open; this laptop's readings wander by 10 to 20% between runs.

| View | Frame rate | p95 | Draw calls | Triangles (all passes) | Pipelines |
| --- | --- | --- | --- | --- | --- |
| `gate-approach` | 45.2 fps | 39.7 ms | 110 | 734,000 | 126 |
| `gate-booth` | 35.2 fps | 31.8 ms | 134 | 1,065,000 | 119 |
| `gate-over` | 45.4 fps | 39.3 ms | 101 | 540,000 | 134 |
| `gate-approach`, Low tier | 74.2 fps | 14.1 ms | 58 | 269,000 | 63 |

These were measured just before the last rebuild of the people (rumpled cloth, the vest's tape), which did not change their triangle counts or texture sizes. A second run after it did not finish before this report was written. Capped at the screen's 60 fps, the later captures ran between 19 and 45 fps with other programs open.

Budget lines for Medium: 45 fps, p95 33 ms, 350 draw calls, 700k triangles, 40 pipelines. The slice with its actors is at or under the frame-rate line at the gate views and well over on pipelines. The people add about 20 MB of download (3.4 MB of each is the 2K normal map), taking the slice to about 45 MB against 12 MB to a first view. All of that is P02c's to measure and cut.

`check-shell.mjs`, `check-pipeline.mjs` and `bench.mjs` were **not run** this session. Type check and lint pass for the files touched.

## Checklists

**A person** (`QUALITY-BAR.md` section 3)

| Line | Result |
| --- | --- |
| Reads as a specific Filipino adult, not a mannequin | **Partly.** Three distinct men by age, build and face; skin has tone variation and pores. Faces are still MakeHuman faces: smooth, with little character close up. Brows and lashes present; eyes are glossy but the upper lid casts no shadow |
| Proportions inside human ranges | Pass as MPFB2 makes them; hands reach mid-thigh |
| Hair has shape and strands at the edge | **Fail.** Hair is MPFB2's short cap with a cut-out edge, mostly hidden under hats |
| Clothing has thickness; folds; seams | **Partly.** Thickness at the vest, belt, hat and cloth; cuffs, collar and hems are single sheets. Folds are the garment's own plus the rumpling; seams only where the library texture has them |
| No gap, no skin through, no garment through another | See the poke-through row above |
| Hidden body under clothing removed | Pass |
| Joints keep volume when bent | **Not checked** beyond the test clips; elbows and knees look sound in the stills. No squat or overhead reach was tested |
| Hard hat level, two fingers above the brow, suspension visible; vest hangs with weight, tape reads as tape | Hat: pass. Vest: tape reads as tape; it follows the shirt rather than hanging |
| Boots contact the ground flat | Pass in the stills; **not measured** |
| Correct at dawn, noon, night under a lamp, and wet | Pass by eye in the verge captures |
| Side by side with the Atlas Navigator, at least as convincing | **Fail.** His clothes are scanned cloth with real folds and photographic texture; theirs are library garments recoloured |

**Motion** (section 4)

| Line | Result |
| --- | --- |
| Feet do not slide | **Not measured.** The walk is played at 1.3 m/s against 1.38 m/s recorded |
| Weight shift before a step, lift or swing | In the recorded clips, yes; the authored clips take theirs from the idle underneath |
| Hands hold the tool; the working end meets the work | Shovel: both hands on the shaft, fingers closed round it, blade into the ground. Tablet: lies on the palm, fingers flat behind it. Barrier: the guard's hands close on air about where the counterweight is; **not aligned to the arm itself** |
| No snapping, no frozen frames, no loop seam | None seen in the videos; one-shot clips hold their last pose until the next beat |
| Two people nearby never in step | Looping clips start at different points per man |
| Head and eyes look at the work or the person | Engineer looks at his tablet; the guard faces the cab. Eyes do not move |
| An idle person breathes, shifts weight and looks around | Yes (recorded) |

**Animal** (section 5): unchanged from the first session's report; nothing was done to the dog.

## Known gaps

- **The people are below the navigator** (above). In order of effect: cloth draped by simulation and baked from a dense mesh; garment textures from photographs of the site's own clothing; faces from the staff photographs (P07c).
- **The pickup has no driver**: the guard talks to an empty cab. A vehicle's operator is P10's.
- No stop or turn clips; no squat, sit, overhead-reach or bend clips to test the outfits on.
- The guard's hands are not fitted to the barrier's counterweight.
- The labourer digs at night and in rain as he does at noon (a programme is P09's).
- Glasses are a frame without lenses.
- Each man carries his own copy of every clip.
- From the first session, still open: the pickup is a single cab with fixed doors and pops in and out at the ends of the road; the dog's walk is slow and its hind legs sink when it lies.
- Not checked: the WebGL2 fallback, Edge, Firefox, WebKit, a phone, High and Ultra, leaving and re-entering the location, a lost device, the shell and pipeline checks.

## Faults found on the way

- **MPFB2's Mixamo rig had its arms in a T-pose under an A-pose mesh** unless the human is made with detailed helpers.
- **Review stills showed stale poses** (a second scene rendered without the main scene's frame being set): the first contact sheets were wrong and made the authored clips look as if they did nothing.
- **Normal maps baked against the wrong UV layer**; then the people still looked pale, which turned out to be the materials themselves.
- **The glove's knuckles were weighted to a shoulder bone** and spiked when the hand moved.
- **An export picked up another man's meshes** after a collection was left linked in the review scene; the build refused the files.
- **A reference to a UV layer went empty** after a visit to edit mode and stopped one bake.

## For the owner

1. **Look at the people first**: `verge-pair-noon-verge-g12.jpg`, the three `face-…` captures and `navigator-beside-engineer-full.jpg`. The question for the gate is whether this level is acceptable for site staff seen from a few metres, or whether the bodies nearest the camera should be built another way.
2. **Optional, and it would help most:** phone photographs of the real PPE and work clothes (TOOLBOX, "Optional captures") and the Mixamo downloads for stop, turn, squat, sit, reach and bend.
3. The first session's question still stands: is a single-cab pickup acceptable for the slice?
4. Blender has `assets-src/twin/site_master.blend` open and saved, with `LIB_char` and the working collections `WORK_people.*` added.
