# P03. World: terrain, light, water, weather

Five sessions. The land and the light are finished for the whole site before structures go on it.

## P03a. Terrain and ground

**Needs.** P02c approved.

**Read first.** `P03e` below (the Sierra Madre landscape this terrain must become; build the tiles so P03e can widen and sharpen them); `TOOLBOX.md` ("Tripo AI", for distant scenery buildings); `lib/twin/terrain.ts`; `public/data/gis-terrain-mesh.json`, `terrain-heightmap.json`, `terrain-contours.json`; v1 `terrainData.ts` (the flattened pads and blends it applies); `scripts/fetch-real-copernicus-dem.mjs`, `generate-terrain-mesh.mjs`; `data/site-layout.json`, `routes.json`, `exclusions.json`; the P02a ground material.

**Locations.** There are three surface locations (`weir`, `midway`, `powerhouse`; the two tunnels are underground and need no terrain). Build the terrain system once, driven by `data/locations.json`, and produce the `powerhouse` terrain in this sub-phase. The `weir` and `midway` terrains are produced with the same tools at the start of P05g and P05h, using `scripts/fetch-real-copernicus-dem.mjs` for their coordinates. Positions come from `data/locations.json` as derived in P00a. If one is missing or its recorded error is over 100 m, derive it again with the P00a method (the owner does not know the coordinates), then check the fetched terrain shows a river where the weir should be before building on it.

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

## P03e. The Sierra Madre: mountains, deep valleys and the road in (runs right after P03a)

**Needs.** P03a.

The owner's instruction (2026-10-16): **the site is in the Sierra Madre range in Tumauini, Isabela. The land must be mountainous, with deep, narrow valleys and roads climbing to the works.** P03a builds the terrain system and the powerhouse patch; this sub-phase makes the whole world read as the Sierra Madre, from the ground under your feet to the last ridge on the horizon.

**Read first.** `MASTER-BRIEF.md` section 8 ("Landscape"); `reference/INDEX.md` **R6 first** (the five real places, the measured terrain, `reference/terrain/`), then R2 site development plan and access-road history, R4 the owner's photographs and the river video, which show the real road, cut slopes and forest edge); `public/data/terrain-heightmap.json` (v1's patch: Copernicus GLO-30, 65 by 65 points over about 1.5 by 1.6 km round 17.3188 N, 121.9749 E, heights 204 to 559 m: 350 m of relief in a short distance); `routes.json`; P03a's terrain tiles.

### What the place is (researched 2026-10-16; check sources again before quoting figures)

