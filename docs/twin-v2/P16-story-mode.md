# P16. Story mode: "Unang Liwanag" (First Light)

The owner asked (2026-10-10) for a story or campaign mode with missions, playable in the morning, by day and at night, with a horror feel at night, long enough that it cannot be finished in weeks, months or even a year. Story, genre and progression were left to the planner. This file is the design and the build plan.

**Where it sits.** Story mode is built **after P15** (the twin is finished and live first). It runs on top of walk mode and free roam (P13d to P13k) and uses every system before it. It is for signed-in accounts, not the public page.

**Read first, every P16 session:** this whole file; `TOOLBOX.md` ("Tripo AI": folklore beings and story objects); `P13-walk-mode.md`; `P09-routines.md`; `P12-living-environment.md`; `data/history.json`; `reference/INDEX.md`.

## 1. The idea

You arrive in April 2022 as a new hire on the first survey crew, when the site is forest, a river and a line on a drawing. You live through the real building of the project, year by year, work front by work front, as recorded in the monthly reviews, until the morning the plant first sends power to the grid. The site in the story is built up over time exactly as it was in reality: the P14b progress timeline is the world's backbone.

Three kinds of play share one world and one character, chosen simply by **when you play in the site's day**:

| Time | Name | Genre | What it is about |
| --- | --- | --- | --- |
| Dawn and morning (04:00 to 08:00) | **Umaga** | Cozy life story | People and place: friendships, families far away, the river, the garden, the animals, small kindnesses, the camp waking up |
| Day (08:00 to 18:00) | **Araw** | Career and construction drama | The work: your trade, your rank, deadlines, weather, breakdowns, safety, the real milestones |
| Night (18:00 to 04:00) | **Gabi** | Folklore mystery and horror | The mountain: things heard and seen after dark, drawn from Philippine folklore, as the works push deeper into the Sierra Madre |

The three braid together. A man you befriended in the morning is the one who goes missing at night; the delay his absence causes is your problem by day.

**The through-line.** The mountain and the river have a guardian. Roads, blasting and the diverted river disturb old things. Most of the crew half-believe, a few scoff, a few know. Over five acts you learn that the project can only be finished well if the people, the land and what lives unseen in it are all given their due. Nothing is defeated by force: the night is survived by nerve, light, knowledge and respect, and resolved by understanding what was wronged and putting it right.

**Three standings shape the ending:** **Tao** (your bonds with people), **Kalikasan** (how you treated the land and its animals), **Diwa** (how you dealt with the unseen). Free-roam behaviour counts: the man you punched remembers in the story too.

## 2. Characters

- **You:** your P13h character, starting as a helper with one bag and a borrowed hard hat.
- **The real staff** (from `people.json`, with their real faces, P07c): they appear as themselves in their real roles, as mentors, bosses and colleagues. **Rules for what the story writes for them:** their scripted dialogue is ordinary, kind and professional; the script never makes them victims, villains, possessed, or shown in embarrassing or frightening ways; a person can be left out of story scenes with `likeness.allowStory: false`. Scripted drama is carried by invented characters. (What the player chooses to do to anyone in the open world is a separate matter: section 4.)
- **Invented characters** (fictional names, generated faces), who carry the drama:
  - **Mang Isko**, an old guide from the barangay who walked these ridges as a boy; knows the trails, the stories and the right words.
  - **Aling Rosing**, the camp cook; the camp's memory and its best storyteller.
  - **Dado**, a hard-driving foreman who believes in nothing but the schedule.
  - **Engr. Mika**, a young engineer on her first project, your ally by day and a sceptic by night.
  - **Lolo Ambo**, the barangay's healer (albularyo), consulted when nights go wrong.
  - **Totoy**, a teenage helper who sees things others do not.
  - **Kuya Ben**, a veteran tunneller from an old mine, full of underground lore.
  - The night shift's **Three Marias** of the canteen, drivers, a rival basketball team from the weir camp, vendors at the lower gate.
