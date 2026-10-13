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
  const t2 = [0, 0, 0];

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

  return P;
}

// ---- trim sheets ------------------------------------------------------------------------------------

async function buildTrim(name, sheet) {
  const W = sheet.size;
  const total = sheet.bands.reduce((s, b) => s + b.px, 0);
  if (total !== W) throw new Error(`${name}: bands add up to ${total} px, the sheet is ${W}`);
  const P = await painters(sheet, W);
  const color = Buffer.alloc(W * W * 3);
  const normal = Buffer.alloc(W * W * 3);
  const orm = Buffer.alloc(W * W * 3);
  const o = { c: [0, 0, 0], n: [0, 0], orm: [1, 0.7, 0] };
  let top = 0;
  for (const band of sheet.bands) {
    const paint = P[band.name];
    if (!paint) throw new Error(`${name}: no painter for band '${band.name}'`);
    for (let y = 0; y < band.px; y++) {
      for (let x = 0; x < W; x++) {
        o.n[0] = o.n[1] = 0;
        paint(x, y, band.px, o);
        const i = ((top + y) * W + x) * 3;
        // (keep base colour inside sRGB 30..240: QUALITY-BAR section 2)
        for (let k = 0; k < 3; k++) color[i + k] = Math.round(Math.min(240, Math.max(o.orm[2] > 0.5 ? 0 : 30, clamp01(o.c[k]) * 255)));
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
  await sharp(color, raw).png().toFile(path.join(OUT, `${name}_color.png`));
  await sharp(normal, raw).png().toFile(path.join(OUT, `${name}_normal.png`));
  await sharp(orm, raw).png().toFile(path.join(OUT, `${name}_orm.png`));
  console.log(`${name}: ${sheet.bands.length} bands, ${W} px`);
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
    default:
      throw new Error(`no drawing for sign '${id}'`);
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
