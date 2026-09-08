/**
 * terrainData.ts
 *
 * Centralized Single Source of Truth for the 3D GIS Terrain Mesh & Elevation Engine.
 * Ensures the visual 3D BufferGeometry in MountainTerrain and the runtime height sampler
 * sampleTerrainY(x, z) are 100% mathematically synchronized.
 */

import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";

export const SCENE_HALF = 180.0;
export const GRID_SIZE = (gisTerrainData as any).gridSize || 65;

function processTerrainMesh(): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(gisTerrainData.positions);
  const colors = new Float32Array(gisTerrainData.colors);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    // 1. Deeply Excavate Tailrace Canal & Outfall Channel (well below concrete chute floor)
    if (x >= -12.0 && x <= 12.0 && z >= 5.5 && z <= 48.0) {
      positions[i + 1] = -1.35;
      colors[i] = 0.12;
      colors[i + 1] = 0.16;
      colors[i + 2] = 0.13;
      continue;
    }

    // 2. Powerhouse Facility Compound Base Yard (level civil foundation at Y = 0.05m)
    const dxPH = Math.max(-32.0 - x, 0, x - 44.0);
    const dzPH = Math.max(-24.0 - z, 0, z - 18.0);
    const distPH = Math.hypot(dxPH, dzPH);

    if (distPH === 0) {
      positions[i + 1] = 0.05;
      colors[i] = 0.29;
      colors[i + 1] = 0.28;
      colors[i + 2] = 0.26;
      continue;
    } else if (distPH < 22.0) {
      const t = distPH / 22.0;
      const smoothT = t * t * (3.0 - 2.0 * t);
      const origY = Math.max(0.05, y);
      positions[i + 1] = 0.05 * (1.0 - smoothT) + origY * smoothT;

      const cCivilR = 0.29, cCivilG = 0.28, cCivilB = 0.26;
      const cForestR = 0.16, cForestG = 0.25, cForestB = 0.13;
      const cSoilR = 0.28, cSoilG = 0.23, cSoilB = 0.17;
      const mixSoil = Math.sin(x * 0.15 + z * 0.12) * 0.5 + 0.5;
      const cTargetR = THREE.MathUtils.lerp(cForestR, cSoilR, mixSoil * 0.6);
      const cTargetG = THREE.MathUtils.lerp(cForestG, cSoilG, mixSoil * 0.6);
      const cTargetB = THREE.MathUtils.lerp(cForestB, cSoilB, mixSoil * 0.6);

      colors[i] = THREE.MathUtils.lerp(cCivilR, cTargetR, smoothT);
      colors[i + 1] = THREE.MathUtils.lerp(cCivilG, cTargetG, smoothT);
      colors[i + 2] = THREE.MathUtils.lerp(cCivilB, cTargetB, smoothT);
      continue;
    }

    // 3. TEMFACIL Excavated Base Land Pad & Mountain Slope Transition
    // Base platform slab sits at Z <= -74.0 and X in [74.0, 180.0]
    const dxPad = Math.max(74.0 - x, 0, x - 180.0);
    const dzPad = Math.max(-148.0 - z, 0, z - (-74.0));
    const distPad = Math.hypot(dxPad, dzPad);

    if (distPad === 0) {
      // Excavation underneath TEMFACIL compound at y = 13.0 (under the 14.15m civil slab)
      positions[i + 1] = 13.0;
      colors[i] = 0.28;
      colors[i + 1] = 0.26;
      colors[i + 2] = 0.22;
      continue;
    } else if (distPad < 28.0) {
      // Mountain slope transition around TEMFACIL
      const t = distPad / 28.0;
      const smoothT = t * t * (3.0 - 2.0 * t);
      const origY = Math.max(13.0, y);
      positions[i + 1] = 13.0 * (1.0 - smoothT) + origY * smoothT;

      const cGreenR = 0.16, cGreenG = 0.25, cGreenB = 0.13;
      const cSoilR = 0.28, cSoilG = 0.23, cSoilB = 0.17;

      const mixSoil = (Math.sin(x * 0.12) * 0.35 + 0.35) * (1.0 - t * 0.4);
      colors[i] = THREE.MathUtils.lerp(cGreenR, cSoilR, mixSoil);
      colors[i + 1] = THREE.MathUtils.lerp(cGreenG, cSoilG, mixSoil);
      colors[i + 2] = THREE.MathUtils.lerp(cGreenB, cSoilB, mixSoil);
      continue;
    }
  }

  return { positions, colors };
}

// Precompute once at module load
const PROCESSED_DATA = processTerrainMesh();
export const PROCESSED_TERRAIN_POSITIONS = PROCESSED_DATA.positions;
export const PROCESSED_TERRAIN_COLORS = PROCESSED_DATA.colors;

/**
 * Bilinear height sampler reading directly from the true processed terrain mesh buffer.
 * Guarantees zero elevation discrepancy between what is rendered in 3D and what entities sample.
 */
export function sampleTerrainY(x: number, z: number): number {
  const xFrac = (x + SCENE_HALF) / (SCENE_HALF * 2);
  const zFrac = (z + SCENE_HALF) / (SCENE_HALF * 2);

  const col = xFrac * (GRID_SIZE - 1);
  const row = zFrac * (GRID_SIZE - 1);

  const c0 = Math.max(0, Math.min(GRID_SIZE - 2, Math.floor(col)));
  const r0 = Math.max(0, Math.min(GRID_SIZE - 2, Math.floor(row)));
  const c1 = c0 + 1;
  const r1 = r0 + 1;

  const fx = col - c0;
  const fz = row - r0;

  const y00 = PROCESSED_TERRAIN_POSITIONS[(r0 * GRID_SIZE + c0) * 3 + 1];
  const y10 = PROCESSED_TERRAIN_POSITIONS[(r0 * GRID_SIZE + c1) * 3 + 1];
  const y01 = PROCESSED_TERRAIN_POSITIONS[(r1 * GRID_SIZE + c0) * 3 + 1];
  const y11 = PROCESSED_TERRAIN_POSITIONS[(r1 * GRID_SIZE + c1) * 3 + 1];

  const y0 = y00 * (1 - fx) + y10 * fx;
  const y1 = y01 * (1 - fx) + y11 * fx;
  return y0 * (1 - fz) + y1 * fz;
}
