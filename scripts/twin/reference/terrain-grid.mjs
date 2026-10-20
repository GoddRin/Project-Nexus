// Sample Copernicus elevations (Open-Meteo) over the scheme and write a shaded relief PNG.
import fs from "node:fs";
const S = 17.26, N = 17.37, W = 121.90, E = 122.04, STEP = 0.0025; // ~275 m
const lats = [], lons = [];
for (let la = N; la >= S - 1e-9; la -= STEP) lats.push(+la.toFixed(5));
for (let lo = W; lo <= E + 1e-9; lo += STEP) lons.push(+lo.toFixed(5));
const pts = [];
for (const la of lats) for (const lo of lons) pts.push([la, lo]);
const out = [];
for (let i = 0; i < pts.length; i += 100) {
  const b = pts.slice(i, i + 100);
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${b.map(p => p[0]).join(",")}&longitude=${b.map(p => p[1]).join(",")}`;
  for (let t = 0; t < 5; t++) {
    const r = await fetch(url);
    if (r.ok) { out.push(...(await r.json()).elevation); break; }
    await new Promise(r => setTimeout(r, 1500 * (t + 1)));
  }
  await new Promise(r => setTimeout(r, 250));
}
const H = lats.length, Wd = lons.length;
fs.writeFileSync(process.argv[2] + "/grid.json", JSON.stringify({ S, N, W, E, STEP, H, cols: Wd, lats, lons, z: out }));
console.log("rows", H, "cols", Wd, "pts", out.length, "min", Math.min(...out), "max", Math.max(...out));
