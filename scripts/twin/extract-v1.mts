/**
 * P00a: pull the data worth keeping out of v1 (components/digital-twin/) into the formats of
 * docs/twin-v2/CONTRACTS.md. v1 is read, never edited.
 *
 *   npx tsx scripts/twin/extract-v1.mts
 *
 * Writes into components/twin/data/:
 *   people.json             the public registry (name, role, department, look); loaded by the app
 *   people.unverified.json  licence, experience, province and v1's narrative text; NOT loaded by the app
 *   named-animals.json      the site dog, which v1 keeps in the personnel registry
 *   routes.json, poles.json, cameras.json, flow-path.json, exclusions.json
 * and prints the photo audit for the report.
 */
import fs from "node:fs";
import path from "node:path";
import { FILIPINO_PERSONNEL_REGISTRY, type FilipinoPersonnel } from "../../components/digital-twin/personnelData";
import {
  UPHILL_ROAD_WAYPOINTS,
  DUMP_TRUCK_WAYPOINTS,
  CREW_VAN_WAYPOINTS,
  QAQC_PICKUP_WAYPOINTS,
  SAFETY_PATROL_WAYPOINTS,
  PED_ADMIN_CIRCUIT_WAYPOINTS,
  PED_MOUNTAIN_SHOULDER_CIRCUIT_WAYPOINTS,
  TEMFACIL_BUILDING_COLLIDERS,
  ROAD_CONSTANTS,
} from "../../components/digital-twin/uphillRoadConfig";
import { sampleTerrainY } from "../../components/digital-twin/terrainData";

const ROOT = process.cwd();
const V1 = path.join(ROOT, "components", "digital-twin");
const OUT = path.join(ROOT, "components", "twin", "data");
const round = (n: number, d = 3) => Number(n.toFixed(d));
const write = (name: string, data: unknown) => {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1) + "\n");
  console.log("wrote", name);
};
const src = (file: string) => fs.readFileSync(path.join(V1, file), "utf8");
const lineOf = (text: string, needle: string) => text.slice(0, text.indexOf(needle)).split("\n").length;

// ─── people ────────────────────────────────────────────────────────────────────────────────────

type RoleGroup =
  | "management" | "engineer" | "surveyor" | "geologist" | "qaqc" | "supervisor" | "foreman"
  | "tunnel-crew" | "welder" | "carpenter" | "mason" | "steelman" | "labourer" | "electrician"
  | "rigger" | "operator" | "driver" | "safety" | "nurse" | "security" | "office" | "kitchen" | "warehouse";

/**
 * Role group, shift and home zone per person. The role group is read from the job title; the
 * home zone is where v1 places the person (personnelLocations.ts and AnimatedSiteEntities.tsx).
 * P09a replaces `home` with a real station id.
 */
