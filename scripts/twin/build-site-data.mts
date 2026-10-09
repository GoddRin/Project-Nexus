/**
 * P00a: the real scheme, as read from the owner's references (docs/twin-v2/reference/INDEX.md).
 *
 *   python -I scripts/twin/reference/georef_site_plan.py     (first; needs the git-ignored reference folder)
 *   npx tsx scripts/twin/build-site-data.mts
 *
 * Writes into components/twin/data/:
 *   locations.json     the five locations: grid origin, latitude and longitude, elevation, yaw, how each was derived
 *   site-layout.json   v1's facilities (powerhouse frame) and the real structures and roads (project grid)
 *   structures.json    structure ids used by history.json and the stage store
 *   progress.json      physical percent complete per work front per month (public; nothing else from the decks)
 *   history.json       dated construction events, each with its deck and slide
 *   crew.json          unnamed crew head-count by role group
 *
 * Only physical facts are written. Cost, billing, KPI, survey and incident content is never read here.
 */
import fs from "node:fs";
import path from "node:path";
import { gridToLocal, projectGridToLatLon, type GridPoint } from "../../lib/twin/grid";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "components", "twin", "data");
const REF = path.join(ROOT, "assets-src", "twin", "reference");
const round = (n: number, d = 1) => Number(n.toFixed(d));
const write = (name: string, data: unknown) => {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1) + "\n");
  console.log("wrote", name);
};
const g = (easting: number, northing: number): GridPoint => ({ easting, northing });
const bearing = (from: GridPoint, to: GridPoint) => Math.atan2(to.easting - from.easting, to.northing - from.northing);
const dist = (a: GridPoint, b: GridPoint) => Math.hypot(a.easting - b.easting, a.northing - b.northing);
const along = (from: GridPoint, brg: number, d: number): GridPoint => g(from.easting + Math.sin(brg) * d, from.northing + Math.cos(brg) * d);
const deg = (r: number) => round((((r * 180) / Math.PI) % 360 + 360) % 360, 2);

const georef = JSON.parse(fs.readFileSync(path.join(OUT, "sources", "site-plan-georef.json"), "utf8")) as {
  fit: { metresPerPixel: number; residualsM: Record<string, number> };
  features: Record<string, [number, number]>;
  roads: Record<string, { lengthM: number; points: [number, number][] }>;
};
const feat = (id: string) => g(georef.features[id][0], georef.features[id][1]);

// ─── points printed on the drawings (PRS92 Zone III) ───────────────────────────────────────────

const T1_START = g(605981.401, 1917792.154); // MPR-53 slide 36: START OF TUNNEL 1, STA 0+000, EL 296.00
const T1_TRANSITION_END = g(605960.813, 1917768.435); // same slide, inlet plan: EL 293.52, where the adit joins
const T1_ADIT_PORTAL = g(606017.95, 1917786.75); // same slide, inlet plan: EL 300.00
const T1_END = g(603430.822, 1916195.809); // same slide: END OF TUNNEL 1, STA 3+008.95
const T2_INLET = g(603398.296, 1916174.594); // MPR-53 slide 48: TUNNEL 2 INLET PORTAL, STA 0+000
const T2_OUTLET = g(603146.606, 1915714.938); // same: OUTLET PORTAL, STA 0+535.00
const TB02 = g(603151.786, 1915667.687); // MPR-53 slide 65, penstock plan: TB-02 (PI), STA 0+049.02
const TB03 = g(603183.477, 1915579.386); // same: TB-03 (PI) bifurcation, STA 0+142.84
const TB04 = g(603189.269, 1915563.25); // same: TB-04 (PI), STA 0+159.980

// penstock axis and the powerhouse on it
const PENSTOCK_BRG = bearing(TB02, TB04); // about 160.3 degrees: downhill, south-south-east
// machine hall centre: 12.8 m past TB-04 along the axis, 5.5 m to the small-unit side (scaled off the penstock plan)
const POWERHOUSE = along(along(TB04, PENSTOCK_BRG, 12.8), PENSTOCK_BRG + Math.PI / 2, 5.5);
// v1 draws the penstock running along its Z axis towards +Z, so local -Z points back up the penstock
const POWERHOUSE_YAW = PENSTOCK_BRG - Math.PI;
// surge tank centre: the tank is drawn centred near STA 0+035 on the penstock plan, 14 m before TB-02
const SURGE_TANK = along(TB02, bearing(TB02, T2_OUTLET), 14.0);

// Tunnel 2 bends once (PI at STA 0+391.426, deflection 26 deg 23 min 52.74 s); the PI itself is not printed
const T2_FIRST_LEG = 391.426;
const T2_DEFLECTION = ((26 + 23 / 60 + 52.74 / 3600) * Math.PI) / 180;
const t2Chord = dist(T2_INLET, T2_OUTLET);
const t2AngleAtInlet = Math.asin(((535.0 - T2_FIRST_LEG) * Math.sin(T2_DEFLECTION)) / t2Chord);
const T2_PI = along(T2_INLET, bearing(T2_INLET, T2_OUTLET) + t2AngleAtInlet, T2_FIRST_LEG); // (the bend is to the left going downstream)

