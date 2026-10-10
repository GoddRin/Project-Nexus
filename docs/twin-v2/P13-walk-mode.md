# P13 (continued). Walk mode: explore the site on foot

Eight sessions: **P13d to P13k.** They run after P13c and before P14a.

The owner asked (2026-10-10) to walk or run around the project as a character, in first or third person. This replaces v1's "GTA mode" with something built for the purpose. The orbit view stays the default; walk mode is a second way to be in the same world, entered and left at any time.

What it must feel like: you arrive at the gate as a visitor in a hard hat and vest, the guard looks up, and you can walk anywhere a real visitor could: down the access road, through the powerhouse, up the penstock stair, into the tunnel, along the weir. Workers are busy around you and notice you. It is a site visit, not a game with goals.

## Design decisions

- **You are a visitor, not a named employee.** The player picks one of a few visitor avatars (from the P07 bodies, male and female, in a white visitor hard hat, visitor vest and safety shoes). Named staff are never playable.
- **Three ways to move**, because the audience ranges from gamers to people who have never used WASD:
  1. keys and mouse (or gamepad) for direct control;
  2. **click or tap the ground and the avatar walks there** by itself along the navmesh;
  3. a touch joystick on phones.
- **One site at a time.** Walking stays inside the current location. Travel between locations is by boarding the crew van at its stop (a short ride cut-scene that can be skipped) or by the scheme map.
- **Real site rules apply, gently.** Some zones are closed to visitors (the blast zone during charging and firing, the live switchyard yard, open excavation edges, the river). Reaching one shows a short reason ("Blasting in progress: wait at the refuge") and an invisible barrier, never a penalty.
- **Two modes.** Visitor mode (below) has polite limits and is what the public gets. Free roam (P13i) is the owner's: no limits, real consequences.
- **No fail states, no health, no score.** You cannot fall off anything or get hurt; edges have collision. A "bring me back" button always returns you to the last safe spot.
- **Rule 8 still holds:** Escape leaves walk mode and returns to the orbit overview from anywhere.

## P13d. Character controller, cameras, input

**Needs.** P07d, P08c, P09a, P13a.

**Read first.** `engine/camera.tsx`, `engine/loop.ts`, `characters/Character.ts`, `characters/animation/controller.ts`, `sim/world.ts` (navmesh), `CONTRACTS.md` section 5; v1 `GTAPlayerController.tsx` and `gtaRuntime.ts` only to see what the owner had before.

