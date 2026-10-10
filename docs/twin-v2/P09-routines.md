# P09 (continued). Routines and the calendar

Two sessions: **P09e, P09f.** They run after P09d and before P10a.

The owner asked (2026-10-10) for more routine in the site's life: daily and weekly patterns for workers and staff, and an environment with its own rhythm through morning, day and night. P09b gives every role a working day. These sub-phases add the **calendar** (what makes Tuesday different from Sunday, and pay-day different from mid-month) and the **small personal routines** that make a person more than their job. The environment's own daily and seasonal rhythm is P12f, at the end of `P12-living-environment.md`.

Everything here is simulated behaviour. It is generated from plausible site practice, shown as activity, and labelled `Simulated` wherever a card or caption describes it. Where the owner's records give a real schedule (for example the actual day of the weekly toolbox meeting or the real shift hours), the real one replaces the default: P09e starts by listing every default below for the owner to correct.

## P09e. The site calendar: weekly, monthly, seasonal

**Needs.** P09d.

**Read first.** `sim/clock.ts`, `programme.json`, `sim/agent.ts`; v1 labels that state real practice (the toolbox meeting window on the court, office door hours, shift times in `personnelData.ts`); `data/history.json`; the monthly reviews' note that progress photos are taken the day before each submission (`reference/INDEX.md`).

**Steps.**
1. `sim/calendar.ts`: the clock gains a real date. From it derive day of week, day of month, whether it is a pay-day, a rest day, a public holiday (`data/holidays.json`, Philippine public holidays with source), the season, and the moon phase. A `data/calendar.json` lists recurring events: `{ id, when: rule, hours, who, where, activity, weather? }`. The sim asks the calendar what applies today and overlays it on the daily programme. Same date and seed always give the same day.
2. Write `review/P09e/DEFAULTS.md`: every default below in one table for the owner to tick or correct. Build with the defaults; change data, not code, when corrections arrive.
3. **Weekly rhythm** (defaults):

| Day | What is different |
| --- | --- |
| Monday | Flag ceremony at the office flagpoles before work: staff in rows, anthem, short address by the project manager. Weekly look-ahead meeting in the meeting room mid-morning (schedule on the screen, foremen and engineers round the table). New arrivals from leave walk in from the gate with bags and get a site induction from the safety officer |
| Tuesday | The site-wide toolbox meeting on the court (v1 sets this on Tuesday mornings): longer formation, warm-up exercises, safety topic of the week on the whiteboard, recognition of a safe worker of the week |
| Wednesday | Equipment preventive-maintenance morning at the motor pool: machines lined up, greasing, filters, tyre checks, a mechanic under a truck. Warehouse stock count in the afternoon |
| Thursday | Client and consultant joint inspection: a small group in different-coloured hard hats walks the fronts with the engineers, stops, points, measures, takes photos; a wrap-up at the office |
| Friday | Housekeeping hour before the end of shift (the 5S sweep): every gang tidies its front, stacks materials, clears walkways; waste collection truck does its round. Weekly progress measurement by the quantity surveyors with tape and wheel |
| Saturday | Normal work, shorter by default. Basketball league game in the late afternoon with more spectators, a scoreboard and a whistle. Livelier camp evening (P12e) |
| Sunday | Rest day for most: only security, the kitchen, pump watchers and one tunnel shift work. A prayer service or mass under the canteen roof in the morning. Laundry everywhere, haircuts, long card games, video calls home, a pick-up game on the court, some people away at the town market (the crew van makes a market run out and back). The office is dark except one duty engineer |

4. **Monthly rhythm** (defaults):

