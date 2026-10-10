# P07. Characters

**Tools and sources:** read `TOOLBOX.md` first (free tools for models, motion capture from video, scans of real objects, and what the owner may have supplied).

Four sessions. A varied Filipino workforce built on the people proven in the P02 slice. The measure of success is `QUALITY-BAR.md` section 3 and the side-by-side with the Atlas Navigator.

Existing pipeline to reuse and extend, not replace: `scripts/blender/add_mixamo_clips.py`, `refine_arm_weights.py`, `masculinize_atlas_navigator.py`, `pose_render.py`, `render_clip_review.py`, and the working files in `scripts/blender/source/`.

## P07a. Body set and skeleton

**Needs.** P02c approved (and P06d for props, which can run in parallel).

**Read first.** P02b report and its `.blend`; `QUALITY-BAR.md` sections 1, 3; `CONTRACTS.md` 4.3 and 4.4.

**Steps.**
1. Define the master skeleton once (`assets-src/twin/characters/skeleton.blend`): Mixamo bone names, fingers, twist bones for upper arm, forearm and thigh, eye and jaw bones, plus socket bones `socket_handR`, `socket_handL`, `socket_back`, `socket_beltR`, `socket_beltL`, `socket_head`, `socket_chest`. Every body and every clip uses exactly this.
2. Build the body set with MPFB2 (or the fallback recorded in P02b). At least **8 male and 5 female** bodies spanning: height 1.52 to 1.78 m; builds from wiry to stocky to heavy; ages from early twenties to late fifties (skin, posture, hairline, grey hair); distinct faces.
3. Faces: sculpt away from the generator defaults; add asymmetry. Blendshapes on LOD0: blink L/R, look up/down/left/right corrective, jaw open, smile, frown, brow up, brow down, squint, cheek puff, a small viseme set (A, E, O, M).
4. Skin: one shared texture layout; a tone ramp covering light-olive to deep-brown typical of the Philippines, applied by a tint that preserves redness in ears, knuckles and cheeks; separate detail normal; tan lines at sleeve and collar as a mask; optional tattoos, scars and moles from a decal atlas.
5. Hair: card-based styles (short crop, side part, undercut, long fringe, balding, grey, tied back, ponytail, bob, bun) and facial hair (moustache, stubble, goatee, beard), with a colour tint.
6. Hands and feet: proper nails and knuckles on LOD0; bare feet and slippers supported for off-duty looks.
7. Weight painting by transfer from the best body, then corrected per body at shoulder, elbow, wrist, hip, knee. Verify with the bend test set (walk, squat, overhead reach, arm across chest, sit, bend to floor).
8. LODs per budget; fingers and face shapes dropped below LOD0.

**Deliver.** `assets-src/twin/characters/bodies.blend`, exported `char.body.*`, a line-up render of all 13 at noon and under a night lamp.

**Pass when.** Person checklist items for body and face pass on all 13; no two faces read as the same person in the line-up.

## P07b. Outfits, PPE and gear by role

**Read first.** `data/people.json` (roles), `INVENTORY.md` people table, and the worker photographs in `assets-src/twin/reference/photos/` (collect 20 or more close views of people at work into `reference/photos/people/` first). Create `data/ppe-colours.json` in this order of authority: the owner's SCIC standard if supplied; otherwise what the site photographs show (green hard hats most common and some red, navy or blue long sleeves with yellow reflective bands, yellow or orange vests, face cloths, rubber boots in wet areas, dark welding helmets with leather gauntlets); v1's per-person colours only where the photographs say nothing. Record which source each colour came from.

**Owner's PPE rule and photographs (2026-10-10; `reference/INDEX.md` R4, the first authority):** staff wear **white** hard hats, workers **green**; red and orange hats and the occasional full-brim hat appear on some workers as photographed (red is common on the tunnel and yard crews). Add to the garment library from the photographs: the grey and beige **reflectorized site jacket** (long-sleeve work jacket with silver tape across the back, chest and arms); the black department jacket lettered "SCIC" in green with the department beneath; long-sleeve work shirts in green, blue and navy with yellow reflective bands; printed motocross-style jerseys and printed arm sleeves; yellow mesh vests and orange vests with grey tape; the yellow reflective belt-and-braces harness; a belt pouch; a cap lamp clipped at the belt; grey-and-silver and black rubber boots (the default footwear on wet ground); face masks and cloths. Clothing never carries another company's name. Hard hats are separate attachable props (never merged into the head mesh) so they can be taken off, carried, hung and put down (P08e).

**Garment library** (each fitted to the male and female base, with size morphs that follow body build):

