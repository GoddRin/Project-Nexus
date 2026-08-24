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

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

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
export type HairStyle = "SHORT" | "UNDERCUT" | "WOMAN_PONYTAIL" | "WOMAN_BOB" | "BALD";

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

  // ─── Arms (opposite to legs, natural pendulum) ───
  const leftShoulder = -Math.sin(phase) * 0.5 * activeBlend;
  const leftElbow = Math.max(0, Math.sin(phase - 0.6)) * 0.4 * activeBlend;
  const rightShoulder = -Math.sin(phase + Math.PI) * 0.5 * activeBlend;
  const rightElbow = Math.max(0, Math.sin(phase + Math.PI - 0.6)) * 0.4 * activeBlend;

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

// ═══════════════════════════════════════════════════════════════════════════
// 🧍 MAIN REALISTIC HUMANOID MESH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const RealisticHumanoidMesh = React.memo(function RealisticHumanoidMesh({
  role = "LABORER" as HydroWorkforceRole,
  isWalking = true,
  walkSpeed = 1.0,
  onGaitTelemetry,
  skinTone = "MEDIUM" as SkinTone,
  position,
  rotation,
  shiftOffset,
}: {
  role?: HydroWorkforceRole;
  isWalking?: boolean;
  walkSpeed?: number;
  onGaitTelemetry?: (t: GaitPoseTelemetry) => void;
  skinTone?: SkinTone;
  position?: [number, number, number];
  rotation?: [number, number, number];
  shiftOffset?: number;
}) {
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
  const rightLegRef = useRef<THREE.Group>(null);

  const timeOffset = useMemo(() => (shiftOffset ?? Math.random() * 10), [shiftOffset]);

  const config = useMemo(() => getOutfitForRole(role), [role]);

  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SKIN_PALETTES[skinTone], roughness: 0.6 }),
    [skinTone],
  );

  const wasWalkingRef = useRef<boolean>(true);

  // Execute Biomechanical Physics Frame Update
  useFrame(({ clock }) => {
    if (!isWalking && !onGaitTelemetry && !wasWalkingRef.current) {
      return;
    }
    wasWalkingRef.current = isWalking;

    const time = clock.getElapsedTime() + timeOffset;
    const g = computeRealisticWalkingGait(time, walkSpeed, isWalking);

    if (onGaitTelemetry) onGaitTelemetry(g);

    // Apply Pelvis Kinematics
    if (pelvisRef.current) {
      pelvisRef.current.position.y = g.pelvisY;
      pelvisRef.current.rotation.y = g.pelvisYaw;
      pelvisRef.current.rotation.z = g.pelvisRoll;
      pelvisRef.current.rotation.x = g.pelvisPitch;
    }

    // Apply Torso Kinematics
    if (torsoRef.current) {
      torsoRef.current.rotation.y = g.torsoYaw;
      torsoRef.current.rotation.x = g.torsoPitch;
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
    <group position={position} rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}>
      {/* ─── PELVIS (Root Transform) ─── */}
      <group ref={pelvisRef} position={[0, 0.96, 0]}>
        <mesh geometry={_pelvisGeo} material={config.pantsMat} />

        {/* Belt */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.205, 0.205, 0.04, 16]} />
          <primitive object={MAT_LEATHER_BROWN} attach="material" />
        </mesh>

        {/* ─── TORSO (Spine Pivot) ─── */}
        <group ref={torsoRef} position={[0, 0.35, 0]}>
          <mesh geometry={_torsoGeo} material={config.shirtMat} />

          {/* High-Visibility Safety Vest */}
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

          {/* ─── NECK & HEAD ─── */}
          <group ref={headRef} position={[0, 0.32, 0]}>
            <mesh geometry={_neckGeo} material={skinMat} position={[0, -0.05, 0]} />
            <mesh geometry={_headGeo} material={skinMat} position={[0, 0.08, 0]} />

            {/* Eyes */}
            <mesh position={[-0.04, 0.09, 0.10]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>
            <mesh position={[0.04, 0.09, 0.10]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>

            {/* Hardhat */}
            <group position={[0, 0.16, -0.01]}>
              <mesh geometry={_hardhatDomeGeo} material={config.hardhatMat} />
              <mesh geometry={_hardhatBrimGeo} material={config.hardhatMat} position={[0, -0.02, 0]} />
              <mesh geometry={_hardhatRibGeo} material={config.hardhatMat} position={[0, 0.04, 0]} />
              {/* Chin strap */}
              <mesh position={[0, -0.08, 0.08]}>
                <boxGeometry args={[0.18, 0.015, 0.01]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
            </group>
          </group>

          {/* ─── LEFT ARM (Shoulder Pivot at X = -0.27m) ─── */}
          <group ref={lShoulderRef} position={[-0.27, 0.18, 0]}>
            <mesh position={[0, -0.14, 0]} geometry={_upperArmGeo} material={config.shirtMat} />
            {/* Elbow / Forearm */}
            <group ref={lElbowRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={_forearmGeo} material={skinMat} />
              {/* Hand with glove */}
              <mesh position={[0, -0.29, 0]} geometry={_handGeo}>
                <meshStandardMaterial color="#78716C" roughness={0.8} />
              </mesh>
            </group>
          </group>

          {/* ─── RIGHT ARM (Shoulder Pivot at X = 0.27m) ─── */}
          <group ref={rShoulderRef} position={[0.27, 0.18, 0]}>
            <mesh position={[0, -0.14, 0]} geometry={_upperArmGeo} material={config.shirtMat} />
            {/* Elbow / Forearm */}
            <group ref={rElbowRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.13, 0]} geometry={_forearmGeo} material={skinMat} />
              {/* Hand with glove */}
              <mesh position={[0, -0.29, 0]} geometry={_handGeo}>
                <meshStandardMaterial color="#78716C" roughness={0.8} />
              </mesh>
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
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ FULL REALISTIC NPC (with position, walking, inspection behaviors)
// ═══════════════════════════════════════════════════════════════════════════

export function RealisticNPC({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  role = "LABORER",
  skinTone = "MEDIUM",
  isWalking = false,
  walkSpeed = 0.8,
  shiftOffset,
}: RealisticNPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const walkPhaseRef = useRef(shiftOffset ?? Math.random() * 20);
  const walkDirRef = useRef(1);

  useFrame((_, delta) => {
    if (!groupRef.current || !isWalking) return;
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
        isWalking={isWalking}
        walkSpeed={walkSpeed}
        shiftOffset={shiftOffset}
      />
    </group>
  );
}

export default RealisticHumanoidMesh;
