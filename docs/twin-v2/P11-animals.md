# P11. Animals and ambient life

**Tools and sources:** read `TOOLBOX.md` first (free tools for models, motion capture from video, scans of real objects, and what the owner may have supplied).

Three sessions: P11a, P11b, P11c. Rigged, textured, animated fauna that belong to the Sierra Madre foothills of Isabela and respond to time, weather, people and machines.

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

## P11c. Sierra Madre wildlife and animal routines

**Needs.** P11b, P12f (the environment timetable), P09e (calendar).

The owner asked (2026-10-10) for more animals and for their routines and behaviour on the site. P11a and P11b give the common animals a daily rhythm. This sub-phase adds the wildlife that makes the Sierra Madre special, gives animals lives that span days and seasons, and shows how a construction site and its wildlife live beside each other.

**Owner's decision (2026-10-10): build every candidate below.** None is dropped for being uncertain. Accuracy is kept on the information side instead: for each species, look up a reliable source (IUCN Red List, a field guide, DENR or a museum page), record it in `data/species-facts.json`, and let the species card say honestly what the source says (for example "recorded in the northern Sierra Madre; rarely seen"). If a source says a species does not occur in this part of Isabela, still build it as the owner asked, keep it rare, and list it in the report so the owner knows. Rare species appear rarely.

**Wildlife to add**

| Group | Candidates | How it appears |
| --- | --- | --- |
| Forest birds | Luzon hornbill and rufous hornbill; Philippine serpent eagle; brahminy kite; Philippine coucal; white-eared brown dove; Philippine bulbul; coleto; Luzon bleeding-heart (a shy ground dove); the Isabela oriole (very rare) | Hornbills in pairs or small noisy groups at fruiting trees and crossing the valley morning and evening; kites circling on thermals and over the waste area; a coucal's booming call from the brush; the ground dove glimpsed walking in deep shade and gone at once |
| River birds | Collared and common kingfishers; little and great egrets; a striated heron; a wagtail on the gravel bars; swallows and swiftlets | Kingfisher perched on rebar or a staff gauge, diving; egrets wading at the weir pool and following the excavator where it turns wet earth; swallows nesting under the powerhouse eaves and the pipe bridge |
| Night birds | A Philippine scops owl and eagle-owl; nightjars | Heard far more than seen; a nightjar sitting on the warm road at night that flies up in headlights; an owl on a lamp post hunting the insects and rats the lamps attract |
| Mammals | Long-tailed macaque troop; Philippine brown deer; Philippine warty pig; palm civet; a giant cloud rat in the canopy at night; fruit bats including large flying foxes; insect bats; forest rats and a shrew | A macaque troop with a leader, mothers carrying infants, juveniles playing, moving along the forest edge on a daily circuit and testing the canteen bins; deer and pigs only at dawn, dusk and night at the forest margin, bolting at any noise; a line of flying foxes crossing the sky at dusk; small bats pouring from the unused adit |
| Reptiles and amphibians | Water monitor; the large fruit-eating forest monitor known from the northern Sierra Madre (very rare); sailfin lizard on river rocks; tokay and house geckos; skinks; a rat snake; a reticulated python (rare); tree frogs and river frogs; a toad at the lamps | Monitors basking on warm concrete and the penstock blocks and sliding into water; a sailfin lizard running for the river when approached; skinks in leaf litter; frogs calling by species after rain |
| Fish and river life | Native gobies and eels, tilapia, river shrimp and crabs | Shadows holding in the current, rises at dusk, shrimp in the shallows, fish working their way up the **fish pass** beside the weir once it carries water |
| Small life | Cicadas, stingless bees at a nest hole in a tree, weaver ants with leaf nests, large forest butterflies, dragonflies and damselflies, fireflies, giant millipedes after rain, land snails, leeches on the wet-season trail, spiders with large orb webs across the trail at dawn | Each in its conditions (P12f); leeches show as a worker stopping to flick one off a boot in the wet months |
| Camp animals (more of them, with ties to people) | The dog pack with a leader, a nervous newcomer and a litter of puppies under the barracks in season; cats that own the warehouse and kitchen; the kitchen's chickens and a rooster; a goat or two; ducks at the drain; a pet bird in a cage at the guardhouse; the farmer's carabao | Named camp animals with a favourite person, a sleeping place and a feeding time |

**Routines and behaviour to build**

