/**
 * Prepares the plant textures of the camp gate slice (P02a) in assets-src/twin/export/textures/:
 *
 *   flora-acacia-leaves_{color,normal,orm}.png   three frond sprays with their cut-out in alpha
 *   flora-acacia-bark_{color,normal,orm}.png     tiling bark
 *   flora-banana_{color,normal,orm}.png          a banana leaf blade and a strip of pseudostem (painted here)
 *
 * The frond sheet and the bark are Poly Haven's Jacaranda Tree textures (CC0; fetched with
 * scripts/twin/fetch-polyhaven-model.mjs). Only the textures are used: the model's mesh is about
 * 200 MB, so the trees' own lean geometry is built in scripts/blender/twin/build_gate_flora.py.
 *
 *   node scripts/twin/build-flora-textures.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven");
const OUT = path.join(ROOT, "assets-src", "twin", "export", "textures");
fs.mkdirSync(OUT, { recursive: true });

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
function noise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), mix(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
}
const fbm = (x, y, seed) => noise(x, y, seed) * 0.5 + noise(x * 2, y * 2, seed + 1) * 0.25 + noise(x * 4, y * 4, seed + 2) * 0.15 + noise(x * 8, y * 8, seed + 3) * 0.1;

/**
 * Spread the colour of the cut-out outwards into the transparent area, so that scaled-down copies
 * of the texture do not pick up a dark fringe round every leaf.
 */
function bleed(rgba, w, h, rounds = 24) {
  const filled = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) filled[i] = rgba[i * 4 + 3] > 24 ? 1 : 0;
  let frontier = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!filled[y * w + x]) frontier.push(y * w + x);
  for (let r = 0; r < rounds && frontier.length; r++) {
    const next = [];
    const done = [];
    for (const i of frontier) {
      const x = i % w;
      const y = (i - x) / w;
      let n = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (!filled[j]) continue;
          n++;
          cr += rgba[j * 4];
          cg += rgba[j * 4 + 1];
          cb += rgba[j * 4 + 2];
        }
      }
      if (n === 0) {
        next.push(i);
        continue;
      }
      rgba[i * 4] = cr / n;
      rgba[i * 4 + 1] = cg / n;
      rgba[i * 4 + 2] = cb / n;
      done.push(i);
    }
    for (const i of done) filled[i] = 1;
    frontier = next;
  }
  // whatever was never reached takes a mid leaf green rather than black
  for (const i of frontier) {
    rgba[i * 4] = 70;
    rgba[i * 4 + 1] = 92;
    rgba[i * 4 + 2] = 40;
  }
}

