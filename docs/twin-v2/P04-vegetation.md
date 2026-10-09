# P04. Vegetation

Two sessions. A believable lowland Luzon rainforest around a construction clearing.

## P04a. Plant library

**Needs.** P03d.

**Read first.** v1 `ForestVegetation.tsx` (species list, counts and exclusion zones); `QUALITY-BAR.md` sections 1 and 2; the P02a plants.

**Species to deliver** (each with 2 to 3 variants so repeats are not obvious):

| Layer | Species |
| --- | --- |
| Emergent and canopy | White lauan or similar dipterocarp (tall straight bole, buttress roots), narra, molave, balete (strangler fig with aerial roots), dao |
| Mid-storey | Banana, coconut, anahaw fan palm, kawayan bamboo clumps, tree fern, ipil-ipil and other regrowth at the clearing edge, papaya near the camp |
| Understorey | Gabi (taro), ferns, wild ginger, rattan, shrubs, seedlings |
| Ground | Cogon and talahib grass, carabao grass turf near the camp, leaf litter, moss on rocks and logs |
| Riverside | Reeds, tiger grass, overhanging shrubs |
| On structures | Vines on fences and cut slopes, weeds at wall bases |
| Dead wood | Fallen logs, stumps from clearing, cut brush piles |

**Steps.**
1. For each species gather 3 reference photos (`reference/flora/<species>/`).
2. Source in this order: Poly Haven CC0 plant; Sketchfab CC0/CC BY scan of adequate quality; otherwise build in Blender (Sapling or geometry nodes for the branch structure, leaf cards from photographed or CC0 leaf textures, Poly Haven bark).
3. One shared leaf atlas per layer and one bark atlas, so the whole library uses a handful of materials.
4. LODs per `QUALITY-BAR.md`; trees get an 8-direction impostor atlas (base colour, normal, depth) rendered in Blender by `scripts/blender/twin/bake_impostor.py`.
5. Vertex colours or a second UV carry wind weights: trunk sway, branch bend, leaf flutter.
6. Leaf shading: two-sided with light passing through thin leaves when backlit.
7. Run `check_asset.py`; export; build.

**Deliver.** `public/models/twin/flora/*.glb`, impostor atlases, credits, a library contact sheet rendered at noon and golden hour.

**Pass when.**
- [ ] Every species passes the mesh checklist and is recognisable against its references.
- [ ] Whole library uses 8 materials or fewer.

## P04b. Scatter, wind, seasons of the day

**Needs.** P04a.

**Read first.** `data/exclusions.json`, `site-layout.json`, `routes.json`; `engine/instances.ts`, `engine/lod.ts`; `world/weather.ts` wind.

**Steps.**
1. `scripts/twin/scatter-flora.mjs`: deterministic (seeded) placement written to `data/flora/<tile>.bin`. Inputs: slope, height above river, distance to river, distance to cleared areas, the ground mask, exclusions for every structure, road and pad with a regrowth band at clearing edges. Poisson-disc spacing per layer; canopy first, then mid-storey in gaps, then understorey.
2. Density targets per tier, taken from the P02c budget.
3. Runtime: per-tile instanced draws per species LOD; impostors beyond the LOD2 distance; cross-fade (dithered) between LODs; grass and ground cover only within a radius of the camera, generated on the GPU or from tile data.
4. Wind from the shared vector: gentle by default, strong and directional in typhoon; a gust front visibly travels across the canopy.
5. Daily detail: dew sheen on grass at dawn; occasional falling leaves; birds flush from a tree when a truck passes (hook for P11).
6. Interaction on High and above: grass and ferns bend away from people and vehicles within 1.5 m.
7. Forest edge treatment: a ragged regrowth band, stumps and brush piles, not a clean line.
8. Canopy shadows fall on the forest floor and the road.

**Pass when.**
- [ ] Overview, tree-top and eye-level captures at four moments show no repeated-pattern look and no LOD popping in the fly-through.
- [ ] Nothing grows through a structure, road, pad or water surface.
- [ ] Vegetation stays inside its share of the measured budget on every tier.
