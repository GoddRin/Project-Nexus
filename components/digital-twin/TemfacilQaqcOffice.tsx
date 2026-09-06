"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";
import {
  MAT_CONCRETE_SLAB_LIGHT,
  MAT_CONCRETE_SLAB,
  MAT_STEEL_DARK,
  MAT_STEEL_FRAME,
  MAT_GLASS_FRAME,
  MAT_GLASS_CLEAR,
  MAT_YELLOW_SAFETY,
  MAT_WHITE_PAINT,
  MAT_SIGNBOARD_TEAL,
  MAT_FOOD_STAINLESS_COUNTER,
  MAT_FOOD_STAINLESS_TRAY,
  MAT_DESK_LAMINATE,
  MAT_DESK_LEGS,
  MAT_WHITEBOARD_PANEL,
  MAT_MONITOR_BEZEL,
  MAT_LEATHER_BLACK_WORN,
  MAT_BINDER_BLUE,
  MAT_BINDER_GREEN,
  MAT_PAPER_DOCS,
  MAT_AC_UNIT_WHITE,
  MAT_SCHMIDT_HAMMER_CHROME,
  MAT_SCHMIDT_HAMMER_RED,
  MAT_FLUORESCENT_TUBE,
  MAT_FLUORESCENT_BODY,
  MAT_WATER_COOLER_WHITE,
  MAT_GALLON_ROYAL_BLUE,
  MAT_GALLON_CAP_WHITE,
  MAT_DOORKNOB_CHROME,
  MAT_CANAL_WATER,
  MAT_SPINE_BOARD_RED,
} from "./SharedMaterials";

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 PROCEDURAL HIGH-RESOLUTION QA/QC CANVAS TEXTURES (MEMOIZED SINGLETONS)
// ═══════════════════════════════════════════════════════════════════════════

let cachedQaqcPortalTexture: THREE.CanvasTexture | null = null;
function getQaqcPortalTexture(): THREE.CanvasTexture {
  if (cachedQaqcPortalTexture) return cachedQaqcPortalTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0B1329";
  ctx.fillRect(0, 0, 512, 256);

  // Top header bar
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.fillText("SCIC THEPP — QA/QC QUALITY CONTROL & NDT PORTAL", 14, 23);
  ctx.fillStyle = "#10B981";
  ctx.font = "bold 11px Inter, sans-serif";
  ctx.fillText("● SYSTEM ONLINE • ISO 9001:2015", 335, 23);

  // Status Cards
  const cards = [
    { title: "28D CONCRETE STRENGTH", val: "38.6 MPa", sub: "TARGET: 35.0 MPa (+10.3%)", color: "#10B981" },
    { title: "ACTIVE NCR / CAR", val: "0 OPEN", sub: "4 RESOLVED • 100% COMPLIANCE", color: "#38BDF8" },
    { title: "MATERIAL INSPECTIONS", val: "18 PASSED", sub: "ASTM C39 / C143 VERIFIED", color: "#F59E0B" },
  ];

  cards.forEach((c, idx) => {
    const x = 12 + idx * 164;
    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.roundRect(x, 48, 156, 76, 6);
    ctx.fill();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.fillText(c.title, x + 10, 64);

    ctx.fillStyle = c.color;
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText(c.val, x + 10, 94);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "8px Inter, sans-serif";
    ctx.fillText(c.sub, x + 10, 114);
  });

  // Compressive Strength Trend Chart Area
  ctx.fillStyle = "#111C38";
  ctx.beginPath();
  ctx.roundRect(12, 136, 488, 108, 6);
  ctx.fill();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.fillText("COMPRESSIVE STRENGTH CYLINDER BREAK LOG (7D vs 28D)", 24, 154);

  // Target threshold dashed line (35 MPa)
  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(30, 192);
  ctx.lineTo(480, 192);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#EF4444";
  ctx.font = "8px Inter, sans-serif";
  ctx.fillText("SPEC LIMIT: 35 MPa", 390, 188);

  // Bar Graph
  const bars = [36.2, 38.4, 37.1, 41.2, 39.0, 38.6, 42.5];
  bars.forEach((val, i) => {
    const bx = 50 + i * 62;
    const h = (val - 25) * 4.2;
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(bx, 226 - h, 28, h);
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 8px Inter, sans-serif";
    ctx.fillText(`${val}`, bx + 3, 220 - h);
    ctx.fillStyle = "#64748B";
    ctx.fillText(`B-${i + 1}`, bx + 6, 238);
  });

  cachedQaqcPortalTexture = new THREE.CanvasTexture(canvas);
  cachedQaqcPortalTexture.generateMipmaps = false;
  cachedQaqcPortalTexture.minFilter = THREE.LinearFilter;
  return cachedQaqcPortalTexture;
}

