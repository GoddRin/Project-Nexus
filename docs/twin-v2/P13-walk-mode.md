# P13 (continued). Walk mode: explore the site on foot

Three sessions: **P13d, P13e, P13f.** They run after P13c and before P14a.

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
   - doors open as you approach, the same doors the workers use;
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

## Not in this plan (ideas for later)

- Several visitors in the same site at once.
- Staff leaving pinned notes or snags on a spot that become Nexus tickets.
- A VR headset view.
- Operating heavy equipment.

These are recorded so a later decision can pick them up; do not build them now.
