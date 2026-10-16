/**
 * Paints the trim sheets and the sign sheet of scripts/twin/atlases/<name>.json.
 *
 *   node scripts/twin/build-atlases.mjs [gate]
 *
 * A trim sheet is a stack of horizontal bands (wall panel, roof sheet, concrete, painted steel and
 * so on), each tiling along U, so one material and three textures cover a whole building. Bands are
 * made from Poly Haven sets (CC0, fetched by scripts/twin/fetch-polyhaven.mjs) or painted here, and
 * the wear is painted in: splash dirt at the foot of a wall, streaks under its top edge, rust on
 * roof sheets and steel, damp at the foot of concrete.
 *
 * Writes <sheet>_color.png, <sheet>_normal.png (OpenGL) and <sheet>_orm.png (occlusion, roughness,
 * metal) to assets-src/twin/export/textures/, where the Blender materials pick them up. The asset
 * build compresses them into each GLB.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven");
const OUT = path.join(ROOT, "assets-src", "twin", "export", "textures");
const NAME = process.argv[2] ?? "gate";
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "twin", "atlases", `${NAME}.json`), "utf8"));

// ---- small maths ------------------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Value noise that repeats every `period` cells along x, so a band still tiles along U. */
function noise(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const wrap = (v) => ((v % period) + period) % period;
  const a = hash(wrap(xi), yi, seed);
  const b = hash(wrap(xi + 1), yi, seed);
  const c = hash(wrap(xi), yi + 1, seed);
  const d = hash(wrap(xi + 1), yi + 1, seed);
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return mix(mix(a, b, u), mix(c, d, u), v);
}
/** Fractal noise over a sheet `width` pixels wide; `cells` is the number of cells across at the first octave. */
function fbm(x, y, width, cells, seed, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    sum += amp * noise((x / width) * n, (y / width) * n, n, seed + o * 17);
    total += amp;
    amp *= 0.5;
  }
  return sum / total;
}

// ---- sources ----------------------------------------------------------------------------------------

const cache = new Map();
/**
 * A Poly Haven map scaled so that it has `pxPerM` pixels a metre, as raw RGB.
 * `turn` rotates the picture a quarter turn clockwise (ribs that ran up the picture then run along it).
 */
