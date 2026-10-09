# P12. Effects and sound

Two sessions. The layer that makes work visible and the place audible.

## P12a. Visual effects and post-processing

**Needs.** P09c, P10b.

**Read first.** v1 `MountainAtmosphereEffects.tsx`, `VolumetricLightBeam.tsx`, `TunnelDustParticles.tsx`, `TunnelWaterSeepage.tsx`, welding sparks in `AnimatedSiteEntities.tsx` (`ActiveConstructionWorkerMesh`, 2684), cooking steam in `TemfacilFacility.tsx` (3950); clip markers from P08c; tier definitions.

**Steps.**
1. `fx/particles.ts`: one GPU particle system for the chosen renderer with emitters defined as data (`data/fx.json`: rate, lifetime, velocity cone, gravity, drag, size and colour over life, texture sheet, lit or unlit, soft against depth, collision with ground optional). Pooled; emitters far from the camera sleep.
2. Work effects, triggered by activities and clip markers:
   - Welding: flickering arc light from the fixed pool, sparks that bounce, smoke; the welder's helmet goes down first.
   - Grinding and cutting: directional spark stream.
   - Drilling: dust and water mist at the bit; slurry on the invert.
   - Blast: flash, dust front travelling down the tunnel, debris, lingering haze cleared by ventilation.
   - Shotcrete: spray cone, rebound, wet sheen on the fresh surface.
   - Concrete: flow from chute or pump hose, surface going from wet to matt as it cures.
   - Earthworks: bucket spill, dust on dry soil, clods on wet.
   - Kitchen: steam from pots and trays, smoke from the grill.
   - Machines: exhaust puffs on load, heat haze over engine covers.
   - Water: tailrace spray, drips in the tunnel, hose jets.
   - People: breath of dust when sweeping, splash when walking through puddles.
3. Atmosphere: light shafts through canopy and through tunnel dust; valley mist layers; heat shimmer over the switchyard and road at noon; lamp halos in mist and rain; insects around lamps as light specks.
4. Decals: tyre tracks, footprints in mud that fade, oil stains, paint marks, wet patches under dripping eaves, scorch at the welding bay.
5. Post chain for the chosen renderer: ambient occlusion, bloom on true emitters only, AgX tone mapping, a restrained colour grade per time of day (lookup tables), anti-aliasing (TAA on High and above if stable, SMAA otherwise), sharpening after resolution scaling. Depth of field and vignette only in photo mode and close-up follow.
6. Reduced motion: no camera shake, no flashing; the blast becomes a slow brightening and dust.
7. Per-tier effect budgets; Low keeps only effects that carry meaning (welding, blast, rain).

**Pass when.** Each effect captured against a reference photo or video still; no effect draws when its emitter is out of view; total effects cost on Medium within the measured budget; nothing flashes faster than 3 times a second.

## P12b. Sound

**Read first.** v1 `SierraMadreSoundEngine.ts` (synthesised river, wind, hydro hum, storm, and timed wildlife calls), `SiteAudioControls.tsx`, `TunnelPositionalAudio.tsx`, `carAudio.ts`.

**Steps.**
1. `audio/engine.ts` on the Web Audio API: master, ambience, machines, people and interface buses; a listener that follows the camera; nothing plays before a user gesture; a mute control persisted in local storage; volume ducking when the tab is hidden.
2. Sources: keep v1's synthesised beds where they sound good; add recorded sounds only under CC0 (for example from Freesound's CC0 pool), each credited. Encode to small Opus or MP3 files in `public/audio/twin/`, streamed by zone.
3. Ambience by zone and clock, cross-faded: river (louder at the tailrace and in flood), forest by hour (dawn chorus, daytime insects, dusk frogs after rain, night crickets and distant owl), wind in canopy scaled by the wind vector, rain on ground versus on GI roofing when under a roof, thunder delayed by distance.
4. Positional emitters with distance roll-off and occlusion by walls (a simple low-pass when a wall is between): gensets, compressors, excavator, trucks (engine pitch from load, reverse alarm, horn), mixer drum, welding crackle, grinder, hammering, rebar clink, drilling, ventilation fan, canteen murmur and cutlery, kitchen sizzle, radio playing in the barracks, basketball bounce and shouts, the toolbox-meeting megaphone (unintelligible murmur, not synthesised speech), guard's whistle, dog barks, rooster.
5. Tunnel: convolution or feedback reverb that grows with depth; the blast sequence (siren, countdown beeps, deep thump with a pressure rumble, falling debris, fans).
6. Clip markers trigger footsteps by surface (gravel, concrete, mud, steel grating, timber) for people near the camera.
7. Interface sounds: quiet ticks for selection and dock, off by default on phones.
8. Voice budget: at most 24 simultaneous sources; priority by distance and importance.

**Pass when.** Moving from river to forest to camp to tunnel changes the soundscape smoothly; muting is instant and remembered; no audio before a gesture; audio work stays under 1 ms per frame on the main thread; all recordings credited.
