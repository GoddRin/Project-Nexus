/**
 * RealisticHumanoidMesh.tsx
 *
 * AAA PHOTOREALISTIC HUMAN WORKFORCE NPC SYSTEM (PROJECT NEXUS)
 *
 * Anatomically accurate organic humanoid models with photorealistic high-visibility
 * safety workwear (PPE), heavy-duty steel-toe boots, ergonomic hardhats with reflective
 * decals, and smooth kinematic bipedal locomotion & inspection animations.
 *
 * Features:
 *  - 20+ Specialized Hydroelectric Roles: PM, Safety Head, Safety Officer, Nurse, HR, IT, CAD, PED,
 *    Mechanical/Electrical/Civil Engineers, Welders, Riggers, SCADA Operators, QA/QC, Security
 *  - Biomechanical Gait Engine with pelvis sway, torso counter-rotation, arm swing, head bob
 *  - Shared singleton GPU geometry for 60 FPS with 50+ NPCs
 *  - Gait telemetry export for the Locomotion Laboratory
 */

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { registerLivePersonnelPosition, unregisterLivePersonnel } from "./personnelLocations";

const scratchMeshWorldPos = new THREE.Vector3();





// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type HydroWorkforceRole =
  | "PROJECT_MANAGER"
  | "PLANT_MANAGER"
  | "MECHANICAL_ENGINEER"
  | "ELECTRICAL_TECHNICIAN"
  | "CIVIL_ENGINEER"
  | "SAFETY_HEAD"
  | "SAFETY_OFFICER"
  | "SCADA_OPERATOR"
  | "MASTER_WELDER"
  | "QA_QC_INSPECTOR"
  | "SECURITY_GUARD"
  | "NURSE"
  | "RIGGER"
  | "IT_ENGINEER"
  | "CAD_ENGINEER"
  | "HR_OFFICER"
  | "PED_ENGINEER"
  | "SITE_SUPERVISOR"
  | "CRANE_OPERATOR"
  | "CARPENTER"
  | "LABORER"
  | "MANAGER"
  // Locomotion Laboratory extended roles
  | "HR_ADMIN_HEAD"
  | "SITE_NURSE"
  | "TURBINE_MECHANICAL_ENG"
  | "ELECTRICAL_SWITCHYARD_ENG"
  | "CIVIL_SURVEYOR"
  | "AUTOCAD_BIM_OPERATOR"
  | "IT_SCADA_SPECIALIST"
  | "PED_SUPERVISOR"
  | "FOREMAN_CAPATAZ"
  | "RIGGER_CRANE_SPOTTER"
  | "SKILLED_ELECTRICIAN"
  | "SKILLED_CARPENTER"
  | "GENERAL_WORKER_ORANGE"
  | "GENERAL_WORKER_GREEN"
  | "GENERAL_WORKER_BLUE"
  | "CARINDERIA_HEAD_COOK"
  | "CARINDERIA_GRIDDLE_MASTER"
  | "CARINDERIA_RICE_MASTER"
  | "CARINDERIA_PREP_CHEF";

export type NPCRole = HydroWorkforceRole;

export type SkinTone = "FAIR" | "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
export type HairStyle = "SHORT" | "SHORT_POMPADOUR" | "UNDERCUT" | "CREW_CUT" | "WOMAN_PONYTAIL" | "WOMAN_BOB" | "BALD";

export interface RealisticNPCProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  role?: NPCRole;
  skinTone?: SkinTone;
  hairStyle?: HairStyle;
  hairColor?: string;
  isWalking?: boolean;
  walkDistance?: number;
  walkSpeed?: number;
  shiftOffset?: number;
  isInspecting?: boolean;
  isWelding?: boolean;
  accessory?: "TABLET" | "CLIPBOARD" | "MULTIMETER" | "FLASHLIGHT" | "BLUEPRINT" | "RADIO" | "NONE";
  nameTag?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🦵 GAIT TELEMETRY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface GaitPoseTelemetry {
  pelvisY: number;
  pelvisYaw: number;
  pelvisRoll: number;
  pelvisPitch: number;
  torsoYaw: number;
  torsoPitch: number;
  leftThighRotX: number;
  leftKneeRotX: number;
  leftAnkleRotX: number;
  rightThighRotX: number;
  rightKneeRotX: number;
  rightAnkleRotX: number;
  leftShoulderRotX: number;
  leftElbowRotX: number;
  rightShoulderRotX: number;
  rightElbowRotX: number;
  headRotY: number;
  headRotX: number;
  stepPhase: number;
  strideFrequency: number;
  leftFootContact: boolean;
  rightFootContact: boolean;
  leftKneeAngle: number;
  rightKneeAngle: number;
  speedMs: number;
  cadenceStepsMin: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🦴 SHARED SINGLETON GEOMETRIES (GPU Memory Optimization)
// ═══════════════════════════════════════════════════════════════════════════

const _torsoGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.52, 16);
const _pelvisGeo = new THREE.CylinderGeometry(0.20, 0.19, 0.18, 16);
const _headGeo = new THREE.SphereGeometry(0.12, 16, 14);
_headGeo.scale(1.0, 1.15, 1.05); // Oval anatomical cranial shape
const _neckGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.10, 12);
const _upperArmGeo = new THREE.CylinderGeometry(0.06, 0.052, 0.28, 12);
const _forearmGeo = new THREE.CylinderGeometry(0.052, 0.044, 0.26, 12);
const _handGeo = new THREE.BoxGeometry(0.045, 0.085, 0.07);
const _thighGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.38, 14);
const _calfGeo = new THREE.CylinderGeometry(0.07, 0.058, 0.36, 14);
const _bootGeo = new THREE.BoxGeometry(0.11, 0.10, 0.24);
const _hardhatDomeGeo = new THREE.SphereGeometry(0.145, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
const _hardhatBrimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.015, 18);
const _hardhatRibGeo = new THREE.BoxGeometry(0.03, 0.035, 0.22);

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 REUSABLE PBR MATERIALS
// ═══════════════════════════════════════════════════════════════════════════

const SKIN_PALETTES: Record<SkinTone, string> = {
  FAIR: "#FBD3B6",
  LIGHT: "#E8B796",
  MEDIUM: "#C68E65",
  BRONZE: "#A0714D",
  DEEP: "#6D4C36",
};

const MAT_VEST_NEON_YELLOW = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.5 });
const MAT_VEST_NEON_ORANGE = new THREE.MeshStandardMaterial({ color: "#F97316", roughness: 0.5 });
const MAT_VEST_NEON_GREEN = new THREE.MeshStandardMaterial({ color: "#22C55E", roughness: 0.5 });
const MAT_VEST_KHAKI = new THREE.MeshStandardMaterial({ color: "#A8A29E", roughness: 0.7 });
const MAT_STRIPE_REFLECTIVE = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.15, metalness: 0.7 });

