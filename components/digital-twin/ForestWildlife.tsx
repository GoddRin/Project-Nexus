"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";
import {
  MAT_CARABAO_HIDE,
  MAT_HORN_GREY,
  MAT_HORNBILL_BEAK,
  MAT_EAGLE_FEATHER,
  MAT_EAGLE_CREST,
} from "./SharedMaterials";

/* ═══════════════════════════════════════════════════════════════════════════
   SIERRA MADRE & TUMAUINI ISABELA NATIVE WILDLIFE BEHAVIOR ENGINE
   
   High-Fidelity Organic Kinematics:
     1. Philippine Carabao (Kalabaw / Bubalus bubalis carabanesis)
     2. Philippine Eagle / Haring Ibon (Pithecophaga jefferyi)
     3. Rufous Hornbill / Kalaw (Buceros hydrocorax)
     4. Philippine Brown Deer / Osa (Rusa marianna)
     5. Philippine Warty Wild Boar / Baboy Ramo (Sus philippensis)
     6. Philippine Long-Tailed Macaque / Unggoy (Macaca fascicularis philippensis)
     7. Philippine Pasture Goat / Kambing (Capra hircus)
     8. Philippine Monitor Lizard / Bayawak (Varanus marmoratus)
   ═══════════════════════════════════════════════════════════════════════════ */

const SCENE_HALF = 180.0;

function sampleTerrainY(x: number, z: number): number {
  const gridSize = (gisTerrainData as any).gridSize || 65;
  const positions = (gisTerrainData as any).positions as number[];

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

// ─── 1. PHILIPPINE CARABAO (WATER BUFFALO / KALABAW) ─────────────────────────
function RealisticPhilippineCarabao({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const offsetRef = useRef<number>(seed * 10.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 6.0;

    const isGrazing = ((t * 0.12) % 1.0) < 0.65;
    const isWalking = !isGrazing;

    if (isWalking) {
      offsetRef.current += delta * 0.32;
    }

    const radius = 6.5;
    const posX = basePos[0] + Math.sin(offsetRef.current) * radius;
    const posZ = basePos[1] + Math.cos(offsetRef.current) * radius;
    const groundY = sampleTerrainY(posX, posZ);

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.y = offsetRef.current + Math.PI / 2;

    // Smooth 4-beat quadruped walk cycle
    const walkSpeed = 3.2;
    const walkFL = isWalking ? Math.sin(t * walkSpeed) * 0.32 : 0;
    const walkFR = isWalking ? -Math.sin(t * walkSpeed) * 0.32 : 0;
    const walkRL = isWalking ? -Math.sin(t * walkSpeed) * 0.28 : 0;
    const walkRR = isWalking ? Math.sin(t * walkSpeed) * 0.28 : 0;

    if (legFLRef.current) legFLRef.current.rotation.x = walkFL;
    if (legFRRef.current) legFRRef.current.rotation.x = walkFR;
    if (legRLRef.current) legRLRef.current.rotation.x = walkRL;
    if (legRRRef.current) legRRRef.current.rotation.x = walkRR;

    // Natural head dipping & grazing chew
    if (headRef.current) {
      if (isGrazing) {
        headRef.current.rotation.x = 0.52 + Math.sin(t * 2.2) * 0.08;
        headRef.current.rotation.y = Math.sin(t * 0.6) * 0.18;
      } else {
        headRef.current.rotation.x = -0.05 + Math.sin(t * walkSpeed) * 0.06;
        headRef.current.rotation.y = Math.sin(t * 0.8) * 0.12;
      }
    }
    // Organic tail swish
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 4.5) * 0.50;
      tailRef.current.rotation.x = 0.2 + Math.cos(t * 3.0) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Heavy Barrel Torso */}
      <mesh position={[0, 0.95, 0]} castShadow material={MAT_CARABAO_HIDE}>
        <cylinderGeometry args={[0.55, 0.62, 1.6, 8]} />
      </mesh>
      {/* Rump */}
      <mesh position={[0, 0.92, -0.65]} castShadow material={MAT_CARABAO_HIDE}>
        <sphereGeometry args={[0.54, 8, 8]} />
      </mesh>
      {/* Shoulders / Wither */}
      <mesh position={[0, 1.05, 0.6]} castShadow material={MAT_CARABAO_HIDE}>
        <sphereGeometry args={[0.56, 8, 8]} />
      </mesh>

      {/* Head & Sweeping Curved Horns */}
      <group ref={headRef} position={[0, 1.05, 1.0]}>
        <mesh position={[0, 0.1, 0.35]} rotation={[-0.3, 0, 0]} castShadow material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.22, 0.32, 0.65, 8]} />
        </mesh>
        <mesh position={[0, -0.05, 0.68]} castShadow material={MAT_CARABAO_HIDE}>
          <boxGeometry args={[0.32, 0.22, 0.35]} />
        </mesh>
        {/* Left Curved Horn (Crescent sweep) */}
        <mesh position={[-0.45, 0.32, 0.25]} rotation={[0.4, -0.8, -0.6]} castShadow material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.06, 0.12, 0.85, 6]} />
        </mesh>
        {/* Right Curved Horn */}
        <mesh position={[0.45, 0.32, 0.25]} rotation={[0.4, 0.8, 0.6]} castShadow material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.06, 0.12, 0.85, 6]} />
        </mesh>
        {/* Drooping Ears */}
        <mesh position={[-0.35, 0.08, 0.15]} rotation={[0, 0, -0.5]} material={MAT_CARABAO_HIDE}>
          <boxGeometry args={[0.22, 0.08, 0.06]} />
        </mesh>
        <mesh position={[0.35, 0.08, 0.15]} rotation={[0, 0, 0.5]} material={MAT_CARABAO_HIDE}>
          <boxGeometry args={[0.22, 0.08, 0.06]} />
        </mesh>
      </group>

      {/* Swishing Tail */}
      <group ref={tailRef} position={[0, 0.95, -1.05]}>
        <mesh position={[0, -0.35, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.035, 0.02, 0.7, 5]} />
        </mesh>
        <mesh position={[0, -0.72, 0]} material={MAT_CARABAO_HIDE}>
          <sphereGeometry args={[0.08, 6, 6]} />
        </mesh>
      </group>

      {/* Sturdy Hoofed Legs with upper shoulder pivot */}
      <group ref={legFLRef} position={[-0.35, 0.65, 0.5]}>
        <mesh position={[0, -0.35, 0]} castShadow material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.70, 6]} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.35, 0.65, 0.5]}>
        <mesh position={[0, -0.35, 0]} castShadow material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.70, 6]} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.32, 0.62, -0.55]}>
        <mesh position={[0, -0.35, 0]} castShadow material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.68, 6]} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.32, 0.62, -0.55]}>
        <mesh position={[0, -0.35, 0]} castShadow material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.68, 6]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 2. SOARING PHILIPPINE EAGLE (HARING IBON) ──────────────────────────────
