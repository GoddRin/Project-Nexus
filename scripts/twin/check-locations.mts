/**
 * Reality check for components/twin/data/locations.json against open elevation data.
 *
 *   npx tsx scripts/twin/check-locations.mts
 *
 * Asks two public elevation services (Open-Meteo: Copernicus GLO-90; OpenTopoData: SRTM 30 m) for
 * the ground height at each location origin and anchor, and prints it beside the level on the
 * drawings. Both are surface models at 30 to 90 m spacing over forest in a gorge, so they read
 * 10 to 40 m high at the river; the check is that the pattern is right (weir and tunnel inlet
 * near 300 m, powerhouse lowest, the ridge between them several hundred metres higher).
 * Sends only site coordinates. Needs the network.
 */
import fs from "node:fs";
import { projectGridToLatLon } from "../../lib/twin/grid";

const { locations } = JSON.parse(fs.readFileSync("components/twin/data/locations.json", "utf8"));
const rows: { name: string; lat: number; lon: number; drawn: string }[] = [];
for (const l of locations) {
  rows.push({ name: `${l.id} (origin)`, lat: l.origin.lat, lon: l.origin.lon, drawn: `EL ${l.origin.elevation}` });
  for (const [k, p] of Object.entries(l.anchors as Record<string, { easting: number; northing: number }>)) {
    const ll = projectGridToLatLon(p);
    rows.push({ name: `  ${l.id}.${k}`, lat: ll.lat, lon: ll.lon, drawn: "" });
  }
}
// the middle of Tunnel 1, which passes under the ridge
const t1 = locations.find((l: { id: string }) => l.id === "tunnel1");
const mid = projectGridToLatLon({ easting: (t1.anchors["inlet-portal"].easting + t1.anchors["outlet-portal"].easting) / 2, northing: (t1.anchors["inlet-portal"].northing + t1.anchors["outlet-portal"].northing) / 2 });
rows.push({ name: "tunnel1 midpoint (ridge above)", lat: mid.lat, lon: mid.lon, drawn: "" });

const lats = rows.map((r) => r.lat.toFixed(6)).join(",");
const lons = rows.map((r) => r.lon.toFixed(6)).join(",");
const glo = (await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`)).json()).elevation as number[];
let srtm: (number | null)[] = rows.map(() => null);
try {
  const j = await (await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${rows.map((r) => `${r.lat.toFixed(6)},${r.lon.toFixed(6)}`).join("|")}`)).json();
  srtm = j.results.map((x: { elevation: number }) => x.elevation);
} catch {
  console.log("(OpenTopoData not reachable)");
}
console.log("point".padEnd(38), "lat".padEnd(10), "lon".padEnd(11), "GLO-90", "SRTM30", "drawing");
rows.forEach((r, i) => console.log(r.name.padEnd(38), r.lat.toFixed(6).padEnd(10), r.lon.toFixed(6).padEnd(11), String(glo[i]).padEnd(6), String(srtm[i]).padEnd(6), r.drawn));
