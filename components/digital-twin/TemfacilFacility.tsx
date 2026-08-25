"use client";

import React, { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  MAT_GRANITE_BASE,
  MAT_CONCRETE_HEADER,
  MAT_ASPHALT_DARK,
  MAT_EARTH_BROWN_DUST,
  MAT_EARTH_BROWN_DARK,
  MAT_WHITE_PAINT,
  MAT_PAVER_WALKWAY,
  MAT_YELLOW_SAFETY,
  MAT_CONCRETE_SLAB,
  MAT_STEEL_DARK,
  MAT_STEEL_FRAME,
  MAT_CONCRETE_SLAB_LIGHT,
  MAT_ROOF_BLUE,
  MAT_ROOF_CORRUGATED,
  MAT_ROOF_CAP,
  MAT_SIGNBOARD_TEAL,
  MAT_GLASS_FRAME,
  MAT_GLASS_CLEAR,
  MAT_CANAL_WATER,
  MAT_RED_BOOTH,
  MAT_WORKER_VEST_GREEN,
  MAT_CANTEEN_GREEN_MESH,
  MAT_CANTEEN_GREEN_WALL,
  MAT_BAMBOO_TIMBER,
  MAT_FOOD_STAINLESS_TRAY,
  MAT_ADOBO,
  MAT_GARLIC_RICE,
  MAT_WORKER_VEST_ORANGE,
  MAT_WORKER_VEST_AMBER,
  MAT_WORKER_HARDHAT_YELLOW,
  MAT_WORKER_HARDHAT_WHITE,
  MAT_SKIN_MEDIUM,
  MAT_SKIN_LIGHT,
  MAT_SKIN_BRONZE,
  MAT_SHIRT_LONG_GREEN,
  MAT_SHIRT_LIGHT_BLUE,
  MAT_SHIRT_BLAZER_NAVY,
  MAT_PANTS_JEANS,
  MAT_PANTS_SLATE,
  MAT_GLASS_BLUE,
  MAT_WORKER_VEST_ROYAL,
  MAT_SHIRT_SLATE_ADMIN,
  MAT_SKIN_DEEP,
  MAT_HAIR_BLACK,
  MAT_FACE_EYE_PUPIL,
  MAT_FACE_EYE_IRIS,
  MAT_FACE_EYE_WHITE,
  MAT_FACE_EYEBROW,
  MAT_FACE_LIPS,
  MAT_MUSTACHE_BLACK,
  MAT_CHROME,
  MAT_GALLON_ROYAL_BLUE,
  MAT_SANDO_WHITE,
  MAT_SANDO_GREY,
  MAT_SANDO_RED,
  MAT_SANDO_BLACK,
  MAT_SHORTS_BASKETBALL_BLUE,
  MAT_SHORTS_DENIM,
  MAT_SHORTS_CARGO,
  MAT_PAJAMA_PLAID,
  MAT_PAJAMA_GREY,
  MAT_TSINELAS_RUBBER,
  MAT_TSINELAS_RED,
  MAT_PHONE_BODY,
  MAT_PHONE_SCREEN_GLOW,
  MAT_CIGARETTE_TIP_GLOW,
  MAT_CIGARETTE_BODY,
  MAT_CIGARETTE_FILTER,
  MAT_MONOBLOC_STOOL_BLUE,
  MAT_MONOBLOC_STOOL_RED,
  MAT_MONOBLOC_STOOL_GREEN,
  MAT_BATYA_PLASTIC,
  MAT_SOAP_SUDS,
  MAT_THERMOS_FLASK,
  MAT_COFFEE_MUG,
} from "./SharedMaterials";

/* ═══════════════════════════════════════════════════════════════════════════
   TEMFACIL (Main Temporary Facility) — High-End Industrial Site Flooring
   
   Accurately models Sta. Clara International Corp.'s TEMFACIL compound
   with professional civil engineering site flooring & PBR infrastructure:
     1. Engineered Aggregate Crushed Granite Site Base Floor (84m x 54m)
     2. Concrete Perimeter Curb Headers & Stormwater Drainage Channels
     3. Interlocking Pedestrian Paver Walkways & Yellow Safety Lines
     4. Internal Asphalt Access Road & Painted Vehicle Parking Bays
     5. Concrete Heavy-Duty Building Slabs
     6. Main Site Office, Staff Quarters, Barracks, Warehouse & Clinic
     7. Security Checkpoint Gate, Light Towers, Dumpster, Safety Cones
   ═══════════════════════════════════════════════════════════════════════════ */

export function TemfacilFacility({
  isXRay = false,
  onSelectPerson,
  activePreset = "temfacil",
}: {
  isXRay?: boolean;
  onSelectPerson?: (id: string) => void;
  activePreset?: string;
}) {
  const isTemfacilFocused = !activePreset || activePreset.startsWith("temfacil");
  return (
    <group position={[118, 14.0, -95]} rotation={[0, 0, 0]}>
      {/* ═══ 0. UNIFIED HIGH-END INDUSTRIAL SITE FLOORING ═══ */}

      {/* A. Engineered Aggregate Crushed Granite Site Base Platform (84m x 82m) */}
      <group position={[9, 0.02, -16]}>
        <mesh receiveShadow material={MAT_GRANITE_BASE}>
          <boxGeometry args={[84, 0.05, 82]} />
        </mesh>

        {/* Concrete Edge Retention Curbs (Perimeter Header) */}
        <mesh position={[0, 0.1, -41.1]} receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[84.4, 0.2, 0.4]} />
        </mesh>
        <mesh position={[0, 0.1, 41.1]} receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[84.4, 0.2, 0.4]} />
        </mesh>
        <mesh position={[-42.1, 0.1, 0]} receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.4, 0.2, 82.4]} />
        </mesh>
        <mesh position={[42.1, 0.1, 0]} receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.4, 0.2, 82.4]} />
        </mesh>
      </group>

      {/* B1. High-End 3D Volumetric Instanced Grass Lawns */}
      {/* Lawn 1: Left lawn behind staff house/kitchen (x = -17.0 to 4.2, z = -33.8 to -55.2) */}
      <Instanced3DGrassLawn position={[-6.4, 0.048, -44.5]} size={[21.2, 21.4]} />
      {/* Lawn 2: Rear lawn garden behind Foreman House (x = 8.0 to 28.0, z = -48.0 to -55.0) */}
      <Instanced3DGrassLawn position={[18.0, 0.048, -51.5]} size={[20.0, 7.0]} />

      {/* REALISTIC REINFORCED CONCRETE DRAINAGE CANAL NETWORK (U-CHANNEL SYSTEM) */}
      <TemfacilSiteDrainageCanal />

      {/* B2. Internal Paved Asphalt Access Road & Parking Apron */}
      <group position={[-14, 0.035, 6]}>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT_ASPHALT_DARK}>
          <planeGeometry args={[18, 32]} />
        </mesh>
      </group>

      {/* ═══ REAL-LIFE SMALL DUST-BROWN DIRT ACCESS ROAD (STAFF OFFICE -> UPHILL -> WAREHOUSE) ═══ */}
      {/* Modeled directly from TEMFACIL site aerial satellite photo: a 4.8m-wide unpaved brown dirt track winding uphill */}

      {/* 1. Compacted Dirt Pad under Warehouse Footprint (Sized to fit 13.5m x 16.5m building) */}
      <group position={[-28.0, 0.4, -14.0]}>
        <mesh receiveShadow material={MAT_EARTH_BROWN_DUST}>
          <boxGeometry args={[15.0, 0.8, 18.0]} />
        </mesh>
      </group>

      {/* 2. Distinct Dust-Brown Dirt Access Road Trunk & Uphill Incline Ramp (4.8m Wide) */}
      {/* Lower Dirt Road Segment in Front of Staff Office (X = -13.5, Z = -3.0) */}
      <mesh position={[-13.5, 0.05, -3.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT_EARTH_BROWN_DUST}>
        <planeGeometry args={[5.0, 22.0]} />
      </mesh>

      {/* Sloped Uphill Curved Dirt Access Road Segment (Climbing continuously from Y=0.05m to Y=0.8m) */}
      <group position={[-20.5, 0.42, -10.0]}>
        <mesh rotation={[-Math.PI / 2, 0.09, -0.45]} receiveShadow material={MAT_EARTH_BROWN_DUST}>
          <planeGeometry args={[5.0, 16.0]} />
        </mesh>
      </group>

      {/* Elevated Warehouse Dirt Access Apron (In Front of Shutter Door) */}
      <mesh position={[-27.5, 0.82, -14.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT_EARTH_BROWN_DUST}>
        <planeGeometry args={[12.0, 10.0]} />
      </mesh>

      {/* Stormwater V-Ditch Concrete Channel */}
      <mesh position={[-32.5, 0.08, -2]} receiveShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.8, 0.2, 53]} />
      </mesh>

      {/* ═══ 2. MAIN SITE OFFICE ═══ */}
      <group position={[-4, 0, -12]}>
        {/* Main Office Building Body */}
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[12.5, 4.2, 22.0]} />
        </mesh>

        {/* Structural Steel Columns Along Long Wall */}
        {[-9, -4.5, 0, 4.5, 9].map((zOff, i) => (
          <mesh key={`off-col-${i}`} position={[6.35, 2.2, zOff]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.15, 4.2, 0.35]} />
          </mesh>
        ))}

        {/* Double-Pitched Corrugated Roof */}
        <mesh position={[-3.2, 4.8, 0]} rotation={[0, 0, 0.12]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[6.8, 0.2, 22.6]} />
        </mesh>
        <mesh position={[3.2, 4.8, 0]} rotation={[0, 0, -0.12]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[6.8, 0.2, 22.6]} />
        </mesh>
        <mesh position={[0, 5.38, 0]} castShadow material={MAT_ROOF_CAP}>
          <boxGeometry args={[0.6, 0.15, 22.8]} />
        </mesh>

        {/* Windows Array Along Longitudinal Facade */}
        {[-8, -4, 0, 4, 8].map((zOff, i) => (
          <group key={`off-win-${i}`} position={[6.32, 2.5, zOff]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.5, 1.5, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.02]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[1.3, 1.3, 0.04]} />
            </mesh>
          </group>
        ))}

        {/* ═══ PROMINENT MAIN FRONT ENTRANCE DOORWAY WITH DYNAMIC OFFICE HOURS ═══ */}
        <AnimatedOfficeEntranceDoor />

        {/* ═══ AUTOMATED BACK DOORWAY (FACING REAR GRASS LAWN & OPEN 7AM TO 5PM) ═══ */}
        <AnimatedOfficeBackDoor />

        {/* ═══ PLANNING CONTROL HEAD DESK LUNCH SETUP (EATS INSIDE STAFF OFFICE EVERY LUNCH BREAK) ═══ */}
        {isTemfacilFocused && <PlanningControlHeadOfficeLunch />}
      </group>

      {/* ═══ 3. UNIFIED SINGLE STAFF ACCOMMODATIONS (STAFF HOUSE - PROPORTIONAL TO KITCHEN) ═══ */}
      <group position={[12, 0, -12]}>
        {/* Single Unified Staff House Main Building Body (12.6m wide x 3.8m high x 15.0m deep) */}
        <mesh position={[0, 1.9, 0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[12.6, 3.8, 15.0]} />
        </mesh>
        {/* Unified Eaves Roof Cap */}
        <mesh position={[0, 3.85, 0]} castShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[13.2, 0.2, 15.5]} />
        </mesh>

        {/* ═══ STAFF & HEADS LUNCH LOUNGE (80% OF STAFF/HEADS EAT AT STAFF HOUSE) ═══ */}
        {isTemfacilFocused && <StaffHouseLoungeDining />}

        {/* Windows Array along Side Walls */}
        {[-4.5, 0, 4.5].map((zOff, i) => (
          <React.Fragment key={`sh-win-${i}`}>
            <mesh position={[-6.32, 2.2, zOff]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.5, 1.3, 0.06]} />
            </mesh>
            <mesh position={[6.32, 2.2, zOff]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.5, 1.3, 0.06]} />
            </mesh>
          </React.Fragment>
        ))}

        {/* ═══ FRONT ENTRANCE DOOR PORTAL FOR WOMEN'S STAFF QUARTERS (FACING MAIN WALKWAY) ═══ */}
        <group position={[0, 1.4, 7.52]}>
          {/* Foyer Interior Ambient Glow */}
          <pointLight position={[0, 1.0, -1.0]} color="#FEF08A" intensity={0.5} distance={6} />

          {/* Heavy Steel Surrounding Portal Frame (2.4m wide x 2.8m high) */}
          <mesh position={[-1.15, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.16, 2.8, 0.12]} />
          </mesh>
          <mesh position={[1.15, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.16, 2.8, 0.12]} />
          </mesh>
          <mesh position={[0, 1.35, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[2.46, 0.16, 0.12]} />
          </mesh>

          {/* Main Double Glass Entrance Doors (Non-Overlapping Z-Offset to prevent Z-fighting & flicker) */}
          <mesh position={[-0.52, 0, 0.02]} material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.02, 2.52, 0.04]} />
          </mesh>
          <mesh position={[-0.52, 0, 0.05]} material={MAT_GLASS_CLEAR}>
            <planeGeometry args={[0.94, 2.44]} />
          </mesh>

          <mesh position={[0.52, 0, 0.02]} material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.02, 2.52, 0.04]} />
          </mesh>
          <mesh position={[0.52, 0, 0.05]} material={MAT_GLASS_CLEAR}>
            <planeGeometry args={[0.94, 2.44]} />
          </mesh>

          {/* Stainless Steel / Yellow Handles */}
          <mesh position={[-0.08, 0, 0.07]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.04, 0.16, 0.05]} />
          </mesh>
          <mesh position={[0.08, 0, 0.07]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.04, 0.16, 0.05]} />
          </mesh>

          {/* Women's Quarters Overhead Designation Sign Badge */}
          <mesh position={[0, 1.62, 0.06]} material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[2.2, 0.32, 0.06]} />
          </mesh>

          {/* Concrete Step Threshold & Yellow Line */}
          <mesh position={[0, -1.32, 0.4]} receiveShadow material={MAT_CONCRETE_SLAB}>
            <boxGeometry args={[3.2, 0.16, 0.8]} />
          </mesh>
          <mesh position={[0, -1.23, 0.4]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
            <planeGeometry args={[3.2, 0.12]} />
          </mesh>
        </group>

        {/* Front Windows flanking Entrance Portal */}
        {[-4.2, 4.2].map((xOff, i) => (
          <group key={`front-win-${i}`} position={[xOff, 1.6, 7.52]}>
            <mesh material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.6, 1.3, 0.08]} />
            </mesh>
            <mesh position={[0, 0, 0.01]} material={MAT_GLASS_CLEAR}>
              <planeGeometry args={[1.45, 1.15]} />
            </mesh>
          </group>
        ))}

        {/* ═══ WIDE GRAND REAR DOORWAY CONNECTING STAFF HOUSE TO KITCHEN (4.2M WIDE - OPEN AT ALL TIMES) ═══ */}
        <group position={[0, 1.4, -7.52]}>
          {/* Foyer Interior Illumination Light */}
          <pointLight position={[0, 1.2, 1.2]} color="#FEF08A" intensity={6.0} distance={8} />

          {/* Heavy Steel Surrounding Portal Frame (4.4m wide x 2.8m high) */}
          <mesh position={[-2.15, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.2, 2.8, 0.12]} />
          </mesh>
          <mesh position={[2.15, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.2, 2.8, 0.12]} />
          </mesh>
          <mesh position={[0, 1.35, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[4.5, 0.2, 0.12]} />
          </mesh>

          {/* Wide Open Double Glass Door Panels (Slid Completely Open to Sides at All Times) */}
          <mesh position={[-2.9, 0, -0.02]} material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[1.6, 2.6, 0.06]} />
          </mesh>
          <mesh position={[-2.9, 0, -0.01]} material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.6, 2.6, 0.08]} />
          </mesh>

          <mesh position={[2.9, 0, -0.02]} material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[1.6, 2.6, 0.06]} />
          </mesh>
          <mesh position={[2.9, 0, -0.01]} material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.6, 2.6, 0.08]} />
          </mesh>

          {/* Concrete Step Threshold & Yellow Line (4.5m wide) */}
          <mesh position={[0, -1.32, -0.4]} receiveShadow material={MAT_CONCRETE_SLAB}>
            <boxGeometry args={[4.5, 0.16, 0.8]} />
          </mesh>
          <mesh position={[0, -1.23, -0.4]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
            <planeGeometry args={[4.5, 0.12]} />
          </mesh>
        </group>

        {/* ═══ REALISTIC OUTDOOR KITCHEN EXTENSION CONNECTED TO BACK OF STAFF HOUSE ═══ */}
        <TemfacilStaffHouseKitchenExtension isDetailVisible={isTemfacilFocused} />
      </group>

      {/* ═══ FOREMAN & STAFF HOUSE (PROPERLY ALIGNED INSIDE COMPOUND AT X = 18.0, Z = -40.5 CLOSER TO KITCHEN & CANAL) ═══ */}
      <TemfacilForemanStaffHouse position={[18.0, 0, -40.5]} />

      {/* ═══ 4. WORKERS BARRACKS COMPOUND (3 DISTINCT NON-IDENTICAL REALISTIC DORMITORIES + BREEZEWAY + WASHROOM BLOCK) ═══ */}
      <TemfacilWorkerBarracksCompound position={[37, 0, -12]} onSelectPerson={onSelectPerson} isDetailVisible={isTemfacilFocused} />

      {/* ═══ 5. MAIN WAREHOUSE & EXPANDED MATERIAL LAYDOWN YARD (SMOOTH UPHILL SLOPE Y = +0.8M) ═══ */}
      {/* Elevated on smooth ground slope from Staff Office */}
      <group position={[-28, 0.8, -14]}>
        {/* Main Industrial Warehouse Building Body (Elevated Non-Glare Matte Slate Walls) */}
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[13.5, 6.4, 16.5]} />
        </mesh>
        {/* Blue Industrial Corrugated Roof */}
        <mesh position={[-3.4, 6.5, 0]} rotation={[0, 0, 0.1]} castShadow material={MAT_ROOF_BLUE}>
          <boxGeometry args={[7.2, 0.25, 17.0]} />
        </mesh>
        <mesh position={[3.4, 6.5, 0]} rotation={[0, 0, -0.1]} castShadow material={MAT_ROOF_BLUE}>
          <boxGeometry args={[7.2, 0.25, 17.0]} />
        </mesh>
        <mesh position={[0, 7.12, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.5, 0.12, 17.2]} />
        </mesh>
        {/* Main High-Clearance Steel Loading Roller Shutter Door (Facing Front Apron) */}
        <mesh position={[0, 2.8, 8.28]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[6.5, 5.2, 0.08]} />
        </mesh>

        {/* ═══ EXPANDED MATERIAL LAYDOWN & STORAGE YARD ═══ */}
        {/* Blue Tarp Material Stacks */}
        {[-4.5, 0, 4.5].map((xOff, i) => (
          <mesh key={`tarp-${i}`} position={[-9.5, 1.2, -5 + i * 4.5]} castShadow material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[3.8, 2.4, 3.8]} />
          </mesh>
        ))}
        {/* Timber Log Stacks */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`timber-${i}`} position={[-9.5, 0.4, 5.5 + i * 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT_PAVER_WALKWAY}>
            <cylinderGeometry args={[0.35, 0.35, 3.8, 12]} />
          </mesh>
        ))}
        {/* Structural Steel Pipe & Rebar Bundles */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`pipe-${i}`} position={[-5.5, 0.4, 8.5 + i * 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.25, 0.25, 4.2, 12]} />
          </mesh>
        ))}
        {/* Outdoor Staging Pallet Crates */}
        {[-8.5, -4.2].map((xOff, i) => (
          <mesh key={`crate-${i}`} position={[xOff, 0.6, -10.5]} castShadow material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[1.8, 1.2, 1.8]} />
          </mesh>
        ))}
      </group>

      {/* ═══ 6. TOOL & EQUIPMENT STAGING SHED ═══ */}
      <group position={[-10, 0, 14]}>
        {/* Concrete Foundation Slab */}
        <mesh position={[0, 0.08, -4]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[8.6, 0.16, 4.0]} />
        </mesh>
        {/* Steel Structural Support Columns */}
        {[-4.0, 0, 4.0].map((cx, i) => (
          <React.Fragment key={`tb-col-${i}`}>
            <mesh position={[cx, 1.5, -5.8]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.16, 3.0, 0.16]} />
            </mesh>
            <mesh position={[cx, 1.5, -2.2]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.16, 3.0, 0.16]} />
            </mesh>
          </React.Fragment>
        ))}
        {/* Sloped Steel Corrugated Canopy Roof */}
        <mesh position={[0, 3.1, -4]} rotation={[0.08, 0, 0]} castShadow material={MAT_ROOF_BLUE}>
          <boxGeometry args={[9.2, 0.12, 4.4]} />
        </mesh>
        {/* Heavy Duty Equipment Racks & Yellow Heavy Toolboxes */}
        {[-2.8, 0, 2.8].map((rx, i) => (
          <group key={`tb-rack-${i}`} position={[rx, 0.6, -4.2]}>
            {/* Metal Storage Rack */}
            <mesh castShadow material={MAT_STEEL_FRAME}>
              <boxGeometry args={[2.2, 1.1, 1.2]} />
            </mesh>
            {/* Staged Yellow Tool Chests */}
            <mesh position={[0, 0.7, 0]} castShadow material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[1.6, 0.35, 0.7]} />
            </mesh>
          </group>
        ))}
        {/* Side Blue Tarp Material Bundles */}
        {[-4.5, 4.5].map((xOff, i) => (
          <mesh key={`tb-tarp-${i}`} position={[xOff, 0.8, 1.5]} castShadow material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[3.2, 1.6, 3.2]} />
          </mesh>
        ))}
      </group>

      {/* ═══ 7A. MULTIPURPOSE BASKETBALL COURT & TUESDAY 6:30 AM - 7:40 AM SAFETY TOOLBOX MEETING AREA (X=10, Z=14) ═══ */}
      <TemfacilBasketballCourtAndToolboxMeeting position={[10, 0, 14]} />

      {/* ═══ 7B. QA/QC ENGINEERING DESIGN OFFICE (PLACED FAR MORE BACK AT BACK END SIDE OF TEMFACIL AT X=22.5, Z=20.5) ═══ */}
      <group position={[22.5, 0, 20.5]}>
        {/* Main Modular Design Office Body */}
        <mesh position={[0, 1.75, 0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[5.2, 3.5, 8.8]} />
        </mesh>
        {/* Modern Engineering Dark Steel Parapet */}
        <mesh position={[0, 3.55, 0]} castShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[5.6, 0.15, 9.2]} />
        </mesh>
        {/* Architectural Blueprint & Drafting Windows */}
        {[-2.2, 2.2].map((zOff, i) => (
          <group key={`qa-win-${i}`} position={[2.62, 1.9, zOff]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.8, 1.4, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.02]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[1.6, 1.2, 0.04]} />
            </mesh>
          </group>
        ))}
        {/* Technical Entrance Door — Facing North Facade towards Internal Access Road */}
        <group position={[0, 1.2, -4.42]}>
          <mesh material={MAT_STEEL_DARK}>
            <boxGeometry args={[1.3, 2.4, 0.08]} />
          </mesh>
          <mesh position={[0.4, 0, -0.05]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.08, 0.25, 0.06]} />
          </mesh>
        </group>
        {/* Interior Technical Blueprint Drafting Desk & Overhead Light */}
        <pointLight position={[0, 2.4, 0]} color="#E0F2FE" intensity={4.0} distance={8} />
        <mesh position={[0, 0.9, 0]} material={MAT_WHITE_PAINT}>
          <boxGeometry args={[2.2, 0.9, 1.4]} />
        </mesh>
      </group>

      {/* ═══ 7C. AUTHENTIC CANTEEN & DINING HALL (X=32, Z=14) ═══ */}
      <TemfacilCanteenBuilding position={[32, 0, 14]} isDetailVisible={isTemfacilFocused} />

      {/* ═══ 8. SOLAR LED LIGHT TOWERS & SAFETY INFRASTRUCTURE ═══ */}
      {/* Light Tower 1 */}
      <group position={[-16, 0, -4]}>
        <mesh position={[0, 3.5, 0]} material={MAT_STEEL_FRAME}>
          <cylinderGeometry args={[0.08, 0.12, 7.0, 8]} />
        </mesh>
        <mesh position={[0, 7.1, 0]} material={MAT_SIGNBOARD_TEAL}>
          <boxGeometry args={[0.8, 0.08, 1.2]} />
        </mesh>
        <mesh position={[0.4, 6.8, 0]} rotation={[0, 0, -0.3]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.4, 0.25, 0.4]} />
        </mesh>
      </group>

      {/* Light Tower 2 */}
      <group position={[-34, 0, -22]}>
        <mesh position={[0, 3.5, 0]} material={MAT_STEEL_FRAME}>
          <cylinderGeometry args={[0.08, 0.12, 7.0, 8]} />
        </mesh>
        <mesh position={[0, 7.1, 0]} material={MAT_SIGNBOARD_TEAL}>
          <boxGeometry args={[0.8, 0.08, 1.2]} />
        </mesh>
        <mesh position={[0.4, 6.8, 0]} rotation={[0, 0, -0.3]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.4, 0.25, 0.4]} />
        </mesh>
      </group>

      {/* Industrial Waste Dumpster Bin */}
      <mesh position={[-30, 0.9, -4]} castShadow material={MAT_SIGNBOARD_TEAL}>
        <boxGeometry args={[3.2, 1.8, 2.2]} />
      </mesh>

      {/* Safety Traffic Cones */}
      {[-16, -14, -12].map((xOff, i) => (
        <mesh key={`cone-${i}`} position={[xOff, 0.35, 10]} castShadow material={MAT_YELLOW_SAFETY}>
          <coneGeometry args={[0.25, 0.7, 10]} />
        </mesh>
      ))}
    </group>
  );
}

