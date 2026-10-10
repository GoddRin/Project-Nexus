# Twin v2 build prompts

A complete rebuild of the Tumauini HEPP digital twin, written 2026-10-09 from a read of the current code (`components/digital-twin/`, 57 files, about 48,900 lines) and the owner's brief. It replaces the earlier single-file draft.

## How to run a session

One Claude Code session does **one sub-phase** (for example `P07b`). Start it with:

> Read `docs/twin-v2/README.md` and follow it for sub-phase **P07b**.

Every session then does this, in order:

1. Read `MASTER-BRIEF.md`, `CONTRACTS.md`, `QUALITY-BAR.md`, `STATE.md` and `reference/INDEX.md` in this folder.
2. Read the phase file (for `P07b`, `P07-characters.md`) and find the sub-phase.
3. Read every file under that sub-phase's **Read first**. Do not write code before this.
4. Check the sub-phase's **Needs** are marked done in `STATE.md`. If not, stop and say so.
5. Do the **Steps** in order. Produce everything under **Deliver**.
6. Run the checks under **Pass when**. A check that fails is fixed or reported, never skipped silently.
7. Close the session (see below).

## Closing a session

1. Update `STATE.md`: status, date, measured numbers, what is left.
2. Append to `DECISIONS.md` (one line per decision: what, why) and `RISKS.md` if a risk appeared or was retired.
3. Save review images to `review/<sub-phase>/` and write `review/<sub-phase>/REPORT.md`: what was built, numbers against budget, known gaps, what the owner must look at or do.
4. Commit on branch `twin-v2` with message `twin-v2(<sub-phase>): <summary>`. Do not push.
5. Stop. The owner reviews before the next sub-phase starts.

## Files in this folder

| File | Purpose |
| --- | --- |
| `MASTER-BRIEF.md` | Mission, audit summary, hard rules, tech stack, budgets, how to verify |
| `CONTRACTS.md` | Folder layout, naming, and the data formats every session must use unchanged |
| `QUALITY-BAR.md` | Pass/fail checklists and budgets per asset type; lighting targets per time of day |
| `STATE.md` | Progress tracker (the hand-off between sessions) |
| `TOOLBOX.md` | Free tools and sources for models, motion and scans; read by the sessions that build people, animals, vehicles and props |
| `DECISIONS.md`, `RISKS.md` | Created in P00; appended to by every session |
| `P00` to `P15` | The phases |

## Phase order

| Phase | Sub-phases | What it produces |
| --- | --- | --- |
| P00 Baseline | a | Inventory of v1, extracted site data, licence audit, baseline numbers |
| P01 Foundation | a b c | Renderer decision, scene shell, asset pipeline, quality tiers |
| P02 Vertical slice | a b c | One small area at final quality; the owner approves the look before mass production |
| P03 World | a b c d | Terrain, sky and 24-hour light, water, weather |
| P04 Vegetation | a b | Plant library, scatter, wind |
| P05 Hydro works | a b c d e f g h | Powerhouse, turbine hall, switchyard, waterways, Tunnels 1 and 2, construction stages, the weir location (weir, intake, desander), the midway location (pipe bridge and portals) |
| P06 Camps | a b c d e | Main Temfacil buildings, interiors, props; the weir satellite camp and aggregate plant |
| P07 Characters | a b c d | Bodies, outfits by role, variation, the 36 named staff |
| P08 Motion | a b c d e | Clip library, retargeting, animation runtime, custom clips, real-time actions (hard hats on and off, PPE, tools, hand-overs) |
| P09 Simulation | a b c d | Stations, daily programme, role behaviour, tunnel cycle, selection |
| P09 Routines | e f | The site calendar (weekly, monthly, seasonal events, deliveries, visitors, milestones) and personal routines with a full day for every group (file `P09-routines.md`) |
| P10 Vehicles | a b c | Fleet models and rigs (4x4 pickups, crew vans, light 4x4 trucks, heavy and tunnel equipment), driving and work cycles, mountain logistics |
| P11 Animals | a b c | Rigged fauna, behaviour, Sierra Madre wildlife with home ranges, seasons and life beside the works |
| P12 Effects and sound | a b | Work effects, atmosphere, positional audio |
| P12 Living environment | c d e f g | Live site weather driving sky, clouds, rain and wind; heat, rain and wind changing how people, animals and machines behave; small nature details and camp night life; the environment through the day, month and year; ground, vehicles and people that get muddy, dusty and clean again (file `P12-living-environment.md`) |
| P13 Interface | a b c | Shell and dock, search and labels, tools |
| P13 Walk mode | d e f | Explore on foot in first or third person: controller and cameras, interaction and site rules, rides and guided visits (file `P13-walk-mode.md`) |
| P14 Data | a b | Real records, progress timeline, deep links, second-project readiness |
| P15 Ship | a b | Optimisation, QA, cut-over |

P02 is a gate: nothing in P03 onward starts until the owner has approved the slice.
