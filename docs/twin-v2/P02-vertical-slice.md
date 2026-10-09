# P02. Vertical slice: the gate

Three sessions. One small area is finished to final quality before anything is mass-produced, so the look, the pipeline and the real cost of each kind of asset are proven on a 40 m patch instead of discovered after ten phases.

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