- **The unseen** (section 6).

## 3. Structure and length

**Five acts, about sixty chapters**, following the real record:

| Act | Years | Title | Day story (from `history.json`) | Night story |
| --- | --- | --- | --- | --- |
| Prologue | Apr 2022 | Pagdating (Arrival) | The bus to Tumauini, the tricycle to the lower gate, the motorcycle ride up a track; first survey pegs | The first night in a tent: a sound nobody explains |
| I | 2022 to 2023 | Ang Daan (The Road) | Surveys and boreholes; cutting AR01 to AR05; landslides; cross drains; choosing and building the camps | The road at night: a figure at the blind bend, crews who drive in circles, a mound nobody will dig near |
| II | Late 2023 to 2024 | Ang Bundok (The Mountain) | Portals; the magazine; first blasts; driving Tunnel 1 and Tunnel 2; poor ground and steel ribs | The tunnels: knocking from the rock, a giant in the old balete tree by the portal, small miners who move tools, the guardian stirring |
| III | 2024 to 2025 | Ang Ilog (The River) | River diversion and cofferdam; the typhoon and the flood; weir, intake, desander; the satellite camp | The river: lights over the water, a voice at the pool, what the flood uncovered |
| IV | 2025 to 2026 | Ang Planta (The Plant) | Powerhouse excavation to roof; surge tank lifts; penstock; turbines arriving; switchyard; the line | The camp itself: someone seen in two places at once, black-outs, rumours from the barangay, a colleague who will not wake |
| V | 2026 to 2027 | Unang Liwanag (First Light) | Lining, gates, testing, filling the waterway, first spin, synchronising, first power at dawn | The guardian's reckoning; the longest night; and morning |

**Why it lasts more than a year.** Honest arithmetic, not padding:

1. **The main story** is about 60 chapters of 6 to 10 missions each. A chapter opens when your rank, relationships and standings are ready, so it is lived, not rushed. Expect roughly 200 to 300 hours.
2. **Twenty-five careers** (section 5), each a ladder of ranks with its own missions; mastering all of them is a long game on its own.
3. **Personal stories** for every named and invented character: five to eight steps each, advancing only as friendship grows.
4. **The site's real calendar.** Story mode can run on **real time** (recommended): the real date, hour, weather and moon decide what is available. Some things exist only then: a spirit that walks only on the new moon (thirteen chances a year), flowers and fish of one season, the December lanterns, Holy Week quiet, the fiesta, the anniversary of the typhoon, a meteor shower. Seeing everything takes at least a full year by design.
5. **Endless work:** daily and weekly jobs generated from the site's state (section 8), leagues, collections, records.
6. **It is added to in packs** (section 9): the framework is built once, then chapters, cases and careers are added one session at a time for as long as the owner wants.

A fast "Kuwento" pacing option compresses the calendar for players who do not want to wait; the default is real time.

## 4. Body, danger and consequence (story and free roam)

The owner asked for needs that cannot be switched off, and for realistic injury with blood when an action is severe.

