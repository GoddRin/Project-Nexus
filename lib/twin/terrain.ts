/**
 * Height sampler for the v1 powerhouse terrain, ported from components/digital-twin/terrainData.ts
 * without three.js so server code and build scripts can use it.
 *
 * The source is public/data/gis-terrain-mesh.json: a 65 x 65 grid of vertices over 360 m x 360 m
 * (Copernicus GLO-30, scaled by v1 to 1 : 4.42 horizontally). v1 then flattens three areas: the
 * tailrace channel, the powerhouse yard and the Temfacil pad. The same edits are applied here so
 * the heights match v1 exactly (scripts/twin/check-terrain.mts compares the two).
 *
 * v2 replaces this terrain in P03a; until then this is the ground every v1 position sits on.
 */

export const V1_SCENE_HALF = 180.0;

export type V1TerrainMesh = { positions: number[]; gridSize?: number };

export type TerrainSampler = {
  gridSize: number;
  half: number;
  /** Height of each mesh vertex after v1's edits, in the mesh's own vertex order (row by row). */
  heights: Float32Array;
  /** Ground height in metres (scene Y) at scene position (x, z). Clamped at the terrain edge. */
  sampleY: (x: number, z: number) => number;
};

function smoothstep01(t: number): number {
  return t * t * (3.0 - 2.0 * t);
}

/** v1's civil edits to the raw mesh heights (heights only; v1 also recolours the vertices). */
function flattenedHeights(positions: ArrayLike<number>): Float32Array {
  const ys = new Float32Array(positions.length / 3);
  for (let i = 0, v = 0; i < positions.length; i += 3, v++) {
    // (stored as 32-bit floats, as v1 does, so the comparisons below see the same values)
    const x = Math.fround(positions[i]);
    const y = Math.fround(positions[i + 1]);
    const z = Math.fround(positions[i + 2]);
    ys[v] = y;

    // 1. tailrace channel
    if (x >= -12.0 && x <= 12.0 && z >= 5.5 && z <= 48.0) {
      ys[v] = -1.35;
      continue;
    }

    // 2. powerhouse yard, level at 0.05 m, blended into the slope over 22 m
    const distPH = Math.hypot(Math.max(-32.0 - x, 0, x - 44.0), Math.max(-24.0 - z, 0, z - 18.0));
    if (distPH === 0) {
      ys[v] = 0.05;
      continue;
    } else if (distPH < 22.0) {
      const t = smoothstep01(distPH / 22.0);
      ys[v] = 0.05 * (1.0 - t) + Math.max(0.05, y) * t;
      continue;
    }

    // 3. Temfacil pad, cut to 13.0 m, blended into the slope over 28 m
    const distPad = Math.hypot(Math.max(74.0 - x, 0, x - 180.0), Math.max(-148.0 - z, 0, z - -74.0));
    if (distPad === 0) {
      ys[v] = 13.0;
    } else if (distPad < 28.0) {
      const t = smoothstep01(distPad / 28.0);
      ys[v] = 13.0 * (1.0 - t) + Math.max(13.0, y) * t;
    }
  }
  return ys;
}

export function createV1TerrainSampler(mesh: V1TerrainMesh): TerrainSampler {
  const gridSize = mesh.gridSize || 65;
  const ys = flattenedHeights(mesh.positions);
  const half = V1_SCENE_HALF;

  const sampleY = (x: number, z: number): number => {
    const col = ((x + half) / (half * 2)) * (gridSize - 1);
    const row = ((z + half) / (half * 2)) * (gridSize - 1);
    const c0 = Math.max(0, Math.min(gridSize - 2, Math.floor(col)));
    const r0 = Math.max(0, Math.min(gridSize - 2, Math.floor(row)));
    const fx = col - c0;
    const fz = row - r0;
    const y00 = ys[r0 * gridSize + c0];
    const y10 = ys[r0 * gridSize + c0 + 1];
    const y01 = ys[(r0 + 1) * gridSize + c0];
    const y11 = ys[(r0 + 1) * gridSize + c0 + 1];
    const y0 = y00 * (1 - fx) + y10 * fx;
    const y1 = y01 * (1 - fx) + y11 * fx;
    return y0 * (1 - fz) + y1 * fz;
  };

  return { gridSize, half, heights: ys, sampleY };
}
