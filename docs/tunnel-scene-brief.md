# Internal Technical Brief: Tumauini HEPP Headrace Tunnel Scene
**Project:** Tumauini Hydroelectric Power Project (THEPP) — Project Nexus Digital Twin  
**Client/Contractor:** Sta. Clara International Corporation (SCIC)  
**Document Type:** Technical Art Direction Reference & Grounding Specification  
**Target File:** `docs/tunnel-scene-brief.md`  
**Applicability:** Master reference for 3D modeling, texturing, animation, and UI across all subsequent implementation phases.

---

## 1. Real Construction Method & Engineering Sequence

### 1.1 Context: Philippine Run-of-River (RoR) Mini-Hydro Tunnels
On SCIC run-of-river hydro projects across the Philippines (such as the 8 MW Catuiran HEPP in Oriental Mindoro, Bakun in Benguet, Tubo in Abra, and the 19 MW Tumauini HEPP in Isabela), headrace tunnels traverse variable volcanic and sedimentary mountain formations (Sierra Madre / Cordillera mountain belts).
- **Diameter & Geometry:** 2.4 m to 3.5 m excavated diameter; standard horseshoe or modified D-shaped profile (arched crown, vertical sidewalls, flat/dished invert).
- **Excavation Method:** **Conventional Drill-and-Blast (D&B)**. Tunnel Boring Machines (TBMs) are cost-prohibitive and geologically inflexible for short-to-medium drives (1.2 km – 9.6 km) in faulted Philippine formations.
- **Support Design Standard:** Determined on-site by the geotechnical team using the **Rock Mass Rating (RMR)** and Norwegian **Q-System** to classify rock quality from Class I (Very Good) to Class V (Very Poor/Fault Zone).

### 1.2 The Cyclic Heading Advance Sequence
A single excavation round advances the heading by 1.5 m to 2.8 m through an unyielding 10-step cyclic sequence:

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                   DRILL-AND-BLAST HEADING CYCLE                         │
  └─────────────────────────────────────────────────────────────────────────┘
   [1] Survey Alignment & Face Stencil  ──► [2] Face Drilling (Jumbo/Jacklegs)
                                                         │
   [4] Fume Purge (Forced Ventilation)  ◄── [3] Explosive Charging & Blast
                 │
                 ▼
   [5] Gas Clearance (DOLE SO3 Check)   ──► [6] Scaling / Barring Down (Loose Rock)
                                                         │
   [8] Primary Support (Bolts & Ribs)   ◄── [7] Mucking Out (LHD Loader & Dumper)
                 │
                 ▼
   [9] Wet-Mix Shotcrete Application    ──► [10] Advance Alignment to Next Round
```

1. **Survey Alignment:** Surveyor marks the tunnel centerline (`CL`), grade line, and perimeter outline on the rock face using a total station and red laser line.
2. **Face Drilling:** Compact 1-boom electro-hydraulic drill jumbo or 2–3 pneumatic handheld jackleg drills (e.g., Atlas Copco BBC / Toyo) drill 35–55 blast holes (38–45 mm diameter, ~2.4 m depth) surrounding 3–4 central uncharged reamer holes (burn cut).
3. **Charging & Priming:** The licensed blaster charges holes with emulsion cartridges and Non-Electric (Nonel) shock-tube detonators with millisecond delay timing.
4. **Blasting & Fume Evacuation:** The round is fired from a secure shelter outside. High-capacity axial fans outside the portal force fresh air through overhead flexible ducting to purge carbon monoxide ($CO$) and nitrous fumes ($NO_x$).
5. **Atmospheric Gas Clearance:** The DOLE-accredited Safety Officer enters with a multi-gas monitor ($O_2, CO, NO_2, H_2S, CH_4$) and declares the heading safe for re-entry.
6. **Scaling ("Barring Down"):** Miners use 2.5 m–3.5 m aluminum/steel scaling bars to lever down cracked, loosened rock slabs from the crown and sidewalls before anyone walks beneath.
7. **Mucking Out:** A low-profile underground LHD wheel loader (e.g., Sandvik LH203 / Cat R1300) scoops blasted rubble ("muck pile") into narrow-profile dump trucks or rail muck carts to haul material out to the portal muck dump.
8. **Primary Rock Support:**
   - *Good/Fair Rock (Class I–III):* Resined/grouted rebar rock bolts (20–25 mm dia, 2.4 m long) on 1.2 m–1.5 m grid spacing with $150\times150\text{ mm}$ domed square bearing plates.
   - *Poor/Faulted Rock (Class IV–V):* Heavy steel rib sets (TH-arches / H-beams spaced at 0.8 m–1.2 m) with welded wire mesh ($100\times100\text{ mm}$, $\phi 5\text{ mm}$) pinned against the rock.
9. **Shotcreting:** Wet-mix sprayed concrete (50–150 mm thick) with alkali-free accelerator and hooked-end steel fibers ($30\text{--}40\text{ kg/m}^3$) sprayed onto the rock and mesh, embedding the steel arch.
10. **Final Lining (Later Phase):** Cast-in-place reinforced concrete invert slab and hydraulic arch lining poured using collapsible steel shutter forms.

---

## 2. (a) Stage-by-Stage Visual Description of Tunnel Lining State

To depict authentic construction progression rather than a uniform fantasy cavern, the tunnel scene must exhibit **four distinct, contiguous visual zones** progressing from the active face backward toward the portal:

```
Portal Adit                                                                   Active Heading
  [====================|====================|====================|==================>>]
   Zone 4: Final Lining   Zone 3: Shotcrete    Zone 2: Ribs & Mesh  Zone 1: Active Face
   (Smooth Concrete)      (Sprayed Texture)    (Steel Arches)       (Jagged Raw Rock)