function RealisticPhilippineEagle({ orbitCenter, flightAltitude = 68, radius = 80, speed = 0.14 }: {
  orbitCenter: [number, number];
  flightAltitude?: number;
  radius?: number;
  speed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const progressRef = useRef<number>(Math.random() * Math.PI * 2);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    progressRef.current += speed * delta;

    const posX = orbitCenter[0] + Math.sin(progressRef.current) * radius;
    const posZ = orbitCenter[1] + Math.cos(progressRef.current) * radius;
    const waveY = Math.sin(t * 0.35) * 3.5;

    groupRef.current.position.set(posX, flightAltitude + waveY, posZ);
    groupRef.current.rotation.y = progressRef.current + Math.PI / 2;
    groupRef.current.rotation.z = -0.22; // Inward bank into thermals

    // Thermal gliding interspersed with soaring wing beats
    const isFlapping = ((t * 0.25) % 1.0) < 0.45;
    const flap = isFlapping ? Math.sin(t * 3.6) * 0.28 : Math.sin(t * 0.8) * 0.04;
    if (leftWingRef.current) leftWingRef.current.rotation.z = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap;

    if (headRef.current) {
      headRef.current.rotation.x = 0.25 + Math.sin(t * 1.2) * 0.08; // Surveying ground
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Streamlined Eagle Body */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_EAGLE_FEATHER}>
        <cylinderGeometry args={[0.22, 0.12, 1.7, 7]} />
      </mesh>
      {/* White Chest & Belly */}
      <mesh position={[0, -0.06, 0.2]} material={MAT_EAGLE_CREST}>
        <sphereGeometry args={[0.24, 6, 6]} />
      </mesh>

      {/* Head with Shaggy Brown/Cream Crest & Hooked Beak */}
      <group ref={headRef} position={[0, 0.12, 0.85]}>
        <mesh material={MAT_EAGLE_CREST}>
          <sphereGeometry args={[0.18, 7, 7]} />
        </mesh>
        {/* Shaggy Crest Plume */}
        <mesh position={[0, 0.14, -0.08]} rotation={[-0.4, 0, 0]} material={MAT_EAGLE_FEATHER}>
          <coneGeometry args={[0.15, 0.35, 6]} />
        </mesh>
        {/* Hooked Yellow/Black Beak */}
        <mesh position={[0, -0.04, 0.22]} rotation={[0.4, 0, 0]}>
          <coneGeometry args={[0.08, 0.28, 5]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* Broad 2.5m Wings with Primary Feather Tips */}
      <group ref={leftWingRef} position={[-0.2, 0.05, 0]}>
        <mesh position={[-1.2, 0, 0]} rotation={[0, 0.05, 0]} material={MAT_EAGLE_FEATHER}>
          <boxGeometry args={[2.2, 0.04, 0.65]} />
        </mesh>
        {/* Slotted Wingtip Feathers */}
        <mesh position={[-2.3, 0, -0.05]} rotation={[0, -0.15, 0.1]} material={MAT_EAGLE_FEATHER}>
          <boxGeometry args={[0.45, 0.02, 0.55]} />
        </mesh>
      </group>

      <group ref={rightWingRef} position={[0.2, 0.05, 0]}>
        <mesh position={[1.2, 0, 0]} rotation={[0, -0.05, 0]} material={MAT_EAGLE_FEATHER}>
          <boxGeometry args={[2.2, 0.04, 0.65]} />
        </mesh>
        <mesh position={[2.3, 0, -0.05]} rotation={[0, 0.15, -0.1]} material={MAT_EAGLE_FEATHER}>
          <boxGeometry args={[0.45, 0.02, 0.55]} />
        </mesh>
      </group>

      {/* Fan Tail */}
      <mesh position={[0, 0.02, -0.95]} rotation={[-0.1, 0, 0]} material={MAT_EAGLE_CREST}>
        <coneGeometry args={[0.35, 0.6, 5]} />
      </mesh>
    </group>
  );
}

