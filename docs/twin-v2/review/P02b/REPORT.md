# P02b report: three people, a dog and a pickup at the camp gate

2026-10-14, branch `twin-v2` (amended the same day: fit-test poses, the shell, pipeline and bench checks, other browsers, and frame rates measured with nothing else running). Second session of this sub-phase. The first (2026-10-13) made the dog, the pickup and the runtime for things that move; this one made the three people, their clothes and motion, and put them in the gate's loop.

**Status: built, with one pass check not met.** The guard, the engineer and the labourer are in the slice and the loop plays through. Beside the Atlas Navigator they are not yet as convincing as he is, which the person checklist asks for. That is the owner's call at the P02c gate, and the part most worth improving before people are mass-produced.

To see it: `http://localhost:3000/digital-twin?v=2&place=gate-approach` on the dev server. The loop takes 56 seconds.

## Result against "Pass when"

| Pass when | Result |
| --- | --- |
| Person, motion and animal checklists pass | **Partly.** Tables below. The line that fails outright is "at least as convincing as the Atlas Navigator" |
| Side-by-side still with the Atlas Navigator at equal framing | **Done:** `navigator-beside-engineer-full.jpg`, `-close.jpg` (rendered in Blender, same camera and light; taken before the cloth was rumpled and the collar bones corrected) |
| No poke-through on any outfit in any test clip | **None found at the size checked.** Every clip on every outfit is on the contact sheets (`sheet-guard.jpg`, `sheet-engineer.jpg`, `sheet-labourer.jpg`: 52 clips, four moments each, front and side) and about 65 of the stills were looked at full size. The checklist's own test set is there too: walk, and five poses authored for the purpose because no clip covered them (`test-squat`, `test-overhead`, `test-across`, `test-sit`, `test-bend`; they are in the sheets and are not exported). In all of them sleeve stays on wrist, collar on neck, trouser on boot and shirt in the waistband, and no skin shows. A still is 300 pixels wide, so an intersection of a centimetre or two would not show. Seen and left: bending forward, the guard's baton stands out stiffly behind him (it is bound to the hips and does not hang) |

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
- **Not made:** stop and turn (no Mixamo file for them here; in the loop a man turns on the spot while his clip plays, and a walk ends by blending into the next clip). They need the owner's Mixamo downloads, listed at the end. Mesh2Motion clips were not fetched.

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

`node scripts/twin/bench.mjs p02b`: production build, Iris Xe, Chrome, Medium, frame cap off, resolution held, nothing else running on the machine. One run.

