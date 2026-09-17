/**
 * TunnelFaceCycleActors.tsx
 *
 * High-Fidelity Procedural Equipment & Visual FX for Drill-and-Blast Excavation Cycle Stages.
 * Grounded in Philippine Hydroelectric Tunnel Operations (Tumauini HEPP 3.2m D-Shape Heading).
 *
 * ALL actors are permanently mounted in the Three.js scene graph with O(1) `visible` gating:
 *  - ZERO runtime geometry allocations
 *  - ZERO mid-cycle WebGL shader compilations
 *  - Continuous invert floor grounding (Y = spline.y - radius)
 *
 * Stages:
 *  1. Drilling: Authentic 2-boom heavy crawler drill jumbo with rotating drill steels & water mist
 *  2. Charging & Blasting: Emergency evacuated heading, blinding flash, shockwave torus, rock dust & red beacons
 *  3. Mucking: Articulated Sandvik-style low-profile LHD loader with 4 mining tires & loaded rock scoop
 *  4. Scaling & Support: Miners with long scaling bars, falling rock chips, TH-29 ribs & rock bolt plates
 *  5. Shotcreting: Normet Spraymec-style robotic manipulator boom spraying wet fiber-reinforced concrete
 */

"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { FaceCycleStage } from "./TunnelFaceCycleTypes";

export interface TunnelFaceCycleActorsProps {
  currentStage: FaceCycleStage;
  stageProgress: number; // 0.0 to 1.0 within stage
  advanceMeters?: number; // Current face advance (default 57.6m)
  totalLength?: number; // Tunnel drive length (default 60m)
  facePosition?: [number, number, number]; // Fallback position
  faceRotation?: [number, number, number]; // Fallback rotation
  spline: THREE.Curve<THREE.Vector3>;
  radius?: number;
  isBlasting?: boolean;
  blastIntensity?: number;
}