async function source(id, map, realM, pxPerM, turn = false) {
  const key = `${id}:${map}:${pxPerM}:${turn}`;
  if (cache.has(key)) return cache.get(key);
  const file = path.join(SRC, id, `${id}_${map}_2k.jpg`);
  if (!fs.existsSync(file)) throw new Error(`missing ${file}: run node scripts/twin/fetch-polyhaven.mjs 2k ${id}`);
  const side = Math.max(16, Math.min(2048, Math.round(realM * pxPerM)));
  let img = sharp(file).resize(side, side, { kernel: "lanczos3" });
  if (turn) img = img.rotate(90);
  const data = await img.removeAlpha().raw().toBuffer();
  const tile = { data, side };
  cache.set(key, tile);
  return tile;
}
/** Read a tile with wrap-around; returns r, g, b as 0..1 in `out`. */
function tap(tile, x, y, out) {
  const s = tile.side;
  const i = ((((y % s) + s) % s) * s + (((x % s) + s) % s)) * 3;
  out[0] = tile.data[i] / 255;
  out[1] = tile.data[i + 1] / 255;
  out[2] = tile.data[i + 2] / 255;
  return out;
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

// ---- band painters ----------------------------------------------------------------------------------
// Each returns a function (x, yInBand, px) -> writes colour (sRGB 0..1), normal (x, y in -1..1) and
// occlusion, roughness, metal into `o`.

const MUD = rgb(0x7a5238);
const MOSS = rgb(0x4e5a35);
const RUST = rgb(0x7c3f1e);
const RUST_DARK = rgb(0x4a2613);

async function painters(sheet, W) {
  const pxPerM = W / sheet.tileM;
  const t = [0, 0, 0];
  const n = [0, 0, 0];
  const a = [0, 0, 0];

  /** Colour, normal and roughness straight from a Poly Haven set. */
  const from = async (id, realM, turn = false) => {
    const diff = await source(id, "diff", realM, pxPerM, turn);
    const nor = await source(id, "nor_gl", realM, pxPerM, turn);
    const arm = await source(id, "arm", realM, pxPerM, turn).catch(() => null);
    return (x, y, o) => {
      tap(diff, x, y, t);
      tap(nor, x, y, n);
      let nx = n[0] * 2 - 1;
      let ny = n[1] * 2 - 1;
      if (turn) [nx, ny] = [ny, -nx];
      o.c[0] = t[0];
      o.c[1] = t[1];
      o.c[2] = t[2];
      o.n[0] = nx;
      o.n[1] = ny;
      if (arm) {
        tap(arm, x, y, a);
        o.orm[0] = a[0];
        o.orm[1] = a[1];
        o.orm[2] = a[2];
      } else {
        o.orm[0] = 1;
        o.orm[1] = 0.7;
        o.orm[2] = 0;
      }
    };
  };
  /** A flat colour with fine grain, for paint, plastic and rubber. */
  const flat = (hex, rough, metal, grain = 0.06, seed = 1) => {
    const base = rgb(hex);
    return (x, y, o) => {
      const g = 1 + (fbm(x, y, W, 64, seed, 3) - 0.5) * 2 * grain;
      o.c[0] = base[0] * g;
      o.c[1] = base[1] * g;
      o.c[2] = base[2] * g;
      o.n[0] = 0;
      o.n[1] = 0;
      o.orm[0] = 1;
      o.orm[1] = clamp01(rough + (fbm(x, y, W, 32, seed + 5, 3) - 0.5) * 0.25);
      o.orm[2] = metal;
    };
  };
  /** Lay worn patches of rust over what a painter drew. `amount` 0..1 is how much of the band rusts. */
  const rusted = (paint, amount, seed, streakAlongU = false) => (x, y, px, o) => {
    paint(x, y, px, o);
    const sx = streakAlongU ? x * 0.25 : x;
    const m = smooth(1 - amount - 0.08, 1 - amount + 0.08, fbm(sx, y, W, 12, seed, 5) * 0.75 + fbm(x, y, W, 96, seed + 3, 2) * 0.25);
    if (m <= 0) return;
    const k = fbm(x, y, W, 128, seed + 9, 3);
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], mix(RUST_DARK[i], RUST[i], k), m * 0.92);
    o.orm[1] = mix(o.orm[1], 0.92, m);
    o.orm[2] = mix(o.orm[2], 0, m);
    o.n[0] += (k - 0.5) * 0.5 * m;
  };

  const plaster = await from("painted_plaster_wall", 2);
  const iron = await from("corrugated_iron", 1.12, true);
  const ironRust = await from("rusty_corrugated_iron", 2, true);
  const concrete = await from("concrete_wall_008", 2.71);
  const paintedSteel = await from("rusty_metal_02", 1);
  const yellowSteel = await from("rusty_metal_03", 1.35);
  const o2 = { c: [0, 0, 0], n: [0, 0], orm: [0, 0, 0] };

  const P = {};

  // Insulated wall panel: off-white skin, a joint every 1.2 m, splash dirt at the foot, streaks from the top.
  P.panel = (x, y, px, o) => {
    plaster(x, y, o);
    const l = lum(o.c);
    const v = 0.84 + (l - 0.62) * 0.55;
    o.c[0] = v * 1.0;
    o.c[1] = v * 1.0;
    o.c[2] = v * 0.975;
    o.n[0] *= 0.35;
    o.n[1] *= 0.35;
    o.orm[1] = 0.5 + (o.orm[1] - 0.5) * 0.4;
    o.orm[2] = 0;
    const up = 1 - y / px; // 0 at the foot of the wall, 1 at the top
    // joints
    const jointPx = 1.2 * pxPerM;
    const d = Math.abs(((x + jointPx / 2) % jointPx) - jointPx / 2);
    if (d < 3) {
      const g = 1 - d / 3;
      for (let i = 0; i < 3; i++) o.c[i] *= 1 - 0.45 * g;
      o.n[0] += (((x + jointPx / 2) % jointPx) < jointPx / 2 ? 1 : -1) * 0.5 * g;
      o.orm[0] = 1 - 0.5 * g;
    }
    // rain streaks running down from the top edge and from the joints
    const streak = smooth(0.62, 0.9, fbm(x, y * 0.06, W, 160, 31, 3)) * smooth(0.25, 1, up) * 0.33;
    // mud splashed up from the ground, uneven along the wall
    const reach = 0.06 + 0.09 * fbm(x, 0, W, 24, 41, 3);
    const splash = smooth(reach, 0, up) * (0.55 + 0.45 * fbm(x, y, W, 200, 43, 3));
    // green algae low down on the shaded parts
    const algae = smooth(reach + 0.14, reach * 0.4, up) * smooth(0.5, 0.75, fbm(x, y, W, 10, 47, 4)) * 0.5;
    for (let i = 0; i < 3; i++) {
      o.c[i] = mix(o.c[i], o.c[i] * 0.62, streak);
      o.c[i] = mix(o.c[i], MOSS[i], algae);
      o.c[i] = mix(o.c[i], MUD[i] * (0.8 + 0.4 * fbm(x, y, W, 300, 49, 2)), splash * 0.85);
    }
    o.orm[1] = mix(o.orm[1], 0.9, Math.max(splash, algae));
  };

  // Corrugated roof sheet, ribs running along U: galvanised with rust spreading in streaks.
  P.roof = (x, y, px, o) => {
    iron(x, y, o);
    ironRust(x, y, o2);
    const m = smooth(0.4, 0.62, fbm(x * 0.3, y, W, 10, 61, 5) * 0.8 + fbm(x, y, W, 80, 63, 2) * 0.2);
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i] * 0.92, o2.c[i] * 1.25, m);
    o.n[0] = mix(o.n[0], o2.n[0], m);
    o.n[1] = mix(o.n[1], o2.n[1], m);
    o.orm[0] = mix(o.orm[0], o2.orm[0], m);
    o.orm[1] = mix(Math.min(o.orm[1], 0.5), 0.9, m);
    o.orm[2] = mix(1, 0, m);
  };

  // Concrete: damp and moss at the foot, mud splash, chipped lighter top edge.
  P.concrete = (x, y, px, o) => {
    concrete(x, y, o);
    const up = 1 - y / px;
    const damp = smooth(0.55, 0.05, up) * (0.5 + 0.5 * fbm(x, y, W, 20, 71, 4));
    const moss = smooth(0.4, 0, up) * smooth(0.45, 0.7, fbm(x, y, W, 14, 73, 4)) * 0.75;
    const splash = smooth(0.28, 0, up) * (0.4 + 0.6 * fbm(x, y, W, 160, 75, 3)) * 0.6;
    for (let i = 0; i < 3; i++) {
      o.c[i] = mix(o.c[i], o.c[i] * 0.6, damp);
      o.c[i] = mix(o.c[i], MOSS[i], moss);
      o.c[i] = mix(o.c[i], MUD[i], splash);
    }
    o.orm[1] = mix(o.orm[1], 0.95, Math.max(moss, splash));
    o.orm[2] = 0;
  };

  // Sandbag cloth: a plain weave in faded tan, dirtier in the folds.
  P.burlap = (x, y, px, o) => {
    const s = (pxPerM * 0.012) / Math.PI; // a thread about every 12 mm... drawn coarser so it survives mip-mapping
    const wx = Math.sin(x / s);
    const wy = Math.sin(y / s);
    const weave = wx * wy;
    const tone = 0.52 + 0.1 * weave + (fbm(x, y, W, 40, 81, 4) - 0.5) * 0.35;
    o.c[0] = tone * 1.08;
    o.c[1] = tone * 0.98;
    o.c[2] = tone * 0.78;
    o.n[0] = Math.cos(x / s) * wy * 0.35;
    o.n[1] = wx * Math.cos(y / s) * 0.35;
    o.orm[0] = 0.85 + 0.15 * weave;
    o.orm[1] = 0.95;
    o.orm[2] = 0;
  };

  // Plywood / timber: grain along U.
  P.wood = (x, y, px, o) => {
    const g = fbm(x * 0.08, y * 1.6, W, 48, 91, 4);
    const ring = 0.5 + 0.5 * Math.sin(g * 40 + y * 0.12);
    const tone = 0.42 + 0.16 * g + 0.06 * ring;
    o.c[0] = tone * 1.18;
    o.c[1] = tone * 0.92;
    o.c[2] = tone * 0.62;
    o.n[0] = 0;
    o.n[1] = (ring - 0.5) * 0.25;
    o.orm[0] = 1;
    o.orm[1] = 0.62 + 0.2 * g;
    o.orm[2] = 0;
  };

  // Painted steel in the camp's green: the source's white paint recoloured, some of its rust kept.
  const GREEN = rgb(0x2f7d55);
  P.green = (x, y, px, o) => {
    paintedSteel(x, y, o);
    const rusty = smooth(0.12, 0.3, o.c[0] - o.c[2]) * smooth(0.52, 0.7, fbm(x, y, W, 16, 101, 4));
    const l = clamp01(lum(o.c) / 0.72);
    const src = [o.c[0], o.c[1], o.c[2]];
    for (let i = 0; i < 3; i++) o.c[i] = mix(GREEN[i] * (0.75 + 0.3 * l), src[i] * 0.8, rusty);
    o.orm[1] = mix(0.42, 0.9, rusty);
    o.orm[2] = 0;
    const up = 1 - y / px;
    const grime = smooth(0.3, 0, up) * 0.35;
    for (let i = 0; i < 3; i++) o.c[i] *= 1 - grime;
  };

  // Galvanised steel: pale grey with a faint spangle.
  const galvBase = flat(0xa9adb0, 0.42, 1, 0.1, 111);
  P.galv = rusted((x, y, px, o) => galvBase(x, y, o), 0.16, 113);

  // Bare rusted steel.
  P.rust = (x, y, px, o) => {
    const k = fbm(x, y, W, 96, 121, 4);
    const big = fbm(x, y, W, 12, 123, 3);
    for (let i = 0; i < 3; i++) o.c[i] = mix(RUST_DARK[i], RUST[i] * 1.25, k * 0.7 + big * 0.3);
    o.n[0] = (k - 0.5) * 0.6;
    o.n[1] = (fbm(x + 7, y + 3, W, 96, 125, 4) - 0.5) * 0.6;
    o.orm[0] = 0.8 + 0.2 * k;
    o.orm[1] = 0.93;
    o.orm[2] = 0;
  };

  P.yellow = (x, y, px, o) => {
    yellowSteel(x, y, o);
    // (the source is heavily rusted: pull the paint back over most of it)
    const keep = smooth(0.5, 0.72, fbm(x, y, W, 14, 131, 4));
    const paint = rgb(0xd9a514);
    const g = 0.9 + 0.2 * fbm(x, y, W, 90, 133, 3);
    for (let i = 0; i < 3; i++) o.c[i] = mix(paint[i] * g, o.c[i], keep);
    o.orm[1] = mix(0.45, o.orm[1], keep);
    o.orm[2] = 0;
  };

  const blackBase = flat(0x2a2b2d, 0.72, 0, 0.12, 141);
  P.black = (x, y, px, o) => {
    blackBase(x, y, o);
    const dust = smooth(0.5, 0.8, fbm(x, y, W, 24, 143, 4)) * 0.3;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i] * 0.8, dust);
  };

  /** Painted stripes along U with chips and grime. `angle` slants them (pixels of shift per pixel of height). */
  const striped = (hexA, hexB, lengthM, slant, seed) => {
    const A = rgb(hexA);
    const B = rgb(hexB);
    const L = lengthM * pxPerM;
    return (x, y, px, o) => {
      const s = (((x + y * slant) % (2 * L)) + 2 * L) % (2 * L);
      const edge = Math.min(Math.abs(s - L), s, 2 * L - s);
      const col = s < L ? A : B;
      const g = 0.86 + 0.22 * fbm(x, y, W, 80, seed, 3);
      const chip = smooth(0.7, 0.78, fbm(x, y, W, 110, seed + 3, 3)) * 0.8;
      const grime = smooth(0.45, 0.8, fbm(x, y, W, 18, seed + 5, 4)) * 0.3;
      for (let i = 0; i < 3; i++) {
        let v = col[i] * g;
        v = mix(v, 0.45 + 0.1 * g, chip); // bare metal showing through
        v = mix(v, MUD[i] * 0.7, grime);
        o.c[i] = v;
      }
      o.n[0] = edge < 1.5 ? 0.15 : 0;
      o.n[1] = 0;
      o.orm[0] = 1;
      o.orm[1] = mix(0.4, 0.8, Math.max(chip, grime));
      o.orm[2] = chip * 0.6;
    };
  };
  P.stripes = striped(0xc8261d, 0xe9e6dc, 0.5, 0, 151);
  P.hazard = striped(0xe2b112, 0x232323, 0.16, 1, 161);

  const redBase = flat(0xc4352b, 0.38, 0, 0.05, 171);
  P.red = (x, y, px, o) => redBase(x, y, o);
  const chromeBase = flat(0xe6e8ea, 0.07, 1, 0.01, 181);
  P.chrome = (x, y, px, o) => chromeBase(x, y, o);
  const darkBase = flat(0x34363a, 0.8, 0, 0.08, 191);
  P.dark = (x, y, px, o) => darkBase(x, y, o);

  // Traffic cone, laid on its side: U runs round it, V from base (bottom of the band) to tip.
  const ORANGE = rgb(0xe2531b);
  P.cone = (x, y, px, o) => {
    const up = 1 - y / px;
    const band = (up > 0.42 && up < 0.6) || (up > 0.7 && up < 0.8);
    const g = 0.88 + 0.2 * fbm(x, y, W, 60, 201, 3);
    const scuff = smooth(0.55, 0.8, fbm(x, y, W, 30, 203, 4)) * 0.35 + smooth(0.2, 0, up) * 0.5;
    for (let i = 0; i < 3; i++) {
      const v = (band ? 0.9 : ORANGE[i]) * g;
      o.c[i] = mix(v, MUD[i], scuff);
    }
    o.n[0] = 0;
    o.n[1] = 0;
    o.orm[0] = 1;
    o.orm[1] = band ? 0.35 : mix(0.5, 0.9, scuff);
    o.orm[2] = 0;
  };

  // ---- the site dressing kit (P02f) ----------------------------------------------------------------
  // Props are small, so the dressing sheet carries a millimetre a texel. A box or pipe maps its
  // length along U from 0, so "x near 0" is the foot of a drum or the start of a run of pipe.

  const hessian = await from("hessian_230", 0.27);
  const planks = await from("wood_planks_grey", 1.5, true);
  const bluePlate = await from("blue_metal_plate", 2.5);
  const rustPlate = await from("metal_plate_02", 2.0);
  const o3 = { c: [0, 0, 0], n: [0, 0], orm: [0, 0, 0] };

  /** Dirt that collects at the foot of a thing (`up` 0 at its foot) and in streaks. */
  const footDirt = (o, x, y, up, reach, seed, amount = 0.8) => {
    const d = smooth(reach, 0, up) * (0.45 + 0.55 * fbm(x, y, W, 90, seed, 3)) * amount;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i] * (0.75 + 0.4 * fbm(x, y, W, 220, seed + 1, 2)), d);
    o.orm[1] = mix(o.orm[1], 0.92, d);
    return d;
  };

  // Woven polypropylene sack: flat tapes about 4 mm wide over and under, sun-faded cream, dirty low down.
  P.sack = (x, y, px, o) => {
    const tape = 4.2;
    const wx = Math.sin((x / tape) * Math.PI);
    const wy = Math.sin((y / tape) * Math.PI);
    const over = Math.sign(wx * wy);
    const tone = 0.8 + 0.035 * over + (fbm(x, y, W, 50, 401, 4) - 0.5) * 0.12;
    o.c[0] = tone * 1.0;
    o.c[1] = tone * 0.985;
    o.c[2] = tone * 0.93;
    o.n[0] = over > 0 ? Math.cos((x / tape) * Math.PI) * 0.22 : 0;
    o.n[1] = over > 0 ? 0 : Math.cos((y / tape) * Math.PI) * 0.22;
    o.orm[0] = 0.92 + 0.08 * over;
    o.orm[1] = 0.62 + 0.08 * over;
    o.orm[2] = 0;
    footDirt(o, x, y, 1 - y / px, 0.35, 403, 0.7);
    // a stain or two where it was dragged
    const stain = smooth(0.66, 0.8, fbm(x, y, W, 8, 405, 4)) * 0.45;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i] * 1.1, stain);
  };

  // Jute sacking for sandbags: the hessian photograph, faded and dirtier, darker where it was wet.
  P.hessian = (x, y, px, o) => {
    hessian(x, y, o);
    const l = lum(o.c);
    const tone = 0.42 + (l - 0.42) * 0.9;
    o.c[0] = tone * 1.12;
    o.c[1] = tone * 0.98;
    o.c[2] = tone * 0.74;
    o.n[0] *= 1.2;
    o.n[1] *= 1.2;
    o.orm[1] = 0.95;
    o.orm[2] = 0;
    const damp = smooth(0.5, 0.75, fbm(x, y, W, 10, 411, 4)) * 0.3;
    for (let i = 0; i < 3; i++) o.c[i] *= 1 - damp;
    footDirt(o, x, y, 1 - y / px, 0.4, 413, 0.6);
    // green algae on the oldest bags
    const algae = smooth(0.66, 0.82, fbm(x, y, W, 14, 415, 4)) * 0.22;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MOSS[i], algae);
  };

  // (the gate's sandbags are jute too: since P02f the trim sheet's burlap is the same photograph)
  P.burlap = P.hessian;

  // Pallet boards: grey weathered timber, grain along U, from the middle of one plank of the photograph.
  P.pallet = (x, y, px, o) => {
    planks(x, y + 72, o);
    const l = lum(o.c);
    const tone = 0.34 + (l - 0.22) * 1.25;
    o.c[0] = tone * 1.08;
    o.c[1] = tone * 1.0;
    o.c[2] = tone * 0.9;
    o.orm[1] = Math.max(0.78, o.orm[1]);
    o.orm[2] = 0;
    // fresher wood where a board split or was knocked
    const fresh = smooth(0.73, 0.82, fbm(x, y, W, 30, 421, 4)) * 0.6;
    o.c[0] = mix(o.c[0], 0.62, fresh);
    o.c[1] = mix(o.c[1], 0.5, fresh);
    o.c[2] = mix(o.c[2], 0.36, fresh);
    footDirt(o, x, y, Math.min(y, px - y) / px, 0.12, 423, 0.5);
  };

  // 200-litre steel drum in blue paint: rust at the foot and the top rim, scrapes on the body.
  P["drum-steel"] = (x, y, px, o) => {
    bluePlate(x, y, o);
    rustPlate(x, y, o3);
    const m = x / pxPerM; // metres up the drum from its foot
    const foot = smooth(0.12, 0.0, m) * (0.6 + 0.6 * fbm(x, y, W, 40, 431, 4));
    const rim = smooth(0.78, 0.88, m) * smooth(0.98, 0.9, m) * smooth(0.45, 0.6, fbm(x, y, W, 30, 433, 4));
    const scrape = smooth(0.68, 0.76, fbm(x * 0.5, y, W, 24, 435, 4)) * 0.8;
    const r = clamp01(Math.max(foot, rim, scrape));
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i] * 1.05, o3.c[i] * 1.1, r);
    o.n[0] = mix(o.n[0], o3.n[0], r);
    o.n[1] = mix(o.n[1], o3.n[1], r);
    o.orm[1] = mix(0.5, 0.88, r);
    o.orm[2] = 0;
    footDirt(o, x, y, m / 0.9, 0.18, 437, 0.8);
  };

  /** Moulded plastic in a colour: fine grain, scuffs pale with wear, grime at the foot. */
  const plastic = (hex, rough, seed) => {
    const base = rgb(hex);
    return (x, y, px, o) => {
      const g = 1 + (fbm(x, y, W, 120, seed, 3) - 0.5) * 0.08;
      for (let i = 0; i < 3; i++) o.c[i] = base[i] * g;
      const scuff = smooth(0.7, 0.8, fbm(x * 2.5, y * 0.4, W, 60, seed + 1, 3)) * 0.35;
      for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], Math.min(0.9, base[i] * 1.25 + 0.08), scuff);
      o.n[0] = (fbm(x, y, W, 300, seed + 2, 2) - 0.5) * 0.08;
      o.n[1] = 0;
      o.orm[0] = 1;
      o.orm[1] = clamp01(rough + scuff * 0.3 + (fbm(x, y, W, 40, seed + 3, 3) - 0.5) * 0.15);
      o.orm[2] = 0;
      // (no dirt by position along U: boxes and turned shapes start their U anywhere)
      const grime = smooth(0.55, 0.85, fbm(x, y, W, 18, seed + 5, 4)) * 0.25;
      for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i] * 0.85, grime);
    };
  };
  P["plastic-blue"] = plastic(0x1f5fa8, 0.5, 441);
  P["plastic-white"] = plastic(0xdedbd2, 0.45, 451);
  P["plastic-green"] = plastic(0x2e7d46, 0.45, 461);
  P["plastic-yellow"] = plastic(0xd8a91c, 0.42, 471);
  P["plastic-black"] = plastic(0x262729, 0.55, 481);

  // Black rubber (hose, slippers' soles, cord jackets): matte, fine grain, mud.
  const rubberBase = flat(0x232426, 0.86, 0, 0.1, 491);
  P.rubber = (x, y, px, o) => {
    rubberBase(x, y, o);
    o.n[0] = (fbm(x, y, W, 400, 493, 2) - 0.5) * 0.15;
    const mud = smooth(0.62, 0.8, fbm(x, y, W, 22, 495, 4)) * 0.45;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i] * 0.8, mud);
  };

  // A tyre painted for a planter: white paint over black rubber, cracked and chipped, tread grooves across.
  P.tyre = (x, y, px, o) => {
    rubberBase(x, y, o);
    const t = y / px; // 0..1 round the tyre's section
    const tread = t > 0.38 && t < 0.62;
    const groove = tread ? Math.max(0, Math.cos((x / (pxPerM * 0.035)) * Math.PI * 2)) : 0;
    const paint = tread ? 0 : smooth(0.25, 0.4, fbm(x, y, W, 40, 501, 4) + 0.1);
    const crack = smooth(0.48, 0.5, Math.abs(fbm(x, y, W, 70, 503, 3) - 0.5) + 0.48) * 0.5;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], 0.84 - crack * 0.4, paint);
    o.n[0] = groove * 0.5;
    o.orm[0] = 1 - groove * 0.4;
    o.orm[1] = mix(0.86, 0.55, paint);
    footDirt(o, x, y, Math.abs(t - 0.5) * 2, 0.3, 505, 0.4);
  };

  const cordBase = flat(0xd9541a, 0.5, 0, 0.06, 511);
  P.cord = (x, y, px, o) => {
    cordBase(x, y, o);
    footDirt(o, x, y, 0.5, 0.0, 513, 0);
    const mud = smooth(0.6, 0.8, fbm(x, y, W, 20, 515, 4)) * 0.5;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i], MUD[i], mud);
  };

  // Navy umbrella nylon, a seam down the middle of each panel.
  const umbrellaBase = flat(0x1e2a48, 0.62, 0, 0.08, 521);
  P.umbrella = (x, y, px, o) => {
    umbrellaBase(x, y, o);
    const seam = Math.abs(y - px / 2) < 1.2 ? 1 : 0;
    o.n[1] = seam * 0.3;
    o.n[0] = Math.sin(x * 0.9) * Math.sin(y * 0.9) * 0.04;
  };

  // Stainless steel (thermos, tumbler): brushed along U.
  P.stainless = (x, y, px, o) => {
    const brush = fbm(x * 0.02, y * 4, W, 64, 531, 3);
    const v = 0.72 + 0.1 * brush;
    o.c[0] = v;
    o.c[1] = v * 1.01;
    o.c[2] = v * 1.02;
    o.n[0] = 0;
    o.n[1] = (brush - 0.5) * 0.1;
    o.orm[0] = 1;
    o.orm[1] = 0.26 + 0.12 * brush;
    o.orm[2] = 1;
  };

  // A white hard hat's shell: glossy, scuffed, a little sun-yellowed.
  P.hardhat = plastic(0xe6e2d6, 0.32, 541);

  // Potting soil in a planter: dark crumbly earth with bits of leaf.
  P.soil = (x, y, px, o) => {
    const crumb = fbm(x, y, W, 260, 545, 3);
    const v = 0.17 + 0.1 * crumb + 0.05 * fbm(x, y, W, 30, 546, 3);
    o.c[0] = v * 1.25;
    o.c[1] = v * 0.95;
    o.c[2] = v * 0.7;
    const bit = smooth(0.74, 0.8, fbm(x, y, W, 120, 547, 2));
    o.c[0] = mix(o.c[0], 0.4, bit);
    o.c[1] = mix(o.c[1], 0.32, bit);
    o.c[2] = mix(o.c[2], 0.18, bit);
    o.n[0] = (crumb - 0.5) * 0.9;
    o.n[1] = (fbm(x + 5, y, W, 260, 548, 3) - 0.5) * 0.9;
    o.orm[0] = 0.7 + 0.3 * crumb;
    o.orm[1] = 0.95;
    o.orm[2] = 0;
  };

  const paper = flat(0xd9d5c8, 0.8, 0, 0.04, 551);
  P.print = (x, y, px, o) => paper(x, y, o);

  // ---- the fence's cut-out sheet -----------------------------------------------------------------------
  const panelM = sheet.panelM ?? 1.8;

  // Chain link: zig-zag galvanised wires 50 mm apart, the band spanning the fabric's height.
  P.chainlink = (x, y, px, o) => {
    const xm = x / pxPerM;
    const ym = (y / px) * panelM;
    const pitch = 0.05;
    // two families of wires at about 45 degrees; each wire kinks where it meets the next
    const a = (xm + ym) / pitch;
    const b = (xm - ym) / pitch;
    const da = Math.abs(a - Math.round(a)) * pitch;
    const db = Math.abs(b - Math.round(b)) * pitch;
    const d = Math.min(da, db);
    const r = 0.0021;
    const cover = smooth(r * 1.6, r * 0.6, d);
    galvBase(x, y, o);
    const rust = smooth(0.62, 0.8, fbm(x, y, W, 20, 561, 4)) * 0.6;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i] * 0.85, RUST[i], rust);
    o.orm[1] = mix(0.45, 0.85, rust);
    o.orm[2] = 1 - rust;
    const across = (da < db ? Math.sign(a - Math.round(a)) : Math.sign(b - Math.round(b))) * clamp01(d / r);
    o.n[0] = across * 0.7;
    o.n[1] = 0;
    o.orm[0] = 0.7 + 0.3 * cover;
    o.a = cover;
  };

  // Barbed wire: two strands twisted together, a four-point barb every 100 mm.
  P.barbed = (x, y, px, o) => {
    const xm = x / pxPerM;
    const yc = (y / px - 0.5) * (px / pxPerM); // metres from the strand's centre
    const twist = Math.sin((xm / 0.03) * Math.PI) * 0.0022;
    const d = Math.min(Math.abs(yc - twist), Math.abs(yc + twist));
    let cover = smooth(0.0022, 0.0011, d);
    const along = xm % 0.1;
    if (along < 0.012) {
      const barb = Math.abs(Math.abs(yc) - Math.abs(along - 0.006) * 2.4);
      cover = Math.max(cover, smooth(0.0016, 0.0008, barb) * (Math.abs(yc) < 0.014 ? 1 : 0));
    }
    galvBase(x, y, o);
    const rust = smooth(0.55, 0.72, fbm(x, y, W, 30, 571, 4)) * 0.8;
    for (let i = 0; i < 3; i++) o.c[i] = mix(o.c[i] * 0.8, RUST[i], rust);
    o.orm[1] = 0.7;
    o.orm[2] = 1 - rust;
    o.n[1] = clamp01(d / 0.0022) * Math.sign(yc) * 0.6;
    o.a = cover;
  };

  // A wild vine scrambling along: heart-shaped leaves on a wandering stem (mile-a-minute, Mikania).
  P.vine = (x, y, px, o) => {
    const xm = x / pxPerM;
    const ym = (y / px - 0.5) * (px / pxPerM);
    const stemY = Math.sin(xm * 9) * 0.02 + Math.sin(xm * 23 + 1) * 0.008;
    let cover = smooth(0.003, 0.0015, Math.abs(ym - stemY));
    let shade = 0.0;
    let leafN = [0, 0];
    // leaves in pairs along the stem
    const spacing = 0.055;
    const k0 = Math.floor(xm / spacing);
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      for (const side of [-1, 1]) {
        const h = hash(k, side > 0 ? 1 : 2, 581);
        if (h < 0.15) continue;
        const bx = (k + 0.5 + (h - 0.5) * 0.4) * spacing;
        const by = Math.sin(bx * 9) * 0.02 + Math.sin(bx * 23 + 1) * 0.008;
        const ang = side * (0.7 + h * 0.6) + (h - 0.5) * 0.4;
        const len = 0.035 + 0.025 * hash(k, side + 5, 583);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const dx = xm - bx;
        const dy = ym - by;
        const u = (dx * ca + dy * sa) / len; // along the leaf, 0 at the stalk
        const v = (-dx * sa + dy * ca) / len;
        if (u < 0 || u > 1.05) continue;
        // a heart: widest a third of the way out, notched at the stalk, pointed at the tip
        const half = 0.42 * Math.sin(Math.PI * Math.pow(u, 0.75)) * (1 - 0.25 * smooth(0.0, 0.15, 0.15 - u));
        const inside = smooth(half, half - 0.06, Math.abs(v));
        if (inside > cover) {
          cover = inside;
          shade = 0.5 + 0.5 * hash(k, side + 9, 585);
          leafN = [v * 0.6, (u - 0.5) * 0.2];
          // midrib and veins
          const rib = smooth(0.03, 0.0, Math.abs(v)) * 0.25;
          shade -= rib;
        }
      }
    }
    const leaf = rgb(0x4f7a2a);
    const young = rgb(0x8aa83a);
    for (let i = 0; i < 3; i++) o.c[i] = mix(leaf[i], young[i], clamp01(shade - 0.3)) * (0.85 + 0.25 * fbm(x, y, W, 200, 587, 2));
    o.n[0] = leafN[0];
    o.n[1] = leafN[1];
    o.orm[0] = 1;
    o.orm[1] = 0.55;
    o.orm[2] = 0;
    o.a = cover;
  };

  return P;
}

