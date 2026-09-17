/**
 * TunnelWorkerProps.tsx
 *
 * Authentic 3D Equipment Props for Headrace Tunnel Personnel.
 * Grounded in docs/tunnel-scene-brief.md & real Philippine hydro drill-and-blast operations.
 */

"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

// ─── 1. ELECTRONIC TOTAL STATION ON ALUMINUM TRIPOD (Surveyor) ─────────────
export function TotalStationProp() {
  return (
    <group name="prop-total-station">
      {/* 3 Aluminum telescopic tripod legs spread out stably */}
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.04, 0.48, 1.15, 3]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Tribrach leveling base plate */}
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Instrument body (Topcon / Leica yellow/orange casing) */}
      <mesh position={[0, 1.30, 0]}>
        <boxGeometry args={[0.16, 0.24, 0.14]} />
        <meshStandardMaterial color="#F59E0B" metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Optical telescope barrel */}
      <mesh position={[0, 1.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.038, 0.22, 12]} />
        <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Objective lens glass */}
      <mesh position={[0, 1.33, 0.112]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.032, 12]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>
    </group>
  );
}

// ─── 2. PNEUMATIC JACKLEG DRILL (Drill Operator) ────────────────────────────
export function PneumaticDrillProp() {
  return (
    <group name="prop-pneumatic-drill">
      {/* Heavy cast steel rock drill cylinder */}
      <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.075, 0.60, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Cylinder exhaust muffler band */}
      <mesh position={[0, 0, 0.20]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.15, 12]} />
        <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* Rear spade handle with throttle valve */}
      <mesh position={[0, 0, -0.05]}>
        <torusGeometry args={[0.08, 0.022, 8, 16]} />
        <meshStandardMaterial color="#0F172A" roughness={0.5} />
      </mesh>
      {/* Front chuck / retainer latch */}
      <mesh position={[0, 0, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.12, 8]} />
        <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Hexagonal drill steel rod (2.4m extending forward toward rock face) */}
      <mesh position={[0, 0, 1.78]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 2.4, 6]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Carbide 4-point cross-chisel drill bit at tip */}
      <mesh position={[0, 0, 2.98]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.018, 0.08, 8]} />
        <meshStandardMaterial color="#F1F5F9" metalness={0.98} roughness={0.1} />
      </mesh>
      {/* Telescopic pneumatic pusher leg (jackleg) angling diagonally down to floor */}
      <mesh position={[0, -0.45, 0.25]} rotation={[0.65, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.035, 1.25, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* High-pressure rubber air-line hose curving to invert */}
      <mesh position={[-0.06, -0.22, 0.1]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.55, 6]} />
        <meshStandardMaterial color="#EAB308" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ─── 3. 65mm SHOTCRETE SPRAY NOZZLE (Shotcrete Operator) ───────────────────
export function ShotcreteNozzleProp() {
  return (
    <group position={[0, 0, 0.12]} rotation={[-0.2, 0, 0]} name="prop-shotcrete-nozzle">
      {/* Tapered rubber spray nozzle body */}
      <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.038, 0.055, 0.6, 10]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      {/* Aluminum accelerator manifold ring */}
      <mesh position={[0, 0, 0.15]}>
        <torusGeometry args={[0.06, 0.015, 8, 16]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Heavy ribbed delivery hose trailing backwards */}
      <mesh position={[0, -0.25, -0.2]} rotation={[-0.6, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.7, 8]} />
        <meshStandardMaterial color="#0F172A" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── 4. ALTAIR 4XR MULTI-GAS DETECTOR WAND (Safety Officer) ────────────────
export function MultiGasDetectorProp() {
  return (
    <group position={[0, 0, 0.08]} rotation={[0.3, 0, 0]} name="prop-gas-detector">
      {/* Ruggedized yellow rubber overmolded housing */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.065, 0.12, 0.035]} />
        <meshStandardMaterial color="#FACC15" roughness={0.4} />
      </mesh>
      {/* Backlit LCD screen (shows safe green telemetry) */}
      <mesh position={[0, 0.02, 0.018]}>
        <planeGeometry args={[0.045, 0.035]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>
      {/* Rigid sniffer wand probe extending forward */}
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.45, 6]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sampling pump filter cup */}
      <mesh position={[0, 0.51, 0]}>
        <cylinderGeometry args={[0.012, 0.008, 0.04, 6]} />
        <meshStandardMaterial color="#DC2626" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── 5. ESTWING GEOLOGIST ROCK PICK HAMMER (Geologist) ─────────────────────
export function GeologistPickProp() {
  return (
    <group position={[0, 0, 0.05]} rotation={[-0.4, 0, 0]} name="prop-geologist-pick">
      {/* Forged steel shaft */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.34, 6]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Blue vinyl shock reduction grip */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.16, 8]} />
        <meshStandardMaterial color="#2563EB" roughness={0.6} />
      </mesh>
      {/* Double-head: square flat face + pointed rock pick */}
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.004, 0.18, 6]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
      </mesh>
    </group>
  );
}

// ─── 6. ALUMINUM CLIPBOARD & RADIO (Tunnel Supervisor) ─────────────────────
export function ClipboardRadioProp() {
  return (
    <group position={[0, 0, 0.06]} rotation={[0.4, 0, 0]} name="prop-clipboard">
      {/* Aluminum clipboard plate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.22, 0.32, 0.008]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* White blueprint / shift advance sheet */}
      <mesh position={[0, -0.01, 0.006]}>
        <planeGeometry args={[0.19, 0.28]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>
      {/* Heavy-duty steel top clip */}
      <mesh position={[0, 0.14, 0.01]}>
        <boxGeometry args={[0.09, 0.025, 0.012]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 7. PNEUMATIC BOLTING TORQUE WRENCH (Rock Bolting Crew) ────────────────
export function TorqueWrenchProp() {
  return (
    <group position={[0, 0, 0.08]} rotation={[-0.5, 0, 0]} name="prop-torque-wrench">
      {/* Pneumatic impact wrench body */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.08, 0.22, 0.08]} />
        <meshStandardMaterial color="#B91C1C" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* 1-inch square drive socket for dome nut */}
      <mesh position={[0, 0.24, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

// ─── 8. 3-METER HEX SCALING PRY-BAR (Mucker / Scaler) ──────────────────────
export function PryBarProp() {
  return (
    <group position={[0, 0, 0.2]} rotation={[-0.7, 0, 0]} name="prop-scaling-bar">
      {/* Hexagonal high-tensile aluminum scaling bar */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 2.6, 6]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Chisel claw tip at upper end */}
      <mesh position={[0, 2.12, 0.02]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.032, 0.08, 0.01]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 9. BLASTING GALVANOMETER / TESTER (Blaster) ───────────────────────────
export function BlastingTesterProp() {
  return (
    <group position={[0, 0, 0.06]} rotation={[0.3, 0, 0]} name="prop-blasting-tester">
      {/* Heavy bakelite / high-vis orange testing box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.14, 0.16, 0.07]} />
        <meshStandardMaterial color="#EA580C" roughness={0.5} />
      </mesh>
      {/* Analog needle dial */}
      <mesh position={[0, 0.03, 0.036]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color="#FEF3C7" />
      </mesh>
      {/* Brass binding posts for twin-lead firing cable */}
      <mesh position={[-0.035, 0.085, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.025, 8]} />
        <meshStandardMaterial color="#D97706" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.035, 0.085, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.025, 8]} />
        <meshStandardMaterial color="#D97706" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
