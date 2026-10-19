/**
 * A row of chosen review stills side by side, for a close look at particular moments of the
 * people's clips (stills from scripts/blender/twin/build_gate_people_clips.py, stage "review").
 *
 *   node scripts/twin/people-pick.mjs <out.jpg> guard-point-front-1 engineer-tablet-side-2 ...
 */
import path from "node:path";
import sharp from "sharp";

const [out, ...names] = process.argv.slice(2);
const SRC = path.join(".cache", "twin-people-review");
const COLS = 8;
const tiles = [];
for (const [i, name] of names.entries()) {
  tiles.push({ input: await sharp(path.join(SRC, `${name}.jpg`)).toBuffer(), left: (i % COLS) * 300, top: Math.floor(i / COLS) * 440 });
}
await sharp({ create: { width: Math.min(COLS, names.length) * 300, height: Math.ceil(names.length / COLS) * 440, channels: 3, background: "#333" } })
  .composite(tiles)
  .jpeg({ quality: 86 })
  .toFile(out);
