"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA MADRE MOUNTAIN ATMOSPHERE & BIOPHYSICAL EFFECTS ENGINE
 * 
 * High-Fidelity Environmental Phenomena & Night Illumination Rig:
 * - 🌅 Morning:
 *     - Natural golden mountain sunlight & soft planar river surface mist
 *     - Turbine draft-tube cold water aeration steam
 *     - Flocks of mountain swallows & white egrets
 * - ☀️ Afternoon:
 *     - Distant high-altitude mountain ridge clouds & trade wind drift
 *     - Subtle switchyard heat shimmer & soaring Philippine Eagle
 * - 🌇 Sunset:
 *     - Clean alpenglow horizon & western grazing shadows (no light cones)
 * - 🌙 Night:
 *     - 480+ Bioluminescent Forest Fireflies distributed across all 5 forest sectors
 *     - Powerhouse Generator Hall Mezzanine & Turbine Windows (Cyan-White Industrial Glow)
 *     - Powerhouse Draft-Tube Outfall Aquatic Illumination
 *     - TEMFACIL Admin Headquarters & Staff Office Warm 3000K Golden Window Glows
 *     - Barracks 1, 2, & 3 Quarters Warm Residential Room Windows
 *     - Food Mess Hall & Canteen Open-Air Dining Illumination
 *     - Guardhouse Security Workstation Glow & Porch Downlight
 *     - Vehicle Headlights casting realistic forward spot beams on roads + Red Taillights
 *     - Security Guards & Technicians with Dynamic Tactical Search Flashlights
 *     - Surge Tank Red Aviation Safety Strobe & Switchyard Floodlights
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface MountainEffectsProps {
  timeMode: AtmosphereTimeMode;
  isStormActive?: boolean;
}

export function MountainAtmosphereEffects({ timeMode, isStormActive = false }: MountainEffectsProps) {
  const isMorning = timeMode === "MORNING" && !isStormActive;
  const isAfternoon = timeMode === "AFTERNOON" && !isStormActive;
  const isNight = (timeMode === "NIGHT" || timeMode === "SUNSET") && !isStormActive;
  const isDeepNight = timeMode === "NIGHT" && !isStormActive;

  return (
    <group name="mountain-atmosphere-effects">
      {/* ─── 🌅 MORNING NATURAL EFFECTS ─── */}
      {isMorning && (
        <>
          <NaturalRiverSurfaceMist />
          <TailraceAerationSteam />
          <MountainSwallowFlock />
        </>
      )}

      {/* ─── ☀️ AFTERNOON EFFECTS ─── */}
      {isAfternoon && (
        <>
          <DistantMountainRidgeClouds />
          <SwitchyardHeatShimmer />
          <HighAltitudeRaptor />
        </>
      )}

      {/* ─── 🌙 480+ BIOLUMINESCENT SIERRA MADRE FOREST FIREFLIES ─── */}
      {isDeepNight && (
        <>
          <BioluminescentForestFireflies count={480} />
          <CelestialShootingStars />
        </>
      )}

      {/* ─── 💡 REALISTIC FACILITY, BUILDING, VEHICLE & GUARD LIGHTING ─── */}
      {isNight && (
        <>
          <SurgeTankAviationStrobe />
          <PowerhouseNightIllumination isSunset={timeMode === "SUNSET"} />
          <TemfacilBuildingNightWindows isSunset={timeMode === "SUNSET"} />
          <VehicleNightLights isSunset={timeMode === "SUNSET"} />
          <GuardFlashlights isSunset={timeMode === "SUNSET"} />
          <IndustrialFacilityNightLighting isSunset={timeMode === "SUNSET"} />
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NATURAL RIVER SURFACE MIST (Soft planar water-surface fog)
// ─────────────────────────────────────────────────────────────────────────────
function NaturalRiverSurfaceMist() {
  const mistRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!mistRef.current) return;
    const t = clock.getElapsedTime() * 0.15;
    mistRef.current.position.x = Math.sin(t * 0.5) * 4.0;
  });

  return (
    <group ref={mistRef} position={[0, 0.15, 25]}>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 48, 1, 1]} />
        <meshBasicMaterial color="#F8FAFC" transparent opacity={0.14} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>
      <mesh position={[45, 0.1, 12]} rotation={[-Math.PI / 2, 0, 0.15]}>
        <planeGeometry args={[75, 28, 1, 1]} />
        <meshBasicMaterial color="#F8FAFC" transparent opacity={0.11} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>
      <mesh position={[-45, 0.1, -12]} rotation={[-Math.PI / 2, 0, -0.1]}>
        <planeGeometry args={[65, 26, 1, 1]} />
        <meshBasicMaterial color="#F8FAFC" transparent opacity={0.10} depthWrite={false} blending={THREE.NormalBlending} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TAILRACE AERATION STEAM
// ─────────────────────────────────────────────────────────────────────────────
function TailraceAerationSteam() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 18;

  const puffs = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = -5.0 + (i % 4) * 3.2 + (Math.random() - 0.5) * 1.8;
      const z = 14.0 + Math.floor(i / 4) * 4.0 + Math.random() * 1.5;
      const y = -0.3;
      const speed = 0.7 + Math.random() * 0.5;
      const scale = 1.8 + Math.random() * 1.4;
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
      const cycle = (t * p.speed + p.phase) % 2.8;
      const progress = cycle / 2.8;
      const currentY = p.y + progress * 6.5;
      const currentZ = p.z + progress * 4.0;
      const currentScale = p.scale * (1.0 + progress * 2.0);

      dummy.position.set(p.x, currentY, currentZ);
      dummy.scale.setScalar(currentScale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0, 0]}>
      <sphereGeometry args={[0.7, 8, 8]} />
      <meshBasicMaterial color="#F8FAFC" transparent opacity={0.12} depthWrite={false} blending={THREE.NormalBlending} />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOUNTAIN SWALLOW FLOCK
