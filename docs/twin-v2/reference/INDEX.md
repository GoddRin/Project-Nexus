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
