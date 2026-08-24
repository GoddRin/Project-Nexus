"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";
import { UPHILL_ROAD_WAYPOINTS } from "./uphillRoadConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   PHILIPPINE SIERRA MADRE RAINFOREST ENGINE (High-Fidelity Flora & Non-Culling)
   
   Species Implemented:
     1. Giant Dipterocarp / Narra / Yakal (Shorea / Pterocarpus indicus)
     2. Philippine Fan Palm (Anahaw / Livistona rotundifolia)
     3. Bamboo Groves (Kawayan Tinik / Bambusa blumeana)
     4. Mountain Molave / Broadleaf Canopy (Vitex parviflora)
     5. Tropical Rainforest Understory Ferns & Shrubs
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Exclusion Zones (Keep civil structures, powerhouse, and roads clear) ───
const PAD_X_MIN = -16.0;
const PAD_X_MAX = 39.0;
const PAD_Z_MIN = -14.0;
const PAD_Z_MAX = 17.0;
const PAD_FALLOFF = 6.0;

const PENSTOCK_X_MIN = -14.0;
const PENSTOCK_X_MAX = 2.0;
const PENSTOCK_Z_MIN = -34.0;
const PENSTOCK_Z_MAX = -8.0;
const PENSTOCK_FALLOFF = 5.0;

const SCENE_HALF = 175.0;

function rectSignedDist(px: number, pz: number, xMin: number, xMax: number, zMin: number, zMax: number): number {
  const dx = Math.max(xMin - px, 0, px - xMax);
  const dz = Math.max(zMin - pz, 0, pz - zMax);
  if (dx === 0 && dz === 0) {
    return -Math.min(px - xMin, xMax - px, pz - zMin, zMax - pz);
  }
  return Math.hypot(dx, dz);
}

// ─── Terrain Height Sampler ─────────────────────────────────────────────────
function sampleTerrainY(x: number, z: number): number {
  const gridSize = (gisTerrainData as any).gridSize || 65;
  const positions = (gisTerrainData as any).positions as number[];

  const xFrac = (x + 180.0) / 360.0;
  const zFrac = (z + 180.0) / 360.0;

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
  let y = y0 * (1 - fz) + y1 * fz;

  // 1. Tailrace Canal & Outfall Channel
  if (x >= -14.0 && x <= 14.0 && z >= 6.0 && z <= 48.0) {
    return Math.min(y, -0.45);
  }

  // 2. TEMFACIL Expanded Base Land Pad & Mountain Slope Transition
  const dxPad = Math.max(80.0 - x, 0, x - 175.0);
  const dzPad = Math.max(-142.0 - z, 0, z - (-66.0));
  const distPad = Math.hypot(dxPad, dzPad);

  if (distPad === 0) {
    return 14.0;
  } else if (distPad < 28.0) {
    const t = distPad / 28.0;
    const smoothT = t * t * (3.0 - 2.0 * t);
    const origY = Math.max(14.0, y);
    y = 14.0 * (1.0 - smoothT) + origY * smoothT;
  }

  // 3. Slope to powerhouse
  const ax = 34.0, az = -22.0;
  const bx = 95.0, bz = -75.0;
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
  const projX = ax + t * dx;
  const projZ = az + t * dz;
  const distToSlopeLine = Math.hypot(x - projX, z - projZ);

  if (distToSlopeLine < 28.0 && x >= 30.0 && x <= 98.0 && z >= -80.0 && z <= -20.0) {
    const slopeY = 0.5 + t * 13.5;
    const fade = Math.min(1.0, distToSlopeLine / 28.0);
    y = slopeY * (1.0 - fade) + y * fade;
  }

  return y;
}

// ─── Safe Geometry Merger (Normalizes indexing and attributes) ─────────────
function safeMergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geometries.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g.clone();
    if (!ni.attributes.normal) ni.computeVertexNormals();
    return ni;
  });
  const merged = mergeGeometries(nonIndexed, false);
  nonIndexed.forEach((g) => g.dispose());
  return merged || new THREE.BufferGeometry();
}

