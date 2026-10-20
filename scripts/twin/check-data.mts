/**
 * Checks components/twin/data/ against the types in docs/twin-v2/CONTRACTS.md section 4.
 *
 *   npx tsx scripts/twin/check-data.mts
 *
 * Exits 1 on the first file that does not conform. Also checks that every v1 person is present
 * with an unchanged id, and that nothing internal (cost, billing, ratings) has slipped in.
 */
import fs from "node:fs";
import path from "node:path";
import { FILIPINO_PERSONNEL_REGISTRY } from "../../components/digital-twin/personnelData";

const DIR = path.join(process.cwd(), "components", "twin", "data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const problems: string[] = [];
const need = (ok: unknown, msg: string) => { if (!ok) problems.push(msg); };

const ROLE_GROUPS = ["management", "engineer", "surveyor", "geologist", "qaqc", "supervisor", "foreman", "tunnel-crew", "welder", "carpenter", "mason", "steelman", "labourer", "electrician", "rigger", "operator", "driver", "safety", "nurse", "security", "office", "kitchen", "warehouse"];
const SHIFTS = ["day", "night", "office"];
const LOCATIONS = ["weir", "tunnel1", "midway", "tunnel2", "powerhouse"];
const STAGES = ["cleared", "excavation", "rebar", "formwork", "poured", "finished", "commissioned"];
const FRONTS = ["overall", "weir-intake", "desander", "tunnel1", "headrace-pipe-tunnel2", "surge-tank", "penstock", "powerhouse-switchyard", "transmission-line"];
const isV3 = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

// people
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- (rows are checked field by field below)
const people = read("people.json") as Row[];
const ids = new Set(people.map((p) => p.id));
for (const id of Object.keys(FILIPINO_PERSONNEL_REGISTRY)) if (id !== "DOG_BRUNSON_CHUCHU") need(ids.has(id), `people.json: v1 person ${id} is missing`);
need(read("named-animals.json").some((a: Row) => a.id === "DOG_BRUNSON_CHUCHU"), "named-animals.json: the site dog is missing");
for (const p of people) {
  const at = `people.json ${p.id}`;
  need(typeof p.name === "string" && p.name, `${at}: name`);
  need(typeof p.role === "string" && p.role, `${at}: role`);
  need(ROLE_GROUPS.includes(p.roleGroup), `${at}: roleGroup "${p.roleGroup}"`);
  need(typeof p.department === "string", `${at}: department`);
  need(SHIFTS.includes(p.shift), `${at}: shift`);
  need(typeof p.home === "string" && LOCATIONS.includes(p.home.split(".")[0]), `${at}: home`);
  need(p.verified && Object.keys(p.verified).length === 0, `${at}: verified must be empty until the owner confirms`);
  need(!("licenseNumber" in p) && !("yearsOfExp" in p) && !("originProvince" in p), `${at}: unverified field present`);
  if (p.photo) need(fs.existsSync(path.join(process.cwd(), "public", p.photo)), `${at}: photo file missing`);
  const l = p.look ?? {};
  need(typeof l.body === "string" && typeof l.hair === "string" && typeof l.hairColor === "string" && typeof l.outfit === "string", `${at}: look strings`);
  need(typeof l.skin === "number" && l.skin >= 0 && l.skin <= 1, `${at}: look.skin`);
  need(typeof l.height === "number" && l.height >= 1.45 && l.height <= 1.9, `${at}: look.height`);
  need(l.wear && ["dust", "sweat", "mud"].every((k) => typeof l.wear[k] === "number"), `${at}: look.wear`);
  need(Array.isArray(l.props) && typeof l.face === "object", `${at}: look.props / face`);
}

// locations
const { locations } = read("locations.json");
need(LOCATIONS.every((id) => locations.some((l: Row) => l.id === id)), "locations.json: all five locations");
for (const l of locations) {
  const o = l.origin;
  need(["easting", "northing", "elevation", "lat", "lon"].every((k) => typeof o[k] === "number") && typeof o.source === "string", `locations.json ${l.id}: origin`);
  need(o.lat > 17.30 && o.lat < 17.35 && o.lon > 121.96 && o.lon < 122.01, `locations.json ${l.id}: lat/lon outside the site`);
  need(typeof l.yawToGridNorth === "number" && typeof l.halfExtent === "number" && typeof l.underground === "boolean" && typeof l.waterOrder === "number", `locations.json ${l.id}: fields`);
  need(isV3(l.overview?.pos) && isV3(l.overview?.target), `locations.json ${l.id}: overview`);
}

// routes, cameras
for (const r of read("routes.json").routes) need(typeof r.id === "string" && r.points.every(isV3) && typeof r.closed === "boolean" && Array.isArray(r.stops), `routes.json ${r.id}`);
const cams = read("cameras.json").cameras;
need(cams.length === 31, `cameras.json: ${cams.length} presets, expected 31`);
for (const c of cams) need(typeof c.id === "string" && typeof c.title === "string" && isV3(c.pos) && isV3(c.target), `cameras.json ${c.id}`);

// progress, history, structures, crew
const structures = new Set(read("structures.json").map((s: Row) => s.id));
for (const p of read("progress.json")) need(/^\d{4}-\d{2}$/.test(p.month) && FRONTS.includes(p.workFront) && p.actualPct >= 0 && p.actualPct <= 100 && typeof p.source === "string", `progress.json ${p.month} ${p.workFront}`);
for (const e of read("history.json")) need(/^\d{4}-\d{2}(-\d{2})?$/.test(e.date) && LOCATIONS.includes(e.location) && structures.has(e.structure) && (!e.stage || STAGES.includes(e.stage)) && /^MPR-\d+ slide \d+$/.test(e.source), `history.json ${e.date} ${e.title}`);
const crew = read("crew.json");
need(crew.crew.every((c: Row) => ROLE_GROUPS.includes(c.roleGroup) && SHIFTS.includes(c.shift) && c.count > 0), "crew.json: rows");
need(crew.crew.reduce((n: number, c: Row) => n + c.count, 0) === crew.total, "crew.json: rows do not add to the total");

// nothing internal: the app-loaded files must not mention money or ratings
const BANNED = /\b(cost|margin|billing|collection|budget|peso|php|kpi|rating|survey score|incident|lti|invoice)\b/i;
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json") && x !== "people.unverified.json")) {
  const hit = fs.readFileSync(path.join(DIR, f), "utf8").match(BANNED);
  need(!hit, `${f}: contains "${hit?.[0]}"`);
}

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(`ok: ${people.length} people, ${locations.length} locations, ${cams.length} cameras, ${read("progress.json").length} progress points, ${read("history.json").length} events, crew ${crew.total}`);
