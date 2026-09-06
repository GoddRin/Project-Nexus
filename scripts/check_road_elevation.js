const fs = require('fs');
const THREE = require('three');
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

const WAYPOINTS = [
  new THREE.Vector3(20.0, 0.48, 18.0),    // 0
  new THREE.Vector3(39.0, 0.65, 10.0),    // 1
  new THREE.Vector3(48.0, 1.80, -8.0),    // 2
  new THREE.Vector3(58.0, 4.20, -28.0),   // 3
  new THREE.Vector3(72.0, 7.50, -48.0),   // 4
  new THREE.Vector3(84.0, 10.8, -64.0),   // 5
  new THREE.Vector3(92.0, 13.0, -74.0),   // 6
  new THREE.Vector3(96.0, 14.15, -76.0),  // 7
];

WAYPOINTS.forEach((wp, idx) => {
  const ty = sampleTerrainY(wp.x, wp.z);
  console.log(`WP ${idx} (${wp.x}, ${wp.z}): defined Y = ${wp.y.toFixed(2)}, terrain Y = ${ty.toFixed(2)}, diff = ${(wp.y - ty).toFixed(2)}`);
});
