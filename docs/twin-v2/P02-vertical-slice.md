# P02. Vertical slice: the gate

Three sessions, and a fourth (P02d, people polish) added on 2026-10-14 that runs before P02c; P02e and P02f (added 2026-10-15 from the owner's gate answers) run after P02c and before P03. One small area is finished to final quality before anything is mass-produced, so the look, the pipeline and the real cost of each kind of asset are proven on a 40 m patch instead of discovered after ten phases.

**The slice:** the camp gate. Guardhouse and boom barrier, 40 m of access road, the verge with forest edge, three people (security guard, site engineer, labourer), one aspin dog, one pickup truck. Full 24-hour light and rain on that patch only.

**This phase is a gate.** P03 onward does not start until the owner has approved the slice.

## P02a. Ground, guardhouse, plants

**Needs.** P01c.

**Read first.** `QUALITY-BAR.md` sections 1, 2, 6, 7; `INVENTORY.md` rows for the guardhouse (`SecurityGuardhouseCheckpoint` in v1 `AnimatedSiteEntities.tsx` line 3667) and the road (`routes.json`); `components/twin/data/site-layout.json`.

**Steps.**
1. Collect 3 or more reference photos each: Philippine construction-site guardhouse and boom gate, gravel access road in wet tropics, lowland Luzon forest edge. Save with sources in `reference/gate/`.
2. Ground: crop a 60 m terrain patch around the gate. Build the blended ground material (Poly Haven / ambientCG CC0 sets): compacted gravel road, muddy verge, grass, leaf litter; blend by a painted mask and slope; puddle layer driven by a wetness value. Ruts and tyre tracks as decals or mask detail.
3. Guardhouse in Blender, from the inventory dimensions: CHB or container-style booth, GI roof with overhang and gutter, sliding window, logbook shelf, wall fan, fluorescent tube, boom barrier with counterweight and stop post, speed hump, convex mirror, signage ("STOP: SECURITY CHECK", visitor rules, SCIC wordmark), sandbag or planter, flood lamp on a pole. Trim-sheet texturing, weathering per the checklist. Three LODs.
4. Plants: one large tree, one medium tree, banana clump, two shrubs, fern, grass clumps (build or adopt as P04a will, but only these). Leaf cards with a shared atlas; wind in the vertex stage.
5. Lighting for the patch: temporary but physically based sun, sky and image-based light following the clock; 3-cascade sun shadows; AO; the flood lamp and booth light as real lights at night.
6. Wetness: one global value that darkens base colour, lowers roughness and fills puddles.
7. Export through the pipeline as zone `camp-gate`.

**Deliver.** Zone `camp-gate` in the master scene and in the app; review captures at the seven moments of `QUALITY-BAR.md` section 7.

**Pass when.**
- [ ] Mesh, structure and lighting checklists pass for every asset.
- [ ] Captures placed beside references in the report.
- [ ] The patch alone runs above 60 fps on Medium.

## P02b. Three people, a dog, a pickup

**Needs.** P02a.

**Read first.** `QUALITY-BAR.md` sections 3, 4, 5; `public/models/characters/CREDITS.md`; `scripts/blender/add_mixamo_clips.py`, `refine_arm_weights.py`, `render_clip_review.py`, `pose_render.py` (the existing, working character pipeline); `components/atlas/ai/AtlasNavigatorModel.tsx` lines 1 to 120 (bone names and how clips are layered); `assets-src/mixamo/` (clips already downloaded).

**Steps.**
1. Confirm MPFB2 installs and runs in Blender 5.2. If it does not, record it and use the fallback in `RISKS.md`.
2. Build one male body with MPFB2 at the quality bar: face sculpted away from the default, Filipino features, skin texture with detail, eyes, teeth, lashes, brows, hair cards. Rig with a Mixamo-compatible skeleton (same bone names as the navigator).
3. Dress him three ways as separate garment sets on that skeleton:
   - **Security guard:** uniform shirt with patches and epaulettes, trousers, belt with radio and baton, cap, black shoes, ID.
   - **Site engineer:** long-sleeve work shirt, hi-vis vest with ID pocket, jeans, safety shoes, white hard hat, safety glasses, tablet.
   - **Labourer:** faded long-sleeve shirt, arm sleeves, face cloth under a yellow hard hat, work trousers, rubber boots, gloves.
   Use Sketchfab CC0/CC BY PPE where good (the navigator's hard hat and vest are already credited); model the rest. Do the full fit-and-finish list from `QUALITY-BAR.md` section 3, then make two more bodies by varying height, build, face and skin so the three are clearly different men.
4. Clips: from the Mixamo files already in `assets-src/mixamo/` plus Mesh2Motion CC0, assemble a test set: idle with weight shifts, walk, stop, turn, talk, point, look at tablet, wave vehicle through, raise barrier (author if missing), shovel (author if missing). Retarget, cut to clean windows, render review stills.
5. Run the poke-through test: play every clip on every outfit in Blender, render a contact sheet, fix every intersection.
6. Dog: find a rigged, animated short-coated mongrel on Sketchfab (CC0/CC BY). If none meets `QUALITY-BAR.md` section 5, take the best rigged dog and re-texture and re-proportion it. Clips: idle, sit, lie, walk, trot, bark.
7. Pickup: a white double-cab utility truck (CC0/CC BY), cleaned, with separate wheels, doors and steering, SCIC door decal, dust and mud layers, working lamps. No brand badges.
8. Minimal runtime to stage a loop: the pickup drives up, stops; the guard walks out, inspects, raises the barrier, waves; the engineer talks to the labourer at the verge; the dog lies in shade and gets up when the truck arrives. Scripted for the slice only (the real simulation is P09), but using the real character component API so it carries forward.
9. Export LODs and build.

**Deliver.** Three people, dog and pickup in the slice; contact sheets; a 30-second capture at noon and at night.

**Pass when.**
- [ ] Person, motion and animal checklists pass.
- [ ] Side-by-side still with the Atlas Navigator at equal framing is in the report.
- [ ] No poke-through on any outfit in any test clip.

## P02c. Measure, recalibrate, owner gate

**Needs.** P02b.

**Steps.**
1. Measure marginal cost on the laptop by adding copies: frame time per extra person at each LOD, per tree, per vehicle, per shadow cascade, per real light, AO on/off, each tier. Measure download size per asset type.
2. From those numbers compute what the full site can afford: people in view, trees in view, how many lights, which effects each tier keeps. Rewrite `MASTER-BRIEF.md` section 5 and `QUALITY-BAR.md` section 1 with measured budgets and note the change in `DECISIONS.md`.
3. Update `RISKS.md`: retire or confirm each seeded risk.
4. Write `review/P02c/REPORT.md` as the owner's decision document: slice captures at seven moments, the navigator comparison, the cost table, what the full site will and will not be able to show at each tier, and a short list of questions (is this the look; are the people good enough; anything to change before it is multiplied).

**Pass when.**
- [ ] Budgets rewritten from measurement.
- [ ] The owner has replied with approval or changes. If changes, they are done in a follow-up `P02d` before P03 starts.

## P02d. People polish (added 2026-10-14; runs before P02c)

**Why.** P02b's people read well from the gate cameras but are less convincing than the Atlas Navigator close up: cloth is library garments recoloured, with no real folds; cuffs, collars and hems have no thickness; faces are smooth; hair is a cap. The owner left the decision to the session (2026-10-14): polish them before the gate rather than accept them as they are.

**Needs.** P02b. Blender open on `assets-src/twin/site_master.blend` with the MCP add-on running.

**Read first.** `review/P02b/REPORT.md` (checklists and known gaps); `scripts/blender/twin/build_gate_people.py` and `build_gate_people_clips.py`; `QUALITY-BAR.md` sections 3 and 4; reference R4 (what the site's clothes look like).

**Steps.**
1. **Draped cloth.** For each shirt, sweater and pair of trousers: a subdivided copy, a cloth simulation over a collision shell made from the garment's own rest shape pulled in a few millimetres, with the cloth a few percent oversize so it buckles into folds at the elbows, waist, knees and crotch; collar, shoulder seams, cuffs, waistband and hems pinned. Keep the low mesh's silhouette; bake the dense mesh's normals onto the sheet (selected to active), masked to the garment's own texels so skin and hard parts keep theirs. The vest takes the shirt's folds.
2. **Thickness.** A turned-in rim at every cuff, collar, hem and waistband, and at the vest's armholes.
3. **Fabric.** Weave and wear from CC0 fabric sets (Poly Haven, ambientCG: cotton drill for shirts and trousers, denim, knit, rubber) in place of noise; seams and stitching lines in the normal map along the garments' UV borders; sweat and dust where they would be (collar, armpits, knees, cuffs).
4. **Faces and hands.** Eyelids that shade the eye, a wet line on the lower lid, lips with their own roughness, stubble and brow density from the skin sets, knuckle and nail detail; more of the head's share of the sheet if the budget allows. Hair with strands at the edge for the bare-headed case (the guard without his cap is P08e's, but the mesh should exist).
5. **Fit of the hands to things.** The guard's hands on the barrier's counterweight (place the hold from the boom arm's real geometry); the baton hanging from its ring instead of standing stiff.
6. **Clips from the owner's Mixamo downloads** in `assets-src/mixamo/twin_*.fbx`, if they are there: stop, start, turns, sit, squat, pick up, reach. Add them to `MIXAMO` in `build_gate_people_clips.py`; use stop, start and the turns in the gate's loop in place of turning on the spot. If the files are not there, skip this step and say so.
7. Rebuild all three people, re-run the contact sheets (fit-test poses included), re-render the navigator comparison with the same camera, and capture the verge pair and the three faces again.
8. Keep each person inside the named-person budget (20,000 / 6,000 / 1,500 triangles, one 2K sheet, two materials). Do not add download: if a texture grows, another shrinks.

**Deliver.** The three people rebuilt; new contact sheets; the comparison before and after in `review/P02d/`; `review/P02d/REPORT.md` with the person and motion checklists filled in again.

**Pass when.**
- [ ] Side by side with the Atlas Navigator at equal framing, each of the three is at least as convincing, judged line by line against `QUALITY-BAR.md` section 3; or the report says plainly which lines still fail and why, for the owner to decide at the P02c gate.
- [ ] No poke-through in any clip or fit-test pose.
- [ ] Triangles, textures and download per person no higher than P02b's.

## The owner's gate answers (2026-10-15)

1. **Look:** approved, but the owner prefers it polished further, "more superbly realistic and well made", with extra small details. Full planning and implementation are left to the sessions. If it cannot be improved further, the current slice stands.
2. **People:** good enough to multiply. Their remaining polish goes to P07b (and P07c's faces).
3. **Screen-space occlusion on Medium:** the balance of quality and performance for the owner's laptop, **without making it uglier or using low-quality effects**. Decided: keep occlusion on Medium and pay for it (P02e).
4. **ETC1S textures and shared textures:** approved.
5. **Further changes:** left to the session (the ideas are in P02f).

So two follow-ups run before P03:
- **P02e** frees frame time and download.
- **P02f** spends it on detail.

After P02f the slice counts as approved and P03 starts. P02f's before-and-after goes to the owner as a report, not a new gate.

## P02e. Pay for the look: lamps, occlusion, textures, streaming (added 2026-10-15)

**Needs.** P02c (owner's answers above).

**Read first.**
- `review/P02c/REPORT.md`: the cost table and the lamp, occlusion and texture findings.
- `components/twin/world/lamps.ts`, `engine/post.ts`, `engine/tiers.ts`, `engine/streaming.ts`, `engine/assets.ts`.
- `scripts/twin/build-assets.mjs`, `scripts/twin/cost.mjs`.
- The RISKS rows on lamps, `compileAsync`, shader-build steps and shared textures.

**Steps.**
1. **Lamps are lights only while lit.**
   - A lamp's light is in the scene only between its fade-in and fade-out. By day it is a glowing surface at most.
   - Hide the shader rebuild the light-set change causes. Compile both light sets ahead (`compileAsync` on the zone's materials with the lamps in and out, behind the loading screen), so the switch at dusk has no stall.
   - The pickup's headlamp spot follows the same rule.
   - Check: the longest frame across 17:30 to 18:30, played at speed, stays under 50 ms; noon costs 9.5 ms less at full HD (`cost.mjs --only=lamps`).
2. **Occlusion back on Medium, at the cheapest setting that looks the same.**
   - Try, at full HD on the gate:
     - half resolution with fewer samples (4, 6, 8);
     - quarter resolution with a depth-aware upscale;
     - occlusion recomputed every other frame with reprojection, if three's GTAO allows.
   - For each: the frame cost from `cost.mjs`, and a still at noon, golden hour and night beside today's half-resolution 8-sample picture. Compare the canopy, the booth base, the pickup's underside and the shirt folds.
   - Keep the cheapest setting the owner could not tell apart, and set it in `tiers.ts` for Medium. High keeps half resolution at full quality; Ultra keeps full.
   - Never ship a setting that shows banding, halos around people, or flicker when the camera moves.
3. **ETC1S sheets.**
   - In `build-assets.mjs`: ETC1S (normal mode for normal maps) for people, animals, trees and props.
   - UASTC is kept only for hero structures' trim sheets, and for the ground layers if the trial says so.
   - Rebuild Z of two-channel normal maps in the material (TSL, both renderer paths).
   - Check by eye at the closest gate cameras and in the face captures, against the current build; numbers as in the texture trial.
   - Target: people at about 3.5 MB each.
4. **Shared textures.**
   - Textures used by more than one asset (the acacias' bark and leaves; future trim sheets) are written once beside the files and loaded by address, as the ground's layers already are (`assets.texture`).
   - The build detects identical images across assets and shares them.
5. **Streaming.**
   - Actors load after the zone, nearest first.
   - The 27 ms instances step and the 19 ms shader-build step are split, or moved behind the loading screen.
   - Everything in view arrives within 20 s on a warm cache.
   - Check with `check-pipeline.mjs` and `bench.mjs`.
6. **Bench and report.** Run `bench.mjs` (all three profiles) and `cost.mjs`; capture the slice's seven moments again beside P02c's.

**Deliver.** The changes above, and `review/P02e/REPORT.md` with before and after numbers and the occlusion comparison stills.

**Pass when.**
- [ ] The gate holds 45 fps at full HD on Medium **with occlusion on**, or the report shows the closest setting and what it would cost to reach 45.
- [ ] No frame over 50 ms at the dusk switch; lamps still come on in sequence.
- [ ] Download to the first view 15 MB or less, or the report says what is left and why.
- [ ] Occlusion and texture changes judged side by side: no visible loss of quality at the gate cameras.

## P02f. Detail and realism pass (added 2026-10-15)

**Needs.** P02e. Blender open on the master scene with the MCP add-on running.

**Why.**
- The owner wants the gate "more superbly realistic and well made", with extra small details, before it is multiplied.
- Everything made here is built as a **kit the whole site reuses** (P05, P06), so the effort pays across the project, not only at the gate.
- Spend the frame time P02e freed, and stay inside MASTER-BRIEF section 5 at full HD.

**Read first.**
- `review/P02c/REPORT.md` and its captures.
- Reference R4 (site photographs) and `reference/gate/`.
- `QUALITY-BAR.md` sections 1, 2, 6 and 7; `TOOLBOX.md`.
- The cost table: a small prop costs about 0.03 ms a copy once its material is loaded, but each new material adds a fixed cost and pipelines, so props share atlases.

**Steps** (in order of effect on realism; do as many as quality allows, and say which were cut):
1. **Ground storytelling** (decals on the ground material, one atlas):
   - tyre ruts with standing water in them after rain;
   - an oil stain and tyre scrub at the stop line;
   - footprints and a worn path between the booth and the barrier;
   - gravel spill at the road edge;
   - leaf litter under each acacia;
   - mud tracked onto the speed hump;
   - a drainage ditch along the road, with a concrete culvert pipe end.
2. **Grounding everything** (QUALITY-BAR section 6):
   - splash dirt and grass tufts at the booth's plinth and every post;
   - rust streaks under fixings;
   - moss on the shaded side of concrete;
   - dust on horizontal surfaces;
   - water stains under the roof's drip line.
3. **A site dressing kit** (one shared 2K atlas, small-prop class):
   - outside: sandbags and rice-sack bags, a monobloc plastic chair, a GI pipe offcut, a wooden pallet, an extension cord run, a rubber hose, a jerrycan by the booth, slippers by the door, an umbrella, a trash drum;
   - on the booth: a hard hat hung on a nail, a CCTV camera;
   - inside: a water tumbler and thermos, a logbook with a pen on a string, a wall clock and calendar, an electric fan, a radio on its charger.
4. **Perimeter and services.**
   - A short run of the camp fence either side of the gate: GI posts with chain-link or barbed wire, built as one fence kit for P06.
   - A power pole with a drop wire to the booth, and conduit down the booth wall.
5. **Signage set to Philippine site conventions**, all with the official wordmark:
   - a PPE-required pictogram board ("No hard hat, no entry");
   - visitor rules;
   - the speed limit (already there);
   - a "Visitors report here" sign.
   - **No safety-statistic boards with numbers**: incident counts are internal (MASTER-BRIEF rule 5).
6. **Plants a Filipino camp actually has** (additions to the shared atlas; P04 builds the full library):
   - santan (ixora) or San Francisco (croton) by the booth, in painted tyre or drum planters;
   - cogon grass in the verge;
   - a vine on the fence;
   - leaf litter and fallen pods under the acacias.
7. **A driver in the pickup.** A seated man from the P02 bodies with the sit clip, hands on the wheel, who turns his head to the guard. This also retires the RISKS row about the empty cab.
8. **Small life** (cheap, and carries to P12). Each is added only if it costs under 0.5 ms:
   - dust kicked up behind the pickup on a dry day;
   - drips from the roof edge after rain;
   - moths at the flood lamp at night;
   - a few birds in the acacias (sprites or simple meshes).
9. **Re-review.**
   - The seven moments and the six gate cameras.
   - Three close-ups: the booth window, the barrier, the verge pair. The navigator comparison stays as P02d's.
   - `bench.mjs` at full HD.
   - A contact sheet of the new kit in Blender (front, side, three-quarter, close-up).

**Deliver.** The kit assets (with credits rows), the dressed gate, and `review/P02f/REPORT.md` with before and after stills at the same cameras and the numbers.

**Pass when.**
- [ ] Mesh and structure checklists pass for every new asset; credits written.
- [ ] The gate still holds 45 fps at full HD on Medium with occlusion on, and the download to the first view stays at 15 MB or less.
- [ ] Before and after stills at the same cameras are in the report; the report lists what was cut and why.