// ─── AUTHENTIC STA. CLARA CORPORATE LOGO HELPER (PHOTO 2 & 3 REFERENCE) ───
function drawStaClaraCorporateLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1.0,
  textColor = "#15803D",
  subTextColor = "#0F172A"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Four dynamic curved green swoosh ribbons (Sta. Clara corporate emblem)
  ctx.fillStyle = "#15803D";

  // 4 parallel diagonal ribbons slanting from bottom-left to top-right
  const bands = [
    { xOff: -34, len: 52, cur: 10, yShift: 6 },
    { xOff: -11, len: 74, cur: 14, yShift: 0 },
    { xOff: 11, len: 74, cur: 14, yShift: 0 },
    { xOff: 34, len: 52, cur: 10, yShift: -6 },
  ];

  bands.forEach((b) => {
    ctx.save();
    ctx.translate(b.xOff, b.yShift);
    ctx.rotate(-0.32); // 18 degrees diagonal tilt
    const w = 13;
    const r = w / 2;
    const h = b.len;

    ctx.beginPath();
    // Rounded bottom cap
    ctx.arc(0, h / 2 - r, r, 0, Math.PI);
    // Left side curving slightly
    ctx.quadraticCurveTo(-b.cur, 0, 0, -h / 2 + r);
    // Rounded top cap
    ctx.arc(0, -h / 2 + r, r, Math.PI, 0);
    // Right side curving slightly
    ctx.quadraticCurveTo(w - b.cur, 0, 0, h / 2 - r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 2. "STA. CLARA" Brand Text
  ctx.fillStyle = textColor;
  ctx.font = "900 46px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("STA. CLARA", 62, -2);

  // 3. "INTERNATIONAL CORPORATION" Subtitle
  ctx.fillStyle = subTextColor;
  ctx.font = "800 19px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("INTERNATIONAL CORPORATION", 64, 28);

  ctx.restore();
}

// 1. "Tumauini HEPP OFFICE" Official Doorway Header Signboard (Photo 2)
function useTumauiniHeppOfficeSignboardTexture() {
  return React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Authentic matte cream acrylic panel (zero blowout)
    ctx.fillStyle = "#DDD9D0";
    ctx.fillRect(0, 0, 2048, 512);

    // Weathered edge frame border
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(5, 5, 2038, 502);

    // ── TOP SECTION: AUTHENTIC STA. CLARA LOGO & BRAND TEXT (PHOTO 2) ──
    drawStaClaraCorporateLogo(ctx, 680, 85, 1.05, "#15803D", "#0F172A");

    // Divider Line
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 175);
    ctx.lineTo(1988, 175);
    ctx.stroke();

    // ── BOTTOM SECTION: "Tumauini HEPP OFFICE" (Photo 2) ──
    ctx.fillStyle = "#022C22";
    ctx.font = "900 115px 'Segoe UI', Impact, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillText("Tumauini HEPP OFFICE", 1024, 370);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

// 2. "PROJECT ESH STATISTIC BOARD" Left Facade Signage (Photo 4 Reference)
function useProjectEshStatisticBoardTexture() {
  return React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1550;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const W = 2400;
    const H = 1550;

    // ── 1. PHENOLIC PLYWOOD BASE FRAME (Dark reddish-brown film face) ──
    ctx.fillStyle = "#261E1A";
    ctx.fillRect(0, 0, W, H);

    // Phenolic wood film circular stamp watermarks ("SOLIDFORM PREMIUM")
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.font = "800 28px sans-serif";
    const drawStamp = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.25);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText("SOLIDFORM", 0, -8);
      ctx.fillText("PREMIUM", 0, 24);
      ctx.restore();
    };
    drawStamp(160, 160);
    drawStamp(1200, 70);
    drawStamp(2200, 120);
    drawStamp(150, 1400);
    drawStamp(2250, 1420);
    drawStamp(1200, 1480);
    ctx.restore();

    // ── 2. DIAGONAL YELLOW/BLACK HAZARD CAUTION BORDER TAPE ──
    const borderThickness = 32;
    const innerX = 70;
    const innerY = 70;
    const innerW = W - innerX * 2;
    const innerH = H - innerY * 2;

    // Draw hazard stripe pattern around the perimeter
    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX - borderThickness, innerY - borderThickness, innerW + borderThickness * 2, innerH + borderThickness * 2);
    ctx.clip();

    // Yellow background
    ctx.fillStyle = "#EAB308";
    ctx.fillRect(innerX - borderThickness, innerY - borderThickness, innerW + borderThickness * 2, innerH + borderThickness * 2);

    // Black diagonal stripes
    ctx.fillStyle = "#18181B";
    const stripeWidth = 28;
    for (let x = -H; x < W + H; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + H, H);
      ctx.lineTo(x + H, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── 3. MAIN TARPAULIN / WHITEBOARD SURFACE (Weathered Matte Tarpaulin) ──
    ctx.fillStyle = "#CDC9BF";
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Subtle edge border for the sheet
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#94A3B8";
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // ── 4. TOP HEADER BAR ──
    // A. STA. CLARA CORPORATE LOGO & TEXT (TOP-LEFT)
    drawStaClaraCorporateLogo(ctx, innerX + 110, innerY + 98, 1.05, "#15803D", "#0F172A");

    // B. CENTER TITLE: "PROJECT ESH STATISTIC BOARD"
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 68px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PROJECT ESH STATISTIC BOARD", innerX + innerW / 2 + 30, innerY + 105);

    // C. SAFETY FIRST EMBLEM (TOP-RIGHT)
    const sfX = innerX + innerW - 130;
    const sfY = innerY + 100;

    ctx.save();
    ctx.strokeStyle = "#15803D";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(sfX, sfY, 62, 0, Math.PI * 2);
    ctx.stroke();

    // Green cross
    ctx.fillStyle = "#15803D";
    ctx.fillRect(sfX - 12, sfY - 40, 24, 80);
    ctx.fillRect(sfX - 40, sfY - 12, 80, 24);

    // Text around circle
    ctx.font = "900 15px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAFETY FIRST", sfX, sfY - 68);
    ctx.fillText("LIGTAS ANG MAINGAT", sfX, sfY + 84);
    ctx.restore();

    // ── 5. METADATA ROWS (PROJECT NAME, DATE OF UPDATE, LOCATION) ──
    const row1Y = innerY + 220;

    // Row 1: PROJECT NAME & DATE OF UPDATE
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("PROJECT NAME:", innerX + 60, row1Y);

    // Underlined / Handwritten Box: "TUMAUINI HYDRO ELECTRIC POWER PLANT"
    const projBoxX = innerX + 310;
    ctx.font = "800 30px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("TUMAUINI HYDRO ELECTRIC POWER PLANT", projBoxX + 10, row1Y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0F172A";
    ctx.beginPath();
    ctx.moveTo(projBoxX, row1Y + 8);
    ctx.lineTo(projBoxX + 680, row1Y + 8);
    ctx.stroke();

    // DATE OF UPDATE: [ June 20 , 2026 ]
    const dateLabelX = innerX + 1080;
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("DATE OF UPDATE:", dateLabelX, row1Y);

    // Taped Placard for Date
    const datePlacardX = dateLabelX + 270;
    ctx.save();
    ctx.fillStyle = "#E4DFD6";
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 2;
    ctx.fillRect(datePlacardX, row1Y - 32, 380, 46);
    ctx.strokeRect(datePlacardX, row1Y - 32, 380, 46);
    // Taped edges
    ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
    ctx.fillRect(datePlacardX - 10, row1Y - 24, 18, 30);
    ctx.fillRect(datePlacardX + 372, row1Y - 24, 18, 30);

    ctx.fillStyle = "#0F172A";
    ctx.font = "800 30px 'Segoe UI', cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("June 20 , 2026", datePlacardX + 190, row1Y);
    ctx.restore();

    // Row 2: PROJECT LOCATION: ANTAGAN 1st TUMAUINI, ISABELA
    const row2Y = row1Y + 70;
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("PROJECT LOCATION:", innerX + 60, row2Y);

    const locBoxX = innerX + 370;
    ctx.font = "800 30px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("ANTAGAN 1st TUMAUINI, ISABELA", locBoxX + 10, row2Y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0F172A";
    ctx.beginPath();
    ctx.moveTo(locBoxX, row2Y + 8);
    ctx.lineTo(locBoxX + 540, row2Y + 8);
    ctx.stroke();

    // ── 6. TWO-COLUMN METRICS SECTION (SPANS FULL VERTICAL SPACE) ──
    const colTopY = row2Y + 110;
    const col1X = innerX + 70;
    const col2X = innerX + 1080;

    // Helper to draw realistic taped white paper cards with handwritten marker values
    const drawTapedMetricBadge = (x: number, y: number, text: string, w = 180, h = 48) => {
      ctx.save();
      // Drop shadow for the paper card
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = "#E4DFD6";
      ctx.fillRect(x, y - h * 0.72, w, h);
      ctx.restore();

      // Border outline of the taped placard
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y - h * 0.72, w, h);

      // Translucent scotch tape on left & right ends
      ctx.fillStyle = "rgba(241, 245, 249, 0.85)";
      ctx.fillRect(x - 8, y - h * 0.5, 16, h * 0.6);
      ctx.fillRect(x + w - 8, y - h * 0.5, 16, h * 0.6);

      // Handwritten marker text (Black/Dark Slate Marker)
      ctx.fillStyle = "#0F172A";
      ctx.font = "800 34px 'Segoe UI', cursive, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, x + w / 2, y);
    };

    // ── LEFT COLUMN: 8 SAFETY METRICS ──
    const leftRows = [
      { label: "MANPOWER:", val: "534", w: 170 },
      { label: "MANHOUR (MONTHLY):", val: "104,566", w: 220 },
      { label: "MANHOUR (YTD):", val: "205,796", w: 210 },
      { label: "SAFE MANHOUR:", val: "1,136,064", w: 230 },
      { label: "DATE OF LAST LTA:", val: "April 29, 2026", w: 250 },
      { label: "LTIR:", val: "16", w: 120 },
      { label: "TRIR:", val: "16", w: 120 },
      { label: "SEVERITY RATE:", val: "1477", w: 140 },
    ];

    const leftSpacing = 112; // Evenly distributed down to the bottom
    leftRows.forEach((row, i) => {
      const y = colTopY + i * leftSpacing;
      ctx.fillStyle = "#0F172A";
      ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(row.label, col1X, y);
      drawTapedMetricBadge(col1X + 440, y, row.val, row.w, 52);
    });

    // ── RIGHT COLUMN: INCIDENT CLASSIFICATION ──
    // Header
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 40px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("INCIDENT CLASSIFICATION", col2X, colTopY - 45);

    const rightRows = [
      { label: "FIRST AID CASE (FAC):", val: "19", w: 130 },
      { label: "MEDICAL TREATMENT CASE (MTC):", val: "5", w: 130 },
      { label: "LOST TIME ACCIDENT (LTA):", val: "4", w: 130 },
      { label: "FATALITY (FAT):", val: "0", w: 130 },
      { label: "PROPERTY DAMAGED ACCIDENT (PDA):", val: "22", w: 130 },
      { label: "NEAR-MISS:", val: "3", w: 130 },
      { label: "ENVIRONMENTAL INCIDENT (EI)", val: "", w: 0 },
    ];

    const rightSpacing = 100;
    rightRows.forEach((row, i) => {
      const y = colTopY + 25 + i * rightSpacing;
      ctx.fillStyle = "#0F172A";
      ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(row.label, col2X, y);
      if (row.val) {
        drawTapedMetricBadge(col2X + 680, y, row.val, row.w, 50);
      }
    });

    // Environmental Incident sub-items A and B
    const eiBaseY = colTopY + 25 + 6 * rightSpacing;
    const subA_Y = eiBaseY + 70;
    const subB_Y = eiBaseY + 140;

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("A. INTERNAL:", col2X + 80, subA_Y);
    drawTapedMetricBadge(col2X + 460, subA_Y, "10", 130, 48);

    ctx.fillText("B. EXTERNAL:", col2X + 80, subB_Y);
    drawTapedMetricBadge(col2X + 460, subB_Y, "0", 130, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

// 3. "HEALTH & SAFETY NOTICE & POSTERS BOARD" Right Facade Signage (Photo 3 Reference)
function useStaffOfficeSafetyBulletinBoardTexture() {
  return React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1650;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const W = 2400;
    const H = 1650;

    // ── BASE WALL / BOARD BACKGROUND (Weathered off-white matte wall with subtle seams) ──
    ctx.fillStyle = "#C4C0B6";
    ctx.fillRect(0, 0, W, H);

    // Wall vertical panel seams
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(820, 0);
    ctx.lineTo(820, H);
    ctx.moveTo(1580, 0);
    ctx.lineTo(1580, H);
    ctx.stroke();

    // Helper: Draw realistic laminated / taped paper flyer with scotch tape tabs
    const drawFlyerCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      bgColor = "#E4DFD6",
      hasTape = true
    ) => {
      ctx.save();
      // Drop shadow for natural paper lift
      ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, w, h);
      ctx.restore();

      // Border outline
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      if (hasTape) {
        // Translucent scotch tape pieces on top, bottom, and corners
        ctx.fillStyle = "rgba(254, 240, 138, 0.55)";
        ctx.fillRect(x + w * 0.2 - 20, y - 8, 40, 16);
        ctx.fillRect(x + w * 0.8 - 20, y - 8, 40, 16);
        ctx.fillRect(x + w * 0.2 - 20, y + h - 8, 40, 16);
        ctx.fillRect(x + w * 0.8 - 20, y + h - 8, 40, 16);
      }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ── TOP ROW POSTERS (Y = 40 to Y = 700) ──
    // ═══════════════════════════════════════════════════════════════════════

    // ── 1. NOTICE: NO SMOKING / BAWAL MANIGARILYO (Top-Left) ──
    const p1X = 35;
    const p1Y = 45;
    const p1W = 480;
    const p1H = 340;
    drawFlyerCard(p1X, p1Y, p1W, p1H);

    // Solid Blue Header Banner
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(p1X, p1Y, p1W, 80);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 52px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NOTICE", p1X + p1W / 2, p1Y + 58);

    // Split box: Left No Smoking Icon, Right Text
    const p1MidX = p1X + 175;
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1MidX, p1Y + 80);
    ctx.lineTo(p1MidX, p1Y + p1H);
    ctx.stroke();

    // No Smoking Prohibition Symbol
    ctx.save();
    const icX = p1X + 88;
    const icY = p1Y + 185;
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(icX, icY, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(icX - 32, icY + 32);
    ctx.lineTo(icX + 32, icY - 32);
    ctx.stroke();

    // Cigarette with red tip & smoke
    ctx.fillStyle = "#78716C";
    ctx.fillRect(icX - 26, icY - 5, 44, 10);
    ctx.fillStyle = "#DC2626";
    ctx.fillRect(icX + 18, icY - 5, 8, 10);
    ctx.restore();

    // Sta. Clara corporate logo footer under icon
    drawStaClaraCorporateLogo(ctx, p1X + 45, p1Y + 312, 0.28, "#15803D", "#0F172A");

    // Right Text: NO SMOKING / BAWAL MANIGARILYO
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 30px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NO SMOKING", p1MidX + (p1W - 175) / 2, p1Y + 145);

    ctx.beginPath();
    ctx.moveTo(p1MidX + 15, p1Y + 175);
    ctx.lineTo(p1X + p1W - 15, p1Y + 175);
    ctx.stroke();

    ctx.font = "900 25px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("BAWAL", p1MidX + (p1W - 175) / 2, p1Y + 225);
    ctx.fillText("MANIGARILYO", p1MidX + (p1W - 175) / 2, p1Y + 265);

    // ── 2. NO SPITTING / BAWAL DUMURA (Top Center-Left) ──
    const p2X = 555;
    const p2Y = 45;
    const p2W = 460;
    const p2H = 340;
    drawFlyerCard(p2X, p2Y, p2W, p2H);

    // Top: "NO SPITTING" in large stencil green outline
    ctx.fillStyle = "#16A34A";
    ctx.font = "900 46px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NO SPITTING", p2X + p2W / 2, p2Y + 115);

    // Green Solid Banner: "BAWAL DUMURA"
    ctx.fillStyle = "#15803D";
    ctx.fillRect(p2X + 25, p2Y + 160, p2W - 50, 140);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 48px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("BAWAL", p2X + p2W / 2, p2Y + 222);
    ctx.fillText("DUMURA", p2X + p2W / 2, p2Y + 278);

    // ── 3. HYDRATION CHART (Top Center-Right) ──
    const p3X = 1050;
    const p3Y = 40;
    const p3W = 490;
    const p3H = 680;
    drawFlyerCard(p3X, p3Y, p3W, p3H);

    // Header: Blue / Green border
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 24px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Sapat ba ang iniinom", p3X + 20, p3Y + 38);
    ctx.fillText("kong tubig?", p3X + 20, p3Y + 65);
    ctx.font = "600 13px sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("Gamitin ito upang suriin ang ihi.", p3X + 20, p3Y + 88);

    // Health Alert Box (Top Right)
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(p3X + p3W - 175, p3Y + 16, 160, 68);
    ctx.fillStyle = "#FEF08A";
    ctx.font = "900 22px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HEALTH", p3X + p3W - 95, p3Y + 44);
    ctx.fillText("ALERT!", p3X + p3W - 95, p3Y + 70);

    // 8 Urine Color Bars & Guidance
    const urineColors = [
      "#FEFCE8", "#FEF9C3", "#FEF08A", "#FDE047",
      "#EAB308", "#CA8A04", "#A16207", "#78350F"
    ];
    const guidanceLabels = [
      { range: "1 to 2", title: "SAPAT ANG INIINOM NA TUBIG", desc: "Magpatuloy sa regular na pag-inom." },
      { range: "3 to 4", title: "BAHAGYANG KULANG SA TUBIG", desc: "Uminom agad ng 1-2 basong tubig." },
      { range: "5 to 6", title: "KULANG SA PAG-INOM NG TUBIG", desc: "Nangangailangan ng karagdagang tubig." },
      { range: "7 to 8", title: "SOBRANG KULANG SA TUBIG", desc: "Delikado! Uminom ng tubig at magpahinga." },
    ];

    urineColors.forEach((col, i) => {
      const cy = p3Y + 115 + i * 54;
      // Color bar
      ctx.fillStyle = col;
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.fillRect(p3X + 25, cy, 75, 42);
      ctx.strokeRect(p3X + 25, cy, 75, 42);
      // Number
      ctx.fillStyle = "#0F172A";
      ctx.font = "800 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${i + 1}`, p3X + 8, cy + 28);
    });

    // Right-side guidance blocks
    guidanceLabels.forEach((g, idx) => {
      const gy = p3Y + 125 + idx * 108;
      ctx.fillStyle = idx === 0 ? "#15803D" : idx === 1 ? "#CA8A04" : idx === 2 ? "#EA580C" : "#DC2626";
      ctx.font = "800 14px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${g.range}: ${g.title}`, p3X + 115, gy);
      ctx.fillStyle = "#334155";
      ctx.font = "600 12px sans-serif";
      ctx.fillText(g.desc, p3X + 115, gy + 22);
    });

    // Footer
    drawStaClaraCorporateLogo(ctx, p3X + 60, p3Y + p3H - 25, 0.38, "#15803D", "#0F172A");

    // ── 4. BRISTOL STOOL CHART (Top-Right, Dark Navy Poster) ──
    const p4X = 1575;
    const p4Y = 40;
    const p4W = 790;
    const p4H = 680;
    drawFlyerCard(p4X, p4Y, p4W, p4H, "#0B1528");

    // Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 24px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Alamin ang Ipinapahiwatig ng Iyong Pagdumi", p4X + 30, p4Y + 45);
    ctx.font = "600 17px sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText("(Bristol Stool Chart)", p4X + 30, p4Y + 72);

    // Health Alert Tag (Right)
    ctx.fillStyle = "#EF4444";
    ctx.font = "900 22px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("HEALTH ALERT!", p4X + p4W - 30, p4Y + 55);

    // Digestive Tract Curve Graphic
    ctx.save();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 36;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p4X + 90, p4Y + 140);
    ctx.lineTo(p4X + 90, p4Y + 460);
    ctx.arcTo(p4X + 90, p4Y + 560, p4X + 210, p4Y + 560, 60);
    ctx.arcTo(p4X + 290, p4Y + 560, p4X + 290, p4Y + 320, 60);
    ctx.arcTo(p4X + 290, p4Y + 160, p4X + 410, p4Y + 160, 60);
    ctx.lineTo(p4X + 410, p4Y + 520);
    ctx.stroke();
    ctx.restore();

    // 7 Types text blocks on right
    const stoolTypes = [
      { type: "TYPE 1", desc: "Hiwa-hiwalay na matitigas na bukol (Constipation)" },
      { type: "TYPE 2", desc: "Hugis sausage pero bukol-bukol" },
      { type: "TYPE 3", desc: "Hugis sausage na may mga bitak sa ibabaw" },
      { type: "TYPE 4", desc: "Makinis at malambot na parang ahas (IDEAL / NORMAL)" },
      { type: "TYPE 5", desc: "Malalambot na piraso na may malinaw na gilid" },
      { type: "TYPE 6", desc: "Malalambot at sabog-sabog na piraso" },
      { type: "TYPE 7", desc: "Tubig lamang, walang solidong piraso (Diarrhea)" },
    ];

    stoolTypes.forEach((st, idx) => {
      const sy = p4Y + 130 + idx * 68;
      ctx.fillStyle = idx === 3 ? "#22C55E" : "#E2E8F0";
      ctx.font = "900 18px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(st.type, p4X + 450, sy);

      ctx.fillStyle = idx === 3 ? "#86EFAC" : "#94A3B8";
      ctx.font = "600 14px sans-serif";
      ctx.fillText(st.desc, p4X + 450, sy + 24);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ── BOTTOM ROW POSTERS (Y = 410 to Y = 1600) ──
    // ═══════════════════════════════════════════════════════════════════════

    // ── 5. SITE EVACUATION MAP & ERT TABLE (Bottom-Left) ──
    const p5X = 35;
    const p5Y = 415;
    const p5W = 630;
    const p5H = 1180;
    drawFlyerCard(p5X, p5Y, p5W, p5H);

    // Map Header Banner
    ctx.fillStyle = "#E06D53";
    ctx.fillRect(p5X + 15, p5Y + 15, p5W - 30, 38);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TUMAUINI HYDRO ELECTRIC POWER PLANT - SITE EVACUATION MAP", p5X + p5W / 2, p5Y + 40);

    // Aerial Site Map Drawing (Green Sierra Madre forest, blue river, buildings & route arrows)
    const mapY = p5Y + 62;
    ctx.fillStyle = "#334155";
    ctx.fillRect(p5X + 15, mapY, p5W - 30, 440);

    // River
    ctx.fillStyle = "#0284C7";
    ctx.beginPath();
    ctx.moveTo(p5X + 15, mapY + 230);
    ctx.bezierCurveTo(p5X + 220, mapY + 190, p5X + 380, mapY + 350, p5X + p5W - 15, mapY + 290);
    ctx.lineWidth = 45;
    ctx.stroke();

    // Forest green pads
    ctx.fillStyle = "#15803D";
    ctx.fillRect(p5X + 35, mapY + 25, 230, 170);
    ctx.fillRect(p5X + 330, mapY + 55, 250, 190);

    // Compound buildings (Yellow & White)
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(p5X + 90, mapY + 85, 115, 65);
    ctx.fillRect(p5X + 370, mapY + 115, 135, 75);

    // Evacuation Assembly Area Circle (Green Circle with white cross)
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.arc(p5X + 270, mapY + 150, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 13px sans-serif";
    ctx.fillText("ASSEMBLY", p5X + 270, mapY + 195);

    // Emergency Response Team Org Tree (Lower Half of Poster 5)
    const ertY = mapY + 460;
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 22px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("EMERGENCY RESPONSE TEAM", p5X + p5W / 2, ertY + 25);

    // Organizational hierarchy boxes
    const roles = [
      "INCIDENT COMMANDER: PM ENG'R",
      "SAFETY OFFICER: HSE HEAD",
      "FIRST AID TEAM: SITE NURSE",
      "FIRE BRIGADE: SCIC FIRE TEAM",
      "SECURITY & EVACUATION: CHIEF GUARD",
      "HOTLINE: TUMAUINI POLICE / RESCUE 511",
    ];
    roles.forEach((r, idx) => {
      const ry = ertY + 58 + idx * 58;
      ctx.fillStyle = "#F8FAFC";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.fillRect(p5X + 25, ry, p5W - 50, 46);
      ctx.strokeRect(p5X + 25, ry, p5W - 50, 46);

      ctx.fillStyle = "#0F172A";
      ctx.font = "700 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(r, p5X + 45, ry + 30);
    });

    // ── 6. DONATE BLOOD SAVE LIFE (Bottom Center-Left) ──
    const p6X = 700;
    const p6Y = 415;
    const p6W = 430;
    const p6H = 760;
    drawFlyerCard(p6X, p6Y, p6W, p6H);

    // Logos Top (Sta. Clara on left, Philippine Red Cross on right)
    drawStaClaraCorporateLogo(ctx, p6X + 25, p6Y + 30, 0.32, "#15803D", "#0F172A");

    ctx.save();
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p6X + p6W - 35, p6Y + 28, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#DC2626";
    ctx.fillRect(p6X + p6W - 39, p6Y + 18, 8, 20);
    ctx.fillRect(p6X + p6W - 45, p6Y + 24, 20, 8);
    ctx.restore();

    // Red Blood Drop Icon
    ctx.save();
    const bdX = p6X + p6W / 2;
    const bdY = p6Y + 145;
    ctx.fillStyle = "#DC2626";
    ctx.beginPath();
    ctx.arc(bdX, bdY + 30, 44, 0, Math.PI);
    ctx.lineTo(bdX, bdY - 35);
    ctx.closePath();
    ctx.fill();

    // Cross inside blood bag
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(bdX - 5, bdY + 15, 10, 30);
    ctx.fillRect(bdX - 15, bdY + 25, 30, 10);
    ctx.restore();

    // Title: DONATE BLOOD / SAVE LIFE
    ctx.fillStyle = "#991B1B";
    ctx.font = "900 42px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DONATE", p6X + p6W / 2, p6Y + 270);
    ctx.fillText("BLOOD", p6X + p6W / 2, p6Y + 315);

    ctx.fillStyle = "#DC2626";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("SAVE LIFE", p6X + p6W / 2, p6Y + 370);

    // Date & Time (June 05, 2026)
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 34px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("June 05, 2026", p6X + p6W / 2, p6Y + 460);
    ctx.font = "700 25px sans-serif";
    ctx.fillText("7:00 am - 4:00 pm", p6X + p6W / 2, p6Y + 502);

    ctx.fillStyle = "#64748B";
    ctx.font = "700 17px sans-serif";
    ctx.fillText("Tumauini Hydro Electric Powerplant", p6X + p6W / 2, p6Y + 550);
    ctx.fillText("(TEMFACIL)", p6X + p6W / 2, p6Y + 575);

    // Red Banner Register
    ctx.fillStyle = "#991B1B";
    ctx.fillRect(p6X + 25, p6Y + 630, p6W - 50, 70);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 19px sans-serif";
    ctx.fillText("REGISTER INSIDE", p6X + p6W / 2, p6Y + 660);
    ctx.fillText("(CLINIC/ADMIN OFFICE)", p6X + p6W / 2, p6Y + 685);

    // ── 7. HYPERTENSION AWARENESS (Bottom Center-Right) ──
    const p7X = 1165;
    const p7Y = 755;
    const p7W = 425;
    const p7H = 840;
    drawFlyerCard(p7X, p7Y, p7W, p7H);

    // Header
    ctx.fillStyle = "#15803D";
    ctx.font = "900 24px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HYPERTENSION AWARENESS", p7X + p7W / 2, p7Y + 42);

    // Warning Tag Box
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(p7X + 25, p7Y + 68, p7W - 50, 78);
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("WARNING: SILENT KILLER", p7X + p7W / 2, p7Y + 115);

    // Text advisory
    ctx.fillStyle = "#0F172A";
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "left";
    [
      "1. Regular Blood Pressure Check",
      "2. Bawasan ang maaalat na pagkain",
      "3. Mag-ehersisyo araw-araw",
      "4. Uminom ng tamang gamot",
      "5. Iwasan ang labis na stress",
      "6. Tigilan ang paninigarilyo",
      "7. Kumonsulta sa site nurse",
    ].forEach((t, idx) => {
      ctx.fillText(t, p7X + 35, p7Y + 195 + idx * 54);
    });

    // ── 8. HEAT STRESS & HIV-AIDS AWARENESS (Bottom Right) ──
    const p8X = 1625;
    const p8Y = 755;
    const p8W = 740;
    const p8H = 840;
    drawFlyerCard(p8X, p8Y, p8W, p8H);

    // Split Left: Heat Stress (don't HEAT ME!), Split Right: HIV-AIDS Awareness
    const p8MidX = p8X + 365;
    ctx.strokeStyle = "#CBD5E1";
    ctx.beginPath();
    ctx.moveTo(p8MidX, p8Y + 10);
    ctx.lineTo(p8MidX, p8Y + p8H - 10);
    ctx.stroke();

    // Heat Stress Left Side
    ctx.fillStyle = "#D97706";
    ctx.font = "900 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HEAT STRESS AWARENESS", p8X + 180, p8Y + 40);

    ctx.fillStyle = "#EA580C";
    ctx.font = "900 38px 'Arial Black', Impact, sans-serif";
    ctx.fillText("don't HEAT ME!", p8X + 180, p8Y + 95);

    ctx.fillStyle = "#0F172A";
    ctx.font = "800 15px sans-serif";
    ctx.fillText("HEAT EXHAUSTION vs STROKE", p8X + 180, p8Y + 140);

    ctx.font = "600 14px sans-serif";
    ctx.textAlign = "left";
    [
      "• Uminom ng maraming tubig",
      "• Magpahinga sa malilim",
      "• I-report agad ang hilo",
      "• Magsuot ng proteksyon",
      "• Mag-cooling down sa lilim",
    ].forEach((ht, idx) => {
      ctx.fillText(ht, p8X + 25, p8Y + 190 + idx * 50);
    });

    // HIV-AIDS Awareness Right Side
    ctx.fillStyle = "#6D28D9";
    ctx.font = "900 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HIV-AIDS AWARENESS", p8MidX + 185, p8Y + 40);

    ctx.fillStyle = "#7C3AED";
    ctx.font = "900 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Alamin, at Pigilan!", p8MidX + 185, p8Y + 80);

    ctx.fillStyle = "#0F172A";
    ctx.font = "600 14px sans-serif";
    ctx.textAlign = "left";
    [
      "Ang HIV ay naipapasa sa",
      "pamamagitan ng unprotected",
      "sex at kontaminadong dugo.",
      "",
      "• Magpakonsulta sa Clinic",
      "• Libreng testing at gamot",
      "• Respeto at suporta sa lahat",
    ].forEach((at, idx) => {
      ctx.fillText(at, p8MidX + 25, p8Y + 130 + idx * 38);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

// ─── AUTOMATED DYNAMIC SITE OFFICE ENTRANCE DOORWAY (OPEN 7AM TO 5PM) ───
function AnimatedOfficeEntranceDoor() {
  // Load the 3 authentic textures matching the real photos
  const heppOfficeHeaderTex = useTumauiniHeppOfficeSignboardTexture();
  const eshStatisticBoardTex = useProjectEshStatisticBoardTexture();
  const safetyBulletinBoardTex = useStaffOfficeSafetyBulletinBoardTexture();

  return (
    <group position={[0, 0, 11.0]}>
      {/* Subtle Warm Foyer Light */}
      <pointLight position={[0, 2.2, -1.8]} color="#FEF08A" intensity={1.2} distance={4.5} />
      <mesh position={[0, 0.05, -1.2]} material={MAT_PAVER_WALKWAY}>
        <boxGeometry args={[4.5, 0.02, 2.4]} />
      </mesh>
      {/* Interior Reception Counter */}
      <mesh position={[0, 1.1, -2.2]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[2.8, 1.1, 0.8]} />
      </mesh>

      {/* Concrete Entry Step Threshold (Front Walkway) */}
      <mesh position={[0, 0.1, 0.9]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[12.2, 0.2, 1.8]} />
      </mesh>

      {/* Heavy Steel Main Front Door Surround Frame (Wide Open Portal Matching Photo 1 & 2) */}
      <mesh position={[-1.55, 1.5, 0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.15, 3.0, 0.12]} />
      </mesh>
      <mesh position={[1.55, 1.5, 0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.15, 3.0, 0.12]} />
      </mesh>
      <mesh position={[0, 3.0, 0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[3.25, 0.18, 0.12]} />
      </mesh>

      {/* Inward-Swinging Double Office Doors (Recessed inside the foyer at Z = -0.4m, never blocking facade) */}
      <group position={[-1.45, 1.45, -0.4]} rotation={[0, 1.35, 0]}>
        <mesh material={MAT_GLASS_CLEAR}>
          <boxGeometry args={[1.4, 2.7, 0.04]} />
        </mesh>
        <mesh material={MAT_GLASS_FRAME}>
          <boxGeometry args={[1.42, 2.72, 0.05]} />
        </mesh>
      </group>

      <group position={[1.45, 1.45, -0.4]} rotation={[0, -1.35, 0]}>
        <mesh material={MAT_GLASS_CLEAR}>
          <boxGeometry args={[1.4, 2.7, 0.04]} />
        </mesh>
        <mesh material={MAT_GLASS_FRAME}>
          <boxGeometry args={[1.42, 2.72, 0.05]} />
        </mesh>
      </group>

      {/* ═══ 1. OFFICIAL "Tumauini HEPP OFFICE" HEADER SIGNAGE (PHOTO 2) ═══ */}
      <group position={[0, 3.48, 0.08]}>
        {/* Backing plate frame */}
        <mesh castShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[3.65, 0.82, 0.06]} />
        </mesh>
        {/* Signboard canvas face with pure diffuse matte material (zero specular glare) */}
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[3.58, 0.76]} />
          <meshStandardMaterial
            map={heppOfficeHeaderTex || undefined}
            color={heppOfficeHeaderTex ? "#FFFFFF" : "#14532D"}
            roughness={1.0}
            metalness={0.0}
            envMapIntensity={0.0}
          />
        </mesh>
      </group>

      {/* ═══ 2. OFFICIAL "PROJECT ESH STATISTIC BOARD" ON LEFT FACADE (PHOTO 4) ═══ */}
      <group position={[-3.7, 2.05, 0.06]}>
        {/* Dark Phenolic Plywood Frame backing */}
        <mesh castShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[3.65, 2.35, 0.07]} />
        </mesh>
        {/* Board Canvas Graphic Face with matte diffuse finish */}
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[3.58, 2.28]} />
          <meshStandardMaterial
            map={eshStatisticBoardTex || undefined}
            color={eshStatisticBoardTex ? "#FFFFFF" : "#F8FAFC"}
            roughness={1.0}
            metalness={0.0}
            envMapIntensity={0.0}
          />
        </mesh>
      </group>

      {/* ═══ 3. OFFICIAL HEALTH & SAFETY POSTERS BULLETIN BOARD ON RIGHT FACADE (PHOTO 3 REFERENCE) ═══ */}
      {/* Positioned between doorway and window (X = 1.72m to 4.18m) with exact 2400:1650 aspect ratio */}
      <group position={[2.95, 2.05, 0.05]}>
        {/* Frame backing */}
        <mesh castShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.46, 1.72, 0.06]} />
        </mesh>
        {/* Poster Canvas Graphic Face with matte diffuse finish */}
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[2.40, 1.65]} />
          <meshStandardMaterial
            map={safetyBulletinBoardTex || undefined}
            color={safetyBulletinBoardTex ? "#FFFFFF" : "#F8FAFC"}
            roughness={1.0}
            metalness={0.0}
            envMapIntensity={0.0}
          />
        </mesh>
      </group>

      {/* ═══ 4. RED FABRIC AWNING OVER SEPARATE FAR-RIGHT WINDOW (PHOTO 1 REFERENCE) ═══ */}
      {/* Centered at X = 5.25m flush against building front wall (X = 4.49m to 6.01m, cleanly within X = 6.25m corner) */}
      <group position={[5.25, 2.15, 0.03]}>
        {/* Side window frame flush against the wall */}
        <mesh material={MAT_GLASS_FRAME}>
          <boxGeometry args={[1.42, 1.25, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.01]} material={MAT_GLASS_CLEAR}>
          <planeGeometry args={[1.30, 1.12]} />
        </mesh>

        {/* Commercial Red Fabric Canopy Awning */}
        <group position={[0, 0.72, 0.02]}>
          {/* Sloped Top Fabric */}
          <mesh rotation={[0.34, 0, 0]} castShadow>
            <boxGeometry args={[1.52, 0.03, 0.85]} />
            <meshStandardMaterial color="#DC2626" roughness={0.9} metalness={0.0} />
          </mesh>
          {/* Front Valance Drop */}
          <mesh position={[0, -0.09, 0.42]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[1.52, 0.18, 0.02]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.9} metalness={0.0} />
          </mesh>
          {/* Left Side Fabric Wing */}
          <mesh position={[-0.75, -0.22, 0.22]}>
            <boxGeometry args={[0.02, 0.44, 0.44]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.9} metalness={0.0} />
          </mesh>
          {/* Right Side Fabric Wing */}
          <mesh position={[0.75, -0.22, 0.22]}>
            <boxGeometry args={[0.02, 0.44, 0.44]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.9} metalness={0.0} />
          </mesh>
        </group>
      </group>

      {/* ═══ 5. COLOR-CODED WASTE SORTING RECEPTACLES (PHOTO 1 REFERENCE) ═══ */}
      {/* Placed neatly on the concrete entrance step threshold clear of the doorway frame */}
      <group position={[1.8, 0.35, 1.15]}>
        {/* Blue Receptacle (Paper / Biodegradable) */}
        <mesh castShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.12, 0.58, 12]} />
          <meshStandardMaterial color="#0284C7" roughness={0.7} metalness={0.0} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 12]} />
          <meshStandardMaterial color="#0369A1" roughness={0.6} metalness={0.0} />
        </mesh>

        {/* Orange/Red Receptacle (Plastic / Recyclable) */}
        <mesh castShadow position={[0.34, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.12, 0.58, 12]} />
          <meshStandardMaterial color="#EA580C" roughness={0.7} metalness={0.0} />
        </mesh>
        <mesh position={[0.34, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 12]} />
          <meshStandardMaterial color="#C2410C" roughness={0.6} metalness={0.0} />
        </mesh>

        {/* Black Receptacle (Residual General Waste) */}
        <mesh castShadow position={[0.68, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.12, 0.58, 12]} />
          <meshStandardMaterial color="#1E293B" roughness={0.8} metalness={0.0} />
        </mesh>
        <mesh position={[0.68, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 12]} />
          <meshStandardMaterial color="#0F172A" roughness={0.7} metalness={0.0} />
        </mesh>
      </group>

      {/* ═══ 6. EXPOSED ROOF PURLIN / RAFTER BEAMS UNDER GABLE EAVES (PHOTO 1) ═══ */}
      {[-5.2, -3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9, 5.2].map((rx, idx) => (
        <mesh key={`rafter-beam-${idx}`} position={[rx, 4.35, 0.4]} rotation={[0.08, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.12, 0.22, 1.1]} />
        </mesh>
      ))}
    </group>
  );
}

// ─── AUTOMATED DYNAMIC SITE OFFICE BACK DOORWAY (OPEN 7AM TO 5PM ON NORTH FACADE) ───
function AnimatedOfficeBackDoor() {
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const openProgressRef = useRef(1.0);

  useFrame((_, delta) => {
    // Office working hours (7:00 AM - 5:00 PM): doors wide open
    const targetProgress = 1.0;

    if (Math.abs(openProgressRef.current - targetProgress) < 0.001) {
      return;
    }

    openProgressRef.current = THREE.MathUtils.damp(openProgressRef.current, targetProgress, 4.0, delta);
    const openDist = openProgressRef.current * 1.15; // Slides 1.15m to each side
    if (leftDoorRef.current) leftDoorRef.current.position.x = -0.6 - openDist;
    if (rightDoorRef.current) rightDoorRef.current.position.x = 0.6 + openDist;
  });

  return (
    <group position={[0, 0, -11.0]}>
      {/* Illuminated Rear Entrance Foyer Light */}
      <pointLight position={[0, 2.2, 1.2]} color="#FEF08A" intensity={5.0} distance={8} />

      {/* Concrete Rear Step Threshold leading directly to Lawn */}
      <mesh position={[0, 0.08, -0.6]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[3.2, 0.16, 1.2]} />
      </mesh>

      {/* Heavy Steel Door Frame */}
      <mesh position={[-1.45, 1.4, -0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.15, 2.8, 0.12]} />
      </mesh>
      <mesh position={[1.45, 1.4, -0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.15, 2.8, 0.12]} />
      </mesh>
      <mesh position={[0, 2.72, -0.02]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[3.05, 0.18, 0.12]} />
      </mesh>

      {/* Sliding Glass Rear Door Panels */}
      <group ref={leftDoorRef} position={[-0.6, 1.35, -0.04]}>
        <mesh material={MAT_GLASS_CLEAR}>
          <boxGeometry args={[1.2, 2.5, 0.05]} />
        </mesh>
        <mesh position={[0.5, 0, -0.03]} material={MAT_GLASS_FRAME}>
          <boxGeometry args={[0.05, 2.5, 0.06]} />
        </mesh>
        <mesh position={[0.4, 0, -0.05]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.06, 0.3, 0.04]} />
        </mesh>
      </group>

      <group ref={rightDoorRef} position={[0.6, 1.35, -0.04]}>
        <mesh material={MAT_GLASS_CLEAR}>
          <boxGeometry args={[1.2, 2.5, 0.05]} />
        </mesh>
        <mesh position={[-0.5, 0, -0.03]} material={MAT_GLASS_FRAME}>
          <boxGeometry args={[0.06, 2.5, 0.06]} />
        </mesh>
        <mesh position={[-0.4, 0, -0.05]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.06, 0.3, 0.04]} />
        </mesh>
      </group>

      {/* Rear Entry Weather Canopy Awning */}
      <mesh position={[0, 2.9, -0.6]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[3.6, 0.15, 1.2]} />
      </mesh>
    </group>
  );
}