let cachedWhiteboardTexture: THREE.CanvasTexture | null = null;
function getWhiteboardTexture(): THREE.CanvasTexture {
  if (cachedWhiteboardTexture) return cachedWhiteboardTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 512, 256);

  // Header
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.fillText("SCIC THEPP • QA/QC DAILY QUALITY CONTROL LOG", 16, 26);
  ctx.fillStyle = "#0284C7";
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.fillText("PRC Civil / Materials Engineering Inspection Board • ASTM C39 / C143", 16, 42);

  // Divider
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 50);
  ctx.lineTo(496, 50);
  ctx.stroke();

  // Table rows
  const rows = [
    { loc: "Spillway Chute Slab #3", mix: "Class C30", sl: "95 mm", d7: "24.5 MPa", d28: "38.2 MPa", st: "PASSED" },
    { loc: "Powerhouse Substructure", mix: "Class C40", sl: "85 mm", d7: "31.0 MPa", d28: "43.5 MPa", st: "PASSED" },
    { loc: "Tunnel Portal Shotcrete", mix: "Class C25", sl: "115 mm", d7: "21.2 MPa", d28: "29.8 MPa", st: "PASSED" },
    { loc: "Penstock Anchor Block 4", mix: "Class C35", sl: "90 mm", d7: "27.8 MPa", d28: "Pending", st: "TESTING" },
  ];

  ctx.fillStyle = "#475569";
  ctx.font = "bold 9px Inter, sans-serif";
  ctx.fillText("LOCATION / STRUCTURE", 20, 68);
  ctx.fillText("MIX DESIGN", 180, 68);
  ctx.fillText("SLUMP", 260, 68);
  ctx.fillText("7-DAY", 320, 68);
  ctx.fillText("28-DAY", 380, 68);
  ctx.fillText("STATUS", 440, 68);

  rows.forEach((r, idx) => {
    const y = 92 + idx * 24;
    ctx.fillStyle = idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
    ctx.fillRect(16, y - 14, 480, 22);

    ctx.fillStyle = "#0F172A";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText(r.loc, 20, y);
    ctx.fillText(r.mix, 180, y);
    ctx.fillText(r.sl, 260, y);
    ctx.fillText(r.d7, 320, y);
    ctx.fillText(r.d28, 380, y);

    ctx.fillStyle = r.st === "PASSED" ? "#16A34A" : "#D97706";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillText(`✔ ${r.st}`, 440, y);
  });

  // Footer notes in dry-erase red marker style
  ctx.fillStyle = "#DC2626";
  ctx.font = "italic 11px Inter, sans-serif";
  ctx.fillText("Note: Slump cone calibration performed 07:00H. All cylinder cure baths @ 23°C ± 2°C.", 20, 210);
  ctx.fillStyle = "#0F766E";
  ctx.fillText("QA/QC Head: Engr. Elgine Mangcupang | Jr. QA/QC Engr: Jhon Charles Jayme", 20, 232);

  cachedWhiteboardTexture = new THREE.CanvasTexture(canvas);
  cachedWhiteboardTexture.generateMipmaps = false;
  cachedWhiteboardTexture.minFilter = THREE.LinearFilter;
  return cachedWhiteboardTexture;
}

let cachedCompReadoutTexture: THREE.CanvasTexture | null = null;
function getCompReadoutTexture(): THREE.CanvasTexture {
  if (cachedCompReadoutTexture) return cachedCompReadoutTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#022C22";
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = "#064E3B";
  ctx.fillRect(8, 8, 240, 112);

  ctx.fillStyle = "#34D399";
  ctx.font = "bold 10px monospace";
  ctx.fillText("HYDRAULIC LOAD CELL READOUT", 16, 24);

  ctx.fillStyle = "#10B981";
  ctx.font = "bold 32px monospace";
  ctx.fillText("38.45 MPa", 16, 64);

  ctx.fillStyle = "#A7F3D0";
  ctx.font = "bold 11px monospace";
  ctx.fillText("LOAD: 679.2 kN   RATE: 0.25 MPa/s", 16, 88);

  ctx.fillStyle = "#6EE7B7";
  ctx.font = "bold 10px monospace";
  ctx.fillText("SPEC: C35 | 28D BREAK | STATUS: PASSED", 16, 108);

  cachedCompReadoutTexture = new THREE.CanvasTexture(canvas);
  cachedCompReadoutTexture.generateMipmaps = false;
  cachedCompReadoutTexture.minFilter = THREE.LinearFilter;
  return cachedCompReadoutTexture;
}