// ─── 3. RUFOUS HORNBILL (KALAW) ──────────────────────────────────────────────
function RealisticRufousHornbill({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const groundY = useMemo(() => sampleTerrainY(basePos[0], basePos[1]) + 8.5, [basePos]); // Perched on high canopy

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 3.5;
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.35 + seed;
    groupRef.current.rotation.x = Math.sin(t * 1.5) * 0.06;

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 2.0) * 0.12;
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.25;
    }
  });

  return (
    <group ref={groupRef} position={[basePos[0], groundY, basePos[1]]}>
      {/* Rufous Body */}
      <mesh position={[0, 0, 0]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.7, 6]} />
        <meshStandardMaterial color="#83210C" roughness={0.7} />
      </mesh>
      {/* Black Wings */}
      <mesh position={[0, 0.05, -0.05]}>
        <boxGeometry args={[0.36, 0.4, 0.22]} />
        <meshStandardMaterial color="#18181B" roughness={0.8} />
      </mesh>
      {/* White Tail */}
      <mesh position={[0, -0.38, -0.25]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.04]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      {/* Giant Crimson Casque & Curved Beak */}
      <group ref={headRef} position={[0, 0.32, 0.22]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.14, 6, 6]} />
          <meshStandardMaterial color="#991B1B" roughness={0.5} />
        </mesh>
        {/* Massive Casque Crest */}
        <mesh position={[0, 0.15, 0.08]} rotation={[-0.2, 0, 0]} material={MAT_HORNBILL_BEAK}>
          <boxGeometry args={[0.12, 0.22, 0.45]} />
        </mesh>
        {/* Curved Beak */}
        <mesh position={[0, -0.02, 0.32]} rotation={[0.3, 0, 0]} material={MAT_HORNBILL_BEAK}>
          <coneGeometry args={[0.10, 0.45, 5]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 4. PHILIPPINE BROWN DEER (OSA / RUSA MARIANNA) ──────────────────────────
function RealisticPhilippineDeer({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const groundY = useMemo(() => sampleTerrainY(basePos[0], basePos[1]), [basePos]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !headRef.current) return;
    const t = clock.getElapsedTime() + seed * 4.5;

    const isAlert = Math.sin(t * 0.22) > 0.35;
    if (isAlert) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.32, 0.08);
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.38;
      // Standing alert
      if (legFLRef.current) legFLRef.current.rotation.x = 0;
      if (legFRRef.current) legFRRef.current.rotation.x = 0;
      if (legRLRef.current) legRLRef.current.rotation.x = 0;
      if (legRRRef.current) legRRRef.current.rotation.x = 0;
    } else {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.38, 0.08);
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.12;
      // Gentle weight shift step
      const step = Math.sin(t * 1.8) * 0.12;
      if (legFLRef.current) legFLRef.current.rotation.x = step;
      if (legFRRef.current) legFRRef.current.rotation.x = -step;
      if (legRLRef.current) legRLRef.current.rotation.x = -step;
      if (legRRRef.current) legRRRef.current.rotation.x = step;
    }
  });

  return (
    <group ref={groupRef} position={[basePos[0], groundY, basePos[1]]}>
      {/* Slender Deer Torso */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.22, 1.15, 8]} />
        <meshStandardMaterial color="#6E3B16" roughness={0.8} />
      </mesh>
      {/* Rump */}
      <mesh position={[0, 0.92, -0.45]} castShadow>
        <sphereGeometry args={[0.26, 7, 7]} />
        <meshStandardMaterial color="#5C3112" roughness={0.8} />
      </mesh>

      {/* Head with Branched Antlers */}
      <group ref={headRef} position={[0, 1.2, 0.45]}>
        <mesh position={[0, 0.22, 0.14]} rotation={[-0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.14, 0.48, 6]} />
          <meshStandardMaterial color="#6E3B16" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.35, 0.35]} rotation={[-0.4, 0, 0]} castShadow>
          <coneGeometry args={[0.11, 0.34, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.8} />
        </mesh>
        {/* Left Antler */}
        <mesh position={[-0.14, 0.65, 0.12]} rotation={[0.2, -0.3, -0.35]} castShadow material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.02, 0.04, 0.55, 5]} />
        </mesh>
        {/* Right Antler */}
        <mesh position={[0.14, 0.65, 0.12]} rotation={[0.2, 0.3, 0.35]} castShadow material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.02, 0.04, 0.55, 5]} />
        </mesh>
      </group>

      {/* Articulated Slender Legs */}
      <group ref={legFLRef} position={[-0.14, 0.85, 0.38]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.14, 0.85, 0.38]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.13, 0.85, -0.38]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.13, 0.85, -0.38]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 5. PHILIPPINE WILD BOAR (BABOY RAMO) ────────────────────────────────────