// ─── PROFESSIONAL STAFF KITCHEN WORKER (COOKING & DISHWASHING PROFESSIONS) ───
function ProfessionalStaffKitchenWorker({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  profession = "SAFETY_OFFICER",
  action = "COOKING", // "COOKING" | "WASHING_DISHES" | "FOOD_PREP" | "LOUNGING"
  skinTone = "MEDIUM",
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  profession?: "SAFETY_OFFICER" | "IT_TECH_GUY" | "ENGINEER" | "POLLUTION_CONTROL" | "GEOMAPPER" | "SURVEYOR" | "PROJECT_MANAGER";
  action?: "COOKING" | "WASHING_DISHES" | "FOOD_PREP" | "LOUNGING";
  skinTone?: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
}) {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + position[0] * 2.5;

    if (action === "COOKING") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-0.8 + Math.sin(t * 4.0) * 0.1, Math.cos(t * 4.0) * 0.15, -0.2);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(-0.6, 0.2, 0.1);
      }
    } else if (action === "WASHING_DISHES") {
      if (rightArmRef.current && leftArmRef.current) {
        rightArmRef.current.rotation.set(-0.9 + Math.sin(t * 5.0) * 0.15, 0.1, -0.15);
        leftArmRef.current.rotation.set(-0.9 - Math.sin(t * 5.0) * 0.15, -0.1, 0.15);
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.18;
      }
    } else if (action === "FOOD_PREP") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-0.95 + Math.sin(t * 8.0) * 0.12, 0, -0.1);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(-0.7, 0.3, 0.15);
      }
    } else if (action === "LOUNGING") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-1.1 + Math.sin(t * 1.5) * 0.1, -0.2, -0.3);
      }
    }
  });

  const skinMat = skinTone === "LIGHT" ? MAT_SKIN_LIGHT : skinTone === "BRONZE" ? MAT_SKIN_BRONZE : skinTone === "DEEP" ? MAT_SKIN_DEEP : MAT_SKIN_MEDIUM;

  let shirtMat = MAT_SHIRT_LONG_GREEN;
  let vestMat: THREE.Material | null = MAT_WORKER_VEST_GREEN;
  let hardhatMat: THREE.Material | null = MAT_WORKER_HARDHAT_WHITE;

  if (profession === "SAFETY_OFFICER") {
    shirtMat = MAT_SHIRT_LONG_GREEN;
    vestMat = MAT_WORKER_VEST_GREEN; // Bright Safety Green
    hardhatMat = MAT_WORKER_HARDHAT_WHITE;
  } else if (profession === "IT_TECH_GUY") {
    shirtMat = MAT_SHIRT_SLATE_ADMIN;
    vestMat = null; // No vest for IT Tech
    hardhatMat = null; // No hardhat for IT Tech
  } else if (profession === "ENGINEER") {
    shirtMat = MAT_SHIRT_LIGHT_BLUE;
    vestMat = MAT_WORKER_VEST_ROYAL;
    hardhatMat = MAT_WORKER_HARDHAT_WHITE;
  } else if (profession === "POLLUTION_CONTROL") {
    shirtMat = MAT_SHIRT_LONG_GREEN;
    vestMat = MAT_WORKER_VEST_GREEN;
    hardhatMat = MAT_WORKER_HARDHAT_YELLOW;
  } else if (profession === "GEOMAPPER") {
    shirtMat = MAT_SHIRT_SLATE_ADMIN;
    vestMat = MAT_WORKER_VEST_ORANGE;
    hardhatMat = MAT_WORKER_HARDHAT_WHITE;
  } else if (profession === "SURVEYOR") {
    shirtMat = MAT_SHIRT_LONG_GREEN;
    vestMat = MAT_WORKER_VEST_AMBER;
    hardhatMat = MAT_WORKER_HARDHAT_YELLOW;
  } else if (profession === "PROJECT_MANAGER") {
    shirtMat = MAT_SHIRT_BLAZER_NAVY;
    vestMat = null;
    hardhatMat = MAT_WORKER_HARDHAT_WHITE;
  }

  return (
    <group position={position} rotation={rotation}>
      <group ref={torsoRef}>
        {/* Head Assembly with 3D Filipino Facial Features */}
        <group position={[0, 1.48, 0]}>
          <mesh castShadow material={skinMat}>
            <sphereGeometry args={[0.12, 14, 14]} />
          </mesh>

          {/* 3D Almond Eyes & Focused Irises */}
          <group position={[0, 0.015, 0.118]}>
            <mesh position={[-0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.016, 0.008]} />
            </mesh>
            <mesh position={[0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.016, 0.008]} />
            </mesh>
            <mesh position={[-0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.013, 0.008]} />
            </mesh>
            <mesh position={[0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.013, 0.008]} />
            </mesh>
            <mesh position={[-0.036, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
            <mesh position={[0.044, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
          </group>

          {/* Eyebrows */}
          <mesh position={[-0.04, 0.044, 0.116]} rotation={[0, 0, 0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0.044, 0.116]} rotation={[0, 0, -0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.008]} />
          </mesh>

          {/* 3D Nose Bridge */}
          <mesh position={[0, -0.01, 0.120]} material={skinMat}>
            <boxGeometry args={[0.018, 0.028, 0.022]} />
          </mesh>

          {/* Mouth & Lips */}
          <mesh position={[0, -0.052, 0.116]} material={MAT_FACE_LIPS}>
            <boxGeometry args={[0.036, 0.007, 0.008]} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.122, 0, 0]} rotation={[0, 0.05, -0.12]} material={skinMat}>
            <boxGeometry args={[0.016, 0.036, 0.024]} />
          </mesh>
          <mesh position={[0.122, 0, 0]} rotation={[0, -0.05, 0.12]} material={skinMat}>
            <boxGeometry args={[0.016, 0.036, 0.024]} />
          </mesh>
        </group>
        {/* Hardhat */}
        {hardhatMat && (
          <mesh position={[0, 1.61, 0]} castShadow material={hardhatMat}>
            <sphereGeometry args={[0.16, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        )}

        {/* Torso & Profession Shirt */}
        <mesh position={[0, 1.05, 0]} castShadow material={shirtMat}>
          <boxGeometry args={[0.4, 0.54, 0.22]} />
        </mesh>
        {/* Safety Vest */}
        {vestMat && (
          <mesh position={[0, 1.06, 0]} castShadow material={vestMat}>
            <boxGeometry args={[0.42, 0.52, 0.24]} />
          </mesh>
        )}

        {/* Profession-specific accessories */}
        {profession === "SAFETY_OFFICER" && (
          <mesh position={[-0.15, 1.2, 0.13]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.06, 0.12, 0.04]} />
          </mesh>
        )}
        {profession === "IT_TECH_GUY" && (
          <mesh position={[0, 1.1, 0.13]} material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[0.08, 0.1, 0.02]} />
          </mesh>
        )}
        {profession === "ENGINEER" && (
          <mesh position={[0.18, 0.95, -0.1]} rotation={[0.2, 0, 0.1]} material={MAT_WHITE_PAINT}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          </mesh>
        )}

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.24, 1.25, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow material={shirtMat}>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
          </mesh>
          <mesh position={[0, -0.46, 0]} material={skinMat}>
            <sphereGeometry args={[0.045, 6, 6]} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.24, 1.25, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow material={shirtMat}>
            <boxGeometry args={[0.1, 0.44, 0.1]} />
          </mesh>
          <mesh position={[0, -0.46, 0]} material={skinMat}>
            <sphereGeometry args={[0.045, 6, 6]} />
          </mesh>
          {action === "COOKING" && (
            <mesh position={[0, -0.48, 0.15]} rotation={[0.5, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.03, 0.015, 0.3]} />
            </mesh>
          )}
          {action === "WASHING_DISHES" && (
            <mesh position={[0, -0.48, 0.05]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.08, 0.04, 0.1]} />
            </mesh>
          )}
          {action === "FOOD_PREP" && (
            <mesh position={[0, -0.48, 0.1]} rotation={[0.8, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.02, 0.01, 0.2]} />
            </mesh>
          )}
          {action === "LOUNGING" && (
            <mesh position={[0, -0.48, 0.08]} material={MAT_WHITE_PAINT}>
              <cylinderGeometry args={[0.04, 0.035, 0.1, 8]} />
            </mesh>
          )}
        </group>
      </group>

      {/* Legs & Pants (Pivoted at Hip y=0.75 to connect seamlessly with Torso Shirt at y=0.78!) */}
      <group position={[-0.11, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} castShadow material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
      <group position={[0.11, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} castShadow material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── REALISTIC OUTDOOR KITCHEN EXTENSION (CONNECTED TO REAR OF STAFF HOUSE) ───
function TemfacilStaffHouseKitchenExtension({ isDetailVisible = true }: { isDetailVisible?: boolean }) {
  return (
    <group position={[0, 0, -7.5]}>
      {/* 1. Concrete Slab Floor Deck */}
      <mesh position={[0, 0.06, -6.0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[12.6, 0.12, 12.0]} />
      </mesh>

      {/* 2. Concrete Hollow Block (CHB) Masonry Perimeter Half-Wall with Open Access Entryway */}
      <mesh position={[0, 0.6, -11.95]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
        <boxGeometry args={[12.6, 1.1, 0.25]} />
      </mesh>
      <mesh position={[-6.2, 0.6, -0.6]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.25, 1.1, 1.2]} />
      </mesh>
      <mesh position={[-6.2, 0.6, -8.9]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.25, 1.1, 6.2]} />
      </mesh>
      <mesh position={[-6.2, 0.08, -3.5]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[1.2, 0.16, 4.6]} />
      </mesh>
      <mesh position={[-6.2, 0.17, -3.5]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
        <planeGeometry args={[1.2, 0.12]} />
      </mesh>
      <mesh position={[6.2, 0.6, -6.0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.25, 1.1, 12.0]} />
      </mesh>

      {/* 3. Lean-To Corrugated Iron Roof Canopy & Steel Support Frame */}
      <mesh position={[0, 2.65, -6.0]} rotation={[-0.08, 0, 0]} castShadow material={MAT_ROOF_CORRUGATED}>
        <boxGeometry args={[13.2, 0.12, 12.6]} />
      </mesh>
      <mesh position={[0, 2.1, -11.8]} material={MAT_STEEL_FRAME}>
        <boxGeometry args={[12.6, 0.1, 0.12]} />
      </mesh>

      {[-6.1, 0, 6.1].map((xOff, i) => (
        <group key={`k-post-${i}`} position={[xOff, 0, -11.8]}>
          <mesh position={[0, 1.6, 0]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
          </mesh>
          <mesh position={[0, 1.75, 0.3]} rotation={[-0.45, 0, 0]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.035, 0.035, 0.65, 6]} />
          </mesh>
        </group>
      ))}

      {/* 4. Built-In Concrete Kitchen Countertop & Cooking Preparation Equipment */}
      <group position={[0, 0.5, -11.4]}>
        <mesh position={[0, 0.4, 0]} castShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[11.8, 0.8, 0.9]} />
        </mesh>
        {[-3.5, 3.5].map((xOff, i) => (
          <mesh key={`sink-${i}`} position={[xOff, 0.82, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[1.2, 0.05, 0.6]} />
          </mesh>
        ))}
        {[-4.8, -2.0, 0.5, 2.2, 4.8].map((xOff, i) => (
          <group key={`cookware-${i}`} position={[xOff, 0.85, (i % 2 === 0 ? 0.1 : -0.1)]}>
            {i % 2 === 0 ? (
              <mesh castShadow material={MAT_STEEL_FRAME}>
                <cylinderGeometry args={[0.22, 0.22, 0.35, 12]} />
              </mesh>
            ) : (
              <mesh castShadow material={MAT_YELLOW_SAFETY}>
                <boxGeometry args={[0.28, 0.4, 0.28]} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {isDetailVisible && (
        <>
          {/* ═══ REDUCED & ROTATED KITCHEN STAFF (3 STAFF MEMBERS FACING KITCHEN COUNTER & SINKS) ═══ */}
      {/* 1. Surveyor / IT Tech Washing Dishes at Right Sink (Facing Sink -Z) */}
      <ProfessionalStaffKitchenWorker position={[3.5, 0.06, -10.4]} rotation={[0, Math.PI, 0]} profession="SURVEYOR" action="WASHING_DISHES" skinTone="MEDIUM" />

      {/* 2. Safety Officer Cooking Meal at Left Gas Stove (Facing Stove -Z) */}
      <ProfessionalStaffKitchenWorker position={[-2.0, 0.06, -10.4]} rotation={[0, Math.PI, 0]} profession="SAFETY_OFFICER" action="COOKING" skinTone="BRONZE" />

      {/* 3. Pollution Control Officer (PCO) Food Prep at Center Counter (Facing Counter -Z) */}
      <ProfessionalStaffKitchenWorker position={[0.5, 0.06, -10.4]} rotation={[0, Math.PI, 0]} profession="POLLUTION_CONTROL" action="FOOD_PREP" skinTone="LIGHT" />

              </>
      )}

      {/* 5. Rear Single Big Connecting Door Portal */}
      <group position={[0, 1.4, -0.05]}>
        <mesh position={[-2.15, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.2, 2.8, 0.1]} />
        </mesh>
        <mesh position={[2.15, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.2, 2.8, 0.1]} />
        </mesh>
        <mesh position={[0, 1.35, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[4.5, 0.2, 0.1]} />
        </mesh>
        <mesh position={[0, 1.25, -0.06]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[4.5, 0.08, 0.06]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── PHOTOREALISTIC FILIPINO CARINDERIA FOOD DISPLAY SYSTEM ───
// Design: Textures do ALL the visual work. No primitive 3D food shapes.
// The photorealistic generated textures are 2x2 grids (4 dishes).
// Trays 0-3 each get one quadrant via UV cropping.
// Tray 4 (rice) uses a dedicated rice material on a natural mound.

function FilipinoFoodTrayDish({ index, mealPeriod, bfastFoodTex, lunchFoodTex, dinnerFoodTex }: {
  index: number;
  mealPeriod: "BREAKFAST" | "LUNCH" | "DINNER";
  bfastFoodTex: THREE.Texture;
  lunchFoodTex: THREE.Texture;
  dinnerFoodTex: THREE.Texture;
}) {
  const i = index;
  const isRiceTray = i === 4;

  // Select the correct base texture for the current meal period
  const foodTex = mealPeriod === "BREAKFAST" ? bfastFoodTex : mealPeriod === "LUNCH" ? lunchFoodTex : dinnerFoodTex;

  // Create a cropped clone of the 2x2 grid texture showing only this tray's quadrant
  // All 3 textures (breakfast, lunch, dinner) use 2x2 grid layout
  const traySubTex = React.useMemo(() => {
    if (i >= 4 || !foodTex || !foodTex.image) return null;
    const t = foodTex.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    // Show one quadrant of the 2x2 grid
    t.repeat.set(0.5, 0.5);
    // Map each tray index to its quadrant:
    // Tray 0 → top-left,  Tray 1 → top-right
    // Tray 2 → bottom-left, Tray 3 → bottom-right
    if (i === 0) t.offset.set(0.0, 0.5);
    else if (i === 1) t.offset.set(0.5, 0.5);
    else if (i === 2) t.offset.set(0.0, 0.0);
    else if (i === 3) t.offset.set(0.5, 0.0);
    t.needsUpdate = true;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodTex, i, mealPeriod]);

  return (
    <group position={[[-2.5, -1.25, 0, 1.25, 2.5][i], 0.43, 0]}>
      {/* ── Stainless Steel Chafing Dish / Gastronorm Pan ── */}
      {/* Outer rim */}
      <mesh material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[1.15, 0.12, 0.78]} />
      </mesh>
      {/* Inner basin (dark recessed area) */}
      <mesh position={[0, 0.03, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[1.05, 0.09, 0.68]} />
      </mesh>

      {/* ── PHOTOREALISTIC FOOD DISPLAY ── */}
      {/* Trays 0-3: Photorealistic texture from generated images fills the tray */}
      {!isRiceTray && traySubTex && (
        <group>
          {/* Raised food volume base — gives illusion of food filling the tray */}
          <mesh position={[0, 0.06, 0]} material={MAT_ADOBO}>
            <boxGeometry args={[1.02, 0.05, 0.65]} />
          </mesh>
          {/* Photorealistic food texture surface on top — this does ALL the visual work */}
          <mesh position={[0, 0.086, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.02, 0.65]} />
            <meshStandardMaterial
              map={traySubTex}
              roughness={1.0}
              metalness={0.0}
              side={THREE.FrontSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>
      )}

      {/* Tray 4 (Rice): Smooth garlic sinangag rice mound */}
      {isRiceTray && (
        <group position={[0, 0.05, 0]}>
          {/* Rice base filling the pan */}
          <mesh position={[0, 0.03, 0]} material={MAT_GARLIC_RICE}>
            <boxGeometry args={[1.02, 0.06, 0.65]} />
          </mesh>
          {/* Smooth domed mound */}
          <mesh position={[0, 0.065, 0]} material={MAT_GARLIC_RICE}>
            <sphereGeometry args={[0.38, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      )}

      {/* ── Stainless Steel Rim Edges (top lip of the tray) ── */}
      {/* Front rim */}
      <mesh position={[0, 0.065, 0.37]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[1.15, 0.035, 0.04]} />
      </mesh>
      {/* Back rim */}
      <mesh position={[0, 0.065, -0.37]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[1.15, 0.035, 0.04]} />
      </mesh>
      {/* Left rim */}
      <mesh position={[-0.555, 0.065, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[0.04, 0.035, 0.78]} />
      </mesh>
      {/* Right rim */}
      <mesh position={[0.555, 0.065, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[0.04, 0.035, 0.78]} />
      </mesh>
    </group>
  );
}

function getActiveMealPeriod(): "BREAKFAST" | "LUNCH" | "DINNER" {
  const hour = new Date().getHours();
  // 5:00 AM to 10:59 AM -> Breakfast (Hotdog, Egg, Bologna, Longganisa)
  if (hour >= 5 && hour < 11) {
    return "BREAKFAST";
  }
  // 11:00 AM to 3:59 PM (15:59) -> Lunch (Adobo, Igado, Tinola, Dinuguan)
  if (hour >= 11 && hour < 16) {
    return "LUNCH";
  }
  // 4:00 PM to 4:59 AM -> Dinner (Sinigang, Kare-Kare, Lechon Kawali, Bistek Tagalog)
  return "DINNER";
}

function FilipinoCanteenFoodCounter() {
  const initialPeriod = getActiveMealPeriod();
  const mealPeriodRef = useRef<"BREAKFAST" | "LUNCH" | "DINNER">(initialPeriod);
  const [mealPeriod, setMealPeriod] = React.useState<"BREAKFAST" | "LUNCH" | "DINNER">(initialPeriod);

  // Load realistic high-resolution orthographic Filipino food textures
  const lunchFoodTex = useLoader(THREE.TextureLoader, "/textures/canteen_lunch_food.png");
  const bfastFoodTex = useLoader(THREE.TextureLoader, "/textures/canteen_breakfast_food.png");
  const dinnerFoodTex = useLoader(THREE.TextureLoader, "/textures/canteen_dinner_food.png");

  // Keep meal period updated according to actual routine time of day
  useFrame(() => {
    const nextPeriod = getActiveMealPeriod();
    if (mealPeriodRef.current !== nextPeriod) {
      mealPeriodRef.current = nextPeriod;
      setMealPeriod(nextPeriod);
    }
  });

  return (
    <group position={[0, 0.5, 5.8]}>
      {/* ── Main Serving Counter Body ── */}
      <mesh castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[7.2, 0.8, 1.0]} />
      </mesh>
      {/* Stainless steel countertop surface */}
      <mesh position={[0, 0.41, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[7.16, 0.02, 0.96]} />
      </mesh>

      {/* ── GENTLE WARM FOOD ILLUMINATION (CONSOLIDATED FILL LIGHT) ── */}
      <pointLight position={[0, 1.35, 0]} color="#FED7AA" intensity={1.8} distance={7.0} />

      {/* ── Glass Sneeze Guard (Transparent Barrier) ── */}
      {/* Front glass panel */}
      <mesh position={[0, 0.9, 0.48]}>
        <boxGeometry args={[7.1, 0.8, 0.02]} />
        <meshPhysicalMaterial
          color="#E0F2FE"
          transparent
          opacity={0.12}
          roughness={0.05}
          metalness={0.0}
          transmission={0.92}
        />
      </mesh>
      {/* Stainless steel sneeze guard rail (top) */}
      <mesh position={[0, 1.31, 0.48]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[7.16, 0.04, 0.04]} />
      </mesh>
      {/* Sneeze guard support posts */}
      {[-3.55, 0, 3.55].map((x, k) => (
        <mesh key={`sg-post-${k}`} position={[x, 0.9, 0.48]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.04, 0.9, 0.04]} />
        </mesh>
      ))}

      {/* ── 5 Stainless Steel Food Trays Line-Up ── */}
      {[0, 1, 2, 3, 4].map((i) => (
        <FilipinoFoodTrayDish
          key={`dish-tray-${i}`}
          index={i}
          mealPeriod={mealPeriod}
          bfastFoodTex={bfastFoodTex}
          lunchFoodTex={lunchFoodTex}
          dinnerFoodTex={dinnerFoodTex}
        />
      ))}
    </group>
  );
}

// ─── HIGH-DETAIL CANTEEN SEATED DINER WITH MULTI-PHASE EATING & DRINKING KINEMATICS ───
function CanteenSeatedDiner({
  position = [0, 0, 0],
  facingDir = 1, // 1: facing +X, -1: facing -X
  role = "WORKER", // WORKER (80%) or STAFF (20%)
  shirtColor = "#EA580C",
  hardhatColor = "#16A34A",
  wearingHardhat = false,
  skinTone = "MEDIUM",
}: {
  position?: [number, number, number];
  facingDir?: number;
  role?: "WORKER" | "STAFF";
  shirtColor?: string;
  hardhatColor?: string;
  wearingHardhat?: boolean;
  skinTone?: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
}) {
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime() + (position[0] * 3.1 + position[2] * 2.7);

    // Multi-Phase Realistic Filipino Canteen Eating & Refreshment Kinematics (Cycle: 6 seconds)
    const eatCycle = (t * 1.05) % (Math.PI * 2);

    if (rightArmRef.current) {
      if (eatCycle < Math.PI * 0.45) {
        // Phase 1: Dip spoon into garlic rice & adobo plate
        const dip = Math.sin((eatCycle / (Math.PI * 0.45)) * Math.PI);
        rightArmRef.current.rotation.set(-0.45 - dip * 0.35, 0, (-0.15 - dip * 0.1) * facingDir);
      } else if (eatCycle < Math.PI * 0.85) {
        // Phase 2: Lift spoon to mouth & take bite
        const liftProgress = (eatCycle - Math.PI * 0.45) / (Math.PI * 0.4);
        const lift = Math.sin(liftProgress * Math.PI);
        rightArmRef.current.rotation.set(-0.75 - lift * 0.65, 0.15, (-0.25 - lift * 0.2) * facingDir);
      } else {
        // Phase 3 & 4: Rest hand on table while chewing & savoring
        rightArmRef.current.rotation.set(-0.48, 0, -0.18 * facingDir);
      }
    }

    if (leftArmRef.current) {
      if (eatCycle >= Math.PI * 1.25 && eatCycle < Math.PI * 1.75) {
        // Phase 4: Lift cold water glass to mouth & take a sip
        const sipProgress = (eatCycle - Math.PI * 1.25) / (Math.PI * 0.5);
        const sipLift = Math.sin(sipProgress * Math.PI);
        leftArmRef.current.rotation.set(-0.65 - sipLift * 0.7, 0.25, (0.18 + sipLift * 0.15) * facingDir);
      } else {
        // Rest on table holding or beside drink cup
        leftArmRef.current.rotation.set(-0.65, 0, 0.16 * facingDir);
      }
    }

    // Dynamic head movement: nod down slightly for bite, tilt up when lifting spoon, subtle chewing motion
    if (headRef.current) {
      const isTakingBite = eatCycle >= Math.PI * 0.45 && eatCycle < Math.PI * 0.85;
      const isChewing = eatCycle >= Math.PI * 0.85 && eatCycle < Math.PI * 1.5;
      const chatTurn = Math.sin(t * 0.5) * 0.18;

      let nodY = 0;
      if (isTakingBite) {
        nodY = -0.12;
      } else if (isChewing) {
        nodY = Math.sin(t * 6.5) * 0.04;
      }

      headRef.current.rotation.set(nodY, chatTurn, 0);
    }

    if (torsoRef.current) {
      const lean = eatCycle < Math.PI * 0.85 ? 0.08 : 0.02;
      torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, lean, 0.1);
    }
  });

  const skinMat = skinTone === "LIGHT" ? MAT_SKIN_LIGHT : skinTone === "BRONZE" ? MAT_SKIN_BRONZE : skinTone === "DEEP" ? MAT_SKIN_DEEP : MAT_SKIN_MEDIUM;
  const vestMat = shirtColor === "#EA580C" ? MAT_WORKER_VEST_ORANGE : MAT_WORKER_VEST_AMBER;
  const topMat = role === "WORKER" ? MAT_SHIRT_LONG_GREEN : MAT_SHIRT_LIGHT_BLUE;

  return (
    <group position={position} rotation={[0, facingDir > 0 ? Math.PI * 0.38 : -Math.PI * 0.38, 0]}>
      <group ref={torsoRef}>
        {/* Head Assembly with Authentic 3D Filipino Facial Features */}
        <group ref={headRef}>
          <mesh position={[0, 0.96, 0]} castShadow material={skinMat}>
            <sphereGeometry args={[0.125, 14, 14]} />
          </mesh>

          {/* ═══ 3D VOLUMETRIC FILIPINO FACIAL FEATURES ═══ */}
          <group position={[0, 0.975, 0.120]}>
            {/* Almond Eye Sclera */}
            <mesh position={[-0.042, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.018, 0.010]} />
            </mesh>
            <mesh position={[0.042, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.018, 0.010]} />
            </mesh>
            {/* Focused Dark Brown Irises */}
            <mesh position={[-0.042, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.014, 0.010]} />
            </mesh>
            <mesh position={[0.042, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.014, 0.010]} />
            </mesh>
            {/* Eye Catchlight Glint */}
            <mesh position={[-0.038, 0.004, 0.007]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
            <mesh position={[0.046, 0.004, 0.007]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
          </group>

          {/* Eyebrows */}
          <mesh position={[-0.042, 1.004, 0.118]} rotation={[0, 0, 0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.010]} />
          </mesh>
          <mesh position={[0.042, 1.004, 0.118]} rotation={[0, 0, -0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.010]} />
          </mesh>

          {/* 3D Nose Bridge */}
          <mesh position={[0, 0.95, 0.122]} material={skinMat}>
            <boxGeometry args={[0.020, 0.030, 0.024]} />
          </mesh>

          {/* Mouth & Lips */}
          <mesh position={[0, 0.908, 0.118]} material={MAT_FACE_LIPS}>
            <boxGeometry args={[0.038, 0.008, 0.010]} />
          </mesh>

          {/* 3D Left & Right Ears */}
          <mesh position={[-0.126, 0.96, 0]} rotation={[0, 0.05, -0.12]} material={skinMat}>
            <boxGeometry args={[0.016, 0.038, 0.026]} />
          </mesh>
          <mesh position={[0.126, 0.96, 0]} rotation={[0, -0.05, 0.12]} material={skinMat}>
            <boxGeometry args={[0.016, 0.038, 0.026]} />
          </mesh>

          {/* Headwear: Hard Hat if worn while eating, or neat hair if removed */}
          {wearingHardhat ? (
            <group position={[0, 1.06, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.155, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={hardhatColor} roughness={0.3} metalness={0.1} />
              </mesh>
              {/* Hardhat front brim */}
              <mesh position={[0, -0.015, 0.08]} rotation={[0.15, 0, 0]}>
                <boxGeometry args={[0.22, 0.02, 0.12]} />
                <meshStandardMaterial color={hardhatColor} roughness={0.3} metalness={0.1} />
              </mesh>
              {/* Front Crest */}
              <mesh position={[0, 0.05, 0.14]}>
                <boxGeometry args={[0.045, 0.03, 0.01]} />
                <meshStandardMaterial color="#0284C7" roughness={0.4} />
              </mesh>
            </group>
          ) : (
            /* Natural Filipino Hair when Hardhat is Taken Off */
            <mesh position={[0, 1.02, -0.01]} material={MAT_HAIR_BLACK}>
              <sphereGeometry args={[0.134, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            </mesh>
          )}
        </group>

        {/* Torso & Shirt */}
        <mesh position={[0, 0.55, 0]} material={topMat}>
          <boxGeometry args={[0.38, 0.52, 0.22]} />
        </mesh>

        {/* High-Vis Vest with Reflective Stripes */}
        {role === "WORKER" && (
          <group position={[0, 0.56, 0]}>
            <mesh material={vestMat}>
              <boxGeometry args={[0.4, 0.5, 0.24]} />
            </mesh>
            {/* Reflective Yellow Stripes */}
            <mesh position={[0, 0.05, 0.125]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.38, 0.04, 0.01]} />
            </mesh>
            <mesh position={[0, -0.12, 0.125]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.38, 0.04, 0.01]} />
            </mesh>
          </group>
        )}

        {/* Left Arm (Drinking Beverage Glass) */}
        <group ref={leftArmRef} position={[-0.23, 0.74, 0]}>
          <mesh position={[0, -0.2, 0]} material={topMat}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
          </mesh>
          <mesh position={[0, -0.42, 0]} material={skinMat}>
            <sphereGeometry args={[0.045, 6, 6]} />
          </mesh>
        </group>

        {/* Right Arm (Eating with Stainless Steel Spoon) */}
        <group ref={rightArmRef} position={[0.23, 0.74, 0]}>
          <mesh position={[0, -0.2, 0]} material={topMat}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
          </mesh>
          <mesh position={[0, -0.42, 0]} material={skinMat}>
            <sphereGeometry args={[0.045, 6, 6]} />
          </mesh>
          {/* Stainless Spoon */}
          <mesh position={[0, -0.44, 0.14]} rotation={[0.4, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.025, 0.01, 0.18]} />
          </mesh>
        </group>

        {/* Seated Legs on Canteen Bench */}
        <group position={[-0.11, 0.28, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={MAT_PANTS_JEANS}>
            <boxGeometry args={[0.12, 0.44, 0.13]} />
          </mesh>
        </group>
        <group position={[0.11, 0.28, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={MAT_PANTS_JEANS}>
            <boxGeometry args={[0.12, 0.44, 0.13]} />
          </mesh>
        </group>
      </group>

      {/* ── HIGH-DETAIL TABLE MEAL PROPS IN FRONT OF DINER ── */}
      <group position={[0, 0.51, 0.38]}>
        {/* Compartment Meal Plate */}
        <mesh material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.42, 0.02, 0.3]} />
        </mesh>
        {/* Sinangag Garlic Rice Mound */}
        <mesh position={[-0.1, 0.03, 0]} material={MAT_GARLIC_RICE}>
          <sphereGeometry args={[0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {/* Pork Adobo / Igado Ulam Portion */}
        <mesh position={[0.1, 0.025, 0]} material={MAT_ADOBO}>
          <boxGeometry args={[0.16, 0.035, 0.15]} />
        </mesh>
        {/* Glass Beverage Cup */}
        <mesh position={[0.24, 0.07, 0.08]} material={MAT_GLASS_BLUE}>
          <cylinderGeometry args={[0.04, 0.03, 0.14, 10]} />
        </mesh>

        {/* ─── WHEN HARD HAT IS TAKEN OFF: PLACED NEATLY ON TABLE NEXT TO MEAL TRAY ─── */}
        {!wearingHardhat && (
          <group position={[facingDir * 0.28, 0.04, -0.02]} rotation={[-0.05, facingDir * 0.35, 0.12]}>
            {/* Hardhat Dome */}
            <mesh>
              <sphereGeometry args={[0.11, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hardhatColor} roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Front Brim */}
            <mesh position={[0, -0.01, 0.06]} rotation={[0.15, 0, 0]}>
              <boxGeometry args={[0.15, 0.015, 0.08]} />
              <meshStandardMaterial color={hardhatColor} roughness={0.3} metalness={0.1} />
            </mesh>
            {/* SCIC Front Logo Stripe */}
            <mesh position={[0, 0.035, 0.10]}>
              <boxGeometry args={[0.03, 0.02, 0.006]} />
              <meshStandardMaterial color="#0284C7" roughness={0.4} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

// ─── AUTHENTIC FILIPINO CARINDERIA ATE ROUTINE SERVER ───
function CanteenAteServer() {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const ladleRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const [hasFoodInLadle, setHasFoodInLadle] = React.useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 32.0;
    if (!groupRef.current) return;

    let posX = 0;
    let posZ = 6.6;
    let rotY = Math.PI;
    let isMoving = false;
    let isScooping = false;
    let isCheckingPrep = false;
    let stayTime = 0;

    if (t < 5.0) {
      posX = -2.5;
      posZ = 6.6;
      rotY = Math.PI;
      isScooping = true;
      stayTime = t;
    } else if (t < 7.0) {
      const p = (t - 5.0) / 2.0;
      posX = THREE.MathUtils.lerp(-2.5, -1.25, p);
      posZ = 6.6;
      rotY = Math.PI;
      isMoving = true;
    } else if (t < 12.0) {
      posX = -1.25;
      posZ = 6.6;
      rotY = Math.PI;
      isScooping = true;
      stayTime = t - 7.0;
    } else if (t < 14.0) {
      const p = (t - 12.0) / 2.0;
      posX = THREE.MathUtils.lerp(-1.25, 0.0, p);
      posZ = 6.6;
      rotY = Math.PI;
      isMoving = true;
    } else if (t < 19.0) {
      posX = 0.0;
      posZ = 6.6;
      rotY = Math.PI;
      isScooping = true;
      stayTime = t - 14.0;
    } else if (t < 21.0) {
      const p = (t - 19.0) / 2.0;
      posX = THREE.MathUtils.lerp(0.0, 1.25, p);
      posZ = 6.6;
      rotY = Math.PI;
      isMoving = true;
    } else if (t < 25.0) {
      posX = 1.25;
      posZ = 6.6;
      rotY = Math.PI;
      isScooping = true;
      stayTime = t - 21.0;
    } else if (t < 27.0) {
      const p = (t - 25.0) / 2.0;
      posX = THREE.MathUtils.lerp(1.25, 0.5, p);
      posZ = THREE.MathUtils.lerp(6.6, 7.8, p);
      rotY = THREE.MathUtils.lerp(Math.PI, 0, p);
      isMoving = true;
    } else if (t < 30.0) {
      posX = 0.5;
      posZ = 7.8;
      rotY = 0;
      isCheckingPrep = true;
    } else {
      const p = (t - 30.0) / 2.0;
      posX = THREE.MathUtils.lerp(0.5, -2.5, p);
      posZ = THREE.MathUtils.lerp(7.8, 6.6, p);
      rotY = THREE.MathUtils.lerp(0, Math.PI, p);
      isMoving = true;
    }

    groupRef.current.position.set(posX, 0.45, posZ);
    groupRef.current.rotation.y = rotY;

    // Leg walk gait swing
    const swing = isMoving ? Math.sin(t * 8.0) * 0.35 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;

    // ─── 4-PHASE REALISTIC SERVING KINEMATICS AT FOOD DISH STATIONS ───
    if (isScooping) {
      const serveProgress = stayTime / 5.0; // 0.0 to 1.0

      if (serveProgress < 0.3) {
        // Phase 1: Reaching down & dipping into chafing dish
        const p1 = serveProgress / 0.3;
        if (torsoRef.current) torsoRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.22, p1);
        if (armRef.current) armRef.current.rotation.set(THREE.MathUtils.lerp(-0.5, -1.15, p1), -0.2, -0.15);
        if (ladleRef.current) ladleRef.current.rotation.set(THREE.MathUtils.lerp(0, 0.55, p1), 0, 0);
        if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(0, 0.22, p1), 0, 0);
        if (!hasFoodInLadle) setHasFoodInLadle(true);
      } else if (serveProgress < 0.5) {
        // Phase 2: Lifting full ladle up over counter glass
        const p2 = (serveProgress - 0.3) / 0.2;
        if (torsoRef.current) torsoRef.current.rotation.x = THREE.MathUtils.lerp(0.22, 0.04, p2);
        if (armRef.current) armRef.current.rotation.set(THREE.MathUtils.lerp(-1.15, -0.6, p2), -0.1, 0.0);
        if (ladleRef.current) ladleRef.current.rotation.set(THREE.MathUtils.lerp(0.55, 0.1, p2), 0, 0);
        if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(0.22, 0.05, p2), 0.1, 0);
      } else if (serveProgress < 0.8) {
        // Phase 3: Extending ladle forward & pouring food onto customer plate!
        const p3 = (serveProgress - 0.5) / 0.3;
        if (torsoRef.current) torsoRef.current.rotation.x = THREE.MathUtils.lerp(0.04, 0.1, p3);
        if (armRef.current) armRef.current.rotation.set(THREE.MathUtils.lerp(-0.6, -0.45, p3), 0.25, 0.1);
        if (ladleRef.current) ladleRef.current.rotation.set(THREE.MathUtils.lerp(0.1, -0.65, p3), 0.2, 0);
        if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(0.05, -0.08, p3), 0.2, 0);
        if (serveProgress > 0.7 && hasFoodInLadle) setHasFoodInLadle(false);
      } else {
        // Phase 4: Returning ladle to ready stance
        const p4 = (serveProgress - 0.8) / 0.2;
        if (torsoRef.current) torsoRef.current.rotation.x = THREE.MathUtils.lerp(0.1, 0, p4);
        if (armRef.current) armRef.current.rotation.set(THREE.MathUtils.lerp(-0.45, -0.5, p4), 0, 0);
        if (ladleRef.current) ladleRef.current.rotation.set(THREE.MathUtils.lerp(-0.65, 0, p4), 0, 0);
        if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(-0.08, 0, p4), 0, 0);
      }
    } else if (isCheckingPrep) {
      const stir = Math.sin(t * 4.0);
      if (torsoRef.current) torsoRef.current.rotation.x = 0.05;
      if (armRef.current) armRef.current.rotation.set(-0.6 + stir * 0.2, 0.3, 0);
      if (ladleRef.current) ladleRef.current.rotation.set(0, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0.1, 0, 0);
      if (hasFoodInLadle) setHasFoodInLadle(false);
    } else {
      if (torsoRef.current) torsoRef.current.rotation.x = 0;
      if (armRef.current) armRef.current.rotation.set(-0.4, 0, 0);
      if (ladleRef.current) ladleRef.current.rotation.set(0, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0, Math.sin(t * 3.0) * 0.15, 0);
      if (hasFoodInLadle) setHasFoodInLadle(false);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Legs (Anchored at Hip Joint y = 0.75, Feet resting on floor) */}
      <group ref={leftLegRef} position={[-0.1, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_SLATE}>
          <boxGeometry args={[0.11, 0.74, 0.13]} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.1, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_SLATE}>
          <boxGeometry args={[0.11, 0.74, 0.13]} />
        </mesh>
      </group>

      {/* Upper Body Assembly (Pivots seamlessly at Waist/Hip Joint y = 0.75) */}
      <group ref={torsoRef} position={[0, 0.75, 0]}>
        {/* Hips & Pelvis Belt */}
        <mesh position={[0, 0.02, 0]} material={MAT_PANTS_SLATE}>
          <boxGeometry args={[0.36, 0.08, 0.2]} />
        </mesh>

        {/* Torso & Kitchen Apron */}
        <mesh position={[0, 0.28, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
          <boxGeometry args={[0.38, 0.52, 0.22]} />
        </mesh>
        <mesh position={[0, 0.18, 0.12]} material={MAT_WORKER_VEST_ORANGE}>
          <boxGeometry args={[0.36, 0.65, 0.03]} />
        </mesh>
        <mesh position={[-0.12, 0.44, 0.11]} material={MAT_WORKER_VEST_ORANGE}>
          <boxGeometry args={[0.04, 0.25, 0.02]} />
        </mesh>
        <mesh position={[0.12, 0.44, 0.11]} material={MAT_WORKER_VEST_ORANGE}>
          <boxGeometry args={[0.04, 0.25, 0.02]} />
        </mesh>

        {/* Head & Hair (Attached to Shoulders y = 0.70 relative to waist) */}
        <group ref={headRef} position={[0, 0.70, 0]}>
          <mesh material={MAT_SKIN_MEDIUM}>
            <sphereGeometry args={[0.13, 14, 14]} />
          </mesh>
          <mesh position={[0, -0.16, 0]} material={MAT_SKIN_MEDIUM}>
            <cylinderGeometry args={[0.065, 0.075, 0.14, 10]} />
          </mesh>
          <mesh position={[-0.13, 0, 0]} material={MAT_SKIN_MEDIUM}>
            <sphereGeometry args={[0.032, 8, 8]} />
          </mesh>
          <mesh position={[0.13, 0, 0]} material={MAT_SKIN_MEDIUM}>
            <sphereGeometry args={[0.032, 8, 8]} />
          </mesh>
          <mesh position={[0, 0.06, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.142, 14, 14]} />
          </mesh>
          <mesh position={[-0.09, 0.01, 0.06]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          <mesh position={[0.09, 0.01, 0.06]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.01, -0.14]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.075, 12, 12]} />
          </mesh>
          <mesh position={[0, -0.01, -0.11]} rotation={[Math.PI / 2, 0, 0]} material={MAT_WORKER_VEST_ORANGE}>
            <torusGeometry args={[0.065, 0.012, 8, 16]} />
          </mesh>
        </group>

        {/* Serving Arm & Articulated Ladle (Attached to Shoulder y = 0.47 relative to waist) */}
        <group ref={armRef} position={[0.22, 0.47, 0]}>
          <mesh position={[0, -0.2, 0.05]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.09, 0.42, 0.09]} />
          </mesh>
          <mesh position={[0, -0.42, 0.08]} material={MAT_SKIN_MEDIUM}>
            <sphereGeometry args={[0.04, 6, 6]} />
          </mesh>

          {/* Articulated Stainless Steel Serving Ladle */}
          <group ref={ladleRef} position={[0, -0.44, 0.12]}>
            <mesh position={[0, 0, 0.14]} rotation={[0.4, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.03, 0.015, 0.42]} />
            </mesh>
            <mesh position={[0, -0.06, 0.33]} material={MAT_FOOD_STAINLESS_TRAY}>
              <sphereGeometry args={[0.045, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            {hasFoodInLadle && (
              <mesh position={[0, -0.04, 0.33]} material={MAT_ADOBO}>
                <sphereGeometry args={[0.04, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
            )}
          </group>
        </group>

        {/* Left Arm (Attached to Shoulder y = 0.47 relative to waist) */}
        <group ref={leftArmRef} position={[-0.22, 0.47, 0]} rotation={[-0.5, 0.2, 0]}>
          <mesh position={[0, -0.2, 0.05]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.09, 0.42, 0.09]} />
          </mesh>
          <mesh position={[0, -0.42, 0.08]} material={MAT_SKIN_MEDIUM}>
            <sphereGeometry args={[0.04, 6, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── REALISTIC 4-PHASE CANTEEN ROUTINE WORKER (ORDER -> TRAY -> SIT & EAT -> STAND UP) ───
function CanteenRoutineWorker({
  seatPos = [-0.85, 0.0, 1.2],
  facingDir = -1,
  shiftOffset = 0,
  shirtColor = "#EA580C",
  skinTone = "MEDIUM",
}: {
  seatPos?: [number, number, number];
  facingDir?: number;
  shiftOffset?: number;
  shirtColor?: string;
  skinTone?: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);

  const [isCarryingTray, setIsCarryingTray] = React.useState(false);
  const [isSeated, setIsSeated] = React.useState(false);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() + shiftOffset) % 28.0;
    if (!groupRef.current) return;

    let curX = 0;
    let curZ = -5.5;
    let rotY = 0;
    let walking = false;
    let carrying = false;
    let seated = false;

    if (t < 6.0) {
      // Phase 1: Walking from entrance to food counter
      const p = t / 6.0;
      curX = 0;
      curZ = THREE.MathUtils.lerp(-5.5, 4.2, p);
      rotY = 0;
      walking = true;
      carrying = false;
      seated = false;
    } else if (t < 9.0) {
      // Phase 2: Standing at counter getting served
      curX = 0;
      curZ = 4.2;
      rotY = 0;
      walking = false;
      carrying = true;
      seated = false;
    } else if (t < 15.0) {
      // Phase 3: Walking with full food tray to designated dining seat
      const p = (t - 9.0) / 6.0;
      curX = THREE.MathUtils.lerp(0.0, seatPos[0], p);
      curZ = THREE.MathUtils.lerp(4.2, seatPos[2], p);
      rotY = Math.atan2(seatPos[0], seatPos[2] - 4.2);
      walking = true;
      carrying = true;
      seated = false;
    } else {
      // Phase 4: Seated on bench eating meal
      curX = seatPos[0];
      curZ = seatPos[2];
      rotY = facingDir > 0 ? Math.PI * 0.38 : -Math.PI * 0.38;
      walking = false;
      carrying = false;
      seated = true;
    }

    groupRef.current.position.set(curX, 0, curZ);
    groupRef.current.rotation.y = rotY;

    if (isCarryingTray !== carrying) setIsCarryingTray(carrying);
    if (isSeated !== seated) setIsSeated(seated);

    if (!seated) {
      const swing = walking ? Math.sin(t * 7.0) * 0.38 : 0;
      if (leftLegRef.current) leftLegRef.current.rotation.set(swing, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-swing, 0, 0);
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.set(-Math.PI / 2, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-Math.PI / 2, 0, 0);
    }

    if (seated && rightArmRef.current) {
      const eat = Math.sin(t * 2.0);
      rightArmRef.current.rotation.set(eat > 0 ? -1.2 : -0.6, 0, -0.2);
    } else if (carrying && rightArmRef.current && leftArmRef.current) {
      rightArmRef.current.rotation.set(-0.75, -0.2, 0);
      leftArmRef.current.rotation.set(-0.75, 0.2, 0);
    }
  });

  const skinMat =
    skinTone === "LIGHT"
      ? MAT_SKIN_LIGHT
      : skinTone === "BRONZE"
        ? MAT_SKIN_BRONZE
        : skinTone === "DEEP"
          ? MAT_SKIN_DEEP
          : MAT_SKIN_MEDIUM;
  const vestMat = shirtColor === "#EA580C" ? MAT_WORKER_VEST_ORANGE : MAT_WORKER_VEST_AMBER;

  return (
    <group ref={groupRef}>
      {/* Head Assembly with Volumetric 3D Filipino Facial Features */}
      <group position={[0, isSeated ? 0.96 : 1.48, 0]}>
        <mesh material={skinMat}>
          <sphereGeometry args={[0.12, 14, 14]} />
        </mesh>
        {/* Natural Clear Almond Eyes & Focused Irises */}
        <group position={[0, 0.015, 0.118]}>
          <mesh position={[-0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.026, 0.016, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.026, 0.016, 0.008]} />
          </mesh>
          <mesh position={[-0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.013, 0.013, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.013, 0.013, 0.008]} />
          </mesh>
          {/* Eye Catchlight Glint */}
          <mesh position={[-0.036, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.004, 0.004, 0.004]} />
          </mesh>
          <mesh position={[0.044, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.004, 0.004, 0.004]} />
          </mesh>
        </group>

        {/* Filipino Dark Eyebrows */}
        <mesh position={[-0.04, 0.044, 0.116]} rotation={[0, 0, 0.05]} material={MAT_FACE_EYEBROW}>
          <boxGeometry args={[0.032, 0.006, 0.008]} />
        </mesh>
        <mesh position={[0.04, 0.044, 0.116]} rotation={[0, 0, -0.05]} material={MAT_FACE_EYEBROW}>
          <boxGeometry args={[0.032, 0.006, 0.008]} />
        </mesh>

        {/* Prominent 3D Nose Bridge */}
        <mesh position={[0, -0.01, 0.120]} material={skinMat}>
          <boxGeometry args={[0.018, 0.028, 0.022]} />
        </mesh>

        {/* Warm Smiling Mouth & Lips */}
        <mesh position={[0, -0.052, 0.116]} material={MAT_FACE_LIPS}>
          <boxGeometry args={[0.036, 0.007, 0.008]} />
        </mesh>

        {/* 3D Ears with Helix Rim */}
        <mesh position={[-0.122, 0, 0]} rotation={[0, 0.05, -0.12]} material={skinMat}>
          <boxGeometry args={[0.016, 0.036, 0.024]} />
        </mesh>
        <mesh position={[0.122, 0, 0]} rotation={[0, -0.05, 0.12]} material={skinMat}>
          <boxGeometry args={[0.016, 0.036, 0.024]} />
        </mesh>

        {/* Short Dark Hair */}
        <mesh position={[0, 0.05, -0.01]} material={MAT_HAIR_BLACK}>
          <sphereGeometry args={[0.126, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        </mesh>
      </group>

      {/* Hard Hat on Head when walking in / ordering / leaving */}
      {!isSeated && (
        <group position={[0, 1.61, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.16, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#16A34A" roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.015, 0.08]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.22, 0.02, 0.12]} />
            <meshStandardMaterial color="#16A34A" roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.05, 0.14]}>
            <boxGeometry args={[0.045, 0.03, 0.01]} />
            <meshStandardMaterial color="#0284C7" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* Torso & Orange Safety Vest */}
      <mesh position={[0, isSeated ? 0.55 : 1.05, 0]} material={MAT_SHIRT_LONG_GREEN}>
        <boxGeometry args={[0.4, 0.54, 0.22]} />
      </mesh>
      <mesh position={[0, isSeated ? 0.56 : 1.06, 0]} material={vestMat}>
        <boxGeometry args={[0.42, 0.52, 0.24]} />
      </mesh>

      {/* Arms */}
      <group ref={leftArmRef} position={[-0.23, isSeated ? 0.74 : 1.25, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_LONG_GREEN}>
          <boxGeometry args={[0.1, 0.44, 0.1]} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.23, isSeated ? 0.74 : 1.25, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_LONG_GREEN}>
          <boxGeometry args={[0.1, 0.44, 0.1]} />
        </mesh>
        {isSeated && (
          <mesh position={[0, -0.44, 0.14]} rotation={[0.4, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.025, 0.01, 0.18]} />
          </mesh>
        )}
      </group>

      {/* Food Tray when carrying OR on table when seated */}
      {isCarryingTray && !isSeated && (
        <group position={[0, 1.0, 0.38]}>
          <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.42, 0.03, 0.3]} />
          </mesh>
          <mesh position={[-0.1, 0.025, 0]} material={MAT_GARLIC_RICE}>
            <sphereGeometry args={[0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0.1, 0.025, 0]} material={MAT_ADOBO}>
            <boxGeometry args={[0.15, 0.03, 0.15]} />
          </mesh>
        </group>
      )}

      {isSeated && (
        <group position={[0, 0.51, 0.72]}>
          <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.42, 0.02, 0.3]} />
          </mesh>
          <mesh position={[-0.1, 0.03, 0]} material={MAT_GARLIC_RICE}>
            <sphereGeometry args={[0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0.1, 0.025, 0]} material={MAT_ADOBO}>
            <boxGeometry args={[0.16, 0.035, 0.15]} />
          </mesh>
          <mesh position={[0.24, 0.07, 0.08]} material={MAT_GLASS_BLUE}>
            <cylinderGeometry args={[0.04, 0.03, 0.14, 10]} />
          </mesh>
        </group>
      )}

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.11, isSeated ? 0.35 : 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.11, isSeated ? 0.35 : 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── CANTEEN QUEUEING & TRAY CARRYING WORKERS ───
function CanteenTrayWalker({
  startPos = [0, 0, -6.0],
  endPos = [0, 0, 3.5],
  speed = 1.0,
  shift = 0,
}: {
  startPos?: [number, number, number];
  endPos?: [number, number, number];
  speed?: number;
  shift?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * speed + shift) % 16.0;
    if (!groupRef.current) return;

    const p = (Math.sin((t / 16.0) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const curX = THREE.MathUtils.lerp(startPos[0], endPos[0], p);
    const curZ = THREE.MathUtils.lerp(startPos[2], endPos[2], p);

    groupRef.current.position.set(curX, startPos[1], curZ);

    const heading = Math.atan2(endPos[0] - startPos[0], endPos[2] - startPos[2]);
    groupRef.current.rotation.y = p < 0.5 ? heading : heading + Math.PI;

    const swing = Math.sin(t * 7.0) * 0.38;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
  });

  return (
    <group ref={groupRef}>
      {/* Head Assembly with Authentic Female Filipino 3D Facial Features & Hairnet */}
      <group position={[0, 1.48, 0]}>
        <mesh material={MAT_SKIN_MEDIUM}>
          <sphereGeometry args={[0.12, 14, 14]} />
        </mesh>
        {/* Natural Clear Almond Eyes */}
        <group position={[0, 0.015, 0.118]}>
          <mesh position={[-0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.026, 0.016, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.026, 0.016, 0.008]} />
          </mesh>
          <mesh position={[-0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.013, 0.013, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.013, 0.013, 0.008]} />
          </mesh>
          <mesh position={[-0.036, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.004, 0.004, 0.004]} />
          </mesh>
          <mesh position={[0.044, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
            <boxGeometry args={[0.004, 0.004, 0.004]} />
          </mesh>
        </group>

        {/* Eyebrows */}
        <mesh position={[-0.04, 0.044, 0.116]} rotation={[0, 0, 0.05]} material={MAT_FACE_EYEBROW}>
          <boxGeometry args={[0.032, 0.006, 0.008]} />
        </mesh>
        <mesh position={[0.04, 0.044, 0.116]} rotation={[0, 0, -0.05]} material={MAT_FACE_EYEBROW}>
          <boxGeometry args={[0.032, 0.006, 0.008]} />
        </mesh>

        {/* 3D Nose Bridge */}
        <mesh position={[0, -0.01, 0.120]} material={MAT_SKIN_MEDIUM}>
          <boxGeometry args={[0.018, 0.028, 0.022]} />
        </mesh>

        {/* Warm Smiling Mouth & Lips */}
        <mesh position={[0, -0.052, 0.116]} material={MAT_FACE_LIPS}>
          <boxGeometry args={[0.036, 0.007, 0.008]} />
        </mesh>

        {/* Ears */}
        <mesh position={[-0.122, 0, 0]} rotation={[0, 0.05, -0.12]} material={MAT_SKIN_MEDIUM}>
          <boxGeometry args={[0.016, 0.036, 0.024]} />
        </mesh>
        <mesh position={[0.122, 0, 0]} rotation={[0, -0.05, 0.12]} material={MAT_SKIN_MEDIUM}>
          <boxGeometry args={[0.016, 0.036, 0.024]} />
        </mesh>

        {/* White Food Handler Sanitation Hairnet / Cap */}
        <mesh position={[0, 0.05, 0]} material={MAT_WHITE_PAINT}>
          <sphereGeometry args={[0.13, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        </mesh>
        {/* Hairnet Bun at back */}
        <mesh position={[0, 0.02, -0.14]} material={MAT_HAIR_BLACK}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
      </group>

      {/* Torso & Orange Safety Vest */}
      <mesh position={[0, 1.05, 0]} material={MAT_SHIRT_LONG_GREEN}>
        <boxGeometry args={[0.4, 0.54, 0.22]} />
      </mesh>
      <mesh position={[0, 1.06, 0]} material={MAT_WORKER_VEST_ORANGE}>
        <boxGeometry args={[0.42, 0.52, 0.24]} />
      </mesh>

      {/* Arms holding meal tray forward in front of chest */}
      <group position={[-0.23, 1.25, 0]} rotation={[-0.75, 0.2, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_LONG_GREEN}>
          <boxGeometry args={[0.1, 0.44, 0.1]} />
        </mesh>
      </group>
      <group position={[0.23, 1.25, 0]} rotation={[-0.75, -0.2, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_LONG_GREEN}>
          <boxGeometry args={[0.1, 0.44, 0.1]} />
        </mesh>
      </group>

      {/* Stainless Steel Meal Tray carried in hands */}
      <group position={[0, 1.0, 0.38]}>
        <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.45, 0.03, 0.32]} />
        </mesh>
        <mesh position={[-0.1, 0.025, 0]} material={MAT_GARLIC_RICE}>
          <sphereGeometry args={[0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0.1, 0.025, 0]} material={MAT_ADOBO}>
          <boxGeometry args={[0.15, 0.03, 0.15]} />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.11, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.11, 0.75, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── FOOD & COOKING MATERIALS ───
const MAT_ADOBO_SAUCE = new THREE.MeshStandardMaterial({ color: "#3A1E0D", roughness: 0.15, metalness: 0.1 });
const MAT_CHICKEN_MEAT = new THREE.MeshStandardMaterial({ color: "#B45309", roughness: 0.45 });
const MAT_PORK_BELLY = new THREE.MeshStandardMaterial({ color: "#78350F", roughness: 0.4 });
const MAT_SINIGANG_BROTH = new THREE.MeshStandardMaterial({ color: "#B45309", roughness: 0.15, transparent: true, opacity: 0.85 });
const MAT_GINATAAN_SAUCE = new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.35 });
const MAT_SQUASH_KALABASA = new THREE.MeshStandardMaterial({ color: "#F97316", roughness: 0.6 });
const MAT_STRING_BEANS = new THREE.MeshStandardMaterial({ color: "#16A34A", roughness: 0.65 });
const MAT_KANGKONG_GREEN = new THREE.MeshStandardMaterial({ color: "#15803D", roughness: 0.7 });
const MAT_SILING_HABA = new THREE.MeshStandardMaterial({ color: "#22C55E", roughness: 0.4 });
const MAT_JASMINE_RICE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.95 });
const MAT_GARLIC_RICE_TOASTED = new THREE.MeshStandardMaterial({ color: "#FEF08A", roughness: 0.9 });
const MAT_FRIED_TILAPIA = new THREE.MeshStandardMaterial({ color: "#A16207", roughness: 0.4, metalness: 0.1 });
const MAT_LPG_FLAME_BLUE = new THREE.MeshStandardMaterial({ color: "#0284C7", emissive: new THREE.Color("#06B6D4"), emissiveIntensity: 2.5 });
const MAT_LPG_FLAME_ORANGE = new THREE.MeshStandardMaterial({ color: "#F97316", emissive: new THREE.Color("#EA580C"), emissiveIntensity: 2.0 });
const MAT_WOOD_CHOPPING = new THREE.MeshStandardMaterial({ color: "#854D0E", roughness: 0.8 });
const MAT_CLEAVER_STEEL = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.15, metalness: 0.95 });
const MAT_DATU_PUTI_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.3 });
const MAT_DATU_PUTI_YELLOW = new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.3 });
const MAT_STEAM_PUFF = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, transparent: true, opacity: 0.35 });

// ─── ANIMATED RISING VOLUMETRIC STEAM PUFFS ───
function AnimatedCookingSteam({ height = 0.6, count = 4, speed = 1.0 }: { height?: number; count?: number; speed?: number }) {
  const puffsRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    if (!puffsRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime() * speed;
    puffsRef.current.children.forEach((child, i) => {
      const offset = (t + i * 1.2) % 2.5;
      const progress = offset / 2.5;
      child.position.y = height + progress * 0.55;
      child.position.x = Math.sin(t * 1.5 + i) * 0.04;
      child.position.z = Math.cos(t * 1.5 + i) * 0.04;
      const scale = 0.5 + progress * 1.2;
      child.scale.set(scale, scale, scale);
      (child as any).material = MAT_STEAM_PUFF;
    });
  });

  return (
    <group ref={puffsRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={`steam-${i}`} material={MAT_STEAM_PUFF}>
          <sphereGeometry args={[0.065, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// ─── PULSATING LPG GAS BURNER FLAME RING ───
function LpgGasBurnerFlame() {
  const flameRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    if (!flameRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    const flicker = Math.sin(t * 18.0) * 0.15 + 0.85;
    flameRef.current.scale.set(flicker, flicker, flicker);
  });

  return (
    <group ref={flameRef} position={[0, -0.02, 0]}>
      {/* Outer Blue LPG Flame Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT_LPG_FLAME_BLUE}>
        <torusGeometry args={[0.13, 0.018, 8, 16]} />
      </mesh>
      {/* Inner Orange Core Tips */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT_LPG_FLAME_ORANGE}>
        <torusGeometry args={[0.09, 0.012, 8, 12]} />
      </mesh>
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 1: CHICKEN & PORK ADOBO IN KAWALI ───
function SimmeringAdoboKawali() {
  const liquidRef = useRef<THREE.Mesh>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    if (!liquidRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    const ripple = Math.sin(t * 6.0) * 0.004;
    liquidRef.current.position.y = 0.04 + ripple;
  });

  return (
    <group position={[0, 0.12, 0]}>
      <LpgGasBurnerFlame />
      {/* Heavy Seasoned Iron Wok ("Kawali") */}
      <mesh material={MAT_STEEL_DARK}>
        <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2.2]} />
      </mesh>
      {/* Wok Dual Wooden Grip Handles */}
      <mesh position={[-0.23, 0.06, 0]} rotation={[0, 0, 0.2]} material={MAT_WOOD_CHOPPING}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
      </mesh>
      <mesh position={[0.23, 0.06, 0]} rotation={[0, 0, -0.2]} material={MAT_WOOD_CHOPPING}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
      </mesh>
      {/* Simmering Glossy Dark Soy-Vinegar Adobo Sauce */}
      <mesh ref={liquidRef} position={[0, 0.04, 0]} material={MAT_ADOBO_SAUCE}>
        <cylinderGeometry args={[0.18, 0.12, 0.04, 16]} />
      </mesh>
      {/* 4 Seared Chicken Cuts (Drumsticks & Thighs) */}
      {[
        [-0.06, 0.07, -0.05, 0.4],
        [0.07, 0.07, -0.04, -0.3],
        [-0.05, 0.07, 0.06, 0.8],
        [0.06, 0.07, 0.05, -0.7],
      ].map(([x, y, z, rot], idx) => (
        <group key={`adobo-chick-${idx}`} position={[x, y, z]} rotation={[0, rot, 0.2]}>
          <mesh material={MAT_CHICKEN_MEAT}>
            <capsuleGeometry args={[0.028, 0.06, 6, 8]} />
          </mesh>
        </group>
      ))}
      {/* 5 Glazed Pork Belly Cubes */}
      {[
        [0, 0.07, 0],
        [-0.08, 0.065, 0.01],
        [0.08, 0.065, 0.01],
        [0.01, 0.065, -0.08],
        [0.01, 0.065, 0.08],
      ].map(([x, y, z], idx) => (
        <mesh key={`adobo-pork-${idx}`} position={[x, y, z]} material={MAT_PORK_BELLY}>
          <boxGeometry args={[0.04, 0.035, 0.04]} />
        </mesh>
      ))}
      {/* Laurel Bay Leaves & Whole Peppercorns */}
      <mesh position={[-0.03, 0.075, 0.02]} rotation={[0, 0.5, 0.1]} material={MAT_KANGKONG_GREEN}>
        <boxGeometry args={[0.045, 0.002, 0.07]} />
      </mesh>
      <mesh position={[0.04, 0.075, -0.03]} rotation={[0, -0.8, -0.1]} material={MAT_KANGKONG_GREEN}>
        <boxGeometry args={[0.045, 0.002, 0.07]} />
      </mesh>
      {/* Roasted Garlic Cloves */}
      <mesh position={[0.02, 0.075, 0.04]} material={MAT_GARLIC_RICE_TOASTED}>
        <sphereGeometry args={[0.014, 6, 6]} />
      </mesh>
      {/* Billowing Steam Effect */}
      <AnimatedCookingSteam height={0.12} speed={1.2} />
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 2: SINIGANG NA BABOY / BANGUS IN CALDERO ───
function BoilingSinigangCaldero() {
  const liquidRef = useRef<THREE.Mesh>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    if (!liquidRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    const ripple = Math.sin(t * 7.5) * 0.005;
    liquidRef.current.position.y = 0.12 + ripple;
  });

  return (
    <group position={[0, 0.14, 0]}>
      <LpgGasBurnerFlame />
      {/* Deep Commercial Aluminum Caldero */}
      <mesh material={MAT_FOOD_STAINLESS_TRAY}>
        <cylinderGeometry args={[0.20, 0.18, 0.26, 16]} />
      </mesh>
      {/* Caldero Cast Aluminum Side Handles */}
      <mesh position={[-0.21, 0.08, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[0.04, 0.02, 0.08]} />
      </mesh>
      <mesh position={[0.21, 0.08, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[0.04, 0.02, 0.08]} />
      </mesh>
      {/* Simmering Tamarind Sour Broth */}
      <mesh ref={liquidRef} position={[0, 0.12, 0]} material={MAT_SINIGANG_BROTH}>
        <cylinderGeometry args={[0.19, 0.17, 0.03, 16]} />
      </mesh>
      {/* Floating Pork Ribs / Cuts */}
      {[-0.06, 0.06].map((x, idx) => (
        <mesh key={`sini-pork-${idx}`} position={[x, 0.13, 0.02]} material={MAT_PORK_BELLY}>
          <boxGeometry args={[0.05, 0.04, 0.06]} />
        </mesh>
      ))}
      {/* Sayote / Radish Slices (Pale Green) */}
      <mesh position={[0.04, 0.135, -0.06]} rotation={[0.2, 0, 0]} material={MAT_SILING_HABA}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
      </mesh>
      {/* Fresh Kangkong Leafy Greens */}
      <mesh position={[-0.05, 0.135, -0.05]} rotation={[0.3, 0.5, 0]} material={MAT_KANGKONG_GREEN}>
        <boxGeometry args={[0.06, 0.005, 0.08]} />
      </mesh>
      {/* Long Green Chili (Siling Haba) */}
      <mesh position={[0, 0.138, 0.06]} rotation={[0, 0.4, 0.1]} material={MAT_SILING_HABA}>
        <capsuleGeometry args={[0.012, 0.08, 6, 8]} />
      </mesh>
      {/* Tomato Wedges (Red) */}
      <mesh position={[-0.02, 0.136, 0.02]} material={MAT_DATU_PUTI_RED}>
        <sphereGeometry args={[0.022, 6, 6, 0, Math.PI]} />
      </mesh>
      {/* Billowing Steam */}
      <AnimatedCookingSteam height={0.18} speed={1.4} />
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 3: GINATAANG KALABASA AT SITAW IN KAWALI ───
function GinataangKalabasaKawali() {
  return (
    <group position={[0, 0.12, 0]}>
      <LpgGasBurnerFlame />
      {/* Heavy Wok */}
      <mesh castShadow material={MAT_STEEL_DARK}>
        <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2.2]} />
      </mesh>
      {/* Creamy Golden Coconut Milk Stew */}
      <mesh position={[0, 0.04, 0]} material={MAT_GINATAAN_SAUCE}>
        <cylinderGeometry args={[0.18, 0.12, 0.04, 16]} />
      </mesh>
      {/* Bright Orange Kalabasa Squash Cubes */}
      {[
        [-0.06, 0.06, -0.04],
        [0.05, 0.06, -0.05],
        [-0.04, 0.06, 0.05],
        [0.06, 0.06, 0.04],
        [0, 0.065, 0],
      ].map(([x, y, z], idx) => (
        <mesh key={`kalabasa-${idx}`} position={[x, y, z]} material={MAT_SQUASH_KALABASA}>
          <boxGeometry args={[0.04, 0.035, 0.04]} />
        </mesh>
      ))}
      {/* Cut Green Sitaw (Yardlong String Beans) */}
      {[
        [-0.02, 0.07, -0.07, 0.5],
        [0.03, 0.07, 0.06, -0.4],
        [-0.08, 0.07, 0.01, 1.2],
        [0.08, 0.07, -0.01, -1.0],
      ].map(([x, y, z, rot], idx) => (
        <mesh key={`sitaw-${idx}`} position={[x, y, z]} rotation={[0, rot, 0]} material={MAT_STRING_BEANS}>
          <capsuleGeometry args={[0.01, 0.06, 4, 6]} />
        </mesh>
      ))}
      <AnimatedCookingSteam height={0.12} speed={1.1} />
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 4: STEAMED JASMINE RICE IN OPEN CALDERO ───
function SteamedJasmineRiceCaldero() {
  return (
    <group position={[0, 0.16, 0]}>
      {/* Heavy Commercial Aluminum Rice Caldero */}
      <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
        <cylinderGeometry args={[0.22, 0.20, 0.32, 16]} />
      </mesh>
      {/* Mounded Fluffy White Steamed Jasmine Rice */}
      <mesh position={[0, 0.14, 0]} material={MAT_JASMINE_RICE}>
        <sphereGeometry args={[0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
      </mesh>
      {/* Fluffy textured rice relief mounds */}
      {[-0.07, 0.07].map((x, idx) => (
        <mesh key={`rice-peak-${idx}`} position={[x, 0.17, (idx % 2 === 0 ? 0.04 : -0.04)]} material={MAT_JASMINE_RICE}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
      ))}
      {/* Propped Lid Leaning against side */}
      <group position={[0.28, -0.02, 0.12]} rotation={[0.4, 0, 0.8]}>
        <mesh material={MAT_FOOD_STAINLESS_TRAY}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 14]} />
        </mesh>
        <mesh position={[0, 0.03, 0]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
        </mesh>
      </group>
      {/* Heavy Billowing Rice Steam */}
      <AnimatedCookingSteam height={0.22} count={6} speed={1.5} />
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 5: GARLIC FRIED RICE (SINANGAG) ───
function GarlicFriedRicePan() {
  return (
    <group position={[0, 0.10, 0]}>
      <LpgGasBurnerFlame />
      {/* Wide Shallow Sauté Pan */}
      <mesh castShadow material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.22, 0.20, 0.08, 16]} />
      </mesh>
      {/* Golden Garlic Rice Mounded */}
      <mesh position={[0, 0.03, 0]} material={MAT_GARLIC_RICE_TOASTED}>
        <cylinderGeometry args={[0.20, 0.18, 0.05, 14]} />
      </mesh>
      {/* Toasted Crispy Garlic Bits */}
      {[
        [-0.06, 0.06, -0.04],
        [0.05, 0.06, -0.05],
        [-0.04, 0.06, 0.05],
        [0.06, 0.06, 0.04],
      ].map(([x, y, z], idx) => (
        <mesh key={`toasted-g-${idx}`} position={[x, y, z]} material={MAT_CHICKEN_MEAT}>
          <sphereGeometry args={[0.012, 4, 4]} />
        </mesh>
      ))}
      <AnimatedCookingSteam height={0.10} speed={1.0} />
    </group>
  );
}

// ─── AUTHENTIC PHILIPPINES DISH 6: CRISPY FRIED TILAPIA & FISH ───
function CrispyFriedTilapiaPan() {
  return (
    <group position={[0, 0.10, 0]}>
      <LpgGasBurnerFlame />
      {/* Wide Iron Skillet */}
      <mesh castShadow material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.22, 0.20, 0.08, 16]} />
      </mesh>
      {/* Crispy Golden Tilapia Fish */}
      <mesh position={[0, 0.04, 0]} rotation={[0, 0.2, 0]} material={MAT_CHICKEN_MEAT}>
        <boxGeometry args={[0.28, 0.04, 0.10]} />
      </mesh>
      <AnimatedCookingSteam height={0.12} speed={1.1} />
    </group>
  );
}

// ─── HIGH-LUMEN INDUSTRIAL OVERHEAD KITCHEN DUAL-TUBE LED FIXTURE ───
function IndustrialKitchenOverheadLedFixture({ position = [0, 3.35, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Heavy Steel Suspension Cables */}
      <mesh position={[-0.45, 0.25, 0]} material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.006, 0.006, 0.5, 6]} />
      </mesh>
      <mesh position={[0.45, 0.25, 0]} material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.006, 0.006, 0.5, 6]} />
      </mesh>
      {/* Industrial White Steel Reflector Canopy */}
      <mesh position={[0, 0.02, 0]} material={MAT_WHITE_PAINT}>
        <boxGeometry args={[1.2, 0.06, 0.28]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[1.15, 0.04, 0.2]} />
      </mesh>
      {/* Dual Emissive High-CRI LED Glass Tubes */}
      <mesh position={[0, -0.02, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 1.12, 10]} />
        <meshStandardMaterial color="#FFFBEB" emissive={new THREE.Color("#FEF3C7")} emissiveIntensity={3.6} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.02, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 1.12, 10]} />
        <meshStandardMaterial color="#FFFBEB" emissive={new THREE.Color("#FEF3C7")} emissiveIntensity={3.6} roughness={0.1} />
      </mesh>
      {/* Warm Golden High-Lumen Downward Light Cone */}
      <pointLight position={[0, -0.15, 0]} color="#FEF3C7" intensity={3.6} distance={13.5} decay={1.15} />
    </group>
  );
}

// ─── OSCILLATING INDUSTRIAL ELECTRIC STAND FAN ───
function OscillatingElectricStandFan({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const headRef = useRef<THREE.Group>(null);
  const bladesRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.9) * 0.62;
    }
    if (bladesRef.current) {
      bladesRef.current.rotation.z = t * 32.0;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy Circular Cast Iron Base */}
      <mesh position={[0, 0.03, 0]} material={MAT_ASPHALT_DARK}>
        <cylinderGeometry args={[0.22, 0.24, 0.06, 16]} />
      </mesh>
      {/* Telescopic Steel Stand Pole */}
      <mesh position={[0, 0.65, 0]} material={MAT_CHROME}>
        <cylinderGeometry args={[0.018, 0.022, 1.2, 10]} />
      </mesh>
      {/* Height Adjustment Screw Collar */}
      <mesh position={[0, 0.75, 0]} material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.028, 0.028, 0.08, 8]} />
      </mesh>

      {/* Oscillating Motor Head & Fan Cage */}
      <group ref={headRef} position={[0, 1.26, 0]}>
        {/* Motor Housing */}
        <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]} material={MAT_ASPHALT_DARK}>
          <cylinderGeometry args={[0.065, 0.075, 0.16, 12]} />
        </mesh>
        {/* Wire Guard Front & Rear Grill */}
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_FRAME}>
          <cylinderGeometry args={[0.24, 0.24, 0.06, 16]} />
        </mesh>
        {/* Central SCIC Fan Hub Badge */}
        <mesh position={[0, 0, 0.06]} material={MAT_SIGNBOARD_TEAL}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
        </mesh>
        {/* Spinning 3-Blade Impeller */}
        <group ref={bladesRef} position={[0, 0, 0.02]}>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
            <mesh key={`blade-${i}`} position={[Math.sin(angle) * 0.1, Math.cos(angle) * 0.1, 0]} rotation={[0, 0, -angle + 0.3]} material={MAT_GLASS_BLUE}>
              <boxGeometry args={[0.06, 0.16, 0.008]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// ─── RETRO TRANSISTOR AM/FM RADIO / BLUETOOTH SPEAKER ───
function TabletopTransistorRadio({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Woodgrain / Slate Radio Body */}
      <mesh material={MAT_BAMBOO_TIMBER}>
        <boxGeometry args={[0.24, 0.14, 0.10]} />
      </mesh>
      {/* Speaker Grill */}
      <mesh position={[-0.04, 0, 0.052]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.12, 0.10, 0.01]} />
      </mesh>
      {/* Tuning Dial & Knobs */}
      <mesh position={[0.06, 0.03, 0.054]} material={MAT_CHROME}>
        <cylinderGeometry args={[0.018, 0.018, 0.01, 8]} />
      </mesh>
      <mesh position={[0.06, -0.03, 0.054]} material={MAT_CHROME}>
        <cylinderGeometry args={[0.014, 0.014, 0.01, 8]} />
      </mesh>
      {/* Glowing Green Power / Tuning Indicator LED */}
      <mesh position={[0.06, 0, 0.054]}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshStandardMaterial color="#22C55E" emissive={new THREE.Color("#4ADE80")} emissiveIntensity={3.0} />
      </mesh>
      {/* Telescopic Antenna */}
      <mesh position={[-0.09, 0.15, -0.03]} rotation={[0.1, 0, -0.2]} material={MAT_CHROME}>
        <cylinderGeometry args={[0.003, 0.004, 0.22, 6]} />
      </mesh>
    </group>
  );
}

// ─── 1. KUYA JUN: SITTING ON MONOBLOC STOOL BROWSING SMARTPHONE ───
function NighttimeSmartphoneWorker({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const phoneGlowRef = useRef<THREE.PointLight>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    // Head tilts down inspecting smartphone with subtle micro-motions
    if (headRef.current) {
      headRef.current.rotation.set(0.32 + Math.sin(t * 1.8) * 0.03, Math.sin(t * 0.7) * 0.05, 0);
    }
    // Right thumb scrolls, arm adjusts
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(-1.15 + Math.sin(t * 4.0) * 0.02, -0.22, 0.18);
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(-1.12, 0.22, -0.18);
    }
    // Pulsing soft blue phone screen glow reflection
    if (phoneGlowRef.current) {
      phoneGlowRef.current.intensity = 0.85 + Math.sin(t * 8.0) * 0.12;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Classic Filipino Blue Plastic Monobloc Stool ("Bangkito") */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.40, 0]} material={MAT_MONOBLOC_STOOL_BLUE}>
          <boxGeometry args={[0.34, 0.04, 0.34]} />
        </mesh>
        {/* Stool Center Finger Grip Slot */}
        <mesh position={[0, 0.421, 0]} material={MAT_ASPHALT_DARK}>
          <boxGeometry args={[0.10, 0.002, 0.03]} />
        </mesh>
        {/* 4 Angled Stool Legs */}
        {[-0.13, 0.13].map((x, xi) =>
          [-0.13, 0.13].map((z, zi) => (
            <mesh key={`stool-leg-${xi}-${zi}`} position={[x, 0.20, z]} rotation={[z * 0.3, 0, -x * 0.3]} material={MAT_MONOBLOC_STOOL_BLUE}>
              <boxGeometry args={[0.035, 0.40, 0.035]} />
            </mesh>
          ))
        )}
      </group>

      {/* Seated Worker in White Sando & Basketball Shorts */}
      <group position={[0, 0.42, 0]}>
        {/* Seated Legs with Knee Bend */}
        <group position={[-0.11, 0, 0]}>
          <mesh position={[0, 0.06, 0.18]} material={MAT_SHORTS_BASKETBALL_BLUE}>
            <boxGeometry args={[0.13, 0.12, 0.36]} />
          </mesh>
          <mesh position={[0, -0.22, 0.34]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.10, 0.36, 0.10]} />
          </mesh>
          <mesh position={[0, -0.41, 0.36]} material={MAT_TSINELAS_RUBBER}>
            <boxGeometry args={[0.11, 0.02, 0.24]} />
          </mesh>
        </group>
        <group position={[0.11, 0, 0]}>
          <mesh position={[0, 0.06, 0.18]} material={MAT_SHORTS_BASKETBALL_BLUE}>
            <boxGeometry args={[0.13, 0.12, 0.36]} />
          </mesh>
          <mesh position={[0, -0.22, 0.34]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.10, 0.36, 0.10]} />
          </mesh>
          <mesh position={[0, -0.41, 0.36]} material={MAT_TSINELAS_RUBBER}>
            <boxGeometry args={[0.11, 0.02, 0.24]} />
          </mesh>
        </group>

        {/* Torso in White Sando Undershirt */}
        <group position={[0, 0.32, 0]}>
          <mesh material={MAT_SANDO_WHITE}>
            <boxGeometry args={[0.34, 0.46, 0.20]} />
          </mesh>
          <mesh position={[0, 0.21, 0.01]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.22, 0.06, 0.19]} />
          </mesh>

          {/* Head & Natural Hair */}
          <group ref={headRef} position={[0, 0.48, 0.02]}>
            <mesh material={MAT_SKIN_MEDIUM}>
              <boxGeometry args={[0.20, 0.20, 0.20]} />
            </mesh>
            <mesh position={[0, -0.09, 0.02]} material={MAT_SKIN_MEDIUM}>
              <boxGeometry args={[0.14, 0.07, 0.14]} />
            </mesh>
            {/* Natural Messy Filipino Hair */}
            <mesh position={[0, 0.08, -0.01]} material={MAT_HAIR_BLACK}>
              <sphereGeometry args={[0.122, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
            </mesh>
            {/* Eyes looking down at screen */}
            <mesh position={[-0.045, 0.01, 0.102]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.02, 0.016, 0.005]} />
            </mesh>
            <mesh position={[0.045, 0.01, 0.102]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.02, 0.016, 0.005]} />
            </mesh>
            {/* Nose & Lips */}
            <mesh position={[0, -0.02, 0.11]} material={MAT_SKIN_MEDIUM}>
              <boxGeometry args={[0.025, 0.04, 0.02]} />
            </mesh>
            <mesh position={[0, -0.06, 0.104]} material={MAT_FACE_LIPS}>
              <boxGeometry args={[0.04, 0.01, 0.008]} />
            </mesh>
          </group>

          {/* Left Arm holding phone */}
          <group ref={leftArmRef} position={[-0.20, 0.18, 0]}>
            <mesh position={[0, -0.16, 0]} material={MAT_SKIN_MEDIUM}>
              <boxGeometry args={[0.08, 0.36, 0.08]} />
            </mesh>
          </group>

          {/* Right Arm holding phone & scrolling */}
          <group ref={rightArmRef} position={[0.20, 0.18, 0]}>
            <mesh position={[0, -0.16, 0]} material={MAT_SKIN_MEDIUM}>
              <boxGeometry args={[0.08, 0.36, 0.08]} />
            </mesh>
          </group>

          {/* 📱 Held Smartphone with Glowing Blue Screen */}
          <group position={[0, 0.06, 0.28]} rotation={[-0.45, 0, 0]}>
            <mesh material={MAT_PHONE_BODY}>
              <boxGeometry args={[0.09, 0.17, 0.012]} />
            </mesh>
            <mesh position={[0, 0, 0.007]} material={MAT_PHONE_SCREEN_GLOW}>
              <planeGeometry args={[0.082, 0.155]} />
            </mesh>
            <pointLight ref={phoneGlowRef} position={[0, 0.04, 0.08]} color="#38BDF8" intensity={0.9} distance={1.4} />
          </group>
        </group>
      </group>
    </group>
  );
}

// ─── 2. KUYA LARRY: SMOKING CIGARETTE ("YOSI BREAK") BY THE BREEZEWAY WALL ───
function NighttimeSmokingWorker({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const smokePuffRef = useRef<THREE.Group>(null);
  const cherryLightRef = useRef<THREE.PointLight>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime() % 14.0;

    if (t < 4.5) {
      // Phase 1: Resting arm down at side, holding cigarette
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.25, -0.15, 0.1);
      if (headRef.current) headRef.current.rotation.set(0, 0.1, 0);
      if (cherryLightRef.current) cherryLightRef.current.intensity = 0.4;
      if (smokePuffRef.current) smokePuffRef.current.visible = false;
    } else if (t < 7.0) {
      // Phase 2: Lifting cigarette to mouth
      const p = (t - 4.5) / 2.5;
      if (rightArmRef.current) rightArmRef.current.rotation.set(THREE.MathUtils.lerp(-0.25, -1.45, p), -0.2, 0.15);
      if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(0, -0.12, p), 0.05, 0);
      if (cherryLightRef.current) cherryLightRef.current.intensity = THREE.MathUtils.lerp(0.4, 1.4, p);
      if (smokePuffRef.current) smokePuffRef.current.visible = false;
    } else if (t < 9.5) {
      // Phase 3: Inhaling puff (cherry glows red hot)
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.45, -0.2, 0.15);
      if (headRef.current) headRef.current.rotation.set(-0.12, 0.05, 0);
      if (cherryLightRef.current) cherryLightRef.current.intensity = 1.6 + Math.sin(clock.getElapsedTime() * 12.0) * 0.3;
      if (smokePuffRef.current) smokePuffRef.current.visible = false;
    } else {
      // Phase 4: Lowering arm and exhaling subtle smoke wisps
      const p = (t - 9.5) / 4.5;
      if (rightArmRef.current) rightArmRef.current.rotation.set(THREE.MathUtils.lerp(-1.45, -0.25, p), -0.15, 0.1);
      if (headRef.current) headRef.current.rotation.set(THREE.MathUtils.lerp(-0.12, 0, p), 0.1, 0);
      if (cherryLightRef.current) cherryLightRef.current.intensity = THREE.MathUtils.lerp(1.4, 0.4, p);
      if (smokePuffRef.current) {
        smokePuffRef.current.visible = true;
        smokePuffRef.current.position.y = 1.42 + p * 0.4;
        smokePuffRef.current.position.z = 0.15 + p * 0.25;
        smokePuffRef.current.scale.set(0.6 + p * 1.5, 0.6 + p * 1.5, 0.6 + p * 1.5);
      }
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Bipedal Standing Legs in Green Plaid Pajama Pants */}
      <mesh position={[-0.10, 0.38, 0]} material={MAT_PAJAMA_PLAID}>
        <boxGeometry args={[0.13, 0.76, 0.14]} />
      </mesh>
      <mesh position={[0.10, 0.38, 0]} material={MAT_PAJAMA_PLAID}>
        <boxGeometry args={[0.13, 0.76, 0.14]} />
      </mesh>
      {/* Red Tsinelas */}
      <mesh position={[-0.10, 0.015, 0.04]} material={MAT_TSINELAS_RED}>
        <boxGeometry args={[0.11, 0.03, 0.24]} />
      </mesh>
      <mesh position={[0.10, 0.015, 0.04]} material={MAT_TSINELAS_RED}>
        <boxGeometry args={[0.11, 0.03, 0.24]} />
      </mesh>

      {/* Torso in Grey Sando */}
      <group position={[0, 0.98, 0]}>
        <mesh material={MAT_SANDO_GREY}>
          <boxGeometry args={[0.36, 0.48, 0.22]} />
        </mesh>
        <mesh position={[0, 0.22, 0.01]} material={MAT_SKIN_BRONZE}>
          <boxGeometry args={[0.24, 0.06, 0.21]} />
        </mesh>

        {/* Head & Features */}
        <group ref={headRef} position={[0, 0.50, 0.02]}>
          <mesh material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.21, 0.21, 0.21]} />
          </mesh>
          <mesh position={[0, -0.09, 0.02]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.15, 0.07, 0.15]} />
          </mesh>
          <mesh position={[0, 0.08, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.124, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          </mesh>
          <mesh position={[-0.048, 0.01, 0.108]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.02, 0.016, 0.005]} />
          </mesh>
          <mesh position={[0.048, 0.01, 0.108]} material={MAT_FACE_EYE_IRIS}>
            <boxGeometry args={[0.02, 0.016, 0.005]} />
          </mesh>
          <mesh position={[0, -0.035, 0.118]} material={MAT_MUSTACHE_BLACK}>
            <boxGeometry args={[0.08, 0.018, 0.012]} />
          </mesh>
        </group>

        {/* Left Arm casually resting on breezeway half-wall */}
        <group position={[-0.22, 0.20, 0]} rotation={[-0.6, 0.2, 0]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.085, 0.38, 0.085]} />
          </mesh>
        </group>

        {/* Right Arm Holding Cigarette */}
        <group ref={rightArmRef} position={[0.22, 0.20, 0]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.085, 0.38, 0.085]} />
          </mesh>
          {/* Held Cigarette */}
          <group position={[0, -0.38, 0.06]} rotation={[0.6, 0, 0]}>
            <mesh position={[0, 0, 0]} material={MAT_CIGARETTE_FILTER}>
              <cylinderGeometry args={[0.006, 0.006, 0.02, 6]} />
            </mesh>
            <mesh position={[0, 0.035, 0]} material={MAT_CIGARETTE_BODY}>
              <cylinderGeometry args={[0.006, 0.006, 0.05, 6]} />
            </mesh>
            <mesh position={[0, 0.065, 0]} material={MAT_CIGARETTE_TIP_GLOW}>
              <cylinderGeometry args={[0.006, 0.006, 0.01, 6]} />
            </mesh>
            <pointLight ref={cherryLightRef} position={[0, 0.07, 0]} color="#EF4444" intensity={0.5} distance={1.0} />
          </group>
        </group>

        {/* Exhaled Rising Smoke Wisps */}
        <group ref={smokePuffRef} position={[0, 0.44, 0.16]}>
          <mesh material={MAT_STEAM_PUFF}>
            <sphereGeometry args={[0.05, 6, 6]} />
          </mesh>
          <mesh position={[0.02, 0.04, 0.03]} material={MAT_STEAM_PUFF}>
            <sphereGeometry args={[0.035, 6, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── 3. MANG NOEL & KUYA DENNIS: KWUNTUHAN OVER 3-IN-1 COFFEE & CRACKERS ───
function NighttimeKwuntuhanDuo({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const arm1Ref = useRef<THREE.Group>(null);
  const head1Ref = useRef<THREE.Group>(null);
  const arm2Ref = useRef<THREE.Group>(null);
  const head2Ref = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();

    // Person 1 (Mang Noel): Talking with hand gestures, sipping coffee
    if (arm1Ref.current) {
      const talkMotion = Math.sin(t * 3.2);
      arm1Ref.current.rotation.set(-0.75 + talkMotion * 0.18, talkMotion * 0.25, -0.1);
    }
    if (head1Ref.current) {
      head1Ref.current.rotation.set(Math.sin(t * 2.0) * 0.08, Math.sin(t * 1.2) * 0.15, 0);
    }

    // Person 2 (Kuya Dennis): Nodding in agreement, laughing lean-back
    if (arm2Ref.current) {
      arm2Ref.current.rotation.set(-0.65 + Math.sin(t * 1.5) * 0.1, -0.1, 0.1);
    }
    if (head2Ref.current) {
      head2Ref.current.rotation.set(0.12 + Math.sin(t * 4.5) * 0.06, Math.cos(t * 1.2) * 0.12, 0);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Rustic Wooden Coffee Table */}
      <mesh position={[0, 0.42, 0]} material={MAT_BAMBOO_TIMBER}>
        <boxGeometry args={[0.9, 0.06, 0.7]} />
      </mesh>
      {/* Table Legs */}
      {[-0.38, 0.38].map((x, xi) =>
        [-0.28, 0.28].map((z, zi) => (
          <mesh key={`tab-leg-${xi}-${zi}`} position={[x, 0.20, z]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.04, 0.40, 0.04]} />
          </mesh>
        ))
      )}

      {/* Table Props: Steaming 3-in-1 Coffee Mugs, Thermos Flask & Biscuit Tin */}
      <group position={[0, 0.46, 0]}>
        {/* Red Thermos Flask */}
        <mesh position={[0, 0.14, 0]} material={MAT_THERMOS_FLASK}>
          <cylinderGeometry args={[0.06, 0.065, 0.28, 12]} />
        </mesh>
        <mesh position={[0, 0.29, 0]} material={MAT_CHROME}>
          <cylinderGeometry args={[0.035, 0.04, 0.04, 8]} />
        </mesh>
        {/* Mug 1 (Mang Noel) */}
        <mesh position={[-0.22, 0.05, 0.12]} material={MAT_COFFEE_MUG}>
          <cylinderGeometry args={[0.035, 0.03, 0.10, 10]} />
        </mesh>
        {/* Mug 2 (Kuya Dennis) */}
        <mesh position={[0.22, 0.05, -0.12]} material={MAT_COFFEE_MUG}>
          <cylinderGeometry args={[0.035, 0.03, 0.10, 10]} />
        </mesh>
        {/* SkyFlakes / Fita Cracker Tin */}
        <mesh position={[0.18, 0.04, 0.14]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.14, 0.08, 0.14]} />
        </mesh>
      </group>

      {/* ── MANG NOEL (SEATED ON LEFT, FACING +X) ── */}
      <group position={[-0.55, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.22, 0]} material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[0.32, 0.04, 0.32]} />
        </mesh>
        <mesh position={[0, 0.10, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.24, 0.20, 0.24]} />
        </mesh>
        {/* Seated Body in Red Sando & Denim Shorts */}
        <mesh position={[-0.09, 0.26, 0.14]} material={MAT_SHORTS_DENIM}>
          <boxGeometry args={[0.12, 0.10, 0.32]} />
        </mesh>
        <mesh position={[0.09, 0.26, 0.14]} material={MAT_SHORTS_DENIM}>
          <boxGeometry args={[0.12, 0.10, 0.32]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} material={MAT_SANDO_RED}>
          <boxGeometry args={[0.34, 0.44, 0.20]} />
        </mesh>
        <group ref={head1Ref} position={[0, 0.98, 0]}>
          <mesh material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.20, 0.20, 0.20]} />
          </mesh>
          <mesh position={[0, 0.07, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          </mesh>
        </group>
        <group ref={arm1Ref} position={[0.19, 0.68, 0]}>
          <mesh position={[0, -0.16, 0]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.08, 0.32, 0.08]} />
          </mesh>
        </group>
      </group>

      {/* ── KUYA DENNIS (SEATED ON RIGHT, FACING -X) ── */}
      <group position={[0.55, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.22, 0]} material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[0.32, 0.04, 0.32]} />
        </mesh>
        <mesh position={[0, 0.10, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.24, 0.20, 0.24]} />
        </mesh>
        {/* Seated Body in Black Tank & Grey Pajamas */}
        <mesh position={[-0.09, 0.26, 0.14]} material={MAT_PAJAMA_GREY}>
          <boxGeometry args={[0.12, 0.10, 0.32]} />
        </mesh>
        <mesh position={[0.09, 0.26, 0.14]} material={MAT_PAJAMA_GREY}>
          <boxGeometry args={[0.12, 0.10, 0.32]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} material={MAT_SANDO_BLACK}>
          <boxGeometry args={[0.34, 0.44, 0.20]} />
        </mesh>
        <group ref={head2Ref} position={[0, 0.98, 0]}>
          <mesh material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.20, 0.20, 0.20]} />
          </mesh>
          <mesh position={[0, 0.07, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          </mesh>
        </group>
        <group ref={arm2Ref} position={[-0.19, 0.68, 0]}>
          <mesh position={[0, -0.16, 0]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.08, 0.32, 0.08]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── 4. KUYA MAR: WASHING CLOTHES ("LABADA") AT THE WATER TROUGH ───
function NighttimeLaundryWorker({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    const scrub = Math.sin(t * 5.5);
    if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85 + scrub * 0.22, 0.1, -0.15);
    if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85 - scrub * 0.22, -0.1, 0.15);
    if (torsoRef.current) torsoRef.current.rotation.set(0.18 + scrub * 0.04, 0, 0);
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Plastic Wash Basin ("Batya") & Wooden Washboard ("Kuskusan") */}
      <group position={[0, 0.36, 0.45]}>
        <mesh material={MAT_BATYA_PLASTIC}>
          <cylinderGeometry args={[0.32, 0.26, 0.22, 16]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={MAT_SOAP_SUDS}>
          <cylinderGeometry args={[0.30, 0.30, 0.04, 16]} />
        </mesh>
        <mesh position={[0, 0.08, -0.06]} rotation={[0.45, 0, 0]} material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[0.22, 0.36, 0.03]} />
        </mesh>
        <mesh position={[0.26, 0.12, 0]} material={MAT_TSINELAS_RED}>
          <cylinderGeometry args={[0.045, 0.04, 0.08, 8]} />
        </mesh>
      </group>

      {/* Laundry Line with Hanging Clothes next to worker */}
      <group position={[0, 0, 0]}>
        <mesh position={[0.7, 1.8, -0.2]} rotation={[0, 0, Math.PI / 2]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.003, 0.003, 2.2, 6]} />
        </mesh>
        <mesh position={[0.7, 1.55, -0.8]} rotation={[0, 0.1, 0]} material={MAT_SANDO_WHITE}>
          <boxGeometry args={[0.04, 0.45, 0.38]} />
        </mesh>
        <mesh position={[0.7, 1.55, -0.3]} rotation={[0, -0.08, 0]} material={MAT_SHORTS_BASKETBALL_BLUE}>
          <boxGeometry args={[0.04, 0.38, 0.32]} />
        </mesh>
      </group>

      {/* Standing Worker in Black Tank & Cargo Shorts */}
      <mesh position={[-0.10, 0.38, 0]} material={MAT_SHORTS_CARGO}>
        <boxGeometry args={[0.13, 0.76, 0.14]} />
      </mesh>
      <mesh position={[0.10, 0.38, 0]} material={MAT_SHORTS_CARGO}>
        <boxGeometry args={[0.13, 0.76, 0.14]} />
      </mesh>
      <mesh position={[-0.10, 0.015, 0.04]} material={MAT_TSINELAS_RUBBER}>
        <boxGeometry args={[0.11, 0.03, 0.24]} />
      </mesh>
      <mesh position={[0.10, 0.015, 0.04]} material={MAT_TSINELAS_RUBBER}>
        <boxGeometry args={[0.11, 0.03, 0.24]} />
      </mesh>

      {/* Leaning Torso */}
      <group ref={torsoRef} position={[0, 0.98, 0]}>
        <mesh material={MAT_SANDO_BLACK}>
          <boxGeometry args={[0.36, 0.48, 0.22]} />
        </mesh>
        <group position={[0, 0.48, 0.04]} rotation={[0.32, 0, 0]}>
          <mesh material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.20, 0.20, 0.20]} />
          </mesh>
          <mesh position={[0, 0.08, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          </mesh>
        </group>
        <group ref={leftArmRef} position={[-0.22, 0.18, 0]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.085, 0.38, 0.085]} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.22, 0.18, 0]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SKIN_MEDIUM}>
            <boxGeometry args={[0.085, 0.38, 0.085]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── 5. KUYA RANDY: LOUNGING ON WOODEN BENCH AFTER A LONG DAY ───
function NighttimeLoungingWorker({ position = [0, 0, 0], rotation = [0, 0, 0] }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  const armRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();
    if (armRef.current) {
      armRef.current.rotation.set(-0.4 + Math.sin(t * 1.0) * 0.06, 0, 0.4);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy Timber Bench */}
      <mesh position={[0, 0.24, 0]} material={MAT_BAMBOO_TIMBER}>
        <boxGeometry args={[1.4, 0.06, 0.44]} />
      </mesh>
      {/* Bench Legs */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`bench-leg-${i}`} position={[x, 0.12, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.06, 0.24, 0.38]} />
        </mesh>
      ))}

      {/* Relaxed Seated Figure */}
      <group position={[0, 0.27, 0]}>
        <mesh position={[-0.10, 0.06, 0.14]} material={MAT_SHORTS_CARGO}>
          <boxGeometry args={[0.13, 0.10, 0.30]} />
        </mesh>
        <mesh position={[0.10, 0.06, 0.14]} material={MAT_SHORTS_CARGO}>
          <boxGeometry args={[0.13, 0.10, 0.30]} />
        </mesh>
        <mesh position={[0, 0.34, -0.04]} rotation={[-0.15, 0, 0]} material={MAT_SANDO_WHITE}>
          <boxGeometry args={[0.34, 0.46, 0.20]} />
        </mesh>
        <group position={[0, 0.68, -0.08]} rotation={[-0.18, 0, 0]}>
          <mesh material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.20, 0.20, 0.20]} />
          </mesh>
          <mesh position={[0, 0.07, -0.01]} material={MAT_HAIR_BLACK}>
            <sphereGeometry args={[0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          </mesh>
        </group>
        <group ref={armRef} position={[0.20, 0.45, -0.04]}>
          <mesh position={[0.14, -0.08, 0]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.28, 0.08, 0.08]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── DYNAMIC MULTI-ROUTINE ANIMATED FILIPINO KITCHEN CHEF / COOK ───
function AnimatedBarracksChef({

  name,
  shirtColor,
  routineType,
  personnelId,
  onSelectPerson,
}: {
  name: string;
  shirtColor: string;
  routineType: "WEST_HEAD_CHEF" | "WEST_MEAT_BUTCHER" | "EAST_VEGGIE_SOUP" | "EAST_RICE_LOGISTICS" | "VISITING_EATER";
  personnelId?: string;
  onSelectPerson?: (id: string) => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const cleaverRef = useRef<THREE.Group>(null);
  const bottleRef = useRef<THREE.Group>(null);
  const sandokRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();

    let targetX = -1.15;
    let targetZ = -0.8;
    let rotY = Math.PI / 2;
    let isWalking = false;
    let task = "STIRRING";

    // ═══ ROUTINE 1: MANG CARDO (WEST WOK MASTER) ═══
    if (routineType === "WEST_HEAD_CHEF") {
      const cycle = t % 30.0;
      targetX = -1.15;

      if (cycle < 8.0) {
        // Phase 1: Stirring Adobo Wok at Z = -0.8
        targetZ = -0.8;
        rotY = Math.PI / 2;
        task = "STIR_WOK";
      } else if (cycle < 12.0) {
        // Phase 2: Walking to spice/condiment rack at Z = 2.4
        const p = (cycle - 8.0) / 4.0;
        targetZ = THREE.MathUtils.lerp(-0.8, 2.4, p);
        rotY = 0; // facing south
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 16.0) {
        // Phase 3: Grabbing Datu Puti Soy Sauce & Cane Vinegar
        targetZ = 2.4;
        rotY = Math.PI / 2;
        task = "GRAB_SEASONING";
      } else if (cycle < 20.0) {
        // Phase 4: Walking back to Wok
        const p = (cycle - 16.0) / 4.0;
        targetZ = THREE.MathUtils.lerp(2.4, -0.8, p);
        rotY = Math.PI; // facing north
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 25.0) {
        // Phase 5: Pouring Soy Sauce & Vinegar into the Simmering Adobo
        targetZ = -0.8;
        rotY = Math.PI / 2;
        task = "POUR_SEASONING";
      } else {
        // Phase 6: Tasting the savory sauce with the sandok
        targetZ = -0.8;
        rotY = Math.PI / 2;
        task = "TASTE_TEST";
      }
    }

    // ═══ ROUTINE 2: KUYA BEN (WEST MEAT BUTCHER & WASH MASTER) ═══
    else if (routineType === "WEST_MEAT_BUTCHER") {
      const cycle = (t + 5.0) % 28.0;
      targetX = -1.15;

      if (cycle < 9.0) {
        // Phase 1: Chopping Pork Belly / Chicken on Heavy Tree Trunk Board at Z = 4.8
        targetZ = 4.8;
        rotY = Math.PI / 2;
        task = "CHOP_MEAT";
      } else if (cycle < 13.0) {
        // Phase 2: Walking to wash sink at Z = 7.2
        const p = (cycle - 9.0) / 4.0;
        targetZ = THREE.MathUtils.lerp(4.8, 7.2, p);
        rotY = 0;
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 18.0) {
        // Phase 3: Washing chopped meats under running water tap
        targetZ = 7.2;
        rotY = Math.PI / 2;
        task = "WASH_MEAT";
      } else if (cycle < 23.0) {
        // Phase 4: Walking to Sinigang caldero at Z = 0.9
        const p = (cycle - 18.0) / 5.0;
        targetZ = THREE.MathUtils.lerp(7.2, 0.9, p);
        rotY = Math.PI;
        isWalking = true;
        task = "WALKING";
      } else {
        // Phase 5: Loading meat into boiling caldero & walking back to chopping station
        const p = (cycle - 23.0) / 5.0;
        targetZ = THREE.MathUtils.lerp(0.9, 4.8, p);
        rotY = 0;
        isWalking = true;
        task = "WALKING";
      }
    }

    // ═══ ROUTINE 3: MANG NOLI (EAST VEGGIE & SOUP MASTER) ═══
    else if (routineType === "EAST_VEGGIE_SOUP") {
      const cycle = (t + 11.0) % 26.0;
      targetX = 1.15;

      if (cycle < 8.0) {
        // Phase 1: Slicing Kalabasa Squash & String Beans at Z = 4.8
        targetZ = 4.8;
        rotY = -Math.PI / 2;
        task = "CHOP_VEGGIE";
      } else if (cycle < 12.0) {
        // Phase 2: Walking to wash sink at Z = 7.2
        const p = (cycle - 8.0) / 4.0;
        targetZ = THREE.MathUtils.lerp(4.8, 7.2, p);
        rotY = 0;
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 17.0) {
        // Phase 3: Washing Kangkong & Sitaw at Sink
        targetZ = 7.2;
        rotY = -Math.PI / 2;
        task = "WASH_GREENS";
      } else if (cycle < 22.0) {
        // Phase 4: Walking to Ginataang Kalabasa pan at Z = -0.8
        const p = (cycle - 17.0) / 5.0;
        targetZ = THREE.MathUtils.lerp(7.2, -0.8, p);
        rotY = Math.PI;
        isWalking = true;
        task = "WALKING";
      } else {
        // Phase 5: Stirring simmering coconut squash dish
        targetZ = -0.8;
        rotY = -Math.PI / 2;
        task = "STIR_SOUP";
      }
    }

    // ═══ ROUTINE 4: KUYA JOMAR (EAST RICE & SINANGAG SPECIALIST) ═══
    else if (routineType === "EAST_RICE_LOGISTICS") {
      const cycle = (t + 17.0) % 32.0;
      targetX = 1.15;

      if (cycle < 7.0) {
        // Phase 1: Scooping raw rice from 50kg Sinandomeng sack at Z = -9.2
        targetZ = -8.8;
        rotY = Math.PI;
        task = "SCOOP_RICE";
      } else if (cycle < 12.0) {
        // Phase 2: Walking to water basin to rinse rice
        const p = (cycle - 7.0) / 5.0;
        targetZ = THREE.MathUtils.lerp(-8.8, -5.4, p);
        rotY = 0;
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 22.0) {
        // Phase 3: Checking commercial rice cooker & fluffing rice
        targetZ = -5.4;
        rotY = -Math.PI / 2;
        task = "FLUFF_RICE";
      } else if (cycle < 26.0) {
        // Phase 4: Walking to garlic fried rice pan at Z = -2.5
        const p = (cycle - 22.0) / 4.0;
        targetZ = THREE.MathUtils.lerp(-5.4, -2.5, p);
        rotY = 0;
        isWalking = true;
        task = "WALKING";
      } else {
        // Phase 5: Sautéing and tossing sinangag
        targetZ = -2.5;
        rotY = -Math.PI / 2;
        task = "STIR_FRIED_RICE";
      }
    }

    // ═══ ROUTINE 5: KUYA DODONG (VISITING TASTE-TESTER WORKER) ═══
    else {
      const cycle = (t + 22.0) % 28.0;
      if (cycle < 10.0) {
        // Walking in from east walkway with enamel tin mug
        const p = cycle / 10.0;
        targetX = THREE.MathUtils.lerp(2.2, 1.15, p);
        targetZ = -0.8;
        rotY = -Math.PI / 2;
        isWalking = true;
        task = "WALKING";
      } else if (cycle < 20.0) {
        // Tasting adobo sample with thumbs-up
        targetX = 1.15;
        targetZ = -0.8;
        rotY = -Math.PI / 2;
        task = "TASTE_EAT";
      } else {
        // Walking back
        const p = (cycle - 20.0) / 8.0;
        targetX = THREE.MathUtils.lerp(1.15, 2.2, p);
        targetZ = -0.8;
        rotY = Math.PI / 2;
        isWalking = true;
        task = "WALKING";
      }
    }

    // Update root position and orientation smoothly
    rootRef.current.position.set(targetX, 0.2, targetZ);
    rootRef.current.rotation.y = rotY;

    // ═══ BIOMECHANICAL HUMAN SKELETAL KINEMATICS ═══
    if (isWalking) {
      const walkT = t * 6.5;
      const legStride = Math.sin(walkT) * 0.50;
      const armSwing = Math.sin(walkT) * 0.42;
      const bounce = Math.abs(Math.sin(walkT)) * 0.038;

      rootRef.current.position.y = 0.2 + bounce;

      if (leftLegRef.current) leftLegRef.current.rotation.set(legStride, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-legStride, 0, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-armSwing, 0.08, -0.06);
      if (rightArmRef.current) rightArmRef.current.rotation.set(armSwing, -0.08, 0.06);
      if (torsoRef.current) torsoRef.current.rotation.set(0.04, Math.cos(walkT) * 0.06, 0);
      if (headRef.current) headRef.current.rotation.set(0, 0, 0);

      if (cleaverRef.current) cleaverRef.current.visible = false;
      if (bottleRef.current) bottleRef.current.visible = false;
      if (sandokRef.current) sandokRef.current.visible = false;
    } else {
      // Stationary task execution
      rootRef.current.position.y = 0.2;
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);

      if (task === "STIR_WOK" || task === "STIR_SOUP" || task === "STIR_FRIED_RICE") {
        const stir = Math.sin(t * 4.2);
        const stirCos = Math.cos(t * 4.2);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85 + stir * 0.18, stirCos * 0.22, -0.15);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.15, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.06, stir * 0.08, 0);
        if (headRef.current) headRef.current.rotation.set(0.24, 0, 0);

        if (sandokRef.current) sandokRef.current.visible = true;
        if (cleaverRef.current) cleaverRef.current.visible = false;
        if (bottleRef.current) bottleRef.current.visible = false;
      } else if (task === "CHOP_MEAT" || task === "CHOP_VEGGIE") {
        const chop = Math.sin(t * 9.0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.1 + Math.max(0, chop) * 0.45, 0.1, -0.1);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, 0.35, 0.1); // Left hand holding item
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.32, 0, 0);

        if (cleaverRef.current) cleaverRef.current.visible = true;
        if (sandokRef.current) sandokRef.current.visible = false;
        if (bottleRef.current) bottleRef.current.visible = false;
      } else if (task === "POUR_SEASONING") {
        const pour = Math.sin(t * 2.0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.3, -0.4, 0.5 + pour * 0.15);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.9, 0.2, -0.2);
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, -0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.28, -0.1, 0);

        if (bottleRef.current) bottleRef.current.visible = true;
        if (sandokRef.current) sandokRef.current.visible = false;
        if (cleaverRef.current) cleaverRef.current.visible = false;
      } else if (task === "TASTE_TEST" || task === "TASTE_EAT") {
        const sip = Math.sin(t * 1.8);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.55 + Math.max(0, sip) * 0.25, -0.15, -0.1);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.4, 0.1, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, 0);
        if (headRef.current) headRef.current.rotation.set(-0.10 + Math.sin(t * 3.0) * 0.08, 0, 0); // Nodding

        if (sandokRef.current) sandokRef.current.visible = false;
        if (cleaverRef.current) cleaverRef.current.visible = false;
        if (bottleRef.current) bottleRef.current.visible = false;
      } else if (task === "WASH_MEAT" || task === "WASH_GREENS") {
        const scrub = Math.sin(t * 5.0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.95 + scrub * 0.12, 0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.95 - scrub * 0.12, -0.15, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.14, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);

        if (sandokRef.current) sandokRef.current.visible = false;
        if (cleaverRef.current) cleaverRef.current.visible = false;
        if (bottleRef.current) bottleRef.current.visible = false;
      } else {
        // Default task posture
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.7, 0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.7, -0.1, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.05, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.18, 0, 0);
      }
    }
  });

  const skinMat = name === "Mang Cardo" ? MAT_SKIN_BRONZE : MAT_SKIN_MEDIUM;

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        if (personnelId && onSelectPerson) {
          e.stopPropagation();
          onSelectPerson(personnelId);
        }
      }}
    >
      {/* Articulated Bipedal Legs */}
      <group ref={leftLegRef} position={[-0.1, 0.74, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.1, 0.74, 0]}>
        <mesh position={[0, -0.37, 0]} material={MAT_PANTS_JEANS}>
          <boxGeometry args={[0.12, 0.74, 0.14]} />
        </mesh>
      </group>

      {/* Torso with White Chef Apron */}
      <group ref={torsoRef} position={[0, 0.82, 0]}>
        <mesh position={[0, 0.26, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
          <boxGeometry args={[0.38, 0.52, 0.22]} />
        </mesh>
        {/* White Cooking Apron Front */}
        <mesh position={[0, 0.22, 0.115]}>
          <boxGeometry args={[0.32, 0.48, 0.01]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>

        {/* 🗣️ HIGH-DETAIL SCULPTED FILIPINO HEAD & FACIAL FEATURES */}
        <group ref={headRef} position={[0, 0.60, 0]}>
          {/* Main Cranium */}
          <mesh material={skinMat}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
          </mesh>
          {/* Tapered Filipino Chin / Jaw */}
          <mesh position={[0, -0.11, 0.02]} material={skinMat}>
            <boxGeometry args={[0.16, 0.08, 0.16]} />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.115, 0.01, -0.01]} material={skinMat}>
            <boxGeometry args={[0.015, 0.065, 0.038]} />
          </mesh>
          <mesh position={[0.115, 0.01, -0.01]} material={skinMat}>
            <boxGeometry args={[0.015, 0.065, 0.038]} />
          </mesh>

          {/* Chef Toque Bandana Wrap */}
          <group position={[0, 0.09, 0]}>
            <mesh>
              <boxGeometry args={[0.24, 0.07, 0.24]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.13, 0.11, 0.12, 12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
            </mesh>
          </group>

          {/* 👁️ Dark Brown Filipino Eyes */}
          <group position={[0, 0.035, 0.112]}>
            {/* Left Eye */}
            <mesh position={[-0.052, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.038, 0.020, 0.005]} />
            </mesh>
            <mesh position={[-0.052, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.022, 0.018, 0.003]} />
            </mesh>
            <mesh position={[-0.052, 0, 0.005]} material={MAT_FACE_EYE_PUPIL}>
              <boxGeometry args={[0.012, 0.012, 0.002]} />
            </mesh>

            {/* Right Eye */}
            <mesh position={[0.052, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.038, 0.020, 0.005]} />
            </mesh>
            <mesh position={[0.052, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.022, 0.018, 0.003]} />
            </mesh>
            <mesh position={[0.052, 0, 0.005]} material={MAT_FACE_EYE_PUPIL}>
              <boxGeometry args={[0.012, 0.012, 0.002]} />
            </mesh>
          </group>

          {/* Arched Eyebrows */}
          <group position={[0, 0.065, 0.115]}>
            <mesh position={[-0.052, 0, 0]} material={MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.045, 0.008, 0.006]} />
            </mesh>
            <mesh position={[0.052, 0, 0]} material={MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.045, 0.008, 0.006]} />
            </mesh>
          </group>

          {/* 👃 Sculpted Nose */}
          <group position={[0, 0.005, 0.122]}>
            <mesh position={[0, 0.015, 0]} material={skinMat}>
              <boxGeometry args={[0.026, 0.045, 0.022]} />
            </mesh>
            <mesh position={[0, -0.015, 0.006]} material={skinMat}>
              <sphereGeometry args={[0.018, 6, 6]} />
            </mesh>
            <mesh position={[-0.020, -0.018, 0.002]} material={skinMat}>
              <boxGeometry args={[0.014, 0.014, 0.015]} />
            </mesh>
            <mesh position={[0.020, -0.018, 0.002]} material={skinMat}>
              <boxGeometry args={[0.014, 0.014, 0.015]} />
            </mesh>
          </group>

          {/* 👄 Contoured Lips */}
          <group position={[0, -0.055, 0.116]}>
            <mesh material={MAT_FACE_LIPS}>
              <boxGeometry args={[0.055, 0.012, 0.010]} />
            </mesh>
            <mesh position={[0, -0.012, -0.001]} material={MAT_FACE_LIPS}>
              <boxGeometry args={[0.048, 0.014, 0.010]} />
            </mesh>
          </group>

          {/* 👨‍🦰 Distinct Filipino Mustache (Mang Cardo) */}
          {name === "Mang Cardo" && (
            <mesh position={[0, -0.040, 0.126]}>
              <boxGeometry args={[0.095, 0.020, 0.014]} />
              <meshStandardMaterial color="#1C1917" roughness={0.9} />
            </mesh>
          )}
        </group>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.23, 0.42, 0]}>
          <mesh position={[0, -0.20, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.42, 0.095]} />
          </mesh>
        </group>

        {/* Right Arm & Handheld Tools */}
        <group ref={rightArmRef} position={[0.23, 0.42, 0]}>
          <mesh position={[0, -0.20, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.42, 0.095]} />
          </mesh>

          {/* Heavy Steel Cleaver */}
          <group ref={cleaverRef} position={[0, -0.42, 0.08]} visible={false}>
            <mesh position={[0, 0, 0.06]} material={MAT_WOOD_CHOPPING}>
              <cylinderGeometry args={[0.015, 0.015, 0.14, 6]} />
            </mesh>
            <mesh position={[0, 0.06, 0.16]} material={MAT_CLEAVER_STEEL}>
              <boxGeometry args={[0.008, 0.12, 0.18]} />
            </mesh>
          </group>

          {/* Datu Puti Soy Sauce & Vinegar Bottle */}
          <group ref={bottleRef} position={[0, -0.42, 0.08]} visible={false}>
            <mesh position={[0, -0.02, 0.06]} material={MAT_DATU_PUTI_YELLOW}>
              <cylinderGeometry args={[0.032, 0.032, 0.18, 10]} />
            </mesh>
            <mesh position={[0, 0.08, 0.06]} material={MAT_DATU_PUTI_RED}>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
            </mesh>
          </group>

          {/* Wooden Cooking Sandok / Ladle */}
          <group ref={sandokRef} position={[0, -0.42, 0.08]}>
            <mesh position={[0, 0, 0.14]} rotation={[0.4, 0, 0]} material={MAT_WOOD_CHOPPING}>
              <boxGeometry args={[0.02, 0.015, 0.36]} />
            </mesh>
            <mesh position={[0, -0.04, 0.30]} material={MAT_WOOD_CHOPPING}>
              <sphereGeometry args={[0.04, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ─── PLANNING CONTROL HEAD WORKSTATION (STAFF OFFICE INTERIOR) ───
function PlanningControlHeadOfficeLunch() {
  const headArmRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (headArmRef.current) {
      const eatCycle = Math.sin(t * 1.5);
      headArmRef.current.rotation.x = eatCycle > 0 ? -1.2 - eatCycle * 0.3 : -0.7;
    }
  });

  return (
    <group position={[2.4, 0, -5.0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Executive Wooden Office Desk */}
      <mesh position={[0, 0.45, 0]} castShadow material={MAT_BAMBOO_TIMBER}>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
      </mesh>
      {/* Desk Leg Supports */}
      <mesh position={[-0.8, 0.22, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.08, 0.44, 0.8]} />
      </mesh>
      <mesh position={[0.8, 0.22, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.08, 0.44, 0.8]} />
      </mesh>

      {/* Desktop Computer Monitor & Keyboard */}
      <mesh position={[0, 0.78, -0.25]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.55, 0.38, 0.04]} />
      </mesh>
      <mesh position={[0, 0.54, -0.22]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
      </mesh>
      {/* Glowing Project Management Dashboard Monitor Screen */}
      <mesh position={[0, 0.78, -0.22]} material={MAT_SIGNBOARD_TEAL}>
        <planeGeometry args={[0.5, 0.33]} />
      </mesh>

      {/* Project Management Blueprint Binder & Tablet */}
      <mesh position={[-0.55, 0.5, -0.1]} rotation={[0, 0.2, 0]} material={MAT_WHITE_PAINT}>
        <boxGeometry args={[0.3, 0.03, 0.4]} />
      </mesh>
      <mesh position={[0.55, 0.5, -0.1]} rotation={[0.2, 0, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.2, 0.02, 0.28]} />
      </mesh>

      {/* ── PLANNING CONTROL HEAD HOT LUNCH BENTO BOX & BEVERAGE ON DESK ── */}
      <group position={[0, 0.5, 0.18]}>
        <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.38, 0.03, 0.26]} />
        </mesh>
        <mesh position={[-0.08, 0.025, 0]} material={MAT_GARLIC_RICE}>
          <sphereGeometry args={[0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0.08, 0.025, 0]} material={MAT_ADOBO}>
          <boxGeometry args={[0.12, 0.03, 0.12]} />
        </mesh>
        <mesh position={[0.22, 0.07, 0.05]} material={MAT_GLASS_CLEAR}>
          <cylinderGeometry args={[0.035, 0.025, 0.14, 8]} />
        </mesh>
      </group>

      {/* ── PLANNING CONTROL HEAD CHARACTER SEATED IN OFFICE CHAIR ── */}
      <group position={[0, 0.35, 0.55]} rotation={[0, Math.PI, 0]}>
        {/* Executive Office Swivel Chair */}
        <mesh position={[0, 0.2, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.48, 0.08, 0.48]} />
        </mesh>
        <mesh position={[0, 0.55, -0.22]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.48, 0.65, 0.08]} />
        </mesh>

        {/* Planning Control Head Character Body & 3D Filipino Face */}
        <group position={[0, 0.95, 0]}>
          <mesh castShadow material={MAT_SKIN_BRONZE}>
            <sphereGeometry args={[0.12, 14, 14]} />
          </mesh>
          {/* Natural Clear Almond Eyes & Irises */}
          <group position={[0, 0.015, 0.118]}>
            <mesh position={[-0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.016, 0.008]} />
            </mesh>
            <mesh position={[0.04, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.026, 0.016, 0.008]} />
            </mesh>
            <mesh position={[-0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.013, 0.008]} />
            </mesh>
            <mesh position={[0.04, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.013, 0.013, 0.008]} />
            </mesh>
            <mesh position={[-0.036, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
            <mesh position={[0.044, 0.004, 0.006]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.004, 0.004, 0.004]} />
            </mesh>
          </group>
          {/* Eyebrows */}
          <mesh position={[-0.04, 0.044, 0.116]} rotation={[0, 0, 0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.008]} />
          </mesh>
          <mesh position={[0.04, 0.044, 0.116]} rotation={[0, 0, -0.05]} material={MAT_FACE_EYEBROW}>
            <boxGeometry args={[0.032, 0.006, 0.008]} />
          </mesh>
          {/* 3D Nose Bridge */}
          <mesh position={[0, -0.01, 0.120]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.018, 0.028, 0.022]} />
          </mesh>
          {/* Mouth & Lips */}
          <mesh position={[0, -0.052, 0.116]} material={MAT_FACE_LIPS}>
            <boxGeometry args={[0.036, 0.007, 0.008]} />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.122, 0, 0]} rotation={[0, 0.05, -0.12]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.016, 0.036, 0.024]} />
          </mesh>
          <mesh position={[0.122, 0, 0]} rotation={[0, -0.05, 0.12]} material={MAT_SKIN_BRONZE}>
            <boxGeometry args={[0.016, 0.036, 0.024]} />
          </mesh>
          {/* Prescription Glasses */}
          <group position={[0, 0.018, 0.122]}>
            <mesh position={[-0.04, 0, 0]} material={MAT_STEEL_DARK}>
              <ringGeometry args={[0.022, 0.034, 16]} />
            </mesh>
            <mesh position={[0.04, 0, 0]} material={MAT_STEEL_DARK}>
              <ringGeometry args={[0.022, 0.034, 16]} />
            </mesh>
            <mesh position={[0, 0.006, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.028, 0.006, 0.01]} />
            </mesh>
          </group>
        </group>
        {/* White Hardhat (Department Head) */}
        <mesh position={[0, 1.08, 0]} castShadow material={MAT_WORKER_HARDHAT_WHITE}>
          <sphereGeometry args={[0.16, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>

        {/* Navy Blazer / Head Shirt */}
        <mesh position={[0, 0.55, 0]} castShadow material={MAT_SHIRT_BLAZER_NAVY}>
          <boxGeometry args={[0.42, 0.52, 0.22]} />
        </mesh>

        {/* Left Arm Resting on Desk */}
        <group position={[-0.23, 0.72, 0]} rotation={[-0.8, 0, 0.2]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
            <boxGeometry args={[0.09, 0.38, 0.09]} />
          </mesh>
        </group>

        {/* Right Arm Eating Lunch */}
        <group ref={headArmRef} position={[0.23, 0.72, 0]}>
          <mesh position={[0, -0.18, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
            <boxGeometry args={[0.09, 0.38, 0.09]} />
          </mesh>
          <mesh position={[0, -0.38, 0.1]} material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.02, 0.01, 0.14]} />
          </mesh>
        </group>

        {/* Seated Legs */}
        <group position={[-0.1, 0.28, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={MAT_PANTS_SLATE}>
            <boxGeometry args={[0.11, 0.42, 0.12]} />
          </mesh>
        </group>
        <group position={[0.1, 0.28, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={MAT_PANTS_SLATE}>
            <boxGeometry args={[0.11, 0.42, 0.12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── STAFF & HEADS LUNCH IN STAFF HOUSE (80% OF STAFF/HEADS EAT HERE) ───
// 80% of staff and department heads prefer to eat inside the Staff House.
function StaffHouseLoungeDining() {
  return (
    <group position={[0, 0, -2.0]}>
      {/* Staff House Dining Table */}
      <mesh position={[0, 0.45, 0]} castShadow material={MAT_WHITE_PAINT}>
        <boxGeometry args={[2.2, 0.08, 1.2]} />
      </mesh>
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={`sh-tbl-leg-${i}`} position={[x, 0.22, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.08, 0.44, 1.0]} />
        </mesh>
      ))}

      {/* Staff Diners (80% of Staff/Heads preference) */}
      <CanteenSeatedDiner position={[-0.6, 0.0, -0.45]} facingDir={1} role="STAFF" shirtColor="#0284C7" hardhatColor="#FFFFFF" skinTone="LIGHT" />
      <CanteenSeatedDiner position={[0.6, 0.0, -0.45]} facingDir={1} role="STAFF" shirtColor="#15803D" hardhatColor="#FFFFFF" skinTone="BRONZE" />
      <CanteenSeatedDiner position={[0.0, 0.0, 0.45]} facingDir={-1} role="STAFF" shirtColor="#0284C7" hardhatColor="#FFFFFF" skinTone="MEDIUM" />
    </group>
  );
}

// ─── AUTHENTIC CONSTRUCTION SITE CANTEEN & MESS HALL (EXPANDED KITCHEN SERVING HALL) ───
function TemfacilCanteenBuilding({
  position = [32, 0, 14],
  isDetailVisible = true,
}: {
  position?: [number, number, number];
  isDetailVisible?: boolean;
}) {
  return (
    <group position={position}>
      {/* 1. Concrete Slab Floor Base (16.5m for Spacious Dining & Kitchen Serving Area) */}
      <mesh position={[0, 0.06, 1.2]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[7.8, 0.12, 16.5]} />
      </mesh>

      {/* 2. Low Solid Dark Green Curb Base (y = 0.0 to 0.35m) */}
      {/* Front Curb */}
      <mesh position={[-2.4, 0.18, -6.65]} castShadow receiveShadow material={MAT_CANTEEN_GREEN_WALL}>
        <boxGeometry args={[2.8, 0.36, 0.2]} />
      </mesh>
      <mesh position={[2.4, 0.18, -6.65]} castShadow receiveShadow material={MAT_CANTEEN_GREEN_WALL}>
        <boxGeometry args={[2.8, 0.36, 0.2]} />
      </mesh>
      {/* Rear Solid Curb */}
      <mesh position={[0, 0.18, 9.45]} castShadow receiveShadow material={MAT_CANTEEN_GREEN_WALL}>
        <boxGeometry args={[7.8, 0.36, 0.2]} />
      </mesh>
      {/* Left & Right Side Solid Curbs */}
      <mesh position={[-3.8, 0.18, 1.4]} castShadow receiveShadow material={MAT_CANTEEN_GREEN_WALL}>
        <boxGeometry args={[0.2, 0.36, 16.3]} />
      </mesh>
      <mesh position={[3.8, 0.18, 1.4]} castShadow receiveShadow material={MAT_CANTEEN_GREEN_WALL}>
        <boxGeometry args={[0.2, 0.36, 16.3]} />
      </mesh>

      {/* 3. Open See-Through Cyclone Wire Mesh Netting Screens (y = 0.36m to 3.6m) */}
      {/* Front Facade Open Mesh Netting */}
      <mesh position={[-2.4, 1.98, -6.63]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[2.7, 3.2]} />
      </mesh>
      <mesh position={[2.4, 1.98, -6.63]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[2.7, 3.2]} />
      </mesh>
      <mesh position={[0, 3.1, -6.63]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[2.2, 1.0]} />
      </mesh>

      {/* Rear Gable End Open Mesh Netting */}
      <mesh position={[0, 1.98, 9.43]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[7.6, 3.2]} />
      </mesh>

      {/* Left & Right Side Open Mesh Netting */}
      <mesh position={[-3.78, 1.98, 1.4]} rotation={[0, Math.PI / 2, 0]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[16.1, 3.2]} />
      </mesh>
      <mesh position={[3.78, 1.98, 1.4]} rotation={[0, Math.PI / 2, 0]} material={MAT_CANTEEN_GREEN_MESH}>
        <planeGeometry args={[16.1, 3.2]} />
      </mesh>

      {/* Perimeter Structural Steel Columns (Supports for Open Net Area) */}
      {[-6.6, -2.6, 1.4, 5.4, 9.4].map((z, i) => (
        <React.Fragment key={`cpost-${i}`}>
          <mesh position={[-3.78, 1.8, z]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.1, 3.6, 0.1]} />
          </mesh>
          <mesh position={[3.78, 1.8, z]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.1, 3.6, 0.1]} />
          </mesh>
        </React.Fragment>
      ))}

      {/* 4. Front Open Walk-In Entrance Portal */}
      <group position={[0, 1.35, -6.65]}>
        <mesh position={[-1.1, 0.2, 0]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.12, 3.0, 0.12]} />
        </mesh>
        <mesh position={[1.1, 0.2, 0]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.12, 3.0, 0.12]} />
        </mesh>
        <mesh position={[0, 1.65, 0]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[2.32, 0.12, 0.12]} />
        </mesh>
        {/* Entrance Threshold Step */}
        <mesh position={[0, -1.27, -0.3]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[2.8, 0.16, 0.8]} />
        </mesh>
        <mesh position={[0, -1.18, -0.3]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
          <planeGeometry args={[2.8, 0.12]} />
        </mesh>
      </group>

      {/* 5. G.I. Corrugated Metal Gable Roof Canopy (Extended to 17.1m) */}
      <mesh position={[0, 3.65, 1.2]} rotation={[-0.03, 0, 0]} castShadow material={MAT_ROOF_CAP}>
        <boxGeometry args={[8.4, 0.12, 17.1]} />
      </mesh>
      <mesh position={[0, 3.73, 1.2]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[8.45, 0.05, 0.35]} />
      </mesh>

      {/* 6. Canteen Dining Hall Interior Setup (Visible Through Translucent Mesh) */}
      {/* Consolidated Ambient Interior Warm Light */}
      <pointLight position={[0, 2.6, 3.5]} color="#FEF08A" intensity={4.5} distance={15} />

      {/* Multiple Rows of Long Dining Tables & Parallel Benches */}
      {[-1.8, 1.8].map((xOff, i) => (
        <group key={`canteen-table-row-${i}`} position={[xOff, 0.45, 0]}>
          {[-3.0, 2.0].map((zOff, j) => (
            <group key={`ct-table-${j}`} position={[0, 0, zOff]}>
              <mesh material={MAT_PAVER_WALKWAY}>
                <boxGeometry args={[1.4, 0.08, 4.2]} />
              </mesh>
              {[-0.6, 0.6].map((lx, k) => (
                <mesh key={`ctl-${k}`} position={[lx, -0.22, 0]} material={MAT_STEEL_FRAME}>
                  <boxGeometry args={[0.08, 0.44, 3.8]} />
                </mesh>
              ))}
              {[-0.95, 0.95].map((bx, m) => (
                <mesh key={`ctb-${m}`} position={[bx, -0.15, 0]} material={MAT_CONCRETE_SLAB_LIGHT}>
                  <boxGeometry args={[0.35, 0.06, 4.0]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}

      {isDetailVisible && (
        <>
          {/* ─── OPTIMIZED AUTHENTIC CANTEEN DINERS ─── */}
      {/* Front Table: Left & Right pairs */}
      <CanteenSeatedDiner position={[-2.75, 0.0, -3.2]} facingDir={1} role="WORKER" shirtColor="#EA580C" hardhatColor="#16A34A" wearingHardhat={false} skinTone="MEDIUM" />
      <CanteenSeatedDiner position={[-0.85, 0.0, -3.2]} facingDir={-1} role="WORKER" shirtColor="#EAB308" hardhatColor="#16A34A" wearingHardhat={true} skinTone="BRONZE" />
      <CanteenSeatedDiner position={[0.85, 0.0, -2.5]} facingDir={1} role="WORKER" shirtColor="#EA580C" hardhatColor="#16A34A" wearingHardhat={false} skinTone="LIGHT" />
      <CanteenSeatedDiner position={[2.75, 0.0, -2.5]} facingDir={-1} role="STAFF" shirtColor="#0284C7" hardhatColor="#FFFFFF" wearingHardhat={true} skinTone="MEDIUM" />

      {/* Authentic Dynamic Filipino Carinderia Food Display Counter */}
      <FilipinoCanteenFoodCounter />

      {/* ── AUTHENTIC FILIPINO CARINDERIA ATE ROUTINE SERVER (DYNAMICALLY SERVING 5 DISHES & CHECKING PREP TABLE) ── */}
      <CanteenAteServer />

      {/* ── REAR KITCHEN PREPARATION & STORAGE BACK-COUNTER ── */}
      <group position={[0, 0.45, 8.7]}>
        {/* Stainless Steel Kitchen Prep Table */}
        <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[5.2, 0.06, 0.9]} />
        </mesh>
        {[-2.4, 2.4].map((x, k) => (
          <mesh key={`kp-leg-${k}`} position={[x, -0.22, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.08, 0.44, 0.8]} />
          </mesh>
        ))}
        {/* 2 Electric Commercial Rice Cookers */}
        {[-1.5, -0.5].map((rx, r) => (
          <mesh key={`rice-cooker-${r}`} position={[rx, 0.22, 0]} material={MAT_WHITE_PAINT} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.35, 14]} />
          </mesh>
        ))}
        {/* Stainless Steel Soup Stockpot */}
        <mesh position={[0.8, 0.25, 0]} material={MAT_FOOD_STAINLESS_TRAY} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.42, 16]} />
        </mesh>
      </group>

      {/* ── REAL-WORLD 4-PHASE ROUTINE WORKERS (WALK IN -> ORDER -> CARRY TRAY -> SIT & EAT -> LEAVE) ── */}
      <CanteenRoutineWorker seatPos={[-0.85, 0.0, 1.2]} facingDir={-1} shiftOffset={0} shirtColor="#EA580C" skinTone="MEDIUM" />
      <CanteenRoutineWorker seatPos={[0.85, 0.0, 1.2]} facingDir={1} shiftOffset={14} shirtColor="#EAB308" skinTone="BRONZE" />

              </>
      )}

      {/* 7. Outdoor Bamboo Resting Bench Alcove (Aligned Flush along Right Side Wall on Gravel Pad) */}
      <group position={[4.4, 0.25, -2.5]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Gravel Alcove Base Pad */}
        <mesh position={[0, -0.18, 0]} receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[2.0, 0.1, 1.2]} />
        </mesh>

        {/* Bamboo Frame Corner Posts */}
        {[-0.8, 0.8].map((xOff, i) => (
          <React.Fragment key={`bam-post-${i}`}>
            <mesh position={[xOff, 0.25, -0.35]} material={MAT_BAMBOO_TIMBER}>
              <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            </mesh>
            <mesh position={[xOff, 0.25, 0.35]} material={MAT_BAMBOO_TIMBER}>
              <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            </mesh>
          </React.Fragment>
        ))}

        {/* Bamboo Slatted Seat Bed */}
        <mesh position={[0, 0.46, 0]} castShadow material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[1.8, 0.06, 0.8]} />
        </mesh>
        {/* Backrest Rail */}
        <mesh position={[0, 0.78, -0.36]} material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[1.8, 0.08, 0.08]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── FOREMAN & STAFF HOUSE QUARTERS (MATCHING USER SITE PHOTOS) ───
function TemfacilForemanStaffHouse({ position = [-6.5, 0, -48.5] }: { position?: [number, number, number] }) {
  const buildingW = 19.6;
  const buildingD = 12.6;
  const buildingH = 3.2;

  return (
    <group position={position}>
      {/* 1. Concrete Foundation Slab & Perimeter Walkway Skirt */}
      <mesh position={[0, 0.08, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[buildingW + 0.8, 0.16, buildingD + 0.8]} />
      </mesh>

      {/* 2. Main Building Prefabricated Sandwich Panel Walls (Non-Glare Matte Slate Fiber-Cement) */}
      <group position={[0, buildingH / 2 + 0.16, 0]}>
        {/* Exterior Wall Box */}
        <mesh castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[buildingW, buildingH, buildingD]} />
        </mesh>

        {/* Vertical Sandwich Panel Joint Trims */}
        {[-8, -4, 0, 4, 8].map((xOff, i) => (
          <mesh key={`panel-joint-front-${i}`} position={[xOff, 0, buildingD / 2 + 0.03]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.04, buildingH - 0.2, 0.02]} />
          </mesh>
        ))}

        {/* Soft Interior Foyer Ambient Glow */}
        <pointLight position={[0, 0.2, 0]} intensity={0.2} distance={6} color="#FDE047" castShadow={false} />
      </group>

      {/* 3. Low-Pitch G.I. Corrugated Steel Roof with Eave Overhangs (Non-Glare Matte Slate Metal) */}
      <group position={[0, buildingH + 0.25, 0]}>
        <mesh castShadow material={MAT_ROOF_CAP}>
          <boxGeometry args={[buildingW + 1.2, 0.12, buildingD + 1.2]} />
        </mesh>
        {/* Roof Ridge Cap */}
        <mesh position={[0, 0.08, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[buildingW + 1.25, 0.06, 0.35]} />
        </mesh>
        {/* Dark Eave Fascia Trim Lines */}
        <mesh position={[0, -0.04, buildingD / 2 + 0.61]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[buildingW + 1.22, 0.08, 0.04]} />
        </mesh>
        <mesh position={[0, -0.04, -buildingD / 2 - 0.61]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[buildingW + 1.22, 0.08, 0.04]} />
        </mesh>
      </group>

      {/* 4. High-Contrast Doors & Entrance Portals (Eliminated Z-Fighting & Glare) */}
      {/* Main Front Double Entrance Door */}
      <group position={[0, 1.15, buildingD / 2 + 0.08]}>
        {/* Outer Heavy Steel Door Frame */}
        <mesh material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.1, 2.15, 0.12]} />
        </mesh>
        {/* Left & Right Door Panels */}
        <mesh position={[-0.48, 0, 0.02]} material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[0.92, 2.05, 0.06]} />
        </mesh>
        <mesh position={[0.48, 0, 0.02]} material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[0.92, 2.05, 0.06]} />
        </mesh>
        {/* Glass Vision Panels */}
        <mesh position={[-0.48, 0.35, 0.04]} material={MAT_GLASS_CLEAR}>
          <planeGeometry args={[0.45, 0.7]} />
        </mesh>
        <mesh position={[0.48, 0.35, 0.04]} material={MAT_GLASS_CLEAR}>
          <planeGeometry args={[0.45, 0.7]} />
        </mesh>
        {/* Door Handles */}
        <mesh position={[-0.1, 0, 0.06]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.04, 0.16, 0.05]} />
        </mesh>
        <mesh position={[0.1, 0, 0.06]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.04, 0.16, 0.05]} />
        </mesh>
      </group>

      {/* 4 Exterior Bedroom Quarters Doors (High-Contrast Slate Doors as in Photos 2 & 5) */}
      {[-7, -3.5, 3.5, 7].map((xOff, i) => (
        <group key={`staff-door-${i}`} position={[xOff, 1.1, buildingD / 2 + 0.08]}>
          {/* Steel Outer Frame */}
          <mesh material={MAT_STEEL_DARK}>
            <boxGeometry args={[1.05, 2.05, 0.1]} />
          </mesh>
          {/* Slate Panel Door */}
          <mesh position={[0, 0, 0.02]} material={MAT_ASPHALT_DARK}>
            <boxGeometry args={[0.94, 1.96, 0.06]} />
          </mesh>
          {/* Stainless Steel Lever Handle */}
          <mesh position={[0.36, 0, 0.06]} material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[0.04, 0.14, 0.06]} />
          </mesh>
        </group>
      ))}

      {/* 5. Windows & Mounted Window-Type AC Condenser Units (Matching Photos 3 & 4) */}
      {[-8, -5, -2, 2, 5, 8].map((xOff, i) => (
        <group key={`ac-window-group-${i}`} position={[xOff, 1.6, -buildingD / 2 - 0.04]}>
          {/* Sliding Glass Window */}
          <mesh material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.4, 1.1, 0.08]} />
          </mesh>
          <mesh position={[0, 0, -0.01]} material={MAT_GLASS_CLEAR}>
            <planeGeometry args={[1.28, 0.98]} />
          </mesh>

          {/* Window AC Condenser Unit Box protruding under window (Photos 3 & 4) */}
          <group position={[0, -0.9, -0.22]}>
            <mesh castShadow material={MAT_STEEL_FRAME}>
              <boxGeometry args={[0.65, 0.45, 0.5]} />
            </mesh>
            <mesh position={[0, 0, -0.26]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.35, 0.02]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* 6. Realistic Exterior Props (Boots, Buckets, Containers from User Photos 2 & 3) */}
      {/* Black Rubber Work Boots along doorway */}
      {[-6.6, -3.1, 3.9].map((xOff, i) => (
        <group key={`boots-${i}`} position={[xOff, 0.22, buildingD / 2 + 0.35]}>
          <mesh castShadow material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.18, 0.32, 0.28]} />
          </mesh>
        </group>
      ))}

      {/* Blue & Red Water Containers */}
      <group position={[5.2, 0.25, buildingD / 2 + 0.38]}>
        <mesh castShadow material={MAT_CANAL_WATER}>
          <cylinderGeometry args={[0.22, 0.22, 0.42, 12]} />
        </mesh>
      </group>
      <group position={[5.8, 0.22, buildingD / 2 + 0.38]}>
        <mesh castShadow material={MAT_RED_BOOTH}>
          <cylinderGeometry args={[0.2, 0.2, 0.38, 12]} />
        </mesh>
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 DISTINCT REAL-LIFE WORKERS BARRACKS COMPOUND & COMMUNAL LATRINE BLOCK
// Modeled directly from Sta. Clara International Corp.'s TEMFACIL drone & satellite photos
function TemfacilWorkerBarracksCompound({
  position = [37, 0, -12],
  onSelectPerson,
  isDetailVisible = true,
}: {
  position?: [number, number, number];
  onSelectPerson?: (id: string) => void;
  isDetailVisible?: boolean;
}) {
  return (
    <group position={position}>
      {/* ═══ 0. HEAVY-DUTY CONCRETE PLATFORM SLAB & DRAINAGE NETWORK (DISCRETE Y=0.16m BASE) ═══ */}
      <mesh position={[0, 0.08, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[22.5, 0.16, 25.0]} />
      </mesh>
      {/* Concrete Interstitial Walkways Between Barracks (Elevated Y=0.21m to eliminate Z-fighting!) */}
      <mesh position={[-3.25, 0.19, 0]} receiveShadow material={MAT_PAVER_WALKWAY}>
        <boxGeometry args={[1.8, 0.04, 24.6]} />
      </mesh>
      <mesh position={[3.25, 0.19, 0]} receiveShadow material={MAT_PAVER_WALKWAY}>
        <boxGeometry args={[1.8, 0.04, 24.6]} />
      </mesh>

      {/* ═══ BARRACKS 1 (LEFTMOST - WEST BARRACKS) ═══ 2-STORY PREFABRICATED DORMITORY (6.6M HEIGHT) ═══ */}
      {/* Photo 1: 2-Story long twin-gable G.I. sheet roof dormitory with 2nd floor balcony catwalk & staircase */}
      <group position={[-7.2, 0, 0]}>
        {/* Ground Floor Wall Box (Matte Non-Glare Fiber Cement) */}
        <mesh position={[0, 1.6, 0]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[4.8, 3.0, 21.0]} />
        </mesh>
        {/* Inter-Floor Concrete & Steel Floor Joist Slab Divider */}
        <mesh position={[0, 3.15, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[5.0, 0.14, 21.2]} />
        </mesh>
        {/* Second Floor Wall Box */}
        <mesh position={[0, 4.7, 0]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[4.8, 3.0, 21.0]} />
        </mesh>

        {/* Weathered G.I. Corrugated Roof at Y = 6.35m */}
        <mesh position={[0, 6.35, 0]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[5.4, 0.22, 21.6]} />
        </mesh>
        <mesh position={[0, 6.48, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[5.45, 0.08, 0.35]} />
        </mesh>

        {/* Ground Floor Covered Side Porch (Elevated Y=0.25m) */}
        <mesh position={[2.7, 0.22, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[1.0, 0.06, 21.0]} />
        </mesh>

        {/* Second Floor Catwalk Balcony / Porch (Elevated Y=3.15m) */}
        <mesh position={[2.7, 3.15, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[1.0, 0.12, 21.0]} />
        </mesh>
        {/* 2nd Floor Catwalk Canopy Eave */}
        <mesh position={[3.15, 6.0, 0]} rotation={[0, 0, -0.2]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[1.2, 0.08, 21.2]} />
        </mesh>
        {/* 2-Story Structural Steel Support Columns (Extending up to Y = 6.0m) */}
        {[-9, -4.5, 0, 4.5, 9].map((zOff, i) => (
          <mesh key={`b1-post-${i}`} position={[3.15, 3.0, zOff]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.08, 6.0, 0.08]} />
          </mesh>
        ))}
        {/* 2nd Floor Steel Safety Guardrails */}
        <mesh position={[3.18, 3.65, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.04, 0.9, 21.0]} />
        </mesh>

        {/* Exterior 2nd Floor Access Steel Staircase (at Front End z = -10.0) */}
        <group position={[3.15, 1.55, -10.0]}>
          <mesh rotation={[0.65, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.9, 3.8, 0.08]} />
          </mesh>
          <mesh position={[0.45, 0.9, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.04, 0.9, 3.2]} />
          </mesh>
        </group>

        {/* 4 Ground Floor Bedroom Entrance Doors */}
        {[-7.5, -2.5, 2.5, 7.5].map((zOff, i) => (
          <group key={`b1-door-gf-${i}`} position={[2.42, 1.05, zOff]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.08, 2.0, 1.1]} />
            </mesh>
            <mesh position={[0.02, 0, 0]} material={MAT_ASPHALT_DARK}>
              <boxGeometry args={[0.04, 1.9, 1.0]} />
            </mesh>
            <mesh position={[0.04, 0, 0.38]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.05, 0.12, 0.04]} />
            </mesh>
          </group>
        ))}

        {/* 4 Second Floor Bedroom Entrance Doors */}
        {[-7.5, -2.5, 2.5, 7.5].map((zOff, i) => (
          <group key={`b1-door-2f-${i}`} position={[2.42, 4.15, zOff]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.08, 2.0, 1.1]} />
            </mesh>
            <mesh position={[0.02, 0, 0]} material={MAT_ASPHALT_DARK}>
              <boxGeometry args={[0.04, 1.9, 1.0]} />
            </mesh>
            <mesh position={[0.04, 0, 0.38]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.05, 0.12, 0.04]} />
            </mesh>
          </group>
        ))}

        {/* Outdoor Laundry Wash Basin & Water Spigot Station (Near Back z = -9.5) */}
        <group position={[2.8, 0.45, -9.5]}>
          <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.6, 0.7, 1.2]} />
          </mesh>
          <mesh position={[0, 0.4, 0]} material={MAT_CANAL_WATER}>
            <boxGeometry args={[0.5, 0.1, 1.1]} />
          </mesh>
          <mesh position={[0, 0.65, -0.45]} material={MAT_RED_BOOTH}>
            <boxGeometry args={[0.08, 0.15, 0.15]} />
          </mesh>
        </group>

        {/* ═══ PHOTOREALISTIC FILIPINO WORKER LAUNDRY DRYING SYSTEM ═══ */}
        <group position={[2.85, 1.65, 3.5]}>
          {/* Dual T-Frame Wooden Posts */}
          <group position={[0, 0, -2.2]}>
            <mesh position={[0, 0, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.06, 1.6, 0.06]} />
            </mesh>
            <mesh position={[0, 0.75, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.06, 0.06, 0.8]} />
            </mesh>
          </group>
          <group position={[0, 0, 2.2]}>
            <mesh position={[0, 0, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.06, 1.6, 0.06]} />
            </mesh>
            <mesh position={[0, 0.75, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.06, 0.06, 0.8]} />
            </mesh>
          </group>

          {/* 3 Parallel Galvanized Steel Clothesline Wires */}
          {[-0.25, 0, 0.25].map((xWire, i) => (
            <mesh key={`wire-${i}`} position={[xWire, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_FRAME}>
              <cylinderGeometry args={[0.003, 0.003, 4.4, 6]} />
            </mesh>
          ))}

          {/* 1. Navy Blue Bath Towel (Draped over Wire 1 with Wooden Clothespins) */}
          <group position={[-0.25, 0.74, -1.2]}>
            {/* Clothespins */}
            <mesh position={[0, 0.02, -0.16]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            <mesh position={[0, 0.02, 0.16]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            {/* Front & Back Draped Towel Flaps */}
            <mesh position={[-0.012, -0.22, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
              <boxGeometry args={[0.01, 0.44, 0.42]} />
            </mesh>
            <mesh position={[0.012, -0.22, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
              <boxGeometry args={[0.01, 0.44, 0.42]} />
            </mesh>
            {/* Top Fold Ridge */}
            <mesh position={[0, 0, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
              <boxGeometry args={[0.034, 0.02, 0.42]} />
            </mesh>
          </group>

          {/* 2. White Cotton Bath Towel (Draped over Center Wire) */}
          <group position={[0, 0.74, -0.3]}>
            <mesh position={[0, 0.02, -0.14]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            <mesh position={[0, 0.02, 0.14]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            <mesh position={[-0.012, -0.2, 0]} material={MAT_WHITE_PAINT}>
              <boxGeometry args={[0.01, 0.4, 0.38]} />
            </mesh>
            <mesh position={[0.012, -0.2, 0]} material={MAT_WHITE_PAINT}>
              <boxGeometry args={[0.01, 0.4, 0.38]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={MAT_WHITE_PAINT}>
              <boxGeometry args={[0.034, 0.02, 0.38]} />
            </mesh>
          </group>

          {/* 3. Hi-Vis Safety Green Work Shirt (Hanging on Hanger / Wire 3) */}
          <group position={[0.25, 0.74, 0.6]}>
            {/* Clothespin */}
            <mesh position={[0, 0.02, 0]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.02]} />
            </mesh>
            {/* Shirt Body Main Fold */}
            <mesh position={[0, -0.22, 0]} material={MAT_WORKER_VEST_GREEN}>
              <boxGeometry args={[0.03, 0.42, 0.46]} />
            </mesh>
            {/* Flared Short Sleeves */}
            <mesh position={[0, -0.1, -0.26]} rotation={[0.2, 0, 0]} material={MAT_WORKER_VEST_GREEN}>
              <boxGeometry args={[0.04, 0.18, 0.12]} />
            </mesh>
            <mesh position={[0, -0.1, 0.26]} rotation={[-0.2, 0, 0]} material={MAT_WORKER_VEST_GREEN}>
              <boxGeometry args={[0.04, 0.18, 0.12]} />
            </mesh>
            {/* Retroreflective Hi-Vis Silver Chest Stripe */}
            <mesh position={[0, -0.18, 0]} material={MAT_WHITE_PAINT}>
              <boxGeometry args={[0.036, 0.06, 0.47]} />
            </mesh>
          </group>

          {/* 4. Navy Denim Work Jeans (Draped over Center Wire at z = 1.4) */}
          <group position={[0, 0.74, 1.4]}>
            <mesh position={[0, 0.02, -0.1]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            <mesh position={[0, 0.02, 0.1]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.02, 0.04, 0.015]} />
            </mesh>
            {/* Folded Denim Pants Legs */}
            <mesh position={[-0.014, -0.28, 0]} material={MAT_PANTS_JEANS}>
              <boxGeometry args={[0.012, 0.54, 0.3]} />
            </mesh>
            <mesh position={[0.014, -0.28, 0]} material={MAT_PANTS_JEANS}>
              <boxGeometry args={[0.012, 0.54, 0.3]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={MAT_PANTS_JEANS}>
              <boxGeometry args={[0.038, 0.02, 0.3]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ═══ MIDDLE STRUCTURE: OPEN-AIR LONG WORKERS COMMUNAL KITCHEN ("KUSINA NG MGA MANGGAGAWA") ═══ */}
      {/* Replaced enclosed middle house with open cooking pavilion with rice stations, gas ranges, woks, sinks & dining tables */}
      <group position={[0, 0, 0]}>
        {/* 1. Heavy Reinforced Concrete Platform Base Slab */}
        <mesh position={[0, 0.1, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[4.9, 0.2, 21.4]} />
        </mesh>

        {/* 2. Low Waist-Height Concrete Perimeter Half-Walls (0.85m height, open breezeway above) */}
        {/* West Side Low Walls (Leaves 3m open breezeway at Z = 0) */}
        <mesh position={[-2.38, 0.52, -5.5]} material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.14, 0.85, 9.6]} />
        </mesh>
        <mesh position={[-2.38, 0.52, 5.5]} material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.14, 0.85, 9.6]} />
        </mesh>
        {/* East Side Low Walls (Leaves 3m open breezeway at Z = 0) */}
        <mesh position={[2.38, 0.52, -5.5]} material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.14, 0.85, 9.6]} />
        </mesh>
        <mesh position={[2.38, 0.52, 5.5]} material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[0.14, 0.85, 9.6]} />
        </mesh>

        {/* North & South End Entrance Threshold Ramps with Yellow Safety Lines */}
        <mesh position={[0, 0.21, -10.5]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
          <planeGeometry args={[2.4, 0.12]} />
        </mesh>
        <mesh position={[0, 0.21, 10.5]} rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
          <planeGeometry args={[2.4, 0.12]} />
        </mesh>

        {/* 3. Structural Steel Upright Columns (14 Posts around open pavilion) */}
        {[-9, -6, -3, 0, 3, 6, 9].map((zOff, i) => (
          <React.Fragment key={`kit-col-${i}`}>
            <mesh position={[-2.38, 1.8, zOff]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.12, 3.4, 0.12]} />
            </mesh>
            <mesh position={[2.38, 1.8, zOff]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.12, 3.4, 0.12]} />
            </mesh>
            {/* Transverse Steel Roof Trusses */}
            <mesh position={[0, 3.42, zOff]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[4.88, 0.1, 0.08]} />
            </mesh>
          </React.Fragment>
        ))}

        {/* 4. Open Monitor Roof Canopy with Raised Smoke Ridge Ventilator */}
        <mesh position={[-1.4, 3.8, 0]} rotation={[0, 0, 0.16]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[2.6, 0.12, 21.8]} />
        </mesh>
        <mesh position={[1.4, 3.8, 0]} rotation={[0, 0, -0.16]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[2.6, 0.12, 21.8]} />
        </mesh>
        {/* Raised Central Smoke Exhaust Monitor Ridge */}
        <mesh position={[0, 4.25, 0]} castShadow material={MAT_ROOF_CAP}>
          <boxGeometry args={[1.9, 0.12, 22.0]} />
        </mesh>
        {/* Translucent Daylight Skylights */}
        {[-6, 0, 6].map((zOff, i) => (
          <mesh key={`kit-sky-${i}`} position={[0, 4.28, zOff]} material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[1.7, 0.08, 2.2]} />
          </mesh>
        ))}

        {/* 5. Overhead High-Lumen Industrial Dual-Tube LED Light Fixtures */}
        {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((zOff, i) => (
          <IndustrialKitchenOverheadLedFixture key={`kit-led-fixture-${i}`} position={[0, 3.35, zOff]} />
        ))}

        {/* 6. Painted Kitchen Designation Signboard */}
        <group position={[0, 3.0, -10.4]}>
          <mesh material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[3.2, 0.45, 0.06]} />
          </mesh>
          <mesh position={[0, 0, 0.035]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[3.0, 0.35, 0.02]} />
          </mesh>
        </group>

        {/* ═══ 7. CONNECTING COVERED BREEZEWAY CORRIDOR (BRIDGING BARRACKS 1 TO KITCHEN) ═══ */}
        <group position={[-3.6, 0, 0]}>
          <mesh position={[0, 3.1, 0]} castShadow material={MAT_ROOF_CAP}>
            <boxGeometry args={[2.5, 0.10, 3.6]} />
          </mesh>
          {/* Timber Posts */}
          <mesh position={[-1.1, 1.5, -1.6]} material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[0.1, 3.0, 0.1]} />
          </mesh>
          <mesh position={[-1.1, 1.5, 1.6]} material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[0.1, 3.0, 0.1]} />
          </mesh>
          <mesh position={[1.1, 1.5, -1.6]} material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[0.1, 3.0, 0.1]} />
          </mesh>
          <mesh position={[1.1, 1.5, 1.6]} material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[0.1, 3.0, 0.1]} />
          </mesh>
          {/* Raised Wooden Walkway Platform */}
          <mesh position={[0, 0.24, 0]} receiveShadow material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[2.4, 0.08, 3.4]} />
          </mesh>
        </group>

        {/* ═══ 8. CONTINUOUS 18.4-METER LONG CENTRAL DOUBLE-SIDED KITCHEN ISLAND (X = 0) ═══ */}
        {/* Usable side-by-side from both West (Barracks 1) and East (Barracks 3) with unobstructed wide aisles */}
        <group position={[0, 0, 0]}>
          {/* Main Heavy Concrete Base Island Counter Body */}
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
            <boxGeometry args={[1.5, 0.85, 18.4]} />
          </mesh>
          {/* Heavy-Duty Food-Grade Stainless Steel Island Countertop */}
          <mesh position={[0, 0.96, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[1.56, 0.04, 18.46]} />
          </mesh>

          {/* Central Stainless Dividing Splashback Spine & Dual-Sided Spice Shelf (Along Center X = 0) */}
          <mesh position={[0, 1.18, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.08, 0.42, 18.4]} />
          </mesh>
          {/* Two-Tier Condiment Shelves along spine holding Datu Puti vinegar, soy sauce, ketchup, salt & oil */}
          {[-7.0, -3.5, 0.0, 3.5, 7.0].map((zShelf, i) => (
            <group key={`spine-shelf-${i}`} position={[0, 1.22, zShelf]}>
              {/* West-facing condiments (X = -0.08) */}
              <group position={[-0.08, 0, 0]}>
                <mesh position={[0, 0.08, -0.22]} material={MAT_WHITE_PAINT}>
                  <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.08, 0]} material={MAT_ASPHALT_DARK}>
                  <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.08, 0.22]} material={MAT_RED_BOOTH}>
                  <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
                </mesh>
              </group>
              {/* East-facing condiments (X = +0.08) */}
              <group position={[0.08, 0, 0]}>
                <mesh position={[0, 0.08, -0.22]} material={MAT_WHITE_PAINT}>
                  <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.08, 0]} material={MAT_ASPHALT_DARK}>
                  <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.08, 0.22]} material={MAT_RED_BOOTH}>
                  <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
                </mesh>
              </group>
            </group>
          ))}

          {/* Overhead Suspended Stainless Utensil Rack with Hanging Ladles & Turners (Y = 2.15m) */}
          <group position={[0, 2.15, 0]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.3, 0.04, 18.0]} />
            </mesh>
            {/* Hanging Sandok / Siyanse */}
            {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((zHang, i) => (
              <group key={`hang-${i}`} position={[0, -0.15, zHang]}>
                <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.1]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <boxGeometry args={[0.015, 0.28, 0.02]} />
                </mesh>
                <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.1]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <boxGeometry args={[0.015, 0.28, 0.02]} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Central Undercounter Double Row of Blue & Red LPG Tanks (Solane / Gasul) */}
          {[-6.0, -2.5, 1.0, 4.5].map((zLpg, i) => (
            <group key={`island-lpg-${i}`} position={[0, -0.55, zLpg]}>
              <mesh position={[-0.32, 0, 0]} material={i % 2 === 0 ? MAT_CANAL_WATER : MAT_RED_BOOTH}>
                <cylinderGeometry args={[0.15, 0.15, 0.52, 12]} />
              </mesh>
              <mesh position={[0.32, 0, 0]} material={i % 2 === 0 ? MAT_RED_BOOTH : MAT_CANAL_WATER}>
                <cylinderGeometry args={[0.15, 0.15, 0.52, 12]} />
              </mesh>
            </group>
          ))}

          {/* ═════ CONDIMENT & SPICE SHELF (CENTRAL ISLAND CENTER AT Y = 1.05m) ═════ */}
          <group position={[0, 1.02, 2.4]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.35, 0.04, 1.2]} />
            </mesh>
            {/* Datu Puti Soy Sauce & Cane Vinegar Bottles */}
            {[-0.4, -0.2, 0.0, 0.2, 0.4].map((zBot, i) => (
              <group key={`condiment-${i}`} position={[0, 0.10, zBot]}>
                <mesh position={[-0.08, 0, 0]} material={i % 2 === 0 ? MAT_DATU_PUTI_YELLOW : MAT_DATU_PUTI_RED}>
                  <cylinderGeometry args={[0.028, 0.028, 0.16, 8]} />
                </mesh>
                <mesh position={[0.08, 0, 0]} material={i % 2 === 0 ? MAT_DATU_PUTI_RED : MAT_DATU_PUTI_YELLOW}>
                  <cylinderGeometry args={[0.028, 0.028, 0.16, 8]} />
                </mesh>
              </group>
            ))}
          </group>

          {/* ═════ WEST-SIDE COOKING STATIONS (FACING WEST FOR WEST BARRACKS) ═════ */}
          {/* West Rice Station: Commercial Steamers & Open Fluffy Jasmine Rice Calderos (Z = -8.2 to -4.0) */}
          <group position={[-0.48, 1.02, -8.2]}>
            <SteamedJasmineRiceCaldero />
          </group>
          <group position={[-0.48, 1.02, -6.8]}>
            {/* Commercial Rice Cooker */}
            <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.21, 0.19, 0.36, 14]} />
            </mesh>
            <mesh position={[0, 0.20, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <sphereGeometry args={[0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            </mesh>
            <mesh position={[0, 0.30, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
            </mesh>
            <mesh position={[-0.20, -0.06, 0]} material={MAT_RED_BOOTH}>
              <boxGeometry args={[0.01, 0.03, 0.03]} />
            </mesh>
            <AnimatedCookingSteam height={0.24} count={3} speed={1.2} />
          </group>
          <group position={[-0.48, 1.02, -5.4]}>
            <SteamedJasmineRiceCaldero />
          </group>
          <group position={[-0.48, 1.02, -4.0]}>
            <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.21, 0.19, 0.36, 14]} />
            </mesh>
            <mesh position={[0, 0.20, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <sphereGeometry args={[0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            </mesh>
            <mesh position={[0, 0.30, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
            </mesh>
          </group>

          {/* West 2: Dual-Burner Stoves with Open Sizzling & Simmering Dishes (Z = -2.5 to 2.6) */}
          {/* Stove 1: Garlic Fried Rice (Sinangag) & Hot Soup */}
          <group position={[-0.46, 1.02, -2.5]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <GarlicFriedRicePan />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <BoilingSinigangCaldero />
            </group>
          </group>

          {/* Stove 2: Open Simmering Chicken & Pork Adobo in Seasoned Kawali (Z = -0.8) */}
          <group position={[-0.46, 1.02, -0.8]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <SimmeringAdoboKawali />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <CrispyFriedTilapiaPan />
            </group>
          </group>

          {/* Stove 3: Open Boiling Sinigang na Baboy / Bangus in Caldero (Z = 0.9) */}
          <group position={[-0.46, 1.02, 0.9]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <BoilingSinigangCaldero />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <GinataangKalabasaKawali />
            </group>
          </group>

          {/* Stove 4: Crispy Fried Fish & Sauté Pan (Z = 2.6) */}
          <group position={[-0.46, 1.02, 2.6]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <CrispyFriedTilapiaPan />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <SimmeringAdoboKawali />
            </group>
          </group>

          {/* West 3: Food Prep & Hardwood Sangkalang Chopping Block (Z = 4.8) */}
          <group position={[-0.46, 0.98, 4.8]}>
            {/* Thick Round End-Grain Hardwood Chopping Block (Sangkalang) */}
            <mesh position={[0, 0.05, 0]} castShadow material={MAT_WOOD_CHOPPING}>
              <cylinderGeometry args={[0.20, 0.20, 0.08, 16]} />
            </mesh>
            {/* Chopped Raw Chicken & Pork Cubes on the Board */}
            {[-0.05, 0.03, 0.06].map((x, i) => (
              <mesh key={`raw-meat-${i}`} position={[x, 0.10, (i % 2 === 0 ? 0.03 : -0.04)]} material={MAT_CHICKEN_MEAT}>
                <boxGeometry args={[0.035, 0.025, 0.035]} />
              </mesh>
            ))}
            {/* Sliced Red Onions (Sibuyas) & Garlic Heads */}
            <mesh position={[-0.06, 0.10, -0.06]} material={MAT_DATU_PUTI_RED}>
              <sphereGeometry args={[0.022, 6, 6]} />
            </mesh>
            <mesh position={[0.08, 0.10, 0.06]} material={MAT_GARLIC_RICE_TOASTED}>
              <sphereGeometry args={[0.018, 6, 6]} />
            </mesh>
            {/* Stainless Meat Prep Tray */}
            <mesh position={[0.18, 0.02, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.16, 0.02, 0.32]} />
            </mesh>
          </group>

          {/* West 4: Stainless Double Washing Sink with Running Water (Z = 7.2) */}
          <group position={[-0.46, 0.98, 7.2]}>
            {[-0.6, 0.6].map((zSink, i) => (
              <group key={`west-sink-${i}`} position={[0, -0.15, zSink]}>
                <mesh material={MAT_STEEL_DARK}>
                  <boxGeometry args={[0.5, 0.28, 0.55]} />
                </mesh>
                <mesh position={[0, -0.04, 0]} material={MAT_CANAL_WATER}>
                  <boxGeometry args={[0.46, 0.06, 0.51]} />
                </mesh>
                {/* Gooseneck Faucet */}
                <mesh position={[0.22, 0.32, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
                </mesh>
                <mesh position={[0.14, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
                </mesh>
                {/* Running Translucent Water Stream */}
                <mesh position={[0.06, 0.22, 0]} material={MAT_CANAL_WATER}>
                  <cylinderGeometry args={[0.008, 0.008, 0.38, 6]} />
                </mesh>
              </group>
            ))}
          </group>


          {/* ═════ EAST-SIDE COOKING STATIONS (FACING EAST FOR EAST BARRACKS) ═════ */}
          {/* East Rice Station: Commercial Cookers & Steamed Rice Calderos (Z = -8.2 to -4.0) */}
          <group position={[0.48, 1.02, -8.2]}>
            <SteamedJasmineRiceCaldero />
          </group>
          <group position={[0.48, 1.02, -6.8]}>
            <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.21, 0.19, 0.36, 14]} />
            </mesh>
            <mesh position={[0, 0.20, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <sphereGeometry args={[0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            </mesh>
            <mesh position={[0, 0.30, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
            </mesh>
            <AnimatedCookingSteam height={0.24} count={3} speed={1.2} />
          </group>
          <group position={[0.48, 1.02, -5.4]}>
            <SteamedJasmineRiceCaldero />
          </group>
          <group position={[0.48, 1.02, -4.0]}>
            <mesh castShadow material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.21, 0.19, 0.36, 14]} />
            </mesh>
            <mesh position={[0, 0.20, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <sphereGeometry args={[0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            </mesh>
            <mesh position={[0, 0.30, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
            </mesh>
          </group>

          {/* East 2: Dual-Burner Stoves with Open Sizzling & Simmering Dishes (Z = -2.5 to 2.6) */}
          {/* Stove 1: Garlic Fried Rice & Hot Tinola Broth */}
          <group position={[0.46, 1.02, -2.5]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <GarlicFriedRicePan />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <BoilingSinigangCaldero />
            </group>
          </group>

          {/* Stove 2: Open Ginataang Kalabasa at Sitaw in Kawali (Z = -0.8) */}
          <group position={[0.46, 1.02, -0.8]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <GinataangKalabasaKawali />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <SimmeringAdoboKawali />
            </group>
          </group>

          {/* Stove 3: Open Boiling Sinigang na Baboy Caldero & Tilapia Pan (Z = 0.9) */}
          <group position={[0.46, 1.02, 0.9]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <BoilingSinigangCaldero />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <CrispyFriedTilapiaPan />
            </group>
          </group>

          {/* Stove 4: Sizzling Fried Fish & Adobo (Z = 2.6) */}
          <group position={[0.46, 1.02, 2.6]}>
            <mesh castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.08, 0.95]} />
            </mesh>
            <group position={[0, 0.04, -0.22]}>
              <CrispyFriedTilapiaPan />
            </group>
            <group position={[0, 0.04, 0.22]}>
              <SimmeringAdoboKawali />
            </group>
          </group>

          {/* East 3: Veggie Prep & Cutting Station (Z = 4.8) */}
          <group position={[0.46, 0.98, 4.8]}>
            <mesh position={[0, 0.05, 0]} castShadow material={MAT_WOOD_CHOPPING}>
              <cylinderGeometry args={[0.20, 0.20, 0.08, 16]} />
            </mesh>
            {/* Cut Kalabasa Squash & String Beans on the Board */}
            <mesh position={[-0.04, 0.10, 0.02]} material={MAT_SQUASH_KALABASA}>
              <boxGeometry args={[0.04, 0.03, 0.04]} />
            </mesh>
            <mesh position={[0.05, 0.10, -0.04]} rotation={[0, 0.4, 0]} material={MAT_STRING_BEANS}>
              <capsuleGeometry args={[0.01, 0.06, 4, 6]} />
            </mesh>
            {/* Whole Sayote & Ginger Knob */}
            <mesh position={[-0.06, 0.10, -0.06]} material={MAT_SILING_HABA}>
              <sphereGeometry args={[0.03, 8, 8]} />
            </mesh>
            <mesh position={[0.07, 0.10, 0.05]} material={MAT_BAMBOO_TIMBER}>
              <sphereGeometry args={[0.022, 6, 6]} />
            </mesh>
          </group>

          {/* East 4: Double Washing Sink Station (Z = 7.2) */}
          <group position={[0.46, 0.98, 7.2]}>
            {[-0.6, 0.6].map((zSink, i) => (
              <group key={`east-sink-${i}`} position={[0, -0.15, zSink]}>
                <mesh material={MAT_STEEL_DARK}>
                  <boxGeometry args={[0.5, 0.28, 0.55]} />
                </mesh>
                <mesh position={[0, -0.04, 0]} material={MAT_CANAL_WATER}>
                  <boxGeometry args={[0.46, 0.06, 0.51]} />
                </mesh>
                <mesh position={[-0.22, 0.32, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
                </mesh>
                <mesh position={[-0.14, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
                </mesh>
                <mesh position={[-0.06, 0.22, 0]} material={MAT_CANAL_WATER}>
                  <cylinderGeometry args={[0.008, 0.008, 0.38, 6]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* ═══ END STORAGE (NORTH & SOUTH ENDS) ═══ */}
        {/* North End: Stacks of 50kg Rice Sacks (Sinandomeng / Dinorado) with Open Rice Basin & Tabo */}
        <group position={[0, 0.45, -9.6]}>
          <mesh position={[0, -0.32, 0]} material={MAT_BAMBOO_TIMBER}>
            <boxGeometry args={[1.4, 0.12, 1.1]} />
          </mesh>
          <mesh position={[-0.28, -0.16, 0]} rotation={[0, 0.05, 0]} material={MAT_WHITE_PAINT}>
            <boxGeometry args={[0.45, 0.22, 0.76]} />
          </mesh>
          <mesh position={[0.28, -0.16, 0]} rotation={[0, -0.05, 0]} material={MAT_WHITE_PAINT}>
            <boxGeometry args={[0.45, 0.22, 0.76]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} rotation={[0, 1.5, 0]} material={MAT_WORKER_VEST_ORANGE}>
            <boxGeometry args={[0.45, 0.22, 0.76]} />
          </mesh>
          {/* Open Top Rice Sack with Visible Jasmine Rice */}
          <group position={[0, 0.26, 0]}>
            <mesh material={MAT_SIGNBOARD_TEAL}>
              <boxGeometry args={[0.42, 0.18, 0.72]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} material={MAT_JASMINE_RICE}>
              <boxGeometry args={[0.38, 0.04, 0.68]} />
            </mesh>
            {/* Plastic Rice Tabo / Dipper */}
            <mesh position={[0.10, 0.12, 0.1]} material={MAT_RED_BOOTH}>
              <cylinderGeometry args={[0.04, 0.035, 0.06, 8]} />
            </mesh>
          </group>
        </group>

        {/* South End: Water Jugs, Cooking Oil Containers & Fresh Produce Crates */}
        <group position={[0, 0.35, 9.6]}>
          {/* Blue 5-Gallon Water Refill Bottles */}
          <mesh position={[-0.38, 0, -0.2]} material={MAT_GALLON_ROYAL_BLUE}>
            <cylinderGeometry args={[0.18, 0.18, 0.44, 12]} />
          </mesh>
          <mesh position={[-0.38, 0, 0.2]} material={MAT_GALLON_ROYAL_BLUE}>
            <cylinderGeometry args={[0.18, 0.18, 0.44, 12]} />
          </mesh>
          {/* Yellow 20L Golden Fiesta Vegetable Oil Jugs */}
          <mesh position={[0.38, 0, -0.2]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.26, 0.38, 0.26]} />
          </mesh>
          <mesh position={[0.38, 0, 0.2]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.26, 0.38, 0.26]} />
          </mesh>
          {/* Produce Crate with Kalabasa & Sayote */}
          <mesh position={[0, -0.10, 0]} material={MAT_WORKER_VEST_GREEN}>
            <boxGeometry args={[0.36, 0.20, 0.50]} />
          </mesh>
          <mesh position={[-0.06, 0.04, 0]} material={MAT_SQUASH_KALABASA}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          <mesh position={[0.06, 0.04, 0.08]} material={MAT_SILING_HABA}>
            <sphereGeometry args={[0.05, 8, 8]} />
          </mesh>
        </group>

        {/* ═══ SAFETY & FIRE DEFENSE (Mounted Red ABC Fire Extinguishers on Columns) ═══ */}
        {[-6.0, 3.0].map((zExt, i) => (
          <React.Fragment key={`ext-pair-${i}`}>
            <group position={[-2.3, 1.4, zExt]}>
              <mesh material={MAT_RED_BOOTH}>
                <cylinderGeometry args={[0.07, 0.07, 0.45, 10]} />
              </mesh>
              <mesh position={[0, 0.25, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
              </mesh>
            </group>
            <group position={[2.3, 1.4, zExt]}>
              <mesh material={MAT_RED_BOOTH}>
                <cylinderGeometry args={[0.07, 0.07, 0.45, 10]} />
              </mesh>
              <mesh position={[0, 0.25, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
              </mesh>
            </group>
          </React.Fragment>
        ))}

        {/* ═══ DEDICATED NIGHTTIME KITCHEN COOKS (REDUCED TO 2 EFFICIENT PROFESSIONAL COOKS) ═══ */}
        {/* Head Master Chef: Stirring Wok, Grabbing Seasonings, Pouring Soy/Vinegar & Tasting Broth */}
        <AnimatedBarracksChef
          name="Mang Cardo"
          shirtColor="#EA580C"
          routineType="WEST_HEAD_CHEF"
          onSelectPerson={onSelectPerson}
        />

        {/* Prep Chef & Butcher: Chopping Ingredients on Hardwood Board, Washing, Loading into Caldero */}
        <AnimatedBarracksChef
          name="Kuya Ben"
          shirtColor="#0284C7"
          routineType="WEST_MEAT_BUTCHER"
          onSelectPerson={onSelectPerson}
        />

        {/* ═══ NIGHTTIME ATMOSPHERE & AMENITIES: OSCILLATING FAN & TABLETOP RADIO ═══ */}
        {/* Oscillating Industrial Stand Fan cooling the dining breezeway aisle */}
        <OscillatingElectricStandFan position={[-1.9, 0.2, 0.5]} rotation={[0, Math.PI / 4, 0]} />

        {/* Retro Transistor AM/FM Radio / Bluetooth Speaker on Condiment Spine Shelf */}
        <TabletopTransistorRadio position={[0, 1.45, 2.4]} rotation={[0, -Math.PI / 2, 0]} />

        {/* ═══ AUTHENTIC OFF-DUTY FILIPINO WORKERS IN PAMBAHAY ATTIRE & NIGHT ROUTINES ═══ */}
        {/* 1. Kuya Jun: Relaxing on blue monobloc stool browsing smartphone with real-time screen face glow */}
        <NighttimeSmartphoneWorker position={[-1.85, 0.2, 3.4]} rotation={[0, Math.PI * 0.45, 0]} />

        {/* 2. Kuya Larry: Enjoying a cigarette ("Yosi Break") leaning against breezeway half-wall */}
        <NighttimeSmokingWorker position={[-2.15, 0.2, 6.2]} rotation={[0, Math.PI * 0.4, 0]} />

        {/* 3. Mang Noel & Kuya Dennis: Kwuntuhan / Chit-chatting over hot 3-in-1 coffee & SkyFlakes crackers */}
        <NighttimeKwuntuhanDuo position={[1.85, 0.2, -4.5]} rotation={[0, 0, 0]} />

        {/* 4. Kuya Mar: Washing clothes ("Labada") in plastic wash basin (batya) with soap suds & hanging laundry */}
        <NighttimeLaundryWorker position={[1.65, 0.2, 8.4]} rotation={[0, -Math.PI * 0.5, 0]} />

        {/* 5. Kuya Randy: Lounging on wooden bench winding down and stretching after a hard day */}
        <NighttimeLoungingWorker position={[-1.85, 0.2, -7.2]} rotation={[0, Math.PI * 0.5, 0]} />
      </group>

      {/* ═══ BARRACKS 3 (RIGHTMOST - EAST DORMITORY WITH PRIVATE ROOM MODULES) ═══ 2-STORY BUILDING (6.4M HEIGHT) ═══ */}
      {/* Photo 1: 2-Story dark slate corrugated roof dormitory with 10 room module bays, 2nd floor catwalk balcony & staircase */}
      <group position={[7.2, 0, 0]}>
        {/* Ground Floor Wall Box (Warm Slate Fiber Cement) */}
        <mesh position={[0, 1.55, 0]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[4.6, 2.9, 21.0]} />
        </mesh>
        {/* Inter-Floor Concrete Slab Divider */}
        <mesh position={[0, 3.05, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[4.8, 0.14, 21.2]} />
        </mesh>
        {/* Second Floor Wall Box */}
        <mesh position={[0, 4.55, 0]} castShadow receiveShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[4.6, 2.9, 21.0]} />
        </mesh>

        {/* Dark Slate Corrugated Roof at Y = 6.15m */}
        <mesh position={[0, 6.15, 0]} castShadow material={MAT_ROOF_CAP}>
          <boxGeometry args={[5.2, 0.20, 21.6]} />
        </mesh>

        {/* Ground Floor Side Walkway Skirt (Elevated Y=0.25m) */}
        <mesh position={[-2.6, 0.22, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[1.2, 0.06, 21.0]} />
        </mesh>

        {/* Second Floor Catwalk Balcony Walkway (Elevated Y=3.05m) */}
        <mesh position={[-2.6, 3.05, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[1.2, 0.12, 21.0]} />
        </mesh>
        {/* 2nd Floor Overhead Canopy Eave */}
        <mesh position={[-2.8, 5.85, 0]} rotation={[0, 0, 0.18]} castShadow material={MAT_ROOF_CAP}>
          <boxGeometry args={[1.0, 0.08, 21.2]} />
        </mesh>
        {/* 2-Story Structural Steel Support Columns */}
        {[-9, -4.5, 0, 4.5, 9].map((zOff, i) => (
          <mesh key={`b3-post-${i}`} position={[-2.8, 2.9, zOff]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.08, 5.8, 0.08]} />
          </mesh>
        ))}
        {/* 2nd Floor Steel Safety Guardrail */}
        <mesh position={[-2.82, 3.55, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.04, 0.9, 21.0]} />
        </mesh>

        {/* Exterior 2nd Floor Access Steel Staircase (at Front End z = -10.0) */}
        <group position={[-2.8, 1.5, -10.0]}>
          <mesh rotation={[0.65, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.9, 3.7, 0.08]} />
          </mesh>
          <mesh position={[-0.45, 0.85, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.04, 0.9, 3.1]} />
          </mesh>
        </group>

        {/* 5 Ground Floor Room Entrance Doors & Mounted AC Louver Units */}
        {[-8.0, -4.0, 0, 4.0, 8.0].map((zOff, i) => (
          <group key={`b3-room-gf-${i}`} position={[-2.32, 1.05, zOff]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.08, 2.0, 1.05]} />
            </mesh>
            <mesh position={[-0.02, 0, 0]} material={MAT_ASPHALT_DARK}>
              <boxGeometry args={[0.04, 1.9, 0.95]} />
            </mesh>
            <mesh position={[-0.04, 0, -0.32]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.05, 0.12, 0.04]} />
            </mesh>
            <mesh position={[0.08, 0.95, 0]} material={MAT_STEEL_FRAME}>
              <boxGeometry args={[0.25, 0.38, 0.55]} />
            </mesh>
          </group>
        ))}

        {/* 5 Second Floor Room Entrance Doors & Mounted AC Louver Units */}
        {[-8.0, -4.0, 0, 4.0, 8.0].map((zOff, i) => (
          <group key={`b3-room-2f-${i}`} position={[-2.32, 4.05, zOff]}>
            <mesh material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.08, 2.0, 1.05]} />
            </mesh>
            <mesh position={[-0.02, 0, 0]} material={MAT_ASPHALT_DARK}>
              <boxGeometry args={[0.04, 1.9, 0.95]} />
            </mesh>
            <mesh position={[-0.04, 0, -0.32]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.05, 0.12, 0.04]} />
            </mesh>
            <mesh position={[0.08, 0.95, 0]} material={MAT_STEEL_FRAME}>
              <boxGeometry args={[0.25, 0.38, 0.55]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ═══ COMMUNAL WASHROOM & LATRINE BLOCK (BACKGROUND NORTH Z = -15.5 - PHOTO 2 TOP LEFT) ═══ */}
      <group position={[0, 0, -15.5]}>
        {/* Concrete Foundation Slab */}
        <mesh position={[0, 0.08, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[8.5, 0.14, 4.5]} />
        </mesh>
        {/* Masonry Block Walls */}
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[8.0, 2.5, 4.0]} />
        </mesh>
        {/* Sloped GI Roof */}
        <mesh position={[0, 2.7, 0]} rotation={[0.08, 0, 0]} castShadow material={MAT_ROOF_CORRUGATED}>
          <boxGeometry args={[8.6, 0.14, 4.6]} />
        </mesh>
        {/* 4 Cubicle Toilet / Shower Doors */}
        {[-3.0, -1.0, 1.0, 3.0].map((xOff, i) => (
          <mesh key={`latrine-door-${i}`} position={[xOff, 1.0, 2.02]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.9, 1.9, 0.06]} />
          </mesh>
        ))}
        {/* Exterior Wash Trough */}
        <mesh position={[0, 0.45, 2.4]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[7.2, 0.45, 0.5]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── NEXT-GEN HIGH-END ANIMATED WATER CANAL SYSTEM ───
function HighEndAnimatedWaterStream({ length, width, flowDirection = 'z' as 'x' | 'z' }: { length: number; width: number; flowDirection?: 'x' | 'z' }) {
  const [waterTex, setWaterTex] = React.useState<THREE.CanvasTexture | null>(null);

  React.useEffect(() => {
    // Generate high-resolution clean fluid water caustic texture
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Rich aquatic water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#0284C7");
    grad.addColorStop(0.3, "#0EA5E9");
    grad.addColorStop(0.5, "#38BDF8");
    grad.addColorStop(0.7, "#0EA5E9");
    grad.addColorStop(1, "#0284C7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Soft organic caustic ripples
    for (let i = 0; i < 30; i++) {
      const cx = (i % 5) * 100 + 50;
      const cy = Math.floor(i / 5) * 85 + 40;
      const r = 25 + (i % 3) * 15;
      const cGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      cGrad.addColorStop(0, "rgba(224, 242, 254, 0.4)");
      cGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.18)");
      cGrad.addColorStop(1, "rgba(2, 132, 199, 0)");
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smooth current stream lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      const y = (i / 16) * 512;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(128, y + 15, 384, y - 15, 512, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(flowDirection === 'x' ? length * 0.25 : 1, flowDirection === 'x' ? 1 : length * 0.25);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    setWaterTex(tex);
  }, [length, width, flowDirection]);

  useFrame((_, delta) => {
    if (waterTex) {
      const speed = delta * 0.25; // Smooth realistic fluid stream velocity
      if (flowDirection === 'z') {
        waterTex.offset.y -= speed;
      } else {
        waterTex.offset.x -= speed;
      }
    }
  });

  const isHorizontal = flowDirection === 'x';
  const wallThick = 0.16;

  return (
    <group>
      {/* 1. Recessed Concrete Channel Foundation Base */}
      <mesh position={[0, -0.04, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={isHorizontal ? [length + 0.1, 0.16, width + wallThick * 2] : [width + wallThick * 2, 0.16, length + 0.1]} />
      </mesh>

      {/* 2. Dark Wet Concrete Canal Bed */}
      <mesh position={[0, 0.01, 0]} receiveShadow material={MAT_ASPHALT_DARK}>
        <boxGeometry args={isHorizontal ? [length, 0.08, width] : [width, 0.08, length]} />
      </mesh>

      {/* 3. Beveled Civil Engineering Precast Concrete Curb Headers */}
      {isHorizontal ? (
        <>
          <mesh position={[0, 0.08, -(width / 2 + wallThick / 2)]} castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[length + 0.1, 0.18, wallThick]} />
          </mesh>
          <mesh position={[0, 0.08, (width / 2 + wallThick / 2)]} castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[length + 0.1, 0.18, wallThick]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-(width / 2 + wallThick / 2), 0.08, 0]} castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[wallThick, 0.18, length + 0.1]} />
          </mesh>
          <mesh position={[(width / 2 + wallThick / 2), 0.08, 0]} castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[wallThick, 0.18, length + 0.1]} />
          </mesh>
        </>
      )}

      {/* 4. Subsurface Aquatic Water Glow Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <planeGeometry args={isHorizontal ? [length, width * 0.85] : [width * 0.85, length]} />
        <meshBasicMaterial color="#0284C7" transparent opacity={0.4} />
      </mesh>

      {/* 5. Clean Photorealistic Flowing Water Surface (No Shadow Acne & No Z-Fighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={isHorizontal ? [length, width] : [width, length]} />
        {waterTex ? (
          <meshStandardMaterial
            map={waterTex}
            color="#00D4FF"
            roughness={0.02}
            metalness={0.88}
            transparent
            opacity={0.92}
            side={THREE.FrontSide}
          />
        ) : (
          <meshStandardMaterial color="#00B4D8" roughness={0.05} metalness={0.85} transparent opacity={0.9} side={THREE.FrontSide} />
        )}
      </mesh>
    </group>
  );
}

function TemfacilSiteDrainageCanal() {
  return (
    <group position={[0, 0.06, 0]}>
      {/* ═══ 1. HORIZONTAL DRAINAGE CANAL (BEHIND KITCHEN EXTENSION - ENDS AT X = 6.75) ═══ */}
      <group position={[8.75, 0, -32.5]}>
        <HighEndAnimatedWaterStream length={20.0} width={1.1} flowDirection="x" />
      </group>

      {/* ═══ 2. VERTICAL DRAINAGE CANAL (ALONG WALKWAY - ENDS AT Z = -33.5) ═══ */}
      <group position={[5.5, 0, -44.5]}>
        <HighEndAnimatedWaterStream length={22.0} width={1.1} flowDirection="z" />
      </group>

      {/* ═══ 3. CENTRAL L-JUNCTION CORNER CONCRETE DROP-BOX SUMP ═══ */}
      <group position={[5.5, 0.08, -32.5]}>
        <mesh castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
          <boxGeometry args={[1.5, 0.22, 1.5]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[1.2, 0.04, 1.2]} />
        </mesh>
      </group>

      {/* ═══ 4. GALVANIZED STEEL TRENCH SAFETY GRATES (PEDESTRIAN CROSSINGS) ═══ */}
      {/* Crossing 1: Kitchen Entry Access */}
      <group position={[5.5, 0.18, -32.5]}>
        {[-0.4, -0.2, 0, 0.2, 0.4].map((xOff, i) => (
          <mesh key={`grate-bar-1-${i}`} position={[xOff, 0, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.06, 0.04, 1.3]} />
          </mesh>
        ))}
      </group>

      {/* Crossing 2: Walkway Crossing */}
      <group position={[5.5, 0.18, -44.0]}>
        {[-0.4, -0.2, 0, 0.2, 0.4].map((xOff, i) => (
          <mesh key={`grate-bar-2-${i}`} position={[xOff, 0, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[0.06, 0.04, 1.4]} />
          </mesh>
        ))}
      </group>

      {/* ═══ 5. REAR PERIMETER CONCRETE OUTLET HEADWALL CULVERT ═══ */}
      <group position={[5.5, 0.12, -55.5]}>
        <mesh castShadow receiveShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[1.6, 0.38, 0.4]} />
        </mesh>
        <mesh position={[0, -0.06, 0.1]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.25, 0.25, 0.3, 16]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── HIGH-END ULTRA-DENSE 3D VOLUMETRIC FOREST GRASS TURF SYSTEM ───
function Instanced3DGrassLawn({ position, size }: { position: [number, number, number]; size: [number, number] }) {
  const tuftsMeshRef = useRef<THREE.InstancedMesh>(null);

  // Compute optimized tuft count dynamically based on lawn area (~2.5 tufts per sq meter up to 1,000 max)
  const tuftCount = React.useMemo(() => {
    return Math.min(Math.floor(size[0] * size[1] * 2.5), 1000);
  }, [size[0], size[1]]);

  const [pbrTexture, setPbrTexture] = React.useState<THREE.Texture | null>(null);

  // Load high-resolution PBR forest grass texture with repeat wrapping
  React.useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      "/textures/forest_grass_pbr.png",
      (tex) => {
        if (!isMounted) return;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(size[0] / 3.0, size[1] / 3.0);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setPbrTexture(tex);
      },
      undefined,
      (err) => console.warn("PBR grass texture load fallback:", err)
    );
    return () => { isMounted = false; };
  }, [size[0], size[1]]);

  // Create 6-blade organic radial tuft clump geometry (inner upright + outer arching tapered blades)
  const tuftClumpGeometry = React.useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const bladeAngles = [0, Math.PI / 3, (Math.PI * 2) / 3, Math.PI, (Math.PI * 4) / 3, (Math.PI * 5) / 3];

    bladeAngles.forEach((angle, idx) => {
      const isInner = idx % 2 === 0;
      const bladeHeight = isInner ? 0.65 : 0.52;
      const bladeWidth = isInner ? 0.11 : 0.14;

      const blade = new THREE.PlaneGeometry(bladeWidth, bladeHeight, 1, 3);
      blade.translate(0, bladeHeight * 0.5, 0);

      const posAttr = blade.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const factor = y / bladeHeight;
        const x = posAttr.getX(i);
        posAttr.setX(i, x * (1.0 - factor * 0.68)); // Organic blade tip taper
        posAttr.setZ(i, Math.pow(factor, 2) * (isInner ? 0.08 : 0.16)); // Outward arching curve
      }
      blade.rotateY(angle + (idx * 0.15));
      geometries.push(blade);
    });

    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    merged.computeVertexNormals();
    return merged!;
  }, []);

  const dummy = React.useMemo(() => new THREE.Object3D(), []);

  // Compute organic random placements & scale variation for dense lush turf
  const tuftData = React.useMemo(() => {
    const data: { x: number; z: number; scaleY: number; scaleXZ: number; rotY: number }[] = [];
    let seed = 54321;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const halfW = size[0] / 2 - 0.25;
    const halfD = size[1] / 2 - 0.25;

    for (let i = 0; i < tuftCount; i++) {
      const x = (lcg() - 0.5) * 2 * halfW;
      const z = (lcg() - 0.5) * 2 * halfD;
      const scaleY = 0.85 + lcg() * 0.65; // 0.85x to 1.5x height variation
      const scaleXZ = 0.9 + lcg() * 0.55;
      const rotY = lcg() * Math.PI * 2;

      data.push({ x, z, scaleY, scaleXZ, rotY });
    }
    return data;
  }, [size[0], size[1], tuftCount]);

  // Initialize instanced grass matrices once on mount
  React.useLayoutEffect(() => {
    if (!tuftsMeshRef.current || tuftData.length === 0) return;
    for (let i = 0; i < tuftData.length; i++) {
      const b = tuftData[i];
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(0, b.rotY, 0);
      dummy.scale.set(b.scaleXZ, b.scaleY, b.scaleXZ);
      dummy.updateMatrix();

      tuftsMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    tuftsMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [tuftData, dummy]);

  return (
    <group position={position}>
      {/* Rich Organic Forest Soil Base Mound */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[size[0] + 0.6, 0.04, size[1] + 0.6]} />
        <meshStandardMaterial color="#24421D" roughness={0.88} metalness={0.03} />
      </mesh>

      {/* Photorealistic Deep Forest Grass Ground Base (Eliminates ugly dark gaps) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={pbrTexture}
          color="#2A5C20"
          roughness={0.78}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Volumetric 3D Forest Grass Blades (Lightweight & Smooth) */}
      <instancedMesh
        ref={tuftsMeshRef}
        args={[tuftClumpGeometry, undefined, tuftCount]}
        position={[0, 0.052, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#38A12B"
          roughness={0.55}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* Natural Forest Boulders & Rock Outcroppings */}
      {[-16, -6, 6, 15].map((xOff, i) => (
        <group key={`rock-${i}`} position={[xOff, 0.22, (i % 2 === 0 ? 1 : -1) * (size[1] / 2 - 1.1)]}>
          <mesh castShadow material={MAT_CONCRETE_SLAB}>
            <dodecahedronGeometry args={[0.38 + (i % 3) * 0.14, 1]} />
          </mesh>
        </group>
      ))}

      {/* Lush Wild Shrub Accents along Lawn Fringe */}
      {[-14, -2, 11].map((xOff, i) => (
        <group key={`shrub-${i}`} position={[xOff, 0.28, -size[1] / 2 + 1.1]}>
          <mesh castShadow material={MAT_WORKER_VEST_GREEN}>
            <sphereGeometry args={[0.45, 8, 6]} />
          </mesh>
          <mesh position={[0, 0.38, 0]} material={i % 2 === 0 ? MAT_RED_BOOTH : MAT_YELLOW_SAFETY}>
            <sphereGeometry args={[0.16, 6, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TemfacilBasketballCourtAndToolboxMeeting
   Multipurpose Concrete Basketball Court & Weekly Tuesday Morning
   Safety Toolbox Meeting Assembly Area (6:30 AM - 7:40 AM PH Time).
   Sited between QA/QC Office (X=2) and Canteen (X=32) at X=17.0, Z=14.0.
   ═══════════════════════════════════════════════════════════════════════════ */

export function TemfacilBasketballCourtAndToolboxMeeting({ position = [17.0, 0, 14.0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* ═══ 1. CONCRETE BASKETBALL COURT SLAB & BORDER ═══ */}
      {/* Heavy Concrete Foundation Base Pad (Elevated Y: 0.18m) */}
      <mesh position={[0, 0.10, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[14.8, 0.16, 22.4]} />
      </mesh>
      {/* PBR Smooth Blue Slate Painted Court Surface */}
      <mesh position={[0, 0.190, 0]} receiveShadow>
        <boxGeometry args={[14.0, 0.015, 21.6]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Outer Court Navy Blue Border Paint Frame */}
      <mesh position={[0, 0.185, 0]} receiveShadow>
        <boxGeometry args={[14.6, 0.012, 22.2]} />
        <meshStandardMaterial color="#0F172A" roughness={0.8} />
      </mesh>

      {/* ═══ 2. HIGH-CONTRAST WHITE PAINTED COURT MARKINGS (WITH POLYGON OFFSET) ═══ */}
      {/* Boundary Frame Line (13.6m x 20.8m) */}
      <group position={[0, 0.205, 0]}>
        <mesh position={[0, 0, -10.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.6, 0.12]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[0, 0, 10.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.6, 0.12]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[-6.8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 20.8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[6.8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 20.8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>

        {/* Half-Court Center Line & Center Jump Circle */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.6, 0.12]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.74, 1.86, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>

        {/* North Key Paint Lane & Free Throw Circle */}
        <mesh position={[0, 0.002, -7.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 4.8]} />
          <meshStandardMaterial color="#1E293B" roughness={0.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[0, 0.004, -5.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.74, 1.86, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>

        {/* South Key Paint Lane & Free Throw Circle */}
        <mesh position={[0, 0.002, 7.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.8, 4.8]} />
          <meshStandardMaterial color="#1E293B" roughness={0.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <mesh position={[0, 0.004, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.74, 1.86, 32]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>
      </group>

      {/* ═══ 3. SINGLE STEEL BASKETBALL HOOP & BACKBOARD (SOUTH SIDE ONLY) ═══ */}
      {/* South Basketball Hoop Structure */}
      <group position={[0, 0.08, 10.0]}>
        {/* Padded Steel Support Pole */}
        <mesh position={[0, 1.8, 0.6]} castShadow material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.08, 0.1, 3.6, 12]} />
        </mesh>
        {/* Support Arm Extension */}
        <mesh position={[0, 3.0, 0.2]} rotation={[-0.4, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.1, 0.1, 0.9]} />
        </mesh>
        {/* Acrylic Backboard */}
        <mesh position={[0, 3.2, 0]} castShadow material={MAT_GLASS_FRAME}>
          <boxGeometry args={[1.8, 1.05, 0.06]} />
        </mesh>
        {/* Red Border Ring outline */}
        <mesh position={[0, 3.0, -0.04]} material={MAT_RED_BOOTH}>
          <boxGeometry args={[0.6, 0.45, 0.02]} />
        </mesh>
        {/* Orange Breakaway Steel Rim */}
        <mesh position={[0, 2.9, -0.24]} rotation={[Math.PI / 2, 0, 0]} material={MAT_WORKER_VEST_ORANGE}>
          <torusGeometry args={[0.23, 0.022, 12, 24]} />
        </mesh>
        {/* White Nylon Net */}
        <mesh position={[0, 2.7, -0.24]} material={MAT_WHITE_PAINT}>
          <cylinderGeometry args={[0.22, 0.14, 0.42, 12, 1, true]} />
        </mesh>
      </group>

      {/* ═══ 4. ELEVATED SAFETY STAGE RISER ═══ */}
      <ElevatedSafetyStageWithWhiteboard />

      {/* ═══ 5. MOBILE SAFETY WHITEBOARD IN OPEN COURT AREA (OFF THE STAGE AT X=-5.8, Z=-5.2) ═══ */}
      <MobileSafetyWhiteboardSign position={[-5.8, 0.08, -5.2]} rotation={[0, 0.45, 0]} />
    </group>
  );
}

// ─── HIGH-LEGIBILITY SAFETY WHITEBOARD CANVAS TEXTURE HOOK (2K ULTRA CRISP 2048x1536) ───
function useToolboxWhiteboardTexture() {
  return React.useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Solid Off-White Slate Canvas Background (Non-Reflective)
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 2048, 1536);

    // Outer Dark Navy Border Frame Line (Thickness 48px, Margin 24px)
    ctx.lineWidth = 48;
    ctx.strokeStyle = "#0F172A";
    ctx.strokeRect(24, 24, 2000, 1488);

    // Inner Whiteboard Field Box (Clear 60px Margin around printable area)
    const maxW = 1800; // Strictly bounded text width!

    // Dark Navy Top Header Banner Box
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(60, 60, 1928, 250);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TUMAUINI HYDRO ELECTRIC POWER PLANT PROJECT", 1024, 150, maxW);
    ctx.font = "700 48px sans-serif";
    ctx.fillText("TUESDAY MORNING SAFETY TOOLBOX MEETING", 1024, 240, maxW);

    // Daily Hazard Control Section Subheader (Solid Amber/Yellow Header Badge)
    ctx.fillStyle = "#EAB308";
    ctx.fillRect(60, 335, 1928, 90);

    ctx.fillStyle = "#0F172A";
    ctx.textAlign = "center";
    ctx.font = "900 56px Arial, sans-serif";
    ctx.fillText("CRITICAL HIGH-RISK HAZARD CONTROLS TODAY", 1024, 400, maxW);

    const bullets = [
      { text: "1. PENSTOCK TRENCH: 100% Fall Arrest Harness Hookup Required", bg: "#0F172A", color: "#FACC15" },
      { text: "2. RIVERBANK FLOOD: Real-Time Flow Telemetry Alarm Active", bg: "#0F766E", color: "#FFFFFF" },
      { text: "3. PPE CHECK: Hardhat, Hi-Vis Vest, Steel-Toe Boots & Gloves", bg: "#1E3A8A", color: "#FFFFFF" },
      { text: "4. SWITCHYARD: Authorized LOTO & Hot Work Permits Verified", bg: "#334155", color: "#FACC15" },
      { text: "5. EMERGENCY: Sound 3 Horn Blasts for Immediate Evacuation", bg: "#991B1B", color: "#FFFFFF" }
    ];

    bullets.forEach((b, i) => {
      const yPos = 450 + i * 144;
      // High-Contrast Solid Dark Badge Card Background
      ctx.fillStyle = b.bg;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(60, yPos, 1928, 120, 16);
        ctx.fill();
      } else {
        ctx.fillRect(60, yPos, 1928, 120);
      }

      // High-Contrast Bold Yellow / White Text
      ctx.fillStyle = b.color;
      ctx.font = "900 48px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(b.text, 95, yPos + 78, 1850);
    });

    // Deep Blood Red Footer Warning Banner Box
    ctx.fillStyle = "#991B1B";
    ctx.fillRect(60, 1220, 1928, 240);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 58px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAFETY FIRST • TARGET: ZERO ACCIDENTS TODAY!", 1024, 1365, maxW);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function MobileSafetyWhiteboardSign({
  position = [-5.8, 0.08, -5.2],
  rotation = [0, 0.45, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const whiteboardTexture = useToolboxWhiteboardTexture();

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy Steel Frame Box */}
      <mesh position={[0, 1.45, 0]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[2.88, 2.16, 0.08]} />
      </mesh>
      {/* Front Face with Ultra-Crisp Canvas Texture */}
      <mesh position={[0, 1.45, 0.043]} castShadow>
        <planeGeometry args={[2.80, 2.10]} />
        <meshStandardMaterial
          map={whiteboardTexture || undefined}
          color={whiteboardTexture ? "#FFFFFF" : "#CBD5E1"}
          roughness={0.9}
          metalness={0.0}
          emissive="#000000"
        />
      </mesh>

      {/* Dual Heavy Steel Support Legs Standing on Court Floor */}
      <mesh position={[-1.2, 0.65, 0]} castShadow material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.04, 0.04, 1.3, 8]} />
      </mesh>
      <mesh position={[1.2, 0.65, 0]} castShadow material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.04, 0.04, 1.3, 8]} />
      </mesh>
      {/* Base Foot Stand Pipes */}
      <mesh position={[-1.2, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
      </mesh>
      <mesh position={[1.2, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_DARK}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
      </mesh>
    </group>
  );
}

function ElevatedSafetyStageWithWhiteboard() {
  return (
    <group position={[0, 0.08, -7.5]}>
      {/* Heavy Steel Base Frame (Main Stage Platform) */}
      <mesh position={[0, 0.38, 0]} receiveShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[5.2, 0.76, 3.2]} />
      </mesh>
      {/* Mahogany Wooden Stage Decking Surface (Deck height at Y=0.78m -> World Y=14.88m) */}
      <mesh position={[0, 0.78, 0]} receiveShadow material={MAT_BAMBOO_TIMBER}>
        <boxGeometry args={[5.4, 0.06, 3.4]} />
      </mesh>
      {/* Yellow Safety Edge Warning Nosing Along Front & Perimeter */}
      <mesh position={[0, 0.81, 1.68]} material={MAT_YELLOW_SAFETY}>
        <boxGeometry args={[5.4, 0.02, 0.08]} />
      </mesh>
      <mesh position={[-2.68, 0.81, 0]} material={MAT_YELLOW_SAFETY}>
        <boxGeometry args={[0.08, 0.02, 3.4]} />
      </mesh>
      <mesh position={[2.68, 0.81, 0]} material={MAT_YELLOW_SAFETY}>
        <boxGeometry args={[0.08, 0.02, 3.4]} />
      </mesh>

      {/* ═══ REALISTIC BACKSTAGE ACCESS STAIRS (4-STEP STAINLESS STEEL/WOOD RISER WITH HANDRAILS) ═══ */}
      {/* Backstage stairs located at the rear of the stage facing Z = -2.2m */}
      <group position={[0, 0, -2.25]}>
        {/* Step 1: Bottom Step (Y=0.19m, Z=-0.48m) */}
        <mesh position={[0, 0.10, -0.48]} receiveShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.2, 0.18, 0.36]} />
        </mesh>
        <mesh position={[0, 0.19, -0.48]} receiveShadow material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[2.25, 0.03, 0.38]} />
        </mesh>
        <mesh position={[0, 0.20, -0.66]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[2.25, 0.015, 0.04]} />
        </mesh>

        {/* Step 2: Second Step (Y=0.38m, Z=-0.16m) */}
        <mesh position={[0, 0.20, -0.16]} receiveShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.2, 0.38, 0.36]} />
        </mesh>
        <mesh position={[0, 0.38, -0.16]} receiveShadow material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[2.25, 0.03, 0.38]} />
        </mesh>
        <mesh position={[0, 0.39, -0.34]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[2.25, 0.015, 0.04]} />
        </mesh>

        {/* Step 3: Third Step (Y=0.58m, Z=0.16m) */}
        <mesh position={[0, 0.30, 0.16]} receiveShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.2, 0.58, 0.36]} />
        </mesh>
        <mesh position={[0, 0.58, 0.16]} receiveShadow material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[2.25, 0.03, 0.38]} />
        </mesh>
        <mesh position={[0, 0.59, -0.02]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[2.25, 0.015, 0.04]} />
        </mesh>

        {/* Step 4: Top Landing Bridge to Stage Deck (Y=0.78m, Z=0.48m) */}
        <mesh position={[0, 0.40, 0.48]} receiveShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.2, 0.78, 0.36]} />
        </mesh>
        <mesh position={[0, 0.78, 0.48]} receiveShadow material={MAT_BAMBOO_TIMBER}>
          <boxGeometry args={[2.25, 0.03, 0.38]} />
        </mesh>

        {/* Left Safety Handrail on Backstage Stairs */}
        <group position={[-1.15, 0, 0]}>
          <mesh position={[0, 0.55, -0.48]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
          </mesh>
          <mesh position={[0, 0.95, 0.48]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0.48, 0, 0]} material={MAT_YELLOW_SAFETY}>
            <cylinderGeometry args={[0.03, 0.03, 1.25, 8]} />
          </mesh>
        </group>

        {/* Right Safety Handrail on Backstage Stairs */}
        <group position={[1.15, 0, 0]}>
          <mesh position={[0, 0.55, -0.48]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
          </mesh>
          <mesh position={[0, 0.95, 0.48]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0.48, 0, 0]} material={MAT_YELLOW_SAFETY}>
            <cylinderGeometry args={[0.03, 0.03, 1.25, 8]} />
          </mesh>
        </group>
      </group>

      {/* Safety Podium / Lectern on Elevated Stage (Positioned at Z=0.35m facing Audience at +Z) */}
      <mesh position={[0, 1.30, 0.35]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[1.0, 1.00, 0.6]} />
      </mesh>
      {/* Front Teal Logo Plaque */}
      <mesh position={[0, 1.30, 0.66]} material={MAT_SIGNBOARD_TEAL}>
        <boxGeometry args={[0.9, 0.5, 0.04]} />
      </mesh>
      {/* Gooseneck Microphone angled towards Speaker at rear */}
      <mesh position={[0, 1.82, 0.22]} rotation={[-0.35, 0, 0]} material={MAT_STEEL_FRAME}>
        <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
      </mesh>
      <mesh position={[0, 1.94, 0.14]} material={MAT_CHROME}>
        <sphereGeometry args={[0.03, 8, 8]} />
      </mesh>

      {/* High-Performance PA Loudspeaker Unit on Left Stage Wing */}
      <group position={[2.3, 0.78, 0.2]}>
        <mesh position={[0, 0.9, 0]} material={MAT_STEEL_FRAME}>
          <cylinderGeometry args={[0.04, 0.05, 1.8, 8]} />
        </mesh>
        <mesh position={[0, 1.7, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.5, 0.7, 0.4]} />
        </mesh>
      </group>
    </group>
  );
}
