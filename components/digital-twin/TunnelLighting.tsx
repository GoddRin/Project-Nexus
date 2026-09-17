/**
 * TunnelLighting.tsx
 *
 * Authentic Subterranean Industrial Lighting for Project Nexus Headrace Tunnel.
 * Grounded in docs/tunnel-scene-brief.md & real Philippine hydro drill-and-blast operations.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LIGHT BUDGET & SHADOW PERFORMANCE CONTRACT (RESOLVED ARCHITECTURE):
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. FACE FLOODLIGHT SHADOW COST:
 *    The heavy-duty twin-head tripod fixture casts shadows from only ONE of the
 *    two lamp heads (Head A = Key Light with castShadow=true, shadow-mapSize=1024).
 *    Head B is explicitly a non-shadow-casting fill light (castShadow=false).
 *    This preserves the WebGL forward-rendering shadow budget.
 *
 * 2. STRING WORK-LIGHTS ILLUSION:
 *    Physical protective yellow wire cages and glowing bulb cores are rendered
 *    as instanced meshes along the full tunnel drive every 6m, feeding the existing
 *    cinematic bloom pass. Dynamic point lights are rationed strictly to 3 strategic
 *    zones (portal, mid-drive, support transition), maintaining locked 60 FPS.
 *
 * 3. VOLUMETRIC CONE REUSE & LOD:
 *    Dual volumetric light shafts are attached to the face floodlights. Reusable
 *    for worker headlamps in Phase 4 under a strict maxLODDistance cutoff.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { VolumetricLightBeam } from "./VolumetricLightBeam";

export interface TunnelLightingProps {
  /**
   * Tunnel alignment spline (to calculate string light and floodlight coordinates).
   */
  spline: THREE.Curve<THREE.Vector3>;

  /**
   * Tunnel radius in meters. Default: 2.5m.
   */
  radius?: number;

  /**
   * Tunnel length in meters. Default: 60m.
   */
  length?: number;

  /**
   * Whether to render the active face portable tripod floodlights. Default: true.
   */
  showFloodlights?: boolean;

  /**
   * Whether to render overhead crown/shoulder string lights. Default: true.
   */
  showStringLights?: boolean;

  /**
   * Whether to render volumetric god-ray shafts. Default: true.
   */
  showVolumetrics?: boolean;

  /**
   * Safety alert pulse mode (e.g. for SO3 gas leak alert).
   * Pulses string lights amber. Default: false.
   */
  amberWarning?: boolean;

  /**
   * Global light intensity multiplier. Default: 1.0.
   */
  intensityMultiplier?: number;
}

const scratchDummy = new THREE.Object3D();