function RealisticPhilippineWildBoar({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<number>(seed * 15.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 5.0;

    const isRooting = ((t * 0.15) % 1.0) < 0.6;
    if (!isRooting) {
      offsetRef.current += delta * 0.42;
    }

    const radius = 6.0;
    const posX = basePos[0] + Math.sin(offsetRef.current) * radius;
    const posZ = basePos[1] + Math.cos(offsetRef.current) * radius;
    const groundY = sampleTerrainY(posX, posZ);

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.y = offsetRef.current + Math.PI / 2;

    if (headRef.current) {
      headRef.current.rotation.x = isRooting ? 0.45 + Math.sin(t * 5.0) * 0.08 : 0.05;
    }

    const step = !isRooting ? Math.sin(t * 3.8) * 0.35 : 0;
    if (legFLRef.current) legFLRef.current.rotation.x = step;
    if (legFRRef.current) legFRRef.current.rotation.x = -step;
    if (legRLRef.current) legRLRef.current.rotation.x = -step;
    if (legRRRef.current) legRRRef.current.rotation.x = step;
  });

  return (
    <group ref={groupRef}>
      {/* Heavy Barrel Body */}
      <mesh position={[0, 0.48, 0]} scale={[1.1, 1.0, 1.4]} castShadow>
        <sphereGeometry args={[0.34, 8, 8]} />
        <meshStandardMaterial color="#2B1810" roughness={0.95} />
      </mesh>
      {/* Stiff Bristle Mane Ridge */}
      <mesh position={[0, 0.78, 0.05]}>
        <boxGeometry args={[0.08, 0.14, 0.8]} />
        <meshStandardMaterial color="#140A05" roughness={0.99} />
      </mesh>
      {/* Snout & Head */}
      <group ref={headRef} position={[0, 0.52, 0.42]}>
        <mesh position={[0, 0, 0.22]} rotation={[-0.3, 0, 0]} castShadow>
          <coneGeometry args={[0.16, 0.45, 6]} />
          <meshStandardMaterial color="#22130C" roughness={0.95} />
        </mesh>
        {/* Curved Ivory Tusks */}
        <mesh position={[-0.12, -0.06, 0.28]} rotation={[0.4, 0, -0.4]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.012, 0.02, 0.14, 5]} />
        </mesh>
        <mesh position={[0.12, -0.06, 0.28]} rotation={[0.4, 0, 0.4]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.012, 0.02, 0.14, 5]} />
        </mesh>
      </group>
      {/* Articulated Sturdy Legs (Firmly Grounded on Terrain) */}
      <group ref={legFLRef} position={[-0.2, 0.48, 0.25]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.055, 0.48, 6]} />
          <meshStandardMaterial color="#1A0D06" roughness={0.95} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.2, 0.48, 0.25]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.055, 0.48, 6]} />
          <meshStandardMaterial color="#1A0D06" roughness={0.95} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.18, 0.48, -0.3]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.055, 0.48, 6]} />
          <meshStandardMaterial color="#1A0D06" roughness={0.95} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.18, 0.48, -0.3]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.055, 0.48, 6]} />
          <meshStandardMaterial color="#1A0D06" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 6. PHILIPPINE LONG-TAILED MACAQUE (UNGGOY) ──────────────────────────────
