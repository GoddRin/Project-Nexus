"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";

/* ═══════════════════════════════════════════════════════════
   MATERIAL CONSTANTS — Photorealistic PBR values matched
   against Tumauini HEPP construction photos & DED drawings.
   ═══════════════════════════════════════════════════════════ */

const CONCRETE = {
  primary: "#B8B4AE",
  light: "#C5C0B8",
  dark: "#908C85",
  stained: "#A09B93",
};

const BLUE_STEEL = {
  roof: "#1E5488",
  fascia: "#2563A8",
  dark: "#163D66",
  light: "#2A6AAA",
};

const METAL = {
  frame: "#2C3038",
  railing: "#4A5568",
  structural: "#3D4852",
};

const XRAY_COLOR = "#1FB6A6";

/* ═══════════════════════════════════════════════════════════
   RealisticPowerhouseBuilding
   Two-story reinforced concrete powerhouse with blue steel
   roof, external staircase, pilasters, and windows.
   ═══════════════════════════════════════════════════════════ */

interface PowerhouseBuildingProps {
  isXRay?: boolean;
}

export function RealisticPowerhouseBuilding({ isXRay = false }: PowerhouseBuildingProps) {
  // Architectural CAD Wireframe Blueprint helper variables
  const cc = (c: string) => (isXRay ? "#00F0FF" : c);
  const cR = isXRay ? 0.1 : 0.92;
  const cM = isXRay ? 0.9 : 0.05;
  const cT = isXRay;
  const cO = isXRay ? 0.35 : 1;
  const dW = !isXRay;

  const sR = isXRay ? 0.1 : 0.32;
  const sM = isXRay ? 0.9 : 0.85;
  const sO = isXRay ? 0.25 : 1;

  const bMat = (baseColor: string, isRoof = false) => (
    <meshStandardMaterial
      color={isXRay ? "#00F0FF" : baseColor}
      wireframe={isXRay}
      transparent={isXRay}
      opacity={isXRay ? (isRoof ? 0.25 : 0.4) : 1.0}
      emissive={isXRay ? "#00F0FF" : "#000000"}
      emissiveIntensity={isXRay ? 0.35 : 0}
      roughness={isXRay ? 0.1 : 0.9}
      metalness={isXRay ? 0.9 : 0.05}
      depthWrite={!isXRay}
    />
  );

  return (
    <group>
      {/* ═══════════ FOUNDATION / PLINTH ═══════════ */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[21.5, 0.4, 15.5]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.95} metalness={0.03} transparent={cT} opacity={cO} />
      </mesh>

      {/* ═══════════ LOWER LEVEL — Draft Tube / Tailrace Access ═══════════ */}

      {/* Back wall */}
      <mesh position={[0, 3, -6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 5.5, 0.8]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-9.6, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5.5, 14]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>
      {/* Right wall */}
      <mesh position={[9.6, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5.5, 14]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>

      {/* Front wall — left pier */}
      <mesh position={[-7.2, 3, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[4, 5.5, 0.8]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>
      {/* Front wall — center pier */}
      <mesh position={[0, 3, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 5.5, 0.8]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>
      {/* Front wall — right pier */}
      <mesh position={[7.2, 3, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[4, 5.5, 0.8]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>
      {/* Front wall — upper lintel connecting piers */}
      <mesh position={[0, 5.35, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 0.6, 0.8]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>

      {/* Draft-tube dark void openings */}
      <mesh position={[-3.6, 2.1, 6.65]}>
        <boxGeometry args={[5, 4.2, 0.2]} />
        <meshStandardMaterial color={isXRay ? XRAY_COLOR : "#0a0c0e"} roughness={0.98} metalness={0.01} transparent={cT} opacity={isXRay ? 0.05 : 1} />
      </mesh>
      <mesh position={[3.6, 2.1, 6.65]}>
        <boxGeometry args={[5, 4.2, 0.2]} />
        <meshStandardMaterial color={isXRay ? XRAY_COLOR : "#0a0c0e"} roughness={0.98} metalness={0.01} transparent={cT} opacity={isXRay ? 0.05 : 1} />
      </mesh>

      {/* Floor slab between levels */}
      <mesh position={[0, 5.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[20.4, 0.4, 14.4]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.9} metalness={0.05} transparent={cT} opacity={isXRay ? 0.15 : 1} depthWrite={dW} />
      </mesh>

      {/* ═══════════ PHYSICAL 3D INTERIOR TURBINE & GENERATOR EQUIPMENT ═══════════ */}
      <group position={[0, 5.7, 0]}>
        {/* ═══ BIG TURBINE #1 (8.5 MW) ═══ */}
        <group position={[-4, 0, 0]}>
          {/* Concrete Foundation Pit Base */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[2.2, 2.4, 0.4, 24]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Francis Turbine Spiral Scroll Case */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <torusGeometry args={[1.3, 0.45, 16, 32]} />
            <meshStandardMaterial color="#0284C7" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Main Generator Stator Housing */}
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.5, 1.0, 24]} />
            <meshStandardMaterial color="#0369A1" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Generator Rotor Shaft & Exciter Cap */}
          <mesh position={[0, 2.1, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.2} metalness={0.9} emissive="#F59E0B" emissiveIntensity={isXRay ? 0.6 : 0.2} />
          </mesh>
        </group>

        {/* ═══ SMALL TURBINE #2 (2.8 MW) ═══ */}
        <group position={[4, 0, 0]}>
          {/* Concrete Foundation Base */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[1.7, 1.9, 0.4, 24]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Spiral Scroll Case */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <torusGeometry args={[0.95, 0.35, 16, 32]} />
            <meshStandardMaterial color="#059669" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Generator Stator Housing */}
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 0.9, 24]} />
            <meshStandardMaterial color="#047857" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Generator Exciter Cap */}
          <mesh position={[0, 1.95, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.2} metalness={0.9} emissive="#F59E0B" emissiveIntensity={isXRay ? 0.6 : 0.2} />
          </mesh>
        </group>

        {/* ═══ SCADA CONTROL & GOVERNOR CONSOLES ═══ */}
        <group position={[0, 0, -3.5]}>
          {/* Main SCADA Cabinet */}
          <mesh position={[-1.2, 0.9, 0]} castShadow>
            <boxGeometry args={[1.2, 1.8, 0.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Governor Control Cabinet */}
          <mesh position={[1.2, 0.9, 0]} castShadow>
            <boxGeometry args={[1.2, 1.8, 0.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Glowing Screen Panels */}
          <mesh position={[-1.2, 1.2, 0.31]}>
            <planeGeometry args={[0.8, 0.5]} />
            <meshBasicMaterial color="#00F0FF" />
          </mesh>
          <mesh position={[1.2, 1.2, 0.31]}>
            <planeGeometry args={[0.8, 0.5]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>
        </group>
      </group>

      {/* ═══════════ UPPER LEVEL — Turbine & Generator Hall ═══════════ */}

      {/* Back wall */}
      <mesh position={[0, 8.4, -6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 5, 0.8]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Left wall */}
      <mesh position={[-9.6, 8.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5, 14]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Right wall */}
      <mesh position={[9.6, 8.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5, 14]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Front wall (upper) */}
      <mesh position={[0, 8.4, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 5, 0.8]} />
        {bMat(CONCRETE.light)}
      </mesh>

      {/* ═══ WINDOWS — upper-level front face ═══ */}
      {[-6, -2, 2, 6].map((x, i) => (
        <group key={`win-${i}`}>
          {/* Dark steel frame */}
          <mesh position={[x, 8.5, 6.98]} castShadow>
            <boxGeometry args={[2.3, 2.5, 0.12]} />
            {bMat(METAL.frame)}
          </mesh>
          {/* Glass pane */}
          <mesh position={[x, 8.5, 7.02]}>
            <boxGeometry args={[1.9, 2.1, 0.06]} />
            {bMat("#6B8DAB")}
          </mesh>
        </group>
      ))}

      {/* Back-wall windows (smaller) */}
      {[-5, 0, 5].map((x, i) => (
        <group key={`bwin-${i}`}>
          <mesh position={[x, 8.5, -6.98]} castShadow>
            <boxGeometry args={[1.8, 2.0, 0.12]} />
            {bMat(METAL.frame)}
          </mesh>
          <mesh position={[x, 8.5, -7.02]}>
            <boxGeometry args={[1.4, 1.6, 0.06]} />
            {bMat("#6B8DAB")}
          </mesh>
        </group>
      ))}

      {/* ═══ CONCRETE PILASTERS — vertical facade columns ═══ */}
      {[-9.3, -4.5, 0, 4.5, 9.3].map((x, i) => (
        <mesh key={`pil-${i}`} position={[x, 5.5, 7.0]} castShadow>
          <boxGeometry args={[0.55, 11, 0.35]} />
          {bMat(CONCRETE.dark)}
        </mesh>
      ))}

      {/* ═══ CONCRETE DRIP EDGE — transition between levels ═══ */}
      <mesh position={[0, 5.9, 7.05]} castShadow>
        <boxGeometry args={[20.6, 0.12, 0.5]} />
        {bMat(CONCRETE.dark)}
      </mesh>
      <mesh position={[0, 5.9, -7.05]} castShadow>
        <boxGeometry args={[20.6, 0.12, 0.5]} />
        {bMat(CONCRETE.dark)}
      </mesh>

      {/* ═══════════ BLUE STEEL FASCIA BAND ═══════════ */}
      {/* Front */}
      <mesh position={[0, 10.7, 6.75]} castShadow>
        <boxGeometry args={[20.6, 0.9, 0.25]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Back */}
      <mesh position={[0, 10.7, -6.75]} castShadow>
        <boxGeometry args={[20.6, 0.9, 0.25]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Left */}
      <mesh position={[-9.9, 10.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.9, 13.8]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Right */}
      <mesh position={[9.9, 10.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.9, 13.8]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>

      {/* ═══════════ STEEL ROOF FRAME — visible trusses ═══════════ */}
      {/* Horizontal purlins (front-to-back) */}
      {[-7, -3.5, 0, 3.5, 7].map((x, i) => (
        <mesh key={`purlin-${i}`} position={[x, 11.0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.3, 14.8]} />
          {bMat(BLUE_STEEL.dark)}
        </mesh>
      ))}
      {/* Cross beams (left-to-right) */}
      {[-5, 0, 5].map((z, i) => (
        <mesh key={`xbeam-${i}`} position={[0, 11.0, z]} castShadow>
          <boxGeometry args={[20.4, 0.25, 0.2]} />
          {bMat(BLUE_STEEL.dark)}
        </mesh>
      ))}

      {/* ═══════════ BLUE STEEL ROOF PANELS ═══════════ */}
      <mesh position={[0, 11.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[22, 0.5, 16]} />
        {bMat(BLUE_STEEL.light, true)}
      </mesh>
      {/* Roof ridge cap */}
      <mesh position={[0, 11.72, 0]} castShadow>
        <boxGeometry args={[22.5, 0.12, 1.0]} />
        {bMat(BLUE_STEEL.fascia, true)}
      </mesh>
      {/* Roof edge trim — front */}
      <mesh position={[0, 11.2, 8.0]} castShadow>
        <boxGeometry args={[22.4, 0.2, 0.3]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — back */}
      <mesh position={[0, 11.2, -8.0]} castShadow>
        <boxGeometry args={[22.4, 0.2, 0.3]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — left */}
      <mesh position={[-11.0, 11.2, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 16.5]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — right */}
      <mesh position={[11.0, 11.2, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 16.5]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>

      {/* ═══════════ CORRUGATED ROOF & GUTTER DETAIL ═══════════ */}
      {/* Corrugation ridge ribs across roof surface */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`rib-${i}`} position={[-8 + i * 2.8, 11.68, 0]} castShadow>
          <boxGeometry args={[0.08, 0.12, 16.2]} />
          {bMat(BLUE_STEEL.dark, true)}
        </mesh>
      ))}
      {/* Rain gutter — front eave */}
      <mesh position={[0, 11.05, 8.3]} castShadow>
        <boxGeometry args={[22.6, 0.15, 0.3]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>
      {/* Rain gutter — back eave */}
      <mesh position={[0, 11.05, -8.3]} castShadow>
        <boxGeometry args={[22.6, 0.15, 0.3]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>
      {/* Downspout pipes at front corners */}
      {[-10.5, 10.5].map((x, i) => (
        <mesh key={`dp-${i}`} position={[x, 5.5, 8.3]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 11.0, 8]} />
          <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
        </mesh>
      ))}
      {/* Roof exhaust vent housing */}
      <mesh position={[0, 12.1, -2]} castShadow>
        <boxGeometry args={[1.2, 0.7, 1.0]} />
        <meshStandardMaterial color={cc(METAL.structural)} roughness={0.4} metalness={0.65} transparent={cT} opacity={isXRay ? 0.2 : 1} />
      </mesh>

      {/* ═══════════ EXTERNAL CONCRETE STAIRCASE — left side ═══════════ */}

      {/* Staircase support wall / stringer */}
      <mesh position={[-11.8, 2.85, 2.5]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 5.7, 5.0]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>

      {/* Individual concrete steps (14 steps, 0.38m rise, 0.3m run) */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={`step-${i}`}
          position={[-11.8, 0.45 + i * 0.38, 4.8 - i * 0.32]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.4, 0.18, 0.55]} />
          <meshStandardMaterial color={cc(CONCRETE.light)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
        </mesh>
      ))}

      {/* Upper landing platform */}
      <mesh position={[-11.5, 5.85, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.3, 2.2]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.9} metalness={0.05} transparent={cT} opacity={cO} />
      </mesh>

      {/* Metal railing posts */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`rail-${i}`} position={[-10.6, 1.3 + i * 0.52, 4.6 - i * 0.52]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
          <meshStandardMaterial color={cc(METAL.railing)} roughness={0.4} metalness={0.7} transparent={cT} opacity={isXRay ? 0.15 : 1} />
        </mesh>
      ))}
      {/* Railing top bar */}
      <mesh
        position={[-10.6, 3.6, 2.3]}
        rotation={[0, 0, Math.atan2(5.3, 6.5)]}
        castShadow
      >
        <boxGeometry args={[0.06, 8.0, 0.06]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>

      {/* ═══════════ ENTRANCE DOOR — left wall (accessed via staircase) ═══════════ */}
      <mesh position={[-9.3, 7.4, 0.5]}>
        <boxGeometry args={[0.15, 2.8, 1.8]} />
        <meshStandardMaterial color={cc(METAL.frame)} roughness={0.5} metalness={0.55} transparent={cT} opacity={isXRay ? 0.12 : 1} />
      </mesh>

      {/* ═══════════ CONCRETE PERIMETER DRAIN CHANNEL ═══════════ */}
      <mesh position={[0, 0.12, 8.2]} receiveShadow>
        <boxGeometry args={[24, 0.24, 1.2]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.95} metalness={0.03} transparent={cT} opacity={cO} />
      </mesh>
      {/* Side drain — left */}
      <mesh position={[-11.0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.24, 16]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.95} metalness={0.03} transparent={cT} opacity={cO} />
      </mesh>

      {/* ═══════════ CONCRETE COPING — top of upper walls ═══════════ */}
      <mesh position={[0, 10.95, 6.85]} castShadow>
        <boxGeometry args={[20.8, 0.1, 0.6]} />
        <meshStandardMaterial color={cc(CONCRETE.stained)} roughness={0.9} metalness={0.04} transparent={cT} opacity={cO} />
      </mesh>
      <mesh position={[0, 10.95, -6.85]} castShadow>
        <boxGeometry args={[20.8, 0.1, 0.6]} />
        <meshStandardMaterial color={cc(CONCRETE.stained)} roughness={0.9} metalness={0.04} transparent={cT} opacity={cO} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticSwitchyard
   Elevated concrete platform with floodwall perimeter.
   ═══════════════════════════════════════════════════════════ */

export function RealisticSwitchyard() {
  return (
    <group>
      {/* Elevated concrete pad */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 2.0, 16]} />
        <meshStandardMaterial color="#A8A49B" roughness={0.9} metalness={0.06} />
      </mesh>

      {/* Gravel surface */}
      <mesh position={[0, 2.06, 0]} receiveShadow>
        <boxGeometry args={[16.8, 0.08, 14.8]} />
        <meshStandardMaterial color="#8A8580" roughness={0.98} metalness={0.02} />
      </mesh>

      {/* ═══ FLOODWALLS ═══ */}
      {/* North wall */}
      <mesh position={[0, 3.2, -8.3]} castShadow receiveShadow>
        <boxGeometry args={[18.6, 4.4, 0.8]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* South wall */}
      <mesh position={[0, 3.2, 8.3]} castShadow receiveShadow>
        <boxGeometry args={[18.6, 4.4, 0.8]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* East wall */}
      <mesh position={[9.5, 3.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 4.4, 17.4]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* West wall (partial, open for cable bus) */}
      <mesh position={[-9.5, 3.2, -4]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 4.4, 8.6]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Floodwall coping (top cap) */}
      <mesh position={[0, 5.5, -8.3]} castShadow>
        <boxGeometry args={[19.0, 0.15, 1.2]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh position={[0, 5.5, 8.3]} castShadow>
        <boxGeometry args={[19.0, 0.15, 1.2]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh position={[9.5, 5.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.15, 17.8]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>

      {/* Equipment pad foundations (4 concrete plinths) */}
      {[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z], i) => (
        <mesh key={`epad-${i}`} position={[x, 2.35, z]} castShadow receiveShadow>
          <boxGeometry args={[3.5, 0.6, 3.5]} />
          <meshStandardMaterial color="#B0ACA3" roughness={0.92} metalness={0.05} />
        </mesh>
      ))}

      {/* ═══ SWITCHYARD EQUIPMENT SILHOUETTES ═══ */}

      {/* PAD 0 [-3, -3]: GSU Step-Up Transformer (15 MVA) */}
      <group position={[-3, 2.65, -3]}>
        {/* Oil-filled transformer tank body */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[2.4, 2.0, 1.6]} />
          <meshStandardMaterial color="#5A6A7A" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* Conservator tank (horizontal cylinder on top) */}
        <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.8, 12]} />
          <meshStandardMaterial color="#5A6A7A" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* HV Bushings (3 tall porcelain insulators) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`hv-${i}`} position={[offset, 2.8, -0.3]} castShadow>
            <cylinderGeometry args={[0.06, 0.1, 1.4, 8]} />
            <meshStandardMaterial color="#D97706" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
        {/* LV Bushings (3 shorter) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`lv-${i}`} position={[offset, 2.4, 0.4]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#D97706" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
        {/* Radiator fin banks — left side */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`fin-l-${i}`} position={[-1.3, 0.8, -0.5 + i * 0.25]} castShadow>
            <boxGeometry args={[0.08, 1.4, 0.18]} />
            <meshStandardMaterial color="#4A5A6A" roughness={0.4} metalness={0.65} />
          </mesh>
        ))}
        {/* Radiator fin banks — right side */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`fin-r-${i}`} position={[1.3, 0.8, -0.5 + i * 0.25]} castShadow>
            <boxGeometry args={[0.08, 1.4, 0.18]} />
            <meshStandardMaterial color="#4A5A6A" roughness={0.4} metalness={0.65} />
          </mesh>
        ))}
      </group>

      {/* PAD 1 [3, -3]: SF6 Gas Circuit Breaker */}
      <group position={[3, 2.65, -3]}>
        {/* Support frame base */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[2.2, 0.6, 1.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.35} metalness={0.75} />
        </mesh>
        {/* 3 Interrupter chamber columns + chambers */}
        {[-0.6, 0, 0.6].map((offset, i) => (
          <group key={`cb-col-${i}`}>
            {/* Support column */}
            <mesh position={[offset, 1.3, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 1.6, 8]} />
              <meshStandardMaterial color="#4A5568" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Interrupter chamber */}
            <mesh position={[offset, 2.4, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.8, 12]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.2} metalness={0.85} />
            </mesh>
          </group>
        ))}
        {/* Operating mechanism cabinet */}
        <mesh position={[0, 0.6, 0.5]} castShadow>
          <boxGeometry args={[0.8, 1.0, 0.5]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.6} />
        </mesh>
      </group>

      {/* PAD 2 [-3, 3]: Motorized Disconnect Switch */}
      <group position={[-3, 2.65, 3]}>
        {/* 3 Post insulators */}
        {[-0.6, 0, 0.6].map((offset, i) => (
          <mesh key={`ds-post-${i}`} position={[offset, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.12, 2.0, 8]} />
            <meshStandardMaterial color="#D97706" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
        {/* Rotating blade arm */}
        <mesh position={[0, 2.1, 0]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[1.8, 0.06, 0.06]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Motor drive housing */}
        <mesh position={[0, 0.4, 0.4]} castShadow>
          <boxGeometry args={[0.6, 0.6, 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.6} />
        </mesh>
      </group>

      {/* PAD 3 [3, 3]: Surge Arrester & CT/PT Metering Set */}
      <group position={[3, 2.65, 3]}>
        {/* 3 Surge arrester stacks (tall porcelain) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`sa-${i}`} position={[offset, 1.5, -0.2]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 2.8, 8]} />
            <meshStandardMaterial color="#D97706" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
        {/* CT (Current Transformer) */}
        <mesh position={[-0.5, 0.6, 0.5]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
          <meshStandardMaterial color="#64748B" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* PT (Potential Transformer) */}
        <mesh position={[0.5, 0.6, 0.5]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
          <meshStandardMaterial color="#64748B" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* Base mounting plate */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[2.5, 0.1, 1.8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   MountainTerrain
   Multi-layered hillside with exposed rock, soil, and
   tropical vegetation matching the construction site photos.
   ═══════════════════════════════════════════════════════════ */

export function MountainTerrain() {
  const gisGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(gisTerrainData.positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(gisTerrainData.colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(gisTerrainData.uvs, 2));
    geo.setIndex(gisTerrainData.indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* ═══ 4-ZONE VERTEX-COLORED TERRACED GIS TERRAIN MESH ═══ */}
      {/* Terrace pad at Y=-0.5 sits 0.5m below powerhouse foundation (Y=0.0) */}
      <mesh geometry={gisGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.92}
          metalness={0.02}
          flatShading={false}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   TailraceWater
   Animated water surface for the tailrace outflow channel
   with subtle shimmer and depth.
   ═══════════════════════════════════════════════════════════ */

export function TailraceWater() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!waterRef.current) return;
    const t = clock.getElapsedTime();
    const mat = waterRef.current.material as THREE.MeshStandardMaterial;
    // Gentle shimmer: undulate roughness to fake ripple reflections
    mat.roughness = 0.12 + Math.sin(t * 1.8) * 0.06;
    // Very subtle position oscillation for life
    waterRef.current.position.y = 0.08 + Math.sin(t * 0.8) * 0.015;
  });

  return (
    <group>
      {/* Water surface */}
      <mesh ref={waterRef} position={[0, 0.08, 11]} receiveShadow>
        <boxGeometry args={[24, 0.06, 8]} />
        <meshStandardMaterial
          color="#1A7A7A"
          roughness={0.12}
          metalness={0.4}
          transparent
          opacity={0.82}
        />
      </mesh>
      {/* Channel bed (darker under water) */}
      <mesh position={[0, -0.2, 11]} receiveShadow>
        <boxGeometry args={[24, 0.4, 8.4]} />
        <meshStandardMaterial color="#2A3A3A" roughness={0.95} metalness={0.03} />
      </mesh>
      {/* Channel side walls */}
      <mesh position={[-12.2, 0.4, 11]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.2, 8.6]} />
        <meshStandardMaterial color="#908C85" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh position={[12.2, 0.4, 11]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.2, 8.6]} />
        <meshStandardMaterial color="#908C85" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* ═══ DISCHARGE FOAM at draft tube exits ═══ */}
      {/* Turbulence foam — Big Turbine #1 discharge */}
      <mesh position={[-3.6, 0.14, 7.8]}>
        <boxGeometry args={[4.5, 0.04, 1.8]} />
        <meshStandardMaterial color="#C8DDE8" roughness={0.08} metalness={0.1} transparent opacity={0.5} />
      </mesh>
      {/* Turbulence foam — Small Turbine #2 discharge */}
      <mesh position={[3.6, 0.14, 7.8]}>
        <boxGeometry args={[4.5, 0.04, 1.8]} />
        <meshStandardMaterial color="#C8DDE8" roughness={0.08} metalness={0.1} transparent opacity={0.5} />
      </mesh>
      {/* Extended foam plume downstream */}
      <mesh position={[0, 0.12, 10.5]}>
        <boxGeometry args={[14, 0.03, 3.5]} />
        <meshStandardMaterial color="#B8CCD8" roughness={0.06} metalness={0.15} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   Guardhouse
   Small security / access-control building at the front gate.
   ═══════════════════════════════════════════════════════════ */

export function Guardhouse() {
  return (
    <group position={[-18, 0, 13]}>
      {/* Main structure */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 3.2, 3.8]} />
        <meshStandardMaterial color="#B5B0A6" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Roof — blue steel to match powerhouse */}
      <mesh position={[0, 3.35, 0]} castShadow>
        <boxGeometry args={[4.8, 0.3, 4.4]} />
        <meshStandardMaterial color="#1E5488" roughness={0.35} metalness={0.82} />
      </mesh>
      {/* Entrance door */}
      <mesh position={[0, 1.3, 1.92]}>
        <boxGeometry args={[1.2, 2.4, 0.1]} />
        <meshStandardMaterial color="#2C3038" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* Side window */}
      <mesh position={[2.12, 1.6, 0]}>
        <boxGeometry args={[0.1, 1.2, 1.4]} />
        <meshStandardMaterial color="#6B8DAB" roughness={0.05} metalness={0.2} transparent opacity={0.55} />
      </mesh>
      {/* Foundation */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.24, 4.2]} />
        <meshStandardMaterial color="#908C85" roughness={0.95} metalness={0.03} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   Cistern
   Concrete water storage / settling tank near powerhouse.
   ═══════════════════════════════════════════════════════════ */

export function Cistern() {
  return (
    <group position={[6, 0, -11]}>
      {/* Main tank body */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 4.4, 4.5]} />
        <meshStandardMaterial color="#A8A49B" roughness={0.9} metalness={0.06} />
      </mesh>
      {/* Access hatch */}
      <mesh position={[0, 4.45, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 16]} />
        <meshStandardMaterial color="#4A5568" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Inlet pipe stub */}
      <mesh position={[-2.8, 3.0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 12]} />
        <meshStandardMaterial color="#5A6A7A" roughness={0.35} metalness={0.65} />
      </mesh>
      {/* Foundation */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[6.0, 0.24, 5.0]} />
        <meshStandardMaterial color="#908C85" roughness={0.95} metalness={0.03} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   TailraceFloodwall
   Concrete retaining walls flanking the tailrace outflow
   channel and connecting to the main floodwall system.
   ═══════════════════════════════════════════════════════════ */

export function TailraceFloodwall() {
  return (
    <group>
      {/* Left floodwall */}
      <mesh position={[-14, 1.6, 11]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 3.2, 12]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Right floodwall */}
      <mesh position={[14, 1.6, 11]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 3.2, 12]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Front cross-wall */}
      <mesh position={[0, 1.6, 16]} castShadow receiveShadow>
        <boxGeometry args={[29, 3.2, 0.8]} />
        <meshStandardMaterial color="#969288" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Floodwall coping (top cap strips) */}
      <mesh position={[-14, 3.3, 11]} castShadow>
        <boxGeometry args={[1.2, 0.15, 12.4]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh position={[14, 3.3, 11]} castShadow>
        <boxGeometry args={[1.2, 0.15, 12.4]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh position={[0, 3.3, 16]} castShadow>
        <boxGeometry args={[29.4, 0.15, 1.2]} />
        <meshStandardMaterial color="#A09C93" roughness={0.88} metalness={0.06} />
      </mesh>

      {/* Gate Platform at EL. 191.54m */}
      <mesh position={[-16, 0.8, 6]} castShadow receiveShadow>
        <boxGeometry args={[4, 1.6, 6]} />
        <meshStandardMaterial color="#A8A49B" roughness={0.9} metalness={0.06} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   ElectricalBusSystem
   3D Generator IPB Busducts, Cable Bus Bridge, Switchyard 69kV
   Tubular Busbars, Steel Gantry Towers, and Transmission Takeoff.
   ═══════════════════════════════════════════════════════════ */

export function ElectricalBusSystem({ isXRay = false }: { isXRay?: boolean }) {
  const wireMat = (
    <meshStandardMaterial
      color="#00F0FF"
      emissive="#00F0FF"
      emissiveIntensity={isXRay ? 3.0 : 1.8}
      roughness={0.1}
      metalness={0.9}
    />
  );

  return (
    <group>
      {/* ═══ 1. INTERIOR GENERATOR ISOLATED PHASE BUS (IPB) DUCTS ═══ */}
      {/* IPB duct from Big Turbine #1 (-4, 7.6, 0) along upper wall to East Wall Exit */}
      <mesh position={[-4, 7.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.8, 16]} />
        {wireMat}
      </mesh>
      <mesh position={[2.8, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 13.6, 16]} />
        {wireMat}
      </mesh>

      {/* IPB duct from Small Turbine #2 (4, 7.6, 0) up to wall IPB */}
      <mesh position={[4, 7.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 16]} />
        {wireMat}
      </mesh>

      {/* ═══ 2. EAST WALL BUSHING & CABLE CONDUIT TO SWITCHYARD ═══ */}
      {/* Wall Bushing Flange on East Powerhouse Wall (x = 9.6, y = 8.4, z = 0) */}
      <mesh position={[9.8, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Sleek 3-Phase Electrical Feeder Lines: Powerhouse East Wall (9.6, 8.4, 0) -> GSU Transformer (22, 4.2, -3) */}
      {[-0.4, 0, 0.4].map((zOff, i) => (
        <mesh key={`feeder-${i}`} position={[15.8, 6.3, -1.5 + zOff]} rotation={[0.22, 0.2, Math.PI / 2.3]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 13.0, 12]} />
          {wireMat}
        </mesh>
      ))}

      {/* ═══ 3. SWITCHYARD 69kV HIGH-VOLTAGE BUSBAR SYSTEM ═══ */}
      {/* Transformer Low-Voltage Bushings (x = 22, y = 4.6, z = -3) */}
      {[-0.6, 0, 0.6].map((offset, i) => (
        <mesh key={`tr-bush-${i}`} position={[22 + offset, 4.6, -3]} castShadow>
          <cylinderGeometry args={[0.1, 0.14, 1.2, 12]} />
          <meshStandardMaterial color="#D97706" roughness={0.15} metalness={0.9} />
        </mesh>
      ))}

      {/* 69kV Busbar Span: Transformer (22, 5.8, -3) -> SF6 Circuit Breaker (28, 5.8, -3) */}
      {[-0.5, 0, 0.5].map((zOff, i) => (
        <mesh key={`bus1-${i}`} position={[25, 5.8, -3 + zOff]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 6.2, 12]} />
          {wireMat}
        </mesh>
      ))}

      {/* 69kV Busbar Span: CB/TR (25, 5.8, -3) -> Disconnect & Surge Arresters (25, 5.8, 3) */}
      {[-0.5, 0, 0.5].map((xOff, i) => (
        <mesh key={`bus2-${i}`} position={[25 + xOff, 5.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 6.2, 12]} />
          {wireMat}
        </mesh>
      ))}

      {/* Circuit Breaker Bushings (x = 28, y = 4.6, z = -3) */}
      {[-0.5, 0, 0.5].map((offset, i) => (
        <mesh key={`cb-bush-${i}`} position={[28, 4.6, -3 + offset]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 1.0, 12]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.25} metalness={0.8} />
        </mesh>
      ))}

      {/* ═══ 4. STEEL GANTRY TOWERS & OVERHEAD GRID TRANSMISSION TAKEOFF ═══ */}
      {/* Gantry A-Frame Lattice Tower 1 (West Switchyard Side, x = 20, z = 0) */}
      <group position={[20, 2.0, 0]}>
        {/* Left Column */}
        <mesh position={[0, 4.5, -6]} rotation={[0.08, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Right Column */}
        <mesh position={[0, 4.5, 6]} rotation={[-0.08, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Top Crossarm */}
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 13.0]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
      </group>

      {/* Gantry A-Frame Lattice Tower 2 (East Switchyard Side, x = 30, z = 0) */}
      <group position={[30, 2.0, 0]}>
        {/* Left Column */}
        <mesh position={[0, 4.5, -6]} rotation={[0.08, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Right Column */}
        <mesh position={[0, 4.5, 6]} rotation={[-0.08, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Top Crossarm */}
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 13.0]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
      </group>

      {/* 69kV Overhead Grid Transmission Wires spanning from Switchyard Gantry (x=30, y=11, z=0) up to Mountain Transmission Tower (x=35, y=25.5, z=-32) */}
      {[-4.5, 0, 4.5].map((zPos, i) => (
        <mesh
          key={`grid-line-${i}`}
          position={[32.5, 18.25, -16 + zPos * 0.5]}
          rotation={[0.95, 0.15, -0.15]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.04, 34.5, 8]} />
          {wireMat}
        </mesh>
      ))}

      {/* 69kV Grid Transmission Line Steel Lattice Tower on Hillside Slope */}
      <TransmissionTakeoffTower />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   TransmissionTakeoffTower
   Steel lattice transmission tower on elevated mountain ridge
   receiving the 69kV grid takeoff lines.
   ═══════════════════════════════════════════════════════════ */

export function TransmissionTakeoffTower() {
  return (
    <group position={[35, 17.5, -32]}>
      {/* Concrete base pad on mountain terrace */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.5, 0.8, 4.5]} />
        <meshStandardMaterial color="#8A8580" roughness={0.95} />
      </mesh>

      {/* Steel Lattice Transmission Tower (A-Frame 4 legs) */}
      <mesh position={[-1.4, 6.0, -1.4]} rotation={[0.06, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[1.4, 6.0, -1.4]} rotation={[0.06, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-1.4, 6.0, 1.4]} rotation={[-0.06, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[1.4, 6.0, 1.4]} rotation={[-0.06, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Lattice Crossbracing */}
      {[3, 6, 9].map((y, i) => (
        <mesh key={`br-${i}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[2.4 - i * 0.4, 0.12, 2.4 - i * 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Top Crossarm (holds the 3-phase 69kV transmission lines) */}
      <mesh position={[0, 12.0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 13.0]} />
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* High-Voltage Porcelain Insulator Strings (3 sets) */}
      {[-4.5, 0, 4.5].map((z, i) => (
        <mesh key={`ins-${i}`} position={[0, 11.4, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.14, 0.8, 12]} />
          <meshStandardMaterial color="#D97706" roughness={0.2} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticSurgeTank
   Reinforced concrete cylindrical surge shaft tower built in
   16 concrete lifts, with headrace tunnel portal, scaffolding,
   and safety netting — modeled directly from project site photos.
   ═══════════════════════════════════════════════════════════ */

export function RealisticSurgeTank({ isXRay = false }: { isXRay?: boolean }) {
  const stMat = (baseColor: string) => (
    <meshStandardMaterial
      color={isXRay ? "#00F0FF" : baseColor}
      wireframe={isXRay}
      transparent={isXRay}
      opacity={isXRay ? 0.35 : 1.0}
      emissive={isXRay ? "#00F0FF" : "#000000"}
      emissiveIntensity={isXRay ? 0.35 : 0}
      roughness={isXRay ? 0.1 : 0.9}
      metalness={isXRay ? 0.9 : 0.05}
      depthWrite={!isXRay}
    />
  );

  return (
    <group position={[-6, 17.5, -26]}>
      {/* Heavy Square Concrete Foundation Pad */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.5, 0.8, 8.5]} />
        {stMat("#8A8580")}
      </mesh>

      {/* 16 Concrete Lifts — Main Cylindrical Shaft Tower (EL. 271.46m) */}
      <mesh position={[0, 6.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.3, 11.2, 32]} />
        {stMat("#B8B4AE")}
      </mesh>

      {/* 16 Concrete Lift Grooves / Ring Segments */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`lift-${i}`} position={[0, 1.2 + i * 0.7, 0]} castShadow>
          <cylinderGeometry args={[3.26, 3.26, 0.08, 32]} />
          {stMat("#9E9A92")}
        </mesh>
      ))}

      {/* Scaffold & Safety Mesh Wrapping around Upper Lifts (Lifts 10-16) */}
      {!isXRay && (
        <group>
          {/* Green Safety Netting Curtain */}
          <mesh position={[0, 8.8, 0]}>
            <cylinderGeometry args={[3.6, 3.6, 6.0, 32, 1, true]} />
            <meshStandardMaterial color="#15803D" roughness={0.9} transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          {/* Steel Scaffolding Poles */}
          {Array.from({ length: 12 }, (_, i) => {
            const rad = (i * Math.PI * 2) / 12;
            return (
              <mesh key={`scaff-${i}`} position={[Math.sin(rad) * 3.65, 8.8, Math.cos(rad) * 3.65]}>
                <cylinderGeometry args={[0.04, 0.04, 6.2, 8]} />
                <meshStandardMaterial color="#64748B" roughness={0.3} metalness={0.8} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Top Rebar Cage & Formwork Steel Extensions */}
      <group position={[0, 12.3, 0]}>
        {Array.from({ length: 16 }, (_, i) => {
          const rad = (i * Math.PI * 2) / 16;
          return (
            <mesh key={`rebar-${i}`} position={[Math.sin(rad) * 3.1, 0.6, Math.cos(rad) * 3.1]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
              <meshStandardMaterial color="#D97706" roughness={0.3} metalness={0.8} />
            </mesh>
          );
        })}
      </group>

      {/* ═══ HEADRACE TUNNEL PORTAL INTO MOUNTAIN ROCK ═══ */}
      <group position={[-5.2, 1.5, -2]}>
        {/* Concrete Horseshoe Arch Portal */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 3.6, 2.5]} />
          {stMat("#78746D")}
        </mesh>
        {/* Dark Tunnel Opening */}
        <mesh position={[0, 1.5, 1.28]}>
          <planeGeometry args={[2.4, 2.6]} />
          <meshBasicMaterial color="#0B1013" />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticPenstockAssembly
   2.70m I.D. ASTM A516 Grade 60 Steel Penstock Pipe running down
   the 32° hillside trench with concrete shotcrete rock face,
   Upper/Lower Anchor Blocks (TB-01 / TB-04),intermediate saddle
   supports, and Y-bifurcation manifold into powerhouse.
   ═══════════════════════════════════════════════════════════ */

export function RealisticPenstockAssembly({ isXRay = false }: { isXRay?: boolean }) {
  const pipeColor = isXRay ? "#38BDF8" : "#2C343E";

  // Point A (Top Surge Tank Anchor Block) & Point B (Bottom Powerhouse Anchor Block)
  const pTop = useMemo(() => new THREE.Vector3(-6.0, 16.8, -24.5), []);
  const pBottom = useMemo(() => new THREE.Vector3(-4.2, 4.2, -7.5), []);

  const midPoint = useMemo(() => {
    return new THREE.Vector3().addVectors(pTop, pBottom).multiplyScalar(0.5);
  }, [pTop, pBottom]);

  const pipeLength = useMemo(() => {
    return pTop.distanceTo(pBottom);
  }, [pTop, pBottom]);

  const pipeQuaternion = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(pTop, pBottom).normalize();
    const up = new THREE.Vector3(0, 1, 0); // Cylinder Y-axis points along direction vector
    return new THREE.Quaternion().setFromUnitVectors(up, dir);
  }, [pTop, pBottom]);

  return (
    <group>
      {/* ═══ SHOTCRETE MOUNTAIN SLOPE TRENCH BED ═══ */}
      <mesh
        position={[midPoint.x, midPoint.y - 0.6, midPoint.z]}
        quaternion={pipeQuaternion}
        receiveShadow
      >
        <boxGeometry args={[4.8, pipeLength + 1.0, 0.4]} />
        <meshStandardMaterial color="#A39F97" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ═══ CONCRETE ANCHOR BLOCK 1 (TB-01 / Upper Anchor near Surge Tank) ═══ */}
      <mesh position={[-6.0, 16.5, -24.5]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 3.8, 4.2]} />
        <meshStandardMaterial color="#969288" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ═══ CONCRETE ANCHOR BLOCK 2 (TB-04 / Lower Anchor near Powerhouse) ═══ */}
      <mesh position={[-4.2, 4.0, -7.5]} castShadow receiveShadow>
        <boxGeometry args={[5.0, 4.2, 4.6]} />
        <meshStandardMaterial color="#969288" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ═══ CONCRETE SADDLE SUPPORTS (5 intermediate supports along slope) ═══ */}
      {Array.from({ length: 5 }, (_, i) => {
        const t = (i + 1) / 6;
        const p = new THREE.Vector3().lerpVectors(pBottom, pTop, t);
        return (
          <mesh key={`saddle-${i}`} position={[p.x, p.y - 0.75, p.z]} castShadow receiveShadow>
            <boxGeometry args={[3.8, 1.4, 1.2]} />
            <meshStandardMaterial color="#8A8580" roughness={0.92} />
          </mesh>
        );
      })}

      {/* ═══ 2.70m MAIN STEEL PENSTOCK PIPE ═══ */}
      <mesh
        position={[midPoint.x, midPoint.y, midPoint.z]}
        quaternion={pipeQuaternion}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1.35, 1.35, pipeLength, 32]} />
        <meshStandardMaterial
          color={pipeColor}
          roughness={0.25}
          metalness={0.85}
          emissive={isXRay ? "#38BDF8" : "#000000"}
          emissiveIntensity={isXRay ? 0.5 : 0}
        />
      </mesh>

      {/* Blue Steel Expansion Joint & Welding Ring Flanges along Penstock */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        const p = new THREE.Vector3().lerpVectors(pBottom, pTop, t);
        return (
          <mesh key={`flange-${i}`} position={[p.x, p.y, p.z]} quaternion={pipeQuaternion} castShadow>
            <cylinderGeometry args={[1.45, 1.45, 0.35, 32]} />
            <meshStandardMaterial color="#1E5488" roughness={0.3} metalness={0.8} />
          </mesh>
        );
      })}

      {/* ═══ Y-BIFURCATION MANIFOLD (TB-03 / Branching into Powerhouse Rear Wall) ═══ */}
      <group position={[-4.2, 4.2, -6.6]}>
        {/* Left Branch Pipe -> Big Turbine #1 (-4, 6.0, 0) */}
        <mesh position={[-0.8, 0.4, 0.6]} rotation={[0.1, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 2.2, 24]} />
          <meshStandardMaterial color={pipeColor} roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Right Branch Pipe -> Small Turbine #2 (4, 6.0, 0) */}
        <mesh position={[0.8, 0.4, 0.6]} rotation={[0.1, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 2.2, 24]} />
          <meshStandardMaterial color={pipeColor} roughness={0.25} metalness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   SurgeTankHillside (Surge Tank Foundation & Civil Structures)
   Heavy reinforced concrete foundation ring, headrace portal
   anchor block, shotcrete retaining wall, and concrete penstock
   saddle supports seated directly on the GIS terrain bench.
   ═══════════════════════════════════════════════════════════ */

export function SurgeTankHillside() {
  return (
    <group>
      {/* ═══ 1. SURGE TANK HEAVY CONCRETE FOUNDATION SLAB ═══ */}
      {/* Main octagonal/circular reinforced concrete foundation ring (Y: 16.6 to 17.4) */}
      <mesh position={[-6, 17.0, -26]} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 4.8, 0.8, 16]} />
        <meshStandardMaterial color="#A39F97" roughness={0.88} metalness={0.06} />
      </mesh>
      {/* Concrete outer curb ring */}
      <mesh position={[-6, 17.45, -26]} castShadow receiveShadow>
        <cylinderGeometry args={[4.8, 4.8, 0.15, 16]} />
        <meshStandardMaterial color="#908C85" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ═══ 2. HEADRACE TUNNEL PORTAL & UPPER ANCHOR BLOCK ═══ */}
      {/* Heavy concrete anchor block joining headrace tunnel & surge shaft */}
      <mesh position={[-6, 18.2, -29.5]} castShadow receiveShadow>
        <boxGeometry args={[7.5, 4.2, 4.5]} />
        <meshStandardMaterial color="#99958D" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Tunnel portal portal arch portal structure */}
      <mesh position={[-6, 18.5, -31.5]} castShadow receiveShadow>
        <boxGeometry args={[6.0, 4.8, 1.2]} />
        <meshStandardMaterial color="#8A867E" roughness={0.92} metalness={0.04} />
      </mesh>
      {/* Dark tunnel opening bore */}
      <mesh position={[-6, 18.2, -31.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 1.8, 16]} />
        <meshStandardMaterial color="#11161B" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* ═══ 3. SHOTCRETE CUT-SLOPE RETAINING WALL ═══ */}
      {/* Anchored shotcrete retaining wall behind the surge tank terrace */}
      <mesh position={[-6, 19.8, -30.0]} rotation={[-0.15, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[20.0, 5.5, 0.6]} />
        <meshStandardMaterial color="#A39F97" roughness={0.93} metalness={0.04} />
      </mesh>
      {/* Coping cap on retaining wall top */}
      <mesh position={[-6, 22.5, -30.4]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[20.6, 0.25, 0.9]} />
        <meshStandardMaterial color="#B0ACA3" roughness={0.85} metalness={0.08} />
      </mesh>
      {/* Rock bolt anchor plates (grid on retaining wall face) */}
      {[-8, -4, 0, 4, 8].map((xOff, i) => (
        <group key={`rb-col-${i}`}>
          {[18.5, 20.5].map((yVal, j) => (
            <mesh key={`rb-${i}-${j}`} position={[-6 + xOff, yVal, -29.6]} castShadow>
              <boxGeometry args={[0.3, 0.3, 0.1]} />
              <meshStandardMaterial color="#4A5568" roughness={0.4} metalness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ═══ 4. PENSTOCK CONCRETE SADDLE BLOCKS (Along 32° slope) ═══ */}
      {/* Saddle 1 (Top / Surge Tank Junction): Z = -22.5, Y = 13.8 */}
      <mesh position={[-5.5, 13.5, -22.5]} rotation={[0.45, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
        <meshStandardMaterial color="#99958D" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Saddle 2 (Mid-Upper Slope): Z = -18.0, Y = 9.8 */}
      <mesh position={[-5.1, 9.5, -18.0]} rotation={[0.45, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
        <meshStandardMaterial color="#99958D" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Saddle 3 (Mid-Lower Slope): Z = -13.5, Y = 6.0 */}
      <mesh position={[-4.7, 5.7, -13.5]} rotation={[0.45, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
        <meshStandardMaterial color="#99958D" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Saddle 4 (Lower Anchor Block at Powerhouse back wall): Z = -9.0, Y = 2.2 */}
      <mesh position={[-4.3, 2.0, -9.0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 2.2, 2.4]} />
        <meshStandardMaterial color="#99958D" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   PenstockTrenchWalls
   Concrete-lined retaining walls flanking both sides of
   the penstock trench cut along the 32° mountain slope.
   ═══════════════════════════════════════════════════════════ */

export function PenstockTrenchWalls() {
  const segments = [
    { y: 15, z: -23, h: 4.5 },
    { y: 11, z: -19, h: 4.5 },
    { y: 7.5, z: -15, h: 4 },
    { y: 4.5, z: -11, h: 3.5 },
  ];

  return (
    <group>
      {/* West-side retaining walls (mountain-side) */}
      {segments.map((seg, i) => (
        <mesh key={`ptw-w-${i}`} position={[-10, seg.y, seg.z]} castShadow receiveShadow>
          <boxGeometry args={[0.5, seg.h, 4.5]} />
          <meshStandardMaterial color="#A39F97" roughness={0.93} metalness={0.04} />
        </mesh>
      ))}
      {/* East-side retaining walls (valley-side) */}
      {segments.map((seg, i) => (
        <mesh key={`ptw-e-${i}`} position={[-1, seg.y, seg.z]} castShadow receiveShadow>
          <boxGeometry args={[0.5, seg.h, 4.5]} />
          <meshStandardMaterial color="#A39F97" roughness={0.93} metalness={0.04} />
        </mesh>
      ))}
      {/* Coping caps on wall tops */}
      {segments.map((seg, i) => (
        <group key={`ptw-cap-${i}`}>
          <mesh position={[-10, seg.y + seg.h / 2 + 0.08, seg.z]} castShadow>
            <boxGeometry args={[0.8, 0.12, 4.7]} />
            <meshStandardMaterial color="#B0ACA3" roughness={0.88} metalness={0.06} />
          </mesh>
          <mesh position={[-1, seg.y + seg.h / 2 + 0.08, seg.z]} castShadow>
            <boxGeometry args={[0.8, 0.12, 4.7]} />
            <meshStandardMaterial color="#B0ACA3" roughness={0.88} metalness={0.06} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   AccessRoad
   Asphalt access road with dashed center line markings
   running along the facility south perimeter.
   ═══════════════════════════════════════════════════════════ */

export function AccessRoad() {
  return (
    <group>
      {/* Main two-lane paved road surface (8.0m wide) */}
      <mesh position={[5, 0.04, 20]} receiveShadow>
        <boxGeometry args={[65, 0.06, 8.0]} />
        <meshStandardMaterial color="#2B343B" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* White outer lane boundary lines */}
      <mesh position={[5, 0.08, 23.8]} receiveShadow>
        <boxGeometry args={[65, 0.015, 0.15]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      <mesh position={[5, 0.08, 16.2]} receiveShadow>
        <boxGeometry args={[65, 0.015, 0.15]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>
      {/* Yellow dashed center line markings */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={`cl-${i}`} position={[-25 + i * 5, 0.08, 20]}>
          <boxGeometry args={[2.5, 0.015, 0.15]} />
          <meshStandardMaterial color="#EAB308" roughness={0.8} />
        </mesh>
      ))}
      {/* Pedestrian gravel shoulder & walkway — south */}
      <mesh position={[5, 0.03, 24.8]} receiveShadow>
        <boxGeometry args={[65, 0.04, 1.6]} />
        <meshStandardMaterial color="#64748B" roughness={0.95} metalness={0.01} />
      </mesh>
      {/* Pedestrian gravel shoulder & walkway — north */}
      <mesh position={[5, 0.03, 15.2]} receiveShadow>
        <boxGeometry args={[65, 0.04, 1.6]} />
        <meshStandardMaterial color="#64748B" roughness={0.95} metalness={0.01} />
      </mesh>
      {/* Branch road turning north toward powerhouse entrance */}
      <mesh position={[-14, 0.04, 16.5]} receiveShadow>
        <boxGeometry args={[8.0, 0.06, 7]} />
        <meshStandardMaterial color="#2B343B" roughness={0.92} metalness={0.05} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   PerimeterFence
   Chain-link security perimeter fencing with steel posts
   around facility south, east, and west boundaries.
   ═══════════════════════════════════════════════════════════ */

export function PerimeterFence() {
  return (
    <group>
      {/* ═══ SOUTH FENCE (inside concrete pad, 2.3m clear of road shoulder) ═══ */}
      <mesh position={[5, 1.4, 14.5]}>
        <boxGeometry args={[65, 2.4, 0.04]} />
        <meshStandardMaterial color="#78909C" roughness={0.7} metalness={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* Steel fence posts */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={`sfp-${i}`} position={[-27.5 + i * 5, 1.4, 14.5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
          <meshStandardMaterial color="#546E7A" roughness={0.35} metalness={0.75} />
        </mesh>
      ))}
      {/* Top rail */}
      <mesh position={[5, 2.85, 14.5]}>
        <boxGeometry args={[65, 0.06, 0.06]} />
        <meshStandardMaterial color="#546E7A" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* ═══ EAST FENCE ═══ */}
      <mesh position={[40, 1.4, 8]}>
        <boxGeometry args={[0.04, 2.4, 20]} />
        <meshStandardMaterial color="#78909C" roughness={0.7} metalness={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`efp-${i}`} position={[40, 1.4, -2 + i * 5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
          <meshStandardMaterial color="#546E7A" roughness={0.35} metalness={0.75} />
        </mesh>
      ))}

      {/* ═══ WEST FENCE ═══ */}
      <mesh position={[-20, 1.4, 8]}>
        <boxGeometry args={[0.04, 2.4, 20]} />
        <meshStandardMaterial color="#78909C" roughness={0.7} metalness={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`wfp-${i}`} position={[-20, 1.4, -2 + i * 5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
          <meshStandardMaterial color="#546E7A" roughness={0.35} metalness={0.75} />
        </mesh>
      ))}

      {/* Entrance gate at guardhouse */}
      <mesh position={[-18, 1.8, 17.8]} castShadow>
        <boxGeometry args={[5, 3.2, 0.12]} />
        <meshStandardMaterial color="#37474F" roughness={0.4} metalness={0.65} />
      </mesh>
    </group>
  );
}