const ASSIGN: Record<string, { roleGroup: RoleGroup; shift: "day" | "night" | "office"; zone: string }> = {
  PM_ROMEO_SESE: { roleGroup: "management", shift: "office", zone: "powerhouse.camp-office-interior" },
  DEPUTY_NATHANIEL_PRINCIPE: { roleGroup: "management", shift: "office", zone: "powerhouse.camp-office" },
  ENGR_NOEL_LAVAPIE: { roleGroup: "engineer", shift: "office", zone: "powerhouse.camp-office-interior" },
  ENGR_ELGINE_MANGCUPANG: { roleGroup: "qaqc", shift: "day", zone: "powerhouse.camp-qaqc" },
  QC_JAIRUZ_BATAC: { roleGroup: "qaqc", shift: "day", zone: "powerhouse.surge-tank" },
  QC_JIMMY_AQUINO: { roleGroup: "qaqc", shift: "day", zone: "powerhouse.tailrace" },
  QC_JHON_JAYME: { roleGroup: "qaqc", shift: "day", zone: "powerhouse.camp-qaqc" },
  PLANNING_MAY_PARALLAG: { roleGroup: "engineer", shift: "office", zone: "powerhouse.camp-office-interior" },
  QS_JOHN_RICK_HERNAEZ: { roleGroup: "engineer", shift: "office", zone: "powerhouse.camp-office-interior" },
  QS_CRISTINE_ALMAZAN: { roleGroup: "engineer", shift: "office", zone: "powerhouse.camp-office-interior" },
  SURVEYOR_JOHNNY_FARONGEY: { roleGroup: "surveyor", shift: "day", zone: "powerhouse.penstock" },
  GEO_AMOR_FLORESCA: { roleGroup: "geologist", shift: "day", zone: "powerhouse.penstock" },
  PCO_JONJON_BUCSIT: { roleGroup: "safety", shift: "office", zone: "powerhouse.camp-office-interior" },
  DOC_JAYSON_AGGABAO: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  CAD_ELBERT_FIGURACION: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  CIVIL_JAIME_CANO: { roleGroup: "supervisor", shift: "day", zone: "powerhouse.powerhouse" },
  CIVIL_HENRY_ESTRADA: { roleGroup: "supervisor", shift: "day", zone: "powerhouse.tailrace" },
  TUNNEL_RICHARD_PINASEN: { roleGroup: "foreman", shift: "day", zone: "tunnel2.drive" },
  TUNNEL_RUDY_MARCOS: { roleGroup: "foreman", shift: "day", zone: "tunnel2.drive" },
  FOREMAN_ANTHONY_ROSALES: { roleGroup: "foreman", shift: "day", zone: "powerhouse.penstock" },
  WORKER_BENJAMIN_FOMEGAS: { roleGroup: "tunnel-crew", shift: "day", zone: "tunnel2.drive" },
  ESH_ALFREDO_ARIZ: { roleGroup: "safety", shift: "office", zone: "powerhouse.camp-office-interior" },
  NURSE_RUSSELLE_ALCANTARA: { roleGroup: "nurse", shift: "office", zone: "powerhouse.camp-clinic" },
  SEC_RONALD_MALTO: { roleGroup: "security", shift: "day", zone: "powerhouse.camp-gate" },
  HR_ROVIGAIL_ABELLAR: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  HR_JOSHUA_ADMIN: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  HR_RANDY_GAMBOA: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  IT_MARC_SALVA: { roleGroup: "office", shift: "office", zone: "powerhouse.camp-office-interior" },
  EQUIP_HOWELL_SAMSON: { roleGroup: "supervisor", shift: "day", zone: "powerhouse.camp-motorpool" },
  WAREHOUSE_VINCENT_ANDALLO: { roleGroup: "warehouse", shift: "day", zone: "powerhouse.camp-warehouse" },
  MECH_ANDREW_SILVA: { roleGroup: "supervisor", shift: "office", zone: "powerhouse.camp-office-interior" },
  SUPT_EUGENIO_HANOPOL: { roleGroup: "management", shift: "day", zone: "powerhouse.turbine-hall" },
  SUPT_EDUARDO_DEFRANCIA: { roleGroup: "management", shift: "day", zone: "powerhouse.switchyard" },
  ELEC_JOSUE_ABELLERA: { roleGroup: "supervisor", shift: "day", zone: "powerhouse.powerhouse" },
  FOREMAN_WARLITO_DEFRANCIA: { roleGroup: "foreman", shift: "day", zone: "powerhouse.control-room" },
};

// v1 colours as named PPE colours (data/ppe-colours.json). The photographed site standard differs
// from v1 (green hats are the most common): P07b decides the final colour per role.
const PPE_HEX: Record<string, string> = {
  "#FFFFFF": "white", "#EAB308": "yellow", "#16A34A": "green", "#0284C7": "blue", "#EA580C": "orange",
  "#0F766E": "teal", "#DC2626": "red", "#1E293B": "navy",
};
const SKIN: Record<FilipinoPersonnel["skinTone"], number> = { LIGHT: 0.25, MEDIUM: 0.45, BRONZE: 0.62, DEEP: 0.8 };
const HAIR: Record<FilipinoPersonnel["hairStyle"], string> = {
  SHORT: "hair.short", POMPADOUR: "hair.pompadour", PONYTAIL: "hair.ponytail", CHEF_BANDANA: "hair.short", BALD: "hair.none",
};

