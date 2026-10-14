# Toolbox: free ways to make the models, motion and behaviour

Read by the sessions that build people (P07, P08), animals (P11), vehicles (P10), props and interiors (P06), scenery (P03a) and story-mode beings and objects (P16). The owner uses Blender, Mixamo and Mesh2Motion and asked (2026-10-10) what else is free and good. Budget is zero, so everything here is free to use; **licences and free-tier terms change, so check each tool's and each asset's current terms on the day it is used and record the result in `DECISIONS.md` and the credits file.** Where this file says "check", that is not optional.

## How each thing gets made

| Thing | Shape (the model) | Movement (the clips) | Behaviour (what it does when) |
| --- | --- | --- | --- |
| People | A base human made in Blender with MPFB2, reshaped into the body set; clothes and PPE fitted in Blender; real items scanned where possible | Mixamo motion capture for common actions, Mesh2Motion clips, motion captured from video of the real task, and hand-keyed clips in Blender for trade-specific work | Not animation at all: data and code. Stations, activities, the daily programme, the calendar and the body model (P09, P12d) decide who does what, when; the animation runtime (P08c) plays the right clip |
| Animals | A rigged model from a free library where a good one exists, re-textured to the local form; otherwise sculpted and rigged in Blender | Clips that ship with the model, free animal motion-capture sets, and hand-keyed clips | Home ranges, circuits, needs and reactions as data and code (P11b, P11c) |
| Vehicles | Free library model cleaned up, or modelled in Blender from photographs | Rigged parts animated in Blender (booms, tippers) plus code-driven wheels and steering | Routes, timetables and traffic rules as data and code (P10b, P10c) |

## Models

- **MPFB2** (MakeHuman for Blender): free add-on that generates a full human with skin, eyes, teeth, hair and clothes, adjustable for age, build and ethnicity, with a rig. Output is CC0. The base for the body set.
- **Blender's own tools:** sculpting for faces and animals; Rigify for rigs (it ships with human and animal starter rigs such as horse, cat, wolf and bird); cloth simulation to drape garments and bake folds; hair curves for hair, fur and feathers; geometry nodes for scattering and trees.
- **Free asset libraries** (already reachable from the Blender MCP for the first two): Poly Haven (CC0 models, textures, HDRIs), Sketchfab (filter to CC0 and CC BY, downloadable), ambientCG (CC0 materials), Quaternius (CC0 low-poly sets, useful as rig and animation donors), Smithsonian 3D and other museum scans (many CC0, good for animal skulls, shells and natural objects: check each).
- **Photogrammetry: scan the real thing.** Photograph a real object from all sides with a phone and turn the photos into a textured model with Meshroom (free, open source) or RealityScan (free under a revenue limit: check). This is the best route to "it looks like ours": the actual hard hats, vests, boots, tools, a rock from the river, a cement bag, the K2500 truck, even a willing colleague's head for likeness reference. See the owner capture list below.
- **Trees:** Blender's Sapling add-on; Tree It (free Windows tool that exports models).
- **Textures and materials:** Material Maker (free, procedural), Quixel Mixer (free: check), Blender texture painting, photographs taken on site.

## Tripo AI (text or photo to 3D; added 2026-10-14)

The owner has a Tripo account (studio.tripo3d.ai, signed in in their Chrome) and asked for it to be used alongside Blender. Tripo makes **one object at a time** from a text description or photographs. It is a source like Sketchfab: every result goes through the Blender clean-up and the normal pipeline before it reaches the app.

**Terms read on the pricing page on 2026-10-14 (check again on the day of use):**