**Steps.**
1. **Collision world** (`explore/collision.ts`): each zone exports a simplified collision mesh (`COL_` objects in the master scene: floors, walls, stairs as ramps, railings, vehicles' footprints). P05 and P06 author these from now on; for zones already built, generate them from LOD2 and hand-fix stairs and doorways. Build one `three-mesh-bvh` per loaded zone; add and remove with streaming.
2. **Controller** (`explore/controller.ts`): a kinematic capsule (radius 0.3 m, height from the avatar) moved with shape casts against the BVH. No physics engine. Requirements:
   - walk 1.4 m/s, brisk walk 2 m/s, run 4.5 m/s (hold Shift or push the stick fully), slow walk on a modifier; acceleration and turning that feel weighted, not instant;
   - step up to 0.3 m without jumping; climb slopes to 40 degrees, slide back above that; stairs feel smooth (treated as ramps);
   - a small hop for kerbs (Space), no parkour;
   - crouch under low obstacles such as formwork and tunnel ducting (C);
   - ladders: an interact prompt at marked ladders, then a climb clip along the ladder line;
   - shallow water (puddles, the river edge to ankle depth) slows you and splashes; deeper water is a closed zone;
   - doors are opened by the player with a key press or a tap (P13h builds the full set; until then a simple open on interact), the same doors the workers use;
   - moving ground: standing in the crew van or on a moving platform carries you with it.
3. **Animation:** drive the P08c controller with player intent instead of sim intent: idle, walk, run, turn in place, start and stop, stairs, crouch, ladder, with foot IK and speed-matched playback so feet do not slide. Idle fidgets after a few seconds. In rain the avatar raises an umbrella or wears a raincoat (owner's setting).
4. **Cameras** (`explore/cameras.ts`), toggled with V:
   - **Third person:** over-the-shoulder spring arm about 3 m back, pulled in by collision so it never passes through walls, with a little lag; closer and lower indoors and in the tunnel; shoulder swap key.
   - **First person:** camera at eye height on the head bone with the head mesh hidden for that camera only; the body, arms and shadow stay visible when you look down; subtle head bob that is off under reduced motion; field of view 70 to 90 adjustable.
   - Look with the mouse under pointer lock (click the view to capture, Escape to release), right stick on a gamepad, drag on touch.
5. **Input layer** (`explore/input.ts`): one action map (move, look, run, crouch, hop, interact, flashlight, toggle view, map, photo) bound to keyboard and mouse, gamepad (standard mapping) and touch (left joystick, right-side look drag, three buttons). Rebindable keys and sensitivity, invert-Y, and hold-or-toggle for run, saved locally.
6. **Click-to-walk:** in walk mode without pointer lock, clicking or tapping the ground plans a navmesh path and the avatar walks it, drawing a faint line; clicking a person, door or object walks to it and interacts. Any direct input cancels the path.
7. **Entering and leaving:** an **Explore on foot** button on the dock and on each place card ("Walk here"). Entering fades to the nearest spawn point (authored `SPAWN_` empties: each gate, each building entrance, each portal). Leaving restores the orbit camera looking at where you stood. Store: `mode: "orbit" | "walk"`, `player: { avatar, view }`; URL `?walk=1&spawn=<id>`.
8. **Detail at eye level:** walk mode forces LOD0 near the player, loads interiors on approach, and narrows the draw distance so the budget holds; measure it.
9. **Never stuck:** a "Bring me back" button and automatic recovery if the capsule is below terrain or has not found ground for a second.

**Pass when.**
- [ ] A lap of the powerhouse location on foot (gate, road, powerhouse ground floor, stair to the second floor, turbine floor, penstock stair, back) completes with no snag, no falling through, and no camera passing through a wall.
- [ ] Motion checklist passes for the player avatar in both views.
- [ ] All three input methods complete the same lap; click-to-walk reaches every spawn point.
- [ ] Escape returns to orbit from pointer lock, from a ladder and from inside a building.
- [ ] Medium budget holds at eye level in the busiest spot.

## P13e. The living site around you: interaction, rules, guidance

**Needs.** P13d, P09d.

**Steps.**
1. **Interact (E, or tap):** a small prompt appears on anything usable within reach and in view.
   - **People:** the inspector opens with their card and what they are doing; they turn and nod or wave. Named staff give one line about their work, taken from their role description in `people.json` (written text, no generated speech and no invented facts).
   - **Equipment and structures:** the same inspector the orbit view uses, with real records.
   - **Signboards, drawings on tables, the whiteboard, the progress board:** a readable close-up panel. The site progress board at the office shows the real percentages from `progress.json`.
   - **Seats, benches, railings:** sit or lean and watch.
2. **The site reacts to you** (small additions to the sim, all cheap):
   - the guard stops you at the gate, checks your visitor pass with a short animation, and waves you in;
   - workers glance at you when you pass close, step aside on narrow walkways, and a foreman signals you to wait when a load is being lifted overhead;
   - a safety officer points at your hard hat if you took it off in the office and walked out without it, and the avatar puts it on;
   - the camp dog follows you for a while; chickens scatter; birds flush from the road ahead;
   - vehicles slow, sound the horn once, and wait for you to clear the road.
3. **Site rules as closed zones** (`data/zones-closed.json`: volume, reason, when): blast exclusion during charge and fire (you are held at the refuge and can watch the cycle from there), suspended-load areas while a lift is in progress, the live switchyard yard behind its fence, excavation edges, deep water, rooms marked private. Each shows a one-line reason in the site's own safety wording.
4. **Finding your way:**
   - a compass strip and a small round map with north up, your heading, nearby people, vehicles and place markers; M opens the location map;
   - **Go to:** pick any place or person from the dock or search and a ground line leads you there (navmesh path); arrival is announced;
   - street-sign style markers at junctions, as a real site has.
5. **Comfort and light:** F toggles a hand torch or cap lamp, needed in the tunnels and at night; exposure adapts as in the orbit view; reduced motion removes bob, sway and shake; a field-of-view and a camera-distance slider.
6. **Sound from your position:** footsteps by surface (gravel, concrete, mud, steel grating, timber, shallow water), cloth and gear rustle, breath after a run, the tunnel's reverb closing in, machines getting louder as you approach, rain on your hard hat.
7. **Traces:** footprints in mud that fade, wet boot prints on concrete after rain, puddle splashes.

**Pass when.**
- [ ] Every named person, every tagged equipment item and every signboard can be interacted with on foot.
- [ ] Each closed zone stops the player with its reason and never traps them.
- [ ] "Go to" leads correctly to ten random targets across three locations.
- [ ] No reaction leaves a worker stuck or off their activity afterwards.

## P13f. Rides, guided visits, extras

**Needs.** P13e, P10b.

**Steps.**
1. **Ride the crew van:** wait at a marked stop, board when it arrives (door opens, you sit), ride its real route with a free-look camera, get off at any stop. Boarding a van bound for another location plays a short road sequence and loads that location; it can be skipped.
2. **Drive a site pickup:** enter a parked pickup (not one in use), drive on the access roads with simple, forgiving handling (steering, throttle, brake, reverse, handbrake; no damage; speed capped at the site limit; the horn works). Third-person chase and in-cab views. Site traffic gives way; the gate guard still stops you. Pressing the exit key parks and gets out. Motorcycles and heavy equipment are not drivable.
3. **Guided visits** (`data/visits/*.json`), each a walking route with stops and captions drawn from the inventory and progress data, started from a board at the gate or from the dock, pausable and abandonable at any step:
   - **Visitor induction:** gate, PPE point, muster point, clinic, office (5 minutes);
   - **Follow the water on foot:** one stop per structure in the current location, continuing by van to the next location;
   - **A day on site:** the clock speeds up between stops so you see the toolbox meeting, a concrete pour, the lunch queue and the night shift;
   - **Inside the powerhouse:** turbine floor, both units, control room, tailrace deck.
4. **Shadow a worker:** choose a named person and walk behind them through part of their day; the route line follows them, and leaving them ends it.
5. **Site passport:** an optional checklist of places visited, things seen (a pour, a blast from the refuge, the rooster at dawn, fireflies by the river) and animals spotted, stored locally. Light-hearted, no scores, hidden unless opened.
6. **Photo mode on foot:** freeze the moment, detach the camera a few metres, pose the avatar from a small set (thumbs up, pointing, arms folded), export with the SCIC footer.
7. **Benches with a view:** a few authored viewpoints where sitting down plays a slow look-around of the valley, with the place name and elevation.
8. Add walk mode to the first-visit hints and the keyboard help; add its settings to More.

**Pass when.**
- [ ] Van ride between two locations works with and without skipping.
- [ ] A drive from the gate to the powerhouse and back hits nothing it should not and cannot leave the road corridor.
- [ ] Each guided visit completes, and can be abandoned at every stop.
- [ ] Walk mode works on a phone-size touch viewport with the joystick and with tap-to-walk.
- [ ] Budget holds while driving at the speed cap.

## P13g. Voices: people who greet, answer and react in Tagalog and English

**Needs.** P13e, P08e, P12b.

The owner asked (2026-10-10) for staff and workers to **speak**, in Tagalog or English, with fitting words and movement when the visitor interacts with them or bumps into them. This sub-phase gives the site a voice. Everything said is short, polite and true to a Filipino construction site; nothing invents facts about a real person or the project.

**Read first.** How the Atlas Navigator already does speech in this repo: `components/atlas/ai/navigatorLines.ts` (Tagalog and English lines, the TL/EN language switch stored under `atlas.navigator.language`), `lib/atlas-ai/` speech services and `voice-bank/` with `scripts/build-voice-static.mjs` (lines pre-generated to audio files and served as static clips), `useLipSync`. Reuse the approach: **a fixed set of written lines, turned into audio files ahead of time**, never generated live on a visitor's device.

### Where the voices come from (free options, best first)

1. **Recorded real voices** (recommended): colleagues on site read the line list into a phone in a quiet room, 20 minutes each. Nothing sounds more like the site, it costs nothing, and several different people give natural variety. Only with each person's consent, and a recorded voice is never attached to a named person's character unless that person agrees.
2. **Pre-generated speech** for whatever is not recorded: the repo's existing Gemini voice route already pronounces Tagalog and caches clips; a free Azure Speech account offers Filipino (`fil-PH`) and Philippine-English (`en-PH`) voices: the owner would create that account; check current free limits. Generate once, save as files, ship the files.
3. Pitch and speed variation at playback so a handful of voices sound like many people.

Subtitles always show (speech bubble above the head, and a caption line), so the feature works muted. A setting chooses **Taglish (default), English only, or Tagalog with English subtitles**, the last useful when showing the site to foreign visitors.

### What people say (write the full list in `data/lines.json`; each line has Tagalog and English forms, a context, who may say it, and a matching gesture clip)

| Context | Examples (Tagalog / English) |
| --- | --- |
| Greeting by time of day | "Magandang umaga po!" / "Good morning, sir!" · "Magandang hapon po." · "Magandang gabi po, ingat po kayo." |
| Passing on the road | "Sir, good morning po." · a nod and "Boss." · "Ingat po sa daan, madulas." (Careful, the road is slippery.) |
| You bump into someone | First time: "Ay, sorry po!" with a step back and a raised hand · "Uy, dahan-dahan lang po." (Easy there.) · carrying a load: "Tabi-tabi po, mabigat ito!" (Make way, this is heavy!) · bumped again and again: a laugh and "Sir naman, o." · from behind while they work: startled, then "Nagulat ako ah!" |
| You stand in the way of work | "Excuse po, dadaan lang." · a signalman's whistle and "Sir, sa gilid po muna, may lifting." (To the side please, lifting in progress.) |
| Safety | "Sir, hard hat po." with a tap on their own hat · "Bawal po dito, blasting area." · "Dito po ang daan." (This way.) pointing · at the gate: "Good morning po. ID at logbook po muna." |
| Asked what they are doing | Built from their current activity: "Nagtatali po ng rebar para sa slab." / "Tying rebar for the slab." · "Nag-iinspeksyon lang po bago mag-buhos." (Inspecting before the pour.) |
| Asked the way | "Diretso lang po, tapos kanan sa warehouse." with a point; a ground line appears |
| Weather and the day | "Ang init ngayon, ano po?" (Hot today, isn't it?) wiping the brow · "Uulan na naman yata." (Looks like rain again.) looking up · "Maputik po diyan, sir." (It's muddy there.) |
| Meals and breaks | "Kain po tayo!" (Come eat with us!) raising a spoon · "Kape muna, sir?" · "Merienda po." |
| Evening camp | "Upo ka muna, boss." (Sit a while.) patting the bench · in the full evening setting: "Tagay muna!" offering the glass; in the soft setting: "Softdrinks, sir?" · a cheer at a basket: "Pasok!" |
| Leaving | "Sige po, ingat." · "Salamat po." · a wave |
| Animals' owners | "Mabait po 'yan, hindi nangangagat." (He's friendly, he doesn't bite.) about the dog |

Rules for the writing: polite forms (po, opo, sir, ma'am, boss) toward the visitor; workers are warm and a little teasing, staff are courteous and brisker, the guard is formal; no swearing, nothing mocking; lines that refer to the work are generated from the real activity so they are always true; named staff use role-appropriate general lines only.

### How a conversation feels

1. **Approach and notice:** within a few metres the person looks up, turns the head and shoulders, and greets if you face them (not every time: people who have greeted you today just nod).
2. **Interact (E or tap):** they stop if it is safe to stop (a man holding a load says "Sandali lang po" and finishes first), turn to face you, and a small menu offers: **Greet · What are you doing? · Where is…? · Take a photo together · Goodbye**. The answer plays with voice, subtitle, a gesture clip and jaw movement driven by the audio.
3. **Bump:** the body reacts first (a step, a flinch, a hand out, a stumble if carrying something light; heavy loads and machines never get knocked), then the line. Reactions escalate gently and reset after a while. Nobody falls, drops anything dangerous or gets angry.
4. **They talk to each other too:** short exchanges between workers as you pass (a call for a tool, a joke, a count for a lift, a foreman's instruction), heard clearly close up and as a murmur further away; radio chatter from supervisors' belts; the canteen's hum resolving into words as you walk in; the toolbox-meeting speaker audible across the court.
5. **Memory within a visit:** people remember that you greeted them, that you helped them, or that you keep bumping them, and their next line reflects it.
6. **Volume and space:** voices come from the speaker's position, fade with distance, are muffled through walls and echo in the tunnel. At most a few voices play at once, nearest first.

**Pass when.**
- [ ] Every context in the table has at least four lines per language, each with audio, subtitle and gesture.
- [ ] Walking the camp at 07:00, 12:00 and 20:00 produces greetings and chatter that fit the hour, with no line repeating within a minute.
- [ ] Bumping ten different people gives varied physical and spoken reactions, none hostile; a person carrying a heavy load is never displaced.
- [ ] "What are you doing?" always matches the person's actual activity.
- [ ] The language setting switches voice and subtitles everywhere; muted play still shows every line.
- [ ] Recorded voices have a consent note per speaker in the credits file.

## P13h. An interactive world: doors, objects, things to do

**Needs.** P13g, P06 (buildings with separate door and window parts).

The owner wants to open doors himself, and beyond presenting the site, to **quietly play in it**: explore, try things, and have fun with his own character. This sub-phase makes the world answer to the hand and adds things to do. All of it is optional and unhurried; nothing has a timer, a score to beat, or a way to fail.

### Doors and openings (the owner's request)

- **You open doors yourself:** walk up, a prompt appears (**E** on a keyboard, **tap** the door on a phone, a button on a gamepad), and the avatar reaches for the handle, pushes or pulls, and walks through. No door opens just because you came near (this replaces the automatic doors in P13e for the player; workers still open them for themselves the same way).
- Every kind animates properly with its own sound: hinged doors that swing away from you whichever side you are on, with a handle turn and a latch click; sliding doors and windows; double doors; screen doors that slap shut on a spring; the warehouse roller shutter that rattles up while you hold the key; the sliding yard gate; the boom barrier (the guard raises it); cabinet and locker doors; drawers; the lid of the tool box; vehicle doors, tailgates and bonnets; a manhole cover lifted with a bar.
- Doors **close** too: you can shut them behind you, some close themselves slowly, a gust slams a loose one, a worker closes one you left open.
- Real-life touches: knock first (the person inside says "Pasok po!"); a toilet door that is occupied; the office locked after hours so you see the dark room through the glass, and the guard can let you in; a door that sticks in the wet season; light spilling out when a door opens at night; cool air and the hum of the air-conditioner when you enter the office.

### Things your hand can do

Switch lights and fans on and off; open a tap and wash your hands or boots; fill and drink from the water dispenser; sit on any chair, bench, step or bunk and lie down on your bunk; pick up, carry and put down small objects (a hard hat, a clipboard, a ball, a bucket); press the truck's horn; ring the camp bell or sound the triangle for meals; flip through the logbook at the gate; wipe the whiteboard; turn the radio or the videoke set on; open an umbrella; switch your cap lamp and torch; take things from your locker.

### Your own character

- **Make it yours:** choose body, face, skin tone, hair, and a name for the ID card; a wardrobe at your locker with site clothes from the P07 library (visitor kit, engineer's jacket, worker's long-sleeve, raincoat, off-duty clothes); hard-hat colour follows the site rule for the role you pick.
- **A bunk and a locker** in the camp that are yours: sleep to pass the time to dawn, dusk or the next shift; keep found objects there.
- **An emote wheel:** wave, thumbs up, salute, point, clap, laugh, shrug, stretch, sit on the ground, squat, dance a little, pose for a photo.
- First- and third-person views, photo mode and the site passport from P13d to P13f all apply.

### Things to do (each a small, self-contained activity started by walking up and interacting)

| Kind | Activities |
| --- | --- |
| Join the work (light, guided, optional) | Help carry a timber or a pipe with a worker on the count; hold the prism pole for the surveyor and watch the reading come in; hand tools up to a man on a ladder; tie a few rebar crossings; shovel aggregate into the mixer; hose down a truck at the wash bay; hand out water on a hot afternoon; help push a bogged pickup; walk the safety officer's round and tick the checklist; raise the flag on Monday morning |
| Drive and ride | The 4x4 pickup and the K2500 on the site roads; an underbone motorcycle (helmet on first); a ride in the back of the crew truck; a seat beside the operator in the excavator cab while he works; a supervised try at the excavator's controls in a marked practice pit with a pile of soil (simple two-stick digging, no hazards) |
| Fly the drone | Take the monthly-progress quadcopter from its case at the office, fly it over the works with a live camera view, take aerial photos; it returns by itself on low battery or if you leave it |
| Play | Shoot hoops on the court alone or join the evening game; cards or dama at a table in the barracks; videoke (pick a song, the room claps whatever happens); strum the guitar in the evening circle; skip stones and fish with a hand line at the river; kick a ball about with the off-duty crew |
| Eat and rest | Queue at the canteen, take a tray and sit with a gang who make room; coffee at the pantry; share food at the evening circle; a nap in a hammock; watch the sunset from a bench with the valley below |
| Animals | Pet and feed the camp dogs (one may adopt you and follow); feed the chickens; scratch the carabao's neck; watch wildlife through binoculars from a quiet spot and add it to the passport; photograph birds with the long lens |
| Garden | Water the vegetable patch, pick a ripe gourd and bring it to the kitchen, where the cook thanks you |
| Explore | Hidden corners worth finding: a small waterfall up a side stream, a lookout rock above the surge tank, a shrine by the road, the old survey marker from 2022, a hornbill's nesting tree; each adds a stamp and a short note |
| Time and weather | Sit and choose "wait until…" (dawn, noon, dusk, night); get caught in the rain and run for a shed with everyone else; watch a blast from the refuge; ride out a storm in the barracks with the lamps swinging |
| Keepsakes | A photo album of pictures you took; the passport stamps; a few friendly "firsts" noted quietly (first pour watched, first night shift visited, first fish) |

### Keeping it right

- In visitor mode the site stays a workplace (free roam, P13i, lifts every limit below for the owner's character): you cannot disrupt real work (workers carry on or politely ask you to step aside), operate machines outside the practice pit, enter closed zones, or do anything unsafe. Play fits around the work.
- Everything interactive is data (`data/interactables.json`: object, action, prompt text in both languages, animation, sound, effect), so adding one more is cheap.
- Everything works with keyboard and mouse, gamepad and touch; prompts show the right key or a tap icon.
- A presentation switch in More hides the play features (wardrobe, games, drone) for formal demonstrations, leaving the walk, the doors and the conversations.
- Cost: interactables sleep until the player is near; activities load on demand.

**Pass when.**
- [ ] Every door in the powerhouse location and the main camp opens and closes by key and by tap, from both sides, with animation and sound, and can be shut behind you.
- [ ] Each row of the activities table has at least two activities working end to end on keyboard, gamepad and touch.
- [ ] Character customisation persists between visits (stored locally).
- [ ] No activity can block a worker's routine or leave an object where it stops traffic.
- [ ] The presentation switch hides all play features and nothing else.
- [ ] Budget holds on Medium with the player doing each activity.

## P13i. Free roam: the owner's character can do anything, and the site reacts

**Needs.** P13h.

The owner asked (2026-10-10) for an exception to the "site stays a workplace" limits for **his own character**: go anywhere, do anything at will, disturb people at work, punch and otherwise interact with people, animals and objects, and have the site react as the real world would, including workers who get upset when bothered again and again.

**Two modes of the same walk mode.**

- **Visitor mode** (P13d to P13h as written): polite limits, for the public and for presentations.
- **Free roam:** no limits on where you go or what you touch; actions have believable consequences instead of invisible walls. **Default access: signed-in owner and admin accounts only, never the signed-out public page** (the characters include real, named colleagues with their photographs, and a public visitor should not be able to hit them). The owner can widen or narrow this in settings; record the choice in `DECISIONS.md`.

**Tone (owner's decision, 2026-10-10: realistic, with blood when an action is severe).** Light contact gets reactions only. A hard punch, a fall or a machine can bloody a nose, split a lip, bruise and knock a person down, with blood shown as it really behaves; the injured are carried to the clinic and return bandaged. Any character can be hurt, named staff included (owner's decision). A person dies only when what happened to them is critical (owner's decision): the full rules, the rescue window, and the aftermath are in `P16-story-mode.md` section 4 and apply to free roam as well.

### What your body can do in free roam

| Action | Details |
| --- | --- |
| Hands | Tap a shoulder, poke, shove, **punch** (light jab and a harder swing), slap a back in friendship, high-five, hug, pull someone by the arm, block a doorway |
| Feet and body | Kick (objects, a ball, a tyre), shoulder-barge, trip over things, sit or lie anywhere, climb onto anything climbable (truck beds, scaffolds, rocks, roofs by ladder), jump down from a height and roll, swim in the river pools, wade the stream |
| Objects | Pick up, carry, throw, drop, stack, push and tip over anything loose: cones, barriers, buckets, drums, chairs, tools, hard hats (take one off a worker's head), a tray of food, the basketball; ring, bang, honk, spray, switch, unplug |
| Tools | Use any hand tool for real: swing a hammer, dig with a shovel (leaves a hole), cut with the grinder (sparks), weld with a mask (an arc and a bead on steel), spray a mark with the paint can, hose things down, start the generator, fire up the videoke at 3 a.m. |
| Machines | Start and drive **every** vehicle and machine anywhere: pickup, K2500, crew van, motorcycle, dump truck (raise the bed), loader, excavator (dig real trenches in soft ground, load a truck), roller, water truck (spray the road or people), boom truck, the jumbo in the tunnel, the powerhouse overhead crane from its pendant |
| Places | Every closed zone opens: the switchyard, excavation edges, the blast area, private rooms, roofs, the magazine compound |

### How people react (a mood and memory model per person)

Each person carries `mood` (calm, wary, annoyed, angry, afraid, amused) and a memory of what you did to them and near them today, with a temper that differs by person (patient, short-fused, joker, timid, stern). Reactions build in steps, as in life:

1. **First disturbance** (bumped, blocked, something taken): surprise, a polite "Sir, nagtatrabaho po kami." and they carry on.
2. **Again:** a frown, a sharper "Sir naman!", hands spread, they move their work away from you, a look exchanged with a mate.
3. **Persisting:** they stop, turn square to you, raise the voice: "Ano ba, sir?! Tigilan mo na 'yan!"; the foreman walks over and stands between you; others stop to watch.
4. **Shoved or punched:** it depends on the person. Some stagger back holding the spot and stare, hurt and shocked; some shove you back hard; a short-fused one swings back; friends pull him away and hold him; a timid one backs off with hands raised; a joker laughs it off the first time only. Bystanders shout "Hoy! Hoy!", a few step in to separate you, someone runs for the safety officer.
5. **Afterwards:** the person you hit avoids you, glares, refuses to answer ("Wala akong sasabihin sa'yo."), and tells others; his gang goes cold on you too; conversations stop when you walk up; the canteen table has no seat for you.

Other reactions by kind of mischief:

- **Taking a hard hat or tool:** he chases you a short way calling for it back, then reports it; give it back and he calms.
- **Tipping things over, blocking the road, spraying people:** annoyance, a group clean-up, the foreman's lecture.
- **Entering a closed zone:** shouts and whistles, a safety officer runs after you waving, work stops there until you leave (a stop-work, as in reality).
- **Driving badly:** people leap aside and yell, traffic stops, the guard radios it in; dent a parked truck and its driver comes over furious, inspecting the damage.
- **Being in the blast area at firing:** the blaster refuses to fire while you are seen there; if you hide and it fires, you are thrown down, the screen whites out with ringing ears, and you wake on the clinic bed with the nurse and a very angry safety officer.
- **Being kind instead** has the opposite ladder: help, greet, share food, bring cold drinks on a hot day, and people warm to you, call you over, save you a seat, teach you things, cover for you.

### The site's response (escalating, never a game-over)

Word spreads by gang, then site-wide. A **standing** value for your character moves between welcome and unwelcome:

| Standing | What happens |
| --- | --- |
| Welcome | Greetings, invitations, help offered |
| Noticed | The safety officer has a word with you; the foreman keeps an eye on you |
| In trouble | A written incident report (you see it filled in at the office, marked simulated); the guard confiscates the vehicle keys; the project manager calls you into his office for a talking-to you must sit through |
| Unwelcome | The guards walk you to the gate and you are put on the next van; you re-enter the next morning with a warning; some people stay cold for days |

**Making amends:** apologise in person (they may not accept at once), return what you took, help the gang you disrupted for a while, bring merienda, sit through the safety re-orientation. Standing and individual moods recover with time and good acts. A **reset** in settings wipes mischief instantly, and nothing done in free roam ever shows in visitor mode or to the public.

### Animals react too

Pet, feed, call, shoo, chase, pick up small ones (a chick, a puppy, a cat that may scratch), ride the carabao if its owner allows, lead a goat by its rope. Bother them and they behave as animals do: a dog yelps, runs, and the pack barks at you and keeps its distance for days, or a protective one snaps and you jump back; a cat hisses and scratches; a rooster flies at you; the carabao swings its head and you are shoved off your feet; macaques scream, bare teeth and steal your food later; a monitor lizard whips its tail and bolts; birds flush. Hitting an animal upsets the people who see it (the cook, the guard whose dog it is) as much as hitting a person. Kindness works here as well: the dog you feed every day waits for you at the gate.

### The world shows what you did

Holes you dug stay until the road gang fills them; knocked-over cones are stood up by the next worker; a truck you parked across the road causes a queue and horns; mud you sprayed is on the people you sprayed; a dent stays on a vehicle until the motor pool fixes it; work you interrupted finishes late and the foreman notes it. The site puts itself right over hours or a day, visibly, by people doing it.

**Pass when.**
- [ ] The five-step reaction ladder plays correctly for a patient, a short-fused and a timid person, with voice, body and bystander response.
- [ ] A light blow produces a reaction only; a severe one produces visible injury with blood under the rules of P16 section 4 (on anyone, unless that person has been opted out with `allowHarm: false`); either way it always produces a reaction, and changes that person's behaviour toward you for at least the rest of the day.
- [ ] Standing moves through all four levels and back by making amends; the gate escort and next-morning return work.
- [ ] Every vehicle and machine can be started and driven; every closed zone can be entered; each triggers its site response.
- [ ] Each animal group has a kind and an unkind reaction that fits the species.
- [ ] Free roam is unreachable signed-out; visitor mode is unchanged by anything done in free roam; reset restores everything.

## P13j. Living there: body, belongings, work, money and friends

**Needs.** P13i.

More of what makes it feel like being a person in a real place. Needs are **always on and cannot be switched off** (owner's decision, 2026-10-10, for challenge); difficulty changes how fast they fall, never whether they exist.

- **A body you notice:** your own hands and arms doing every action in first person; breathing that quickens after a run and settles; a heartbeat when startled by the blast; slipping a step on wet mud or a wet steel plate; squinting adaptation leaving the tunnel; shivering in the cold dawn and breath fog; sweat, dust, mud and wet clothes on your own character exactly as on the workers (P12g), washed off at the tap or the shower; a reflection in windows, puddles and the truck mirror; your shadow.
- **Needs, always on:** hunger, thirst, tiredness and heat. Ignored, they slow you, shake your hands, blur the edges and cause mistakes; ignored to the end, you collapse and come to in the clinic with hours lost. Fixed by eating at the canteen, drinking at a water station, resting in shade, sleeping in your bunk. A hot noon shift really is harder than a cool morning.
- **Pockets and a locker:** carry a few things (hard hat, gloves, torch, radio, tape, phone, snacks, a found object); the rest lives in your locker. Lend and borrow tools at the tool room with a chit.
- **A phone:** camera and album, the site map with your position, a weather app with the real forecast, a clock and alarm to wake you, a music player and radio stations for the walk, a torch, messages from the foreman, the nurse, the cook and friends ("Sir, may buhos mamaya 2pm, punta ka?"), and a call button to ask the **Atlas assistant** about the project in words (the app's existing AI, speaking through your phone or site radio).
- **Take a job for a day:** sign on at the admin window for a shift in any trade or office role. Site: labourer, steelman's helper, carpenter's helper, mason's helper, surveyor's aide, warehouse hand, kitchen helper, gate guard, water-truck driver, and, once trusted, operator. **Staff office (owner's request): IT support, project manager's assistant and later project manager, document controller, AutoCAD operator, timekeeper, admin officer, HR officer, planning engineer, quantity surveyor, purchaser, safety officer, nurse's aide.** Each has real tasks at its real workplace (the office from reference R5 for the staff roles); the full career ladders are in `P16-story-mode.md` section 5. The person in charge gives tasks, shows you once, and comments on your work. Days worked build a skill that makes the tasks smoother.
- **Pay and a place to spend it:** a pay envelope on the 15th and the last day for shifts worked; a small camp store with snacks, soft drinks, phone load, slippers, a basketball, fishing line, a guitar string, a raincoat; treat your gang to merienda and watch standing rise.
- **Friends:** people you work, eat and play with become friends by degrees: a nickname for you, a wave from across the yard, an invitation to the circle, a share of their food, a secret fishing spot, someone who vouches for you with the foreman. Rivalries on the court. A best friend who walks to work with you.
- **A dog of your own:** the camp dog that adopts you can be named, follows, waits at doors, sleeps under your bunk, learns sit and fetch, and warns you of snakes.
- **Your corner:** decorate the bunk space with a few things (a calendar, a photo you took, a small radio, a string of lights), and keep a hammock spot by the river.
- **Cook and fish:** catch fish at the river and bring them to the kitchen, or grill them at the evening fire; help cook a pot of adobo by the steps the cook calls out; pick vegetables from the patch.
- **A journal:** the character keeps short notes of the day by itself (what you did, who you met, what you saw), with your photographs, readable in the bunk.

**Pass when.**
- [ ] A full day lived as a labourer and a full day as IT support (wake by alarm, wash, breakfast, shift with tasks, lunch, shift, wash, dinner, circle, sleep) work end to end; no setting disables needs; skipping food and water all day ends in the clinic.
- [ ] The phone's weather, map, camera, messages and assistant call all work.
- [ ] Pay arrives on pay-day for shifts worked and can be spent; friendship visibly changes how three people treat you.
- [ ] The adopted dog follows through doors, waits, and does not block work.

## P13k. Running the plant, and moments you will remember

**Needs.** P13j, P05 (moving parts), P09e (calendar).

- **Operate what the project is for** (free roam; in visitor mode these are watch-only demonstrations):
  - **At the weir:** crank the sluice and intake gates from their hoists and watch the pool level, the overflow and the feeder canal respond; flush the desander; pull the trashrack clean with the rake.
  - **In the control room:** the start-up sequence for a unit laid out as on a real panel, step by step (auxiliaries on, inlet valve open, wicket gates to speed, excitation, synchronise, close the breaker, load up), with the machine hall answering: the valve motors, water rushing, the shaft turning, the rising hum, lamps changing, the tailrace surging. Shut-down and an emergency trip as well. Labelled a simulation of a typical sequence, not this plant's procedure, unless the owner supplies the real one.
  - **In the hall:** drive the overhead crane with the pendant and lift a load; open cabinets; read gauges that follow the unit's state.
  - **In the switchyard:** watch the breaker close with its thump; from the control room open and close the disconnects (from a safe distance: the arc on opening under load is shown as the reason not to).
  - **In Tunnel 2:** work the jumbo's boom and drill a hole; load, connect, clear the tunnel, sound the siren and **press the exploder yourself**; feel the blast from the refuge; walk back in through the fume and dust to see the muck pile you made.
- **Events that happen to you** (rare, by calendar, weather and chance; each can be turned off):
  - a **power cut** at night: the camp goes black, voices call out, torches come on, and you can go with the electrician to restart the genset;
  - a **typhoon night** in the barracks: roaring wind, rain on the roof, lamps swinging, a sheet tearing loose that you help tie down, and the clean-up at dawn;
  - a **landslide** on the road with a vehicle stuck beyond it and the gang walking up to dig it out;
  - the **river rising** fast after rain upstream and the call to pull pumps and tools back from the bank;
  - a **snake in the barracks** you can help the handler catch;
  - a **lost dog** search by torchlight; a **carabao loose** on the road;
  - a **milestone day** from the real record (the last surge-tank lift, the roof going on) with the blessing, the photograph and the feast, and you in the picture;
  - **fiesta**, the **Christmas party**, a **birthday** where you are pulled into the singing; a basketball final with the whole camp watching;
  - a **night of stars** on the lookout rock with the valley dark below, a meteor, and a friend telling site ghost stories.
- **Seeing it your way:** place a time-lapse camera on a tripod and watch a day or a week of a pour or a lift in seconds; record and replay short clips; a cinematic camera that follows your character; first-person rain on the lens and dust motes (optional).
- **Felt, not only seen:** controller rumble and phone vibration for the blast, engines, drilling and thunder; headphone-true directional sound; the low pressure of the blast as a brief hush; the temperature of light (cool dawn, white noon, warm lamps) doing its work.

**Pass when.**
- [ ] The unit start-up, shut-down and trip sequences run with the hall, tailrace and sound responding at each step.
- [ ] The gates at the weir change the water visibly and correctly.
- [ ] The player-fired blast runs the full cycle with all safety steps, and cannot fire with anyone visible in the zone.
- [ ] Each event can be triggered from a debug list, plays through, and leaves the site in a consistent state.
- [ ] Time-lapse capture of a pour produces a watchable clip.

## Not in this plan (ideas for later)

- Several visitors in the same site at once.
- Staff leaving pinned notes or snags on a spot that become Nexus tickets.
- A VR headset view.
- Operating heavy equipment on live work fronts (a practice pit is in P13h).

These are recorded so a later decision can pick them up; do not build them now.
