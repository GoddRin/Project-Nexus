/**
 * Builds a location's terrain (P03a) from the real ground and the site's civil works.
 *
 *   npx tsx scripts/twin/build-terrain.mts [location]      (default: powerhouse)
 *
 * Inputs: Copernicus GLO-30 (scripts/twin/lib/dem.mts, downloaded on first use), the location's
 * frame (components/twin/data/locations.json) and its civil edits (components/twin/data/terrain-edits.json,
 * applied in order, nothing hidden here).
 *
 * Steps:
 *   1. far grid: 16 m over 16.4 km square, from the elevation model (bicubic between its 30 m samples)
 *   2. where water runs on it (priority flood, eight-way drainage): the river and the gullies, carved
 *      as a V with a cobble bed, their beds pinned to a known level (the model reads the canopy)
 *   3. near grid: 1 m over the 1,024 m square round the origin: the model again, a little relief at
 *      the scale the model cannot hold (stronger on steep ground), the same streams, then the edits:
 *      benched pads, channels, shelf roads, ground patches; blended into the far grid over its last 48 m
 *   4. the far grid takes the near heights inside the near square, so the two meet exactly
 *   5. the ground mask (gravel, laterite, shotcrete, cobbles) over the near square, as KTX2
 *   6. roads (with camber, ruts, shoulders, side drains, concrete where steep), toe drains along every
 *      cut face and weep holes in shotcrete, as one file
 *   7. the walkable surface for the navigation build (P09)
 *
 * Outputs: public/textures/twin/terrain/<loc>-near.bin, -far.bin (heights, see lib/twin/terrain.ts),
 * <loc>-mask.ktx2; public/models/twin/terrain/<loc>-civil.glb; public/models/twin/nav/walkable-<loc>.glb;
 * components/twin/data/terrain/index.json (the manifest the twin reads); and a review sheet in
 * .cache/terrain/.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import sharp from "sharp";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { localToGrid, projectGridToLatLon } from "../../lib/twin/grid";
import { encodeHeights, sampleHeightGrid, type HeightGrid, type TerrainManifest } from "../../lib/twin/terrain";
import { loadDem } from "./lib/dem.mjs";
import { computeFlow } from "./lib/flow.mjs";
import locationsFile from "../../components/twin/data/locations.json";
import editsFile from "../../components/twin/data/terrain-edits.json";
import zonesFile from "../../components/twin/data/zones/powerhouse.camp-gate.json";

const LOCATION = process.argv[2] ?? "powerhouse";
const NEAR_HALF = 512;
const NEAR_SPACING = 1;
const FAR_HALF = 8192;
const FAR_SPACING = 16;
/** Metres at the near square's edge over which it fades into the far grid. */
const BAND = 48;
const NN = (2 * NEAR_HALF) / NEAR_SPACING + 1;
const NF = (2 * FAR_HALF) / FAR_SPACING + 1;
const SEED = 20261016;

const OUT_TEX = "public/textures/twin/terrain";
const OUT_MODELS = "public/models/twin/terrain";
const OUT_NAV = "public/models/twin/nav";
const MANIFEST = "components/twin/data/terrain/index.json";
const REVIEW = ".cache/terrain";

type Rect = [number, number, number, number];
type Cut = { face: "shotcrete" | "laterite"; faceGrade: number; benchHeight: number; berm: number };
type Edit =
  | { id: string; kind: "pad"; rect: Rect; level: number; surface: "gravel" | "laterite"; cut: Cut; fillGrade: number }
  | { id: string; kind: "channel"; rect: Rect; level: number; sideGrade: number; surface: "cobbles" }
  | { id: string; kind: "patch"; asset: string; cut: Cut; fillGrade: number }
  | { id: string; kind: "road"; width: number; maxGrade: number; concreteFrom: number; points: number[][]; startTangent?: [number, number]; endTangent?: [number, number] };
type Streams = { minAreaKm2: number; bankGrade: number; pin: { at: [number, number]; bed: number }; reroutes?: { id: string; points: number[][] }[] };