| When | What |
| --- | --- |
| 15th and last day | Pay-day: a queue at the admin window after work to sign for payslips, phones out afterwards to send money home, the camp store busier, a livelier evening |
| First Monday | Monthly safety meeting: everyone, the month's statistics board read out (figures shown only as blank or simulated), a short drill demonstration |
| Around the 25th | Month-end push: later lights in the office, planners at the schedule wall, the quantity surveyors measuring, a drone flown over the site for the monthly progress photographs (a small quadcopter that takes off from the office yard, flies a pattern over each work front and lands) |
| Around the 28th | The monthly project review: managers gathered round the meeting-room screen for a long session; coffee and snacks carried in |
| Once a month | Clinic day: blood-pressure and health checks, a queue outside the clinic. Fire-extinguisher and first-aid-kit inspection round with tags. Pest control fogging at the barracks at dusk. A birthday celebration for that month's birthdays at the canteen: a shared meal, a cake, a song |
| Every two to three weeks, staggered | Leave rotation: a few people leave with bags on the morning van and others return in the afternoon |
| Quarterly | An emergency drill (fire, earthquake or tunnel evacuation in turn): the siren, everyone walking to the muster point, head count by gang, the all-clear. A government inspection visit (labour or environment officers in their own vests) |

5. **Deliveries and services on a timetable:** fuel tanker twice a week to the fuel point; cement and rebar trucks on set days with the warehouse receiving; drinking-water delivery every other day with jugs carried to stations; LPG for the kitchen weekly; the market truck with vegetables, rice and fish early on market days; septic and waste collection weekly; explosives delivery to the magazine under escort when Tunnel 2 is blasting, with the guard logging it.
6. **Seasonal and occasional events** (each a calendar entry with decorations and a small scene, all optional by tier):
   - December: paper star lanterns (parol) and lights on the office and barracks, a Christmas party with a shared feast laid out on banana leaves on long tables, gift exchange, carols; many on leave between Christmas and New Year with a skeleton crew.
   - Holy Week: work stops Thursday and Friday; a quiet camp.
   - All Saints' Day: many away; candles at a small shrine.
   - Town fiesta and Independence Day: flags and bunting, a half day.
   - Typhoon season: the securing routine and recovery days from P09b; after a typhoon, a clean-up day with mud shovelling and repairs (the monthly reviews record exactly this).
   - **Milestone celebrations tied to real history** (`history.json`): a tunnel breakthrough, the last surge-tank lift, the roof going on the powerhouse, first water. On that date the gang gathers at the spot, a banner goes up, there is a blessing, a group photograph and a shared meal. Only for milestones that are in the real record.
7. **Visitors** arriving by vehicle with the guard's full check: client representatives, the designer's engineers, suppliers' technicians, local officials, a school or community tour group on rare days (visitor vests, a safety officer leading). Each follows a route and leaves.
8. The Time panel gains a small calendar: pick a date, see what is special about that day in one line, and jump to its key moments.

**Pass when.**
- [ ] A simulated fortnight in fast-forward shows every weekly entry on its day and both pay-days; each recorded as a capture.
- [ ] Sunday and a public holiday look clearly emptier than a Tuesday.
- [ ] Calendar events never double-book a person or a place (asserted over a simulated year).
- [ ] Milestone scenes occur only on dates present in `history.json`.
- [ ] `DEFAULTS.md` is in the report for the owner.

## P09f. Personal routines and a full day for every group

**Needs.** P09e.

**Steps.**
1. **Personal traits** per person (seeded, stable): early riser or late, tidy or not, talkative or quiet, a best friend or two on site, a usual seat at the canteen, a usual bunk, a habit (coffee first, morning stretch, phone call home at the same hour, feeding the dog, a cigarette at the smoking shed, a nap after lunch, evening jog along the road, prayers before sleep). Traits choose among activities; they never invent facts about a real named person and are not shown on named staff cards.
2. **Micro-routines that bracket work** (every worker, varied by trait):
   - getting ready: wake, fold the blanket, queue for the wash area with a towel and dipper, dress, boots on at the door, hard hat and vest from the rack, fill the water bottle, sign the attendance sheet or tap the time recorder at the gate;
   - going to work: walk in twos and threes or ride the van; collect tools from the tool room with a chit; the gang's own five-minute talk at the work front where the foreman points out the day's hazards;
   - during work: tool and equipment pre-use check, a look up before working under something, tidying as they go, a permit board signed for hot work or confined space, a spotter posted;
   - breaks: the same shady spot each day, food from home in a stacked lunch container, sharing, a quick doze with the hard hat over the face;
   - ending: return tools, wash boots at the tap, hang PPE, sign out, shower queue, clean clothes.
