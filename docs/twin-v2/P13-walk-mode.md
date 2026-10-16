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

## P13l. Real conversations: talk with anyone, each with their own personality

**Needs.** P13g (voices and the line system), P13i (mood and memory per person), P13j (friends, jobs), P09c (role behaviour).

The owner asked (2026-10-15) to **talk and interact with any worker or staff member, each with a personality that fits their job**. P13g gives people short lines and a five-item menu; this sub-phase turns that into real conversation. It has two layers that share one personality model: an **authored layer** that always works, offline and free, on every page; and an **open-talk layer** where the owner types or speaks freely and the person answers in character, signed-in only.

**Read first.** `components/atlas/ai/` and `lib/atlas-ai/` (the existing assistant: `service.ts`, which calls the provider cascade in `lib/ai/core/providerHarness.ts` with free models first; `localVoice.ts`, `piperVoice.worker.ts` and `localVoice.worker.ts`, which speak in the browser with Piper and Kokoro at no cost; `app/api/atlas-ai/transcribe` for speech to text; `useLipSync`, `visemes.ts`); `P13g` above; `P13i` "How people react"; `data/people.json`, `crew.json`, `stations.json`, `activities.json`.

### 1. A personality for every person (`data/personas.json`, derived, never hand-written per crew member)

Each person's personality is built from layers, so 473 workers need no hand-written cards:

| Layer | What it holds | Where it comes from |
| --- | --- | --- |
| **Role archetype** | How their job shapes them: vocabulary, what they notice, what worries them, how formal they are, what they are proud of, their catchphrases | One card per role (about 40 roles): written once |
| **Temperament** | Five sliders (talkative to quiet, warm to gruff, joker to serious, patient to quick-tempered, curious to set in their ways), plus humour style (teasing, deadpan, corny puns, none) | Seeded randomly per person within the role's range, so no two steelmen are the same |
| **Background** | Home province and language (Ilocano, Ibanag, Tagalog, Cebuano, Kalinga…; Isabela crews speak Ilocano and Ibanag, so local workers drop Ilocano words), age band, family at home, years on projects, a hobby, a favourite food, a team they support | Generated for invented crew; **for named real staff only what the owner approves** (their role and the details in the R5 notes); nothing personal is invented about a real person |
| **Live state** | Mood (from needs, heat, rain, fatigue, pay-day, how the work is going), what they are doing right now, who they are with, the time of day | The simulation (P09, P12d, P13i) every second |
| **Relationship with you** | Familiarity, liking, trust, respect, fear, and memories of what you did (helped, lent, joked, bumped, punched, beat them at basketball) | P13i's memory model, extended |

**Role archetypes (examples; write all of them):**

