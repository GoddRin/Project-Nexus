# Quality bar

Pass/fail standards. "Looks real" is never accepted as a check; use these.

## 1. Budgets per asset type

Recalibrated in P02c (2026-10-14). The triangle lines stand: on the office laptop the frame is limited by pixel shading, and these meshes are not what costs (`review/P02c/REPORT.md`). New are the download line (checked as a warning by `scripts/twin/build-assets.mjs`, from `scripts/twin/asset-budgets.json`) and the measured frame cost per copy at LOD0 / LOD1 / LOD2 on Medium at 1440 x 900, which is what limits how many can be in view (MASTER-BRIEF section 5).

Download rules from the P02c texture trial: a 2K normal map in the high-quality UASTC mode is 1.9 to 3.2 MB, the same map in ETC1S is 0.7 MB (mean error 1.7 degrees against 1.0); a 1K map in either mode loses the fine detail (3 degrees). Textures two assets share are written once and shared by address.

| Asset type | LOD0 triangles | LOD1 | LOD2 | Texture | Materials | LOD1 / LOD2 at | Download | Frame cost on Medium (P02c) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Named person (close-up capable) | 20k | 6k | 1.5k | 2K atlas | 1 body+outfit, 1 hair | 12 m / 40 m | 3.5 MB | 0.45 / 0.22 / 0.07 ms |
| Crew person | 12k | 4k | 1.2k | 1K atlas | 1 | 10 m / 35 m | 1.2 MB | as named, slightly less |
| Large animal | 10k | 3k | 800 | 1K | 1 | 15 m / 50 m | 1.5 MB | 0.13 ms at LOD0 |
| Small animal, bird | 3k | 800 | 200 | 512 | 1 | 8 m / 25 m | 0.4 MB | not measured |
| Hero tree | 25k | 6k | impostor | 2K bark, 2K leaf atlas shared by species set | 2 | 30 m / 90 m | 1.5 MB (shared sheets not counted) | about 2.5 ms a species in view, then 0.1 a copy (0.03 at LOD2) |
| Shrub, fern, grass clump | 1.5k | 300 | none (culled) | shared atlas | 1 | 15 m / 45 m (cull) | 0.2 MB | 0.03 ms a copy |
| Heavy equipment | 40k | 12k | 3k | 2K | 2 | 25 m / 80 m | 3 MB | not measured |
| Light vehicle | 25k | 8k | 2k | 2K | 2 | 20 m / 70 m | 2 MB | 0.55 / 0.28 ms |
| Hero structure (per building) | 120k | 35k | 8k | trim sheets + 2K uniques | 6 | 60 m / 180 m | 4 MB | not measured |
| Kit piece (wall, roof bay, column) | 2k | 500 | 100 | trim sheet | 1 | 30 m / 100 m | 0.3 MB | not measured |
| Small prop | 1.5k | 400 | none (culled) | 512 or atlas | 1 | 10 m / 30 m (cull) | 0.3 MB | not measured |
| Decal set (a zone's ground and wall marks, P02f) | 20k | 6k | none (culled at 110 m) | 1K decal sheet | 1 | 35 m / 110 m (cull) | 0.65 MB | measured with the kit in P02f |
| Interior room (all contents) | 150k | not loaded | not loaded | atlases | 8 | loads inside 30 m | 6 MB | not measured |

Animation: at most 4 bone influences per vertex; 65 bones or fewer for people (fingers on LOD0 only); clips baked at 30 fps and compressed.

## 2. Checklist: any mesh asset

- [ ] Real-world size checked against a known dimension (door 2.1 m, hard hat 0.28 m long, person 1.55 to 1.78 m).
- [ ] Origin at base centre; transforms applied; no negative scale.
- [ ] No n-gons on deforming meshes; no loose vertices; no inverted normals; no non-manifold edges on closed objects.
- [ ] UVs without visible stretching; texel density within 25% of the target for its class.
- [ ] Base colour has no baked lighting or shadows. Values stay between sRGB 30 and 240 for non-metals.
- [ ] Roughness varies across the surface (not one flat value). Metal is either 0 or 1 except at transitions.
- [ ] Edges that would catch light are bevelled or carried in the normal map.
- [ ] Wear is placed where it would happen: handles, edges, floors near doors, drip lines under openings.
- [ ] LODs keep the silhouette; no visible pop in the fly-through at its switch distance.
- [ ] Within the triangle, texture and material budget.
- [ ] Credits row written.

## 3. Checklist: a person

- [ ] Reads as a specific Filipino adult, not a mannequin: asymmetry in the face, skin with pores and tone variation, eyes with wetness and a shadowed upper lid, eyebrows and lashes present.
- [ ] Proportions inside human ranges (head height about 1/7.5 of stature; hands reach mid-thigh).
- [ ] Hair has shape and strands at the edge, not a cap.
- [ ] Clothing has thickness at cuffs, collar, hem and waistband; fabric shows folds at elbow, armpit, knee and crotch; seams and stitching in the normal map.
- [ ] **Sleeve to wrist, collar to neck, trouser to boot, shirt to waist:** no gap, no skin poking through, no garment passing through another, in the rest pose and in every clip of the test set (walk, squat, overhead reach, arm across chest, sit, bend to floor).
- [ ] Hidden body under clothing is removed.
- [ ] Shoulders, elbows, knees and hips keep volume when bent (no candy-wrapper twist, no collapse).
- [ ] Hard hat sits level, 2 fingers above the brow, strap or suspension visible; vest hangs with weight, reflective tape reads as tape.
- [ ] Boots contact the ground flat; no hovering, no sinking.
- [ ] Looks correct at dawn, noon, night under a lamp, and wet.
- [ ] Side by side with the Atlas Navigator at the same camera distance, it is at least as convincing.

## 4. Checklist: motion

- [ ] Feet do not slide: planted foot drifts less than 2 cm per step at eye level.
- [ ] Weight shift is visible before a step, a lift or a swing.
- [ ] Hands hold the tool: no gap, no fingers through the handle; the tool's working end meets the work.
- [ ] No snapping between clips; no frozen frames; loops have no visible seam.
- [ ] Two people nearby are never in step.
- [ ] Head and eyes look at what the hands are doing or at the person spoken to.
- [ ] An idle person breathes, shifts weight and looks around.

## 5. Checklist: an animal

- [ ] Correct species and local form (a Philippine carabao is a swamp buffalo with swept-back horns; an aspin is a lean short-coated dog).
- [ ] Fur or hide direction and wear read at 5 m.
- [ ] Gait matches speed (walk is 4-beat; trot is diagonal pairs); feet do not slide.
- [ ] Idle includes ear, tail, head and breathing motion.
- [ ] Reacts to people, vehicles, rain and time as its species record says.

## 6. Checklist: a structure

- [ ] Dimensions match the P00 inventory.
- [ ] Construction is believable: columns under beams, roof sheets overlap and are fixed to purlins, doors have frames, pipes have supports, cables have trays.
- [ ] Ground contact: plinth, splash dirt, weeds at the base, no razor-sharp line where wall meets ground.
- [ ] Weathering fits a tropical site: rain streaks, rust at fixings and cut edges, moss on shaded concrete, dust on horizontal surfaces.
- [ ] Glass reflects and shows a dim interior; windows are lit at night according to occupancy.
- [ ] Signage uses the official SCIC wordmark and real safety-sign conventions.

## 7. Lighting targets by time (17.06 N, 121.84 E)

Sun angles come from `suncalc` for the real date; these are look targets.

| Moment | Clock | Key light | Fill and sky | Look |
| --- | --- | --- | --- | --- |
| Dawn | 05:20 to 06:10 | Sun below 6 degrees, about 2,500 to 3,500 K, weak | Cool blue sky dominates | Valley mist, long soft shadows, lamps still on |
| Morning | 06:30 to 10:00 | 15 to 55 degrees, about 4,500 to 5,500 K | Clear blue | Crisp shadows, dew sheen early |
| Noon | 11:00 to 14:00 | 65 to 85 degrees, about 5,800 to 6,500 K, strong | Bright haze | Short hard shadows, heat shimmer, high contrast under roofs |
| Golden hour | 16:30 to 17:40 | Below 15 degrees, about 3,000 to 3,800 K | Warm sky opposite the sun | Long shadows, rim light on people |
| Dusk | 17:40 to 18:30 | Sun gone | Deep blue, 8,000 K and cooler | Lamps and windows come on in sequence |
| Night | 18:30 to 05:20 | Moon by real phase, about 4,100 K, dim | Stars; near-black sky | Pools of lamp light (warm sodium-type 2,200 K on poles, cool LED 5,000 K on floodlights), dark forest |
| Rain | any | Sun dimmed 60 to 90% | Flat grey | Wet dark surfaces, sharp reflections, low cloud on ridges |

Checks for any lit capture:

- [ ] Nothing pure white or pure black except lamps and deep night shadow.
- [ ] Shadows are present and anchored; objects do not float.
- [ ] Interiors are darker than exteriors by day and brighter by night.
- [ ] Exposure adapts when moving from outside into the tunnel or a room.
- [ ] Skin tones stay believable at every time.

## 8. Reference set

P00 creates `docs/twin-v2/reference/` with an index. Each sub-phase that builds a subject adds 3 or more reference photographs of the real thing (from the owner, from SCIC public material, or from the open web with the source URL noted; references are for comparison only and are never used as textures unless their licence allows). Review images are placed beside the references in the report.