// weir: scaled off the Tunnel 1 key plan (2.03 m per pixel, tied to the two printed tunnel ends)
const WEIR = g(605938.8, 1917902.1);
const WEIR_LEFT_END = g(605925.5, 1917873.5);
const WEIR_RIGHT_END = g(605952.2, 1917930.7);
const DESANDER_DOWNSTREAM = g(605985.0, 1917797.0);
const DESANDER_UPSTREAM = g(605952.3, 1917830.1);
const PIPE_BRIDGE = g((T1_END.easting + T2_INLET.easting) / 2, (T1_END.northing + T2_INLET.northing) / 2);

// ─── locations ─────────────────────────────────────────────────────────────────────────────────

function origin(p: GridPoint, elevation: number, source: string, errorM: number, elevationNote: string) {
  const ll = projectGridToLatLon(p);
  return {
    easting: round(p.easting, 3), northing: round(p.northing, 3), elevation,
    lat: Number(ll.lat.toFixed(6)), lon: Number(ll.lon.toFixed(6)),
    source, errorM, elevationNote,
  };
}

const locations = [
  {
    id: "weir", title: "Weir and intake",
    origin: origin(WEIR, 296.0, "Centre of the weir axis, scaled off the Tunnel 1 key plan (MPR-53 slide 36) from the two printed tunnel ends; the site development plan (MPR-18) puts it 11 m away", 15,
      "Y = 0 is EL 296.00 m, the Tunnel 1 inlet level printed on the inlet plan. The flood wall is at Elev. 303 (MPR-32). The river-bed level is not on any drawing seen."),
    yawToGridNorth: 0, halfExtent: 400, underground: false,
    overview: { pos: [140, 130, 170], target: [20, 0, 40] }, waterOrder: 1,
    anchors: { "weir-left-end": WEIR_LEFT_END, "weir-right-end": WEIR_RIGHT_END, "tunnel1-inlet": T1_START, "adit-portal": T1_ADIT_PORTAL, "satellite-camp": feat("satellite-temfacil"), "mixing-facility": feat("weir-mixing-facility") },
  },
  {
    id: "tunnel1", title: "Headrace Tunnel 1",
    origin: origin(T1_START, 296.0, "START OF TUNNEL 1, STA 0+000, printed on the Tunnel 1 key plan and the inlet plan (MPR-53 slide 36); marked 'to be verified' on the drawing", 5,
      "Y = 0 is EL 296.00 m, printed at the tunnel start. The inlet transition falls at 7.90% to EL 293.52 m over 31.4 m."),
    yawToGridNorth: Number(bearing(T1_START, T1_END).toFixed(5)), halfExtent: 60, underground: true,
    overview: { pos: [0, 2.2, 12], target: [0, 1.8, -20] }, waterOrder: 2,
    anchors: { "inlet-portal": T1_START, "transition-end": T1_TRANSITION_END, "adit-portal": T1_ADIT_PORTAL, "outlet-portal": T1_END },
  },
  {
    id: "midway", title: "Pipe bridge and tunnel portals",
    origin: origin(PIPE_BRIDGE, 275, "Midpoint of the pipe bridge: halfway between the printed Tunnel 1 end (MPR-53 slide 36) and Tunnel 2 inlet portal (slide 48), which are 38.8 m apart", 5,
      "Y = 0 is about EL 275 m, read from the contours at the Tunnel 2 inlet on its key plan (between the 270 and 280 lines). Good to about 5 m; no spot level is printed."),
    yawToGridNorth: Number(bearing(T1_END, T2_INLET).toFixed(5)), halfExtent: 200, underground: false,
    overview: { pos: [70, 60, 90], target: [0, 0, 0] }, waterOrder: 3,
    anchors: { "tunnel1-outlet": T1_END, "tunnel2-inlet": T2_INLET },
  },
  {
    id: "tunnel2", title: "Headrace Tunnel 2",
    origin: origin(T2_OUTLET, 271.465, "TUNNEL 2 OUTLET PORTAL, STA 0+535.00, printed on the Tunnel 2 key plan (MPR-53 slide 48); marked 'to be verified' on the drawing", 5,
      "Y = 0 is EL 271.465 m, the level printed beside the surge tank on the penstock plan (MPR-53 slide 65). The tunnel invert at the outlet is assumed to be at that level."),
    yawToGridNorth: Number(bearing(T2_OUTLET, T2_PI).toFixed(5)), halfExtent: 60, underground: true,
    overview: { pos: [0, 2.2, 12], target: [0, 1.8, -20] }, waterOrder: 4,
    anchors: { "outlet-portal": T2_OUTLET, "bend": T2_PI, "inlet-portal": T2_INLET },
  },
  {
    id: "powerhouse", title: "Powerhouse, surge tank and main camp",
    origin: origin(POWERHOUSE, 188.04, "Centre of the machine hall, scaled off the penstock plan (MPR-53 slide 65): 12.8 m past the printed point TB-04 along the penstock axis and 5.5 m towards the small unit", 5,
      "Y = 0 is EL 188.04 m, the yard level printed beside the switchyard on the penstock plan. The turbine floor is EL 188.24 m and the lower pit EL 183.54 m (drawing R1)."),
    yawToGridNorth: Number(POWERHOUSE_YAW.toFixed(5)), halfExtent: 450, underground: false,
    overview: { pos: [75, 120, 160], target: [30, 8, -25] }, waterOrder: 5,
    anchors: { "tb-04": TB04, "bifurcation": TB03, "tb-02": TB02, "surge-tank": SURGE_TANK, "tunnel2-outlet": T2_OUTLET, "main-camp": feat("main-temfacil"), "mixing-facility": feat("powerhouse-mixing-facility") },
  },
].map((l) => ({ ...l, anchors: Object.fromEntries(Object.entries(l.anchors).map(([k, p]) => [k, { easting: round(p.easting), northing: round(p.northing) }])) }));