const MAT_SHIRT_NAVY = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.7 });
const MAT_SHIRT_BLUE_SCIC = new THREE.MeshStandardMaterial({ color: "#0284C7", roughness: 0.7 });
const MAT_SHIRT_TEAL_SCRUBS = new THREE.MeshStandardMaterial({ color: "#0D9488", roughness: 0.6 });
const MAT_SHIRT_WHITE_BARONG = new THREE.MeshStandardMaterial({ color: "#F1F5F9", roughness: 0.5 });
const MAT_SHIRT_ORANGE = new THREE.MeshStandardMaterial({ color: "#EA580C", roughness: 0.7 });
const MAT_SHIRT_GREEN = new THREE.MeshStandardMaterial({ color: "#15803D", roughness: 0.7 });
const MAT_SHIRT_GRAY = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.7 });
const MAT_SHIRT_MAROON = new THREE.MeshStandardMaterial({ color: "#7F1D1D", roughness: 0.7 });
const MAT_SHIRT_PURPLE = new THREE.MeshStandardMaterial({ color: "#6B21A8", roughness: 0.7 });

const MAT_PANTS_JEANS = new THREE.MeshStandardMaterial({ color: "#1E3A8A", roughness: 0.75 });
const MAT_PANTS_CARGO_DARK = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8 });
const MAT_PANTS_KHAKI = new THREE.MeshStandardMaterial({ color: "#78716C", roughness: 0.75 });
const MAT_PANTS_TEAL = new THREE.MeshStandardMaterial({ color: "#0F766E", roughness: 0.6 });

const MAT_LEATHER_BROWN = new THREE.MeshStandardMaterial({ color: "#78350F", roughness: 0.5 });
const MAT_LEATHER_BOOTS = new THREE.MeshStandardMaterial({ color: "#44403C", roughness: 0.4 });
const MAT_BOOT_SOLES = new THREE.MeshStandardMaterial({ color: "#1C1917", roughness: 0.9 });
const MAT_STEEL_DARK = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.4, metalness: 0.7 });
const MAT_STEEL_CHROME = new THREE.MeshStandardMaterial({ color: "#CBD5E1", roughness: 0.2, metalness: 0.85 });

const MAT_HARDHAT_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.4 });
const MAT_HARDHAT_YELLOW = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.4 });
const MAT_HARDHAT_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.4 });
const MAT_HARDHAT_BLUE = new THREE.MeshStandardMaterial({ color: "#2563EB", roughness: 0.4 });
const MAT_HARDHAT_GREEN = new THREE.MeshStandardMaterial({ color: "#16A34A", roughness: 0.4 });
const MAT_HARDHAT_ORANGE = new THREE.MeshStandardMaterial({ color: "#EA580C", roughness: 0.4 });

// ═══════════════════════════════════════════════════════════════════════════
// 🦵 REALISTIC BIOMECHANICAL GAIT MATHEMATICAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export function computeRealisticWalkingGait(
  time: number,
  speed: number = 1.0,
  isWalking: boolean = true,
): GaitPoseTelemetry {
  // Natural stride frequency (steps/sec): ~1.8 at normal walk, scales with speed
  const strideFreq = 1.8 * speed;
  const omega = strideFreq * Math.PI * 2;
  const phase = time * omega;

  // Smoothly decay to idle pose when not walking
  const activeBlend = isWalking ? 1.0 : 0.0;

  // ─── Pelvis ───
  const pelvisY = 0.005 * Math.sin(phase * 2) * activeBlend;
  const pelvisYaw = 0.04 * Math.sin(phase) * activeBlend;
  const pelvisRoll = 0.025 * Math.sin(phase) * activeBlend;
  const pelvisPitch = 0.012 * Math.sin(phase * 2 + 0.5) * activeBlend;

  // ─── Torso (counter-rotation to pelvis for natural sway) ───
  const torsoYaw = -0.05 * Math.sin(phase) * activeBlend;
  const torsoPitch = 0.02 * Math.sin(phase * 2 + Math.PI) * activeBlend;

  // ─── Legs (sinusoidal gait with natural knee flexion) ───
  const leftHip = Math.sin(phase) * 0.65 * activeBlend;
  const rightHip = Math.sin(phase + Math.PI) * 0.65 * activeBlend;
  const leftKnee = Math.max(0, -Math.sin(phase - 0.4)) * 0.85 * activeBlend;
  const rightKnee = Math.max(0, -Math.sin(phase + Math.PI - 0.4)) * 0.85 * activeBlend;
  const leftAnkle = Math.sin(phase + 0.3) * 0.2 * activeBlend;
  const rightAnkle = Math.sin(phase + Math.PI + 0.3) * 0.2 * activeBlend;

  // ─── Arms (opposite to legs, natural pendulum with forward elbow flexion) ───
  const leftShoulder = -Math.sin(phase) * 0.45 * activeBlend;
  const leftElbow = -Math.abs(Math.sin(phase - 0.6)) * 0.35 * activeBlend;
  const rightShoulder = -Math.sin(phase + Math.PI) * 0.45 * activeBlend;
  const rightElbow = -Math.abs(Math.sin(phase + Math.PI - 0.6)) * 0.35 * activeBlend;

  // ─── Head (subtle stabilization counter-yaw) ───
  const headRotY = -0.03 * Math.sin(phase) * activeBlend;
  const headRotX = 0.008 * Math.sin(phase * 2) * activeBlend;

  // ─── Contact Detection ───
  const leftFootContact = Math.sin(phase) > 0.3;
  const rightFootContact = Math.sin(phase + Math.PI) > 0.3;

  return {
    pelvisY,
    pelvisYaw,
    pelvisRoll,
    pelvisPitch,
    torsoYaw,
    torsoPitch,
    leftThighRotX: leftHip,
    leftKneeRotX: leftKnee,
    leftAnkleRotX: leftAnkle,
    rightThighRotX: rightHip,
    rightKneeRotX: rightKnee,
    rightAnkleRotX: rightAnkle,
    leftShoulderRotX: leftShoulder,
    leftElbowRotX: leftElbow,
    rightShoulderRotX: rightShoulder,
    rightElbowRotX: rightElbow,
    headRotY,
    headRotX,
    stepPhase: phase % (Math.PI * 2),
    strideFrequency: strideFreq,
    leftFootContact,
    rightFootContact,
    leftKneeAngle: Math.PI - leftKnee,
    rightKneeAngle: Math.PI - rightKnee,
    speedMs: speed * 1.2,
    cadenceStepsMin: strideFreq * 60,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎽 ROLE → OUTFIT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface OutfitConfig {
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  vestMat: THREE.MeshStandardMaterial;
  hardhatMat: THREE.MeshStandardMaterial;
  accessory: string;
  skinTone?: SkinTone;
}

function getOutfitForRole(role: HydroWorkforceRole): OutfitConfig {
  switch (role) {
    case "PROJECT_MANAGER":
    case "MANAGER":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "TABLET" };
    case "PLANT_MANAGER":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "SAFETY_HEAD":
      return { shirtMat: MAT_SHIRT_GREEN, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_GREEN, hardhatMat: MAT_HARDHAT_GREEN, accessory: "RADIO" };
    case "SAFETY_OFFICER":
      return { shirtMat: MAT_SHIRT_ORANGE, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_ORANGE, accessory: "RADIO" };
    case "MECHANICAL_ENGINEER":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_BLUE, accessory: "BLUEPRINT" };
    case "ELECTRICAL_TECHNICIAN":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_RED, accessory: "MULTIMETER" };
    case "CIVIL_ENGINEER":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BLUEPRINT" };
    case "SCADA_OPERATOR":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_KHAKI, hardhatMat: MAT_HARDHAT_WHITE, accessory: "TABLET" };
    case "MASTER_WELDER":
      return { shirtMat: MAT_SHIRT_GRAY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    case "QA_QC_INSPECTOR":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "SECURITY_GUARD":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_KHAKI, hardhatMat: MAT_HARDHAT_BLUE, accessory: "RADIO" };
    case "NURSE":
      return { shirtMat: MAT_SHIRT_TEAL_SCRUBS, pantsMat: MAT_PANTS_TEAL, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "RIGGER":
      return { shirtMat: MAT_SHIRT_ORANGE, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    case "IT_ENGINEER":
      return { shirtMat: MAT_SHIRT_PURPLE, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "TABLET" };
    case "CAD_ENGINEER":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_BLUE, accessory: "BLUEPRINT" };
    case "HR_OFFICER":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "PED_ENGINEER":
      return { shirtMat: MAT_SHIRT_MAROON, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_RED, accessory: "BLUEPRINT" };
    case "SITE_SUPERVISOR":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "RADIO" };
    case "CRANE_OPERATOR":
      return { shirtMat: MAT_SHIRT_ORANGE, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_ORANGE, accessory: "RADIO" };
    case "CARPENTER":
      return { shirtMat: MAT_SHIRT_GRAY, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    // Locomotion Lab extended roles
    case "HR_ADMIN_HEAD":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "SITE_NURSE":
      return { shirtMat: MAT_SHIRT_TEAL_SCRUBS, pantsMat: MAT_PANTS_TEAL, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "CLIPBOARD" };
    case "TURBINE_MECHANICAL_ENG":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_BLUE, accessory: "BLUEPRINT" };
    case "ELECTRICAL_SWITCHYARD_ENG":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_RED, accessory: "MULTIMETER" };
    case "CIVIL_SURVEYOR":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_KHAKI, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BLUEPRINT" };
    case "AUTOCAD_BIM_OPERATOR":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_BLUE, accessory: "TABLET" };
    case "IT_SCADA_SPECIALIST":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_KHAKI, hardhatMat: MAT_HARDHAT_WHITE, accessory: "TABLET" };
    case "PED_SUPERVISOR":
      return { shirtMat: MAT_SHIRT_MAROON, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_RED, accessory: "RADIO" };
    case "FOREMAN_CAPATAZ":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "RADIO" };
    case "RIGGER_CRANE_SPOTTER":
      return { shirtMat: MAT_SHIRT_ORANGE, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_ORANGE, accessory: "RADIO" };
    case "SKILLED_ELECTRICIAN":
      return { shirtMat: MAT_SHIRT_NAVY, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_RED, accessory: "MULTIMETER" };
    case "SKILLED_CARPENTER":
      return { shirtMat: MAT_SHIRT_GRAY, pantsMat: MAT_PANTS_JEANS, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    case "GENERAL_WORKER_ORANGE":
      return { shirtMat: MAT_SHIRT_ORANGE, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    case "GENERAL_WORKER_GREEN":
      return { shirtMat: MAT_SHIRT_GREEN, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_GREEN, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
    case "GENERAL_WORKER_BLUE":
      return { shirtMat: MAT_SHIRT_BLUE_SCIC, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_BLUE, accessory: "BASIC_PPE" };
    case "CARINDERIA_HEAD_COOK":
    case "CARINDERIA_GRIDDLE_MASTER":
    case "CARINDERIA_RICE_MASTER":
    case "CARINDERIA_PREP_CHEF":
      return { shirtMat: MAT_SHIRT_WHITE_BARONG, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_YELLOW, hardhatMat: MAT_HARDHAT_WHITE, accessory: "BASIC_PPE" };
    case "LABORER":
    default:
      return { shirtMat: MAT_SHIRT_GREEN, pantsMat: MAT_PANTS_CARGO_DARK, vestMat: MAT_VEST_NEON_ORANGE, hardhatMat: MAT_HARDHAT_YELLOW, accessory: "BASIC_PPE" };
  }
}

const MAT_HAIR_BLACK = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.85 });

