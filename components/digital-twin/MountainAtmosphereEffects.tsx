"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA MADRE MOUNTAIN ATMOSPHERE & BIOPHYSICAL EFFECTS ENGINE
 * 
 * Clean, Natural Environmental Phenomena & Activity Lighting:
 * - 🌅 Morning:
 *     - Natural, crisp morning golden sunlight & soft mountain air
 *     - Low-lying water-surface river mist along the Tumauini gorge
 *     - Turbine draft-tube cold water aeration steam
 *     - Flocks of mountain swallows & white egrets
 * - ☀️ Afternoon:
 *     - 3D cumulus mountain cloud clusters drifting over peaks
 *     - Subtle switchyard heat shimmer
 *     - Soaring Philippine Eagle
 * - 🌇 Sunset:
 *     - Clean alpenglow horizon and long western mountain grazing shadows
 *     - No artificial vertical light beams
 * - 🌙 Night:
 *     - Building interior window glows (Admin, Barracks, Canteen, Guardhouse, Powerhouse)
 *     - Vehicle headlights casting realistic beams on the road & glowing taillights
 *     - Security guards holding dynamic tactical flashlights illuminating paths
 *     - Bioluminescent fireflies & surge tank aviation safety strobe
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

      {/* ─── 🌙 NIGHT BIOLUMINESCENCE & STARS ─── */}
      {isDeepNight && (
        <>
          <BioluminescentForestFireflies count={70} />
          <CelestialShootingStars />
        </>
      )}

      {/* ─── 💡 REALISTIC FACILITY, BUILDING, VEHICLE & GUARD LIGHTING ─── */}
      {isNight && (
        <>
          <SurgeTankAviationStrobe />
          <BuildingWindowGlows isSunset={timeMode === "SUNSET"} />
          <VehicleNightLights isSunset={timeMode === "SUNSET"} />
          <GuardFlashlights isSunset={timeMode === "SUNSET"} />
          <IndustrialFacilityNightLighting isSunset={timeMode === "SUNSET"} />
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NATURAL RIVER SURFACE MIST (Soft planar water-surface fog, no geometric bubbles)
// ─────────────────────────────────────────────────────────────────────────────
function NaturalRiverSurfaceMist() {
  const mistRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!mistRef.current) return;
    const t = clock.getElapsedTime() * 0.15;
    // Gentle river downstream drift
    mistRef.current.position.x = Math.sin(t * 0.5) * 4.0;
  });

  return (
    <group ref={mistRef} position={[0, 0.15, 25]}>
      {/* Layer 1: Tailrace outfall canal water surface mist */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 48, 1, 1]} />
        <meshBasicMaterial
          color="#F8FAFC"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      {/* Layer 2: Main river channel downstream mist ribbon */}
      <mesh position={[45, 0.1, 12]} rotation={[-Math.PI / 2, 0, 0.15]}>
        <planeGeometry args={[75, 28, 1, 1]} />
        <meshBasicMaterial
          color="#F8FAFC"
          transparent
          opacity={0.11}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      {/* Layer 3: Headpond upstream mist ribbon */}
      <mesh position={[-45, 0.1, -12]} rotation={[-Math.PI / 2, 0, -0.1]}>
        <planeGeometry args={[65, 26, 1, 1]} />
        <meshBasicMaterial
          color="#F8FAFC"
          transparent
          opacity={0.10}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TAILRACE AERATION STEAM (Turbine Draft-Tube Aeration Vapor Plumes)
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
      <meshBasicMaterial
        color="#F8FAFC"
        transparent
        opacity={0.12}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOUNTAIN SWALLOW FLOCK & WHITE EGRETS (Morning Birds)
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
// 4. DISTANT SIERRA MADRE RIDGE CLOUD BANKS (High-Altitude Soft Mountain Fluff)
// ─────────────────────────────────────────────────────────────────────────────
function DistantMountainRidgeClouds() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.08;
    // Gentle mountain ridge drift
    groupRef.current.position.x = Math.sin(t * 0.4) * 12.0;
  });

  const ridgePuffs = useMemo(() => {
    return [
      // Far eastern Sierra Madre mountain ridge banks (Z: -380 to -520, Y: 160 to 220)
      { pos: [-160, 180, -420] as [number, number, number], scale: [120, 32, 60] as [number, number, number], rot: 0.1 },
      { pos: [-60, 195, -480] as [number, number, number], scale: [140, 38, 70] as [number, number, number], rot: -0.15 },
      { pos: [80, 190, -450] as [number, number, number], scale: [150, 36, 65] as [number, number, number], rot: 0.08 },
      { pos: [220, 175, -410] as [number, number, number], scale: [130, 30, 55] as [number, number, number], rot: -0.05 },
      // High-altitude mountain crest fluff
      { pos: [-240, 210, -510] as [number, number, number], scale: [160, 42, 75] as [number, number, number], rot: 0.2 },
      { pos: [140, 220, -540] as [number, number, number], scale: [170, 45, 80] as [number, number, number], rot: -0.12 },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {ridgePuffs.map((p, idx) => (
        <group key={`ridge-cloud-${idx}`} position={p.pos} rotation={[0, p.rot, 0]}>
          {/* Main soft billowy body */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial
              color="#F8FAFC"
              roughness={0.95}
              metalness={0.0}
              transparent
              opacity={0.38}
              depthWrite={false}
            />
          </mesh>
          {/* Soft shadow base for convective cumulus look */}
          <mesh position={[0, -0.25, 0]} scale={[p.scale[0] * 0.95, p.scale[1] * 0.35, p.scale[2] * 0.95]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial
              color="#94A3B8"
              roughness={1.0}
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SWITCHYARD HEAT SHIMMER (Afternoon Micro-Particles)
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
      <meshBasicMaterial
        color="#FEF08A"
        transparent
        opacity={0.10}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HIGH-ALTITUDE RAPTOR / PHILIPPINE EAGLE (Afternoon)
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
// 7. BUILDING INTERIOR WINDOW GLOWS & WARM OFFICE LIGHTING (Night Mode)
// ─────────────────────────────────────────────────────────────────────────────
function BuildingWindowGlows({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="building-window-glows">
      {/* ─── TEMFACIL Main Administrative Office & Engineering Bay ─── */}
      {/* Golden office interior light spilling through front & side windows */}
      <pointLight position={[118, 16.5, -88]} color="#FEF08A" intensity={32.0 * intensityMult} distance={45} decay={2} />
      <pointLight position={[118, 16.5, -112]} color="#FEF08A" intensity={30.0 * intensityMult} distance={45} decay={2} />

      {/* ─── TEMFACIL Barracks 1, 2, & 3 Quarters ─── */}
      {/* Soft warm residential amber light */}
      <pointLight position={[148, 16.2, -100]} color="#FED7AA" intensity={24.0 * intensityMult} distance={38} decay={2} />
      <pointLight position={[148, 16.2, -85]} color="#FED7AA" intensity={22.0 * intensityMult} distance={38} decay={2} />
      <pointLight position={[148, 16.2, -115]} color="#FED7AA" intensity={22.0 * intensityMult} distance={38} decay={2} />

      {/* ─── TEMFACIL Canteen / Food Mess Hall ─── */}
      <pointLight position={[95, 16.0, -96]} color="#FDE68A" intensity={26.0 * intensityMult} distance={38} decay={2} />

      {/* ─── Main Guardhouse Booth Interior ─── */}
      <pointLight position={[80, 16.0, -60]} color="#FFFBEB" intensity={20.0 * intensityMult} distance={28} decay={2} />
      {/* Guardhouse Exterior Downlight */}
      <spotLight
        position={[78, 17.5, -60]}
        target-position={[78, 14.0, -60]}
        color="#FFFBEB"
        intensity={28.0 * intensityMult}
        angle={0.65}
        penumbra={0.5}
        distance={22}
      />

      {/* ─── Powerhouse Generator Turbine Hall (Cool Industrial Cyan/White Interior Glow) ─── */}
      <pointLight position={[18, 10.5, 20]} color="#E0F2FE" intensity={45.0 * intensityMult} distance={65} decay={2} />
      <pointLight position={[-8, 10.5, 20]} color="#E0F2FE" intensity={38.0 * intensityMult} distance={60} decay={2} />
      {/* Control Room Console Display Glow */}
      <pointLight position={[18, 16.0, 14]} color="#38BDF8" intensity={22.0 * intensityMult} distance={30} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. VEHICLE ACTIVE HEADLIGHTS & TAILLIGHTS (Night Mode)
// ─────────────────────────────────────────────────────────────────────────────
function VehicleNightLights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.5 : 1.0;

  return (
    <group name="vehicle-night-lights">
      {/* ─── 1. Red Dump Truck (Near Guardhouse Gate: [70, 14.5, -58]) ─── */}
      <group position={[70, 14.5, -58]} rotation={[0, -0.4, 0]}>
        {/* Left Headlight Beam */}
        <spotLight
          position={[-0.9, 1.1, 3.2]}
          target-position={[-0.9, 0.0, 32.0]}
          color="#FFFBEB"
          intensity={35.0 * intensityMult}
          angle={0.42}
          penumbra={0.65}
          distance={42}
        />
        {/* Right Headlight Beam */}
        <spotLight
          position={[0.9, 1.1, 3.2]}
          target-position={[0.9, 0.0, 32.0]}
          color="#FFFBEB"
          intensity={35.0 * intensityMult}
          angle={0.42}
          penumbra={0.65}
          distance={42}
        />
        {/* Emissive Headlight Lenses */}
        <mesh position={[-0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshBasicMaterial color="#FFFBEB" />
        </mesh>
        <mesh position={[0.9, 1.1, 3.1]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshBasicMaterial color="#FFFBEB" />
        </mesh>
        {/* Rear Red Taillight Glow */}
        <pointLight position={[0, 1.0, -3.8]} color="#EF4444" intensity={8.0 * intensityMult} distance={15} decay={2} />
      </group>

      {/* ─── 2. Yellow Maintenance Pickup Truck (Access Road: [52, 11.8, -42]) ─── */}
      <group position={[52, 11.8, -42]} rotation={[0, 0.35, 0]}>
        <spotLight
          position={[-0.7, 0.85, 2.5]}
          target-position={[-0.7, 0.0, 26.0]}
          color="#FEF08A"
          intensity={28.0 * intensityMult}
          angle={0.45}
          penumbra={0.6}
          distance={35}
        />
        <spotLight
          position={[0.7, 0.85, 2.5]}
          target-position={[0.7, 0.0, 26.0]}
          color="#FEF08A"
          intensity={28.0 * intensityMult}
          angle={0.45}
          penumbra={0.6}
          distance={35}
        />
        {/* Amber Cab Safety Strobe */}
        <pointLight position={[0, 1.9, 0.2]} color="#F59E0B" intensity={12.0 * intensityMult} distance={18} decay={2} />
        {/* Rear Red Taillights */}
        <pointLight position={[0, 0.8, -2.6]} color="#EF4444" intensity={6.0 * intensityMult} distance={12} decay={2} />
      </group>

      {/* ─── 3. Black Site Security SUV (TEMFACIL Compound: [90, 14.5, -80]) ─── */}
      <group position={[90, 14.5, -80]} rotation={[0, -1.2, 0]}>
        <spotLight
          position={[-0.75, 0.8, 2.4]}
          target-position={[-0.75, 0.0, 25.0]}
          color="#F8FAFC"
          intensity={30.0 * intensityMult}
          angle={0.4}
          penumbra={0.6}
          distance={36}
        />
        <spotLight
          position={[0.75, 0.8, 2.4]}
          target-position={[0.75, 0.0, 25.0]}
          color="#F8FAFC"
          intensity={30.0 * intensityMult}
          angle={0.4}
          penumbra={0.6}
          distance={36}
        />
        <pointLight position={[0, 0.8, -2.4]} color="#EF4444" intensity={6.0 * intensityMult} distance={12} decay={2} />
      </group>

      {/* ─── 4. Supercar (TEMFACIL Center Circle: [105, 14.2, -92]) ─── */}
      <group position={[105, 14.2, -92]} rotation={[0, 0.8, 0]}>
        <spotLight
          position={[-0.7, 0.55, 2.0]}
          target-position={[-0.7, 0.0, 24.0]}
          color="#E0F2FE"
          intensity={25.0 * intensityMult}
          angle={0.42}
          penumbra={0.5}
          distance={30}
        />
        <spotLight
          position={[0.7, 0.55, 2.0]}
          target-position={[0.7, 0.0, 24.0]}
          color="#E0F2FE"
          intensity={25.0 * intensityMult}
          angle={0.42}
          penumbra={0.5}
          distance={30}
        />
        <pointLight position={[0, 0.6, -2.0]} color="#EF4444" intensity={8.0 * intensityMult} distance={14} decay={2} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SECURITY GUARDS & PERSONNEL TACTICAL FLASHLIGHTS (Night Mode)
// ─────────────────────────────────────────────────────────────────────────────
function GuardFlashlights({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;
  const sentryLightRef = useRef<THREE.SpotLight>(null);
  const patrolLightRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Guardhouse sentry flashlight subtle scanning motion
    if (sentryLightRef.current && sentryLightRef.current.target) {
      sentryLightRef.current.target.position.x = 76 + Math.sin(t * 0.8) * 6.0;
      sentryLightRef.current.target.position.z = -42 + Math.cos(t * 0.6) * 4.0;
      sentryLightRef.current.target.updateMatrixWorld();
    }
    // Patrolling guard sweeping flashlight along compound walkway
    if (patrolLightRef.current && patrolLightRef.current.target) {
      patrolLightRef.current.target.position.x = 125 + Math.sin(t * 1.1) * 8.0;
      patrolLightRef.current.target.position.z = -58 + Math.cos(t * 0.9) * 6.0;
      patrolLightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group name="guard-flashlights">
      {/* ─── Guard 1: Main Guardhouse Gate Checkpoint Sentry ([78, 14.2, -62]) ─── */}
      <group position={[78, 14.8, -62]}>
        {/* Flashlight Mesh in Hand */}
        <mesh position={[0.25, 0, 0.2]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.25, 8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Glowing Flashlight Lens */}
        <mesh position={[0.25, -0.05, 0.32]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#FEF08A" />
        </mesh>
        {/* High-Lumen Tactical Search Beam */}
        <spotLight
          ref={sentryLightRef}
          position={[0.25, 0, 0.3]}
          color="#FEF08A"
          intensity={32.0 * intensityMult}
          angle={0.32}
          penumbra={0.45}
          distance={28}
        />
      </group>

      {/* ─── Guard 2: Compound Night Perimeter Patrol ([125, 14.2, -75]) ─── */}
      <group position={[125, 14.8, -75]}>
        <mesh position={[0.25, 0, 0.2]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.25, 8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.25, -0.04, 0.32]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#FEF08A" />
        </mesh>
        <spotLight
          ref={patrolLightRef}
          position={[0.25, 0, 0.3]}
          color="#FEF08A"
          intensity={28.0 * intensityMult}
          angle={0.35}
          penumbra={0.5}
          distance={26}
        />
      </group>

      {/* ─── Technician 3: Switchyard Transformer Inspection ([60, 1.2, 16]) ─── */}
      <group position={[60, 1.8, 16]}>
        <mesh position={[0.2, 0, 0.2]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.22, 8]} />
          <meshStandardMaterial color="#0284C7" metalness={0.8} />
        </mesh>
        <spotLight
          position={[0.2, 0, 0.3]}
          target-position={[60, 2.5, 24]}
          color="#E0F2FE"
          intensity={22.0 * intensityMult}
          angle={0.4}
          penumbra={0.5}
          distance={20}
        />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BIOLUMINESCENT FOREST FIREFLIES (Night Mode)
// ─────────────────────────────────────────────────────────────────────────────
function BioluminescentForestFireflies({ count = 70 }: { count?: number }) {
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
// 11. CELESTIAL SHOOTING STARS (Night Mode)
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
// 12. SURGE TANK AVIATION STROBE BEACON (ICAO Red Strobe at [-38, 52, -58])
// ─────────────────────────────────────────────────────────────────────────────
function SurgeTankAviationStrobe() {
  const beaconRef = useRef<THREE.PointLight>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
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
// 13. INDUSTRIAL FACILITY PERIMETER & DECK FLOODLIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function IndustrialFacilityNightLighting({ isSunset = false }: { isSunset?: boolean }) {
  const intensityMult = isSunset ? 0.45 : 1.0;

  return (
    <group name="industrial-night-lighting">
      {/* ─── 69kV Switchyard Gantry Floodlights ─── */}
      <pointLight position={[55, 18.0, 10]} color="#E0F2FE" intensity={34.0 * intensityMult} distance={85} decay={2} />
      <pointLight position={[75, 18.0, 20]} color="#E0F2FE" intensity={30.0 * intensityMult} distance={80} decay={2} />
      
      {/* ─── Powerhouse Apron & Gantry Crane Deck ─── */}
      <pointLight position={[18, 30.0, 22]} color="#F8FAFC" intensity={38.0 * intensityMult} distance={95} decay={2} />
      <pointLight position={[-12, 14.0, 24]} color="#F8FAFC" intensity={28.0 * intensityMult} distance={75} decay={2} />

      {/* ─── Basketball Court 4-Corner Floodlight Poles ─── */}
      <spotLight
        position={[104, 22.0, -112]}
        target-position={[115, 14.0, -103]}
        color="#FFFBEB"
        intensity={28.0 * intensityMult}
        angle={0.65}
        penumbra={0.4}
        distance={45}
      />
      <spotLight
        position={[126, 22.0, -94]}
        target-position={[115, 14.0, -103]}
        color="#FFFBEB"
        intensity={28.0 * intensityMult}
        angle={0.65}
        penumbra={0.4}
        distance={45}
      />

      {/* ─── Penstock Stairs Safety Lights ─── */}
      <pointLight position={[-35, 42.0, -50]} color="#F59E0B" intensity={18.0 * intensityMult} distance={55} decay={2} />
      <pointLight position={[-25, 24.0, -32]} color="#F59E0B" intensity={18.0 * intensityMult} distance={50} decay={2} />
    </group>
  );
}
