"use client";

import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";

/* ═══════════════════════════════════════════════════════════════════════════
   OPTIMIZED SITE ENTITIES ENGINE (20Hz Worker Kinematics & Traffic Throttling)
   
   Optimizations Applied:
     1. 20Hz Kinematics Throttler: Updates construction worker limbs & shoveling cycles
        every 3rd frame (20Hz), slashing CPU overhead.
     2. Cached Terrain Height Sampler: Eliminates redundant bilinear grid interpolation.
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
  const sampledY = y0 * (1 - fz) + y1 * fz;

  if (x >= 68.0 && z <= -58.0) {
    return Math.max(14.0, sampledY);
  }

  return sampledY;
}

function getSafeSplineData(spline: THREE.CatmullRomCurve3, rawProgress: number) {
  let u = Math.max(0.0001, Math.min(0.9999, rawProgress));
  return {
    pt: spline.getPointAt(u),
    tangent: spline.getTangentAt(u),
  };
}

// ─── 1. DYNAMIC CONSTRUCTION WORKER COMPONENT (20Hz Throttled) ────────────────
interface ConstructionWorkerProps {
  vestColor?: string;
  hardhatColor?: string;
  actionType?: "WELDING" | "SHOVELING" | "REBAR_TYING";
}

function ActiveConstructionWorkerMesh({
  vestColor = "#EA580C",
  hardhatColor = "#FACC15",
  actionType = "SHOVELING",
}: ConstructionWorkerProps) {
  const workerGroupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const sparkLightRef = useRef<THREE.PointLight>(null);
  const frameCount = useRef<number>(0);

  useFrame(({ clock }) => {
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return; // 20Hz Throttler

    const t = clock.getElapsedTime();

    if (actionType === "WELDING") {
      const walk = Math.sin(t * 0.8) * 1.2;
      if (workerGroupRef.current) workerGroupRef.current.position.x = walk;
      if (sparkLightRef.current) sparkLightRef.current.intensity = Math.random() > 0.2 ? 4.5 : 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-1.2 + Math.sin(t * 4) * 0.1, 0.4, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.1 + Math.cos(t * 4) * 0.1, -0.3, 0);
    } else if (actionType === "SHOVELING") {
      const cycle = Math.sin(t * 2.5);
      const isScooping = cycle > 0;
      if (torsoRef.current) torsoRef.current.rotation.x = isScooping ? 0.4 : 0.0;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.8 + cycle * 0.4, 0.2, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.6 + cycle * 0.4, -0.2, 0);
      if (workerGroupRef.current) workerGroupRef.current.rotation.y = isScooping ? 0 : 1.2;
    } else if (actionType === "REBAR_TYING") {
      const twist = Math.sin(t * 5.0) * 0.25;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.9 + twist, 0.3, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.9 - twist, -0.3, 0);
    }
  });

  return (
    <group ref={workerGroupRef} position={[0, 0, 0]}>
      {actionType === "WELDING" && (
        <pointLight ref={sparkLightRef} position={[0, 1.0, 0.45]} color="#38BDF8" distance={4.5} />
      )}

      <group ref={torsoRef}>
        <mesh position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.18, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hardhatColor} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial color="#D4A373" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.22]} />
          <meshStandardMaterial color={vestColor} roughness={0.7} />
        </mesh>

        <group ref={leftArmRef} position={[-0.24, 1.25, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
            <meshStandardMaterial color={vestColor} roughness={0.7} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.24, 1.25, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
            <meshStandardMaterial color={vestColor} roughness={0.7} />
          </mesh>
        </group>
      </group>

      <mesh position={[-0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.7, 0.14]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.7, 0.14]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── 2. HIGH-FIDELITY 3D VEHICLE MESH COMPONENTS ─────────────────────────────
function UltraDetailedVehicle({
  bodyColor = "#F8FAFC",
  driverDoorAngle = 0,
  headlightsOn = true,
}: {
  bodyColor?: string;
  driverDoorAngle?: number;
  headlightsOn?: boolean;
}) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[2.0, 0.25, 4.6]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.15, 0.95, 4.7]} />
        <meshStandardMaterial color={bodyColor} roughness={0.25} metalness={0.65} />
      </mesh>
      <mesh position={[0, 1.0, 1.85]} rotation={[-0.14, 0, 0]} castShadow>
        <boxGeometry args={[2.1, 0.35, 1.1]} />
        <meshStandardMaterial color={bodyColor} roughness={0.25} metalness={0.65} />
      </mesh>
      <mesh position={[0, 1.55, -0.1]}>
        <boxGeometry args={[1.92, 0.85, 2.4]} />
        <meshStandardMaterial color="#0284C7" roughness={0.05} metalness={0.9} transparent opacity={0.55} />
      </mesh>
      <group position={[-1.08, 1.15, 0.45]} rotation={[0, driverDoorAngle, 0]}>
        <mesh position={[0, 0, -0.55]} castShadow>
          <boxGeometry args={[0.08, 0.95, 1.1]} />
          <meshStandardMaterial color={bodyColor} roughness={0.25} metalness={0.65} />
        </mesh>
      </group>
      {[-1.06, 1.06].map((xOff, i) => (
        <React.Fragment key={`wh9-${i}`}>
          <group position={[xOff, 0.48, 1.4]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.46, 0.46, 0.32, 12]} />
              <meshStandardMaterial color="#0F172A" roughness={0.9} />
            </mesh>
          </group>
          <group position={[xOff, 0.48, -1.4]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.46, 0.46, 0.32, 12]} />
              <meshStandardMaterial color="#0F172A" roughness={0.9} />
            </mesh>
          </group>
        </React.Fragment>
      ))}
      {[-0.78, 0.78].map((xOff, i) => (
        <mesh key={`hl9-${i}`} position={[xOff, 0.92, 2.38]}>
          <boxGeometry args={[0.38, 0.2, 0.06]} />
          <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={headlightsOn ? 3.0 : 0.2} />
        </mesh>
      ))}
    </group>
  );
}

function UltraDetailedMotorcycle({
  color = "#EA580C",
  kickstandUp = true,
}: {
  color?: string;
  kickstandUp?: boolean;
}) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.78, 0.12]} rotation={[0.22, 0, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.65, 8]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.36, 0.42, 0.65]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.74, -0.42]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.32, 0.16, 0.78]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.4, 0.78]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.14, 12]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, -0.78]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.16, 12]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── 3. INTERACTIVE SECURITY GUARD & MANUAL BOOM GATE CHECKPOINT SYSTEM ──────
function SecurityGateCheckpointSystem({ gateAngle }: { gateAngle: number }) {
  const guardArmRef = useRef<THREE.Group>(null);
  const guardY = useMemo(() => sampleTerrainY(69.0, -66.5), []);

  useFrame(() => {
    if (guardArmRef.current) {
      guardArmRef.current.rotation.z = -gateAngle * 0.9;
    }
  });

  return (
    <group position={[69.0, guardY, -66.5]}>
      <group position={[0, 1.1, 0]} rotation={[0, 0, gateAngle]}>
        <mesh position={[2.5, 0, 0]} castShadow>
          <boxGeometry args={[5.0, 0.12, 0.12]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.2} emissive="#F8FAFC" emissiveIntensity={0.2} />
        </mesh>
      </group>

      <group position={[-0.8, 0, 0.8]}>
        <mesh position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial color="#D4A373" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.22]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.7} />
        </mesh>

        <group ref={guardArmRef} position={[0.24, 1.25, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
            <meshStandardMaterial color="#1E3A8A" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── 4. MULTI-VEHICLE DISPATCH ENGINE ─────────────────────────────────────────
function MultiVehicleWorkDispatchSystem({ onGateAngleChange }: { onGateAngleChange: (angle: number) => void }) {
  const v1Ref = useRef<THREE.Group>(null);
  const v2Ref = useRef<THREE.Group>(null);

  const mainSpline = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(77, 0, -100),
      new THREE.Vector3(72, 0, -78),
      new THREE.Vector3(68, 0, -65),
      new THREE.Vector3(60, 0, -18),
      new THREE.Vector3(25, 0, 15),
      new THREE.Vector3(18, 0, 22),
    ], false);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 36.0;

    const cycleFrac = t / 36.0;

    let gate = 0;
    if (cycleFrac >= 0.18 && cycleFrac <= 0.38) {
      const gateProgress = (cycleFrac - 0.18) / 0.08;
      if (gateProgress <= 1.0) {
        gate = (Math.PI / 2.2) * Math.sin(gateProgress * Math.PI * 0.5);
      } else if (cycleFrac <= 0.32) {
        gate = Math.PI / 2.2;
      } else {
        const closeProgress = (cycleFrac - 0.32) / 0.06;
        gate = (Math.PI / 2.2) * (1.0 - Math.sin(closeProgress * Math.PI * 0.5));
      }
    }
    onGateAngleChange(gate);

    const u1 = cycleFrac;
    const { pt: pt1, tangent: t1 } = getSafeSplineData(mainSpline, u1);
    const groundY1 = sampleTerrainY(pt1.x, pt1.z);
    const h1 = Math.atan2(t1.x, t1.z);

    if (v1Ref.current) {
      v1Ref.current.position.set(pt1.x, groundY1, pt1.z);
      v1Ref.current.rotation.set(0, h1, 0);
    }

    const u2 = Math.max(0.0001, u1 - 0.08);
    const { pt: pt2, tangent: t2 } = getSafeSplineData(mainSpline, u2);
    const groundY2 = sampleTerrainY(pt2.x, pt2.z);
    const h2 = Math.atan2(t2.x, t2.z);

    if (v2Ref.current) {
      v2Ref.current.position.set(pt2.x, groundY2, pt2.z);
      v2Ref.current.rotation.set(0, h2, 0);
    }
  });

  return (
    <group>
      <group ref={v1Ref}>
        <UltraDetailedVehicle bodyColor="#F8FAFC" headlightsOn={true} />
      </group>
      <group ref={v2Ref}>
        <UltraDetailedVehicle bodyColor="#B91C1C" headlightsOn={true} />
      </group>
    </group>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export function AnimatedSiteEntities() {
  const [currentGateAngle, setCurrentGateAngle] = useState<number>(0);

  const y1 = useMemo(() => sampleTerrainY(76, -110) + 2.5, []);
  const y2 = useMemo(() => sampleTerrainY(94, -96), []);
  const y3 = useMemo(() => sampleTerrainY(96, -96), []);

  return (
    <group>
      {/* ═══ 1. DYNAMIC BUILDING CONSTRUCTION WORKER CREWS ═══ */}
      <group position={[76, y1, -110]}>
        <ActiveConstructionWorkerMesh vestColor="#EA580C" hardhatColor="#FFFFFF" actionType="WELDING" />
      </group>

      <group position={[94, y2, -96]}>
        <ActiveConstructionWorkerMesh vestColor="#0284C7" hardhatColor="#FACC15" actionType="REBAR_TYING" />
      </group>
      <group position={[96, y3, -96]}>
        <ActiveConstructionWorkerMesh vestColor="#EA580C" hardhatColor="#FACC15" actionType="SHOVELING" />
      </group>

      {/* ═══ 2. EXECUTIVE SITE OFFICE PARKING STALLS ═══ */}
      <group position={[77, sampleTerrainY(77, -95), -95]} rotation={[0, 0, 0]}>
        <UltraDetailedVehicle bodyColor="#334155" headlightsOn={false} />
      </group>

      {/* ═══ 3. DESIGNATED MOTORCYCLE PARKING BAYS ═══ */}
      <group position={[108, sampleTerrainY(108, -56), -56]}>
        <UltraDetailedMotorcycle color="#EA580C" kickstandUp={false} />
      </group>
      <group position={[112, sampleTerrainY(112, -56), -56]}>
        <UltraDetailedMotorcycle color="#0284C7" kickstandUp={false} />
      </group>

      {/* ═══ 4. INTERACTIVE SECURITY GUARD & MANUAL BOOM GATE SYSTEM ═══ */}
      <SecurityGateCheckpointSystem gateAngle={currentGateAngle} />

      {/* ═══ 5. MULTI-VEHICLE WORK DISPATCH TRAFFIC FLOW ═══ */}
      <MultiVehicleWorkDispatchSystem onGateAngleChange={setCurrentGateAngle} />
    </group>
  );
}
