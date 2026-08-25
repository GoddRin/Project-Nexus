"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";
import { MAT_GLASS_CLEAR, MAT_GLASS_BLUE } from "./SharedMaterials";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA MADRE MOUNTAIN ATMOSPHERE & BIOPHYSICAL EFFECTS ENGINE
 * 
 * - 🌅 Morning:
 *     - Natural golden mountain sunlight & soft planar river surface mist
 *     - Turbine draft-tube cold water aeration steam
 *     - Flocks of mountain swallows & white egrets
 * - ☀️ Afternoon:
 *     - Majestic 3D Puffy Sierra Madre Cumulus Cloud Formations (Organic Multi-Puff Banks)
 *     - Subtle switchyard heat shimmer & soaring Philippine Eagle
 * - 🌇 Sunset:
 *     - Clean alpenglow horizon & western mountain grazing shadows
 * - 🌙 Night:
 *     - 480+ Bioluminescent Forest Fireflies distributed across all 5 forest sectors
 *     - Real building windows & houses illuminated from inside the structures
 *     - Vehicle Headlights casting realistic forward spot beams on roads + Red Taillights
 *     - Security Guards & Technicians with Dynamic Tactical Search Flashlights
 *     - Surge Tank Red Aviation Safety Strobe & Industrial Switchyard Lights
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

  // ─── DYNAMIC BUILDING WINDOW EMISSIVE CONTROLLER ───
  // Illuminates windows directly on all houses, barracks, offices, and powerhouse from inside
  useEffect(() => {
    if (isDeepNight) {
      // Warm 3000K golden interior lighting for houses, barracks, offices
      MAT_GLASS_CLEAR.emissive.set("#FEF08A");
      MAT_GLASS_CLEAR.emissiveIntensity = 3.2;
      // Cyan-white industrial illumination for Powerhouse Turbine Hall
      MAT_GLASS_BLUE.emissive.set("#7DD3FC");
      MAT_GLASS_BLUE.emissiveIntensity = 3.5;
    } else if (timeMode === "SUNSET") {
      MAT_GLASS_CLEAR.emissive.set("#FED7AA");
      MAT_GLASS_CLEAR.emissiveIntensity = 1.4;
      MAT_GLASS_BLUE.emissive.set("#38BDF8");
      MAT_GLASS_BLUE.emissiveIntensity = 1.6;
    } else {
      // Daytime: Clear non-emissive natural glass
      MAT_GLASS_CLEAR.emissive.set("#000000");
      MAT_GLASS_CLEAR.emissiveIntensity = 0.0;
      MAT_GLASS_BLUE.emissive.set("#000000");
      MAT_GLASS_BLUE.emissiveIntensity = 0.0;
    }
  }, [timeMode, isDeepNight]);

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

      {/* ─── ☀️ AFTERNOON 3D PUFFY MOUNTAIN CUMULUS CLOUDS ─── */}
      {isAfternoon && (
        <>
          <PhotorealisticMountainCumulus />
          <SwitchyardHeatShimmer />
          <HighAltitudeRaptor />
        </>
      )}

      {/* ─── 🌙 BIOLUMINESCENT SIERRA MADRE FOREST FIREFLIES ─── */}
      {isDeepNight && (
        <>
          <BioluminescentForestFireflies count={260} />
          <CelestialShootingStars />
        </>
      )}

      {/* ─── 💡 REALISTIC FACILITY, BUILDING, VEHICLE & GUARD LIGHTING ─── */}
      {isNight && (
        <>
          <SurgeTankAviationStrobe />
          <BuildingInteriorRoomLights isSunset={timeMode === "SUNSET"} />
          <VehicleNightLights isSunset={timeMode === "SUNSET"} />
          <GuardFlashlights isSunset={timeMode === "SUNSET"} />
          <IndustrialFacilityNightLighting isSunset={timeMode === "SUNSET"} />
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NATURAL RIVER SURFACE MIST
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
// 4. 3D PUFFY SIERRA MADRE MOUNTAIN CUMULUS CLOUDS (Organic Multi-Puff Banks)
// ─────────────────────────────────────────────────────────────────────────────
function PhotorealisticMountainCumulus() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.12;
    // Slow majestic trade wind drift across the mountain horizon
    groupRef.current.position.x = ((t * 2.8) % 450) - 225;
  });

  // 4 Organic Cumulus Cloud Formations composed of overlapping soft rounded puffs
  const cloudBanks = useMemo(() => {
    return [
      {
        basePos: [-130, 105, -280] as [number, number, number],
        puffs: [
          { offset: [0, 6, 0], r: 18 },
          { offset: [-14, 0, 4], r: 15 },
          { offset: [14, 2, -2], r: 16 },
          { offset: [-25, -4, 2], r: 13 },
          { offset: [26, -3, 3], r: 14 },
          { offset: [0, -6, 0], r: 20 },
          { offset: [-10, 8, -4], r: 14 },
          { offset: [8, 9, 2], r: 15 },
        ],
      },
      {
        basePos: [-30, 120, -340] as [number, number, number],
        puffs: [
          { offset: [0, 8, 0], r: 24 },
          { offset: [-18, 2, 5], r: 19 },
          { offset: [18, 3, -4], r: 20 },
          { offset: [-34, -4, 2], r: 16 },
          { offset: [35, -5, 1], r: 17 },
          { offset: [0, -7, 0], r: 26 },
          { offset: [-12, 12, -3], r: 17 },
          { offset: [14, 11, 4], r: 18 },
          { offset: [-6, 16, 0], r: 14 },
        ],
      },
      {
        basePos: [85, 112, -300] as [number, number, number],
        puffs: [
          { offset: [0, 7, 0], r: 20 },
          { offset: [-16, 1, 3], r: 16 },
          { offset: [17, 3, -3], r: 17 },
          { offset: [-28, -5, 0], r: 14 },
          { offset: [29, -4, 2], r: 15 },
          { offset: [0, -6, 0], r: 22 },
          { offset: [-8, 11, -2], r: 15 },
          { offset: [10, 10, 3], r: 16 },
        ],
      },
      {
        basePos: [195, 102, -260] as [number, number, number],
        puffs: [
          { offset: [0, 5, 0], r: 17 },
          { offset: [-13, 0, 3], r: 14 },
          { offset: [15, 2, -2], r: 15 },
          { offset: [-24, -4, 1], r: 12 },
          { offset: [25, -3, 2], r: 13 },
          { offset: [0, -5, 0], r: 19 },
          { offset: [2, 9, -1], r: 13 },
        ],
      },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {cloudBanks.map((bank, bankIdx) => (
        <group key={`cumulus-bank-${bankIdx}`} position={bank.basePos}>
          {bank.puffs.map((puff, puffIdx) => (
            <mesh
              key={`puff-${bankIdx}-${puffIdx}`}
              position={[puff.offset[0], puff.offset[1], puff.offset[2]]}
            >
              <sphereGeometry args={[puff.r, 16, 12]} />
              <meshStandardMaterial
                color="#FFFFFF"
                roughness={0.98}
                metalness={0.0}
                transparent
                opacity={0.90}
                depthWrite={false}
              />
            </mesh>
          ))}
          {/* Flat convective shadow base */}
          <mesh position={[0, -10, 0]} scale={[1.4, 0.25, 1.2]}>
            <sphereGeometry args={[22, 14, 10]} />
            <meshStandardMaterial
              color="#94A3B8"
              roughness={1.0}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
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
// 7. BUILDING INTERIOR ROOM LIGHTS (Placed INSIDE structures, no outside floating cards)
// ─────────────────────────────────────────────────────────────────────────────
function BuildingInteriorRoomLights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="building-interior-lights">
      {/* ═══ Inside Powerhouse Generator Hall ([0, 8.5, 0]) ═══ */}
      <pointLight position={[0, 8.5, 0]} color="#E0F2FE" intensity={45.0 * intensityMult} distance={35} decay={2} />
      <pointLight position={[-6, 8.5, 0]} color="#BAE6FD" intensity={30.0 * intensityMult} distance={28} decay={2} />
      <pointLight position={[6, 8.5, 0]} color="#BAE6FD" intensity={30.0 * intensityMult} distance={28} decay={2} />

      {/* ═══ Inside TEMFACIL Staff House & Women's Quarters ([130, 16.0, -107]) ═══ */}
      <pointLight position={[130, 16.0, -107]} color="#FEF08A" intensity={32.0 * intensityMult} distance={25} decay={2} />

      {/* ═══ Inside TEMFACIL Staff Office & Planning Head Bay ([118, 16.5, -95]) ═══ */}
      <pointLight position={[118, 16.5, -95]} color="#FFFBEB" intensity={35.0 * intensityMult} distance={28} decay={2} />

      {/* ═══ Inside Barracks 1, 2, & 3 Quarters ([146, 16.0, -87]) ═══ */}
      <pointLight position={[146, 16.0, -87]} color="#FED7AA" intensity={30.0 * intensityMult} distance={24} decay={2} />
      <pointLight position={[146, 19.5, -87]} color="#FED7AA" intensity={26.0 * intensityMult} distance={24} decay={2} />

      {/* ═══ Inside Food Canteen & Kitchen ([96, 16.0, -97]) ═══ */}
      <pointLight position={[96, 16.0, -97]} color="#FDE047" intensity={38.0 * intensityMult} distance={30} decay={2} />

      {/* ═══ Inside Guardhouse Booth ([80, 15.5, -60]) ═══ */}
      <pointLight position={[80, 15.5, -60]} color="#FFFBEB" intensity={22.0 * intensityMult} distance={18} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. VEHICLE ACTIVE HEADLIGHTS & TAILLIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function VehicleNightLights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.5 : 1.0;

  return (
    <group name="vehicle-night-lights">
      {/* ─── 1. Red Dump Truck (Access Road: [70, 14.5, -58]) ─── */}
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
        <mesh position={[-0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
        </mesh>
        <mesh position={[0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshBasicMaterial color="#FFFBEB" toneMapped={false} />
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
// 9. SECURITY GUARDS & PERSONNEL TACTICAL FLASHLIGHTS
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
// 10. BIOLUMINESCENT SIERRA MADRE FOREST FIREFLIES (Lush Wilderness & Ridge Forests)
// ─────────────────────────────────────────────────────────────────────────────
function BioluminescentForestFireflies({ count = 260 }: { count?: number }) {
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
      const sector = i % 4;
      let x = 0, z = 0, y = 0;

      if (sector === 0) {
        // Sector 1: Upper Eastern Mountain Ridge & High Forest Trees
        x = 175 + lcg() * 95;
        z = -260 + lcg() * 180;
        y = 16 + lcg() * 45;
      } else if (sector === 1) {
        // Sector 2: Western River Gorge & Penstock Mountain Forest
        x = -210 + lcg() * 165;
        z = -180 + lcg() * 220;
        y = 10 + lcg() * 45;
      } else if (sector === 2) {
        // Sector 3: Tumauini Riparian Riverbanks & Bamboo Groves
        x = -85 + lcg() * 180;
        z = 35 + lcg() * 90;
        y = 1.5 + lcg() * 16;
      } else {
        // Sector 4: Deep North-East Mountain Forest & Saddle
        x = 40 + lcg() * 140;
        z = -280 + lcg() * 110;
        y = 18 + lcg() * 40;
      }

      // Strict Facility Exclusion Zone Check (Keep Powerhouse & TEMFACIL clean)
      const isInTemfacil = x >= 65 && x <= 170 && z >= -150 && z <= -45;
      const isInPowerhouse = x >= -30 && x <= 75 && z >= -30 && z <= 32;

      if (isInTemfacil) {
        // Shift outward into the Eastern Sierra Madre forest slope
        x += 110;
        z -= 40;
      } else if (isInPowerhouse) {
        // Shift outward into the Western river gorge forest
        x -= 65;
        z += 45;
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
// 11. CELESTIAL SHOOTING STARS
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
// 12. SURGE TANK AVIATION STROBE BEACON
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
// 13. INDUSTRIAL FACILITY PERIMETER & DECK LIGHTING
// ─────────────────────────────────────────────────────────────────────────────
function IndustrialFacilityNightLighting({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="industrial-night-lighting">
      {/* ─── 69kV Switchyard Gantry Floodlights ─── */}
      <pointLight position={[55, 18.0, 10]} color="#E0F2FE" intensity={38.0 * intensityMult} distance={95} decay={2} />
      <pointLight position={[75, 18.0, 20]} color="#E0F2FE" intensity={34.0 * intensityMult} distance={90} decay={2} />
      
      {/* ─── Powerhouse Apron & Gantry Crane Deck ─── */}
      <pointLight position={[18, 30.0, 22]} color="#F8FAFC" intensity={40.0 * intensityMult} distance={110} decay={2} />
      <pointLight position={[-12, 14.0, 24]} color="#F8FAFC" intensity={30.0 * intensityMult} distance={85} decay={2} />

      {/* ─── Penstock Stairs Safety Lights ─── */}
      <pointLight position={[-35, 42.0, -50]} color="#F59E0B" intensity={20.0 * intensityMult} distance={65} decay={2} />
      <pointLight position={[-25, 24.0, -32]} color="#F59E0B" intensity={20.0 * intensityMult} distance={60} decay={2} />
    </group>
  );
}