// ─────────────────────────────────────────────────────────────────────────────
function MountainSwallowFlock() {
  const groupRef = useRef<THREE.Group>(null);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const birdCount = 9;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.38;
    const x = Math.sin(t) * 115 + 20;
    const z = Math.sin(t * 2) * 55 - 10;
    const y = 38 + Math.sin(t * 1.5) * 14;

    groupRef.current.position.set(x, y, z);
    const dx = Math.cos(t) * 115;
    const dz = Math.cos(t * 2) * 110;
    groupRef.current.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    groupRef.current.rotation.z = Math.sin(t * 2) * 0.22;

    const flap = Math.sin(clock.getElapsedTime() * 13) * 0.48;
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
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.35, 0.22, 1.4]} />
              <meshStandardMaterial color={isEgret ? "#F8FAFC" : "#1E293B"} roughness={0.7} />
            </mesh>
            <group ref={(el) => { wingRefs.current[i * 2] = el; }} position={[-0.18, 0, 0]}>
              <mesh position={[-1.3, 0, 0]}>
                <boxGeometry args={[2.6, 0.04, 0.55]} />
                <meshStandardMaterial color={isEgret ? "#FFFFFF" : "#334155"} roughness={0.7} />
              </mesh>
            </group>
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
// 4. DISTANT SIERRA MADRE RIDGE CLOUD BANKS
// ─────────────────────────────────────────────────────────────────────────────
function DistantMountainRidgeClouds() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.08;
    groupRef.current.position.x = Math.sin(t * 0.4) * 12.0;
  });

  const ridgePuffs = useMemo(() => {
    return [
      { pos: [-160, 180, -420] as [number, number, number], scale: [120, 32, 60] as [number, number, number], rot: 0.1 },
      { pos: [-60, 195, -480] as [number, number, number], scale: [140, 38, 70] as [number, number, number], rot: -0.15 },
      { pos: [80, 190, -450] as [number, number, number], scale: [150, 36, 65] as [number, number, number], rot: 0.08 },
      { pos: [220, 175, -410] as [number, number, number], scale: [130, 30, 55] as [number, number, number], rot: -0.05 },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {ridgePuffs.map((p, idx) => (
        <group key={`ridge-cloud-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh position={[0, 0, 0]} scale={p.scale}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.95} transparent opacity={0.32} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.25, 0]} scale={[p.scale[0] * 0.95, p.scale[1] * 0.35, p.scale[2] * 0.95]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#94A3B8" roughness={1.0} transparent opacity={0.18} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SWITCHYARD HEAT SHIMMER
// ─────────────────────────────────────────────────────────────────────────────
function SwitchyardHeatShimmer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 30;

  const shimmerData = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
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
      dummy.scale.set(0.5, 1.2, 0.5);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.3, 6, 6]} />
      <meshBasicMaterial color="#FEF08A" transparent opacity={0.10} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HIGH-ALTITUDE RAPTOR (Philippine Eagle)
// ─────────────────────────────────────────────────────────────────────────────
function HighAltitudeRaptor() {
  const raptorRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!raptorRef.current) return;
    const t = clock.getElapsedTime() * 0.18;
    const radius = 95;
    raptorRef.current.position.set(
      Math.sin(t) * radius + 10,
      130 + Math.sin(t * 0.5) * 8,
      Math.cos(t) * radius - 60
    );
    raptorRef.current.rotation.y = t + Math.PI / 2;
    raptorRef.current.rotation.z = -0.15;
  });

  return (
    <group ref={raptorRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.35, 2.4]} />
        <meshStandardMaterial color="#1E1E24" roughness={0.8} />
      </mesh>
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
// 7. POWERHOUSE NIGHT ILLUMINATION & LUMINOUS GENERATOR HALL WINDOWS
// ─────────────────────────────────────────────────────────────────────────────
function PowerhouseNightIllumination({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="powerhouse-night-illumination">
      {/* ═══ 1. Front Facade Upper Mezzanine Windows (4 Cyan-White Luminous Panes) ═══ */}
      {[-6, -2, 2, 6].map((x, i) => (
        <group key={`ph-front-win-${i}`} position={[x, 8.5, 7.04]}>
          <mesh>
            <planeGeometry args={[1.9, 2.1]} />
            <meshBasicMaterial color="#BAE6FD" toneMapped={false} />
          </mesh>
          <pointLight color="#38BDF8" intensity={18.0 * intensityMult} distance={22} decay={2} position={[0, 0, 0.4]} />
        </group>
      ))}

      {/* ═══ 2. Back Facade Windows (3 Cyan-White Luminous Panes) ═══ */}
      {[-5, 0, 5].map((x, i) => (
        <group key={`ph-back-win-${i}`} position={[x, 8.5, -7.04]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <planeGeometry args={[1.4, 1.6]} />
            <meshBasicMaterial color="#BAE6FD" toneMapped={false} />
          </mesh>
          <pointLight color="#38BDF8" intensity={15.0 * intensityMult} distance={18} decay={2} position={[0, 0, 0.4]} />
        </group>
      ))}

      {/* ═══ 3. Lower Draft Tube Portals (Cold Aquatic Turbine Outfall Glow) ═══ */}
      <group position={[-3.6, 2.2, 6.75]}>
        <pointLight color="#0284C7" intensity={25.0 * intensityMult} distance={25} decay={2} position={[0, 0, 1.2]} />
      </group>
      <group position={[3.6, 2.2, 6.75]}>
        <pointLight color="#0284C7" intensity={25.0 * intensityMult} distance={25} decay={2} position={[0, 0, 1.2]} />
      </group>

      {/* ═══ 4. Powerhouse Roof Gantry & Exterior Wall Pack Lights ═══ */}
      <pointLight position={[0, 11.5, 7.2]} color="#FFFBEB" intensity={32.0 * intensityMult} distance={38} decay={2} />
      <pointLight position={[0, 11.5, -7.2]} color="#FFFBEB" intensity={28.0 * intensityMult} distance={35} decay={2} />
      <pointLight position={[-10.2, 6.5, 0]} color="#FDE047" intensity={20.0 * intensityMult} distance={28} decay={2} />
      <pointLight position={[10.2, 6.5, 0]} color="#FDE047" intensity={20.0 * intensityMult} distance={28} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TEMFACIL FACILITY & HOUSES NIGHT LUMINOUS WINDOWS & PORCH LIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function TemfacilBuildingNightWindows({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="temfacil-building-night-windows" position={[118, 14.0, -95]}>
      {/* ═══ 1. Main Administrative Office & Engineering Bay ([9, 0, -16] base) ═══ */}
      {/* Front Facade Windows */}
      {[-8, -4, 4, 8].map((xOff, i) => (
        <group key={`admin-front-win-${i}`} position={[xOff, 2.4, 6.02]}>
          <mesh>
            <planeGeometry args={[1.8, 1.4]} />
            <meshBasicMaterial color="#FEF08A" toneMapped={false} />
          </mesh>
          <pointLight color="#FCD34D" intensity={14.0 * intensityMult} distance={18} decay={2} position={[0, 0, 0.4]} />
        </group>
      ))}
      {/* Main Entrance Porch Light */}
      <pointLight position={[0, 3.8, 6.8]} color="#FFFBEB" intensity={28.0 * intensityMult} distance={28} decay={2} />

      {/* ═══ 2. Barracks 1, 2, & 3 Quarters (Residential Warm Amber Room Windows) ═══ */}
      {/* Barracks 1 (East Wing: [28, 0, 8]) */}
      {[-6, -2, 2, 6].map((xOff, i) => (
        <group key={`b1-win-${i}`} position={[28 + xOff, 2.2, 13.8]}>
          <mesh>
            <planeGeometry args={[1.5, 1.2]} />
            <meshBasicMaterial color="#FED7AA" toneMapped={false} />
          </mesh>
          <pointLight color="#F59E0B" intensity={12.0 * intensityMult} distance={16} decay={2} position={[0, 0, 0.4]} />
        </group>
      ))}
      {/* Barracks 2 (East Wing Upper Floor: [28, 4.2, 8]) */}
      {[-6, -2, 2, 6].map((xOff, i) => (
        <group key={`b2-win-${i}`} position={[28 + xOff, 5.8, 13.8]}>
          <mesh>
            <planeGeometry args={[1.5, 1.2]} />
            <meshBasicMaterial color="#FEF08A" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Barracks Balcony Corridor Lights */}
      <pointLight position={[28, 3.2, 8]} color="#FDE68A" intensity={24.0 * intensityMult} distance={28} decay={2} />
      <pointLight position={[28, 6.8, 8]} color="#FDE68A" intensity={24.0 * intensityMult} distance={28} decay={2} />

      {/* ═══ 3. Food Canteen & Mess Hall ([ -22, 0, -2 ] with Open Dining) ═══ */}
      <pointLight position={[-22, 3.6, -2]} color="#FDE047" intensity={35.0 * intensityMult} distance={38} decay={2} />
      <pointLight position={[-22, 3.6, 6]} color="#FDE047" intensity={30.0 * intensityMult} distance={35} decay={2} />

      {/* ═══ 4. Logistics Warehouse & Heavy Equipment Bay ([-28, 0, -24]) ═══ */}
      {/* High-Bay Industrial Overhead Lighting spilling through open roll-up doors */}
      <pointLight position={[-28, 5.5, -24]} color="#E0F2FE" intensity={40.0 * intensityMult} distance={45} decay={2} />

      {/* ═══ 5. Security Guardhouse Gate Booth ([-38, 0, 35]) ═══ */}
      {/* Interior Monitor Glow */}
      <mesh position={[-38, 1.8, 35.1]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshBasicMaterial color="#38BDF8" toneMapped={false} />
      </mesh>
      {/* Guardhouse Exterior Gate Spotlight */}
      <spotLight
        position={[-38, 4.2, 36]}
        target-position={[-38, 0, 48]}
        color="#FFFBEB"
        intensity={36.0 * intensityMult}
        angle={0.55}
        penumbra={0.5}
        distance={32}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. VEHICLE ACTIVE HEADLIGHTS & TAILLIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function VehicleNightLights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.5 : 1.0;

  return (
    <group name="vehicle-night-lights">
      {/* ─── 1. Red Dump Truck (Near Guardhouse Gate: [70, 14.5, -58]) ─── */}
      <group position={[70, 14.5, -58]} rotation={[0, -0.4, 0]}>
        <spotLight
          position={[-0.9, 1.1, 3.2]}
          target-position={[-0.9, 0.0, 36.0]}
          color="#FFFBEB"
          intensity={45.0 * intensityMult}
          angle={0.45}
          penumbra={0.65}
          distance={48}
        />
        <spotLight
          position={[0.9, 1.1, 3.2]}
          target-position={[0.9, 0.0, 36.0]}
          color="#FFFBEB"
          intensity={45.0 * intensityMult}
          angle={0.45}
          penumbra={0.65}
          distance={48}
        />
        {/* Glowing Headlight Lenses */}
        <mesh position={[-0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
        </mesh>
        <mesh position={[0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
        </mesh>
        {/* Rear Red Taillights */}
        <mesh position={[-0.85, 0.9, -3.6]}>
          <boxGeometry args={[0.22, 0.18, 0.08]} />
          <meshBasicMaterial color="#EF4444" toneMapped={false} />
        </mesh>
        <mesh position={[0.85, 0.9, -3.6]}>
          <boxGeometry args={[0.22, 0.18, 0.08]} />
          <meshBasicMaterial color="#EF4444" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.0, -3.8]} color="#EF4444" intensity={12.0 * intensityMult} distance={18} decay={2} />
      </group>

      {/* ─── 2. Yellow Maintenance Pickup Truck (Access Road: [52, 11.8, -42]) ─── */}
      <group position={[52, 11.8, -42]} rotation={[0, 0.35, 0]}>
        <spotLight
          position={[-0.7, 0.85, 2.5]}
          target-position={[-0.7, 0.0, 30.0]}
          color="#FEF08A"
          intensity={38.0 * intensityMult}
          angle={0.45}
          penumbra={0.6}
          distance={40}
        />
        <spotLight
          position={[0.7, 0.85, 2.5]}
          target-position={[0.7, 0.0, 30.0]}
          color="#FEF08A"
          intensity={38.0 * intensityMult}
          angle={0.45}
          penumbra={0.6}
          distance={40}
        />
        <mesh position={[-0.7, 0.85, 2.45]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
        </mesh>
        <mesh position={[0.7, 0.85, 2.45]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.9, 0.2]} color="#F59E0B" intensity={18.0 * intensityMult} distance={22} decay={2} />
        <pointLight position={[0, 0.8, -2.6]} color="#EF4444" intensity={10.0 * intensityMult} distance={15} decay={2} />
      </group>

      {/* ─── 3. Black Site Security SUV (TEMFACIL Compound: [90, 14.5, -80]) ─── */}
      <group position={[90, 14.5, -80]} rotation={[0, -1.2, 0]}>
        <spotLight
          position={[-0.75, 0.8, 2.4]}
          target-position={[-0.75, 0.0, 28.0]}
          color="#F8FAFC"
          intensity={40.0 * intensityMult}
          angle={0.42}
          penumbra={0.6}
          distance={42}
        />
        <spotLight
          position={[0.75, 0.8, 2.4]}
          target-position={[0.75, 0.0, 28.0]}
          color="#F8FAFC"
          intensity={40.0 * intensityMult}
          angle={0.42}
          penumbra={0.6}
          distance={42}
        />
        <mesh position={[-0.75, 0.8, 2.35]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshBasicMaterial color="#F8FAFC" toneMapped={false} />
        </mesh>
        <mesh position={[0.75, 0.8, 2.35]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshBasicMaterial color="#F8FAFC" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.8, -2.4]} color="#EF4444" intensity={10.0 * intensityMult} distance={15} decay={2} />
      </group>

      {/* ─── 4. Supercar (TEMFACIL Center Circle: [105, 14.2, -92]) ─── */}
      <group position={[105, 14.2, -92]} rotation={[0, 0.8, 0]}>
        <spotLight
          position={[-0.7, 0.55, 2.0]}
          target-position={[-0.7, 0.0, 28.0]}
          color="#E0F2FE"
          intensity={35.0 * intensityMult}
          angle={0.42}
          penumbra={0.5}
          distance={35}
        />
        <spotLight
          position={[0.7, 0.55, 2.0]}
          target-position={[0.7, 0.0, 28.0]}
          color="#E0F2FE"
          intensity={35.0 * intensityMult}
          angle={0.42}
          penumbra={0.5}
          distance={35}
        />
        <mesh position={[-0.7, 0.55, 1.95]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color="#E0F2FE" toneMapped={false} />
        </mesh>
        <mesh position={[0.7, 0.55, 1.95]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color="#E0F2FE" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.6, -2.0]} color="#EF4444" intensity={12.0 * intensityMult} distance={18} decay={2} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SECURITY GUARDS & PERSONNEL TACTICAL FLASHLIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function GuardFlashlights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;
  const sentryLightRef = useRef<THREE.SpotLight>(null);
  const patrolLightRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sentryLightRef.current && sentryLightRef.current.target) {
      sentryLightRef.current.target.position.x = 76 + Math.sin(t * 0.8) * 8.0;
      sentryLightRef.current.target.position.z = -40 + Math.cos(t * 0.6) * 6.0;
      sentryLightRef.current.target.updateMatrixWorld();
    }
    if (patrolLightRef.current && patrolLightRef.current.target) {
      patrolLightRef.current.target.position.x = 125 + Math.sin(t * 1.1) * 10.0;
      patrolLightRef.current.target.position.z = -55 + Math.cos(t * 0.9) * 8.0;
      patrolLightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group name="guard-flashlights">
      {/* ─── Guard 1: Main Guardhouse Gate Checkpoint Sentry ([78, 14.2, -62]) ─── */}
      <group position={[78, 14.8, -62]}>
        <mesh position={[0.25, 0, 0.2]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.25, 8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.25, -0.05, 0.32]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#FEF08A" toneMapped={false} />
        </mesh>
        <spotLight
          ref={sentryLightRef}
          position={[0.25, 0, 0.3]}
          color="#FEF08A"
          intensity={42.0 * intensityMult}
          angle={0.35}
          penumbra={0.45}
          distance={35}
        />
      </group>

      {/* ─── Guard 2: Compound Night Perimeter Patrol ([125, 14.2, -75]) ─── */}
      <group position={[125, 14.8, -75]}>
        <mesh position={[0.25, 0, 0.2]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.25, 8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.25, -0.04, 0.32]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#FEF08A" toneMapped={false} />
        </mesh>
        <spotLight
          ref={patrolLightRef}
          position={[0.25, 0, 0.3]}
          color="#FEF08A"
          intensity={38.0 * intensityMult}
          angle={0.38}
          penumbra={0.5}
          distance={32}
        />
      </group>

      {/* ─── Technician 3: Switchyard Transformer Inspection ([60, 1.2, 16]) ─── */}
      <group position={[60, 1.8, 16]}>
        <mesh position={[0.2, 0, 0.2]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.22, 8]} />
          <meshStandardMaterial color="#0284C7" metalness={0.8} />
        </mesh>
        <mesh position={[0.2, -0.04, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#E0F2FE" toneMapped={false} />
        </mesh>
        <spotLight
          position={[0.2, 0, 0.3]}
          target-position={[60, 2.5, 24]}
          color="#E0F2FE"
          intensity={32.0 * intensityMult}
          angle={0.42}
          penumbra={0.5}
          distance={26}
        />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. 480+ BIOLUMINESCENT SIERRA MADRE FOREST FIREFLIES (Across All 5 Sectors)
// ─────────────────────────────────────────────────────────────────────────────
function BioluminescentForestFireflies({ count = 480 }: { count?: number }) {
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
      const sector = i % 5;
      let x = 0, z = 0, y = 0;

      if (sector === 0) {
        // Sector 1: Upper Eastern Mountain Ridge & Saddle
        x = 50 + lcg() * 180;
        z = -250 + lcg() * 140;
        y = 14 + lcg() * 52;
      } else if (sector === 1) {
        // Sector 2: Western River Gorge & Penstock Mountain Forest
        x = -190 + lcg() * 180;
        z = -170 + lcg() * 240;
        y = 8 + lcg() * 48;
      } else if (sector === 2) {
        // Sector 3: Tumauini Riverbank & Bamboo Reeds
        x = -75 + lcg() * 210;
        z = 10 + lcg() * 85;
        y = 1.2 + lcg() * 18;
      } else if (sector === 3) {
        // Sector 4: TEMFACIL Compound Perimeter & Forest Margins
        x = 35 + lcg() * 150;
        z = -145 + lcg() * 115;
        y = 12 + lcg() * 22;
      } else {
        // Sector 5: Headpond Valley & Far Northern Ridge
        x = -65 + lcg() * 150;
        z = 75 + lcg() * 125;
        y = 1.0 + lcg() * 25;
      }

      const speed = 0.5 + lcg() * 1.4;
      const phase = lcg() * Math.PI * 2;
      const waveGroup = Math.floor(lcg() * 4);
      data.push({ x, y, z, speed, phase, waveGroup });
    }
    return data;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < fireflyData.length; i++) {
      const { x, y, z, speed, phase, waveGroup } = fireflyData[i];

      // Organic synchronized wave flashing with individual twinkling jitter
      const groupWave = Math.sin(t * 1.5 + waveGroup * 1.57) * 0.5 + 0.5;
      const individualPulse = Math.sin(t * 3.8 * speed + phase) * 0.5 + 0.5;
      const glow = Math.pow(groupWave * 0.4 + individualPulse * 0.6, 2.5);

      // Gentle 3D floating & hovering motion
      const driftX = Math.sin(t * 0.6 * speed + phase) * 2.8;
      const driftY = Math.cos(t * 1.2 * speed + phase) * 1.4;
      const driftZ = Math.sin(t * 0.5 * speed + phase) * 2.8;

      dummy.position.set(x + driftX, y + driftY, z + driftZ);
      dummy.scale.setScalar(glow * 0.65 + 0.05);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.35, 8, 8]} />
      <meshStandardMaterial
        color="#FEF08A"
        emissive="#FACC15"
        emissiveIntensity={6.0}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. CELESTIAL SHOOTING STARS
// ─────────────────────────────────────────────────────────────────────────────
function CelestialShootingStars() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.8;
    const cycle = t % 7.0;
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
// 13. SURGE TANK AVIATION STROBE BEACON
// ─────────────────────────────────────────────────────────────────────────────
function SurgeTankAviationStrobe() {
  const beaconRef = useRef<THREE.PointLight>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = t % 1.5;
    const isFlashing = (cycle > 0.0 && cycle < 0.12) || (cycle > 0.25 && cycle < 0.37);

    if (beaconRef.current) {
      beaconRef.current.intensity = isFlashing ? 32.0 : 0.8;
    }
    if (glowMeshRef.current) {
      const mat = glowMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isFlashing ? "#FF0000" : "#550000");
    }
  });

  return (
    <group position={[-38, 52.5, -58]}>
      <mesh ref={glowMeshRef}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#FF0000" toneMapped={false} />
      </mesh>
      <pointLight ref={beaconRef} color="#FF1E1E" intensity={32.0} distance={150} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. INDUSTRIAL FACILITY PERIMETER & BASKETBALL COURT FLOODLIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function IndustrialFacilityNightLighting({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="industrial-night-lighting">
      {/* ─── 69kV Switchyard Gantry Floodlights ─── */}
      <pointLight position={[55, 18.0, 10]} color="#E0F2FE" intensity={42.0 * intensityMult} distance={95} decay={2} />
      <pointLight position={[75, 18.0, 20]} color="#E0F2FE" intensity={38.0 * intensityMult} distance={90} decay={2} />
      
      {/* ─── Powerhouse Apron & Gantry Crane Deck ─── */}
      <pointLight position={[18, 30.0, 22]} color="#F8FAFC" intensity={45.0 * intensityMult} distance={110} decay={2} />
      <pointLight position={[-12, 14.0, 24]} color="#F8FAFC" intensity={35.0 * intensityMult} distance={85} decay={2} />

      {/* ─── Basketball Court 4-Corner Floodlight Poles (Full Court Illumination) ─── */}
      <spotLight
        position={[104, 22.0, -112]}
        target-position={[115, 14.0, -103]}
        color="#FFFBEB"
        intensity={36.0 * intensityMult}
        angle={0.68}
        penumbra={0.4}
        distance={52}
      />
      <spotLight
        position={[126, 22.0, -94]}
        target-position={[115, 14.0, -103]}
        color="#FFFBEB"
        intensity={36.0 * intensityMult}
        angle={0.68}
        penumbra={0.4}
        distance={52}
      />

      {/* ─── Penstock Stairs Safety Lights ─── */}
      <pointLight position={[-35, 42.0, -50]} color="#F59E0B" intensity={22.0 * intensityMult} distance={65} decay={2} />
      <pointLight position={[-25, 24.0, -32]} color="#F59E0B" intensity={22.0 * intensityMult} distance={60} decay={2} />
    </group>
  );
}
