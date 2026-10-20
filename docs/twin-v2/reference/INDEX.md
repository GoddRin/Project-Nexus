# Reference index

Sources supplied by the owner. These are company documents: use them to get dimensions, layout and appearance right; do not copy them into `public/`, do not reproduce drawings or slides in the app, and do not commit them to git.

## R1. Powerhouse CCTV auxiliary layout (drawing)

- **File (owner's machine):** `C:\Users\Harrold\Desktop\CCTV FILES FINAL\CCTV_Powerhouse_Final_CCTV_compressed.pdf` (1 sheet)
- **Title block:** DED for 11.3MW Upper Tumauini HEPP · Powerhouse · Auxiliary Layout - CCTV · Dwg. No. UTU-EDCO-TDC-DWG-PH-ELE-0021-RB · Issued for Construction, 12 August 2025 · scale 1:75 on each plan.
- **Parties named:** designer Engineering and Development Corporation of the Philippines (EDCOP); EPC contractor Sta. Clara Int'l. Corp.; owner Philnew Hydro Power Corporation.
- **To view it:** `node <scratch>/render-pdf.mjs <pdf> <outDir> 2400` style rendering with the repo's `pdf-parse` (`getScreenshot`) works; the Read tool cannot render PDFs on this machine (no poppler).

What it shows (read from the sheet on 2026-10-09):

| Fact | Value | Use in |
| --- | --- | --- |
| Three plans | Turbine floor, ground floor (GF), second floor (2F) | P05a, P05b |
| Machine hall length along the grid, GF | 31.5 m dimensioned between pull boxes at the two end walls | P05a footprint |
| Bay between machine hall end wall and the switchyard-side exit | 7.3 m dimensioned | P05a |
| Levels marked on the turbine-floor plan | EL. 188.24 m (pit / pump area floor), EL. 183.54 m (lower pit) | P05b, all elevation labels |
| Vertical distances | Turbine floor to 2F: 11.8 m riser run. GF to 2F: 7.5 m riser shaft. (So turbine floor to GF is about 4.3 m.) | P05a/b storey heights |
| Units | Two units drawn in the hall, each with an inlet pipe bending into a spiral case and a generator set alongside; one labelled TURBINE-2. The two are different sizes. The arrangement looks like horizontal-shaft machines; **confirm against a mechanical drawing before modelling**. | P05b |
| 2F rooms | Office, pantry / kitchen, T&B, control room with communications rack / data cabinet | P05b |
| GF rooms beyond the hall | Corridor to the switchyard side, stair, data cabinet (intermediate enclosure), a room with equipment line-ups | P05b |
| Outside | Entrance ramp at one end of the hall; guardhouse about 15 m + 54 m cable run from the entrance camera; switchyard bay outside the corridor exit | P05a, P06c |
| CCTV | 9 PoE cameras: CCTV-01 turbine floor; 02 Bay 1 (Grid 2-3); 03 Bay 2 (Grid 4); 04 switchyard corridor; 05 switchyard exit; 06 wide to switchyard; 07 2F office / control room; 08 entrance ramp; 09 long range to guardhouse | P05b props; a possible "camera views" feature in P13 |

Differences from v1 that v2 must correct:

- v1 labels the powerhouse "EL. 0.5m MSL". The drawing puts the turbine floor at EL. 188.24 m. v2 keeps the scene origin at the powerhouse for modelling but every displayed elevation uses real levels.
- v1 places two turbine markers side by side as generic blocks with a spinning top. The drawing shows two different-sized units with their own inlet bends, generators and auxiliaries.
- v1 has no second floor. The drawing has a 2F control room, office, pantry and toilet.
- The project name on the title block is "11.3MW Upper Tumauini HEPP".

## R3. Powerhouse storm drain plan (drawing, supplied 2026-10-10)

- **Files (git-ignored):** `assets-src/twin/reference/drawings/powerhouse-storm-drain-plan.pdf`, rendered at `drawings/storm-drain/page-01.png` (re-render larger with `node scripts/twin/reference/render-pdf.mjs <pdf> <outDir> <width>` to read small text).
- **Title block:** 11.3MW Upper Tumauini Hydroelectric Power Project · Powerhouse Storm Drain Plan · "Concrete Storm Drain Plan", scale 1:150 · Dwg. No. UTU-SCI-TDC-SPD-PH-CIV-0001-R0 (a Sta. Clara shop drawing; references UTU-EDCO-TDC-DWG-PH-CIV-0001-RB and -PN-CIV-0030-RA) · Location: Pinacanauan de Tumauini River, Antagan Uno, Tumauini, Isabela.
- **Why it matters:** it is the only to-scale **site plan of the whole powerhouse area with ground contours**. Use it as the layout authority for P05a, P05c and P05d, and to shape the terrain around the powerhouse in P03a.

What it shows:

| Item | Reading |
| --- | --- |
| Powerhouse | Long rectangle on a column grid with both units drawn inside (small unit toward the west end, big unit toward the middle), an open bay at the west end, a stair, and an annex at the east end linking to the switchyard |
| Penstock arrival | The penstock comes down from the north and **splits**: the main line continues straight to the big unit, a branch angles off west to the small unit and enters the building through a "pipe encasement" |
| Tailraces | Two separate channels leave the south side, labelled **SMALL TAILRACE** and **BIG TAILRACE**; they run south, join, and discharge to the river through a flared outlet with riprap |
| Switchyard | Fenced rectangular yard immediately east of the powerhouse, finished ground level **FGL = 188.04 m**, gravel surfacing, rows of equipment foundations, a transformer bay nearest the powerhouse, a double gate on the south side, incoming lines from the north |
| Floodwall | Runs along the river side south and south-west of the powerhouse and tailrace, with buttresses on its landward face |
| East side | A long row of buttressed or stepped structures curving around the east and south-east of the switchyard (retaining wall or floodwall continuation; confirm from photos) |
| Drainage | Concrete storm drain wrapping the north (hill) side of the powerhouse and switchyard; concrete trench drains with steel grating around the switchyard; two valve boxes, 500 mm HDPE pipes and two sumps on the river side |
| Services | Pressure reducing station and septic tank on the north side between the hill and the building; an external stair up the slope beside the penstock |
| Ground | Contours from about 190 at the yard to 225 on the hill to the north-west; the building sits on a bench near 188 to 190 with the slope rising steeply behind it |

Combined with R1 (hall 31.5 m long), the plan can be scaled to measure the switchyard, tailraces, floodwall and yard.

## R4. Owner's site photographs and videos (supplied 2026-10-10)

- **Files (git-ignored):** `assets-src/twin/reference/owner-photos-2026-10-10/`: `site-01` to `site-08`, `kia-k2500.png`, `sample-vid.mp4` (65 s) and `water-river.mp4` (12 s), with contact sheets `*-sheet.jpg`. Pull more frames with ffmpeg when a session needs them.
- These are the owner's own pictures of everyday life on the site and are the **first authority for what people wear and how the site looks at ground level**.

**The owner's PPE rule (stated 2026-10-10):** staff wear **white** hard hats; workers wear **green**. Hard hats are worn while working. They may come off when resting, eating at the canteen and during other non-work moments.

What the pictures show:

| Picture | What to take from it |
| --- | --- |
| `site-01` Yard gathering | Green hats on workers, a white hat on a staff member in a grey jacket and jeans; yellow vests; a worker in a printed long-sleeve motocross-style jersey; a face mask; bare earth yard with tyre tracks and a brown puddle; prefab building and forest behind |
| `site-02` Morning assembly | Rows of people standing with **hard hats off, held at the hip or under the arm** (as for a prayer or the anthem); a black jacket lettered "SCIC" in green with the department name beneath; grey and beige **reflectorized site jackets** with silver tape across the back and arms; green and blue long-sleeves with yellow reflective bands; a red polo with a yellow band; yellow mesh vests; jeans and work trousers; **grey-and-silver or black rubber boots on nearly everyone**; churned wet mud with tyre-tread prints and standing water |
| `site-03` Worker on a ladder fixing a small solar panel | Green hard hat; blue long-sleeve; a **yellow reflective belt-and-braces harness**; a black belt pouch; a **yellow cap lamp clipped at the belt**; dark trousers tucked into rubber boots; the roof edge of a camp building with green trim and red electrical conduit |
| `site-04` Worker shinning up a pole to a solar street light | **Orange** hard hat, orange vest with grey tape over a dark long-sleeve, jeans, grey safety boots; white prefab wall panels with green window frames, window air-conditioner on a bracket, red flexible conduit run along the eave, a bare bulb |
| `site-05` Yard store | Three workers in **red** hard hats, long sleeves with reflective bands and rubber boots carrying long timbers between them; dozens of blue plastic drums and some red steel drums; huge used earthmover tyres; an open shed with a rusty roof; bamboo forest right behind; crushed-rock yard |
| `site-06` Survey in the tunnel | Polygonal **steel arch ribs** (straight segments bolted into an arch) with mesh and lagging behind; a total station on a tripod with a yellow instrument case; red, green and white hats together; navy long-sleeves with reflective bands; rubber boots; services clipped to the right wall; green-lit water on the invert toward the face |
| `site-07` Invert concreting in the tunnel | Red hard hats; one wide **full-brim** hard hat; rock-bolt plates on the crown; a string of lamps along the left wall; a pipe on the right wall; workers screeding wet concrete with a long straightedge and shovels; printed arm sleeves; a red vest from a previous employer (do not reproduce other companies' names on clothing) |
| `site-08` Camp house on an overcast day | Single-storey white prefab house with a **rust-streaked metal roof**, green window frames and wall air-conditioners; a **bamboo trellis vegetable patch** with gourds wrapped in plastic bottles, taro and banana plants; uncut grass; two motorcycles, one under a black cover; an **outdoor kitchen** with a concrete counter under a lean-to; **low cloud sitting on the forested ridge** behind |
| `sample-vid` | A yellow **jumbo drill** working the tunnel face under steel ribs: the boom and drifter, bundled hydraulic hoses, water mist and dust drifting back, broken rock and green water on the invert |
| `water-river` | The **access road beside a stream**: red-brown laterite road with ruts and puddles, a bank of large pink, tan and grey boulders dumped as riprap, clear water over cobbles, bamboo and forest crowding the road, a survey pole with a green flag, a small white dump truck parked ahead, a staff member in a white hard hat, black T-shirt and jeans walking with another in a beige reflectorized jacket, cap and rubber boots |

Consequences for the plan: the hard-hat colour rule and the clothing list go into P07b; hats-off moments and other in-the-moment actions are P08e; the vegetable patch, outdoor kitchen and solar lights go into P06; the roadside stream and riprap into P03a and P10c; the steel rib shape into P05e; the jumbo into P10a.

## R5. Personnel photographs and the real site office (supplied 2026-10-10)

- **Files (git-ignored):** `assets-src/twin/reference/owner-personnel-office-2026-10-10/`: five personnel photographs named "Name - Role.jpg", and `Site office images/` with eleven photographs; contact sheets `sheet-*.jpg`.
- **The owner's instruction:** build the real staff office, outside and inside, into the site; give the staff their real faces (2D or 3D, whichever suits) on bodies made for them.

**Personnel photographs received (5 of the roster; more to come):**

| File name gives | Notes for the modeller |
| --- | --- |
| Amor Floresca Jr., Geo Mapper | Front-facing selfie, indoor light |
| Elbert Figuracion, AutoCAD Operator | Front-facing, wide grin, glasses: ask for a neutral-expression photo too |
| Jayson Aggabao, Document Controller | Front-facing, glasses, slightly low angle |
| Noel Lavapie, Project Control Head | Front-facing, glasses, smiling |
| Randy Gamboa, Admin Assistant | Not yet viewed: check it before use |

The roles in these file names are the real ones and replace v1's invented titles for the same people in `people.json`. Each is a single front photograph taken close with a phone (some lens distortion). For a good 3D likeness ask the owner for, per person: one front photo with a neutral face, one of each side, from about 1.5 m with the phone at eye level, in even shade, glasses off for one of them. P07c works with what exists and improves when better photos arrive.

**Added 2026-10-15** (`assets-src/twin/reference/owner-personnel-2026-10-15/`, git-ignored; front and both sides, the best sets so far):

| Person and role | Photos | Notes for the modeller |
| --- | --- | --- |
| **Zandre Villaver, Mechanical Superintendent** (staff: white hard hat on site) | front, right side, left side | Man in his fifties; very short buzz-cut greying hair; round face with full cheeks and a soft jawline; thin moustache shadow; rectangular thin-rim glasses (dark brown and gold); small stud earring in the left ear; silver curb chain necklace; stocky build. Photographed in a black T-shirt with a yellow panther graphic (off duty): on site dress him in the staff outfit, keep the glasses, chain and earring as his own details |
| **Marvin Sibal, Safety Officer** (staff: white hard hat) | front, right side, left side, back | Man in his thirties; short black hair under the hat; round face; thin moustache and chin stubble; solid build. **His real kit is the reference for the safety officer:** white MSA V-Gard full-brim hard hat (scuffed, writing on the brim, a sticker on the back, ratchet harness) with a green chin strap; the owner's site vest (lime mesh with silver reflective tape, open front: see the vest note in P07); a green retractable ID reel holding his ID card and an orange safety whistle; black T-shirt; an olive-brown backpack carried every day; dark trousers |
| **May Ann Parallag, Planning Engineer** (staff) | front, both sides, back | Woman in her late twenties or thirties; black hair pulled back into a long low ponytail with a dark elastic; round face, light freckling; white wireless earbuds; black bead bracelet with a gold charm. Wears the green polo with the white Sta. Clara mark on the chest and "JUNIOR ENGINEER ... PROGRAM" across the back. At her desk: laptop, black mug, a sage tumbler, a small desk fan, a phone propped up |
| **Angelo Sarmiento, Timekeeper** (staff) | three-quarter, both sides, back | Man in his late twenties or early thirties; short black hair, spiky and swept forward; slim face, thin moustache; slim build. Pale grey-green fitted T-shirt. At his desk (a "HR DEPT" monobloc chair): laptop, a blue steel water bottle, timesheets and signed forms, a highlighter, a "TUNNEL 2 OUTLET" tag |
| **Rovigail Joy Abellar, HR Officer** (staff) | front, three-quarter, side, back | Woman in her thirties or forties; straight shoulder-length dark brown hair with light bangs; thin dark rectangular glasses; a small mole by the mouth; dark red nails; full figure. Black T-shirt and light jeans. Her corner: a laptop, a pink round mirror, a grey "COFFEE" tumbler, a woven pouch, receipts and bus tickets pinned on the wall |
| **Elbert Figuracion, AutoCAD Operator** (staff; replaces the grinning single photo of 2026-10-10) | front, both sides, back | Man in his thirties; thick black hair in a rounded mushroom cut with an undercut; large black-to-clear gradient square glasses; wired white earphones. Black "COFFEE BREAK" T-shirt, khaki trousers. Laptop with an NVIDIA sticker, a coconut drink bottle, a maths book, a black laptop bag; works near the Project Control file cabinets |
| **Johnny Farong-Ey, Surveyor** (staff) | front, side, three-quarter, back | Man in his fifties; short grey-and-black hair with a faded back and sides; lean weathered face, light stubble. Light grey vented field shirt with chest flap pockets and a black triangular patch on the left sleeve, over a grey T-shirt; jeans. A phone with a survey app and a green document folder on the table |

| **Amor Floresca Jr., Geo Mapper** (staff; replaces the selfie of 2026-10-10) | front, both sides, back | Man in his fifties or sixties; very short grey-black hair, thinning and receding at the crown; lean lined face, light stubble, moles on the cheek; slim. Charcoal micro-check short-sleeve button shirt with a small embroidered pocket logo. His cubicle: graph-paper survey books and printouts, a laptop, a desk calendar, a glasses case, water bottles, a rock sample; a hi-vis vest hangs on his chair |
| **Jayson Aggabao, Document Controller** (staff; replaces the photo of 2026-10-10) | front, both sides, back | Man in his late thirties or forties; short black hair going grey at the sides, receding at the temples; round face, moustache and chin stubble; solid build. Mustard-yellow T-shirt with a navy "Los Angeles" tiger print; glasses pushed up on his head. His cubicle (a monobloc chair marked "I.T."): laptop, a Brother document scanner, a mug, filing notices and process charts pinned to the partition, the "Treasury Department" sign nearby |

Photos of 2026-10-15 replace the single 2026-10-10 photos where both exist.

Who they are in `people.json`: v1 holds invented or older names for these posts (a "Superintendent I - Mechanical", a "Mechanical Supervisor", an "ESH Head"). **Owner's answer (2026-10-15): both are added alongside the existing records, never merged.** The real headcount for these posts: **two Mechanical Superintendents** (Zandre Villaver and one other), **one Mechanical Supervisor**, and **four to six Safety Officers** (Marvin Sibal is one) under the ESH Head. P07c and P09 staff the site to these numbers. Expressions are mostly neutral to a slight smile, so these sets are good enough for a 3D likeness without asking for more.

**The real site office (model this, not v1's invented interior):**

- **Outside:** a long single-storey building of white insulated wall panels on a low concrete base, with a shallow-pitch metal gable roof on green steel columns and rafters, overhanging eaves, green window frames with sliding windows and patterned curtains. Over the entrance: the Sta. Clara logo and a sign reading "Tumauini HEPP OFFICE". Beside the door: the **Project ESH Statistic Board** (a large printed board with handwritten figures on white cards), a notice board, a red tarpaulin awning, segregated waste bins with coloured lids, a signboard on a stand. A white double-cab pickup parked on the bare earth and gravel yard in front. Forested ridge behind.
- **Inside, the plan:** the entrance opens into a **straight central corridor** running the length of the building to a second door at the far end (daylight visible through it). Rooms open off both sides behind white panel partitions with flush doors (some padlocked). Bare smooth concrete floor. No ceiling: the green steel trusses, purlins and the silver insulation under the roof sheets are exposed, with LED bulbs hanging on flex and **orange-red electrical conduit** running along walls and overhead. In the corridor: two black leatherette sofas, fire extinguishers on stands, potted snake plants, a small table with a logbook, safety vests hanging by a door.
- **Engineering and Project Control Department (with IT):** a large open bay marked by a hanging sign on a green column. Folding tables pushed together as shared desks, white and green monobloc plastic chairs, laptops and monitors, a few desktop towers, a whiteboard with writing, stand fans and wall fans, a water dispenser with a purple jug on a mat, hard hats and hi-vis vests hung on wall hooks, backpacks on chair backs, mugs, a kettle, extension cords, paper stacks, a long brown-topped table, framed certificates on the corridor wall outside.
- **PED Department and subcontractor area:** a cluster of low white-panel cubicles toward the far end near the exit, with small desks.
- **The far end:** an exit door opening onto grass, an emergency exit sign with twin emergency lamps above it, comfort rooms for men and women to one side behind a tiled or dark-painted lower wall, a fire extinguisher.
- **Notices on the walls:** "No smoking / Bawal manigarilyo"; "Bawal dumura" (no spitting); health alerts (hydration colour chart and others); a heat-stress awareness poster; a blood-donation notice; the emergency response team chart; a site map; warning notices. Reproduce these as the kind of notices they are; keep health and safety wording generic and correct.
- **The ESH Statistic Board** carries real incident figures. The layout is modelled; the figures shown in the twin are blank cards or simulated values marked as such, under the confidentiality rule, unless the owner approves showing the real ones.

## R6. The scheme's real places and terrain (owner, 2026-10-16)

The owner gave Google Earth views of five places along the project. Coordinates are the owner's; ground heights are from Copernicus GLO-30 (30 m grid, sampled through the free Open-Meteo elevation API on 2026-10-16, so they are the ground before excavation and can be off by 10 to 20 m on steep slopes). Data: `reference/terrain/scheme-grid-275m.json` (a 45 by 57 grid at about 275 m over 17.26 to 17.37 N, 121.90 to 122.04 E) and the shaded relief `reference/terrain/relief-scheme.png` (circles: magenta Antagan I, cyan Guard House 1, blue Temfacil, orange powerhouse, red weir). Script: `scripts/twin/reference/terrain-grid.mjs`.

| Place | Coordinates | Ground | What is there (owner) |
| --- | --- | --- | --- |
| **Antagan I** | 17.28333 N, 121.93095 E | about 104 m | Barangay at the edge of the Cagayan Valley plain; in practice the way in to the project (not an official gate) and **the only way in** |
| **Guard House 1**, near Tan-Awan Bato | 17.31072 N, 121.95875 E | about 508 m | Guard house on the high ground the road crosses; a **narrow, deep valley road** runs near it |
| **Temfacil** | 17.31883 N, 121.97494 E | about 260 m | Staff office, staff house, canteen, workers' barracks, QA/QC office, Guard House 2 |
| **Surge tank, powerhouse, motor pool** | 17.31712 N, 121.97227 E | about 266 m natural ground (the powerhouse floor is excavated to Elev. 188) | The powerhouse location of the twin |
| **Pipe bridge: Tunnel 1 outlet and Tunnel 2 inlet** (added 2026-10-16; the owner first called it "Tunnel Outlet 2", then asked for the drawing names to be used) | 17.32238 N, 121.97431 E | about 310 to 314 m natural ground; tunnel level about Elev. 272 | About 400 m north of Temfacil, at the head of a steep forested gully. **This is the twin's `midway` location** (P00a placed it 35 m away from the drawings). Tunnel 1 from the weir comes out here, crosses the gully on the pipe bridge and goes straight into Tunnel 2, which runs 535 m to its outlet portal at the surge tank. Use the drawing names (R7) |
| **Weir** | 17.33775 N, 121.99830 E | about 302 m (the flood wall is Elev. 303) | Weir, plus workers' barracks, a staff office and a house |

**What the terrain says:**

- **The project is inside the range, not at its foot.** The main valley runs from the plain at Antagan north-east into the mountains, past Temfacil and the powerhouse, and on to the weir. Beyond the weir the land rises to ridges of about 1,000 to 1,050 m (4 to 6 km north-east of Temfacil) and keeps on to the coast at Maconacon. **No road crosses to Maconacon**: the project road is a dead end in the mountains. Maconacon is reached only by sea and air.
- **The road climbs over a ridge, then drops into the valley.** Straight-line ground profile from Antagan (about 100 m) to Guard House 1 (about 470 to 510 m): a climb of about 400 m over 4.2 km in a straight line, so the road (longer, with bends) averages about 8 to 10 percent with steeper pitches, steepest in the last kilometre below the guard house. From Guard House 1 down to Temfacil: a descent of about 220 to 250 m over about 2 km straight. The road from Temfacil to the weir cannot go straight (a 730 m ridge lies on the line), so it follows the river valley upstream and climbs about 40 to 50 m net with ups and downs.
- **The valleys are deep and narrow.** Cross-sections every 250 m on the 30 m data:
  - At the powerhouse the valley floor is about 240 to 260 m, with walls reaching about 400 m within 750 m on the west and about 680 m at 2 km on the east.
  - At Temfacil the north side climbs to about 660 m within 1.5 km.
  - At the weir the floor is about 320 m, and both sides rise to 700 to 800 m within 2 km. The valley floor there is only a few hundred metres wide.
  - In short, the valleys are **300 to 500 m deep**.
- **Slopes:** within 3 km of Temfacil the coarse grid gives a median slope of 16 degrees and a top tenth above 25 degrees; real slopes are steeper (the 275 m grid smooths them), with 30 to 45 degrees and cliffs common on valley walls, as the owner's photographs and Google Earth show.
- **The plain is close.** From Antagan west it is flat Cagayan Valley farmland at about 60 to 100 m: the view from Guard House 1's ridge looks down on it.

**The owner's Google Earth views:**
- Weir: https://earth.google.com/web/@17.33774766,121.99829971,312.05950997a,930.28097429d,30y,0h,0t,0r/data=CgRCAggBMikKJwolCiExZDVVSGpjU1o5UXVZNHhsZnR5bUo2Qnk3M2F6MnRxckYgAToDCgEwQgIIAEoICKfY48sFEAE
- Temfacil: https://earth.google.com/web/@17.31883341,121.97493672,242.5273643a,571.40189983d,30y,-0h,0t,0r/data=CgRCAggBMikKJwolCiExZDVVSGpjU1o5UXVZNHhsZnR5bUo2Qnk3M2F6MnRxckYgAToDCgEwQgIIAEoICKfY48sFEAE
- Surge tank, powerhouse, motor pool: https://earth.google.com/web/@17.31711849,121.97227157,238.23673446a,418.23699914d,30y,8.62801611h,0.54131373t,359.99999882r/data=CgRCAggBMikKJwolCiExZDVVSGpjU1o5UXVZNHhsZnR5bUo2Qnk3M2F6MnRxckYgAToDCgEwQgIIAEoICKfY48sFEAE
- Antagan I: https://earth.google.com/web/@17.28333306,121.93095195,103.82743368a,272.12209837d,30y,8.61389922h,0.54130128t,0r/data=CgRCAggBMikKJwolCiExZDVVSGpjU1o5UXVZNHhsZnR5bUo2Qnk3M2F6MnRxckYgAToDCgEwQgIIAEoICKfY48sFEAE
- Guard House 1 (near Tan-Awan Bato): https://earth.google.com/web/@17.31072069,121.95874949,494.89281818a,314.2352865d,30y,8.62372434h,0.54130467t,0r/data=CgRCAggBMikKJwolCiExZDVVSGpjU1o5UXVZNHhsZnR5bUo2Qnk3M2F6MnRxckYgAToDCgEwQgIIAEoICKfY48sFEAE

**Seen in Google Earth 3D (2026-10-16, the app's built-in browser; imagery dated 4 April 2026 near the works, May 2021 and newer further out). Reference only: Google imagery is never used as a texture.**

- **Antagan I:** a farming barangay on the flat valley floor, houses along a road, fields and dry grassy hills. Here the river leaves the mountains as a **wide braided gravel river** with bare bars, close to Blue Spring river and Magoli Eco Park. The road leaves the village and climbs into the hills on the **north-west side of the river**.
- **Antagan to Guard House 1:** a dirt road winding up the foothills and then **along the crest of a ridge**, through a patchwork of forest in the gullies and open, red-brown burned or cogon grassland and old clearings (kaingin) on the spurs. Tan-Awan Bato, a marked viewpoint, sits on this ridge at the guard house.
- **Guard House 1 down into the valley:** from the ridge the road drops down a forested slope in a **staircase of very tight switchbacks** (well over ten hairpins), to the valley bottom. Beside it the **Tumauini River runs in a deep, steep-sided gorge** with a narrow gravel-bed channel: this is the "narrow deep valley road" the owner described.
- **Temfacil and the powerhouse:** in **closed, dense forest** on the valley side. The powerhouse is an excavated pad with the surge tank on the slope above and the switchyard below; Temfacil's buildings (red and blue roofs) sit on a cut bench on a spur above it, linked by a looping road with more hairpins climbing the hill. The river below has wide gravel bars; the slope opposite is partly bare, burned grassland.
- **Temfacil to the pipe bridge (Tunnel 1 outlet, Tunnel 2 inlet):** a narrow dirt track leaves Temfacil heading north and climbs about 50 m in roughly 400 m (about 12 to 13 percent on average, steeper in places) up a forested hollow in tight zigzags, past a small structure, to a cut work pad at the head of the gully with a shed and a workshop roof, spoil spread down the slope, and the tunnel portal in the cut face. Closed forest presses in on every side.
- **The weir:** the river comes out of a narrow valley from the north-east; the weir works occupy a cleared, levelled area on the **north-west bank**, with the river diverted along a channel and gravel bars downstream. The north-west slope is dense forest; the south-east slope is grassier. The road reaches it along the river bank from the south-west.
- **Everywhere:** steep slopes, few flat places (every building, pad and camp stands on an excavated bench), red-brown soil where cut, gravel-bed river, and a strong contrast between dark closed forest in gullies and on the north-west faces and lighter grass and burned patches on exposed spurs. Other marked places nearby: Kagumatan Falls, Kweba Danum (a cave), Camasi and Cumabao (place names on the map).

**Still to do in P03e:** trace the exact road line from the imagery into `routes.json` (Google Earth's path tool, exported as KML), and capture reference stills of the five places for the review comparison.

## R7. Weekly and Monthly Accomplishment Reports (SharePoint; read 2026-10-16)

- **Where:** `LUZ-21-009 / 03 Project Planning & Cost Control / 02 Weekly Accomplishment Report` (487 files, about 11 GB: a PDF and spreadsheets each week, 2023 to October 2026) and `05 Monthly Accomplishment Report` (123 files, about 4 GB: April 2022 to September 2026). The owner gave a view link to each; **both links are secrets kept only in the git-ignored `assets-src/twin/reference/share-links-2026-10-16.txt`**, never in tracked files, commits or the app. File list: `assets-src/twin/reference/weekly/list.json`.
- **Read so far:** WAR-235 (9 October 2026, 37 pages) and MAR-54 (September 2026, 30 pages), rendered to `assets-src/twin/reference/weekly/war235/` and `mar54/` (git-ignored). Each report has summary and manpower pages, equipment status, design status, **progress photographs by work front** (desander, Tunnel 1, pipe bridge, Tunnel 2, surge tank, penstock, powerhouse and switchyard, access roads) and **key plans** (Headrace Tunnels 1 and 2 with long sections, weir, desander, surge tank, penstock, powerhouse). Earlier reports show the same fronts at earlier stages: use them for P05f's construction stages and P14b's timeline.
- **Rules:** photographs and drawings are reference only and stay git-ignored. Quantities, percentages, manpower, equipment lists, costs and incident figures are internal and never enter the twin; only physical facts (what is where, how it looks, what stage it is at) do.

**What the key plans and photographs show (WAR-235, 9 October 2026):**

- **The tunnel names, from the drawings:** **Headrace Tunnel 1** runs from the **weir** (inlet, about Elev. 290.4 at Sta 0+000) to its **outlet at the pipe bridge** (Sta 3+008.95, about Elev. 272): **3,008.95 m**, which settles the P00a question (the older 2.58 km is not used). It was driven from both ends and has **holed through**; the outlet reach is being lined with concrete walls. The ground over it rises to about 720 to 740 m, so the rock cover reaches about 450 m. **Headrace Tunnel 2** starts at its **inlet portal beside the pipe bridge** (Sta 0+000, Elev. 272.00) and runs **535 m** to its **outlet portal at the surge tank** (Sta 0+535, Elev. 271.465), under a ridge about 80 m higher; it is driven from both ends, with a short length left in October 2026. The site's everyday name "Tunnel 2 Outlet" is that surge-tank end.
- **Pipe bridge:** a reinforced concrete box bridge with wing walls carrying the waterway across a **narrow rock gully** between two horseshoe tunnel portals cut into near-vertical cliffs faced with shotcrete, forest hanging above. Built in lifts inside dense tube scaffolding; the top slab was poured at night under floodlights.
- **Tunnels inside:** horseshoe section with closely spaced **steel rib supports**, mesh and shotcrete; wet floors with pumped water; a twin-boom jumbo at the face, a loader mucking, ventilation duct, cables and pipes along the walls; surveyors with a total station; workers in red, green and white hard hats with hi-vis.
- **Surge tank:** a tall **cylindrical concrete tower, 12.00 m in diameter**, on a cut pad under a high cut slope, raised in lifts inside scaffolding wrapped in green safety netting.
- **Penstock:** a **2.70 m diameter steel pipe** from the surge tank straight down the steep slope on concrete **saddle supports and thrust blocks TB-01 to TB-05**, bifurcating at TB-03 into the two units just above the powerhouse (floor Elev. 188.04). A flood wall and the switchyard sit beside the powerhouse; the line goes to the ISELCO II San Mateo substation.
- **Powerhouse and switchyard:** a concrete building in scaffolding at the foot of the penstock slope, below a high **orange-red cut slope of weathered rock and soil**; a fenced switchyard with a transformer under a yellow tarpaulin; an excavator and a transit mixer working in tight space.
- **Weir and desander:** a concrete weir across the bouldery river with gated bays, an intake and an abutment, water spilling through one bay; the desander is a long concrete basin divided into bays, set in grey river gravel and rock beside a muddy pool.
- **Access road:** excavators cutting and grading the permanent road to the powerhouse through red-brown soil and rock on steep forested slopes beside the river.

## R2. Monthly Project Review presentations (SharePoint)

- **Link:** shared folder "04 Monthly Project Review Presentation" under `LUZ-21-009 / 03 Project Planning & Cost Control` on the Tumauini project OneDrive. The link itself opens the folder without sign-in, so it is treated as a secret: it is stored only in the git-ignored file `assets-src/twin/reference/share-link.txt` and must never be written into a tracked file, a commit message or the app. Run the scripts from the project root; they read the link from that file.
- **Contents:** year folders 2022 to 2026, one month folder each, one PowerPoint per month. Latest seen: `2026/08 August/20260828_LUZ-21-009_MPR-53_40522MParallag.pptx`, 58.5 MB, 116 slides, dated August 28, 2026.
- **Downloaded 2026-10-09 with the owner's permission (latest deck only):** `assets-src/twin/reference/mpr-53/` (git-ignored). Contents: `MPR-53_2026-08.pptx`; `unzipped/ppt/media/` (236 images: 202 photos, 33 diagrams, 1 EMF); `slides.md` (every slide's text and which images it uses, in order); `sheets/` (contact sheets made for review). Earlier decks are not downloaded.
- **How it was extracted:** unzip the .pptx; `slides.md` built from the slide XML. Slides cannot be rendered as pictures on this machine (no PowerPoint or LibreOffice automation was set up), so tables that exist only as pictures (S-curve, transmission line, billing) are unread.

### The whole folder, surveyed 2026-10-09

- 98 files, 3.3 GB: 53 presentations from April 2022 (MPR-01) to August 2026 (MPR-53), plus PDF copies and a few spreadsheets. Listed in `assets-src/twin/reference/mpr-list.json`.
- **All 53 presentations are text-indexed** in `assets-src/twin/reference/mpr-index/*.md` (one file per deck: every slide's text and the names and sizes of its images). This was done by partial reads, so the photos of most decks are **not** on disk.
- **On disk in full:** MPR-53 (Aug 2026, `mpr-53/`), MPR-18 (Sep 2023) and MPR-06 (Sep 2022) in `mpr-decks/` (unpacked under `unz-*`).
- **Photos pulled per area** from other decks into `assets-src/twin/reference/area-photos/<deck>/` with a `CAPTIONS.txt` each (see the table at the end of this section for what was pulled).
- Whole-deck downloads ran at about 0.15 MB/s on the day, so the rest were not downloaded. Tools to fetch more, kept in `scripts/twin/reference/`: `sp_tool.py` (`list`, `index`, `pick <deck> <caption regex>`, `get`) and `sp_get.sh`.
- `assets-src/twin/reference/mpr-progress-series.csv`: actual percent complete per work front per month, October 2025 to August 2026, extracted from the indexes.

### Site development plan (MPR-18, September 2023, `mpr-decks/unz-0018/ppt/media/image15.png`)

A plan over satellite imagery, north up. Read from it:

- The **weir, desander and Tunnel 1 inlet portal** are at the north-east end on the river, with a **mixing facility** and the **satellite Temfacil** beside them.
- **Tunnel 1** runs straight south-west, labelled L = 3010 m. That is an early design figure: the 2026 decks use chainages from Sta. 0+021 to 2+579. **The owner has decided the latest figure is the one to use: Tunnel 1 is about 2.58 km.**
- At its lower end, close together: **Tunnel 1 outlet portal, pipe bridge with catwalk access, Tunnel 2 inlet portal**.
- **Tunnel 2**, L = 535 m, continues south to its **outlet portal** at the **surge tank**; the **penstock**, L = 150.00 m, drops to the **powerhouse**.
- The **main Temfacil** is not beside the powerhouse: it sits on the access road uphill, between the Tunnel 2 area and the powerhouse, with a second **mixing facility** below it.
- **Access road to powerhouse:** approx. 3.5 km, maximum gradient 15%, arriving from the south-west. **Access road to weir area:** approx. 7.1 km, maximum gradient 15%, winding north-east from the main Temfacil.
- The midway cluster (Tunnel 1 outlet, pipe bridge, Tunnel 2 inlet) is only about 535 m of tunnel from the surge tank. P03a should check whether `midway` and `powerhouse` (with the main Temfacil between them) fit one terrain of about 1.2 km; if so, merge them into one location and record the decision.

### Project history from the indexes (for `data/history.json`)

| When | What |
| --- | --- |
| Apr 2022 | Contract start (12 Apr). Topographic and location surveys of the powerhouse, surge tank, penstock and tunnel outlet; proposed temporary facility sites |
| Sep 2022 to 2023 | Access roads piloted, cut, widened, graded: AR01 to the powerhouse (stationing to about 3+500), AR02 to the weir and tunnel inlet, AR03 to the head tank / surge tank, AR04 to the tunnel outlet, AR05 from Oct 2023. Geotechnical boreholes at the pipe bridge and surge tank. Landslide clearing Jan 2023 and Nov 2023. Cross drains on AR01 mid-2023 |
| Apr to Jul 2023 | Sites chosen: main Temfacil along AR03, laydown along AR02, a Temfacil near the tunnel outlet; weir Temfacil area prepared |
| Jul 2023 to late 2024 | Main Temfacil built: workers' barracks 1 (retrofitted) and 2, common toilet, warehouse, site clinic, genset and compressor shed, site office, ESH office, staff accommodation, canteen, motor pool and fabrication area, its access road |
| Nov 2023 to mid 2025 | Tunnel 1 outlet portal and underground excavation by drill and blast; explosives magazine area from Dec 2023 (extended Oct 2024) |
| Mar 2024 on | Weir: river diversion, cofferdam, excavation; satellite Temfacil site development. Typhoon damage and restoration of river access and cofferdam, Oct to Dec 2024; flood wall rebuilt at Elev. 303 |
| Late 2024 | Tunnel 2 excavation from the outlet; Tunnel 2 inlet portal; penstock excavation and lean concrete; powerhouse excavation (Dec) |
| 2025 | Tunnel 1 adit portal (Jan); surge tank excavation (Feb) and rebar (Mar); desander excavation (Feb); penstock saddles; weir satellite barracks, staff house, canteen, mixing facility and crusher (through mid-year); volumetric concrete plant (Jun); pipe fabrication and pipe bridge (Jul on); powerhouse raft footing at the small turbine, Elev. 187.17 to 188.24 (Sep, Oct); structural steel and roofing, control room and guardhouse, switchyard transformer pad (Oct on) |
| 2026 | Tunnel 1 lining; Tunnel 2 final metres of excavation; weir, intake and desander concrete and gates; surge tank lifts 14 to 16; penstock painting and hydro-test preparation; powerhouse architectural and electromechanical works; switchyard foundations; transmission line (from Jun) |

### What the main camp really looks like (MPR-18 photos)

Two-storey prefabricated barracks: light sandwich-panel walls on a green-painted steel frame, sliding windows, an open access balcony with steel railings along the upper floor, an external steel stair at one end, low-pitch metal roof on green purlins, plywood ceiling panels. CHB perimeter and room walls nearby. Ground is bare compacted earth and gravel. Slabs poured on wire mesh with steel edge forms. A tracked excavator and a portable mixer on site. Workers in green hard hats and hi-vis vests.

### Photo sets pulled per area (`assets-src/twin/reference/area-photos*/`)

A folder is complete when it contains `CAPTIONS.txt` (slide numbers and their captions).

| Folder | Deck | What it covers |
| --- | --- | --- |
| `area-photos-camp/2024_10_October` | MPR-31, Oct 2024 | Main Temfacil: drone view of the whole camp, barracks floor plan, clinic floor plan, motor pool and fabrication shed |
| `area-photos/2024_10_October` | MPR-31 | Weir satellite barracks (inside, after typhoon mud), staff house floor plan, magazine compound |
| `area-photos/2025_01_January` | MPR-34, Jan 2025 | Weir river diversion and cofferdam, adit portal development |
| `area-photos/2025_06_June_UTU` | MPR-39, Jun 2025 | Volumetric concrete plant, satellite barracks, canteen, staff house, tunnel key plans, cofferdam |
| `area-photos/2025_09_Septembe` | MPR-42, Sep 2025 | Powerhouse raft footing at the small turbine, control room backfill |
| `area-photos/2025_11_November` | MPR-44, Nov 2025 | Desander 3D model, powerhouse substructure 3D model, control room slab pour with boom pump |
| `area-photos/2023_12_December` | MPR-21, Dec 2023 | Magazine area |
| `area-photos/2024_04_April*` | MPR-25, Apr 2024 | River diversion at the weir |
| `mpr-decks/unz-0018` | MPR-18, Sep 2023 (whole deck) | Site development plan, main camp under construction, access roads AR01 and AR02 |
| `mpr-decks/unz-0006` | MPR-06, Sep 2022 (whole deck) | Access road AR01 piloting, boreholes, early surveys |
| `mpr-53/unzipped` | MPR-53, Aug 2026 (whole deck) | Every work front as of September 2026 |

Further things read from these:

- **Main camp from the air (Oct 2024):** four or five long single- and two-storey buildings with weathered, partly rusted corrugated roofs on a cleared bench cut into forest, beside a bend of the access road; pipe and material stockpiles under blue tarpaulins along the road; parked vehicles; a separate pad with a water tank and stores. It is a working construction camp, not a tidy compound.
- **Workers' barracks plan:** six bunk rooms (RM1 to RM6, double-deck beds along the walls) around a central common area, with a covered entrance.
- **Staff house plan:** rooms RM1 to RM3, a female's room, laundry area, male toilet and bath, a common area with a dining table, a superintendents' and senior staff room, a construction managers' room and two guest rooms, each of the last four with its own toilet.
- **Clinic plan:** one room with an examination bed, nurse desk, cabinet, an air-conditioning unit, a toilet and bath, and an entrance ramp.
- **Motor pool and fabrication area:** an open steel-framed shed with a metal roof on a gravel pad.
- **Magazine:** shipping containers inside a chain-link fence at the foot of a cut slope.
- **Satellite barracks:** steel-framed, metal-clad sheds with steel bunk frames; photographed being cleaned of mud after a typhoon.
- **Powerhouse under construction (Nov 2025):** dense tube scaffolding, column rebar cages standing above slab level, a red truck-mounted boom pump pouring the control-room slab, the black penstock end visible at the rock face behind.
- **3D models in the decks** (grey massing models of the powerhouse substructure with both unit pits and the stair, and of the desander): the best available shape reference until drawings are supplied.

### Confidentiality

Sections A (KPI ratings), D (cost, margin, budget), E (billing and collection), the customer survey and the ESH incident counts are internal. **None of it may appear in the public twin, in `public/`, in code comments or in commits.** Only physical facts (what structures exist, what they look like, what work is under way, percent complete if the owner approves showing it) are used.

### Real scope of the project (section B)

The scheme runs several kilometres from the river intake to the powerhouse. v1 models only the downstream end.

| Work front (deck's own grouping) | What it is | In v1? |
| --- | --- | --- |
| Weir, intake, RCC abutment | Concrete overflow weir across the river, sluiceway with 4 gates, intake with 2 gates and trashracks, fish pass, feeder canal, left abutment in segments | No |
| Desander | Long multi-cell concrete basin in 9 segments, flushing channel, control room, tunnel transition | No |
| Tunnel 1 | About 2.58 km (chainages Sta. 0+021 to 2+579), inlet and outlet portals; now in lining: initial and final shotcrete, wall lining, invert slab | v1 shows one short "headrace tunnel" in drill-and-blast |
| Headrace pipe, pipe bridge, Tunnel 2 | Pipe bridge with catwalk, Tunnel 2 about 535 m; still being excavated by drill and blast at the outlet in poor ground with steel rib support | No pipe bridge; no second tunnel |
| Surge tank | Circular reinforced-concrete shell poured in 16 lifts, ring scaffold | Yes (v1's "16-lift" label matches) |
| Penstock | Black steel pipe down a shotcreted slope on saddles, anchor blocks, ending at a concrete block above the powerhouse | Yes |
| Powerhouse, tailrace, switchyard, floodwall | See below | Yes |
| Transmission line | Subcontracted | Partly |

### What the powerhouse really looks like (photos image175, image179; models image176, image177)

Grey reinforced-concrete substructure with expressed columns; white-clad upper storey; blue corrugated roof with six translucent skylight panels; a lower lean-to annex with its own blue roof; scaffolding on all sides; window openings covered in red sheeting during construction; set in a tight rock-cut with a white shotcreted slope behind and the black penstock arriving from the hill. A steel portal frame with purlins carries the roof. The tailrace is under excavation in front, with a "big turbine" side and a "small turbine" side (confirms two units of different size). Electromechanical subcontractors named in the deck: Gugler and Petco.

### What people on site really wear (from the photos)

Green hard hats are the most common; red also appears; navy or blue long sleeves with yellow reflective bands; yellow or orange vests; face cloths or buffs; rubber boots in wet areas; a welder with a dark helmet and leather gloves. Use this, not v1's colour scheme, as the PPE basis in P07b until the owner supplies an official standard.

### Status as of the deck (owner to approve before any of it is shown publicly)

Dated 28 August 2026, photos to mid-September 2026. Overall 83.35% actual against 89.40% planned. By work front (actual): weir 83.52%, desander 81.63%, Tunnel 1 84.41%, headrace pipe and Tunnel 2 79.16%, surge tank 89.28%, penstock 85.11%, powerhouse/switchyard/floodwall 67.19%, transmission line 48.01%. Contract start 12 April 2022; revised completion 28 December 2026. Manpower on site 473 (management 7, staff 45, superintendents/supervisors/foremen 19, equipment staff 17, skilled 252, non-skilled 45, operators and drivers 59, security 15, subcontractor 14): use these proportions for `crew.json`.

### Activities photographed (use as the station and activity list for P09b)

Formwork and rebar installation, concrete pouring by lift, trashrack guide-frame installation, shotcrete spraying with fibre, tunnel invert and wall-lining pours, drilling, blasting and mucking, steel rib support installation, penstock grinding and painting preparation, bulkhead fabrication, hand-railing installation and welding, lean concreting, excavation, equipment-pedestal pours in the switchyard, backfilling, CHB laying and plastering.

### Consequences for the plan

1. **Scope decision for the owner:** add the upstream works (weir and intake, desander, pipe bridge, Tunnel 1 portals, Tunnel 2) as further locations, each on its own terrain patch and reached from the Places panel, or keep v2 to the powerhouse area and camp as v1 does. Recommended: add them after P05, as `P05g` (weir, intake, desander) and `P05h` (pipe bridge and tunnel portals), because they are where most of the visible construction is. This needs terrain data for those locations.
2. **P05e:** the long tunnel is Tunnel 1 and is in the lining stage; active drill and blast belongs to Tunnel 2. Stage the face cycle at Tunnel 2 and show lining work in Tunnel 1.
3. **P05a:** model the powerhouse from these photos and R1, not from v1's shape.
4. **P14b:** per-work-front percentages and dates exist monthly back to 2022; with the owner's approval they can drive the progress timeline.