function RealisticPhilippineMacaque({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 3.2;
    const hopY = Math.abs(Math.sin(t * 2.8)) * 0.22;
    const groundY = sampleTerrainY(basePos[0], basePos[1]);
    groupRef.current.position.set(basePos[0], groundY + hopY, basePos[1]);
    groupRef.current.rotation.y = Math.sin(t * 0.9) * 0.45 + seed;

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 1.6) * 0.35;
      headRef.current.rotation.x = Math.sin(t * 2.2) * 0.12;
    }
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 3.5) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#6B4B35" roughness={0.9} />
      </mesh>
      {/* Head */}
      <group ref={headRef} position={[0, 0.54, 0.1]}>
        <mesh castShadow>
          <sphereGeometry args={[0.13, 7, 7]} />
          <meshStandardMaterial color="#8D6548" roughness={0.9} />
        </mesh>
      </group>
      {/* Long Curled Counterbalancing Tail */}
      <group ref={tailRef} position={[0, 0.35, -0.32]}>
        <mesh position={[0, 0.18, -0.15]} rotation={[0.8, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.015, 0.55, 5]} />
          <meshStandardMaterial color="#5A3E2C" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 7. PHILIPPINE PASTURE GOATS (KAMBING) ───────────────────────────────────
function RealisticPhilippineGoat({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<number>(seed * 8.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !headRef.current) return;
    const t = clock.getElapsedTime() + seed * 4.0;
    
    const isWalking = Math.sin(t * 0.18) > 0.2;
    if (isWalking) {
      offsetRef.current += delta * 0.38;
    }

    const radius = 4.2;
    const posX = basePos[0] + Math.sin(offsetRef.current) * radius;
    const posZ = basePos[1] + Math.cos(offsetRef.current) * radius;
    const groundY = sampleTerrainY(posX, posZ);

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.y = offsetRef.current + Math.PI / 2;

    // Grazing head bobbing
    headRef.current.rotation.x = isWalking ? 0.15 : 0.42 + Math.sin(t * 2.2) * 0.12;
    headRef.current.rotation.y = Math.sin(t * 0.5) * 0.18;

    const step = isWalking ? Math.sin(t * 3.4) * 0.32 : 0;
    if (legFLRef.current) legFLRef.current.rotation.x = step;
    if (legFRRef.current) legFRRef.current.rotation.x = -step;
    if (legRLRef.current) legRLRef.current.rotation.x = -step;
    if (legRRRef.current) legRRRef.current.rotation.x = step;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.50, 0]} castShadow>
        <boxGeometry args={[0.32, 0.34, 0.65]} />
        <meshStandardMaterial color={seed % 2 === 0 ? "#F8FAFC" : "#78350F"} roughness={0.85} />
      </mesh>
      {/* Head & Horns */}
      <group ref={headRef} position={[0, 0.65, 0.35]}>
        <mesh position={[0, 0.1, 0.15]} rotation={[-0.4, 0, 0]} castShadow>
          <coneGeometry args={[0.1, 0.3, 6]} />
          <meshStandardMaterial color={seed % 2 === 0 ? "#F8FAFC" : "#5C2608"} roughness={0.85} />
        </mesh>
        {/* Backward Curved Horns */}
        <mesh position={[-0.08, 0.28, 0.02]} rotation={[-0.6, -0.2, 0]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.015, 0.025, 0.22, 5]} />
        </mesh>
        <mesh position={[0.08, 0.28, 0.02]} rotation={[-0.6, 0.2, 0]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.015, 0.025, 0.22, 5]} />
        </mesh>
      </group>
      {/* Articulated Four Legs (Firmly Grounded on Terrain) */}
      <group ref={legFLRef} position={[-0.12, 0.50, 0.22]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.12, 0.50, 0.22]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.12, 0.50, -0.22]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.12, 0.50, -0.22]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 8. PHILIPPINE MONITOR LIZARD (BAYAWAK) ──────────────────────────────────
