/**
 * Builds the ground textures the twin's blended ground material reads (components/twin/world/ground.ts)
 * into public/textures/twin/ground/, as KTX2, and writes components/twin/data/ground.json.
 *
 *   node scripts/twin/build-ground-textures.mjs
 *
 * Four layers, each from a Poly Haven set (CC0; fetch with scripts/twin/fetch-polyhaven.mjs), each
 * packed into two textures so the whole ground costs eight samplers and a mask:
 *   <layer>-cr.ktx2   colour (sRGB) with roughness in alpha
 *   <layer>-nh.ktx2   normal x, y in red and green, occlusion in blue, height in alpha
 * and each patch's mask (painted by scripts/blender/twin/gate_ground.py) as <patch>-mask.ktx2:
 * road, mud and leaf litter in red, green and blue (grass is the rest), puddle depth in alpha.
 * The mask's first row is the patch's lowest z and its first column the lowest x.
 *
 * Needs KTX-Software's `ktx` on the PATH. A file whose inputs have not changed is left alone.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven");
const MASKS = path.join(ROOT, "assets-src", "twin", "export", "textures");
const OUT = path.join(ROOT, "public", "textures", "twin", "ground");
const MANIFEST = path.join(ROOT, "components", "twin", "data", "ground.json");
const SIZE = 1024;
const VERSION = 1;

/** id, Poly Haven set, the side of one tile in metres, credit id. */
const LAYERS = [
  { id: "road", set: "red_dirt_mud_01", sizeM: 1.5 },
  { id: "mud", set: "muddy_tracks", sizeM: 2.25 },
  { id: "grass", set: "leafy_grass", sizeM: 2.0 },
  { id: "litter", set: "forest_leaves_03", sizeM: 2.3 },
];
/** A patch's mask, and the layout file (written by the Blender script that painted it) that says where the patch lies. */
const PATCHES = [{ id: "camp-gate", mask: "ground-camp-gate_mask.png", layout: "camp-gate-layout.json" }];

const sha = (...parts) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 10);
};
const ktxBin = process.platform === "win32" && fs.existsSync("C:/Program Files/KTX-Software/bin/ktx.exe") ? "C:/Program Files/KTX-Software/bin/ktx.exe" : "ktx";

function encode(png, target, { srgb, uastc }) {
  const args = ["create", "--format", srgb ? "R8G8B8A8_SRGB" : "R8G8B8A8_UNORM", "--assign-tf", srgb ? "srgb" : "linear", "--generate-mipmap"];
  if (uastc) args.push("--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--zstd", "18");
  else args.push("--encode", "basis-lz", "--qlevel", "170");
  execFileSync(ktxBin, [...args, png, target], { stdio: ["ignore", "ignore", "inherit"] });
}

async function raw(file, channels) {
  let img = sharp(file).resize(SIZE, SIZE, { kernel: "lanczos3" });
  img = channels === 1 ? img.greyscale() : img.removeAlpha();
  return img.raw().toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "twin-ground-"));
const state = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
const manifest = { note: "Written by scripts/twin/build-ground-textures.mjs. Never edit by hand.", layers: [], patches: {} };
let built = 0;

for (const layer of LAYERS) {
  const dir = path.join(SRC, layer.set);
  const files = ["diff", "arm", "nor_gl", "disp"].map((m) => path.join(dir, `${layer.set}_${m}_2k.jpg`));
  for (const f of files) if (!fs.existsSync(f)) throw new Error(`missing ${f}: run node scripts/twin/fetch-polyhaven.mjs 2k ${layer.set}`);
  const key = sha(...files.map((f) => fs.readFileSync(f)), String(SIZE), String(VERSION));
  const cr = path.join(OUT, `${layer.id}-cr.ktx2`);
  const nh = path.join(OUT, `${layer.id}-nh.ktx2`);
  const was = (state.layers ?? []).find((l) => l.id === layer.id);
  if (!(was?.key === key && fs.existsSync(cr) && fs.existsSync(nh))) {
    const [diff, arm, nor, disp] = [await raw(files[0], 3), await raw(files[1], 3), await raw(files[2], 3), await raw(files[3], 1)];
    const a = Buffer.alloc(SIZE * SIZE * 4);
    const b = Buffer.alloc(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE * SIZE; i++) {
      a[i * 4] = diff[i * 3];
      a[i * 4 + 1] = diff[i * 3 + 1];
      a[i * 4 + 2] = diff[i * 3 + 2];
      a[i * 4 + 3] = arm[i * 3 + 1]; // roughness
      b[i * 4] = nor[i * 3];
      b[i * 4 + 1] = nor[i * 3 + 1];
      b[i * 4 + 2] = arm[i * 3]; // occlusion
      b[i * 4 + 3] = disp[i];
    }
    const pa = path.join(tmp, `${layer.id}-cr.png`);
    const pb = path.join(tmp, `${layer.id}-nh.png`);
    await sharp(a, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(pa);
    await sharp(b, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(pb);
    encode(pa, cr, { srgb: true, uastc: false });
    encode(pb, nh, { srgb: false, uastc: true });
    built++;
    console.log(`built  ${layer.id.padEnd(8)} cr ${(fs.statSync(cr).size / 1024).toFixed(0)} KB  nh ${(fs.statSync(nh).size / 1024).toFixed(0)} KB`);
  }
  manifest.layers.push({
    id: layer.id,
    sizeM: layer.sizeM,
    cr: `/textures/twin/ground/${layer.id}-cr.ktx2?v=${sha(fs.readFileSync(cr))}`,
    nh: `/textures/twin/ground/${layer.id}-nh.ktx2?v=${sha(fs.readFileSync(nh))}`,
    credit: `polyhaven.${layer.set}`,
    key,
  });
}

for (const patch of PATCHES) {
  const src = path.join(MASKS, patch.mask);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}: run scripts/blender/twin/gate_ground.py (Ground().write_mask())`);
  const key = sha(fs.readFileSync(src), String(VERSION));
  const target = path.join(OUT, `${patch.id}-mask.ktx2`);
  if (!(state.patches?.[patch.id]?.key === key && fs.existsSync(target))) {
    encode(src, target, { srgb: false, uastc: true });
    built++;
    console.log(`built  ${patch.id} mask ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
  }
  const layout = JSON.parse(fs.readFileSync(path.join(ROOT, "components", "twin", "data", "sources", patch.layout), "utf8")).patch;
  manifest.patches[patch.id] = {
    mask: `/textures/twin/ground/${patch.id}-mask.ktx2?v=${sha(fs.readFileSync(target))}`,
    // the mask covers this square of the location's ground (x, z of its lowest corner, and its side)
    min: [layout.centre[0] - layout.size / 2, layout.centre[2] - layout.size / 2],
    size: layout.size,
    key,
  };
}

fs.rmSync(tmp, { recursive: true, force: true });
const text = JSON.stringify(manifest, null, 1) + "\n";
if (!fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, "utf8") !== text) fs.writeFileSync(MANIFEST, text);
const total = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${built} built; ground textures ${(total / 1048576).toFixed(2)} MB in all`);
