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

// ---- v2 terrain (P03a) ----------------------------------------------------------------------------

/**
 * A square grid of heights in a location's frame: `n` x `n` points, `spacing` metres apart, the
 * first at (`min[0]`, `min[1]`), row by row along +x, rows counting along +z.
 *
 * The surface between the points is two triangles a cell, split along the diagonal from the
 * cell's lowest (x, z) corner to its highest. The renderer draws exactly these triangles at its
 * finest level (components/twin/world/terrain.ts), so `sampleHeightGrid` is the drawn surface.
 */
export type HeightGrid = { n: number; spacing: number; min: [number, number]; heights: Float32Array };

export function sampleHeightGrid(g: HeightGrid, x: number, z: number): number {
  const fx = Math.min(g.n - 1.000001, Math.max(0, (x - g.min[0]) / g.spacing));
  const fz = Math.min(g.n - 1.000001, Math.max(0, (z - g.min[1]) / g.spacing));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const tx = fx - i;
  const tz = fz - j;
  const k = j * g.n + i;
  const h00 = g.heights[k];
  const h11 = g.heights[k + g.n + 1];
  if (tx >= tz) {
    const h10 = g.heights[k + 1];
    return h00 + tx * (h10 - h00) + tz * (h11 - h10);
  }
  const h01 = g.heights[k + g.n];
  return h00 + tz * (h01 - h00) + tx * (h11 - h01);
}

/**
 * Heights as shipped: whole multiples of `scale` above `offset`, 16 bits each, each row stored as
 * its first value and then the differences along it (which compress far better), little-endian.
 * The file is this, gzipped.
 */
export function encodeHeights(heights: Float32Array, n: number, offset: number, scale: number): Uint8Array {
  const out = new Uint16Array(n * n);
  for (let j = 0; j < n; j++) {
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const q = Math.round((heights[j * n + i] - offset) / scale);
      if (q < 0 || q > 65535) throw new Error(`height ${heights[j * n + i]} outside the range of offset ${offset}, scale ${scale}`);
      out[j * n + i] = (q - prev) & 0xffff;
      prev = q;
    }
  }
  return new Uint8Array(out.buffer);
}

export function decodeHeights(bytes: Uint8Array, n: number, offset: number, scale: number): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const heights = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let q = 0;
    for (let i = 0; i < n; i++) {
      q = (q + view.getUint16((j * n + i) * 2, true)) & 0xffff;
      heights[j * n + i] = offset + q * scale;
    }
  }
  return heights;
}

/** What scripts/twin/build-terrain.mts writes for a location (components/twin/data/terrain/<location>.json). */
export type TerrainManifest = {
  location: string;
  /** The detailed square round the location's origin. */
  near: TerrainLayer;
  /** The wide surroundings, drawn outside the near square. */
  far: TerrainLayer;
  /** RGBA over the near square, one texel a metre: gravel, laterite, shotcrete, river cobbles. */
  mask: { url: string; size: number; min: [number, number]; texel: number };
  /** Roads, drains and weep holes (one file, its meshes named by kind). */
  civil: { url: string; bytes: number };
  /** Squares where a ground patch asset is drawn instead of the terrain: [xMin, zMin, xMax, zMax]. */
  holes: [number, number, number, number][];
  /** Simplified walkable surface for the navigation build (P09). */
  walkable: string;
};

export type TerrainLayer = {
  url: string;
  bytes: number;
  n: number;
  spacing: number;
  min: [number, number];
  offset: number;
  scale: number;
  /** Lowest and highest height, for bounds. */
  range: [number, number];
};