// ─── 1. GIANT PHILIPPINE DIPTEROCARP / NARRA TREE GEOMETRY ──────────────────
function createGiantDipterocarpGeometry(): THREE.BufferGeometry {
  // Deep-rooted trunk extending 1.2m below terrain surface to eliminate floating
  const trunk = new THREE.CylinderGeometry(0.24, 0.52, 7.5, 6, 1);
  trunk.translate(0, 2.75, 0); // Spans Y: -1.0m to +6.5m

  // Buttress root flairs anchored into terrain
  const buttress1 = new THREE.ConeGeometry(0.40, 2.2, 4);
  buttress1.translate(0.35, 0.6, 0);
  const buttress2 = new THREE.ConeGeometry(0.40, 2.2, 4);
  buttress2.translate(-0.25, 0.6, 0.28);
  const buttress3 = new THREE.ConeGeometry(0.40, 2.2, 4);
  buttress3.translate(-0.15, 0.6, -0.32);

  // Layered umbrella canopy tiers (Detail 0 for crisp stylized low-poly high performance)
  const tier1 = new THREE.DodecahedronGeometry(2.4, 0);
  tier1.scale(1.4, 0.65, 1.4);
  tier1.translate(0, 6.8, 0);

  const tier2 = new THREE.DodecahedronGeometry(1.8, 0);
  tier2.scale(1.2, 0.7, 1.2);
  tier2.translate(0.6, 8.0, 0.4);

  const tier3 = new THREE.DodecahedronGeometry(1.6, 0);
  tier3.scale(1.1, 0.65, 1.1);
  tier3.translate(-0.5, 8.4, -0.3);

  const crown = new THREE.DodecahedronGeometry(1.2, 0);
  crown.scale(1.0, 0.8, 1.0);
  crown.translate(0, 9.2, 0);

  const merged = safeMergeGeometries([trunk, buttress1, buttress2, buttress3, tier1, tier2, tier3, crown]);
  trunk.dispose(); buttress1.dispose(); buttress2.dispose(); buttress3.dispose();
  tier1.dispose(); tier2.dispose(); tier3.dispose(); crown.dispose();
  return merged;
}

// ─── 2. PHILIPPINE ANAHAW / FAN PALM GEOMETRY ───────────────────────────────
function createPhilippineAnahawPalmGeometry(): THREE.BufferGeometry {
  // Deep-rooted trunk extending 1.2m below terrain surface to eliminate floating
  const trunk = new THREE.CylinderGeometry(0.12, 0.22, 6.5, 5, 1);
  trunk.translate(0, 2.25, 0); // Spans Y: -1.0m to +5.5m

  // Radial fan fronds
  const fronds: THREE.BufferGeometry[] = [];
  const frondCount = 7;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2;
    const frond = new THREE.ConeGeometry(0.65, 1.8, 4);
    frond.scale(0.8, 0.15, 1.2);
    frond.rotateX(0.75);
    frond.rotateY(angle);
    frond.translate(Math.sin(angle) * 0.9, 5.2 - (i % 2) * 0.25, Math.cos(angle) * 0.9);
    fronds.push(frond);
  }

  const crownCenter = new THREE.SphereGeometry(0.45, 5, 4);
  crownCenter.translate(0, 5.2, 0);

  const merged = safeMergeGeometries([trunk, crownCenter, ...fronds]);
  trunk.dispose(); crownCenter.dispose();
  fronds.forEach(f => f.dispose());
  return merged;
}

// ─── 3. PHILIPPINE BAMBOO GROVE (KAWAYAN) GEOMETRY ──────────────────────────
function createBambooGroveGeometry(): THREE.BufferGeometry {
  const culms: THREE.BufferGeometry[] = [];
  const culmCount = 4;
  for (let i = 0; i < culmCount; i++) {
    const angle = (i / culmCount) * Math.PI * 2 + (i * 0.3);
    const dist = 0.35 + (i * 0.12);
    const height = 5.2 + (i % 3) * 0.7;
    // Culm extends 1.0m below ground
    const culm = new THREE.CylinderGeometry(0.045, 0.075, height, 4, 1);
    const lean = 0.08 + (i * 0.02);
    culm.rotateZ(Math.cos(angle) * lean);
    culm.rotateX(Math.sin(angle) * lean);
    culm.translate(Math.cos(angle) * dist, height * 0.5 - 0.9, Math.sin(angle) * dist);

    // Leaf spray puff
    const leaves = new THREE.ConeGeometry(0.75, 1.6, 4);
    leaves.scale(1.2, 0.4, 1.2);
    leaves.translate(Math.cos(angle) * (dist + 0.3), height - 1.1, Math.sin(angle) * (dist + 0.3));

    culms.push(culm, leaves);
  }

  const merged = safeMergeGeometries(culms);
  culms.forEach(c => c.dispose());
  return merged;
}