| Piece | Variants |
| --- | --- |
| Tops | SCIC polo, long-sleeve work shirt, T-shirt, sando, coverall top, uniform shirt (security), scrub top, barong-style office shirt, blouse, jacket, raincoat, apron |
| Bottoms | Work trousers, jeans, cargo, slacks, shorts, coverall bottom, scrub trousers, skirt |
| Footwear | Safety shoes, rubber boots, leather shoes, sneakers, slippers |
| Head | Hard hat (shell colours from `ppe-colours.json`, with and without chin strap, cap lamp, ear muffs, face cloth), cap, wide-brim hat, hairnet, welding helmet, bandana |
| PPE | Hi-vis vest (class 2, with ID pocket; mesh and solid types), full harness with lanyard, gloves (leather, cotton, rubber, insulated), safety glasses, goggles, respirator, dust mask, ear plugs on cord, knee pads, arm sleeves, welding leathers |
| Carried | Radio, phone, tablet, clipboard, drawing tube, tool belt with pouches, tape, ID lace, whistle, flashlight, baton, first-aid bag, backpack, water bottle |

**Role outfits** (`outfit.<roleGroup>.<a|b|c>`, at least two variants each so a gang is not uniform):

| Role group | Outfit |
| --- | --- |
| management | Polo or long sleeves, slacks or jeans, clean vest, white hard hat, safety shoes, radio, phone |
| engineer, qaqc | Long-sleeve work shirt, vest with ID, hard hat, safety glasses, tablet or clipboard, tape on belt |
| surveyor | Long sleeves, wide-brim hat or hard hat, vest, field book; instrument from props |
| geologist | Field shirt, vest, hard hat, hammer and compass on belt, sample bag |
| supervisor, foreman | Work shirt, vest, hard hat, radio, whistle, gloves tucked in belt |
| tunnel-crew | Coverall with reflective tape, rubber boots, hard hat with cap lamp and ear muffs, respirator at neck, self-rescuer on belt; mud and wet wear high |
| welder | Leathers, helmet (up or down), gauntlets |
| carpenter, mason, steelman, labourer | Mix of long sleeves and T-shirt with arm sleeves, face cloth under hard hat, gloves, boots or safety shoes, tool belt; harness when the station is at height |
| electrician | Long sleeves, insulated gloves, tool pouch, tester |
| rigger | Vest, gloves, whistle, hard hat with chin strap |
| operator, driver | Polo or T-shirt, cap or hard hat, vest |
| safety | Distinct vest colour, hard hat, gas monitor, clipboard, megaphone |
| nurse | Scrub suit, ID, first-aid bag |
| security | Uniform, cap, belt kit, flashlight, raincoat in rain |
| office | Office wear with ID lace; hard hat and vest added when leaving the office zone |
| kitchen | Apron, hairnet, clogs or slippers |
| warehouse | Polo, vest, back-support belt, gloves |
| any, off duty | Sando or T-shirt, shorts, slippers, towel |

**Fit and finish, per garment** (the owner asked for this by name):

1. Delete body faces hidden under the garment; keep a 1 cm overlap ring at openings.
2. Give cuffs, collars, hems, plackets and waistbands real thickness (solidify, then clean), with the inner face visible where one can look in.
3. Sleeve cuff sits over the wrist with a small natural gap; collar stands off the neck with shadow beneath; trouser hem breaks over the boot or tucks into it cleanly; shirt either tucks with a blouse over the belt or hangs with a hem that moves.
4. Transfer weights from the body, then smooth across shoulder, elbow, knee, hip and crotch; add corrective shapes for elbow and knee folds on LOD0.
5. Vest and harness ride on the torso, not the arms; hard hat is weighted to the head only; belt gear to the hips.
6. Cloth motion: loose hems, vest edges, lanyards, towels and chin straps get a light secondary motion (bone chains with a spring, evaluated only on LOD0).
7. Run the bend test set on every garment over every body build; render a contact sheet per outfit; fix every intersection and gap.

**Wear layers** (shader masks driven by `LookSpec.wear` and by the simulation later): dust, dried mud to the shin, wet mud, sweat patches at back and underarms, rain-soaked darkening, cement splatter, oil on hands, faded fabric.

**Pass when.** Every role outfit passes the person checklist items for clothing on at least three different bodies; contact sheets in the report; garments share atlases per the material budget.

## P07c. Variation system and the named staff

**Read first.** `CONTRACTS.md` 4.3 and 4.4; `data/people.json`, `crew.json`.