function RealisticMonitorLizard({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 2.0;
    const groundY = sampleTerrainY(basePos[0], basePos[1]);
    groupRef.current.position.set(basePos[0], groundY + 0.04, basePos[1]);
    groupRef.current.rotation.y = seed + Math.sin(t * 0.8) * 0.22;
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 1.6) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Low Flattened Scaly Body */}
      <mesh position={[0, 0.06, 0]} scale={[1.4, 0.5, 2.2]} castShadow>
        <sphereGeometry args={[0.15, 7, 7]} />
        <meshStandardMaterial color="#2B3A24" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Long Articulated Sinuous Tail */}
      <group ref={tailRef} position={[0, 0.04, -0.3]}>
        <mesh position={[0, 0, -0.35]} rotation={[-0.05, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.01, 0.8, 5]} />
          <meshStandardMaterial color="#1E2A19" roughness={0.9} />
        </mesh>
      </group>
      {/* Head */}
      <mesh position={[0, 0.08, 0.4]} rotation={[0.2, 0, 0]} castShadow>
        <coneGeometry args={[0.09, 0.32, 5]} />
        <meshStandardMaterial color="#35492D" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── 9. PHILIPPINE NATIVE ASPIN DOG (ASONG PINOY / SITE GUARD DOG) ───────────
