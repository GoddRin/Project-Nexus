# P12 (continued). The living environment

Five sessions: **P12c, P12d, P12e, P12f, P12g.** They run after P12b and before P13a.

The owner asked (2026-10-10) for an environment that is alive down to small details: nature and its sounds, clouds that come and go with the **live weather at the site**, rain, wind and sun that change how people behave (sweating and tiring in the heat, umbrellas and raincoats in the rain), and workers relaxing at night. Earlier phases already build the pieces (weather states in P03d, vegetation wind in P04b, the daily programme in P09b, animals in P11, effects and sound in P12a and P12b). These three sub-phases connect them to real conditions and to each other, and add what was missing.

Principle: **one set of conditions drives everything.** Sky, light, plants, water, animals, people, machines and sound all read the same `conditions` record, so the site never shows rain on the roofs while workers stand about dry.

## P12c. Live site weather and a sky that follows it

**Needs.** P03d, P12b.

**Read first.** `app/api/weather/conditions/route.ts` and `app/api/weather/rain-forecast/route.ts` (the app already reads Open-Meteo for the site: temperature, humidity, wind speed and direction, pressure, precipitation, cloud cover, weather code, hourly forecast); `lib/weather/pagasa.ts` (typhoon signals); `world/weather.ts`, `world/sky.ts`; `data/locations.json` (each location's latitude and longitude: the weir and the powerhouse are kilometres apart and about 110 m different in elevation).

**Steps.**
1. `app/api/twin/weather/route.ts`: one public, cached (10 minutes) endpoint returning current conditions and the next 12 hours for the site, built on the existing Open-Meteo calls and extended with: cloud cover split low / mid / high, precipitation rate, wind gusts, visibility, UV index, shortwave radiation, dew point, apparent temperature, thunderstorm flag from the weather code. Include the PAGASA signal. Open-Meteo is free and needs no key; if it fails, fall back as the existing route does and mark the source.
2. `world/conditions.ts`: the single record everything reads.

```ts
type Conditions = {
  source: "live" | "forecast" | "simulated";   // shown in the interface
  asOf: string;
  airTempC: number; humidityPct: number; dewPointC: number; apparentTempC: number;
  heatIndexC: number;            // computed from temperature and humidity
  wetBulbGlobeC: number;         // estimated from temperature, humidity, sun and wind; drives work-rest rules
  windMs: number; gustMs: number; windFromDeg: number;
  cloud: { low: number; mid: number; high: number };   // 0..1 each
  rainMmPerHr: number; thunder: boolean; visibilityKm: number; uvIndex: number; sunWm2: number;
  typhoonSignal: number;
  groundWetness: number;         // 0..1, accumulates with rain, dries with sun and wind
  wetnessAge: number;            // minutes since rain stopped
};
```

   Values change smoothly: a new reading is approached over a few minutes, never snapped.
3. **Time travel:** when the clock is on Live, conditions are live. When the user scrubs to another hour today, use the forecast for that hour and label it `forecast`. For another date or a manual weather choice, generate plausible conditions for that month from a small monthly climate table for northern Isabela (`data/climate.json`, each number with its source) and label it `simulated`.
4. **Clouds from data, not presets:** three layers matching low, mid and high cover.
   - Fair-weather cumulus that **form late morning as the ground heats, grow through the afternoon, and thin out after sunset**; they build faster on humid days.
   - Towering cloud and a dark base before a thunderstorm, an anvil spreading at height, then rain.
   - Stratus and low cloud sitting on the ridges and in the valley on wet days; high cirrus streaks ahead of a typhoon.
   - Clouds drift with the wind direction and speed at their level, cast moving shadows on the ground, and individual clouds grow and fade rather than popping.
   - Dawn valley fog when the night was calm, clear and humid (dew point close to air temperature); it lifts as the sun reaches it.
5. **Rain with a beginning and an end:** first large drops and dust spots on dry ground, the smell-of-rain moment (a brief haze and darkening), building to the measured rate; drizzle, steady rain, downpour and squall are visibly different; a rain curtain seen approaching across the valley; after it stops, dripping eaves and leaves, steam rising from hot concrete and roofs if the sun returns, puddles shrinking over the next hour, mud drying to cracked crust over a dry day.
6. **Sun and heat you can see:** harder shadows and bleached highlights at high UV; heat shimmer over the road, roofs and switchyard above about 32 C in sun; dust devils on the dry laydown yard on hot still afternoons; a rainbow when sun and rain coincide at a low sun angle; a halo around the moon through thin high cloud.
7. **Wind you can see:** flags, tarpaulins, clotheslines, hanging lamps, loose plastic and leaves respond to speed and gusts; trees show the direction; dust and smoke trail downwind; rain slants; whitecaps and spray on the river in strong wind; a wind sock at the laydown yard or helipad-style pad if the site has one (only if the inventory lists it).
8. **Lightning and thunder:** flashes light the clouds from inside, the delay to the thunder matches the distance, and work at height and crane lifts stop while `thunder` is true (P12d).
9. The top-bar pill and the Time panel show the conditions source and a short read-out (temperature, feels-like, wind, rain) with its `as of` time.

**Pass when.**
- [ ] With the clock on Live, the sky's cloud amount, rain and wind match the endpoint's numbers within a visible tolerance, checked on three different real days and recorded with screenshots and the readings.
- [ ] A forced sequence (clear, building cumulus, storm, clearing) plays with no pops.
- [ ] Every non-live condition is labelled forecast or simulated.
- [ ] The whole layer stays within the P02c budget on Medium.

## P12d. People, animals and machines respond to the conditions

**Needs.** P12c, P09b, P11b, P10b.

**Read first.** `sim/agent.ts`, `programme.json`, `activities.json`, `characters/` wear parameters (sweat, dust, mud, wetness) from P07b; DOLE guidance on heat stress at work (search and cite the current advisory in `DECISIONS.md`; do not invent thresholds).

**Steps.**
1. **A simple body model per person** in the sim (cheap numbers, no physics): `bodyHeat`, `hydration`, `fatigue`, `wetness`, `morale`. Inputs: the wet-bulb-globe estimate, whether the person is in sun or shade (a top-down sun-shadow map), how hard their activity is (each activity gets an effort level: resting, light, moderate, heavy), their clothing (coveralls and leathers are hotter), wind, and time since their last break and drink. Tunnel air has its own values: cooler than outside but humid, dusty, and still unless the fans run.
2. **Heat shows on people:**
   - sweat: the P07b sweat mask grows on the back, chest, underarms and brow; skin sheen rises; shirts cling and darken;
   - behaviour: wiping the brow, lifting the hard hat to fan, pulling the collar, pouring water over the head or neck cloth, loosening the face cloth, hands on knees after heavy effort, slower work rhythm and walking pace as fatigue rises;
   - more frequent and longer drink stops at water stations; drink containers visibly get used and refilled;
   - seeking shade: breaks move under trees, tarps, sheds and the shadow side of structures; tarpaulin shades and umbrellas go up over fixed work points like the rebar bench;
   - sun protection appears: arm sleeves pulled down, neck flaps and cloths under hard hats, wide-brim attachments, long sleeves kept on despite the heat (as on real sites).
3. **Heat changes the day** (thresholds taken from the cited guidance): at elevated levels the foreman calls extra water breaks and rotates heavy tasks; at high levels heavy outdoor work pauses through the hottest hours and gangs shift to shaded or indoor tasks, with the lunch rest extended; the safety officer walks round checking on people and the nurse sets up a rest point with water and a fan. A worker who overheats sits down in shade, is given water and is seen by the nurse, then rests: shown plainly as good practice, never as an accident. Any such event is sim-generated and labelled simulated in the inspector.
4. **Rain changes people:**
   - light rain: outdoor work carries on; staff walking between buildings open umbrellas; hoods and raincoats go on (yellow, green or clear ponchos, mixed, as real); rubber boots replace safety shoes where the ground is mud; clipboards and tablets go under plastic; motorcycle riders wear rain ponchos;
   - heavy rain: outdoor pours stop and fresh concrete is covered with plastic sheet; gangs shelter under eaves and sheds, waiting and chatting; electrical and welding work outdoors stops; drains and sumps get checked; pumps start; the guard stands inside the booth;
   - getting wet: clothes darken and cling, hair flattens, boots and trouser legs get muddy to a height that depends on where they walked; people shake off, wring a shirt, hang raincoats to dry by the door; wet people dry over time;
   - after rain: sweeping water off slabs, clearing drains, removing covers, footprints and tyre tracks in the mud.
5. **Wind and storms:** hard hats held or chin straps fastened in gusts; lifts and work at height stop above a wind limit and in lightning; loose sheets and tarps get tied down as wind rises; at typhoon signal the site-securing routine from P09b runs.
6. **Cool and comfortable hours** are visible too: brisker walking and more chatter in the early morning, jackets and hoodies on the night shift when it is cool, hands round a hot coffee cup at dawn.
7. **Machines and materials:** engine fans and exhaust heat haze stronger in heat; water trucks spray the roads when it is dry and dusty; fresh concrete is kept wet in sun; rain covers on stockpiled cement; mud builds on tyres and tracks; dust behind vehicles only when the ground is dry.
8. **Animals** (through P11b's rules): panting dogs lying on cool concrete in the heat; carabao in the wallow longer on hot days; birds quiet at midday heat and loud after rain; frogs and insects by humidity and wetness; chickens under the barracks floor in rain.
9. **Show it:** selecting a person shows a small comfort read-out (hot, thirsty, tired, wet), labelled simulated. An optional layer tints the ground by sun and shade heat so a visitor can see why crews work where they do.
10. In walk mode (P13d) the visitor's own avatar sweats, slows a little when run in the heat, gets wet, and is offered water by the nearest worker's water station.

**Pass when.**
- [ ] The same hour replayed at 26 C overcast, 35 C sun and steady rain shows clearly different behaviour, clothing and pace, captured side by side.
- [ ] No one works in the open in heavy rain or lightning; no one stays soaked forever; no one skips water on a hot day.
- [ ] Heat thresholds in the code match the cited guidance, and the citation is in `DECISIONS.md`.
- [ ] The body model for the full crew costs under 0.3 ms per sim tick.

## P12e. Small nature, and the camp at night

**Needs.** P12d.

**Read first.** P04b, P11b, P12b; `programme.json` evening blocks; v1 night scenes for what the owner already had (`NighttimeKwuntuhanDuo`, `NighttimeSmokingWorker`, `NighttimeSmartphoneWorker`, `NighttimeLoungingWorker`, `TemfacilBasketballGame` in `TemfacilFacility.tsx` and `AnimatedSiteEntities.tsx`).

**Small nature details.**
- Dew on grass and spider webs at dawn, catching the first light; webs between railings and in fence corners.
- Leaves that fall more in wind, drift on the river and collect in corners and drains; seed fluff and pollen in sunbeams; petals under flowering trees in season.
- Ant trails on walls and tree trunks; termite mounds at the forest edge; a line of ants to a dropped bit of food at the canteen.
- Moss and small ferns in damp shaded joints; weeds through gravel; mushrooms on fallen logs after wet days.
- Tracks: bird and dog prints in mud, a carabao's hoof marks at the wallow, snail trails on wet concrete in the morning.
- Water life: ripples from insects and fish rises, dragonflies patrolling, tadpoles in long-lasting puddles after several wet days, water striders on the drain.
- Light: moving leaf shadows, sun glints through canopy, fireflies in the riverside trees on warm humid nights without rain or strong wind, moths and flying termites swarming the lamps after the first rains, geckos hunting them.
- Sky life: swiftlets at dusk, bats leaving at nightfall, a hawk on the afternoon thermal, a line of egrets flying home.

**Nature sound that follows the conditions** (extends P12b): the dawn chorus starts with first light and is fuller after rain; cicadas rise with temperature and stop when cloud covers the sun; frogs call by wetness and humidity; crickets slow as the night cools; wind in bamboo creaks and knocks; rain has a different sound on leaves, GI roofing, tarpaulin, water and a hard hat; distant thunder rolls along the valley; the river grows louder as it rises; a gecko's call indoors at night; a rooster before dawn and dogs answering each other.

**The camp at night** (off duty, in the camp only; the owner asked to see workers enjoying themselves, including drinking):
- **Evening groups** at authored spots (a bench outside the barracks, a table under a lamp, the court-side): small circles sharing drinks and pulutan (finger food), passing a single glass around the circle in the Filipino tagay way, talking, laughing, teasing, a guitar and singing, a phone speaker playing music, someone telling a story with big gestures. Clips: seated talk and laugh set, pour and pass a glass, drink, toast, clap along, sing, strum, slap a card down, lean back and laugh.
- **Other pastimes** so not everyone is drinking: basketball under the court light, card games and dama (checkers) on a board, videoke with a small screen and microphone, video calls home, watching a film on a phone propped on a bunk, laundry and bathing, mending boots, a barber giving a haircut on a stool, someone cooking a late snack, a few early sleepers.
- **It stays good-natured and bounded:** only people who are off shift; nobody in PPE or on a work front; drinks stay in the camp social spots; the circle breaks up before lights-out and the bottles are cleared; no one is shown drunk, fighting or working after drinking; the night shift and the guards are not part of it. Pay-day evenings and Saturday nights are livelier than weeknights.
- **A setting controls how it is shown:** `camp.evening = "full" | "soft"`. `full` is as the owner asked (drinks visible). `soft` keeps every activity but swaps the drinks for soft drinks and coffee. The default is `full`; the switch exists because this page is public and a company may prefer the soft version for some audiences.
- Camp atmosphere: warm lamp pools, insects round the bulbs, cooking smoke, laundry on lines, a radio from one window, laughter carrying across the yard, the generator's hum behind it, then quiet, a few lit windows, a guard's torch moving along the fence.

**Other times of day worth the same care:** the pre-dawn kitchen with its one bright window; the morning wash queue with towels and tabo (dipper) buckets; merienda vendors or the canteen's snack tray at mid-morning; the after-lunch nap in whatever shade there is; Sunday rest with fewer people on site, washing hung everywhere and a longer game on the court.

**Pass when.**
- [ ] A dusk-to-midnight time-lapse on a dry Saturday and on a rainy weeknight show clearly different camp evenings, both believable.
- [ ] The bounds above hold in a 30-night fast simulation (assert: no one drinking is on shift, in PPE, or outside the social spots; groups disperse before lights-out).
- [ ] The `soft` setting removes every alcohol prop and clip.
- [ ] Each small-nature detail appears only in its right conditions (for example fireflies never in rain, dew never at noon), checked against a table in the report.
- [ ] Details scale down by tier and cost nothing when out of view.

## P12f. The environment through the day, the month and the year

**Needs.** P12e, P09e (calendar: date, season, moon phase).

The surroundings keep their own timetable, independent of people. This sub-phase writes that timetable down as data (`data/environment-day.json`, `data/environment-year.json`) and makes every natural element follow it, modulated by the live conditions from P12c.

**The 24 hours** (dry-weather baseline; rain, wind and heat shift each entry):

| Time | Sky and light | Air and ground | Water | Plants | Animals and sound |
| --- | --- | --- | --- | --- | --- |
| 03:30 to 05:00 | Darkest hour; stars sharp; the moon by its real phase; first grey in the east | Coolest and dampest; dew forming; mist pooling in the valley | River loud in the stillness; mist on its surface | Leaves heavy with dew; night flowers open | Crickets slowing; an owl; frogs if wet; the first rooster about 04:30; bats returning |
| 05:00 to 06:30 | Blue hour, then colour on the high cloud, then sun on the ridge tops while the valley is still in shade | Mist at its thickest, then starting to lift; breath visible on the coolest mornings | Mist peeling off the river in the first sun | Dew sparkles; spider webs lit; morning flowers open | Dawn chorus building to its peak; roosters; dogs stretching; swiftlets out; egrets flying to the river |
| 06:30 to 09:00 | Low warm sun; long shadows shortening; clear air and far views | Dew burning off; ground steaming lightly where the sun hits wet earth | Clear water, fish rising, dragonflies starting | Leaves drying; butterflies as it warms | Birds busy feeding; macaques at the forest edge; carabao led out to graze |
| 09:00 to 11:30 | Higher, whiter light; first small cumulus over the ridges | Warming fast; thermals start; first dust if dry | Glare on the water | Leaves turn edge-on to the sun on hot days | Raptors rise on the thermals; cicadas begin; birds quieter |
| 11:30 to 14:30 | Overhead sun; short hard shadows; pale hazy sky; cumulus growing | Hottest; heat shimmer; still air or a hot gusty breeze | Low and clear in dry months | Leaves droop; forest interior dark against the glare | Cicadas at full volume; most animals in shade; lizards basking; the wallow occupied |
| 14:30 to 16:30 | Clouds at their tallest; the chance of an afternoon storm on humid days; shafts of light between clouds | Breeze picks up; first relief from the heat | Wind ripples | Leaves recover | Birds active again; a hawk calling |
| 16:30 to 18:00 | Golden light from the west; long shadows; warm rim light on everything | Cooling; dust hanging gold in the low sun | Golden reflections | Flowers closing; evening scents | Hornbills crossing; second bird chorus; swiftlets feeding low; egrets flying home in a line |
| 18:00 to 19:00 | Sunset colours, then blue hour; first stars; lamps coming on one by one | Quick tropical dusk; air stills | Dark water with the last sky colour | Night flowers opening | Bats stream out; frogs start; mosquitoes; cicadas give way to crickets; geckos call |
| 19:00 to 22:00 | Full night; the Milky Way on moonless clear nights; a moonlit valley when the moon is up | Cool settling; dew point approaching | The river as sound in the dark | Leaves still | Insects round lamps; fireflies by the river on warm still nights; an owl; distant dogs |
| 22:00 to 03:30 | The stars wheel; the moon crosses; an occasional meteor; distant silent lightning on some nights | Quietest; coolest toward the end | Mist starts forming late | Dew begins | Fewest sounds: crickets, the river, a night bird, the generator |

**The month:** the moon's real phase sets how bright the night is. A full moon lights the valley enough to see the ridge lines and cast soft shadows; a new moon gives the best stars and the most fireflies. Moonrise and moonset shift each night.

**The year** (seasons for northern Isabela from `data/climate.json`, each claim sourced):

- **Cool dry months (about December to February):** coolest mornings, the thickest dawn mist, clear days, the north-east wind, jackets at night, a low clear river.
- **Hot dry months (about March to May):** the hardest heat, dust, brown grass and cracked mud at the clearing edges, more leaves down, haze, the lowest river with wide gravel bars, afternoon dust devils, the first violent thunderstorms at the end.
- **Wet months (about June to November):** afternoon and night rain, a green flush everywhere, mud, a high brown river, swollen side streams and small waterfalls on the cut slopes, frogs and insects in numbers, mushrooms, mist on the ridges, typhoons.
- Through the year: flowering and fruiting times for the trees in the library, more butterflies after the first rains, migrant birds in the cool months.

**Steps.**
1. Encode the two tables as data keyed by sun angle rather than clock time where it matters, so dawn events follow the real sunrise through the year.
2. Each natural system built earlier (sky, fog, dew, wind, river, vegetation, fauna, insects, sound beds) reads its row and blends it with the live conditions.
3. River level and colour follow recent rainfall (a running total from the conditions record) and the season.
4. Vegetation gets a seasonal tint and density setting (lush, normal, dry) and a flowering flag per species.
5. Add a "nature only" camera bookmark per location so the cycle can be reviewed without the works in frame.

**Pass when.**
- [ ] A 24-hour time-lapse in each of the three seasons shows every row of the table in order, with captures in the report.
- [ ] Dawn events track the real sunrise time across the year.
- [ ] Full-moon and new-moon nights differ visibly.
- [ ] The river responds to a week of simulated rain and falls back after.
- [ ] Budget holds on Medium at dawn with mist, dew and the full chorus.

## P12g. Surfaces that change: ground, vehicles and people

**Needs.** P12d, P10c, P07b (wear layers), P03a (ground material).

The owner asked (2026-10-10) for dirt that looks right for the weather (mud when it rains, dust when it is dry), for the ground itself to change with rain, sun and use, and for the same realism on people. Earlier phases give each of these a simple wetness or dirt value. This sub-phase replaces those with one shared model of **what is on a surface and what state it is in**, so the same rain that turns the road to mud also muddies the truck that drives it and the boots that walk it.

### The model

1. **Ground has a material and a state.** Materials per patch (from the P03a mask): laterite soil (red-brown), forest humus (dark), river sand and gravel, crushed aggregate, compacted road base, concrete, steel plate, grass, tunnel invert (grey rock slurry). State per patch, stored in low-resolution maps per location (`world/groundState.ts`) that change slowly:

| State value | What drives it |
| --- | --- |
| Moisture (0 dry to 1 saturated) | Rain adds; sun, wind, heat and time remove; shade and low spots dry slowest; slopes drain to hollows |
| Standing water depth | Fills where water collects (computed from the terrain's low points and drains), overflows downhill, sinks in and evaporates |
| Looseness (dust or mud available) | Traffic and footfall churn the surface; rain packs dust; drying crusts mud |
| Disturbance (ruts, prints) | Wheels and feet press tracks when the ground is soft; they hold while it dries and wear away under later traffic and rain |
| Contamination | Cement and concrete spill near pours, oil at the motor pool and fuel point, slurry outside the tunnel portal, sawdust at the carpentry bench |

2. **What you see on soil and road, by moisture:**
   - **Bone dry:** pale, powdery, cracked in a polygon pattern where mud dried; dust lifts from every wheel and footstep, hangs in still air and drifts with the wind; a fine film settles on everything nearby.
   - **Dry:** firm, lighter colour, a little dust at speed.
   - **Damp (first minutes of rain, or morning dew):** darker spots joining up, no dust, the smell-of-rain moment, firm underfoot.
   - **Wet:** dark, glossy, small puddles in every rut and footprint, tyres leave clean-edged tracks, the surface starts to smear.
   - **Mud:** soft and sticky; deep ruts with water in them; boots sink and pull out with a suck; wheels spin and throw clods; a brown film of slurry flows on slopes; the road edge slumps.
   - **Slurry and flood:** liquid mud and flowing sheets of brown water; rivulets cutting channels across the road; gravel washed out of place; drains running full and spilling.
   - **Drying:** the high crowns and wheel tracks dry first and turn pale while ruts stay dark; a skin forms and cracks; puddles shrink leaving a ring of fine silt; within a day or two of sun the cycle returns to dust.
3. **Other grounds change too:** concrete darkens when wet, shows a mirror sheen and slow-drying patches, keeps tyre and boot prints of mud that later dry to pale dust; fresh concrete goes from glossy wet to matt as it sets; gravel darkens and shines; steel plates and gratings go slick; grass beads with water, flattens where walked, and springs back; leaf litter mats down when wet and scatters when dry; river sand shows a wet line that follows the water level.
4. **Erosion and deposit over days:** gullies form in bare cut slopes after heavy rain and deepen over a wet week until the road gang fills them; silt fans collect at the bottom of slopes and in drains and get shovelled out; a washed-out pothole grows until it is filled; road gravel thins on the steep sections.
5. **Tracks that last:** a persistent track map along roads and yards records wheel ruts and footpaths; the daily routes of trucks and people become visible worn lines; a single vehicle crossing fresh mud leaves its own readable trail; tracked machines leave their cleat pattern.

### Vehicles and machines

6. **Dirt comes from where the vehicle has been** (`vehicles/soiling.ts`). Each vehicle accumulates four separate layers, driven by the ground state under its wheels, its speed and time:

| Layer | When it builds | How it looks |
| --- | --- | --- |
| Dust film | Driving on dry ground, or parked near dry traffic | A pale even haze heaviest at the rear and on horizontal surfaces; finger marks and a wiped arc on the windscreen; a clean patch where a hand opened a door |
| Wet mud splatter | Driving through wet ground and puddles | Dark, glossy, thrown up in arcs behind each wheel, along the sills and doors and up the tailgate; drips running down; thicker the faster it went |
| Caked mud | Wet splatter that has dried, and repeated layers | Pale, matt, thick, cracked; packed in wheel arches, on mud flaps, steps, chassis and the underside; chunks that fall off and lie where it parked |
| Stains | The work itself | Cement dust and concrete splash on mixers and pumps; grey slurry on tunnel machines; oil and grease at pins and hoses; rust runs from scratches; diesel streaks below fuel caps; red soil stain that never fully washes out of white paint |

7. **Colour matches the place:** red-brown from the laterite roads, grey from the tunnel, pale from cement, dark from forest soil. A truck that works the tunnel and then the road shows both.
8. **Rain washes selectively:** it rinses dust off roofs and bonnets in streaks and beads on clean paint, but leaves caked mud in the arches and below the door line; a parked vehicle shows a dry shadow on the ground beneath it when rain starts and a clean rectangle of dry dust after it leaves.
9. **Use decides how dirty.** The vehicles used hardest every day (dump trucks, the crew vans, the K2500, the supervisors' pickups, tunnel plant) carry the heaviest permanent layers and are never fully clean; the project manager's vehicle and visitors' cars are cleaner; a vehicle fresh from the wash bay is wet and clean and visibly dirties again through the day.
10. **Details that sell it:** mud-packed tyre treads that fling clods at speed and print the road; number plates and lamps partly obscured then wiped by the driver; wiper arcs through a dusty or muddy screen; muddy boot prints on steps and cab floors; a rag on the mirror; tracks clogged with clay; an excavator bucket polished bright on its edge and caked behind; a dump body with a tide line of dried load.
11. Machines standing idle gather their own signs: dust, fallen leaves on the bonnet, a spider's web at the mirror, bird droppings, a puddle and a rust stain beneath.

### People

12. **The same four kinds of dirt on people** (extending the P07b wear masks and P12d wetness), driven by where each person walks and what they do:
    - **Boots and legs:** dust to the ankle on dry days; wet mud to the height they waded, with splash spots higher up the trouser from walking; clay building up on soles so the walk changes slightly; dried mud flaking off; rubber boots shining wet, then dull.
    - **Work shows on the worker:** cement powder to the elbows and on the knees of masons; grey shotcrete freckles on the tunnel crew's faces, hard hats and shoulders; rust-orange on steelmen's gloves, forearms and thighs; soot and spatter burns on welders' sleeves; sawdust on carpenters; grease to the wrists on mechanics; slurry up to the knees on the mucking crew; a clean stripe on the forehead where the hard hat sat.
    - **Sweat and dust together:** dust sticks to wet skin and runs in lines down the neck and temples; a dark V of sweat on the chest with a pale salt edge once it dries; a clean wipe across the brow.
    - **Rain:** shoulders and thighs darken first; fabric clings and shows folds; hair plasters down; water drips from the hard-hat brim; raincoats bead and run; hands and faces shine; everything dries from the edges inward, cotton slower than raincoat.
    - **Hands and face:** dirty nails and palms on LOD0, a streak where a face was wiped with a dirty glove, reddened skin after a day in the sun, a healthy tan line at the collar and sleeve.
13. **Clean again:** the end-of-shift wash visibly removes it (boots hosed at the tap leaving a brown stream to the drain, arms and faces washed, a clean shirt), so the evening camp looks different from the working day; office staff stay clean unless they walk the site; Monday's fresh uniforms look newer than Friday's.
14. **PPE ages:** hard hats scuff and collect stickers and marker initials; vests fade and fray and their tape dulls with dirt; gloves wear through at the fingers; boots crease and lose colour at the toe.

### Making it run

15. Ground-state maps are small textures updated a few times a second on the GPU; vehicles and people sample them at their position. Soiling layers are a handful of numbers per vehicle or person feeding mask-driven shaders (no extra textures per individual). Persistent tracks use a tiled low-resolution map per road and yard. Everything scales by tier: Low keeps colour and gloss changes and drops deformation and track persistence.
16. Sound and effects follow the state: squelch, splash, crunch on dry gravel, the hiss of tyres on wet road, clods thumping in wheel arches, dust puffs, drips.
17. A debug view paints the moisture, water depth and looseness maps over the ground so the behaviour can be checked.

**Pass when.**
- [ ] One camera position on the access road, captured at each ground state in the table (bone dry through flood to drying), matches reference photographs of the site's roads in those conditions placed beside it.
- [ ] A vehicle driven the same route on a dry day and a wet day ends with visibly different dirt of the right kind and colour; rain rinses the upper panels and leaves the arches caked; the wash bay resets it.
- [ ] A labourer, a tunnel shotcrete operator, a welder and an engineer photographed at 16:00 on a dry day and on a wet day are each dirty in their own way, and clean at 19:00.
- [ ] A wet week followed by a dry week shows ruts forming, a gully cutting, silt collecting, then cracking and dust.
- [ ] The whole system costs less than 1.5 ms on Medium and nothing on surfaces out of view.
