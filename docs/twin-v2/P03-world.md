# P03. World: terrain, light, water, weather

Four sessions. The land and the light are finished for the whole site before structures go on it.

## P03a. Terrain and ground

**Needs.** P02c approved.

**Read first.** `lib/twin/terrain.ts`; `public/data/gis-terrain-mesh.json`, `terrain-heightmap.json`, `terrain-contours.json`; v1 `terrainData.ts` (the flattened pads and blends it applies); `scripts/fetch-real-copernicus-dem.mjs`, `generate-terrain-mesh.mjs`; `data/site-layout.json`, `routes.json`, `exclusions.json`; the P02a ground material.

**Locations.** There are three surface locations (`weir`, `midway`, `powerhouse`; the two tunnels are underground and need no terrain). Build the terrain system once, driven by `data/locations.json`, and produce the `powerhouse` terrain in this sub-phase. The `weir` and `midway` terrains are produced with the same tools at the start of P05g and P05h, using `scripts/fetch-real-copernicus-dem.mjs` for their coordinates. If a location's coordinates are still null, stop and ask the owner; do not guess where it is.

**Steps.**
1. Check the DEM resolution available from the fetch scripts. If a finer grid than v1's 65x65 can be generated for the 360 m square, regenerate it; keep v1's civil pads (powerhouse pad, camp pad, tailrace channel cut) as explicit edits listed in `data/terrain-edits.json`, not hidden in code.
2. Build the terrain as chunked tiles with 3 LODs and skirts (no cracks). Beyond the square, a low-detail ring of surrounding ridges from the wider DEM so the horizon is real landform, not a flat plane.
3. Extend the P02a ground material site-wide: layers for forest floor, grass, laterite soil, wet mud, gravel, river cobbles, bedrock, shotcrete. Blend by slope, height, distance to river, and a painted mask stored as a texture (`public/textures/twin/ground-mask.ktx2`). Add macro colour variation and distance detail fade to hide tiling.
4. Cut slopes: where pads and roads cut the hill, generate benched faces with shotcrete or exposed rock, toe drains and weep holes.
5. Access road: mesh generated along `routes.json` with camber, shoulders, side drains, ruts, potholes, a concrete section at the steep ramp, guard stones on the outer edge of bends.
6. Scatter scanned rocks and boulders (Poly Haven CC0) by slope and near the river; instanced.
7. Bake `public/models/twin/nav/walkable.glb` (simplified walkable surface for P09) and keep the height sampler in sync with the rendered surface.

**Deliver.** Terrain, ground, road, rocks, walkable surface; `data/terrain-edits.json`.

**Pass when.**
- [ ] Sampler and rendered terrain agree within 3 cm at 200 random points.
- [ ] No tiling visible from the overview or at eye level; no cracks between tiles while flying.
- [ ] Terrain alone within 20% of the frame budget on Medium.

## P03b. Sky, sun, moon, image-based light, shadows, night lighting

**Needs.** P03a.

**Read first.** `QUALITY-BAR.md` section 7; `sim/clock.ts`; v1 `RealisticSkyAtmosphere.tsx` and `LightCountStabilizer.tsx` (the shader-recompile problem it documents must not return).

**Steps.**
1. Sun and moon direction from `suncalc` for the site coordinates and the real date; moon phase drives its brightness.
2. Physically based sky for the chosen renderer; horizon haze; stars that fade in after dusk (real star positions are not required); the Milky Way band on High and above.
3. Clouds: a drifting cloud layer with density from the weather state, lit by the sun, casting moving shadows on the terrain.
4. Image-based light: capture the sky into an environment map and refresh it when the sun has moved more than 2 degrees or the weather changes, sliced over several frames.
5. Sun shadows: cascades sized from the P02c measurements, stabilised (no shimmer when the camera moves), fading to none beyond the last cascade. Moon shadows on High and above.
6. Exposure: automatic exposure with limits, so entering a room or the tunnel adapts over about a second.
7. Night lighting system (`world/lights.ts`): zone `lights` records drive (a) emissive lamp heads and windows always, (b) a **fixed-size** pool of real lights assigned each second to the nearest lamps to the camera with cross-fades, (c) additive light cards and ground glow for distant lamps. The number of real lights never changes at run time.
8. Lamps switch on in sequence at dusk and off at dawn by their `hours`; windows by occupancy (later driven by P09).
9. Time controls for testing: keyboard `[` and `]` step 30 minutes under `?debug=1`.