write("locations.json", {
  note: [
    "Grid: PRS92 / Philippines Zone III (EPSG:3123), the grid printed on the DED key plans. lat/lon are WGS84 (lib/twin/grid.ts).",
    "yawToGridNorth: the bearing, clockwise from grid north in radians, of the local -Z axis. Local +X is 90 degrees clockwise from it.",
    "errorM is the estimated error of the origin in the grid. The grid-to-WGS84 step adds about 10 m to lat/lon.",
    "halfExtent for the powerhouse covers the surge tank, the Tunnel 2 outlet, the main camp (about 400 m away) and the mixing facility. P03a decides whether midway joins it.",
    "anchors is an optional field added in P00a: named points of the location in the project grid.",
    "v1 labels the powerhouse 17.0621 N, 121.8410 E. That is about 31 km from the site and is not used.",
  ],
  locations,
});

// ─── site layout ───────────────────────────────────────────────────────────────────────────────

const PH = locations[4];
const phLocal = (p: GridPoint) => {
  const l = gridToLocal(p, g(PH.origin.easting, PH.origin.northing), PH.yawToGridNorth);
  return [round(l.x), round(l.z)];
};

/** v1's facilities, in the v1 scene frame. Footprint is [along X, along Z]. Height is to the eaves or top. */
const T = "components/digital-twin/TemfacilFacility.tsx";
const P = "components/digital-twin/PowerhouseGeometry.tsx";
const S = "components/digital-twin/PlantScene.tsx";
const v1Facilities = [
  { id: "powerhouse", zone: "powerhouse.powerhouse", title: "Powerhouse building", p: [0, 0, 0], footprint: [21, 15], height: null, source: `${P}:224; collider uphillRoadConfig.ts:339`, real: "Machine hall is 31.5 m by about 12 m with a 7.3 m annex (R1, penstock plan). v1's shape is not kept." },
  { id: "powerhouse-yard", zone: "powerhouse.powerhouse", title: "Powerhouse yard", p: [7, 0.05, 1], footprint: [70, 34], height: 0, source: "uphillRoadConfig.ts:429" },
  { id: "turbine-unit-1", zone: "powerhouse.turbine-hall", title: "Big turbine marker", p: [-4, 6, 0], footprint: null, height: null, source: `${S}:1173`, real: "Two horizontal units 11.5 m apart (penstock plan)." },
  { id: "turbine-unit-2", zone: "powerhouse.turbine-hall", title: "Small turbine marker", p: [4, 6, 0], footprint: null, height: null, source: `${S}:1174` },
  { id: "switchyard", zone: "powerhouse.switchyard", title: "Switchyard platform", p: [25, 0.65, 0], footprint: [19.6, 17.6], height: null, source: `${P}:665; collider uphillRoadConfig.ts:333` },
  { id: "tailrace", zone: "powerhouse.tailrace", title: "Tailrace channel", p: [0, -1.35, 26.75], footprint: [24, 42.5], height: null, source: "terrainData.ts:25" },
  { id: "floodwall", zone: "powerhouse.floodwall", title: "Tailrace floodwalls and gate", p: [0, 0, 26], footprint: [110, 4], height: 7.8, source: `${P}:1329, 1786` },
  { id: "river", zone: "powerhouse.river", title: "River", p: [0, 0, 42], footprint: [300, 24], height: null, source: `${P}:1170, 1315`, real: "v1 calls it the Pinacanauan; the project is on the Tumauini River. Its real course at the powerhouse is not yet traced." },
  { id: "penstock", zone: "powerhouse.penstock", title: "Penstock", p: [-5, 11, -16], footprint: [4, 20], height: null, source: `${P}:2224`, real: "2.70 m inside diameter (matches v1), about 111 m from TB-02 to TB-04, falling from EL 271.5 to EL 188." },
  { id: "surge-tank", zone: "powerhouse.surge-tank", title: "Surge tank", p: [-6, 17.5, -26], footprint: [9, 9], height: null, source: `${P}:2128`, real: "About 124 m up the penstock from the powerhouse, base about 83 m higher. v1 draws it 26 m away and 17 m up." },
  { id: "tunnel-heading", zone: "tunnel2.drive", title: "Headrace tunnel heading", p: [-6, 16.8, -24.5], footprint: null, height: null, source: `${S}:1253` },
  { id: "access-road", zone: "powerhouse.access-road", title: "Road from the powerhouse to the camp", p: [58, 8, -28], footprint: null, height: null, source: "uphillRoadConfig.ts:11" },
  { id: "genset", zone: "powerhouse.switchyard", title: "Diesel generator", p: [26, 0, 6], footprint: [4.4, 2.4], height: 2.1, source: "components/digital-twin/SiteElectricalDistribution.tsx:128" },
  { id: "camp-pad", zone: "powerhouse.camp-office", title: "Camp pad", p: [127, 14, -111], footprint: [84, 82], height: 0, source: `${T}:199` },
  { id: "camp-gate", zone: "powerhouse.camp-gate", title: "Gate, guardhouse and entrance ramp", p: [96, 13.7, -69], footprint: [16, 10.2], height: null, source: `${T}:237; AnimatedSiteEntities.tsx:3667` },
  { id: "camp-office", zone: "powerhouse.camp-office", title: "Main site office", p: [114, 14, -107], footprint: [14.4, 22], height: 4.2, source: `${T}:328` },
  { id: "camp-staffhouse", zone: "powerhouse.camp-staffhouse", title: "Staff house with kitchen extension", p: [130, 14, -107], footprint: [12.6, 15], height: 3.8, source: `${T}:423` },
  { id: "camp-foreman-house", zone: "powerhouse.camp-staffhouse", title: "Foreman and staff house", p: [136, 14, -135.5], footprint: [16, 15], height: null, source: `${T}:558` },
  { id: "camp-barracks", zone: "powerhouse.camp-barracks", title: "Workers' barracks (3 dormitories, washroom block)", p: [155, 14, -107], footprint: [20, 26], height: null, source: `${T}:561` },
  { id: "camp-warehouse", zone: "powerhouse.camp-warehouse", title: "Warehouse and laydown yard", p: [90, 14.8, -109], footprint: [13.5, 16.5], height: 6.4, source: `${T}:565` },
  { id: "camp-tool-shed", zone: "powerhouse.camp-motorpool", title: "Tool and equipment shed", p: [108, 14, -85], footprint: [8.6, 4], height: 3, source: `${T}:625` },
  { id: "camp-court", zone: "powerhouse.camp-court", title: "Basketball court and stage", p: [128, 14, -81], footprint: null, height: null, source: `${T}:667`, real: "Exists (owner, 2026-10-09)." },
  { id: "camp-qaqc", zone: "powerhouse.camp-qaqc", title: "QA/QC office and materials lab", p: [140.5, 14, -74.5], footprint: [5.2, 8.8], height: null, source: `${T}:670`, real: "Exists (owner, 2026-10-09)." },
  { id: "camp-canteen", zone: "powerhouse.camp-canteen", title: "Canteen", p: [150, 14, -81], footprint: [12, 14], height: null, source: `${T}:673` },
];