| Role | Personality | Talks about | Sounds like |
| --- | --- | --- | --- |
| Labourer | Easy-going, teasing, quick to laugh, tired by afternoon | Pay-day, home, basketball, food, the heat, the foreman | "Boss, kape muna tayo." Ilocano asides |
| Steelman / rebar | Proud of tidy ties, competitive about speed | Spacing, bar sizes, sore hands, who ties fastest | Counts under his breath |
| Carpenter | Craftsman, a little particular, generous with tips | Formwork, plywood quality, his own tools he never lends | "Sukat muna bago putol." (Measure before you cut) |
| Mason | Patient, steady, a storyteller | Mix, curing, old buildings back home | Slow, warm |
| Heavy-equipment operator | Confident, a bit of a show-off, loves the machine | His unit's quirks, the road, fuel, near misses | Engine metaphors |
| Tunnel miner | Superstitious, brave, dark humour, close-knit | The face, the ground "talking", old mine stories, the night | Lowers his voice in the tunnel |
| Driver | Chatty, knows every rumour, always in a hurry | The road, landslides, town, who is visiting | Gossip first, then the news |
| Foreman | Brisk, protective of his gang, under pressure | Targets, manpower, weather, the schedule | Short sentences, then a laugh |
| Security guard | Formal, watchful, polite, bored at night | Rules, logbook, who came in, the night sounds | "Sir, ID po muna." |
| Cook | Motherly or fatherly, bossy in the kitchen, knows everyone | Food, who is not eating, camp news | Feeds you before answering |
| Site engineer | Practical, busy, explains well when asked | Today's pour, the drawings, a problem he is solving | Taglish with technical words |
| Safety officer | Firm but friendly, sees every hazard | PPE, permits, near misses, heat stress | Corrects you mid-sentence |
| Surveyor | Precise, outdoorsy, patient | Benchmarks, weather on the ridge, the walk up | Numbers and landmarks |
| Geo mapper | Thoughtful, observant, loves the land | Maps, old trails, how the ground has changed | Quiet, exact |
| Document controller | Orderly, dry humour, guards the archive | Revisions, transmittals, people who lose drawings | "Controlled copy po 'yan." |
| AutoCAD operator | Focused, music in his ears, jokes when he looks up | Layers, revision clouds, the coffee run | Pauses to finish a line first |
| Planning engineer | Driven, organised, encouraging | The schedule, look-ahead, how to catch up | Plans your day for you |
| Timekeeper | Friendly, knows everyone's name, precise about hours | Attendance, overtime, cut-off, birthdays | Greets you by name |
| HR officer | Warm, discreet, careful with words | Contracts, leave, welfare, families | Never gossips |
| Admin / purchaser | Practical fixer | Supplies, deliveries, the van schedule | "Ako na bahala." (Leave it to me) |
| IT support | Patient, tired of "have you restarted it", secretly loves the satellite dish | Signal, laptops, printers, the CCTV | Tech words, then a translation |
| Mechanical superintendent | Veteran, calm, proud of machines | Turbines, alignment, past plants | Teaches by stories |
| Project manager / head | Measured, sees the whole, short on time | Milestones, the owner's visit, morale | Asks you a question back |
| Nurse | Kind, firm about health | Hydration, injuries, rest | Checks on you |
| Barangay vendor, visitor, inspector, child | Their own small cards | | |

### 2. The authored layer (always on, free, offline, public-safe)

Conversation is assembled, not scripted line by line, so it never runs dry:

