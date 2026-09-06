const fs = require('fs');
const terrain = JSON.parse(fs.readFileSync('public/data/gis-terrain-mesh.json', 'utf8'));

const SCENE_HALF = 180.0;
const gridSize = terrain.gridSize || 65;
const positions = terrain.positions;

function sampleTerrainY(x, z) {
  const xFrac = (x + SCENE_HALF) / (SCENE_HALF * 2);
  const zFrac = (z + SCENE_HALF) / (SCENE_HALF * 2);

  const col = xFrac * (gridSize - 1);
  const row = zFrac * (gridSize - 1);

  const c0 = Math.max(0, Math.min(gridSize - 2, Math.floor(col)));
  const r0 = Math.max(0, Math.min(gridSize - 2, Math.floor(row)));
  const c1 = c0 + 1;
  const r1 = r0 + 1;

  const fx = col - c0;
  const fz = row - r0;

  const y00 = positions[(r0 * gridSize + c0) * 3 + 1];
  const y10 = positions[(r0 * gridSize + c1) * 3 + 1];
  const y01 = positions[(r1 * gridSize + c0) * 3 + 1];
  const y11 = positions[(r1 * gridSize + c1) * 3 + 1];

  const y0 = y00 * (1 - fx) + y10 * fx;
  const y1 = y01 * (1 - fx) + y11 * fx;

  return y0 * (1 - fz) + y1 * fz;
}

console.log('--- Substation [82, -70]:', sampleTerrainY(82, -70));
console.log('--- Pole 6 [80, -68]:', sampleTerrainY(80, -68));
console.log('--- Gate Approach [92, -74]:', sampleTerrainY(92, -74));
console.log('--- Gate [96, -76]:', sampleTerrainY(96, -76));
console.log('--- Gate Inside [98, -78]:', sampleTerrainY(98, -78));
console.log('--- Gate Inside [100, -80]:', sampleTerrainY(100, -80));