const road = (id: string, title: string, key: string, statedLengthM: number | null, note: string) => ({
  id, title, tracedLengthM: georef.roads[key].lengthM, statedLengthM, note, points: georef.roads[key].points,
});

const structure = (id: string, location: string, zone: string, title: string, p: GridPoint, errorM: number, source: string, extra: Record<string, unknown> = {}) => ({
  id, location, zone, title, grid: { easting: round(p.easting), northing: round(p.northing) }, errorM, source, ...extra,
});

const real = {
  structures: [
    structure("weir", "weir", "weir.weir", "Overflow weir with sluiceway", WEIR, 15, "Tunnel 1 key plan, MPR-53 slide 36", { lengthM: round(dist(WEIR_LEFT_END, WEIR_RIGHT_END), 0), axisBearingDeg: deg(bearing(WEIR_LEFT_END, WEIR_RIGHT_END)), elevation: "flood wall Elev. 303 (MPR-32 slide 17)", note: "Sluiceway with 4 gates, intake with 2 gates and trashracks, fish pass (MPR-53 slides 9 to 16)." }),
    structure("intake", "weir", "weir.intake", "Intake and feeder canal", WEIR_LEFT_END, 20, "Tunnel 1 key plan, MPR-53 slide 36: the canal leaves the weir end nearest the desander", { note: "Position is the weir end the canal starts from." }),
    structure("desander", "weir", "weir.desander", "Desander (9 segments), flushing channel, control room", g((DESANDER_DOWNSTREAM.easting + DESANDER_UPSTREAM.easting) / 2, (DESANDER_DOWNSTREAM.northing + DESANDER_UPSTREAM.northing) / 2), 25, "Tunnel 1 key plan, MPR-53 slide 36 (drawn as a box marked 'to be verified'); aerial photographs slides 22 and 24", { lengthM: round(dist(DESANDER_DOWNSTREAM, DESANDER_UPSTREAM), 0), axisBearingDeg: deg(bearing(DESANDER_DOWNSTREAM, DESANDER_UPSTREAM)), note: "The key plan draws about 46 m; the aerial photographs suggest it is longer. Length, width and bearing need the desander drawings." }),
    structure("tunnel1-inlet", "weir", "weir.tunnel1-inlet", "Tunnel 1 inlet portal", T1_START, 5, "Printed: MPR-53 slide 36", { elevation: 296.0 }),
    structure("adit", "weir", "weir.adit", "Tunnel 1 adit portal", T1_ADIT_PORTAL, 5, "Printed on the inlet plan: MPR-53 slide 36", { elevation: 300.0, note: "The adit falls at 12% to meet the tunnel at EL 293.52." }),
    structure("satellite-camp", "weir", "weir.sat-barracks", "Satellite camp", feat("satellite-temfacil"), 40, "Site development plan, MPR-18: the label's arrow tip", { note: "Barracks 1 and 2, staff house, canteen, clinic, office, warehouse, motor pool (MPR-31 to MPR-42). No layout drawing seen." }),
    structure("weir-mixing-facility", "weir", "weir.concrete-plant", "Mixing facility, volumetric concrete plant and crusher", feat("weir-mixing-facility"), 40, "Site development plan, MPR-18: the label's arrow tip; MPR-39 slide 19"),
    structure("tunnel1-outlet", "midway", "midway.tunnel1-outlet", "Tunnel 1 outlet portal", T1_END, 5, "Printed: MPR-53 slide 36 (STA 3+008.95)"),
    structure("pipe-bridge", "midway", "midway.pipe-bridge", "Pipe bridge with catwalk", PIPE_BRIDGE, 5, "Between the two printed portals", { lengthM: round(dist(T1_END, T2_INLET)), axisBearingDeg: deg(bearing(T1_END, T2_INLET)) }),
    structure("tunnel2-inlet", "midway", "midway.tunnel2-inlet", "Tunnel 2 inlet portal", T2_INLET, 5, "Printed: MPR-53 slide 48"),
    structure("tunnel2-bend", "tunnel2", "tunnel2.drive", "Tunnel 2 bend (PI, STA 0+391.426)", T2_PI, 5, "Computed from the printed portals, the first-leg length and the deflection angle; the site development plan agrees within 3 m", { radiusM: 15.5 }),
    structure("tunnel2-outlet", "powerhouse", "powerhouse.surge-tank", "Tunnel 2 outlet portal", T2_OUTLET, 5, "Printed: MPR-53 slide 48"),
    structure("surge-tank", "powerhouse", "powerhouse.surge-tank", "Surge tank (16 lifts)", SURGE_TANK, 8, "Penstock plan, MPR-53 slide 65: drawn near STA 0+035", { elevation: 271.465, note: "Radius R = 6.75 m is printed beside the tank on the plan. Shell levels Elev. 275.265 to 277.765 were being poured in Nov 2025 (MPR-44 slide 42)." }),
    structure("penstock", "powerhouse", "powerhouse.penstock", "Penstock on saddles", g((TB02.easting + TB04.easting) / 2, (TB02.northing + TB04.northing) / 2), 3, "Printed points TB-02, TB-03, TB-04: MPR-53 slide 65", { lengthM: round(dist(TB02, TB04), 1), axisBearingDeg: deg(PENSTOCK_BRG), insideDiameterM: 2.7, note: "ASTM A516 Grade 60 pipe. Bifurcation at TB-03 (STA 0+142.84), branch at 52 deg 10 min 57 s to the small unit." }),
    structure("powerhouse", "powerhouse", "powerhouse.powerhouse", "Powerhouse", POWERHOUSE, 5, "Penstock plan, MPR-53 slide 65; drawing R1", { footprint: [12, 31.5], elevation: 188.04, note: "Machine hall 31.5 m long across the penstock axis and about 12 m wide, with a 7.3 m annex on the switchyard side. Unit axes 11.5 m apart. Turbine floor EL 188.24, lower pit EL 183.54, ground floor about 4.3 m above the turbine floor, second floor 7.5 m above that." }),
    structure("switchyard", "powerhouse", "powerhouse.switchyard", "Switchyard", along(POWERHOUSE, PENSTOCK_BRG - Math.PI / 2, 32), 10, "Penstock plan, MPR-53 slide 65: beyond the annex, on the side away from the small unit", { note: "Position is the middle of the fenced yard as drawn; no dimension is printed." }),
    structure("main-camp", "powerhouse", "powerhouse.camp-office", "Main camp (Temfacil)", feat("main-temfacil"), 25, "Site development plan, MPR-18: hatched area", { lengthM: round(dist(feat("main-temfacil-west-end"), feat("main-temfacil-east-end")), 0), axisBearingDeg: deg(bearing(feat("main-temfacil-west-end"), feat("main-temfacil-east-end"))), note: "A bench about 160 m long beside the access road. Barracks 1 and 2, common toilet, warehouse, clinic, genset shed, site office, ESH office, staff accommodation, canteen, motor pool (MPR-17 to MPR-37). No layout drawing seen; the Oct 2024 drone photograph is the best reference." }),
    structure("powerhouse-mixing-facility", "powerhouse", "powerhouse.access-road", "Mixing facility below the main camp", feat("powerhouse-mixing-facility"), 25, "Site development plan, MPR-18: hatched area"),
  ].map((s) => (s.location === "powerhouse" ? { ...s, local: phLocal(g(s.grid.easting, s.grid.northing)) } : s)),
  roads: [
    road("ar01", "AR01: public road to the powerhouse", "public-road-to-powerhouse", 3500, "Blue line on the plan, 'approx. 3.5 km, maximum gradient 15%'. Piloted Sep 2022 on, stationing to about 3+500. The trace stops at the edge of the plan."),
    road("powerhouse-to-main-camp", "Powerhouse up to the main camp", "powerhouse-to-main-temfacil", null, "First part of the yellow line. The decks place the main camp 'along AR03' (road to the surge tank)."),
    road("ar02", "AR02: main camp to the weir and Tunnel 1 inlet", "main-temfacil-to-weir", 7100, "Yellow line on the plan, 'access road to weir area approx. 7.1 km, maximum gradient 15%' (the stated length is from the powerhouse). A traced raster line cuts the hairpins short, so the traced length is low."),
  ],
  roadsNotLocated: ["AR03 (to the surge tank) and AR04 (to the Tunnel 1 outlet) are drawn on the plan only as a dark track from the main camp junction towards the tunnel portals; AR05 (from Oct 2023) is not on it."],
};