// ═══════════════════════════════════════════════════════════════════════════
// 🧍 MAIN REALISTIC HUMANOID MESH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function RealisticHumanoidMesh({
  role = "CIVIL_ENGINEER" as HydroWorkforceRole,
  isWalking = false,
  walkSpeed = 1.0,
  onGaitTelemetry,
  skinTone = "MEDIUM" as SkinTone,
  hairStyle = "SHORT" as HairStyle,
  hairColor = "#0F172A",
  facialHair = "NONE",
  hasHardhat = true,
  hasVest = true,
  hasGlasses = false,
  glassesFrameColor = "#0F172A",
  pose = "WALK",
  customShirtMat,
  customPantsMat,
  position,
  rotation,
  shiftOffset,
  personnelId,
  onSelectPerson,
}: {
  role?: HydroWorkforceRole;
  isWalking?: boolean;
  walkSpeed?: number;
  onGaitTelemetry?: (t: GaitPoseTelemetry) => void;
  skinTone?: SkinTone;
  hairStyle?: HairStyle;
  hairColor?: string;
  facialHair?: "NONE" | "MUSTACHE" | "GOATEE" | "STUBBLE";
  hasHardhat?: boolean;
  hasVest?: boolean;
  hasGlasses?: boolean;
  glassesFrameColor?: string;
  pose?: "WALK" | "STAND" | "SEATED" | "STAND_DESK_REVIEW";
  customShirtMat?: THREE.MeshStandardMaterial;
  customPantsMat?: THREE.MeshStandardMaterial;
  position?: [number, number, number];
  rotation?: [number, number, number];
  shiftOffset?: number;
  personnelId?: string;
  onSelectPerson?: (id: string) => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const lThighRef = useRef<THREE.Group>(null);
  const lKneeRef = useRef<THREE.Group>(null);
  const lAnkleRef = useRef<THREE.Group>(null);
  const rThighRef = useRef<THREE.Group>(null);
  const rKneeRef = useRef<THREE.Group>(null);
  const rAnkleRef = useRef<THREE.Group>(null);
  const lShoulderRef = useRef<THREE.Group>(null);
  const lElbowRef = useRef<THREE.Group>(null);
  const rShoulderRef = useRef<THREE.Group>(null);
  const rElbowRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (personnelId && rootRef.current) {
      rootRef.current.updateWorldMatrix(true, false);
      rootRef.current.getWorldPosition(scratchMeshWorldPos);
      registerLivePersonnelPosition(personnelId, scratchMeshWorldPos, rootRef.current);
    }
    return () => {
      if (personnelId) {
        unregisterLivePersonnel(personnelId);
      }
    };
  }, [personnelId]);

  const timeOffset = useMemo(() => (shiftOffset ?? Math.random() * 10), [shiftOffset]);
  const config = useMemo(() => getOutfitForRole(role), [role]);

  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SKIN_PALETTES[skinTone], roughness: 0.6 }),
    [skinTone],
  );

  const shirtMaterial = customShirtMat || config.shirtMat;
  const pantsMaterial = customPantsMat || config.pantsMat;

  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 }), [hairColor]);
  const lipMat = useMemo(() => {
    const baseColor = new THREE.Color(SKIN_PALETTES[skinTone]);
    baseColor.lerp(new THREE.Color("#BE185D"), 0.22); // subtle natural pink/rose tint
    return new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.5 });
  }, [skinTone]);
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.2 }), []);
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3B2219", roughness: 0.2 }), []);
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#090D16", roughness: 0.1 }), []);
  const eyeHighlightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#FFFFFF" }), []);
  const glassesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: glassesFrameColor, roughness: 0.3, metalness: 0.8 }), [glassesFrameColor]);
  const lensGlassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#E0F2FE", transparent: true, opacity: 0.45, roughness: 0.1 }), []);

  // Execute Biomechanical Physics Frame Update
  useFrame(({ clock }) => {
    // 0. Live world position registration for personnel locator & camera tracking
    // Guaranteed to execute on EVERY frame before any pose-specific early returns!
    if (personnelId && rootRef.current) {
      rootRef.current.getWorldPosition(scratchMeshWorldPos);
      registerLivePersonnelPosition(personnelId, scratchMeshWorldPos, rootRef.current);
    }

    const time = clock.getElapsedTime() + timeOffset;

    if (pose === "SEATED") {
      const breath = Math.sin(time * 1.8) * 0.015;
      
      // Biomechanical typing & mouse micro-animations (alternating finger strikes)
      const leftCycle = time * 8.5;
      const rightCycle = time * 7.8;
      const typeLeft = Math.sin(leftCycle) * 0.030 + Math.sin(leftCycle * 1.7) * 0.015;
      const typeRight = Math.cos(rightCycle) * 0.025 + Math.cos(rightCycle * 1.9) * 0.012;
      const leftWristPitch = Math.cos(leftCycle * 1.2) * 0.03;
      const rightWristPitch = Math.sin(rightCycle * 1.2) * 0.03;

      // Pelvis at chair seat height (upright ergonomic seating)
      if (pelvisRef.current) {
        pelvisRef.current.position.set(0, 0.49, 0);
        pelvisRef.current.rotation.set(0, 0, 0);
      }

      // Torso ergonomic upright posture with subtle respiratory chest expansion
      if (torsoRef.current) {
        torsoRef.current.rotation.set(0.04 + breath * 0.3, Math.sin(time * 0.5) * 0.010, 0);
      }

      // Seated 90-degree anatomical bend for thighs and knees
      if (lThighRef.current) lThighRef.current.rotation.set(-Math.PI / 2.02, 0, -0.04);
      if (rThighRef.current) rThighRef.current.rotation.set(-Math.PI / 2.02, 0, 0.04);
      if (lKneeRef.current) lKneeRef.current.rotation.set(Math.PI / 2.02, 0, 0);
      if (rKneeRef.current) rKneeRef.current.rotation.set(Math.PI / 2.02, 0, 0);
      if (lAnkleRef.current) lAnkleRef.current.rotation.set(0, 0, 0);
      if (rAnkleRef.current) rAnkleRef.current.rotation.set(0, 0, 0);

      // Superb Realistic Upper Arm / Shoulder:
      // Upper arm angles forward & adducted inward toward keyboard typing center
      if (lShoulderRef.current) {
        lShoulderRef.current.rotation.set(-0.30 + breath * 0.10, 0.18, 0.28 + typeLeft * 0.08);
      }
      if (rShoulderRef.current) {
        rShoulderRef.current.rotation.set(-0.30 + breath * 0.10, -0.18, -0.28 + typeRight * 0.08);
      }

      // Elbow joint: Lifted clear above table & laptop deck, forearms extend forward/inward with fingers poised on top of keys
      if (lElbowRef.current) {
        lElbowRef.current.rotation.set(-1.22 + typeLeft * 0.5, 0.24, -0.20 + leftWristPitch);
      }
      if (rElbowRef.current) {
        rElbowRef.current.rotation.set(-1.22 + typeRight * 0.5, -0.24, 0.20 + rightWristPitch);
      }

      // Head: Natural downward gaze towards laptop/monitor screen with subtle cognitive micro-sways
      if (headRef.current) {
        headRef.current.rotation.set(0.18 + breath * 0.3, Math.sin(time * 0.6) * 0.035, 0);
      }
      return;
    }

        if (pose === "STAND_DESK_REVIEW") {
      // 🔄 Multi-Phase Standing Desk Routine Kinematics (Checking email, reading drawings, surveying engineering team)
      const cycle = (time * 0.45) % 18; // 18-second realistic cognitive loop
      const breath = Math.sin(time * 1.8) * 0.015;
      const weightShift = Math.sin(time * 0.25) * 0.025; // Subtle pelvis weight shift between left and right foot

      // Pelvis & Lower Body
      if (pelvisRef.current) pelvisRef.current.position.set(weightShift * 0.3, 0.96 + breath * 0.2, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.04 + breath * 0.3, weightShift * 0.15, 0);
      if (lThighRef.current) lThighRef.current.rotation.set(0, 0, weightShift * 0.2);
      if (rThighRef.current) rThighRef.current.rotation.set(0, 0, weightShift * 0.2);
      if (lKneeRef.current) lKneeRef.current.rotation.set(0, 0, 0);
      if (rKneeRef.current) rKneeRef.current.rotation.set(0, 0, 0);

      if (cycle < 6.0) {
        // ── Phase 1: Checking & Reading Outlook Email on Docked Laptop (0s - 6s) ──
        const typeMotion = Math.sin(time * 7.0) * 0.03;
        // Head tilted down and towards laptop (right side)
        if (headRef.current) {
          headRef.current.rotation.set(0.28 + breath * 0.2, -0.22 + Math.sin(time * 0.8) * 0.03, 0);
        }
        // Right hand operating optical mouse & typing on laptop
        if (rShoulderRef.current) rShoulderRef.current.rotation.set(-0.48, -0.15, -0.22);
        if (rElbowRef.current) rElbowRef.current.rotation.set(-0.85 + typeMotion, 0.30, 0.10);
        // Left hand resting on desk edge
        if (lShoulderRef.current) lShoulderRef.current.rotation.set(-0.38, 0.10, 0.18);
        if (lElbowRef.current) lElbowRef.current.rotation.set(-0.75, -0.20, -0.10);

      } else if (cycle < 11.0) {
        // ── Phase 2: Analyzing AutoCAD Blueprint on 27" Widescreen Monitor (6s - 11s) ──
        // Head focused on central monitor
        if (headRef.current) {
          headRef.current.rotation.set(0.14 + breath * 0.2, 0.12 + Math.sin(time * 0.6) * 0.04, 0);
        }
        // Right hand holding mouse / pointing at blueprint
        if (rShoulderRef.current) rShoulderRef.current.rotation.set(-0.42, -0.08, -0.20);
        if (rElbowRef.current) rElbowRef.current.rotation.set(-0.80, 0.25, 0.08);
        // Left hand resting on hip in thoughtful supervisory stance
        if (lShoulderRef.current) lShoulderRef.current.rotation.set(0.12, 0.35, 0.32);
        if (lElbowRef.current) lElbowRef.current.rotation.set(-0.95, -0.45, 0.25);

      } else {
        // ── Phase 3: Active Spatial Oversight — Looking up and Monitoring Engineering Team (11s - 18s) ──
        const panRoom = Math.sin((cycle - 11.0) * 0.85) * 0.38; // Scanning May Ann, Cristine, Elbert, Amor
        // Head held high, scanning across the room
        if (headRef.current) {
          headRef.current.rotation.set(-0.06 + breath * 0.2, panRoom, 0);
        }
        // Supervisory stance: arms resting comfortably on desk corners or standing tall
        if (lShoulderRef.current) lShoulderRef.current.rotation.set(-0.35, 0.12, 0.15);
        if (lElbowRef.current) lElbowRef.current.rotation.set(-0.65, -0.15, -0.05);
        if (rShoulderRef.current) rShoulderRef.current.rotation.set(-0.35, -0.12, -0.15);
        if (rElbowRef.current) rElbowRef.current.rotation.set(-0.65, 0.15, 0.05);
      }
      return;
    }

    if (pose === "STAND" || !isWalking) {
      // Gentle breathing idle kinematics
      const breath = Math.sin(time * 1.5) * 0.02;
      const armDrift = Math.sin(time * 0.8) * 0.03;

      if (pelvisRef.current) pelvisRef.current.position.set(0, 0.96 + breath * 0.3, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(breath * 0.5, 0, 0);
      if (lThighRef.current) lThighRef.current.rotation.set(0, 0, 0);
      if (rThighRef.current) rThighRef.current.rotation.set(0, 0, 0);
      if (lKneeRef.current) lKneeRef.current.rotation.set(0, 0, 0);
      if (rKneeRef.current) rKneeRef.current.rotation.set(0, 0, 0);
      if (lAnkleRef.current) lAnkleRef.current.rotation.set(0, 0, 0);
      if (rAnkleRef.current) rAnkleRef.current.rotation.set(0, 0, 0);
      if (lShoulderRef.current) lShoulderRef.current.rotation.set(armDrift, 0, 0.12);
      if (rShoulderRef.current) rShoulderRef.current.rotation.set(-armDrift, 0, -0.12);
      if (lElbowRef.current) lElbowRef.current.rotation.set(-0.15, 0, 0);
      if (rElbowRef.current) rElbowRef.current.rotation.set(-0.15, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0, 0, 0);
      return;
    }

    // Dynamic Locomotion Gait Calculation
    const g = computeRealisticWalkingGait(time, walkSpeed, isWalking);

    if (onGaitTelemetry) {
      onGaitTelemetry(g);
    }

    // Apply Pelvis Kinematics (Center of Mass Translation + 3-Axis Orientation)
    if (pelvisRef.current) {
      pelvisRef.current.position.y = 0.96 + g.pelvisY;
      pelvisRef.current.rotation.set(g.pelvisPitch, g.pelvisYaw, g.pelvisRoll);
    }

    // Apply Torso Counter-Rotation
    if (torsoRef.current) {
      torsoRef.current.rotation.set(g.torsoPitch, g.torsoYaw, 0);
    }

    // Apply Left Leg Hierarchy
    if (lThighRef.current) lThighRef.current.rotation.x = g.leftThighRotX;
    if (lKneeRef.current) lKneeRef.current.rotation.x = g.leftKneeRotX;
    if (lAnkleRef.current) lAnkleRef.current.rotation.x = g.leftAnkleRotX;

    // Apply Right Leg Hierarchy
    if (rThighRef.current) rThighRef.current.rotation.x = g.rightThighRotX;
    if (rKneeRef.current) rKneeRef.current.rotation.x = g.rightKneeRotX;
    if (rAnkleRef.current) rAnkleRef.current.rotation.x = g.rightAnkleRotX;

    // Apply Arm Kinematics
    if (lShoulderRef.current) lShoulderRef.current.rotation.x = g.leftShoulderRotX;
    if (lElbowRef.current) lElbowRef.current.rotation.x = g.leftElbowRotX;

    if (rShoulderRef.current) rShoulderRef.current.rotation.x = g.rightShoulderRotX;
    if (rElbowRef.current) rElbowRef.current.rotation.x = g.rightElbowRotX;

    // Apply Head Stabilization
    if (headRef.current) {
      headRef.current.rotation.y = g.headRotY;
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}
      onClick={personnelId && onSelectPerson ? (e) => { e.stopPropagation(); onSelectPerson(personnelId); } : undefined}
      onPointerOver={personnelId && onSelectPerson ? (e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={personnelId && onSelectPerson ? () => { document.body.style.cursor = "auto"; } : undefined}
    >
      {/* 🎯 INVISIBLE RAYCAST COLLIDER FOR EFFORTLESS SELECTION CLICKS */}
      {personnelId && onSelectPerson && (
        <mesh position={[0, pose === "SEATED" ? 0.65 : 0.95, 0]} visible={false}>
          <cylinderGeometry args={[0.45, 0.45, pose === "SEATED" ? 1.3 : 1.9, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* ─── PELVIS (Root Transform) ─── */}
      <group ref={pelvisRef} position={[0, 0.96, 0]}>

        <mesh geometry={_pelvisGeo} material={pantsMaterial} />

        {/* Belt */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.205, 0.205, 0.04, 16]} />
          <primitive object={MAT_LEATHER_BROWN} attach="material" />
        </mesh>

        {/* ─── TORSO (Spine Pivot) ─── */}
        <group ref={torsoRef} position={[0, 0.35, 0]}>
          <mesh geometry={_torsoGeo} material={shirtMaterial} />

          {/* High-Visibility Safety Vest */}
          {hasVest ? (
            <>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.255, 0.22, 0.46, 16]} />
                <primitive object={config.vestMat} attach="material" />
              </mesh>

              {/* Reflective Stripes (X-pattern) */}
              <mesh position={[0, 0.05, 0.22]} rotation={[0, 0, Math.PI / 6]}>
                <boxGeometry args={[0.02, 0.42, 0.005]} />
                <primitive object={MAT_STRIPE_REFLECTIVE} attach="material" />
              </mesh>
              <mesh position={[0, 0.05, 0.22]} rotation={[0, 0, -Math.PI / 6]}>
                <boxGeometry args={[0.02, 0.42, 0.005]} />
                <primitive object={MAT_STRIPE_REFLECTIVE} attach="material" />
              </mesh>
            </>
          ) : (
            /* Office Attire details: Polo Collar + Company Lanyard & ID Badge */
            <>
              <mesh position={[0, 0.25, 0]}>
                <torusGeometry args={[0.08, 0.015, 8, 16]} />
                <primitive object={shirtMaterial} attach="material" />
              </mesh>
              {/* Lanyard Strap */}
              <mesh position={[0, 0.12, 0.21]}>
                <boxGeometry args={[0.02, 0.24, 0.004]} />
                <meshStandardMaterial color="#0F766E" roughness={0.6} />
              </mesh>
              {/* ID Badge Card */}
              <mesh position={[0, -0.02, 0.215]}>
                <boxGeometry args={[0.055, 0.075, 0.004]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
              </mesh>
            </>
          )}

          {/* ─── NECK & SUPERB REALISTIC 3D ANATOMICAL HEAD ─── */}
          <group ref={headRef} position={[0, 0.32, 0]}>
            {/* Anatomical Neck */}
            <mesh geometry={_neckGeo} material={skinMat} position={[0, -0.05, 0]} />

            {/* Cranial Head Base Skull */}
            <mesh geometry={_headGeo} material={skinMat} position={[0, 0.08, 0]} />

            {/* 👁️ 1. REALISTIC 3D EYES (Sclera + Deep Iris + Pupil + Catchlight + Eyelids) */}
            {/* Left Eye */}
            <group position={[-0.042, 0.088, 0.106]}>
              {/* Upper Eyelid Fold */}
              <mesh position={[0, 0.014, 0.005]} material={skinMat}>
                <boxGeometry args={[0.032, 0.005, 0.010]} />
              </mesh>
              {/* White Sclera Eyeball */}
              <mesh material={eyeWhiteMat}>
                <sphereGeometry args={[0.015, 14, 14]} />
              </mesh>
              {/* Deep Brown Iris */}
              <mesh position={[0, 0, 0.011]} material={irisMat}>
                <circleGeometry args={[0.0085, 14]} />
              </mesh>
              {/* Black Pupil */}
              <mesh position={[0, 0, 0.0118]} material={pupilMat}>
                <circleGeometry args={[0.0042, 14]} />
              </mesh>
              {/* Specular Highlight Dot */}
              <mesh position={[-0.0025, 0.0025, 0.0125]} material={eyeHighlightMat}>
                <circleGeometry args={[0.0014, 8]} />
              </mesh>
            </group>

            {/* Right Eye */}
            <group position={[0.042, 0.088, 0.106]}>
              {/* Upper Eyelid Fold */}
              <mesh position={[0, 0.014, 0.005]} material={skinMat}>
                <boxGeometry args={[0.032, 0.005, 0.010]} />
              </mesh>
              {/* White Sclera Eyeball */}
              <mesh material={eyeWhiteMat}>
                <sphereGeometry args={[0.015, 14, 14]} />
              </mesh>
              {/* Deep Brown Iris */}
              <mesh position={[0, 0, 0.011]} material={irisMat}>
                <circleGeometry args={[0.0085, 14]} />
              </mesh>
              {/* Black Pupil */}
              <mesh position={[0, 0, 0.0118]} material={pupilMat}>
                <circleGeometry args={[0.0042, 14]} />
              </mesh>
              {/* Specular Highlight Dot */}
              <mesh position={[-0.0025, 0.0025, 0.0125]} material={eyeHighlightMat}>
                <circleGeometry args={[0.0014, 8]} />
              </mesh>
            </group>

            {/* 🤨 2. SCULPTED EYEBROWS */}
            <mesh position={[-0.044, 0.116, 0.114]} rotation={[0, 0, 0.06]} material={hairMat}>
              <boxGeometry args={[0.036, 0.005, 0.006]} />
            </mesh>
            <mesh position={[0.044, 0.116, 0.114]} rotation={[0, 0, -0.06]} material={hairMat}>
              <boxGeometry args={[0.036, 0.005, 0.006]} />
            </mesh>

            {/* 👃 3. SCULPTED 3D NOSE (Bridge, Apex & Nostril Alar) */}
            <group position={[0, 0.068, 0.120]}>
              {/* Nasal Bridge Dorsum */}
              <mesh position={[0, 0.014, 0]} rotation={[0.18, 0, 0]} material={skinMat}>
                <cylinderGeometry args={[0.006, 0.012, 0.036, 8]} />
              </mesh>
              {/* Rounded Nose Tip */}
              <mesh position={[0, -0.010, 0.008]} material={skinMat}>
                <sphereGeometry args={[0.010, 12, 12]} />
              </mesh>
              {/* Left/Right Nostril Alar */}
              <mesh position={[-0.009, -0.012, 0.004]} material={skinMat}>
                <sphereGeometry args={[0.006, 8, 8]} />
              </mesh>
              <mesh position={[0.009, -0.012, 0.004]} material={skinMat}>
                <sphereGeometry args={[0.006, 8, 8]} />
              </mesh>
            </group>

            {/* 👄 4. NATURAL LIPS & CHIN CONTOUR */}
            <group position={[0, 0.024, 0.118]}>
              {/* Upper Lip (Cupid's Bow) */}
              <mesh position={[0, 0.003, 0.002]} material={lipMat}>
                <boxGeometry args={[0.034, 0.005, 0.007]} />
              </mesh>
              {/* Lower Lip (Fuller Vermilion cushion) */}
              <mesh position={[0, -0.006, 0.001]} material={lipMat}>
                <boxGeometry args={[0.030, 0.006, 0.008]} />
              </mesh>
              {/* Chin Contour */}
              <mesh position={[0, -0.028, -0.008]} material={skinMat}>
                <sphereGeometry args={[0.016, 10, 10]} />
              </mesh>
            </group>

            {/* 👂 5. ANATOMICAL EARS (Left & Right) */}
            <group position={[-0.126, 0.076, 0]} rotation={[0, -0.18, 0]}>
              <mesh material={skinMat}><boxGeometry args={[0.010, 0.046, 0.026]} /></mesh>
            </group>
            <group position={[0.126, 0.076, 0]} rotation={[0, 0.18, 0]}>
              <mesh material={skinMat}><boxGeometry args={[0.010, 0.046, 0.026]} /></mesh>
            </group>

            {/* 🧔 6. FACIAL HAIR OPTIONS */}
            {facialHair === "MUSTACHE" && (
              <mesh position={[0, 0.035, 0.124]} material={hairMat}>
                <boxGeometry args={[0.042, 0.007, 0.008]} />
              </mesh>
            )}
            {facialHair === "GOATEE" && (
              <group position={[0, 0.014, 0.120]}>
                <mesh position={[0, 0.021, 0.004]} material={hairMat}><boxGeometry args={[0.040, 0.006, 0.007]} /></mesh>
                <mesh position={[0, -0.014, -0.002]} material={hairMat}><boxGeometry args={[0.018, 0.020, 0.010]} /></mesh>
              </group>
            )}
            {facialHair === "STUBBLE" && (
              <mesh position={[0, 0.016, 0.116]} material={hairMat} scale={[1, 1, 0.2]}>
                <sphereGeometry args={[0.072, 12, 8, 0, Math.PI, 0, Math.PI * 0.48]} />
              </mesh>
            )}

            {/* 👓 7. REALISTIC WIREFRAME GLASSES */}
            {hasGlasses && (
              <group position={[0, 0.090, 0.118]}>
                {/* Left Frame Rim & Lens */}
                <mesh position={[-0.042, 0, 0]} material={glassesMat}><boxGeometry args={[0.036, 0.024, 0.003]} /></mesh>
                <mesh position={[-0.042, 0, 0.001]} material={lensGlassMat}><planeGeometry args={[0.032, 0.020]} /></mesh>
                {/* Right Frame Rim & Lens */}
                <mesh position={[0.042, 0, 0]} material={glassesMat}><boxGeometry args={[0.036, 0.024, 0.003]} /></mesh>
                <mesh position={[0.042, 0, 0.001]} material={lensGlassMat}><planeGeometry args={[0.032, 0.020]} /></mesh>
                {/* Bridge */}
                <mesh position={[0, 0.004, 0]} material={glassesMat}><boxGeometry args={[0.016, 0.003, 0.003]} /></mesh>
                {/* Temples (Side Arms) */}
                <mesh position={[-0.060, 0, -0.06]} rotation={[0, 0.08, 0]} material={glassesMat}><boxGeometry args={[0.003, 0.003, 0.12]} /></mesh>
                <mesh position={[0.060, 0, -0.06]} rotation={[0, -0.08, 0]} material={glassesMat}><boxGeometry args={[0.003, 0.003, 0.12]} /></mesh>
              </group>
            )}

            {/* 💇 8. VOLUMETRIC SCULPTED HAIRSTYLES */}
            {hasHardhat ? (
              <group position={[0, 0.16, -0.01]}>
                <mesh geometry={_hardhatDomeGeo} material={config.hardhatMat} />
                <mesh geometry={_hardhatBrimGeo} material={config.hardhatMat} position={[0, -0.02, 0]} />
                <mesh geometry={_hardhatRibGeo} material={config.hardhatMat} position={[0, 0.04, 0]} />
                <mesh position={[0, -0.08, 0.08]}>
                  <boxGeometry args={[0.18, 0.015, 0.01]} />
                  <meshStandardMaterial color="#475569" />
                </mesh>
              </group>
            ) : hairStyle === "WOMAN_PONYTAIL" ? (
              <group position={[0, 0.08, -0.02]}>
                {/* Scalp Crown */}
                <mesh position={[0, 0.03, 0]} material={hairMat}>
                  <sphereGeometry args={[0.132, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                </mesh>
                {/* Side Locks */}
                <mesh position={[-0.10, -0.01, 0.04]} material={hairMat}><boxGeometry args={[0.02, 0.08, 0.04]} /></mesh>
                <mesh position={[0.10, -0.01, 0.04]} material={hairMat}><boxGeometry args={[0.02, 0.08, 0.04]} /></mesh>
                {/* Ponytail Tie */}
                <mesh position={[0, -0.02, -0.13]}>
                  <torusGeometry args={[0.022, 0.008, 8, 12]} />
                  <meshStandardMaterial color="#0284C7" roughness={0.5} />
                </mesh>
                {/* Cascading Ponytail Tail */}
                <mesh position={[0, -0.08, -0.15]} rotation={[0.42, 0, 0]} material={hairMat}>
                  <cylinderGeometry args={[0.032, 0.016, 0.24, 8]} />
                </mesh>
              </group>
            ) : hairStyle === "WOMAN_BOB" ? (
              <group position={[0, 0.08, 0]}>
                <mesh position={[0, 0.03, 0]} material={hairMat}>
                  <sphereGeometry args={[0.134, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                </mesh>
                {/* Side-swept Bangs */}
                <mesh position={[0, 0.08, 0.07]} rotation={[0.2, 0, 0.1]} material={hairMat}>
                  <boxGeometry args={[0.14, 0.03, 0.08]} />
                </mesh>
                {/* Left & Right Flaring Bob Bobbins */}
                <mesh position={[-0.10, -0.02, 0]} material={hairMat}><boxGeometry args={[0.035, 0.12, 0.10]} /></mesh>
                <mesh position={[0.10, -0.02, 0]} material={hairMat}><boxGeometry args={[0.035, 0.12, 0.10]} /></mesh>
              </group>
            ) : hairStyle === "SHORT_POMPADOUR" ? (
              <group position={[0, 0.08, 0]}>
                <mesh position={[0, 0.02, 0]} material={hairMat}>
                  <sphereGeometry args={[0.130, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                </mesh>
                {/* Sideburns */}
                <mesh position={[-0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
                <mesh position={[0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
                {/* Voluminous Swept Pompadour Crest */}
                <mesh position={[0, 0.11, 0.03]} rotation={[-0.22, 0, 0]} material={hairMat}>
                  <boxGeometry args={[0.12, 0.04, 0.12]} />
                </mesh>
              </group>
            ) : hairStyle === "UNDERCUT" ? (
              <group position={[0, 0.08, 0]}>
                {/* High Fade Base */}
                <mesh position={[0, 0.01, 0]} material={hairMat}>
                  <sphereGeometry args={[0.125, 18, 16, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.35]} />
                </mesh>
                {/* Sideburns */}
                <mesh position={[-0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
                <mesh position={[0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
                {/* Textured Top Crop */}
                <mesh position={[0, 0.095, 0.01]} material={hairMat}>
                  <boxGeometry args={[0.125, 0.035, 0.13]} />
                </mesh>
              </group>
            ) : hairStyle === "CREW_CUT" ? (
              <group position={[0, 0.08, 0]}>
                <mesh position={[0, 0.02, 0]} material={hairMat}>
                  <sphereGeometry args={[0.126, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                </mesh>
                {/* Sideburns */}
                <mesh position={[-0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.05, 0.025]} /></mesh>
                <mesh position={[0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.05, 0.025]} /></mesh>
              </group>
            ) : hairStyle === "BALD" ? null : (
              /* Classic Neat Short Hair */
              <group position={[0, 0.08, 0]}>
                <mesh position={[0, 0.03, 0]} material={hairMat}>
                  <sphereGeometry args={[0.132, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                </mesh>
                <mesh position={[0, -0.01, -0.01]} material={hairMat}>
                  <sphereGeometry args={[0.130, 18, 16, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.45]} />
                </mesh>
                {/* Sideburns */}
                <mesh position={[-0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
                <mesh position={[0.115, -0.01, 0.03]} material={hairMat}><boxGeometry args={[0.015, 0.06, 0.03]} /></mesh>
              </group>
            )}
          </group>

          {/* ─── LEFT ARM (Shoulder Pivot at X = -0.27m) ─── */}
          <group ref={lShoulderRef} position={[-0.27, 0.18, 0]}>
            <mesh position={[0, -0.14, 0]} geometry={_upperArmGeo} material={shirtMaterial} />
            {/* Elbow / Forearm */}
            <group ref={lElbowRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={_forearmGeo} material={skinMat} />
              {/* Articulated Anatomical Hand & Fingers (Left) */}
              <group position={[0, 0, 0]}>
                {/* Wrist Joint */}
                <mesh position={[0, -0.255, 0.010]} material={hasVest ? undefined : skinMat}>
                  <cylinderGeometry args={[0.024, 0.026, 0.020, 8]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Palm (Metacarpals - Arched naturally) */}
                <mesh position={[0, -0.276, 0.012]} rotation={[0.12, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.046, 0.028, 0.014]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Thumb (Digit 1) */}
                <mesh position={[0.022, -0.266, 0.012]} rotation={[0.12, 0.40, 0.35]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.010, 0.018, 0.009]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[0.027, -0.280, 0.008]} rotation={[0.22, 0.20, 0.20]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.009, 0.013, 0.008]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Index Finger (Digit 2) */}
                <mesh position={[0.014, -0.296, 0.012]} rotation={[-0.15, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0088, 0.015, 0.0085]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[0.014, -0.308, 0.006]} rotation={[-0.32, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0078, 0.013, 0.0075]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Middle Finger (Digit 3) */}
                <mesh position={[0.004, -0.298, 0.013]} rotation={[-0.12, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0088, 0.016, 0.0085]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[0.004, -0.311, 0.007]} rotation={[-0.30, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0078, 0.014, 0.0075]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Ring Finger (Digit 4) */}
                <mesh position={[-0.005, -0.296, 0.012]} rotation={[-0.15, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0082, 0.015, 0.008]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[-0.005, -0.308, 0.006]} rotation={[-0.32, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0072, 0.013, 0.007]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Pinky Finger (Digit 5) */}
                <mesh position={[-0.014, -0.293, 0.011]} rotation={[-0.18, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0074, 0.013, 0.007]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[-0.014, -0.304, 0.005]} rotation={[-0.35, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0064, 0.011, 0.006]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
              </group>
            </group>
          </group>

          {/* ─── RIGHT ARM (Shoulder Pivot at X = 0.27m) ─── */}
          <group ref={rShoulderRef} position={[0.27, 0.18, 0]}>
            <mesh position={[0, -0.14, 0]} geometry={_upperArmGeo} material={shirtMaterial} />
            {/* Elbow / Forearm */}
            <group ref={rElbowRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={_forearmGeo} material={skinMat} />
              {/* Articulated Anatomical Hand & Fingers (Right) */}
              <group position={[0, 0, 0]}>
                {/* Wrist Joint */}
                <mesh position={[0, -0.255, 0.010]} material={hasVest ? undefined : skinMat}>
                  <cylinderGeometry args={[0.024, 0.026, 0.020, 8]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Palm (Metacarpals - Arched naturally) */}
                <mesh position={[0, -0.276, 0.012]} rotation={[0.12, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.046, 0.028, 0.014]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Thumb (Digit 1) */}
                <mesh position={[-0.022, -0.266, 0.012]} rotation={[0.12, -0.40, -0.35]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.010, 0.018, 0.009]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[-0.027, -0.280, 0.008]} rotation={[0.22, -0.20, -0.20]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.009, 0.013, 0.008]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Index Finger (Digit 2) */}
                <mesh position={[-0.014, -0.296, 0.012]} rotation={[-0.15, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0088, 0.015, 0.0085]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[-0.014, -0.308, 0.006]} rotation={[-0.32, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0078, 0.013, 0.0075]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Middle Finger (Digit 3) */}
                <mesh position={[-0.004, -0.298, 0.013]} rotation={[-0.12, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0088, 0.016, 0.0085]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[-0.004, -0.311, 0.007]} rotation={[-0.30, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0078, 0.014, 0.0075]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Ring Finger (Digit 4) */}
                <mesh position={[0.005, -0.296, 0.012]} rotation={[-0.15, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0082, 0.015, 0.008]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[0.005, -0.308, 0.006]} rotation={[-0.32, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0072, 0.013, 0.007]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                {/* Pinky Finger (Digit 5) */}
                <mesh position={[0.014, -0.293, 0.011]} rotation={[-0.18, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0074, 0.013, 0.007]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
                <mesh position={[0.014, -0.304, 0.005]} rotation={[-0.35, 0, 0]} material={hasVest ? undefined : skinMat}>
                  <boxGeometry args={[0.0064, 0.011, 0.006]} />
                  {hasVest && <meshStandardMaterial color="#78716C" roughness={0.8} />}
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ─── LEFT LEG (Hip Pivot at X = -0.11m, Y = 0.0m) ─── */}
        <group ref={lThighRef} position={[-0.11, 0, 0]}>
          <mesh position={[0, -0.19, 0]} geometry={_thighGeo} material={config.pantsMat} />
          {/* Knee / Calf / Boot */}
          <group ref={lKneeRef} position={[0, -0.38, 0]}>
            <mesh position={[0, -0.18, 0]} geometry={_calfGeo} material={config.pantsMat} />
            {/* Heavy-Duty Steel-Toe Boot */}
            <group ref={lAnkleRef} position={[0, -0.38, 0.04]}>
              <mesh position={[0, 0.05, 0]} geometry={_bootGeo} material={MAT_LEATHER_BOOTS} />
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.115, 0.025, 0.25]} />
                <primitive object={MAT_BOOT_SOLES} attach="material" />
              </mesh>
              {/* Steel toe cap */}
              <mesh position={[0, 0.07, 0.09]}>
                <boxGeometry args={[0.10, 0.04, 0.06]} />
                <primitive object={MAT_STEEL_DARK} attach="material" />
              </mesh>
            </group>
          </group>
        </group>

        {/* ─── RIGHT LEG (Hip Pivot at X = 0.11m, Y = 0.0m) ─── */}
        <group ref={rThighRef} position={[0.11, 0, 0]}>
          <mesh position={[0, -0.19, 0]} geometry={_thighGeo} material={config.pantsMat} />
          {/* Knee / Calf / Boot */}
          <group ref={rKneeRef} position={[0, -0.38, 0]}>
            <mesh position={[0, -0.18, 0]} geometry={_calfGeo} material={config.pantsMat} />
            {/* Heavy-Duty Steel-Toe Boot */}
            <group ref={rAnkleRef} position={[0, -0.38, 0.04]}>
              <mesh position={[0, 0.05, 0]} geometry={_bootGeo} material={MAT_LEATHER_BOOTS} />
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.115, 0.025, 0.25]} />
                <primitive object={MAT_BOOT_SOLES} attach="material" />
              </mesh>
              {/* Steel toe cap */}
              <mesh position={[0, 0.07, 0.09]}>
                <boxGeometry args={[0.10, 0.04, 0.06]} />
                <primitive object={MAT_STEEL_DARK} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export interface RealisticNPCProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  role?: NPCRole;
  skinTone?: SkinTone;
  hairStyle?: HairStyle;
  hairColor?: string;
  hasHardhat?: boolean;
  hasVest?: boolean;
  pose?: "WALK" | "STAND" | "SEATED";
  customShirtMat?: THREE.MeshStandardMaterial;
  customPantsMat?: THREE.MeshStandardMaterial;
  isWalking?: boolean;
  walkDistance?: number;
  walkSpeed?: number;
  shiftOffset?: number;
  isInspecting?: boolean;
  isWelding?: boolean;
  accessory?: "TABLET" | "CLIPBOARD" | "MULTIMETER" | "FLASHLIGHT" | "BLUEPRINT" | "RADIO" | "NONE";
  nameTag?: string;
  personnelId?: string;
  onSelectPerson?: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ FULL REALISTIC NPC (with position, walking, inspection behaviors)
// ═══════════════════════════════════════════════════════════════════════════

export function RealisticNPC({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  role = "LABORER",
  skinTone = "MEDIUM",
  hairStyle = "SHORT",
  hasHardhat = true,
  hasVest = true,
  pose = "WALK",
  customShirtMat,
  customPantsMat,
  isWalking = false,
  walkSpeed = 0.8,
  shiftOffset,
  personnelId,
  onSelectPerson,
}: RealisticNPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const walkPhaseRef = useRef(shiftOffset ?? Math.random() * 20);
  const walkDirRef = useRef(1);

  useFrame((_, delta) => {
    if (!groupRef.current || !isWalking || pose === "SEATED") return;
    walkPhaseRef.current += delta * walkSpeed * walkDirRef.current;
    const walkX = Math.sin(walkPhaseRef.current * 0.3) * 3.0;
    groupRef.current.position.x = position[0] + walkX;
    groupRef.current.rotation.y = walkDirRef.current > 0 ? 0 : Math.PI;
    if (Math.abs(walkX) > 2.9) walkDirRef.current *= -1;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <RealisticHumanoidMesh
        role={role}
        skinTone={skinTone}
        hairStyle={hairStyle}
        hasHardhat={hasHardhat}
        hasVest={hasVest}
        pose={pose}
        customShirtMat={customShirtMat}
        customPantsMat={customPantsMat}
        isWalking={isWalking}
        walkSpeed={walkSpeed}
        shiftOffset={shiftOffset}
        personnelId={personnelId}
        onSelectPerson={onSelectPerson}
      />
    </group>
  );
}


export default RealisticHumanoidMesh;
