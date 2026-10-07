/**
 * Full-size photographs for the Nexus Home hero.
 *
 *   node scripts/fetch-hero-images.mjs            # fetch the originals and list their sizes
 *   node scripts/fetch-hero-images.mjs --build    # also write public/hero/<name>.jpg for the chosen ones
 *
 * The Atlas photographs (scripts/fetch-project-images.mjs) are the 768 px renditions the
 * company's website shows in its pages. The same uploads exist on that site at full size (the
 * address without the "-768x576" ending). This script reads the file list from that script,
 * fetches each original from staclara.com.ph into .cache/hero-src (not committed), and reports
 * its dimensions. With --build, the ones named in CHOSEN are written at up to 2400 px wide for
 * the hero. Nothing is taken from any other site.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const UP = "https://staclara.com.ph/wp-content/uploads/";
const SRC = path.join(process.cwd(), ".cache", "hero-src");
const OUT = path.join(process.cwd(), "public", "hero");
fs.mkdirSync(SRC, { recursive: true });

/** hero file name -> the original under wp-content/uploads (filled in after looking at the photographs) */
const CHOSEN = JSON.parse(fs.existsSync(path.join(process.cwd(), "scripts", "hero-images.json")) ? fs.readFileSync(path.join(process.cwd(), "scripts", "hero-images.json"), "utf8") : "{}");

// every upload named in the Atlas script, with the rendition ending removed
const listing = fs.readFileSync(path.join(process.cwd(), "scripts", "fetch-project-images.mjs"), "utf8");
const files = [...new Set([...listing.matchAll(/"(20\d\d\/\d\d\/[^"]+\.(?:jpe?g|png))"/gi)].map((m) => m[1].replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, "$1")))];

const probe = (file) => {
  try {
    return execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const rows = [];
for (const rel of files) {
  const local = path.join(SRC, rel.replace(/\//g, "_"));
  if (!fs.existsSync(local)) {
    const res = await fetch(UP + rel, { headers: { "User-Agent": "ProjectNexus/1.0 (Sta. Clara International Corporation internal portal)" } });
    if (!res.ok) {
      rows.push({ rel, size: `HTTP ${res.status}` });
      continue;
    }
    fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
  }
  rows.push({ rel, size: probe(local), kb: Math.round(fs.statSync(local).size / 1024) });
}
fs.writeFileSync(path.join(SRC, "sizes.json"), JSON.stringify(rows, null, 1));
const big = rows.filter((r) => Number(String(r.size).split(",")[0]) >= 1600);
console.log(`${rows.length} originals read; ${big.length} are 1600 px wide or more`);

if (process.argv.includes("--build")) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, rel] of Object.entries(CHOSEN)) {
    const local = path.join(SRC, rel.replace(/\//g, "_"));
    const dest = path.join(OUT, `${name}.jpg`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", local, "-vf", "scale='min(2400,iw)':-2:flags=lanczos", "-q:v", "3", dest]);
    console.log(`${name}.jpg  ${probe(dest)}  ${Math.round(fs.statSync(dest).size / 1024)} KB`);
  }
}