// ---- decal painters -----------------------------------------------------------------------------------
// Each writes colour (o.c), alpha (o.a), normal (o.n) and occlusion, roughness, metal (o.orm).
// Band painters get (x, y in band, band height); stamp painters (x, y, w, h) inside their rectangle.

async function decalPainters(sheet, W) {
  const pxPerM = W / sheet.tileM;
  const t = [0, 0, 0];
  const nn = [0, 0, 0];
  const aa = [0, 0, 0];
  const gravelD = await source("gravel_floor", "diff", 2.25, pxPerM);
  const gravelN = await source("gravel_floor", "nor_gl", 2.25, pxPerM);
  const gravelH = await source("gravel_floor", "disp", 2.25, pxPerM);
  const leavesD = await source("forest_leaves_03", "diff", 2.3, pxPerM);
  const leavesN = await source("forest_leaves_03", "nor_gl", 2.3, pxPerM);
  const leavesH = await source("forest_leaves_03", "disp", 2.3, pxPerM);
  const mudD = await source("muddy_tracks", "diff", 2.25, pxPerM);
  const mudN = await source("muddy_tracks", "nor_gl", 2.25, pxPerM);
  const LATERITE = rgb(0x8a5638);
  const DAMP = rgb(0x4a2e20);
  const OIL = rgb(0x17130f);
  const D = {};
  const set = (o, c, a, nx, ny, ao, rough) => {
    o.c[0] = c[0];
    o.c[1] = c[1];
    o.c[2] = c[2];
    o.a = a;
    o.n[0] = nx;
    o.n[1] = ny;
    o.orm[0] = ao;
    o.orm[1] = rough;
    o.orm[2] = 0;
  };
  /** A boot's sole seen from above, `fx` -1 (heel) to 1 (toe) along it and `fy` across it (1 at its widest). */
  const bootSole = (fx, fy) => {
    if (Math.abs(fx) > 1) return false;
    if (fx > 0.02) return ((fx - 0.5) / 0.5) ** 2 + (fy / 1.0) ** 2 < 1; // forefoot
    if (fx < -0.3) return ((fx + 0.66) / 0.34) ** 2 + (fy / 0.8) ** 2 < 1; // heel
    return Math.abs(fy) < 0.55 - (fx + 0.3) * 0.4 && fx > -0.32; // the waist, pressed in lightly
  };
  /** Soft edges across a band: 1 in the middle, 0 at its top and bottom. */
  const across = (y, px, soft) => smooth(0, soft, Math.min(y, px - y) / px);

  // A tyre's print pressed into soft laterite: blocks of tread across, ridges of pushed-up mud at the sides.
  D.tread = (x, y, px, o) => {
    const xm = x / pxPerM;
    const v = y / px; // 0..1 across the print
    const block = Math.sin((xm / 0.034) * Math.PI * 2 + (v < 0.5 ? 0 : Math.PI / 2) + Math.sin(v * 9) * 0.6);
    const lug = smooth(0.15, 0.45, block) * smooth(0.12, 0.2, v) * smooth(0.88, 0.8, v);
    const ridge = smooth(0.0, 0.08, v) * smooth(0.2, 0.1, v) + smooth(1.0, 0.92, v) * smooth(0.8, 0.9, v);
    tap(mudD, x, y, t);
    const k = 0.75 + 0.3 * fbm(x, y, W, 120, 601, 3);
    // (owner's review: at full strength the prints read as black paint on the road; a tyre presses the
    // laterite only a little darker and the print breaks up)
    const c = [mix(LATERITE[0], DAMP[0], 0.15 + lug * 0.25) * k, mix(LATERITE[1], DAMP[1], 0.15 + lug * 0.25) * k, mix(LATERITE[2], DAMP[2], 0.15 + lug * 0.25) * k];
    for (let i = 0; i < 3; i++) c[i] = mix(c[i], t[i] * 0.9, 0.3);
    const gaps = 0.55 + 0.45 * smooth(0.25, 0.6, fbm(x * 0.4, y, W, 16, 603, 4)); // the print breaks up where the ground was hard
    const a = across(y, px, 0.2) * gaps * 0.55;
    const nx = Math.cos((xm / 0.034) * Math.PI * 2) * 0.35 * smooth(0.12, 0.2, v) * smooth(0.88, 0.8, v);
    set(o, c, a, nx, (ridge > 0 ? (v < 0.5 ? -1 : 1) : 0) * ridge * 0.5, 1 - lug * 0.3, 0.88 - lug * 0.1);
  };

  // Crushed gravel spilled off a load at the road's edge: dense at the top of the band, thinning out below.
  D.gravel = (x, y, px, o) => {
    tap(gravelD, x, y, t);
    tap(gravelN, x, y, nn);
    tap(gravelH, x, y, aa);
    const v = y / px;
    const density = smooth(1.0, 0.1, v + (fbm(x, y, W, 24, 611, 4) - 0.5) * 0.6);
    // stones show where they stand proud of the spill's own height field: many near the edge they
    // fell from, a scatter further out; a film of grey dust holds them together
    const cut = 0.72 - density * 0.12 + (1 - density) * 0.12;
    const stone = smooth(cut, cut + 0.05, aa[0]) * smooth(0.0, 0.25, density + 0.1);
    const dust = density * 0.22 * (0.6 + 0.4 * fbm(x, y, W, 40, 613, 3));
    const l = lum(t) * 0.82;
    const g = [mix(l * 1.02, LATERITE[0], 0.3), mix(l * 0.98, LATERITE[1], 0.3), mix(l * 0.92, LATERITE[2], 0.3)];
    const a = Math.max(stone * 0.95, dust) * smooth(0, 0.06, v) * smooth(1, 0.94, v);
    set(o, stone > dust ? g : [0.48, 0.42, 0.37], a, stone > dust ? nn[0] * 2 - 1 : 0, stone > dust ? nn[1] * 2 - 1 : 0, 0.6 + 0.4 * aa[0], 0.86);
  };

  // A path worn between the booth and the barrier: compacted, darker, boot prints along it.
  D.path = (x, y, px, o) => {
    const xm = x / pxPerM;
    const v = y / px;
    const step = 0.36; // half a stride
    const k = Math.floor(xm / step);
    const side = k % 2 ? 1 : -1;
    const fx = (xm - (k + 0.5) * step) / 0.15; // along the print, -1..1 over 300 mm
    const fy = (v - 0.5 - side * 0.13 - (hash(k, 1, 621) - 0.5) * 0.06) / 0.11;
    const sole = bootSole(fx, fy);
    const lugs = sole ? Math.max(0, Math.sin(fx * 30) * Math.sin(fy * 14)) : 0;
    const fresh = hash(k, 3, 623);
    const worn = across(y, px, 0.35) * (0.5 + 0.3 * fbm(x, y, W, 30, 625, 4));
    const print = sole ? (0.55 + 0.4 * fresh) * (0.6 + 0.4 * fbm(x, y, W, 60, 627, 3)) : 0;
    const c = [DAMP[0] * 1.25, DAMP[1] * 1.22, DAMP[2] * 1.2];
    set(o, c, clamp01(Math.max(worn * 0.55, print)), lugs * 0.4, sole ? 0.15 : 0, 1 - print * 0.25, 0.82 - print * 0.15);
  };

  // Under the roof's drip line: a narrow trench washed out, small stones left standing in it, always damp.
  D.drip = (x, y, px, o) => {
    tap(gravelH, x * 2, y * 2, aa);
    const v = y / px;
    const trench = across(y, px, 0.45);
    const pebble = smooth(0.6, 0.7, aa[0]) * smooth(0.25, 0.4, v) * smooth(0.75, 0.6, v);
    const c = pebble > 0.5 ? [0.55, 0.5, 0.45] : [DAMP[0] * 0.9, DAMP[1] * 0.9, DAMP[2] * 0.9];
    set(o, c, trench * (0.75 + 0.25 * pebble), (aa[0] - 0.5) * 0.4, (v - 0.5) * -0.6, 0.75 + 0.25 * pebble, 0.6);
  };

  // Mud carried by tyres over something clean (the speed hump): smears and bits of tread, breaking up.
  D.smear = (x, y, px, o) => {
    tap(mudD, x, y, t);
    tap(mudN, x, y, nn);
    const xm = x / pxPerM;
    const tread = smooth(0.1, 0.5, Math.sin((xm / 0.034) * Math.PI * 2)) * 0.3;
    const amount = smooth(0.55, 0.38, fbm(x * 0.6, y, W, 20, 631, 5)) * across(y, px, 0.25);
    const c = [mix(LATERITE[0], t[0], 0.4), mix(LATERITE[1], t[1], 0.4), mix(LATERITE[2], t[2], 0.4)];
    set(o, c, clamp01(amount * (0.85 + tread)), nn[0] * 2 - 1, nn[1] * 2 - 1, 0.95, 0.9);
  };

  /** Distance-from-centre helpers for stamps, with a wobbling edge. */
  const blob = (x, y, w, h, seed, wobble = 0.35) => {
    const dx = (x - w / 2) / (w / 2);
    const dy = (y - h / 2) / (h / 2);
    const r = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx);
    const edge = 0.72 + wobble * (fbm(Math.cos(ang) * 40 + 100, Math.sin(ang) * 40 + 100, 200, 3, seed, 4) - 0.5);
    return { r, edge, dx, dy };
  };

  // Engine oil soaked into laterite: near-black centre, brown halo, rings where it spread, a sheen.
  const oil = (seed) => (x, y, w, h, o) => {
    const b = blob(x, y, w, h, seed, 0.9);
    const r = b.r * (0.8 + 0.4 * fbm(x, y, w, 6, seed + 7, 4));
    const edge = b.edge;
    const inner = smooth(edge, edge * 0.35, r) * (0.55 + 0.45 * fbm(x, y, w, 14, seed + 9, 3));
    const halo = smooth(edge * 1.25, edge * 0.8, r);
    const ring = Math.max(0, Math.sin((r / edge) * 22 + fbm(x, y, w, 8, seed + 1, 3) * 6)) * 0.15 * halo;
    const spots = smooth(0.7, 0.78, fbm(x, y, w, 40, seed + 2, 3)) * smooth(edge * 1.45, edge, r);
    const k = clamp01(inner + ring + spots * 0.6);
    const c = [mix(DAMP[0], OIL[0], k), mix(DAMP[1], OIL[1], k), mix(DAMP[2], OIL[2], k)];
    set(o, c, clamp01(halo * 0.4 + inner * 0.4 + spots * 0.35) * 0.8, 0, 0, 1, mix(0.72, 0.22, inner));
  };
  D["oil-a"] = oil(641);
  D["oil-b"] = oil(645);

  // Tyre scrub where vehicles brake for the stop line: two dark smears of rubber and polished, compacted dirt.
  D.scrub = (x, y, w, h, o) => {
    const v = y / h;
    const u = x / w;
    const lane = Math.min(Math.abs(v - 0.27), Math.abs(v - 0.73));
    const mark = smooth(0.12, 0.05, lane) * smooth(0.0, 0.15, u) * smooth(1.0, 0.6, u);
    const streak = 0.6 + 0.4 * fbm(x * 0.1, y * 2, w, 30, 651, 3);
    const c = [0.16, 0.13, 0.11];
    set(o, c, clamp01(mark * streak * 0.75), 0, 0, 1, 0.55);
  };

  // A few separate boot prints (lugged soles), for the door and the barrier.
  D.prints = (x, y, w, h, o) => {
    let best = 0;
    let lug = 0;
    const prints = [
      [0.12, 0.35, 0.3],
      [0.26, 0.62, -0.2],
      [0.42, 0.38, 0.1],
      [0.58, 0.66, 2.9],
      [0.74, 0.32, 3.3],
      [0.9, 0.6, 1.4],
    ];
    for (const [px, py, ang] of prints) {
      const dx = (x / w - px) * w;
      const dy = (y / h - py) * h;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const fx = (dx * c + dy * s) / (0.15 * pxPerM);
      const fy = (-dx * s + dy * c) / (0.055 * pxPerM);
      const inside = bootSole(fx, fy);
      if (inside) {
        best = 0.7 + 0.3 * fbm(x, y, w, 30, 661, 3);
        lug = Math.max(0, Math.sin(fx * 30) * Math.sin(fy * 9));
      }
    }
    set(o, [DAMP[0] * 1.2, DAMP[1] * 1.15, DAMP[2] * 1.1], best * 0.8, lug * 0.4, 0, 1 - best * 0.2, 0.8);
  };

  /** A streak down a wall from a fixing: strongest under its source, fading and narrowing downwards. */
  const streak = (colour, seed, strength) => (x, y, w, h, o) => {
    const u = (x - w / 2) / (w / 2);
    const v = y / h; // 0 at the fixing
    const width = 0.35 + 0.5 * v * (0.7 + 0.6 * fbm(0, y, h, 6, seed, 3));
    const core = smooth(width, width * 0.3, Math.abs(u + (fbm(0, y, h, 4, seed + 1, 3) - 0.5) * 0.5));
    const fade = smooth(1.0, 0.25, v) * smooth(0, 0.04, v);
    const runs = 0.7 + 0.3 * fbm(x * 3, y * 0.15, w, 12, seed + 2, 3);
    set(o, colour, clamp01(core * fade * runs * strength), 0, 0, 1, 0.75);
  };
  D["rust-a"] = streak([0.42, 0.21, 0.1], 671, 0.85);
  D["rust-b"] = streak([0.36, 0.2, 0.12], 675, 0.85);
  D.stain = streak([0.3, 0.29, 0.26], 679, 0.75);

  // Leaf litter and fallen pods under an acacia: the leaf photograph, broken into a loose drift.
  const leafDrift = (seed, podsOnly) => (x, y, w, h, o) => {
    tap(leavesD, x, y, t);
    tap(leavesN, x, y, nn);
    tap(leavesH, x, y, aa);
    const { r, edge } = blob(x, y, w, h, seed, 0.5);
    const cover = smooth(edge, edge * 0.45, r) * smooth(0.35, 0.55, aa[0] + (fbm(x, y, w, 10, seed + 1, 4) - 0.5) * 0.4);
    let c = [t[0] * 1.05, t[1] * 0.95, t[2] * 0.8];
    let a = podsOnly ? 0 : cover;
    let nx = nn[0] * 2 - 1;
    let ny = nn[1] * 2 - 1;
    let rough = 0.85;
    // pods: dark brown, curved, 120 to 180 mm long
    for (let k = 0; k < (podsOnly ? 14 : 7); k++) {
      const cx = hash(k, 1, seed) * w;
      const cy = hash(k, 2, seed) * h;
      const ang = hash(k, 3, seed) * Math.PI;
      const len = (0.12 + 0.06 * hash(k, 4, seed)) * pxPerM;
      const dx = x - cx;
      const dy = y - cy;
      const along = (dx * Math.cos(ang) + dy * Math.sin(ang)) / len;
      const bend = Math.pow(along, 2) * 0.25 * len;
      const off = -dx * Math.sin(ang) + dy * Math.cos(ang) - bend;
      const half = 0.011 * pxPerM * Math.sqrt(Math.max(0, 1 - Math.pow(along / 0.5, 6)));
      if (Math.abs(along) < 0.5 && Math.abs(off) < half) {
        const g = 0.8 + 0.3 * hash(k, 5, seed);
        c = [0.2 * g, 0.12 * g, 0.07 * g];
        a = 1;
        nx = 0;
        ny = (off / half) * 0.6;
        rough = 0.6;
      }
    }
    set(o, c, a, nx, ny, 0.8 + 0.2 * aa[0], rough);
  };
  D.litter = leafDrift(681, false);
  D.pods = leafDrift(685, true);

  // A dark damp ring round the foot of a post: splashed soil, wetter near the post.
  D["damp-ring"] = (x, y, w, h, o) => {
    const { r, edge } = blob(x, y, w, h, 691, 0.4);
    const ring = smooth(edge, edge * 0.2, r);
    const speck = smooth(0.66, 0.72, fbm(x, y, w, 60, 693, 3)) * smooth(edge * 1.3, edge, r);
    set(o, DAMP, clamp01(ring * 0.6 + speck * 0.5), 0, 0, 1 - ring * 0.3, 0.8);
  };

  // Moss on shaded concrete: dark green cushions with a lighter rim.
  D.moss = (x, y, w, h, o) => {
    const { r, edge } = blob(x, y, w, h, 701, 0.7);
    const n = fbm(x, y, w, 24, 703, 5);
    const cover = smooth(edge, edge * 0.45, r) * smooth(0.3, 0.5, n);
    const tone = 0.55 + 0.45 * fbm(x, y, w, 90, 705, 3);
    const c = [0.17 * tone, 0.21 * tone, 0.1 * tone];
    set(o, c, cover * 0.95, (fbm(x + 3, y, w, 90, 707, 2) - 0.5) * 0.8, (fbm(x, y + 3, w, 90, 707, 2) - 0.5) * 0.8, 0.8, 0.95);
  };

  // Dust settled on a ledge: a pale film, heavier in patches.
  D.dust = (x, y, w, h, o) => {
    const { r, edge } = blob(x, y, w, h, 711, 0.3);
    const film = smooth(edge * 1.2, edge * 0.5, r) * (0.45 + 0.55 * fbm(x, y, w, 20, 713, 4));
    set(o, [0.62, 0.52, 0.42], clamp01(film * 0.55), 0, 0, 1, 0.95);
  };

  // Mud splashed up round the foot of something: speckles thickest at the bottom.
  D.splash = (x, y, w, h, o) => {
    const v = 1 - y / h; // 0 at the bottom
    const dots = smooth(0.6 + v * 0.25, 0.66 + v * 0.25, fbm(x, y, w, 70, 721, 3));
    const band = smooth(0.35, 0.0, v) * (0.5 + 0.5 * fbm(x, 0, w, 10, 723, 3));
    set(o, [MUD[0] * 0.95, MUD[1] * 0.9, MUD[2] * 0.85], clamp01(dots + band * 0.7) * smooth(1, 0.7, v), 0, 0, 1, 0.9);
  };

  // Silt left in the culvert's mouth.
  D["culvert-silt"] = (x, y, w, h, o) => {
    tap(mudD, x, y, t);
    const v = y / h;
    set(o, [mix(DAMP[0], t[0], 0.5), mix(DAMP[1], t[1], 0.5), mix(DAMP[2], t[2], 0.5)], smooth(0, 0.3, v) * smooth(1, 0.7, v) * 0.9, 0, 0, 1, 0.7);
  };

  return D;
}

