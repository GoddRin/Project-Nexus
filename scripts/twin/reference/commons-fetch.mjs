/**
 * Fetches freely licensed reference photographs from Wikimedia Commons, scaled down, and prints the
 * rows for a reference index (title, author, licence, source page).
 *
 *   node scripts/twin/reference/commons-fetch.mjs <out dir> <width> "<name>=File:Title.jpg" ...
 *
 * References are for comparison only (docs/twin-v2/QUALITY-BAR.md section 8): never use one as a
 * texture unless its licence allows it and it has a row in public/models/twin/CREDITS.md.
 */
import fs from "node:fs";
import path from "node:path";

const [outDir, width, ...wanted] = process.argv.slice(2);
if (!outDir || !width || wanted.length === 0) {
  console.error('usage: commons-fetch.mjs <out dir> <width> "<name>=File:Title.jpg" ...');
  process.exit(2);
}
const headers = { "User-Agent": "twin-v2-reference/1.0 (reference photo index)" };
const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.mkdirSync(outDir, { recursive: true });

for (const item of wanted) {
  const [name, title] = item.split(/=(.*)/s);
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({ action: "query", format: "json", titles: title, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: width }).toString();
  await pause(3000); // (the API refuses bursts)
  let json = null;
  for (let attempt = 0; attempt < 4 && !json; attempt++) {
    const text = await (await fetch(api, { headers })).text();
    try {
      json = JSON.parse(text);
    } catch {
      await pause(20000);
    }
  }
  const info = Object.values(json?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info) {
    console.error(`not found: ${title}`);
    process.exitCode = 1;
    continue;
  }
  const res = await fetch(info.thumburl, { headers });
  if (!res.ok) {
    console.error(`${title}: ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const file = `${name}.jpg`;
  fs.writeFileSync(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
  const meta = info.extmetadata ?? {};
  console.log(`| \`${file}\` | ${strip(meta.ImageDescription?.value).slice(0, 110)} | ${strip(meta.Artist?.value).slice(0, 60)} | ${strip(meta.LicenseShortName?.value)} | ${info.descriptionurl} |`);
}