**Deliver.** `world/sky.ts`, `world/sun.ts`, `world/ibl.ts`, `world/shadows.ts`, `world/lights.ts`, `world/exposure.ts`.

**Pass when.**
- [ ] A 24-hour time-lapse shows no pops, flashes or hitches longer than 50 ms.
- [ ] Pipeline or program count does not change between noon and night.
- [ ] Lighting checklist passes at each of the seven moments.

## P03c. Water

**Needs.** P03b.

**Read first.** v1 `PowerhouseGeometry.tsx` `TailraceWater` (1029), `MeanderingRiverSystem` (1170), `FloodwallAnimatedEffects` (1559); `public/data/rivers.json`; v1 `TemfacilFacility.tsx` `TemfacilSiteDrainageCanal` (9041).

**Steps.**
1. River bed geometry carved into the terrain along the v1 river course, with cobble banks, gravel bars, boulders and overhanging vegetation zones.
2. Water surface with flow maps following the channel, depth-based colour and clarity, refraction of the bed in shallows, sky and environment reflection, sun glint, foam where flow meets rocks and banks.
3. Tailrace: outfall turbulence and foam plume where it joins the river, scaled by a `discharge` value (0 to 1) that comes from the store.
4. Wet banks: a darkened, glossy band above the waterline.
5. Storm response: level rises, colour turns brown and opaque, flow speeds up, debris drifts.
6. Camp drainage canal and road-side drains flow when it rains.
7. Tiers: Low uses a single cheap shader with no refraction; Ultra adds screen-space reflections if the renderer supports them within budget.

**Pass when.**
- [ ] Water reads correctly from the overview, from the bank at eye level and from the tailrace wall at all seven moments.
- [ ] Changing `discharge` and weather visibly changes it.
- [ ] Water costs under 2 ms on Medium.

## P03d. Weather

**Needs.** P03c.

**Read first.** `lib/weather/pagasa.ts`, `lib/weather/gdacs.ts`, `/api/weather/pagasa-signals`; v1 `PlantScene.tsx` lines 2738 to 2775 (storm logic), `RainParticles` (501), `MountainAtmosphereEffects.tsx`.

**Steps.**
1. `world/weather.ts`: states clear, overcast, rain, typhoon with smooth transitions (30 to 60 seconds). Source is the PAGASA link exactly as v1 uses it; a manual override exists and sets `weather.source = "simulated"`, which the interface must show.
2. Rain: GPU particles in a volume around the camera, angled by wind, not drawn under roofs or in the tunnel (use a top-down depth map of the site as an occlusion mask); splashes on ground and roofs; streaks on glass close up.
3. Wetness: the global value from P02a rises with rain and dries over minutes; puddles fill in mask low spots; roofs drip from eaves.
4. Wind: one vector and gust function shared by vegetation, rain, flags, tarps, smoke and audio.
5. Mist and fog: valley mist at dawn that lifts by mid-morning; low cloud on ridges in rain; height fog always.
6. Typhoon: heavy rain bands, strong gusts, bending trees, lightning with delayed thunder, darkened sky. No camera shake when reduced motion is set.
7. Dry-season detail: dust haze near traffic at noon when wetness is zero.

**Pass when.**
- [ ] Each state and each transition captured; none exceeds budget on Medium (rain particle count scales by tier).
- [ ] No rain indoors or in the tunnel.
- [ ] A simulated override is labelled as simulated in the store.