3. **A full day written out for each group**, extending P09b's table with the in-between moments:

| Group | Morning | Midday | Afternoon | Evening and night |
| --- | --- | --- | --- | --- |
| Project manager and deputy | Early coffee at the desk reading reports; flag or toolbox attendance; site walk | Lunch at the staff house with the heads; calls | Meetings, signing documents, a second visit to the critical front | Late desk light some nights; dinner; a call home; a walk round the camp |
| Engineers, planners, QS | Email and drawings; morning inspection round | Canteen or desk lunch; a short game on the phone | Requests for inspection, measurements, plotting, updating the schedule wall | Reports until early evening; basketball or the staff veranda |
| Admin, HR, document control, IT | Open the office, the time records, the day's mail and deliveries | Lunch together | Payroll preparation near pay-day, filing, ID photos for new hires, a printer jam | Lock up at five; the camp |
| Safety team and nurse | Lead the meeting; morning rounds; clinic checks | Check the water stations and shade | Afternoon rounds, permits, scaffold tags, an incident-free-days board updated | A night round by one officer |
| Foremen and gangs | Tools, gang talk, the day's task | Lunch and rest | The push to finish the day's target; clean up | Wash, eat, rest or play |
| Tunnel shifts | Day shift in at seven with a head count at the portal tally board; brass tags or names moved from "out" to "in" | Meal brought to the portal or eaten at the refuge | Hand-over talk between shift bosses at the portal | Night shift under lights; a midnight meal; out at dawn, tired and muddy, straight to wash and sleep with the barracks windows shaded |
| Operators and drivers | Walk-round check, fuel, start-up warm-up | Parked in line, lunch beside the machine | Work, then wash-down at the bay | Keys handed in at the motor pool board |
| Warehouse and motor pool | Issue tools and consumables at the counter | Receive deliveries | Stock count, repairs, welding | Lock-up; a watchman |
| Kitchen | Light on before four; rice, coffee, breakfast | Lunch service; market goods put away | Merienda tray; dinner preparation | Dinner; wash up; kitchen closed by eight; the cats fed |
| Security | Shift change with a logbook hand-over and a salute; flag raising | Gate duty in rotation | Vehicle checks; visitor passes | Flag lowering at dusk; lamps on; patrols on a route with checkpoints clocked; a guard and the dog at the gate through the night |
| Camp helpers | Sweep the yard, empty bins, clean wash areas | Laundry service | Water tanks topped up, grass cut | Lights checked at dusk |

4. **Friend groups and meals:** people sit with their gang or friends, the same faces at the same table; a place is kept for a late friend; the line lets a tired night-shift man go first.
5. **Order and upkeep as visible routine:** a noticeboard updated each morning (duty list, menu, notices), the incident-free-days counter (labelled simulated), bins emptied, lamps replaced, a wall repainted over a week, grass cut on a cycle, potholes filled after rain.
6. **Continuity:** what happened yesterday shows today: yesterday's pour is today's cured slab being stripped; mud from last night's rain is still drying; a machine under repair stays on stands until the mechanic finishes; laundry hung on Sunday is gone by Monday.
7. Inspector additions: a person's card shows "now" and "next" from their routine; a place's card shows what happens there today.

**Pass when.**
- [ ] Following five randomly chosen people for a full simulated day shows a coherent day with getting-ready, work, breaks and evening, and no unexplained idling.
- [ ] Two people with different traits visibly differ in their morning and evening.
- [ ] Continuity holds across three consecutive simulated days (pour, strip, cure; rain, mud, dry).
- [ ] No trait or routine text appears as fact on a named person's card.
- [ ] Sim cost stays within the P09a tick budget with routines on.
