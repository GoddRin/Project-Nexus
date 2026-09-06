"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";
import {
  MAT_CARABAO_HIDE,
  MAT_HORN_GREY,
  MAT_HORNBILL_BEAK,
  MAT_HORNBILL_RUFOUS,
  MAT_HORNBILL_CASQUE,
  MAT_HORNBILL_BEAK_TIP,
  MAT_HORNBILL_WING_BLACK,
  MAT_HORNBILL_TAIL_WHITE,
  MAT_HORNBILL_ORBITAL,
  MAT_HORNBILL_TALON,
  MAT_TIMBER_STAKE,
  MAT_KALABASA_SKIN,
  MAT_EAGLE_FEATHER,
  MAT_EAGLE_CREST,
} from "./SharedMaterials";
import { registerLivePersonnelPosition, unregisterLivePersonnel } from "./personnelLocations";
import {
  PhilippineCarabaoModel,
  PhilippineEagleModel,
  PhilippineWildBoarModel,
} from "./RealisticBlenderAssets";
import { getSiteSurfaceY } from "./uphillRoadConfig";

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

const MAT_BOAR_BRISTLES = new THREE.MeshStandardMaterial({
  color: "#28201A",
  roughness: 0.88,
  metalness: 0.02,
});
const MAT_BOAR_MANE = new THREE.MeshStandardMaterial({
  color: "#16110D",
  roughness: 0.92,
  metalness: 0.01,
});
const MAT_BOAR_SNOUT = new THREE.MeshStandardMaterial({
  color: "#3D2E25",
  roughness: 0.82,
  metalness: 0.04,
});
const MAT_BOAR_TUSK = new THREE.MeshStandardMaterial({
  color: "#F3EDE3",
  roughness: 0.32,
  metalness: 0.12,
});
const MAT_BOAR_HOOF = new THREE.MeshStandardMaterial({
  color: "#130F0C",
  roughness: 0.65,
  metalness: 0.10,
});
const MAT_CARABAO_HOOF = new THREE.MeshStandardMaterial({
  color: "#1B1C1E",
  roughness: 0.65,
  metalness: 0.12,
});

const scratchWorldPos = new THREE.Vector3();

function useDistanceCull(groupRef: React.RefObject<THREE.Group | null>, maxDist = 175) {
  const { camera } = useThree();
  const maxDistSq = maxDist * maxDist;
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.getWorldPosition(scratchWorldPos);
    const distSq = camera.position.distanceToSquared(scratchWorldPos);
    const inRange = distSq < maxDistSq;
    if (groupRef.current.visible !== inRange) {
      groupRef.current.visible = inRange;
    }
  });
}

function sampleTerrainY(x: number, z: number): number {
  return getSiteSurfaceY(x, z);
}