write("site-layout.json", {
  note: [
    "Two layouts. `v1` is what v1 draws, in the v1 scene frame (the powerhouse location frame): its camp sits 150 m from the powerhouse on the author's own arrangement.",
    "`real` is the scheme as built, in the project grid (PRS92 Zone III), with `local` [x, z] in the powerhouse frame for structures of that location.",
    "Where the two disagree, `real` wins (MASTER-BRIEF section 8). errorM is the estimated position error in metres.",
  ],
  v1: { frame: "powerhouse", campGroupOrigin: [118, 14, -95], facilities: v1Facilities },
  real,
});

// ─── structures (ids for history and construction stages) ──────────────────────────────────────

const structures = [
  ["weir", "weir.weir", "Overflow weir and spillway"], ["sluiceway", "weir.sluiceway", "Sluiceway (4 gates)"], ["intake", "weir.intake", "Intake (2 gates, trashracks)"],
  ["abutment", "weir.abutment", "RCC left abutment"], ["weir-floodwall", "weir.weir", "Weir flood wall"], ["cofferdam", "weir.cofferdam", "River diversion and cofferdam (temporary)"],
  ["desander", "weir.desander", "Desander"], ["tunnel1-inlet", "weir.tunnel1-inlet", "Tunnel 1 inlet portal"], ["adit", "weir.adit", "Tunnel 1 adit"],
  ["satellite-camp", "weir.sat-barracks", "Satellite camp"], ["concrete-plant", "weir.concrete-plant", "Volumetric concrete plant and crusher"],
  ["tunnel1", "tunnel1.inlet-drive", "Headrace Tunnel 1"], ["tunnel1-outlet", "midway.tunnel1-outlet", "Tunnel 1 outlet portal"], ["pipe-bridge", "midway.pipe-bridge", "Pipe bridge and headrace pipe"],
  ["tunnel2-inlet", "midway.tunnel2-inlet", "Tunnel 2 inlet portal"], ["tunnel2", "tunnel2.drive", "Headrace Tunnel 2"],
  ["surge-tank", "powerhouse.surge-tank", "Surge tank"], ["penstock", "powerhouse.penstock", "Penstock"], ["powerhouse", "powerhouse.powerhouse", "Powerhouse"],
  ["control-room", "powerhouse.control-room", "Control room"], ["guardhouse", "powerhouse.guardhouse", "Guardhouse"], ["tailrace", "powerhouse.tailrace", "Tailrace"],
  ["switchyard", "powerhouse.switchyard", "Switchyard"], ["floodwall", "powerhouse.floodwall", "Powerhouse floodwall"], ["transmission-line", "powerhouse.switchyard", "Transmission line"],
  ["magazine", "powerhouse.magazine", "Explosives magazine"], ["main-camp", "powerhouse.camp-office", "Main camp"], ["access-roads", "powerhouse.access-road", "Access roads AR01 to AR05"],
].map(([id, zone, title]) => ({ id, location: zone.split(".")[0], zone, title }));
write("structures.json", structures);