- **The range.** The Sierra Madre is Luzon's longest mountain range, running along the east of the island. The town of Tumauini sits on its **western side**, in the flat Cagayan Valley, **but the project is not at the foot of the range: it goes deep into it**, up a valley heading north-east towards Maconacon on the Pacific coast. **No road continues to Maconacon** (that town is reached only by sea and air); the project road is a dead end in the mountains. The only way in is from **Antagan I**, a barangay at the edge of the plain. (Owner, 2026-10-16; reference R6.)
- **The five real places on the road** (R6 has coordinates and heights): Antagan I (about 104 m), up over the ridge to **Guard House 1 near Tan-Awan Bato** (about 508 m, a narrow deep valley road beside it), down into the valley to **Temfacil** (about 260 m) and the **surge tank, powerhouse and motor pool** (natural ground about 266 m), then up the river valley to the **weir** (about 302 m), where there are also barracks, a staff office and a house.
- **Measured shape (R6):** the climb from Antagan to Guard House 1 is about 400 m in 4.2 km straight-line, so the real road averages about 8 to 10 percent with steeper pitches; the drop to Temfacil is about 230 m in 2 km. The valleys are **300 to 500 m deep**, a few hundred metres wide at the floor near the weir, with walls rising to 700 to 800 m within 2 km; ridges of about 1,000 to 1,050 m stand 4 to 6 km north-east.
- **Landform.** Inside the range the land is high mountains with **very steep slopes, peaks and sharp ridges**; towards the coast it softens into lower hills. The Northern Sierra Madre Natural Park, north-east of the site, spans sea level to about 1,670 m.
- **The river.** The scheme is on the upper **Pinacanauan de Tumauini** river (about 35 to 40 km long; sources differ), which runs west out of the mountains to the Cagayan River at Tumauini. In the mountains it is a bedrock river in a narrow valley: boulders, pools, rapids, gravel bars, and a floor that floods brown after rain.
- **The scheme's own levels.** Weir flood wall about Elev. 303 m; powerhouse turbine floor Elev. 188.24 m: about 115 m of fall between the weir and the powerhouse, over roughly 7 km of road. Access road about 3.5 km from the lower gate to the powerhouse and 7.1 km to the weir.
- **Land cover seen on site (R6):** dark closed forest in gullies and on the sheltered faces; lighter red-brown burned or cogon grassland and old clearings on exposed spurs and ridge tops; a wide braided gravel river at Antagan narrowing to a gorge upstream.
- **Forest.** Lower slopes carry **lowland dipterocarp rainforest** (tall emergent trees well above the canopy, buttress roots, rattan, strangler figs and balete); above about 1,000 m it turns to **montane forest** of oaks and laurels, mossy and often in cloud. Some forest grows over limestone and over ultramafic rock. Near people: bamboo, cogon grass, old clearings, banana and root-crop patches.
- **Weather.** The range shields the Cagayan Valley from some of a typhoon's wind but not from its rain; the mountains make their own cloud. Mornings often start with **fog lying in the valleys** under clear ridges; afternoons build cumulus over the peaks; heavy rain turns gullies into torrents.
- **Rock and soil.** Do not invent the site's geology. Read the monthly reviews and any geotechnical notes for the real rock types (the tunnel decks name rock classes and support); use those colours and textures for cut faces and the river bed. Until then, cut faces show weathered rock and red-brown laterite soil, as the owner's photographs do.