1. **Topics.** Talking to someone opens a wheel of topics that fit them and the moment: **Work** (what are you doing, teach me, can I help, what's the problem), **The site** (news, who is who, where is…, what happened yesterday), **Them** (home, family, how long on the project, hobbies), **Small talk** (weather, food, basketball, music, jokes), **Gossip** (who is courting whom, who got scolded, the rumour of the week, harmless and invented-crew only), **Ask a favour** (lend a tool, a ride, a cigarette break cover, a recommendation to the foreman), **Invite** (eat, coffee, play, fish, the circle), **Night talk** (after dark: stories, the folklore, what they heard) and **Story** topics when P16 is running.
2. **Answers** come from templates filled from live facts (their real activity, the real weather, the real date, the site's state, recent events, your relationship), written in Taglish with Ilocano seasoning by role and background, each line with a gesture clip, an expression and a voice clip.
3. **Your tone matters:** each reply option has a tone (polite, friendly, joking, blunt, rude, flirt-free respectful). Tone and the other person's temperament decide how it lands: a joker loves a tease, a serious foreman does not; rudeness to a guard has consequences (P13i).
4. **Barks** fill the world: unprompted remarks to you and to each other driven by events (a dropped tool, a near miss, rain starting, a blast warning, pay-day, a basket on the court, you arriving muddy).
5. **People start conversations too:** a friend calls you over, the foreman asks for a hand, the cook insists you eat, a worker asks to borrow your phone light, a child at the lower gate asks your name.
6. **They remember** (P13i): the next conversation opens with what happened last time ("Uy, ikaw 'yung nanalo sa amin kahapon!" — You're the one who beat us yesterday!).
7. **Authoring tool:** dialogue snippets and topic rules in **inkjs** (free, MIT) or plain JSON with conditions; a validator checks every role has every topic in both languages.

### 3. The open-talk layer (signed-in owner only; free models first)

The owner can **type or speak anything** and the person answers in character, by voice, with lip-sync, gesture and a change in their relationship.

1. **Input:** a text box, or push-to-talk through the browser's speech recognition or the app's existing transcribe route.
2. **The prompt** is built per turn from the persona (archetype, temperament, background, live state, relationship, last few exchanges, and a short list of true facts they can know: their activity, the site's public state, the weather, recent events). The model answers in a small JSON shape: the line (Taglish), an emotion, a gesture, an optional action (follow you, give an item, start a task, walk away, call the guard) and a relationship change. The game validates the action before doing it.
3. **The model** runs through the app's existing provider cascade, **free models first**; a paid model only if the owner turns it on later. Answers are cached for repeated questions; a daily cap prevents runaway use.
4. **Voice:** spoken in the browser with the existing Piper or Kokoro voices (free), a voice chosen per person so they keep one voice; pre-recorded colleagues' voices are used for authored lines only.
5. **Guard rails:**
   - **Real colleagues are portrayed, not impersonated.** Their persona holds only the role and the owner-approved details; the model is told never to invent their private life, opinions on real people, or claims about real events; the conversation panel shows "AI portrayal".
   - **No internal project data.** The persona's facts come only from public-safe data (physical progress, dates, the weather); costs, margins, KPIs, incidents and the monthly reviews never reach the prompt.
   - Off on the public page and in presentation mode; the authored layer stays.
   - If the model fails or is slow, the authored layer answers instantly; no conversation ever hangs.

### 4. Things a conversation can lead to

Ask to be taught (a skill gain in that trade); ask for work (a task for the day); borrow or lend; trade snacks; get directions with a walking companion; invite someone to eat, play, fish or the circle; ask for a photo together; patch up a quarrel with an apology and a merienda; recruit a friend to join you for a night walk; ask the cook for the recipe; ask an old miner for a story; ask the guard who came in today; hear a confession of homesickness and help (call home on your phone, a gift); set two friends up for a basketball rematch.

**Deliver.** `data/personas.json` (role archetypes and the generator), the topic and template data in both languages with Ilocano seasoning, the conversation UI (topic wheel, tone choice, text and voice input), the open-talk service using the existing cascade, a validator, a review video of six conversations (labourer, tunnel miner, cook, guard, document controller, safety officer) and two open-talk sessions.

**Pass when.**
- [ ] Ten people of ten roles, asked the same three questions, answer in ten recognisably different ways that fit their job and temperament.
- [ ] Every answer about work matches the person's real activity; no conversation reveals an internal figure (an automated check feeds the prompts a list of banned terms and figures and fails if any appear).
- [ ] The authored layer works with the network cut; open talk falls back to it within one second when the model is slow.
- [ ] A named colleague's open-talk persona contains only approved facts (checked against `people.json`), and the panel shows "AI portrayal".
- [ ] Relationship changes from conversation show in later greetings and in P13i reactions.

## P13m. Become anyone: play as any worker or staff member

**Needs.** P13l, P13j, P09c, P16-0 for the career data.

The owner asked (2026-10-15) for **more to do when playing as a certain character or personnel**, and for the whole game to be more immersive. This sub-phase lets the owner **step into any person on site** (pick from the people list, or walk up and choose "Take their place") and live their day with their tools, their place, their people and their problems. Their schedule, relationships and reputation come with them; the person they were becomes you until you leave.

**What changes when you are someone:**

- **Their kit and body:** their outfit and PPE, their build and walking style (the tunnel miner's crouch, the guard's slow patrol, the cook's quick steps), their tools in hand.
- **Their place and day:** you wake in their bunk at their alarm, your phone holds their messages and schedule, your foreman or boss gives their tasks, their friends greet you, their rivals needle you.
- **Their view:** a role lens on the world: the safety officer sees hazards outlined; the surveyor sees benchmarks and levels; the mechanical superintendent sees vibration and temperatures on machines; the timekeeper sees names over heads; the document controller sees which drawing revision each crew holds; the operator sees load and fuel; the cook sees who has not eaten.

**Things to do, by role (each a short, repeatable activity with a skill that grows):**

| Role | Activities |
| --- | --- |
| Labourer | Shovel and level gravel to a string line; carry and stack cement bags; clean formwork; mix by hand; carry water to the gang at noon |
| Steelman | Tie rebar to the spacing on the drawing against the clock; cut and bend bars; place spacers; pass the engineer's inspection |
| Carpenter | Measure, cut and nail a form; plumb it; strip forms the next day; build a bench for the camp |
| Mason | Lay hollow blocks to a line; plaster; cure a slab in the heat |
| Operator | Drive the excavator, roller or dump truck in the practice pit and then on easy real tasks; daily checks; refuel; dig a trench to depth with a spotter |
| Driver | Run the crew van and the Kia truck on the access road: timing, mud, landslide detours, passengers who chat |
| Tunnel miner | Mark the face, drill the round, charge (as a sequence, never instructions for explosives), retreat, scale, mesh and bolt; the gas check; listen to the rock |
| Security guard | Check IDs and vehicles at the gate, the logbook, the night patrol with a torch, the radio check every hour, a visitor who argues |
| Cook | Plan and cook for 300 against the clock (rice, ulam, merienda), shop list, feed latecomers, the fiesta lechon |
| Site engineer | Inspect before a pour, sign the checklist, solve a clash between drawing and site, run the toolbox talk |
| Safety officer | The 07:00 toolbox talk (choose the topic), spot hazards on a walk, issue permits, stop unsafe work politely, a rescue drill, heat-stress checks at noon |
| Surveyor | Set up the total station, sight the prism, stake out points, check a level; the walk up the ridge at dawn |
| Geo mapper | Fly the drone survey, process the map, compare before and after a storm, update the site map everyone uses |
| Document controller | Receive, stamp, log and route transmittals; find a lost drawing; scan; hand out controlled copies; the archive after a flood |
| AutoCAD operator | Turn a sketch into a drawing (a simple in-game drafting puzzle), add revision clouds, print and fold |
| Planning engineer | Build the look-ahead from the progress, recover the schedule after rain, present at the month-end |
| Timekeeper | Run the gate at shift change, match names to faces, chase missing time cards, close the cut-off before pay-day |
| HR officer | Onboard a new hire (ID, PPE, briefing), handle a leave request, help a worker's family, the welfare visit |
| Admin / purchaser | Order supplies, meet the delivery, check against the PO, arrange the van to town |
| IT support | Fix the office printer, restore the internet after a storm, align the dish, reset the CCTV, explain Wi-Fi to the foreman |
| Mechanical superintendent | Receive a turbine part, align a shaft, run a test, lead the first spin |
| Nurse | Treat a cut, handle heat exhaustion, run the clinic, the blood-pressure line on Monday |
| Project head | Walk the site with a visitor, chair the month-end, decide between two bad options in a crisis |

**Immersion across the game (applies to every mode):**

1. **No floating menus where the world can do it:** tasks come by radio, phone message or a shout; the map is your phone or the board in the office; status shows on your body (sweat, dirt, shaking hands), not bars, with a minimal HUD option.
2. **Diegetic tools:** read a real-looking drawing on a clipboard, a permit on the wall, a logbook with handwriting, the whiteboard in the office.
3. **Sound first:** footsteps by surface, breath, radio squelch, distant generators, the river, rain on the hat brim, the tunnel's pressure.
4. **Consequences that persist:** what you build stays, what you break stays broken until fixed, people remember, the site's record shows your shift.
5. **Time that matters:** being late to the toolbox talk is noticed; overtime is tiring; the last van leaves at 17:30.
6. **Small human moments:** someone saves you a seat at lunch; a worker shows you a video of his child; the cook remembers you hate ampalaya.
7. **Switch at will:** leave a person at any moment and they carry on their day; return later to find what they did.
8. **A day recap:** at bedtime, a short journal page of the day lived as that person, with your photos.

**Deliver.** The "Take their place" flow, role lenses for eight roles, the activity set for every role in the table (at least one activity each, then grown in later packs), and a review video of a full day as a labourer, as the safety officer and as the document controller.

**Pass when.**
- [ ] Taking anyone's place gives their outfit, tools, bunk, schedule, friends and messages; leaving returns them to their routine with no glitch.
- [ ] Every role in the table has at least one complete activity; the eight lenses show the right information.
- [ ] A full day as the safety officer and as the document controller runs end to end with their real places (the R5 office for staff).
- [ ] The minimal-HUD option plays a full day with no bars on screen.

## Not in this plan (ideas for later)

- Several visitors in the same site at once.
- Staff leaving pinned notes or snags on a spot that become Nexus tickets.
- A VR headset view.
- Operating heavy equipment on live work fronts (a practice pit is in P13h).

These are recorded so a later decision can pick them up; do not build them now.
