# Toolbox: free ways to make the models, motion and behaviour

Read by the sessions that build people (P07, P08), animals (P11), vehicles (P10) and props (P06d). The owner uses Blender, Mixamo and Mesh2Motion and asked (2026-10-10) what else is free and good. Budget is zero, so everything here is free to use; **licences and free-tier terms change, so check each tool's and each asset's current terms on the day it is used and record the result in `DECISIONS.md` and the credits file.** Where this file says "check", that is not optional.

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