// ---- plant cards (P02f) ---------------------------------------------------------------------------------
// Cut-out sprays for the plants a Filipino camp actually has: croton (San Francisco), santan (ixora)
// and cogon grass. Each card is painted leaf by leaf; alpha is the cut-out.

function cardPainters() {
  const C = {};
  /**
   * A leaf from (bx, by) towards angle `ang` (0 = up the card, positive leans right), `len` and
   * `wide` in card pixels, curving by `bend`. Returns {u, v, inside} for a pixel: u 0..1 along it,
   * v -1..1 across it.
   */
  const leafAt = (x, y, leaf) => {
    const { bx, by, ang, len, wide, bend, shape } = leaf;
    const dx = x - bx;
    const dy = by - y; // up the card is positive
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const along = (dx * sa + dy * ca) / len;
    if (along < 0 || along > 1) return null;
    const off = dx * ca - dy * sa - bend * len * along * along;
    const half = wide * shape(along);
    if (half <= 0 || Math.abs(off) > half) return null;
    return { u: along, v: off / half };
  };
  const ellipse = (u) => Math.sin(Math.PI * Math.pow(u, 0.85));
  const blade = (u) => (u < 0.08 ? 0.6 + u * 5 : 1 - Math.pow((u - 0.08) / 0.92, 2.2)) * 1;
  const lanceolate = (u) => Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - 0.35 * u);
  const rng = (k, s) => hash(k, s, 811);

  /** Pick the topmost (last listed) leaf under a pixel. */
  const topLeaf = (x, y, leaves) => {
    for (let i = leaves.length - 1; i >= 0; i--) {
      const hit = leafAt(x, y, leaves[i]);
      if (hit) return { leaf: leaves[i], ...hit, i };
    }
    return null;
  };
  const writeLeaf = (o, colour, hit, gloss) => {
    o.c[0] = colour[0];
    o.c[1] = colour[1];
    o.c[2] = colour[2];
    o.a = smooth(1.0, 0.9, Math.abs(hit.v));
    // the blade folds along the midrib and dishes a little
    o.n[0] = Math.sign(hit.v) * 0.35 * (1 - Math.abs(hit.v)) + hit.v * 0.25;
    o.n[1] = (hit.u - 0.5) * 0.2;
    o.orm[0] = 0.75 + 0.25 * hit.u;
    o.orm[1] = gloss;
    o.orm[2] = 0;
  };

  // Croton: long leaves radiating from the stem, green with yellow veins and red and orange flushes.
  const crotonLeaves = (w, h, seed, count) => {
    const out = [];
    for (let k = 0; k < count; k++) {
      const t = k / count;
      out.push({
        bx: w * (0.5 + (rng(k, seed) - 0.5) * 0.12),
        by: h * (0.98 - 0.25 * t),
        ang: (rng(k, seed + 1) - 0.5) * 2.4 * (1 - 0.4 * t),
        len: h * (0.42 + 0.3 * rng(k, seed + 2)),
        wide: w * (0.06 + 0.035 * rng(k, seed + 3)),
        bend: (rng(k, seed + 4) - 0.5) * 0.5,
        shape: lanceolate,
        tint: rng(k, seed + 5),
      });
    }
    return out.sort((a, b) => a.len - b.len);
  };
  const crotonColour = (hit, x, y, w) => {
    const g = rgb(0x2c5320);
    const yel = rgb(0xd7b42e);
    const red = rgb(0xb8401f);
    const t = hit.leaf.tint;
    const vein = smooth(0.12, 0.0, Math.abs(hit.v)) + smooth(0.05, 0.0, Math.abs(Math.sin(hit.u * 18 + Math.abs(hit.v) * 6))) * 0.6 * (1 - Math.abs(hit.v));
    const flush = smooth(0.4, 0.7, fbm(x, y, w, 6, 821 + hit.i, 3) + t * 0.4 - 0.2) * (t > 0.35 ? 1 : 0.2);
    const c = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      c[i] = mix(g[i], red[i], flush * smooth(0.2, 0.9, hit.u));
      c[i] = mix(c[i], yel[i], clamp01(vein) * (0.55 + 0.4 * t));
      // gold speckles, as on the common "Gold Dust" and "Petra" forms
      c[i] = mix(c[i], yel[i], smooth(0.7, 0.74, fbm(x, y, w, 70, 825 + hit.i, 2)) * 0.8 * (t > 0.2 ? 1 : 0.3));
      c[i] *= 0.85 + 0.25 * fbm(x, y, w, 60, 823, 2);
    }
    return c;
  };
  const croton = (seed, count) => {
    let leaves = null;
    return (x, y, w, h, o) => {
      leaves ??= crotonLeaves(w, h, seed, count);
      o.a = 0;
      const hit = topLeaf(x, y, leaves);
      if (!hit) return;
      writeLeaf(o, crotonColour(hit, x, y, w), hit, 0.32);
    };
  };
  C.croton = croton(831, 26);
  C["croton-b"] = croton(841, 12);

  // Santan (ixora): dark glossy leaves in pairs up a woody stem, a dome of small red four-petalled flowers on top.
  const ixoraParts = (w, h) => {
    const leaves = [];
    for (let k = 0; k < 18; k++) {
      const yy = h * (0.95 - 0.62 * (k / 18));
      const side = k % 2 ? 1 : -1;
      leaves.push({ bx: w * 0.5 + side * w * 0.01, by: yy, ang: side * (0.9 + 0.5 * rng(k, 851)), len: w * (0.17 + 0.06 * rng(k, 853)), wide: w * 0.045, bend: -side * 0.2, shape: ellipse, tint: rng(k, 855) });
    }
    const flowers = [];
    for (let k = 0; k < 70; k++) {
      const a = rng(k, 857) * Math.PI * 2;
      const r = Math.sqrt(rng(k, 859)) * w * 0.15;
      flowers.push([w * 0.5 + Math.cos(a) * r * 1.2, h * 0.24 + Math.sin(a) * r * 0.7 - (1 - r / (w * 0.15)) * h * 0.04, w * (0.014 + 0.006 * rng(k, 861)), rng(k, 863)]);
    }
    return { leaves, flowers };
  };
  const ixora = (flowerOnly) => {
    let parts = null;
    return (x, y, w, h, o) => {
      parts ??= ixoraParts(w, h);
      o.a = 0;
      if (!flowerOnly) {
        // the stem
        if (Math.abs(x - w * 0.5) < w * 0.008 && y > h * 0.25) {
          o.c[0] = 0.32;
          o.c[1] = 0.24;
          o.c[2] = 0.16;
          o.a = 1;
          o.orm[1] = 0.8;
        }
        const hit = topLeaf(x, y, parts.leaves);
        if (hit) {
          const g = rgb(0x203f17);
          const k = 0.8 + 0.35 * hit.leaf.tint + smooth(0.08, 0, Math.abs(hit.v)) * 0.4;
          writeLeaf(o, [g[0] * k, g[1] * k, g[2] * k], hit, 0.28);
        }
      }
      // flowers over the leaves
      const fx = flowerOnly ? (x / w - 0.5) * 0.4 * w + w * 0.5 : x;
      const fy = flowerOnly ? (y / h - 0.5) * 0.4 * h + h * 0.24 : y;
      for (const [cx, cy, r, t] of parts.flowers) {
        const dx = fx - cx;
        const dy = fy - cy;
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const ang = Math.atan2(dy, dx) + t * 3;
        const petal = 0.55 + 0.45 * Math.abs(Math.cos(ang * 2));
        if (d > r * petal) continue;
        const red = rgb(0xd2321d);
        const k = 0.85 + 0.3 * t - (d / r) * 0.15;
        o.c[0] = red[0] * k;
        o.c[1] = red[1] * k + (d < r * 0.2 ? 0.15 : 0);
        o.c[2] = red[2] * k;
        o.a = 1;
        o.n[0] = (dx / r) * 0.4;
        o.n[1] = (-dy / r) * 0.4;
        o.orm[0] = 1;
        o.orm[1] = 0.55;
      }
    };
  };
  C.ixora = ixora(false);
  C["ixora-flower"] = ixora(true);

  // Cogon grass: a tuft of long narrow blades, pale green, browning at the tips, some bent over.
  let blades = null;
  C.cogon = (x, y, w, h, o) => {
    if (!blades) {
      blades = [];
      for (let k = 0; k < 46; k++) {
        blades.push({ bx: w * (0.5 + (rng(k, 871) - 0.5) * 0.18), by: h, ang: (rng(k, 873) - 0.5) * 1.1, len: h * (0.55 + 0.45 * rng(k, 875)), wide: w * (0.008 + 0.006 * rng(k, 877)), bend: (rng(k, 879) - 0.5) * 1.2, shape: blade, tint: rng(k, 881) });
      }
    }
    o.a = 0;
    const hit = topLeaf(x, y, blades);
    if (!hit) return;
    const g = rgb(0x6f8c3c);
    const dry = rgb(0xb59a5a);
    const t = smooth(0.6, 1.0, hit.u) * (0.4 + 0.6 * hit.leaf.tint);
    const k = 0.85 + 0.3 * hit.leaf.tint;
    writeLeaf(o, [mix(g[0], dry[0], t) * k, mix(g[1], dry[1], t) * k, mix(g[2], dry[2], t) * k], hit, 0.6);
  };

  // Cogon's flowering plume: a slender stalk with a silky white spike.
  C["cogon-plume"] = (x, y, w, h, o) => {
    o.a = 0;
    const u = 1 - y / h;
    const sway = Math.sin(u * 2.2) * w * 0.06;
    const dx = x - (w * 0.5 + sway);
    if (u < 0.6) {
      if (Math.abs(dx) < w * 0.012) {
        o.c[0] = 0.5;
        o.c[1] = 0.55;
        o.c[2] = 0.3;
        o.a = 1;
        o.orm[1] = 0.6;
      }
      return;
    }
    const t = (u - 0.6) / 0.4;
    const half = w * 0.11 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (0.75 + 0.5 * fbm(x, y, w, 30, 891, 3));
    const fluff = fbm(x * 2, y, w, 90, 893, 3);
    if (Math.abs(dx) < half && fluff > 0.32) {
      const v = 0.86 + 0.08 * fluff;
      o.c[0] = v;
      o.c[1] = v * 0.99;
      o.c[2] = v * 0.93;
      o.a = smooth(half, half * 0.6, Math.abs(dx));
      o.n[0] = (dx / half) * 0.5;
      o.orm[0] = 1;
      o.orm[1] = 0.9;
    }
  };
  return C;
}