- **Needs are always on:** hunger, thirst, tiredness, heat, and at night **kaba** (nerve). They are never switchable. Neglect brings shaking hands, blurred edges, slower work, mistakes, and finally collapse: you come to in the clinic, hours lost, the nurse unimpressed, a day's pay docked. Difficulty settings change how fast they fall, never whether they exist.
- **Health and injury:** falls, blows, burns, machinery, bites and blast effects cause injuries that match the cause: bruises that colour and fade over days, cuts and a split lip or bloody nose **with blood** on skin, clothes and knuckles when the blow or fall is severe, a limp, a sling, bandages the nurse applies and changes. Blood is shown as real blood behaves (it runs, soaks cloth, dries dark, marks the ground and washes off), without dismemberment or lingering gore.
- **For other people (owner's decision, 2026-10-10: any character can be hurt, as in an open world):** every person on the site, named staff with real faces included, can be struck, knocked down and injured, with blood when the blow is severe; mates carry them to the clinic; they return bandaged and do not forget. Severe violence brings the full site response of P13i and, in story mode, real consequences for the plot.
- **Critical injury and death (owner's decision, 2026-10-10: a person dies only when what happened is critical).** Each person has a hidden condition scale: unhurt, hurt, injured, badly injured, critical. Ordinary blows, falls and knocks never go past badly injured. **Critical** is reached only by events that would plausibly kill: being run over or crushed by a vehicle or machine, a fall from real height, being in the blast, a collapse of ground or load, drowning, electrocution in the switchyard, or a sustained beating of someone already down. A critical person is not dead at once: there is a window in which first aid by the right steps, the nurse, the stretcher and the ambulance run to the gate can save them (a mission in itself). If nobody acts, or the cause was beyond saving, the person dies.
- **Death is permanent and the site carries it.** Work stops. The safety officer and the project manager come running; the area is taped off; a report is written; investigators come up from town; the body is taken down the road. There is a **lamay** (wake) in the barangay with candles, coffee and card games through the night, a burial, a photograph and a hard hat left at the spot. The person is gone from the roster, their bunk is empty, their friends grieve for a long time and their gang is never quite the same. If the player caused it: arrest, days lost, standing destroyed, some people who will never speak to you again, and in the night story, a death that was your doing does not rest. A death by accident that you tried to prevent is remembered differently from one you caused.
- **Who can die (owner's decision, 2026-10-10): anyone.** The rule above applies to every person on the site without exception: invented characters, the unnamed crew, and named real colleagues modelled with their own faces. The owner has stated that the staff and workers concerned have given their approval. A person can still be opted out individually by setting `likeness.allowHarm` or `likeness.allowDeath` to false in their record; both default to true.
- **You can die too:** the same critical causes kill the player's character. In story mode that returns you to your last sleep, with the day lost; in free roam you wake at the clinic or the town hospital days later, weak, with a scar.
- **Real colleagues' likenesses:** treated like anyone else, with the owner's statement that they have approved. This content exists only in signed-in free roam and story mode, never on the public page or in presentation mode.
- **Animals:** react, flee, limp, bleed from a severe wound, and can die from a critical one (run over, a fall, a sustained attack) under the same rule; an animal's death costs Kalikasan heavily, its owner and the camp turn on you, and the camp dog is mourned like a person.
- **Site accidents in the story** (scripted ones) are told with weight, never played for spectacle, and involve invented characters only. Unscripted critical events in the open world follow the rule above.
- **Failure** in a mission means time lost, standing lost and another try, not a game-over screen.

## 5. Careers

Sign on at the admin window. Each career has ranks (helper to lead), a mentor, tools to earn, its own mission types and small games. You can hold one job at a time and change at pay-day. Rank in several careers opens story chapters.

| Family | Careers | What you do |
| --- | --- | --- |
| Site trades | Labourer; steelman; carpenter and formworker; mason and concrete finisher; welder and fitter; electrician; rigger and signalman; scaffolder | The trade's real tasks as short skill games: tying patterns against the clock, plumbing a form, reading a pour, a steady weld bead, signalling a blind lift |
| Tunnel | Mucker; driller's helper; jumbo operator; shotcrete nozzleman; **blaster** (licensed late) | Drill patterns, charging, the count, clearing, scaling, supporting bad ground before it comes in |
| Plant and transport | Driver (K2500, crew van, dump truck); equipment operator (excavator, loader, roller, crane); mechanic | Routes in all weather, loading cycles, recovery jobs, diagnosing a breakdown from its sound and symptoms |
| Survey and quality | Surveyor's aide to surveyor; geologist's aide (face mapping); QA/QC inspector (slump, cubes, checklists); quantity surveyor (measure and reconcile) | Setting out to millimetres, spotting the defect, rock class from the face, measuring what was really built |
| **Staff office** | **IT support; project manager's track (engineer to deputy to PM); document controller; AutoCAD operator; timekeeper; admin officer; HR officer; planning engineer; purchaser and expediter; warehouseman and storekeeper; accountant's clerk** | See below |
| Safety and care | Safety officer; nurse's aide; pollution control officer's aide | Spot-the-hazard rounds, permits, toolbox talks you give, first aid by the right steps, water sampling, wildlife log |
| Camp | Kitchen helper to cook; guard; camp maintenance; store-keeper of the camp store | Feeding 400 on time, the gate log and night rounds, keeping lights, water and drains working |

**Staff-office careers in detail** (the owner asked for these by name):

| Career | Missions and small games |
| --- | --- |
| IT support | Crimp and run cable; terminate a patch panel; set up the office network and the satellite link; fix the printer everyone needs before the monthly review; recover a dead laptop's files; **install the nine powerhouse CCTV cameras by the real drawing** (reference R1: route the cable, respect the lengths, terminate at the 2F rack) and the solar street lights; find why the camp wi-fi dies every night at two; guard the data through a brown-out |
| Document controller | Register, stamp and route incoming drawings; build a transmittal that will not bounce; catch the superseded revision before it reaches the site; find the one sheet the PM needs in three minutes; survive the month-end avalanche |
| AutoCAD operator | Redline to revision under a deadline; build a shop drawing from an engineer's sketch; an as-built from survey points; spot the clash between two drawings before concrete does |
| Timekeeper | The dawn head count at the gate and the portal tally; reconcile the daily time record against the foreman's list; catch a ghost on the payroll; overtime done right at midnight |
| Admin officer | Rooms, vehicles, visitors, permits, fuel and food for 500 people; a VIP visit with one day's notice; the generator has four hours of diesel left |
| HR officer | Hire a gang in a week from a line at the gate; onboard and induct; settle a quarrel between two men (a dialogue game with tempers); a homesick worker; a fair hearing after a fight; send-offs and welcomes |
| Planning engineer | Build the three-week look-ahead from the fronts' real state; recover a slipped activity; the rain cost four days, find them |
| Purchaser and warehouse | Chase the missing rock bolts by phone; receive, count and reject short deliveries; issue by chit; stock-take night |
| Project manager's track | The long ladder: from site engineer on one front to running the morning meeting, walking the client round, deciding with half the facts, a stop-work call, a typhoon order, the phone at 3 a.m. Decisions here move the whole site's day |

Each career's work is the real work of that job on this project, simplified to minutes. Internal figures (money, real incident counts) never appear; where a task needs numbers they are invented for the mission and marked as such.

## 6. Gabi: the night

- **Feel:** dread and beauty, not shock after shock. A dark you can barely see into, the forest loud then suddenly silent, a lamp that makes a small safe circle, things at the edge of sight, sounds that are almost explained. A few true frights, earned.
- **Kaba (nerve)** falls in darkness, alone, in bad places and bad hours; it rises by light, company, prayer, a hot drink, a dog at your side. Low nerve brings a racing heart, tunnelled vision, sounds that may not be real, a slower hand; at nothing, you bolt blindly or freeze, and wake where the others found you.
- **Light is life:** torch batteries, the cap lamp, a kerosene lamp, the generator's fuel, a candle. Black-outs matter.
- **What walks here** (from Philippine folklore; each written from documented sources recorded in `data/story/folklore.json`, treated with respect, never mocked):

| Presence | Where and when | How it is met |
| --- | --- | --- |
| Nuno sa punso | An earth mound on a road cut | Ask leave ("tabi-tabi po"), make amends for the dug mound, heal the man who fell ill |
| White lady | The blind bend of the access road, late | Learn who she was; drivers' accidents stop when the bend is marked and a lamp is lit |
| Tikbalang | The upper road and trails | Crews go in circles; wear the shirt inside out, keep your head, find the path; later, win its regard |
| Kapre | The great balete by the portal | The smell of smoke, a glowing ember high up, a huge shape; do not cut the tree; a bargain |
| Duwende | The tunnel and the old adit | Tools move, a voice knocks back; gifts returned; they warn of bad ground if respected |
| Santelmo | Over the river and the diverted channel | Fire-lights that lead astray or lead to what was lost |
| The river's lady | The deep pool above the weir | A voice and a face in the water; the flood's grief; an offering and a promise about the fish pass |
| Tiyanak | Forest edge near the satellite camp | A crying that must not be followed alone |
| Engkanto | The camp, Act IV | A friend seen in two places; who is real; do not eat what is offered |
| Bangungot and the visitor in sleep | The barracks | A colleague who will not wake; the night you sit up with him |
| Aswang rumour | The barangay below | Fear turning on an innocent neighbour; the horror is the crowd; the truth is human |
| The guardian | Everywhere, by signs: wind, animals, the eagle | Never fully seen; the last act is its judgment of how the work was done |

- **Tools of the night:** light, salt, garlic, a blessed candle, a rosary or an amulet from Lolo Ambo, Mang Isko's words, your dog, knowing when to walk and not run. They hold things off; only understanding ends a haunting.
- **Cases:** each night story is a case with clues by day (who fell ill, what was dug, what the old people say), encounters by night, and a resolution that changes the site (a shrine by the road, a tree left standing, a lamp that is always lit). About forty cases over the acts, some only on certain moons, seasons or weather.
- **A setting for intensity** (full, lighter, stories-only) changes frights and darkness, not the plot. Default: full.
- The works' ordinary night stays real around it: the night shift in the tunnel, the guards' rounds, the kitchen's light at four.

## 7. Umaga: the morning

Quiet missions with no danger and real stakes: walk the trail with Mang Isko and learn the birds; help Aling Rosing with breakfast for the dawn shift and hear a story; a letter and a video call for a man who cannot read well; teach Totoy to fish; plant the trellis; raise the camp puppy; find the best sunrise; repair a neighbour's roof in the barangay before the rains; morning mass and the market run on Sunday; a birthday surprise; someone's last day and a send-off. Morning is where friendships deepen and where the night's fears are talked through over coffee. Much of the Tao and Kalikasan standing is earned here.

## 8. Missions and the systems under them

- **Mission types:** build, inspect, measure, drive and haul, operate, repair, find and fetch, escort, rescue and recovery, investigate, persuade, endure, photograph, catch, cook, compete.
- **Kinds:** main story; career; personal (a character's own arc); case (night); calendar (only on certain dates, moons, weather); daily and weekly jobs generated from the live site state ("the pump at the weir sump has failed and rain is forecast for two", "three mixers are late and the pour cannot stop"); favours asked in passing.
- **Choices** with weight: speed against safety, a friend against the schedule, telling the truth in an incident report, leaving the tree or cutting it. Consequences return chapters later.
- **A journal** with objectives, a map, people met, cases open, things learned about the unseen, a calendar of what the season and moon offer.
- **Saving:** automatic, with several save slots, stored locally and exportable; optional account sync later.
- **Difficulty:** Magaan, Katamtaman, Mabigat (needs, damage, time limits, nerve). No setting removes needs.
- **Rewards:** pay, rank, tools, trust, keepsakes, rooms and privileges (a better bunk, a key, a vehicle), stories told to you, places shown to you.
- **Cut-scenes** use the in-world camera and the existing characters, voices by the P13g method with subtitles; every one can be skipped after it has been seen once.

## 9. Build plan

Each sub-phase is one session unless marked. Content after P16h is added in **packs**, one session each, for as long as wanted, drawing on `IDEAS-BACKLOG.md`.

### P16-0. Detailing pass (do this first; no code)
This file is a design outline, written quickly. Before anything is built, one or two sessions turn it into a full specification under `docs/twin-v2/story/`: a one-paragraph synopsis and mission list for every one of the sixty chapters, checked date by date against `history.json`; the full cast sheets; every night case with its clues, encounters and resolution and its folklore sources; each career's ranks, tasks and small-game rules; the dialogue style guide in Tagalog and English; the data formats for missions and dialogue; the save format; a list of every new animation, sound and model the story needs, with an effort estimate; and a risk list (what may be too heavy for a browser on the target laptop, and the lighter fallback for each). The owner reads and corrects it. **Pass when:** the owner has approved the story bible and the estimate.

### P16a. Story framework
Mission engine driven by data (`data/story/`: missions, triggers, objectives, dialogue graphs with choices and conditions, rewards); journal and objective display; save slots; the three time bands and real-time or Kuwento pacing; standings (Tao, Kalikasan, Diwa); difficulty. A ten-minute test chapter proves every piece. **Pass when:** the test chapter can be played, saved, reloaded mid-mission and finished on keyboard, gamepad and touch.

### P16b. Body, injury and consequence
Needs always on with collapse and clinic; health, injuries, blood and healing over days as in section 4; the consent flags for real likenesses; injury and treatment for others; story consequences of violence. **Pass when:** each injury type appears, is treated and heals; blood appears only on severe actions and never on a real likeness without the flag; needs cannot be disabled by any setting.

### P16c. Careers I: trades, tunnel, plant
The career system (ranks, mentors, pay, changing jobs) and the site, tunnel and plant careers with their small games. **Pass when:** one full rank can be climbed in each career.

### P16d. Careers II: the staff office, safety, camp
The staff-office careers in section 5 (IT support, document controller, AutoCAD operator, timekeeper, admin, HR, planning, purchasing, warehouse, the PM's track), safety, care and camp careers, set in the real office interior (P06a). **Pass when:** one full rank can be climbed in each; the CCTV installation mission follows drawing R1.

### P16e. The night framework and three cases

**Tripo models.** This phase's Tripo items were generated in the single Tripo month at P06a (`TOOLBOX.md`, "The Tripo month") and wait in `assets-src/twin/tripo/`. Clean them up and use them here. If something needed is missing, list it and ask the owner whether to buy one month of Pro 3k; never use Free-plan results. The owner liked the trial kapre (2026-10-14); it is regenerated in the Tripo month from `assets-src/twin/tripo/kapre/prompt.txt`, so start the night beings with it.
Kaba, light and fuel, darkness tuning, the presence behaviours (watching, following, luring, blocking, fleeing light), sound design for dread, the case structure, folklore sources file; cases: the mound on the road cut, the bend, the tikbalang's road. **Pass when:** each case plays from first clue to resolution and leaves its mark on the site; intensity settings work.

### P16f. Prologue and Act I: Ang Daan
The world at April 2022 (forest, river, pegs, a tent camp) through the roads and the first camp; about twelve chapters across morning, day and night; the invented cast introduced. **Pass when:** playable start to finish; the site's state at the end matches `history.json` for late 2023.

### P16g. Morning stories and personal arcs
The morning mission set; the friendship system's story steps; the first personal arc for each invented character and for each consenting real colleague. **Pass when:** ten morning missions and six personal arcs are complete.

### P16h. The endless layer
Generated daily and weekly jobs from site state; calendar missions by date, moon, season and weather; leagues and records; collections; the year wheel in the journal. **Pass when:** a simulated real-time year surfaces every calendar item at its time and generates varied jobs without repeats inside a week.

### Packs (P16-pack-N, added indefinitely)
One session each, in any order the owner chooses: an act's next six chapters; three night cases; one career's upper ranks; four personal arcs; a season's calendar set. Acts II to V are delivered this way (about eight packs). Each pack lists what it adds in `STATE.md`.

## 10. Guard rails

- Story mode never changes the twin's presentation mode or the public page.
- Real people: consent flags, kind portrayal, no invented facts about their lives.
- Folklore: sourced, respectful, no real community or belief mocked; the barangay is fictionalised.
- Real accidents and real incident figures are not used; the typhoon and landslides appear because the monthly reviews record them.
- No real money, no purchases, no online play.
- Performance budgets still apply; night is the cheapest time to render and may spend its budget on atmosphere.
