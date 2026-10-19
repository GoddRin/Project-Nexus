/**
 * Downloads the files of a Poly Haven model (all CC0) into assets-src/twin/downloads/polyhaven/<id>/,
 * which is git-ignored.
 *
 *   node scripts/twin/fetch-polyhaven-model.mjs <id> <gltf|blend> <1k|2k|4k> [--only=<regex>] [--list]
 *
 * `gltf` fetches the .gltf, its .bin and its textures, ready for Blender's importer. `--only`
 * keeps the files whose name matches (for example the leaf and bark textures of a tree whose mesh
 * is far too heavy to fetch: `blend 2k --only="leaves|trunk"`); with `--only` the main file itself
 * is skipped. `--list` prints names and sizes without downloading.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const [id, format, size, ...flags] = process.argv.slice(2);
if (!id || !/^(gltf|blend)$/.test(format ?? "") || !/^[1248]k$/.test(size ?? "")) {
  console.error("usage: fetch-polyhaven-model.mjs <id> <gltf|blend> <1k|2k|4k> [--only=<regex>] [--list]");
  process.exit(2);
}
const only = flags.find((f) => f.startsWith("--only="))?.slice(7);
const list = flags.includes("--list");
const headers = { "User-Agent": "twin-v2-asset-build/1.0" };
const dir = path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven", id);

const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers })).json();
const main = files?.[format]?.[size]?.[format];
if (!main) {
  console.error(`${id}: no ${format} at ${size}`);
  process.exit(1);
}
const wanted = [];
if (!only) wanted.push([path.basename(new URL(main.url).pathname), main]);
for (const [rel, file] of Object.entries(main.include ?? {})) {
  if (!only || new RegExp(only).test(rel)) wanted.push([rel, file]);
}
for (const [rel, file] of wanted) {
  const target = path.join(dir, rel);
  const mb = (file.size / 1048576).toFixed(1);
  if (list) {
    console.log(`${mb.padStart(7)} MB  ${rel}`);
    continue;
  }
  if (fs.existsSync(target) && fs.statSync(target).size === file.size) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const res = await fetch(file.url, { headers });
  if (!res.ok) {
    console.error(`${rel}: ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  console.log(`${id}  ${rel}  ${mb} MB`);
}