// ---- decal sheets ---------------------------------------------------------------------------------------

async function buildDecals(name, sheet, cards = false) {
  const W = sheet.size;
  const D = cards ? cardPainters() : await decalPainters(sheet, W);
  sheet.bands ??= [];
  const color = Buffer.alloc(W * W * 4);
  const normal = Buffer.alloc(W * W * 3).fill(128);
  const orm = Buffer.alloc(W * W * 3);
  for (let i = 0; i < W * W; i++) {
    normal[i * 3 + 2] = 255;
    orm[i * 3] = 255;
    orm[i * 3 + 1] = 230;
  }
  const o = { c: [0, 0, 0], n: [0, 0], orm: [1, 0.8, 0], a: 0 };
  const put = (px, py) => {
    const i = py * W + px;
    for (let k = 0; k < 3; k++) color[i * 4 + k] = Math.round(Math.min(240, Math.max(20, clamp01(o.c[k]) * 255)));
    color[i * 4 + 3] = Math.round(clamp01(o.a) * 255);
    const nx = Math.max(-0.95, Math.min(0.95, o.n[0]));
    const ny = Math.max(-0.95, Math.min(0.95, o.n[1]));
    normal[i * 3] = Math.round((nx * 0.5 + 0.5) * 255);
    normal[i * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    normal[i * 3 + 2] = Math.round((Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)) * 0.5 + 0.5) * 255);
    orm[i * 3] = Math.round(clamp01(o.orm[0]) * 255);
    orm[i * 3 + 1] = Math.round(clamp01(o.orm[1]) * 255);
    orm[i * 3 + 2] = 0;
  };
  let top = 0;
  for (const band of sheet.bands) {
    const paint = D[band.name];
    if (!paint) throw new Error(`${name}: no painter for decal band '${band.name}'`);
    for (let y = 0; y < band.px; y++)
      for (let x = 0; x < W; x++) {
        o.a = 0;
        paint(x, y, band.px, o);
        put(x, top + y);
      }
    top += band.px;
  }
  for (const [id, [rx, ry, w, h]] of Object.entries(sheet.rects)) {
    const paint = D[id];
    if (!paint) throw new Error(`${name}: no painter for decal '${id}'`);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        o.a = 0;
        paint(x, y, w, h, o);
        // (a stamp fades to nothing at its rectangle's edge, so mip-mapping never shows the rectangle)
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (edge < 6) o.a *= edge / 6;
        put(rx + x, ry + y);
      }
  }
  // colour bleeds under transparent texels so mip-mapped edges keep their own colour, not black
  bleedRgba(color, W, W);
  await sharp(color, { raw: { width: W, height: W, channels: 4 } }).png().toFile(path.join(OUT, `${name}_color.png`));
  await sharp(normal, { raw: { width: W, height: W, channels: 3 } }).png().toFile(path.join(OUT, `${name}_normal.png`));
  await sharp(orm, { raw: { width: W, height: W, channels: 3 } }).png().toFile(path.join(OUT, `${name}_orm.png`));
  console.log(`${name}: ${sheet.bands.length} bands, ${Object.keys(sheet.rects).length} ${cards ? "cards" : "stamps"}, ${W} px`);
}