Sources: [Northern Sierra Madre Natural Park (Wikipedia)](https://en.wikipedia.org/wiki/Northern_Sierra_Madre_Natural_Park), [KBA factsheet 9715](https://keybiodiversityareas.org/site/factsheet/9715), [BirdLife IBA factsheet](https://datazone.birdlife.org/site/factsheet/northern-sierra-madre-natural-park-iba-philippines), [Sierra Madre (Philippines) (Wikipedia)](https://en.wikipedia.org/wiki/Sierra_Madre_(Philippines)), [Pinacanauan River (Wikipedia)](https://en.wikipedia.org/wiki/Pinacanauan_River), [Province of Isabela, general information](https://provinceofisabela.ph/index.php/79-articles/general-info), [DZRH on typhoons and the range](https://dzrh.com.ph/post/sierra-madre-mountains-help-weaken-typhoons-after-landfall-experts).

### Steps

0. **See it first.** Read R6's Google Earth notes (made 2026-10-16), then open the owner's five Google Earth views (links in R6) in the app's built-in browser (it works there; the owner prefers it) or the owner's Chrome, tilt to 3D, and capture each place and the road between them; trace the road line, hairpins, cut slopes, river crossings and the deep valley road near Guard House 1 into `routes.json`. Google imagery is reference only, never a texture.
1. **Wider, finer ground data.**
   - Fetch Copernicus GLO-30 (free) for a box of at least **17.25 to 17.38 N, 121.89 to 122.05 E** (about 17 by 14 km) that holds the whole scheme, the road from Antagan I, and the ridges that close every view. v1's patch is far too small for the valleys the owner describes.
   - Ask the owner (owner input) for the project's own **topographic survey and drone surveys** (the surveyors and the geo mapper make them): where they exist, they replace the 30 m data near the works, giving real cut slopes, benches and road edges.
   - Note the national 5 m IfSAR terrain (NAMRIA) as a possible request; do not depend on it.
   - Use free **Sentinel-2** imagery (10 m) to map land cover truthfully: closed forest, open grass and bamboo, bare landslide scars, river and gravel bars, clearings and roads. Store it as a mask that drives P04's planting. Do not use imagery whose licence forbids this.
2. **Make the valleys read as deep and narrow.**
   - V-shaped valleys with narrow floors; side gullies cutting in every few hundred metres, each with a stream line, boulders and a darker, wetter plant mix.
   - Spurs and knife-edge ridges between them; slopes of 30 to 45 degrees and steeper, with rock outcrops where the slope is steepest.
   - Do this by **sharpening, not inventing**: keep the real DEM's shape and add erosion detail (gullies along the real flow lines computed from the DEM, ridge sharpening, talus at the foot of cliffs) as a detail layer, so the large shape stays true.
3. **The road in.**
   - Build the full access road **from Antagan I over the Guard House 1 ridge, down to Temfacil and the powerhouse, and up the valley to the weir** (from `routes.json`, R2's site plan and the traced Google Earth line) as a **shelf cut into the valley side**, with the plain-edge section at Antagan as a barangay road between houses and fields:
     - an inside cut face, with benches and shotcrete or bare rock and soil where the reviews show them
     - the running surface: compacted laterite and gravel, concrete on the steepest ramps
     - an outer fill slope or a drop to the river, with guard stones, gabions or concrete barriers on the outside of bends
     - hairpins where it climbs, side drains and cross drains, culverts at every gully crossing, and small slides of fallen soil
   - The real shape, from R6: a barangay road through Antagan; a winding climb onto a **ridge-crest road** through grassland and forest to Guard House 1 and Tan-Awan Bato; a **staircase of very tight switchbacks** down a forested slope into the gorge; more hairpins between the powerhouse and Temfacil; then along the river bank to the weir; and a narrow branch north from Temfacil, climbing about 50 m in 400 m in tight zigzags up a forested gully to the pipe bridge between the Tunnel 1 outlet and the Tunnel 2 inlet (the `midway` location). Every camp, pad and building stands on an excavated bench.
   - Grades: about 8 to 10 percent on average from Antagan to Guard House 1 with pitches to 15 to 20 percent (measure on the traced line), a long descent to Temfacil, and rolling grades along the river to the weir. Vehicles in P10 must labour up them in low gear.
4. **Landslide scars and repairs.**
   - Fresh scars: bare red-brown soil and a debris fan.
   - Old scars, healing in stages: ferns, then cogon and bamboo, then young trees.
   - Engineered repairs on the road: gabion walls, riprap, coco-net matting, bio-engineering with vetiver.
   - The reviews record real landslides on the access road (2022 to 2023). Place them where recorded; a P12 storm can add new ones.
5. **The view, layer by layer.**
   - Around each location: near terrain (P03a), mid-distance ridges as low-detail meshes with baked colour, and the far range as **several silhouette layers fading into blue haze** (aerial perspective).
   - From the high points looking west: **the flat Cagayan Valley** with rice fields, the Cagayan River and the town of Tumauini; the Cordillera faint on the far horizon. At night, the town's lights.
   - Looking east: only more mountains, higher and greener, the montane forest in cloud.
6. **Valley light.**
   - In a deep valley the sun rises late and sets early on the floor while the ridges stay lit. Compute a **horizon map** from the wide DEM so the sun disappears behind the real ridge at the right time for each location.
   - Valley floors sit in long shade in the morning; the powerhouse may lose direct sun well before 17:00.
   - Shadows of whole ridges cross the valley (P03b uses this).
7. **Valley weather** (hooks for P03d and P12c):
   - fog pooled in valleys at dawn, lifting by mid-morning
   - cloud sitting below the ridgelines and drifting up the valley
   - rain curtains walking along the valley; mist rising off the forest after rain
   - **waterfalls that appear on the cliffs after heavy rain** and dry up after
   - the river turning brown and loud within an hour of a storm
8. **Sound of the valley** (hook for P12b): the river's roar is louder and echoes in the gorge, voices and machines echo off the opposite slope, wind sounds different on the ridge and in the valley, and the Philippine forest's own sound (birds, cicadas at dusk, frogs after rain).
9. **Performance.**
   - The far landscape costs almost nothing: silhouette meshes, baked colour and the fog do the work.
   - Mid-distance forest is a textured canopy surface with tree impostors on the near edge; full trees only near the camera (P04).
   - Measure on Medium; the whole wider world must fit in the terrain share of the frame budget set in P03a.

### Ideas the later phases build on this

- **"Follow the water"**: a guided flight from the weir down the valley to the powerhouse along the real river (P13).
- **The drive up**: a ride from the lower gate in the crew van or the Kia, climbing through the hairpins as the valley deepens and the town drops away behind (P10, P13f).
- **Viewpoints**: a few real spots worth stopping at (a bend above the river, a ridge over the camp, the weir looking upstream) with a photo spot (P13h).
- **A walk to the ridge** at dawn above the fog (Umaga in P16).
- **The landslide as an event**: a storm brings a slide down onto the road; the crew clears it while traffic waits (P10c, P12c).
- **Story mode**: Act I, "Ang Daan", is about cutting this road through the mountain (P16).
- **The first sight** (from R6): the drive from Antagan climbs onto the ridge, and at **Tan-Awan Bato** ("the viewing rock") the whole valley opens below: the gorge, the river, the camp roofs and the powerhouse far down. Make this the twin's signature moment: a viewpoint with a bench, the guard house, the wind, and a photo spot (P13h, P16 Prologue).
- **The switchback staircase:** trucks meeting on a hairpin and one reversing to let the other pass; a loaded Kia crawling down in first gear with the brakes smelling; dust trails hanging over the bends on a dry day; a convoy's headlights zig-zagging down at night (P10b, P10c).
- **The ridge road:** views to both sides, strong wind, grass bending, a cloud passing over the road at eye level in the wet season.
- **Burning season:** in the dry months (about March to May) smoke from grass and kaingin fires drifts over the far ridges and reddens the sunset; black burned patches green up again after the first rains (P12f).
- **The river in a typhoon:** the braided river at Antagan rises and the low crossings go under, cutting the site off; the camp waits it out with what it has (P12c, P16).
- **Places to go:** Kagumatan Falls, Kweba Danum cave, the Blue Spring river and Magoli Eco Park near Antagan as off-duty trips and story locations (P13j, P16).
- **Echo and quiet:** a shout across the gorge comes back; a blast at the tunnel rolls round the valley walls (P12b).

**Deliver.** The wide DEM and land-cover mask; the sharpened valley terrain for all three surface locations; the full access road; landslide scars and repairs; the layered horizon with the Cagayan Valley to the west; the horizon map for valley light; review captures at dawn (fog in the valley), noon, late afternoon (valley in shade, ridges lit) and night (the town's lights), each set beside an owner photograph where one exists.

**Pass when.**
- [ ] From the camp, the powerhouse and the weir, every direction ends in real ridges; no flat horizon, no edge of the world.
- [ ] A section across the valley at the powerhouse shows a deep, narrow V within the DEM's true shape (checked against the raw data).
- [ ] The road climbs as a benched shelf with cut face, drains and outer protection along its whole length.
- [ ] The sun leaves the valley floor before it leaves the ridges, at times computed from the horizon map.
- [ ] Looking west from a high point shows the flat Cagayan Valley and the town.
- [ ] The wider world fits the terrain share of the frame budget on Medium.

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

This sub-phase builds the weather machinery with a few named states. P12c later feeds it with the live conditions at the site (temperature, humidity, wind, cloud layers, rain rate), so write `world/weather.ts` to take continuous numbers, with the named states as presets of those numbers.

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
