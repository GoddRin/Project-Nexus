/**
 * Size against quality for one texture of an exported asset, encoded several ways (P02c).
 * Takes a texture slot out of assets-src/twin/export/<id>.glb, encodes it with KTX-Software's
 * `ktx create` in each trial setting, decodes it back, and reports bytes and error against the
 * source: for normal maps the mean and 99th-percentile angle between source and result normals,
 * for colour the PSNR.
 *
 *   node scripts/twin/texture-trial.mjs <asset id> <slot: normal|color> [--out=.cache/texture-trial]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [id, slot = "normal"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const OUT = (process.argv.find((a) => a.startsWith("--out=")) ?? "--out=.cache/texture-trial").slice(6);
const dir = path.join(OUT, `${id}-${slot}`);
fs.mkdirSync(dir, { recursive: true });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const root = (await io.read(path.join("assets-src", "twin", "export", `${id}.glb`))).getRoot();
const material = root.listMaterials().find((m) => (slot === "normal" ? m.getNormalTexture() : m.getBaseColorTexture()));
const texture = slot === "normal" ? material.getNormalTexture() : material.getBaseColorTexture();
const normal = slot === "normal";

async function rgba(input, size) {
  return sharp(input).resize(size, size, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
}

const TRIALS = [
  { name: "uastc-rdo1-2k (as built)", size: 2048, args: ["--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--uastc-rdo-l", "1", "--zstd", "18"] },
  { name: "uastc-rdo4-2k", size: 2048, args: ["--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--uastc-rdo-l", "4", "--zstd", "18"] },
  { name: "uastc-rdo1-1k", size: 1024, args: ["--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--uastc-rdo-l", "1", "--zstd", "18"] },
  { name: "etc1s-q255-2k", size: 2048, args: ["--encode", "basis-lz", "--qlevel", "255", ...(normal ? ["--normal-mode"] : [])] },
  { name: "etc1s-q255-1k", size: 1024, args: ["--encode", "basis-lz", "--qlevel", "255", ...(normal ? ["--normal-mode"] : [])] },
];

const source = Buffer.from(texture.getImage());
const rows = [];
for (const trial of TRIALS) {
  const tag = trial.name.split(" ")[0];
  const png = path.join(dir, `${tag}-src.png`);
  await sharp(source).resize(trial.size, trial.size, { kernel: "lanczos3" }).ensureAlpha().png().toFile(png);
  const ktx2 = path.join(dir, `${tag}.ktx2`);
  execFileSync("ktx", ["create", "--format", normal ? "R8G8B8A8_UNORM" : "R8G8B8A8_SRGB", "--assign-tf", normal ? "linear" : "srgb", ...trial.args, png, ktx2], { stdio: "pipe" });
  const back = path.join(dir, `${tag}-back.png`);
  execFileSync("ktx", ["extract", "--transcode", "rgba8", ktx2, back], { stdio: "pipe" });
  // compared at 2K: a 1K map is judged by what it loses against the full map
  const a = await rgba(source, 2048);
  const b = await rgba(back, 2048);
  let errors = [];
  let mse = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (normal) {
      const v = (buf) => {
        const x = buf[i] / 127.5 - 1;
        const y = buf[i + 1] / 127.5 - 1;
        // Z is rebuilt from X and Y, as the shader does for a two-channel map (ETC1S normal mode returns X, Y in red and green)
        const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
        return [x, y, z];
      };
      const p = v(a);
      const q = v(b);
      const dot = Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
      errors.push((Math.acos(dot) * 180) / Math.PI);
    } else {
      for (let c = 0; c < 3; c++) mse += (a[i + c] - b[i + c]) ** 2;
    }
  }
  const bytes = fs.statSync(ktx2).size;
  let quality;
  if (normal) {
    errors.sort((x, y) => x - y);
    quality = `mean ${(errors.reduce((s, e) => s + e, 0) / errors.length).toFixed(2)} deg, p99 ${errors[Math.floor(errors.length * 0.99)].toFixed(2)} deg`;
  } else {
    mse /= (a.length / 4) * 3;
    quality = `PSNR ${(10 * Math.log10((255 * 255) / mse)).toFixed(1)} dB`;
  }
  rows.push({ trial: trial.name, kb: Math.round(bytes / 1024), quality });
  console.log(`${trial.name.padEnd(26)} ${String(Math.round(bytes / 1024)).padStart(5)} KB  ${quality}`);
}
fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify({ id, slot, rows }, null, 1));
