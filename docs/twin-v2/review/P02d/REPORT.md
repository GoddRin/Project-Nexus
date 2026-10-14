# P02d report: the gate people polished, and the owner's four faults fixed

2026-10-14, branch `twin-v2`. One session (it hit the usage limit once and carried on in the same chat). Two kinds of work are in it: the P02d steps from `P02-vertical-slice.md`, and four faults the owner reported mid-session from the running twin.

**Status: done, with one pass check partly met.**
- The people are better than P02b on every line where they were behind: folds, cuff and hem thickness, fabric, faces and hands, the guard's hold on the barrier, and real start, stop and turn motion.
- They are still not as convincing as the Atlas Navigator on every line of the person checklist. The table below says plainly which lines still fail, for the owner to judge at P02c, as the pass check allows.
- Triangles and download per person are at or below P02b's for all three men.

## Pass when

| Pass when | Result |
| --- | --- |
| Beside the Atlas Navigator at equal framing, each of the three at least as convincing, or the report says which lines still fail | **Partly; the failing lines are below.** Same camera and light for "before" (P02b's exported files) and "after": `before/navigator-beside-*.jpg` and `navigator-beside-*.jpg` |
| No poke-through in any clip or fit-test pose | **None found.** Contact sheets `sheet-guard/engineer/labourer.jpg` cover 86 clips, the fit-test poses (squat, overhead, across, sit, bend) and the real Mixamo squat, sit and reach. The labourer's ears no longer come through his towel. Checked at sheet size (300 px a still); a centimetre would not show |
| Triangles, textures and download per person no higher than P02b's | **Met** (table below) |

| Asset | Download P02b → P02d | Triangles LOD0/1/2 P02b → P02d | Textures |
| --- | --- | --- | --- |
| `char.guard.a` | 6.82 → 6.63 MB | 19,499/5,899/1,446 → 19,441/5,898/1,438 | 2K colour and normal (as P02b); occlusion-roughness now 1K; 1K cut-out |
| `char.engineer.a` | 6.88 → 6.80 MB | 19,495/5,879/1,407 → 19,485/5,856/1,366 | same |
| `char.labourer.a` | 6.55 → 5.67 MB | 19,086/5,900/1,447 → 19,026/5,898/1,441 | same |

Two materials each (body and outfit, hair); 53 bones on the guard (the baton's bone is new), 52 on the others.

## What was done, by step

1. **Draped cloth.**
   - Every shirt, the sweater, every pair of trousers and the labourer's towel are hung in a cloth simulation. Each is a copy subdivided twice (about 7 mm between points), hung over a shell made from the garment pulled in 3 mm, with the openings and shoulder seams pinned.
   - The cloth is grown 2.5% everywhere and up to 20% at elbows, cuffs, armpits, waist, crotch, knees and ankles, so it buckles where real cloth does.
   - The folds and their shadow are baked into the sheet's normal map and occlusion, onto garment texels only. The shipped mesh keeps P02b's silhouette and triangle count.
   - The vest is stiff and is not draped: draped from its outside alone, it baked patchy normals.
2. **Thickness.** A turned-in rim and a 12 mm facing at every open edge of the garments (cuffs, collar, hems, waistband, pockets), skipped where another garment covers the edge. They cost 360 to 1,400 triangles a man, paid for by reducing the garments, never the head or hands.
3. **Fabric.**
   - Six CC0 sets from Poly Haven, downloaded with the owner's approval in this session: stretch poplin, rough linen, two denims, cotton jersey and bi-stretch. They are tiled at real size and baked under each garment's own colour. Credited in `public/models/twin/CREDITS.md`.
   - Seams and stitching are drawn into the normal map along every garment UV border.
   - Sweat and dust patches at the collar, armpits, back, cuffs and knees.
4. **Faces and hands.**
   - Lips with their own colour and roughness; a wet line on the lower lids; the upper lid shading the top of each eye.
   - Stubble (grey on the labourer), nails, and creases over the knuckles.
   - The scalp painted as a short crew cut under the hats.
   - The head's share of the sheet raised from 1.7 to 2.0.
   - Hair is rough like hair, with loose strands along the hairline. The whole hair before a hat cuts it is kept in the master scene as `<who>.hairBare` for P08e.
5. **Hands on things.**
   - The guard has `barrier` (raise) and `barrierDown` (lower) clips. His hands go onto the counterweight's top, placed from the zone's own geometry, and follow it as the arm swings until it leaves his reach (`barrier-hold-*.jpg`).
   - The baton hangs from its ring on a bone of its own, as a damped pendulum on every clip.
6. **The owner's Mixamo clips** (stop, start, turns, sit, squat, pick up, reach) are retargeted for all three men.
   - Start, stop and the turns have their travel and turn taken out of the hips and stored as curves.
   - The gate's loop now lays a walk out as: turn to the way, set off, walk, stop, turn to face. The man moves exactly as far as his feet go (`sim/walk-plan.ts`).
   - Each man ships only the clips his part in the loop plays (this keeps the download within P02b's). The rest are in the master scene and on the contact sheets; P08's shared clip files bring them back.
7. **Rebuilt and re-reviewed.** The three men, the contact sheets, the navigator comparisons, the faces, the gate at five moments (`gate-approach-*-g12.jpg`), and close views in the twin (`twin-*.jpg`).

## The owner's four faults (reported in this session)

| Fault | Cause found | Fix |
| --- | --- | --- |
| The labourer's ears and face came through his head cover | The towel was a fixed oval, narrower than his head at the ears | Shaped by rays from the head's axis out to the skin, ears, hair and collar; clear of all of them; open over the face from just in front of each ear; hung as cloth |
| Grey shadow-like patches on the guard's head, back and front | The leftover hair cap under his cap, a flat sheet at roughness 0.55, mirrored the sky. Confirmed in the page: at roughness 1 it went dark | Hair rough (0.85, lower specular), laid flat on the scalp under hats, a crew cut painted on the scalp, loose strands at the edge |
| The guard's feet sank into the guardhouse ground | He stands on the booth's apron, a 24 cm slab, and was placed at ground height | A **walk map** baked from the zone (`bake_walkmap.py`, 10 cm cells: the height to stand at, what is solid low and at body height, undergrowth). People stand on the highest walkable top under their feet |
| The dog ran through the guardhouse | Its runs were straight lines | Routes by A* on the walk map, with each body's clearance and step height, then straightened. The dog's body tilts between its front and hind paws when it steps up |

Found on the way: until the ground patch streams in (it arrives last), the location's ground is v1's terrain, up to a metre off at the gate. So people, the dog and the pickup stood wrong for the first moments. They now take their height from the walk map, which arrives first and stores absolute heights.

**Check:** `window.__TWIN__.gate.where()` over the whole 64-second loop, every half second: **nobody stands inside anything solid** (129 samples).

## Checklists again

**A person** (QUALITY-BAR section 3)

| Line | P02b | P02d |
| --- | --- | --- |
| Specific Filipino adult, not a mannequin | Partly | Partly: stubble, lids, lips and crew cut help; faces are still MakeHuman faces (photographs of staff are P07c's) |
| Proportions | Pass | Pass |
| Hair with shape and strands at the edge | Fail | **Partly:** strands at the hairline and a crew cut; the edge under the guard's cap is still sharper than real hair |
| Thickness at cuffs, collar, hem, waistband; folds; seams | Partly | **Pass:** rims and facings, simulated folds, stitched seams |
| No gap, no skin through, no garment through another | Pass at sheet size | Pass at sheet size; the towel fixed |
| Hidden body removed | Pass | Pass |
| Joints keep volume | Not checked | Looked at in the real squat, sit and reach clips: no collapse seen at sheet size |
| Hard hat; vest hangs; tape reads as tape | Hat pass; vest followed the shirt | Hat pass; the vest now has a real V-neck over the shoulders (P02b's left two straps); still not draped |
| Boots flat on the ground | Pass in stills | **Pass in the twin now:** on the apron, not in it |
| Correct at dawn, noon, night, wet | Pass by eye | Pass by eye (`gate-approach-*-g12.jpg`) |
| At least as convincing as the Atlas Navigator | Fail | **Not yet on every line.** The navigator's clothes are scanned; ours are simulated and baked. Still behind: the skin reads orange in Blender's studio light; glasses have no lenses and sit a little off the face; the towel spreads over the shoulders like a stiff collar; the vest's V has a ragged lower edge; the hair edge under a cap is hard |

**Motion** (section 4): weight shift, no snapping and idles as P02b.
- **Hands on the tool:** now met at the barrier as well (it was "hands on air").
- **Feet not sliding:** improved for walks. Start, stop and turns move the man by their own curves.
- **The guard's arrival:** his turn to face the barrier ends about a second into his barrier clip.

## Not done or not checked

- `bench.mjs` was not run; P02c measures the slice. The captures' frame readings were taken with Blender and other programs open and are not benchmarks.
- `check-shell.mjs` (dev server, Chrome): 22 of 23. The failure is the night-brightness line carried since P02a.
- `check-pipeline.mjs`, the WebGL2 fallback and other browsers were not re-run.
- Navigation is a grid for this zone only; P09a's navigation mesh replaces its routing.

## For the owner

1. **Look first** at:
   - `navigator-beside-guard-full.jpg` beside `before/navigator-beside-guard-full.jpg`
   - `navigator-beside-engineer-close.jpg` and `navigator-beside-labourer-close.jpg`
   - `twin-labourer-noon-g12.jpg` and `twin-back-guard-noon-g03.jpg`
2. In the twin: `?v=2&place=gate-approach`. The guard now walks, stops and turns, and steps up onto the apron; the dog goes round the booth.
3. P02c is next. Its question is whether this level is enough for site staff, and the "still behind" list above is what remains.
