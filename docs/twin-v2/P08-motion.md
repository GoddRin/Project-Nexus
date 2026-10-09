# P08. Motion

Four sessions. Job-true movement from motion capture where it exists and hand-authored clips where it does not, played through one runtime with grounding and tool handling.

## P08a. Clip plan and acquisition

**Needs.** P07a (skeleton).

**Read first.** `CONTRACTS.md` 4.5 and 4.7; `assets-src/mixamo/` (already downloaded); `public/models/characters/CREDITS.md` (which clips were accepted or rejected before, and why); `INVENTORY.md` activity scenes.

**Steps.**
1. Write `data/clips.plan.json`: every clip the site needs, each with id, description, source guess, props, and which activities use it. Start from the catalogue below and add what the inventory's scenes need.
2. Search Mesh2Motion (CC0) first and download what fits.
3. For Mixamo, produce `review/P08a/MIXAMO-LIST.md` for the owner: exact search terms, the character to select (male Y Bot; one female figure for female-specific gait), settings (FBX, without skin, 30 fps, in place for locomotion), and the target file name for each. **Stop and wait** for the owner to sign in and download into `assets-src/mixamo/`. Do not sign in for them.
4. Anything neither library has goes on the authored list for P08d.

**Clip catalogue.**

| Group | Clips |
| --- | --- |
| Locomotion | Idle x4 (neutral, weight on one leg, hands on hips, arms folded); shift weight; look around; walk relaxed, purposeful, tired, in rubber boots, uphill, downhill; carry one-handed, on shoulder, two-handed in front, two-man; jog; turn 90 and 180 in place; start and stop; step up and down; stairs up and down; ladder up and down; sit down and stand up (chair, bench, ground); crouch; kneel; squat rest; lean on wall or rail |
| Earthwork and concrete | Shovel dig and throw; pick swing; mattock; wheelbarrow push loaded and empty; tip wheelbarrow; carry cement bag on shoulder; rake and spread; vibrate concrete with poker; screed with a straightedge (two-man); trowel and float kneeling; cure with hose; sweep; wash down |
| Rebar and formwork | Tie rebar squatting; tie rebar bent over; carry bar bundle (two-man); bend bar at bench; cut bar; hammer nail; hand saw; lift and place ply panel (two-man); tighten tie rod with spanner; plumb a form; strike formwork with bar |
| Steel and mechanical | Weld standing, crouched and overhead; grind; bolt with spanner; torque wrench; rig a sling; guide a suspended load with a tag line; turn a valve wheel; align a flange; paint with roller and brush |
| Electrical | Pull cable (team); terminate at a panel; test with a meter; climb a pole with belt; operate a switch handle |
| Tunnel | Drill with jackleg; charge holes with a loading pole; connect detonator leads; bar down loose rock (scaling); install rock bolt; fix mesh overhead; spray shotcrete with nozzle; muck with shovel; hose down face; gas-monitor sweep; signal the loader |
| Supervision | Point and direct; beckon; stop gesture; thumbs up; inspect with clipboard; inspect with tablet; write notes; measure with tape (two-man); read drawing held open; discuss at drawing table; take a photo; talk on radio; talk on phone; crane hand signals (hoist, lower, slew, stop); truck reversing signals; blow whistle; head count |
| Survey and QA | Set up tripod; level and sight through total station; hold prism pole; record in field book; slump test; fill cube moulds; rebound hammer; crack mapping on a wall; take a rock sample; label sample bag |
| Office | Type; mouse; write at desk; phone at desk; lean back and think; meeting talk; meeting listen; nod; present at screen; unroll drawing; use plotter; file documents; drink coffee; stretch at desk |
| Camp life | Queue and shuffle forward; carry tray; eat with spoon and fork; drink; wash tray; cook stir; chop; ladle; scoop rice; hand laundry and wring; hang clothes; sweep; carry bucket; bathe from bucket (seen from behind a screen, implied); brush teeth at a sink; lie in bunk; sleep; sit and scroll phone; video call; chat seated (kwentuhan) x3; laugh; smoke (in the smoking shed only); play guitar; basketball dribble, pass, shoot, rebound, defend, cheer; stretch and warm-up for the toolbox meeting x4; listen in formation; clap |
| Security and medical | Stand post; patrol walk; patrol with flashlight; check ID; inspect vehicle with mirror; open bag check; raise barrier; wave vehicle through; write in logbook; salute; take blood pressure; bandage; carry stretcher (two-man) |
| Human touches | Wipe sweat; drink from bottle; fan self with hat; shade eyes; swat insect; yawn; stretch back; adjust hard hat; pull on gloves; open umbrella; put on raincoat; shiver; greet passing colleague (nod, wave, fist bump); pet the dog |