```

### Zone 1: Active Blasted Heading & Muck Face (`STA 1+445` to `STA 1+450`)
* **Geometry:** Jagged, freshly-fractured rock face with sharp crystalline contours. Remnants of drill-hole cylinders ("candle ends" or half-barrels) visible along the perimeter contour.
* **Surface Materials:** Raw dark basalt/andesite, damp with wet sheen. Muck pile at the base: a chaotic slope of angular rock fragments ranging from fine dust to 500 mm boulders.
* **Visual Props:** Bright twin-LED floodlights on yellow tripod frames, paint-marked drill hole targets, water puddle at the invert base, pneumatic drill air-water hoses snaking across the floor.

### Zone 2: Temporary Support & Steel Rib Arches (`STA 1+400` to `STA 1+445`)
* **Geometry:** Horseshoe profile framed by heavy curved steel sets (TH-profile steel arches or W-beam ribs) spaced every 1.0 meter.
* **Surface Materials:** Galvanized steel welded wire mesh ($100\times100\text{ mm}$) spans between ribs, through which fractured raw rock is visible. Square domed rock-bolt bearing plates ($150\times150\text{ mm}$) and hexagonal nuts protrude from rock faces.
* **Visual Props:** Wooden blocking wedges wedged between the steel ribs and rock overhangs; fresh white/orange chalk geological classification notes on the rock (e.g., `RMR: 42 - Class IV`).

### Zone 3: Fibre-Reinforced Shotcrete (FRS) Lining (`STA 1+200` to `STA 1+400`)
* **Geometry:** Continuous arched shell. The sharp ridges of the steel ribs and mesh are softened into structural bumps under 100–150 mm of sprayed concrete.
* **Surface Materials:** Matte medium-grey, rough "orange-peel" sprayed concrete texture. Tiny steel fiber needles glint under worklights. Dark water seepage stains bleeding through seams.
* **Visual Props:** PVC pipe weep holes (50 mm dia) inserted into the lower sidewall discharging small trickles of groundwater; chainage station numbers stenciled in high-visibility fluorescent orange paint (`STA 1+250`, `STA 1+300`).

### Zone 4: Finished Cast-in-Place Concrete Lining (`STA 0+000` to `STA 1+200`)
* **Geometry:** Geometrically true, smooth horseshoe hydraulic conduit.
* **Surface Materials:** Smooth, light-grey monolithic formwork-finished concrete with subtle horizontal form-tie impressions and panel seams every 6 meters.
* **Visual Props:** Precast drainage gutter trench along the right invert with running water; overhead LED light fixtures permanently mounted; invert clean and free of rubble.

---

## 3. (b) Tunnel Face Crew Personnel Roster

Every personnel model represents a statutory role under **Philippine DOLE OSH Standards (RA 11058, DO 198-18, DO 13-98)** and field tunneling practice:

| Role Title | Visible Activity & Poses | Hardhat Color | Vest / Workwear | Footwear & Specialized PPE | Carried Props & Tools |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tunnel Supervisor (Shift Boss)** | Inspecting advance, reviewing blueprint clipboard, directing crew with hand signals | **White** (Class E, high-gloss) | **Teal / Orange** two-tone vest with 3M reflective crossback | Heavy-duty rubber safety gumboots with steel toe | Aluminum clipboard, ruggedized two-way radio, measuring tape, cap lamp |
| **Safety Officer (DOLE SO3)** | Gas monitoring patrol, testing crown and invert, checking confined-space board | **Green** (Green Cross emblem) | **High-Vis Lime Green** vest, DOLE OSH badge | Steel-toe puncture-resistant boots | Portable multi-gas detector wand (Altair 4XR/Dräger), air whistle, inspection log |
| **Licensed Blaster** | Inspecting blast holes, carrying explosive satchel, checking firing line continuity | **Red** | **High-Vis Orange** vest with "LICENSED BLASTER" stencil | Antistatic rubber safety gumboots | Leather explosive satchel, blasting galvanometer/tester, warning flag |
| **Drill / Jumbo Operator** | Operating jumbo drill controls or bracing jackleg drill on pneumatic air-leg | **Yellow** | Heavy blue denim coveralls, oil-resistant canvas apron | Knee-high waterproof safety boots, earmuffs, clear full-face shield | Pneumatic valve control levers, spare carbide-tipped drill steel rods |
| **Scaling & Support Miner** | Leaning back, barring down loose overhead rock slabs; torquing rock bolts | **Yellow** | Rugged orange work shirt, grease-stained denim trousers | Heavy rubber boots, leather work gloves, safety glasses, dust respirator | 3-meter hexagonal aluminum scaling pry-bar, pneumatic torque wrench |
| **Muck Truck / Loader Operator** | Sitting inside cab of LHD mini-loader / muck truck, clearing rock pile | **Yellow** | High-vis yellow t-shirt / reflective safety vest | Heavy-duty lace-up steel-toe leather work boots | Vehicle control levers, vehicle halogen headlights active |
| **Shotcrete Operator (Nozzleman)** | Holding heavy rubber nozzle hose with both hands, spraying overhead crown | **Yellow** | Full waterproof blue/grey rubberized rain suit (shotcrete coverall) | Rubber chemical/concrete boots, half-mask particulate respirator, visor | Heavy 65 mm shotcrete delivery hose, nozzle with airline and accelerator tube |
| **Surveyor / Geodetic Tech** | Peering through total station eyepiece, signaling prism rod assistant | **White** | High-vis orange vest, multi-pocket utility vest | Steel-toe work boots, sun-shade neck flap on hardhat | Electronic Total Station on aluminum tripod, survey target prism rod, fluorescent spray paint |
| **Geologist / Geotech Engineer** | Chipping rock samples, examining joint orientations with geological compass | **White** | High-vis orange vest with rock hammer holster | Heavy hiking-style safety boots with ankle support | Geologist pick/hammer (Estwing), Brunton pocket transit compass, RMR chart notebook |
| **Ventilation & Utility Tech** | Inspecting overhead duct couplings, checking dewatering sump float switches | **Blue** | High-vis lime vest with heavy tool belt | Waterproof safety gumboots, electrical insulating gloves | Duct clamp wrench, digital multimeter, PVC hose patch kit, cable hanger hooks |
| **Mine Rescue / First Aider** | Stationed at portal adit/refuge alcove, maintaining emergency readiness | **White** (Red Cross) | White vest with Red Cross patch, medical gloves | Steel-toe waterproof boots, escape respirator pack | Foldable basket stretcher (Neil Robertson), emergency trauma kit, SCBA tank |
| **QA/QC Inspector** | Performing shotcrete penetrometer pin test, checking bolt torque records | **White** | High-vis royal blue vest with "QA/QC" lettering | Steel-toe safety shoes with metatarsal guard | Hilti shotcrete penetrometer gun, ultrasonic thickness gauge, depth probe wire |

---

## 4. (c) Props & Authentic Engineering Details Checklist

To achieve AAA environmental realism, the 3D scene must incorporate the physical utilities and operational markers found in an active Philippine underground hydro drive:

### Overhead & Crown Utilities
- [ ] **Flexible Ventilation Ducting:** 700 mm diameter bright yellow reinforced PVC ducting with black spiral wire stiffener. Hung from an overhead high-tensile steel messenger cable with galvanized snap hooks. Must show realistic catenary sag between hanger points ($~150\text{ mm}$ droop) and slight pressurized ripples.
- [ ] **Duct Discharge End:** Positioned 15–20 meters back from the active face, with a high-velocity air cone stirring suspended dust particles.

### Sidewall Utility Runs (Services vs. Detonation Separation)
- [ ] **Electrical Wall (Right Sidewall):**
  - Continuous bundle of black heavy armoured 440V/220V power cables suspended on rebar wall brackets.
  - Low-voltage (24V/110V) LED string work-lights in protective yellow wire cages, spaced every 6.0 meters, casting warm ambient pools (2700K).
  - Isolated twin-lead blasting firing cable (yellow/orange twisted pair) running on completely separate wall hooks, strictly segregated from power cables.
  - Wall-mounted rotary field telephone / intercom station inside a weather-tight orange enclosure.
- [ ] **High-Pressure Piping (Left Sidewall):**
  - Rigid galvanized steel compressed-air pipeline (75 mm dia) with Victaulic grooved mechanical couplings every 6 m.
  - High-pressure water line (50 mm dia) feeding water to drill steels for dust suppression.
  - Flexible black/yellow dewatering discharge hose (100 mm dia) running down toward the invert ditch.

### Floor (Invert), Drainage & Hazards
- [ ] **Invert Surface:** Unpaved crushed basalt gravel ballast layered with grey quarry mud. Prominent dark, compacted tire tracks and mud ruts from rubber-tired muck trucks.
- [ ] **Dewatering Swale:** Continuous 300 mm deep drainage ditch carved along one side of the tunnel, carrying turbid, sediment-laden milky water flowing outward toward the portal.
- [ ] **Water Puddles:** Depressions in the roadway filled with standing water showing thin iridescent rainbow oily sheens and reflective surfaces.
- [ ] **Water Seepage & Inflow:** Steady water drips falling from fractured rock joints in the crown into invert puddles, generating concentric ripples.

### Geodetic & Operational Markings
- [ ] **Chainage Stencils:** Bold, high-visibility orange/yellow stenciled station labels painted directly onto the shotcreted walls every 25 or 50 meters (e.g., `STA 1+250`, `STA 1+300`, `STA 1+350`).
- [ ] **Centerline & Grade Control:** Red crosshairs and horizontal green elevation benchmark lines painted on the sidewalls with chainage and offset values (`ELEV +341.250`, `CL`).
- [ ] **Survey Prisms:** Circular reflective survey target prisms mounted on rock-bolt studs drilled into the tunnel sidewalls for laser alignment monitoring.

### Atmosphere & Lighting Dynamics
- [ ] **Volumetric Headlamp Beams:** Narrow forward-facing light cones (4500K cool-white LED, 35° cone angle) projecting from workers' hardhats, scattering light through atmospheric dust.
- [ ] **Portable Floodlight Stands:** Twin-head LED/halogen worklights on bright yellow telescopic tripod frames positioned behind active work zones, casting sharp directional work shadows.
- [ ] **Suspended Micro-Dust & Diesel Haze:** Fine airborne dust particles floating lazily in light beams near the face, with a subtle blue-grey diesel haze lingering in the wake of the muck truck.

---

## 5. Architectural Rule for Future Implementation Phases
1. **Never render a bare dirt cavern:** A hydro tunnel is a precision civil engineering conduit with structured structural supports, formal drainage, and high-voltage utilities.
2. **Strict R3F/Three.js separation:** Geometry, utilities, personnel, and lighting engines must reside in modular components subscribed to a unified Zustand store hydrated by Supabase Realtime.
3. **Keep this document invariant:** Any new asset, material, or animation introduced in later phases must comply with the specifications documented in this brief.
