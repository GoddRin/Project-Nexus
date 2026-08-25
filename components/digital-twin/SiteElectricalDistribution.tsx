"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sampleTerrainY } from "./AnimatedSiteEntities";
import {
  MAT_CONCRETE_LIGHT,
  MAT_CONCRETE_HEADER,
  MAT_CONCRETE_SLAB,
  MAT_STEEL_FRAME,
  MAT_STEEL_DARK,
  MAT_YELLOW_SAFETY,
  MAT_GENSET_YELLOW,
  MAT_GENSET_DARK,
  MAT_GENSET_RADIATOR,
  MAT_INSULATOR_CERAMIC,
  MAT_STREETLIGHT_HEAD,
  MAT_STREETLIGHT_LENS,
  MAT_TRANSFORMER_CAN,
  MAT_CONDUIT_METALLIC,
  MAT_FOOD_STAINLESS_TRAY,
} from "./SharedMaterials";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚡ SITE ELECTRICAL DISTRIBUTION & GENSET POWER INFRASTRUCTURE
   
   Models the operational temporary & permanent electrical distribution:
     1. Heavy-Duty Sound-Attenuated Industrial Diesel Generator (Genset Hub)
     2. Concrete Spun Utility Distribution Poles with Crossarms & Ceramic Insulators
     3. 3-Phase ACSR Overhead Power Conductors with Physical Catenary Sag
     4. Roadway LED Cobra-Head Streetlights Illuminating the Mountain Access Road
     5. Pole-Mounted Distribution Transformers & Building Service Drops
   ═══════════════════════════════════════════════════════════════════════════ */

export interface UtilityPoleData {
  id: string;
  x: number;
  z: number;
  hasTransformer?: boolean;
  hasStreetlight?: boolean;
  streetlightYaw?: number;
  hasGuyWire?: boolean;
  guyWireAngle?: number;
  label: string;
}

