/**
 * Contact sheets of the people's clips (P02b's poke-through test): one sheet per person, one row
 * per clip, the front views then the side views, from the stills that
 * scripts/blender/twin/build_gate_people_clips.py (stage "review") renders into .cache/twin-people-review/.
 *
 *   node scripts/twin/people-sheets.mjs [--out=docs/twin-v2/review/P02b] [--who=guard,engineer,labourer]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const SRC = path.join(".cache", "twin-people-review");
const OUT = arg("out", path.join("docs", "twin-v2", "review", "P02b"));
const WHO = arg("who", "guard,engineer,labourer").split(",");
const W = 150;
const H = 220;
const LABEL = 96;

for (const who of WHO) {
  const files = fs.readdirSync(SRC).filter((f) => f.startsWith(`${who}-`) && f.endsWith(".jpg"));
  const clips = [...new Set(files.map((f) => f.split("-")[1]))].sort();
  if (!clips.length) continue;
  const shots = Math.max(...files.map((f) => Number(f.split("-")[3].replace(".jpg", "")))) + 1;
  const composite = [];
  for (const [row, clip] of clips.entries()) {
    const text = Buffer.from(`<svg width="${LABEL}" height="${H}"><rect width="${LABEL}" height="${H}" fill="#2a2c2e"/><text x="6" y="${H / 2}" font-size="13" fill="#fff" font-family="Arial">${clip}</text></svg>`);
    composite.push({ input: text, left: 0, top: row * H });
    let col = 0;
    for (const view of ["front", "side"]) {
      for (let i = 0; i < shots; i++) {
        const file = path.join(SRC, `${who}-${clip}-${view}-${i}.jpg`);
        if (fs.existsSync(file)) composite.push({ input: await sharp(file).resize(W, H).toBuffer(), left: LABEL + col * W, top: row * H });
        col++;
      }
    }
  }
  const out = path.join(OUT, `sheet-${who}.jpg`);
  await sharp({ create: { width: LABEL + shots * 2 * W, height: clips.length * H, channels: 3, background: "#2a2c2e" } })
    .composite(composite)
    .jpeg({ quality: 84 })
    .toFile(out);
  console.log(out, clips.length, "clips");
}