function RealisticPhilippineAspinDog({
  routeType = "TEMFACIL_COURTYARD",
  color = "#D97706", // Golden Tan, Black & Tan, Brindle
  seed = 1.0,
}: {
  routeType?: "TEMFACIL_COURTYARD" | "TEMFACIL_GATE" | "FOREST_TRAIL" | "WAREHOUSE_RAMP";
  color?: string;
  seed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const progressRef = useRef<number>(seed * 12.0);

  // Dynamic patrol waypoints
  const waypoints = useMemo(() => {
    if (routeType === "TEMFACIL_COURTYARD") {
      // Roaming around TEMFACIL courtyard, canteen entrance, and basketball court
      return [
        new THREE.Vector3(126, 14.0, -78),
        new THREE.Vector3(138, 14.0, -84),
        new THREE.Vector3(148, 14.0, -82),
        new THREE.Vector3(144, 14.0, -70),
        new THREE.Vector3(128, 14.0, -68),
      ];
    } else if (routeType === "TEMFACIL_GATE") {
      // Guard dog patrolling near Security Checkpoint Gate & road apron
      return [
        new THREE.Vector3(92, 12.5, -66),
        new THREE.Vector3(88, 12.0, -69),
        new THREE.Vector3(84, 11.2, -64),
        new THREE.Vector3(90, 12.2, -62),
      ];
    } else if (routeType === "WAREHOUSE_RAMP") {
      // Roaming along the warehouse brown dirt access track
      return [
        new THREE.Vector3(102, 14.0, -92),
        new THREE.Vector3(90, 14.0, -105),
        new THREE.Vector3(82, 14.0, -112),
        new THREE.Vector3(92, 14.0, -100),
      ];
    } else {
      // Roaming along the forest trail near the Pinacanauan River gorge
      return [
        new THREE.Vector3(15, 0, -35),
        new THREE.Vector3(32, 0, -42),
        new THREE.Vector3(45, 0, -28),
        new THREE.Vector3(28, 0, -15),
      ];
    }
  }, [routeType]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(waypoints, true), [waypoints]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() + seed * 3.5;

    // Aspin natural movement: walking, occasional sniffing pause
    const isSniffing = Math.sin(t * 0.35) > 0.65;
    const walkSpeed = isSniffing ? 0.02 : 0.065;
    progressRef.current = (progressRef.current + delta * walkSpeed) % 1.0;

    const pt = curve.getPointAt(progressRef.current);
    const tangent = curve.getTangentAt(progressRef.current);

    // Height calculation: directly sample true terrain height for 100% ground contact
    const groundY = sampleTerrainY(pt.x, pt.z);

    const yaw = Math.atan2(tangent.x, tangent.z);
    groupRef.current.position.set(pt.x, groundY, pt.z);
    groupRef.current.rotation.set(0, yaw, 0);

    // Dynamic head and snout sniffing motion
    if (headRef.current) {
      if (isSniffing) {
        headRef.current.rotation.x = 0.52 + Math.sin(t * 6.0) * 0.08;
        headRef.current.rotation.y = Math.sin(t * 3.0) * 0.18;
      } else {
        headRef.current.rotation.x = 0.12 + Math.sin(t * 4.0) * 0.06;
        headRef.current.rotation.y = Math.sin(t * 1.2) * 0.15;
      }
    }

    // Energetic curled wagging tail
    if (tailRef.current) {
      const wagSpeed = isSniffing ? 12.0 : 8.0;
      tailRef.current.rotation.y = Math.sin(t * wagSpeed) * 0.38;
      tailRef.current.rotation.x = 0.45 + Math.sin(t * (wagSpeed * 0.5)) * 0.1;
    }

    // 4-beat articulated canine trot gait
    const trot = isSniffing ? 0 : Math.sin(t * 9.0) * 0.42;
    if (legFLRef.current) legFLRef.current.rotation.x = trot;
    if (legFRRef.current) legFRRef.current.rotation.x = -trot;
    if (legRLRef.current) legRLRef.current.rotation.x = -trot;
    if (legRRRef.current) legRRRef.current.rotation.x = trot;
  });

  return (
    <group ref={groupRef}>
      {/* Athletic Canine Torso */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.22, 0.24, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Chest Depth */}
      <mesh position={[0, 0.34, 0.14]} castShadow>
        <boxGeometry args={[0.24, 0.22, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* Head Assembly */}
      <group ref={headRef} position={[0, 0.48, 0.28]}>
        {/* Skull */}
        <mesh position={[0, 0.06, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.14, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
        {/* Tapered Muzzle / Snout */}
        <mesh position={[0, 0.02, 0.16]} castShadow>
          <boxGeometry args={[0.10, 0.09, 0.16]} />
          <meshStandardMaterial color="#271810" roughness={0.8} />
        </mesh>
        {/* Black Nose Tip */}
        <mesh position={[0, 0.04, 0.25]}>
          <boxGeometry args={[0.04, 0.03, 0.03]} />
          <meshStandardMaterial color="#0F172A" roughness={0.3} />
        </mesh>
        {/* Alert Pointed Ears */}
        <mesh position={[-0.07, 0.18, -0.02]} rotation={[0.1, 0, -0.2]}>
          <coneGeometry args={[0.035, 0.12, 4]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0.07, 0.18, -0.02]} rotation={[0.1, 0, 0.2]}>
          <coneGeometry args={[0.035, 0.12, 4]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>

      {/* Curled Wagging Tail */}
      <group ref={tailRef} position={[0, 0.44, -0.27]}>
        <mesh position={[0, 0.14, -0.08]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.015, 0.32, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>

      {/* 4 Articulated Canine Legs (Firmly Grounded on Floor) */}
      <group ref={legFLRef} position={[-0.09, 0.38, 0.18]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.09, 0.38, 0.18]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.09, 0.38, -0.18]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.09, 0.38, -0.18]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ─── MAIN EXPORT: SIERRA MADRE WILDLIFE & DOMESTIC SITE FAUNA ECOSYSTEM ─────
export function ForestWildlife() {
  const carabaoPositions: [number, number][] = useMemo(() => [
    [52, -148], [62, -152], [42, -145], [18, -48],
  ], []);

  const deerPositions: [number, number][] = useMemo(() => [
    [-38, -58], [-46, -65], [-52, -50],
  ], []);

  const boarPositions: [number, number][] = useMemo(() => [
    [72, -135], [78, -142], [84, -138],
  ], []);

  const hornbillPositions: [number, number][] = useMemo(() => [
    [-22, 14], [58, -25], [-12, -75],
  ], []);

  const monkeyPositions: [number, number][] = useMemo(() => [
    [32, -18], [42, -22],
  ], []);

  // Relocated goats to lush Sierra Madre grassy pasture hillside
  const goatPositions: [number, number][] = useMemo(() => [
    [68, -48], [75, -54], [62, -42],
  ], []);

  // Monitor lizards basking on riverbank shore rocks
  const lizardPositions: [number, number][] = useMemo(() => [
    [-18, 22], [18, 25],
  ], []);

  return (
    <group>
      {/* 1. Grazing Philippine Carabao (Water Buffalo) */}
      {carabaoPositions.map((pos, i) => (
        <RealisticPhilippineCarabao key={`carabao-${i}`} basePos={pos} seed={i * 1.3 + 0.7} />
      ))}

      {/* 2. Soaring Philippine Eagle (Haring Ibon) above the River Gorge */}
      <RealisticPhilippineEagle orbitCenter={[25, -20]} flightAltitude={65} radius={85} speed={0.13} />
      <RealisticPhilippineEagle orbitCenter={[-20, -60]} flightAltitude={72} radius={70} speed={0.11} />

      {/* 3. Rufous Hornbill (Kalaw) Perched in Canopy */}
      {hornbillPositions.map((pos, i) => (
        <RealisticRufousHornbill key={`hornbill-${i}`} basePos={pos} seed={i * 1.5 + 0.2} />
      ))}

      {/* 4. Philippine Brown Deer Herd */}
      {deerPositions.map((pos, i) => (
        <RealisticPhilippineDeer key={`deer-${i}`} basePos={pos} seed={i * 1.1 + 0.3} />
      ))}

      {/* 5. Wild Boars (Baboy Ramo) Foraging */}
      {boarPositions.map((pos, i) => (
        <RealisticPhilippineWildBoar key={`boar-${i}`} basePos={pos} seed={i * 0.9 + 1.2} />
      ))}

      {/* 6. Long-Tailed Macaques */}
      {monkeyPositions.map((pos, i) => (
        <RealisticPhilippineMacaque key={`monkey-${i}`} basePos={pos} seed={i * 1.4 + 0.5} />
      ))}

      {/* 7. Pasture Goats browsing Sierra Madre Pasture Hill (Safely Outside Compound) */}
      {goatPositions.map((pos, i) => (
        <RealisticPhilippineGoat key={`goat-${i}`} basePos={pos} seed={i * 1.7 + 0.8} />
      ))}

      {/* 8. Philippine Monitor Lizard (Bayawak) near River Rocks */}
      {lizardPositions.map((pos, i) => (
        <RealisticMonitorLizard key={`lizard-${i}`} basePos={pos} seed={i * 2.1 + 0.4} />
      ))}

      {/* 9. Philippine Native Dogs (Aspin / Asong Pinoy) in TEMFACIL Compound & Forest Trails */}
      {/* Dog 1: Golden-Tan Aspin roaming TEMFACIL central courtyard */}
      <RealisticPhilippineAspinDog routeType="TEMFACIL_COURTYARD" color="#D97706" seed={1.0} />
      {/* Dog 2: Black & Tan Aspin patrolling Security Checkpoint Gate */}
      <RealisticPhilippineAspinDog routeType="TEMFACIL_GATE" color="#1E293B" seed={2.5} />
      {/* Dog 3: Brindle Aspin roaming along Warehouse Brown Dirt Road */}
      <RealisticPhilippineAspinDog routeType="WAREHOUSE_RAMP" color="#92400E" seed={3.8} />
      {/* Dog 4: Golden Aspin walking on Sierra Madre Riverside Trail */}
      <RealisticPhilippineAspinDog routeType="FOREST_TRAIL" color="#B45309" seed={4.2} />
    </group>
  );
}