/** Spread colour outwards into fully transparent texels (a few rounds), leaving alpha alone. */
function bleedRgba(rgba, w, h, rounds = 8) {
  let empty = [];
  for (let i = 0; i < w * h; i++) if (rgba[i * 4 + 3] < 8) empty.push(i);
  const filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = rgba[i * 4 + 3] >= 8 ? 1 : 0;
  for (let r = 0; r < rounds && empty.length; r++) {
    const next = [];
    const done = [];
    for (const i of empty) {
      const x = i % w;
      const y = (i - x) / w;
      let n = 0;
      const sum = [0, 0, 0];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!filled[j]) continue;
        for (let k = 0; k < 3; k++) sum[k] += rgba[j * 4 + k];
        n++;
      }
      if (n) {
        for (let k = 0; k < 3; k++) rgba[i * 4 + k] = Math.round(sum[k] / n);
        done.push(i);
      } else next.push(i);
    }
    for (const i of done) filled[i] = 1;
    empty = next;
  }
}

// ---- trim sheets ------------------------------------------------------------------------------------

async function buildTrim(name, sheet) {
  const W = sheet.size;
  const total = sheet.bands.reduce((s, b) => s + b.px, 0);
  if (total !== W) throw new Error(`${name}: bands add up to ${total} px, the sheet is ${W}`);
  const P = await painters(sheet, W);
  // a cut-out sheet (the fence) keeps its coverage in the colour's alpha
  const ch = sheet.cutout ? 4 : 3;
  const color = Buffer.alloc(W * W * ch);
  const normal = Buffer.alloc(W * W * 3);
  const orm = Buffer.alloc(W * W * 3);
  const o = { c: [0, 0, 0], n: [0, 0], orm: [1, 0.7, 0], a: 1 };
  let top = 0;
  for (const band of sheet.bands) {
    const paint = P[band.name];
    if (!paint) throw new Error(`${name}: no painter for band '${band.name}'`);
    for (let y = 0; y < band.px; y++) {
      for (let x = 0; x < W; x++) {
        o.n[0] = o.n[1] = 0;
        o.a = 1;
        paint(x, y, band.px, o);
        const i = ((top + y) * W + x) * 3;
        const ci = ((top + y) * W + x) * ch;
        // (keep base colour inside sRGB 30..240: QUALITY-BAR section 2)
        for (let k = 0; k < 3; k++) color[ci + k] = Math.round(Math.min(240, Math.max(o.orm[2] > 0.5 ? 0 : 30, clamp01(o.c[k]) * 255)));
        if (ch === 4) color[ci + 3] = Math.round(clamp01(o.a) * 255);
        const nx = Math.max(-0.95, Math.min(0.95, o.n[0]));
        const ny = Math.max(-0.95, Math.min(0.95, o.n[1]));
        const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
        normal[i] = Math.round((nx * 0.5 + 0.5) * 255);
        normal[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normal[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        orm[i] = Math.round(clamp01(o.orm[0]) * 255);
        orm[i + 1] = Math.round(clamp01(o.orm[1]) * 255);
        orm[i + 2] = Math.round(clamp01(o.orm[2]) * 255);
      }
    }
    top += band.px;
  }
  const raw = { raw: { width: W, height: W, channels: 3 } };
  if (sheet.prints) await drawPrints(color, W, sheet.prints, ch);
  await sharp(color, { raw: { width: W, height: W, channels: ch } }).png().toFile(path.join(OUT, `${name}_color.png`));
  // (P02f) `halfMaps`: relief and roughness at half the colour's size, for sheets of small things seen
  // from metres away, where they cost download and show no difference
  const side = sheet.halfMaps ? W / 2 : W;
  await sharp(normal, raw).resize(side, side, { kernel: "lanczos3" }).png().toFile(path.join(OUT, `${name}_normal.png`));
  await sharp(orm, raw).resize(side, side, { kernel: "lanczos3" }).png().toFile(path.join(OUT, `${name}_orm.png`));
  console.log(`${name}: ${sheet.bands.length} bands, ${W} px${sheet.halfMaps ? ` (normal and orm ${side} px)` : ""}`);
}

// ---- sign sheet -------------------------------------------------------------------------------------

const FONT = "font-family='Arial, Helvetica, sans-serif'";
const SIGN_GREEN = "#007B3E";

/** SVG bodies of the signs, each drawn in its own w x h box. Wording is generic and correct. */
function signSvg(id, w, h) {
  const text = (x, y, size, body, fill = "#111", weight = 700, anchor = "middle") =>
    `<text x='${x}' y='${y}' font-size='${size}' font-weight='${weight}' fill='${fill}' text-anchor='${anchor}' ${FONT}>${body}</text>`;
  switch (id) {
    case "stop-check": {
      const cx = 120;
      const cy = h / 2;
      const r = 96;
      const pts = Array.from({ length: 8 }, (_, i) => {
        const ang = Math.PI / 8 + (i * Math.PI) / 4;
        return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
      }).join(" ");
      return (
        `<rect width='${w}' height='${h}' fill='#f3f1ea'/><rect x='6' y='6' width='${w - 12}' height='${h - 12}' fill='none' stroke='#b3261e' stroke-width='8'/>` +
        `<polygon points='${pts}' fill='#b3261e' stroke='#fff' stroke-width='6'/>` +
        text(cx, cy + 20, 58, "STOP", "#fff", 800) +
        text(356, 112, 50, "HUMINTO", "#b3261e", 800) +
        text(356, 186, 44, "SECURITY", "#111", 800) +
        text(356, 234, 44, "CHECK", "#111", 800) +
        text(356, 300, 22, "Prepare your ID", "#333", 600) +
        text(356, 332, 22, "Ihanda ang inyong ID", "#333", 600)
      );
    }
    case "rules": {
      const rows = [
        "Log in at the guardhouse",
        "Mag-log in sa guardhouse",
        "Wear your ID at all times",
        "Hard hat, vest and safety",
        "shoes beyond this point",
        "Speed limit 10 kph",
        "No smoking on site",
        "Follow the guard’s instructions",
      ];
      return (
        `<rect width='${w}' height='${h}' fill='#f6f5ef'/><rect width='${w}' height='96' fill='${SIGN_GREEN}'/>` +
        text(w / 2, 46, 34, "VISITORS", "#fff", 800) +
        text(w / 2, 82, 24, "MGA BISITA", "#dff3e7", 700) +
        rows.map((r, i) => text(26, 150 + i * 44, 21, r, "#1b1b1b", i === 1 || i === 4 ? 500 : 700, "start")).join("") +
        `<rect x='6' y='6' width='${w - 12}' height='${h - 12}' fill='none' stroke='${SIGN_GREEN}' stroke-width='6'/>`
      );
    }
    case "wordmark":
      // (the official wordmark is laid over this by buildSigns)
      return `<rect width='${w}' height='${h}' fill='#fbfbf8'/><rect x='4' y='4' width='${w - 8}' height='${h - 8}' fill='none' stroke='${SIGN_GREEN}' stroke-width='5'/>` + text(w / 2, 108, 25, "TUMAUINI HEPP · MAIN CAMP GATE", "#222", 800);
    case "ppe":
      return (
        `<rect width='${w}' height='${h}' fill='#f6f5ef'/><rect width='${w}' height='64' fill='#1f5fae'/>` +
        text(w / 2, 44, 30, "SAFETY FIRST", "#fff", 800) +
        `<circle cx='${w / 2}' cy='128' r='44' fill='#1f5fae'/><path d='M${w / 2 - 28} 136 a28 26 0 0 1 56 0 h8 v10 h-72 v-10 z' fill='#fff'/>` +
        text(w / 2, 204, 22, "PPE REQUIRED", "#111", 800) +
        text(w / 2, 232, 18, "Kailangan ang PPE", "#333", 600)
      );
    case "no-smoking":
      return (
        `<rect width='${w}' height='${h}' fill='#f6f5ef'/>` +
        `<circle cx='${w / 2}' cy='104' r='70' fill='#fff' stroke='#c8261d' stroke-width='14'/>` +
        `<rect x='${w / 2 - 44}' y='96' width='70' height='14' fill='#222'/><rect x='${w / 2 + 28}' y='96' width='14' height='14' fill='#c8261d'/>` +
        `<line x1='${w / 2 - 50}' y1='154' x2='${w / 2 + 50}' y2='54' stroke='#c8261d' stroke-width='14'/>` +
        text(w / 2, 212, 24, "NO SMOKING", "#111", 800) +
        text(w / 2, 240, 19, "BAWAL MANIGARILYO", "#333", 700)
      );
    case "speed-10":
      return `<rect width='${w}' height='${h}' fill='#8f9396'/><circle cx='${w / 2}' cy='${h / 2}' r='116' fill='#fff' stroke='#c8261d' stroke-width='22'/>` + text(w / 2, h / 2 + 30, 110, "10", "#111", 800) + text(w / 2, h / 2 + 72, 26, "KPH", "#111", 800);
    case "logbook":
      return `<rect width='${w}' height='${h}' fill='#27406b'/><rect x='14' y='22' width='${w - 28}' height='60' fill='#f1eee2'/>` + text(w / 2, 50, 18, "VISITOR", "#222", 800) + text(w / 2, 72, 18, "LOGBOOK", "#222", 800);
    case "notice":
      return (
        `<rect width='${w}' height='${h}' fill='#fdfcf6'/>` +
        text(w / 2, 26, 15, "EMERGENCY NUMBERS", "#b3261e", 800) +
        ["Clinic", "Safety office", "Security", "Fire"].map((r, i) => text(14, 52 + i * 20, 13, `${r}  ________`, "#222", 600, "start")).join("")
      );
    case "clock":
      return (
        `<rect width='${w}' height='${h}' fill='#34363a'/><circle cx='64' cy='64' r='56' fill='#f7f6f0' stroke='#222' stroke-width='6'/>` +
        Array.from({ length: 12 }, (_, i) => {
          const ang = (i * Math.PI) / 6;
          return `<line x1='${64 + 44 * Math.sin(ang)}' y1='${64 - 44 * Math.cos(ang)}' x2='${64 + 50 * Math.sin(ang)}' y2='${64 - 50 * Math.cos(ang)}' stroke='#222' stroke-width='3'/>`;
        }).join("") +
        `<line x1='64' y1='64' x2='64' y2='30' stroke='#222' stroke-width='4'/><line x1='64' y1='64' x2='88' y2='74' stroke='#222' stroke-width='5'/>`
      );
    case "hardhat-entry":
      // mandatory-action blue roundel with a hard hat, as Philippine site boards draw it (P02f)
      return (
        `<rect width='${w}' height='${h}' fill='#f6f5ef'/><rect width='${w}' height='58' fill='#1f5fae'/>` +
        text(w / 2, 40, 30, "MANDATORY", "#fff", 800) +
        `<circle cx='84' cy='150' r='62' fill='#1f5fae'/>` +
        `<path d='M44 166 a40 40 0 0 1 80 0 h12 v12 h-104 v-12 z' fill='#fff'/><rect x='80' y='112' width='8' height='30' fill='#1f5fae'/>` +
        text(262, 118, 30, "NO HARD HAT", "#111", 800) +
        text(262, 158, 30, "NO ENTRY", "#b3261e", 800) +
        text(262, 196, 17, "Bawal pumasok nang", "#333", 600) +
        text(262, 218, 17, "walang hard hat", "#333", 600) +
        `<rect x='5' y='5' width='${w - 10}' height='${h - 10}' fill='none' stroke='#1f5fae' stroke-width='5'/>`
      );
    case "report-here":
      return (
        `<rect width='${w}' height='${h}' fill='${SIGN_GREEN}'/><rect x='8' y='8' width='${w - 16}' height='${h - 16}' fill='none' stroke='#fff' stroke-width='4'/>` +
        text(w / 2, 70, 36, "ALL VISITORS", "#fff", 800) +
        text(w / 2, 118, 36, "REPORT HERE", "#fff", 800) +
        text(w / 2, 152, 18, "Mag-ulat po sa guardhouse", "#dff3e7", 600) +
        // (pointing left: the board stands on the right of the approach, the booth is to the left)
        `<path d='M${w / 2 + 70} 196 h-100 v-18 l-40 30 l40 30 v-18 h100 z' fill='#fff'/>`
      );
    case "cctv":
      return (
        `<rect width='${w}' height='${h}' fill='#f2c84b'/><rect x='6' y='6' width='${w - 12}' height='${h - 12}' fill='none' stroke='#111' stroke-width='6'/>` +
        `<rect x='74' y='40' width='92' height='44' rx='6' fill='#111'/><rect x='160' y='50' width='28' height='24' fill='#111'/><rect x='104' y='84' width='12' height='26' fill='#111'/><rect x='84' y='108' width='52' height='8' fill='#111'/>` +
        text(w / 2, 162, 26, "CCTV", "#111", 900) +
        text(w / 2, 192, 15, "IN OPERATION", "#111", 800) +
        text(w / 2, 218, 13, "24 hours", "#222", 700)
      );
    default:
      throw new Error(`no drawing for sign '${id}'`);
  }
}

/** SVG bodies of the dressing kit's printed pieces (P02f). Brands are invented or left out. */
function printSvg(id, w, h) {
  const text = (x, y, size, body, fill = "#111", weight = 700, anchor = "middle", extra = "") =>
    `<text x='${x}' y='${y}' font-size='${size}' font-weight='${weight}' fill='${fill}' text-anchor='${anchor}' ${FONT} ${extra}>${body}</text>`;
  // handwriting stand-in: a wavy pen line of a given length
  const scrawl = (x, y, len, seed, colour = "#1d2a6b") => {
    let d = `M${x} ${y}`;
    for (let i = 1; i <= len / 4; i++) d += ` L${x + i * 4} ${y + Math.sin(i * 1.7 + seed) * 2.2 + Math.sin(i * 0.6 + seed * 3) * 1.2}`;
    return `<path d='${d}' stroke='${colour}' stroke-width='1.4' fill='none'/>`;
  };
  switch (id) {
    case "calendar": {
      let grid = "";
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
        const day = r * 7 + c - 2;
        if (day < 1 || day > 31) continue;
        grid += text(16 + c * 24, 172 + r * 18, 11, String(day), c === 0 ? "#b3261e" : "#222", 600);
      }
      return (
        `<rect width='${w}' height='${h}' fill='#f4f1e6'/>` +
        `<rect x='0' y='0' width='${w}' height='96' fill='#2b6f9e'/><path d='M0 70 Q40 40 80 62 T176 50 V96 H0 Z' fill='#3d8a4f'/><circle cx='138' cy='30' r='14' fill='#f2c84b'/>` +
        text(w / 2, 120, 15, "OKTUBRE", "#b3261e", 800) +
        text(w / 2, 138, 11, "2026", "#333", 700) +
        ["L", "L", "M", "M", "H", "B", "S"].map((d, i) => text(16 + i * 24, 156, 10, d, "#555", 700)).join("") +
        grid +
        `<rect x='118' y='${172 + 2 * 18 - 12}' width='18' height='16' fill='none' stroke='#b3261e' stroke-width='2'/>` +
        text(w / 2, h - 12, 9, "Maligayang Pasko at Manigong Bagong Taon!", "#444", 600)
      );
    }
    case "sack-rice":
      return (
        `<rect width='${w}' height='${h}' fill='#efeee6'/>` +
        `<rect x='0' y='20' width='${w}' height='14' fill='#2e8b3e'/><rect x='0' y='${h - 34}' width='${w}' height='14' fill='#2e8b3e'/>` +
        text(w / 2, 92, 46, "PREMIUM", "#c62f22", 800) +
        text(w / 2, 128, 26, "WELL-MILLED RICE", "#2e8b3e", 800) +
        text(w / 2, 158, 22, "NET WT. 50 KG", "#333", 700)
      );
    case "sack-feed":
      return (
        `<rect width='${w}' height='${h}' fill='#ecebe2'/><rect x='18' y='18' width='${w - 36}' height='${h - 36}' fill='none' stroke='#2457a6' stroke-width='6'/>` +
        text(w / 2, 82, 38, "HOG GROWER", "#2457a6", 800) +
        text(w / 2, 118, 20, "complete feed · pellet", "#2457a6", 600) +
        text(w / 2, 158, 26, "50 KG", "#c62f22", 800)
      );
    case "logbook-open": {
      let lines = "";
      for (let i = 0; i < 9; i++) lines += `<line x1='8' y1='${40 + i * 17}' x2='${w / 2 - 8}' y2='${40 + i * 17}' stroke='#9fb6cf' stroke-width='1'/><line x1='${w / 2 + 8}' y1='${40 + i * 17}' x2='${w - 8}' y2='${40 + i * 17}' stroke='#9fb6cf' stroke-width='1'/>`;
      let ink = "";
      for (let i = 0; i < 7; i++) {
        ink += scrawl(12, 36 + i * 17, 40, i) + scrawl(58, 36 + i * 17, 60, i + 3) + scrawl(124, 36 + i * 17, 18, i + 5);
        if (i < 4) ink += scrawl(w / 2 + 12, 36 + i * 17, 54, i + 7) + scrawl(w / 2 + 72, 36 + i * 17, 60, i + 9);
      }
      return (
        `<rect width='${w}' height='${h}' fill='#f3f0e4'/><rect x='${w / 2 - 2}' y='0' width='4' height='${h}' fill='#c9c3b0'/>` +
        lines +
        text(12, 22, 10, "DATE   NAME / COMPANY   PLATE", "#b3261e", 700, "start") +
        text(w / 2 + 12, 22, 10, "PURPOSE   IN   OUT", "#b3261e", 700, "start") +
        ink
      );
    }
    case "bin-label":
      return `<rect width='${w}' height='${h}' fill='#2e8b3e'/>` + text(w / 2, 56, 30, "NABUBULOK", "#fff", 800) + text(w / 2, 92, 18, "BIODEGRADABLE", "#e6f4ea", 700);
    case "breaker-label":
      return `<rect width='${w}' height='${h}' fill='#f2c84b'/><polygon points='20,74 44,26 68,74' fill='none' stroke='#111' stroke-width='5'/>` + text(44, 68, 26, "!", "#111", 900) + text(110, 46, 16, "MAIN", "#111", 800) + text(110, 70, 14, "230 V", "#111", 700);
    case "pallet-stamp":
      return `<rect width='${w}' height='${h}' fill='none'/><rect x='12' y='14' width='${w - 24}' height='${h - 28}' fill='none' stroke='#2c2a28' stroke-width='5'/>` + text(w / 2, 62, 34, "HT", "#2c2a28", 800);
    case "jerry-label":
      return `<rect width='${w}' height='${h}' fill='#d8a91c'/><rect x='14' y='38' width='${w - 28}' height='60' fill='#c62f22'/>` + text(w / 2, 80, 28, "DIESEL", "#fff", 800);
    case "fan-badge":
      return `<rect width='${w}' height='${h}' fill='#2b2c2e'/><circle cx='22' cy='30' r='14' fill='#3a7bd5'/>` + text(78, 38, 18, "3-SPEED", "#ddd", 700);
    case "radio-face": {
      let holes = "";
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) holes += `<circle cx='${22 + c * 15}' cy='${60 + r * 11}' r='3.2' fill='#111'/>`;
      return `<rect width='${w}' height='${h}' fill='#2a2b2d'/><rect x='14' y='10' width='${w - 28}' height='34' rx='4' fill='#93a37c'/>` + text(w / 2, 34, 16, "CH 03", "#1a2414", 800) + holes;
    }
    case "slipper":
      return (
        `<rect width='${w}' height='${h}' fill='#f0eee8'/>` +
        `<path d='M75 8 C122 8 140 50 136 104 C132 160 118 196 112 230 C106 256 44 256 38 230 C32 196 18 160 14 104 C10 50 28 8 75 8 Z' fill='#2457a6'/>` +
        `<path d='M75 22 C112 22 124 56 121 104 C118 150 104 190 100 222 C96 240 54 240 50 222 C46 190 32 150 29 104 C26 56 38 22 75 22 Z' fill='#3b72c4'/>` +
        `<circle cx='70' cy='56' r='4' fill='#f2f2f2'/>`
      );
    default:
      throw new Error(`no drawing for print '${id}'`);
  }
}

