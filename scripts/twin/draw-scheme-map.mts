/**
 * Draws the scheme, as derived in P00a, to an SVG for review: the five location origins, the two
 * tunnels, the penstock, the real structures and the traced roads, north up, with a scale bar.
 *
 *   npx tsx scripts/twin/draw-scheme-map.mts [out.svg]
 *
 * Drawn only from components/twin/data/ (positions in the project grid); no company drawing is copied.
 */
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "components", "twin", "data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const { locations } = read("locations.json");
const { real } = read("site-layout.json");
const out = process.argv[2] ?? path.join("docs", "twin-v2", "review", "P00a", "scheme-map.svg");

type P = { easting: number; northing: number };
const all: P[] = [
  ...locations.map((l: { origin: P }) => l.origin),
  ...real.structures.map((s: { grid: P }) => s.grid),
  ...real.roads.flatMap((r: { points: [number, number][] }) => r.points.map(([easting, northing]) => ({ easting, northing }))),
];
const pad = 260;
const minE = Math.min(...all.map((p) => p.easting)) - pad;
const maxE = Math.max(...all.map((p) => p.easting)) + pad;
const minN = Math.min(...all.map((p) => p.northing)) - pad;
const maxN = Math.max(...all.map((p) => p.northing)) + pad;
const W = 1600;
const k = W / (maxE - minE);
const H = Math.round((maxN - minN) * k);
const x = (e: number) => ((e - minE) * k).toFixed(1);
const y = (n: number) => ((maxN - n) * k).toFixed(1);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const loc = (id: string) => locations.find((l: { id: string }) => l.id === id);
const anchor = (id: string, a: string): P => loc(id).anchors[a];
const line = (a: P, b: P, colour: string, width: number, dash = "") => `<line x1="${x(a.easting)}" y1="${y(a.northing)}" x2="${x(b.easting)}" y2="${y(b.northing)}" stroke="${colour}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;

const parts: string[] = [];
parts.push(`<rect width="${W}" height="${H}" fill="#f6f7f4"/>`);
// grid lines every 500 m
for (let e = Math.ceil(minE / 500) * 500; e < maxE; e += 500) parts.push(`<line x1="${x(e)}" y1="0" x2="${x(e)}" y2="${H}" stroke="#d9ddd3" stroke-width="1"/><text x="${x(e)}" y="14" font-size="11" fill="#8a9082" text-anchor="middle">${e} E</text>`);
for (let n = Math.ceil(minN / 500) * 500; n < maxN; n += 500) parts.push(`<line x1="0" y1="${y(n)}" x2="${W}" y2="${y(n)}" stroke="#d9ddd3" stroke-width="1"/><text x="4" y="${Number(y(n)) - 3}" font-size="11" fill="#8a9082">${n} N</text>`);
// roads
for (const r of real.roads as { id: string; title: string; points: [number, number][] }[]) {
  parts.push(`<polyline fill="none" stroke="#b08a3c" stroke-width="2.5" points="${r.points.map(([e, n]) => `${x(e)},${y(n)}`).join(" ")}"/>`);
  const mid = r.points[Math.floor(r.points.length / 2)];
  parts.push(`<text x="${x(mid[0])}" y="${Number(y(mid[1])) + 16}" font-size="12" fill="#7a5f22">${esc(r.title)}</text>`);
}
// water path: tunnel 1, pipe bridge, tunnel 2 (with its bend), penstock
parts.push(line(anchor("tunnel1", "inlet-portal"), anchor("tunnel1", "outlet-portal"), "#1f6fb6", 3, "10 6"));
parts.push(line(anchor("midway", "tunnel1-outlet"), anchor("midway", "tunnel2-inlet"), "#1f6fb6", 5));
parts.push(line(anchor("tunnel2", "inlet-portal"), anchor("tunnel2", "bend"), "#1f6fb6", 3, "10 6"));
parts.push(line(anchor("tunnel2", "bend"), anchor("tunnel2", "outlet-portal"), "#1f6fb6", 3, "10 6"));
parts.push(line(anchor("powerhouse", "tb-02"), anchor("powerhouse", "tb-04"), "#1f6fb6", 5));
// structures
for (const s of real.structures as { id: string; title: string; grid: P; errorM: number }[]) {
  parts.push(`<circle cx="${x(s.grid.easting)}" cy="${y(s.grid.northing)}" r="${Math.max(3, s.errorM * k).toFixed(1)}" fill="#007B3E" fill-opacity="0.18" stroke="#007B3E" stroke-width="1"/>`);
  parts.push(`<circle cx="${x(s.grid.easting)}" cy="${y(s.grid.northing)}" r="2.5" fill="#007B3E"/>`);
}
// location origins and labels
for (const l of locations as { id: string; title: string; origin: P & { lat: number; lon: number; elevation: number; errorM: number } }[]) {
  const cx = Number(x(l.origin.easting));
  const cy = Number(y(l.origin.northing));
  const left = l.id === "tunnel2" || l.id === "tunnel1" || l.id === "weir";
  parts.push(`<path d="M${cx - 8},${cy} L${cx + 8},${cy} M${cx},${cy - 8} L${cx},${cy + 8}" stroke="#c0392b" stroke-width="2"/>`);
  const tx = left ? cx - 14 : cx + 14;
  const ty = l.id === "midway" ? cy - 34 : l.id === "weir" ? cy - 34 : l.id === "tunnel1" ? cy + 34 : cy + (l.id === "powerhouse" ? 22 : -8);
  parts.push(`<text x="${tx}" y="${ty}" font-size="15" font-weight="700" fill="#1c241b" text-anchor="${left ? "end" : "start"}">${esc(l.id)}: ${esc(l.title)}</text>`);
  parts.push(`<text x="${tx}" y="${ty + 16}" font-size="12" fill="#465044" text-anchor="${left ? "end" : "start"}">${l.origin.lat.toFixed(5)} N, ${l.origin.lon.toFixed(5)} E, EL ${l.origin.elevation} m, origin good to ${l.origin.errorM} m</text>`);
}
// scale bar and north arrow
const sx = 40;
const sy = H - 40;
parts.push(`<line x1="${sx}" y1="${sy}" x2="${sx + 500 * k}" y2="${sy}" stroke="#1c241b" stroke-width="3"/><text x="${sx}" y="${sy - 8}" font-size="13" fill="#1c241b">500 m</text>`);
parts.push(`<path d="M${W - 50},${H - 30} L${W - 50},${H - 90} M${W - 58},${H - 76} L${W - 50},${H - 92} L${W - 42},${H - 76}" stroke="#1c241b" stroke-width="2.5" fill="none"/><text x="${W - 50}" y="${H - 98}" font-size="14" font-weight="700" text-anchor="middle" fill="#1c241b">N</text>`);
parts.push(`<text x="${W / 2}" y="${H - 14}" font-size="12" fill="#465044" text-anchor="middle">Upper Tumauini HEPP scheme as derived in P00a. Grid: PRS92 Zone III. Red cross: location origin. Green dot: structure, with its position error as a circle. Blue: water path (dashed in tunnel). Brown: access roads traced from the 2023 site development plan.</text>`);

fs.writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">\n${parts.join("\n")}\n</svg>\n`);
console.log("wrote", out, `${W}x${H}`);
