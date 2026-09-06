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
   ⚡ SITE ELECTRICAL DISTRIBUTION & MOUNTAIN ROADSIDE POWER INFRASTRUCTURE
   
   Engineering Architecture (Option 2 - Clean Roadside Verge & External Substation):
     1. Heavy-Duty Soundproof Industrial Diesel Generator (Genset Hub at Switchyard)
     2. Concrete Spun Utility Poles strictly on the Mountain Road Verge (Offset >5.5m)
     3. Continuous 3-Phase Overhead ACSR Conductors along the Mountain Shoulder
     4. LED Cobra-Head Roadway Streetlights Illuminating the Haul Road Surface
     5. Temfacil External Perimeter Substation (Step-Down Transformer & MDP Yard outside compound)
     6. ZERO poles or wires inside Temfacil courtyard (clean underground duct bank feed)
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

/**
 * 7 Concrete Utility Distribution Poles aligned strictly on the Mountain Road Verge
 * (Clear of all driving lanes, dump trucks, and supercars; terminating outside Temfacil gate)
 */
export const SITE_UTILITY_POLES: UtilityPoleData[] = [
  {
    id: "POLE-00",
    x: 28.0,
    z: 6.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: Math.PI / 4,
    hasGuyWire: true,
    guyWireAngle: -Math.PI / 4,
    label: "P0 - Switchyard Auxiliary Pad Feeder",
  },
  {
    id: "POLE-01",
    x: 37.5,
    z: 0.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: -2.02,
    label: "P1 - Lower Foothill Mountain Verge",
  },
  {
    id: "POLE-02",
    x: 44.5,
    z: -14.5,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: -2.02,
    label: "P2 - Lower S-Curve Mountain Embankment",
  },
  {
    id: "POLE-03",
    x: 52.0,
    z: -29.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: -2.08,
    label: "P3 - Mid-Mountain Scenic Verge",
  },
  {
    id: "POLE-04",
    x: 61.0,
    z: -43.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: -2.20,
    label: "P4 - Upper Mountain Climb Verge",
  },
  {
    id: "POLE-05",
    x: 70.5,
    z: -56.0,
    hasTransformer: false,
    hasStreetlight: true,
    streetlightYaw: -2.21,
    hasGuyWire: true,
    guyWireAngle: 0.85,
    label: "P5 - Plateau Approach Mountain Verge",
  },
  {
    id: "POLE-06",
    x: 81.0,
    z: -69.5,
    hasTransformer: true,
    hasStreetlight: true,
    streetlightYaw: -2.22,
    hasGuyWire: true,
    guyWireAngle: Math.PI / 3,
    label: "P6 - Temfacil Gate Terminal Substation Pole",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 1. HEAVY-DUTY INDUSTRIAL DIESEL GENERATOR SET (500 kVA SOUNDPROOF GENSET)
// ═══════════════════════════════════════════════════════════════════════════
export function SiteIndustrialGenset({ position = [26.0, 0, 6.0] }: { position?: [number, number, number] }) {
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

      {/* Main Distribution Panel (MDP) & Heavy Armored Cable Conduits to Feeder Pole P0 */}
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
// 🪵 2. CONCRETE UTILITY DISTRIBUTION POLE WITH STREETLIGHT & CROSSARM
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
      <group position={[0, poleHeight - 0.75, 0]} rotation={[0, streetYaw + Math.PI / 2, 0]}>
        {/* Horizontal Galvanized Steel Angle Crossarm */}
        <mesh material={MAT_STEEL_FRAME}>
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

      {/* ═══ COBRA-HEAD LED ROADWAY STREETLIGHT (POINTING ACROSS ROAD) ═══ */}
      {data.hasStreetlight && (
        <group position={[0, poleHeight - 1.2, 0]} rotation={[0, streetYaw, 0]}>
          {/* Curved Galvanized Steel Outreach Pipe Arm */}
          <mesh position={[0.9, 0.35, 0]} rotation={[0, 0, -0.22]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.03, 0.03, 1.9, 8]} />
          </mesh>
          {/* Luminaire Head Housing */}
          <group position={[1.8, 0.62, 0]}>
            <mesh material={MAT_STREETLIGHT_HEAD}>
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
// ⚡ 3. TEMFACIL EXTERNAL PERIMETER SUBSTATION & STEP-DOWN TRANSFORMER YARD
// ═══════════════════════════════════════════════════════════════════════════
export function TemfacilExternalSubstation({ position = [84.5, 0, -71.5] }: { position?: [number, number, number] }) {
  const groundY = useMemo(() => Math.max(14.15, sampleTerrainY(position[0], position[2])), [position]);

  return (
    <group position={[position[0], groundY, position[2]]}>
      {/* Heavy Reinforced Concrete Equipment Foundation Pad */}
      <mesh position={[0, 0.12, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[3.8, 0.24, 3.2]} />
      </mesh>

      {/* Perimeter Safety Chainlink Fence Enclosure with Yellow Caution Frame */}
      {/* Back Wall */}
      <mesh position={[0, 1.1, -1.5]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[3.6, 2.0, 0.04]} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-1.8, 1.1, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.04, 2.0, 3.0]} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[1.8, 1.1, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.04, 2.0, 3.0]} />
      </mesh>

      {/* High-Voltage OSHA Warning Signboard */}
      <group position={[0, 1.6, 1.52]}>
        <mesh material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.8, 0.5, 0.02]} />
        </mesh>
        <mesh position={[0, 0, 0.015]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.72, 0.42, 0.005]} />
        </mesh>
      </group>

      {/* Main 3-Phase Step-Down Distribution Transformer (13.8kV -> 480V/230V) */}
      <group position={[-0.6, 0.24, 0]}>
        {/* Main Transformer Oil Tank Body */}
        <mesh position={[0, 0.8, 0]} material={MAT_TRANSFORMER_CAN} castShadow>
          <boxGeometry args={[1.3, 1.4, 1.1]} />
        </mesh>
        {/* External Cooling Radiator Fin Banks */}
        {[-0.68, 0.68].map((xR, rIdx) => (
          <group key={`rad-${rIdx}`} position={[xR, 0.8, 0]}>
            <mesh material={MAT_STEEL_FRAME}>
              <boxGeometry args={[0.12, 1.1, 0.9]} />
            </mesh>
          </group>
        ))}
        {/* High-Voltage Primary Bushings */}
        {[-0.35, 0, 0.35].map((bX, bIdx) => (
          <mesh key={`pri-bush-${bIdx}`} position={[bX, 1.7, -0.2]} material={MAT_INSULATOR_CERAMIC}>
            <cylinderGeometry args={[0.04, 0.07, 0.35, 8]} />
          </mesh>
        ))}
        {/* Low-Voltage Secondary Bushing Terminals */}
        {[-0.3, -0.1, 0.1, 0.3].map((lvX, lvIdx) => (
          <mesh key={`sec-bush-${lvIdx}`} position={[lvX, 1.65, 0.3]} material={MAT_INSULATOR_CERAMIC}>
            <cylinderGeometry args={[0.03, 0.05, 0.25, 8]} />
          </mesh>
        ))}
      </group>

      {/* Outdoor Weatherproof Main Distribution Panel (MDP) & Switchgear Cabinet */}
      <group position={[1.0, 0.24, 0]}>
        <mesh position={[0, 0.95, 0]} material={MAT_STEEL_FRAME} castShadow>
          <boxGeometry args={[0.9, 1.65, 0.7]} />
        </mesh>
        {/* Stainless Steel Meter Enclosure */}
        <mesh position={[0, 1.1, 0.36]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.4, 0.5, 0.08]} />
        </mesh>
        {/* Digital Telemetry Glass Window */}
        <mesh position={[0, 1.18, 0.41]}>
          <planeGeometry args={[0.22, 0.14]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* High-Voltage Pothead Riser Pipe coming down from Pole 6 */}
      <mesh position={[-1.5, 1.8, -0.6]} material={MAT_CONDUIT_METALLIC}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 8]} />
      </mesh>

      {/* Ground-Level Underground Concrete Cable Trench / Duct Bank entering compound */}
      <mesh position={[2.4, 0.06, 0]} material={MAT_CONCRETE_HEADER} receiveShadow>
        <boxGeometry args={[1.4, 0.12, 0.7]} />
      </mesh>
      {/* Diamond-Plate Trench Cover */}
      <mesh position={[2.4, 0.13, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[1.36, 0.02, 0.66]} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 4. CONTINUOUS OVERHEAD 3-PHASE CATENARY DISTRIBUTION CONDUCTORS
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

  // Compute 3 primary phase spans and 1 neutral span between consecutive roadside verge poles
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
      const sag = Math.max(0.35, dist * 0.030);

      // 3 Primary High-Voltage Phase Conductors
      PHASE_OFFSETS.forEach((xOff) => {
        const start = new THREE.Vector3(pA.x + xOff * 0.35, yA, pA.z);
        const end = new THREE.Vector3(pB.x + xOff * 0.35, yB, pB.z);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y -= sag;

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        segments.push(new THREE.TubeGeometry(curve, 18, 0.016, 6, false));
      });

      // 1 Secondary Neutral Conductor lower on pole
      const startN = new THREE.Vector3(pA.x, yA - 1.45, pA.z + 0.15);
      const endN = new THREE.Vector3(pB.x, yB - 1.45, pB.z + 0.15);
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
        <mesh key={`catenary-wire-${idx}`} geometry={geom} material={wireMat} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌟 5. MAIN EXPORT: SITE ELECTRICAL DISTRIBUTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
export function SiteElectricalDistribution() {
  return (
    <group>
      {/* 1. Heavy-Duty Soundproof Industrial Diesel Generator (Genset Hub at Switchyard) */}
      <SiteIndustrialGenset position={[26.0, 0, 6.0]} />

      {/* 2. Concrete Utility Distribution Poles along Mountain Road Verge (Offset >5.5m) */}
      {SITE_UTILITY_POLES.map((pole) => (
        <ConcreteUtilityPole key={pole.id} data={pole} />
      ))}

      {/* 3. Continuous 3-Phase Overhead Electrical Lines with Catenary Sag */}
      <OverheadDistributionCatenaries />

      {/* 4. Temfacil External Perimeter Substation & Step-Down Transformer Yard (outside gate) */}
      <TemfacilExternalSubstation position={[84.5, 0, -71.5]} />
    </group>
  );
}