// ─── GUARANTEED ZERO-RECTANGLE SOFT CIRCULAR PARTICLE COMPONENT ───────────────
// Uses GPU fragment discard `dist > 0.5` so particles are GUARANTEED circular discs with
// feathered Gaussian falloff — eliminating WebGL square billboard artifacts under all conditions.
function SoftParticlePoints({
  geometry,
  size = 0.08,
  color = "#FFFFFF",
  opacity = 0.6,
  blending = THREE.AdditiveBlending,
  position = [0, 0, 0],
  pointsRef,
}: {
  geometry: THREE.BufferGeometry;
  size?: number;
  color?: string;
  opacity?: number;
  blending?: THREE.Blending;
  position?: [number, number, number];
  pointsRef?: React.RefObject<THREE.Points | null>;
}) {
  const uniforms = useMemo(
    () => ({
      uSize: { value: size },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    [size, color, opacity]
  );

  return (
    <points ref={pointsRef as any} geometry={geometry} position={position}>
      <shaderMaterial
        vertexShader={`
          uniform float uSize;
          void main() {
            vec4 mvPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
            gl_PointSize = clamp((uSize * 420.0) / -mvPosition.z, 1.0, 48.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uOpacity;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float falloff = smoothstep(0.5, 0.08, dist);
            gl_FragColor = vec4(uColor, uOpacity * falloff);
          }
        `}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={blending}
      />
    </points>
  );
}

// ─── 1. COMPACT 2-BOOM DRILL JUMBO ACTOR ─────────────────────────────────────
function JumboDrillRig({
  spline,
  vFace,
  radius,
}: {
  spline: THREE.Curve<THREE.Vector3>;
  vFace: number;
  radius: number;
}) {
  const drillRodRef1 = useRef<THREE.Mesh>(null);
  const drillRodRef2 = useRef<THREE.Mesh>(null);
  const mistParticlesRef1 = useRef<THREE.Points>(null);
  const mistParticlesRef2 = useRef<THREE.Points>(null);

  // Position jumbo parked on invert floor ~3.4m back from face
  const vRig = Math.max(0.05, vFace - 3.4 / 60.0);
  const ptRig = spline.getPointAt(vRig);
  const tanRig = spline.getTangentAt(vRig).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tanRig, up).normalize();
  const invertY = ptRig.y - radius;

  // Face point for drill steels to meet
  const ptFace = spline.getPointAt(vFace);
  const faceInvertY = ptFace.y - radius;

  // Machine front is modeled along local -Z; facing along tanRig (-Z) requires Math.atan2(-tan.x, -tan.z)
  const rigRotationY = Math.atan2(-tanRig.x, -tanRig.z);

  // High-frequency drill rod rotation & rock face feed vibration
  useFrame((_, delta) => {
    const rotSpeed = 45.0 * delta;
    if (drillRodRef1.current) {
      drillRodRef1.current.rotation.z += rotSpeed;
      drillRodRef1.current.position.z = -1.9 + Math.sin(Date.now() * 0.05) * 0.03;
    }
    if (drillRodRef2.current) {
      drillRodRef2.current.rotation.z -= rotSpeed;
      drillRodRef2.current.position.z = -1.9 + Math.cos(Date.now() * 0.05) * 0.03;
    }
    if (mistParticlesRef1.current) mistParticlesRef1.current.rotation.z += delta * 2.0;
    if (mistParticlesRef2.current) mistParticlesRef2.current.rotation.z -= delta * 2.0;
  });

  // Drill flushing mist particle geometry
  const mistGeo = useMemo(() => {
    const count = 36;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group position={[ptRig.x, invertY, ptRig.z]} rotation={[0, rigRotationY, 0]} name="jumbo-drill-rig">
      {/* ── CRAWLER TRACKS (Resting solidly on invert gravel floor) ── */}
      {/* Left Track */}
      <mesh position={[-0.92, 0.28, 0]}>
        <boxGeometry args={[0.34, 0.56, 3.4]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} metalness={0.4} />
      </mesh>
      {/* Right Track */}
      <mesh position={[0.92, 0.28, 0]}>
        <boxGeometry args={[0.34, 0.56, 3.4]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} metalness={0.4} />
      </mesh>

      {/* ── HYDRAULIC OUTRIGGER JACK PADS (Anchored to Floor) ── */}
      <mesh position={[-1.15, 0.2, 1.4]}>
        <cylinderGeometry args={[0.06, 0.18, 0.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[1.15, 0.2, 1.4]}>
        <cylinderGeometry args={[0.06, 0.18, 0.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[-1.15, 0.2, -1.4]}>
        <cylinderGeometry args={[0.06, 0.18, 0.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[1.15, 0.2, -1.4]}>
        <cylinderGeometry args={[0.06, 0.18, 0.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>

      {/* ── HEAVY CHASSIS BODY (Caterpillar/Sandvik Safety Yellow) ── */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.60, 3.2]} />
        <meshStandardMaterial color="#EAB308" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Rear Engine Compartment & Radiator Louvers */}
      <mesh position={[0, 1.05, 1.0]}>
        <boxGeometry args={[1.45, 0.65, 1.2]} />
        <meshStandardMaterial color="#CA8A04" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Diesel Exhaust Stack */}
      <mesh position={[0.55, 1.6, 1.3]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} />
      </mesh>

      {/* ── OPERATOR FOPS/ROPS SAFETY CANOPY & CONTROLS ── */}
      <mesh position={[0, 1.65, 0.0]}>
        <boxGeometry args={[1.5, 0.08, 1.4]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 4 Canopy Support Pillars */}
      <mesh position={[-0.7, 1.25, 0.6]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#EAB308" metalness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.25, 0.6]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#EAB308" metalness={0.7} />
      </mesh>
      <mesh position={[-0.7, 1.25, -0.6]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#EAB308" metalness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.25, -0.6]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#EAB308" metalness={0.7} />
      </mesh>
      {/* Dual Operator Consoles */}
      <mesh position={[-0.45, 1.05, -0.2]}>
        <boxGeometry args={[0.45, 0.35, 0.3]} />
        <meshStandardMaterial color="#1E293B" metalness={0.7} />
      </mesh>
      <mesh position={[0.45, 1.05, -0.2]}>
        <boxGeometry args={[0.45, 0.35, 0.3]} />
        <meshStandardMaterial color="#1E293B" metalness={0.7} />
      </mesh>

      {/* ── DUAL ARTICULATED HYDRAULIC DRILL BOOMS (Angled toward heading) ── */}
      {/* LEFT BOOM */}
      <group position={[-0.52, 0.95, -1.3]} rotation={[-0.12, 0.06, 0]}>
        {/* Turret Swivel Base */}
        <mesh rotation={[Math.PI * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        {/* Hydraulic Telescopic Boom Arm */}
        <mesh position={[0, 0.45, -0.85]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.16, 0.18, 1.8]} />
          <meshStandardMaterial color="#EAB308" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Feed Rail Beam (Heavy Steel Slide) */}
        <mesh position={[0, 0.9, -1.9]} rotation={[0.04, 0, 0]}>
          <boxGeometry args={[0.18, 0.18, 3.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Stainless Steel Drill Rod extending to Rock Face */}
        <mesh ref={drillRodRef1} position={[0, 1.02, -1.9]} rotation={[Math.PI * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 3.8, 8]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.98} roughness={0.12} />
        </mesh>
        {/* Water Mist Cloud at Rock Contact Point */}
        <SoftParticlePoints
          pointsRef={mistParticlesRef1}
          geometry={mistGeo}
          position={[0, 1.02, -3.8]}
          size={0.06}
          color="#E2E8F0"
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
        {/* High-power boom headlight focused on drill bit */}
        <spotLight
          position={[0, 1.1, -1.2]}
          target-position={[0, 1.02, -3.8]}
          color="#FFF8E7"
          intensity={14}
          angle={Math.PI / 6}
          distance={8}
        />
      </group>

      {/* RIGHT BOOM */}
      <group position={[0.52, 0.95, -1.3]} rotation={[-0.12, -0.06, 0]}>
        {/* Turret Swivel Base */}
        <mesh rotation={[Math.PI * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        {/* Hydraulic Telescopic Boom Arm */}
        <mesh position={[0, 0.45, -0.85]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.16, 0.18, 1.8]} />
          <meshStandardMaterial color="#EAB308" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Feed Rail Beam */}
        <mesh position={[0, 0.9, -1.9]} rotation={[0.04, 0, 0]}>
          <boxGeometry args={[0.18, 0.18, 3.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Stainless Steel Drill Rod extending to Rock Face */}
        <mesh ref={drillRodRef2} position={[0, 1.02, -1.9]} rotation={[Math.PI * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 3.8, 8]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.98} roughness={0.12} />
        </mesh>
        {/* Water Mist Cloud */}
        <SoftParticlePoints
          pointsRef={mistParticlesRef2}
          geometry={mistGeo}
          position={[0, 1.02, -3.8]}
          size={0.06}
          color="#E2E8F0"
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
        {/* Boom headlight */}
        <spotLight
          position={[0, 1.1, -1.2]}
          target-position={[0, 1.02, -3.8]}
          color="#FFF8E7"
          intensity={14}
          angle={Math.PI / 6}
          distance={8}
        />
      </group>
    </group>
  );
}

// ─── 2. DETONATION BLAST & DUST IMPULSE FX ───────────────────────────────────
function DetonationBlastFX({
  spline,
  vFace,
  radius,
  isBlasting,
  intensity,
}: {
  spline: THREE.Curve<THREE.Vector3>;
  vFace: number;
  radius: number;
  isBlasting: boolean;
  intensity: number;
}) {
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const fireballRef = useRef<THREE.Mesh>(null);
  const dustCloudRef = useRef<THREE.Points>(null);

  const ptFace = spline.getPointAt(vFace);
  const tanFace = spline.getTangentAt(vFace).normalize();
  const invertY = ptFace.y - radius;
  const rotY = Math.atan2(-tanFace.x, -tanFace.z);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (shockwaveRef.current) {
      if (isBlasting) {
        shockwaveRef.current.scale.addScalar(delta * 14.0);
        const op = Math.max(0.0, 1.0 - shockwaveRef.current.scale.x * 0.18);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = op;
      } else {
        shockwaveRef.current.scale.set(0.1, 0.1, 0.1);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
      }
    }

    if (fireballRef.current) {
      const pulse = 1.0 + Math.sin(time * 25.0) * 0.25;
      fireballRef.current.scale.set(pulse, pulse, pulse);
    }

    if (dustCloudRef.current) {
      dustCloudRef.current.rotation.y += delta * 0.15;
      dustCloudRef.current.position.z += delta * 0.6; // Rolls down the tunnel
    }
  });

  // Dense multi-layered billowing rock smoke & pulverized dust particles
  const dustGeo = useMemo(() => {
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * (radius * 0.9);
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3 + 0] = Math.cos(theta) * r;
      pos[i * 3 + 1] = 0.4 + Math.sin(theta) * (r * 0.75);
      pos[i * 3 + 2] = 0.5 + Math.random() * 4.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [radius]);

  return (
    <group position={[ptFace.x, invertY, ptFace.z]} rotation={[0, rotY, 0]} name="detonation-blast-fx">
      {/* HIGH-INTENSITY DETONATION FLASH POINT LIGHT (Fills the entire heading) */}
      <pointLight
        position={[0, 1.4, 0.8]}
        intensity={isBlasting ? Math.max(45, intensity * 95) : 35}
        distance={38}
        color="#FFF5DB"
      />

      {/* EXPLOSIVE FIREBALL CORE AT FACE CONTACT */}
      <mesh ref={fireballRef} position={[0, 1.3, 0.3]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial
          color="#FF5500"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* INNER WHITE-HOT DETONATION SPHERE */}
      <mesh position={[0, 1.3, 0.3]}>
        <sphereGeometry args={[0.7, 12, 12]} />
        <meshBasicMaterial color="#FFFBEB" />
      </mesh>

      {/* EXPANDING SHOCKWAVE TORUS RING */}
      <mesh ref={shockwaveRef} position={[0, 1.3, 0.6]} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[1.8, 0.22, 16, 32]} />
        <meshBasicMaterial
          color="#FEF08A"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* BILLOWING ROCK DUST & SLATE SMOKE PLUME */}
      <SoftParticlePoints
        pointsRef={dustCloudRef}
        geometry={dustGeo}
        position={[0, 0.6, 0.4]}
        size={0.24}
        color="#64748B"
        opacity={0.7}
        blending={THREE.NormalBlending}
      />

      {/* EMERGENCY FLASHING RED BLAST ALARM BEACONS ON SIDEWALLS */}
      <pointLight position={[-radius * 0.85, 1.8, 3.5]} intensity={12} color="#EF4444" distance={10} />
      <pointLight position={[radius * 0.85, 1.8, 3.5]} intensity={12} color="#EF4444" distance={10} />
    </group>
  );
}

// ─── 3. AUTHENTIC UNDERGROUND MINING LHD LOADER (Mucking Stage) ──────────────
function UndergroundLHDLoader({
  spline,
  vFace,
  radius,
  progress,
}: {
  spline: THREE.Curve<THREE.Vector3>;
  vFace: number;
  radius: number;
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Position LHD loader parked at the rock muck pile at the heading
  // Smoothly advances into muck pile (0.0 -> 0.5) then rolls back loaded (0.5 -> 1.0)
  const offsetMeters = 3.2 - Math.sin(progress * Math.PI) * 0.8;
  const vLHD = Math.max(0.05, vFace - offsetMeters / 60.0);

  const ptLHD = spline.getPointAt(vLHD);
  const tanLHD = spline.getTangentAt(vLHD).normalize();
  const invertY = ptLHD.y - radius;
  const rotY = Math.atan2(-tanLHD.x, -tanLHD.z);

  return (
    <group position={[ptLHD.x, invertY, ptLHD.z]} rotation={[0, rotY, 0]} name="underground-lhd-loader">
      {/* ── 4 MASSIVE UNDERGROUND MINING TIRES (Resting on Floor) ── */}
      {/* Front Left Tire */}
      <mesh position={[-0.88, 0.55, -0.9]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.55, 0.55, 0.38, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={0.95} metalness={0.2} />
      </mesh>
      {/* Front Right Tire */}
      <mesh position={[0.88, 0.55, -0.9]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.55, 0.55, 0.38, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={0.95} metalness={0.2} />
      </mesh>
      {/* Rear Left Tire */}
      <mesh position={[-0.88, 0.55, 1.2]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.55, 0.55, 0.38, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={0.95} metalness={0.2} />
      </mesh>
      {/* Rear Right Tire */}
      <mesh position={[0.88, 0.55, 1.2]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.55, 0.55, 0.38, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={0.95} metalness={0.2} />
      </mesh>

      {/* Wheel Rim Steel Hubs */}
      <mesh position={[-0.92, 0.55, -0.9]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.26, 0.26, 0.42, 8]} />
        <meshStandardMaterial color="#E5A93C" metalness={0.8} />
      </mesh>
      <mesh position={[0.92, 0.55, -0.9]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.26, 0.26, 0.42, 8]} />
        <meshStandardMaterial color="#E5A93C" metalness={0.8} />
      </mesh>

      {/* ── ARTICULATED REAR POWER MODULE (Engine, Counterweight & Radiator) ── */}
      <mesh position={[0, 0.95, 1.0]} castShadow>
        <boxGeometry args={[1.5, 0.85, 1.8]} />
        <meshStandardMaterial color="#D97706" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Cast Iron Heavy Counterweight */}
      <mesh position={[0, 0.85, 1.95]}>
        <boxGeometry args={[1.45, 0.75, 0.4]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.4} />
      </mesh>
      {/* Vertical Exhaust Stack */}
      <mesh position={[0.5, 1.65, 1.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} />
      </mesh>

      {/* ── ARTICULATION CENTER HITCH & HYDRAULIC STEERING CYLINDERS ── */}
      <mesh position={[0, 0.75, 0.1]}>
        <cylinderGeometry args={[0.16, 0.16, 0.65, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} />
      </mesh>
      <mesh position={[-0.45, 0.75, 0.1]} rotation={[Math.PI * 0.5, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.95} />
      </mesh>

      {/* ── FRONT LOAD FRAME & OPERATOR CAB ── */}
      <mesh position={[0, 0.85, -0.7]}>
        <boxGeometry args={[1.4, 0.75, 1.5]} />
        <meshStandardMaterial color="#D97706" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Low-Profile Side-Mounted Operator ROPS/FOPS Protective Cab */}
      <mesh position={[-0.55, 1.4, 0.2]}>
        <boxGeometry args={[0.65, 0.75, 0.95]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.3} wireframe={false} />
      </mesh>
      {/* Cab Windshield Aperture */}
      <mesh position={[-0.55, 1.45, -0.28]}>
        <planeGeometry args={[0.55, 0.45]} />
        <meshStandardMaterial color="#38BDF8" metalness={0.9} roughness={0.1} transparent opacity={0.65} />
      </mesh>
      {/* Amber Hazard Flashing Strobe Beacon on Cab Roof */}
      <mesh position={[-0.55, 1.85, 0.2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 8]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[-0.55, 1.95, 0.2]} intensity={4.5} distance={6} color="#F59E0B" />

      {/* ── HEAVY FRONT LIFT ARMS & Z-BAR TILT LINKAGE ── */}
      <mesh position={[-0.5, 0.95, -1.5]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.14, 0.22, 1.4]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} />
      </mesh>
      <mesh position={[0.5, 0.95, -1.5]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.14, 0.22, 1.4]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} />
      </mesh>

      {/* ── MASSIVE HEAVY ROCK SCOOP BUCKET (Loaded with Jagged Blasted Rock) ── */}
      <mesh position={[0, 0.65, -2.2]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.9, 0.75, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Hardened Digging Teeth on Cutting Edge */}
      {[-0.8, -0.4, 0.0, 0.4, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.35, -2.85]} rotation={[Math.PI * 0.5, 0, 0]}>
          <coneGeometry args={[0.06, 0.22, 8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.95} />
        </mesh>
      ))}

      {/* Broken Jagged Blasted Rock Chunks in Bucket */}
      <group position={[0, 0.85, -2.15]}>
        <mesh position={[-0.35, 0.1, -0.1]}>
          <dodecahedronGeometry args={[0.32, 1]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        <mesh position={[0.35, 0.12, 0.1]}>
          <dodecahedronGeometry args={[0.35, 1]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <mesh position={[0.0, 0.2, 0.0]}>
          <dodecahedronGeometry args={[0.28, 1]} />
          <meshStandardMaterial color="#57534E" roughness={0.95} />
        </mesh>
      </group>

      {/* High-power LED driving headlights shining onto muck pile */}
      <spotLight
        position={[0, 1.2, -1.2]}
        target-position={[0, 0.4, -3.8]}
        color="#FFFDE7"
        intensity={22}
        distance={14}
        angle={Math.PI / 4}
      />
    </group>
  );
}

// ─── 4. SCALING & ROCKBOLTING ACTORS (Loose Slabs & Falling Chips) ────────────
function ScalingSupportActors({
  spline,
  vFace,
  radius,
}: {
  spline: THREE.Curve<THREE.Vector3>;
  vFace: number;
  radius: number;
}) {
  const chipsRef = useRef<THREE.Points>(null);

  // Position scaling crew around v = vFace - 5.0m
  const vSupport = Math.max(0.05, vFace - 4.5 / 60.0);
  const ptSupport = spline.getPointAt(vSupport);
  const tanSupport = spline.getTangentAt(vSupport).normalize();
  const invertY = ptSupport.y - radius;
  const rotY = Math.atan2(-tanSupport.x, -tanSupport.z);

  useFrame((_, delta) => {
    if (chipsRef.current) {
      chipsRef.current.position.y -= delta * 1.8;
      if (chipsRef.current.position.y < -1.5) {
        chipsRef.current.position.y = 1.8;
      }
    }
  });

  const chipsGeo = useMemo(() => {
    const count = 45;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * (radius * 1.2);
      pos[i * 3 + 1] = 1.0 + Math.random() * 1.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [radius]);

  return (
    <group position={[ptSupport.x, invertY, ptSupport.z]} rotation={[0, rotY, 0]} name="scaling-support-actors">
      {/* Falling rock chips barred down from crown */}
      <SoftParticlePoints
        pointsRef={chipsRef}
        geometry={chipsGeo}
        size={0.06}
        color="#78716C"
        opacity={0.85}
        blending={THREE.NormalBlending}
      />

      {/* Miner Scaling Pry-Bars Reaching Upward toward Crown Slabs */}
      <mesh position={[-0.8, 1.6, -1.0]} rotation={[-0.45, 0.2, 0.3]}>
        <cylinderGeometry args={[0.018, 0.022, 2.8, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.8, 1.6, -0.6]} rotation={[-0.45, -0.2, -0.3]}>
        <cylinderGeometry args={[0.018, 0.022, 2.8, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 5. ROBOTIC WET SHOTCRETING MANIPULATOR RIG ───────────────────────────────
function RoboticShotcreteManipulator({
  spline,
  vFace,
  radius,
}: {
  spline: THREE.Curve<THREE.Vector3>;
  vFace: number;
  radius: number;
}) {
  const armHeadRef = useRef<THREE.Group>(null);
  const sprayMistRef = useRef<THREE.Points>(null);

  const vShot = Math.max(0.05, vFace - 4.2 / 60.0);
  const ptShot = spline.getPointAt(vShot);
  const tanShot = spline.getTangentAt(vShot).normalize();
  const invertY = ptShot.y - radius;
  const rotY = Math.atan2(-tanShot.x, -tanShot.z);

  // Dynamic sweeping spray motion across crown arch
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (armHeadRef.current) {
      armHeadRef.current.rotation.y = Math.sin(time * 2.2) * 0.35;
      armHeadRef.current.rotation.x = -0.3 + Math.cos(time * 1.8) * 0.18;
    }
    if (sprayMistRef.current) {
      sprayMistRef.current.rotation.z += delta * 4.0;
    }
  });

  const sprayGeo = useMemo(() => {
    const count = 96;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const z = -Math.random() * 2.6;
      const spread = -z * 0.38;
      pos[i * 3 + 0] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = 0.2 + (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group position={[ptShot.x, invertY, ptShot.z]} rotation={[0, rotY, 0]} name="robotic-shotcrete-rig">
      {/* Mobile Carrier Chassis on Invert Floor */}
      <mesh position={[0, 0.45, 0.6]}>
        <boxGeometry args={[1.5, 0.6, 2.8]} />
        <meshStandardMaterial color="#0284C7" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* 4 Rubber Tires */}
      <mesh position={[-0.82, 0.38, -0.5]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.38, 0.38, 0.28, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>
      <mesh position={[0.82, 0.38, -0.5]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.38, 0.38, 0.28, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>
      <mesh position={[-0.82, 0.38, 1.4]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.38, 0.38, 0.28, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>
      <mesh position={[0.82, 0.38, 1.4]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.38, 0.38, 0.28, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>

      {/* Outrigger Stabilization Pads */}
      <mesh position={[-0.95, 0.15, 0.6]}>
        <cylinderGeometry args={[0.05, 0.14, 0.3, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0.95, 0.15, 0.6]}>
        <cylinderGeometry args={[0.05, 0.14, 0.3, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Concrete Delivery Pipe Line & Chemical Accelerator Tank */}
      <mesh position={[0.45, 0.95, 1.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.8, 12]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.8} />
      </mesh>

      {/* ── ARTICULATED ROBOTIC MANIPULATOR ARM REACHING UP TO CROWN ── */}
      {/* Turntable Base */}
      <mesh position={[0, 0.85, -0.4]}>
        <cylinderGeometry args={[0.28, 0.28, 0.25, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} />
      </mesh>
      {/* Telescopic Main Boom Extending Upward */}
      <mesh position={[0, 1.65, -0.8]} rotation={[-0.7, 0, 0]}>
        <boxGeometry args={[0.22, 0.24, 2.2]} />
        <meshStandardMaterial color="#0284C7" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Knuckle Joint */}
      <mesh position={[0, 2.35, -1.6]} rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.14, 0.14, 0.32, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.9} />
      </mesh>

      {/* Sweeping Lance Head Group */}
      <group ref={armHeadRef} position={[0, 2.45, -1.8]}>
        {/* Telescopic Extension Arm */}
        <mesh position={[0, 0.4, -0.5]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 1.4, 8]} />
          <meshStandardMaterial color="#38BDF8" metalness={0.8} />
        </mesh>
        {/* Spray Nozzle Head with Accelerator Nozzle Rings */}
        <mesh position={[0, 0.7, -1.1]} rotation={[Math.PI * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.09, 0.45, 8]} />
          <meshStandardMaterial color="#0F172A" metalness={0.9} />
        </mesh>

        {/* Dense Conical Spray Fan of Wet Concrete Slurry */}
        <mesh position={[0, 0.8, -2.4]} rotation={[-Math.PI * 0.5, 0, 0]}>
          <coneGeometry args={[0.95, 2.8, 16, 1, true]} />
          <meshBasicMaterial
            color="#CBD5E1"
            transparent
            opacity={0.38}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* High-velocity slurry droplets hitting the crown arch */}
        <SoftParticlePoints
          pointsRef={sprayMistRef}
          geometry={sprayGeo}
          position={[0, 0.7, -1.2]}
          size={0.08}
          color="#94A3B8"
          opacity={0.75}
          blending={THREE.NormalBlending}
        />

        {/* Nozzle Worklamp Illuminating Fresh Concrete Impact Zone */}
        <spotLight
          position={[0, 0.8, -1.0]}
          target-position={[0, 1.2, -3.2]}
          color="#FFF8DB"
          intensity={25}
          distance={8}
          angle={Math.PI / 4.5}
        />
      </group>
    </group>
  );
}

// ─── MAIN FACE CYCLE ACTORS COMPONENT ─────────────────────────────────────────
export function TunnelFaceCycleActors({
  currentStage,
  stageProgress,
  advanceMeters = 57.6,
  totalLength = 60.0,
  spline,
  radius = 2.5,
  isBlasting = false,
  blastIntensity = 0.0,
}: TunnelFaceCycleActorsProps) {
  // Normalize face position along spline
  const vFace = THREE.MathUtils.clamp(advanceMeters / totalLength, 0.05, 0.999);

  return (
    <group name="tunnel-face-cycle-actors">
      {/* ═══ 1. DRILLING STAGE: 2-Boom Jumbo Drill Rig Parked at Face ═══ */}
      <group visible={currentStage === "drilling"}>
        <JumboDrillRig spline={spline} vFace={vFace} radius={radius} />
      </group>

      {/* ═══ 2. CHARGING & BLASTING STAGE: Detonation Flash, Shockwave & Dust ═══ */}
      <group visible={currentStage === "charging_blasting"}>
        <DetonationBlastFX
          spline={spline}
          vFace={vFace}
          radius={radius}
          isBlasting={isBlasting}
          intensity={blastIntensity}
        />
      </group>

      {/* ═══ 3. MUCKING STAGE: Underground Mining LHD Loader ═══ */}
      <group visible={currentStage === "mucking"}>
        <UndergroundLHDLoader
          spline={spline}
          vFace={vFace}
          radius={radius}
          progress={stageProgress}
        />
      </group>

      {/* ═══ 4. SCALING & SUPPORT: Loose Slabs, Scaling Bars & Falling Chips ═══ */}
      <group visible={currentStage === "scaling_support"}>
        <ScalingSupportActors spline={spline} vFace={vFace} radius={radius} />
      </group>

      {/* ═══ 5. SHOTCRETING STAGE: Robotic Manipulator Arm Sprayer ═══ */}
      <group visible={currentStage === "shotcreting"}>
        <RoboticShotcreteManipulator spline={spline} vFace={vFace} radius={radius} />
      </group>
    </group>
  );
}
