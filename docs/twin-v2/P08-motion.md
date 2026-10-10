# P08. Motion

**Tools and sources:** read `TOOLBOX.md` first (free tools for models, motion capture from video, scans of real objects, and what the owner may have supplied).

Five sessions (P08a to P08e). Job-true movement from motion capture where it exists and hand-authored clips where it does not, played through one runtime with grounding and tool handling.

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

## P08e. Real-time actions: putting on, taking off, picking up, handing over

**Needs.** P08c, P08d, P07d (sockets), P09a.

The owner asked (2026-10-10) for people to visibly **take their hard hats off and put them on** as real animations, and for more actions of that kind. The rule this serves: nothing about a person changes by popping. If a hat, tool, raincoat or phone appears on or leaves a person, you see the hand do it.

### Hard-hat rules (the owner's, from `reference/INDEX.md` R4)

- Staff wear white; workers wear green. Red, orange and full-brim hats appear on some people as in the photographs.
- **On** whenever working or anywhere in a work zone (zones carry `ppe: required`).
- **May be off** when resting, eating at the canteen, in the office, in the barracks, at the evening gatherings, and during the anthem or prayer at assembly.
- Sim rule: each person has `hat: on | hand | underArm | belt | hung | table | off`. Entering a `ppe: required` zone or starting a work activity triggers the put-on action first; starting a rest, meal or assembly-prayer activity allows a take-off action, chosen by the person's habit and the place.

### The hard-hat set (author every one; all are short, 1 to 3 seconds, and blend from walking or standing)

- Take off with one hand by the brim and **tuck under the arm**; hold at the hip; hold in both hands in front; hold over the chest for the anthem.
- **Hang on the rack** by the office or canteen door; take the right one back (name or sticker on it).
- Put down **on the table or bench beside the tray**; pick it up again when leaving.
- Hook it on a belt clip or carry it by the chin strap; hang it on a nail, a rebar end or the motorcycle mirror.
- Put on: seat it, a pat on top, fasten or tuck the chin strap, adjust the ratchet at the back.
- Small ones while wearing it: tilt it back to wipe the brow, lift and resettle, fan the face with it, shade the eyes with a hand under the brim, knock dust off it, shake rain off it.
- Sit on it as a stool at break (seen on real sites), use it to carry a few bolts.
- Swap hard hat for motorcycle helmet at the bike, and back.

### More real-time actions to build (each as a small clip set with a prop that moves between sockets)

| Group | Actions |
| --- | --- |
| Other PPE | Vest on and off over the head or by the arms, zip or fasten; gloves pulled on and peeled off and tucked in the belt; safety glasses up onto the hat or into a pocket; face cloth or mask pulled up and down; ear muffs flipped down; respirator on for shotcreting; harness stepped into, buckled, lanyard clipped and unclipped at an anchor; cap lamp switched on at the tunnel portal; rubber boots pulled on and shaken out; boots swapped for slippers at the barracks door |
| Rain gear | Raincoat or poncho shaken out and pulled on; hood up; umbrella opened, tilted into the wind, closed and shaken; a plastic bag over a phone or clipboard; raincoat hung to drip |
| Tools and loads | Pick up and set down a shovel, bar, hammer, drill, hose; lean a tool against a wall; sling a tool over the shoulder; draw a tape, pliers or radio from the belt and return it; pass a tool hand to hand; toss a tie-wire coil or a bag to a mate; two-man lift, carry and lower of timbers or pipe on a count (as in R4 `site-05`); load and unload a truck bed; start a generator with a pull cord; coil a hose or cable |
| Climbing and reaching | Climb a ladder with a tool in one hand; shin up a pole or scaffold tube (R4 `site-04`); step over a rebar mat; duck under a prop; steady yourself on a rail; crouch to look under something |
| Instruments | Open the case, lift out the total station, spread and tread in the tripod legs, mount and level it, sight, note the reading; hold and plumb the prism pole; unroll and weight a drawing; tap and swipe a tablet; take a photo with a phone |
| Everyday | Take a phone from a pocket, answer, pocket it; radio from the belt to the mouth and back; drink from a bottle and cap it; pour water over the head; wipe face with a towel from the shoulder; light and put out a cigarette at the smoking shed; check a watch; scratch, stretch, yawn; tie a bootlace; roll sleeves up and down; tuck in a shirt |
| Meals and camp | Take a tray, be served, carry it, sit, eat, stack the tray; wash a plate; fill a water jug; hang and take down laundry; wring a shirt; fold a blanket; sweep; water the vegetable patch and pick a gourd (R4 `site-08`); cover and uncover a parked motorcycle; unlock a door; switch on a light or a fan |
| Vehicles | Open a door, climb in, belt up, start; climb down; drop a tailgate; climb into a truck bed with a hand from a mate; kick-start and mount a motorcycle; fuel from a jerry can; wipe a windscreen; check a tyre |
| Between people | Handshake, fist bump, a hand on the shoulder; hand over a document, a tool, a drink; sign a clipboard held by another; show a phone screen; help someone up; salute and gate-pass check; a group lowering their heads for a prayer |
| Doors and things | Push and pull doors, slide a gate, raise the boom barrier, open a tool box, lift a manhole cover with a bar, turn a valve, plug in a cable, flip a breaker |

### How it works

1. Each action is a **transition clip** with markers for the frames where the hand takes hold, lets go, and where the prop changes socket (`head` to `handR` to `underArmL`, and so on). The runtime moves the prop between sockets on those markers and uses hand IK so the fingers meet it. Props put down stay where they were left, as real objects the person returns to.
2. Actions play on the upper body while walking where that is natural (taking a hat off while approaching the canteen) and as full-body where it is not (pulling on boots).
3. The sim never sets a state directly: it requests an outcome ("hat off, on the table") and the animation layer performs the action, then reports done. Far away (LOD2 and beyond) the state changes without the clip, so the cost stays near zero.
4. Variation: left- and right-handed people, quick and unhurried versions, habit per person (one always tucks it under the arm, another always hangs it up).
5. In walk mode the visitor's avatar uses the same set: hat on at the PPE point, off in the office and canteen.
6. Sources: record these with FreeMoCap or from phone video (see `TOOLBOX.md`); most are short and simple, which suits video capture. Hand-key the prop contact frames.

**Pass when.**
- [ ] At the canteen door at noon, a stream of workers each visibly removes a hard hat in one of several ways and no hat pops off or on.
- [ ] At assembly, hats come off for the prayer or anthem and go back on after, as in R4 `site-02`.
- [ ] No one is working in a `ppe: required` zone without a hat; no one eats with it on unless that is their habit.
- [ ] Every row of the table has at least one action built and reviewed; hands meet props within 2 cm at the contact frames.
- [ ] Put-down props are picked up again by their owner (asserted over a simulated day: no orphaned hats).