async function acacia() {
  const dir = path.join(SRC, "jacaranda_tree", "textures");
  const size = 2048;
  const colour = await sharp(path.join(dir, "jacaranda_tree_leaves_diff_2k.png")).removeAlpha().resize(size, size).raw().toBuffer();
  const alpha = await sharp(path.join(dir, "jacaranda_tree_leaves_alpha_2k.png")).removeAlpha().resize(size, size).greyscale().raw().toBuffer();
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = colour[i * 3];
    rgba[i * 4 + 1] = colour[i * 3 + 1];
    rgba[i * 4 + 2] = colour[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  bleed(rgba, size, size);
  await sharp(rgba, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(OUT, "flora-acacia-leaves_color.png"));
  await sharp(path.join(dir, "jacaranda_tree_leaves_nor_gl_1k.jpg")).png().toFile(path.join(OUT, "flora-acacia-leaves_normal.png"));
  await sharp(path.join(dir, "jacaranda_tree_leaves_arm_1k.jpg")).png().toFile(path.join(OUT, "flora-acacia-leaves_orm.png"));
  await sharp(path.join(dir, "jacaranda_tree_trunk_diff_1k.jpg")).png().toFile(path.join(OUT, "flora-acacia-bark_color.png"));
  await sharp(path.join(dir, "jacaranda_tree_trunk_nor_gl_1k.jpg")).png().toFile(path.join(OUT, "flora-acacia-bark_normal.png"));
  await sharp(path.join(dir, "jacaranda_tree_trunk_arm_1k.jpg")).png().toFile(path.join(OUT, "flora-acacia-bark_orm.png"));
  console.log("flora-acacia: leaves 2048 px with alpha, bark 1024 px");
}

/**
 * Banana: the left 640 px of the sheet is one leaf blade, base at the bottom, torn along the veins
 * as wind tears them; the right strip is pseudostem, tiling up and down.
 */
async function banana() {
  const S = 1024;
  const LEAF_W = 640;
  const rgba = Buffer.alloc(S * S * 4);
  const normal = Buffer.alloc(S * S * 3);
  const orm = Buffer.alloc(S * S * 3);
  // tears: (t along the blade, side, depth as a share of the half width)
  const tears = [];
  for (let i = 0; i < 30; i++) tears.push([0.12 + hash(i, 1, 5) * 0.82, hash(i, 2, 5) < 0.5 ? -1 : 1, 0.25 + hash(i, 3, 5) * 0.7, 0.004 + hash(i, 4, 5) * 0.012]);
  for (let y = 0; y < S; y++) {
    const t = 1 - (y + 0.5) / S; // 0 at the base of the blade, 1 at the tip
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let r;
      let g;
      let b;
      let a = 255;
      let nx = 0;
      let ny = 0;
      let rough = 0.5;
      if (x < LEAF_W) {
        const u = (x + 0.5 - LEAF_W / 2) / (LEAF_W / 2); // -1..1 across the blade
        // outline: a long paddle, widest two fifths of the way up, blunt at the tip, narrowing to the stalk
        const half = Math.pow(Math.sin(Math.PI * Math.pow(clamp01((t - 0.03) / 0.965), 0.62)), 0.55) * 0.93;
        const stalk = t < 0.08 ? 0.07 : 0;
        const inside = Math.abs(u) < Math.max(half, stalk) && t > 0.004 && t < 0.995;
        // the veins leave the midrib at a slight angle towards the tip
        const along = t + Math.abs(u) * 0.085;
        let torn = false;
        for (const [tt, side, depth, width] of tears) {
          if (Math.sign(u) !== side) continue;
          const open = width * smooth(1 - depth, 1, Math.abs(u) / Math.max(half, 1e-3)) * 1.6;
          if (Math.abs(along - (tt + 0.085 * 0)) < open && Math.abs(u) > half * (1 - depth)) torn = true;
        }
        a = inside && !torn ? 255 : 0;
        const vein = 0.5 + 0.5 * Math.sin(along * 620);
        const coarse = 0.5 + 0.5 * Math.sin(along * 74 + fbm(x / 90, y / 90, 9) * 3);
        const shade = fbm(x / 140, y / 140, 11);
        const rib = Math.exp(-((u / 0.035) ** 2));
        const edge = smooth(0.78, 1, Math.abs(u) / Math.max(half, 1e-3));
        const dry = smooth(0.62, 0.9, fbm(x / 60, y / 60, 13)) * edge;
        r = 0.2 + 0.05 * vein + 0.07 * coarse + 0.1 * shade;
        g = 0.4 + 0.06 * vein + 0.08 * coarse + 0.14 * shade;
        b = 0.1 + 0.02 * vein + 0.05 * shade;
        r = mix(r, 0.62, rib * 0.85);
        g = mix(g, 0.72, rib * 0.85);
        b = mix(b, 0.34, rib * 0.85);
        r = mix(r, 0.55, dry);
        g = mix(g, 0.43, dry);
        b = mix(b, 0.2, dry);
        nx = Math.sign(u) * 0.12 + rib * -Math.sign(u) * 0.5;
        ny = Math.cos(along * 620) * 0.22;
        rough = mix(0.42, 0.8, dry);
      } else {
        // pseudostem: overlapping sheaths, green above, brown and papery at the foot
        const u = (x - LEAF_W) / (S - LEAF_W);
        const fibre = fbm(x / 6, y / 220, 21);
        const patch = fbm(x / 70, y / 160, 23);
        const brown = smooth(0.35, 0.75, patch + (y / S - 0.5) * 0.5);
        r = mix(0.33, 0.42, fibre);
        g = mix(0.5, 0.36, fibre * 0.6);
        b = mix(0.16, 0.2, fibre);
        r = mix(r, 0.36 + 0.1 * fibre, brown * 0.6);
        g = mix(g, 0.3 + 0.08 * fibre, brown * 0.6);
        b = mix(b, 0.16, brown * 0.6);
        nx = (fibre - 0.5) * 0.7;
        rough = mix(0.55, 0.85, brown);
        void u;
      }
      rgba[i * 4] = Math.round(clamp01(r) * 255);
      rgba[i * 4 + 1] = Math.round(clamp01(g) * 255);
      rgba[i * 4 + 2] = Math.round(clamp01(b) * 255);
      rgba[i * 4 + 3] = a;
      const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
      normal[i * 3] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[i * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[i * 3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      orm[i * 3] = 255;
      orm[i * 3 + 1] = Math.round(rough * 255);
      orm[i * 3 + 2] = 0;
    }
  }
  bleed(rgba, S, S, 12);
  await sharp(rgba, { raw: { width: S, height: S, channels: 4 } }).png().toFile(path.join(OUT, "flora-banana_color.png"));
  await sharp(normal, { raw: { width: S, height: S, channels: 3 } }).png().toFile(path.join(OUT, "flora-banana_normal.png"));
  await sharp(orm, { raw: { width: S, height: S, channels: 3 } }).png().toFile(path.join(OUT, "flora-banana_orm.png"));
  console.log("flora-banana: 1024 px");
}

/** Poly Haven's grass tufts are cards: their colour and cut-out arrive as two files and are joined here. */
async function grass() {
  const dir = path.join(SRC, "grass_medium_01", "textures");
  const size = 1024;
  const colour = await sharp(path.join(dir, "grass_medium_01_diff_2k.jpg")).removeAlpha().resize(size, size).raw().toBuffer();
  const alpha = await sharp(path.join(dir, "grass_medium_01_alpha_2k.png")).removeAlpha().resize(size, size).greyscale().raw().toBuffer();
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = colour[i * 3];
    rgba[i * 4 + 1] = colour[i * 3 + 1];
    rgba[i * 4 + 2] = colour[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  bleed(rgba, size, size);
  await sharp(rgba, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(OUT, "flora-grass_color.png"));
  console.log("flora-grass: 1024 px with alpha");
}

await acacia();
await banana();
await grass();