export function TunnelLighting({
  spline,
  radius = 2.5,
  length = 60.0,
  showFloodlights = true,
  showStringLights = true,
  showVolumetrics = true,
  amberWarning = false,
  intensityMultiplier = 1.0,
}: TunnelLightingProps) {
  // ─── 1. FACE FLOODLIGHT POSITION & ORIENTATION (At v ≈ 0.90) ──────────────
  // Heading face is at v = 1.0. Tripod stands ~6m back at v = 0.90, on the left shoulder.
  const floodlightSetup = useMemo(() => {
    const vStand = 0.90;
    const centerStand = spline.getPointAt(vStand);
    const tangent = spline.getTangentAt(vStand).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Floor is at Y = -radius (e.g. -2.5m).
    // Tripod legs are 1.5m tall; head is at -radius + 1.5m => Y = -1.0m.
    // Position offset to the left shoulder: -radius * 0.58 (-1.45m for 2.5m radius)
    const tripodPos = centerStand.clone().addScaledVector(right, -radius * 0.58);
    tripodPos.y += -radius + 1.5; // Base stands exactly on invert floor

    // Aim target at the blasted rock face and muck pile (v = 1.0)
    const faceCenter = spline.getPointAt(1.0);
    const targetPos = faceCenter.clone();
    targetPos.y += -radius + 1.0; // Aim at blasted face rock base & muck rubble

    // Twin heads lateral offset: Head A (left) and Head B (right) on the crossbar
    const crossbarRight = right.clone().multiplyScalar(0.26);
    const headAPos = tripodPos.clone().sub(crossbarRight);
    const headBPos = tripodPos.clone().add(crossbarRight);

    return {
      tripodPos,
      targetPos,
      headAPos,
      headBPos,
      tangent,
      right,
    };
  }, [spline, radius]);

  // Target object for Three.js spotLights
  const spotTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.copy(floodlightSetup.targetPos);
    return obj;
  }, [floodlightSetup]);

  // ─── 2. STRING LIGHT STATIONS (Every ~6m along the 60m spline) ────────────
  // Mounted along the right shoulder pin line: X ≈ +radius * 0.82, Y ≈ +radius * 0.35
  const stringLightStations = useMemo(() => {
    const stations: {
      position: THREE.Vector3;
      v: number;
      isLightSource: boolean; // Only 3 will carry dynamic point lights
    }[] = [];

    const numFixtures = 10; // 6m spacing along 60m tunnel
    for (let i = 0; i < numFixtures; i++) {
      const v = (i + 0.5) / numFixtures; // v in [0.05, 0.95]
      const pt = spline.getPointAt(v);
      const tangent = spline.getTangentAt(v).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Right shoulder line inside horseshoe wall
      const pos = pt.clone().addScaledVector(right, radius * 0.82);
      pos.y += radius * 0.35; // ~3.38m above floor for radius=2.5m

      // Strategic dynamic point lights at:
      // i = 1 (portal zone, v = 0.15)
      // i = 5 (mid-drive shotcrete, v = 0.55)
      // i = 8 (support transition, v = 0.85)
      const isLightSource = i === 1 || i === 5 || i === 8;

      stations.push({ position: pos, v, isLightSource });
    }

    return stations;
  }, [spline, radius]);

  // ─── 3. INSTANCED MESHES FOR STRING LIGHT CAGES & BULB FILAMENTS ──────────
  const cagesRef = useRef<THREE.InstancedMesh>(null);
  const bulbsRef = useRef<THREE.InstancedMesh>(null);

  // Wire cage geometry: small faceted cylinder with protective rings
  const cageGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8, 2, true);
    geo.translate(0, -0.11, 0);
    return geo;
  }, []);

  // Bulb core geometry: glowing sphere
  const bulbGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.045, 12, 12);
    geo.translate(0, -0.11, 0);
    return geo;
  }, []);

  // Set instance matrices on mount
  useMemo(() => {
    // Handled in useEffect or populated on render
  }, []);

  const stringLightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#FFDEAA",
      emissive: new THREE.Color("#FFAE42"),
      emissiveIntensity: 3.5,
      roughness: 0.2,
    });
  }, []);

  const cageMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#E5A93C", // Safety yellow wire cage
      metalness: 0.6,
      roughness: 0.4,
      wireframe: true,
    });
  }, []);

  // Dynamic animation (amber warning pulse)
  useFrame((state) => {
    if (amberWarning && bulbsRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 6.0);
      stringLightMaterial.emissive.setRGB(1.0, 0.4 + 0.3 * pulse, 0.05);
      stringLightMaterial.emissiveIntensity = 2.0 + 4.0 * pulse;
    } else {
      stringLightMaterial.emissive.setRGB(1.0, 0.68, 0.26);
      stringLightMaterial.emissiveIntensity = 3.5;
    }

    if (cagesRef.current && bulbsRef.current) {
      stringLightStations.forEach((st, idx) => {
        scratchDummy.position.copy(st.position);
        scratchDummy.scale.set(1, 1, 1);
        scratchDummy.updateMatrix();
        cagesRef.current?.setMatrixAt(idx, scratchDummy.matrix);
        bulbsRef.current?.setMatrixAt(idx, scratchDummy.matrix);
      });
      cagesRef.current.instanceMatrix.needsUpdate = true;
      bulbsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="tunnel-atmospheric-lighting">
      {/* Invisible target object for floodlight spotlights */}
      <primitive object={spotTarget} />

      {/* ═══ 1. PORTABLE ACTIVE FACE FLOODLIGHTS (Heavy-Duty Yellow Tripod) ═══ */}
      {showFloodlights && (
        <group name="face-floodlight-tripod">
          {/* Tripod yellow tubular legs (3 legs splayed to invert) */}
          <mesh position={[floodlightSetup.tripodPos.x, floodlightSetup.tripodPos.y - 0.75, floodlightSetup.tripodPos.z]}>
            <cylinderGeometry args={[0.04, 0.55, 1.5, 3]} />
            <meshStandardMaterial color="#E5A93C" roughness={0.38} metalness={0.7} />
          </mesh>

          {/* Central vertical mast */}
          <mesh position={[floodlightSetup.tripodPos.x, floodlightSetup.tripodPos.y, floodlightSetup.tripodPos.z]}>
            <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
            <meshStandardMaterial color="#2B2D31" roughness={0.5} metalness={0.8} />
          </mesh>

          {/* Crossbar holding dual heads */}
          <mesh position={[floodlightSetup.tripodPos.x, floodlightSetup.tripodPos.y + 0.28, floodlightSetup.tripodPos.z]}>
            <boxGeometry args={[0.55, 0.04, 0.04]} />
            <meshStandardMaterial color="#E5A93C" roughness={0.4} metalness={0.6} />
          </mesh>

          {/* HEAD A: Primary Key Light with Heavy-Duty Industrial Die-Cast Housing */}
          <group
            position={[floodlightSetup.headAPos.x, floodlightSetup.headAPos.y + 0.28, floodlightSetup.headAPos.z]}
            rotation={[
              Math.asin(Math.max(-1, Math.min(1, (floodlightSetup.targetPos.y - floodlightSetup.headAPos.y) / floodlightSetup.targetPos.distanceTo(floodlightSetup.headAPos)))),
              Math.atan2(floodlightSetup.targetPos.x - floodlightSetup.headAPos.x, floodlightSetup.targetPos.z - floodlightSetup.headAPos.z) + Math.PI,
              0
            ]}
          >
            {/* Swivel mounting bracket */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
              <meshStandardMaterial color="#E5A93C" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Die-cast aluminum rear cooling fins & housing */}
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[0.24, 0.18, 0.14]} />
              <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.8} />
            </mesh>
            {/* Safety yellow protective bezel frame */}
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[0.26, 0.20, 0.02]} />
              <meshStandardMaterial color="#E5A93C" roughness={0.4} metalness={0.5} />
            </mesh>
            {/* Recessed tempered glass lens with warm emissive halogen glow */}
            <mesh position={[0, 0, -0.015]}>
              <boxGeometry args={[0.22, 0.16, 0.01]} />
              <meshStandardMaterial
                color="#FEF3C7"
                emissive="#F59E0B"
                emissiveIntensity={0.85}
                roughness={0.15}
                metalness={0.1}
              />
            </mesh>

            {/* KEY SPOTLIGHT: Casts shadows from Head A only (Resolution 3) */}
            <spotLight
              target={spotTarget}
              color="#FFF2D6"
              intensity={45 * intensityMultiplier}
              angle={Math.PI / 4.8}
              penumbra={0.45}
              distance={28}
              decay={1.8}
              castShadow={true}
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0005}
              shadow-camera-near={0.5}
              shadow-camera-far={25}
            />

            {/* Volumetric shaft from Head A */}
            {showVolumetrics && (
              <VolumetricLightBeam
                length={9.5}
                radiusTop={0.12}
                radiusBottom={1.8}
                color="#FFF5E4"
                intensity={0.48}
                maxLODDistance={45.0}
                position={[0, 0, -0.02]}
                targetPosition={[
                  floodlightSetup.targetPos.x,
                  floodlightSetup.targetPos.y,
                  floodlightSetup.targetPos.z,
                ]}
              />
            )}
          </group>

          {/* HEAD B: Secondary Fill Light with Matching Industrial Housing */}
          <group
            position={[floodlightSetup.headBPos.x, floodlightSetup.headBPos.y + 0.28, floodlightSetup.headBPos.z]}
            rotation={[
              Math.asin(Math.max(-1, Math.min(1, (floodlightSetup.targetPos.y - floodlightSetup.headBPos.y) / floodlightSetup.targetPos.distanceTo(floodlightSetup.headBPos)))),
              Math.atan2(floodlightSetup.targetPos.x - floodlightSetup.headBPos.x, floodlightSetup.targetPos.z - floodlightSetup.headBPos.z) + Math.PI,
              0
            ]}
          >
            {/* Swivel mounting bracket */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
              <meshStandardMaterial color="#E5A93C" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Die-cast aluminum rear housing */}
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[0.24, 0.18, 0.14]} />
              <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.8} />
            </mesh>
            {/* Protective yellow frame bezel */}
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[0.26, 0.20, 0.02]} />
              <meshStandardMaterial color="#E5A93C" roughness={0.4} metalness={0.5} />
            </mesh>
            {/* Recessed glass lens with warm emissive glow */}
            <mesh position={[0, 0, -0.015]}>
              <boxGeometry args={[0.22, 0.16, 0.01]} />
              <meshStandardMaterial
                color="#FEF3C7"
                emissive="#F59E0B"
                emissiveIntensity={0.65}
                roughness={0.15}
                metalness={0.1}
              />
            </mesh>

            {/* FILL SPOTLIGHT: Non-shadow casting (Resolution 3) */}
            <spotLight
              target={spotTarget}
              color="#FFF0CC"
              intensity={32 * intensityMultiplier}
              angle={Math.PI / 4.2}
              penumbra={0.6}
              distance={24}
              decay={1.8}
              castShadow={false}
            />

            {/* Volumetric shaft from Head B */}
            {showVolumetrics && (
              <VolumetricLightBeam
                length={8.8}
                radiusTop={0.12}
                radiusBottom={1.7}
                color="#FFF2D6"
                intensity={0.38}
                maxLODDistance={45.0}
                position={[0, 0, 0.07]}
                targetPosition={[
                  floodlightSetup.targetPos.x,
                  floodlightSetup.targetPos.y,
                  floodlightSetup.targetPos.z,
                ]}
              />
            )}
          </group>
        </group>
      )}

      {/* ═══ 2. OVERHEAD SHOULDER STRING LIGHTS (Instanced Cages & Bulbs) ═══ */}
      {showStringLights && (
        <group name="overhead-string-lights">
          {/* Instanced protective wire cages */}
          <instancedMesh
            ref={cagesRef}
            args={[cageGeometry, cageMaterial, stringLightStations.length]}
          />

          {/* Instanced glowing bulb cores */}
          <instancedMesh
            ref={bulbsRef}
            args={[bulbGeometry, stringLightMaterial, stringLightStations.length]}
          />

          {/* RATIONED STRATEGIC POINT LIGHTS: Exactly 3 dynamic lights along the 60m drive */}
          {stringLightStations
            .filter((st) => st.isLightSource)
            .map((st, idx) => (
              <pointLight
                key={`string-point-light-${idx}`}
                position={[st.position.x - 0.2, st.position.y - 0.15, st.position.z]}
                color={amberWarning ? "#FFA020" : "#FFE1A8"}
                intensity={(amberWarning ? 16 : 12) * intensityMultiplier}
                distance={14}
                decay={2.0}
                castShadow={false} // No expensive shadows from ambient string line
              />
            ))}
        </group>
      )}
    </group>
  );
}