/** Does the photo file name belong to this person? The file name must carry the person's surname. */
function photoMatches(p: FilipinoPersonnel): boolean {
  const file = path.basename(p.avatarUrl).toLowerCase().replace(/\.(jpg|png)$/, "").replace(/_real$/, "");
  const words = p.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s-]/g, "").split(/[\s-]+/).filter((w) => w.length > 2 && !["engr", "jr"].includes(w));
  return file.includes(words[words.length - 1].slice(0, 5));
}

const people: unknown[] = [];
const unverified: Record<string, unknown> = {};
const namedAnimals: unknown[] = [];
const photoAudit: { id: string; name: string; avatarUrl: string; exists: boolean; matches: boolean }[] = [];

for (const p of Object.values(FILIPINO_PERSONNEL_REGISTRY)) {
  const exists = fs.existsSync(path.join(ROOT, "public", p.avatarUrl));
  if (p.id === "DOG_BRUNSON_CHUCHU") {
    namedAnimals.push({ id: p.id, name: p.name, nickname: p.nickname, species: "fauna.aspin", title: "Site mascot", photo: exists ? p.avatarUrl : undefined, zone: "powerhouse.camp-warehouse" });
    continue;
  }
  const a = ASSIGN[p.id];
  if (!a) throw new Error(`no role group assigned for ${p.id}`);
  const matches = photoMatches(p);
  photoAudit.push({ id: p.id, name: p.name, avatarUrl: p.avatarUrl, exists, matches });
  const female = p.gender === "FEMALE";
  people.push({
    id: p.id,
    name: p.name,
    ...(p.nickname ? { nickname: p.nickname } : {}),
    role: p.role,
    roleGroup: a.roleGroup,
    department: p.department,
    // a photo is kept only when its file name is this person's: v1 reuses other people's photos
    ...(exists && matches ? { photo: p.avatarUrl } : {}),
    shift: a.shift,
    look: {
      body: female ? "char.body.f00" : "char.body.m00", // placeholder until P07a builds the body set
      skin: SKIN[p.skinTone],
      face: {},
      hair: HAIR[p.hairStyle],
      hairColor: "#1a1410",
      ...(p.facialHair && p.facialHair !== "NONE" ? { facialHair: `facial.${p.facialHair.toLowerCase()}` } : {}),
      ...(p.hasGlasses ? { glasses: true } : {}),
      height: female ? 1.55 : 1.65, // a default inside the quality-bar range, not a measurement
      outfit: `outfit.${a.roleGroup}.a`,
      hardhat: PPE_HEX[p.hardhatColor.toUpperCase()] ?? "white",
      vest: PPE_HEX[p.vestColor.toUpperCase()] ?? "orange",
      wear: { dust: 0, sweat: 0, mud: 0 },
      props: [],
    },
    home: `${a.zone}.home.${p.id.toLowerCase().replace(/_/g, "-")}`,
    verified: {},
  });
  unverified[p.id] = {
    licence: p.licenseNumber,
    yearsOfExp: p.yearsOfExp,
    province: p.originProvince,
    // v1's descriptive text, kept for P09 (what each person does and where); written by v1's author, not a record
    v1: { currentTask: p.currentTask, locationName: p.locationName, shift: p.shift, roleDescription: p.roleDescription, avatarUrl: p.avatarUrl },
  };
}
write("people.json", people);
write("people.unverified.json", {
  note: "Not loaded by the app. Every value here came from v1's code and is unconfirmed. A field moves into people.json `verified` only when the owner confirms it is real and cleared.",
  people: unverified,
});
write("named-animals.json", namedAnimals);
write("ppe-colours.json", {
  note: "Colour ids used by LookSpec.hardhat and LookSpec.vest. Hex values are v1's; P07b replaces them with colours sampled from site photographs.",
  colours: Object.fromEntries(Object.entries(PPE_HEX).map(([hex, id]) => [id, hex])),
});