// ─── 4. MOUNTAIN MOLAVE / TROPICAL BROADLEAF GEOMETRY ───────────────────────
function createMountainMolaveGeometry(): THREE.BufferGeometry {
  // Deep-rooted trunk extending 1.0m below terrain surface to eliminate floating
  const trunk = new THREE.CylinderGeometry(0.18, 0.32, 5.0, 5, 1);
  trunk.translate(0, 1.5, 0); // Spans Y: -1.0m to +4.0m

  const canopyMain = new THREE.DodecahedronGeometry(2.0, 0);
  canopyMain.scale(1.3, 0.8, 1.3);
  canopyMain.translate(0, 4.4, 0);

  const canopySide1 = new THREE.DodecahedronGeometry(1.3, 0);
  canopySide1.translate(-0.8, 4.0, 0.6);

  const canopySide2 = new THREE.DodecahedronGeometry(1.2, 0);
  canopySide2.translate(0.9, 4.2, -0.5);

  const merged = safeMergeGeometries([trunk, canopyMain, canopySide1, canopySide2]);
  trunk.dispose(); canopyMain.dispose(); canopySide1.dispose(); canopySide2.dispose();
  return merged;
}

// ─── 5. TROPICAL FERN & UNDERSTORY SHRUB GEOMETRY ────────────────────────────
function createTropicalFernUnderstoryGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.06, 0.10, 1.0, 4, 1);
  trunk.translate(0, 0.5, 0);

  const foliage = new THREE.DodecahedronGeometry(1.1, 0);
  foliage.scale(1.4, 0.55, 1.4);
  foliage.translate(0, 1.3, 0);

  const merged = safeMergeGeometries([trunk, foliage]);
  trunk.dispose(); foliage.dispose();
  return merged;
}

// ─── Tree Placement Generator ───────────────────────────────────────────────
interface TreePlacement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotationY: number;
  variant: 0 | 1 | 2 | 3 | 4;
}

function distToLineSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function distToRoadCorridor(px: number, pz: number): number {
  let minD = 999.0;
  for (let i = 0; i < UPHILL_ROAD_WAYPOINTS.length - 1; i++) {
    const p1 = UPHILL_ROAD_WAYPOINTS[i];
    const p2 = UPHILL_ROAD_WAYPOINTS[i + 1];
    const d = distToLineSegment(px, pz, p1.x, p1.z, p2.x, p2.z);
    if (d < minD) minD = d;
  }
  return minD;
}

function distToRiverChannel(x: number, z: number): number {
  if (x < -145.0 || x > 155.0) return 999.0;
  const u = Math.max(0, Math.min(1, (x + 130.0) / 270.0));
  const zRiverCenter = 42.0 + Math.sin(u * Math.PI * 2.2) * 9.0;
  return Math.abs(z - zRiverCenter);
}

function generateDenseTreePlacements(seed: number): TreePlacement[] {
  const rng = mulberry32(seed);
  const placements: TreePlacement[] = [];

  // Optimized spacing: 5.8m grid spacing generates rich, dense trees smoothly
  const GRID_SPACING = 5.8;

  for (let gx = -SCENE_HALF; gx <= SCENE_HALF; gx += GRID_SPACING) {
    for (let gz = -SCENE_HALF; gz <= SCENE_HALF; gz += GRID_SPACING) {
      const x = gx + (rng() - 0.5) * GRID_SPACING * 0.90;
      const z = gz + (rng() - 0.5) * GRID_SPACING * 0.90;

      const dMain = rectSignedDist(x, z, PAD_X_MIN, PAD_X_MAX, PAD_Z_MIN, PAD_Z_MAX);
      const dPenstock = rectSignedDist(x, z, PENSTOCK_X_MIN, PENSTOCK_X_MAX, PENSTOCK_Z_MIN, PENSTOCK_Z_MAX);
      
      // Full TEMFACIL Compound footprint (Site Office, Staff House, Canteen, Basketball Court, Barracks, Laydown Yard, Parking)
      const dTemfacilCompound = rectSignedDist(x, z, 65.0, 180.0, -165.0, -45.0);
      
      // Pinacanauan River channel & tailrace discharge canal
      const riverDist = distToRiverChannel(x, z);
      const dTailrace = rectSignedDist(x, z, -16.0, 16.0, 4.0, 48.0);
      
      const distFromAccessRoad = distToRoadCorridor(x, z);

      if (dMain < PAD_FALLOFF) continue;
      if (dPenstock < PENSTOCK_FALLOFF) continue;
      if (dTemfacilCompound < 6.0) continue;
      if (riverDist < 18.0) continue;
      if (dTailrace < 4.5) continue;
      if (distFromAccessRoad < 7.5) continue;

      const terrainY = sampleTerrainY(x, z);
      const variantRoll = rng();
      let variant: 0 | 1 | 2 | 3 | 4;
      if (variantRoll < 0.30) variant = 0; // Giant Narra/Dipterocarp
      else if (variantRoll < 0.50) variant = 1; // Anahaw Palm
      else if (variantRoll < 0.70) variant = 2; // Bamboo Grove
      else if (variantRoll < 0.88) variant = 3; // Mountain Molave
      else variant = 4; // Tropical Fern Understory

      const baseScale = variant === 0 ? 1.05 : variant === 1 ? 1.0 : variant === 2 ? 0.95 : variant === 3 ? 0.9 : 0.75;
      const scale = baseScale * (0.75 + rng() * 0.55);
      const rotationY = rng() * Math.PI * 2;

      placements.push({ x, y: terrainY, z, scale, rotationY, variant });
    }
  }

  return placements;
}