export const SITE_UTILITY_POLES: UtilityPoleData[] = [
  {
    id: "POLE-00",
    x: 34.0,
    z: 2.0,
    hasTransformer: true,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 4,
    hasGuyWire: true,
    guyWireAngle: -Math.PI / 4,
    label: "P0 - Switchyard Genset Feeder",
  },
  {
    id: "POLE-01",
    x: 44.0,
    z: -4.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 3,
    label: "P1 - Lower Foothill Incline",
  },
  {
    id: "POLE-02",
    x: 54.0,
    z: -22.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 3,
    hasGuyWire: true,
    guyWireAngle: Math.PI / 6,
    label: "P2 - Lower Mountain S-Curve",
  },
  {
    id: "POLE-03",
    x: 67.0,
    z: -42.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 3.2,
    label: "P3 - Mid-Mountain Scenic Climb",
  },
  {
    id: "POLE-04",
    x: 80.0,
    z: -60.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 3.5,
    hasGuyWire: true,
    guyWireAngle: Math.PI / 4,
    label: "P4 - Upper Hillside Approach",
  },
  {
    id: "POLE-05",
    x: 94.0,
    z: -74.0,
    hasTransformer: true,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 3.8,
    label: "P5 - Guardhouse & Security Checkpoint Junction",
  },
  {
    id: "POLE-06",
    x: 112.0,
    z: -88.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 2.5,
    label: "P6 - Temfacil Admin Boulevard",
  },
  {
    id: "POLE-07",
    x: 136.0,
    z: -96.0,
    hasTransformer: true,
    hasStreetlight: true,
    streetlightYaw: 0,
    hasGuyWire: true,
    guyWireAngle: -Math.PI / 2,
    label: "P7 - Workers Barracks & Mess Hall Substation",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 1. HEAVY-DUTY INDUSTRIAL DIESEL GENERATOR SET (500 kVA SOUNDPROOF GENSET)
// ═══════════════════════════════════════════════════════════════════════════
export function SiteIndustrialGenset({ position = [32.0, 0, 4.0] }: { position?: [number, number, number] }) {
  const gensetRef = useRef<THREE.Group>(null);
  const groundY = useMemo(() => sampleTerrainY(position[0], position[2]), [position]);

  // Subtle realistic engine vibration
  useFrame(({ clock }) => {
    if (gensetRef.current) {
      const t = clock.getElapsedTime();
      gensetRef.current.position.y = groundY + Math.sin(t * 30.0) * 0.0015;
    }
  });

  return (
    <group ref={gensetRef} position={[position[0], groundY, position[2]]}>
      {/* Heavy Reinforced Concrete Equipment Pad */}
      <mesh position={[0, 0.12, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[4.4, 0.24, 2.4]} />
      </mesh>

      {/* Heavy Black Steel Base Skid with Integrated Fuel Tank & Forklift Pockets */}
      <mesh position={[0, 0.36, 0]} material={MAT_GENSET_DARK} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.26, 1.8]} />
      </mesh>
      {/* Forklift Pocket Cutouts */}
      {[-0.8, 0.8].map((xOff, i) => (
        <mesh key={`fork-pocket-${i}`} position={[xOff, 0.36, 0]} material={MAT_GENSET_DARK}>
          <boxGeometry args={[0.28, 0.14, 1.84]} />
        </mesh>
      ))}

      {/* Main Sound-Attenuated Acoustic Weatherproof Enclosure (CAT Yellow) */}
      <mesh position={[0, 1.30, 0]} material={MAT_GENSET_YELLOW} castShadow receiveShadow>
        <boxGeometry args={[3.7, 1.62, 1.65]} />
      </mesh>

      {/* Enclosure Roof Overhang & Lifting Eyes */}
      <mesh position={[0, 2.14, 0]} material={MAT_GENSET_DARK} castShadow>
        <boxGeometry args={[3.85, 0.08, 1.75]} />
      </mesh>
      {[-1.2, 1.2].map((xL, idx) => (
        <mesh key={`lift-eye-${idx}`} position={[xL, 2.22, 0]} material={MAT_STEEL_DARK}>
          <torusGeometry args={[0.06, 0.02, 8, 12]} />
        </mesh>
      ))}

      {/* Front Radiator Cooling Louvers & Air Discharge Duct */}
      <group position={[1.86, 1.35, 0]}>
        <mesh material={MAT_GENSET_RADIATOR}>
          <boxGeometry args={[0.06, 1.25, 1.35]} />
        </mesh>
        {/* Louver Slats */}
        {Array.from({ length: 8 }).map((_, sIdx) => (
          <mesh key={`slat-${sIdx}`} position={[0.04, -0.45 + sIdx * 0.13, 0]} rotation={[0.4, 0, 0]} material={MAT_GENSET_DARK}>
            <boxGeometry args={[0.02, 0.04, 1.25]} />
          </mesh>
        ))}
      </group>

      {/* Rear Air Intake Louvers */}
      <mesh position={[-1.86, 1.35, 0]} material={MAT_GENSET_RADIATOR}>
        <boxGeometry args={[0.06, 1.10, 1.25]} />
      </mesh>

      {/* Side Maintenance Access Doors with Recessed Handles */}
      {[-0.85, 0.85].map((zSide, sIdx) => (
        <group key={`side-doors-${sIdx}`} position={[0, 1.25, zSide * 0.83]}>
          {[-0.9, 0.4].map((xDoor, dIdx) => (
            <group key={`door-${dIdx}`} position={[xDoor, 0, 0]}>
              {/* Door Seam */}
              <mesh material={MAT_GENSET_DARK}>
                <boxGeometry args={[1.05, 1.35, 0.02]} />
              </mesh>
              {/* Stainless Steel Handle */}
              <mesh position={[0.42, 0, zSide * 0.025]} material={MAT_FOOD_STAINLESS_TRAY}>
                <boxGeometry args={[0.03, 0.12, 0.03]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Vertical Stainless Steel Exhaust Silencer & Muffler Stack */}
      <group position={[0.6, 2.18, 0.35]}>
        {/* Muffler Barrel */}
        <mesh position={[0, 0.35, 0]} material={MAT_STEEL_DARK} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.65, 12]} />
        </mesh>
        {/* Exhaust Pipe Outlet */}
        <mesh position={[0, 0.85, 0]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.08, 0.08, 0.40, 12]} />
        </mesh>
        {/* Weighted 90° Rain Flap / Spark Arrestor */}
        <mesh position={[0.06, 1.06, 0]} rotation={[0, 0, 0.35]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.18, 0.02, 0.18]} />
        </mesh>
      </group>

      {/* Digital Control Panel Module & Telemetry Display (DeepSea / ComAp Controller) */}
      <group position={[-1.2, 1.35, 0.84]}>
        <mesh material={MAT_GENSET_DARK}>
          <boxGeometry args={[0.55, 0.65, 0.04]} />
        </mesh>
        {/* Glowing LCD Display Screen */}
        <mesh position={[0, 0.12, 0.025]}>
          <planeGeometry args={[0.32, 0.18]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
        {/* Green/Amber Status LEDs */}
        <mesh position={[-0.10, -0.08, 0.025]}>
          <circleGeometry args={[0.015, 8]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[0, -0.08, 0.025]}>
          <circleGeometry args={[0.015, 8]} />
          <meshBasicMaterial color="#EAB308" />
        </mesh>
        {/* Red Emergency Stop (E-Stop) Mushroom Button */}
        <mesh position={[0.16, -0.15, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 10]} />
          <meshStandardMaterial color="#EF4444" roughness={0.3} />
        </mesh>
      </group>

      {/* Main Distribution Panel (MDP) & Heavy Armored Cable Conduits to Feeder Pole */}
      <group position={[1.2, 1.25, 0.85]}>
        <mesh material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.65, 0.95, 0.18]} />
        </mesh>
        {/* 4-Core Armored Feeder Conduit leading to Pole 0 */}
        <mesh position={[0.15, -0.65, 0.15]} material={MAT_CONDUIT_METALLIC}>
          <cylinderGeometry args={[0.05, 0.05, 0.55, 8]} />
        </mesh>
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪵 2. CONCRETE UTILITY DISTRIBUTION POLE WITH STREETLIGHT & TRANSFORMER
// ═══════════════════════════════════════════════════════════════════════════
export function ConcreteUtilityPole({
  data,
  poleHeight = 8.5,
}: {
  data: UtilityPoleData;
  poleHeight?: number;
}) {
  const groundY = useMemo(() => sampleTerrainY(data.x, data.z), [data.x, data.z]);
  const streetYaw = data.streetlightYaw ?? Math.PI / 3;

  return (
    <group position={[data.x, groundY, data.z]}>
      {/* Concrete Base Foundation Collar flush with terrain */}
      <mesh position={[0, 0.25, 0]} material={MAT_CONCRETE_HEADER} receiveShadow castShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.5, 8]} />
      </mesh>

      {/* Main Spun Concrete Octagonal Tapered Utility Pole */}
      <mesh position={[0, poleHeight * 0.5, 0]} material={MAT_CONCRETE_LIGHT} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.19, poleHeight, 8]} />
      </mesh>

      {/* Pole Top Weather Cap */}
      <mesh position={[0, poleHeight + 0.06, 0]} material={MAT_STEEL_DARK}>
        <coneGeometry args={[0.14, 0.14, 8]} />
      </mesh>

      {/* ═══ PRIMARY 3-PHASE STEEL CROSSARM & PORCELAIN PIN INSULATORS ═══ */}
      <group position={[0, poleHeight - 0.75, 0]}>
        {/* Horizontal Galvanized Steel Angle Crossarm */}
        <mesh material={MAT_STEEL_FRAME} castShadow>
          <boxGeometry args={[2.2, 0.08, 0.08]} />
        </mesh>
        {/* Diagonal Steel Crossarm Brace Struts */}
        <mesh position={[-0.45, -0.32, 0]} rotation={[0, 0, 0.52]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.75, 0.03, 0.03]} />
        </mesh>
        <mesh position={[0.45, -0.32, 0]} rotation={[0, 0, -0.52]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.75, 0.03, 0.03]} />
        </mesh>

        {/* 3 Glazed Ceramic Pin Insulators (Phase A, B, C) */}
        {[-0.9, 0, 0.9].map((xOff, pIdx) => (
          <group key={`insulator-${pIdx}`} position={[xOff, 0.14, 0]}>
            {/* Ceramic Skirt Rings */}
            <mesh material={MAT_INSULATOR_CERAMIC}>
              <cylinderGeometry args={[0.04, 0.065, 0.18, 10]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} material={MAT_INSULATOR_CERAMIC}>
              <cylinderGeometry args={[0.055, 0.02, 0.06, 10]} />
            </mesh>
            {/* Conductor Binding Tie Clamp */}
            <mesh position={[0, 0.11, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.04, 0.03, 0.06]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ═══ SECONDARY NEUTRAL/LOW-VOLTAGE RACK ═══ */}
      <group position={[0, poleHeight - 2.2, 0.14]}>
        <mesh material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.06, 0.55, 0.06]} />
        </mesh>
        {[-0.18, 0, 0.18].map((yOff, sIdx) => (
          <mesh key={`sec-spool-${sIdx}`} position={[0, yOff, 0.06]} rotation={[Math.PI / 2, 0, 0]} material={MAT_INSULATOR_CERAMIC}>
            <cylinderGeometry args={[0.035, 0.035, 0.08, 8]} />
          </mesh>
        ))}
      </group>

      {/* ═══ POLE-MOUNTED DISTRIBUTION TRANSFORMER (ON SELECTED JUNCTION POLES) ═══ */}
      {data.hasTransformer && (
        <group position={[0, poleHeight - 3.4, -0.32]}>
          {/* Steel Mounting Bracket to Pole */}
          <mesh position={[0, 0, 0.14]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.25, 0.65, 0.18]} />
          </mesh>
          {/* Oil-Filled Cylindrical Tank Body */}
          <mesh material={MAT_TRANSFORMER_CAN} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.85, 14]} />
          </mesh>
          {/* Top Bushings */}
          {[-0.12, 0.12].map((bX, bIdx) => (
            <mesh key={`tx-bush-${bIdx}`} position={[bX, 0.52, 0]} material={MAT_INSULATOR_CERAMIC}>
              <cylinderGeometry args={[0.025, 0.045, 0.22, 8]} />
            </mesh>
          ))}
          {/* Secondary Low-Voltage Terminals */}
          <mesh position={[0, -0.25, -0.26]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.18, 0.12, 0.08]} />
          </mesh>
        </group>
      )}

      {/* ═══ COBRA-HEAD LED ROADWAY STREETLIGHT ═══ */}
      {data.hasStreetlight && (
        <group position={[0, poleHeight - 1.2, 0]} rotation={[0, streetYaw, 0]}>
          {/* Curved Galvanized Steel Outreach Pipe Arm */}
          <mesh position={[0.9, 0.35, 0]} rotation={[0, 0, -0.22]} material={MAT_STEEL_FRAME} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.9, 8]} />
          </mesh>
          {/* Luminaire Head Housing */}
          <group position={[1.8, 0.62, 0]}>
            <mesh material={MAT_STREETLIGHT_HEAD} castShadow>
              <boxGeometry args={[0.42, 0.10, 0.22]} />
            </mesh>
            {/* Emissive Warm LED Luminaire Lens */}
            <mesh position={[0, -0.055, 0]} material={MAT_STREETLIGHT_LENS}>
              <boxGeometry args={[0.34, 0.015, 0.16]} />
            </mesh>
          </group>
        </group>
      )}

      {/* ═══ GUY-WIRE ANCHOR STAY CABLE (FOR CORNER / STRAIN POLES) ═══ */}
      {data.hasGuyWire && (
        <group position={[0, poleHeight - 1.0, 0]} rotation={[0, data.guyWireAngle ?? 0, 0]}>
          {/* Steel Guy Cable reaching ground */}
          <mesh position={[1.8, -3.2, 0]} rotation={[0, 0, -0.55]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.008, 0.008, 7.5, 6]} />
          </mesh>
          {/* High-Visibility OSHA Yellow Guy Marker Guard Sleeve */}
          <mesh position={[3.2, -5.8, 0]} rotation={[0, 0, -0.55]} material={MAT_YELLOW_SAFETY}>
            <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 3. CONTINUOUS OVERHEAD 3-PHASE CATENARY DISTRIBUTION CONDUCTORS
// ═══════════════════════════════════════════════════════════════════════════
export function OverheadDistributionCatenaries() {
  const wireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1E293B",
        roughness: 0.35,
        metalness: 0.85,
      }),
    []
  );

  // Compute 3 primary phase spans and 1 neutral span between every consecutive pole
  const spans = useMemo(() => {
    const segments: THREE.TubeGeometry[] = [];
    const POLE_H = 8.5;
    const PHASE_OFFSETS = [-0.9, 0, 0.9];

    for (let i = 0; i < SITE_UTILITY_POLES.length - 1; i++) {
      const pA = SITE_UTILITY_POLES[i];
      const pB = SITE_UTILITY_POLES[i + 1];

      const yA = sampleTerrainY(pA.x, pA.z) + POLE_H - 0.61;
      const yB = sampleTerrainY(pB.x, pB.z) + POLE_H - 0.61;

      const dist = Math.sqrt((pB.x - pA.x) ** 2 + (pB.z - pA.z) ** 2);
      const sag = Math.max(0.35, dist * 0.032);

      // 3 Primary High-Voltage Phase Conductors
      PHASE_OFFSETS.forEach((xOff) => {
        const start = new THREE.Vector3(pA.x + xOff * 0.4, yA, pA.z);
        const end = new THREE.Vector3(pB.x + xOff * 0.4, yB, pB.z);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y -= sag;

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        segments.push(new THREE.TubeGeometry(curve, 18, 0.016, 6, false));
      });

      // 1 Secondary Neutral Conductor lower on pole
      const startN = new THREE.Vector3(pA.x, yA - 1.45, pA.z + 0.18);
      const endN = new THREE.Vector3(pB.x, yB - 1.45, pB.z + 0.18);
      const midN = new THREE.Vector3().addVectors(startN, endN).multiplyScalar(0.5);
      midN.y -= sag * 1.1;
      const curveN = new THREE.CatmullRomCurve3([startN, midN, endN]);
      segments.push(new THREE.TubeGeometry(curveN, 18, 0.012, 6, false));
    }
    return segments;
  }, []);

  return (
    <group>
      {spans.map((geom, idx) => (
        <mesh key={`catenary-wire-${idx}`} geometry={geom} material={wireMat} castShadow />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌟 4. MAIN EXPORT: SITE ELECTRICAL DISTRIBUTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
export function SiteElectricalDistribution() {
  return (
    <group>
      {/* 1. Heavy-Duty Soundproof Industrial Diesel Generator (Genset Hub) */}
      <SiteIndustrialGenset position={[32.0, 0, 4.0]} />

      {/* 2. Concrete Utility Distribution Poles along Uphill Access Road */}
      {SITE_UTILITY_POLES.map((pole) => (
        <ConcreteUtilityPole key={pole.id} data={pole} />
      ))}

      {/* 3. Continuous 3-Phase Overhead Electrical Lines with Catenary Sag */}
      <OverheadDistributionCatenaries />
    </group>
  );
}