// ─── routes ────────────────────────────────────────────────────────────────────────────────────

type V3 = { x: number; y: number; z: number };
const pts = (list: V3[]) => list.map((v) => [round(v.x), round(v.y), round(v.z)]);
// stops: `at` is the 0..1 position along the route; from the vehicle table in AnimatedSiteEntities.tsx (line 3930 on)
const routes = [
  { id: "powerhouse.access-road.centre", points: pts(UPHILL_ROAD_WAYPOINTS), closed: false, stops: [] },
  { id: "powerhouse.dump-truck", points: pts(DUMP_TRUCK_WAYPOINTS), closed: true, stops: [
    { at: 0.0, seconds: 3.5, reason: "quarry-loading" }, { at: 0.256, seconds: 0, reason: "gate-inbound" },
    { at: 0.488, seconds: 4.0, reason: "tipping-at-stockpile" }, { at: 0.721, seconds: 0, reason: "gate-outbound" } ] },
  { id: "powerhouse.crew-van", points: pts(CREW_VAN_WAYPOINTS), closed: true, stops: [
    { at: 0.0, seconds: 3.5, reason: "staff-boarding" }, { at: 0.275, seconds: 0, reason: "gate-inbound" },
    { at: 0.425, seconds: 3.5, reason: "office-dropoff" }, { at: 0.7, seconds: 0, reason: "gate-outbound" } ] },
  { id: "powerhouse.qaqc-pickup", points: pts(QAQC_PICKUP_WAYPOINTS), closed: true, stops: [
    { at: 0.0, seconds: 3.5, reason: "qaqc-staging" }, { at: 0.186, seconds: 0, reason: "gate-outbound" },
    { at: 0.442, seconds: 3.5, reason: "switchyard-inspection" }, { at: 0.488, seconds: 3.0, reason: "tailrace-inspection" },
    { at: 0.791, seconds: 0, reason: "gate-inbound" } ] },
  { id: "powerhouse.safety-patrol", points: pts(SAFETY_PATROL_WAYPOINTS), closed: true, stops: [
    { at: 0.0, seconds: 3.5, reason: "tool-shed-check" }, { at: 0.412, seconds: 0, reason: "gate-outbound" },
    { at: 0.618, seconds: 3.5, reason: "road-perimeter-check" }, { at: 0.824, seconds: 0, reason: "gate-inbound" } ] },
  { id: "powerhouse.walk.admin-circuit", points: pts(PED_ADMIN_CIRCUIT_WAYPOINTS), closed: true, stops: [] },
  { id: "powerhouse.walk.road-shoulder", points: pts(PED_MOUNTAIN_SHOULDER_CIRCUIT_WAYPOINTS), closed: true, stops: [] },
];
write("routes.json", {
  note: "v1's routes in the powerhouse location frame (metres, Y up). A gate stop of 0 seconds waits for the barrier. v1's camp-to-powerhouse road is its author's arrangement: the real main camp is about 400 m from the powerhouse (site-layout.json).",
  road: { width: ROAD_CONSTANTS.ROAD_WIDTH, laneOffset: ROAD_CONSTANTS.LANE_UPHILL_OFFSET, footpathOffset: ROAD_CONSTANTS.SIDEWALK_OFFSET },
  routes,
  v1Colliders: TEMFACIL_BUILDING_COLLIDERS,
});

// ─── utility poles ─────────────────────────────────────────────────────────────────────────────