// ─── Non-Culling Instanced Tree Mesh Component ──────────────────────────────
interface InstancedTreesProps {
  geometry: THREE.BufferGeometry;
  placements: TreePlacement[];
  canopyColor: string;
  castShadow?: boolean;
}

function InstancedTrees({ geometry, placements, canopyColor, castShadow = false }: InstancedTreesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current || placements.length === 0) return;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rotationY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Enlarge bounding sphere to encompass entire valley so Three.js NEVER frustum-culls trees at any camera angle
    meshRef.current.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1000);
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, placements.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false} // CRITICAL: Ensures trees remain visible from ALL angles and perspective tilts
    >
      <meshStandardMaterial
        color={canopyColor}
        roughness={0.85}
        metalness={0.03}
        flatShading
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
const TREE_SEED = 20260801;

export function ForestVegetation() {
  const { geoNarra, geoAnahaw, geoBamboo, geoMolave, geoFern } = useMemo(() => ({
    geoNarra: createGiantDipterocarpGeometry(),
    geoAnahaw: createPhilippineAnahawPalmGeometry(),
    geoBamboo: createBambooGroveGeometry(),
    geoMolave: createMountainMolaveGeometry(),
    geoFern: createTropicalFernUnderstoryGeometry(),
  }), []);

  const allPlacements = useMemo(() => generateDenseTreePlacements(TREE_SEED), []);

  const placementsNarra = useMemo(() => allPlacements.filter(p => p.variant === 0), [allPlacements]);
  const placementsAnahaw = useMemo(() => allPlacements.filter(p => p.variant === 1), [allPlacements]);
  const placementsBamboo = useMemo(() => allPlacements.filter(p => p.variant === 2), [allPlacements]);
  const placementsMolave = useMemo(() => allPlacements.filter(p => p.variant === 3), [allPlacements]);
  const placementsFern = useMemo(() => allPlacements.filter(p => p.variant === 4), [allPlacements]);

  return (
    <group>
      {/* 1. Giant Narra & Dipterocarp (Rich Forest Green) */}
      <InstancedTrees
        geometry={geoNarra}
        placements={placementsNarra}
        canopyColor="#1E4D1A"
        castShadow={false}
      />

      {/* 2. Philippine Anahaw Palm & Coconut Fronds (Vibrant Tropical Green) */}
      <InstancedTrees
        geometry={geoAnahaw}
        placements={placementsAnahaw}
        canopyColor="#26732B"
        castShadow={false}
      />

      {/* 3. Bamboo Groves (Kawayan Tinik) (Fresh Lime & Bamboo Green) */}
      <InstancedTrees
        geometry={geoBamboo}
        placements={placementsBamboo}
        canopyColor="#4D8A2B"
        castShadow={false}
      />

      {/* 4. Mountain Molave / Broadleaf Trees (Deep Sierra Madre Emerald) */}
      <InstancedTrees
        geometry={geoMolave}
        placements={placementsMolave}
        canopyColor="#245A2E"
        castShadow={false}
      />

      {/* 5. Rainforest Understory Ferns & Bush Shrubbery (Moss Green) */}
      <InstancedTrees
        geometry={geoFern}
        placements={placementsFern}
        canopyColor="#366E31"
        castShadow={false}
      />
    </group>
  );
}
