# P11. Animals and ambient life

Two sessions. Rigged, textured, animated fauna that belong to the Sierra Madre foothills of Isabela and respond to time, weather, people and machines.

## P11a. Fauna models and clips

**Needs.** P04b, P07d (shares the LOD and animation throttling).

**Read first.** v1 `ForestWildlife.tsx` (species, counts, positions, time-of-day switches), `SierraMadreStorkFlock.tsx`, `HighlandTrailHorse.tsx`, `PerimeterSecurityPatrol.tsx` (the dog), `MountainAtmosphereEffects.tsx` (`MountainSwallowFlock`, `HighAltitudeRaptor`, fireflies); `QUALITY-BAR.md` section 5; the P02b dog.

**Species.**

| Group | Species | Minimum clips |
| --- | --- | --- |
| Working and camp animals | Carabao; aspin dogs (3 coat variants); cats; goats; native chickens and a rooster; ducks | Idle x2, graze or peck, walk, trot or run, lie down, sleep, get up, species extras (carabao wallow, tail swish, ear flick; dog sit, bark, wag, sniff, scratch; cat groom, stretch; rooster crow) |
| Forest mammals | Long-tailed macaque; Philippine deer; wild pig; palm civet (night); fruit bats | Idle, forage, walk, run or flee, climb or leap (macaque), fly (bat) |
| Reptiles and amphibians | Monitor lizard; house gecko near lamps; frogs after rain | Bask, walk, tongue flick; cling and dart; hop |
| Birds | Philippine eagle or serpent eagle soaring; rufous hornbill; egrets (in the river and following the carabao); kingfisher; swiftlets and swallows; mayas (sparrows) at the canteen; doves; a coucal in the brush | Perch idle, preen, take off, flap, glide, land; wade and strike (egret); dive (kingfisher) |
| Fish and river life | Fish rises and shadows in clear water | Shader and particle based |
| Insects | Butterflies, dragonflies over water, bees at flowers, flies at the bins, moths at lamps, fireflies, mosquito clouds at dusk near water | Instanced sprites or tiny meshes with flight paths |

**Steps.**
1. For each species: 3 reference photos of the local form; search Sketchfab (CC0/CC BY) for a rigged, animated model; accept only if it can pass section 5 after re-texturing. Otherwise sculpt and rig in Blender. Quaternius CC0 animals may be used only as rig and animation donors, not as final meshes, because their style is low-poly.
2. Clean topology, re-texture to the local form, build LODs, cap bones for small animals.
3. Clips: reuse what ships with the model if it passes the motion checklist; author the rest. Quadruped gaits must match speed.
4. Birds: a flapping-cycle skeleton for close birds; vertex-animated instances for flocks.
5. Hide and fur: card or shell fur on LOD0 for the dog, cat, goat, macaque and deer if the budget from P02c allows; otherwise textured with a fuzz term at the silhouette.
6. Export; credits.

**Pass when.** Every species passes the animal checklist in a Blender turntable and in the browser at noon and at night; species that cannot reach the bar are dropped and listed in the report rather than shipped.

## P11b. Behaviour

**Needs.** P11a, P09a.

**Read first.** `CONTRACTS.md` 4.9; `sim/world.ts`; `world/weather.ts`.

**Steps.**
1. `fauna/sim.ts` in the same simulation world: each animal has needs (feed, rest, move, shelter), a home range, active hours, a flee distance from people and vehicles, and a shelter rule for rain. Ground animals use the navmesh or simple steering inside their range; birds use flight splines and perches authored as `PERCH_` empties in the master scene and on tree crowns.
2. Daily rhythm:
   - **Dawn:** rooster crows, bird chorus, bats return to roost, mist; dogs stretch; carabao led out.
   - **Morning:** carabao graze on the riverside flat with egrets around them; chickens scratch near the kitchen; macaques at the forest edge; butterflies.
   - **Noon:** animals in shade; carabao wallows in the mud hole; dogs asleep under a truck or the guardhouse eaves; raptor soaring on the thermal; lizard basking on the penstock anchor block.
   - **Late afternoon:** hornbills cross the valley; swiftlets feed over the river; goats brought in.
   - **Dusk:** fruit bats stream out; mosquito clouds; frogs start if wet; moths and geckos gather at lamps as they switch on.
   - **Night:** fireflies in the trees by the river; civet on the fence line; guards' dog patrols with them; owls heard (audio only).
3. Reactions: birds flush when a truck passes or the blast siren sounds; all forest animals go quiet and hide for a period after a blast; dogs bark at an arriving vehicle, follow the guard on patrol, and beg at the canteen at meal times; chickens scatter from walkers; cats sit on warm engine bonnets at night.
4. Rain: birds perch and fluff, chickens under the eaves, frogs out, carabao indifferent; typhoon: everything sheltered.
5. Counts per tier from the measured budget; flocks and insects instanced; animals outside view are simulated at low rate and not animated.
6. Selecting an animal shows a small card: common name, scientific name, one line of fact. Facts come from a reviewed `data/species-facts.json` with a source URL per entry.

**Pass when.** A 24-hour time-lapse shows the rhythm above; fauna adds less than 10% to frame time on Medium; no animal walks through structures or stands in water it should not; every fact has a source.