// ─── 1. PHILIPPINE CARABAO (WATER BUFFALO / KALABAW) ─────────────────────────
function RealisticPhilippineCarabao({
  basePos,
  seed = 0,
  timeMode = "day",
}: {
  basePos: [number, number];
  seed?: number;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 190);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const offsetRef = useRef<number>(seed * 10.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    const t = clock.getElapsedTime() + seed * 6.0;

    const isNight = timeMode === "night";
    const isSunset = timeMode === "sunset";

    if (isNight) {
      // 🌙 Night: Carabao resting/lying down in pasture grass chewing cud
      const posX = basePos[0] + Math.sin(seed * 3) * 1.5;
      const posZ = basePos[1] + Math.cos(seed * 3) * 1.5;
      const groundY = sampleTerrainY(posX, posZ) - 0.38;

      groupRef.current.position.set(posX, groundY, posZ);
      groupRef.current.rotation.y = seed * 2.0;

      // Folded resting legs under belly
      if (legFLRef.current) legFLRef.current.rotation.set(1.2, 0, -0.3);
      if (legFRRef.current) legFRRef.current.rotation.set(1.2, 0, 0.3);
      if (legRLRef.current) legRLRef.current.rotation.set(-1.2, 0, -0.2);
      if (legRRRef.current) legRRRef.current.rotation.set(-1.2, 0, 0.2);

      // Relaxed resting head chewing cud slowly
      if (headRef.current) {
        headRef.current.rotation.x = 0.15 + Math.sin(t * 1.2) * 0.04;
        headRef.current.rotation.y = Math.sin(t * 1.8) * 0.08;
      }
      if (tailRef.current) {
        tailRef.current.rotation.z = Math.sin(t * 1.2) * 0.15;
      }
      return;
    }

    const safeDelta = Math.min(delta, 0.04);
    const isGrazing = isSunset || ((t * 0.12) % 1.0) < 0.65;
    const isWalking = !isGrazing;

    if (isWalking) {
      offsetRef.current += safeDelta * 0.16;
    }

    const radius = 6.5;
    const posX = basePos[0] + Math.sin(offsetRef.current) * radius;
    const posZ = basePos[1] + Math.cos(offsetRef.current) * radius;
    let groundY = sampleTerrainY(posX, posZ);

    // Midday mud wallowing for water buffalo
    const isWallowing = timeMode === "day" && seed > 1.2;
    if (isWallowing) {
      groundY -= 0.25;
    }

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.y = offsetRef.current + Math.PI / 2;

    // Smooth 4-beat quadruped walk cycle
    const walkSpeed = 3.2;
    const walkFL = isWalking ? Math.sin(t * walkSpeed) * 0.32 : 0;
    const walkFR = isWalking ? -Math.sin(t * walkSpeed) * 0.32 : 0;
    const walkRL = isWalking ? -Math.sin(t * walkSpeed) * 0.28 : 0;
    const walkRR = isWalking ? Math.sin(t * walkSpeed) * 0.28 : 0;

    if (legFLRef.current) legFLRef.current.rotation.set(walkFL, 0, 0);
    if (legFRRef.current) legFRRef.current.rotation.set(walkFR, 0, 0);
    if (legRLRef.current) legRLRef.current.rotation.set(walkRL, 0, 0);
    if (legRRRef.current) legRRRef.current.rotation.set(walkRR, 0, 0);

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
      {/* ── High-Fidelity Anatomical Articulated Carabao Mesh (Kalabaw) ── */}
      {/* Muscular Barrel Torso */}
      <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_CARABAO_HIDE}>
        <cylinderGeometry args={[0.56, 0.54, 1.62, 10]} />
      </mesh>
      {/* Muscular Shoulder Withers Hump */}
      <mesh position={[0, 1.10, 0.55]} scale={[0.88, 1.12, 1.0]} material={MAT_CARABAO_HIDE}>
        <sphereGeometry args={[0.52, 8, 8]} />
      </mesh>
      {/* Rump / Flank */}
      <mesh position={[0, 0.94, -0.65]} material={MAT_CARABAO_HIDE}>
        <sphereGeometry args={[0.50, 8, 8]} />
      </mesh>

      {/* Articulated Head, Crescent Horns & Muzzle */}
      <group ref={headRef} position={[0, 1.12, 0.82]}>
        {/* Neck Column */}
        <mesh position={[0, 0.12, 0.18]} rotation={[0.42, 0, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.26, 0.32, 0.55, 8]} />
        </mesh>
        {/* Cranium */}
        <mesh position={[0, 0.32, 0.42]} scale={[0.88, 1.15, 0.92]} material={MAT_CARABAO_HIDE}>
          <sphereGeometry args={[0.26, 8, 8]} />
        </mesh>
        {/* Broad Muzzle & Snout with Nostrils */}
        <mesh position={[0, 0.18, 0.68]} rotation={[0.55, 0, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.16, 0.20, 0.38, 8]} />
        </mesh>
        {/* Left Sweeping Crescent Horn */}
        <mesh position={[-0.40, 0.46, 0.34]} rotation={[0.42, -0.75, -0.55]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.045, 0.095, 0.88, 8]} />
        </mesh>
        {/* Right Sweeping Crescent Horn */}
        <mesh position={[0.40, 0.46, 0.34]} rotation={[0.42, 0.75, 0.55]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.045, 0.095, 0.88, 8]} />
        </mesh>
        {/* Drooping Ears */}
        <mesh position={[-0.32, 0.28, 0.28]} rotation={[0, -0.85, -0.35]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.04, 0.07, 0.28, 5]} />
        </mesh>
        <mesh position={[0.32, 0.28, 0.28]} rotation={[0, 0.85, 0.35]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.04, 0.07, 0.28, 5]} />
        </mesh>
      </group>

      {/* Articulated Swishing Tail */}
      <group ref={tailRef} position={[0, 0.88, -0.70]}>
        <mesh position={[0, -0.28, -0.06]} rotation={[0.22, 0, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.03, 0.04, 0.52, 6]} />
        </mesh>
        {/* Coarse Dark Hair Tuft at Tip */}
        <mesh position={[0, -0.58, -0.12]} rotation={[0.22, 0, 0]} material={MAT_CARABAO_HOOF}>
          <sphereGeometry args={[0.07, 6, 6]} />
        </mesh>
      </group>

      {/* 4 Articulated Strong Quadruped Legs */}
      {/* Front Left Leg */}
      <group ref={legFLRef} position={[-0.34, 0.72, 0.48]}>
        <mesh position={[0, -0.18, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.38, 7]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.08, 0.065, 0.34, 7]} />
        </mesh>
        <mesh position={[0, -0.66, 0.02]} material={MAT_CARABAO_HOOF}>
          <boxGeometry args={[0.13, 0.08, 0.15]} />
        </mesh>
      </group>
      {/* Front Right Leg */}
      <group ref={legFRRef} position={[0.34, 0.72, 0.48]}>
        <mesh position={[0, -0.18, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.12, 0.09, 0.38, 7]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.08, 0.065, 0.34, 7]} />
        </mesh>
        <mesh position={[0, -0.66, 0.02]} material={MAT_CARABAO_HOOF}>
          <boxGeometry args={[0.13, 0.08, 0.15]} />
        </mesh>
      </group>
      {/* Rear Left Leg */}
      <group ref={legRLRef} position={[-0.30, 0.72, -0.48]}>
        <mesh position={[0, -0.18, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.13, 0.09, 0.38, 7]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.08, 0.065, 0.34, 7]} />
        </mesh>
        <mesh position={[0, -0.66, 0.02]} material={MAT_CARABAO_HOOF}>
          <boxGeometry args={[0.13, 0.08, 0.15]} />
        </mesh>
      </group>
      {/* Rear Right Leg */}
      <group ref={legRRRef} position={[0.30, 0.72, -0.48]}>
        <mesh position={[0, -0.18, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.13, 0.09, 0.38, 7]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={MAT_CARABAO_HIDE}>
          <cylinderGeometry args={[0.08, 0.065, 0.34, 7]} />
        </mesh>
        <mesh position={[0, -0.66, 0.02]} material={MAT_CARABAO_HOOF}>
          <boxGeometry args={[0.13, 0.08, 0.15]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 2. SOARING PHILIPPINE EAGLE (HARING IBON) ──────────────────────────────
function RealisticPhilippineEagle({
  orbitCenter,
  flightAltitude = 68,
  radius = 80,
  speed = 0.14,
  timeMode = "day",
}: {
  orbitCenter: [number, number];
  flightAltitude?: number;
  radius?: number;
  speed?: number;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 240);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const progressRef = useRef<number>(Math.random() * Math.PI * 2);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    const t = clock.getElapsedTime();

    if (timeMode === "night") {
      // 🌙 Night: Perched asleep in high mountain cliff nest
      const roostX = orbitCenter[0] + Math.sin(progressRef.current) * (radius * 0.4);
      const roostZ = orbitCenter[1] + Math.cos(progressRef.current) * (radius * 0.4);
      const roostY = sampleTerrainY(roostX, roostZ) + 14.0;
      groupRef.current.position.set(roostX, roostY, roostZ);
      groupRef.current.rotation.set(0, progressRef.current, 0);
      if (leftWingRef.current) leftWingRef.current.rotation.z = -0.08;
      if (rightWingRef.current) rightWingRef.current.rotation.z = 0.08;
      if (headRef.current) {
        headRef.current.rotation.x = 0.32 + Math.sin(t * 1.0) * 0.02; // Tucked head
        headRef.current.rotation.y = 0;
      }
      return;
    }

    const safeDelta = Math.min(delta, 0.04);
    const effectiveAlt = timeMode === "sunset" ? flightAltitude * 0.68 : flightAltitude;
    const effectiveSpeed = timeMode === "sunset" ? speed * 0.75 : speed;
    progressRef.current += effectiveSpeed * safeDelta;

    const posX = orbitCenter[0] + Math.sin(progressRef.current) * radius;
    const posZ = orbitCenter[1] + Math.cos(progressRef.current) * radius;
    const waveY = Math.sin(t * 0.35) * 3.5;

    groupRef.current.position.set(posX, effectiveAlt + waveY, posZ);
    groupRef.current.rotation.y = progressRef.current + Math.PI / 2;
    groupRef.current.rotation.z = -0.22; // Inward bank into thermals

    // Thermal gliding interspersed with soaring wing beats
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
      {/* ── High-Fidelity Sculpted Blender 5.2 Philippine Eagle Mesh (Haring Ibon) ── */}
      <PhilippineEagleModel scale={[1.15, 1.15, 1.15]} />
    </group>
  );
}

// ─── 3. SIERRA MADRE RUFOUS HORNBILL (KALAW / BUCEROS HYDROCORAX) ─────────────
function RealisticRufousHornbill({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const birdRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  
  // Exact physical terrain ground contact height
  const groundY = useMemo(() => sampleTerrainY(basePos[0], basePos[1]), [basePos]);
  const perchHeight = 2.4; // Height of ancient ironwood snag perch branch above ground

  useFrame(({ clock }) => {
    if (!groupRef.current || !groupRef.current.visible || !birdRef.current) return;
    const t = clock.getElapsedTime() + seed * 4.2;

    // Organic avian breathing and body sway
    const breath = Math.sin(t * 1.6) * 0.015;
    birdRef.current.position.y = perchHeight + breath;
    birdRef.current.rotation.y = Math.sin(t * 0.4) * 0.18 + seed * 0.8;

    // Alert head cocking, preening, and call gestures
    if (headRef.current) {
      const isCalling = Math.sin(t * 0.18) > 0.72;
      if (isCalling) {
        // Throat tilt back for loud resonance call
        headRef.current.rotation.x = -0.28 + Math.sin(t * 6.0) * 0.06;
        headRef.current.rotation.y = Math.sin(t * 1.5) * 0.10;
      } else {
        // Inquisitive head pivots looking around the rainforest canopy
        const twitchT = Math.floor(t * 0.8);
        const twitchPhase = (t * 0.8) - twitchT;
        const targetYaw = Math.sin(twitchT * 2.3) * 0.55;
        const targetPitch = Math.cos(twitchT * 1.7) * 0.15;
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetYaw, 0.15);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.08 + targetPitch, 0.15);
      }
    }

    // Counterbalancing tail flick
    if (tailRef.current) {
      tailRef.current.rotation.x = 0.42 + Math.sin(t * 1.6) * 0.08;
      tailRef.current.rotation.z = Math.sin(t * 0.8) * 0.05;
    }

    // Wing twitch / subtle wing flutter
    const isFluffing = Math.sin(t * 0.25) > 0.82;
    const wingAngle = isFluffing ? Math.sin(t * 8.0) * 0.12 : 0;
    if (leftWingRef.current) leftWingRef.current.rotation.z = wingAngle;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -wingAngle;
  });

  return (
    <group ref={groupRef} position={[basePos[0], groundY, basePos[1]]}>
      {/* ═══ 1. GROUNDED ANCIENT SIERRA MADRE TIMBER SNAG & PERCH BRANCH ═══ */}
      {/* Root Base firmly anchored into the dirt */}
      <mesh position={[0, 0.25, 0]} material={MAT_TIMBER_STAKE}>
        <cylinderGeometry args={[0.22, 0.32, 0.5, 7]} />
      </mesh>
      {/* Main Weathered Snag Trunk rising from ground */}
      <mesh position={[0, perchHeight * 0.5, 0]} rotation={[0.04, 0.2, -0.06]} material={MAT_TIMBER_STAKE}>
        <cylinderGeometry args={[0.14, 0.22, perchHeight, 7]} />
      </mesh>
      {/* Moss & Lichen Ring Patches on Trunk */}
      <mesh position={[0, perchHeight * 0.65, 0]} material={MAT_KALABASA_SKIN}>
        <cylinderGeometry args={[0.15, 0.16, 0.35, 6]} />
      </mesh>
      {/* Horizontal Perch Branch Bark */}
      <mesh position={[0.22, perchHeight - 0.05, 0]} rotation={[0, 0, Math.PI / 2.2]} material={MAT_TIMBER_STAKE}>
        <cylinderGeometry args={[0.07, 0.09, 0.75, 6]} />
      </mesh>
      {/* Side Branch Spur */}
      <mesh position={[-0.18, perchHeight * 0.75, 0.1]} rotation={[0.4, 0.3, -0.7]} material={MAT_TIMBER_STAKE}>
        <cylinderGeometry args={[0.04, 0.06, 0.45, 5]} />
      </mesh>

      {/* ═══ 2. ANATOMICALLY DETAILED RUFOUS HORNBILL (KALAW) ═══ */}
      <group ref={birdRef} position={[0.18, perchHeight, 0]}>
        {/* Scaled Talons tightly grasping the branch */}
        <group position={[0, -0.02, 0]}>
          {/* Left Talon */}
          <group position={[-0.07, 0, 0.02]}>
            <mesh position={[0, 0.04, 0]} material={MAT_HORNBILL_TALON}>
              <cylinderGeometry args={[0.022, 0.025, 0.10, 5]} />
            </mesh>
            <mesh position={[0, -0.02, 0.04]} rotation={[0.5, 0, 0]} material={MAT_HORNBILL_TALON}>
              <cylinderGeometry args={[0.012, 0.008, 0.08, 4]} />
            </mesh>
          </group>
          {/* Right Talon */}
          <group position={[0.07, 0, 0.02]}>
            <mesh position={[0, 0.04, 0]} material={MAT_HORNBILL_TALON}>
              <cylinderGeometry args={[0.022, 0.025, 0.10, 5]} />
            </mesh>
            <mesh position={[0, -0.02, 0.04]} rotation={[0.5, 0, 0]} material={MAT_HORNBILL_TALON}>
              <cylinderGeometry args={[0.012, 0.008, 0.08, 4]} />
            </mesh>
          </group>
        </group>

        {/* Robust Aerodynamic Rufous-Chestnut Body */}
        <mesh position={[0, 0.26, -0.02]} rotation={[0.35, 0, 0]} material={MAT_HORNBILL_RUFOUS}>
          <cylinderGeometry args={[0.16, 0.13, 0.58, 8]} />
        </mesh>
        {/* Soft Feathered Breast Contour */}
        <mesh position={[0, 0.32, 0.11]} material={MAT_HORNBILL_RUFOUS}>
          <sphereGeometry args={[0.16, 8, 8]} />
        </mesh>
        {/* Dark Feather Mantle Upper Back */}
        <mesh position={[0, 0.34, -0.08]} material={MAT_HORNBILL_WING_BLACK}>
          <sphereGeometry args={[0.15, 8, 8]} />
        </mesh>

        {/* Folded Wings with Secondary & Primary Feather Flights */}
        <group ref={leftWingRef} position={[-0.14, 0.28, -0.02]}>
          <mesh position={[-0.04, -0.08, -0.10]} rotation={[0.32, 0.08, -0.1]} material={MAT_HORNBILL_WING_BLACK}>
            <boxGeometry args={[0.06, 0.38, 0.24]} />
          </mesh>
        </group>
        <group ref={rightWingRef} position={[0.14, 0.28, -0.02]}>
          <mesh position={[0.04, -0.08, -0.10]} rotation={[0.32, -0.08, 0.1]} material={MAT_HORNBILL_WING_BLACK}>
            <boxGeometry args={[0.06, 0.38, 0.24]} />
          </mesh>
        </group>

        {/* Long Banded Tail (Broad White with Jet-Black Central Band) */}
        <group ref={tailRef} position={[0, 0.08, -0.22]}>
          {/* Upper Black Band */}
          <mesh position={[0, -0.15, -0.14]} rotation={[0.5, 0, 0]} material={MAT_HORNBILL_WING_BLACK}>
            <boxGeometry args={[0.18, 0.28, 0.03]} />
          </mesh>
          {/* Main White Tail Feathers */}
          <mesh position={[0, -0.38, -0.30]} rotation={[0.5, 0, 0]} material={MAT_HORNBILL_TAIL_WHITE}>
            <boxGeometry args={[0.20, 0.36, 0.03]} />
          </mesh>
        </group>

        {/* Sculpted Head, Scarlet Casque & Ivory Downcurved Bill */}
        <group ref={headRef} position={[0, 0.56, 0.12]}>
          {/* Cranium */}
          <mesh position={[0, 0, 0]} material={MAT_HORNBILL_RUFOUS}>
            <sphereGeometry args={[0.14, 8, 8]} />
          </mesh>
          {/* Black Throat Bib / Chin */}
          <mesh position={[0, -0.08, 0.06]} material={MAT_HORNBILL_WING_BLACK}>
            <boxGeometry args={[0.12, 0.08, 0.10]} />
          </mesh>

          {/* Massive Crimson-Scarlet Casque Ridge */}
          <group position={[0, 0.12, 0.06]}>
            <mesh position={[0, 0.04, 0]} rotation={[-0.15, 0, 0]} material={MAT_HORNBILL_CASQUE}>
              <boxGeometry args={[0.10, 0.16, 0.36]} />
            </mesh>
            {/* Casque Forward Crest Tip */}
            <mesh position={[0, 0.08, 0.14]} rotation={[-0.35, 0, 0]} material={MAT_HORNBILL_CASQUE}>
              <coneGeometry args={[0.06, 0.18, 6]} />
            </mesh>
          </group>

          {/* Heavy Curved Hornbill Beak (Scarlet base blending to ivory tip) */}
          <group position={[0, -0.02, 0.22]}>
            {/* Upper Mandible (Crimson base) */}
            <mesh position={[0, 0.02, 0.06]} rotation={[0.28, 0, 0]} material={MAT_HORNBILL_CASQUE}>
              <coneGeometry args={[0.085, 0.26, 6]} />
            </mesh>
            {/* Lower Mandible Tip (Ivory Yellow) */}
            <mesh position={[0, -0.06, 0.22]} rotation={[0.42, 0, 0]} material={MAT_HORNBILL_BEAK_TIP}>
              <coneGeometry args={[0.06, 0.24, 6]} />
            </mesh>
          </group>

          {/* Vivid Yellow Orbital Eye Rings & Pupils */}
          {/* Left Eye */}
          <group position={[-0.10, 0.03, 0.05]}>
            <mesh material={MAT_HORNBILL_ORBITAL}>
              <sphereGeometry args={[0.035, 6, 6]} />
            </mesh>
            <mesh position={[-0.015, 0, 0]} material={MAT_HORNBILL_WING_BLACK}>
              <sphereGeometry args={[0.02, 6, 6]} />
            </mesh>
          </group>
          {/* Right Eye */}
          <group position={[0.10, 0.03, 0.05]}>
            <mesh material={MAT_HORNBILL_ORBITAL}>
              <sphereGeometry args={[0.035, 6, 6]} />
            </mesh>
            <mesh position={[0.015, 0, 0]} material={MAT_HORNBILL_WING_BLACK}>
              <sphereGeometry args={[0.02, 6, 6]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ─── 4. PHILIPPINE BROWN DEER (OSA / RUSA MARIANNA) ──────────────────────────
function RealisticPhilippineDeer({
  basePos,
  seed = 1.0,
  timeMode = "day",
}: {
  basePos: [number, number];
  seed?: number;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const headRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const groundY = useMemo(() => sampleTerrainY(basePos[0], basePos[1]), [basePos]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !groupRef.current.visible || !headRef.current) return;
    const t = clock.getElapsedTime() + seed * 4.5;

    if (timeMode === "night") {
      // 🌙 Night: Deer bedded down resting in thick brush
      groupRef.current.position.set(basePos[0], groundY - 0.42, basePos[1]);
      groupRef.current.rotation.set(0, seed * 1.5, 0);

      if (headRef.current) {
        headRef.current.rotation.x = 0.25 + Math.sin(t * 1.0) * 0.03;
        headRef.current.rotation.y = Math.sin(t * 0.6) * 0.08;
      }
      if (legFLRef.current) legFLRef.current.rotation.set(1.2, 0, -0.3);
      if (legFRRef.current) legFRRef.current.rotation.set(1.2, 0, 0.3);
      if (legRLRef.current) legRLRef.current.rotation.set(-1.2, 0, -0.2);
      if (legRRRef.current) legRRRef.current.rotation.set(-1.2, 0, 0.2);
      return;
    }

    groupRef.current.position.set(basePos[0], groundY, basePos[1]);

    const isCrepuscular = timeMode === "morning" || timeMode === "sunset";
    const isAlert = isCrepuscular ? Math.sin(t * 0.35) > 0.4 : Math.sin(t * 0.22) > 0.35;

    if (isAlert) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.32, 0.08);
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.38;
      // Standing alert
      if (legFLRef.current) legFLRef.current.rotation.set(0, 0, 0);
      if (legFRRef.current) legFRRef.current.rotation.set(0, 0, 0);
      if (legRLRef.current) legRLRef.current.rotation.set(0, 0, 0);
      if (legRRRef.current) legRRRef.current.rotation.set(0, 0, 0);
    } else {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.38, 0.08);
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.12;
      // Gentle weight shift step
      const step = Math.sin(t * 1.8) * 0.12;
      if (legFLRef.current) legFLRef.current.rotation.set(step, 0, 0);
      if (legFRRef.current) legFRRef.current.rotation.set(-step, 0, 0);
      if (legRLRef.current) legRLRef.current.rotation.set(-step, 0, 0);
      if (legRRRef.current) legRRRef.current.rotation.set(step, 0, 0);
    }
  });

  return (
    <group ref={groupRef} position={[basePos[0], groundY, basePos[1]]}>
      {/* Slender Deer Torso */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.26, 0.22, 1.15, 8]} />
        <meshStandardMaterial color="#6E3B16" roughness={0.8} />
      </mesh>
      {/* Rump */}
      <mesh position={[0, 0.92, -0.45]}>
        <sphereGeometry args={[0.26, 7, 7]} />
        <meshStandardMaterial color="#5C3112" roughness={0.8} />
      </mesh>

      {/* Head with Branched Antlers */}
      <group ref={headRef} position={[0, 1.2, 0.45]}>
        <mesh position={[0, 0.22, 0.14]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.48, 6]} />
          <meshStandardMaterial color="#6E3B16" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.35, 0.35]} rotation={[-0.4, 0, 0]}>
          <coneGeometry args={[0.11, 0.34, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.8} />
        </mesh>
        {/* Left Antler */}
        <mesh position={[-0.14, 0.65, 0.12]} rotation={[0.2, -0.3, -0.35]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.02, 0.04, 0.55, 5]} />
        </mesh>
        {/* Right Antler */}
        <mesh position={[0.14, 0.65, 0.12]} rotation={[0.2, 0.3, 0.35]} material={MAT_HORN_GREY}>
          <cylinderGeometry args={[0.02, 0.04, 0.55, 5]} />
        </mesh>
      </group>

      {/* Articulated Slender Legs */}
      <group ref={legFLRef} position={[-0.14, 0.85, 0.38]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.14, 0.85, 0.38]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.13, 0.85, -0.38]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.13, 0.85, -0.38]}>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.045, 0.03, 0.85, 6]} />
          <meshStandardMaterial color="#4A2509" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 5. PHILIPPINE WILD BOAR (BABOY RAMO / SUS PHILIPPENSIS) ─────────────────