let cachedBlueprintTexture: THREE.CanvasTexture | null = null;
function getBlueprintTexture(): THREE.CanvasTexture {
  if (cachedBlueprintTexture) return cachedBlueprintTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0369A1";
  ctx.fillRect(0, 0, 512, 256);

  // Subtle CAD grid
  ctx.strokeStyle = "#0284C7";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= 512; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Spillway Dam Profile Drawing Lines
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 220);
  ctx.lineTo(140, 220);
  ctx.lineTo(240, 70);
  ctx.lineTo(320, 70);
  ctx.bezierCurveTo(360, 70, 390, 140, 440, 220);
  ctx.lineTo(480, 220);
  ctx.stroke();

  // Rebar Grid Lines
  ctx.strokeStyle = "#7DD3FC";
  ctx.lineWidth = 1.0;
  for (let ry = 90; ry < 210; ry += 18) {
    ctx.beginPath();
    ctx.moveTo(180, ry);
    ctx.lineTo(420, ry);
    ctx.stroke();
  }

  // Title block
  ctx.fillStyle = "#0C4A6E";
  ctx.fillRect(320, 180, 180, 66);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1;
  ctx.strokeRect(320, 180, 180, 66);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 9px monospace";
  ctx.fillText("SCIC THEPP HYDRO PROJECT", 326, 196);
  ctx.font = "8px monospace";
  ctx.fillText("SPILLWAY STAGE 2 REINFORCEMENT", 326, 210);
  ctx.fillText("DWG NO: SCIC-CIV-SPW-042 REV. C", 326, 224);
  ctx.fillStyle = "#38BDF8";
  ctx.fillText("APPROVED FOR CONSTRUCTION (AFC)", 326, 238);

  cachedBlueprintTexture = new THREE.CanvasTexture(canvas);
  cachedBlueprintTexture.generateMipmaps = false;
  cachedBlueprintTexture.minFilter = THREE.LinearFilter;
  return cachedBlueprintTexture;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 TEMFACIL QA/QC MATERIALS TESTING LAB & TECHNICAL OFFICE
