"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA MADRE MOUNTAIN ATMOSPHERE & BIOPHYSICAL EFFECTS ENGINE
 * 
 * High-fidelity environmental phenomena:
 * - 🌅 Morning:
 *     - Rolling river mist along the Tumauini gorge & tailrace
 *     - Soft mountain valley inversion fog blankets
 *     - Golden crepuscular god rays streaming over eastern ridges
 *     - Powerhouse turbine draft-tube aeration vapor plumes
 *     - Flocks of mountain swallows & white egrets skimming water
 * - ☀️ Afternoon:
 *     - Sierra Madre 3D cumulus cloud clusters drifting over peaks
 *     - Switchyard & concrete roof convective heat shimmer
 *     - Specular river sun caustics glinting
 * - 🌇 Sunset:
 *     - Western ridge alpenglow illumination
 *     - Twilight mist settling into the gorge
 * - 🌙 Night:
 *     - 80 bioluminescent wandering forest fireflies
 *     - Surge tank pulsing red aviation obstruction strobe
 *     - Industrial photometric floodlights across the compound
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface MountainEffectsProps {
  timeMode: AtmosphereTimeMode;
  isStormActive?: boolean;
}

export function MountainAtmosphereEffects({ timeMode, isStormActive = false }: MountainEffectsProps) {
  const isMorning = timeMode === "MORNING" && !isStormActive;
  const isAfternoon = timeMode === "AFTERNOON" && !isStormActive;
  const isSunset = timeMode === "SUNSET" && !isStormActive;
  const isNight = (timeMode === "NIGHT" || isSunset) && !isStormActive;
  const isDeepNight = timeMode === "NIGHT" && !isStormActive;

  return (
    <group name="mountain-atmosphere-effects">
      {/* ─── 🌅 MORNING EFFECTS ─── */}
      {isMorning && (
        <>
          <RollingRiverMist />
          <MountainValleyInversionFog />
          <MorningCrepuscularGodRays />
          <TailraceAerationSteam />
          <MountainSwallowFlock />
        </>
      )}

      {/* ─── ☀️ AFTERNOON EFFECTS ─── */}
      {isAfternoon && (
        <>
          <CumulusMountainClouds />
          <SwitchyardHeatShimmer />
          <HighAltitudeRaptor />
        </>
      )}

      {/* ─── 🌇 SUNSET / TWILIGHT EFFECTS ─── */}
      {isSunset && (
        <>
          <RollingRiverMist opacity={0.12} />
          <SunsetAlpenglowGlow />
        </>
      )}

      {/* ─── 🌙 NIGHT EFFECTS ─── */}
      {isDeepNight && (
        <>
          <BioluminescentForestFireflies count={80} />
          <CelestialShootingStars />
        </>
      )}

      {/* ─── 💡 FACILITY NIGHT & DUSK ILLUMINATION RIG ─── */}
      {isNight && (
        <>
          <SurgeTankAviationStrobe />
          <IndustrialFacilityNightLighting isSunset={isSunset} />
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROLLING RIVER MIST (Volumetric Riverbed & Tailrace Fog Ribbons)
// ─────────────────────────────────────────────────────────────────────────────
function RollingRiverMist({ opacity = 0.22 }: { opacity?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 48;

  const mistPuffs = useMemo(() => {
    const list = [];
    let seed = 91823;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      // Positioned along the Tumauini River channel and tailrace canal:
      // X: -100 to 120, Z: 5 to 70, Y: -0.2 to 3.5
      const u = lcg();
      const x = -90 + u * 210;
      const z = 10 + Math.sin(u * Math.PI * 3) * 18 + lcg() * 12;
      const y = -0.2 + lcg() * 2.8;
      const scaleX = 14 + lcg() * 16;
      const scaleY = 2.5 + lcg() * 3.5;
      const scaleZ = 12 + lcg() * 14;
      const speed = 0.35 + lcg() * 0.45;
      const phase = lcg() * Math.PI * 2;
      list.push({ x, y, z, scaleX, scaleY, scaleZ, speed, phase, baseU: u });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < mistPuffs.length; i++) {
      const p = mistPuffs[i];
      // River downstream drift
      const currentX = p.x + Math.sin(t * 0.15 * p.speed + p.phase) * 6.0;
      const currentZ = p.z + Math.cos(t * 0.12 * p.speed + p.phase) * 3.0;
      const currentY = p.y + Math.sin(t * 0.25 * p.speed + p.phase) * 0.4;
      const breathe = 1.0 + Math.sin(t * 0.4 * p.speed + p.phase) * 0.18;

      dummy.position.set(currentX, currentY, currentZ);
      dummy.scale.set(p.scaleX * breathe, p.scaleY, p.scaleZ * breathe);
      dummy.rotation.y = t * 0.05 * p.speed + p.phase;
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial
        color="#F8FAFC"
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOUNTAIN VALLEY INVERSION FOG (Low Mountain Hollow Blankets)
// ─────────────────────────────────────────────────────────────────────────────
function MountainValleyInversionFog() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 18;

  const fogBlankets = useMemo(() => {
    return [
      // Behind penstock ridge
      { pos: [-90, 32, -80] as [number, number, number], scale: [65, 8, 45] as [number, number, number] },
      { pos: [-60, 26, -110] as [number, number, number], scale: [70, 10, 50] as [number, number, number] },
      // Eastern saddle behind TEMFACIL
      { pos: [110, 24, -135] as [number, number, number], scale: [80, 12, 55] as [number, number, number] },
      { pos: [140, 20, -95] as [number, number, number], scale: [65, 9, 50] as [number, number, number] },
      // Far northern river gorge
      { pos: [30, 8, 85] as [number, number, number], scale: [90, 8, 60] as [number, number, number] },
      { pos: [-50, 10, 95] as [number, number, number], scale: [85, 9, 55] as [number, number, number] },
      // Mid-mountain saddles
      { pos: [0, 42, -140] as [number, number, number], scale: [95, 14, 60] as [number, number, number] },
      { pos: [85, 38, -160] as [number, number, number], scale: [90, 12, 50] as [number, number, number] },
    ];
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.1;

    for (let i = 0; i < fogBlankets.length; i++) {
      const fb = fogBlankets[i];
      const driftX = Math.sin(t + i) * 4.0;
      const driftY = Math.cos(t * 1.3 + i) * 0.8;
      const breathe = 1.0 + Math.sin(t * 1.5 + i) * 0.08;

      dummy.position.set(fb.pos[0] + driftX, fb.pos[1] + driftY, fb.pos[2]);
      dummy.scale.set(fb.scale[0] * breathe, fb.scale[1], fb.scale[2] * breathe);
      dummy.rotation.y = i * 0.4 + t * 0.05;
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, fogBlankets.length]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial
        color="#F1F5F9"
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MORNING CREPUSCULAR GOD RAYS (Eastern Sunbeams Over Mountain Ridge)
// ─────────────────────────────────────────────────────────────────────────────
function MorningCrepuscularGodRays() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Subtle breathing pulse
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.06 + Math.sin(t * 0.8 + i * 1.5) * 0.025;
      }
    });
  });

  return (
    <group ref={groupRef} position={[95, 45, 55]} rotation={[0.45, -0.65, 0.2]}>
      {/* 5 Angled Sunbeam Cones Streaming Down Into Powerhouse & Valley */}
      <mesh position={[-15, 0, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[2.5, 38, 180, 16, 1, true]} />
        <meshBasicMaterial
          color="#FEF08A"
          transparent
          opacity={0.065}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[12, 4, -15]} rotation={[0.1, 0, 0.08]}>
        <cylinderGeometry args={[3.0, 44, 200, 16, 1, true]} />
        <meshBasicMaterial
          color="#FED7AA"
          transparent
          opacity={0.055}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[-35, -5, 25]} rotation={[-0.08, 0, -0.15]}>
        <cylinderGeometry args={[2.0, 32, 160, 16, 1, true]} />
        <meshBasicMaterial
          color="#FFFBEB"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[30, 8, -35]} rotation={[0.05, 0, 0.12]}>
        <cylinderGeometry args={[3.5, 50, 220, 16, 1, true]} />
        <meshBasicMaterial
          color="#FDE68A"
          transparent
          opacity={0.045}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TAILRACE AERATION STEAM (Turbine Draft-Tube Aeration Vapor Plumes)
// ─────────────────────────────────────────────────────────────────────────────
function TailraceAerationSteam() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 22;

  const puffs = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = -6.0 + (i % 5) * 3.0 + (Math.random() - 0.5) * 2.0;
      const z = 12.0 + Math.floor(i / 5) * 4.5 + Math.random() * 2.0;
      const y = -0.2;
      const speed = 0.8 + Math.random() * 0.6;
      const scale = 2.2 + Math.random() * 1.8;
      const phase = Math.random() * Math.PI * 2;
      list.push({ x, z, y, speed, scale, phase });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      const cycle = (t * p.speed + p.phase) % 3.0; // 3s loop
      const progress = cycle / 3.0;

      // Rising and expanding steam
      const currentY = p.y + progress * 7.5;
      const currentZ = p.z + progress * 5.0; // drifting along tailrace canal
      const currentScale = p.scale * (1.0 + progress * 2.4);

      dummy.position.set(p.x, currentY, currentZ);
      dummy.scale.setScalar(currentScale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0, 0]}>
      <sphereGeometry args={[0.8, 8, 8]} />
      <meshBasicMaterial
        color="#F8FAFC"
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOUNTAIN SWALLOW FLOCK & WHITE EGRETS (Morning Sierra Madre Birds)
// ─────────────────────────────────────────────────────────────────────────────
function MountainSwallowFlock() {
  const groupRef = useRef<THREE.Group>(null);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const birdCount = 9;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.4;
    // Sweeping figure-8 flight path across the valley and over tailrace
    const x = Math.sin(t) * 110 + 20;
    const z = Math.sin(t * 2) * 55 - 10;
    const y = 35 + Math.sin(t * 1.5) * 16;

    groupRef.current.position.set(x, y, z);
    // Orient in direction of movement
    const dx = Math.cos(t) * 110;
    const dz = Math.cos(t * 2) * 110;
    groupRef.current.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    groupRef.current.rotation.z = Math.sin(t * 2) * 0.25;

    const flap = Math.sin(clock.getElapsedTime() * 14) * 0.5;
    wingRefs.current.forEach((w, i) => {
      if (w) w.rotation.z = (i % 2 === 0 ? 1 : -1) * flap;
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: birdCount }).map((_, i) => {
        const row = Math.floor((i + 1) / 2);
        const side = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
        const xOffset = side * row * 5.5;
        const zOffset = -row * 6.5;
        const yOffset = Math.sin(i) * 1.2;
        const isEgret = i % 3 === 0;

        return (
          <group key={`swallow-${i}`} position={[xOffset, yOffset, zOffset]}>
            {/* Bird Torso */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.35, 0.22, 1.4]} />
              <meshStandardMaterial color={isEgret ? "#F8FAFC" : "#1E293B"} roughness={0.7} />
            </mesh>
            {/* Left Wing */}
            <group ref={(el) => { wingRefs.current[i * 2] = el; }} position={[-0.18, 0, 0]}>
              <mesh position={[-1.3, 0, 0]}>
                <boxGeometry args={[2.6, 0.04, 0.55]} />
                <meshStandardMaterial color={isEgret ? "#FFFFFF" : "#334155"} roughness={0.7} />
              </mesh>
            </group>
            {/* Right Wing */}
            <group ref={(el) => { wingRefs.current[i * 2 + 1] = el; }} position={[0.18, 0, 0]}>
              <mesh position={[1.3, 0, 0]}>
                <boxGeometry args={[2.6, 0.04, 0.55]} />
                <meshStandardMaterial color={isEgret ? "#FFFFFF" : "#334155"} roughness={0.7} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CUMULUS MOUNTAIN CLOUDS (Afternoon 3D Drifting Cloud Formations)
// ─────────────────────────────────────────────────────────────────────────────
function CumulusMountainClouds() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.35;
    // Slow east-to-west mountain cloud drift
    groupRef.current.position.x = (t * 4.0) % 500 - 250;
  });

  const cloudClusters = useMemo(() => {
    return [
      { pos: [-120, 110, -180] as [number, number, number], scale: 28 },
      { pos: [-40, 125, -220] as [number, number, number], scale: 35 },
      { pos: [60, 115, -190] as [number, number, number], scale: 32 },
      { pos: [160, 105, -230] as [number, number, number], scale: 40 },
      { pos: [-180, 130, -150] as [number, number, number], scale: 30 },
      { pos: [0, 140, -250] as [number, number, number], scale: 45 },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {cloudClusters.map((c, idx) => (
        <group key={`cloud-${idx}`} position={c.pos}>
          {/* Main Body */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[c.scale * 0.7, 12, 10]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} transparent opacity={0.88} />
          </mesh>
          <mesh position={[-c.scale * 0.45, -c.scale * 0.1, c.scale * 0.2]}>
            <sphereGeometry args={[c.scale * 0.55, 10, 8]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.9} transparent opacity={0.85} />
          </mesh>
          <mesh position={[c.scale * 0.5, -c.scale * 0.15, -c.scale * 0.1]}>
            <sphereGeometry args={[c.scale * 0.6, 10, 8]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.9} transparent opacity={0.85} />
          </mesh>
          <mesh position={[c.scale * 0.1, c.scale * 0.35, 0]}>
            <sphereGeometry args={[c.scale * 0.48, 10, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SWITCHYARD HEAT SHIMMER (Convective Micro-Particles in Afternoon)
// ─────────────────────────────────────────────────────────────────────────────
function SwitchyardHeatShimmer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 35;

  const shimmerData = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      // 69kV Switchyard gravel pad (X: 45 to 85, Z: -5 to 35, Y: 0.5 to 8)
      const x = 45 + Math.random() * 40;
      const z = -5 + Math.random() * 40;
      const y = 0.5 + Math.random() * 6.0;
      const speed = 0.8 + Math.random() * 0.8;
      const phase = Math.random() * Math.PI * 2;
      list.push({ x, y, z, speed, phase });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < shimmerData.length; i++) {
      const s = shimmerData[i];
      const currentY = 0.5 + ((t * s.speed + s.phase) % 7.0);
      const wobbleX = Math.sin(t * 3.0 + s.phase) * 0.3;
      const wobbleZ = Math.cos(t * 2.5 + s.phase) * 0.3;

      dummy.position.set(s.x + wobbleX, currentY, s.z + wobbleZ);
      dummy.scale.set(0.6, 1.4, 0.6);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.3, 6, 6]} />
      <meshBasicMaterial
        color="#FEF08A"
        transparent
        opacity={0.12}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. HIGH-ALTITUDE RAPTOR / PHILIPPINE EAGLE (Afternoon Thermal Soaring)
// ─────────────────────────────────────────────────────────────────────────────
function HighAltitudeRaptor() {
  const raptorRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!raptorRef.current) return;
    const t = clock.getElapsedTime() * 0.18;
    // Slow majestic circle riding mountain thermal updrafts
    const radius = 95;
    raptorRef.current.position.set(
      Math.sin(t) * radius + 10,
      130 + Math.sin(t * 0.5) * 8,
      Math.cos(t) * radius - 60
    );
    raptorRef.current.rotation.y = t + Math.PI / 2;
    raptorRef.current.rotation.z = -0.15; // Bank angle in thermal
  });

  return (
    <group ref={raptorRef}>
      {/* 2.8m Wingspan Majestic Eagle Silhouette */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.35, 2.4]} />
        <meshStandardMaterial color="#1E1E24" roughness={0.8} />
      </mesh>
      {/* Swept Wings */}
      <mesh position={[-3.2, 0, -0.2]} rotation={[0, 0.08, -0.05]}>
        <boxGeometry args={[5.6, 0.08, 1.2]} />
        <meshStandardMaterial color="#2B2D42" roughness={0.8} />
      </mesh>
      <mesh position={[3.2, 0, -0.2]} rotation={[0, -0.08, 0.05]}>
        <boxGeometry args={[5.6, 0.08, 1.2]} />
        <meshStandardMaterial color="#2B2D42" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SUNSET ALPENGLOW (Western Ridge Horizon Light)
// ─────────────────────────────────────────────────────────────────────────────
function SunsetAlpenglowGlow() {
  return (
    <group position={[-140, 25, -60]}>
      <pointLight color="#FF5722" intensity={45.0} distance={220} decay={1.8} />
      <pointLight color="#FFA726" position={[0, 20, 40]} intensity={35.0} distance={180} decay={1.8} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BIOLUMINESCENT FOREST FIREFLIES (Night Swarms in Bamboo & Riverbank)
// ─────────────────────────────────────────────────────────────────────────────
function BioluminescentForestFireflies({ count = 80 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const fireflyData = useMemo(() => {
    const data = [];
    let seed = 44211;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      // Cluster near riverbanks (Z: 0 to 45), penstock hillside, and bamboo groves
      const x = (lcg() - 0.5) * 200;
      const z = -60 + lcg() * 140;
      const y = lcg() * 16 + 2.0;
      const speed = 0.6 + lcg() * 1.2;
      const phase = lcg() * Math.PI * 2;
      data.push({ x, y, z, speed, phase });
    }
    return data;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < fireflyData.length; i++) {
      const { x, y, z, speed, phase } = fireflyData[i];
      // Organic multi-harmonic drifting
      const glow = Math.sin(t * 3.5 * speed + phase) * 0.5 + 0.5;
      const driftX = Math.sin(t * 0.7 * speed + phase) * 2.2;
      const driftY = Math.cos(t * 1.1 * speed + phase) * 1.0;
      const driftZ = Math.sin(t * 0.5 * speed + phase) * 2.2;

      dummy.position.set(x + driftX, y + driftY, z + driftZ);
      dummy.scale.setScalar(glow * 0.45 + 0.08);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial
        color="#A3E635"
        emissive="#BEF264"
        emissiveIntensity={4.5}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CELESTIAL SHOOTING STARS (Night Meteors)
// ─────────────────────────────────────────────────────────────────────────────
function CelestialShootingStars() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.8;
    const cycle = t % 7.0; // Every 7s a shooting star streaks across
    if (cycle < 1.2) {
      meshRef.current.visible = true;
      const progress = cycle / 1.2;
      meshRef.current.position.set(
        -180 + progress * 240,
        220 - progress * 80,
        -140 + progress * 110
      );
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(progress * Math.PI) * 0.85;
    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} visible={false} rotation={[0, 0.4, -0.6]}>
      <cylinderGeometry args={[0.15, 0.8, 28, 6]} />
      <meshBasicMaterial color="#E0F2FE" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SURGE TANK AVIATION STROBE BEACON (ICAO-Standard Red Strobe at [-38, 52, -58])
// ─────────────────────────────────────────────────────────────────────────────
function SurgeTankAviationStrobe() {
  const beaconRef = useRef<THREE.PointLight>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // ICAO Red Strobe: double pulse flash every 1.5 seconds
    const cycle = t % 1.5;
    const isFlashing = (cycle > 0.0 && cycle < 0.12) || (cycle > 0.25 && cycle < 0.37);

    if (beaconRef.current) {
      beaconRef.current.intensity = isFlashing ? 28.0 : 0.8;
    }
    if (glowMeshRef.current) {
      const mat = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isFlashing ? "#FF0000" : "#550000");
    }
  });

  return (
    <group position={[-38, 52.5, -58]}>
      <mesh ref={glowMeshRef}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial color="#FF0000" />
      </mesh>
      <pointLight ref={beaconRef} color="#FF1E1E" intensity={28.0} distance={140} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. INDUSTRIAL FACILITY NIGHT ILLUMINATION RIG
// ─────────────────────────────────────────────────────────────────────────────
function IndustrialFacilityNightLighting({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="industrial-night-lighting">
      {/* ─── 69kV Switchyard Gantry & Transformers (5000K Crisp Halogen Floodlights) ─── */}
      <pointLight position={[55, 18.0, 10]} color="#E0F2FE" intensity={38.0 * intensityMult} distance={95} decay={2} />
      <pointLight position={[75, 18.0, 20]} color="#E0F2FE" intensity={34.0 * intensityMult} distance={90} decay={2} />
      
      {/* ─── Powerhouse Apron & Gantry Crane Deck (4000K Neutral Industrial Light) ─── */}
      <pointLight position={[18, 30.0, 22]} color="#F8FAFC" intensity={42.0 * intensityMult} distance={110} decay={2} />
      <pointLight position={[-12, 14.0, 24]} color="#F8FAFC" intensity={30.0 * intensityMult} distance={80} decay={2} />

      {/* ─── Tailrace Outfall & Discharge Bridge (Hazard Amber/White) ─── */}
      <pointLight position={[0, 6.0, 42]} color="#FCD34D" intensity={24.0 * intensityMult} distance={75} decay={2} />

      {/* ─── Penstock Slope Inspection Stairs (3000K Warm Sodium Safety Lights) ─── */}
      <pointLight position={[-35, 42.0, -50]} color="#F59E0B" intensity={22.0 * intensityMult} distance={65} decay={2} />
      <pointLight position={[-25, 24.0, -32]} color="#F59E0B" intensity={20.0 * intensityMult} distance={60} decay={2} />

      {/* ─── TEMFACIL Headquarters & Logistics Depot (Warm Compound Floodlights) ─── */}
      <pointLight position={[115, 24.0, -85]} color="#FDE68A" intensity={32.0 * intensityMult} distance={90} decay={2} />
      <pointLight position={[115, 24.0, -110]} color="#FFFBEB" intensity={36.0 * intensityMult} distance={90} decay={2} />
      <pointLight position={[150, 22.0, -100]} color="#FDE68A" intensity={28.0 * intensityMult} distance={80} decay={2} />

      {/* ─── Main Guardhouse & Access Road Gate (Security White LED) ─── */}
      <pointLight position={[80, 18.0, -60]} color="#F0F9FF" intensity={26.0 * intensityMult} distance={70} decay={2} />
    </group>
  );
}