**Steps.**
1. `scripts/blender/twin/bake_person.py`: takes a `LookSpec`, assembles body, garments, hair and gear, removes hidden faces, merges to one skinned mesh plus hair, packs one atlas, generates LODs, exports `char.person.<id>.glb`. One draw call for the person (two with hair) at every LOD.
2. `scripts/twin/build-people.mjs`: for each entry in `people.json` and each generated crew member, write the `LookSpec`, run the bake headless, register in `assets.json`.
3. **Named staff:** each person gets their real face by the procedure in "Real faces for the named staff" below, where a photograph and consent exist; everyone else gets a fixed, distinct generated look. Roles and titles come from reference R5 where it names them.
4. **Crew generation:** seeded sampling over body, face shapes, skin, hair, height (within plus or minus 4%), outfit variant, colour choices, wear baselines and default props, with rules (no two adjacent crew ids share body and outfit variant; age distribution skews younger for labourers and older for foremen).
5. Shared-texture option for the far crowd: LOD2 and impostors use a palette-tinted shared atlas so 80 people do not mean 80 texture sets in memory. Measure memory and decide the cut-over distance.
6. Line-up scene: all named staff and a 40-person crew sample, rendered in Blender and captured in the browser.

**Pass when.** Line-up approved by the owner; texture memory for 80 people within the measured budget; any two people standing together are distinguishable at 10 m.

### Real faces for the named staff (owner's instruction, 2026-10-10; replaces the earlier "likeness reference only" rule)

The owner wants each staff member to have **their own face** on a body made to suit them, from the photographs in reference R5 (and more as they arrive). Build it as follows, with free tools only.

1. **Consent first.** `people.json` gains, per person: `likeness: { source: photo files, consent: boolean, allowHarm: boolean, allowStory: boolean }`. The owner confirms each flag after asking the person. No photograph-based face ships for a person whose `consent` is not true; that person gets a generated face instead. `allowHarm` and `allowDeath` (both default true: the owner has stated that staff and workers approved; set either false to opt a person out) govern whether injury and death are shown on them in free roam and story mode (P16 section 4); set false to opt a person out) governs whether injuries are drawn on them in free roam and story mode (P16 section 4); `allowStory` (default true once consent is given) whether they appear in story scenes.
2. **Shape (3D):** detect face landmarks on the front photo (MediaPipe Face Landmarker, free and open source: check licence), and use them to fit the MPFB head's face-shape controls: face width and length, jaw, chin, cheekbones, nose length and width, eye spacing and size, brow height, lip fullness, ear size. Refine by eye in Blender with the photo as a background image, front and (when supplied) side. Correct for phone-lens distortion before fitting (close selfies widen the nose and narrow the ears).
3. **Skin and features (texture):** project the photograph onto the fitted head in Blender, keep the projected detail for the central face (brows, eyes region, nose, mouth, moles, lines), and blend it into the body's own skin texture toward the ears, neck and scalp so tone and lighting match. Remove baked highlights and shadows from the photo first; even the tone. Paint out glasses and rebuild the skin beneath, then add **glasses as a separate 3D prop** where the person wears them.
4. **Hair, brows, facial hair:** matched from the photo with the hair-card library (style, hairline, greying).
5. **Body to suit:** height, build and age from the P07a body set, chosen with any full-length photo the owner supplies, otherwise a plausible default the owner can correct; their real role's outfit and hard-hat colour (staff: white).
6. **Expression:** photographs with a grin or a tilted head are neutralised during fitting; the person's characteristic smile can be kept as a blendshape.
7. **A 2D option** for anyone whose photo will not fit well, or at long distance: the photograph, cleaned and cropped, is used as the portrait on the inspector card and ID badge only, and the 3D head is a close generic match. Use this rather than ship a poor 3D likeness.
8. **Review:** a side-by-side sheet of photo and model for each person goes to the owner; nothing ships until the owner (and, ideally, the person) says it is them.
9. Photographs and likeness textures are personal data: sources stay in the git-ignored reference folder; the shipped textures are served only as part of the character model.

## P07d. Character runtime

**Read first.** `engine/lod.ts`, `engine/loop.ts`, the P02b slice runtime.

**Steps.**
1. `characters/Character.ts` (not a React component per person): holds the skinned meshes for each LOD, the skeleton, sockets, and the animation controller handle; pooled and reused.
2. `characters/crowd.ts`: owns all characters; per frame selects LOD by screen size, sets animation update rate (every frame near, every 2nd to 4th mid, frozen or vertex-animated far), culls off-screen skeleton updates, and submits draws.
3. Far crowd: bake a small set of clips to vertex-animation textures for LOD2 so distant people cost one instanced draw per look group.
4. Face life on LOD0: blinks at human intervals, eye saccades, look-at with head and eye limits, jaw motion when the activity is "talk".
5. Sockets: attach and detach props with grip frames; hard hat and vest can be removed and hung (used when office staff leave or return).
6. Wear and wetness parameters per character instance.
7. Picking: BVH on a capsule proxy per person; hover outline; selection ring.
8. Stress test page under `?debug=1`: spawn N people walking a circle; record frame time against N for each tier.

**Pass when.** The stress curve meets the P02c budget for the planned head-count; no React re-render per frame; pool reuse leaves no leaked geometries or textures after spawning and removing 200 people.
