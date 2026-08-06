"use client";

import React from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   TEMFACIL (Main Temporary Facility) — High-End Industrial Site Flooring
   
   Accurately models Sta. Clara International Corp.'s TEMFACIL compound
   with professional civil engineering site flooring & PBR infrastructure:
     1. Engineered Aggregate Crushed Granite Site Base Floor (62m x 54m)
     2. Concrete Perimeter Curb Headers & Stormwater Drainage Channels
     3. Interlocking Pedestrian Paver Walkways & Yellow Safety Lines
     4. Internal Asphalt Access Road & Painted Vehicle Parking Bays
     5. Concrete Heavy-Duty Building Slabs
     6. Main Site Office, Staff Quarters, Barracks, Warehouse & Clinic
     7. Security Checkpoint Gate, Light Towers, Dumpster, Safety Cones
   ═══════════════════════════════════════════════════════════════════════════ */

export function TemfacilFacility({ isXRay = false }: { isXRay?: boolean }) {
  const cT = isXRay;
  const xOp = isXRay ? 0.25 : 1.0;

  return (
    <group position={[108, 14.0, -95]} rotation={[0, 0, 0]}>
      {/* ═══ 0. UNIFIED HIGH-END INDUSTRIAL SITE FLOORING ═══ */}
      
      {/* A. Engineered Aggregate Crushed Granite Site Base Platform (62m x 54m) */}
      <group position={[-1, 0.02, -2]}>
        <mesh receiveShadow>
          <boxGeometry args={[64, 0.05, 54]} />
          <meshStandardMaterial color="#334155" roughness={0.96} metalness={0.05} />
        </mesh>

        {/* Concrete Edge Retention Curbs (Perimeter Header) */}
        <mesh position={[0, 0.1, -27.1]} receiveShadow>
          <boxGeometry args={[64.4, 0.2, 0.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.1, 27.1]} receiveShadow>
          <boxGeometry args={[64.4, 0.2, 0.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.9} />
        </mesh>
        <mesh position={[-32.1, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.4, 0.2, 54.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.9} />
        </mesh>
        <mesh position={[32.1, 0.1, 0]} receiveShadow>
          <boxGeometry args={[0.4, 0.2, 54.4]} />
          <meshStandardMaterial color="#64748B" roughness={0.9} />
        </mesh>
      </group>

      {/* B. Internal Paved Asphalt Access Road & Parking Apron */}
      <group position={[-14, 0.035, 6]}>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[18, 32]} />
          <meshStandardMaterial color="#1E293B" roughness={0.92} metalness={0.1} />
        </mesh>

        {/* White Painted Parking Stall Markings */}
        {[-8, -3, 2, 7].map((zOff, i) => (
          <group key={`park-stall-${i}`} position={[-2, 0.01, zOff]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[5.5, 0.15]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* C. Interlocking Pedestrian Paver Walkways & Safety Lines */}
      {/* Main East-West Walkway Trunk (Connecting Office -> Barracks) */}
      <group position={[3, 0.045, -4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[36, 3.2]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.85} metalness={0.1} />
        </mesh>
        {/* Yellow Safety Border Lines */}
        <mesh position={[0, 0.01, -1.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 0.12]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 0.12]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} />
        </mesh>
      </group>

      {/* North-South Walkway Spur (Connecting Office -> Clinic -> Canteen) */}
      <group position={[4, 0.045, 6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.2, 18]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.85} metalness={0.1} />
        </mesh>
        <mesh position={[-1.55, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 18]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} />
        </mesh>
        <mesh position={[1.55, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 18]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} />
        </mesh>
      </group>

      {/* D. Heavy-Duty Concrete Foundation Slabs under Buildings */}
      {/* Office & Staff Quarters Slab */}
      <mesh position={[3, 0.06, -12]} receiveShadow>
        <boxGeometry args={[38, 0.12, 18]} />
        <meshStandardMaterial color="#475569" roughness={0.92} />
      </mesh>
      {/* Workers Barracks Slab */}
      <mesh position={[22, 0.06, 8]} receiveShadow>
        <boxGeometry args={[20, 0.12, 24]} />
        <meshStandardMaterial color="#475569" roughness={0.92} />
      </mesh>
      {/* Warehouse Slab */}
      <mesh position={[-25, 0.06, -14]} receiveShadow>
        <boxGeometry args={[24, 0.12, 22]} />
        <meshStandardMaterial color="#475569" roughness={0.92} />
      </mesh>

      {/* Stormwater V-Ditch Concrete Channel */}
      <mesh position={[-32.5, 0.08, -2]} receiveShadow>
        <boxGeometry args={[0.8, 0.2, 53]} />
        <meshStandardMaterial color="#1E293B" roughness={0.95} />
      </mesh>

      {/* ═══ 1. SECURITY CHECKPOINT & BOOM BARRIER GATE ═══ */}
      <group position={[-26, 0, 18]}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 3.0, 3.2]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[3.2, 0.15, 3.6]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.6, 2.5]}>
          <boxGeometry args={[0.5, 1.2, 0.5]} />
          <meshStandardMaterial color="#DC2626" roughness={0.4} />
        </mesh>
        {/* Boom gate barrier arm is rendered dynamically with guard animation in AnimatedSiteEntities */}
      </group>

      {/* ═══ 2. MAIN SITE OFFICE & BREEZEWAY ═══ */}
      <group position={[-6, 0, -12]}>
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[17.2, 4.2, 9.2]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
        </mesh>

        {/* Structural Columns */}
        {[-8, -4, 0, 4, 8].map((xOff, i) => (
          <mesh key={`off-col-${i}`} position={[xOff, 2.2, 4.65]}>
            <boxGeometry args={[0.35, 4.2, 0.15]} />
            <meshStandardMaterial color="#1E293B" roughness={0.9} metalness={0.1} />
          </mesh>
        ))}

        {/* Corrugated Roof */}
        <mesh position={[-4.4, 4.8, 0]} rotation={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[9.2, 0.2, 10.2]} />
          <meshStandardMaterial color="#64748B" roughness={0.88} metalness={0.1} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[4.4, 4.8, 0]} rotation={[0, 0, -0.12]} castShadow>
          <boxGeometry args={[9.2, 0.2, 10.2]} />
          <meshStandardMaterial color="#64748B" roughness={0.88} metalness={0.1} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[0, 5.38, 0]} castShadow>
          <boxGeometry args={[17.8, 0.15, 0.6]} />
          <meshStandardMaterial color="#334155" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Porch & Signboard */}
        <mesh position={[0, 2.0, 5.3]} castShadow>
          <boxGeometry args={[4.5, 3.8, 1.4]} />
          <meshStandardMaterial color="#1E293B" roughness={0.9} metalness={0.1} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[0, 3.5, 6.02]}>
          <boxGeometry args={[3.8, 0.8, 0.05]} />
          <meshStandardMaterial color="#0F766E" roughness={0.5} metalness={0.0} />
        </mesh>

        {/* Windows Array */}
        {[-6, -3, 3, 6].map((xOff, i) => (
          <group key={`off-win-${i}`} position={[xOff, 2.5, 4.63]}>
            <mesh>
              <boxGeometry args={[1.5, 1.5, 0.06]} />
              <meshStandardMaterial color="#334155" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <boxGeometry args={[1.3, 1.3, 0.04]} />
              <meshStandardMaterial color="#0284C7" roughness={0.4} metalness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Covered Breezeway */}
        <mesh position={[10.5, 2.2, 0]} castShadow>
          <boxGeometry args={[4.0, 3.6, 2.8]} />
          <meshStandardMaterial color="#475569" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
        </mesh>
      </group>

      {/* ═══ 3. STAFF ACCOMMODATIONS ═══ */}
      <group position={[12, 0, -12]}>
        {/* Building 1 */}
        <group position={[-3.2, 0, 0]}>
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.2, 3.6, 15]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
          </mesh>
          <mesh position={[0, 3.75, 0]} castShadow>
            <boxGeometry args={[5.6, 0.18, 15.5]} />
            <meshStandardMaterial color="#475569" roughness={0.88} metalness={0.1} transparent={cT} opacity={xOp} />
          </mesh>
        </group>
        {/* Building 2 */}
        <group position={[3.2, 0, 0]}>
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.2, 3.6, 15]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
          </mesh>
          <mesh position={[0, 3.75, 0]} castShadow>
            <boxGeometry args={[5.6, 0.18, 15.5]} />
            <meshStandardMaterial color="#475569" roughness={0.88} metalness={0.1} transparent={cT} opacity={xOp} />
          </mesh>
        </group>
      </group>

      {/* ═══ 4. WORKERS BARRACKS (3 Long Parallel Dormitories) ═══ */}
      <group position={[22, 0, 8]}>
        {[-6.0, 0, 6.0].map((xOff, i) => (
          <group key={`barrack-${i}`} position={[xOff, 0, 0]}>
            <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
              <boxGeometry args={[4.5, 3.5, 20]} />
              <meshStandardMaterial color="#CBD5E1" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
            </mesh>
            <mesh position={[0, 3.65, 0]} castShadow>
              <boxGeometry args={[4.9, 0.18, 20.6]} />
              <meshStandardMaterial color="#64748B" roughness={0.88} metalness={0.1} transparent={cT} opacity={xOp} />
            </mesh>
            {[-7, -2.5, 2.5, 7].map((zOff, j) => (
              <group key={`door-${i}-${j}`} position={[2.28, 1.2, zOff]}>
                <mesh position={[0.02, 0, 0]}>
                  <boxGeometry args={[0.05, 2.2, 1.2]} />
                  <meshStandardMaterial color="#1E293B" roughness={0.9} />
                </mesh>
                <mesh position={[0.4, 1.2, 0]}>
                  <boxGeometry args={[0.8, 0.1, 1.6]} />
                  <meshStandardMaterial color="#334155" roughness={0.9} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* ═══ 5. MAIN WAREHOUSE & MATERIAL LAYDOWN YARD ═══ */}
      <group position={[-25, 0, -14]}>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[13, 6.4, 16]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.9} metalness={0.0} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[-3.3, 6.5, 0]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[7.0, 0.25, 16.6]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.85} metalness={0.15} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[3.3, 6.5, 0]} rotation={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[7.0, 0.25, 16.6]} />
          <meshStandardMaterial color="#1E3A8A" roughness={0.85} metalness={0.15} transparent={cT} opacity={xOp} />
        </mesh>
        <mesh position={[0, 2.8, 8.02]}>
          <boxGeometry args={[6.0, 5.2, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.88} metalness={0.2} />
        </mesh>

        {/* Blue Tarp Stacks */}
        {[-4.5, 0, 4.5].map((xOff, i) => (
          <mesh key={`tarp-${i}`} position={[-9.5, 1.2, -5 + i * 4.5]} castShadow>
            <boxGeometry args={[3.8, 2.4, 3.8]} />
            <meshStandardMaterial color="#0369A1" roughness={0.9} metalness={0.0} />
          </mesh>
        ))}
        {/* Timber Log Stacks */}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`timber-${i}`} position={[-9.5, 0.4, 6 + i * 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 3.8, 12]} />
            <meshStandardMaterial color="#7C4A28" roughness={0.95} />
          </mesh>
        ))}
        {/* Steel Pipe Bundles */}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`pipe-${i}`} position={[-5.5, 0.4, 9 + i * 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 4.2, 12]} />
            <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ═══ 6. TOOL BOX AREA ═══ */}
      <group position={[-10, 0, 14]}>
        <mesh position={[0, 1.8, -4]} castShadow>
          <boxGeometry args={[8.5, 3.6, 3.5]} />
          <meshStandardMaterial color="#CBD5E1" roughness={0.92} />
        </mesh>
        <mesh position={[0, 1.8, -2.2]}>
          <boxGeometry args={[3.2, 1.8, 0.08]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.5} />
        </mesh>
        {[-4.5, 4.5].map((xOff, i) => (
          <mesh key={`tb-tarp-${i}`} position={[xOff, 1.0, 2.5]} castShadow>
            <boxGeometry args={[4.0, 2.0, 4.0]} />
            <meshStandardMaterial color="#0284C7" roughness={0.9} metalness={0.0} />
          </mesh>
        ))}
      </group>

      {/* ═══ 7. SITE CLINIC & CANTEEN AREA ═══ */}
      <group position={[4, 0, 16]}>
        {/* Clinic */}
        <group position={[-4.5, 0, 0]}>
          <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.8, 3.2, 8.5]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.9} metalness={0.0} transparent={cT} opacity={xOp} />
          </mesh>
          <mesh position={[0, 3.25, 0]} castShadow>
            <boxGeometry args={[5.2, 0.12, 8.9]} />
            <meshStandardMaterial color="#64748B" roughness={0.88} metalness={0.1} />
          </mesh>
          <mesh position={[0, 2.2, 4.27]}>
            <boxGeometry args={[1.2, 1.2, 0.05]} />
            <meshStandardMaterial color="#DC2626" roughness={0.6} />
          </mesh>
        </group>

        {/* Canteen Dining Hall & Outdoor Picnic Tables */}
        <group position={[4.5, 0, 0]}>
          <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[6.0, 3.8, 12.5]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.92} metalness={0.0} transparent={cT} opacity={xOp} />
          </mesh>
          <mesh position={[0, 3.6, 0]} castShadow>
            <boxGeometry args={[6.4, 0.15, 13.0]} />
            <meshStandardMaterial color="#475569" roughness={0.88} metalness={0.1} />
          </mesh>
          {[-4, 4].map((zOff, i) => (
            <mesh key={`table-${i}`} position={[5.2, 0.45, zOff]} castShadow>
              <boxGeometry args={[1.8, 0.8, 2.2]} />
              <meshStandardMaterial color="#78350F" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ═══ 8. SOLAR LED LIGHT TOWERS & SAFETY INFRASTRUCTURE ═══ */}
      {/* Light Tower 1 */}
      <group position={[-16, 0, -4]}>
        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 7.0, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0, 7.1, 0]}>
          <boxGeometry args={[0.8, 0.08, 1.2]} />
          <meshStandardMaterial color="#0284C7" roughness={0.2} />
        </mesh>
        <mesh position={[0.4, 6.8, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.4, 0.25, 0.4]} />
          <meshStandardMaterial color="#FDE047" emissive="#FDE047" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Light Tower 2 */}
      <group position={[-34, 0, -22]}>
        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 7.0, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0, 7.1, 0]}>
          <boxGeometry args={[0.8, 0.08, 1.2]} />
          <meshStandardMaterial color="#0284C7" roughness={0.2} />
        </mesh>
        <mesh position={[0.4, 6.8, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.4, 0.25, 0.4]} />
          <meshStandardMaterial color="#FDE047" emissive="#FDE047" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Industrial Waste Dumpster Bin */}
      <mesh position={[-30, 0.9, -4]} castShadow>
        <boxGeometry args={[3.2, 1.8, 2.2]} />
        <meshStandardMaterial color="#047857" roughness={0.6} />
      </mesh>

      {/* Safety Traffic Cones */}
      {[-16, -14, -12].map((xOff, i) => (
        <mesh key={`cone-${i}`} position={[xOff, 0.35, 10]} castShadow>
          <coneGeometry args={[0.25, 0.7, 10]} />
          <meshStandardMaterial color="#EA580C" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