const elec = src("SiteElectricalDistribution.tsx");
const polesText = elec.slice(elec.indexOf("export const SITE_UTILITY_POLES"), elec.indexOf("];", elec.indexOf("export const SITE_UTILITY_POLES")) + 1);
// (the array literal holds only numbers, strings and Math.PI, so it is evaluated as it stands)
const v1Poles = new Function(`return ${polesText.slice(polesText.indexOf("["))}`)() as { id: string; x: number; z: number; hasTransformer?: boolean; hasStreetlight?: boolean; streetlightYaw?: number; hasGuyWire?: boolean; guyWireAngle?: number; label: string }[];
write("poles.json", {
  note: "v1 SITE_UTILITY_POLES (SiteElectricalDistribution.tsx line " + lineOf(elec, "export const SITE_UTILITY_POLES") + "), powerhouse location frame. y is the v1 ground height at the pole.",
  poles: v1Poles.map((p) => ({
    id: p.id.toLowerCase(), label: p.label, p: [p.x, round(sampleTerrainY(p.x, p.z)), p.z],
    transformer: !!p.hasTransformer, streetlight: !!p.hasStreetlight,
    ...(p.streetlightYaw !== undefined ? { streetlightYaw: round(p.streetlightYaw, 4) } : {}),
    ...(p.hasGuyWire ? { guyWireYaw: round(p.guyWireAngle ?? 0, 4) } : {}),
  })),
});

// ─── camera presets ────────────────────────────────────────────────────────────────────────────

const scene = src("PlantScene.tsx");
const presetsStart = scene.indexOf("const presets = useMemo(");
const presetsBlock = scene.slice(presetsStart, scene.indexOf("[]\n  );", presetsStart));
const TITLES: Record<string, [string, string]> = {
  overview: ["Site overview", "powerhouse.powerhouse"],
  "turbine-hall": ["Turbine hall", "powerhouse.turbine-hall"],
  switchyard: ["Switchyard", "powerhouse.switchyard"],
  "tailrace-floodgate": ["Tailrace and river outlet", "powerhouse.tailrace"],
  "headrace-tunnel": ["Headrace tunnel heading", "tunnel2.drive"],
  "headrace-tunnel-face": ["Tunnel face and muck pile", "tunnel2.drive"],
  "headrace-tunnel-normals": ["Tunnel (v1 debug view)", "tunnel2.drive"],
  "headrace-tunnel-stations": ["Tunnel chainage markers", "tunnel2.drive"],
  "headrace-worker-drill-closeup": ["Tunnel crew: driller", "tunnel2.drive"],
  "headrace-worker-surveyor-closeup": ["Tunnel crew: surveyor", "tunnel2.drive"],
  "headrace-worker-bolter-closeup": ["Tunnel crew: rock bolter", "tunnel2.drive"],
  "headrace-tunnel-materials": ["Tunnel lining", "tunnel2.drive"],
  temfacil: ["Main camp", "powerhouse.camp-office"],
  "temfacil-guardhouse": ["Camp gate and guardhouse", "powerhouse.camp-gate"],
  "wildlife-storks": ["Storks over the river", "powerhouse.river"],
  "temfacil-patrol": ["Security patrol", "powerhouse.camp-gate"],
  "highland-horse": ["Trail horse", "powerhouse.forest"],
  "temfacil-barracks": ["Workers' barracks", "powerhouse.camp-barracks"],
  "temfacil-canteen": ["Canteen", "powerhouse.camp-canteen"],
  "temfacil-office": ["Site office", "powerhouse.camp-office"],
  "temfacil-office-interior": ["Site office interior", "powerhouse.camp-office-interior"],
  "temfacil-office-zone1": ["Office: entrance", "powerhouse.camp-office-interior"],
  "temfacil-office-zone2": ["Office: document control", "powerhouse.camp-office-interior"],
  "temfacil-office-zone3": ["Office: engineering", "powerhouse.camp-office-interior"],
  "temfacil-office-zone4": ["Office: mechanical and IT", "powerhouse.camp-office-interior"],
  "temfacil-office-zone4b": ["Office: rear west", "powerhouse.camp-office-interior"],
  "temfacil-office-zone5a": ["Office: HR and admin", "powerhouse.camp-office-interior"],
  "temfacil-office-zone5b": ["Office: east wing 2", "powerhouse.camp-office-interior"],
  "temfacil-office-zone5c": ["Office: ESH", "powerhouse.camp-office-interior"],
  "temfacil-office-zone5d": ["Office: clinic", "powerhouse.camp-office-interior"],
  "temfacil-office-zone6": ["Office: rear east", "powerhouse.camp-office-interior"],
};
const cameras: unknown[] = [];
const re = /(?:"([\w-]+)"|(\w+)):\s*\{\s*pos:\s*new THREE\.Vector3\(([^)]+)\),\s*target:\s*new THREE\.Vector3\(([^)]+)\),?\s*\}/g;
for (const m of presetsBlock.matchAll(re)) {
  const id = m[1] ?? m[2];
  const [title, zone] = TITLES[id] ?? [id, "powerhouse.powerhouse"];
  cameras.push({ id, title, zone, pos: m[3].split(",").map(Number), target: m[4].split(",").map(Number), ...(id === "headrace-tunnel-normals" ? { drop: true } : {}) });
}
write("cameras.json", {
  note: "v1's camera presets (PlantScene.tsx line " + lineOf(scene, "const presets = useMemo(") + "), powerhouse location frame. The ids are v1's ?preset= keys, so ?preset=<id> maps straight to ?place=<id>. v1's tunnel sits beside the surge tank; in v2 those views move to the tunnel2 location.",
  defaultPreset: "temfacil",
  cameras,
});