/** Lay the prints over a trim sheet's colour (`ch` channels), sun-faded and grimy like the signs. */
async function drawPrints(color, W, prints, ch) {
  for (const [id, [x, y, w, h]] of Object.entries(prints)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${printSvg(id, w, h)}</svg>`;
    const px = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const s = (yy * w + xx) * 4;
        const a = px[s + 3] / 255;
        if (a <= 0) continue;
        const d = ((y + yy) * W + (x + xx)) * ch;
        const g = 0.9 + 0.12 * fbm(x + xx, y + yy, W, 48, 307, 4);
        const grime = smooth(0.6, 0.85, fbm(x + xx, y + yy, W, 64, 309, 4)) * 0.2;
        for (let k = 0; k < 3; k++) {
          let v = (px[s + k] / 255) * 0.92 + 0.03;
          v = mix(v * g, MUD[k] * 0.8, grime);
          color[d + k] = Math.round(mix(color[d + k], Math.min(240, Math.max(30, v * 255)), a));
        }
      }
  }
}

async function buildSigns(name, sheet) {
  const S = sheet.size;
  const layers = [];
  for (const [id, [x, y, w, h]] of Object.entries(sheet.rects)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${signSvg(id, w, h)}</svg>`;
    layers.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: x, top: y });
    if (id === "wordmark") {
      // the official SCIC wordmark, never redrawn (MASTER-BRIEF section 8)
      const mark = await sharp(path.join(ROOT, "public", "scic-logo-official.png")).resize({ width: 380 }).png().toBuffer();
      layers.push({ input: mark, left: x + Math.round((w - 380) / 2), top: y + 16 });
    }
  }
  const flat = await sharp({ create: { width: S, height: S, channels: 3, background: "#8f9396" } }).composite(layers).removeAlpha().raw().toBuffer();
  // sun-faded and a little grimy, so the boards do not look printed yesterday
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 3;
      const g = 0.9 + 0.12 * fbm(x, y, S, 24, 301, 4);
      const grime = smooth(0.58, 0.85, fbm(x, y, S, 40, 303, 4)) * 0.25;
      for (let k = 0; k < 3; k++) {
        let v = (flat[i + k] / 255) * 0.92 + 0.03;
        v = mix(v * g, MUD[k] * 0.8, grime);
        flat[i + k] = Math.round(Math.min(240, Math.max(30, v * 255)));
      }
    }
  }
  await sharp(flat, { raw: { width: S, height: S, channels: 3 } }).png().toFile(path.join(OUT, `${name}_color.png`));
  console.log(`${name}: ${Object.keys(sheet.rects).length} signs, ${S} px`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, sheet] of Object.entries(SPEC.trims ?? {})) await buildTrim(name, sheet);
for (const [name, sheet] of Object.entries(SPEC.signs ?? {})) await buildSigns(name, sheet);
for (const [name, sheet] of Object.entries(SPEC.decals ?? {})) await buildDecals(name, sheet);
for (const [name, sheet] of Object.entries(SPEC.cards ?? {})) await buildDecals(name, sheet, true);