1. **Home ranges and daily circuits.** Each animal or group has a home (roost, den, nest, sleeping tree, kennel spot) and a circuit it follows through the day with stops for feeding, drinking, resting and watching. The macaque troop is at the east forest edge at dawn, the fruiting tree mid-morning, resting in shade at noon, at the river in the afternoon and at its sleeping tree by dusk. Circuits shift when a fruiting tree changes.
2. **Feeding you can watch:** hornbills tossing fruit back to swallow it; kingfisher beating a fish on a branch; an egret's stalk and strike; a macaque washing or peeling food; a monitor flicking its tongue along the bank; a dog burying a bone; chickens scratching and a hen calling her chicks to food; swallows hawking insects over the tailrace; bats swooping through the lamp light.
3. **Family and season** (driven by the calendar): swallows building mud nests under the eaves, then feeding chicks, then fledglings lined on a cable; a hen with a brood that grows week by week; puppies that appear, play and grow; macaque infants carried then riding; frogs and tadpoles in the wet months; courtship displays and louder song at the start of the rains; migrant birds in the cool months; flying termites and the birds, geckos and toads that gather for them after the first rains.
4. **A food web that shows:** insects at lamps bring geckos, toads, bats and an owl; rats at the store bring the cats and a snake; turned earth brings egrets; fruit on the ground brings pigs at night; fish at the outfall bring kingfishers and herons.
5. **Living beside the works:**
   - animals keep clear of noise and movement by a distance that differs by species, and return when work stops: the forest edge empties in the working day and fills at dusk and on Sundays;
   - before a blast the siren clears birds from the valley; after it the forest is silent for a while, then calls return one by one;
   - macaques raid bins and the canteen, get chased with a shout and a clap, and learn to come when the kitchen is busy elsewhere; bins get lids and weights;
   - a snake found in the barracks or a store: people gather at a distance, the trained handler bags it with a hook and releases it at the forest edge (shown calmly; rare);
   - a monitor lizard asleep on the warm penstock block that workers walk around; a frog in a boot; a gecko on the office wall catching moths; an owl that has made the tower light its perch;
   - the farmer's carabao and goats crossing the road at the same time each day with traffic waiting;
   - at night, pairs of eyes shine back from the roadside in headlights and torch beams.
6. **The project looking after wildlife** (the roster includes a pollution control officer; show the practice, label it simulated, and state no real programme the owner has not confirmed): a wildlife-sighting logbook at the office; a camera trap strapped to a tree on the forest trail; "slow: wildlife crossing" signs on the road; work lamps aimed down and away from the forest; the fish pass in use; a rescued bird or turtle kept in a box and released; no-hunting and no-littering signboards; a small tree nursery of native seedlings **only if the owner confirms the site has one**.
7. **Signs of animals when the animals are not there:** tracks in mud by species (pig, deer, dog, bird, monitor tail drag), droppings on the trail, a wallow, feathers, a shed snake skin, chewed fruit under a tree, a nest in a signboard, claw marks on a trunk, a spider's web rebuilt each morning.
8. **Camp animals with relationships:** each dog and cat has a person it follows and a place it sleeps; they greet the returning shift, wait at the canteen at meal times in a set order, shelter under the same truck, and bark as a group at strangers and at the macaques. The guard feeds the gate dog; the cook saves scraps for the cats.
9. **Weather and time** follow P12d and P12f; add species detail: flying foxes leave later on bright moonlit nights; frogs call by species in sequence as rain starts; cicadas stop in a wave when a cloud covers the sun; deer come to the river at dusk in the dry months when forest pools are gone.
10. **Seeing them:** an optional "wildlife" layer marks recent sightings on the map; in walk mode animals let a slow, quiet visitor come closer than a running one; the site passport (P13f) gains a species list; photo mode has a long-lens setting.

**Pass when.**
- [ ] Every candidate species is built; each has a cited source and an honest card; any whose presence at the site is doubtful is listed in the report.
- [ ] A three-day time-lapse shows each group's circuit repeating with variation, the forest edge emptying by day and filling at dusk, and the blast silence and recovery.
- [ ] A simulated season shows the swallow nest, the brood of chicks and the puppies progressing.
- [ ] No animal walks through structures, stands on water it should not, or ignores a vehicle.
- [ ] Wildlife stays inside its share of the measured budget on each tier; rare species are rare (logged counts in the report).