| Plan | Price | Credits a month | Rights | Exports |
| --- | --- | --- | --- | --- |
| Free (the owner's plan today) | ₱0 | 200 (about 3 best-quality models at 55 credits each) | **Public models, non-commercial use only** | 15 a month, older H2.5 model only |
| Pro | US$20 a month (US$13 a month billed yearly); a 50% first-month coupon was offered | 3,000 | Private models, commercial use | Unlimited; DCC Bridge to Blender |

Credit costs on that page: HD generate 15, Smart Mesh 35, retopology 5, texture generation 10, auto-rig 20; add-ons such as Ultra mesh +15 and HD texture +10. The studio's default best-quality text-to-model was 55.

**Rules.**
1. **Nothing made on the Free plan goes into `public/` or the app.** The twin is a public website run by a company, so it needs the commercial licence. Free-plan results are for judging quality only. If the owner later takes Pro, generate again on Pro; do not assume older results were re-licensed.
2. **Never upload photographs of people, or site photographs showing people or internal documents, while models are public.** On Pro, set privacy to Private before uploading.
3. The owner signs in and pays; a session never does. A session may drive the owner's signed-in Tripo tab in Chrome only when the owner says so in that chat.
4. Settings: AI model H3.1 (best quality), **Remove Lighting on** (no shadows painted into the colours), **PBR on**, 4K texture, triangle topology; the polycount does not matter because the clean-up rebuilds it.
5. Save each export to `assets-src/twin/tripo/<asset-id>/` (the model and image files there are git-ignored; the text notes are tracked) together with `prompt.txt` (the exact text or the photos used), the plan, the date and the licence. Record it in the credits file like any library asset.
6. **Clean-up in Blender, every time:** scale to the real dimensions (a Tripo model arrives at an arbitrary size); rebuild the mesh to the triangle budget of `QUALITY-BAR.md` (remesh or decimate, then bake the detail into a normal map); fix the materials to the shared trim sheets or atlas where the asset type calls for it; make the LODs and the collision shape; then run the normal checks. A result that still fails the quality bar after clean-up is dropped, not lowered into the scene.

**Where it helps (the session building each phase decides item by item):**

| Use | Phase | Why Tripo |
| --- | --- | --- |
| Site clutter with no good free model: sandbags, rebar bundles, formwork panels, oil drums, generator sets, water tanks, coiled hoses, cement bag stacks, bamboo scaffolds | P06d, P05f (construction stages) | Many varied, organic-looking objects that would take hours each to model |
| Philippine everyday objects: monobloc chairs, a sari-sari store's shelves and stock, kaldero and kawali pots, water jugs and dispensers, laundry lines, a videoke machine, a rice sack, a tabo and timba | P06b, P06d, P12e (night life) | Local items are rare in free libraries |
| Real objects from the owner's phone photos: a site sign, a specific tool, a machine part, a rock from the river (photo or multi-view to 3D, on Pro, private) | any | The quickest route to "it looks like ours" short of full photogrammetry |
| Local transport: the carabao sled (paragos), the tricycle's sidecar, the hired motorcycle's load racks | P10a | Not in free libraries; the bought-model route stays first for the main fleet |
| Office interior details matched to the R5 photographs: cabinets, plotter, water dispenser, wall clock, document boxes | P06a | Many small items that must match photographs |
| Rare Sierra Madre wildlife where no rigged model exists (Philippine eagle, cloud rat, Luzon bleeding-heart), as a sculpt base that is then rigged in Blender | P11a, P11c | Removes the sculpting step; the motion work stays in the plan |
| Story-mode folklore beings and objects: kapre, tikbalang, aswang, duwende, santelmo's lantern, anting-anting amulets, the haunted tunnel's relics | P16 and its packs | Almost nothing usable exists for free, and stylised horror forgives AI quirks |
| Distant buildings and scenery beyond the patch: barangay houses, a chapel, a school, nipa huts | P03a, P06e | Seen from far away, where clean-up can be light |

**Trial, 2026-10-14 (Free plan, H3.1 best quality, text only, 55 credits each; screenshots in `review/tripo-trial/`; nothing exported):**

| Test | Result | Lesson |
| --- | --- | --- |
| Stack of ten muddy sandbags | Good: believable woven cloth, seams, tied ends and sag; the "mud" came out as orange blobs. About 1.9 million triangles | Shapes are strong; repaint dirt and wear in Blender with the project's own grime layers, and rebuild to budget |
| Carabao sled (paragos) | **Failed:** it made a table on legs with two sacks on top | Unfamiliar local objects need a reference photo (image or multi-view to 3D), not words |
| Kapre (folklore giant) | Very good: strong silhouette, hair, loincloth, glowing eyes, eerie; the cigar came out club-sized | Creatures are its strength; expect to fix proportions of held items |

**Which plan (decided 2026-10-14): Pro 3k (3,000 credits; ₱615 the first month, then ₱1,230 a month, as the owner saw on 2026-10-14), paid monthly, only in the months that build assets**, then cancelled. Those windows are listed in the budget below (camp, people and motion, calendar to weather, story mode), each reminded in its phase file. At 55 credits a model, 3,000 credits is about 54 best-quality models a month; batch the work so a month's credits are used up. Not yearly (the asset months are spread out), not Max (US$90, far more than needed), and not credit packs on the Free plan (no commercial licence). Take the 50% first-month coupon if it is still offered.

**The kapre:** the owner liked the trial kapre and wants it in story mode. Its prompt and notes are in `assets-src/twin/tripo/kapre/prompt.txt`; rebuild it on Pro at P16e.

**More uses to try once on Pro:** auto-rig (20 credits) as a quick first rig for creatures before the proper Blender rig; Smart Segmentation to split a model into parts (a truck's doors, a machine's arm) so they can move; image-to-3D from the R4 and R5 photographs for signs, the office water dispenser and the guard booth fittings; variations of one prop (five different oil drums) so repeats do not look copied; night-case relics and offerings for story mode (a bottle of lambanog, candles, an old lantern); a carved bulul as a mystery item; the santelmo as a glowing orb with a model inside.

Conclusion: worth taking Pro when P06a starts, used mainly with photos for local objects and with text for creatures and generic clutter.

**Do not use Tripo for:** anything built from drawings (powerhouse, tunnels, waterways, weir, camp buildings) because sizes must be exact; the named staff's faces (the P07c route is better); main characters' bodies, which need the shared rig and outfits of P07; the main vehicles when a bought or library model of the exact type exists.

## Tripo idea list and credit budget (2026-10-14)

Every idea below passes the same rules and clean-up as any Tripo model, and each one is dropped if it fails `QUALITY-BAR.md` after clean-up. The session building each phase picks the final items; the counts are a budget, not a quota.

**Credit tiers** (prices from the 2026-10-14 pricing page): **Hero** 55 credits (best quality: H3.1, Ultra mesh, HD texture) for anything seen close or held in the hand; **Standard** 25 credits (HD generate plus texture) for things seen at a few metres; **Rigged** Hero plus auto-rig, 75 credits, for creatures. Add 30% for retries. Photo-based (image or multi-view to 3D) costs the same and is preferred for anything local.

| # | Idea | Phase | Count and tier | Credits with retries |
| --- | --- | --- | --- | --- |
| 1 | **Sari-sari store** in camp: shelves of sachets, softdrink crates, candy jars, the barred window, the hand-painted store sign, the ice cooler | P06d | 20 Standard | 650 |
| 2 | **Canteen and kitchen:** kaldero, kawali, big rice cooker, LPG tank and burner, water jugs and dispenser, plastic basins, the steel serving trays | P06b, P06d | 15 Standard | 490 |
| 3 | **Barracks life:** duffel bags, electric fans, mosquito nets, a guitar, rosary and family photos on a nail, balikbayan boxes, slippers by the door, a hanging towel | P06b | 20 Standard | 650 |
| 4 | **Laundry corner:** palanggana, washboard, bar soap, clothesline with pegs, a rain-soaked shirt | P06d, P12e | 6 Standard | 200 |
| 5 | **Night drinking circle:** plastic tables and monobloc chairs, beer crates, gin and lambanog bottles, a shared shot glass, pulutan plates, a videoke machine | P06d, P12e | 10 Standard | 330 |
| 6 | **Court and leisure:** basketball ring with a worn backboard, ball, benches, a chess set and a sungka board | P06d, P13j | 8 Standard | 260 |
| 7 | **Chapel corner:** a small altar with a Santo Niño, candles, flowers in a bottle | P06d | 3 Hero | 215 |
| 8 | **Office from the R5 photographs:** cabinets, plotter, water dispenser, wall clock, document boxes, desk fan, printer, whiteboard stand | P06a | 25 Standard | 810 |
| 9 | **Site clutter with variations** (no two the same): sandbags, rebar bundles, formwork panels, oil drums, generator sets, water tanks, hoses, cement bag stacks, bamboo scaffolds, broken pallets | P05f, P06d | 40 Standard | 1,300 |
| 10 | **Signs from photographs:** gate signs, safety boards, the project billboard | P02 rework, P06a | 10 Standard | 330 |
| 11 | **Hand tools and handheld items** for walk mode and the real-time actions: hammers, shovels, grinders, chainsaw, rebar cutter, radios, thermos, tablet case, clipboard | P08e, P13 | 30 Hero | 2,150 |
| 12 | **Food and drink** for the needs system: pandesal bag, 3-in-1 coffee, instant noodles, rice meals in styro, softdrinks, a lechon at fiestas | P13i, P09e | 15 Standard | 490 |
| 13 | **Animal homes:** chicken coop, dog house, a fighting-cock tether, a carabao's water trough | P11b | 6 Standard | 200 |
| 14 | **Distant barangay:** houses, chapel, school, nipa huts, waiting shed, a basketball court by the road | P03a, P06e | 15 Standard | 490 |
| 15 | **Site calendar events:** Christmas parols and lights, bandiritas, a fiesta stage, Undas candles, a safety-week tarpaulin, the topping-off flag | P09e | 20 Standard | 650 |
| 16 | **Vehicle dressing:** roof racks, mud flaps, cargo tarps, loads of cement and rebar, a spare tyre, a jerrycan | P10a | 15 Standard | 490 |
| 17 | **Typhoon aftermath:** fallen branches, torn roof sheets, landslide debris, flood litter, a toppled sign | P12c | 12 Standard | 390 |
| 18 | **Wildlife sculpt bases:** Philippine eagle, cloud rat, Luzon bleeding-heart, monitor lizard, civet, hornbill, and others with no rigged model | P11a, P11c | 12 Rigged | 1,170 |
| 19 | **Play objects:** kite, sipa, tumbang preso can, a fishing rod and catch, a karaoke microphone, cards | P13j | 12 Standard | 390 |
| 20 | **Folklore beings:** the kapre (the owner's favourite; see below), tikbalang, aswang, manananggal, duwende, white lady, sigbin, tiyanak, the nuno's mound | P16e and packs | 10 Rigged | 975 |
| 21 | **Night-case objects:** relics and offerings, old lanterns, candles, an anting-anting, a carved bulul, the santelmo's glowing core, a tunnel shrine | P16e and packs | 20 Standard | 650 |
| 22 | **Story collectibles:** one set per pack (old photographs, letters, a survey peg from 2019, a worker's lost ID) | each P16 pack | 10 Standard per pack | 330 per pack |
| 23 | **Milestone keepsakes:** a commemorative plaque, a ribbon-cutting set, the first-power trophy | P14b | 3 Hero | 215 |

**Budget against the owner's plan (Pro 3k: 3,000 credits a month, ₱615 the first month then ₱1,230 a month, seen 2026-10-14).**

| Window | Ideas | Credits | Pro 3k months |
| --- | --- | --- | --- |
| Camp and office (P05f, P06) | 1 to 10, 14 | about 5,700 | 2 |
| People and motion (P08e, P13) | 11, 12, 19 | about 3,000 | 1 |
| Calendar, vehicles, animals, weather (P09e to P12) | 13, 15 to 18 | about 2,900 | 1 |
| Story mode start (P16e) and P14b | 20, 21, 23 | about 1,840 | 1 |
| Each later story pack | 22 plus new beings | about 330 to 1,000 | share one month across 3 to 9 packs |

**Total for the core plan: about 13,500 credits, five Pro 3k months, roughly ₱5,500** (one month at ₱615 and four at ₱1,230), spread over the build. The camp window is the only one larger than one month: run it as two consecutive months, or take the 6k tier for that single month if its price is lower than two 3k months (check on the day). Cut Standard items to the 15-credit untextured generate only if a texture is going to be painted in Blender anyway.

**Tripo features beyond plain generation to try on Pro:** auto-rig for a creature's first rig; Smart Segmentation to split models into moving parts (doors, a machine's arm, a creature's jaw); texture editing with the Magic Brush to add the site's mud, rust and sun-fade; Smart Low Poly to get a lighter starting mesh; Text2Motion for a creature's first rough animation, replaced later by proper clips if it does not meet the motion bar.

## Motion

- **Mixamo:** free with an Adobe account; large human motion-capture library and an auto-rigger. The owner signs in; raw files stay out of git.
- **Mesh2Motion:** free, CC0 clips, human and some animals.
- **Motion capture from ordinary video.** The best source for trade-specific work that no library has (rebar tying, shotcrete spraying, scaling, trowelling):
  - **FreeMoCap** (free, open source): two or three webcams or phones record a person; it outputs a skeleton animation for Blender.
  - **Rokoko Video** and **DeepMotion** have had free tiers that turn one phone video into motion: check current limits.
  - Result is cleaned in Blender and retargeted to the master skeleton.
- **Retargeting:** the Rokoko Studio Live add-on for Blender retargets any skeleton to ours for free: check. The repo's own `scripts/blender/add_mixamo_clips.py` already does this for Mixamo.
- **Free motion-capture libraries:** the CMU Motion Capture Database (free for any use: check wording), and the Bandai Namco research set (check licence) for walking and gesture variety.
- **Animal motion:** clips bundled with Sketchfab animals; the Truebones "Zoo" pack (a free set of many animals with motion capture: check licence); Quaternius animated animals as donors; hand-keying from slow-motion video reference for the rest.
- **Hand-keyed animation with physics help:** Cascadeur has a free tier that makes keyframed motion obey balance and momentum: check current terms and export limits. Blender alone is enough if not.
- **Auto-rigging:** Mixamo for humans; AccuRig (free from Reallusion: check) for humans with better hands; Rigify for animals.

## What makes them look and move well (regardless of tool)

- Start from the best base available and spend the time on the face, hands, clothing fit and textures: that is where "well made" shows.
- Real reference for everything: the site photographs in `assets-src/twin/reference/`, plus slow-motion video for motion.
- Every model and clip is reviewed in Blender before it ships, against `QUALITY-BAR.md`. A species, vehicle or clip that cannot reach the bar is redone or left out, not shipped rough.

## Optional captures the owner (or anyone on site) can provide

None of these is required; each one raises realism a lot for little effort. A phone is enough.

| Capture | How | Used by |
| --- | --- | --- |
| Photogrammetry sets of real PPE and tools (hard hat, vest, boots, gloves, shovel, radio) | 40 to 80 photos each, walking round the object on a plain background in even light | P06d, P07b |
| The K2500, an L300 and a 4x4 pickup | 100 or more photos each from all round, plus close-ups of wheels, bed, badges and mud | P10a |
| Short videos of real tasks (rebar tying, shotcreting, trowelling, scaling, signalling a truck) | 20 to 30 seconds each, whole body in frame, steady phone; two angles if possible | P08a, P08d |
| Ground and wall close-ups (the road dry and muddy, concrete, shotcrete, rock face, GI roofing) | Straight-on photos in shade | P03a, P05, P12g |
| Sound recordings (river, forest at dawn, the generator, the tunnel) | Phone voice recorder, 60 seconds each | P12b |
| People, only with their consent | Front and side face photos and one full-length photo | P07c, as likeness reference only |

## Getting the tools ready (for the owner)

The owner approved using these free tools (2026-10-10). Nothing needs installing until the sub-phase that uses it. When a session reaches one, it stops and gives the exact steps for that day's version; this is the outline so there are no surprises. Each install is a download and a few clicks, and Claude can do the Blender-side set-up through the Blender connection once the add-on file is on the computer.

| Tool | First needed | What the owner does | Then Claude does |
| --- | --- | --- | --- |
| **MPFB2** (human generator for Blender) | P02b | Download the add-on zip from the MPFB website (free). In Blender: Edit, Preferences, Add-ons, Install from Disk, pick the zip, tick it. Download the free asset packs it offers (skins, hair, clothes) the same way. About 10 minutes | Builds the people |
| **KTX-Software** (texture compression) | P01c | Run the free Windows installer from the Khronos KTX-Software GitHub releases page | Uses it in the asset build |
| **Mixamo** | P08a | Sign in at mixamo.com with a free Adobe account; download the clips on the list the session gives, into `assets-src/mixamo/`. The browser will ask to allow multiple downloads: allow it | Retargets and cleans the clips |
| **Mesh2Motion** | P08a | Nothing: no account needed | Downloads clips |
| **FreeMoCap** (motion capture from video) | P08d, P08e | Install from freemocap.org (free; it installs through Python, the site has a one-line command). Needs two or three phones or webcams on stands seeing the whole body, good light, plain clothes that contrast with the background. Record each action for 10 to 30 seconds after a short calibration with a printed board. One afternoon covers dozens of actions | Imports the result into Blender, cleans it, retargets it |
| **Phone video only** (simplest alternative) | P08d, P08e | Film a person doing the action, whole body in frame, phone steady on a stand, two angles if possible | Uses the video as reference for hand-keying, or runs a free video-to-motion service if one is available that day |
| **Meshroom** (3D scans from photos) | P06d, P07b, P10a | Download and unzip from alicevision.org (free; needs a reasonably strong graphics card; if this laptop is too slow it will say so, and the photos can be processed on another machine). Take the photos: 40 to 80 for a small object, 100 or more for a vehicle, overlapping, all round, in even shade, object not moved | Runs the reconstruction, cleans the mesh, rebuilds clean geometry over it, bakes textures |
| **Blender Rigify, cloth, hair** | P07, P11 | Nothing: built into Blender. Rigify is switched on in Add-ons | Uses them |
| **Free libraries** (Poly Haven, Sketchfab, ambientCG) | from P01c | Nothing: Poly Haven and Sketchfab are already connected in the Blender add-on | Searches, checks licences, imports |

Practical notes:
- Keep Blender open with the MCP add-on running during any model or animation sub-phase.
- Scans and captures are raw material: Claude always cleans and rebuilds them, so imperfect ones are still useful.
- People appear in videos and photos only with their consent; captures stay in the git-ignored reference folder.
- If any install fails or a tool no longer offers a free version, say so in the chat: each has a fallback (hand-keyed animation instead of capture, modelling from photos instead of scanning).