| Budget line | Measured | Budget | |
| --- | --- | --- | --- |
| Median frame rate, overview | 79.9 fps | 45 or better | pass |
| Frame rate over the fly-through | 91.5 fps; worst place 25.2 (`temfacil-guardhouse`, v1's view of the gate) | 45 or better | pass on the median |
| p95 frame time, overview | 17.5 ms | 33 ms or less | pass |
| Draw calls, most seen | 152 | 350 or fewer | pass |
| Triangles in view, most seen | 767,642 | 700,000 or fewer | **fail** |
| Pipelines | 154 | 40 or fewer | **fail** |
| Real-time lights | 4 | 9 or fewer | pass |
| First usable view, warm | 8.8 s; everything in after 93 s | 6 s or less | **fail** |
| Download to first view | 39.0 MB (twin assets 37.5) | 12 MB or less | **fail** |
| Download, whole site | 54.5 MB | 70 MB or less | pass |
| JS heap | +4.3 MB a minute over 1.7 minutes; no 20-minute soak was run | no growth | **not established** |

At the gate itself, with the loop running and five actors: **38 fps, p95 45.9 ms**, 119 draw calls, 505,000 triangles. That is under the 45 fps line. Other single readings of the gate views on this laptop, taken with other programs open, ran from 23 to 45 fps (Low tier: 46 to 74); they are in `captures-*.json` and are not benchmarks.

The people add about 20 MB of download (3.4 MB of each is the 2K normal map). The frame rate at the gate, the pipelines, the download and the 93 seconds for everything to arrive are all P02c's to cut.

**Checks run** (production build; results in `checks/`):

| Check | Chrome (WebGPU) | Chrome forced to WebGL2 | Edge | Playwright Firefox | Playwright WebKit |
| --- | --- | --- | --- | --- | --- |
| `check-shell.mjs` | 21 of 22 | 20 of 22 | 21 of 22 | 18 of 22 | 19 of 22 |

- Failing everywhere: "night is darker than noon and not black" (18:30 at the switchyard reads 18 against a line of 20). Carried over from P02a; a lighting matter for P03b.
- WebGL2, Firefox, WebKit: "store changes reach the URL" (the time stays in the address after Live is pressed). Not seen on WebGPU. **Not investigated**: these three run the fallback at a few frames a second with the slice loaded, so it may be the check's timing or a real fault in the fallback.
- Firefox: two of the five Escape-to-overview cases ended a metre or two from the overview pose. The other three passed. Probably the same slowness, but **not proven**; it touches the free-navigation rule, so P02c should run it again on a faster fallback.
- WebKit: after a lost device the rebuilt picture was too dark (brightness 11).
- The "20 loads" line first failed on 16 of 20 loads. It was the check: dynamic resolution resizes the canvas, the same renderer asks for its context again, and the count took that for a second renderer. The check now holds the resolution for that line.

`check-pipeline.mjs` (Chrome): 11 of 15. Two failures are lines that assume the test yard is the only thing loaded (draw calls; memory back to the start, where the gate's actors stay loaded by design). Two are real and worse than in P02a: the test zone took 35.9 s to stream in beside the slice (15 s then), and one streaming step held the page for 52.8 ms (24 ms then; the line is 8 ms).

`bench.mjs` needed its wait for streaming raised from 120 to 300 seconds to finish at all, which is itself the finding above. Only the desktop profile was run.

Type check and lint pass for the files touched.

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
- No stop or turn clips. The squat, sit, reach, arm-across and bend poses are fit tests, not motion fit to show.
- The guard's hands are not fitted to the barrier's counterweight.
- The labourer digs at night and in rain as he does at noon (a programme is P09's).
- Glasses are a frame without lenses.
- Each man carries his own copy of every clip.
- From the first session, still open: the pickup is a single cab with fixed doors and pops in and out at the ends of the road; the dog's walk is slow and its hind legs sink when it lies.
- The fallback's failures in the checks above are not explained.
- Not checked: a real phone, real Safari, High and Ultra, leaving and re-entering the location with actors, the bench's phone profile, a 20-minute heap soak.

## Faults found on the way

- **MPFB2's Mixamo rig had its arms in a T-pose under an A-pose mesh** unless the human is made with detailed helpers.
- **Review stills showed stale poses** (a second scene rendered without the main scene's frame being set): the first contact sheets were wrong and made the authored clips look as if they did nothing.
- **Normal maps baked against the wrong UV layer**; then the people still looked pale, which turned out to be the materials themselves.
- **The glove's knuckles were weighted to a shoulder bone** and spiked when the hand moved.
- **An export picked up another man's meshes** after a collection was left linked in the review scene; the build refused the files.
- **A reference to a UV layer went empty** after a visit to edit mode and stopped one bake.

## For the owner

1. **Look at the people first**: `verge-pair-noon-verge-g12.jpg`, the three `face-…` captures and `navigator-beside-engineer-full.jpg`. The question for the gate is whether this level is acceptable for site staff seen from a few metres, or whether the bodies nearest the camera should be built another way.
2. **Mixamo downloads (about 15 minutes; needs your free Adobe sign-in, which a session may not do for you):**
   1. Open https://www.mixamo.com and sign in.
   2. In the Characters tab choose **Y Bot**.
   3. For each motion below: search for it in the Animations tab, click it, tick **In Place** where the box is offered, click **Download**, and choose Format **FBX Binary (.fbx)**, Skin **Without Skin**, Frames per Second **30**, Keyframe Reduction **none**.
   4. Save each file into `assets-src/mixamo/` under the name given.

   | Search for | Save as |
   | --- | --- |
   | Left Turn 90 (a standing turn) | `twin_turn_left_90.fbx` |
   | Right Turn 90 | `twin_turn_right_90.fbx` |
   | Turn 180 (standing) | `twin_turn_180.fbx` |
   | Walk To Stop (or Walking To Standing) | `twin_walk_stop.fbx` |
   | Start Walking (or Standing To Walking) | `twin_walk_start.fbx` |
   | Stand To Sit | `twin_stand_to_sit.fbx` |
   | Sitting Idle | `twin_sit_idle.fbx` |
   | Sit To Stand | `twin_sit_to_stand.fbx` |
   | Crouch (or Squat) idle | `twin_squat.fbx` |
   | Picking Up Object (from the ground) | `twin_pick_up.fbx` |
   | Reaching Up (or Taking Item from a shelf) | `twin_reach_up.fbx` |

   If a name is not there, take the closest one and keep the file name. These are also the first clips P08a will ask for, so nothing is wasted.
3. **Optional, and it would help the look most:** phone photographs of the real PPE and work clothes (`TOOLBOX.md`, "Optional captures the owner can provide").
4. The first session's question still stands: is a single-cab pickup acceptable for the slice?
5. `assets-src/twin/site_master.blend` is saved with `LIB_char` and the working collections `WORK_people.*` added. Blender was closed when this was amended; the fit-test stills were rendered by running it from the command line, and nothing was saved back.
