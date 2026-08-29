"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RealisticHumanoidMesh } from "./RealisticHumanoidMesh";
import {
  getVSCodeWindows11Texture,
  getPlanningGanttWindows11Texture,
  getQSExcelWindows11Texture,
  getCADWindows11Texture,
  getMechanicalKeyboardTexture,
  getLaptopKeyboardDeckTexture,
  getElbertStructuralBIMTexture,
} from "./screenTextures";
import {
  MAT_CONCRETE_SLAB,
  MAT_STEEL_GREEN_TRUSS,
  MAT_CONDUIT_ORANGE,
  MAT_LEATHER_BLACK_WORN,
  MAT_SOFA_WOOD_BASE,
  MAT_DESK_LAMINATE,
  MAT_DESK_LEGS,
  MAT_TABLE_DARK_BROWN,
  MAT_CUBICLE_WALL_LOW,
  MAT_CUBICLE_WALL_TALL,
  MAT_CUBICLE_ALUM_TRIM,
  MAT_MONOBLOC_WHITE,
  MAT_MONOBLOC_TEAL,
  MAT_FLUORESCENT_TUBE,
  MAT_FLUORESCENT_BODY,
  MAT_MONITOR_BEZEL,
  MAT_MONITOR_GLOW,
  MAT_WATER_COOLER_WHITE,
  MAT_WATER_COOLER_MAT,
  MAT_GALLON_ROYAL_BLUE,
  MAT_GALLON_CAP_WHITE,
  MAT_CARDBOARD_STACK,
  MAT_WHITEBOARD_PANEL,
  MAT_PAPER_DOCS,
  MAT_BINDER_BLUE,
  MAT_BINDER_GREEN,
  MAT_PRINTER_BLACK,
  MAT_RED_BOOTH,
  MAT_PICTURE_FRAME,
  MAT_CERTIFICATE_PAPER,
  MAT_ROOF_INSULATION_FOIL,
  MAT_STEEL_FRAME,
  MAT_STEEL_DARK,
  MAT_STEEL_CHROME,
  MAT_WORKER_HARDHAT_WHITE,
  MAT_WORKER_HARDHAT_YELLOW,
  MAT_WORKER_VEST_ORANGE,
  MAT_WORKER_VEST_GREEN,
  MAT_COFFEE_MUG,
  MAT_BAMBOO_TIMBER,
  MAT_SHIRT_LONG_GREEN,
  MAT_SHIRT_NAVY,
  MAT_PANTS_CARGO_DARK,
  MAT_MINI_FAN_PINK,
  MAT_WIRE_FAN_BLACK,
  MAT_CURTAIN_ORANGE_FLORAL,
  MAT_RUBBER_BOOTS_BLACK,
  // East Wing Specific Materials
  MAT_SPINE_BOARD_RED,
  MAT_CLOTH_GREEN_TABLE,
  MAT_CABINET_DARK_WOOD,
  MAT_ELECTRICAL_PANEL_BLACK,
  MAT_AC_UNIT_WHITE,
  MAT_CURTAIN_FABRIC_LEAF,
  MAT_CURTAIN_FABRIC_MAROON,
  MAT_PAINT_BUCKET_WHITE,
  MAT_DOOR_WHITE_FLUSH,
  MAT_DOORKNOB_CHROME,
  // Kitchen & Comfort Rooms Materials
  MAT_CEMENT_PLASTER_RAW,
  MAT_PORCELAIN_WHITE,
  MAT_STAINLESS_SINK,
  MAT_COFFEE_MAKER_BLACK,
  MAT_GLASS_BOTTLE_GREEN,
  MAT_PAIL_UTILITY_GREEN,
  MAT_GLASS_CLEAR,
} from "./SharedMaterials";

// ═══════════════════════════════════════════════════════════════════════════
// 🎽 DISTINCTIVE DISCIPLINE OUTFITS & TEXTILES
// ═══════════════════════════════════════════════════════════════════════════
const MAT_SHIRT_SKY_BLUE_LEAD = new THREE.MeshStandardMaterial({ color: "#38BDF8", roughness: 0.6 });
const MAT_SHIRT_DESERT_SAFARI = new THREE.MeshStandardMaterial({ color: "#C2A676", roughness: 0.75 });
const MAT_SHIRT_CHARCOAL_CAD = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7 });
const MAT_SHIRT_CRISP_WHITE_QS = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.5 });
const MAT_SHIRT_ROSE_BLUSH = new THREE.MeshStandardMaterial({ color: "#F472B6", roughness: 0.6 });
const MAT_SHIRT_EMERALD_PLAN = new THREE.MeshStandardMaterial({ color: "#0D9488", roughness: 0.6 });
const MAT_SHIRT_INDIGO_DEV = new THREE.MeshStandardMaterial({ color: "#4338CA", roughness: 0.7 });
const MAT_SHIRT_ROYAL_MECH = new THREE.MeshStandardMaterial({ color: "#1D4ED8", roughness: 0.7 });
const MAT_SHIRT_OLIVE_SUPT = new THREE.MeshStandardMaterial({ color: "#4D5D43", roughness: 0.8 });
const MAT_SHIRT_FORMAL_BARONG = new THREE.MeshStandardMaterial({ color: "#F1F5F9", roughness: 0.45 });

const MAT_PANTS_KHAKI_SLACKS = new THREE.MeshStandardMaterial({ color: "#A8A29E", roughness: 0.7 });
const MAT_PANTS_OLIVE_CARGO = new THREE.MeshStandardMaterial({ color: "#3B4A34", roughness: 0.8 });
const MAT_PANTS_DENIM_BLUE = new THREE.MeshStandardMaterial({ color: "#1E3A8A", roughness: 0.85 });
const MAT_PANTS_DARK_SLACKS = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.7 });
const MAT_PANTS_CHARCOAL = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.75 });

function safeMergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!geos || geos.length === 0) return null;
  return mergeGeometries(geos);
}

export function TemfacilOfficeInterior({
  isDetailVisible = true,
  activePreset,
  onSelectPerson,
}: {
  isDetailVisible?: boolean;
  activePreset?: string;
  onSelectPerson?: (id: string) => void;
}) {
  if (!isDetailVisible) return null;
  return <TemfacilOfficeInteriorContent activePreset={activePreset} onSelectPerson={onSelectPerson} />;
}

function useDocControllerSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#0D9488";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 36px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DOCUMENT CONTROLLER", 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}


function usePmOfficeSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 0 + 512, 160);
    ctx.strokeStyle = "#0F766E";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);

    ctx.fillStyle = "#0F766E";
    ctx.fillRect(10, 10, 492, 28);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STA. CLARA INTERNATIONAL CORP.", 256, 30);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("PROJECT MANAGER", 256, 85);
    ctx.font = "800 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#0369A1";
    ctx.fillText("EXECUTIVE OFFICE", 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useEngineeringDeptSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Crisp white signboard background matching Reference Photo 3 & 4
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 512);

    // Subtle dark border
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 500);

    // Dark bold lettering matching reference photos 3 & 4 exactly
    ctx.fillStyle = "#0F172A";
    ctx.textAlign = "center";
    ctx.font = "900 44px Arial, sans-serif";
    ctx.fillText("ENGINEERING /", 256, 120);
    ctx.fillText("PROJECT", 256, 200);
    ctx.fillText("CONTROL", 256, 280);
    ctx.font = "800 38px Arial, sans-serif";
    ctx.fillText("DEPARTMENT", 256, 360);

    // SCIC Sta. Clara Teal bottom accent stripe
    ctx.fillStyle = "#0D9488";
    ctx.fillRect(40, 420, 432, 12);

    ctx.fillStyle = "#64748B";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText("STA. CLARA INTERNATIONAL CORP.", 256, 460);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useEngineeringWhiteboardTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1024, 512);

    // Aluminum whiteboard frame edge
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 1016, 504);

    // Grid lines for Gantt schedule & progress tracker
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 2;
    for (let x = 60; x < 980; x += 115) {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 70; y < 500; y += 65) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(970, y);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 26px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("ENGINEERING & PROJECT CONTROL — 3-WEEK LOOKAHEAD SCHEDULE", 60, 45);

    // Marker notes
    ctx.fillStyle = "#1E40AF"; // Blue dry-erase marker
    ctx.font = "700 18px 'Courier New', monospace";
    ctx.fillText("• TB-04 Lower Penstock: Concrete pour 145m³ scheduled Thu", 75, 110);
    ctx.fillText("• Tunnel Portal 1 Adit: Steel arch rib set #42 inspected", 75, 175);
    ctx.fillText("• Powerhouse Turbine Bay: Alignment check TU-01 scroll case", 75, 240);
    ctx.fillText("• Switchyard Gantries: Earthing grid resistivity test (PASS)", 75, 305);

    ctx.fillStyle = "#B91C1C"; // Red marker
    ctx.font = "700 17px 'Courier New', monospace";
    ctx.fillText("CRITICAL: CADD revision REV-04 approved by Lead Engr Lavapie", 75, 370);
    ctx.fillText("ACTION: Quantity Take-off (QTO) submission by Cristine Almazan Fri", 75, 435);

    ctx.fillStyle = "#15803D"; // Green marker
    ctx.font = "700 18px sans-serif";
    ctx.fillText("WK 34", 540, 100);
    ctx.fillText("WK 35", 655, 100);
    ctx.fillText("WK 36", 770, 100);
    ctx.fillText("STATUS", 885, 100);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useHrSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);

    ctx.fillStyle = "#15803D";
    ctx.fillRect(10, 10, 492, 26);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STA. CLARA INTERNATIONAL CORP.", 256, 28);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 38px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("HR / ADMIN", 256, 85);
    ctx.font = "800 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("OFFICE", 256, 130);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useAccountingSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 132);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ACCOUNTING &", 256, 55);
    ctx.font = "800 28px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("TREASURY", 256, 95);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useAdminSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 132);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 36px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ADMIN", 256, 58);
    ctx.font = "800 30px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("OFFICE", 256, 104);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useEshSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = "#15803D";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 152);

    ctx.fillStyle = "#15803D";
    ctx.fillRect(10, 10, 492, 26);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAFETY FIRST — HEALTH & MEDICAL", 256, 28);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 34px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("ESH / MEDICAL", 256, 85);
    ctx.font = "800 30px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("CLINIC", 256, 130);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useAdminWhiteboardTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, 1024, 512);

    // Left Column: Handwritten Task List (Matching Photo 3)
    ctx.fillStyle = "#0F172A";
    ctx.font = "900 26px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("TO DO / ADMIN TASK", 40, 42);

    ctx.fillStyle = "#1E3A8A";
    ctx.font = "700 17px 'Segoe UI', Arial, sans-serif";
    const tasks = [
      "1. Documentation — Request for IT Supplies / Flash Drive",
      "2. Permits — Barangay & DPWH coordination on Haul Road",
      "3. Site Inspection — Continuation of finishing works (Staff House / Quarters)",
      "4. Vehicle Pass — Gate Entry pass for Delivery Dump Trucks",
      "5. Fuel log report — Rationing for Generator Set / Heavy Equipment",
      "6. Mess Hall grocery & drinking water requisition",
    ];
    tasks.forEach((t, idx) => {
      ctx.fillText(t, 40, 85 + idx * 38);
    });

    // Right Column: Monthly Calendar Grid (Matching Photo 3)
    const calX = 640;
    const calY = 40;
    const calW = 340;
    const calH = 260;

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(calX, calY, calW, calH);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AUGUST 2026", calX + calW / 2, calY + 24);

    const cellW = calW / 7;
    const cellH = (calH - 30) / 6;

    // Day headers
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    ctx.font = "bold 12px sans-serif";
    days.forEach((d, i) => {
      ctx.fillText(d, calX + i * cellW + cellW / 2, calY + 46);
    });

    // Day grid lines
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      ctx.moveTo(calX, calY + 30 + r * cellH);
      ctx.lineTo(calX + calW, calY + 30 + r * cellH);
      ctx.stroke();
    }
    for (let c = 1; c < 7; c++) {
      ctx.beginPath();
      ctx.moveTo(calX + c * cellW, calY + 30);
      ctx.lineTo(calX + c * cellW, calY + calH);
      ctx.stroke();
    }

    // Day numbers
    ctx.fillStyle = "#475569";
    ctx.font = "11px sans-serif";
    let dayNum = 1;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 && c < 6) continue; // Aug 1 starts on Saturday
        if (dayNum > 31) break;
        ctx.fillText(String(dayNum), calX + c * cellW + cellW / 2, calY + 48 + (r + 1) * cellH);
        dayNum++;
      }
    }

    // Urgent Reminder below calendar
    ctx.fillStyle = "#DC2626";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("URGENT: Submit Safety Monthly Summary by Friday!", 40, 360);
    ctx.fillStyle = "#059669";
    ctx.fillText("NOTICE: All Gate Visitors Must Wear Hardhat & Closed Shoes", 40, 400);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function usePedServicesScheduleTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = "#15803D";
    ctx.fillRect(0, 0, 1024, 60);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 28px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PLANTS & EQUIPMENT DEPARTMENT (PED) — SERVICES SCHEDULE", 512, 42);

    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 80, 964, 400);

    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1.5;
    [130, 190, 250, 310, 370, 430].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(994, y);
      ctx.stroke();
    });

    [220, 420, 620, 800].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, 480);
      ctx.stroke();
    });

    ctx.fillStyle = "#0F172A";
    ctx.font = "800 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("EQUIPMENT CODE", 45, 112);
    ctx.fillText("DESCRIPTION", 240, 112);
    ctx.fillText("LAST PM SERVICE", 440, 112);
    ctx.fillText("NEXT SCHEDULE", 640, 112);
    ctx.fillText("OPERATOR / STATUS", 820, 112);

    ctx.font = "600 16px 'Courier New', monospace";
    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("EXC-CAT-320D", 45, 162);
    ctx.fillText("Hydraulic Excavator 20T", 240, 162);
    ctx.fillText("2026-08-10 (250h)", 440, 162);
    ctx.fillText("2026-09-10 (500h)", 640, 162);
    ctx.fillStyle = "#16A34A";
    ctx.fillText("R. Pinasen (ACTIVE)", 820, 162);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("DMP-HOWO-08", 45, 222);
    ctx.fillText("10-Wheeler Dump Truck", 240, 222);
    ctx.fillText("2026-08-15 (Oil/Filter)", 440, 222);
    ctx.fillText("2026-09-15 (Brakes)", 640, 222);
    ctx.fillStyle = "#16A34A";
    ctx.fillText("J. Farong-ey (ACTIVE)", 820, 222);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("CRN-TAD-50T", 45, 282);
    ctx.fillText("Rough Terrain Crane 50T", 240, 282);
    ctx.fillText("2026-07-28 (Hydraulics)", 440, 282);
    ctx.fillText("2026-08-28 (Annual)", 640, 282);
    ctx.fillStyle = "#EA580C";
    ctx.fillText("H. Samson (MAINT)", 820, 282);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("GEN-CAT-500", 45, 342);
    ctx.fillText("500kVA Diesel Generator", 240, 342);
    ctx.fillText("2026-08-01 (1000h)", 440, 342);
    ctx.fillText("2026-09-01 (Fuel/Air)", 640, 342);
    ctx.fillStyle = "#16A34A";
    ctx.fillText("W. De Francia (STANDBY)", 820, 342);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("BAT-PUM-SCH", 45, 402);
    ctx.fillText("Stationary Concrete Pump", 240, 402);
    ctx.fillText("2026-08-18 (Pistons)", 440, 402);
    ctx.fillText("2026-09-18 (Greasing)", 640, 402);
    ctx.fillStyle = "#16A34A";
    ctx.fillText("A. Rosales (ACTIVE)", 820, 402);

    ctx.fillStyle = "#1E3A8A";
    ctx.fillText("JMB-ATLAS-2", 45, 462);
    ctx.fillText("2-Boom Tunnel Jumbo Drill", 240, 462);
    ctx.fillText("2026-08-22 (Drifter)", 440, 462);
    ctx.fillText("2026-09-22 (Compressor)", 640, 462);
    ctx.fillStyle = "#16A34A";
    ctx.fillText("B. Fomeg-as (ACTIVE)", 820, 462);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useKitchenPantrySignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#047857";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 132);

    ctx.fillStyle = "#047857";
    ctx.fillRect(10, 10, 492, 24);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 14px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STAFF AMENITIES — RESTRICTED", 256, 26);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("KITCHEN / PANTRY", 256, 75);
    ctx.font = "700 20px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("CLEAN AS YOU GO (CLAYGO)", 256, 112);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useRestroomSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 200);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 192);

    ctx.fillStyle = "#1E40AF";
    ctx.fillRect(10, 10, 492, 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RESTROOM / BANYO", 256, 32);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 34px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("MEN  |  WOMEN", 256, 85);

    ctx.fillStyle = "#B91C1C";
    ctx.font = "800 18px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("NOTICE: PLEASE KEEP CLEAN", 256, 130);
    ctx.font = "700 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("FLUSH AFTER USE • DO NOT THROW TRASH IN BOWL", 256, 165);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useCalendarOrdoTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 512, 700);

    ctx.fillStyle = "#15803D";
    ctx.fillRect(0, 0, 512, 100);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 32px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("0708 ORDO", 256, 45);
    ctx.font = "700 18px Arial, sans-serif";
    ctx.fillText("SAFETY FIRST — 2026 CALENDAR", 256, 80);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 48px Arial, sans-serif";
    ctx.fillText("AUGUST 2026", 256, 165);

    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    for (let r = 0; r <= 5; r++) {
      ctx.beginPath();
      ctx.moveTo(30, 200 + r * 80);
      ctx.lineTo(482, 200 + r * 80);
      ctx.stroke();
    }
    for (let c = 0; c <= 7; c++) {
      ctx.beginPath();
      ctx.moveTo(30 + c * 64.5, 200);
      ctx.lineTo(30 + c * 64.5, 600);
      ctx.stroke();
    }

    ctx.fillStyle = "#15803D";
    ctx.fillRect(30, 620, 452, 60);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 20px Arial, sans-serif";
    ctx.fillText("TARGET ZERO INCIDENT", 256, 655);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}


function useFilingCabinetGlassTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Shelf background interior
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(0, 0, 1024, 1024);

    // 4 Shelves
    const shelfY = [240, 490, 740, 990];
    ctx.fillStyle = "#94A3B8";
    shelfY.forEach(y => {
      ctx.fillRect(0, y - 16, 1024, 16);
    });

    // Draw realistic rows of archive binders across 4 shelves
    const binderColors = ["#1E40AF", "#1D4ED8", "#0F172A", "#15803D", "#047857", "#1E293B", "#1E3A8A", "#0369A1", "#334155"];
    const labelsShelf1 = ["HEPP-2026 PLANS", "SHOP DRAWINGS", "PENSTOCK PROFILE", "CIVIL REV-04", "AS-BUILT DWG", "DAM AXIS", "METHODOLOGY", "STRUCTURAL CADD"];
    const labelsShelf2 = ["SUBMITTALS #01-40", "SUBMITTALS #41-80", "RFI LOGS 2026", "INSPECTION CALLS", "CONCRETE POUR", "REBAR SCHEDULE", "TUNNEL ARCH RIBS", "GROUTING RECORDS"];
    const labelsShelf3 = ["BOQ COST CONTROL", "INTERIM BILLING #14", "VARIATION ORDERS", "PAYMENT CERT", "MATERIAL TESTING", "NDT REPORTS", "AGGREGATES LAB", "QC CERTIFICATES"];
    const labelsShelf4 = ["ISO 9001:2015", "SAFETY AUDIT ESH", "HIRAC LOGS", "TOOLBOX MINUTES", "GEOTECHNICAL RMR", "SLOPE STABILITY", "CORRESPONDENCE", "ADMIN & LOGISTICS"];

    const allShelves = [
      { yTop: 30, yBot: 224, labels: labelsShelf1 },
      { yTop: 270, yBot: 474, labels: labelsShelf2 },
      { yTop: 520, yBot: 724, labels: labelsShelf3 },
      { yTop: 770, yBot: 974, labels: labelsShelf4 },
    ];

    allShelves.forEach(({ yTop, yBot, labels }) => {
      const height = yBot - yTop;
      let curX = 35;
      labels.forEach((lbl, idx) => {
        const width = 100 + (idx % 3) * 15;
        const color = binderColors[(idx * 3 + Math.floor(yTop / 200)) % binderColors.length];
        
        // Binder spine body
        ctx.fillStyle = color;
        ctx.fillRect(curX, yTop, width - 6, height);
        
        // Spine highlight edge
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(curX, yTop, 8, height);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(curX + width - 14, yTop, 8, height);

        // White paper label window on spine
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(curX + 16, yTop + 30, width - 38, height - 70);
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 2;
        ctx.strokeRect(curX + 16, yTop + 30, width - 38, height - 70);

        // Finger pull metallic ring
        ctx.fillStyle = "#94A3B8";
        ctx.beginPath();
        ctx.arc(curX + width / 2 - 3, yTop + height - 24, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.arc(curX + width / 2 - 3, yTop + height - 24, 6, 0, Math.PI * 2);
        ctx.fill();

        // Vertical text on spine label
        ctx.save();
        ctx.translate(curX + width / 2 - 3, yTop + height / 2 - 8);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(lbl, 0, 4);
        ctx.restore();

        curX += width;
      });
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}



function useGeomappingScreenTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background Dark Slate Geological Workstation UI
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, 1024, 640);

    // Header / Window Bar
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 1024, 40);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(0, 0, 1024, 40);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("🏔️ Rocscience Dips / QGIS Geotechnical — Tumauini HEPP Tunnel Face CUT-08 RMR", 20, 26);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Logged by: Amor Floresca (Engineering Geologist)", 700, 26);

    // Left Panel: Stratigraphy & Structural Discontinuity Layers
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 40, 260, 560);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(0, 40, 260, 560);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("GEOLOGICAL LAYERS", 16, 68);

    const layers = [
      { name: "☑ Topography (LiDAR 0.5m)", color: "#22C55E" },
      { name: "☑ Lithology: Metavolcanics", color: "#A855F7" },
      { name: "☑ Diorite Intrusive Body", color: "#3B82F6" },
      { name: "☑ Fault Zone F-02 (Shear)", color: "#EF4444" },
      { name: "☑ Joint Set J1 (045° / 68°SE)", color: "#F59E0B" },
      { name: "☑ Joint Set J2 (135° / 82°SW)", color: "#06B6D4" },
      { name: "☑ Borehole Log BH-04 (62m)", color: "#EC4899" },
      { name: "☑ Tunnel Alignment Ch 0+420", color: "#E2E8F0" },
    ];

    layers.forEach((l, i) => {
      const y = 100 + i * 36;
      ctx.fillStyle = l.color;
      ctx.fillRect(18, y - 10, 10, 10);
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(l.name, 36, y);
    });

    // RMR Calculation Summary Card in Left Panel
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(12, 410, 236, 175);
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 410, 236, 175);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("ROCK MASS RATING (RMR)", 20, 432);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillText("• Intact Rock Strength: 12 (75 MPa)", 20, 456);
    ctx.fillText("• RQD Rating: 17 (RQD = 85%)", 20, 476);
    ctx.fillText("• Discontinuity Spacing: 15 (0.4m)", 20, 496);
    ctx.fillText("• Joint Condition: 20 (Rough/Hard)", 20, 516);
    ctx.fillText("• Groundwater: 10 (Damp/Dry)", 20, 536);
    ctx.fillStyle = "#22C55E";
    ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("TOTAL RMR: 74 → CLASS II (GOOD ROCK)", 20, 566);

    // Center & Right Area: 3D Geological Map & Stereonet Joint Plot
    ctx.fillStyle = "#020617";
    ctx.fillRect(260, 40, 764, 560);

    // Cross section terrain contour curves
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 8; j++) {
      ctx.beginPath();
      ctx.moveTo(280, 120 + j * 45);
      ctx.bezierCurveTo(450, 80 + j * 50, 600, 160 + j * 40, 780, 110 + j * 45);
      ctx.stroke();
    }

    // Colored rock strata
    ctx.fillStyle = "rgba(168, 85, 247, 0.25)"; // Metavolcanics
    ctx.beginPath();
    ctx.moveTo(280, 180);
    ctx.bezierCurveTo(450, 140, 600, 220, 780, 170);
    ctx.lineTo(780, 360);
    ctx.bezierCurveTo(600, 390, 450, 310, 280, 340);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(59, 130, 246, 0.25)"; // Diorite
    ctx.beginPath();
    ctx.moveTo(280, 340);
    ctx.bezierCurveTo(450, 310, 600, 390, 780, 360);
    ctx.lineTo(780, 520);
    ctx.lineTo(280, 520);
    ctx.closePath();
    ctx.fill();

    // Fault line in red
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 90);
    ctx.lineTo(520, 540);
    ctx.stroke();
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("FAULT F-02 (DIP 72°)", 350, 120);

    // Tunnel profile line
    ctx.strokeStyle = "#FACC15";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(300, 380);
    ctx.lineTo(760, 380);
    ctx.stroke();
    ctx.fillStyle = "#FACC15";
    ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("HEADRACE TUNNEL ALIGNMENT (Ch 0+420)", 400, 370);

    // Stereonet hemisphere plot on the right (X = 810 to 1000)
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(800, 55, 210, 230);
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(800, 55, 210, 230);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("EQUAL AREA STEREONET", 820, 78);

    ctx.strokeStyle = "#64748B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(905, 175, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(905, 100); ctx.lineTo(905, 250);
    ctx.moveTo(830, 175); ctx.lineTo(980, 175);
    ctx.stroke();

    // Joint poles / Great circles on stereonet
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(885, 175, 60, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.fillText("J1 Pole", 935, 145);

    ctx.strokeStyle = "#06B6D4";
    ctx.beginPath();
    ctx.arc(905, 155, 55, Math.PI / 6, 5 * Math.PI / 6);
    ctx.stroke();
    ctx.fillStyle = "#06B6D4";
    ctx.fillText("J2 Pole", 845, 225);

    // Bottom Status Bar
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 600, 1024, 40);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(0, 600, 1024, 40);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText("EPSG:3123 (PRS92 / Philippines Zone 3) | Coordinates: 17°32'44.2N, 121°54'12.8E | Scale 1:500", 20, 625);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useNoelOutlookEmailTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Microsoft Outlook 365 Blue Theme Header
    ctx.fillStyle = "#0078D4";
    ctx.fillRect(0, 0, 1024, 48);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Outlook 365 — SCIC Engineering Dept [noel.lavapie@staclara.com.ph]", 24, 30);

    // Search bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(620, 8, 380, 32);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("🔍 Search Mail, Drawings, RFIs & Submittals...", 635, 29);

    // Left Navigation Column (Folders)
    ctx.fillStyle = "#F3F2F1";
    ctx.fillRect(0, 48, 220, 592);
    ctx.strokeStyle = "#EDEBE9";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 48, 220, 592);

    ctx.fillStyle = "#201F1E";
    ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Favorites", 20, 78);

    ctx.font = "13px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#0078D4";
    ctx.fillText("📥 Inbox  (14 Unread)", 30, 106);
    ctx.fillStyle = "#605E5C";
    ctx.fillText("⭐ Flagged for Review", 30, 134);
    ctx.fillText("📤 Sent Items", 30, 162);
    ctx.fillText("📁 Project Submittals", 30, 190);
    ctx.fillText("📁 RFI & Technical Queries", 30, 218);
    ctx.fillText("📁 QA/QC Non-Conformance", 30, 246);
    ctx.fillText("📁 Billing & Variation Orders", 30, 274);

    // Middle Column: Email List
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(220, 48, 380, 592);
    ctx.strokeStyle = "#E1DFDD";
    ctx.strokeRect(220, 48, 380, 592);

    const emails = [
      { from: "Engr. May Ann Parallag", subject: "RE: Primavera P6 Lookahead W35 Submittal", time: "09:42 AM", unread: true },
      { from: "PM Romeo Sese", subject: "Approval Notice: Variation Order #03", time: "09:15 AM", unread: true },
      { from: "Amor Floresca (Geologist)", subject: "Headrace Tunnel Face CUT-08 RMR Log", time: "08:50 AM", unread: true },
      { from: "Engr. Cristine Almazan", subject: "QTO Taking-Off Draft: Penstock Concrete", time: "08:20 AM", unread: false },
      { from: "Supt. Eugenio Hanopol", subject: "Powerhouse Turbine TU-01 Alignment Call", time: "Yesterday", unread: false },
      { from: "Engr. Elgine Mangcupang", subject: "Concrete 28-Day Compressive Strength 40MPa", time: "Yesterday", unread: false },
    ];

    emails.forEach((mail, i) => {
      const y = 55 + i * 88;
      // Active / selected email highlight on first item
      if (i === 0) {
        ctx.fillStyle = "#EFF6FC";
        ctx.fillRect(221, y - 5, 378, 86);
        ctx.fillStyle = "#0078D4";
        ctx.fillRect(221, y - 5, 4, 86);
      }
      ctx.strokeStyle = "#EDEBE9";
      ctx.beginPath();
      ctx.moveTo(230, y + 80);
      ctx.lineTo(590, y + 80);
      ctx.stroke();

      ctx.fillStyle = mail.unread ? "#0078D4" : "#605E5C";
      ctx.beginPath();
      ctx.arc(235, y + 16, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = mail.unread ? "#201F1E" : "#605E5C";
      ctx.font = mail.unread ? "bold 13px 'Segoe UI', Arial, sans-serif" : "13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(mail.from, 248, y + 20);

      ctx.fillStyle = "#A19F9D";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(mail.time, 530, y + 20);

      ctx.fillStyle = "#323130";
      ctx.font = mail.unread ? "bold 12px 'Segoe UI', Arial, sans-serif" : "12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(mail.subject, 248, y + 42);

      ctx.fillStyle = "#605E5C";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Attached is the approved revision for review...", 248, y + 62);
    });

    // Right Column: Active Email Reading Pane
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(600, 48, 424, 592);

    ctx.fillStyle = "#201F1E";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("RE: Primavera P6 Lookahead W35 Submittal", 620, 85);

    ctx.fillStyle = "#605E5C";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("From: Engr. May Ann Parallag <mayann.parallag@staclara.com.ph>", 620, 115);
    ctx.fillText("To: Engr. Noel G. Lavapie <noel.lavapie@staclara.com.ph>", 620, 135);
    ctx.fillText("Date: Friday, August 28, 2026 at 09:42 AM", 620, 155);

    ctx.strokeStyle = "#E1DFDD";
    ctx.beginPath();
    ctx.moveTo(620, 175);
    ctx.lineTo(990, 175);
    ctx.stroke();

    ctx.fillStyle = "#323130";
    ctx.font = "13px 'Segoe UI', Arial, sans-serif";
    const bodyText = [
      "Good morning Sir Noel,",
      "",
      "I have finalized the 3-week lookahead schedule incorporating",
      "the penstock anchor block AB-04 pouring schedule and the",
      "headrace tunnel steel arch rib installation #42-48.",
      "",
      "Please find attached the P6 export (.xer & .pdf) for your",
      "final technical endorsement before forwarding to PM Romeo Sese.",
      "",
      "Thank you and best regards,",
      "May Ann Parallag — Junior Planning Engineer",
    ];
    bodyText.forEach((t, idx) => {
      ctx.fillText(t, 620, 205 + idx * 24);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useNoelDeskSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1024, 160);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 152);

    ctx.fillStyle = "#0D9488";
    ctx.fillRect(10, 10, 1004, 28);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 18px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STA. CLARA INTERNATIONAL CORP. — TUMAUINI HEPP", 512, 30);

    ctx.fillStyle = "#0F172A";
    ctx.font = "900 38px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("ENGR. NOEL G. LAVAPIE", 512, 92);
    ctx.font = "800 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#0369A1";
    ctx.fillText("LEAD TECHNICAL & PROJECT ENGINEERING HEAD", 512, 134);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useNoelBlueprintMonitorTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dark AutoCAD workspace background
    ctx.fillStyle = "#0B132B";
    ctx.fillRect(0, 0, 1024, 640);

    // Fine technical grid
    ctx.strokeStyle = "#1C2D4A";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }
    for (let y = 0; y < 640; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Top AutoCAD Ribbon
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, 1024, 48);
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 15px 'Segoe UI', monospace";
    ctx.textAlign = "left";
    ctx.fillText("AutoCAD 2026 — [TUMAUINI_HEPP_CIVIL_LONGITUDINAL_SECTION_REV04.DWG]", 20, 30);

    // Cyan technical profile: Mountain terrain, penstock slope, powerhouse
    ctx.strokeStyle = "#00F0FF";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(240, 140);
    ctx.lineTo(460, 260);
    ctx.lineTo(680, 480);
    ctx.lineTo(880, 500);
    ctx.lineTo(980, 500);
    ctx.stroke();

    // Penstock pipeline double lines
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(240, 155);
    ctx.lineTo(460, 275);
    ctx.lineTo(680, 495);
    ctx.lineTo(860, 515);
    ctx.stroke();

    // Anchor Blocks
    ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 2;
    [ [240, 135, 45, 45], [460, 255, 55, 55], [680, 475, 60, 60], [860, 495, 70, 70] ].forEach(([x, y, w, h]) => {
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    });

    // Dimension lines & annotations
    ctx.strokeStyle = "#E2E8F0";
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "12px monospace";
    ctx.fillText("EL. 340.00m (Intake Crest)", 50, 105);
    ctx.fillText("ANCHOR BLOCK AB-01", 210, 115);
    ctx.fillText("PENSTOCK SLOPE θ = 34.8°", 430, 235);
    ctx.fillText("SURGE SHAFT SS-01", 640, 455);
    ctx.fillText("POWERHOUSE TURBINE TU-01 (EL. 180.00m)", 720, 585);

    // AutoCAD Title Block Box
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(740, 520, 264, 105);
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(742, 522, 260, 101);
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("STA. CLARA INTL CORP", 755, 545);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "11px sans-serif";
    ctx.fillText("APPROVED: ENGR. NOEL LAVAPIE", 755, 570);
    ctx.fillText("DWG: TL3-CIV-SEC-04-B", 755, 595);
    ctx.fillText("SCALE: 1:250  •  AUG 2026", 755, 615);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function useWallNoticeMemoTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 700);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 500, 688);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OFFICE MEMORANDUM", 256, 45);
    ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("ENGINEERING & TECHNICAL DEPT", 256, 75);

    ctx.strokeStyle = "#0D9488";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 90);
    ctx.lineTo(472, 90);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#334155";
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    const memoLines = [
      "1. All drawing revisions must have Lead Engineer signature.",
      "2. Weekly lookahead submittals due every Thursday 4PM.",
      "3. Field personnel must wear hardhat, vest & steel toes.",
      "4. Daily accomplishment report to PM Romeo Sese.",
      "5. Document Controller register to be updated daily.",
      "6. Safety toolbox meeting attendance mandatory 7:00 AM.",
    ];
    memoLines.forEach((line, i) => {
      ctx.fillText("• " + line, 45, 135 + i * 40);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}


// ═══════════════════════════════════════════════════════════════════════════
// 🖱️ SUPERB REALISTIC ERGONOMIC COMPUTER MOUSE & PRO MOUSEPAD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function RealisticErgonomicMouse({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  hasMousepad = true,
  mousepadSize = [0.22, 0.20],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  hasMousepad?: boolean;
  mousepadSize?: [number, number];
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Stitched Fabric Pro Mousepad */}
      {hasMousepad && (
        <group position={[0, -0.004, 0]}>
          {/* Stitched Outer Border */}
          <mesh material={MAT_COFFEE_MAKER_BLACK}>
            <boxGeometry args={[mousepadSize[0] + 0.008, 0.003, mousepadSize[1] + 0.008]} />
          </mesh>
          {/* Micro-Weave Fabric Surface */}
          <mesh position={[0, 0.002, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[mousepadSize[0], 0.002, mousepadSize[1]]} />
          </mesh>
          {/* Corner Logo Accent */}
          <mesh position={[mousepadSize[0] * 0.4, 0.0032, mousepadSize[1] * 0.4]} material={MAT_GALLON_ROYAL_BLUE}>
            <planeGeometry args={[0.024, 0.014]} />
          </mesh>
        </group>
      )}

      {/* 2. Ergonomic Optical / Laser Computer Mouse */}
      <group position={[0, 0.0, 0]}>
        {/* Low-Friction Bottom Base Chassis */}
        <mesh position={[0, 0.002, 0]} material={MAT_COFFEE_MAKER_BLACK}>
          <boxGeometry args={[0.062, 0.004, 0.106]} />
        </mesh>
        {/* White Teflon Glide Skates (Front & Rear) */}
        <mesh position={[0, 0.0005, -0.04]} material={MAT_WHITEBOARD_PANEL}>
          <boxGeometry args={[0.048, 0.001, 0.016]} />
        </mesh>
        <mesh position={[0, 0.0005, 0.04]} material={MAT_WHITEBOARD_PANEL}>
          <boxGeometry args={[0.052, 0.001, 0.018]} />
        </mesh>

        {/* Sculpted Ergonomic Palm Arch (Smooth Dome) */}
        <mesh position={[0, 0.011, 0.008]} rotation={[0.08, 0, 0]} material={MAT_COFFEE_MAKER_BLACK}>
          <sphereGeometry args={[0.029, 16, 12]} />
        </mesh>

        {/* Ergonomic Thumb Rest Wing (Left Flare) */}
        <mesh position={[-0.024, 0.006, 0.012]} rotation={[0, 0, 0.25]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.014, 0.008, 0.048]} />
        </mesh>

        {/* Right Finger Rest Support */}
        <mesh position={[0.022, 0.008, 0.01]} rotation={[0, 0, -0.15]} material={MAT_COFFEE_MAKER_BLACK}>
          <boxGeometry args={[0.012, 0.010, 0.048]} />
        </mesh>

        {/* Split Left Click Button (Sloped Forward) */}
        <mesh position={[-0.013, 0.012, -0.034]} rotation={[-0.14, 0, 0]} material={MAT_COFFEE_MAKER_BLACK}>
          <boxGeometry args={[0.024, 0.006, 0.038]} />
        </mesh>

        {/* Split Right Click Button (Sloped Forward) */}
        <mesh position={[0.013, 0.012, -0.034]} rotation={[-0.14, 0, 0]} material={MAT_COFFEE_MAKER_BLACK}>
          <boxGeometry args={[0.024, 0.006, 0.038]} />
        </mesh>

        {/* Center Button Divider Groove */}
        <mesh position={[0, 0.0125, -0.034]} rotation={[-0.14, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.002, 0.007, 0.038]} />
        </mesh>

        {/* Ribbed Rubber Scroll Wheel */}
        <group position={[0, 0.014, -0.032]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.007, 0.007, 0.006, 14]} />
          </mesh>
          <mesh material={MAT_STEEL_CHROME}>
            <cylinderGeometry args={[0.004, 0.004, 0.007, 10]} />
          </mesh>
        </group>

        {/* Tactile DPI Switcher Button */}
        <mesh position={[0, 0.0175, -0.010]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.006, 0.003, 0.008]} />
        </mesh>

        {/* Subtle Illuminated Optical / Brand LED Badge */}
        <mesh position={[0, 0.020, 0.018]} rotation={[0.08, 0, 0]} material={MAT_GALLON_ROYAL_BLUE}>
          <boxGeometry args={[0.008, 0.002, 0.012]} />
        </mesh>

        {/* Braided Cord Strain Relief / Wireless Nano Dongle */}
        <mesh position={[0, 0.006, -0.054]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.0025, 0.0025, 0.008, 8]} />
        </mesh>
      </group>
    </group>
  );
}