// ─── progress (physical percent complete only) ─────────────────────────────────────────────────

const FRONT: Record<string, string> = {
  Overall: "overall", "Weir & Intake": "weir-intake", "Weir / Intake / RCC Abutment": "weir-intake", Desander: "desander", "Tunnel 1": "tunnel1",
  "Headrace Pipe and Tunnel 2": "headrace-pipe-tunnel2", Surgetank: "surge-tank", Penstock: "penstock",
  "Powerhouse & Switchyard": "powerhouse-switchyard", "Powerhouse / Switchyard / Floodwall": "powerhouse-switchyard", "Transmission Line": "transmission-line",
};
const MPR_OF: Record<string, number> = { "2025-10": 43, "2025-11": 44, "2025-12": 45, "2026-01": 46, "2026-02": 47, "2026-03": 48, "2026-04": 49, "2026-05": 50, "2026-06": 51, "2026-07": 52, "2026-08": 53 };
const csv = fs.readFileSync(path.join(REF, "mpr-progress-series.csv"), "utf8").trim().split(/\r?\n/).slice(1);
const progress = csv.map((line) => {
  const [month, area, pct] = line.split(",");
  if (!FRONT[area]) throw new Error(`unknown work front "${area}"`);
  return {
    month, workFront: FRONT[area], actualPct: Number(pct),
    ...(month === "2026-08" && area === "Overall" ? { plannedPct: 89.4 } : {}),
    source: `MPR-${MPR_OF[month]} schedule performance, ${area}`,
  };
});
write("progress.json", progress);

// ─── history ───────────────────────────────────────────────────────────────────────────────────