// ─── energy flow path ──────────────────────────────────────────────────────────────────────────

const flowStart = scene.indexOf("const FLOW_PATH_POINTS = [");
const flowText = scene.slice(scene.indexOf("[", flowStart), scene.indexOf("];", flowStart) + 1);
const flowLabels = [...flowText.matchAll(/\/\/\s*\d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
const flowPoints = new Function("THREE", "sampleTerrainY", `return ${flowText}`)(
  { Vector3: function (this: V3, x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
  sampleTerrainY
) as V3[];
write("flow-path.json", {
  note: "v1 FLOW_PATH_POINTS (PlantScene.tsx line " + lineOf(scene, "const FLOW_PATH_POINTS") + "): the animated line from the surge tank through the penstock and both units to the switchyard, then along the road poles to the camp. v2's 'follow the water' path (P13) starts at the weir instead.",
  points: flowPoints.map((v, i) => ({ p: [round(v.x), round(v.y), round(v.z)], label: flowLabels[i] ?? "" })),
});

// ─── vegetation exclusions ─────────────────────────────────────────────────────────────────────

write("exclusions.json", {
  note: "Where v1 plants no trees (ForestVegetation.tsx lines 30 to 43 and 247 to 264), powerhouse location frame. A tree is dropped when it is inside a rectangle or closer to it than `clearance` metres.",
  rects: [
    { id: "powerhouse-yard", xMin: -16, xMax: 39, zMin: -14, zMax: 17, clearance: 6 },
    { id: "penstock-corridor", xMin: -14, xMax: 2, zMin: -34, zMax: -8, clearance: 5 },
    { id: "main-camp", xMin: 65, xMax: 180, zMin: -165, zMax: -45, clearance: 6 },
    { id: "tailrace", xMin: -16, xMax: 16, zMin: 4, zMax: 48, clearance: 4.5 },
  ],
  river: { xMin: -145, xMax: 155, centreZ: "42 + 9 * sin(((x + 130) / 270) * PI * 2.2)", clearance: 18 },
  road: { route: "powerhouse.access-road.centre", clearance: 7.5 },
  sceneHalf: 175,
});

// ─── photo audit (for the report) ──────────────────────────────────────────────────────────────

console.log(`\npeople: ${people.length}, named animals: ${namedAnimals.length}, cameras: ${cameras.length}, poles: ${v1Poles.length}, routes: ${routes.length}`);
console.log("\nPhotos that do not belong to the person (left out of people.json):");
for (const a of photoAudit.filter((x) => !x.matches || !x.exists)) console.log(`  ${a.id} | ${a.name} | ${a.avatarUrl}${a.exists ? "" : " (file missing)"}`);
fs.writeFileSync(path.join(ROOT, "docs", "twin-v2", "review", "P00a", "photo-audit.json"), JSON.stringify(photoAudit, null, 1) + "\n");