function TemfacilOfficeInteriorContent({
  activePreset,
  onSelectPerson,
}: {
  activePreset?: string;
  onSelectPerson?: (id: string) => void;
}) {
  const { camera } = useThree();
  const [distance, setDistance] = useState<number>(0);

  const docControllerTex = useDocControllerSignTexture();
  const engineeringDeptTex = useEngineeringDeptSignTexture();
  const engineeringWhiteboardTex = useEngineeringWhiteboardTexture();
  const hrSignTex = useHrSignTexture();
  const accountingSignTex = useAccountingSignTexture();
  const adminSignTex = useAdminSignTexture();
  const eshSignTex = useEshSignTexture();
  const adminWhiteboardTex = useAdminWhiteboardTexture();
  const pedScheduleTex = usePedServicesScheduleTexture();
  const kitchenPantryTex = useKitchenPantrySignTexture();
  const restroomNoticeTex = useRestroomSignTexture();
  const calendarOrdoTex = useCalendarOrdoTexture();

  const matVSCodeScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: getVSCodeWindows11Texture() }), []);
  const matPlanningScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: getPlanningGanttWindows11Texture() }), []);
  const matQSExcelScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: getQSExcelWindows11Texture() }), []);
  const matCADScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: getCADWindows11Texture() }), []);
  const matMechKeyboard = useMemo(() => new THREE.MeshBasicMaterial({ map: getMechanicalKeyboardTexture() }), []);
  const matLaptopDeck = useMemo(() => new THREE.MeshBasicMaterial({ map: getLaptopKeyboardDeckTexture() }), []);
  const matElbertBIMScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: getElbertStructuralBIMTexture() }), []);
  const pmOfficeSignTex = usePmOfficeSignTexture();
  const filingCabinetGlassTex = useFilingCabinetGlassTexture();
  const noelDeskSignTex = useNoelDeskSignTexture();
  const noelMonitorTex = useNoelBlueprintMonitorTexture();
  const noelOutlookTex = useNoelOutlookEmailTexture();
  const geomappingTex = useGeomappingScreenTexture();
  const wallNoticeTex = useWallNoticeMemoTexture();

  const matPmOfficeSign = useMemo(() => new THREE.MeshBasicMaterial({ map: pmOfficeSignTex }), [pmOfficeSignTex]);
  const matFilingCabinetInterior = useMemo(() => new THREE.MeshBasicMaterial({ map: filingCabinetGlassTex }), [filingCabinetGlassTex]);
  const matNoelDeskSign = useMemo(() => new THREE.MeshBasicMaterial({ map: noelDeskSignTex }), [noelDeskSignTex]);
  const matNoelMonitorScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: noelMonitorTex }), [noelMonitorTex]);
  const matNoelOutlookScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: noelOutlookTex }), [noelOutlookTex]);
  const matGeomappingScreen = useMemo(() => new THREE.MeshBasicMaterial({ map: geomappingTex }), [geomappingTex]);
  const matWallNotice = useMemo(() => new THREE.MeshBasicMaterial({ map: wallNoticeTex }), [wallNoticeTex]);

  const matCabinetSteel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#CBD5E1", roughness: 0.35, metalness: 0.25 }), []);
  const matYellowBucket = useMemo(() => new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.45 }), []);
  const matBackpackLenovo = useMemo(() => new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.9 }), []);
  const matCapSnapback = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1D4ED8", roughness: 0.8 }), []);
  const matMonoblocBeige = useMemo(() => new THREE.MeshStandardMaterial({ color: "#DDD6CE", roughness: 0.6 }), []);


  useFrame(() => {
    const dist = camera.position.distanceTo(new THREE.Vector3(114, 14, -107));
    setDistance(dist);
  });

  const roomVis = useMemo(() => {
    if (activePreset?.startsWith("temfacil-office-")) {
      const z = activePreset.replace("temfacil-office-", "");
      return {
        r5a: z === "zone5a" || z === "overview" || distance < 60,
        r5b: z === "zone5b" || z === "overview" || distance < 60,
        r5c: z === "zone5c" || z === "overview" || distance < 60,
        r5d: z === "zone5d" || z === "overview" || distance < 60,
        r6: z === "zone6" || z === "overview" || distance < 60,
        rKitchen: z === "zone4" || z === "overview" || distance < 60,
        rRestrooms: z === "zone4" || z === "overview" || distance < 60,
      };
    }
    return {
      r5a: distance < 50,
      r5b: distance < 50,
      r5c: distance < 50,
      r5d: distance < 50,
      r6: distance < 50,
      rKitchen: distance < 50,
      rRestrooms: distance < 50,
    };
  }, [activePreset, distance]);

  const {
    geoGreenSteelTrusses,
    geoOrangeConduits,
    geoCubicleWallsLow,
    geoCubicleWallsTall,
    geoCubicleAlumTrims,
    geoDarkBrownTable,
    geoDeskLaminates,
    geoDeskLegs,
    geoLeatherSofaCushions,
    geoSofaWoodBase,
    geoWhiteboards,
    geoWaterDispenser,
    geoRoofInsulationFoil,
    geoPaperDocClutter,
  } = useMemo(() => {
    const trussGeos: THREE.BufferGeometry[] = [];
    const trussZOffsets = [9.0, 5.0, 1.0, -3.0, -7.0, -10.5];

    trussZOffsets.forEach((z) => {
      const bottomTie = new THREE.BoxGeometry(14.0, 0.12, 0.12);
      bottomTie.translate(0, 3.6, z);
      trussGeos.push(bottomTie);

      const leftRafter = new THREE.BoxGeometry(7.3, 0.12, 0.12);
      leftRafter.rotateZ(0.252);
      leftRafter.translate(-3.55, 4.55, z);
      trussGeos.push(leftRafter);

      const rightRafter = new THREE.BoxGeometry(7.3, 0.12, 0.12);
      rightRafter.rotateZ(-0.252);
      rightRafter.translate(3.55, 4.55, z);
      trussGeos.push(rightRafter);

      const kingPost = new THREE.BoxGeometry(0.12, 1.85, 0.12);
      kingPost.translate(0, 4.5, z);
      trussGeos.push(kingPost);

      const leftStrut = new THREE.BoxGeometry(2.8, 0.08, 0.08);
      leftStrut.rotateZ(-0.55);
      leftStrut.translate(-2.4, 4.15, z);
      trussGeos.push(leftStrut);

      const rightStrut = new THREE.BoxGeometry(2.8, 0.08, 0.08);
      rightStrut.rotateZ(0.55);
      rightStrut.translate(2.4, 4.15, z);
      trussGeos.push(rightStrut);

      const colLeft = new THREE.BoxGeometry(0.18, 3.6, 0.18);
      colLeft.translate(-7.0, 1.8, z);
      trussGeos.push(colLeft);

      const colRight = new THREE.BoxGeometry(0.18, 3.6, 0.18);
      colRight.translate(7.0, 1.8, z);
      trussGeos.push(colRight);

      if (z !== 9.0) {
        const colCorridorL = new THREE.BoxGeometry(0.14, 3.6, 0.14);
        colCorridorL.translate(-1.20, 1.8, z);
        trussGeos.push(colCorridorL);
      }

      const colCorridorR = new THREE.BoxGeometry(0.14, 3.6, 0.14);
      colCorridorR.translate(1.20, 1.8, z);
      trussGeos.push(colCorridorR);
    });

    const purlinXOffsets = [-5.2, -2.6, 0.0, 2.6, 5.2];
    purlinXOffsets.forEach((px) => {
      const py = 5.2 - Math.abs(px) * 0.23;
      const purlin = new THREE.BoxGeometry(0.08, 0.08, 21.6);
      purlin.translate(px, py - 0.06, 0);
      trussGeos.push(purlin);
    });

    const conduitGeos: THREE.BufferGeometry[] = [];

    const cubicleLowGeos: THREE.BufferGeometry[] = [];
    const z1LoungeWall = new THREE.BoxGeometry(0.06, 1.35, 4.5);
    z1LoungeWall.translate(-2.35, 0.675, 8.75);
    cubicleLowGeos.push(z1LoungeWall);

    // Front cover partition panel in front of Document Controller cubicle
    const dcFrontWall = new THREE.BoxGeometry(2.35, 1.35, 0.06);
    dcFrontWall.translate(-3.525, 0.675, 6.50);
    cubicleLowGeos.push(dcFrontWall);

    const cubicleTallGeos: THREE.BufferGeometry[] = [];
    // Full-height dividing wall between Engineering Dept and Kitchen (Z = -5.50m, Width = 5.80m)
    const engKitchenDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    engKitchenDivider.translate(-4.10, 1.6, -5.50);
    cubicleTallGeos.push(engKitchenDivider);

    // Full-height dividing wall between Kitchen and Comfort Rooms (Z = -8.50m, Width = 5.80m)
    const kitchenCrDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    kitchenCrDivider.translate(-4.10, 1.6, -8.50);
    cubicleTallGeos.push(kitchenCrDivider);

    // West Wing Kitchen Corridor Partition Wall (X = -1.20m, Z = -5.50m to -8.50m, Doorway at Z = -6.15m)
    const wWall1 = new THREE.BoxGeometry(0.08, 3.2, 0.20);
    wWall1.translate(-1.20, 1.6, -5.60);
    cubicleTallGeos.push(wWall1);

    const wHead1 = new THREE.BoxGeometry(0.08, 1.05, 0.90);
    wHead1.translate(-1.20, 2.675, -6.15);
    cubicleTallGeos.push(wHead1);

    const wWall2 = new THREE.BoxGeometry(0.08, 3.2, 1.90);
    wWall2.translate(-1.20, 1.6, -7.55);
    cubicleTallGeos.push(wWall2);

    // West Wing Comfort Rooms Corridor Partition Wall (X = -1.20m, Z = -8.50m to -11.00m, Portal at Z = -9.20m)
    const crWall1 = new THREE.BoxGeometry(0.08, 3.2, 0.20);
    crWall1.translate(-1.20, 1.6, -8.60);
    cubicleTallGeos.push(crWall1);

    const crHead1 = new THREE.BoxGeometry(0.08, 1.05, 1.00);
    crHead1.translate(-1.20, 2.675, -9.20);
    cubicleTallGeos.push(crHead1);

    const crWall2 = new THREE.BoxGeometry(0.08, 3.2, 1.30);
    crWall2.translate(-1.20, 1.6, -10.35);
    cubicleTallGeos.push(crWall2);

    const eWall1 = new THREE.BoxGeometry(0.08, 3.2, 1.7);
    eWall1.translate(1.20, 1.6, 10.15);
    cubicleTallGeos.push(eWall1);

    const eHead1 = new THREE.BoxGeometry(0.08, 1.05, 1.0);
    eHead1.translate(1.20, 2.675, 8.8);
    cubicleTallGeos.push(eHead1);

    const eWall2 = new THREE.BoxGeometry(0.08, 3.2, 3.0);
    eWall2.translate(1.20, 1.6, 6.8);
    cubicleTallGeos.push(eWall2);

    const eHead2 = new THREE.BoxGeometry(0.08, 1.05, 1.0);
    eHead2.translate(1.20, 2.675, 4.8);
    cubicleTallGeos.push(eHead2);

    const eWall3 = new THREE.BoxGeometry(0.08, 3.2, 3.0);
    eWall3.translate(1.20, 1.6, 2.8);
    cubicleTallGeos.push(eWall3);

    const eHead3 = new THREE.BoxGeometry(0.08, 1.05, 1.0);
    eHead3.translate(1.20, 2.675, 0.8);
    cubicleTallGeos.push(eHead3);

    const eWall4 = new THREE.BoxGeometry(0.08, 3.2, 3.0);
    eWall4.translate(1.20, 1.6, -1.2);
    cubicleTallGeos.push(eWall4);

    const eHead4 = new THREE.BoxGeometry(0.08, 1.05, 1.0);
    eHead4.translate(1.20, 2.675, -3.2);
    cubicleTallGeos.push(eHead4);

    const eWall5 = new THREE.BoxGeometry(0.08, 3.2, 1.8);
    eWall5.translate(1.20, 1.6, -5.1);
    cubicleTallGeos.push(eWall5);

    const eRearWall = new THREE.BoxGeometry(0.08, 3.2, 5.0);
    eRearWall.translate(1.20, 1.6, -8.5);
    cubicleTallGeos.push(eRearWall);

    const z4RearReturn = new THREE.BoxGeometry(0.45, 3.2, 0.12);
    z4RearReturn.translate(-1.425, 1.6, -10.94);
    cubicleTallGeos.push(z4RearReturn);

    // Full-height dividing walls between 4 East Department Rooms (HR, Accounting, Admin, ESH)
    const hrAccDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    hrAccDivider.translate(4.10, 1.6, 6.80);
    cubicleTallGeos.push(hrAccDivider);

    const accAdmDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    accAdmDivider.translate(4.10, 1.6, 2.80);
    cubicleTallGeos.push(accAdmDivider);

    const admEshDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    admEshDivider.translate(4.10, 1.6, -1.20);
    cubicleTallGeos.push(admEshDivider);

    const eshRearDivider = new THREE.BoxGeometry(5.80, 3.2, 0.08);
    eshRearDivider.translate(4.10, 1.6, -5.20);
    cubicleTallGeos.push(eshRearDivider);

    const alumTrimGeos: THREE.BufferGeometry[] = [];
    const z1Cap = new THREE.BoxGeometry(0.08, 0.04, 4.54);
    z1Cap.translate(-2.35, 1.37, 8.75);
    alumTrimGeos.push(z1Cap);

    const z1CornerPost = new THREE.BoxGeometry(0.08, 1.35, 0.08);
    z1CornerPost.translate(-2.35, 0.675, 10.95);
    alumTrimGeos.push(z1CornerPost);

    // Document Controller front cover cap and corner post
    const dcFrontCap = new THREE.BoxGeometry(2.39, 0.04, 0.08);
    dcFrontCap.translate(-3.525, 1.37, 6.50);
    alumTrimGeos.push(dcFrontCap);

    const dcFrontCornerPost = new THREE.BoxGeometry(0.08, 1.35, 0.08);
    dcFrontCornerPost.translate(-2.35, 0.675, 6.50);
    alumTrimGeos.push(dcFrontCornerPost);

    // ─── EAST CORRIDOR DOOR FRAMES (HR, ACCOUNTING, ADMIN, ESH) ───
    const hrPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    hrPostL.translate(1.20, 1.075, 8.35);
    alumTrimGeos.push(hrPostL);

    const hrPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    hrPostR.translate(1.20, 1.075, 9.25);
    alumTrimGeos.push(hrPostR);

    const hrTopLintel = new THREE.BoxGeometry(0.09, 0.05, 0.90);
    hrTopLintel.translate(1.20, 2.15, 8.80);
    alumTrimGeos.push(hrTopLintel);

    const accPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    accPostL.translate(1.20, 1.075, 4.35);
    alumTrimGeos.push(accPostL);

    const accPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    accPostR.translate(1.20, 1.075, 5.25);
    alumTrimGeos.push(accPostR);

    const accTopLintel = new THREE.BoxGeometry(0.09, 0.05, 0.90);
    accTopLintel.translate(1.20, 2.15, 4.80);
    alumTrimGeos.push(accTopLintel);

    const admPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    admPostL.translate(1.20, 1.075, 0.35);
    alumTrimGeos.push(admPostL);

    const admPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    admPostR.translate(1.20, 1.075, 1.25);
    alumTrimGeos.push(admPostR);

    const admTopLintel = new THREE.BoxGeometry(0.09, 0.05, 0.90);
    admTopLintel.translate(1.20, 2.15, 0.80);
    alumTrimGeos.push(admTopLintel);

    const eshPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    eshPostL.translate(1.20, 1.075, -3.65);
    alumTrimGeos.push(eshPostL);

    const eshPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    eshPostR.translate(1.20, 1.075, -2.75);
    alumTrimGeos.push(eshPostR);

    const eshTopLintel = new THREE.BoxGeometry(0.09, 0.05, 0.90);
    eshTopLintel.translate(1.20, 2.15, -3.20);
    alumTrimGeos.push(eshTopLintel);

    // Kitchen Door Frame
    const kPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    kPostL.translate(-1.20, 1.075, -5.70);
    alumTrimGeos.push(kPostL);

    const kPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    kPostR.translate(-1.20, 1.075, -6.60);
    alumTrimGeos.push(kPostR);

    const kTopLintel = new THREE.BoxGeometry(0.09, 0.05, 0.92);
    kTopLintel.translate(-1.20, 2.15, -6.15);
    alumTrimGeos.push(kTopLintel);

    // Comfort Rooms Portal Frame
    const crPostL = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    crPostL.translate(-1.20, 1.075, -8.70);
    alumTrimGeos.push(crPostL);

    const crPostR = new THREE.BoxGeometry(0.09, 2.15, 0.05);
    crPostR.translate(-1.20, 1.075, -9.70);
    alumTrimGeos.push(crPostR);

    const crTopLintel = new THREE.BoxGeometry(0.09, 0.05, 1.02);
    crTopLintel.translate(-1.20, 2.15, -9.20);
    alumTrimGeos.push(crTopLintel);

    const darkBrownTableGeos: THREE.BufferGeometry[] = [];
    const centerTableTop = new THREE.BoxGeometry(1.00, 0.04, 2.20);
    centerTableTop.translate(-2.50, 0.74, -1.80);
    darkBrownTableGeos.push(centerTableTop);

    const deskLaminateGeos: THREE.BufferGeometry[] = [];
    const whiteDeskLocations = [
      { pos: [-3.80, 0.74, 7.30], size: [1.35, 0.04, 0.70] },
      { pos: [-2.65, 0.74, 6.95], size: [0.70, 0.04, 0.65] },
      { pos: [-4.50, 0.70, 10.00], size: [0.60, 0.04, 1.80] },
      // Semi-long broadened desk for QS and Planning Engineer (2.60m length x 1.20m width, behind Sir Eugene)
      { pos: [-5.20, 0.74, -1.80], size: [1.20, 0.04, 2.60] },
      // Single continuous long desk spanning the full kitchen wall dimension
      { pos: [-4.10, 0.74, -4.95], size: [5.20, 0.04, 0.75] },
      { pos: [0.95, 0.74, 5.4], size: [0.46, 0.04, 0.95] },
    ];

    whiteDeskLocations.forEach(({ pos, size }) => {
      const top = new THREE.BoxGeometry(size[0], size[1], size[2]);
      top.translate(pos[0], pos[1], pos[2]);
      deskLaminateGeos.push(top);
    });

    const deskLegGeos: THREE.BufferGeometry[] = [];
    const allDeskLocations = [
      { pos: [-2.50, 0.74, -1.80], size: [1.00, 0.04, 2.20] },
      ...whiteDeskLocations,
    ];

    allDeskLocations.forEach(({ pos, size }) => {
      const legRadius = 0.018;
      const legHeight = pos[1] - 0.02;
      const dx = size[0] / 2 - 0.04;
      const dz = size[2] / 2 - 0.04;

      if (size[0] > 3.0) {
        // Multi-leg support along X for long table spanning full kitchen wall
        const xOffsets = [-size[0] / 2 + 0.08, -size[0] / 6, size[0] / 6, size[0] / 2 - 0.08];
        xOffsets.forEach((lx) => {
          [-dz, dz].forEach((lz) => {
            const leg = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 6);
            leg.translate(pos[0] + lx, legHeight / 2, pos[2] + lz);
            deskLegGeos.push(leg);
          });
        });
      } else if (size[2] > 2.0) {
        // Multi-leg support along Z for semi-long 2.6m table
        const zOffsets = [-dz, 0, dz];
        zOffsets.forEach((lz) => {
          [-dx, dx].forEach((lx) => {
            const leg = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 6);
            leg.translate(pos[0] + lx, legHeight / 2, pos[2] + lz);
            deskLegGeos.push(leg);
          });
        });
      } else {
        [
          [-dx, -dz],
          [dx, -dz],
          [-dx, dz],
          [dx, dz],
        ].forEach(([lx, lz]) => {
          const leg = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 6);
          leg.translate(pos[0] + lx, legHeight / 2, pos[2] + lz);
          deskLegGeos.push(leg);
        });
      }

      const brace = new THREE.BoxGeometry(size[0] - 0.08, 0.18, 0.02);
      brace.translate(pos[0], pos[1] - 0.15, pos[2] - dz);
      deskLegGeos.push(brace);
    });

    const sofaCushionGeos: THREE.BufferGeometry[] = [];
    const seat3Base = new THREE.BoxGeometry(0.85, 0.26, 2.1);
    seat3Base.translate(-1.75, 0.35, 8.75);
    sofaCushionGeos.push(seat3Base);

    const seat3Back = new THREE.BoxGeometry(0.24, 0.55, 2.1);
    seat3Back.translate(-2.05, 0.65, 8.75);
    sofaCushionGeos.push(seat3Back);

    [-0.95, 0.95].forEach((dz) => {
      const arm = new THREE.BoxGeometry(0.82, 0.38, 0.18);
      arm.translate(-1.75, 0.48, 8.75 + dz);
      sofaCushionGeos.push(arm);
    });

    const sofaWoodGeos: THREE.BufferGeometry[] = [];
    const sofaBase = new THREE.BoxGeometry(0.9, 0.1, 2.2);
    sofaBase.translate(-1.75, 0.1, 8.75);
    sofaWoodGeos.push(sofaBase);

    const whiteboardGeos: THREE.BufferGeometry[] = [];

    const waterCoolerGeos: THREE.BufferGeometry[] = [];
    const coolerTower = new THREE.BoxGeometry(0.30, 0.85, 0.30);
    coolerTower.translate(-1.45, 0.475, 4.80);
    waterCoolerGeos.push(coolerTower);

    const coolerRecess = new THREE.BoxGeometry(0.22, 0.22, 0.10);
    coolerRecess.translate(-1.45, 0.62, 4.70);
    waterCoolerGeos.push(coolerRecess);

    const spigotRed = new THREE.BoxGeometry(0.02, 0.04, 0.03);
    spigotRed.translate(-1.48, 0.65, 4.72);
    waterCoolerGeos.push(spigotRed);

    const spigotBlue = new THREE.BoxGeometry(0.02, 0.04, 0.03);
    spigotBlue.translate(-1.42, 0.65, 4.72);
    waterCoolerGeos.push(spigotBlue);

    const foilGeos: THREE.BufferGeometry[] = [];
    const foilLeft = new THREE.BoxGeometry(7.1, 0.02, 21.6);
    foilLeft.rotateZ(0.252);
    foilLeft.translate(-3.55, 4.55, 0);
    foilGeos.push(foilLeft);

    const foilRight = new THREE.BoxGeometry(7.1, 0.02, 21.6);
    foilRight.rotateZ(-0.252);
    foilRight.translate(3.55, 4.55, 0);
    foilGeos.push(foilRight);

    const paperGeos: THREE.BufferGeometry[] = [];
    const jPaper1 = new THREE.BoxGeometry(0.28, 0.012, 0.22);
    jPaper1.translate(-3.80, 0.768, 7.50);
    paperGeos.push(jPaper1);

    const jPaper2 = new THREE.BoxGeometry(0.22, 0.030, 0.30);
    jPaper2.translate(-4.15, 0.775, 7.42);
    paperGeos.push(jPaper2);

    const smartListPaper = new THREE.BoxGeometry(0.24, 0.035, 0.32);
    smartListPaper.translate(-4.50, 0.74, 10.35);
    paperGeos.push(smartListPaper);

    const bpRoll1 = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8);
    bpRoll1.rotateZ(Math.PI / 2);
    bpRoll1.translate(-2.35, 0.78, -2.15);
    paperGeos.push(bpRoll1);

    const bpRoll2 = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8);
    bpRoll2.rotateZ(Math.PI / 2);
    bpRoll2.translate(-2.65, 0.78, -1.45);
    paperGeos.push(bpRoll2);

    const dtrLogbook = new THREE.BoxGeometry(0.32, 0.025, 0.24);
    dtrLogbook.translate(0.95, 0.775, 5.58);
    paperGeos.push(dtrLogbook);

    const dtrClipboard = new THREE.BoxGeometry(0.24, 0.015, 0.32);
    dtrClipboard.translate(0.95, 0.77, 5.22);
    paperGeos.push(dtrClipboard);

    return {
      geoGreenSteelTrusses: safeMergeGeometries(trussGeos),
      geoOrangeConduits: safeMergeGeometries(conduitGeos),
      geoCubicleWallsLow: safeMergeGeometries(cubicleLowGeos),
      geoCubicleWallsTall: safeMergeGeometries(cubicleTallGeos),
      geoCubicleAlumTrims: safeMergeGeometries(alumTrimGeos),
      geoDarkBrownTable: safeMergeGeometries(darkBrownTableGeos),
      geoDeskLaminates: safeMergeGeometries(deskLaminateGeos),
      geoDeskLegs: safeMergeGeometries(deskLegGeos),
      geoLeatherSofaCushions: safeMergeGeometries(sofaCushionGeos),
      geoSofaWoodBase: safeMergeGeometries(sofaWoodGeos),
      geoWhiteboards: safeMergeGeometries(whiteboardGeos),
      geoWaterDispenser: safeMergeGeometries(waterCoolerGeos),
      geoRoofInsulationFoil: safeMergeGeometries(foilGeos),
      geoPaperDocClutter: safeMergeGeometries(paperGeos),
    };
  }, []);

  const { tealChairCount, tealChairMatrices } = useMemo(() => {
    const tealConfigs = [
      { pos: [-1.85, 0.05, -2.10], rotY: -Math.PI / 2 },
      { pos: [-2.50, 0.05, -0.62], rotY: Math.PI }, // South end of dark brown table for Sir Elbert (facing North into table)
      { pos: [-3.16, 0.05, -1.80], rotY: Math.PI / 2 }, // West side for Civil Engineer
    ];

    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = tealConfigs.map(({ pos, rotY }) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

    return { tealChairCount: tealConfigs.length, tealChairMatrices: matrices };
  }, []);

  const { whiteChairCount, whiteChairMatrices } = useMemo(() => {
    const whiteConfigs = [
      { pos: [4.1, 0.05, 9.0], rotY: 0 },
      { pos: [5.1, 0.05, 8.0], rotY: -Math.PI / 3 },
      { pos: [4.5, 0.05, 4.8], rotY: 0 },
      { pos: [3.0, 0.05, 1.2], rotY: 0 },
      { pos: [3.0, 0.05, -0.2], rotY: Math.PI },
      { pos: [5.2, 0.05, -0.2], rotY: Math.PI },
      { pos: [3.6, 0.05, -2.5], rotY: 0 },
      { pos: [5.2, 0.05, -4.1], rotY: -Math.PI / 2 },
      { pos: [4.4, 0.05, -5.2], rotY: Math.PI },
      { pos: [3.8, 0.05, -8.4], rotY: 0 },
    ];

    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = whiteConfigs.map(({ pos, rotY }) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

    return { whiteChairCount: whiteConfigs.length, whiteChairMatrices: matrices };
  }, []);

  const { monitorCount, monitorMatrices, screenMatrices } = useMemo(() => {
    const monitorConfigs: { pos: [number, number, number]; rotY: number }[] = [];

    const dummy = new THREE.Object3D();
    const mMatrices: THREE.Matrix4[] = [];
    const sMatrices: THREE.Matrix4[] = [];

    monitorConfigs.forEach(({ pos, rotY }) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mMatrices.push(dummy.matrix.clone());

      dummy.position.set(pos[0], pos[1] + 0.04, pos[2] + (rotY === 0 ? 0.02 : -0.02));
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sMatrices.push(dummy.matrix.clone());
    });

    return { monitorCount: monitorConfigs.length, monitorMatrices: mMatrices, screenMatrices: sMatrices };
  }, []);

  const { hardhatCount, hardhatMatrices } = useMemo(() => {
    const hardhatConfigs = [
      { pos: [-6.92, 1.95, 4.50], rotY: Math.PI / 2 },
      { pos: [-6.92, 1.95, 4.80], rotY: Math.PI / 2 },
      { pos: [-6.92, 1.95, 5.10], rotY: Math.PI / 2 },
      { pos: [5.1, 0.82, 4.3], rotY: 0.5 },
      { pos: [1.4, 1.8, 0.2], rotY: Math.PI / 2 },
      { pos: [1.4, 1.8, -0.2], rotY: Math.PI / 2 },
      { pos: [4.0, 0.82, -3.2], rotY: 0.2 },
      { pos: [3.2, 0.82, -8.9], rotY: -0.4 },
    ];

    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = hardhatConfigs.map(({ pos, rotY }) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

    return { hardhatCount: hardhatConfigs.length, hardhatMatrices: matrices };
  }, []);

  const { lightCount, lightTubeMatrices, lightBodyMatrices } = useMemo(() => {
    const lightConfigs = [
      [-3.5, 3.48, 8.75],
      [-3.8, 3.48, 2.20],
      [-4.2, 3.48, -0.60],
      [3.5, 3.48, 8.75],
      [3.5, 3.48, 2.0],
      [3.5, 3.48, -4.5],
      [-3.5, 3.48, -8.0],
      [3.5, 3.48, -8.0],
    ];

    const dummy = new THREE.Object3D();
    const tubeMats: THREE.Matrix4[] = [];
    const bodyMats: THREE.Matrix4[] = [];

    lightConfigs.forEach(([x, y, z]) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bodyMats.push(dummy.matrix.clone());

      dummy.position.set(x, y - 0.04, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tubeMats.push(dummy.matrix.clone());
    });

    return { lightCount: lightConfigs.length, lightTubeMatrices: tubeMats, lightBodyMatrices: bodyMats };
  }, []);

  const { frameCount, frameMatrices, certPaperMatrices } = useMemo(() => {
    const frameConfigs = [
      { pos: [-6.98, 2.3, 5.2], size: [0.42, 0.55] },
      { pos: [-6.98, 2.3, 4.5], size: [0.42, 0.55] },
      { pos: [-6.98, 2.3, 3.8], size: [0.42, 0.55] },
    ];

    const dummy = new THREE.Object3D();
    const fMats: THREE.Matrix4[] = [];
    const pMats: THREE.Matrix4[] = [];

    frameConfigs.forEach(({ pos, size }) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(size[0], size[1], 1);
      dummy.updateMatrix();
      fMats.push(dummy.matrix.clone());

      dummy.position.set(pos[0] + 0.01, pos[1], pos[2]);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(size[0] * 0.88, size[1] * 0.88, 1);
      dummy.updateMatrix();
      pMats.push(dummy.matrix.clone());
    });

    return { frameCount: frameConfigs.length, frameMatrices: fMats, certPaperMatrices: pMats };
  }, []);

  const {
    geoMonoblocChair,
    geoMonitorFrame,
    geoMonitorScreen,
    geoHardhat,
    geoLightTube,
    geoLightBody,
    geoPictureFrame,
    geoCertPaper,
  } = useMemo(() => {
    const seat = new THREE.BoxGeometry(0.44, 0.04, 0.44);
    seat.translate(0, 0.44, 0);
    const backrest = new THREE.BoxGeometry(0.42, 0.44, 0.04);
    backrest.translate(0, 0.68, -0.2);
    const leg = new THREE.CylinderGeometry(0.018, 0.015, 0.44, 6);
    const chairMerged = mergeGeometries([seat, backrest, leg.clone().translate(-0.18, 0.22, -0.18), leg.clone().translate(0.18, 0.22, -0.18), leg.clone().translate(-0.18, 0.22, 0.18), leg.clone().translate(0.18, 0.22, 0.18)]);

    const mScreenBezel = new THREE.BoxGeometry(0.55, 0.35, 0.03);
    const mStand = new THREE.BoxGeometry(0.06, 0.16, 0.04);
    mStand.translate(0, -0.18, -0.04);
    const monitorMerged = mergeGeometries([mScreenBezel, mStand]);
    const mScreen = new THREE.PlaneGeometry(0.50, 0.30);

    const hat = new THREE.SphereGeometry(0.14, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const rim = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 8);
    const hatMerged = mergeGeometries([hat, rim]);

    const lBody = new THREE.BoxGeometry(0.22, 0.06, 1.4);
    const lTube = new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8);
    lTube.rotateX(Math.PI / 2);

    const pFrame = new THREE.BoxGeometry(1.0, 1.0, 0.02);
    const pPaper = new THREE.PlaneGeometry(1.0, 1.0);

    return {
      geoMonoblocChair: chairMerged,
      geoMonitorFrame: monitorMerged,
      geoMonitorScreen: mScreen,
      geoHardhat: hatMerged,
      geoLightTube: lTube,
      geoLightBody: lBody,
      geoPictureFrame: pFrame,
      geoCertPaper: pPaper,
    };
  }, []);

  return (
    <group name="TemfacilOfficeInterior">
      <mesh position={[0, 0.05, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[14.2, 0.1, 22.2]} />
      </mesh>

      {geoGreenSteelTrusses && <mesh geometry={geoGreenSteelTrusses} material={MAT_STEEL_GREEN_TRUSS} castShadow />}
      {geoOrangeConduits && <mesh geometry={geoOrangeConduits} material={MAT_CONDUIT_ORANGE} />}
      {geoCubicleWallsLow && <mesh geometry={geoCubicleWallsLow} material={MAT_CUBICLE_WALL_LOW} castShadow receiveShadow />}
      {geoCubicleWallsTall && <mesh geometry={geoCubicleWallsTall} material={MAT_CUBICLE_WALL_TALL} castShadow receiveShadow />}
      {geoCubicleAlumTrims && <mesh geometry={geoCubicleAlumTrims} material={MAT_CUBICLE_ALUM_TRIM} />}
      {geoDarkBrownTable && <mesh geometry={geoDarkBrownTable} material={MAT_TABLE_DARK_BROWN} receiveShadow />}
      {geoDeskLaminates && <mesh geometry={geoDeskLaminates} material={MAT_DESK_LAMINATE} receiveShadow />}
      {geoDeskLegs && <mesh geometry={geoDeskLegs} material={MAT_DESK_LEGS} />}
      {geoLeatherSofaCushions && <mesh geometry={geoLeatherSofaCushions} material={MAT_LEATHER_BLACK_WORN} castShadow />}
      {geoSofaWoodBase && <mesh geometry={geoSofaWoodBase} material={MAT_SOFA_WOOD_BASE} />}
      {geoWhiteboards && <mesh geometry={geoWhiteboards} material={MAT_WHITEBOARD_PANEL} />}
      {geoWaterDispenser && <mesh geometry={geoWaterDispenser} material={MAT_WATER_COOLER_WHITE} castShadow />}
      {geoRoofInsulationFoil && <mesh geometry={geoRoofInsulationFoil} material={MAT_ROOF_INSULATION_FOIL} />}
      {geoPaperDocClutter && <mesh geometry={geoPaperDocClutter} material={MAT_PAPER_DOCS} />}

      <group name="WestDoor_Kitchen">
        <mesh position={[-1.20, 1.05, -7.0]} castShadow receiveShadow material={MAT_DOOR_WHITE_FLUSH}>
          <boxGeometry args={[0.04, 2.06, 0.94]} />
        </mesh>
        <mesh position={[-1.16, 1.0, -7.0 + 0.38]} material={MAT_DOORKNOB_CHROME}>
          <sphereGeometry args={[0.032, 12, 12]} />
        </mesh>
        <mesh position={[-1.24, 1.0, -7.0 + 0.38]} material={MAT_DOORKNOB_CHROME}>
          <sphereGeometry args={[0.032, 12, 12]} />
        </mesh>
        <group position={[-1.14, 2.35, -7.0]}>
          <mesh>
            <boxGeometry args={[0.02, 0.18, 0.55]} />
            <meshBasicMaterial map={kitchenPantryTex || undefined} color={kitchenPantryTex ? "#FFFFFF" : "#047857"} />
          </mesh>
        </group>
      </group>

      <group position={[-1.14, 2.35, -9.75]}>
        <mesh>
          <boxGeometry args={[0.02, 0.22, 0.65]} />
          <meshBasicMaterial map={restroomNoticeTex || undefined} color={restroomNoticeTex ? "#FFFFFF" : "#1E40AF"} />
        </mesh>
      </group>

      <InstancedPropsGroup geometry={geoMonoblocChair} material={MAT_MONOBLOC_TEAL} count={tealChairCount} matrices={tealChairMatrices} />
      <InstancedPropsGroup geometry={geoMonoblocChair} material={MAT_MONOBLOC_WHITE} count={whiteChairCount} matrices={whiteChairMatrices} />
      <InstancedPropsGroup geometry={geoMonitorFrame} material={MAT_MONITOR_BEZEL} count={monitorCount} matrices={monitorMatrices} />
      <InstancedPropsGroup geometry={geoMonitorScreen} material={MAT_MONITOR_GLOW} count={monitorCount} matrices={screenMatrices} />
      <InstancedPropsGroup geometry={geoHardhat} material={MAT_WORKER_HARDHAT_WHITE} count={hardhatCount} matrices={hardhatMatrices} />
      <InstancedPropsGroup geometry={geoLightBody} material={MAT_FLUORESCENT_BODY} count={lightCount} matrices={lightBodyMatrices} />
      <InstancedPropsGroup geometry={geoLightTube} material={MAT_FLUORESCENT_TUBE} count={lightCount} matrices={lightTubeMatrices} />
      <InstancedPropsGroup geometry={geoPictureFrame} material={MAT_PICTURE_FRAME} count={frameCount} matrices={frameMatrices} />
      <InstancedPropsGroup geometry={geoCertPaper} material={MAT_CERTIFICATE_PAPER} count={frameCount} matrices={certPaperMatrices} />

      <group name="Zone2_DocControllerCubicle">
        <group position={[-2.65, 0, 6.95]}>
          <mesh position={[0, 0.88, 0]} castShadow material={MAT_PRINTER_BLACK}>
            <boxGeometry args={[0.48, 0.28, 0.42]} />
          </mesh>
          <mesh position={[0, 1.05, 0]} material={MAT_PRINTER_BLACK}>
            <boxGeometry args={[0.40, 0.06, 0.36]} />
          </mesh>
          <mesh position={[0.22, 0.85, 0]} material={MAT_PRINTER_BLACK}>
            <boxGeometry args={[0.16, 0.02, 0.24]} />
          </mesh>
          <mesh position={[0.22, 0.865, 0]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.14, 0.005, 0.20]} />
          </mesh>
          <mesh position={[0.242, 0.94, 0]} material={MAT_MONITOR_GLOW}>
            <planeGeometry args={[0.06, 0.04]} />
          </mesh>
        </group>
        <group position={[-3.80, 0.76, 7.28]}>
          <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
            <boxGeometry args={[0.36, 0.016, 0.25]} />
          </mesh>
          <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
            <planeGeometry args={[0.34, 0.23]} />
          </mesh>
          <group position={[0, 0.015, -0.11]} rotation={[-0.28, 0, 0]}>
            <mesh position={[0, 0.11, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.22, 0.012]} />
            </mesh>
            <mesh position={[0, 0.11, 0.007]} material={matCADScreen}>
              <planeGeometry args={[0.33, 0.19]} />
            </mesh>
          </group>
        </group>
        <RealisticErgonomicMouse position={[-3.45, 0.772, 7.32]} rotation={[0, Math.PI, 0]} />
        <mesh position={[-4.15, 0.81, 7.22]} material={MAT_COFFEE_MUG}>
          <cylinderGeometry args={[0.042, 0.038, 0.10, 10]} />
        </mesh>
        <mesh position={[-4.15, 0.765, 7.42]} material={MAT_RED_BOOTH}>
          <boxGeometry args={[0.24, 0.006, 0.32]} />
        </mesh>
        <group position={[-3.80, 0.0, 7.90]}>
          <mesh position={[0, 0.24, 0]} material={MAT_DOORKNOB_CHROME}>
            <cylinderGeometry args={[0.025, 0.025, 0.38, 8]} />
          </mesh>
          <mesh position={[0, 0.46, 0]} material={MAT_LEATHER_BLACK_WORN}>
            <boxGeometry args={[0.48, 0.08, 0.46]} />
          </mesh>
          <mesh position={[0, 0.74, 0.22]} rotation={[0.08, 0, 0]} material={MAT_LEATHER_BLACK_WORN}>
            <boxGeometry args={[0.44, 0.48, 0.05]} />
          </mesh>
          <mesh position={[-0.24, 0.62, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.04, 0.22, 0.24]} />
          </mesh>
          <mesh position={[0.24, 0.62, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.04, 0.22, 0.24]} />
          </mesh>
        </group>
        <RealisticHumanoidMesh
          role="CAD_ENGINEER"
          personnelId="DOC_JAYSON_AGGABAO"
          onSelectPerson={onSelectPerson}
          skinTone="MEDIUM"
          hairStyle="SHORT"
          hairColor="#0F172A"
          hasGlasses={true}
          glassesFrameColor="#0F172A"
          customShirtMat={MAT_SHIRT_FORMAL_BARONG}
          customPantsMat={MAT_PANTS_DARK_SLACKS}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-3.80, 0.05, 7.85]}
          rotation={[0, Math.PI, 0]}
        />
        <group position={[-4.50, 0, 10.00]}>
          {[-0.45, -0.35, -0.25, -0.15, -0.05, 0.05, 0.15, 0.25].map((zOff, i) => (
            <mesh
              key={`binder-${i}`}
              position={[0, 0.88, zOff]}
              material={i % 2 === 0 ? MAT_BINDER_BLUE : MAT_BINDER_GREEN}
              castShadow
            >
              <boxGeometry args={[0.26, 0.32, 0.075]} />
            </mesh>
          ))}
          <mesh position={[0, 0.73, 0.50]} material={MAT_BINDER_GREEN}>
            <boxGeometry args={[0.28, 0.03, 0.36]} />
          </mesh>
        </group>


      </group>

      {/* ═══ 6. ZONE 3: ENGINEERING / PROJECT CONTROL DEPARTMENT (PHOTOS 3 & 4) ═══ */}
      <group name="Zone3_EngineeringDepartment">

        {/* 2. SUPPORT COLUMN & MOUNTED OSCILLATING FAN */}
        <group position={[-1.20, 2.40, 4.90]}>
          {/* Black Mounting Bracket */}
          <mesh position={[0, 0, 0.05]} material={MAT_WIRE_FAN_BLACK}>
            <boxGeometry args={[0.04, 0.06, 0.08]} />
          </mesh>
          {/* Motor Housing */}
          <mesh position={[0, 0, -0.02]} material={MAT_WIRE_FAN_BLACK}>
            <cylinderGeometry args={[0.04, 0.04, 0.07, 8]} />
          </mesh>
          {/* Thin Wire Propeller Cage (Angled slightly down) */}
          <group position={[0, 0, -0.08]} rotation={[0.25, 0, 0]}>
            <mesh material={MAT_WIRE_FAN_BLACK}>
              <cylinderGeometry args={[0.18, 0.18, 0.03, 16]} />
            </mesh>
            {/* Propeller Blades */}
            <mesh material={MAT_STEEL_CHROME}>
              <boxGeometry args={[0.28, 0.04, 0.01]} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 3]} material={MAT_STEEL_CHROME}>
              <boxGeometry args={[0.28, 0.04, 0.01]} />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 3]} material={MAT_STEEL_CHROME}>
              <boxGeometry args={[0.28, 0.04, 0.01]} />
            </mesh>
          </group>
        </group>

        {/* 3. WATER COOLER: Proportionate Blue Jug & Floor Accessories */}
        <group position={[-1.45, 0, 4.80]}>
          {/* Floor Rubber Mat */}
          <mesh position={[0, 0.055, 0]} material={MAT_WATER_COOLER_MAT}>
            <boxGeometry args={[0.45, 0.01, 0.45]} />
          </mesh>
          {/* 5-Gallon Inverted Blue Water Bottle */}
          <mesh position={[0, 1.07, 0]} material={MAT_GALLON_ROYAL_BLUE}>
            <cylinderGeometry args={[0.12, 0.12, 0.34, 12]} />
          </mesh>
          <mesh position={[0, 1.25, 0]} material={MAT_GALLON_CAP_WHITE}>
            <cylinderGeometry args={[0.035, 0.035, 0.04, 8]} />
          </mesh>
          {/* Small Waste Bin beside Water Cooler */}
          <mesh position={[0, 0.16, -0.45]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.11, 0.09, 0.28, 10]} />
          </mesh>
        </group>

        {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
        {/* 3. WEST WING: PROJECT MANAGER EXECUTIVE OFFICE & ENGR. NOEL STANDING WORKSTATION */}
        {/* ═══════════════════════════════════════════════════════════════════════════════════ */}

        {/* ─── A. PROJECT MANAGER'S OFFICE ENCLOSURE (Wall Behind Sir Noel, Door Facing Document Controller) ─── */}
        <group position={[0, 0, 0]}>
          {/* Solid Insulated Front Wall Behind Sir Noel (Z = 3.60m, Width = 2.30m from X = -7.0m to X = -4.70m) */}
          <mesh position={[-5.85, 1.60, 3.60]} material={MAT_CUBICLE_WALL_TALL}>
            <boxGeometry args={[2.30, 3.20, 0.08]} />
          </mesh>
          <mesh position={[-5.85, 3.20, 3.60]} material={MAT_CUBICLE_ALUM_TRIM}>
            <boxGeometry args={[2.32, 0.04, 0.10]} />
          </mesh>
          <mesh position={[-5.85, 0.04, 3.60]} material={MAT_CUBICLE_ALUM_TRIM}>
            <boxGeometry args={[2.32, 0.08, 0.10]} />
          </mesh>

          {/* Framed Certificates / Accreditation Plaques on Front Wall (at X = -5.85m, Z = 3.65m) */}
          <group position={[-5.85, 1.85, 3.65]}>
            <mesh position={[-0.45, 0, 0]} material={MAT_PICTURE_FRAME}><boxGeometry args={[0.34, 0.44, 0.02]} /></mesh>
            <mesh position={[-0.45, 0, 0.012]} material={MAT_CERTIFICATE_PAPER}><planeGeometry args={[0.30, 0.40]} /></mesh>

            <mesh position={[0.10, 0, 0]} material={MAT_PICTURE_FRAME}><boxGeometry args={[0.34, 0.44, 0.02]} /></mesh>
            <mesh position={[0.10, 0, 0.012]} material={MAT_CERTIFICATE_PAPER}><planeGeometry args={[0.30, 0.40]} /></mesh>
          </group>

          {/* East Side Return Wall Facing Document Controller (X = -4.70m, from Z = 3.60m to Z = 6.50m) */}
          <mesh position={[-4.70, 1.60, 5.05]} material={MAT_CUBICLE_WALL_TALL}>
            <boxGeometry args={[0.08, 3.20, 2.90]} />
          </mesh>
          <mesh position={[-4.70, 3.20, 5.05]} material={MAT_CUBICLE_ALUM_TRIM}>
            <boxGeometry args={[0.10, 0.04, 2.92]} />
          </mesh>

          {/* 🚪 PROJECT MANAGER OFFICE DOOR MOVED TO SIDE (Facing Document Controller Corridor at X = -4.70m, Z = 5.20m) */}
          <group position={[-4.70, 0, 5.20]}>
            {/* Aluminum Door Frame */}
            <mesh position={[0, 1.08, 0]} material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.10, 2.18, 0.92]} />
            </mesh>
            {/* White Flush Door Leaf */}
            <mesh position={[0.01, 1.07, 0]} material={MAT_DOOR_WHITE_FLUSH}>
              <boxGeometry args={[0.04, 2.14, 0.86]} />
            </mesh>
            {/* Chrome Lever Doorknob Facing Corridor */}
            <mesh position={[0.04, 1.00, 0.32]} material={MAT_DOORKNOB_CHROME}>
              <cylinderGeometry args={[0.018, 0.018, 0.12, 8]} />
            </mesh>
            {/* Door Signplate Facing Document Controller / Corridor Side */}
            <mesh position={[0.04, 1.70, 0]} rotation={[0, Math.PI / 2, 0]} material={matPmOfficeSign}>
              <planeGeometry args={[0.40, 0.13]} />
            </mesh>
          </group>
        </group>

        {/* ─── B. TALL 2-DOOR METAL ARCHIVE & FILING CABINET WITH GLASS UPPER DOORS (X = -6.65, Z = 3.20) ─── */}
        <group position={[-6.65, 0, 3.20]}>
          {/* Main Steel Cabinet Casing */}
          <mesh position={[0, 0.94, 0]} material={matCabinetSteel}>
            <boxGeometry args={[0.50, 1.88, 0.95]} />
          </mesh>

          {/* Upper Section Interior: 4 Shelves of Project Binders Visible Through Glass */}
          <mesh position={[0.24, 1.34, 0]} rotation={[0, -Math.PI / 2, 0]} material={matFilingCabinetInterior}>
            <planeGeometry args={[0.90, 0.98]} />
          </mesh>

          {/* Upper Glass Doors (2 Framed Panels) */}
          <group position={[0.26, 1.34, 0]}>
            <mesh position={[0, 0, -0.23]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.015, 0.96, 0.44]} />
            </mesh>
            <mesh position={[0, 0, -0.23]} material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.02, 0.98, 0.03]} />
            </mesh>
            <mesh position={[0, 0, 0.23]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.015, 0.96, 0.44]} />
            </mesh>
            <mesh position={[0, 0, 0.23]} material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.02, 0.98, 0.03]} />
            </mesh>
            {/* Chrome Handle Bars */}
            <mesh position={[0.02, 0, -0.04]} material={MAT_STEEL_CHROME}>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
            </mesh>
            <mesh position={[0.02, 0, 0.04]} material={MAT_STEEL_CHROME}>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
            </mesh>
          </group>

          {/* Lower Section: 2 Solid Steel Doors with Handles */}
          <group position={[0.26, 0.42, 0]}>
            <mesh position={[0, 0, -0.23]} material={matCabinetSteel}>
              <boxGeometry args={[0.025, 0.76, 0.45]} />
            </mesh>
            <mesh position={[0, 0, 0.23]} material={matCabinetSteel}>
              <boxGeometry args={[0.025, 0.76, 0.45]} />
            </mesh>
            {/* Chrome Pull Handles */}
            <mesh position={[0.02, 0.22, -0.04]} material={MAT_STEEL_CHROME}>
              <boxGeometry args={[0.015, 0.10, 0.02]} />
            </mesh>
            <mesh position={[0.02, 0.22, 0.04]} material={MAT_STEEL_CHROME}>
              <boxGeometry args={[0.015, 0.10, 0.02]} />
            </mesh>
          </group>

          {/* Props On Top of Tall Filing Cabinet */}
          <mesh position={[-0.05, 1.98, -0.22]} material={MAT_COFFEE_MAKER_BLACK}>
            <boxGeometry args={[0.34, 0.22, 0.32]} />
          </mesh>
          <group position={[0, 1.94, 0.16]}>
            <mesh position={[-0.08, 0, 0]} material={MAT_WORKER_HARDHAT_WHITE}>
              <cylinderGeometry args={[0.11, 0.12, 0.08, 12]} />
            </mesh>
            <mesh position={[0.08, 0, 0.12]} material={MAT_WORKER_HARDHAT_WHITE}>
              <cylinderGeometry args={[0.11, 0.12, 0.08, 12]} />
            </mesh>
          </group>

          {/* Notice Paper Taped to Cabinet Side */}
          <mesh position={[0, 1.20, -0.48]} rotation={[0, 0, 0]} material={MAT_PAPER_DOCS}>
            <planeGeometry args={[0.28, 0.36]} />
          </mesh>
        </group>

        {/* ─── C. STACKED CARDBOARD DELIVERY / STORAGE BOXES (X = -6.65, Z = 2.35) ─── */}
        <group position={[-6.65, 0, 2.35]}>
          <mesh position={[0, 0.18, 0]} material={MAT_CARDBOARD_STACK}>
            <boxGeometry args={[0.44, 0.36, 0.46]} />
          </mesh>
          <mesh position={[-0.02, 0.52, 0.01]} rotation={[0, 0.05, 0]} material={MAT_CARDBOARD_STACK}>
            <boxGeometry args={[0.42, 0.34, 0.44]} />
          </mesh>
          <mesh position={[0.01, 0.83, -0.01]} rotation={[0, -0.04, 0]} material={MAT_CARDBOARD_STACK}>
            <boxGeometry args={[0.38, 0.30, 0.40]} />
          </mesh>
          <mesh position={[0.01, 1.02, -0.01]} material={MAT_WORKER_HARDHAT_WHITE}>
            <cylinderGeometry args={[0.11, 0.12, 0.08, 12]} />
          </mesh>
        </group>

        {/* ─── D. SIR NOEL LAVAPIE ELEVATED STANDING WORKSTATION (In Red Box Area, Facing Engineering Team) ─── */}
        {/* Workstation placed at X = -4.90m, Z = 2.05m, angled at -16° facing South-East towards team */}
        <group position={[-4.90, 0, 2.05]} rotation={[0, -0.28, 0]}>
          {/* Elevated Standing Desk Black Steel Tubular Legs (Standing Height = 1.04m) */}
          <mesh position={[-0.56, 0.52, -0.26]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.018, 0.018, 1.04, 8]} /></mesh>
          <mesh position={[0.56, 0.52, -0.26]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.018, 0.018, 1.04, 8]} /></mesh>
          <mesh position={[-0.56, 0.52, 0.26]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.018, 0.018, 1.04, 8]} /></mesh>
          <mesh position={[0.56, 0.52, 0.26]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.018, 0.018, 1.04, 8]} /></mesh>
          {/* Structural Crossbars & Ergonomic Footrest Bar */}
          <mesh position={[-0.56, 0.98, 0]} material={MAT_STEEL_DARK}><boxGeometry args={[0.025, 0.025, 0.54]} /></mesh>
          <mesh position={[0.56, 0.98, 0]} material={MAT_STEEL_DARK}><boxGeometry args={[0.025, 0.025, 0.54]} /></mesh>
          <mesh position={[0, 0.98, -0.26]} material={MAT_STEEL_DARK}><boxGeometry args={[1.12, 0.025, 0.025]} /></mesh>
          <mesh position={[0, 0.98, 0.26]} material={MAT_STEEL_DARK}><boxGeometry args={[1.12, 0.025, 0.025]} /></mesh>
          <mesh position={[0, 0.28, 0]} material={MAT_STEEL_DARK}><boxGeometry args={[1.12, 0.025, 0.48]} /></mesh>

          {/* Elevated Desktop Surface (Standing Height Y = 1.05m) */}
          <mesh position={[0, 1.05, 0]} material={MAT_DESK_LAMINATE}>
            <boxGeometry args={[1.25, 0.035, 0.64]} />
          </mesh>

          {/* Front Desk Technical Nameplate Facing Engineering Team (-Z direction) */}
          <mesh position={[0, 0.96, -0.33]} rotation={[0, Math.PI, 0]} material={matNoelDeskSign}>
            <planeGeometry args={[0.75, 0.13]} />
          </mesh>

          {/* 🖥️ 1. EXTERNAL 27" WIDESCREEN MONITOR (Facing Sir Noel at +Z) */}
          <group position={[-0.15, 1.07, 0.02]} rotation={[0, -0.08, 0]}>
            {/* Monitor Base */}
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.22, 0.016, 0.16]} />
            </mesh>
            {/* Stand Column */}
            <mesh position={[0, 0.16, -0.04]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.035, 0.30, 0.035]} />
            </mesh>
            {/* Bezel Housing */}
            <mesh position={[0, 0.28, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.64, 0.38, 0.025]} />
            </mesh>
            {/* High-Resolution Civil Blueprint Screen (Facing Sir Noel at +Z) */}
            <mesh position={[0, 0.28, 0.014]} material={matNoelMonitorScreen}>
              <planeGeometry args={[0.60, 0.34]} />
            </mesh>
          </group>

          {/* 💻 2. DOCKED LAPTOP (Facing Sir Noel at +Z with Outlook 365 Email Screen) */}
          <group position={[0.32, 1.07, 0.02]} rotation={[0, 0.14, 0]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.016, 0.24]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.32, 0.22]} />
            </mesh>
            <group position={[0, 0.015, -0.11]} rotation={[-0.26, 0, 0]}>
              <mesh position={[0, 0.105, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.21, 0.012]} />
              </mesh>
              <mesh position={[0, 0.105, 0.007]} material={matNoelOutlookScreen}>
                <planeGeometry args={[0.31, 0.18]} />
              </mesh>
            </group>
          </group>

          <RealisticErgonomicMouse position={[0.10, 1.07, 0.10]} />

          {/* 📄 4. DESK STATIONERY ON STANDING TABLE */}
          <group position={[-0.45, 1.07, 0.12]}>
            <mesh material={MAT_COFFEE_MUG}>
              <cylinderGeometry args={[0.035, 0.03, 0.09, 8]} />
            </mesh>
            <mesh position={[-0.01, 0.06, 0]} rotation={[0.1, 0, 0.1]} material={MAT_BINDER_BLUE}>
              <cylinderGeometry args={[0.004, 0.004, 0.12, 6]} />
            </mesh>
            <mesh position={[0.01, 0.06, 0.01]} rotation={[-0.1, 0, -0.1]} material={MAT_SPINE_BOARD_RED}>
              <cylinderGeometry args={[0.004, 0.004, 0.12, 6]} />
            </mesh>
            <mesh position={[0, 0.005, 0.08]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.20, 0.01, 0.16]} />
            </mesh>
          </group>

          {/* 🪣 5. YELLOW SMALL TRASH BUCKET ON FLOOR UNDER STANDING DESK */}
          <mesh position={[0.45, 0.12, 0.05]} material={matYellowBucket}>
            <cylinderGeometry args={[0.11, 0.09, 0.24, 12]} />
          </mesh>

          {/* ☕ 6. SMALL EXTENSION SIDE TABLE (On West/Window Side) */}
          <group position={[-0.98, -0.38, 0]}>
            <mesh position={[-0.32, 0.33, -0.22]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.014, 0.014, 0.66, 8]} /></mesh>
            <mesh position={[0.32, 0.33, -0.22]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.014, 0.014, 0.66, 8]} /></mesh>
            <mesh position={[-0.32, 0.33, 0.22]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.014, 0.014, 0.66, 8]} /></mesh>
            <mesh position={[0.32, 0.33, 0.22]} material={MAT_STEEL_DARK}><cylinderGeometry args={[0.014, 0.014, 0.66, 8]} /></mesh>
            <mesh position={[0, 0.66, 0]} material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[0.72, 0.025, 0.50]} />
            </mesh>

            {/* Electric Drip Coffee Maker */}
            <mesh position={[-0.16, 0.78, 0.02]} material={MAT_COFFEE_MAKER_BLACK}>
              <boxGeometry args={[0.16, 0.22, 0.16]} />
            </mesh>
            {/* Coffee Carafe */}
            <mesh position={[-0.12, 0.74, 0.02]} material={MAT_GLASS_CLEAR}>
              <cylinderGeometry args={[0.05, 0.06, 0.12, 10]} />
            </mesh>
            {/* Kettle */}
            <mesh position={[0.14, 0.76, 0.04]} material={MAT_STEEL_CHROME}>
              <cylinderGeometry args={[0.06, 0.07, 0.16, 10]} />
            </mesh>
            {/* Coffee Mug */}
            <mesh position={[0.02, 0.71, -0.12]} material={MAT_COFFEE_MUG}>
              <cylinderGeometry args={[0.038, 0.035, 0.08, 8]} />
            </mesh>
            {/* Blue Sugar/Coffee Canister */}
            <mesh position={[0.22, 0.72, -0.12]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.04, 0.04, 0.10, 8]} />
            </mesh>
            {/* Power Strip Extension Cord with Plugged Adapters */}
            <group position={[0, 0.68, 0.16]}>
              <mesh material={MAT_WHITEBOARD_PANEL}>
                <boxGeometry args={[0.26, 0.02, 0.07]} />
              </mesh>
              <mesh position={[-0.06, 0.02, -0.01]} material={MAT_COFFEE_MAKER_BLACK}>
                <boxGeometry args={[0.035, 0.03, 0.035]} />
              </mesh>
              <mesh position={[0.04, 0.02, -0.01]} material={MAT_WHITEBOARD_PANEL}>
                <boxGeometry args={[0.035, 0.035, 0.035]} />
              </mesh>
            </group>
          </group>

          {/* 🪑 7. AUXILIARY WHITE UTILITY TABLE (Directly Next to Small Side Table) */}
          <group position={[-1.88, -0.32, 0]}>
            <mesh position={[-0.42, 0.36, -0.22]} material={MAT_CUBICLE_ALUM_TRIM}><cylinderGeometry args={[0.015, 0.015, 0.72, 8]} /></mesh>
            <mesh position={[0.42, 0.36, -0.22]} material={MAT_CUBICLE_ALUM_TRIM}><cylinderGeometry args={[0.015, 0.015, 0.72, 8]} /></mesh>
            <mesh position={[-0.42, 0.36, 0.22]} material={MAT_CUBICLE_ALUM_TRIM}><cylinderGeometry args={[0.015, 0.015, 0.72, 8]} /></mesh>
            <mesh position={[0.42, 0.36, 0.22]} material={MAT_CUBICLE_ALUM_TRIM}><cylinderGeometry args={[0.015, 0.015, 0.72, 8]} /></mesh>
            <mesh position={[0, 0.72, 0]} material={MAT_WHITEBOARD_PANEL}>
              <boxGeometry args={[0.95, 0.03, 0.52]} />
            </mesh>
          </group>
        </group>

        {/* 👷 8. ENGR. NOEL LAVAPIE STANDING AT PROPER DISTANCE (WITH LIVE STAND_DESK_REVIEW KINEMATICS ROUTINE) */}
        {/* Positioned at [-5.05, 0.05, 2.72] (with comfortable clearance behind desk), facing South directly into his desk & room! */}
        <RealisticHumanoidMesh
          role="CIVIL_ENGINEER"
          personnelId="ENGR_NOEL_LAVAPIE"
          onSelectPerson={onSelectPerson}
          skinTone="MEDIUM"
          hairStyle="SHORT"
          hairColor="#1E293B"
          hasGlasses={true}
          glassesFrameColor="#0F172A"
          customShirtMat={MAT_SHIRT_SKY_BLUE_LEAD}
          customPantsMat={MAT_PANTS_KHAKI_SLACKS}
          hasHardhat={false}
          hasVest={false}
          pose="STAND_DESK_REVIEW"
          position={[-5.05, 0.05, 2.72]}
          rotation={[0, Math.PI - 0.28, 0]}
        />

        {/* ─── E. WEST WALL WINDOW & WALL FIXTURES (X = -6.95, Z = -2.20) ─── */}
        <group position={[-6.95, 2.10, -2.20]}>
          {/* White Aluminum Sliding Window Frame */}
          <mesh position={[-0.02, 0, 0]} material={MAT_WHITEBOARD_PANEL}>
            <boxGeometry args={[0.05, 1.40, 1.80]} />
          </mesh>
          {/* Window Glass */}
          <mesh position={[-0.01, 0, 0]} material={MAT_GLASS_CLEAR}>
            <boxGeometry args={[0.02, 1.28, 1.68]} />
          </mesh>
          {/* Window Sill */}
          <mesh position={[0.04, -0.72, 0]} material={MAT_WHITEBOARD_PANEL}>
            <boxGeometry args={[0.12, 0.04, 1.90]} />
          </mesh>
        </group>

        {/* Oscillating Black Wall Fan Mounted on Column near Window (X = -6.85, Y = 2.40, Z = -1.15) */}
        <group position={[-6.85, 2.40, -1.15]}>
          <mesh position={[-0.04, 0, 0]} material={MAT_WIRE_FAN_BLACK}>
            <boxGeometry args={[0.06, 0.12, 0.08]} />
          </mesh>
          <mesh position={[0.04, 0, 0]} material={MAT_WIRE_FAN_BLACK}>
            <cylinderGeometry args={[0.045, 0.055, 0.10, 10]} />
          </mesh>
          <group position={[0.12, -0.02, 0]} rotation={[0, 0, -0.3]}>
            <mesh material={MAT_WIRE_FAN_BLACK}>
              <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
            </mesh>
            <mesh material={MAT_WIRE_FAN_BLACK}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
          </group>
        </group>

        {/* Office Checklist / Memo Paper Taped to Wall (X = -6.94, Y = 1.95, Z = -1.45) */}
        <mesh position={[-6.94, 1.95, -1.45]} rotation={[0, Math.PI / 2, 0]} material={matWallNotice}>
          <planeGeometry args={[0.30, 0.42]} />
        </mesh>

        {/* Safety Hardhat Hanging on Wall Hook (X = -6.92, Y = 1.90, Z = -3.30) */}
        <group position={[-6.92, 1.90, -3.30]}>
          <mesh position={[0.02, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.04, 0.02, 0.02]} />
          </mesh>
          <mesh position={[0.08, -0.04, 0]} rotation={[0.4, 0, 0]} material={MAT_WORKER_HARDHAT_WHITE}>
            <cylinderGeometry args={[0.11, 0.12, 0.08, 12]} />
          </mesh>
        </group>

        {/* Safety Vest Hanging on Wall Hook (X = -6.92, Y = 1.70, Z = -3.80) */}
        <mesh position={[-6.92, 1.70, -3.80]} rotation={[0, Math.PI / 2, 0]} material={MAT_WORKER_VEST_GREEN}>
          <planeGeometry args={[0.36, 0.60]} />
        </mesh>

        {/* ─── F. FOREGROUND COLLABORATIVE TABLE: DEDICATED GEOMAPPER & CAD WORKSTATIONS ─── */}
        {/* Table position: [-2.50, 0.74, -1.80], length 2.40m along Z, width 1.20m along X */}
        <group position={[-2.50, 0.76, -1.80]}>

          {/* 💻 1. SIR AMOR FLORESCA DEDICATED WORKSTATION (West Side, facing East into Laptop) */}
          {/* Placed at local [-0.38, 0, 0.0] directly in front of Sir Amor seated at [-3.16, 0.05, -1.80] */}
          <group position={[-0.38, 0.01, 0.0]} rotation={[0, -Math.PI / 2, 0]}>
            {/* Open Laptop — Running QGIS / Rocscience Dips Geotechnical & Rock Mass Rating (RMR) */}
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.11]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.11, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.22, 0.012]} />
              </mesh>
              <mesh position={[0, 0.11, 0.007]} material={matGeomappingScreen}>
                <planeGeometry args={[0.33, 0.19]} />
              </mesh>
            </group>

            <RealisticErgonomicMouse position={[0.28, 0.008, 0.08]} />

            {/* Geological Rock Core Tray & Hard Rock Sample on Sir Amor's left */}
            <group position={[-0.32, 0.01, 0.02]}>
              <mesh material={MAT_CARDBOARD_STACK}>
                <boxGeometry args={[0.20, 0.02, 0.18]} />
              </mesh>
              <mesh position={[0, 0.02, 0]} material={MAT_STEEL_DARK}>
                <dodecahedronGeometry args={[0.035, 0]} />
              </mesh>
            </group>
          </group>

          {/* 💻 2. SIR ELBERT FIGURACION DEDICATED WORKSTATION (South End, facing North into Laptop) */}
          {/* Placed at local [0.0, 0, 0.78] directly in front of Sir Elbert seated at [-2.50, 0.05, -0.62] */}
          <group position={[0.0, 0.01, 0.78]} rotation={[0, 0, 0]}>
            {/* Open Laptop — Running AutoCAD 2026 3D Structural / Penstock Blueprints */}
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.11]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.11, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.22, 0.012]} />
              </mesh>
              <mesh position={[0, 0.11, 0.007]} material={matCADScreen}>
                <planeGeometry args={[0.33, 0.19]} />
              </mesh>
            </group>

            <RealisticErgonomicMouse position={[0.28, 0.008, 0.02]} />

            {/* Ceramic Pen Holder Mug with Technical Drafting Pens on left */}
            <group position={[-0.28, 0.04, 0.02]}>
              <mesh material={MAT_PORCELAIN_WHITE}>
                <cylinderGeometry args={[0.038, 0.032, 0.09, 10]} />
              </mesh>
              <mesh position={[-0.01, 0.06, 0]} rotation={[0.12, 0, 0.1]} material={MAT_BINDER_BLUE}>
                <cylinderGeometry args={[0.004, 0.004, 0.13, 6]} />
              </mesh>
              <mesh position={[0.01, 0.06, 0.01]} rotation={[-0.1, 0, -0.1]} material={MAT_COFFEE_MAKER_BLACK}>
                <cylinderGeometry args={[0.004, 0.004, 0.13, 6]} />
              </mesh>
            </group>
          </group>

          {/* 🎒 3. BACKPACKS & ACCESSORIES (Placed on North End of Table) */}
          {/* Black Lenovo Backpack */}
          <group position={[0.20, 0.06, -0.75]} rotation={[0, 0.15, 0]}>
            <mesh material={matBackpackLenovo}>
              <boxGeometry args={[0.36, 0.12, 0.44]} />
            </mesh>
            <mesh position={[0, 0.06, 0.04]} material={matBackpackLenovo}>
              <boxGeometry args={[0.30, 0.06, 0.34]} />
            </mesh>
          </group>

          {/* Black Nike Backpack with Blue Snapback Cap */}
          <group position={[-0.20, 0.06, -0.75]} rotation={[0, -0.2, 0]}>
            <mesh material={matBackpackLenovo}>
              <boxGeometry args={[0.36, 0.14, 0.44]} />
            </mesh>
            <mesh position={[0, 0.09, 0.05]} material={matCapSnapback}>
              <sphereGeometry args={[0.09, 10, 10]} />
            </mesh>
            <mesh position={[0, 0.06, 0.14]} material={matCapSnapback}>
              <boxGeometry args={[0.12, 0.01, 0.08]} />
            </mesh>
          </group>

          {/* 💧 4. 500mL Water Bottle with Yellow Label */}
          <group position={[-0.25, 0.10, -0.25]}>
            <mesh material={MAT_GLASS_CLEAR}>
              <cylinderGeometry args={[0.032, 0.032, 0.18, 10]} />
            </mesh>
            <mesh position={[0, 0, 0]} material={matYellowBucket}>
              <cylinderGeometry args={[0.033, 0.033, 0.07, 10]} />
            </mesh>
            <mesh position={[0, 0.10, 0]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.016, 0.016, 0.025, 8]} />
            </mesh>
          </group>

          {/* 📐 5. Architecture Blueprint Sheet & Protractor */}
          <group position={[0.18, 0.01, -0.25]} rotation={[0, 0.08, 0]}>
            <mesh material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.32, 0.015, 0.42]} />
            </mesh>
            <mesh position={[0.02, 0.01, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.05, 0.05, 0.004, 16]} />
            </mesh>
          </group>

          {/* 🔌 6. Extension Power Strip */}
          <group position={[0.0, 0.015, 0.0]}>
            <mesh material={MAT_WHITEBOARD_PANEL}>
              <boxGeometry args={[0.08, 0.02, 0.28]} />
            </mesh>
            <mesh position={[0, 0.01, 0]} material={MAT_COFFEE_MAKER_BLACK}>
              <cylinderGeometry args={[0.006, 0.006, 0.24, 6]} />
            </mesh>
          </group>
        </group>

        {/* Sir Amor — Geological Mapper & Engineering Geologist (Seated on West side of table, facing East into his laptop) */}
        <RealisticHumanoidMesh
          role="CIVIL_ENGINEER"
          personnelId="GEO_AMOR_FLORESCA"
          onSelectPerson={onSelectPerson}
          skinTone="BRONZE"
          hairStyle="SHORT_POMPADOUR"
          hairColor="#0F172A"
          facialHair="STUBBLE"
          customShirtMat={MAT_SHIRT_DESERT_SAFARI}
          customPantsMat={MAT_PANTS_OLIVE_CARGO}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-3.16, 0.05, -1.80]}
          rotation={[0, Math.PI / 2, 0]}
        />

        {/* Sir Elbert — CAD / BIM / Structural Engineering Specialist (Seated on South end, facing North into his laptop) */}
        <RealisticHumanoidMesh
          role="CAD_ENGINEER"
          personnelId="CAD_ELBERT_FIGURACION"
          onSelectPerson={onSelectPerson}
          skinTone="MEDIUM"
          hairStyle="UNDERCUT"
          hairColor="#0F172A"
          customShirtMat={MAT_SHIRT_CHARCOAL_CAD}
          customPantsMat={MAT_PANTS_DENIM_BLUE}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-2.50, 0.05, -0.62]}
          rotation={[0, Math.PI, 0]}
        />

        {/* 7. FULL-LENGTH KITCHEN WALL WORKSTATIONS & 3 ALIGNED SEATED PERSONNEL */}
        {/* ─── WORKSTATION 1: IT SPECIALIST (Far East / Right side, X = -2.10m) ─── */}
        <group position={[-2.10, 0.76, -4.95]}>
          {/* External 27-inch Monitor with Stand — Running Windows 11 + VS Code */}
          <group position={[0, 0, -0.22]}>
            <mesh position={[0, 0.05, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.20, 0.015, 0.16]} />
            </mesh>
            <mesh position={[0, 0.18, -0.04]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.05, 0.26, 0.04]} />
            </mesh>
            <mesh position={[0, 0.28, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.62, 0.38, 0.025]} />
            </mesh>
            <mesh position={[0, 0.28, 0.014]} material={matVSCodeScreen}>
              <planeGeometry args={[0.58, 0.34]} />
            </mesh>
          </group>

          {/* Open Side Laptop — VS Code Editor */}
          <group position={[-0.50, 0, -0.08]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.014, 0.23]} />
            </mesh>
            <mesh position={[0, 0.0155, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.32, 0.21]} />
            </mesh>
            <group position={[0, 0.015, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matVSCodeScreen}>
                <planeGeometry args={[0.31, 0.17]} />
              </mesh>
            </group>
          </group>

          {/* Extended XXL Long Mousepad / Desk Mat */}
          <mesh position={[0, -0.014, 0.06]} material={MAT_MONITOR_BEZEL}>
            <boxGeometry args={[0.85, 0.004, 0.36]} />
          </mesh>

          {/* Realistic Mechanical Gaming/Dev Keyboard with Sculpted Keycaps & RGB Underglow */}
          <group position={[-0.04, -0.005, 0.06]}>
            <mesh position={[0, 0.006, 0]} rotation={[-0.08, 0, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.44, 0.016, 0.16]} />
            </mesh>
            <mesh position={[0, 0.0145, 0]} rotation={[-Math.PI / 2 - 0.08, 0, 0]} material={matMechKeyboard}>
              <planeGeometry args={[0.42, 0.14]} />
            </mesh>
          </group>

          <RealisticErgonomicMouse position={[0.26, 0.008, 0.06]} hasMousepad={false} />
        </group>

        {/* Harrold Salva (IT Support Specialist) Chair & Character */}
        <mesh geometry={geoMonoblocChair} position={[-2.10, 0, -4.48]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
        <RealisticHumanoidMesh
          role="IT_ENGINEER"
          personnelId="IT_MARC_SALVA"
          onSelectPerson={onSelectPerson}
          skinTone="LIGHT"
          hairStyle="UNDERCUT"
          hairColor="#0F172A"
          hasGlasses={true}
          glassesFrameColor="#0F172A"
          customShirtMat={MAT_SHIRT_INDIGO_DEV}
          customPantsMat={MAT_PANTS_CHARCOAL}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-2.10, 0.05, -4.48]}
          rotation={[0, Math.PI, 0]}
        />

        {/* ─── WORKSTATION 2: MECHANICAL SUPERVISOR — ANDREW SILVA (Middle, X = -4.10m) ─── */}
        <group position={[-4.10, 0.76, -4.95]}>
          {/* White Laptop Cooler Pad with angled ventilation stand */}
          <mesh position={[0, 0.012, -0.12]} rotation={[0.08, 0, 0]} material={MAT_PORCELAIN_WHITE}>
            <boxGeometry args={[0.38, 0.024, 0.28]} />
          </mesh>

          {/* High-End Black Gaming Laptop sitting on top of white cooler — Windows 11 AutoCAD 3D */}
          <group position={[0, 0.032, -0.12]} rotation={[0.08, 0, 0]}>
            <mesh position={[0, 0.008, 0]} material={MAT_COFFEE_MAKER_BLACK}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.11]} rotation={[-0.32, 0, 0]}>
              <mesh position={[0, 0.11, 0]} material={MAT_COFFEE_MAKER_BLACK}>
                <boxGeometry args={[0.36, 0.22, 0.012]} />
              </mesh>
              <mesh position={[0, 0.11, 0.007]} material={matCADScreen}>
                <planeGeometry args={[0.33, 0.19]} />
              </mesh>
            </group>
          </group>

          {/* Gaming Mechanical Keyboard in front of cooler */}
          <group position={[0, -0.005, 0.08]}>
            <mesh position={[0, 0.006, 0]} rotation={[-0.08, 0, 0]} material={MAT_COFFEE_MAKER_BLACK}>
              <boxGeometry args={[0.44, 0.016, 0.16]} />
            </mesh>
            <mesh position={[0, 0.0145, 0]} rotation={[-Math.PI / 2 - 0.08, 0, 0]} material={matMechKeyboard}>
              <planeGeometry args={[0.42, 0.14]} />
            </mesh>
          </group>

          <RealisticErgonomicMouse position={[0.35, 0.008, 0.08]} mousepadSize={[0.26, 0.22]} />
        </group>

        {/* Mechanical Supervisor Andrew Silva Chair & Character */}
        <mesh geometry={geoMonoblocChair} position={[-4.10, 0, -4.48]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
        <mesh position={[-4.10, 0.74, -4.95]} material={MAT_DESK_LAMINATE}>
          <boxGeometry args={[1.20, 0.035, 0.60]} />
        </mesh>
        <RealisticHumanoidMesh
          role="MECHANICAL_ENGINEER"
          personnelId="MECH_ANDREW_SILVA"
          onSelectPerson={onSelectPerson}
          skinTone="MEDIUM"
          hairStyle="CREW_CUT"
          hairColor="#1E293B"
          facialHair="GOATEE"
          customShirtMat={MAT_SHIRT_ROYAL_MECH}
          customPantsMat={MAT_PANTS_CHARCOAL}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-4.10, 0.05, -4.48]}
          rotation={[0, Math.PI, 0]}
        />

        {/* ─── WORKSTATION 3: MECHANICAL SUPERINTENDENT — SIR EUGENE (Far West / Left, X = -5.90m) ─── */}
        <group position={[-5.90, 0.76, -4.95]}>
          {/* Workstation Laptop — Windows 11 AutoCAD Layout */}
          <group position={[0, 0, -0.10]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.11]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.11, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.22, 0.012]} />
              </mesh>
              <mesh position={[0, 0.11, 0.007]} material={matCADScreen}>
                <planeGeometry args={[0.33, 0.19]} />
              </mesh>
            </group>
          </group>

          {/* Construction Blueprints & Technical Drawings */}
          <mesh position={[0.55, -0.012, 0.04]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.60, 0.008, 0.38]} />
          </mesh>

          {/* Coffee Mug */}
          <mesh position={[-0.45, 0.04, -0.05]} material={MAT_COFFEE_MUG}>
            <cylinderGeometry args={[0.04, 0.038, 0.09, 8]} />
          </mesh>

          <RealisticErgonomicMouse position={[0.26, 0.008, 0.08]} />
        </group>

        {/* Mechanical Superintendent (Sir Eugene) Chair & Character */}
        <mesh geometry={geoMonoblocChair} position={[-5.90, 0, -4.52]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
        <RealisticHumanoidMesh
          role="PROJECT_MANAGER"
          personnelId="SUPT_EUGENIO_HANOPOL"
          onSelectPerson={onSelectPerson}
          skinTone="BRONZE"
          hairStyle="SHORT"
          hairColor="#334155"
          facialHair="MUSTACHE"
          customShirtMat={MAT_SHIRT_OLIVE_SUPT}
          customPantsMat={MAT_PANTS_KHAKI_SLACKS}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-5.90, 0.05, -4.52]}
          rotation={[0, Math.PI, 0]}
        />


        {/* ─── 8. SEMI-LONG BROADENED WORKTABLE: QUANTITY SURVEYING & PLANNING ENGINEERS ─── */}
        {/* Table position: [-5.20, 0.74, -1.80] (Behind Mechanical Superintendent Sir Eugene), size: 2.60m length along Z, 1.20m width along X */}

        {/* ─── WORKSTATION A: ENGR. MAY ANN PARALLAG (Junior Planning Engineer, East side facing West) ─── */}
        <group position={[-4.85, 0.76, -1.80]}>
          {/* Open Laptop facing East toward May Ann — Windows 11 Primavera P6 / MS Project */}
          <group position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matPlanningScreen}>
                <planeGeometry args={[0.33, 0.17]} />
              </mesh>
            </group>
          </group>

          <RealisticErgonomicMouse position={[0, 0.008, 0.35]} rotation={[0, -Math.PI / 2, 0]} />

          {/* Project Schedule Documentation & Notepad */}
          <mesh position={[0, -0.012, -0.40]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.24, 0.010, 0.32]} />
          </mesh>
        </group>

        {/* Engr. May Ann Parallag Chair & Character (East side, facing West — UNTOUCHED) */}
        <mesh geometry={geoMonoblocChair} position={[-4.42, 0, -1.80]} rotation={[0, -Math.PI / 2, 0]} material={MAT_MONOBLOC_WHITE} />
        <RealisticHumanoidMesh
          role="HR_OFFICER"
          personnelId="PLANNING_MAY_PARALLAG"
          onSelectPerson={onSelectPerson}
          skinTone="FAIR"
          hairStyle="WOMAN_PONYTAIL"
          hairColor="#0F172A"
          customShirtMat={MAT_SHIRT_EMERALD_PLAN}
          customPantsMat={MAT_PANTS_KHAKI_SLACKS}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-4.42, 0.05, -1.80]}
          rotation={[0, -Math.PI / 2, 0]}
        />

        {/* ─── WORKSTATION B: QUANTITY SURVEYOR (Sir John Rick Hernaez, West side facing East) ─── */}
        <group position={[-5.55, 0.76, -1.80]}>
          {/* Open Laptop facing West toward John Rick — Windows 11 Microsoft Excel BOQ */}
          <group position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matQSExcelScreen}>
                <planeGeometry args={[0.33, 0.17]} />
              </mesh>
            </group>
          </group>

          <RealisticErgonomicMouse position={[0, 0.008, -0.35]} rotation={[0, Math.PI / 2, 0]} />

          {/* BOQ Takeoff Clipboard & Calculation Sheets */}
          <mesh position={[0, -0.012, 0.40]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.24, 0.012, 0.34]} />
          </mesh>
        </group>

        {/* Quantity Surveyor John Rick Hernaez Chair & Character (West side, facing East) */}
        <mesh geometry={geoMonoblocChair} position={[-5.98, 0, -1.80]} rotation={[0, Math.PI / 2, 0]} material={MAT_MONOBLOC_WHITE} />
        <RealisticHumanoidMesh
          role="CIVIL_ENGINEER"
          personnelId="QS_JOHN_RICK_HERNAEZ"
          onSelectPerson={onSelectPerson}
          skinTone="MEDIUM"
          hairStyle="SHORT"
          hairColor="#0F172A"
          hasGlasses={true}
          glassesFrameColor="#1E293B"
          customShirtMat={MAT_SHIRT_CRISP_WHITE_QS}
          customPantsMat={MAT_PANTS_DARK_SLACKS}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-5.98, 0.05, -1.80]}
          rotation={[0, Math.PI / 2, 0]}
        />

        {/* ─── WORKSTATION C: JUNIOR QUANTITY SURVEYOR (Christine Joy Almazan, Middle / North side facing South) ─── */}
        <group position={[-5.20, 0.76, -2.70]}>
          {/* Open Laptop facing North toward Christine — Windows 11 Excel QTO Cost Sheet */}
          <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.008, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.36, 0.016, 0.25]} />
            </mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matLaptopDeck}>
              <planeGeometry args={[0.34, 0.23]} />
            </mesh>
            <group position={[0, 0.015, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.36, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matQSExcelScreen}>
                <planeGeometry args={[0.33, 0.17]} />
              </mesh>
            </group>
          </group>

          <RealisticErgonomicMouse position={[0.35, 0.008, 0]} rotation={[0, Math.PI, 0]} />

          {/* Cost Estimation Notebook & Calculator */}
          <mesh position={[-0.38, -0.012, 0]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.22, 0.010, 0.28]} />
          </mesh>
        </group>

        {/* Junior Quantity Surveyor Christine Almazan Chair & Character (Middle / North side, facing South into table) */}
        <mesh geometry={geoMonoblocChair} position={[-5.20, 0, -3.12]} rotation={[0, 0, 0]} material={MAT_MONOBLOC_WHITE} />
        <RealisticHumanoidMesh
          role="HR_OFFICER"
          personnelId="QS_CRISTINE_ALMAZAN"
          onSelectPerson={onSelectPerson}
          skinTone="FAIR"
          hairStyle="WOMAN_PONYTAIL"
          hairColor="#0F172A"
          customShirtMat={MAT_SHIRT_ROSE_BLUSH}
          customPantsMat={MAT_PANTS_CHARCOAL}
          hasHardhat={false}
          hasVest={false}
          pose="SEATED"
          position={[-5.20, 0.05, -3.12]}
          rotation={[0, 0, 0]}
        />
      </group>

      {/* ═══ 7. EAST WING FURNISHED OFFICE INTERIORS (LOD GATED PER ROOM) ═══ */}

      {/* ═══ 7. EAST CORRIDOR DOORS & DEPARTMENTAL SIGNS (HR, ACCOUNTING, ADMIN, ESH) ═══ */}
      {[
        { dz: 8.8, signTex: hrSignTex, signY: 2.35, signW: 0.55, signH: 0.22, openAngle: 0.18 },
        { dz: 4.8, signTex: accountingSignTex, signY: 2.35, signW: 0.55, signH: 0.20, openAngle: 0 },
        { dz: 0.8, signTex: adminSignTex, signY: 2.35, signW: 0.55, signH: 0.20, openAngle: 0.15 },
        { dz: -3.2, signTex: eshSignTex, signY: 2.35, signW: 0.55, signH: 0.22, openAngle: 0 },
      ].map(({ dz, signTex, signY, signW, signH, openAngle }, idx) => (
        <group key={`east-corridor-door-${idx}`}>
          {/* Flush White Timber Door with Chrome Lever Handles */}
          <group position={[1.20, 1.05, dz - 0.44]} rotation={[0, openAngle, 0]}>
            <mesh position={[0, 0, 0.44]} castShadow receiveShadow material={MAT_DOOR_WHITE_FLUSH}>
              <boxGeometry args={[0.04, 2.06, 0.88]} />
            </mesh>
            {/* Chrome Handles on Both Sides */}
            <mesh position={[-0.04, -0.05, 0.76]} material={MAT_DOORKNOB_CHROME}>
              <sphereGeometry args={[0.032, 12, 12]} />
            </mesh>
            <mesh position={[0.04, -0.05, 0.76]} material={MAT_DOORKNOB_CHROME}>
              <sphereGeometry args={[0.032, 12, 12]} />
            </mesh>
          </group>

          {/* Green Acrylic Department Signboard Mounted Above Door on Corridor Side (X = 1.15m facing Aisle West) */}
          <group position={[1.15, signY, dz]}>
            <mesh position={[0, 0, 0]} material={MAT_SHIRT_LONG_GREEN}>
              <boxGeometry args={[0.02, signH + 0.04, signW + 0.04]} />
            </mesh>
            <mesh position={[-0.012, 0, 0]}>
              <boxGeometry args={[0.005, signH, signW]} />
              <meshBasicMaterial map={signTex || undefined} color={signTex ? "#FFFFFF" : "#0F172A"} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
           5A: HR / ADMIN OFFICE  (Photo 1)
           Room bounds: X ∈ [1.20, 7.00], Z ∈ [6.80, 10.80]
           Door: X=1.20, Z=8.80.  POV: standing at door looking East.
           LEFT (North) = Z > 8.80,  RIGHT (South) = Z < 8.80
           ═══════════════════════════════════════════════════════════════════ */}
      {roomVis.r5a && (
        <group name="Zone5A_HROffice">

          {/* ── LEFT / NORTH SIDE (Z > 8.80) ─────────────────────────────── */}

          {/* Foreground-left white desk near door (woman standing behind it) */}
          <group position={[2.20, 0.74, 9.60]}>
            <mesh receiveShadow material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[1.00, 0.04, 0.60]} />
            </mesh>
            {[-0.44, 0.44].map((dx, i) =>
              [-0.25, 0.25].map((dz, j) => (
                <mesh key={`hr-dleg-${i}-${j}`} position={[dx, -0.36, dz]} material={MAT_DESK_LEGS}>
                  <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
                </mesh>
              ))
            )}
            {/* Open laptop */}
            <mesh position={[0.10, 0.015, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.016, 0.24]} />
            </mesh>
            <group position={[0.10, 0.02, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matPlanningScreen}>
                <planeGeometry args={[0.31, 0.17]} />
              </mesh>
            </group>
            {/* Papers & phone on desk */}
            <mesh position={[-0.32, 0.015, 0.08]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.22, 0.02, 0.28]} />
            </mesh>
            <mesh position={[-0.32, 0.035, -0.12]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.08, 0.01, 0.16]} />
            </mesh>
          </group>

          {/* Beige monobloc chair in front of the white desk */}
          <mesh geometry={geoMonoblocChair} position={[2.20, 0.05, 9.00]} rotation={[0, 0, 0]} material={MAT_MONOBLOC_WHITE} />
          {/* Extra chair foreground-left corner */}
          <mesh geometry={geoMonoblocChair} position={[1.60, 0.05, 8.40]} rotation={[0, 0.4, 0]} material={MAT_MONOBLOC_WHITE} />

          {/* Standing female HR officer in white t-shirt behind the desk */}
          <RealisticHumanoidMesh
            role="HR_OFFICER"
            personnelId="HR_ROVIGAIL_ABELLAR"
            onSelectPerson={onSelectPerson}
            skinTone="LIGHT"
            hairStyle="WOMAN_PONYTAIL"
            customShirtMat={MAT_PORCELAIN_WHITE}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="STAND"
            position={[1.80, 0.05, 9.80]}
            rotation={[0, Math.PI / 4, 0]}
          />

          {/* Tall dark shelving/cabinet stacked with document binders against north wall */}
          <group position={[2.80, 1.40, 10.55]}>
            <mesh castShadow material={MAT_CABINET_DARK_WOOD}>
              <boxGeometry args={[1.80, 2.20, 0.40]} />
            </mesh>
            {[0.75, 0.35, -0.05, -0.45].map((sy, idx) => (
              <mesh key={`hr-binder-row-${idx}`} position={[0, sy, 0.22]} material={idx % 2 === 0 ? MAT_BINDER_BLUE : MAT_STEEL_DARK}>
                <boxGeometry args={[1.60, 0.26, 0.20]} />
              </mesh>
            ))}
          </group>

          {/* Wall-mounted oscillating fan high on north wall */}
          <group position={[1.60, 2.80, 10.70]}>
            <mesh material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
            </mesh>
            <mesh position={[0, 0, 0.06]} material={MAT_WIRE_FAN_BLACK}>
              <cylinderGeometry args={[0.20, 0.20, 0.04, 12]} />
            </mesh>
          </group>

          {/* ── FAR / EAST WALL (X ~ 6.95) ──────────────────────────────── */}

          {/* Window with green tropical leaf curtain */}
          <group position={[6.95, 2.10, 8.80]}>
            <mesh material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.06, 1.50, 1.80]} />
            </mesh>
            <mesh material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.02, 1.40, 1.70]} />
            </mesh>
            <mesh position={[-0.04, 0, 0]} material={MAT_CURTAIN_FABRIC_LEAF}>
              <boxGeometry args={[0.04, 1.60, 1.90]} />
            </mesh>
          </group>

          {/* Papers & notices pinned around window */}
          {[-0.60, -0.30, 0.30, 0.60].map((dz, idx) => (
            <mesh key={`hr-notice-${idx}`} position={[6.90, 2.00 + (idx % 2) * 0.25, 8.80 + dz]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.005, 0.28, 0.20]} />
            </mesh>
          ))}

          {/* Ceiling fluorescent tube */}
          <mesh position={[4.00, 3.15, 8.80]} material={MAT_FLUORESCENT_TUBE}>
            <boxGeometry args={[0.08, 0.04, 1.20]} />
          </mesh>

          {/* ── RIGHT / SOUTH SIDE (Z < 8.80) ─────────────────────────────── */}

          {/* Long dark continuous counter/desk along south wall Z ~ 7.10 */}
          <group position={[4.40, 0.74, 7.10]}>
            {/* Dark countertop */}
            <mesh receiveShadow material={MAT_TABLE_DARK_BROWN}>
              <boxGeometry args={[4.40, 0.04, 0.60]} />
            </mesh>
            {/* Lower open shelves under counter */}
            <mesh position={[0, -0.40, 0]} material={MAT_CABINET_DARK_WOOD}>
              <boxGeometry args={[4.36, 0.68, 0.56]} />
            </mesh>
            {/* Red HARD COPY paper boxes in lower shelves */}
            {[-1.40, 0, 1.40].map((bx, idx) => (
              <mesh key={`hr-redbox-${idx}`} position={[bx, -0.50, 0.10]} material={MAT_RED_BOOTH}>
                <boxGeometry args={[0.50, 0.24, 0.36]} />
              </mesh>
            ))}
            {/* Desktop monitor (right side of counter) */}
            <group position={[1.40, 0.02, 0]}>
              <mesh position={[0, 0.20, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.46, 0.30, 0.02]} />
              </mesh>
              <mesh position={[0, 0.20, 0.012]} material={matVSCodeScreen}>
                <planeGeometry args={[0.43, 0.27]} />
              </mesh>
              <mesh position={[0, 0.02, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.06, 8]} />
              </mesh>
            </group>
            {/* Printer/scanner (center-right) */}
            <mesh position={[0.50, 0.14, 0]} material={MAT_PRINTER_BLACK}>
              <boxGeometry args={[0.50, 0.28, 0.40]} />
            </mesh>
            {/* Heavy stacked papers/folders spread along counter */}
            {[-1.80, -1.20, -0.50, 0.10, 0.70, 1.80].map((px, idx) => (
              <mesh key={`hr-stack-${idx}`} position={[px, 0.03 + (idx % 2) * 0.02, 0.04]} material={MAT_PAPER_DOCS}>
                <boxGeometry args={[0.24, 0.04 + (idx % 3) * 0.02, 0.30]} />
              </mesh>
            ))}
            {/* Coffee mug */}
            <mesh position={[0.90, 0.06, 0.10]} material={MAT_COFFEE_MUG}>
              <cylinderGeometry args={[0.035, 0.035, 0.08, 8]} />
            </mesh>
          </group>

          {/* Orange conduit running horizontally along south wall */}
          <mesh position={[4.40, 1.50, 6.85]} rotation={[0, 0, Math.PI / 2]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.012, 0.012, 4.40, 6]} />
          </mesh>

          {/* Wall-pinned forms & memos above the counter */}
          {[-1.00, -0.30, 0.40, 1.10].map((fx, idx) => (
            <mesh key={`hr-form-${idx}`} position={[4.40 + fx, 1.80, 6.85]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.20, 0.28, 0.005]} />
            </mesh>
          ))}

          {/* Staff #1 seated at counter (black shirt, facing south into counter) */}
          <mesh geometry={geoMonoblocChair} position={[3.80, 0.05, 7.70]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="HR_OFFICER"
            personnelId="HR_JOSHUA_ADMIN"
            onSelectPerson={onSelectPerson}
            skinTone="MEDIUM"
            hairStyle="WOMAN_BOB"
            customShirtMat={MAT_SHIRT_NAVY}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="SEATED"
            position={[3.80, 0.05, 7.70]}
            rotation={[0, Math.PI, 0]}
          />

          {/* Staff #2 seated further along counter */}
          <mesh geometry={geoMonoblocChair} position={[5.00, 0.05, 7.70]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="HR_OFFICER"
            personnelId="HR_RANDY_GAMBOA"
            onSelectPerson={onSelectPerson}
            skinTone="MEDIUM"
            customShirtMat={MAT_SHIRT_NAVY}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="SEATED"
            position={[5.00, 0.05, 7.70]}
            rotation={[0, Math.PI, 0]}
          />
        </group>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           5B: ACCOUNTING / TREASURY  (Photo 2)
           Room: X [1.20,7.00], Z [2.80,6.80].  Door: X=1.20, Z=4.80
           LEFT(North)=Z>4.80  RIGHT(South)=Z<4.80
           ═══════════════════════════════════════════════════════════════════ */}
      {roomVis.r5b && (
        <group name="Zone5B_AccountingOffice">

          {/* ── LEFT / NORTH SIDE ─────────────────────────────────────────── */}

          {/* Foreground-left desk near door with open laptop */}
          <group position={[1.80, 0.74, 5.60]}>
            <mesh receiveShadow material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[0.90, 0.04, 0.55]} />
            </mesh>
            {[-0.38, 0.38].map((dx, i) =>
              [-0.22, 0.22].map((dz, j) => (
                <mesh key={`acc-dleg-${i}-${j}`} position={[dx, -0.36, dz]} material={MAT_DESK_LEGS}>
                  <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
                </mesh>
              ))
            )}
            <mesh position={[0, 0.015, 0]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.016, 0.24]} />
            </mesh>
            <group position={[0, 0.02, -0.10]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matQSExcelScreen}>
                <planeGeometry args={[0.31, 0.17]} />
              </mesh>
            </group>
          </group>
          <mesh geometry={geoMonoblocChair} position={[1.80, 0.05, 5.00]} rotation={[0, 0, 0]} material={MAT_MONOBLOC_WHITE} />

          {/* Blue 5-gallon water jug on floor near door */}
          <group position={[1.50, 0.20, 4.40]}>
            <mesh material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.13, 0.13, 0.38, 12]} />
            </mesh>
            <mesh position={[0, 0.21, 0]} material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
            </mesh>
          </group>

          {/* Black electrical panel high on north wall with orange conduit */}
          <mesh position={[3.00, 2.70, 6.75]} castShadow material={MAT_ELECTRICAL_PANEL_BLACK}>
            <boxGeometry args={[0.55, 0.50, 0.35]} />
          </mesh>
          <mesh position={[3.00, 2.20, 6.75]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.015, 0.015, 0.80, 6]} />
          </mesh>
          {/* Horizontal conduit along north wall base */}
          <mesh position={[4.00, 0.30, 6.75]} rotation={[0, 0, Math.PI / 2]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.012, 0.012, 3.50, 6]} />
          </mesh>

          {/* Small white split AC unit */}
          <mesh position={[4.80, 2.30, 6.75]} material={MAT_AC_UNIT_WHITE}>
            <boxGeometry args={[0.80, 0.28, 0.20]} />
          </mesh>

          {/* Hi-vis green safety vest hanging on wall hook */}
          <mesh position={[3.80, 1.70, 6.75]} material={MAT_WORKER_VEST_GREEN}>
            <boxGeometry args={[0.35, 0.60, 0.04]} />
          </mesh>

          {/* Pair of black rubber safety boots on floor */}
          <group position={[4.40, 0.16, 6.65]}>
            <mesh position={[-0.06, 0, 0]} material={MAT_RUBBER_BOOTS_BLACK}>
              <boxGeometry args={[0.10, 0.32, 0.20]} />
            </mesh>
            <mesh position={[0.06, 0, 0]} material={MAT_RUBBER_BOOTS_BLACK}>
              <boxGeometry args={[0.10, 0.32, 0.20]} />
            </mesh>
          </group>

          {/* Cardboard box on floor */}
          <mesh position={[2.40, 0.18, 5.80]} material={MAT_CARDBOARD_STACK}>
            <boxGeometry args={[0.48, 0.34, 0.36]} />
          </mesh>

          {/* ── FAR / EAST WALL ─────────────────────────────────────────── */}

          {/* Window with maroon/red curtain */}
          <group position={[6.95, 2.10, 4.80]}>
            <mesh material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.06, 1.50, 1.60]} />
            </mesh>
            <mesh material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.02, 1.40, 1.50]} />
            </mesh>
            <mesh position={[-0.04, 0, 0]} material={MAT_CURTAIN_FABRIC_MAROON}>
              <boxGeometry args={[0.04, 1.60, 1.70]} />
            </mesh>
          </group>

          {/* Ceiling fluorescent tube */}
          <mesh position={[4.00, 3.15, 4.80]} material={MAT_FLUORESCENT_TUBE}>
            <boxGeometry args={[0.08, 0.04, 1.20]} />
          </mesh>

          {/* ── RIGHT / CENTER-RIGHT (Z < 4.80) ───────────────────────── */}

          {/* Main gray steel accounting desk */}
          <group position={[5.40, 0.74, 4.00]}>
            <mesh receiveShadow material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[1.40, 0.04, 0.75]} />
            </mesh>
            <mesh position={[0, -0.36, -0.34]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[1.34, 0.68, 0.04]} />
            </mesh>
            {[-0.64, 0.64].map((dx, i) => (
              <mesh key={`acc-mainleg-${i}`} position={[dx, -0.36, 0]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.05, 0.72, 0.72]} />
              </mesh>
            ))}
            {/* White hardhat on desk */}
            <mesh position={[-0.30, 0.08, -0.10]} material={MAT_WORKER_HARDHAT_WHITE}>
              <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            {/* Laptop */}
            <mesh position={[0.15, 0.015, 0.05]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.016, 0.24]} />
            </mesh>
            <group position={[0.15, 0.02, -0.06]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matQSExcelScreen}>
                <planeGeometry args={[0.31, 0.17]} />
              </mesh>
            </group>
            {/* Tiered document tray */}
            <mesh position={[0.50, 0.10, -0.15]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.24, 0.18, 0.30]} />
            </mesh>
            {/* Papers */}
            <mesh position={[-0.50, 0.015, 0.10]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.30, 0.02, 0.35]} />
            </mesh>
            {/* Blue waste bin under desk */}
            <mesh position={[0.40, -0.50, 0.10]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.11, 0.08, 0.28, 8]} />
            </mesh>
          </group>

          {/* Gray metal drawer/credenza beside desk */}
          <mesh position={[6.30, 0.45, 3.50]} castShadow material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.50, 0.88, 0.50]} />
          </mesh>

          {/* Empty chair behind main desk */}
          <mesh geometry={geoMonoblocChair} position={[5.40, 0.05, 4.60]} rotation={[0, Math.PI / 6, 0]} material={MAT_MONOBLOC_WHITE} />
        </group>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           5C: ADMIN OFFICE  (Photo 3)
           Room: X [1.20,7.00], Z [-1.20,2.80].  Door: X=1.20, Z=0.80
           LEFT(North)=Z>0.80  RIGHT(South)=Z<0.80
           ═══════════════════════════════════════════════════════════════════ */}
      {roomVis.r5c && (
        <group name="Zone5C_AdminOffice">

          {/* ── LEFT / NORTH SIDE ─────────────────────────────────────────── */}

          {/* White split AC unit on north wall */}
          <mesh position={[3.40, 2.45, 2.75]} material={MAT_AC_UNIT_WHITE}>
            <boxGeometry args={[0.80, 0.28, 0.20]} />
          </mesh>

          {/* Red conduit running along north wall */}
          <mesh position={[4.00, 0.30, 2.75]} rotation={[0, 0, Math.PI / 2]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.012, 0.012, 4.00, 6]} />
          </mesh>

          {/* Corner admin workstation desk (dark) with monitor + laptop */}
          <group position={[3.60, 0.74, 2.20]}>
            <mesh receiveShadow material={MAT_TABLE_DARK_BROWN}>
              <boxGeometry args={[1.30, 0.04, 0.70]} />
            </mesh>
            {[-0.58, 0.58].map((dx, i) =>
              [-0.30, 0.30].map((dz, j) => (
                <mesh key={`adm-dleg-${i}-${j}`} position={[dx, -0.36, dz]} material={MAT_DESK_LEGS}>
                  <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
                </mesh>
              ))
            )}
            {/* Desktop monitor */}
            <group position={[0.30, 0.02, -0.15]}>
              <mesh position={[0, 0.20, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.44, 0.28, 0.02]} />
              </mesh>
              <mesh position={[0, 0.20, 0.012]} material={matPlanningScreen}>
                <planeGeometry args={[0.41, 0.25]} />
              </mesh>
              <mesh position={[0, 0.02, 0]} material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.02, 0.02, 0.06, 8]} />
              </mesh>
            </group>
            {/* Laptop next to monitor */}
            <mesh position={[-0.25, 0.015, 0.05]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.32, 0.016, 0.22]} />
            </mesh>
            {/* Water bottle & coffee */}
            <mesh position={[-0.50, 0.08, 0.10]} material={MAT_MINI_FAN_PINK}>
              <cylinderGeometry args={[0.035, 0.035, 0.16, 8]} />
            </mesh>
            <mesh position={[0.50, 0.06, 0.10]} material={MAT_COFFEE_MUG}>
              <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
            </mesh>
          </group>

          {/* Seated admin staff in dark shirt, talking on phone */}
          <mesh geometry={geoMonoblocChair} position={[3.60, 0.05, 1.60]} rotation={[0, 0, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="CIVIL_ENGINEER"
            skinTone="MEDIUM"
            customShirtMat={MAT_SHIRT_NAVY}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="SEATED"
            position={[3.60, 0.05, 1.60]}
            rotation={[0, 0, 0]}
          />

          {/* Standing staff in green shirt at far window adjusting curtain */}
          <RealisticHumanoidMesh
            role="SAFETY_OFFICER"
            skinTone="MEDIUM"
            customShirtMat={MAT_SHIRT_LONG_GREEN}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="STAND"
            position={[6.30, 0.05, 1.60]}
            rotation={[0, Math.PI / 2, 0]}
          />

          {/* ── FAR / EAST WALL ─────────────────────────────────────────── */}

          {/* Window with maroon curtain */}
          <group position={[6.95, 2.10, 0.80]}>
            <mesh material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.06, 1.40, 1.40]} />
            </mesh>
            <mesh material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.02, 1.30, 1.30]} />
            </mesh>
            <mesh position={[-0.04, 0, 0]} material={MAT_CURTAIN_FABRIC_MAROON}>
              <boxGeometry args={[0.04, 1.50, 1.50]} />
            </mesh>
          </group>

          {/* Ceiling fluorescent tube */}
          <mesh position={[4.00, 3.15, 0.80]} material={MAT_FLUORESCENT_TUBE}>
            <boxGeometry args={[0.08, 0.04, 1.20]} />
          </mesh>

          {/* ── CENTER ────────────────────────────────────────────────────── */}

          {/* Wood executive desk behind standing person */}
          <group position={[5.40, 0.74, 0.80]}>
            <mesh receiveShadow material={MAT_CABINET_DARK_WOOD}>
              <boxGeometry args={[1.30, 0.04, 0.70]} />
            </mesh>
            {[-0.58, 0.58].map((dx, i) => (
              <mesh key={`adm-wdleg-${i}`} position={[dx, -0.36, 0]} material={MAT_CABINET_DARK_WOOD}>
                <boxGeometry args={[0.05, 0.72, 0.66]} />
              </mesh>
            ))}
            {/* Paper trimmer / laminator on desk */}
            <mesh position={[0, 0.04, 0]} material={MAT_PORCELAIN_WHITE}>
              <boxGeometry args={[0.40, 0.06, 0.26]} />
            </mesh>
          </group>

          {/* Foreground gray steel desk center of room */}
          <group position={[3.00, 0.74, 0.20]}>
            <mesh receiveShadow material={MAT_DESK_LAMINATE}>
              <boxGeometry args={[1.20, 0.04, 0.65]} />
            </mesh>
            {[-0.54, 0.54].map((dx, i) =>
              [-0.26, 0.26].map((dz, j) => (
                <mesh key={`adm-fgleg-${i}-${j}`} position={[dx, -0.36, dz]} material={MAT_DESK_LEGS}>
                  <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
                </mesh>
              ))
            )}
          </group>

          {/* ── RIGHT / SOUTH SIDE (Z < 0.80) ──────────────────────────── */}

          {/* MASSIVE WHITEBOARD on south wall */}
          <group position={[4.40, 1.90, -1.15]}>
            <mesh>
              <boxGeometry args={[4.40, 1.40, 0.02]} />
              <meshBasicMaterial map={adminWhiteboardTex || undefined} color={adminWhiteboardTex ? "#FFFFFF" : "#FAFAFA"} />
            </mesh>
            <mesh position={[0, -0.71, 0.02]} material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[4.44, 0.02, 0.04]} />
            </mesh>
          </group>

          {/* Red conduit along south wall */}
          <mesh position={[4.00, 0.30, -1.15]} rotation={[0, 0, Math.PI / 2]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.012, 0.012, 4.00, 6]} />
          </mesh>

          {/* Wooden multi-tier utility shelving rack, foreground right */}
          <group position={[2.00, 0.70, -0.60]}>
            <mesh material={MAT_SOFA_WOOD_BASE}>
              <boxGeometry args={[0.65, 1.30, 0.45]} />
            </mesh>
            {[-0.35, 0, 0.35].map((sy, idx) => (
              <mesh key={`adm-shelf-item-${idx}`} position={[0, sy, 0.06]} material={MAT_PAPER_DOCS}>
                <boxGeometry args={[0.50, 0.10, 0.30]} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           5D: ESH / MEDICAL CLINIC  (Photo 4)
           Room: X [1.20,7.00], Z [-5.20,-1.20].  Door: X=1.20, Z=-3.20
           LEFT(North)=Z>-3.20  RIGHT(South)=Z<-3.20
           ═══════════════════════════════════════════════════════════════════ */}
      {roomVis.r5d && (
        <group name="Zone5D_EshClinic">

          {/* ── LEFT / NORTH SIDE (Z > -3.20) ─────────────────────────────── */}

          {/* Foreground-left: Safety Officer desk with open laptop */}
          <group position={[2.00, 0.74, -2.40]}>
            <mesh receiveShadow material={MAT_TABLE_DARK_BROWN}>
              <boxGeometry args={[1.00, 0.04, 0.55]} />
            </mesh>
            {[-0.44, 0.44].map((dx, i) =>
              [-0.22, 0.22].map((dz, j) => (
                <mesh key={`esh-sleg-${i}-${j}`} position={[dx, -0.36, dz]} material={MAT_DESK_LEGS}>
                  <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
                </mesh>
              ))
            )}
            <mesh position={[0, 0.015, -0.05]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.34, 0.016, 0.24]} />
            </mesh>
            <group position={[0, 0.02, -0.18]} rotation={[-0.28, 0, 0]}>
              <mesh position={[0, 0.10, 0]} material={MAT_MONITOR_BEZEL}>
                <boxGeometry args={[0.34, 0.20, 0.012]} />
              </mesh>
              <mesh position={[0, 0.10, 0.007]} material={matCADScreen}>
                <planeGeometry args={[0.31, 0.17]} />
              </mesh>
            </group>
          </group>

          {/* Safety Officer #1 seated (Sta. Clara green vest, back to camera/door) */}
          <mesh geometry={geoMonoblocChair} position={[2.00, 0.05, -1.90]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="SAFETY_OFFICER"
            personnelId="ESH_ALFREDO_ARIZ"
            onSelectPerson={onSelectPerson}
            skinTone="MEDIUM"
            hasHardhat={false}
            hasVest={true}
            pose="SEATED"
            position={[2.00, 0.05, -1.90]}
            rotation={[0, Math.PI, 0]}
          />

          {/* Safety Officer #2 seated beside #1 */}
          <mesh geometry={geoMonoblocChair} position={[1.50, 0.05, -1.90]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="SAFETY_OFFICER"
            skinTone="MEDIUM"
            hasHardhat={false}
            hasVest={true}
            pose="SEATED"
            position={[1.50, 0.05, -1.90]}
            rotation={[0, Math.PI, 0]}
          />

          {/* Row of SOP notices pinned to north wall */}
          {[-0.40, -0.15, 0.10, 0.35].map((nx, idx) => (
            <mesh key={`esh-sop-${idx}`} position={[2.00 + nx, 1.65, -1.25]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.18, 0.26, 0.005]} />
            </mesh>
          ))}

          {/* Green cloth-draped storage tables behind officers along north wall */}
          <group position={[3.60, 0.55, -1.35]}>
            <mesh material={MAT_CLOTH_GREEN_TABLE}>
              <boxGeometry args={[1.60, 0.90, 0.50]} />
            </mesh>
            {/* Stacked white safety hardhats */}
            <mesh position={[-0.40, 0.48, 0.05]} material={MAT_WORKER_HARDHAT_WHITE}>
              <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[-0.20, 0.48, 0.05]} material={MAT_WORKER_HARDHAT_WHITE}>
              <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[-0.30, 0.65, 0.05]} material={MAT_WORKER_HARDHAT_WHITE}>
              <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            {/* Blue duffel bag */}
            <mesh position={[0.30, 0.55, 0.02]} rotation={[0, 0, Math.PI / 2]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.14, 0.14, 0.40, 10]} />
            </mesh>
            {/* Clipboards & documents */}
            <mesh position={[0.55, 0.50, 0.05]} material={MAT_PAPER_DOCS}>
              <boxGeometry args={[0.22, 0.14, 0.30]} />
            </mesh>
          </group>

          {/* RED spine board / stretcher leaning upright on north wall */}
          <group position={[4.60, 0.95, -1.30]} rotation={[0, 0, 0.03]}>
            <mesh castShadow material={MAT_SPINE_BOARD_RED}>
              <boxGeometry args={[0.44, 1.85, 0.05]} />
            </mesh>
            <mesh position={[0, 0.65, 0.03]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.30, 0.12, 0.04]} />
            </mesh>
            {[-0.40, 0, 0.40].map((hy, idx) => (
              <mesh key={`esh-spine-slot-${idx}`} position={[0.18, hy, 0.02]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.04, 0.10, 0.02]} />
              </mesh>
            ))}
          </group>

          {/* Safety evacuation poster above spine board */}
          <mesh position={[4.60, 2.05, -1.25]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.60, 0.42, 0.005]} />
          </mesh>

          {/* ── FAR / EAST WALL ────────────────────────────────────────── */}

          {/* White flush interior door on far-left of east wall */}
          <group position={[6.95, 1.05, -1.80]}>
            <mesh material={MAT_DOOR_WHITE_FLUSH}>
              <boxGeometry args={[0.04, 2.06, 0.85]} />
            </mesh>
            <mesh position={[-0.04, -0.05, 0.30]} material={MAT_DOORKNOB_CHROME}>
              <sphereGeometry args={[0.030, 12, 12]} />
            </mesh>
          </group>

          {/* Window on far-right of east wall with pale curtain */}
          <group position={[6.95, 2.10, -3.80]}>
            <mesh material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[0.06, 1.40, 1.40]} />
            </mesh>
            <mesh material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[0.02, 1.30, 1.30]} />
            </mesh>
            <mesh position={[-0.04, 0, 0]} material={MAT_CURTAIN_ORANGE_FLORAL}>
              <boxGeometry args={[0.04, 1.50, 1.50]} />
            </mesh>
          </group>

          {/* White AC unit on far-right wall */}
          <mesh position={[6.85, 2.55, -4.80]} material={MAT_AC_UNIT_WHITE}>
            <boxGeometry args={[0.20, 0.28, 0.80]} />
          </mesh>

          {/* Ceiling fluorescent tube */}
          <mesh position={[4.00, 3.15, -3.20]} material={MAT_FLUORESCENT_TUBE}>
            <boxGeometry args={[0.08, 0.04, 1.20]} />
          </mesh>

          {/* ── RIGHT / SOUTH SIDE (Z < -3.20) ─────────────────────────── */}

          {/* Long consultation table draped in dark forest green cloth */}
          <group position={[5.60, 0.74, -4.00]}>
            <mesh receiveShadow material={MAT_CLOTH_GREEN_TABLE}>
              <boxGeometry args={[2.40, 0.74, 0.80]} />
            </mesh>
            {/* Medicine boxes, first aid, bottles */}
            <mesh position={[-0.70, 0.42, 0.15]} material={MAT_PORCELAIN_WHITE}>
              <boxGeometry args={[0.30, 0.14, 0.22]} />
            </mesh>
            <mesh position={[-0.30, 0.40, 0.15]} material={MAT_CARDBOARD_STACK}>
              <boxGeometry args={[0.26, 0.10, 0.18]} />
            </mesh>
            <mesh position={[0.20, 0.42, 0.10]} material={MAT_GLASS_BOTTLE_GREEN}>
              <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
            </mesh>
            <mesh position={[0.30, 0.40, 0.10]} material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.025, 0.025, 0.10, 8]} />
            </mesh>
            {/* Laptop on consultation table */}
            <mesh position={[0.50, 0.42, -0.05]} material={MAT_MONITOR_BEZEL}>
              <boxGeometry args={[0.30, 0.016, 0.20]} />
            </mesh>
          </group>

          {/* Seated nurse (long hair) at consultation table */}
          <mesh geometry={geoMonoblocChair} position={[5.20, 0.05, -3.40]} rotation={[0, Math.PI, 0]} material={MAT_MONOBLOC_WHITE} />
          <RealisticHumanoidMesh
            role="NURSE"
            personnelId="NURSE_RUSSELLE_ALCANTARA"
            onSelectPerson={onSelectPerson}
            skinTone="LIGHT"
            hairStyle="WOMAN_PONYTAIL"
            customShirtMat={MAT_SHIRT_NAVY}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="SEATED"
            position={[5.20, 0.05, -3.40]}
            rotation={[0, Math.PI, 0]}
          />

          {/* Standing nurse/medical officer in white shirt */}
          <RealisticHumanoidMesh
            role="NURSE"
            skinTone="LIGHT"
            hairStyle="WOMAN_PONYTAIL"
            customShirtMat={MAT_PORCELAIN_WHITE}
            customPantsMat={MAT_PANTS_CARGO_DARK}
            hasHardhat={false}
            hasVest={false}
            pose="STAND"
            position={[6.20, 0.05, -4.00]}
            rotation={[0, -Math.PI / 2, 0]}
          />

          {/* Beige visitor chair center of room */}
          <mesh geometry={geoMonoblocChair} position={[4.60, 0.05, -3.60]} rotation={[0, -Math.PI / 3, 0]} material={MAT_MONOBLOC_WHITE} />

          {/* Stainless utility table far right */}
          <mesh position={[6.50, 0.50, -4.90]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.70, 0.60, 0.50]} />
          </mesh>
        </group>
      )}

      {/* ─── EAST EXIT DOORWAY PORTAL ─── */}
      <group position={[7.00, 1.5, -9.5]}>
        <mesh material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.08, 3.0, 1.6]} />
        </mesh>
        <mesh position={[0.05, 0, 0]} material={MAT_FLUORESCENT_TUBE}>
          <planeGeometry args={[1.4, 2.8]} />
        </mesh>
      </group>

      {/* ─── ZONE 4A: STAFF KITCHEN / PANTRY ROOM (PHOTO 1) ─── */}
      {roomVis.rKitchen && (
        <group name="Zone4A_StaffKitchen">
          {/* Corridor Entrance White Door (Swung open into room against north wall) */}
          <group position={[-1.35, 1.05, -5.80]} rotation={[0, -1.35, 0]}>
            <mesh material={MAT_DOOR_WHITE_FLUSH}>
              <boxGeometry args={[0.82, 2.06, 0.04]} />
            </mesh>
            <mesh position={[0.32, -0.05, 0.03]} material={MAT_DOORKNOB_CHROME}>
              <sphereGeometry args={[0.032, 12, 12]} />
            </mesh>
          </group>

          {/* Corridor Signboard for Kitchen */}
          <group position={[-1.16, 1.60, -7.20]}>
            <mesh>
              <boxGeometry args={[0.02, 0.28, 0.65]} />
              <meshBasicMaterial map={kitchenPantryTex || undefined} color={kitchenPantryTex ? "#FFFFFF" : "#047857"} />
            </mesh>
          </group>

          {/* L-Shaped Cast Concrete Countertop (Raw Cement Plaster Finish) */}
          {/* 1. Outer Back Wall Sink Counter (X = -6.55m, Z = -8.15m to -6.30m) */}
          <mesh position={[-6.55, 0.81, -7.225]} castShadow receiveShadow material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[0.65, 0.08, 1.85]} />
          </mesh>
          {/* Concrete Base Support Leg under sink counter */}
          <mesh position={[-6.55, 0.38, -6.30]} material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[0.65, 0.76, 0.10]} />
          </mesh>

          {/* Stainless Steel Sink Basin recessed into back counter */}
          <group position={[-6.55, 0.76, -6.90]}>
            <mesh material={MAT_STAINLESS_SINK}>
              <boxGeometry args={[0.48, 0.18, 0.42]} />
            </mesh>
            {/* Chrome Gooseneck Faucet */}
            <mesh position={[-0.18, 0.18, 0]} material={MAT_DOORKNOB_CHROME}>
              <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
            </mesh>
            <mesh position={[-0.12, 0.28, 0]} rotation={[0, 0, Math.PI / 3]} material={MAT_DOORKNOB_CHROME}>
              <cylinderGeometry args={[0.015, 0.015, 0.14, 8]} />
            </mesh>
            {/* Exposed PVC Drain Pipe Underneath (P-Trap) */}
            <mesh position={[0, -0.36, 0]} material={MAT_MONOBLOC_WHITE}>
              <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
            </mesh>
          </group>

          {/* Green Plastic Utility Water Pail beside Sink on counter */}
          <mesh position={[-6.55, 0.98, -6.45]} material={MAT_PAIL_UTILITY_GREEN}>
            <cylinderGeometry args={[0.15, 0.12, 0.26, 10]} />
          </mesh>

          {/* 2. Preparation Counter on Right Wall (along South wall Z = -8.15m, X = -6.20m to -3.80m) */}
          <mesh position={[-5.00, 0.81, -8.15]} castShadow receiveShadow material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[2.40, 0.08, 0.65]} />
          </mesh>
          {/* Concrete Base Support Leg at front edge of preparation counter */}
          <mesh position={[-3.85, 0.38, -8.15]} material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[0.10, 0.76, 0.65]} />
          </mesh>

          {/* Raw Cement Splashback Wall Finish along South Preparation Wall */}
          <mesh position={[-4.90, 0.70, -8.46]} material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[2.80, 1.40, 0.04]} />
          </mesh>

          {/* Orange Conduit & Dual Power Outlet Box on South Splashback Wall */}
          <mesh position={[-4.80, 1.15, -8.46]} material={MAT_CONDUIT_ORANGE}>
            <cylinderGeometry args={[0.015, 0.015, 1.8, 6]} />
          </mesh>
          <mesh position={[-4.40, 1.15, -8.46]} material={MAT_CONDUIT_ORANGE}>
            <boxGeometry args={[0.12, 0.08, 0.04]} />
          </mesh>
          {/* Taped Paper Notice on Wall above counter */}
          <mesh position={[-3.80, 1.45, -8.46]} material={MAT_PAPER_DOCS}>
            <boxGeometry args={[0.18, 0.24, 0.005]} />
          </mesh>

          {/* Countertop Appliances on Preparation Counter */}
          {/* Black Drip Coffee Maker Machine with Glass Carafe */}
          <group position={[-5.40, 0.98, -8.15]}>
            <mesh material={MAT_COFFEE_MAKER_BLACK}>
              <boxGeometry args={[0.22, 0.28, 0.22]} />
            </mesh>
            <mesh position={[0, -0.04, -0.06]} material={MAT_GALLON_ROYAL_BLUE}>
              <cylinderGeometry args={[0.07, 0.07, 0.14, 8]} />
            </mesh>
          </group>

          {/* Stainless Steel Cooking Pot / Rice Cooker with Lid */}
          <group position={[-4.80, 0.95, -8.15]}>
            <mesh material={MAT_STAINLESS_SINK}>
              <cylinderGeometry args={[0.14, 0.13, 0.20, 10]} />
            </mesh>
            <mesh position={[0, 0.11, 0]} material={MAT_COFFEE_MAKER_BLACK}>
              <cylinderGeometry args={[0.03, 0.03, 0.03, 8]} />
            </mesh>
          </group>

          {/* White Electric Water Kettle with Handle */}
          <group position={[-4.20, 0.96, -8.15]}>
            <mesh material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.09, 0.08, 0.22, 10]} />
            </mesh>
            <mesh position={[0.07, 0.04, 0]} material={MAT_COFFEE_MAKER_BLACK}>
              <boxGeometry args={[0.03, 0.14, 0.03]} />
            </mesh>
          </group>

          {/* Aluminum Sliding Window on Far Outer West Wall (Centered at X = -6.98m) */}
          <group position={[-6.98, 2.05, -7.00]} rotation={[0, Math.PI / 2, 0]}>
            <mesh material={MAT_CUBICLE_ALUM_TRIM}>
              <boxGeometry args={[1.40, 1.25, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.01]} material={MAT_GLASS_CLEAR}>
              <boxGeometry args={[1.25, 1.10, 0.02]} />
            </mesh>
          </group>

          {/* Single Bare Hanging White LED Light Bulb in Kitchen Center */}
          <group position={[-4.80, 3.10, -7.00]}>
            <mesh material={MAT_CONDUIT_ORANGE}>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
            </mesh>
            <mesh position={[0, -0.28, 0]} material={MAT_FLUORESCENT_TUBE}>
              <sphereGeometry args={[0.06, 8, 8]} />
            </mesh>
          </group>
        </group>
      )}

      {/* ─── ZONE 4B: COMFORT ROOMS (RESTROOMS / CR FOR MEN & WOMEN) (PHOTO 2) ─── */}
      {roomVis.rRestrooms && (
        <group name="Zone4B_ComfortRooms">
          {/* Anteroom Two-Tone Wall Finishes (Lower Half H = 1.4m Raw Cement Plaster) */}
          <mesh position={[-4.10, 0.70, -8.54]} material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[5.76, 1.40, 0.04]} />
          </mesh>
          <mesh position={[-4.10, 0.70, -10.94]} material={MAT_CEMENT_PLASTER_RAW}>
            <boxGeometry args={[5.76, 1.40, 0.04]} />
          </mesh>

          {/* Dividing Partition Wall between CR 1 (Men) and CR 2 (Women) at X = -3.80m */}
          <group position={[-3.80, 1.60, -9.75]}>
            <mesh material={MAT_CEMENT_PLASTER_RAW}>
              <boxGeometry args={[0.08, 1.40, 2.40]} />
            </mesh>
            <mesh position={[0, 0.90, 0]} material={MAT_CUBICLE_WALL_TALL}>
              <boxGeometry args={[0.08, 1.80, 2.40]} />
            </mesh>
          </group>

          {/* ── STALL 1 (RIGHT / MEN CR) at X = -2.60m, Z = -9.75m (PHOTO 2) ── */}
          {/* Entrance Open Doorway with Notice Signboard on Pier */}
          <group position={[-2.80, 1.60, -8.54]}>
            {/* Blue-and-White "NOTICE RESTROOM BANYO" Signboard */}
            <mesh position={[0.40, 0, 0]}>
              <boxGeometry args={[0.36, 0.44, 0.02]} />
              <meshBasicMaterial map={restroomNoticeTex || undefined} color={restroomNoticeTex ? "#FFFFFF" : "#1E40AF"} />
            </mesh>
          </group>

          {/* White Porcelain Toilet Bowl / Water Closet in Stall 1 */}
          <group position={[-2.60, 0, -10.40]}>
            <mesh position={[0, 0.22, 0]} material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.18, 0.14, 0.42, 10]} />
            </mesh>
            <mesh position={[0, 0.44, 0.05]} material={MAT_MONOBLOC_WHITE}>
              <boxGeometry args={[0.38, 0.04, 0.44]} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} material={MAT_PORCELAIN_WHITE}>
              <boxGeometry args={[0.42, 0.38, 0.20]} />
            </mesh>
            <mesh position={[0.22, 0.75, -0.15]} material={MAT_DOORKNOB_CHROME}>
              <boxGeometry args={[0.06, 0.02, 0.04]} />
            </mesh>
          </group>

          {/* ── STALL 2 (LEFT / WOMEN CR) at X = -5.60m, Z = -9.75m (PHOTO 2) ── */}
          {/* White Flush Door with Ventilation Louver Facing Anteroom */}
          <group position={[-4.50, 1.05, -9.75]}>
            <mesh material={MAT_DOOR_WHITE_FLUSH}>
              <boxGeometry args={[0.82, 2.06, 0.04]} />
            </mesh>
            <mesh position={[0, -0.65, 0.01]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.55, 0.35, 0.03]} />
            </mesh>
            <mesh position={[0.32, -0.05, 0.04]} material={MAT_DOORKNOB_CHROME}>
              <sphereGeometry args={[0.032, 12, 12]} />
            </mesh>
          </group>

          {/* White Porcelain Toilet Bowl / Water Closet in Stall 2 */}
          <group position={[-5.60, 0, -10.40]}>
            <mesh position={[0, 0.22, 0]} material={MAT_PORCELAIN_WHITE}>
              <cylinderGeometry args={[0.18, 0.14, 0.42, 10]} />
            </mesh>
            <mesh position={[0, 0.44, 0.05]} material={MAT_MONOBLOC_WHITE}>
              <boxGeometry args={[0.38, 0.04, 0.44]} />
            </mesh>
            <mesh position={[0, 0.65, -0.22]} material={MAT_PORCELAIN_WHITE}>
              <boxGeometry args={[0.42, 0.38, 0.20]} />
            </mesh>
          </group>

          {/* Authentic Environmental Prop: Vintage Green Glass Soda Bottle on Floor (from Photo 2) */}
          <group position={[-1.50, 0.12, -8.70]}>
            <mesh material={MAT_GLASS_BOTTLE_GREEN}>
              <cylinderGeometry args={[0.03, 0.035, 0.22, 8]} />
            </mesh>
            <mesh position={[0, 0.13, 0]} material={MAT_GLASS_BOTTLE_GREEN}>
              <cylinderGeometry args={[0.015, 0.02, 0.06, 8]} />
            </mesh>
          </group>

          {/* Single Bare Hanging White LED Light Bulb in Anteroom */}
          <group position={[-2.80, 3.10, -9.50]}>
            <mesh material={MAT_CONDUIT_ORANGE}>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
            </mesh>
            <mesh position={[0, -0.28, 0]} material={MAT_FLUORESCENT_TUBE}>
              <sphereGeometry args={[0.06, 8, 8]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Interior Ambient Glow Points */}
      <pointLight position={[-3.5, 3.0, 7.5]} color="#FFFBEB" intensity={0.65} distance={7} />
      <pointLight position={[3.5, 3.0, 7.5]} color="#FFFBEB" intensity={0.65} distance={7} />
      <pointLight position={[-3.5, 3.0, 0.0]} color="#FFFBEB" intensity={0.75} distance={8} />
      <pointLight position={[3.5, 3.0, 0.0]} color="#FFFBEB" intensity={0.75} distance={8} />
      <pointLight position={[-3.5, 3.0, -7.5]} color="#FFFBEB" intensity={0.75} distance={8} />
      <pointLight position={[3.5, 3.0, -7.5]} color="#FFFBEB" intensity={0.75} distance={8} />
    </group>
  );
}

// ─── INSTANCED PROPS RENDERER HELPER ───
function InstancedPropsGroup({
  geometry,
  material,
  count,
  matrices,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  count: number;
  matrices: THREE.Matrix4[];
}) {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  React.useEffect(() => {
    if (!meshRef.current) return;
    matrices.forEach((mat, idx) => {
      meshRef.current!.setMatrixAt(idx, mat);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
}