**Pass when.** Plan file lists every clip with a source; owner has the Mixamo list; nothing is marked "unknown".

## P08b. Retarget, clean, review

**Needs.** P08a and the owner's downloads.

**Steps.**
1. Extend `scripts/blender/add_mixamo_clips.py` into `scripts/blender/twin/import_clips.py`: imports Mixamo FBX and Mesh2Motion clips, retargets by bone name onto the master skeleton, handles proportion differences (hip height scale, arm-length IK correction so hands meet), keeps or strips root motion per `clips.plan.json`.
2. Clean each clip: trim to its usable window (recordings often start or end with a settle); make loops seamless; fix foot contacts; remove jitter; set consistent facing.
3. Measure `rootSpeed` for locomotion clips and store it.
4. Review: `render_clip_review.py` stills (start, mid, extreme poses) on three bodies (slim, stocky, female) in their work outfit. Reject any clip that intersects clothing badly or reads wrong for a site worker; note rejections and reasons in the credits file as the existing one does.
5. Export animation-only GLBs grouped by set (`anim.locomotion.glb`, `anim.work-civil.glb`, and so on) with resampling and compression; write `clips.json`.

**Pass when.** Every accepted clip has review stills; motion checklist items 1, 2 and 4 pass in Blender; total animation download within budget.

## P08c. Animation runtime

**Needs.** P07d, P08b.

**Steps.**
1. `characters/animation/controller.ts`: per character, a layered state machine: base layer (locomotion or full-body activity), upper-body override layer (carry, radio, phone, point), additive layer (breathing, fatigue slump, look-at), face layer. Cross-fades with per-clip blend times; no pops.
2. Locomotion: blend by speed and turn rate; play rate matched to actual ground speed from `rootSpeed` so feet do not slide; start, stop and turn-in-place clips; slope adaptation (lean, shorter steps uphill).
3. Foot IK: two-bone IK to the terrain or floor height with pelvis offset, enabled on LOD0 and LOD1 near the camera.
4. Hand IK: reach to a station's hand targets and to a prop's `GRIP_L` for two-handed tools; fingers pose from a small grip library (power grip, pinch, flat, pointing).
5. Look-at: head and eyes toward a target with limits and a natural delay; default targets are the work point, a speaking colleague, or a passing vehicle.
6. Variation: random start phase, plus or minus 8% play rate, mirrored variants for symmetric clips, random pick without immediate repeat inside an activity's loop list.
7. Events: clips carry named markers (foot down, hammer hit, shovel throw) that trigger sound and effects (P12).
8. Internal clip viewer at `?debug=1&lab=clips`: pick a person, outfit and clip, scrub, show sockets and contacts. This is the successor to v1's Locomotion Laboratory.

**Pass when.** Full motion checklist passes in the browser at eye level; 80 animated people stay within the measured animation budget; the viewer works.

## P08d. Authored clips and paired actions

**Needs.** P08c.

**Steps.**
1. For each clip on the authored list, block it in Blender on the master skeleton with IK, using video reference of the real task (note sources in the report); polish arcs, weight and overlap; add markers.
2. Paired and group actions as synchronised sets with a shared anchor: two-man carry, tape measuring, screeding, panel lift, cable pull, stretcher carry, handshake, hand-over of a tool or document, guard inspecting a driver's ID, serving food across a counter.
3. Tool-specific finger poses.
4. Review and export as in P08b.

**Pass when.** No activity in `activities.json` lacks a clip; paired actions hold contact (hands on the same object) within 2 cm throughout.
