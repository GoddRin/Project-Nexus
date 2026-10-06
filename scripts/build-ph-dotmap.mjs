/**
 * Builds the dot-matrix map of the Philippines used on Nexus Home (public/data/ph-dotmap.json).
 *
 *   node scripts/build-ph-dotmap.mjs
 *
 * Source: Natural Earth, 1:10m Admin 0 Countries (public domain), read from the project's
 * GitHub mirror. The country outline is sampled on a regular grid; a cell is land when its
 * centre, or any of four points around the centre, falls inside the outline (the extra points
 * keep small islands such as Batanes and Tawi-Tawi). The output holds only grid positions, so
 * the page can draw the map with no map library.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "ph-dotmap.json");

/** Grid step in degrees of latitude (longitude is stepped so that cells are square on the ground at mid-latitude) */
const STEP = 0.125;
const BOUNDS = { west: 116.7, east: 127.0, south: 4.4, north: 21.3 };
const MID_LAT = (BOUNDS.south + BOUNDS.north) / 2;
const LON_STEP = STEP / Math.cos((MID_LAT * Math.PI) / 180);

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Natural Earth could not be read: ${res.status}`);
const world = await res.json();
const ph = world.features.find((f) => f.properties.ADM0_A3 === "PHL");
if (!ph) throw new Error("The Philippines was not found in the source file");
const polygons = (ph.geometry.type === "Polygon" ? [ph.geometry.coordinates] : ph.geometry.coordinates).map((rings) => {
  const xs = rings[0].map((p) => p[0]);
  const ys = rings[0].map((p) => p[1]);
  return { rings, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
});

function isLand(x, y) {
  for (const { rings, box } of polygons) {
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
    if (inRing(x, y, rings[0]) && !rings.slice(1).some((hole) => inRing(x, y, hole))) return true;
  }
  return false;
}

const cols = Math.ceil((BOUNDS.east - BOUNDS.west) / LON_STEP);
const rows = Math.ceil((BOUNDS.north - BOUNDS.south) / STEP);
const dots = [];
for (let r = 0; r < rows; r++) {
  const lat = BOUNDS.north - (r + 0.5) * STEP;
  for (let c = 0; c < cols; c++) {
    const lon = BOUNDS.west + (c + 0.5) * LON_STEP;
    const dx = LON_STEP * 0.3;
    const dy = STEP * 0.3;
    if (isLand(lon, lat) || isLand(lon - dx, lat - dy) || isLand(lon + dx, lat - dy) || isLand(lon - dx, lat + dy) || isLand(lon + dx, lat + dy)) dots.push([c, r]);
  }
}

const out = {
  source: "Natural Earth 1:10m Admin 0 Countries (public domain)",
  bounds: BOUNDS,
  latStep: STEP,
  lonStep: Number(LON_STEP.toFixed(6)),
  cols,
  rows,
  dots,
};
await writeFile(OUT, JSON.stringify(out));
console.log(`${dots.length} land cells on a ${cols} x ${rows} grid -> ${path.relative(process.cwd(), OUT)}`);