type Ev = [date: string, structure: string, stage: string | null, title: string, source: string];
const EVENTS: Ev[] = [
  ["2022-04-12", "access-roads", null, "Contract start", "MPR-53 slide 6"],
  ["2022-09", "access-roads", "excavation", "AR01 piloting to the powerhouse, Sta. 1+360 to 1+470", "MPR-06 slide 5"],
  ["2022-12", "access-roads", "excavation", "AR02 to the weir and tunnel inlet: cut to slope and piloting, Sta. 0+000 to 0+400", "MPR-09 slide 6"],
  ["2023-01", "access-roads", null, "Landslide clearing and widening on AR01", "MPR-10 slide 6"],
  ["2023-03", "access-roads", "excavation", "AR03 and AR04 to the surge tank and tunnel outlet: piloting and excavation", "MPR-12 slide 11"],
  ["2023-07", "tunnel1-outlet", "cleared", "Tunnel 1 outlet portal preparation", "MPR-16 slide 6"],
  ["2023-08", "main-camp", "formwork", "Workers' barracks and warehouse under construction at the main camp", "MPR-17 slide 4"],
  ["2023-10", "main-camp", null, "Site clinic under construction", "MPR-19 slide 4"],
  ["2023-10", "access-roads", "cleared", "AR05 clearing and grubbing", "MPR-19 slide 13"],
  ["2023-12", "magazine", "cleared", "Magazine area developed", "MPR-21 slide 4"],
  ["2024-02", "surge-tank", "excavation", "Surge tank common excavation (Elev. 274)", "MPR-23 slide 16"],
  ["2024-03", "tunnel1", "excavation", "Tunnel 1 underground excavation under way from the outlet", "MPR-24 slide 4"],
  ["2024-03", "tunnel2", "cleared", "Tunnel 2 outlet portal stabilisation", "MPR-24 slide 6"],
  ["2024-03", "cofferdam", "excavation", "River diversion at the weir", "MPR-24 slide 10"],
  ["2024-04", "desander", "excavation", "Tunnel 1 inlet portal and desander excavation", "MPR-25 slide 5"],
  ["2024-05", "cofferdam", "finished", "Weir area earthmoving and cofferdam", "MPR-26 slide 9"],
  ["2024-05", "main-camp", null, "Site office under construction", "MPR-26 slide 2"],
  ["2024-08", "penstock", "excavation", "Penstock excavation and lean concrete", "MPR-29 slide 14"],
  ["2024-08", "magazine", null, "Additional magazine and police accommodation site development", "MPR-29 slide 4"],
  ["2024-09", "main-camp", null, "Motor pool and staff house extension", "MPR-30 slide 2"],
  ["2024-10", "main-camp", "finished", "Canteen area in use; motor pool and fabrication area ongoing", "MPR-31 slide 10"],
  ["2024-11", "weir-floodwall", "formwork", "Flood wall under construction at the weir after typhoon damage", "MPR-32 slide 17"],
  ["2024-11", "penstock", "poured", "Saddle No. 1 concreted", "MPR-32 slide 8"],
  ["2024-12", "cofferdam", null, "River diversion and cofferdam restored after the typhoons", "MPR-33 slide 4"],
  ["2025-01", "adit", "excavation", "Adit portal development at the weir", "MPR-34 slide 4"],
  ["2025-02", "surge-tank", "excavation", "Surge tank excavation for the foundation", "MPR-35 slide 22"],
  ["2025-03", "surge-tank", "rebar", "Surge tank rebar works", "MPR-36 slide 19"],
  ["2025-04", "surge-tank", "poured", "Surge tank rebar and first concrete", "MPR-37 slide 26"],
  ["2025-04", "powerhouse", "excavation", "Excavation and dewatering at the powerhouse", "MPR-37 slide 29"],
  ["2025-06", "powerhouse", "poured", "Concrete pouring at the powerhouse substructure", "MPR-39 slide 23"],
  ["2025-06", "weir", "poured", "Spillway segments 1 and 2 concreted", "MPR-39 slide 6"],
  ["2025-06", "concrete-plant", "finished", "Volumetric concrete plant at the weir", "MPR-39 slide 19"],
  ["2025-06", "penstock", "poured", "Saddles No. 8 to 11 concreted", "MPR-39 slide 41"],
  ["2025-08", "pipe-bridge", "formwork", "Conveyance pipe and pipe bridge works", "MPR-41 slide 34"],
  ["2025-09", "powerhouse", "rebar", "Raft footing rebar at the small turbine (Elev. 187.17); control room backfilled", "MPR-42 slide 40"],
  ["2025-10", "powerhouse", "poured", "Raft footing at the small turbine completed to Elev. 188.24", "MPR-43 slide 50"],
  ["2025-10", "powerhouse", "formwork", "Structural steel and roofing works begin", "MPR-43 slide 48"],
  ["2025-10", "control-room", "formwork", "Control room and guardhouse under construction", "MPR-43 slide 19"],
  ["2025-10", "tunnel1", "poured", "Tunnel 1 concrete invert begins", "MPR-43 slide 26"],
  ["2025-11", "surge-tank", "poured", "Surge tank shell poured from Elev. 275.265 to 277.765", "MPR-44 slide 42"],
  ["2026-05", "sluiceway", "formwork", "Stoplog guide frame erected at the sluiceway", "MPR-50 slide 22"],
  ["2026-05", "transmission-line", "excavation", "Transmission line works begin to be reported", "MPR-50 slide 111"],
  ["2026-07-04", "tunnel1", "excavation", "Tunnel 1 breakthrough", "MPR-51 slide 57"],
  ["2026-08-20", "surge-tank", "poured", "Surge tank lift 14 poured", "MPR-53 slide 60"],
  ["2026-08-29", "intake", "poured", "Intake slab, last lift poured", "MPR-53 slide 14"],
  ["2026-09-04", "surge-tank", "poured", "Surge tank lift 15 poured", "MPR-53 slide 62"],
  ["2026-09-07", "intake", "formwork", "Trashrack guide frames installed at the intake", "MPR-53 slide 16"],
  ["2026-09-07", "powerhouse", "finished", "Steel hand railings installed in the powerhouse", "MPR-53 slide 74"],
  ["2026-09-09", "desander", "poured", "Desander segment 9 outlet platform poured", "MPR-53 slide 31"],
  ["2026-09-12", "tunnel2", "excavation", "Tunnel 2 drill and blast with steel rib support at the outlet drive, Sta. 0+278.10", "MPR-53 slide 51"],
  ["2026-09-12", "pipe-bridge", "poured", "Pipe bridge right wingwall, third lift poured", "MPR-53 slide 56"],
  ["2026-09-14", "surge-tank", "formwork", "Surge tank lift 16 rebar and formwork", "MPR-53 slide 63"],
  ["2026-12-28", "powerhouse", null, "Revised contract completion date", "MPR-53 slide 6"],
];
const byId = Object.fromEntries(structures.map((s) => [s.id, s]));
write("history.json", EVENTS.map(([date, id, stage, title, source]) => {
  const s = byId[id];
  if (!s) throw new Error(`unknown structure ${id}`);
  return { date, location: s.location, zone: s.zone, structure: id, ...(stage ? { stage } : {}), title, source };
}));

