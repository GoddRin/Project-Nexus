/**
 * Unit check for lib/twin/terrain.ts: the ported sampler must return v1's heights.
 *
 *   npx tsx scripts/twin/check-terrain.mts
 *
 * Compares against components/digital-twin/terrainData.ts at 20 named points (yards, pads, the
 * blended slopes around them, raw hillside, the scene edge) and 2,000 seeded random points.
 * Fails (exit 1) if any height differs by more than 1 cm.
 */
import gisTerrain from "../../public/data/gis-terrain-mesh.json";
import { sampleTerrainY } from "../../components/digital-twin/terrainData";
import { createV1TerrainSampler } from "../../lib/twin/terrain";

const sampler = createV1TerrainSampler(gisTerrain as { positions: number[]; gridSize?: number });

const POINTS: [string, number, number][] = [
  ["powerhouse origin", 0, 0],
  ["switchyard", 25, 0],
  ["yard corner", 44, 18],
  ["yard blend, east", 55, 5],
  ["yard blend, north", -10, -35],
  ["tailrace channel", 0, 25],
  ["tailrace edge", 12, 5.5],
  ["river bank", -40, 40],
  ["surge tank", -6, -26],
  ["penstock mid", -5, -16],
  ["road, lower slope", 58, -28],
  ["road, mid mountain", 68, -38],
  ["camp gate ramp", 92, -67.5],
  ["camp pad centre", 118, -95],
  ["camp pad edge", 74, -74],
  ["camp blend, west", 60, -100],
  ["camp blend, north", 130, -160],
  ["raw hillside", -100, -120],
  ["scene corner", 180, 180],
  ["outside the mesh (clamped)", -200, 10],
];

let seed = 20261009;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let i = 0; i < 2000; i++) POINTS.push([`random ${i}`, rand() * 360 - 180, rand() * 360 - 180]);

let worst = 0;
let failed = 0;
POINTS.forEach(([name, x, z], i) => {
  const a = sampleTerrainY(x, z);
  const b = sampler.sampleY(x, z);
  const diff = Math.abs(a - b);
  worst = Math.max(worst, diff);
  if (diff > 0.01) failed++;
  if (i < 20) console.log(`${diff > 0.01 ? "FAIL" : "ok  "} ${name.padEnd(28)} (${x}, ${z})  v1 ${a.toFixed(4)}  v2 ${b.toFixed(4)}`);
});
console.log(`\n${POINTS.length} points, worst difference ${(worst * 1000).toFixed(4)} mm, ${failed} over 1 cm`);
process.exit(failed ? 1 : 0);
