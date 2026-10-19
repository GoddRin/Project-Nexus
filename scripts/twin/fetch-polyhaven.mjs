/**
 * Downloads Poly Haven texture sets (all CC0) into assets-src/twin/downloads/polyhaven/<id>/, which
 * is git-ignored. Each set is four files: colour, OpenGL normal, AO/roughness/metal ("arm") and
 * displacement, as JPG at the size asked for.
 *
 *   node scripts/twin/fetch-polyhaven.mjs <size: 1k|2k|4k> <id> [<id> ...]
 *
 * A set already on disk is skipped. Every set used in a shipped texture needs a row in
 * public/models/twin/CREDITS.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven");
const MAPS = { diff: "Diffuse", nor_gl: "nor_gl", arm: "arm", disp: "Displacement" };

const [size, ...ids] = process.argv.slice(2);
if (!/^[1248]k$/.test(size ?? "") || ids.length === 0) {
  console.error("usage: fetch-polyhaven.mjs <1k|2k|4k> <id> [<id> ...]");
  process.exit(2);
}
const headers = { "User-Agent": "twin-v2-asset-build/1.0" };

for (const id of ids) {
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  let files = null;
  for (const [short, key] of Object.entries(MAPS)) {
    const target = path.join(dir, `${id}_${short}_${size}.jpg`);
    if (fs.existsSync(target)) continue;
    files ??= await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers })).json();
    const url = files?.[key]?.[size]?.jpg?.url;
    if (!url) {
      console.error(`${id}: no ${key} at ${size} as JPG`);
      process.exitCode = 1;
      continue;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`${id} ${short}: ${res.status}`);
      process.exitCode = 1;
      continue;
    }
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    console.log(`${id} ${short} ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
  }
}