const t0 = Date.now();
const log = (...a: unknown[]) => console.log(`[terrain ${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex").slice(0, 10);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Smooth minimum (k metres of rounding), so creases at a cut's crest or a bank's top are not knife-edged. */
const smin = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
};
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

// ---- the location -------------------------------------------------------------------------------

type Loc = { id: string; origin: { easting: number; northing: number; elevation: number }; yawToGridNorth: number; underground: boolean };
const loc = (locationsFile as unknown as { locations: Loc[] }).locations.find((l) => l.id === LOCATION);
if (!loc) throw new Error(`no location '${LOCATION}'`);
if (loc.underground) throw new Error(`'${LOCATION}' is underground: it has no terrain`);
const config = (editsFile as unknown as Record<string, { streams: Streams; edits: Edit[] }>)[LOCATION];
if (!config) throw new Error(`no edits for '${LOCATION}' in terrain-edits.json (an empty list is fine)`);

const latLonOf = (x: number, z: number) => projectGridToLatLon(localToGrid(x, z, loc.origin, loc.yawToGridNorth));
const corners = [
  [-FAR_HALF - 200, -FAR_HALF - 200],
  [FAR_HALF + 200, -FAR_HALF - 200],
  [-FAR_HALF - 200, FAR_HALF + 200],
  [FAR_HALF + 200, FAR_HALF + 200],
].map(([x, z]) => latLonOf(x, z));
const box = {
  south: Math.min(...corners.map((c) => c.lat)),
  north: Math.max(...corners.map((c) => c.lat)),
  west: Math.min(...corners.map((c) => c.lon)),
  east: Math.max(...corners.map((c) => c.lon)),
};
const dem = await loadDem(box);
const demY = (x: number, z: number) => {
  const ll = latLonOf(x, z);
  return dem.height(ll.lat, ll.lon) - loc.origin.elevation;
};
log(`elevation model loaded for ${box.south.toFixed(3)} to ${box.north.toFixed(3)} N, ${box.west.toFixed(3)} to ${box.east.toFixed(3)} E`);

// ---- noise ---------------------------------------------------------------------------------------

function hash2(i: number, j: number, s: number): number {
  let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x: number, z: number, s: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j, s);
  const b = hash2(i + 1, j, s);
  const c = hash2(i, j + 1, s);
  const d = hash2(i + 1, j + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

// ---- 1. far grid ---------------------------------------------------------------------------------

const far = new Float32Array(NF * NF);
for (let j = 0; j < NF; j++) for (let i = 0; i < NF; i++) far[j * NF + i] = demY(-FAR_HALF + i * FAR_SPACING, -FAR_HALF + j * FAR_SPACING);
log(`far grid ${NF} x ${NF} at ${FAR_SPACING} m`);

// ---- 2. streams ----------------------------------------------------------------------------------

const flow = computeFlow(far, NF);
const cellKm2 = (FAR_SPACING * FAR_SPACING) / 1e6;
const streams = config.streams;
type Chain = { x: number[]; z: number[]; bed: number[]; width: number[]; area: number[] };
const chains: Chain[] = [];
{
  const isStream = (c: number) => flow.area[c] * cellKm2 >= streams.minAreaKm2;
  const fed = new Uint8Array(NF * NF);
  for (let c = 0; c < NF * NF; c++) if (isStream(c) && flow.down[c] >= 0) fed[flow.down[c]] = 1;
  const seen = new Uint8Array(NF * NF);
  // heads first, largest catchments last, so a junction is reached by the smaller stream's chain
  for (let c = 0; c < NF * NF; c++) {
    if (!isStream(c) || fed[c]) continue;
    const cells: number[] = [];
    let k = c;
    while (k >= 0) {
      cells.push(k);
      if (seen[k]) break;
      seen[k] = 1;
      k = flow.down[k];
    }
    if (cells.length < 2) continue;
    // every chain is traced from a head; a chain that joins another stops at the junction cell, so
    // the main stem is the chain that reaches the edge
    let px = cells.map((q) => -FAR_HALF + (q % NF) * FAR_SPACING);
    let pz = cells.map((q) => -FAR_HALF + Math.floor(q / NF) * FAR_SPACING);
    let pb = cells.map((q) => flow.filled[q]);
    let pa = cells.map((q) => flow.area[q] * cellKm2);
    // Chaikin smoothing (ends kept): the eight-way path zigzags on the grid
    for (let it = 0; it < 3; it++) {
      const nx = [px[0]];
      const nz = [pz[0]];
      const nb = [pb[0]];
      const na = [pa[0]];
      for (let i = 0; i < px.length - 1; i++) {
        for (const t of [0.25, 0.75]) {
          nx.push(px[i] + (px[i + 1] - px[i]) * t);
          nz.push(pz[i] + (pz[i + 1] - pz[i]) * t);
          nb.push(pb[i] + (pb[i + 1] - pb[i]) * t);
          na.push(pa[i] + (pa[i + 1] - pa[i]) * t);
        }
      }
      nx.push(px[px.length - 1]);
      nz.push(pz[pz.length - 1]);
      nb.push(pb[pb.length - 1]);
      na.push(pa[pa.length - 1]);
      px = nx;
      pz = nz;
      pb = nb;
      pa = na;
    }
    chains.push({ x: px, z: pz, bed: pb, width: pa.map((a) => clamp(3 + 2.4 * Math.sqrt(a), 3, 32)), area: pa });
  }
  // the bed: the filled surface less a canopy offset found at the pin, never rising downstream
  let best = Infinity;
  let offset = 0;
  for (const ch of chains)
    for (let i = 0; i < ch.x.length; i++) {
      const d = Math.hypot(ch.x[i] - streams.pin.at[0], ch.z[i] - streams.pin.at[1]);
      if (d < best) {
        best = d;
        offset = streams.pin.bed - ch.bed[i];
      }
    }
  if (best > 60) throw new Error(`stream pin is ${best.toFixed(0)} m from any stream`);
  for (const ch of chains) {
    // a little smoothing along the bed, then downhill only
    const b = ch.bed.map((v, i) => {
      let s = 0;
      let n = 0;
      for (let k = Math.max(0, i - 4); k <= Math.min(ch.bed.length - 1, i + 4); k++) {
        s += ch.bed[k];
        n++;
      }
      return s / n + offset;
    });
    for (let i = 1; i < b.length; i++) b[i] = Math.min(b[i], b[i - 1]);
    ch.bed = b;
  }
  // reroutes: a stretch of a stream replaced by a line given in the edits (the model's line is 30 m
  // data and can run where the works are known to stand), beds and widths carried across
  for (const r of streams.reroutes ?? []) {
    const nearestOn = (p: number[]) => {
      let best = { c: -1, i: -1, d: Infinity };
      chains.forEach((ch, c) => ch.x.forEach((x, i) => {
        const d = Math.hypot(x - p[0], ch.z[i] - p[1]);
        if (d < best.d) best = { c, i, d };
      }));
      return best;
    };
    const a = nearestOn(r.points[0]);
    const ch = chains[a.c];
    let ib = -1;
    let bd = Infinity;
    ch.x.forEach((x, i) => {
      const d = Math.hypot(x - r.points[r.points.length - 1][0], ch.z[i] - r.points[r.points.length - 1][1]);
      if (i > a.i && d < bd) {
        bd = d;
        ib = i;
      }
    });
    if (a.d > 25 || ib < 0 || bd > 25) throw new Error(`reroute ${r.id}: its ends are not on one stream (${a.d.toFixed(0)} m, ${bd.toFixed(0)} m)`);
    const line = spline(r.points, 3).pts;
    const [b0, b1] = [ch.bed[a.i], ch.bed[ib]];
    const [w0, w1] = [ch.width[a.i], ch.width[ib]];
    const [ar0, ar1] = [ch.area[a.i], ch.area[ib]];
    const t = (k: number) => k / (line.length - 1);
    const keep = <T,>(arr: T[], mid: T[]) => [...arr.slice(0, a.i), ...mid, ...arr.slice(ib + 1)];
    ch.x = keep(ch.x, line.map((p) => p[0]));
    ch.z = keep(ch.z, line.map((p) => p[1]));
    ch.bed = keep(ch.bed, line.map((_, k) => b0 + (b1 - b0) * t(k)));
    ch.width = keep(ch.width, line.map((_, k) => w0 + (w1 - w0) * t(k)));
    ch.area = keep(ch.area, line.map((_, k) => ar0 + (ar1 - ar0) * t(k)));
    log(`  stream rerouted: ${r.id}`);
  }
  if (process.env.STREAMS)
    chains.forEach((ch, c) => {
      const pts = ch.x.map((x, i) => [Math.round(x), Math.round(ch.z[i]), +ch.bed[i].toFixed(1), +ch.area[i].toFixed(1)]).filter((p) => p[0] > 100 && p[0] < 520 && p[1] > -200 && p[1] < 40);
      if (pts.length) console.log(`chain ${c}:`, JSON.stringify(pts.filter((_, i) => i % 3 === 0)));
    });
  log(`${chains.length} streams of ${streams.minAreaKm2} km2 or more; canopy offset at the pin ${offset.toFixed(1)} m (pin ${best.toFixed(0)} m from the stream line)`);
}

/** Segments of every stream, in a hash of 64 m cells, for the nearest-stream search. */
type Seg = { ax: number; az: number; bx: number; bz: number; ba: number; bb: number; wa: number; wb: number };
const segs: Seg[] = [];
for (const ch of chains) for (let i = 0; i < ch.x.length - 1; i++) segs.push({ ax: ch.x[i], az: ch.z[i], bx: ch.x[i + 1], bz: ch.z[i + 1], ba: ch.bed[i], bb: ch.bed[i + 1], wa: ch.width[i], wb: ch.width[i + 1] });
const HASH = 64;
const segHash = new Map<string, number[]>();
segs.forEach((s, k) => {
  const x0 = Math.floor(Math.min(s.ax, s.bx) / HASH);
  const x1 = Math.floor(Math.max(s.ax, s.bx) / HASH);
  const z0 = Math.floor(Math.min(s.az, s.bz) / HASH);
  const z1 = Math.floor(Math.max(s.az, s.bz) / HASH);
  for (let a = x0; a <= x1; a++)
    for (let b = z0; b <= z1; b++) {
      const key = `${a},${b}`;
      if (!segHash.has(key)) segHash.set(key, []);
      segHash.get(key)!.push(k);
    }
});
/** The nearest stream within `reach`: distance, bed level and bed width there. */
function nearestStream(x: number, z: number, reach: number): { d: number; bed: number; width: number } | null {
  const r = Math.ceil(reach / HASH);
  const ci = Math.floor(x / HASH);
  const cj = Math.floor(z / HASH);
  let best: { d: number; bed: number; width: number } | null = null;
  const tried = new Set<number>();
  for (let a = ci - r; a <= ci + r; a++)
    for (let b = cj - r; b <= cj + r; b++) {
      const list = segHash.get(`${a},${b}`);
      if (!list) continue;
      for (const k of list) {
        if (tried.has(k)) continue;
        tried.add(k);
        const s = segs[k];
        const dx = s.bx - s.ax;
        const dz = s.bz - s.az;
        const len2 = dx * dx + dz * dz || 1e-9;
        const t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / len2, 0, 1);
        const d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
        if (d <= reach && (!best || d < best.d)) best = { d, bed: s.ba + (s.bb - s.ba) * t, width: s.wa + (s.wb - s.wa) * t };
      }
    }
  return best;
}

/** The ground carved by the nearest stream, and how much of the river bed (cobbles) shows there. */
function carve(x: number, z: number, h: number, reach: number): { h: number; cobbles: number } {
  const s = nearestStream(x, z, reach);
  if (!s) return { h, cobbles: 0 };
  const half = s.width / 2;
  // a bed a little lower in the middle, then banks rising at the bank grade, rounded at the top
  const bank = s.d <= half ? s.bed + 0.4 * (s.d / half) ** 2 : s.bed + 0.4 + (s.d - half) * streams.bankGrade;
  const wobble = 0.25 * valueNoise(x / 7, z / 7, SEED + 3);
  const carved = smin(h, bank + wobble, 2.5);
  // the bed and the bars beside it, up to about a flood's height above the bed: not up the banks
  const cobbles = (1 - smoothstep(half + 1, half + 2 + half * 0.5, s.d)) * smoothstep(2.2, 1.0, carved - s.bed);
  return { h: carved, cobbles };
}

// (the ground before the edits takes two minutes and changes only with the streams: kept between runs)
const NATURAL_VERSION = 3;
const naturalKey = sha(JSON.stringify([LOCATION, streams, NATURAL_VERSION, NEAR_HALF, FAR_HALF, BAND]));
const naturalCache = path.join(REVIEW, `${LOCATION}-natural-${naturalKey}.bin`);
const cached = fs.existsSync(naturalCache) ? new Float32Array(new Uint8Array(zlib.gunzipSync(fs.readFileSync(naturalCache))).buffer) : null;
if (cached) far.set(cached.subarray(0, NF * NF));
else
  for (let j = 0; j < NF; j++)
    for (let i = 0; i < NF; i++) {
      const k = j * NF + i;
      far[k] = carve(-FAR_HALF + i * FAR_SPACING, -FAR_HALF + j * FAR_SPACING, far[k], 400).h;
    }
const farGrid: HeightGrid = { n: NF, spacing: FAR_SPACING, min: [-FAR_HALF, -FAR_HALF], heights: far };
log("streams carved into the far grid");

// ---- 3. near grid ---------------------------------------------------------------------------------

const near = new Float32Array(NN * NN);
/** Mask per near point: gravel, laterite, shotcrete, cobbles. */
const mask = new Float32Array(NN * NN * 4);
const X = (i: number) => -NEAR_HALF + i * NEAR_SPACING;
if (cached) {
  near.set(cached.subarray(NF * NF, NF * NF + NN * NN));
  mask.set(cached.subarray(NF * NF + NN * NN));
  log("natural ground read from the cache");
} else {
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) near[j * NN + i] = demY(X(i), X(j));
  // relief the 30 m model cannot hold: stronger on steep ground, none at the square's edge
  const base = new Float32Array(near);
  for (let j = 0; j < NN; j++)
    for (let i = 0; i < NN; i++) {
      const k = j * NN + i;
      const x = X(i);
      const z = X(j);
      const sx = (base[j * NN + Math.min(NN - 1, i + 2)] - base[j * NN + Math.max(0, i - 2)]) / 4;
      const sz = (base[Math.min(NN - 1, j + 2) * NN + i] - base[Math.max(0, j - 2) * NN + i]) / 4;
      const slope = Math.hypot(sx, sz);
      const amp = 0.25 + 1.1 * clamp(slope, 0, 1.2);
      let n = 0.5 * valueNoise(x / 41, z / 41, SEED) + 0.28 * valueNoise(x / 17, z / 17, SEED + 1) + 0.14 * valueNoise(x / 7.5, z / 7.5, SEED + 2) + 0.07 * valueNoise(x / 3.2, z / 3.2, SEED + 4);
      // ridged outcrops on the steepest faces
      n += clamp(slope - 0.7, 0, 0.6) * (0.5 - Math.abs(valueNoise(x / 11, z / 11, SEED + 5))) * 1.6;
      const edge = smoothstep(0, BAND, NEAR_HALF - Math.max(Math.abs(x), Math.abs(z)));
      near[k] = base[k] + n * amp * edge;
      const c = carve(x, z, near[k], 300);
      near[k] = c.h;
      mask[k * 4 + 3] = c.cobbles;
    }
  fs.mkdirSync(REVIEW, { recursive: true });
  const all = new Float32Array(NF * NF + NN * NN + mask.length);
  all.set(far, 0);
  all.set(near, NF * NF);
  all.set(mask, NF * NF + NN * NN);
  fs.writeFileSync(naturalCache, zlib.gzipSync(new Uint8Array(all.buffer), { level: 1 }));
  log("near grid: model, relief and streams");
}

const nearGrid: HeightGrid = { n: NN, spacing: NEAR_SPACING, min: [-NEAR_HALF, -NEAR_HALF], heights: near };
const idx = (x: number, z: number) => Math.round((z + NEAR_HALF) / NEAR_SPACING) * NN + Math.round((x + NEAR_HALF) / NEAR_SPACING);

/** Paint a mask value at a near point: `m` is [gravel, laterite, shotcrete, cobbles], mixed in by `a`. */
function paint(k: number, m: [number, number, number, number], a: number) {
  if (a <= 0 || k < 0) return;
  for (let c = 0; c < 4; c++) mask[k * 4 + c] += (m[c] - mask[k * 4 + c]) * a;
}
const FACE_COLOUR = { shotcrete: [0, 0, 1, 0], laterite: [0, 1, 0, 0] } as const;

/** A polyline round a rectangle at `d` metres outside it (corners rounded), one point a metre. */
function ringAround(r: Rect, d: number): [number, number][] {
  const [x0, z0, x1, z1] = r;
  const pts: [number, number][] = [];
  const edge = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  };
  const arc = (cx: number, cz: number, a0: number) => {
    const n = Math.max(2, Math.round((Math.PI / 2) * d));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((Math.PI / 2) * i) / n;
      pts.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]);
    }
  };
  edge(x0, z0 - d, x1, z0 - d);
  if (d > 0) arc(x1, z0, -Math.PI / 2);
  edge(x1 + d, z0, x1 + d, z1);
  if (d > 0) arc(x1, z1, 0);
  edge(x1, z1 + d, x0, z1 + d);
  if (d > 0) arc(x0, z1, Math.PI / 2);
  edge(x0 - d, z1, x0 - d, z0);
  if (d > 0) arc(x0, z0, Math.PI);
  pts.push(pts[0]);
  return pts;
}

/** Height of a benched cut `d` metres out from its toe at `level`: faces and berms in turn. */
function benched(level: number, d: number, cut: Cut): number {
  const run = cut.benchHeight / cut.faceGrade;
  const tier = Math.floor(d / (run + cut.berm));
  const within = d - tier * (run + cut.berm);
  return level + tier * cut.benchHeight + Math.min(within / run, 1) * cut.benchHeight;
}

/** Toe drains and weep holes collected while the edits run. */
const toeLines: { pts: [number, number, number][] }[] = [];
const weeps: { p: [number, number, number]; n: [number, number] }[] = [];
const holes: Rect[] = [];

/** Meet the hill from a level edge: benched cut where the hill is higher, a fill slope where it is lower. */
function daylight(k: number, hNow: number, level: number, d: number, cut: Cut, fillGrade: number): { h: number; cutting: boolean } {
  if (hNow >= level) {
    const target = benched(level, d, cut);
    if (target >= hNow) return { h: hNow, cutting: false };
    const h = smin(hNow, target, 0.8);
    const depth = hNow - h;
    paint(k, FACE_COLOUR[cut.face] as unknown as [number, number, number, number], smoothstep(0.2, 1.2, depth));
    return { h, cutting: depth > 0.3 };
  }
  const target = level - d * fillGrade;
  if (target <= hNow) return { h: hNow, cutting: false };
  const h = smax(hNow, target, 0.8);
  // a fill is bare soil while it is new, greening at its foot
  paint(k, [0, 1, 0, 0], 0.75 * smoothstep(0.1, 1.5, h - hNow));
  return { h, cutting: false };
}

/**
 * An edit's height at a grid point, averaged over four points inside the point's metre: a steep cut
 * face or a crest running across the grid at an angle then comes out as a smooth slope through the
 * grid points rather than a staircase (a 68 degree face rises 2.5 m in one grid step).
 */
const SUB = [
  [-0.25, -0.25],
  [0.25, -0.25],
  [-0.25, 0.25],
  [0.25, 0.25],
] as const;
function averaged(x: number, z: number, at: (x: number, z: number) => number): number {
  let s = 0;
  for (const [ox, oz] of SUB) s += at(x + ox, z + oz);
  return s / SUB.length;
}

/** Rect distance (0 inside). */
const rectDistance = (r: Rect, x: number, z: number) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));

function applyPad(e: Extract<Edit, { kind: "pad" }>) {
  const reach = 160;
  for (let j = 0; j < NN; j++) {
    const z = X(j);
    if (z < e.rect[1] - reach || z > e.rect[3] + reach) continue;
    for (let i = 0; i < NN; i++) {
      const x = X(i);
      const d = rectDistance(e.rect, x, z);
      if (d > reach) continue;
      const k = j * NN + i;
      if (d === 0) {
        // gravel or laterite, a little uneven at its edges
        const m: [number, number, number, number] = e.surface === "gravel" ? [1, 0.15, 0, 0] : [0.25, 1, 0, 0];
        paint(k, m, 1);
      } else daylight(k, near[k], e.level, d, e.cut, e.fillGrade); // (for its paint)
      const hNow = near[k];
      near[k] = averaged(x, z, (sx, sz) => {
        const sd = rectDistance(e.rect, sx, sz);
        return sd === 0 ? e.level : daylight(-1, hNow, e.level, sd, e.cut, e.fillGrade).h;
      });
    }
  }
  collectToes(e.rect, e.level, e.cut, (x, z) => sampleHeightGrid(nearGrid, x, z), e.id);
}

/**
 * Along the foot of every cut face over 1 m: a toe drain; on shotcrete faces a row of weep holes.
 * Found by walking rings at each tier's toe and keeping where the natural ground stood above it.
 */
const preEdit = new Float32Array(NN * NN);
function collectToes(rect: Rect, level: number, cut: Cut, hAt: (x: number, z: number) => number, id: string) {
  const run = cut.benchHeight / cut.faceGrade;
  for (let tier = 0; tier < 12; tier++) {
    const dToe = tier * (run + cut.berm);
    const toeLevel = level + tier * cut.benchHeight;
    const ring = ringAround(rect, Math.max(0, dToe - 0.55));
    let run_: [number, number, number][] = [];
    const flush = () => {
      if (run_.length >= 4) toeLines.push({ pts: run_ });
      run_ = [];
    };
    let any = false;
    for (const [x, z] of ring) {
      // the ground before the edits, a little way up the face: was there hill to cut?
      const [fx, fz] = outward(rect, x, z, 1.5);
      const natural = sampleHeightGrid({ ...nearGrid, heights: preEdit }, fx, fz);
      const here = hAt(x, z);
      const cutHere = natural > toeLevel + 1.2 && Math.abs(here - toeLevel) < 0.35;
      if (Math.abs(x) > NEAR_HALF - BAND || Math.abs(z) > NEAR_HALF - BAND) {
        flush();
        continue;
      }
      if (cutHere) {
        any = true;
        run_.push([x, toeLevel, z]);
      } else flush();
    }
    flush();
    if (!any && tier > 0) break;
    // weep holes: on shotcrete faces whose whole height was cut, every 2.5 m, a third of the way up
    if (cut.face === "shotcrete") {
      const ringW = ringAround(rect, dToe + run * 0.3);
      let along = 0;
      for (let q = 1; q < ringW.length; q++) {
        along += Math.hypot(ringW[q][0] - ringW[q - 1][0], ringW[q][1] - ringW[q - 1][1]);
        if (along < 2.5) continue;
        along = 0;
        const [x, z] = ringW[q];
        const [fx, fz] = outward(rect, x, z, run);
        const natural = sampleHeightGrid({ ...nearGrid, heights: preEdit }, fx, fz);
        if (natural < toeLevel + cut.benchHeight + 0.5) continue;
        const [ox, oz] = outward(rect, x, z, 1);
        const len = Math.hypot(ox - x, oz - z) || 1;
        weeps.push({ p: [x, toeLevel + cut.benchHeight * 0.3, z], n: [-(ox - x) / len, -(oz - z) / len] });
      }
    }
  }
  log(`  ${id}: ${toeLines.length} toe drain runs so far, ${weeps.length} weep holes`);
}
/** A point `by` metres further out from a rectangle than (x, z). */
function outward(r: Rect, x: number, z: number, by: number): [number, number] {
  const cx = clamp(x, r[0], r[2]);
  const cz = clamp(z, r[1], r[3]);
  let dx = x - cx;
  let dz = z - cz;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    // on the edge itself: out along the nearest side's normal
    const dists = [x - r[0], r[2] - x, z - r[1], r[3] - z];
    const m = dists.indexOf(Math.min(...dists));
    [dx, dz] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ][m];
    return [x + dx * by, z + dz * by];
  }
  return [x + (dx / len) * by, z + (dz / len) * by];
}

function applyChannel(e: Extract<Edit, { kind: "channel" }>) {
  for (let j = 0; j < NN; j++)
    for (let i = 0; i < NN; i++) {
      const x = X(i);
      const z = X(j);
      const d = rectDistance(e.rect, x, z);
      if (d > 60) continue;
      const k = j * NN + i;
      if (d === 0) {
        near[k] = Math.min(near[k], e.level);
        paint(k, [0.1, 0, 0, 1], 1);
        continue;
      }
      const target = e.level + d * e.sideGrade;
      if (target < near[k]) {
        const before = near[k];
        near[k] = smin(near[k], target, 0.5);
        // the channel's sides are lined (concrete or shotcrete)
        paint(k, [0, 0, 1, 0], smoothstep(0.2, 1, before - near[k]));
      }
    }
}

// ---- the ground patch (P02a): its own heights inside, the hill cut or filled to its edge ------------

async function readPatch(assetId: string): Promise<{ rect: Rect; at: (x: number, z: number) => number }> {
  const place = (zonesFile as unknown as { placements: { asset: string; p: number[]; r: number[]; s: number }[] }).placements.find((p) => p.asset === assetId);
  if (!place) throw new Error(`patch '${assetId}' is not placed in the gate zone`);
  if (place.r.some((v) => Math.abs(v) > 1e-6) || Math.abs(place.s - 1) > 1e-6) throw new Error(`patch '${assetId}' is turned or scaled: not handled`);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(`assets-src/twin/export/${assetId}.glb`);
  const node = doc.getRoot().listNodes().find((n) => n.getMesh() && /_LOD0$/.test(n.getName()))!;
  const pos = node.getMesh()!.listPrimitives()[0].getAttribute("POSITION")!;
  const n = Math.round(Math.sqrt(pos.getCount()));
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const v: number[] = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    minX = Math.min(minX, v[0]);
    maxX = Math.max(maxX, v[0]);
    minZ = Math.min(minZ, v[2]);
    maxZ = Math.max(maxZ, v[2]);
  }
  const step = (maxX - minX) / (n - 1);
  const grid = new Float32Array(n * n);
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    grid[Math.round((v[2] - minZ) / step) * n + Math.round((v[0] - minX) / step)] = v[1] + place.p[1];
  }
  const g: HeightGrid = { n, spacing: step, min: [minX + place.p[0], minZ + place.p[2]], heights: grid };
  return { rect: [minX + place.p[0], minZ + place.p[2], maxX + place.p[0], maxZ + place.p[2]], at: (x, z) => sampleHeightGrid(g, x, z) };
}

async function applyPatch(e: Extract<Edit, { kind: "patch" }>) {
  const patch = await readPatch(e.asset);
  const r = patch.rect;
  holes.push([r[0] + 0.05, r[1] + 0.05, r[2] - 0.05, r[3] - 0.05]);
  const reach = 120;
  for (let j = 0; j < NN; j++)
    for (let i = 0; i < NN; i++) {
      const x = X(i);
      const z = X(j);
      const d = rectDistance(r, x, z);
      if (d > reach) continue;
      const k = j * NN + i;
      const edgeLevel = patch.at(clamp(x, r[0], r[2]), clamp(z, r[1], r[3]));
      if (d === 0) {
        near[k] = edgeLevel;
        paint(k, [0, 1, 0, 0], 1);
        continue;
      }
      daylight(k, near[k], edgeLevel, d, e.cut, e.fillGrade); // (for its paint)
      const hNow = near[k];
      near[k] = averaged(x, z, (sx, sz) => {
        const sd = rectDistance(r, sx, sz);
        const level = patch.at(clamp(sx, r[0], r[2]), clamp(sz, r[1], r[3]));
        return sd === 0 ? level : daylight(-1, hNow, level, sd, e.cut, e.fillGrade).h;
      });
    }
  log(`  ${e.id}: patch ${r.map((v) => v.toFixed(1)).join(", ")}`);
}

// ---- roads ----------------------------------------------------------------------------------------

type Road = {
  id: string;
  /** Stations a metre apart: centre, unit tangent, level, side of the hill (+1: the uphill side is to the left of travel), concrete share. */
  x: number[];
  z: number[];
  tx: number[];
  tz: number[];
  y: number[];
  uphill: number[];
  concrete: number[];
  half: number;
};
const roads: Road[] = [];

/** Catmull-Rom through the points (x, z), resampled every `step` metres. */
function spline(points: number[][], step: number, t0?: [number, number], t1?: [number, number]) {
  const p = points.map((q) => [q[0], q[1]]);
  const first = t0 ? [p[0][0] - t0[0] * 10, p[0][1] - t0[1] * 10] : [2 * p[0][0] - p[1][0], 2 * p[0][1] - p[1][1]];
  const n = p.length;
  const last = t1 ? [p[n - 1][0] + t1[0] * 10, p[n - 1][1] + t1[1] * 10] : [2 * p[n - 1][0] - p[n - 2][0], 2 * p[n - 1][1] - p[n - 2][1]];
  const ext = [first, ...p, last];
  const dense: [number, number][] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [a, b, c, d] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    const segs_ = 40;
    for (let s = 0; s < segs_; s++) {
      const t = s / segs_;
      const f = (k: number) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
      dense.push([f(0), f(1)]);
    }
  }
  dense.push([p[n - 1][0], p[n - 1][1]]);
  // resample by length
  const out: [number, number][] = [dense[0]];
  const along: number[] = [0];
  let acc = 0;
  let next = step;
  for (let i = 1; i < dense.length; i++) {
    const seg = Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    while (acc + seg >= next) {
      const t = (next - acc) / seg;
      out.push([dense[i - 1][0] + (dense[i][0] - dense[i - 1][0]) * t, dense[i - 1][1] + (dense[i][1] - dense[i - 1][1]) * t]);
      along.push(next);
      next += step;
    }
    acc += seg;
  }
  if (acc - along[along.length - 1] > step * 0.3) {
    out.push(dense[dense.length - 1]);
    along.push(acc);
  }
  return { pts: out, along };
}

/** The road's cross-section: height below the centre's level at `u` metres across (+ left of travel), before ruts. */
const CARRIAGE_CAMBER = 0.03;
function crossDrop(u: number, half: number, uphillLeft: number): number {
  const a = Math.abs(u);
  if (a <= half) return a * CARRIAGE_CAMBER;
  const atEdge = half * CARRIAGE_CAMBER;
  const shoulder = 0.7;
  if (a <= half + shoulder) return atEdge + (a - half) * 0.05;
  const s = atEdge + shoulder * 0.05;
  // the uphill side has a V drain a metre wide, 0.35 m deep; the downhill side a verge falling away
  const onUphill = (u > 0 ? 1 : -1) === uphillLeft;
  const w = a - half - shoulder;
  if (onUphill) return w <= 0.5 ? s + w * 0.7 : w <= 1 ? s + 0.35 - (w - 0.5) * 0.5 : s + 0.1 - (w - 1) * 0.15;
  return s + w * 0.12;
}
const corridorHalf = (half: number) => half + 0.7 + 1.0;

function buildRoad(e: Extract<Edit, { kind: "road" }>): Road {
  const { pts } = spline(e.points, 1, e.startTangent, e.endTangent);
  const n = pts.length;
  const x = pts.map((p) => p[0]);
  const z = pts.map((p) => p[1]);
  const tx: number[] = [];
  const tz: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    tx.push((b[0] - a[0]) / len);
    tz.push((b[1] - a[1]) / len);
  }
  // the ground along the line now (after the pads), smoothed over 16 m and taken a little low: a
  // shelf road is cut into the hill rather than built out from it (a fill on a slope gentler than the
  // fill's own runs on and on down the hill)
  const ground = x.map((_, i) => sampleHeightGrid(nearGrid, x[i], z[i]));
  const y = ground.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - 8); k <= Math.min(n - 1, i + 8); k++) {
      s += ground[k];
      c++;
    }
    return s / c - 1.2;
  });
  // pinned levels: at the points that carry a third value, nearest station
  const pins: [number, number][] = [];
  for (const p of e.points)
    if (p.length >= 3) {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(x[i] - p[0], z[i] - p[1]);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      pins.push([best, p[2]]);
    }
  // where the road crosses a stream: a concrete low-water crossing (a ford) half a metre over the bed;
  // where it runs along one, a warning (the line wants moving onto a bank)
  const ford = new Array(n).fill(0);
  let along = 0;
  for (let i = 0; i < n; i++) {
    const st = nearestStream(x[i], z[i], 40);
    if (!st) {
      along = 0;
      continue;
    }
    if (st.d < st.width / 2 + 2.5) {
      ford[i] = 1;
      along++;
      if (along === 12) log(`  WARNING ${e.id}: runs in a stream bed near (${x[i].toFixed(0)}, ${z[i].toFixed(0)})`);
      if (along === 1) pins.push([i, st.bed + 0.5]);
    } else along = 0;
  }
  for (const [i, v] of pins) y[i] = v;
  // grades held under the limit, both ways, the pins fixed; where the ground falls faster than the
  // limit allows, the road is held down (cut above) rather than up (fill below)
  const pinned = new Set(pins.map((p) => p[0]));
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < n; i++) if (!pinned.has(i)) y[i] = Math.min(y[i], y[i - 1] + e.maxGrade);
    for (let i = n - 2; i >= 0; i--) if (!pinned.has(i)) y[i] = Math.min(y[i], y[i + 1] + e.maxGrade);
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < n; i++) if (!pinned.has(i)) y[i] = clamp(y[i], y[i - 1] - e.maxGrade, y[i - 1] + e.maxGrade);
    for (let i = n - 2; i >= 0; i--) if (!pinned.has(i)) y[i] = clamp(y[i], y[i + 1] - e.maxGrade, y[i + 1] + e.maxGrade);
  }
  // and eased (a vertical curve), the pins kept
  for (let pass = 0; pass < 6; pass++) {
    const prev = y.slice();
    for (let i = 1; i < n - 1; i++) if (!pinned.has(i)) y[i] = (prev[i - 1] + 2 * prev[i] + prev[i + 1]) / 4;
  }
  let worst = 0;
  for (let i = 1; i < n; i++) worst = Math.max(worst, Math.abs(y[i] - y[i - 1]));
  // which side the hill rises on: the ground 8 m to the left against 8 m to the right
  const uphillRaw = x.map((_, i) => {
    const l = sampleHeightGrid(nearGrid, x[i] - tz[i] * 8, z[i] + tx[i] * 8);
    const r = sampleHeightGrid(nearGrid, x[i] + tz[i] * 8, z[i] - tx[i] * 8);
    return l >= r ? 1 : -1;
  });
  // (held for 15 m at least, so the drain does not hop from side to side)
  const uphill = uphillRaw.map((_, i) => {
    let s = 0;
    for (let k = Math.max(0, i - 15); k <= Math.min(n - 1, i + 15); k++) s += uphillRaw[k];
    return s >= 0 ? 1 : -1;
  });
  const grade = y.map((_, i) => Math.abs(y[Math.min(n - 1, i + 2)] - y[Math.max(0, i - 2)]) / (Math.min(n - 1, i + 2) - Math.max(0, i - 2)));
  const concrete = grade.map((_, i) => {
    // the mean grade over 20 m: a pitch long enough to need it, not every steep metre
    let m = 0;
    let c = 0;
    for (let k = Math.max(0, i - 10); k <= Math.min(n - 1, i + 10); k++) {
      m += grade[k];
      c++;
    }
    return smoothstep(e.concreteFrom - 0.004, e.concreteFrom + 0.002, m / c);
  });
  // fords are concrete, with 6 m of apron each side
  for (let i = 0; i < n; i++) for (let k = Math.max(0, i - 6); k <= Math.min(n - 1, i + 6); k++) if (ford[k]) concrete[i] = 1;
  const fords = ford.filter((f, i) => f && !ford[i - 1]).length;
  if (fords) log(`  ${e.id}: ${fords} ford(s)`);
  if (process.env.PROFILE) for (let i = 0; i < n; i += 25) console.log(`    ${i} m  ground ${ground[i].toFixed(1)}  road ${y[i].toFixed(1)}`);
  log(`  ${e.id}: ${n} m, steepest ${(worst * 100).toFixed(1)}%, concrete ${concrete.filter((c) => c > 0.5).length} m`);
  return { id: e.id, x, z, tx, tz, y, uphill, concrete, half: e.width / 2 };
}

/** Station hash for the corridor search. */
function applyRoad(road: Road, cut: Cut, fillGrade: number) {
  const hash = new Map<string, number[]>();
  const H = 16;
  road.x.forEach((_, i) => {
    const key = `${Math.floor(road.x[i] / H)},${Math.floor(road.z[i] / H)}`;
    if (!hash.has(key)) hash.set(key, []);
    hash.get(key)!.push(i);
  });
  const ch = corridorHalf(road.half);
  const reach = 70;
  const before = new Float32Array(near);
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < road.x.length; i++) {
    x0 = Math.min(x0, road.x[i]);
    x1 = Math.max(x1, road.x[i]);
    z0 = Math.min(z0, road.z[i]);
    z1 = Math.max(z1, road.z[i]);
  }
  const R = Math.ceil(reach / H);
  for (let j = 0; j < NN; j++) {
    const zz = X(j);
    if (zz < z0 - reach || zz > z1 + reach) continue;
    for (let i = 0; i < NN; i++) {
      const xx = X(i);
      if (xx < x0 - reach || xx > x1 + reach) continue;
      // nearest station
      let best = -1;
      let bd = Infinity;
      const ci = Math.floor(xx / H);
      const cj = Math.floor(zz / H);
      for (let a = ci - R; a <= ci + R; a++)
        for (let b = cj - R; b <= cj + R; b++) {
          const list = hash.get(`${a},${b}`);
          if (!list) continue;
          for (const s of list) {
            const d = (road.x[s] - xx) ** 2 + (road.z[s] - zz) ** 2;
            if (d < bd) {
              bd = d;
              best = s;
            }
          }
        }
      if (best < 0 || bd > reach * reach) continue;
      // past either end of the road: leave the ground to whatever the road joins
      const ax = xx - road.x[best];
      const az = zz - road.z[best];
      const along = ax * road.tx[best] + az * road.tz[best];
      if ((best === 0 && along < -0.5) || (best === road.x.length - 1 && along > 0.5)) continue;
      const u = -ax * road.tz[best] + az * road.tx[best]; // + to the left of travel
      const a = Math.abs(u);
      const k = j * NN + i;
      if (holes.some((r) => xx > r[0] - 0.5 && xx < r[2] + 0.5 && zz > r[1] - 0.5 && zz < r[3] + 0.5)) continue;
      if (a <= ch) {
        // under the ribbon: below its lowest point within a metre either side, so it never shows through
        let low = Infinity;
        for (const du of [-1, -0.5, 0, 0.5, 1]) {
          const uu = clamp(u + du, -ch, ch);
          low = Math.min(low, road.y[best] - crossDrop(uu, road.half, road.uphill[best]));
        }
        near[k] = low - 0.08;
        paint(k, [0.2, 1, road.concrete[best], 0], 1);
        continue;
      }
      const edgeLevel = road.y[best] - crossDrop(ch * Math.sign(u), road.half, road.uphill[best]);
      daylight(k, before[k], edgeLevel, a - ch, cut, fillGrade); // (for its paint)
      // (the four points inside the metre, each by its own distance from the road's line)
      near[k] = averaged(xx, zz, (sx, sz) => {
        const su = Math.abs(-(sx - road.x[best]) * road.tz[best] + (sz - road.z[best]) * road.tx[best]);
        return su <= ch ? edgeLevel : daylight(-1, before[k], edgeLevel, su - ch, cut, fillGrade).h;
      });
    }
  }
}

// ---- run the edits ---------------------------------------------------------------------------------

preEdit.set(near);
const ROAD_CUT: Cut = { face: "laterite", faceGrade: 2.2, benchHeight: 6, berm: 1.5 };
const patchEdits = config.edits.filter((e) => e.kind === "patch");
// the patches' squares are known first, so roads stop at their edges
for (const e of patchEdits) holes.push((await readPatch((e as Extract<Edit, { kind: "patch" }>).asset)).rect);
for (const e of config.edits) {
  if ((e as { skip?: string }).skip) {
    log(`  ${e.id}: skipped (${(e as { skip?: string }).skip})`);
    continue;
  }
  if (e.kind === "pad") applyPad(e);
  else if (e.kind === "channel") applyChannel(e);
  else if (e.kind === "road") {
    const road = buildRoad(e);
    applyRoad(road, ROAD_CUT, 0.667);
    roads.push(road);
  } else if (e.kind === "patch") {
    holes.length = 0;
    await applyPatch(e);
  }
}
log("edits applied");

// ---- 4. edges: the near square fades into the far grid, and the far grid takes the near heights ------

for (let j = 0; j < NN; j++)
  for (let i = 0; i < NN; i++) {
    const x = X(i);
    const z = X(j);
    const w = smoothstep(0, BAND, NEAR_HALF - Math.max(Math.abs(x), Math.abs(z)));
    if (w >= 1) continue;
    const k = j * NN + i;
    near[k] = sampleHeightGrid(farGrid, x, z) + (near[k] - sampleHeightGrid(farGrid, x, z)) * w;
    for (let c = 0; c < 4; c++) mask[k * 4 + c] *= w;
  }
for (let j = 0; j < NF; j++)
  for (let i = 0; i < NF; i++) {
    const x = -FAR_HALF + i * FAR_SPACING;
    const z = -FAR_HALF + j * FAR_SPACING;
    if (Math.abs(x) <= NEAR_HALF && Math.abs(z) <= NEAR_HALF) far[j * NF + i] = near[idx(x, z)];
  }

// ---- write heights ------------------------------------------------------------------------------------

fs.mkdirSync(OUT_TEX, { recursive: true });
fs.mkdirSync(OUT_MODELS, { recursive: true });
fs.mkdirSync(OUT_NAV, { recursive: true });
fs.mkdirSync(REVIEW, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

function writeHeights(name: string, h: Float32Array, n: number, scale: number) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of h) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const offset = Math.floor(lo) - 1;
  if ((hi - offset) / scale > 65535) throw new Error(`${name}: ${(hi - lo).toFixed(0)} m of relief does not fit 16 bits at ${scale} m`);
  // quantised exactly as the twin will read them, so the stored heights are the drawn ones
  for (let k = 0; k < h.length; k++) h[k] = offset + Math.round((h[k] - offset) / scale) * scale;
  const bytes = zlib.gzipSync(encodeHeights(h, n, offset, scale), { level: 9 });
  const file = path.join(OUT_TEX, `${LOCATION}-${name}.bin`);
  fs.writeFileSync(file, bytes);
  return { url: `/textures/twin/terrain/${LOCATION}-${name}.bin?v=${sha(bytes)}`, bytes: bytes.length, offset, scale, range: [lo, hi] as [number, number] };
}
const nearOut = writeHeights("near", near, NN, 0.005);
const farOut = writeHeights("far", far, NF, 0.025);
log(`heights: near ${(nearOut.bytes / 1048576).toFixed(2)} MB, far ${(farOut.bytes / 1048576).toFixed(2)} MB`);

// ---- 5. mask ------------------------------------------------------------------------------------------

const MS = NN - 1;
const maskTex = Buffer.alloc(MS * MS * 4);
{
  // texel (i, j) covers the metre between near points i and i + 1: the mean of its four corners,
  // with a little blur so painted edges are soft
  const blurred = new Float32Array(mask.length);
  for (let j = 0; j < NN; j++)
    for (let i = 0; i < NN; i++)
      for (let c = 0; c < 4; c++) {
        let s = 0;
        let w = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const ii = clamp(i + di, 0, NN - 1);
            const jj = clamp(j + dj, 0, NN - 1);
            const ww = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1;
            s += mask[(jj * NN + ii) * 4 + c] * ww;
            w += ww;
          }
        blurred[(j * NN + i) * 4 + c] = s / w;
      }
  for (let j = 0; j < MS; j++)
    for (let i = 0; i < MS; i++)
      for (let c = 0; c < 4; c++) {
        const v = (blurred[(j * NN + i) * 4 + c] + blurred[(j * NN + i + 1) * 4 + c] + blurred[((j + 1) * NN + i) * 4 + c] + blurred[((j + 1) * NN + i + 1) * 4 + c]) / 4;
        maskTex[(j * MS + i) * 4 + c] = Math.round(clamp(v, 0, 1) * 255);
      }
}
const ktxBin = process.platform === "win32" && fs.existsSync("C:/Program Files/KTX-Software/bin/ktx.exe") ? "C:/Program Files/KTX-Software/bin/ktx.exe" : "ktx";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "twin-terrain-"));
const maskPng = path.join(tmp, "mask.png");
await sharp(maskTex, { raw: { width: MS, height: MS, channels: 4 } }).png().toFile(maskPng);
await sharp(maskTex, { raw: { width: MS, height: MS, channels: 4 } }).removeAlpha().png().toFile(path.join(REVIEW, `${LOCATION}-mask-rgb.png`));
const maskFile = path.join(OUT_TEX, `${LOCATION}-mask.ktx2`);
execFileSync(ktxBin, ["create", "--format", "R8G8B8A8_UNORM", "--assign-tf", "linear", "--generate-mipmap", "--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--zstd", "18", maskPng, maskFile], { stdio: ["ignore", "ignore", "inherit"] });
const maskBytes = fs.readFileSync(maskFile);
log(`mask ${(maskBytes.length / 1048576).toFixed(2)} MB`);

// ---- 6. civil works: roads, toe drains, weep holes ------------------------------------------------------

const finalNear: HeightGrid = { ...nearGrid, heights: near };
const groundAt = (x: number, z: number) => sampleHeightGrid(finalNear, x, z);

type MeshData = { pos: number[]; nor: number[]; uv: number[]; col: number[]; idx: number[] };
const newMesh = (): MeshData => ({ pos: [], nor: [], uv: [], col: [], idx: [] });

/** Vertex normals from the triangles. */
function normals(m: MeshData) {
  const n = new Float32Array(m.pos.length);
  for (let t = 0; t < m.idx.length; t += 3) {
    const [a, b, c] = [m.idx[t] * 3, m.idx[t + 1] * 3, m.idx[t + 2] * 3];
    const e1 = [m.pos[b] - m.pos[a], m.pos[b + 1] - m.pos[a + 1], m.pos[b + 2] - m.pos[a + 2]];
    const e2 = [m.pos[c] - m.pos[a], m.pos[c + 1] - m.pos[a + 1], m.pos[c + 2] - m.pos[a + 2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cy = e1[2] * e2[0] - e1[0] * e2[2];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) {
      n[v] += cx;
      n[v + 1] += cy;
      n[v + 2] += cz;
    }
  }
  for (let v = 0; v < n.length; v += 3) {
    const len = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    m.nor.push(n[v] / len, n[v + 1] / len, n[v + 2] / len);
  }
}

/** A strip along a polyline: `profile` gives, per station, each vertex's (u across, y, weights). */
function strip(m: MeshData, count: number, cols: number, vertex: (i: number, c: number) => { p: [number, number, number]; uv: [number, number]; w: [number, number, number, number] }, keep: (i: number) => boolean) {
  const base = m.pos.length / 3;
  const live: number[] = [];
  for (let i = 0; i < count; i++) {
    live.push(keep(i) ? 1 : 0);
    for (let c = 0; c < cols; c++) {
      const v = vertex(i, c);
      m.pos.push(...v.p);
      m.uv.push(...v.uv);
      m.col.push(...v.w);
    }
  }
  for (let i = 0; i < count - 1; i++) {
    if (!live[i] || !live[i + 1]) continue;
    for (let c = 0; c < cols - 1; c++) {
      const a = base + i * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      m.idx.push(a, d, b, b, d, e);
    }
  }
}

// road cross-section: (u, rut) pairs from the left edge to the right, each side's last vertex tucked under the ground
const roadMesh = newMesh();
const guardStones: [number, number, number, number][] = [];
for (const road of roads) {
  const half = road.half;
  const ch = corridorHalf(half);
  const us = [-(ch + 0.35), -ch, -(half + 1.4), -(half + 1.2), -(half + 0.95), -(half + 0.7), -(half + 0.35), -half, -half + 0.3, -2.55, -2.35, -2.15, -1.6, -0.85, -0.65, -0.45, 0, 0.45, 0.65, 0.85, 1.6, 2.15, 2.35, 2.55, half - 0.3, half, half + 0.35, half + 0.7, half + 0.95, half + 1.2, half + 1.4, ch, ch + 0.35].filter((u, i, a) => i === 0 || u > a[i - 1] + 0.01);
  const ruts = [-2.35, -0.65, 0.65, 2.35];
  // along the road, a few metres of rut depth and wear that come and go
  let along = 0;
  strip(
    roadMesh,
    road.x.length,
    us.length,
    (i, c) => {
      if (c === 0) along = i; // (stations are a metre apart)
      const u = us[c];
      const nx = -road.tz[i];
      const nz = road.tx[i];
      const x = road.x[i] + nx * u;
      const z = road.z[i] + nz * u;
      let y = road.y[i] - crossDrop(u, half, road.uphill[i]);
      const concrete = road.concrete[i];
      const rutDepth = (0.035 + 0.035 * (0.5 + 0.5 * valueNoise(along / 13, u, SEED + 9))) * (1 - concrete * 0.85);
      let rut = 0;
      for (const r of ruts) rut = Math.max(rut, 1 - smoothstep(0, 0.32, Math.abs(u - r)));
      y -= rut * rutDepth;
      // the outermost vertices dip under the ground beside the road
      const a = Math.abs(u);
      if (a > ch) y = Math.min(y, groundAt(x, z)) - 0.06;
      const onCarriage = a <= half ? 1 : 0;
      const shoulder = a > half && a <= half + 0.7 ? 1 : 0;
      const drain = a > half + 0.7 ? 1 : 0;
      // weights: laterite, gravel, concrete, mud
      const gravel = onCarriage * (0.25 + 0.45 * rut) * (1 - concrete);
      const mud = (drain * 0.75 + shoulder * 0.2 + onCarriage * rut * 0.15) * (1 - concrete);
      const conc = concrete * (a <= half + 0.2 ? 1 : 0);
      const lat = Math.max(0, 1 - gravel - mud - conc);
      return { p: [x, y, z], uv: [u, along], w: [lat, gravel, conc, mud] };
    },
    (i) => !holes.some((r) => road.x[i] > r[0] - 1 && road.x[i] < r[2] + 1 && road.z[i] > r[1] - 1 && road.z[i] < r[3] + 1) && Math.max(Math.abs(road.x[i]), Math.abs(road.z[i])) < NEAR_HALF - BAND,
  );
  // guard stones on the outside of bends, on the downhill side, every 2.5 m
  let since = 0;
  for (let i = 3; i < road.x.length - 3; i++) {
    since++;
    const turn = Math.atan2(road.tx[i - 3] * road.tz[i + 3] - road.tz[i - 3] * road.tx[i + 3], road.tx[i - 3] * road.tx[i + 3] + road.tz[i - 3] * road.tz[i + 3]);
    const radius = 6 / Math.max(1e-4, Math.abs(turn));
    const outside = turn > 0 ? -1 : 1; // the outside of the bend, as + left of travel
    if (radius > 45 || outside === road.uphill[i] || since < 2.5) continue;
    if (holes.some((r) => road.x[i] > r[0] - 2 && road.x[i] < r[2] + 2 && road.z[i] > r[1] - 2 && road.z[i] < r[3] + 2)) continue;
    if (Math.max(Math.abs(road.x[i]), Math.abs(road.z[i])) > NEAR_HALF - BAND) continue;
    since = 0;
    const u = outside * (half + 0.55);
    const x = road.x[i] - road.tz[i] * u;
    const z = road.z[i] + road.tx[i] * u;
    guardStones.push([+x.toFixed(2), +(road.y[i] - crossDrop(u, half, road.uphill[i])).toFixed(3), +z.toFixed(2), +Math.atan2(road.tx[i], road.tz[i]).toFixed(3)]);
  }
}
normals(roadMesh);

// toe drains: a concrete U channel with aprons, the ground cut down under it
const drainMesh = newMesh();
const DRAIN = [
  [-1.0, -0.14],
  [-0.62, 0.03],
  [-0.3, 0.03],
  [-0.24, -0.28],
  [0.24, -0.28],
  [0.3, 0.03],
  [0.62, 0.03],
  [1.0, -0.14],
] as const;
for (const line of toeLines) {
  const p = line.pts;
  // the drain's ground: cut under it so the channel's inside shows
  for (const [x, y, z] of p)
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const gx = Math.round(x) + dx;
        const gz = Math.round(z) + dz;
        if (Math.hypot(gx - x, gz - z) > 0.75) continue;
        const k = idx(gx, gz);
        if (k >= 0 && k < near.length) near[k] = Math.min(near[k], y - 0.42);
      }
  let along = 0;
  strip(
    drainMesh,
    p.length,
    DRAIN.length,
    (i, c) => {
      const a = p[Math.max(0, i - 1)];
      const b = p[Math.min(p.length - 1, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      const nx = -(b[2] - a[2]) / len;
      const nz = (b[0] - a[0]) / len;
      if (c === 0 && i > 0) along += Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2]);
      const [u, dy] = DRAIN[c];
      return { p: [p[i][0] + nx * u, p[i][1] + dy, p[i][2] + nz * u], uv: [u, along], w: [0, 0, 1, Math.abs(u) < 0.3 ? 0.35 : 0] };
    },
    () => true,
  );
}
normals(drainMesh);

// weep holes: a short PVC pipe end standing out of the face, dark inside
const weepMesh = newMesh();
for (const w of weeps) {
  const sides = 8;
  const r = 0.05;
  const base = weepMesh.pos.length / 3;
  const [nx, nz] = w.n; // into the face is -n; the pipe stands 6 cm out along n
  const tx = -nz;
  const tz = nx;
  // the face leans back: set the pipe on the face's surface
  const yFace = w.p[1];
  for (let s = 0; s <= sides; s++) {
    const a = (s / sides) * Math.PI * 2;
    const ox = Math.cos(a) * r * tx;
    const oz = Math.cos(a) * r * tz;
    const oy = Math.sin(a) * r;
    for (const out of [-0.08, 0.06]) {
      weepMesh.pos.push(w.p[0] + ox + nx * out, yFace + oy - out * 0.02, w.p[2] + oz + nz * out);
      weepMesh.uv.push(s / sides, out > 0 ? 1 : 0);
      weepMesh.col.push(0.52, 0.53, 0.5, 1);
    }
  }
  for (let s = 0; s < sides; s++) {
    const a = base + s * 2;
    weepMesh.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  // the dark bore, a disc a little inside the rim
  const c0 = weepMesh.pos.length / 3;
  weepMesh.pos.push(w.p[0] + nx * 0.03, yFace, w.p[2] + nz * 0.03);
  weepMesh.uv.push(0.5, 0.5);
  weepMesh.col.push(0.03, 0.03, 0.03, 1);
  for (let s = 0; s <= sides; s++) {
    const a = (s / sides) * Math.PI * 2;
    weepMesh.pos.push(w.p[0] + Math.cos(a) * r * 0.85 * tx + nx * 0.03, yFace + Math.sin(a) * r * 0.85, w.p[2] + Math.cos(a) * r * 0.85 * tz + nz * 0.03);
    weepMesh.uv.push(0.5, 0.5);
    weepMesh.col.push(0.05, 0.05, 0.05, 1);
  }
  for (let s = 0; s < sides; s++) weepMesh.idx.push(c0, c0 + 1 + s, c0 + 2 + s);
}
normals(weepMesh);
// (the weep holes face the camera from in front: their windings follow the face's outward normal)

// the drains' cuts changed the near heights: write them again (quantised the same way)
const nearOut2 = writeHeights("near", near, NN, 0.005);
for (let j = 0; j < NF; j++)
  for (let i = 0; i < NF; i++) {
    const x = -FAR_HALF + i * FAR_SPACING;
    const z = -FAR_HALF + j * FAR_SPACING;
    if (Math.abs(x) <= NEAR_HALF && Math.abs(z) <= NEAR_HALF) far[j * NF + i] = near[idx(x, z)];
  }
const farOut2 = writeHeights("far", far, NF, 0.025);
if (fs.existsSync(path.join(OUT_TEX, `${LOCATION}-near.bin`)) && nearOut2.url === nearOut.url) log("(drains made no change to the heights)");

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

function addMesh(doc: Document, name: string, m: MeshData, buffer: ReturnType<Document["createBuffer"]>) {
  if (m.idx.length === 0) return null;
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(m.pos)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(m.nor)).setBuffer(buffer))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(m.uv)).setBuffer(buffer))
    .setAttribute("COLOR_0", doc.createAccessor().setType("VEC4").setArray(new Float32Array(m.col)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(m.idx)).setBuffer(buffer))
    .setMaterial(doc.createMaterial(name));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  return doc.createNode(name).setMesh(mesh);
}

const civilDoc = new Document();
const civilBuffer = civilDoc.createBuffer();
const civilScene = civilDoc.createScene("civil");
for (const [name, m] of [
  ["road", roadMesh],
  ["drain", drainMesh],
  ["weep", weepMesh],
] as const) {
  const node = addMesh(civilDoc, name, m, civilBuffer);
  if (node) civilScene.addChild(node);
}
await civilDoc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }), prune({ keepAttributes: true }));
const civilBytes = await io.writeBinary(civilDoc);
fs.writeFileSync(path.join(OUT_MODELS, `${LOCATION}-civil.glb`), civilBytes);
log(`civil works: road ${roadMesh.idx.length / 3} triangles, drains ${drainMesh.idx.length / 3} (${toeLines.length} runs), weep holes ${weeps.length}; ${(civilBytes.length / 1024).toFixed(0)} KB`);

// ---- 7. walkable surface ------------------------------------------------------------------------------

{
  const S = 2;
  const n = Math.floor((2 * NEAR_HALF) / S) + 1;
  const pos = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = -NEAR_HALF + i * S;
      const z = -NEAR_HALF + j * S;
      pos.set([x, near[idx(x, z)], z], (j * n + i) * 3);
    }
  const tris: number[] = [];
  const steep = Math.tan((45 * Math.PI) / 180) * S;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      const x = -NEAR_HALF + (i + 0.5) * S;
      const z = -NEAR_HALF + (j + 0.5) * S;
      if (holes.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3])) continue;
      const hs = [a, b, c, d].map((v) => pos[v * 3 + 1]);
      if (Math.max(...hs) - Math.min(...hs) > steep) continue;
      tris.push(a, c, d, a, d, b);
    }
  await MeshoptSimplifier.ready;
  const target = 0;
  const [simplified, error] = MeshoptSimplifier.simplify(new Uint32Array(tris), pos, 3, target, 0.00025, ["LockBorder"]);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const used = new Map<number, number>();
  const outPos: number[] = [];
  const outIdx: number[] = [];
  for (const v of simplified) {
    if (!used.has(v)) {
      used.set(v, outPos.length / 3);
      outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
    outIdx.push(used.get(v)!);
  }
  // the roads' running surfaces, exactly
  const off = outPos.length / 3;
  outPos.push(...roadMesh.pos);
  for (const v of roadMesh.idx) outIdx.push(v + off);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(outPos)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(outIdx)).setBuffer(buffer));
  doc.createScene("walkable").addChild(doc.createNode(`walkable-${LOCATION}`).setMesh(doc.createMesh("walkable").addPrimitive(prim)));
  const bytes = await io.writeBinary(doc);
  fs.writeFileSync(path.join(OUT_NAV, `walkable-${LOCATION}.glb`), bytes);
  log(`walkable: ${tris.length / 3} triangles under 45 degrees, simplified to ${simplified.length / 3} (error ${(error * 1024).toFixed(2)} m), roads added; ${(bytes.length / 1048576).toFixed(2)} MB`);
}

// ---- rocks: scanned boulders and stones on the river's bars, on steep ground and below it; guard stones ----

const ZONE_FILE = `components/twin/data/zones/${LOCATION}.terrain.json`;
{
  let seed = SEED;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  type Place = { asset: string; p: [number, number, number]; r: [number, number, number]; s: number };
  const placements: Place[] = [];
  const g: HeightGrid = { ...nearGrid, heights: near };
  const slopeAt = (x: number, z: number) => {
    const dx = (sampleHeightGrid(g, x + 1, z) - sampleHeightGrid(g, x - 1, z)) / 2;
    const dz = (sampleHeightGrid(g, x, z + 1) - sampleHeightGrid(g, x, z - 1)) / 2;
    return { s: Math.hypot(dx, dz), dx, dz };
  };
  const maskAt = (x: number, z: number, c: number) => maskTex[(clamp(Math.floor(z + NEAR_HALF), 0, MS - 1) * MS + clamp(Math.floor(x + NEAR_HALF), 0, MS - 1)) * 4 + c] / 255;
  const nearRoad = (x: number, z: number) => roads.some((r) => r.x.some((rx, i) => Math.abs(rx - x) < 9 && Math.abs(r.z[i] - z) < 9 && Math.hypot(rx - x, r.z[i] - z) < r.half + 4));
  const inHole = (x: number, z: number) => holes.some((r) => x > r[0] - 2 && x < r[2] + 2 && z > r[1] - 2 && z < r[3] + 2);
  const pick = (big: number) => {
    const u = rand();
    if (u < big * 0.35) return { asset: "prop.rock-boulder.b", s: 0.55 + rand() * 0.7 };
    if (u < big) return { asset: "prop.rock-boulder.a", s: 0.6 + rand() * 0.8 };
    if (u < big + (1 - big) * 0.55) return { asset: "prop.rock-stone.a", s: 0.6 + rand() * 0.9 };
    return { asset: "prop.rock-stone.b", s: 0.7 + rand() * 1.2 };
  };
  const STEP = 2;
  let river = 0;
  let slope = 0;
  for (let z = -NEAR_HALF + BAND; z < NEAR_HALF - BAND; z += STEP)
    for (let x = -NEAR_HALF + BAND; x < NEAR_HALF - BAND; x += STEP) {
      const px = x + rand() * STEP;
      const pz = z + rand() * STEP;
      if (inHole(px, pz) || maskAt(px, pz, 0) > 0.3 || maskAt(px, pz, 2) > 0.3) continue;
      const cob = maskAt(px, pz, 3);
      const sl = slopeAt(px, pz);
      // clusters: a slow noise decides where rocks gather
      const cluster = 0.5 + 0.5 * valueNoise(px / 23, pz / 23, SEED + 21);
      let chance = 0;
      let big = 0.25;
      if (cob > 0.4) {
        chance = 0.07 * cob * (0.4 + cluster);
        big = 0.4;
      } else if (sl.s > 0.75) {
        chance = 0.028 * (0.3 + cluster) * Math.min(1, (sl.s - 0.65) * 2);
        big = 0.3;
      } else if (sl.s > 0.35) {
        // below steep ground: what has fallen off it
        const above = slopeAt(px - sl.dx * 8, pz - sl.dz * 8).s;
        if (above > 0.75) chance = 0.016 * (0.3 + cluster);
      } else chance = 0.0015 * cluster;
      if (rand() >= chance) continue;
      if (nearRoad(px, pz)) continue;
      const choice = pick(big);
      const y = sampleHeightGrid(g, px, pz);
      // tilted a little with the ground, turned at random
      const tilt = Math.min(0.35, Math.atan(sl.s) * 0.5);
      const dir = Math.atan2(sl.dz, sl.dx);
      placements.push({
        asset: choice.asset,
        p: [+px.toFixed(2), +y.toFixed(3), +pz.toFixed(2)],
        r: [+(Math.sin(dir) * tilt).toFixed(3), +(rand() * Math.PI * 2).toFixed(3), +(-Math.cos(dir) * tilt).toFixed(3)],
        s: +choice.s.toFixed(2),
      });
      if (cob > 0.4) river++;
      else slope++;
    }
  for (const [x, y, z, yaw] of guardStones) placements.push({ asset: "prop.guard-stone.a", p: [x, y, z], r: [0, +(yaw + (rand() - 0.5) * 0.6).toFixed(3), 0], s: +(0.85 + rand() * 0.3).toFixed(2) });
  const zone = {
    id: `${LOCATION}.terrain`,
    title: "Rocks on the river bars and the steep ground, guard stones on the road bends",
    bounds: { min: [-NEAR_HALF, -80, -NEAR_HALF], max: [NEAR_HALF, 400, NEAR_HALF] },
    streamIn: 300,
    streamOut: 450,
    shell: null,
    placements,
    lights: [],
    cameras: [],
  };
  fs.writeFileSync(ZONE_FILE, JSON.stringify(zone) + "\n");
  log(`rocks: ${river} by the river, ${slope} on and below steep ground, ${guardStones.length} guard stones -> ${ZONE_FILE}`);
}

// ---- manifest -----------------------------------------------------------------------------------------

const manifest: TerrainManifest & { guardStones: typeof guardStones; streams: number } = {
  location: LOCATION,
  near: { ...nearOut2, n: NN, spacing: NEAR_SPACING, min: [-NEAR_HALF, -NEAR_HALF] },
  far: { ...farOut2, n: NF, spacing: FAR_SPACING, min: [-FAR_HALF, -FAR_HALF] },
  mask: { url: `/textures/twin/terrain/${LOCATION}-mask.ktx2?v=${sha(maskBytes)}`, size: MS, min: [-NEAR_HALF, -NEAR_HALF], texel: NEAR_SPACING },
  civil: { url: `/models/twin/terrain/${LOCATION}-civil.glb?v=${sha(civilBytes)}`, bytes: civilBytes.length },
  holes,
  walkable: `/models/twin/nav/walkable-${LOCATION}.glb`,
  guardStones,
  streams: chains.length,
};
const all = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { note: "Written by scripts/twin/build-terrain.mts. Never edit by hand." };
all[LOCATION] = manifest;
fs.writeFileSync(MANIFEST, JSON.stringify(all, null, 1) + "\n");
fs.rmSync(tmp, { recursive: true, force: true });

// ---- review: shaded relief of the near square with the mask over it ----------------------------------------

{
  const S = 1024;
  const img = Buffer.alloc(S * S * 3);
  for (let j = 1; j < S - 1; j++)
    for (let i = 1; i < S - 1; i++) {
      const k = j * NN + i;
      const dx = (near[k + 1] - near[k - 1]) / 2;
      const dz = (near[k + NN] - near[k - NN]) / 2;
      const l = Math.hypot(dx, 1, dz);
      const shade = clamp((-dx * 0.5 + 0.7 - dz * 0.5) / l, 0.05, 1);
      const m = (j * MS + i) * 4;
      const g = maskTex[m] / 255;
      const lat = maskTex[m + 1] / 255;
      const sh = maskTex[m + 2] / 255;
      const cb = maskTex[m + 3] / 255;
      let r = 70;
      let gg = 100;
      let b = 60;
      const mix = (c: number[], a: number) => {
        r += (c[0] - r) * a;
        gg += (c[1] - gg) * a;
        b += (c[2] - b) * a;
      };
      mix([150, 150, 145], g);
      mix([170, 90, 55], lat);
      mix([200, 200, 195], sh);
      mix([120, 140, 170], cb);
      const o = (j * S + i) * 3;
      img[o] = clamp(r * shade * 1.4, 0, 255);
      img[o + 1] = clamp(gg * shade * 1.4, 0, 255);
      img[o + 2] = clamp(b * shade * 1.4, 0, 255);
    }
  for (const road of roads)
    for (let i = 0; i < road.x.length; i += 2) {
      const o = (Math.round(road.z[i] + NEAR_HALF) * S + Math.round(road.x[i] + NEAR_HALF)) * 3;
      if (o >= 0 && o < img.length) {
        img[o] = 255;
        img[o + 1] = road.concrete[i] > 0.5 ? 255 : 220;
        img[o + 2] = road.concrete[i] > 0.5 ? 255 : 0;
      }
    }
  await sharp(img, { raw: { width: S, height: S, channels: 3 } }).png().toFile(path.join(REVIEW, `${LOCATION}-near-relief.png`));
}
// and a close view of the works: 320 m round the origin, 3 pixels a metre, contours every 2 m
{
  const R = 160;
  const P = 3;
  const S = R * 2 * P;
  const img = Buffer.alloc(S * S * 3);
  const g = { ...nearGrid, heights: near };
  for (let py = 0; py < S; py++)
    for (let px = 0; px < S; px++) {
      const x = -R + px / P;
      const z = -R + py / P;
      const h = sampleHeightGrid(g, x, z);
      const dx = sampleHeightGrid(g, x + 0.5, z) - sampleHeightGrid(g, x - 0.5, z);
      const dz = sampleHeightGrid(g, x, z + 0.5) - sampleHeightGrid(g, x, z - 0.5);
      const shade = clamp((-dx * 0.5 + 0.7 - dz * 0.5) / Math.hypot(dx, 1, dz), 0.05, 1);
      const mi = (Math.floor(z + NEAR_HALF) * MS + Math.floor(x + NEAR_HALF)) * 4;
      const col = [70, 100, 60];
      const layers: [number, number[]][] = [
        [maskTex[mi] / 255, [150, 150, 145]],
        [maskTex[mi + 1] / 255, [170, 90, 55]],
        [maskTex[mi + 2] / 255, [205, 205, 200]],
        [maskTex[mi + 3] / 255, [110, 135, 175]],
      ];
      for (const [a, c] of layers) for (let q = 0; q < 3; q++) col[q] += (c[q] - col[q]) * a;
      const contour = Math.abs(((h % 2) + 2) % 2 - 1) > 0.93 ? 0.55 : 1;
      const o = (py * S + px) * 3;
      for (let q = 0; q < 3; q++) img[o + q] = clamp(col[q] * shade * 1.4 * contour, 0, 255);
    }
  const dot = (x: number, z: number, c: number[]) => {
    const px = Math.round((x + R) * P);
    const py = Math.round((z + R) * P);
    if (px < 0 || py < 0 || px >= S || py >= S) return;
    const o = (py * S + px) * 3;
    img[o] = c[0];
    img[o + 1] = c[1];
    img[o + 2] = c[2];
  };
  for (const road of roads) for (let i = 0; i < road.x.length; i++) dot(road.x[i], road.z[i], road.concrete[i] > 0.5 ? [255, 255, 255] : [255, 220, 0]);
  for (const l of toeLines) for (const p of l.pts) dot(p[0], p[2], [0, 255, 255]);
  for (const w of weeps) dot(w.p[0], w.p[2], [255, 0, 255]);
  await sharp(img, { raw: { width: S, height: S, channels: 3 } }).png().toFile(path.join(REVIEW, `${LOCATION}-works.png`));
}
log(`done: ${MANIFEST}`);