// ═══════════════════════════════════════════════════════════════════════════
export function TemfacilQaqcOffice({
  position = [22.5, 0, 20.5],
  isDetailVisible = true,
  timeMode = "MORNING",
}: {
  position?: [number, number, number];
  isDetailVisible?: boolean;
  timeMode?: AtmosphereTimeMode;
}) {
  const isNight = timeMode === "NIGHT" || timeMode === "SUNSET";

  // Memoize materials that use procedural textures
  const matQaqcPortalScreen = useMemo(() => {
    const tex = getQaqcPortalTexture();
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color("#0284C7"),
      emissiveMap: tex,
      emissiveIntensity: isNight ? 0.9 : 0.6,
      roughness: 0.25,
    });
  }, [isNight]);

  const matWhiteboard = useMemo(() => {
    const tex = getWhiteboardTexture();
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.15,
      metalness: 0.05,
    });
  }, []);

  const matCompReadout = useMemo(() => {
    const tex = getCompReadoutTexture();
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color("#059669"),
      emissiveMap: tex,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    });
  }, []);

  const matBlueprint = useMemo(() => {
    const tex = getBlueprintTexture();
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
    });
  }, []);

  return (
    <group position={position}>
      {/* ═════════════════════════════════════════════════════════════════════
          1. HOLLOW PERIMETER ENVELOPE (ZERO CLIPPING, TRUE ARCHITECTURAL ENCLOSURE)
          Dimensions: Width = 5.2m (X: -2.6 to +2.6)
                      Depth = 8.8m (Z: -4.4 to +4.4)
                      Height = 3.5m (Y: 0.0 to 3.5)
      ═════════════════════════════════════════════════════════════════════ */}

      {/* A. Polished Industrial Lab Concrete Floor Slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[5.2, 0.1, 8.8]} />
      </mesh>

      {/* B. Modern Dark Steel Roof Parapet Coping */}
      <mesh position={[0, 3.55, 0]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[5.6, 0.15, 9.2]} />
      </mesh>

      {/* C. Insulated Ceiling Slab */}
      <mesh position={[0, 3.45, 0]} material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[5.2, 0.1, 8.8]} />
      </mesh>

      {/* D. Seamless South (Rear) Wall — 0.2m solid thickness, perfectly sealing interior */}
      <mesh position={[0, 1.75, 4.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[5.2, 3.5, 0.2]} />
      </mesh>
      {/* Rear interior baseboard trim */}
      <mesh position={[0, 0.1, 4.19]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[5.0, 0.2, 0.02]} />
      </mesh>

      {/* E. North (Front) Facade Wall Framing Central Doorway */}
      {/* Left front wall section */}
      <mesh position={[-1.75, 1.75, -4.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[1.7, 3.5, 0.2]} />
      </mesh>
      {/* Right front wall section */}
      <mesh position={[1.75, 1.75, -4.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[1.7, 3.5, 0.2]} />
      </mesh>
      {/* Top lintel above doorway */}
      <mesh position={[0, 2.95, -4.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[1.8, 1.1, 0.2]} />
      </mesh>

      {/* F. Entrance Architectural Weather Canopy / Awning */}
      <group position={[0, 2.5, -4.75]}>
        <mesh material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.0, 0.08, 0.9]} />
        </mesh>
        {/* Support tie rods */}
        {[-0.85, 0.85].map((xOff, i) => (
          <mesh key={`canopy-rod-${i}`} position={[xOff, 0.45, 0.35]} rotation={[0.45, 0, 0]} material={MAT_STEEL_FRAME}>
            <cylinderGeometry args={[0.015, 0.015, 1.0, 8]} />
          </mesh>
        ))}
      </group>

      {/* G. Official QA/QC Signboard Mounted on Front Facade */}
      <group position={[0, 2.85, -4.42]}>
        <mesh material={MAT_SIGNBOARD_TEAL}>
          <boxGeometry args={[2.8, 0.42, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[2.7, 0.03, 0.01]} />
        </mesh>
      </group>

      {/* H. Industrial Weather-Sealed Steel Entrance Door (Slightly Open for View) */}
      <group position={[0, 1.2, -4.3]}>
        {/* Outer Steel Frame */}
        <mesh material={MAT_STEEL_DARK}>
          <boxGeometry args={[1.3, 2.4, 0.08]} />
        </mesh>
        {/* Door Leaf (Ajar 18 degrees allowing sightline into lab) */}
        <group position={[-0.55, 0, 0]} rotation={[0, 0.32, 0]}>
          <mesh position={[0.55, 0, 0]} material={MAT_STEEL_FRAME}>
            <boxGeometry args={[1.1, 2.3, 0.05]} />
          </mesh>
          {/* Narrow Safety Wire-Glass Vision Panel */}
          <mesh position={[0.75, 0.35, 0]} material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[0.22, 0.95, 0.06]} />
          </mesh>
          {/* Heavy-Duty Stainless Steel Panic Push Bar */}
          <mesh position={[0.55, -0.15, 0.04]} rotation={[0, 0, Math.PI / 2]} material={MAT_YELLOW_SAFETY}>
            <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          </mesh>
        </group>
      </group>

      {/* I. West Longitudinal Wall (facing Canteen) with High Clerestory Windows */}
      <mesh position={[-2.5, 1.75, 0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.2, 3.5, 8.8]} />
      </mesh>
      {/* High ventilation window louvers */}
      {[-1.8, 1.8].map((zOff, i) => (
        <group key={`w-louver-${i}`} position={[-2.5, 2.7, zOff]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={MAT_GLASS_FRAME}>
            <boxGeometry args={[1.8, 0.55, 0.22]} />
          </mesh>
          <mesh material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[1.7, 0.45, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* J. East Longitudinal Wall with Large Architectural Engineering Windows */}
      {/* Wall sections */}
      <mesh position={[2.5, 1.75, -3.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.2, 3.5, 2.2]} />
      </mesh>
      <mesh position={[2.5, 1.75, 0.0]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.2, 3.5, 2.2]} />
      </mesh>
      <mesh position={[2.5, 1.75, 3.3]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
        <boxGeometry args={[0.2, 3.5, 2.2]} />
      </mesh>
      {/* Window Spandrels & Headers */}
      {[-1.9, 1.9].map((zOff, i) => (
        <React.Fragment key={`e-win-wall-${i}`}>
          {/* Sill below window */}
          <mesh position={[2.5, 0.55, zOff]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
            <boxGeometry args={[0.2, 1.1, 1.6]} />
          </mesh>
          {/* Header above window */}
          <mesh position={[2.5, 3.1, zOff]} castShadow receiveShadow material={MAT_CONCRETE_SLAB_LIGHT}>
            <boxGeometry args={[0.2, 0.8, 1.6]} />
          </mesh>
          {/* Aluminum Window Assembly */}
          <group position={[2.5, 1.9, zOff]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_GLASS_FRAME}>
              <boxGeometry args={[1.6, 1.6, 0.08]} />
            </mesh>
            <mesh position={[0, 0, 0.01]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[1.48, 1.48, 0.04]} />
            </mesh>
            {/* Center Mullion */}
            <mesh material={MAT_GLASS_FRAME}>
              <boxGeometry args={[0.04, 1.5, 0.08]} />
            </mesh>
          </group>
        </React.Fragment>
      ))}

      {/* ═════════════════════════════════════════════════════════════════════
          2. DETAILED QA/QC INTERIOR (RENDERED WHEN TEMFACIL IS FOCUSED)
      ═════════════════════════════════════════════════════════════════════ */}
      {isDetailVisible && (
        <group name="QaqcOfficeInteriorProps">
          {/* ─── A. OVERHEAD COMMERCIAL LED TROFFER ILLUMINATION ─── */}
          {[-2.0, 2.0].map((zOff, zi) =>
            [-1.2, 1.2].map((xOff, xi) => (
              <group key={`led-${zi}-${xi}`} position={[xOff, 3.38, zOff]}>
                <mesh material={MAT_FLUORESCENT_BODY}>
                  <boxGeometry args={[1.2, 0.06, 0.6]} />
                </mesh>
                <mesh position={[0, -0.02, 0]} material={MAT_FLUORESCENT_TUBE}>
                  <boxGeometry args={[1.1, 0.02, 0.5]} />
                </mesh>
              </group>
            ))
          )}

          {/* Crisp, clean ambient laboratory fill lights */}
          <pointLight position={[0, 2.6, -1.8]} color="#E0F2FE" intensity={isNight ? 5.5 : 3.5} distance={7} />
          <pointLight position={[0, 2.6, 1.8]} color="#F0FDF4" intensity={isNight ? 5.5 : 3.5} distance={7} />

          {/* ─── B. SAFETY FLOOR DEMARCATION FOR TESTING LAB ZONE ─── */}
          <group position={[0, 0.105, 0.2]}>
            {/* Yellow caution perimeter stripe delineating testing lab from desk office */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={MAT_YELLOW_SAFETY}>
              <planeGeometry args={[4.8, 0.1]} />
            </mesh>
          </group>

          {/* ═════════════════════════════════════════════════════════════════
              ZONE 1: CIVIL MATERIALS TESTING LAB & CONCRETE LAB (REAR ZONE: Z > 0)
          ═════════════════════════════════════════════════════════════════ */}

          {/* 1. DIGITAL CONCRETE COMPRESSION TESTING MACHINE (CYLINDER CRUSHER) */}
          <group position={[-1.6, 0, 1.8]}>
            {/* Heavy Base Machine Casting with Hydraulic Piston Housing */}
            <mesh position={[0, 0.35, 0]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.9, 0.7, 0.8]} />
            </mesh>
            {/* Dual Heavy-Duty Chrome Vertical Columns */}
            {[-0.32, 0.32].map((cx, ci) => (
              <mesh key={`col-${ci}`} position={[cx, 1.25, 0]} material={MAT_STEEL_FRAME}>
                <cylinderGeometry args={[0.045, 0.045, 1.1, 16]} />
              </mesh>
            ))}
            {/* Massive Upper Crosshead Block */}
            <mesh position={[0, 1.85, 0]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.88, 0.24, 0.65]} />
            </mesh>
            {/* Upper Spherical Bearing Platen */}
            <mesh position={[0, 1.66, 0]} material={MAT_FOOD_STAINLESS_COUNTER}>
              <cylinderGeometry args={[0.13, 0.13, 0.14, 16]} />
            </mesh>
            {/* Lower Hydraulic Loading Platen */}
            <mesh position={[0, 0.76, 0]} material={MAT_FOOD_STAINLESS_COUNTER}>
              <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
            </mesh>
            {/* Concrete Test Cylinder Specimen Currently Loaded for 28-Day Break */}
            <mesh position={[0, 1.15, 0]} castShadow material={MAT_CONCRETE_SLAB}>
              <cylinderGeometry args={[0.075, 0.075, 0.65, 16]} />
            </mesh>
            {/* Polycarbonate Debris Safety Enclosure Shield (Transparent) */}
            <mesh position={[0, 1.25, 0.28]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.7, 0.95, 0.03]} />
            </mesh>

            {/* Side Digital Load Console with Real-Time Pressure Readout */}
            <group position={[0.55, 1.05, 0]}>
              <mesh material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.18, 0.55, 0.4]} />
              </mesh>
              {/* Glowing Digital Screen */}
              <mesh position={[0.095, 0.05, 0]} rotation={[0, Math.PI / 2, 0]} material={matCompReadout}>
                <planeGeometry args={[0.34, 0.22]} />
              </mesh>
              {/* Emergency Stop Mushroom Button */}
              <mesh position={[0.095, -0.16, -0.1]} rotation={[0, Math.PI / 2, 0]} material={MAT_SPINE_BOARD_RED}>
                <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
              </mesh>
            </group>
          </group>

          {/* 2. HEAVY INDUSTRIAL STAINLESS STEEL MATERIALS TESTING WORKBENCH */}
          <group position={[1.4, 0, 1.6]}>
            {/* Sturdy Welded Steel Bench Frame */}
            <mesh position={[0, 0.44, 0]} castShadow material={MAT_DESK_LEGS}>
              <boxGeometry args={[1.0, 0.88, 2.2]} />
            </mesh>
            {/* Heavy-Gauge Brushed Stainless Countertop */}
            <mesh position={[0, 0.89, 0]} receiveShadow material={MAT_FOOD_STAINLESS_COUNTER}>
              <boxGeometry args={[1.06, 0.04, 2.26]} />
            </mesh>

            {/* Precision Electronic Aggregate Batch Scale */}
            <group position={[-0.2, 0.95, -0.6]}>
              <mesh material={MAT_STEEL_FRAME}>
                <boxGeometry args={[0.3, 0.06, 0.35]} />
              </mesh>
              <mesh position={[0, 0.04, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
                <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
              </mesh>
            </group>

            {/* ASTM Brass Soil & Aggregate Sieve Stack (Nested gradation sieves) */}
            <group position={[-0.15, 0.91, 0.0]}>
              {[0, 0.06, 0.12, 0.18, 0.24].map((sy, i) => (
                <mesh key={`sieve-${i}`} position={[0, sy + 0.03, 0]} material={MAT_YELLOW_SAFETY}>
                  <cylinderGeometry args={[0.11, 0.11, 0.055, 16]} />
                </mesh>
              ))}
              {/* Sieve Top Cover Lid */}
              <mesh position={[0, 0.35, 0]} material={MAT_STEEL_FRAME}>
                <cylinderGeometry args={[0.115, 0.115, 0.03, 16]} />
              </mesh>
            </group>

            {/* Schmidt Concrete Test Rebound Hammer in Open Case */}
            <group position={[0.15, 0.93, 0.65]}>
              {/* Red Protective Molded Case */}
              <mesh material={MAT_SCHMIDT_HAMMER_RED}>
                <boxGeometry args={[0.36, 0.06, 0.42]} />
              </mesh>
              {/* Chrome Schmidt Hammer Plunger Body */}
              <mesh position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_SCHMIDT_HAMMER_CHROME}>
                <cylinderGeometry args={[0.025, 0.025, 0.28, 12]} />
              </mesh>
            </group>

            {/* Digital Vernier Caliper & Stainless Sampling Trowels */}
            <mesh position={[0.2, 0.92, -0.3]} rotation={[0, 0.3, 0]} material={MAT_DOORKNOB_CHROME}>
              <boxGeometry args={[0.06, 0.02, 0.24]} />
            </mesh>
          </group>

          {/* 3. TEMPERATURE-CONTROLLED WATER CURING BATH TANK (ASTM C511 COMPLIANT) */}
          <group position={[-1.5, 0, 3.4]}>
            {/* Insulated Stainless Steel Water Tank Body */}
            <mesh position={[0, 0.4, 0]} castShadow material={MAT_FOOD_STAINLESS_COUNTER}>
              <boxGeometry args={[1.3, 0.8, 0.9]} />
            </mesh>
            {/* Shimmering Curing Water Surface with Submerged Specimens */}
            <mesh position={[0, 0.72, 0]} material={MAT_CANAL_WATER}>
              <boxGeometry args={[1.2, 0.02, 0.8]} />
            </mesh>
            {/* Concrete Test Cylinders Submerged inside Curing Bath */}
            {[-0.35, 0, 0.35].map((cx, i) => (
              <mesh key={`sub-cyl-${i}`} position={[cx, 0.55, 0]} material={MAT_CONCRETE_SLAB}>
                <cylinderGeometry args={[0.075, 0.075, 0.3, 12]} />
              </mesh>
            ))}
            {/* Digital Water Temperature Circulation Thermostat Box */}
            <group position={[0, 1.2, 0.42]}>
              <mesh material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.25, 0.3, 0.08]} />
              </mesh>
              <mesh position={[0, 0.04, 0.042]} material={MAT_WHITE_PAINT}>
                <planeGeometry args={[0.18, 0.12]} />
              </mesh>
            </group>
          </group>

          {/* 4. MULTI-TIER CONCRETE CYLINDER SPECIMEN CURING & BREAK-TEST STORAGE RACK */}
          <group position={[0.6, 0, 3.8]}>
            {/* Heavy-Duty Slotted-Angle Industrial Steel Frame */}
            <mesh position={[0, 1.1, 0]} castShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[2.2, 2.2, 0.6]} />
            </mesh>
            {/* 3 Heavy Shelving Plates */}
            {[0.1, 0.8, 1.5].map((sy, i) => (
              <group key={`shelf-${i}`} position={[0, sy, 0]}>
                <mesh material={MAT_FOOD_STAINLESS_TRAY}>
                  <boxGeometry args={[2.15, 0.04, 0.58]} />
                </mesh>
                {/* Rows of Concrete Test Cylinders with Identification Markings */}
                {[-0.8, -0.4, 0.0, 0.4, 0.8].map((cx, ci) => (
                  <group key={`cyl-${ci}`} position={[cx, 0.17, 0]}>
                    <mesh castShadow material={MAT_CONCRETE_SLAB}>
                      <cylinderGeometry args={[0.07, 0.07, 0.3, 12]} />
                    </mesh>
                    {/* Identification Paper Tag / Batch Chalk Marker */}
                    <mesh position={[0, 0.08, 0.072]} material={MAT_PAPER_DOCS}>
                      <planeGeometry args={[0.06, 0.04]} />
                    </mesh>
                  </group>
                ))}
              </group>
            ))}
          </group>

          {/* ═════════════════════════════════════════════════════════════════
              ZONE 2: QA/QC HEAD OFFICE & TECHNICAL DESIGN WORKSTATION (FRONT ZONE: Z < 0)
          ═════════════════════════════════════════════════════════════════ */}

          {/* 5. QA/QC HEAD ENGINEER EXECUTIVE WORKSTATION DESK (Engr. Elgine Mangcupang) */}
          <group position={[-1.2, 0, -2.0]}>
            {/* Executive Laminate Desk Surface */}
            <mesh position={[0, 0.74, 0]} castShadow receiveShadow material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[2.0, 0.05, 1.1]} />
            </mesh>
            {/* Desk Steel Frame & Modesty Panel */}
            <mesh position={[0, 0.36, -0.45]} material={MAT_DESK_LEGS}>
              <boxGeometry args={[1.92, 0.72, 0.04]} />
            </mesh>
            {/* Drawer Pedestal on Left */}
            <mesh position={[-0.75, 0.36, 0]} material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[0.42, 0.72, 0.9]} />
            </mesh>

            {/* Dual High-Resolution Inspection & CAD Displays */}
            {/* Primary Monitor: QA/QC Non-Conformance & Compressive Batch Portal */}
            <group position={[-0.15, 0.76, -0.2]}>
              <mesh position={[0, 0.22, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.72, 0.44, 0.04]} />
              </mesh>
              {/* Screen Face */}
              <mesh position={[0, 0.22, 0.022]} material={matQaqcPortalScreen}>
                <planeGeometry args={[0.68, 0.4]} />
              </mesh>
              {/* Monitor Stand */}
              <mesh position={[0, 0.04, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
              </mesh>
              <mesh position={[0, 0.01, 0]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.22, 0.02, 0.18]} />
              </mesh>
            </group>

            {/* Secondary Monitor: Spillway CAD Structural Detailing */}
            <group position={[0.55, 0.76, -0.15]} rotation={[0, -0.25, 0]}>
              <mesh position={[0, 0.22, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.58, 0.38, 0.04]} />
              </mesh>
              <mesh position={[0, 0.22, 0.022]} material={matBlueprint}>
                <planeGeometry args={[0.54, 0.34]} />
              </mesh>
              <mesh position={[0, 0.04, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
              </mesh>
            </group>

            {/* Mechanical Keyboard & Mouse */}
            <mesh position={[0.1, 0.77, 0.2]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.42, 0.02, 0.14]} />
            </mesh>
            <mesh position={[0.42, 0.77, 0.2]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.08, 0.02, 0.12]} />
            </mesh>

            {/* Color-Coded QA/QC Compliance Binder Organizer */}
            <group position={[-0.8, 0.76, 0.15]}>
              {/* Blue Binders: DPWH Specs & ASTM Standards */}
              <mesh position={[-0.08, 0.16, 0]} material={MAT_BINDER_BLUE}>
                <boxGeometry args={[0.07, 0.32, 0.24]} />
              </mesh>
              {/* Green Binders: Project Quality Plan (PQP) Rev. 04 */}
              <mesh position={[0, 0.16, 0]} material={MAT_BINDER_GREEN}>
                <boxGeometry args={[0.07, 0.32, 0.24]} />
              </mesh>
              {/* Red Binders: NCR / Corrective Action Requests */}
              <mesh position={[0.08, 0.16, 0]} material={MAT_SPINE_BOARD_RED}>
                <boxGeometry args={[0.07, 0.32, 0.24]} />
              </mesh>
            </group>

            {/* Ergonomic High-Back Mesh Executive Chair */}
            <group position={[0.1, 0, 0.75]} rotation={[0, Math.PI, 0]}>
              <mesh position={[0, 0.48, 0]} material={MAT_LEATHER_BLACK_WORN}>
                <boxGeometry args={[0.52, 0.08, 0.5]} />
              </mesh>
              <mesh position={[0, 0.85, -0.22]} material={MAT_LEATHER_BLACK_WORN}>
                <boxGeometry args={[0.48, 0.65, 0.06]} />
              </mesh>
              <mesh position={[0, 0.24, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
              </mesh>
              {/* 5-Star Caster Base */}
              <mesh position={[0, 0.05, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.26, 0.26, 0.04, 5]} />
              </mesh>
            </group>
          </group>

          {/* 6. ENGINEERING BLUEPRINT REVIEW & DRAFTING ISLAND */}
          <group position={[1.1, 0, -2.0]}>
            {/* Drafting Island Stand */}
            <mesh position={[0, 0.48, 0]} castShadow material={MAT_DESK_LEGS}>
              <boxGeometry args={[1.5, 0.94, 1.0]} />
            </mesh>
            {/* Drafting Board Surface */}
            <mesh position={[0, 0.96, 0]} receiveShadow material={MAT_WHITE_PAINT}>
              <boxGeometry args={[1.6, 0.04, 1.1]} />
            </mesh>
            {/* Open A1 Blueprints Laid Flat */}
            <mesh position={[0, 0.985, 0]} material={matBlueprint}>
              <planeGeometry args={[1.35, 0.85]} />
            </mesh>
            {/* Solid Brass Blueprint Corner Weights */}
            {[-0.6, 0.6].map((wx, i) => (
              <mesh key={`weight-${i}`} position={[wx, 1.0, 0.35]} material={MAT_YELLOW_SAFETY}>
                <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
              </mesh>
            ))}
            {/* Upright Blueprint Plan Roll Tube Holder Basket */}
            <group position={[0.7, 0, 0.65]}>
              <mesh position={[0, 0.4, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.18, 0.18, 0.8, 16, 1, true]} />
              </mesh>
              {/* Rolled AFC Engineering Drawings */}
              {[-0.05, 0.05].map((rx, ri) => (
                <mesh key={`roll-${ri}`} position={[rx, 0.55, 0]} rotation={[0.1, 0, 0.15]} material={MAT_PAPER_DOCS}>
                  <cylinderGeometry args={[0.04, 0.04, 1.0, 12]} />
                </mesh>
              ))}
            </group>
          </group>

          {/* 7. WALL-MOUNTED ISO 9001 PROJECT QUALITY PLAN (PQP) WHITEBOARD */}
          <group position={[2.44, 1.9, -1.8]} rotation={[0, -Math.PI / 2, 0]}>
            {/* Aluminum Board Frame */}
            <mesh material={MAT_WHITEBOARD_PANEL}>
              <boxGeometry args={[2.0, 1.2, 0.04]} />
            </mesh>
            {/* Whiteboard Surface with Daily Quality Log & Concrete Strength Trends */}
            <mesh position={[0, 0, 0.022]} material={matWhiteboard}>
              <planeGeometry args={[1.92, 1.12]} />
            </mesh>
            {/* Aluminum Pen Tray with Dry-Erase Markers */}
            <mesh position={[0, -0.62, 0.06]} material={MAT_DOORKNOB_CHROME}>
              <boxGeometry args={[0.8, 0.02, 0.08]} />
            </mesh>
          </group>

          {/* 8. SPLIT-TYPE INVERTER AIR CONDITIONING UNIT (MAINTAINING STANDARD 23°C LAB TEMP) */}
          <group position={[-2.44, 2.7, -1.5]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_AC_UNIT_WHITE}>
              <boxGeometry args={[1.1, 0.35, 0.28]} />
            </mesh>
            {/* Louver Air Vent */}
            <mesh position={[0, -0.1, 0.142]} material={MAT_STEEL_DARK}>
              <planeGeometry args={[0.95, 0.06]} />
            </mesh>
            {/* Green Power LED */}
            <mesh position={[0.42, 0.06, 0.142]} material={MAT_FLUORESCENT_TUBE}>
              <circleGeometry args={[0.012, 8]} />
            </mesh>
          </group>

          {/* 9. WATER COOLER DISPENSER & HYDRATION STATION */}
          <group position={[-2.1, 0, -3.5]}>
            <mesh position={[0, 0.5, 0]} material={MAT_WATER_COOLER_WHITE}>
              <boxGeometry args={[0.35, 1.0, 0.35]} />
            </mesh>
            {/* 5-Gallon Blue Water Jug */}
            <mesh position={[0, 1.18, 0]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.14, 0.14, 0.38, 16]} />
            </mesh>
            <mesh position={[0, 1.39, 0]} material={MAT_GALLON_CAP_WHITE}>
              <cylinderGeometry args={[0.04, 0.04, 0.04, 12]} />
            </mesh>
          </group>

          {/* 10. LAB SAFETY INFRASTRUCTURE: PPE RACK, FIRST AID & FIRE EXTINGUISHER */}
          {/* Wall-Mounted First Aid Box */}
          <group position={[-2.44, 1.8, -3.5]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_WHITE_PAINT}>
              <boxGeometry args={[0.35, 0.45, 0.14]} />
            </mesh>
            {/* Green Cross Emblem */}
            <mesh position={[0, 0, 0.072]} material={MAT_BINDER_GREEN}>
              <boxGeometry args={[0.14, 0.04, 0.005]} />
            </mesh>
            <mesh position={[0, 0, 0.072]} material={MAT_BINDER_GREEN}>
              <boxGeometry args={[0.04, 0.14, 0.005]} />
            </mesh>
          </group>

          {/* 10lb Dry Chemical Fire Extinguisher */}
          <group position={[2.44, 1.2, -3.5]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh material={MAT_SPINE_BOARD_RED}>
              <cylinderGeometry args={[0.07, 0.07, 0.45, 16]} />
            </mesh>
            <mesh position={[0, 0.28, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
            </mesh>
            <mesh position={[0.05, 0.26, 0]} material={MAT_YELLOW_SAFETY}>
              <cylinderGeometry args={[0.02, 0.02, 0.04, 8]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