// ─── crew ──────────────────────────────────────────────────────────────────────────────────────

// Head-count on site by category, latest deck (reference INDEX.md, "Status as of the deck"). The deck's
// categories are wider than the role groups, so each is split across the groups it covers; the split
// within a category is this script's judgement and is rebalanced in P09b against the stations built.
const NAMED = JSON.parse(fs.readFileSync(path.join(OUT, "people.json"), "utf8")).length as number;
const crew = [
  { category: "Management", headcount: 7, split: [["management", "office", 7]] },
  { category: "Staff", headcount: 45, split: [["engineer", "office", 14], ["office", "office", 12], ["qaqc", "day", 6], ["surveyor", "day", 4], ["safety", "day", 5], ["geologist", "day", 2], ["nurse", "office", 2]] },
  { category: "Superintendents, supervisors and foremen", headcount: 19, split: [["supervisor", "day", 8], ["foreman", "day", 9], ["foreman", "night", 2]] },
  { category: "Equipment staff", headcount: 17, split: [["warehouse", "day", 5], ["electrician", "day", 4], ["rigger", "day", 4], ["welder", "day", 4]] },
  { category: "Skilled", headcount: 252, split: [["tunnel-crew", "day", 48], ["tunnel-crew", "night", 32], ["carpenter", "day", 52], ["steelman", "day", 48], ["mason", "day", 40], ["welder", "day", 14], ["electrician", "day", 8], ["rigger", "day", 10]] },
  { category: "Non-skilled", headcount: 45, split: [["labourer", "day", 37], ["kitchen", "day", 8]] },
  { category: "Operators and drivers", headcount: 59, split: [["operator", "day", 30], ["operator", "night", 8], ["driver", "day", 17], ["driver", "night", 4]] },
  { category: "Security", headcount: 15, split: [["security", "day", 8], ["security", "night", 7]] },
  { category: "Subcontractor", headcount: 14, split: [["electrician", "day", 8], ["rigger", "day", 6]] },
];
for (const c of crew) {
  const sum = c.split.reduce((n, s) => n + (s[2] as number), 0);
  if (sum !== c.headcount) throw new Error(`${c.category}: split adds to ${sum}, not ${c.headcount}`);
}
const merged = new Map<string, number>();
for (const c of crew) for (const [roleGroup, shift, count] of c.split) merged.set(`${roleGroup}|${shift}`, (merged.get(`${roleGroup}|${shift}`) ?? 0) + (count as number));
write("crew.json", {
  note: "Whole-site head-count (473, August 2026 deck) by role group. The twin shows a share of this per location, set in P09b from the frame-time limits measured in P02c; the " + NAMED + " named people in people.json are part of the total, not extra.",
  source: "MPR-53 manpower table, as summarised in docs/twin-v2/reference/INDEX.md",
  total: crew.reduce((n, c) => n + c.headcount, 0),
  categories: crew.map((c) => ({ category: c.category, headcount: c.headcount })),
  crew: [...merged.entries()].map(([k, count]) => ({ roleGroup: k.split("|")[0], count, shift: k.split("|")[1] })),
});

// ─── summary for the report ────────────────────────────────────────────────────────────────────

console.log("\nlocation     easting      northing      elev     lat        lon          yaw(deg)  err(m)");
for (const l of locations) console.log(`${l.id.padEnd(12)} ${l.origin.easting.toFixed(1)}  ${l.origin.northing.toFixed(1)}  ${String(l.origin.elevation).padEnd(8)} ${l.origin.lat}  ${l.origin.lon}  ${deg(l.yawToGridNorth)}  ${l.origin.errorM}`);
console.log("\nTunnel 1 between printed ends:", round(dist(T1_START, T1_END), 2), "m; Tunnel 2 chord:", round(t2Chord, 2), "m; penstock TB-02 to TB-04:", round(dist(TB02, TB04), 2), "m, bearing", deg(PENSTOCK_BRG));
console.log("Powerhouse frame, local [x, z]: surge tank", phLocal(SURGE_TANK), "T2 outlet", phLocal(T2_OUTLET), "main camp", phLocal(feat("main-temfacil")), "mixing", phLocal(feat("powerhouse-mixing-facility")), "pipe bridge", phLocal(PIPE_BRIDGE));
console.log("events:", EVENTS.length, "progress points:", progress.length, "structures:", structures.length);