function RealisticPhilippineWildBoar({
  basePos,
  seed = 1.0,
  timeMode = "day",
}: {
  basePos: [number, number];
  seed?: number;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const offsetRef = useRef<number>(seed * 8.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !groupRef.current.visible) return;
    const t = clock.getElapsedTime() + seed * 5.0;
    const safeDelta = Math.min(delta, 0.04);

    const isNight = timeMode === "night";

    if (isNight) {
      // 🌙 Night: Boars bed down in forest brush or slow nocturnal foraging
      const posX = basePos[0];
      const posZ = basePos[1];
      const groundY = sampleTerrainY(posX, posZ) - 0.22;
      groupRef.current.position.set(posX, groundY, posZ);
      groupRef.current.rotation.set(0, seed * 2.5, 0);

      if (headRef.current) {
        headRef.current.rotation.set(0.12 + Math.sin(t * 1.0) * 0.03, 0, 0);
      }
      if (tailRef.current) {
        tailRef.current.rotation.z = Math.sin(t * 1.5) * 0.15;
      }
      if (legFLRef.current) legFLRef.current.rotation.set(1.1, 0, -0.2);
      if (legFRRef.current) legFRRef.current.rotation.set(1.1, 0, 0.2);
      if (legRLRef.current) legRLRef.current.rotation.set(-1.1, 0, -0.15);
      if (legRRRef.current) legRRRef.current.rotation.set(-1.1, 0, 0.15);
      return;
    }

    // ☀️ Daytime / Morning / Sunset: Active energetic foraging along forest verges
    // Rooting phase (snout digging in soil for roots, tubers, fallen fruits)
    const isRooting = ((t * 0.18 + seed) % 1.0) < 0.45;
    if (!isRooting) {
      offsetRef.current += safeDelta * 0.15;
    }

    const radius = 5.5 + Math.sin(seed * 2.0) * 1.5;
    const posX = basePos[0] + Math.sin(offsetRef.current) * radius;
    const posZ = basePos[1] + Math.cos(offsetRef.current) * radius;
    const groundY = sampleTerrainY(posX, posZ);

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.y = offsetRef.current + Math.PI / 2;

    // Head rooting and sniffing motion
    if (headRef.current) {
      if (isRooting) {
        // Deep snout rooting into ground
        headRef.current.rotation.x = 0.42 + Math.sin(t * 6.5) * 0.10;
        headRef.current.rotation.y = Math.sin(t * 3.5) * 0.14;
      } else {
        // Alert trotting head bob
        headRef.current.rotation.x = 0.05 + Math.sin(t * 4.2) * 0.06;
        headRef.current.rotation.y = Math.sin(t * 1.2) * 0.12;
      }
    }

    // Dynamic 4-beat diagonal walking trot cycle
    const walkSpeed = 4.4;
    const step = !isRooting ? Math.sin(t * walkSpeed) * 0.38 : Math.sin(t * 2.0) * 0.06;
    if (legFLRef.current) legFLRef.current.rotation.set(step, 0, 0);
    if (legFRRef.current) legFRRef.current.rotation.set(-step, 0, 0);
    if (legRLRef.current) legRLRef.current.rotation.set(-step, 0, 0);
    if (legRRRef.current) legRRRef.current.rotation.set(step, 0, 0);

    // Dynamic tail flicking & wagging
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 5.5) * 0.40;
      tailRef.current.rotation.x = 0.25 + Math.cos(t * 3.8) * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── High-Fidelity Anatomical Articulated Philippine Wild Boar (Baboy Ramo) ── */}
      {/* Muscular Barrel Torso */}
      <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_BOAR_BRISTLES}>
        <cylinderGeometry args={[0.26, 0.23, 0.76, 8]} />
      </mesh>
      {/* High Arched Shoulder Withers Hump */}
      <mesh position={[0, 0.56, 0.22]} scale={[0.88, 1.18, 1.0]} material={MAT_BOAR_BRISTLES}>
        <sphereGeometry args={[0.27, 8, 8]} />
      </mesh>
      {/* Rump / Flank */}
      <mesh position={[0, 0.48, -0.28]} material={MAT_BOAR_BRISTLES}>
        <sphereGeometry args={[0.24, 8, 8]} />
      </mesh>
      {/* Dark Dorsal Bristle Mane along Spine */}
      <mesh position={[0, 0.64, 0.05]} material={MAT_BOAR_MANE}>
        <boxGeometry args={[0.05, 0.10, 0.65]} />
      </mesh>

      {/* Articulated Head, Snout, Warty Bosses & Ivory Tusks */}
      <group ref={headRef} position={[0, 0.50, 0.35]}>
        {/* Wedge-Shaped Cranium and Snout */}
        <mesh position={[0, 0.08, 0.22]} rotation={[0.42, 0, 0]} material={MAT_BOAR_BRISTLES}>
          <coneGeometry args={[0.16, 0.42, 8]} />
        </mesh>
        {/* Cartilaginous Snout Disc with Nostrils */}
        <mesh position={[0, -0.05, 0.42]} rotation={[0.42, 0, 0]} material={MAT_BOAR_SNOUT}>
          <cylinderGeometry args={[0.065, 0.065, 0.03, 8]} />
        </mesh>
        {/* Nostril Cavities */}
        {[-0.022, 0.022].map((xN, i) => (
          <mesh key={`nostril-${i}`} position={[xN, -0.05, 0.435]} material={MAT_BOAR_MANE}>
            <sphereGeometry args={[0.012, 5, 5]} />
          </mesh>
        ))}
        {/* Warty Cheek Bosses (Sus philippensis characteristic) */}
        <mesh position={[-0.14, 0.04, 0.22]} material={MAT_BOAR_SNOUT}>
          <sphereGeometry args={[0.04, 6, 6]} />
        </mesh>
        <mesh position={[0.14, 0.04, 0.22]} material={MAT_BOAR_SNOUT}>
          <sphereGeometry args={[0.04, 6, 6]} />
        </mesh>
        {/* Left Curved Ivory Upward Tusk */}
        <mesh position={[-0.09, -0.01, 0.32]} rotation={[-0.45, -0.35, -0.45]} material={MAT_BOAR_TUSK}>
          <coneGeometry args={[0.018, 0.12, 6]} />
        </mesh>
        {/* Right Curved Ivory Upward Tusk */}
        <mesh position={[0.09, -0.01, 0.32]} rotation={[-0.45, 0.35, 0.45]} material={MAT_BOAR_TUSK}>
          <coneGeometry args={[0.018, 0.12, 6]} />
        </mesh>
        {/* Pointed Alert Ears */}
        <mesh position={[-0.13, 0.22, 0.08]} rotation={[-0.2, -0.3, -0.35]} material={MAT_BOAR_BRISTLES}>
          <coneGeometry args={[0.045, 0.14, 5]} />
        </mesh>
        <mesh position={[0.13, 0.22, 0.08]} rotation={[-0.2, 0.3, 0.35]} material={MAT_BOAR_BRISTLES}>
          <coneGeometry args={[0.045, 0.14, 5]} />
        </mesh>
        {/* Beady Specular Eyes */}
        <mesh position={[-0.10, 0.12, 0.15]} material={MAT_BOAR_MANE}>
          <sphereGeometry args={[0.018, 6, 6]} />
        </mesh>
        <mesh position={[0.10, 0.12, 0.15]} material={MAT_BOAR_MANE}>
          <sphereGeometry args={[0.018, 6, 6]} />
        </mesh>
      </group>

      {/* Articulated Swishing Bristled Tail */}
      <group ref={tailRef} position={[0, 0.46, -0.34]}>
        <mesh position={[0, -0.12, -0.05]} rotation={[0.3, 0, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.018, 0.018, 0.24, 5]} />
        </mesh>
        <mesh position={[0, -0.24, -0.08]} material={MAT_BOAR_MANE}>
          <sphereGeometry args={[0.035, 6, 6]} />
        </mesh>
      </group>

      {/* 4 Articulated Quadruped Legs with Cloven Hooves */}
      {/* Front Left Leg */}
      <group ref={legFLRef} position={[-0.18, 0.36, 0.22]}>
        <mesh position={[0, -0.09, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.075, 0.055, 0.20, 6]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.045, 0.035, 0.16, 6]} />
        </mesh>
        <mesh position={[0, -0.34, 0.01]} material={MAT_BOAR_HOOF}>
          <boxGeometry args={[0.07, 0.04, 0.08]} />
        </mesh>
      </group>
      {/* Front Right Leg */}
      <group ref={legFRRef} position={[0.18, 0.36, 0.22]}>
        <mesh position={[0, -0.09, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.075, 0.055, 0.20, 6]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.045, 0.035, 0.16, 6]} />
        </mesh>
        <mesh position={[0, -0.34, 0.01]} material={MAT_BOAR_HOOF}>
          <boxGeometry args={[0.07, 0.04, 0.08]} />
        </mesh>
      </group>
      {/* Rear Left Leg */}
      <group ref={legRLRef} position={[-0.16, 0.36, -0.22]}>
        <mesh position={[0, -0.09, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.075, 0.055, 0.20, 6]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.045, 0.035, 0.16, 6]} />
        </mesh>
        <mesh position={[0, -0.34, 0.01]} material={MAT_BOAR_HOOF}>
          <boxGeometry args={[0.07, 0.04, 0.08]} />
        </mesh>
      </group>
      {/* Rear Right Leg */}
      <group ref={legRRRef} position={[0.16, 0.36, -0.22]}>
        <mesh position={[0, -0.09, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.075, 0.055, 0.20, 6]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={MAT_BOAR_BRISTLES}>
          <cylinderGeometry args={[0.045, 0.035, 0.16, 6]} />
        </mesh>
        <mesh position={[0, -0.34, 0.01]} material={MAT_BOAR_HOOF}>
          <boxGeometry args={[0.07, 0.04, 0.08]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 6. PHILIPPINE LONG-TAILED MACAQUE (UNGGOY) ──────────────────────────────
function RealisticPhilippineMacaque({ basePos, seed = 1.0 }: { basePos: [number, number]; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !groupRef.current.visible) return;
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
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#6B4B35" roughness={0.9} />
      </mesh>
      {/* Head */}
      <group ref={headRef} position={[0, 0.54, 0.1]}>
        <mesh>
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
  useDistanceCull(groupRef, 175);
  const headRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<number>(seed * 8.0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !groupRef.current.visible || !headRef.current) return;
    const t = clock.getElapsedTime() + seed * 4.0;
    
    const safeDelta = Math.min(delta, 0.04);
    const isWalking = Math.sin(t * 0.18) > 0.2;
    if (isWalking) {
      offsetRef.current += safeDelta * 0.09;
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
      <mesh position={[0, 0.50, 0]}>
        <boxGeometry args={[0.32, 0.34, 0.65]} />
        <meshStandardMaterial color={seed % 2 === 0 ? "#F8FAFC" : "#78350F"} roughness={0.85} />
      </mesh>
      {/* Head & Horns */}
      <group ref={headRef} position={[0, 0.65, 0.35]}>
        <mesh position={[0, 0.1, 0.15]} rotation={[-0.4, 0, 0]}>
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
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.12, 0.50, 0.22]}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.12, 0.50, -0.22]}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.12, 0.50, -0.22]}>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.025, 0.5, 5]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 8. PHILIPPINE MONITOR LIZARD (BAYAWAK) ──────────────────────────────────
function RealisticMonitorLizard({
  basePos,
  seed = 1.0,
  timeMode = "day",
}: {
  basePos: [number, number];
  seed?: number;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const tailRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !groupRef.current.visible) return;
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
      <mesh position={[0, 0.06, 0]} scale={[1.4, 0.5, 2.2]}>
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
      <mesh position={[0, 0.08, 0.4]} rotation={[0.2, 0, 0]}>
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
  personnelId,
  onSelectPerson,
  timeMode = "day",
}: {
  routeType?: "TEMFACIL_COURTYARD" | "TEMFACIL_GATE" | "FOREST_TRAIL" | "WAREHOUSE_RAMP";
  color?: string;
  seed?: number;
  personnelId?: string;
  onSelectPerson?: (id: string) => void;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 175);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legFLRef = useRef<THREE.Group>(null);
  const legFRRef = useRef<THREE.Group>(null);
  const legRLRef = useRef<THREE.Group>(null);
  const legRRRef = useRef<THREE.Group>(null);

  const progressRef = useRef<number>(seed * 0.25);
  const scratchDogWorldPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    return () => {
      if (personnelId) {
        unregisterLivePersonnel(personnelId);
      }
    };
  }, [personnelId]);


  // Dynamic patrol waypoints
  const waypoints = useMemo(() => {
    if (routeType === "TEMFACIL_COURTYARD") {
      // Roaming through the central courtyard between Office, Basketball Court & Staff Houses
      return [
        new THREE.Vector3(112, 14.15, -88),
        new THREE.Vector3(124, 14.15, -82),
        new THREE.Vector3(132, 14.15, -89),
        new THREE.Vector3(120, 14.15, -94),
      ];
    } else if (routeType === "TEMFACIL_GATE") {
      // Patrolling around the Main Security Guardhouse and entrance barrier
      return [
        new THREE.Vector3(98, 14.15, -77),
        new THREE.Vector3(95, 14.15, -74),
        new THREE.Vector3(101, 14.15, -80),
        new THREE.Vector3(94, 14.15, -78),
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
    if (!groupRef.current || !groupRef.current.visible) return;
    const t = clock.getElapsedTime() + seed * 3.5;

    if (timeMode === "night") {
      // 🌙 Night: Dogs resting or sleeping in their sheltered spots
      if (routeType === "WAREHOUSE_RAMP") {
        // Brunson Chu Chu sleeping comfortably on his warehouse concrete pad
        groupRef.current.position.set(91.2, 14.85 - 0.16, -96.2);
        groupRef.current.rotation.set(0, Math.PI / 5, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (tailRef.current) tailRef.current.rotation.set(0.2, Math.sin(t * 1.2) * 0.1, 0);
        if (legFLRef.current) legFLRef.current.rotation.set(1.2, 0, -0.3);
        if (legFRRef.current) legFRRef.current.rotation.set(1.2, 0, 0.3);
        if (legRLRef.current) legRLRef.current.rotation.set(-1.2, 0, -0.2);
        if (legRRRef.current) legRRRef.current.rotation.set(-1.2, 0, 0.2);

        if (personnelId && groupRef.current) {
          groupRef.current.getWorldPosition(scratchDogWorldPos);
          registerLivePersonnelPosition(personnelId, scratchDogWorldPos, groupRef.current);
        }
        return;
      } else if (routeType === "TEMFACIL_GATE") {
        // Gate dog sits alertly beside sentry guard
        groupRef.current.position.set(96.2, 14.15, -77.2);
        groupRef.current.rotation.set(0, -Math.PI / 3, 0);
        if (headRef.current) {
          headRef.current.rotation.x = 0.08 + Math.sin(t * 1.5) * 0.04;
          headRef.current.rotation.y = Math.sin(t * 0.8) * 0.2;
        }
        if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 3.0) * 0.2;
        if (legFLRef.current) legFLRef.current.rotation.set(0, 0, 0);
        if (legFRRef.current) legFRRef.current.rotation.set(0, 0, 0);
        if (legRLRef.current) legRLRef.current.rotation.set(-0.8, 0, 0);
        if (legRRRef.current) legRRRef.current.rotation.set(-0.8, 0, 0);
        return;
      } else if (routeType === "TEMFACIL_COURTYARD") {
        // Courtyard dog sleeping under staff house veranda
        groupRef.current.position.set(118.0, 14.15 - 0.16, -92.5);
        groupRef.current.rotation.set(0, 0.4, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (legFLRef.current) legFLRef.current.rotation.set(1.2, 0, -0.3);
        if (legFRRef.current) legFRRef.current.rotation.set(1.2, 0, 0.3);
        if (legRLRef.current) legRLRef.current.rotation.set(-1.2, 0, -0.2);
        if (legRRRef.current) legRRRef.current.rotation.set(-1.2, 0, 0.2);
        return;
      }
    }

    const safeDelta = Math.min(delta, 0.04);
    // Aspin natural movement: calm walking / trotting with occasional sniffing pause
    const isSniffing = Math.sin(t * 0.35) > 0.65;
    const baseWalkSpeed = routeType === "TEMFACIL_COURTYARD" ? 0.022 : routeType === "TEMFACIL_GATE" ? 0.016 : 0.018;
    const sniffSpeed = routeType === "TEMFACIL_COURTYARD" ? 0.004 : 0.003;
    const walkSpeed = isSniffing ? sniffSpeed : baseWalkSpeed;
    progressRef.current = (progressRef.current + safeDelta * walkSpeed) % 1.0;

    const pt = curve.getPointAt(progressRef.current);
    const tangent = curve.getTangentAt(progressRef.current);

    if (routeType === "WAREHOUSE_RAMP") {
      // 🐕 Brunson Chuchu Realistic Site Guard Station (Clean concrete apron beside Sir Vincent)
      // Stationary alert guarding pose, head tracking, wagging tail, zero clipping through walls!
      const brunsonX = 91.2;
      const brunsonZ = -96.2;
      const groundY = 14.85;
      const yaw = Math.PI / 5; // Alertly facing the road and gate entrance

      groupRef.current.position.set(brunsonX, groundY, brunsonZ);
      groupRef.current.rotation.set(0, yaw, 0);

      // Live world position registration for Brunson Chuchu
      if (personnelId && groupRef.current) {
        groupRef.current.getWorldPosition(scratchDogWorldPos);
        registerLivePersonnelPosition(personnelId, scratchDogWorldPos, groupRef.current);
      }

      // Alert, lifelike head and snout movements (watching trucks, sniffing breeze)
      if (headRef.current) {
        const lookAround = Math.sin(t * 0.8) * 0.22 + Math.sin(t * 2.1) * 0.08;
        const sniffPitch = Math.sin(t * 3.5) * 0.06;
        headRef.current.rotation.y = lookAround;
        headRef.current.rotation.x = 0.12 + sniffPitch;
      }

      // Friendly curled tail wagging
      if (tailRef.current) {
        tailRef.current.rotation.y = Math.sin(t * 6.5) * 0.40;
        tailRef.current.rotation.x = 0.50 + Math.sin(t * 3.0) * 0.08;
      }

      // Relaxed seated / alert paws
      if (legFLRef.current) legFLRef.current.rotation.x = 0;
      if (legFRRef.current) legFRRef.current.rotation.x = 0;
      if (legRLRef.current) legRLRef.current.rotation.x = 0;
      if (legRRRef.current) legRRRef.current.rotation.x = 0;
      return;
    }

    // Height calculation: directly sample true terrain height for 100% ground contact
    const groundY = sampleTerrainY(pt.x, pt.z);

    const yaw = Math.atan2(tangent.x, tangent.z);
    groupRef.current.position.set(pt.x, groundY, pt.z);
    groupRef.current.rotation.set(0, yaw, 0);

    // Live world position registration for other dogs
    if (personnelId && groupRef.current) {
      groupRef.current.getWorldPosition(scratchDogWorldPos);
      registerLivePersonnelPosition(personnelId, scratchDogWorldPos, groupRef.current);
    }

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
    <group
      ref={groupRef}
      onClick={personnelId && onSelectPerson ? (e) => { e.stopPropagation(); onSelectPerson(personnelId); } : undefined}
      onPointerOver={personnelId && onSelectPerson ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={personnelId && onSelectPerson ? () => { document.body.style.cursor = "auto"; } : undefined}
    >
      {/* 🐕 INVISIBLE RAYCAST SELECTION HITBOX */}
      {personnelId && onSelectPerson && (
        <mesh position={[0, 0.35, 0]} visible={false}>
          <cylinderGeometry args={[0.55, 0.55, 0.9, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {/* Athletic Canine Torso */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.22, 0.24, 0.55]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Chest Depth */}
      <mesh position={[0, 0.34, 0.14]}>
        <boxGeometry args={[0.24, 0.22, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* Head Assembly */}
      <group ref={headRef} position={[0, 0.48, 0.28]}>
        {/* Skull */}
        <mesh position={[0, 0.06, 0.04]}>
          <boxGeometry args={[0.16, 0.14, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
        {/* Tapered Muzzle / Snout */}
        <mesh position={[0, 0.02, 0.16]}>
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
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.03, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.09, 0.38, 0.18]}>
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.03, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legRLRef} position={[-0.09, 0.38, -0.18]}>
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.032, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legRRRef} position={[0.09, 0.38, -0.18]}>
        <mesh position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.032, 0.022, 0.38, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ─── MAIN EXPORT: SIERRA MADRE WILDLIFE & DOMESTIC SITE FAUNA ECOSYSTEM ─────
export function ForestWildlife({
  onSelectPerson,
  timeMode = "day",
}: {
  onSelectPerson?: (id: string) => void;
  timeMode?: "morning" | "day" | "sunset" | "night";
} = {}) {
  const groupRef = useRef<THREE.Group>(null);
  useDistanceCull(groupRef, 190);

  const carabaoPositions: [number, number][] = useMemo(() => [
    [52, -148], [62, -152], [42, -145], [18, -48],
  ], []);

  const deerPositions: [number, number][] = useMemo(() => [
    [-38, -58], [-46, -65], [-52, -50],
  ], []);

  const boarPositions: [number, number][] = useMemo(() => [
    [72, -135], [78, -142], [84, -138],
  ], []);

  // Relocated hornbill from road [58, -25] into the lush forest canopy [38, -38]
  const hornbillPositions: [number, number][] = useMemo(() => [
    [-22, 14], [38, -38], [-12, -75],
  ], []);

  const monkeyPositions: [number, number][] = useMemo(() => [
    [32, -18], [42, -22],
  ], []);

  // Relocated goats to lush Sierra Madre grassy pasture hillside (safely clear of road cut)
  const goatPositions: [number, number][] = useMemo(() => [
    [45, -72], [38, -78], [52, -84],
  ], []);

  // Monitor lizards basking on riverbank shore rocks
  const lizardPositions: [number, number][] = useMemo(() => [
    [-18, 22], [18, 25],
  ], []);

  return (
    <group ref={groupRef}>
      {/* 1. Grazing Philippine Carabao (Water Buffalo) */}
      {carabaoPositions.map((pos, i) => (
        <RealisticPhilippineCarabao
          key={`carabao-${i}`}
          basePos={pos}
          seed={i * 1.3 + 0.7}
          timeMode={timeMode}
        />
      ))}

      {/* 2. Soaring Philippine Eagle (Haring Ibon) above the River Gorge */}
      <RealisticPhilippineEagle
        orbitCenter={[25, -20]}
        flightAltitude={65}
        radius={85}
        speed={0.13}
        timeMode={timeMode}
      />
      <RealisticPhilippineEagle
        orbitCenter={[-20, -60]}
        flightAltitude={72}
        radius={70}
        speed={0.11}
        timeMode={timeMode}
      />

      {/* 3. Rufous Hornbill (Kalaw) Perched in Canopy */}
      {hornbillPositions.map((pos, i) => (
        <RealisticRufousHornbill key={`hornbill-${i}`} basePos={pos} seed={i * 1.5 + 0.2} />
      ))}

      {/* 4. Philippine Brown Deer Herd */}
      {deerPositions.map((pos, i) => (
        <RealisticPhilippineDeer key={`deer-${i}`} basePos={pos} seed={i * 1.1 + 0.3} timeMode={timeMode} />
      ))}

      {/* 5. Wild Boars (Baboy Ramo) Foraging */}
      {boarPositions.map((pos, i) => (
        <RealisticPhilippineWildBoar key={`boar-${i}`} basePos={pos} seed={i * 0.9 + 1.2} timeMode={timeMode} />
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
        <RealisticMonitorLizard key={`lizard-${i}`} basePos={pos} seed={i * 2.1 + 0.4} timeMode={timeMode} />
      ))}

      {/* 9. Philippine Native Dogs (Aspin / Asong Pinoy) in TEMFACIL Compound & Forest Trails */}
      {/* Dog 1: Golden-Tan Aspin roaming TEMFACIL central courtyard */}
      <RealisticPhilippineAspinDog
        routeType="TEMFACIL_COURTYARD"
        color="#D97706"
        seed={1.0}
        timeMode={timeMode}
      />
      {/* Dog 2: Black & Tan Aspin patrolling Security Checkpoint Gate */}
      <RealisticPhilippineAspinDog
        routeType="TEMFACIL_GATE"
        color="#1E293B"
        seed={2.5}
        timeMode={timeMode}
      />
      {/* 🐕 BRUNSON "CHUCHU" — SITE MASCOT & CANINE SECURITY PATROL (Warehouse Dirt Road & Laydown Yard) */}
      <RealisticPhilippineAspinDog
        routeType="WAREHOUSE_RAMP"
        color="#D97706"
        seed={3.8}
        personnelId="DOG_BRUNSON_CHUCHU"
        onSelectPerson={onSelectPerson}
        timeMode={timeMode}
      />
      {/* Dog 4: Golden Aspin walking on Sierra Madre Riverside Trail */}
      <RealisticPhilippineAspinDog
        routeType="FOREST_TRAIL"
        color="#B45309"
        seed={4.2}
        timeMode={timeMode}
      />
    </group>
  );
}
