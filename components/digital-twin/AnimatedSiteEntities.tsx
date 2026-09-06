"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";
import {
  MAT_WORKER_VEST_ORANGE,
  MAT_WORKER_VEST_BLUE,
  MAT_WORKER_VEST_GREEN,
  MAT_WORKER_VEST_AMBER,
  MAT_WORKER_VEST_ROYAL,
  MAT_WORKER_VEST_NAVY,
  MAT_WORKER_VEST_DARK,
  MAT_WORKER_HARDHAT_YELLOW,
  MAT_WORKER_HARDHAT_WHITE,
  MAT_WORKER_HARDHAT_GREEN,
  MAT_WORKER_HARDHAT_BLUE,
  MAT_WORKER_HARDHAT_RED,
  MAT_SKIN_LIGHT,
  MAT_SKIN_MEDIUM,
  MAT_SKIN_BRONZE,
  MAT_SKIN_DEEP,
  MAT_SKIN_TONE,
  MAT_PANTS_SLATE,
  MAT_PANTS_JEANS,
  MAT_PANTS_CHARCOAL_OFFICE,
  MAT_PANTS_CARGO_GREY,
  MAT_PANTS_KHAKI,
  MAT_HAIR_BLACK,
  MAT_HAIR_BROWN,
  MAT_HAIR_AUBURN,
  MAT_HAIR_GREY,
  MAT_SHIRT_LONG_GREEN,
  MAT_SHIRT_LIGHT_BLUE,
  MAT_SHIRT_BLAZER_NAVY,
  MAT_SHIRT_SLATE_ADMIN,
  MAT_SHIRT_ROYAL_HR,
  MAT_SCRUBS_TEAL,
  MAT_FACE_EYE_PUPIL,
  MAT_FACE_EYE_IRIS,
  MAT_FACE_EYE_WHITE,
  MAT_FACE_EYEBROW,
  MAT_FACE_EYEBROW_GREY,
  MAT_FACE_LIPS,
  MAT_FACE_LIPS_MALE,
  MAT_FACE_LIPS_FEMALE,
  MAT_MUSTACHE_BLACK,
  MAT_MUSTACHE_SALT_PEPPER,
  MAT_STUBBLE_SHADOW,
  MAT_SAFETY_GLASSES_LENS,
  MAT_HAIR_TIE_PINK,
  MAT_FACE_BLUSH,
  MAT_PEARL_EARRING,
  MAT_GOLD_ACCENT,
  MAT_LANYARD_TEAL,
  MAT_ID_BADGE_WHITE,
  MAT_VEHICLE_WHITE,
  MAT_VEHICLE_RED,
  MAT_VEHICLE_SLATE,
  MAT_VEHICLE_CHASSIS,
  MAT_TIRE_RUBBER,
  MAT_HEADLIGHT_ON,
  MAT_HEADLIGHT_OFF,
  MAT_GLASS_BLUE,
  MAT_STEEL_DARK,
  MAT_YELLOW_SAFETY,
  MAT_RED_BOOTH,
  MAT_CHROME,
  MAT_SAFETY_RED,
  MAT_BRAKELIGHT_ON,
  MAT_SIGNBOARD_TEAL,
  MAT_STEEL_FRAME,
  MAT_GLASS_FRAME,
  MAT_GLASS_CLEAR,
  MAT_TIMBER_STAKE,
  MAT_CONCRETE_SLAB,
  MAT_FOOD_STAINLESS_TRAY,
  MAT_FOOD_STAINLESS_COUNTER,
  MAT_WHITE_PAINT,
  MAT_WOOD_HANDLE,
  MAT_PHONE_BODY,
  MAT_PHONE_SCREEN_GLOW,
  MAT_SCHMIDT_HAMMER_CHROME,
  MAT_SCHMIDT_HAMMER_RED,
} from "./SharedMaterials";
import {
  UPHILL_ROAD_SPLINE,
  DUMP_TRUCK_SPLINE,
  CREW_VAN_SPLINE,
  QAQC_PICKUP_SPLINE,
  SAFETY_PATROL_SPLINE,
  PEDESTRIAN_PATH_1_SPLINE,
  PEDESTRIAN_PATH_2_SPLINE,
  PEDESTRIAN_PATH_3_SPLINE,
  TEMFACIL_BUILDING_COLLIDERS,
  resolveBuildingCollisions,
  ROAD_CONSTANTS,
  getRoadTransform,
  getSplineTransform,
  getSiteSurfaceY,
} from "./uphillRoadConfig";
import { FILIPINO_PERSONNEL_REGISTRY } from "./personnelData";
import { FilipinoCharacterHead } from "./TemfacilFacility";
import { RealisticSCICCivilForemanModel } from "./RealisticBlenderAssets";
import {
  registerLivePersonnelPosition,
  unregisterLivePersonnel,
  LIVE_PERSONNEL_WORLD_POSITIONS,
} from "./personnelLocations";

const scratchPersonWorldPos = new THREE.Vector3();
const scratchJimmyWorldPos = new THREE.Vector3();
const scratchSecWorldPos = new THREE.Vector3();

/* ═══════════════════════════════════════════════════════════════════════════
   TERRAIN HEIGHT SAMPLER & SPLINE UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const SCENE_HALF = 180.0;

export function sampleTerrainY(x: number, z: number): number {
  const gridSize = (gisTerrainData as any).gridSize || 65;
  const positions = (gisTerrainData as any).positions as number[];

  const xFrac = (x + SCENE_HALF) / (SCENE_HALF * 2);
  const zFrac = (z + SCENE_HALF) / (SCENE_HALF * 2);

  const col = xFrac * (gridSize - 1);
  const row = zFrac * (gridSize - 1);

  const c0 = Math.max(0, Math.min(gridSize - 2, Math.floor(col)));
  const r0 = Math.max(0, Math.min(gridSize - 2, Math.floor(row)));
  const c1 = c0 + 1;
  const r1 = r0 + 1;

  const fx = col - c0;
  const fz = row - r0;

  const y00 = positions[(r0 * gridSize + c0) * 3 + 1];
  const y10 = positions[(r0 * gridSize + c1) * 3 + 1];
  const y01 = positions[(r1 * gridSize + c0) * 3 + 1];
  const y11 = positions[(r1 * gridSize + c1) * 3 + 1];

  const y0 = y00 * (1 - fx) + y10 * fx;
  const y1 = y01 * (1 - fx) + y11 * fx;
  let sampledY = y0 * (1 - fz) + y1 * fz;

  // 1. Excavate Tailrace Canal & Outfall Channel
  if (x >= -12.0 && x <= 12.0 && z >= 5.5 && z <= 48.0) {
    return -1.35;
  }

  // 2. Powerhouse Facility Compound Base Yard (level civil foundation at Y = 0.05m)
  const dxPH = Math.max(-32.0 - x, 0, x - 44.0);
  const dzPH = Math.max(-24.0 - z, 0, z - 18.0);
  const distPH = Math.hypot(dxPH, dzPH);
  if (distPH === 0) {
    sampledY = 0.05;
  } else if (distPH < 22.0) {
    const tPH = distPH / 22.0;
    const smoothT = tPH * tPH * (3.0 - 2.0 * tPH);
    const origY = Math.max(0.05, sampledY);
    sampledY = 0.05 * (1.0 - smoothT) + origY * smoothT;
  }

  // 3. Smooth Continuous Linear Slope Grade from TEMFACIL (x: 88, z: -70, y=13.8) down to Powerhouse (x: 34, z: -22, y=0.5)
  const ax = 34.0, az = -22.0;
  const bx = 95.0, bz = -75.0;
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
  const projX = ax + t * dx;
  const projZ = az + t * dz;
  const distToSlopeLine = Math.hypot(x - projX, z - projZ);

  if (distToSlopeLine < 26.0 && x >= 30.0 && x <= 88.0 && z >= -72.0 && z <= -20.0) {
    const slopeY = 0.5 + t * 13.3;
    const fade = Math.min(1.0, distToSlopeLine / 26.0);
    sampledY = slopeY * (1.0 - fade) + sampledY * fade;
  }

  // 4. TEMFACIL Compound Elevated Base Platform (EL. 14.0m to 14.85m)
  if (x >= 68.0 && z <= -58.0) {
    return Math.max(14.0, sampledY);
  }

  return sampledY;
}

function getSafeSplineData(spline: THREE.CatmullRomCurve3, rawProgress: number) {
  const u = Math.max(0.0001, Math.min(0.9999, rawProgress));
  return {
    pt: spline.getPointAt(u),
    tangent: spline.getTangentAt(u),
  };
}

// ═══ STAGE & BACKSTAGE STAIRS WAYPOINT COORDINATES (SURGICALLY CALIBRATED) ═══
// World positions relative to court origin [128.0, 14.0, -81.0] and stage at [0, 0.08, -7.5]
const P_STAIR_BASE: [number, number, number] = [128.0, 14.10, -91.8]; // Ground level base of backstage stairs
const P_STAIR_TOP: [number, number, number] = [128.0, 14.88, -90.2];  // Top landing of backstage stairs (Stage level)
const P_PODIUM_BEHIND: [number, number, number] = [128.0, 14.88, -88.5]; // Directly behind podium microphone facing audience
const P_STAGE_FRONT: [number, number, number] = [128.0, 14.88, -87.4];   // Front of stage for calisthenics leader

/**
 * Smoothly interpolates a speaker walking from ground standby -> around stage -> up backstage stairs -> podium
 */
function evalWalkToStage(startPos: [number, number, number], progress: number) {
  const pClamped = Math.max(0, Math.min(1, progress));
  if (pClamped <= 0.40) {
    const u = pClamped / 0.40;
    const sideX = startPos[0] >= 128.0 ? 132.5 : 123.5;
    let pos: [number, number, number];
    let rotY = 0;
    if (u < 0.6) {
      const v = u / 0.6;
      pos = [
        THREE.MathUtils.lerp(startPos[0], sideX, v),
        14.10,
        THREE.MathUtils.lerp(startPos[2], -91.8, v),
      ];
      rotY = Math.atan2(sideX - startPos[0], -91.8 - startPos[2]);
    } else {
      const v = (u - 0.6) / 0.4;
      pos = [
        THREE.MathUtils.lerp(sideX, P_STAIR_BASE[0], v),
        14.10,
        -91.8,
      ];
      rotY = Math.atan2(P_STAIR_BASE[0] - sideX, 0);
    }
    return { pos, rotY, isWalking: true };
  } else if (pClamped <= 0.75) {
    // Climbing the backstage stairs from Z=-91.8 to Z=-90.2, Y=14.10 to Y=14.88
    const u = (pClamped - 0.40) / 0.35;
    const pos: [number, number, number] = [
      P_STAIR_BASE[0],
      THREE.MathUtils.lerp(P_STAIR_BASE[1], P_STAIR_TOP[1], u),
      THREE.MathUtils.lerp(P_STAIR_BASE[2], P_STAIR_TOP[2], u),
    ];
    return { pos, rotY: 0, isWalking: true };
  } else {
    // Walking across stage deck to podium behind
    const u = (pClamped - 0.75) / 0.25;
    const pos: [number, number, number] = [
      P_STAIR_TOP[0],
      14.88,
      THREE.MathUtils.lerp(P_STAIR_TOP[2], P_PODIUM_BEHIND[2], u),
    ];
    return { pos, rotY: 0, isWalking: true };
  }
}

/**
 * Smoothly interpolates a speaker walking from podium -> top of backstage stairs -> down stairs -> ground standby
 */
function evalWalkFromStage(destPos: [number, number, number], progress: number) {
  const pClamped = Math.max(0, Math.min(1, progress));
  if (pClamped <= 0.25) {
    // Walking back from podium to top of backstage stairs
    const u = pClamped / 0.25;
    const pos: [number, number, number] = [
      P_PODIUM_BEHIND[0],
      14.88,
      THREE.MathUtils.lerp(P_PODIUM_BEHIND[2], P_STAIR_TOP[2], u),
    ];
    return { pos, rotY: Math.PI, isWalking: true };
  } else if (pClamped <= 0.60) {
    // Descending the backstage stairs from Z=-90.2 to Z=-91.8, Y=14.88 to Y=14.10
    const u = (pClamped - 0.25) / 0.35;
    const pos: [number, number, number] = [
      P_STAIR_TOP[0],
      THREE.MathUtils.lerp(P_STAIR_TOP[1], P_STAIR_BASE[1], u),
      THREE.MathUtils.lerp(P_STAIR_TOP[2], P_STAIR_BASE[2], u),
    ];
    return { pos, rotY: Math.PI, isWalking: true };
  } else {
    // Walking back along side path to destination ground standby position
    const u = (pClamped - 0.60) / 0.40;
    const sideX = destPos[0] >= 128.0 ? 132.5 : 123.5;
    let pos: [number, number, number];
    let rotY = 0;
    if (u < 0.4) {
      const v = u / 0.4;
      pos = [
        THREE.MathUtils.lerp(P_STAIR_BASE[0], sideX, v),
        14.10,
        -91.8,
      ];
      rotY = Math.atan2(sideX - P_STAIR_BASE[0], 0);
    } else {
      const v = (u - 0.4) / 0.6;
      pos = [
        THREE.MathUtils.lerp(sideX, destPos[0], v),
        14.10,
        THREE.MathUtils.lerp(-91.8, destPos[2], v),
      ];
      rotY = Math.atan2(destPos[0] - sideX, destPos[2] - (-91.8));
    }
    return { pos, rotY, isWalking: true };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. DYNAMIC ANATOMICAL HYDRO PROJECT PERSON MESH
   ═══════════════════════════════════════════════════════════════════════════ */

export interface HydroProjectPersonMeshProps {
  personnelId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  gender?: "MALE" | "FEMALE";
  role?: string;
  jobRoutine?:
    | "DEFAULT"
    | "SURVEYOR"
    | "GEOLOGIST"
    | "TUNNEL_QC"
    | "TUNNEL_FOREMAN"
    | "JUMBO_OPERATOR"
    | "MECHANICAL_SUPT"
    | "ELECTRICAL_SUPT"
    | "ELECTRICAL_SUPERVISOR"
    | "ELECTRICAL_FOREMAN"
    | "CIVIL_SUPERVISOR"
    | "CIVIL_4S_SUPERVISOR"
    | "CIVIL_FOREMAN"
    | "TECHNICAL_HEAD"
    | "CAD_OPERATOR"
    | "DOC_CONTROLLER"
    | "QUANTITY_SURVEYOR"
    | "JR_QAQC_ENGR"
    | "EXECUTIVE_PM"
    | "HR_ADMIN"
    | "IT_SPECIALIST"
    | "WAREHOUSE_LEAD"
    | "SECURITY_OFFICER"
    | "PROJECT_NURSE";
  speakerType?: "SAFETY_HEAD" | "HR_HEAD" | "WAREHOUSE_LEAD" | "PROJECT_MANAGER";
  pose?: "DEFAULT" | "TOOLBOX_CROWD" | "PRAYER" | "DANCE" | "SPEAKING" | "SEATED" | "PATROL";
  skinTone?: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
  hairStyle?: "SHORT" | "BALD" | "LONG_MAN" | "WOMAN_PONYTAIL" | "POMPADOUR" | "CHEF_BANDANA";
  hairColor?: "BLACK" | "BROWN" | "AUBURN" | "WHITE" | "SALT_PEPPER";
  pantsStyle?: "JEANS" | "CARGO" | "KHAKI" | "CHARCOAL_OFFICE" | "MAONG_JEANS";
  hasHardhat?: boolean;
  hardhatColor?: string;
  hasVest?: boolean;
  vestColor?: string;
  hasGlasses?: boolean;
  hasBeard?: boolean;
  facialHair?: "NONE" | "MUSTACHE" | "BEARD" | "GOATEE" | "STUBBLE";
  accessory?: "NONE" | "CLIPBOARD" | "BINDER" | "TABLET" | "RADIO" | "MIC" | "HAMMER" | "TOTAL_STATION" | "SLUMP_CONE" | "MULTIMETER" | "TORQUE_WRENCH" | "BARCODE_SCANNER";
  bodyScale?: [number, number, number];
  shiftOffset?: number;
  isPatrolling?: boolean;
  patrolPoints?: [number, number, number][];
  onSelectPerson?: (id: string) => void;
}

export function HydroProjectPersonMesh({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  gender = "MALE",
  speakerType,
  pose = "DEFAULT",
  jobRoutine,
  skinTone = "MEDIUM",
  hairStyle = "SHORT",
  hairColor = "BLACK",
  pantsStyle = "JEANS",
  hasHardhat = true,
  hardhatColor = "#FFFFFF",
  hasVest = true,
  vestColor = "#EA580C",
  hasGlasses = false,
  hasBeard = false,
  facialHair,
  accessory = "NONE",
  bodyScale = [1, 1, 1],
  shiftOffset = 0,
  isPatrolling = false,
  patrolPoints,
  personnelId,
  role,
  onSelectPerson,
}: HydroProjectPersonMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const eyeOpenRef = useRef<THREE.Group>(null);
  const eyeClosedRef = useRef<THREE.Group>(null);
  const prayingHandsRef = useRef<THREE.Group>(null);

  // Dedicated refs for job accessories & dynamic tools
  const propToolRef = useRef<THREE.Group>(null);
  const laserBeamRef = useRef<THREE.Mesh>(null);
  const frameTickRef = useRef<number>(0);

  // Automatically determine active routine from personnelId or prop
  const activeRoutine = useMemo(() => {
    if (jobRoutine && jobRoutine !== "DEFAULT") return jobRoutine;
    if (personnelId === "SURVEYOR_JOHNNY_FARONGEY") return "SURVEYOR";
    if (personnelId === "GEO_AMOR_FLORESCA") return "GEOLOGIST";
    if (personnelId === "QC_JAIRUZ_BATAC") return "TUNNEL_QC";
    if (personnelId === "TUNNEL_RICHARD_PINASEN" || personnelId === "TUNNEL_RUDY_MARCOS") return "TUNNEL_FOREMAN";
    if (personnelId === "WORKER_BENJAMIN_FOMEGAS") return "JUMBO_OPERATOR";
    if (personnelId === "SUPT_EUGENIO_HANOPOL" || personnelId === "MECH_ANDREW_SILVA") return "MECHANICAL_SUPT";
    if (personnelId === "SUPT_EDUARDO_DEFRANCIA") return "ELECTRICAL_SUPT";
    if (personnelId === "ELEC_JOSUE_ABELLERA") return "ELECTRICAL_SUPERVISOR";
    if (personnelId === "FOREMAN_WARLITO_DEFRANCIA") return "ELECTRICAL_FOREMAN";
    if (personnelId === "CIVIL_JAIME_CANO") return "CIVIL_SUPERVISOR";
    if (personnelId === "CIVIL_HENRY_ESTRADA") return "CIVIL_4S_SUPERVISOR";
    if (personnelId === "FOREMAN_ANTHONY_ROSALES") return "CIVIL_FOREMAN";
    if (personnelId === "ENGR_NOEL_LAVAPIE") return "TECHNICAL_HEAD";
    if (personnelId === "CAD_ELBERT_FIGURACION") return "CAD_OPERATOR";
    if (personnelId === "DOC_JAYSON_AGGABAO") return "DOC_CONTROLLER";
    if (personnelId === "QS_CRISTINE_ALMAZAN" || personnelId === "QS_JOHN_RICK_HERNAEZ") return "QUANTITY_SURVEYOR";
    if (personnelId === "QC_JHON_JAYME") return "JR_QAQC_ENGR";
    if (personnelId === "DEPUTY_NATHANIEL_PRINCIPE" || personnelId === "PM_ROMEO_SESE") return "EXECUTIVE_PM";
    if (personnelId === "HR_JOSHUA_ADMIN" || personnelId === "HR_RANDY_GAMBOA") return "HR_ADMIN";
    if (personnelId === "IT_MARC_SALVA") return "IT_SPECIALIST";
    if (personnelId === "WAREHOUSE_VINCENT_ANDALLO") return "WAREHOUSE_LEAD";
    if (personnelId === "SEC_RONALD_MALTO") return "SECURITY_OFFICER";
    if (personnelId === "NURSE_RUSSELLE_ALCANTARA") return "PROJECT_NURSE";
    return "DEFAULT";
  }, [jobRoutine, personnelId]);

  const skinMat = useMemo(() => {
    switch (skinTone) {
      case "LIGHT": return MAT_SKIN_LIGHT;
      case "BRONZE": return MAT_SKIN_BRONZE;
      case "DEEP": return MAT_SKIN_DEEP;
      case "MEDIUM":
      default: return MAT_SKIN_MEDIUM;
    }
  }, [skinTone]);

  const hairMat = useMemo(() => {
    switch (hairColor) {
      case "BROWN": return MAT_HAIR_BROWN;
      case "AUBURN": return MAT_HAIR_AUBURN;
      case "WHITE": return MAT_HAIR_GREY;
      case "SALT_PEPPER": return MAT_HAIR_GREY;
      case "BLACK":
      default: return MAT_HAIR_BLACK;
    }
  }, [hairColor]);

  const pantsMat = useMemo(() => {
    switch (pantsStyle) {
      case "CARGO": return MAT_PANTS_CARGO_GREY;
      case "KHAKI": return MAT_PANTS_KHAKI;
      case "CHARCOAL_OFFICE": return MAT_PANTS_CHARCOAL_OFFICE;
      case "MAONG_JEANS": return MAT_PANTS_JEANS;
      case "JEANS":
      default: return MAT_PANTS_JEANS;
    }
  }, [pantsStyle]);

  const customVestMat = useMemo(() => {
    if (!hasVest) return null;
    return new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.5, metalness: 0.05 });
  }, [hasVest, vestColor]);

  const customHardhatMat = useMemo(() => {
    if (!hasHardhat) return null;
    return new THREE.MeshStandardMaterial({ color: hardhatColor, roughness: 0.4, metalness: 0.05 });
  }, [hasHardhat, hardhatColor]);

  // Evaluator for speaker trajectories on stage using backstage stairs
  const getSpeakerTransform = (t: number) => {
    const cycleT = (t + shiftOffset) % 180.0;

    if (speakerType === "SAFETY_HEAD") {
      const homePos: [number, number, number] = [128.0, 14.10, -84.5];
      const standbyPos: [number, number, number] = [133.0, 14.10, -84.0];

      if (cycleT < 15.0) {
        return { pos: P_PODIUM_BEHIND, rotY: 0, isWalking: false, isHoldingMic: false, activePose: "PRAYER" as const };
      } else if (cycleT < 55.0) {
        return { pos: P_PODIUM_BEHIND, rotY: 0, isWalking: false, isHoldingMic: true, activePose: "SPEAKING" as const };
      } else if (cycleT < 85.0) {
        return { pos: P_STAGE_FRONT, rotY: 0, isWalking: false, isHoldingMic: false, activePose: "DANCE" as const };
      } else if (cycleT < 95.0) {
        const p = (cycleT - 85.0) / 10.0;
        const nav = evalWalkFromStage(standbyPos, p);
        return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
      } else if (cycleT < 170.0) {
        return { pos: homePos, rotY: 0, isWalking: false, isHoldingMic: false, activePose: "DEFAULT" as const };
      } else {
        const p = (cycleT - 170.0) / 10.0;
        const nav = evalWalkToStage(homePos, p);
        return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
      }
    }

    if (speakerType === "HR_HEAD") {
      const homePos: [number, number, number] = [123.0, 14.10, -74.5];
      if (cycleT < 85.0 || cycleT >= 110.0) {
        const inLinePose = cycleT < 15.0 ? "PRAYER" : (cycleT >= 55.0 && cycleT < 85.0 ? "DANCE" : "DEFAULT");
        return { pos: homePos, rotY: Math.PI, isWalking: false, isHoldingMic: false, activePose: inLinePose as any };
      } else {
        const p = (cycleT - 85.0) / 25.0;
        if (p < 0.28) {
          const u = p / 0.28;
          const nav = evalWalkToStage(homePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
        } else if (p < 0.72) {
          return { pos: P_PODIUM_BEHIND, rotY: 0, isWalking: false, isHoldingMic: true, activePose: "SPEAKING" as const };
        } else {
          const u = (p - 0.72) / 0.28;
          const nav = evalWalkFromStage(homePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
        }
      }
    }

    if (speakerType === "WAREHOUSE_LEAD") {
      const homePos: [number, number, number] = [131.0, 14.10, -84.5];
      if (cycleT < 110.0 || cycleT >= 130.0) {
        const inLinePose = cycleT < 15.0 ? "PRAYER" : (cycleT >= 55.0 && cycleT < 85.0 ? "DANCE" : "DEFAULT");
        return { pos: homePos, rotY: 0, isWalking: false, isHoldingMic: false, activePose: inLinePose as any };
      } else {
        const p = (cycleT - 110.0) / 20.0;
        if (p < 0.30) {
          const u = p / 0.30;
          const nav = evalWalkToStage(homePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
        } else if (p < 0.70) {
          return { pos: P_PODIUM_BEHIND, rotY: 0, isWalking: false, isHoldingMic: true, activePose: "SPEAKING" as const };
        } else {
          const u = (p - 0.70) / 0.30;
          const nav = evalWalkFromStage(homePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
        }
      }
    }

    if (speakerType === "PROJECT_MANAGER") {
      const pmHomePos: [number, number, number] = [125.0, 14.10, -84.5];
      if (cycleT < 130.0 || cycleT >= 160.0) {
        const inLinePose = cycleT < 15.0 ? "PRAYER" : (cycleT >= 55.0 && cycleT < 85.0 ? "DANCE" : "DEFAULT");
        return { pos: pmHomePos, rotY: 0, isWalking: false, isHoldingMic: false, activePose: inLinePose as any };
      } else {
        const p = (cycleT - 130.0) / 30.0;
        if (p < 0.25) {
          const u = p / 0.25;
          const nav = evalWalkToStage(pmHomePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: true, activePose: "DEFAULT" as const };
        } else if (p < 0.75) {
          return { pos: P_PODIUM_BEHIND, rotY: 0, isWalking: false, isHoldingMic: true, activePose: "SPEAKING" as const };
        } else {
          const u = (p - 0.75) / 0.25;
          const nav = evalWalkFromStage(pmHomePos, u);
          return { pos: nav.pos, rotY: nav.rotY, isWalking: true, isHoldingMic: false, activePose: "DEFAULT" as const };
        }
      }
    }

    return null;
  };

  const { camera } = useThree();
  const [isCloseUp, setIsCloseUp] = useState(true);

  React.useEffect(() => {
    if (personnelId && groupRef.current) {
      groupRef.current.updateWorldMatrix(true, false);
      groupRef.current.getWorldPosition(scratchPersonWorldPos);
      registerLivePersonnelPosition(personnelId, scratchPersonWorldPos, groupRef.current);
    }
    return () => {
      if (personnelId) {
        unregisterLivePersonnel(personnelId);
      }
    };
  }, [personnelId]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // 0. Live world position registration for personnel locator & camera tracking
    // Guaranteed to register world position even when camera is far in Overview mode
    if (personnelId) {
      groupRef.current.getWorldPosition(scratchPersonWorldPos);
      registerLivePersonnelPosition(personnelId, scratchPersonWorldPos, groupRef.current);
    }

    // Distance-based LOD & culling
    const distSq = camera.position.distanceToSquared(groupRef.current.position);
    // Over 175m away: person is < 2px on screen - cull group visibility completely
    const isVisible = distSq < 30625;
    if (groupRef.current.visible !== isVisible) {
      groupRef.current.visible = isVisible;
    }
    if (!isVisible) return;

    frameTickRef.current++;
    if (frameTickRef.current % 12 === 0) {
      const close = distSq < 1225; // 35 meters LOD boundary
      if (close !== isCloseUp) {
        setIsCloseUp(close);
      }
    }

    const t = clock.getElapsedTime() + shiftOffset;

    // 1. Dynamic Speaker Motion on Stage
    const speakerState = speakerType ? getSpeakerTransform(clock.getElapsedTime()) : null;
    let currentPose = pose;
    let isCurrentlyWalking = isPatrolling;

    if (speakerState) {
      groupRef.current.position.set(speakerState.pos[0], speakerState.pos[1], speakerState.pos[2]);
      groupRef.current.rotation.y = speakerState.rotY;
      currentPose = speakerState.activePose;
      isCurrentlyWalking = speakerState.isWalking;
    }

    // 2. Toolbox Meeting Crowd State Cycling
    if (pose === "TOOLBOX_CROWD") {
      const meetingT = (t * 0.2) % 180.0;
      currentPose = meetingT < 15.0 ? "PRAYER" : (meetingT >= 55.0 && meetingT < 85.0) ? "DANCE" : "DEFAULT";
    }

    // ═══ SUPERB REALISTIC BIPEDAL WALKING KINEMATICS ═══
    if (isCurrentlyWalking) {
      if (eyeOpenRef.current) eyeOpenRef.current.visible = true;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = false;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = false;

      const walkCadence = 6.2;
      const walkT = t * walkCadence;
      const strideSin = Math.sin(walkT);
      const strideCos = Math.cos(walkT);

      // Leg forward/back angular stride
      const legStrideL = strideSin * 0.52;
      const legStrideR = -strideSin * 0.52;

      // Natural counter arm swing with dynamic elbow flare
      const armSwing = strideSin * 0.44;

      // Biomechanical Pelvic Bounce
      const pelvicBounce = Math.abs(strideSin) * 0.042;
      const lateralSway = Math.sin(walkT * 0.5) * 0.025;
      const torsoTwist = strideCos * 0.08;

      groupRef.current.position.y = (speakerState ? speakerState.pos[1] : position[1]) + pelvicBounce;

      if (torsoRef.current) torsoRef.current.rotation.set(0.04, torsoTwist, lateralSway);
      if (headRef.current) headRef.current.rotation.set(-0.02, -torsoTwist * 0.6, -lateralSway * 0.5);

      if (leftLegRef.current) leftLegRef.current.rotation.set(legStrideL, 0, -lateralSway);
      if (rightLegRef.current) rightLegRef.current.rotation.set(legStrideR, 0, -lateralSway);

      if (leftArmRef.current) leftArmRef.current.rotation.set(-armSwing, 0.10, -0.08);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.30 - Math.max(0, -armSwing) * 0.35, 0, 0);
      if (rightArmRef.current) {
        if (speakerState?.isHoldingMic) {
          rightArmRef.current.rotation.set(-0.70, -0.15, -0.08);
          if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.95, -0.10, 0);
        } else {
          rightArmRef.current.rotation.set(armSwing, -0.10, 0.08);
          if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.30 - Math.max(0, armSwing) * 0.35, 0, 0);
        }
      }
      return;
    }

    // ═══ POSE 1: REVERENT OPENING PRAYER ═══
    if (currentPose === "PRAYER") {
      const prayerBreath = Math.sin(t * 1.5) * 0.015;
      if (headRef.current) headRef.current.rotation.set(0.28 + prayerBreath, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.05, 0, 0);
      if (eyeOpenRef.current) eyeOpenRef.current.visible = false;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = true;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = true;

      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, 0.35, 0.20);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.25, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55, -0.35, -0.20);
      if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.95, -0.25, 0);
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      return;
    }

    // ═══ POSE 2: SYNCHRONIZED CALISTHENICS & MORNING SAFETY EXERCISES ═══
    if (currentPose === "DANCE" || currentPose === "TOOLBOX_CROWD") {
      if (eyeOpenRef.current) eyeOpenRef.current.visible = true;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = false;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = false;

      const syncT = t;
      const stretchPhase = (syncT * 0.8) % 30.0;
      const basePosY = speakerState ? speakerState.pos[1] : position[1];

      if (stretchPhase < 7.5) {
        const beat = Math.sin(syncT * 1.4);
        const breathY = Math.abs(Math.sin(syncT * 1.4)) * 0.02;
        groupRef.current.position.y = basePosY + breathY;
        if (torsoRef.current) torsoRef.current.rotation.set(0, beat * 0.18, beat * 0.12);
        if (headRef.current) headRef.current.rotation.set(-0.05, beat * 0.12, beat * 0.08);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.40 + beat * 0.25, 0.15, -0.35 + beat * 0.35);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80 + beat * 0.15, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.40 + beat * 0.25, -0.15, 0.35 + beat * 0.35);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80 + beat * 0.15, 0, 0);
      } else if (stretchPhase < 15.0) {
        const beat = Math.sin(syncT * 1.8);
        const calfRaise = Math.max(0, beat) * 0.045;
        groupRef.current.position.y = basePosY + calfRaise;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.04, 0, 0);
        if (headRef.current) headRef.current.rotation.set(-0.15, 0, 0);
        const armArc = -0.75 + beat * 0.65;
        if (leftArmRef.current) leftArmRef.current.rotation.set(armArc, 0.12, -0.25);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.65 + beat * 0.40, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(armArc, -0.12, 0.25);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.65 + beat * 0.40, 0, 0);
      } else if (stretchPhase < 22.5) {
        const twist = Math.sin(syncT * 1.5);
        groupRef.current.position.y = basePosY;
        if (torsoRef.current) torsoRef.current.rotation.set(0, twist * 0.32, 0);
        if (headRef.current) headRef.current.rotation.set(0, twist * 0.40, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.75, 0.35 + twist * 0.3, -0.4);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.75, -0.35 + twist * 0.3, 0.4);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80, 0, 0);
      } else {
        const dip = Math.sin(syncT * 1.2);
        const dipDepth = -Math.max(0, dip) * 0.06;
        groupRef.current.position.y = basePosY + dipDepth;
        if (torsoRef.current) torsoRef.current.rotation.set(0.06, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.60, 0.15, -Math.abs(dip) * 0.4);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.60, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.60, -0.15, Math.abs(dip) * 0.4);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.60, 0, 0);
      }
      return;
    }

    // ═══ POSE 3: PODIUM SPEAKER ORATOR GESTURING ═══
    if (currentPose === "SPEAKING") {
      const speechT = t * 2.2;
      const gesture = Math.sin(speechT) * 0.28;
      const headTurn = Math.sin(speechT * 0.5) * 0.22;
      const headNod = Math.sin(speechT * 0.9) * 0.06;

      if (headRef.current) headRef.current.rotation.set(headNod, headTurn, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.03, headTurn * 0.15, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45 + gesture * 0.5, 0.35, 0.18);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.75 + gesture * 0.6, 0.1, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.70, -0.15, -0.08);
      if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.95, -0.10, 0);
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🛠️ DYNAMIC FUNCTIONAL JOB ROUTINE KINEMATICS & PROPS ANIMATION
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. GEODETIC SURVEYOR (Johnny Farong-ey)
    if (activeRoutine === "SURVEYOR") {
      const cycle = t % 16.0;
      if (cycle < 5.5) {
        // Phase 1: Looking into optical eyepiece & adjusting fine tangent screw
        const tweak = Math.sin(t * 4.0) * 0.08;
        if (torsoRef.current) torsoRef.current.rotation.set(0.18, -0.05, 0);
        if (headRef.current) headRef.current.rotation.set(0.24, -0.04, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.65, -0.3, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + tweak, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.2, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = true;
      } else if (cycle < 9.5) {
        // Phase 2: Writing EDM measurements into yellow field logbook
        const scribble = Math.sin(t * 8.0) * 0.05;
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.38, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + scribble, -0.15, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = false;
      } else if (cycle < 13.5) {
        // Phase 3: Waving left hand high to signal rodman across mountain slope
        const wave = Math.sin(t * 3.5) * 0.45;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.04, wave * 0.1, 0);
        if (headRef.current) headRef.current.rotation.set(-0.15, wave * 0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.75, 0.2, wave);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.65, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(0.04, 0, 0.06);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.20, 0, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = false;
      } else {
        // Phase 4: Checking digital touchscreen on total station
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.25, 0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55, -0.15, 0.2);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.2, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.40, 0, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = true;
      }
      return;
    }

    // 2. ENGINEERING GEOLOGIST (Amor Floresca Jr.)
    if (activeRoutine === "GEOLOGIST") {
      const cycle = t % 18.0;
      if (cycle < 6.5) {
        // Phase 1: Crouched tapping rock joint with geological hammer
        const hammerStrike = Math.sin(t * 5.5);
        groupRef.current.position.y = position[1] - 0.25;
        if (leftLegRef.current) leftLegRef.current.rotation.set(0.45, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(0.35, 0, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.35, 0.15, 0);
        if (headRef.current) headRef.current.rotation.set(0.45, -0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.70, -0.2, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.90 + hammerStrike * 0.45, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.35, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.55, 0.1, 0);
      } else if (cycle < 12.0) {
        // Phase 2: Measuring rock discontinuity strike/dip with Clar compass
        groupRef.current.position.y = position[1] - 0.15;
        if (torsoRef.current) torsoRef.current.rotation.set(0.28, 0.2, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0.25, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, 0.4, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.45, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.65, -0.1, 0);
      } else {
        // Phase 3: Standing up, logging RMR rock mass parameters on tablet
        const tap = Math.sin(t * 4.0) * 0.04;
        groupRef.current.position.y = position[1];
        if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.32, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.3, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.25, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + tap, -0.15, 0);
      }
      return;
    }

    // 3. TUNNEL QC ENGINEER (Engr. Jairuz Batac)
    if (activeRoutine === "TUNNEL_QC") {
      const cycle = t % 16.0;
      if (cycle < 6.5) {
        // Phase 1: Aiming laser meter up at tunnel arch crown
        const scan = Math.sin(t * 1.8) * 0.08;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.12, scan * 0.5, 0);
        if (headRef.current) headRef.current.rotation.set(-0.35 + scan, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.05 + scan, -0.15, -0.08);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.05, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.25, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.50, 0.1, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = true;
      } else if (cycle < 11.5) {
        // Phase 2: Logging rock bolt pull-out test data on rugged tablet
        const typeMotion = Math.sin(t * 6.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + typeMotion, -0.15, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = false;
      } else {
        // Phase 3: Lateral inspection patrol along portal bench
        const step = Math.sin(t * 2.0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.04, step * 0.15, 0);
        if (headRef.current) headRef.current.rotation.set(0.1, step * 0.2, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.2, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.40, -0.2, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.45, -0.1, 0);
        if (laserBeamRef.current) laserBeamRef.current.visible = false;
      }
      return;
    }

    // 4. TUNNEL & UNDERGROUND FOREMEN (Richard Pinasen & Rudy Marcos)
    if (activeRoutine === "TUNNEL_FOREMAN") {
      const cycle = t % 14.0;
      if (cycle < 5.0) {
        // Phase 1: Directing mucking cycles with two-handed marshalling sweep signals
        const sweep = Math.sin(t * 3.0) * 0.35;
        if (torsoRef.current) torsoRef.current.rotation.set(0.05, sweep * 0.2, 0);
        if (headRef.current) headRef.current.rotation.set(-0.08, sweep * 0.3, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.05 + sweep, 0.3, -0.4);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85, 0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.05 - sweep, -0.3, 0.4);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
      } else if (cycle < 9.5) {
        // Phase 2: Inspecting steel arch rib alignment with spirit level
        if (torsoRef.current) torsoRef.current.rotation.set(0.15, -0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.28, -0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, 0.3, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.40, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.50, -0.1, 0);
      } else {
        // Phase 3: Radioing tunnel heading blast advance status
        const nod = Math.sin(t * 2.5) * 0.08;
        if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, 0);
        if (headRef.current) headRef.current.rotation.set(nod, 0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.75, -0.25, -0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.10, -0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.25, 0.05);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
      }
      return;
    }

    // 5. JUMBO DRILL RIG OPERATOR (Benjamin Fomeg-as)
    if (activeRoutine === "JUMBO_OPERATOR") {
      const leverL = Math.sin(t * 2.2) * 0.25;
      const leverR = Math.cos(t * 2.2) * 0.25;
      const tremor = Math.sin(t * 12.0) * 0.006;
      groupRef.current.position.y = position[1] + tremor;
      if (torsoRef.current) torsoRef.current.rotation.set(0.18, tremor * 3.0, 0);
      if (headRef.current) headRef.current.rotation.set(0.12, 0, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, 0.15, 0);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.75 + leverL, 0.1, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55, -0.15, 0);
      if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.75 + leverR, -0.1, 0);
      return;
    }

    // 6. MECHANICAL SUPERINTENDENT (Eugenio Hanopol)
    if (activeRoutine === "MECHANICAL_SUPT") {
      const cycle = t % 16.0;
      if (cycle < 6.0) {
        // Leaning over turbine pit railing inspecting shaft coupling runout
        const test = Math.sin(t * 3.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.22, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.65 + test, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.3, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.55, 0.1, 0);
      } else if (cycle < 11.0) {
        // Reviewing vibration FFT harmonics on tablet
        const tap = Math.sin(t * 5.0) * 0.03;
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + tap, -0.15, 0);
      } else {
        // Inspecting hydraulic governor valve
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0.15, 0);
        if (headRef.current) headRef.current.rotation.set(0.22, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55, -0.3, 0.2);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.65, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.2, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.40, 0, 0);
      }
      return;
    }

    // 7. ELECTRICAL SUPERINTENDENT & SUPERVISOR (Eduardo De Francia & Josue Abellera)
    if (activeRoutine === "ELECTRICAL_SUPT" || activeRoutine === "ELECTRICAL_SUPERVISOR") {
      const cycle = t % 15.0;
      if (cycle < 6.0) {
        // Aiming thermal IR gun at 69kV porcelain bushings & CT/PT
        const scan = Math.sin(t * 1.5) * 0.1;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.1, scan * 0.5, 0);
        if (headRef.current) headRef.current.rotation.set(-0.35, scan, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.95 + scan, -0.2, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.25, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.50, 0.1, 0);
      } else if (cycle < 10.5) {
        // Probing IPB busduct terminals with multimeter test leads
        const probe = Math.sin(t * 3.5) * 0.05;
        if (torsoRef.current) torsoRef.current.rotation.set(0.15, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.3, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, 0.25, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80 + probe, 0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55, -0.25, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80 - probe, -0.15, 0);
      } else {
        // Two-way radio check reporting clearance
        const nod = Math.sin(t * 2.5) * 0.08;
        if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, 0);
        if (headRef.current) headRef.current.rotation.set(nod, 0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.75, -0.25, -0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.10, -0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.25, 0.05);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
      }
      return;
    }

    // 8. TECHNICAL ENGINEERING HEAD (Engr. Noel Lavapie)
    if (activeRoutine === "TECHNICAL_HEAD") {
      const cycle = t % 16.0;
      if (cycle < 7.0) {
        // Leaning over blueprint drafting table measuring invert elevation with scale ruler
        const rulerMotion = Math.sin(t * 2.5) * 0.12;
        if (torsoRef.current) torsoRef.current.rotation.set(0.28, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.42, rulerMotion * 0.5, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.60, -0.25, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.90 + rulerMotion, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.50, 0.35, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80, 0.2, 0);
      } else if (cycle < 12.0) {
        // Calculating rebar bar-bending schedules on binder
        const write = Math.sin(t * 6.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.18, 0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0.15, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + write, -0.15, 0);
      } else {
        // Pointing at CAD detail
        if (torsoRef.current) torsoRef.current.rotation.set(0.15, -0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.25, -0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.75, -0.15, 0.2);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.2, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
      }
      return;
    }

    // 9. AUTOCAD OPERATOR (Elbert Figuracion)
    if (activeRoutine === "CAD_OPERATOR") {
      const mouse = Math.sin(t * 4.5) * 0.08;
      const type = Math.sin(t * 9.0) * 0.04;
      const screenGlance = Math.sin(t * 1.2) * 0.22;
      if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0.18, screenGlance, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.48, 0.3, 0);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85 + type, 0.15, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.48, -0.3, 0);
      if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + mouse, -0.15, 0);
      return;
    }

    // 10. DOCUMENT CONTROLLER (Jayson Aggabao) — Seated at Office Desk Working on Laptop & Documents
    if (activeRoutine === "DOC_CONTROLLER" || currentPose === "SEATED") {
      const workCycle = t % 14.0;
      // Sitting legs pose (pre-shaped geometry)
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);

      if (workCycle < 7.0) {
        // Typing on Lenovo Laptop keyboard & reviewing documents
        const typingL = Math.sin(t * 7.0) * 0.04;
        const typingR = Math.cos(t * 7.5) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.14, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.32, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.22, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85 + typingL, 0.12, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.45, -0.22, -0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + typingR, -0.12, 0);
      } else if (workCycle < 11.0) {
        // Using optical mouse and inspecting document sheet
        const mouseMove = Math.sin(t * 3.0) * 0.03;
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, -0.05, 0);
        if (headRef.current) headRef.current.rotation.set(0.28, -0.05, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.30, 0.15);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80, 0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.48, -0.25, 0.05);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + mouseMove, -0.12, 0);
      } else {
        // Checking and turning document page
        const pageTurn = Math.sin(t * 2.5) * 0.10;
        if (torsoRef.current) torsoRef.current.rotation.set(0.16, 0.06, 0);
        if (headRef.current) headRef.current.rotation.set(0.36, 0.06, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.48, 0.20, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.88 + pageTurn, 0.12, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.45, -0.20, -0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80, -0.12, 0);
      }
      return;
    }

    // 11. QUANTITY SURVEYOR (Cristine Joy Almazan)
    if (activeRoutine === "QUANTITY_SURVEYOR") {
      const wheelRoll = Math.sin(t * 3.0) * 0.14;
      if (torsoRef.current) torsoRef.current.rotation.set(0.22, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0.38, wheelRoll * 0.4, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.60, -0.25, 0.1);
      if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80 + wheelRoll, -0.1, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0);
      if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
      return;
    }

    // 12. JR QA/QC ENGINEER (Jhon Charles Jayme)
    if (activeRoutine === "JR_QAQC_ENGR") {
      const slumpCycle = t % 16.0;
      if (slumpCycle < 6.5) {
        // Tamping fresh concrete in slump cone (25 strokes with steel rod)
        const tamping = Math.sin(t * 8.0) * 0.25;
        if (torsoRef.current) torsoRef.current.rotation.set(0.28, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.42, 0, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.60, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + tamping * 0.4, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.35, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.55, 0.1, 0);
      } else if (slumpCycle < 11.0) {
        // Lifting slump cone upward
        const lift = Math.min(1.0, (slumpCycle - 6.5) / 2.0);
        if (torsoRef.current) torsoRef.current.rotation.set(0.25 - lift * 0.15, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.38, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55 + lift * 0.2, 0.3, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.80 - lift * 0.3, 0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.55 + lift * 0.2, -0.3, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.80 - lift * 0.3, -0.1, 0);
      } else {
        // Measuring slump mm with steel rule and logging ticket
        const write = Math.sin(t * 5.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + write, -0.15, 0);
      }
      return;
    }

    // 13. EXECUTIVE MANAGEMENT (PM Romeo Sese & Deputy PM Nathaniel Principe)
    if (activeRoutine === "EXECUTIVE_PM") {
      const cycle = t % 18.0;
      if (cycle < 8.0) {
        // Reviewing interactive project milestone dashboard on iPad
        const tap = Math.sin(t * 3.5) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.32, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.3, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.25, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + tap, -0.15, 0);
      } else if (cycle < 14.0) {
        // Pointing across valley towards powerhouse and spillway
        const pan = Math.sin(t * 1.5) * 0.15;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.04, pan, 0);
        if (headRef.current) headRef.current.rotation.set(-0.12, pan * 1.5, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85 + pan, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.35, 0.25, 0.05);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.45, 0.1, 0);
      } else {
        // Discussing milestones
        const nod = Math.sin(t * 2.5) * 0.06;
        if (torsoRef.current) torsoRef.current.rotation.set(0.04, 0.1, 0);
        if (headRef.current) headRef.current.rotation.set(nod, 0.2, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.25, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.60, 0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.40, -0.25, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.60, -0.1, 0);
      }
      return;
    }

    // 14. CIVIL SUPERVISOR & CIVIL STRUCTURES FOREMAN (Jaime Caño & Anthony Rosales)
    if (activeRoutine === "CIVIL_SUPERVISOR" || activeRoutine === "CIVIL_FOREMAN") {
      const cycle = t % 14.0;
      if (cycle < 5.5) {
        // Guiding concrete transit mixer chute with arm signals
        const guide = Math.sin(t * 3.0) * 0.3;
        if (torsoRef.current) torsoRef.current.rotation.set(0.05, guide * 0.2, 0);
        if (headRef.current) headRef.current.rotation.set(-0.05, guide * 0.3, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85 + guide, 0.3, -0.2);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.85, 0.1, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85 - guide, -0.3, 0.2);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85, -0.1, 0);
      } else if (cycle < 9.5) {
        // Checking formwork tie-rod torque with heavy wrench
        const ratchet = Math.sin(t * 4.5);
        if (torsoRef.current) torsoRef.current.rotation.set(0.2, -0.1, 0);
        if (headRef.current) headRef.current.rotation.set(0.32, -0.15, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.65, -0.2, 0.1);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.85 + ratchet * 0.3, -0.1, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.40, 0.3, 0);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.55, 0.1, 0);
      } else {
        // Checking rebar clearance spacing with cover gauge on clipboard
        const write = Math.sin(t * 5.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.08, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.35, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.45, 0.35, 0.1);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.95, 0.2, 0);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.50, -0.3, 0.15);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-1.05 + write, -0.15, 0);
      }
      return;
    }

    // DEFAULT NATURAL IDLE & WEIGHT-SHIFTING
    const breath = Math.sin(t * 1.6) * 0.015;
    const weightShift = Math.sin(t * 0.4) * 0.03;
    if (torsoRef.current) torsoRef.current.rotation.set(0, weightShift * 0.5, weightShift * 0.3);
    if (headRef.current) headRef.current.rotation.set(breath * 0.15, weightShift * 0.8, 0);
    if (leftArmRef.current) leftArmRef.current.rotation.set(0.04, 0, -0.06 + breath * 0.05);
    if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.18, 0, 0);
    if (rightArmRef.current) rightArmRef.current.rotation.set(0.04, 0, 0.06 - breath * 0.05);
    if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.18, 0, 0);
    if (pose !== "SEATED") {
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
    }
  });

  const isCrowd = pose === "TOOLBOX_CROWD";

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={bodyScale}
      onClick={(e) => {
        if (onSelectPerson && personnelId) {
          e.stopPropagation();
          onSelectPerson(personnelId);
        }
      }}
      onPointerOver={(e) => {
        if (onSelectPerson && personnelId) {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* 🎯 INVISIBLE RAYCAST COLLIDER FOR EFFORTLESS SELECTION CLICKS */}
      <mesh position={[0, 0.9, 0]} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 🧍 TORSO & CHEST WITH HI-VIS SAFETY VEST & RETROREFLECTIVE BANDS */}
      <group ref={torsoRef} position={[0, pose === "SEATED" ? 0.46 : 0.85, 0]}>
        <mesh position={[0, 0.25, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
          <boxGeometry args={[0.38, 0.46, 0.22]} />
        </mesh>

        {/* 🦺 ANSI/ISEA CLASS 2 RETROREFLECTIVE STRIPES */}
        {hasVest && (
          <>
            <mesh position={[0, 0.35, 0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.15, 0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.35, -0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.15, -0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            {/* Laminated ID Badge */}
            {isCloseUp && (
              <group position={[-0.11, 0.28, 0.12]}>
                <mesh>
                  <boxGeometry args={[0.06, 0.08, 0.01]} />
                  <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.015, 0.006]}>
                  <boxGeometry args={[0.04, 0.035, 0.002]} />
                  <meshStandardMaterial color="#0F172A" roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.025, 0.006]}>
                  <boxGeometry args={[0.05, 0.012, 0.002]} />
                  <meshStandardMaterial color="#0D9488" roughness={0.3} metalness={0.6} />
                </mesh>
              </group>
            )}
          </>
        )}

        {/* 🗣️ HEAD & SAFETY HARD HAT */}
        <group ref={headRef} position={[0, 0.53, 0]}>
          {/* Anatomical Cervical Neck Cylinder — seamlessly bridges head into collar */}
          <mesh position={[0, -0.09, 0.01]} material={skinMat}>
            <cylinderGeometry args={[0.07, 0.085, 0.14, 12]} />
          </mesh>
          <mesh material={skinMat}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
          </mesh>
          {isCloseUp && (
            <>
              <mesh position={[-0.115, 0.01, -0.01]} material={skinMat}>
                <boxGeometry args={[0.015, 0.065, 0.038]} />
              </mesh>
              <mesh position={[0.115, 0.01, -0.01]} material={skinMat}>
                <boxGeometry args={[0.015, 0.065, 0.038]} />
              </mesh>
            </>
          )}

          {/* Hard Hat */}
          {hasHardhat && (
            <group position={[0, 0.13, 0]}>
              <mesh material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
                <boxGeometry args={[0.26, 0.11, 0.28]} />
              </mesh>
              <mesh position={[0, -0.04, 0.06]} material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
                <boxGeometry args={[0.28, 0.02, 0.18]} />
              </mesh>
              {isCloseUp && (
                <mesh position={[0, 0.01, 0.142]} material={MAT_SIGNBOARD_TEAL}>
                  <boxGeometry args={[0.075, 0.04, 0.005]} />
                </mesh>
              )}
            </group>
          )}

          {/* Hair */}
          {hairStyle === "WOMAN_PONYTAIL" && (
            <group position={[0, 0.08, -0.02]}>
              <mesh material={hairMat}>
                <boxGeometry args={[0.23, 0.09, 0.23]} />
              </mesh>
              <mesh position={[0, -0.04, -0.16]} rotation={[0.4, 0, 0]} material={hairMat}>
                <cylinderGeometry args={[0.035, 0.02, 0.22, 8]} />
              </mesh>
            </group>
          )}
          {!hasHardhat && hairStyle === "SHORT" && (
            <mesh position={[0, 0.11, -0.01]} material={hairMat}>
              <boxGeometry args={[0.23, 0.06, 0.23]} />
            </mesh>
          )}

          {/* Eyes, Facial Hair & Glasses (Fidelity LOD) */}
          {isCloseUp && (
            <>
              {/* Eyes */}
              <group ref={eyeOpenRef} position={[0, 0.02, 0.112]}>
                <mesh position={[-0.05, 0, 0]}>
                  <planeGeometry args={[0.04, 0.025]} />
                  <meshBasicMaterial color="#0F172A" />
                </mesh>
                <mesh position={[0.05, 0, 0]}>
                  <planeGeometry args={[0.04, 0.025]} />
                  <meshBasicMaterial color="#0F172A" />
                </mesh>
              </group>
              <group ref={eyeClosedRef} position={[0, 0.02, 0.112]} visible={false}>
                <mesh position={[-0.05, 0, 0]}>
                  <planeGeometry args={[0.04, 0.006]} />
                  <meshBasicMaterial color="#334155" />
                </mesh>
                <mesh position={[0.05, 0, 0]}>
                  <planeGeometry args={[0.04, 0.006]} />
                  <meshBasicMaterial color="#334155" />
                </mesh>
              </group>

              {/* Facial Hair */}
              {facialHair === "STUBBLE" && (
                <mesh position={[0, -0.06, 0.112]}>
                  <planeGeometry args={[0.12, 0.05]} />
                  <meshBasicMaterial color="#1E293B" transparent opacity={0.6} />
                </mesh>
              )}
              {facialHair === "MUSTACHE" && (
                <mesh position={[0, -0.04, 0.114]} material={MAT_MUSTACHE_BLACK}>
                  <boxGeometry args={[0.08, 0.02, 0.01]} />
                </mesh>
              )}
              {facialHair === "GOATEE" && (
                <group position={[0, -0.085, 0.105]}>
                  <mesh position={[0, 0.045, 0.02]} material={MAT_MUSTACHE_BLACK}>
                    <boxGeometry args={[0.08, 0.018, 0.012]} />
                  </mesh>
                  <mesh material={MAT_MUSTACHE_BLACK}>
                    <boxGeometry args={[0.045, 0.050, 0.035]} />
                  </mesh>
                </group>
              )}

              {/* Safety Glasses */}
              {hasGlasses && (
                <group position={[0, 0.035, 0.125]}>
                  <mesh position={[-0.052, 0, 0]} material={MAT_STEEL_DARK}>
                    <boxGeometry args={[0.048, 0.032, 0.008]} />
                  </mesh>
                  <mesh position={[0.052, 0, 0]} material={MAT_STEEL_DARK}>
                    <boxGeometry args={[0.048, 0.032, 0.008]} />
                  </mesh>
                </group>
              )}
            </>
          )}
        </group>

        {/* 🤲 CLASPED PRAYING HANDS */}
        <group ref={prayingHandsRef} position={[0, 0.18, 0.22]} visible={false}>
          <mesh material={skinMat}>
            <boxGeometry args={[0.08, 0.09, 0.07]} />
          </mesh>
        </group>

        {/* 🦾 ARTICULATED TWO-SEGMENT LEFT ARM (SHOULDER + FOREARM + SCULPTED HAND) */}
        <group ref={leftArmRef} position={[-0.24, 0.40, 0]}>
          {/* Upper Arm (Deltoid to Bicep / Tricep) */}
          <mesh position={[0, -0.13, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.26, 0.095]} />
          </mesh>

          {/* Articulated Forearm (Elbow Joint) */}
          <group ref={leftForearmRef} position={[0, -0.26, 0]}>
            {/* Forearm Sleeve */}
            <mesh position={[0, -0.12, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
              <boxGeometry args={[0.085, 0.24, 0.085]} />
            </mesh>
            {/* Sculpted Hand with Yellow Safety Grip Gloves */}
            <mesh position={[0, -0.24, 0.01]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.08, 0.08, 0.075]} />
            </mesh>

            {/* Handheld Props Attached Directly to Left Hand */}
            {(accessory === "CLIPBOARD" || activeRoutine === "QUANTITY_SURVEYOR" || activeRoutine === "CIVIL_4S_SUPERVISOR") && (
              <group position={[0, -0.26, 0.12]}>
                <mesh material={MAT_WOOD_HANDLE}>
                  <boxGeometry args={[0.22, 0.32, 0.015]} />
                </mesh>
                <mesh position={[0, 0, 0.01]} material={MAT_WHITE_PAINT}>
                  <boxGeometry args={[0.19, 0.28, 0.005]} />
                </mesh>
              </group>
            )}
            {(accessory === "TABLET" || activeRoutine === "EXECUTIVE_PM" || activeRoutine === "IT_SPECIALIST" || activeRoutine === "MECHANICAL_SUPT") && (
              <group position={[0, -0.26, 0.12]}>
                <mesh material={MAT_PHONE_BODY}>
                  <boxGeometry args={[0.24, 0.18, 0.015]} />
                </mesh>
                <mesh position={[0, 0, 0.01]} material={MAT_PHONE_SCREEN_GLOW}>
                  <boxGeometry args={[0.22, 0.16, 0.005]} />
                </mesh>
              </group>
            )}
            {(accessory === "BINDER" || activeRoutine === "TECHNICAL_HEAD" || activeRoutine === "ELECTRICAL_FOREMAN") && (
              <group position={[0, -0.26, 0.12]}>
                <mesh material={MAT_SIGNBOARD_TEAL}>
                  <boxGeometry args={[0.25, 0.32, 0.05]} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* 🦾 ARTICULATED TWO-SEGMENT RIGHT ARM (SHOULDER + FOREARM + SCULPTED HAND) */}
        <group ref={rightArmRef} position={[0.24, 0.40, 0]}>
          {/* Upper Arm */}
          <mesh position={[0, -0.13, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.26, 0.095]} />
          </mesh>

          {/* Articulated Forearm (Elbow Joint) */}
          <group ref={rightForearmRef} position={[0, -0.26, 0]}>
            {/* Forearm Sleeve */}
            <mesh position={[0, -0.12, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
              <boxGeometry args={[0.085, 0.24, 0.085]} />
            </mesh>
            {/* Sculpted Hand with Yellow Safety Grip Gloves */}
            <mesh position={[0, -0.24, 0.01]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.08, 0.08, 0.075]} />
            </mesh>

            {/* Right Hand Tool Props Attached Directly to Right Hand */}
            {accessory === "MIC" && (
              <group position={[0, -0.26, 0.05]}>
                <mesh material={MAT_STEEL_DARK}>
                  <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
                </mesh>
                <mesh position={[0, 0.07, 0]}>
                  <sphereGeometry args={[0.025, 8, 8]} />
                  <meshStandardMaterial color="#94A3B8" roughness={0.3} metalness={0.8} />
                </mesh>
              </group>
            )}

            {(accessory === "RADIO" || activeRoutine === "TUNNEL_FOREMAN" || activeRoutine === "ELECTRICAL_SUPT") && (
              <group position={[0, -0.26, 0.08]}>
                <mesh material={MAT_STEEL_DARK}>
                  <boxGeometry args={[0.05, 0.13, 0.035]} />
                </mesh>
                <mesh position={[-0.015, 0.10, 0]} material={MAT_STEEL_DARK}>
                  <cylinderGeometry args={[0.004, 0.004, 0.14, 6]} />
                </mesh>
              </group>
            )}

            {activeRoutine === "GEOLOGIST" && (
              <group position={[0, -0.29, 0.08]}>
                <mesh material={MAT_STEEL_FRAME}>
                  <cylinderGeometry args={[0.015, 0.015, 0.35, 6]} />
                </mesh>
                <mesh position={[0, 0.18, 0.04]} material={MAT_STEEL_DARK}>
                  <boxGeometry args={[0.04, 0.06, 0.18]} />
                </mesh>
              </group>
            )}

            {activeRoutine === "CIVIL_FOREMAN" && (
              <group position={[0, -0.29, 0.08]}>
                <mesh material={MAT_CHROME}>
                  <cylinderGeometry args={[0.018, 0.018, 0.45, 8]} />
                </mesh>
                <mesh position={[0, 0.22, 0.03]} material={MAT_STEEL_DARK}>
                  <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
                </mesh>
              </group>
            )}

            {activeRoutine === "TUNNEL_QC" && (
              <group position={[0, -0.26, 0.08]}>
                <mesh material={MAT_YELLOW_SAFETY}>
                  <boxGeometry args={[0.055, 0.12, 0.04]} />
                </mesh>
                <mesh position={[0, 0.07, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
                  <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>

      {/* 🥾 LEGS & SAFETY BOOTS */}
      {pose === "SEATED" ? (
        /* Seated Leg Anatomy: Thighs forward, calves down, boots on floor */
        <group position={[0, 0.46, 0]}>
          {/* Left Seated Leg */}
          <group ref={leftLegRef} position={[-0.10, 0, 0]}>
            {/* Horizontal Upper Thigh */}
            <mesh position={[0, 0.02, 0.18]} material={pantsMat}>
              <boxGeometry args={[0.13, 0.12, 0.36]} />
            </mesh>
            {/* Vertical Lower Shin / Calf */}
            <mesh position={[0, -0.20, 0.32]} material={pantsMat}>
              <boxGeometry args={[0.12, 0.34, 0.12]} />
            </mesh>
            {/* Boot on Floor */}
            <mesh position={[0, -0.39, 0.36]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.13, 0.08, 0.20]} />
            </mesh>
          </group>

          {/* Right Seated Leg */}
          <group ref={rightLegRef} position={[0.10, 0, 0]}>
            {/* Horizontal Upper Thigh */}
            <mesh position={[0, 0.02, 0.18]} material={pantsMat}>
              <boxGeometry args={[0.13, 0.12, 0.36]} />
            </mesh>
            {/* Vertical Lower Shin / Calf */}
            <mesh position={[0, -0.20, 0.32]} material={pantsMat}>
              <boxGeometry args={[0.12, 0.34, 0.12]} />
            </mesh>
            {/* Boot on Floor */}
            <mesh position={[0, -0.39, 0.36]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.13, 0.08, 0.20]} />
            </mesh>
          </group>
        </group>
      ) : (
        /* Standing / Walking Legs */
        <>
          <group ref={leftLegRef} position={[-0.10, 0.85, 0]}>
            <mesh position={[0, -0.42, 0]} material={pantsMat}>
              <boxGeometry args={[0.14, 0.78, 0.14]} />
            </mesh>
            <mesh position={[0, -0.83, 0.03]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
            </mesh>
          </group>

          <group ref={rightLegRef} position={[0.10, 0.85, 0]}>
            <mesh position={[0, -0.42, 0]} material={pantsMat}>
              <boxGeometry args={[0.14, 0.78, 0.14]} />
            </mesh>
            <mesh position={[0, -0.83, 0.03]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.14, 0.12, 0.22]} />
            </mesh>
          </group>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          🔧 ROLE-SPECIFIC 3D INDUSTRIAL WORKPLACE PROPS & EQUIPMENT SETS
         ═══════════════════════════════════════════════════════════════════════ */}

      {/* A. LEICA GEODETIC TOTAL STATION ON ALUMINIUM SURVEYOR TRIPOD (Johnny Farong-ey) */}
      {activeRoutine === "SURVEYOR" && (
        <group position={[0, 0, 0.75]}>
          {/* Tripod Legs */}
          {[-0.25, 0.25].map((xOff, i) => (
            <mesh key={`leg-${i}`} position={[xOff, 0.65, -0.15]} rotation={[0.15, 0, xOff > 0 ? -0.25 : 0.25]} material={MAT_YELLOW_SAFETY}>
              <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
            </mesh>
          ))}
          <mesh position={[0, 0.65, 0.35]} rotation={[-0.3, 0, 0]} material={MAT_YELLOW_SAFETY}>
            <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
          </mesh>
          {/* Tribrach Mounting Plate */}
          <mesh position={[0, 1.32, 0]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 8]} />
          </mesh>
          {/* Leica Total Station Body */}
          <mesh position={[0, 1.50, 0]} material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[0.18, 0.28, 0.18]} />
          </mesh>
          {/* Optical Sighting Telescope */}
          <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.035, 0.035, 0.28, 12]} />
          </mesh>
          {/* Touchscreen Display */}
          <mesh position={[0, 1.48, -0.095]} material={MAT_PHONE_SCREEN_GLOW}>
            <planeGeometry args={[0.12, 0.10]} />
          </mesh>
          {/* Pulsating EDM Laser Beam */}
          <mesh ref={laserBeamRef} position={[0, 1.55, 6.0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 12.0, 6]} />
            <meshBasicMaterial color="#EF4444" transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* B. CONCRETE SLUMP TESTING PAD & TAMPING ROD (Jhon Charles Jayme) */}
      {activeRoutine === "JR_QAQC_ENGR" && (
        <group position={[0, 0, 0.65]}>
          {/* Heavy Steel Slump Plate */}
          <mesh position={[0, 0.02, 0]} material={MAT_FOOD_STAINLESS_COUNTER}>
            <boxGeometry args={[0.65, 0.04, 0.65]} />
          </mesh>
          {/* Slump Cone Frustum */}
          <mesh position={[0, 0.18, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
            <cylinderGeometry args={[0.10, 0.18, 0.30, 16, 1, true]} />
          </mesh>
          {/* Steel Tamping Rod */}
          <mesh position={[0.22, 0.25, 0]} rotation={[0, 0, 0.1]} material={MAT_CHROME}>
            <cylinderGeometry args={[0.012, 0.012, 0.60, 8]} />
          </mesh>
        </group>
      )}

      {/* C. ENGINEERING BLUEPRINT DRAFTING TABLE (Engr. Noel Lavapie) */}
      {activeRoutine === "TECHNICAL_HEAD" && (
        <group position={[0, 0, 0.65]}>
          {/* Drafting Table Stand */}
          <mesh position={[0, 0.45, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[1.2, 0.9, 0.6]} />
          </mesh>
          {/* Angled White Drafting Board */}
          <mesh position={[0, 0.92, 0]} rotation={[0.25, 0, 0]} material={MAT_WHITE_PAINT}>
            <boxGeometry args={[1.4, 0.04, 0.9]} />
          </mesh>
          {/* A1 Blueprint Sheet */}
          <mesh position={[0, 0.95, 0]} rotation={[0.25, 0, 0]} material={MAT_PHONE_SCREEN_GLOW}>
            <planeGeometry args={[1.18, 0.75]} />
          </mesh>
        </group>
      )}

      {/* D. CADD DUAL-MONITOR WORKSTATION (Elbert Figuracion) */}
      {activeRoutine === "CAD_OPERATOR" && (
        <group position={[0, 0, 0.65]}>
          <mesh position={[0, 0.45, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[1.3, 0.9, 0.6]} />
          </mesh>
          {/* Left 2D Plan Monitor */}
          <mesh position={[-0.32, 1.15, 0]} rotation={[0, 0.15, 0]} material={MAT_PHONE_SCREEN_GLOW}>
            <boxGeometry args={[0.48, 0.32, 0.03]} />
          </mesh>
          {/* Right 3D Model Monitor */}
          <mesh position={[0.32, 1.15, 0]} rotation={[0, -0.15, 0]} material={MAT_PHONE_SCREEN_GLOW}>
            <boxGeometry args={[0.48, 0.32, 0.03]} />
          </mesh>
        </group>
      )}
    </group>
  );
}




/* ═══════════════════════════════════════════════════════════════════════════
   2. TUESDAY MORNING SAFETY TOOLBOX MEETING DIRECTOR & WORKFORCE FORMATION
   ═══════════════════════════════════════════════════════════════════════════ */

export function CourtToolboxMeetingDirector({
  onSelectPerson,
}: {
  onSelectPerson?: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const COURT_CENTER = useMemo(() => new THREE.Vector3(128.0, 14.10, -80.0), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const distSq = camera.position.distanceToSquared(COURT_CENTER);
    const inRange = distSq < 32400; // 180 meters
    if (groupRef.current.visible !== inRange) {
      groupRef.current.visible = inRange;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── KEY HEADS, SUPERVISORS & ENGINEERS (ON STAGE WITH WHITE HARD HATS) ── */}
      <HydroProjectPersonMesh
        personnelId="ESH_ALFREDO_ARIZ"
        onSelectPerson={onSelectPerson}
        speakerType="SAFETY_HEAD"
        role="SAFETY_HEAD"
        skinTone="BRONZE"
        hairStyle="BALD"
        hasGlasses
        hasHardhat
        hardhatColor="#FFFFFF"
        pantsStyle="JEANS"
        vestColor="#EA580C"
        accessory="MIC"
        bodyScale={[1.05, 1.0, 1.05]}
      />

      <HydroProjectPersonMesh
        personnelId="HR_ROVIGAIL_ABELLAR"
        onSelectPerson={onSelectPerson}
        speakerType="HR_HEAD"
        role="HR_OFFICER"
        gender="FEMALE"
        skinTone="LIGHT"
        hairStyle="WOMAN_PONYTAIL"
        hairColor="BLACK"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#1D4ED8"
        pantsStyle="CHARCOAL_OFFICE"
        bodyScale={[1.15, 0.96, 1.15]}
      />

      <HydroProjectPersonMesh
        personnelId="PM_ROMEO_SESE"
        onSelectPerson={onSelectPerson}
        speakerType="PROJECT_MANAGER"
        role="PROJECT_MANAGER"
        skinTone="LIGHT"
        hairStyle="SHORT"
        hairColor="SALT_PEPPER"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasBeard
        pantsStyle="KHAKI"
        vestColor="#EA580C"
        bodyScale={[1.08, 1.0, 1.08]}
      />

      {/* ═══ LEFT FORMATION LINE (X = 123.5) - SITE NURSE & PLANNING ENGINEER ═══ */}
      {/* Site Nurse */}
      <HydroProjectPersonMesh
        personnelId="NURSE_RUSSELLE_ALCANTARA"
        onSelectPerson={onSelectPerson}
        position={[123.5, 14.10, -81.0]}
        rotation={[0, Math.PI, 0]}
        gender="FEMALE"
        role="SITE_NURSE"
        skinTone="LIGHT"
        hairStyle="WOMAN_PONYTAIL"
        hairColor="AUBURN"
        pantsStyle="MAONG_JEANS"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0D9488"
        bodyScale={[0.96, 1.0, 0.96]}
        pose="TOOLBOX_CROWD"
      />

      {/* Field Engineer in Attendance */}
      <HydroProjectPersonMesh
        onSelectPerson={onSelectPerson}
        position={[123.5, 14.10, -76.5]}
        rotation={[0, Math.PI, 0]}
        gender="MALE"
        role="PLANNING_ENGINEER"

        skinTone="MEDIUM"
        hairStyle="SHORT"
        hairColor="BLACK"
        pantsStyle="CHARCOAL_OFFICE"
        hasGlasses
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        hasBeard
        accessory="BINDER"
        bodyScale={[1.0, 1.0, 1.0]}
        pose="TOOLBOX_CROWD"
      />

      {/* ═══ ASSEMBLED WORKFORCE FORMATION (2 SPACED ROWS × 3 COLUMNS) ═══ */}
      {/* Row 1 (Front Row, Z = -79.5) */}
      <HydroProjectPersonMesh
        position={[126.0, 14.10, -79.5]}
        rotation={[0, Math.PI, 0]}
        skinTone="BRONZE"
        pantsStyle="CARGO"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        shiftOffset={0}
        pose="TOOLBOX_CROWD"
      />
      <HydroProjectPersonMesh
        position={[128.5, 14.10, -79.5]}
        rotation={[0, Math.PI, 0]}
        skinTone="MEDIUM"
        pantsStyle="JEANS"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        shiftOffset={7.5}
        pose="TOOLBOX_CROWD"
      />
      <HydroProjectPersonMesh
        position={[131.0, 14.10, -79.5]}
        rotation={[0, Math.PI, 0]}
        skinTone="LIGHT"
        pantsStyle="JEANS"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EAB308"
        shiftOffset={15.0}
        pose="TOOLBOX_CROWD"
      />

      {/* Row 2 (Back Row, Z = -75.0) */}
      <HydroProjectPersonMesh
        position={[126.0, 14.10, -75.0]}
        rotation={[0, Math.PI, 0]}
        skinTone="DEEP"
        pantsStyle="CARGO"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        shiftOffset={22.5}
        pose="TOOLBOX_CROWD"
      />
      <HydroProjectPersonMesh
        position={[128.5, 14.10, -75.0]}
        rotation={[0, Math.PI, 0]}
        skinTone="BRONZE"
        pantsStyle="JEANS"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#15803D"
        shiftOffset={30.0}
        pose="TOOLBOX_CROWD"
      />
      <HydroProjectPersonMesh
        position={[131.0, 14.10, -75.0]}
        rotation={[0, Math.PI, 0]}
        skinTone="MEDIUM"
        pantsStyle="CARGO"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EAB308"
        shiftOffset={37.5}
        pose="TOOLBOX_CROWD"
      />

      {/* Sideline Worker / Driver */}
      <HydroProjectPersonMesh
        position={[133.2, 14.10, -77.5]}
        rotation={[0, Math.PI, 0]}
        gender="MALE"
        skinTone="MEDIUM"
        hasHardhat
        hardhatColor="#16A34A"
        vestColor="#EA580C"
        pantsStyle="JEANS"
        bodyScale={[1.05, 1.04, 1.05]}
        shiftOffset={18.5}
        pose="TOOLBOX_CROWD"
      />
    </group>
  );
}

// ─── FILIPINO 3-ON-3 BASKETBALL MATCH (SUNSET RECREATION ROUTINE) ───────────
function BasketballPlayerMesh({
  jerseyColor = "#DC2626",
  shortsColor = "#1E293B",
  skinTone = "MEDIUM",
  bodyScale = [1, 1, 1],
  isDribbling = false,
  isDefending = false,
}: {
  jerseyColor?: string;
  shortsColor?: string;
  skinTone?: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
  bodyScale?: [number, number, number];
  isDribbling?: boolean;
  isDefending?: boolean;
}) {
  const skinMat =
    skinTone === "LIGHT"
      ? MAT_SKIN_LIGHT
      : skinTone === "BRONZE"
      ? MAT_SKIN_BRONZE
      : skinTone === "DEEP"
      ? MAT_SKIN_DEEP
      : MAT_SKIN_MEDIUM;

  return (
    <group scale={bodyScale}>
      {/* Torso / Sando Jersey */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.38, 0.52, 0.22]} />
        <meshStandardMaterial color={jerseyColor} roughness={0.7} />
      </mesh>

      {/* Anatomical Cervical Neck */}
      <mesh position={[0, 1.43, 0]} material={skinMat}>
        <cylinderGeometry args={[0.065, 0.08, 0.12, 12]} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.54, 0]} material={skinMat}>
        <boxGeometry args={[0.20, 0.22, 0.20]} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.66, -0.02]} material={MAT_HAIR_BLACK}>
        <boxGeometry args={[0.22, 0.08, 0.22]} />
      </mesh>

      {/* Bare Shoulders & Arms */}
      <group
        position={[-0.24, 1.30, 0]}
        rotation={isDefending ? [-0.8, -0.6, -0.4] : isDribbling ? [-0.6, 0.2, 0] : [0, 0, -0.1]}
      >
        <mesh position={[0, -0.22, 0]} material={skinMat}>
          <boxGeometry args={[0.09, 0.44, 0.09]} />
        </mesh>
      </group>
      <group
        position={[0.24, 1.30, 0]}
        rotation={isDefending ? [-0.8, 0.6, 0.4] : isDribbling ? [-0.9, -0.3, 0] : [0, 0, 0.1]}
      >
        <mesh position={[0, -0.22, 0]} material={skinMat}>
          <boxGeometry args={[0.09, 0.44, 0.09]} />
        </mesh>
      </group>

      {/* Basketball Shorts */}
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.39, 0.32, 0.24]} />
        <meshStandardMaterial color={shortsColor} roughness={0.75} />
      </mesh>

      {/* Athletic Legs */}
      <mesh position={[-0.10, 0.42, 0]} material={skinMat}>
        <cylinderGeometry args={[0.055, 0.045, 0.46, 6]} />
      </mesh>
      <mesh position={[0.10, 0.42, 0]} material={skinMat}>
        <cylinderGeometry args={[0.055, 0.045, 0.46, 6]} />
      </mesh>

      {/* High-Top Basketball Sneakers */}
      <mesh position={[-0.10, 0.10, 0.04]}>
        <boxGeometry args={[0.12, 0.14, 0.26]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      <mesh position={[0.10, 0.10, 0.04]}>
        <boxGeometry args={[0.12, 0.14, 0.26]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
    </group>
  );
}

function TemfacilBasketballGame({ onSelectPerson }: { onSelectPerson?: (id: string) => void }) {
  const courtRef = useRef<THREE.Group>(null);

  const ballRef = useRef<THREE.Group>(null);
  const p1Ref = useRef<THREE.Group>(null); // Point Guard (Red Team) - Ball Handler
  const p2Ref = useRef<THREE.Group>(null); // On-ball Defender (Blue Team)
  const p3Ref = useRef<THREE.Group>(null); // Wing Cutter (Red Team)
  const p4Ref = useRef<THREE.Group>(null); // Wing Defender (Blue Team)
  const p5Ref = useRef<THREE.Group>(null); // Post Center (Red Team)
  const p6Ref = useRef<THREE.Group>(null); // Post Defender (Blue Team)
  const spec1Ref = useRef<THREE.Group>(null); // Bench Spectator 1
  const spec2Ref = useRef<THREE.Group>(null); // Bench Spectator 2

  useFrame(({ clock }) => {
    if (!courtRef.current || !courtRef.current.visible) return;
    const t = clock.getElapsedTime();

    // Game loop timing: 14-second shot cycle
    const cycle = (t * 0.45) % 14.0;

    // Ball handler motion (Top of the key)
    if (p1Ref.current) {
      if (cycle < 7.0) {
        // Dribbling at top of key, crossover rhythm
        const p1X = Math.sin(t * 1.8) * 1.5;
        const p1Z = 2.5 + Math.cos(t * 0.9) * 0.5;
        p1Ref.current.position.set(p1X, 0, p1Z);
        p1Ref.current.rotation.y = Math.PI + Math.sin(t * 1.5) * 0.2;
      } else if (cycle < 10.5) {
        // Drive towards the basket
        const driveT = (cycle - 7.0) / 3.5;
        const driveX = Math.sin(driveT * Math.PI) * 0.8;
        const driveZ = 2.5 - driveT * 5.0;
        const jumpY = Math.sin(driveT * Math.PI) * 0.65;
        p1Ref.current.position.set(driveX, jumpY, driveZ);
        p1Ref.current.rotation.y = Math.PI;
      } else {
        p1Ref.current.position.set(0, 0, 0.5);
        p1Ref.current.rotation.y = Math.PI;
      }
    }

    // Defender tracking
    if (p2Ref.current) {
      if (cycle < 7.0) {
        const p2X = Math.sin(t * 1.8) * 1.3;
        p2Ref.current.position.set(p2X, 0, 1.2);
        p2Ref.current.rotation.y = 0;
      } else if (cycle < 10.5) {
        const driveT = (cycle - 7.0) / 3.5;
        const contestY = Math.sin(driveT * Math.PI) * 0.5;
        p2Ref.current.position.set(0.4, contestY, -1.8);
        p2Ref.current.rotation.y = 0;
      } else {
        p2Ref.current.position.set(0, 0, -0.5);
        p2Ref.current.rotation.y = 0;
      }
    }

    // Basketball trajectory
    if (ballRef.current) {
      if (cycle < 7.0) {
        const bounce = Math.abs(Math.sin(t * 7.5)) * 0.75;
        const ballX = p1Ref.current ? p1Ref.current.position.x + 0.35 : 0.35;
        const ballZ = p1Ref.current ? p1Ref.current.position.z - 0.25 : 2.25;
        ballRef.current.position.set(ballX, bounce + 0.12, ballZ);
        ballRef.current.rotation.x += 0.2;
      } else if (cycle < 9.2) {
        const shotProgress = (cycle - 7.0) / 2.2;
        const startX = p1Ref.current ? p1Ref.current.position.x : 0;
        const startY = 2.2;
        const startZ = p1Ref.current ? p1Ref.current.position.z : -2.0;

        const targetX = 0;
        const targetY = 3.05;
        const targetZ = 8.8;

        const bx = startX + (targetX - startX) * shotProgress;
        const bz = startZ + (targetZ - startZ) * shotProgress;
        const arc = Math.sin(shotProgress * Math.PI) * 2.2;
        const by = startY + (targetY - startY) * shotProgress + arc;

        ballRef.current.position.set(bx, by, bz);
        ballRef.current.rotation.x += 0.35;
      } else if (cycle < 10.8) {
        const dropProgress = (cycle - 9.2) / 1.6;
        const bounceDrop = Math.abs(Math.cos(dropProgress * Math.PI * 2.5)) * (1.0 - dropProgress) * 1.5;
        ballRef.current.position.set(0, Math.max(0.12, bounceDrop), 8.8);
      } else {
        const returnProgress = (cycle - 10.8) / 3.2;
        const rx = 0 + 0.35 * returnProgress;
        const rz = 8.8 + (2.5 - 8.8) * returnProgress;
        ballRef.current.position.set(rx, 0.4, rz);
      }
    }

    // Wing player cut
    if (p3Ref.current) {
      const cutX = -3.5 + Math.sin(t * 1.2) * 1.8;
      const cutZ = 0.5 + Math.cos(t * 1.2) * 2.5;
      p3Ref.current.position.set(cutX, 0, cutZ);
    }
    if (p4Ref.current) {
      const defX = -3.0 + Math.sin(t * 1.2) * 1.6;
      const defZ = 1.0 + Math.cos(t * 1.2) * 2.2;
      p4Ref.current.position.set(defX, 0, defZ);
    }

    // Post center
    if (p5Ref.current) {
      p5Ref.current.position.set(2.2, 0, 3.8 + Math.sin(t * 0.8) * 0.4);
    }
    if (p6Ref.current) {
      p6Ref.current.position.set(2.0, 0, 4.4 + Math.sin(t * 0.8) * 0.4);
    }

    // Spectators cheering
    if (spec1Ref.current) {
      spec1Ref.current.rotation.x = Math.sin(t * 4.0) * 0.08;
    }
    if (spec2Ref.current) {
      spec2Ref.current.rotation.x = Math.sin(t * 3.5 + 0.5) * 0.08;
    }
  });

  return (
    <group ref={courtRef} position={[128.0, 14.10, -81.0]}>
      {/* 🏀 ANIMATED BASKETBALL */}
      <group ref={ballRef} position={[0.35, 0.7, 2.5]}>
        <mesh castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#EA580C" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Black Seam Ribs */}
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.131, 0.005, 4, 24]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.131, 0.005, 4, 24]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* ── PLAYER 1: Point Guard (Team Red #7) ── */}
      <group ref={p1Ref} position={[0, 0, 2.5]}>
        <BasketballPlayerMesh jerseyColor="#DC2626" shortsColor="#1E293B" skinTone="MEDIUM" isDribbling />
      </group>

      {/* ── PLAYER 2: On-Ball Defender (Team Blue #23) ── */}
      <group ref={p2Ref} position={[0, 0, 1.2]}>
        <BasketballPlayerMesh jerseyColor="#2563EB" shortsColor="#0F172A" skinTone="BRONZE" isDefending />
      </group>

      {/* ── PLAYER 3: Baseline Cutter (Team Red #24) ── */}
      <group ref={p3Ref} position={[-3.5, 0, 0.5]}>
        <BasketballPlayerMesh jerseyColor="#DC2626" shortsColor="#1E293B" skinTone="LIGHT" />
      </group>

      {/* ── PLAYER 4: Wing Defender (Team Blue #11) ── */}
      <group ref={p4Ref} position={[-3.0, 0, 1.0]}>
        <BasketballPlayerMesh jerseyColor="#2563EB" shortsColor="#0F172A" skinTone="DEEP" isDefending />
      </group>

      {/* ── PLAYER 5: Post Center (Team Red #34) ── */}
      <group ref={p5Ref} position={[2.2, 0, 3.8]}>
        <BasketballPlayerMesh jerseyColor="#DC2626" shortsColor="#1E293B" skinTone="BRONZE" bodyScale={[1.12, 1.08, 1.12]} />
      </group>

      {/* ── PLAYER 6: Post Defender (Team Blue #15) ── */}
      <group ref={p6Ref} position={[2.0, 0, 4.4]}>
        <BasketballPlayerMesh jerseyColor="#2563EB" shortsColor="#0F172A" skinTone="MEDIUM" bodyScale={[1.1, 1.06, 1.1]} isDefending />
      </group>

      {/* ── COURTSIDE BENCH & CHEERING WORKERS ── */}
      <group position={[6.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Wooden Courtside Bench */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[4.2, 0.08, 0.45]} />
          <meshStandardMaterial color="#78350F" roughness={0.8} />
        </mesh>
        {[-1.8, 0, 1.8].map((bx, bi) => (
          <mesh key={`b-leg-${bi}`} position={[bx, 0.21, 0]}>
            <boxGeometry args={[0.08, 0.42, 0.42]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} />
          </mesh>
        ))}

        {/* Spectator 1: Off-duty worker cheering */}
        <group ref={spec1Ref} position={[-1.0, 0, 0]}>
          <HydroProjectPersonMesh
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            skinTone="MEDIUM"
            pantsStyle="JEANS"
            hasHardhat={false}
            hasVest={false}
          />
        </group>

        {/* Spectator 2: Off-duty worker in yellow shirt cheering */}
        <group ref={spec2Ref} position={[1.0, 0, 0]}>
          <HydroProjectPersonMesh
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            skinTone="LIGHT"
            pantsStyle="CARGO"
            hasHardhat={false}
            hasVest={false}
          />
        </group>
      </group>
    </group>
  );
}

// ─── ROVING NIGHT WATCHMEN WITH FLASHLIGHTS ──────────────────────────────────
function RovingNightWatchmen({ onSelectPerson }: { onSelectPerson?: (id: string) => void }) {
  const g1Ref = useRef<THREE.Group>(null);
  const g2Ref = useRef<THREE.Group>(null);
  const p1 = useRef<number>(0);
  const p2 = useRef<number>(0.5);

  const waypoints1 = useMemo(() => [
    new THREE.Vector3(105, 14.15, -70),
    new THREE.Vector3(128, 14.15, -70),
    new THREE.Vector3(135, 14.15, -95),
    new THREE.Vector3(105, 14.15, -95),
  ], []);
  const curve1 = useMemo(() => new THREE.CatmullRomCurve3(waypoints1, true), [waypoints1]);

  const waypoints2 = useMemo(() => [
    new THREE.Vector3(88, 14.85, -92),
    new THREE.Vector3(72, 14.85, -100),
    new THREE.Vector3(72, 14.85, -118),
    new THREE.Vector3(92, 14.85, -105),
  ], []);
  const curve2 = useMemo(() => new THREE.CatmullRomCurve3(waypoints2, true), [waypoints2]);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.04);
    p1.current = (p1.current + safeDelta * 0.013) % 1.0;
    p2.current = (p2.current + safeDelta * 0.011) % 1.0;

    if (g1Ref.current) {
      const pt = curve1.getPointAt(p1.current);
      const tang = curve1.getTangentAt(p1.current);
      g1Ref.current.position.set(pt.x, pt.y, pt.z);
      g1Ref.current.rotation.y = Math.atan2(tang.x, tang.z);
    }
    if (g2Ref.current) {
      const pt = curve2.getPointAt(p2.current);
      const tang = curve2.getTangentAt(p2.current);
      g2Ref.current.position.set(pt.x, pt.y, pt.z);
      g2Ref.current.rotation.y = Math.atan2(tang.x, tang.z);
    }
  });

  return (
    <group>
      {/* Watchman 1: North Perimeter Security Patrol */}
      <group ref={g1Ref}>
        <HydroProjectPersonMesh
          skinTone="BRONZE"
          hasHardhat
          hardhatColor="#1E293B"
          hasVest
          vestColor="#F59E0B"
          pantsStyle="JEANS"
          accessory="RADIO"
          isPatrolling
        />
        <pointLight position={[0.25, 1.1, 0.4]} intensity={2.8} distance={14} color="#FEF08A" />
      </group>

      {/* Watchman 2: Warehouse Laydown Yard Security Patrol */}
      <group ref={g2Ref}>
        <HydroProjectPersonMesh
          skinTone="MEDIUM"
          hasHardhat
          hardhatColor="#1E293B"
          hasVest
          vestColor="#F59E0B"
          pantsStyle="JEANS"
          accessory="RADIO"
          isPatrolling
        />
        <pointLight position={[0.25, 1.1, 0.4]} intensity={2.8} distance={14} color="#FEF08A" />
      </group>
    </group>
  );
}

// ─── DAYTIME EXECUTIVE & ADMIN WING ROUTINES ─────────────────────────────────
function DaytimeExecutiveAndAdminStaff({ onSelectPerson }: { onSelectPerson?: (id: string) => void }) {
  return (
    <group>
      {/* 👔 Project Manager (PM Romeo Sese) at Main Office Executive Veranda */}
      <HydroProjectPersonMesh
        personnelId="PM_ROMEO_SESE"
        onSelectPerson={onSelectPerson}
        position={[116.5, 14.15, -94.2]}
        rotation={[0, Math.PI / 4, 0]}
        role="PROJECT_MANAGER"
        skinTone="LIGHT"
        hairStyle="SHORT"
        hairColor="SALT_PEPPER"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasBeard
        pantsStyle="KHAKI"
        vestColor="#EA580C"
        accessory="BINDER"
        bodyScale={[1.08, 1.0, 1.08]}
      />

      {/* 🦺 Environmental, Safety & Health Manager (Alfredo Ariz) inspecting central compound */}
      <HydroProjectPersonMesh
        personnelId="ESH_ALFREDO_ARIZ"
        onSelectPerson={onSelectPerson}
        position={[111.0, 14.15, -88.0]}
        rotation={[0, -Math.PI / 6, 0]}
        role="SAFETY_HEAD"
        skinTone="BRONZE"
        hairStyle="BALD"
        hasGlasses
        hasHardhat
        hardhatColor="#FFFFFF"
        pantsStyle="JEANS"
        vestColor="#EA580C"
        accessory="CLIPBOARD"
        bodyScale={[1.05, 1.0, 1.05]}
      />

      {/* 📋 HR & Administrative Head (Rovigail Abellar) at Admin Office Desk */}
      <HydroProjectPersonMesh
        personnelId="HR_ROVIGAIL_ABELLAR"
        onSelectPerson={onSelectPerson}
        position={[113.5, 14.15, -97.5]}
        rotation={[0, 0, 0]}
        role="HR_OFFICER"
        gender="FEMALE"
        skinTone="LIGHT"
        hairStyle="WOMAN_PONYTAIL"
        hairColor="BLACK"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#1D4ED8"
        pantsStyle="CHARCOAL_OFFICE"
        bodyScale={[1.15, 0.96, 1.15]}
      />

      {/* 🩺 Site Occupational Health Nurse (Russelle Alcantara) at TEMFACIL Site Clinic */}
      <HydroProjectPersonMesh
        personnelId="NURSE_RUSSELLE_ALCANTARA"
        onSelectPerson={onSelectPerson}
        position={[115.0, 14.15, -96.0]}
        rotation={[0, -Math.PI / 2, 0]}
        gender="FEMALE"
        role="SITE_NURSE"
        skinTone="LIGHT"
        hairStyle="WOMAN_PONYTAIL"
        hairColor="AUBURN"
        pantsStyle="MAONG_JEANS"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0D9488"
        bodyScale={[0.96, 1.0, 0.96]}
      />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. CONSTRUCTION WORKER CREWS, VEHICLES & SITE CHECKPOINT
   ═══════════════════════════════════════════════════════════════════════════ */

interface ConstructionWorkerProps {
  vestColor?: string;
  hardhatColor?: string;
  actionType?: "WELDING" | "SHOVELING" | "REBAR_TYING";
}

function ActiveConstructionWorkerMesh({
  vestColor = "#EA580C",
  hardhatColor = "#16A34A",
  actionType = "SHOVELING",
}: ConstructionWorkerProps) {
  const workerGroupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const sparkLightRef = useRef<THREE.PointLight>(null);
  const frameCount = useRef<number>(0);

  useFrame(({ clock }) => {
    frameCount.current++;
    if (frameCount.current % 3 !== 0) return; // 20Hz Throttler

    const t = clock.getElapsedTime();

    if (actionType === "WELDING") {
      const walk = Math.sin(t * 0.8) * 1.2;
      if (workerGroupRef.current) workerGroupRef.current.position.x = walk;
      if (sparkLightRef.current) sparkLightRef.current.intensity = Math.random() > 0.2 ? 4.5 : 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-1.2 + Math.sin(t * 4) * 0.1, 0.4, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.1 + Math.cos(t * 4) * 0.1, -0.3, 0);
    } else if (actionType === "SHOVELING") {
      const cycle = Math.sin(t * 2.5);
      const isScooping = cycle > 0;
      if (torsoRef.current) torsoRef.current.rotation.x = isScooping ? 0.4 : 0.0;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.8 + cycle * 0.4, 0.2, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.6 + cycle * 0.4, -0.2, 0);
      if (workerGroupRef.current) workerGroupRef.current.rotation.y = isScooping ? 0 : 1.2;
    } else if (actionType === "REBAR_TYING") {
      const twist = Math.sin(t * 5.0) * 0.25;
      if (torsoRef.current) torsoRef.current.rotation.y = twist;
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.9 + twist, 0.3, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.9 - twist, -0.3, 0);
    }
  });

  return (
    <group ref={workerGroupRef}>
      <group ref={torsoRef} position={[0, 0.85, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.38, 0.46, 0.22]} />
          <meshStandardMaterial color={vestColor} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Reflective Band */}
        <mesh position={[0, 0.35, 0.115]}>
          <boxGeometry args={[0.36, 0.04, 0.01]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.9} emissive="#FFFFFF" emissiveIntensity={0.5} />
        </mesh>
        {/* Anatomical Cervical Neck */}
        <mesh position={[0, 0.46, 0]} material={MAT_SKIN_MEDIUM}>
          <cylinderGeometry args={[0.065, 0.08, 0.12, 12]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} material={MAT_SKIN_MEDIUM}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
        </mesh>
        {/* Safety Hard Hat */}
        <mesh position={[0, 0.67, 0]}>
          <boxGeometry args={[0.26, 0.11, 0.28]} />
          <meshStandardMaterial color={hardhatColor} roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.63, 0.06]}>
          <boxGeometry args={[0.28, 0.02, 0.18]} />
          <meshStandardMaterial color={hardhatColor} roughness={0.4} metalness={0.05} />
        </mesh>
        <group ref={leftArmRef} position={[-0.24, 0.40, 0]}>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.10, 0.42, 0.10]} />
            <meshStandardMaterial color={vestColor} />
          </mesh>
          <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.085, 0.09, 0.085]} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.24, 0.40, 0]}>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.10, 0.42, 0.10]} />
            <meshStandardMaterial color={vestColor} />
          </mesh>
          <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.085, 0.09, 0.085]} />
          </mesh>
        </group>
      </group>
      <mesh position={[-0.10, 0.42, 0]} material={MAT_PANTS_JEANS}>
        <boxGeometry args={[0.14, 0.82, 0.14]} />
      </mesh>
      <mesh position={[0.10, 0.42, 0]} material={MAT_PANTS_JEANS}>
        <boxGeometry args={[0.14, 0.82, 0.14]} />
      </mesh>
      {actionType === "WELDING" && (
        <pointLight ref={sparkLightRef} position={[0.3, 1.1, 0.4]} color="#60A5FA" intensity={3} distance={5} />
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. HIGH-REALISM VEHICLE FLEET & SITE MOTORCYCLES
// ═══════════════════════════════════════════════════════════════════════════

// ─── A. SCIC HEAVY 10-WHEELER DUMP TRUCK (ISUZU GIGA / HINO 700 STYLE) ──────
export function SCICHeavyDumpTruck({
  bodyColor = "#DC2626",
  headlightsOn = true,
  brakeLightsOn = false,
  bedAngle = 0,
}: {
  bodyColor?: string;
  headlightsOn?: boolean;
  brakeLightsOn?: boolean;
  bedAngle?: number;
}) {
  return (
    <group position={[0, 0, 0]}>
      {/* Heavy Heavy-Duty Chassis Rails */}
      <mesh position={[0, 0.55, -0.4]} material={MAT_VEHICLE_CHASSIS}>
        <boxGeometry args={[1.5, 0.35, 6.6]} />
      </mesh>

      {/* Driver Heavy Cab (Front) */}
      <group position={[0, 1.45, 1.95]}>
        {/* Cab Lower Body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.3, 1.1, 1.8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Cab Upper Roof & Windows */}
        <mesh position={[0, 0.85, -0.05]}>
          <boxGeometry args={[2.25, 0.75, 1.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Front Windshield Glass */}
        <mesh position={[0, 0.85, 0.76]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[2.05, 0.65, 0.05]} />
        </mesh>
        {/* Side Windows */}
        <mesh position={[-1.14, 0.85, 0.1]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.05, 0.55, 1.1]} />
        </mesh>
        <mesh position={[1.14, 0.85, 0.1]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.05, 0.55, 1.1]} />
        </mesh>
        {/* Heavy Radiator Grille & Chrome Bumper */}
        <mesh position={[0, -0.15, 0.92]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[1.8, 0.65, 0.08]} />
        </mesh>
        <mesh position={[0, -0.55, 0.96]} material={MAT_CHROME}>
          <boxGeometry args={[2.35, 0.3, 0.18]} />
        </mesh>
        {/* Amber Safety Strobe Beacon on Roof */}
        <mesh position={[0, 1.3, 0.2]} material={MAT_YELLOW_SAFETY}>
          <cylinderGeometry args={[0.12, 0.14, 0.16, 8]} />
        </mesh>
        {/* Side Mirrors */}
        <mesh position={[-1.25, 0.75, 0.65]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.15, 0.4, 0.1]} />
        </mesh>
        <mesh position={[1.25, 0.75, 0.65]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.15, 0.4, 0.1]} />
        </mesh>
      </group>

      {/* Vertical Chrome Exhaust Stack behind Cab */}
      <group position={[-0.95, 2.0, 0.8]}>
        <mesh material={MAT_CHROME}>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
        </mesh>
        <mesh position={[0, 1.1, 0]} rotation={[0.4, 0, 0]} material={MAT_CHROME}>
          <cylinderGeometry args={[0.07, 0.08, 0.3, 8]} />
        </mesh>
      </group>

      {/* Heavy Ribbed Hydraulic Tipper Dump Bed (Pivoted at Rear Hinge Z = -3.3) */}
      <group name="dumpTipperBed" position={[0, 1.4, -3.3]} rotation={[-bedAngle, 0, 0]}>
        <group position={[0, 0.2, 2.2]}>
          {/* Bottom Bed Floor */}
          <mesh position={[0, -0.2, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[2.4, 0.15, 4.4]} />
          </mesh>
          {/* Left & Right High Walls */}
          <mesh position={[-1.15, 0.55, 0]}>
            <boxGeometry args={[0.12, 1.35, 4.4]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[1.15, 0.55, 0]}>
            <boxGeometry args={[0.12, 1.35, 4.4]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Front Wall with Cab Protector Canopy */}
          <mesh position={[0, 0.55, 2.15]}>
            <boxGeometry args={[2.3, 1.35, 0.12]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.25, 2.65]}>
            <boxGeometry args={[2.3, 0.1, 1.1]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Rear Tailgate with Safety Chevron Stripes */}
          <mesh position={[0, 0.55, -2.15]}>
            <boxGeometry args={[2.3, 1.35, 0.12]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, -2.22]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[2.2, 0.22, 0.04]} />
          </mesh>
        </group>
      </group>

      {/* Wheels: 10 Heavy Off-Road Wheels (2 Front Steer + 8 Tandem Dual Rear) */}
      {/* Front Steer Axle (z = +2.0m) */}
      <mesh position={[-1.08, 0.48, 2.0]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.32, 14]} />
      </mesh>
      <mesh position={[1.08, 0.48, 2.0]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.32, 14]} />
      </mesh>
      {/* Rear Tandem Axle 1 (z = -1.5m) — Dual Wheels */}
      <mesh position={[-1.02, 0.48, -1.5]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.52, 14]} />
      </mesh>
      <mesh position={[1.02, 0.48, -1.5]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.52, 14]} />
      </mesh>
      {/* Rear Tandem Axle 2 (z = -2.65m) — Dual Wheels */}
      <mesh position={[-1.02, 0.48, -2.65]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.52, 14]} />
      </mesh>
      <mesh position={[1.02, 0.48, -2.65]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
        <cylinderGeometry args={[0.48, 0.48, 0.52, 14]} />
      </mesh>

      {/* Headlights & Taillights */}
      {headlightsOn && (
        <>
          <mesh position={[-0.85, 0.9, 2.92]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.32, 0.18, 0.05]} />
          </mesh>
          <mesh position={[0.85, 0.9, 2.92]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.32, 0.18, 0.05]} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── B. SCIC 4x4 SITE PATROL & INSPECTION PICKUP (HILUX / RANGER STYLE) ──────
export function SCICSitePickupTruck({ bodyColor = "#FFFFFF", headlightsOn = true }: { bodyColor?: string; headlightsOn?: boolean }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Off-Road Chassis Frame */}
      <mesh position={[0, 0.38, 0]} material={MAT_VEHICLE_CHASSIS}>
        <boxGeometry args={[1.8, 0.22, 4.8]} />
      </mesh>

      {/* Cabin Body & Hood */}
      <group position={[0, 0.75, 0.35]}>
        {/* Hood */}
        <mesh position={[0, 0.05, 1.2]}>
          <boxGeometry args={[1.82, 0.48, 1.4]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Cabin Lower */}
        <mesh position={[0, 0.1, -0.3]}>
          <boxGeometry args={[1.85, 0.6, 1.7]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Cabin Greenhouse Roof & Windows */}
        <mesh position={[0, 0.62, -0.3]}>
          <boxGeometry args={[1.65, 0.55, 1.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 0.62, 0.52]} rotation={[-0.3, 0, 0]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[1.56, 0.52, 0.04]} />
        </mesh>
        {/* Side Windows */}
        <mesh position={[-0.84, 0.62, -0.3]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.04, 0.46, 1.4]} />
        </mesh>
        <mesh position={[0.84, 0.62, -0.3]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.04, 0.46, 1.4]} />
        </mesh>
      </group>

      {/* Front Bullbar & Auxiliary Spotlights */}
      <mesh position={[0, 0.65, 2.35]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[1.7, 0.4, 0.15]} />
      </mesh>
      <mesh position={[-0.4, 0.9, 2.38]} rotation={[Math.PI / 2, 0, 0]} material={MAT_HEADLIGHT_ON}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
      </mesh>
      <mesh position={[0.4, 0.9, 2.38]} rotation={[Math.PI / 2, 0, 0]} material={MAT_HEADLIGHT_ON}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
      </mesh>

      {/* Rear Pickup Bed & Roll Bar with LED Light Bar */}
      <group position={[0, 0.8, -1.45]}>
        {/* Bed Walls */}
        <mesh position={[-0.86, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.56, 1.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0.86, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.56, 1.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, -0.78]}>
          <boxGeometry args={[1.8, 0.56, 0.1]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Steel Roll Bar */}
        <mesh position={[0, 0.85, 0.7]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[1.7, 0.75, 0.08]} />
        </mesh>
        {/* Roof LED Orange Hazard Beacon */}
        <mesh position={[0, 1.25, 0.7]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.9, 0.08, 0.12]} />
        </mesh>
      </group>

      {/* 4 Large Knobby 4x4 Off-Road Tires */}
      {[-0.95, 0.95].map((x, i) =>
        [-1.35, 1.35].map((z, j) => (
          <mesh key={`pwheel-${i}-${j}`} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
            <cylinderGeometry args={[0.40, 0.40, 0.28, 14]} />
          </mesh>
        ))
      )}

      {/* Headlights */}
      {headlightsOn && (
        <>
          <mesh position={[-0.68, 0.82, 2.25]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.28, 0.15, 0.05]} />
          </mesh>
          <mesh position={[0.68, 0.82, 2.25]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.28, 0.15, 0.05]} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── C. PHILIPPINE SITE WORK MOTORCYCLE (HONDA TMX / DIRT BIKE) ─────────────
export function PhilippineSiteMotorcycle({ color = "#0284C7", kickstandUp = false }: { color?: string; kickstandUp?: boolean }) {
  return (
    <group rotation={[0, 0, kickstandUp ? 0 : -0.12]}>
      {/* Front Fork & Spoke Wheel */}
      <group position={[0, 0, 0.75]}>
        <mesh position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_TIRE_RUBBER}>
          <cylinderGeometry args={[0.34, 0.34, 0.09, 12]} />
        </mesh>
        {/* Fork Shocks */}
        <mesh position={[-0.07, 0.58, -0.05]} rotation={[-0.3, 0, 0]} material={MAT_CHROME}>
          <cylinderGeometry args={[0.02, 0.02, 0.55, 6]} />
        </mesh>
        <mesh position={[0.07, 0.58, -0.05]} rotation={[-0.3, 0, 0]} material={MAT_CHROME}>
          <cylinderGeometry args={[0.02, 0.02, 0.55, 6]} />
        </mesh>
        {/* Handlebars with Mirrors */}
        <mesh position={[0, 0.88, -0.14]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.75, 0.03, 0.03]} />
        </mesh>
        {/* Headlight */}
        <mesh position={[0, 0.78, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={MAT_HEADLIGHT_ON}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 8]} />
        </mesh>
      </group>

      {/* Main Steel Frame, Engine Block & Exhaust */}
      <group position={[0, 0.45, 0]}>
        {/* Engine Cylinder Block */}
        <mesh position={[0, 0, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.26, 0.32, 0.45]} />
        </mesh>
        {/* Chrome Exhaust Pipe */}
        <mesh position={[0.15, -0.08, -0.3]} rotation={[0.1, 0, 0]} material={MAT_CHROME}>
          <cylinderGeometry args={[0.035, 0.035, 0.65, 6]} />
        </mesh>
        {/* Fuel Tank */}
        <mesh position={[0, 0.32, 0.22]}>
          <boxGeometry args={[0.30, 0.22, 0.55]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.6} />
        </mesh>
        {/* Padded Work Seat */}
        <mesh position={[0, 0.34, -0.26]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.26, 0.12, 0.65]} />
        </mesh>
        {/* Rear Tool & Cargo Rack */}
        <mesh position={[0, 0.42, -0.68]} material={MAT_CHROME}>
          <boxGeometry args={[0.32, 0.04, 0.35]} />
        </mesh>
      </group>

      {/* Rear Wheel & Swingarm */}
      <group position={[0, 0, -0.75]}>
        <mesh position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_TIRE_RUBBER}>
          <cylinderGeometry args={[0.34, 0.34, 0.11, 12]} />
        </mesh>
        {/* Rear Red Taillight */}
        <mesh position={[0, 0.52, -0.32]} material={MAT_SAFETY_RED}>
          <boxGeometry args={[0.08, 0.05, 0.04]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── D. TOYOTA HIACE / SCIC WORKFORCE CREW COMMUTER VAN ─────────────────────
export function ToyotaHiaceCrewVan({
  bodyColor = "#F8FAFC",
  headlightsOn = true,
  brakeLightsOn = false,
}: {
  bodyColor?: string;
  headlightsOn?: boolean;
  brakeLightsOn?: boolean;
}) {
  return (
    <group position={[0, 0, 0]}>
      {/* Lower Chassis Frame */}
      <mesh position={[0, 0.42, 0]} material={MAT_VEHICLE_CHASSIS}>
        <boxGeometry args={[1.82, 0.25, 5.0]} />
      </mesh>

      {/* Van Body Cab & Passenger Cabin */}
      <group position={[0, 1.25, 0]}>
        {/* Main Monocoque Lower Body */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[1.88, 0.85, 4.9]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Cabin Upper Roof */}
        <mesh position={[0, 0.48, -0.1]}>
          <boxGeometry args={[1.82, 0.65, 4.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Aerodynamic Front Windshield */}
        <mesh position={[0, 0.35, 1.95]} rotation={[-0.42, 0, 0]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[1.72, 0.72, 0.05]} />
        </mesh>
        {/* Tinted Side Passenger Windows */}
        <mesh position={[-0.92, 0.42, -0.15]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.04, 0.52, 3.6]} />
        </mesh>
        <mesh position={[0.92, 0.42, -0.15]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.04, 0.52, 3.6]} />
        </mesh>
        {/* Rear Hatch Window */}
        <mesh position={[0, 0.42, -2.42]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[1.65, 0.52, 0.04]} />
        </mesh>
        {/* Front Chrome Grille & Badge */}
        <mesh position={[0, -0.15, 2.46]} material={MAT_CHROME}>
          <boxGeometry args={[1.4, 0.32, 0.08]} />
        </mesh>
        {/* Front Bumper with Fog Lights */}
        <mesh position={[0, -0.52, 2.48]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[1.86, 0.28, 0.15]} />
        </mesh>
      </group>

      {/* 4 Van Wheels with Silver Trim */}
      {[-0.96, 0.96].map((x, i) =>
        [-1.4, 1.4].map((z, j) => (
          <group key={`van-wheel-${i}-${j}`} position={[x, 0.4, z]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={MAT_TIRE_RUBBER}>
              <cylinderGeometry args={[0.38, 0.38, 0.26, 14]} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} material={MAT_CHROME}>
              <cylinderGeometry args={[0.22, 0.22, 0.27, 8]} />
            </mesh>
          </group>
        ))
      )}

      {/* Headlights */}
      {headlightsOn && (
        <>
          <mesh position={[-0.72, 0.85, 2.45]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.3, 0.16, 0.05]} />
          </mesh>
          <mesh position={[0.72, 0.85, 2.45]} material={MAT_HEADLIGHT_ON}>
            <boxGeometry args={[0.3, 0.16, 0.05]} />
          </mesh>
        </>
      )}

      {/* Taillights / Brake Lights */}
      <mesh position={[-0.82, 0.95, -2.48]} material={brakeLightsOn ? MAT_BRAKELIGHT_ON : MAT_SAFETY_RED}>
        <boxGeometry args={[0.12, 0.45, 0.04]} />
      </mesh>
      <mesh position={[0.82, 0.95, -2.48]} material={brakeLightsOn ? MAT_BRAKELIGHT_ON : MAT_SAFETY_RED}>
        <boxGeometry args={[0.12, 0.45, 0.04]} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 🇵🇭 REALISTIC FILIPINO SECURITY GATE OFFICER (SG ROBERTO "BERT" DIZON)
 * Complete Detailed Checkpoint Protocol for Hydro Construction Site:
 * 1. SENTRY_POST: Vigilant standing under guardhouse booth porch, scanning approaching traffic.
 * 2. WALKING_TO_VEHICLE: Steps forward to vehicle driver's window holding clipboard and inspection wand.
 * 3. INSPECTING_DRIVER_PPE: Inspects driver ID, gate pass, hardhat, and safety vest compliance.
 * 4. INSPECTING_UNDERCARRIAGE: Sweeps convex mirror wand under front/rear axles to detect concealed contraband / hazards.
 * 5. INSPECTING_CARGO_PROHIBITED: Inspects cargo bed / trunk with searchlight for liquor, firearms, unauthorized chemicals, unmanifested tools.
 * 6. LOGGING_MANIFEST: Writes clearance approval timestamp, signs gate pass with blue pen on manifest clipboard.
 * 7. WAVING_CLEARANCE: Triggers upward boom barrier lift (Green LED), delivers classic Filipino traffic wave ("Sige po diretso lang!").
 * 8. VEHICLE_PASSING: Smoothly tracks vehicle as it accelerates through the gate into TEMFACIL.
 * 9. WALKING_TO_POST: Safely steps back under the guardhouse eaves once vehicle clears, lowers barrier (Red LED).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type CheckpointInspectionPhase =
  | "SENTRY_POST"
  | "WALKING_TO_VEHICLE"
  | "INSPECTING_DRIVER_PPE"
  | "INSPECTING_UNDERCARRIAGE"
  | "INSPECTING_CARGO_PROHIBITED"
  | "LOGGING_MANIFEST"
  | "WAVING_CLEARANCE"
  | "VEHICLE_PASSING"
  | "WALKING_TO_POST";

export interface CheckpointState {
  phase: CheckpointInspectionPhase;
  activeVehId: string | null;
  activeVehDir: 1 | -1;
  timer: number;
  walkProgress: number;
}

export function AnimatedSecurityGateOfficer({
  checkpointRef,
  checkpointPhase,
  walkProgress,
  activeVehDir,
  onSelectPerson,
}: {
  checkpointRef?: React.MutableRefObject<CheckpointState>;
  checkpointPhase?: CheckpointInspectionPhase;
  walkProgress?: number;
  activeVehDir?: 1 | -1;
  onSelectPerson?: (id: string) => void;
}) {
  const guardGroupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const mirrorWandRef = useRef<THREE.Group>(null);
  const searchlightRef = useRef<THREE.SpotLight>(null);

  const internalStateRef = useRef({
    pos: new THREE.Vector3(4.4, 0, 0.8),
    rotY: -Math.PI / 3,
    targetRotY: -Math.PI / 3,
    scanTimer: 2.0,
    scanAngle: 0,
  });

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const st = internalStateRef.current;
    const cp = checkpointRef?.current;
    const activePhase = cp ? cp.phase : (checkpointPhase || "SENTRY_POST");
    const activeWalk = cp ? cp.walkProgress : (walkProgress || 0);
    const activeDir = cp ? cp.activeVehDir : (activeVehDir || 1);

    const isWalking =
      activePhase === "WALKING_TO_VEHICLE" ||
      activePhase === "WALKING_TO_POST" ||
      activePhase === "INSPECTING_UNDERCARRIAGE" ||
      activePhase === "INSPECTING_CARGO_PROHIBITED";

    // ─── 1. TARGET 3D POSITION & HEADING BASED ON ACTIVE CHECKPOINT PHASE ───
    const driverZ = activeDir === 1 ? 0.35 : -0.35;
    const cargoZ = activeDir === 1 ? 1.85 : -1.85;

    if (activePhase === "WALKING_TO_VEHICLE") {
      // Guard physically walks from under guardhouse porch (x=4.4, z=0.8) to driver window (x=2.4, z=driverZ)
      st.pos.x = THREE.MathUtils.lerp(4.4, 2.4, activeWalk);
      st.pos.z = THREE.MathUtils.lerp(0.8, driverZ, activeWalk);
      st.targetRotY = activeDir === 1 ? -2.1 : -1.2;
    } else if (activePhase === "WALKING_TO_POST") {
      // Guard physically walks back from vehicle to under guardhouse porch
      st.pos.x = THREE.MathUtils.lerp(2.4, 4.4, 1.0 - activeWalk);
      st.pos.z = THREE.MathUtils.lerp(driverZ, 0.8, 1.0 - activeWalk);
      st.targetRotY = 1.15;
    } else if (activePhase === "INSPECTING_DRIVER_PPE") {
      st.pos.set(2.4, 0, driverZ);
      st.targetRotY = -Math.PI / 2; // Facing driver window
    } else if (activePhase === "INSPECTING_UNDERCARRIAGE") {
      // Walks along vehicle undercarriage sweeping mirror wand front-to-back
      const sweepZ = Math.sin(t * 2.2) * 1.3;
      st.pos.set(2.3 + Math.abs(Math.sin(t * 1.5)) * 0.15, 0, driverZ + sweepZ);
      st.targetRotY = -Math.PI / 2 + Math.sin(t * 2.2) * 0.3;
    } else if (activePhase === "INSPECTING_CARGO_PROHIBITED") {
      // Steps along cargo bed peering inside for prohibited items (liquor/firearms/unmanifested tools)
      const cargoPace = Math.sin(t * 1.8) * 0.6;
      st.pos.set(2.4, 0, cargoZ + cargoPace);
      st.targetRotY = -Math.PI / 2 + Math.sin(t * 1.8) * 0.2;
    } else if (activePhase === "LOGGING_MANIFEST") {
      st.pos.set(2.4, 0, driverZ);
      st.targetRotY = -Math.PI / 2;
    } else if (activePhase === "WAVING_CLEARANCE" || activePhase === "VEHICLE_PASSING") {
      st.pos.set(3.0, 0, driverZ + (activeDir === 1 ? 0.3 : -0.3));
      st.targetRotY = activeDir === 1 ? -Math.PI / 2.3 : -Math.PI / 1.7;
    } else {
      // SENTRY_POST (Under guardhouse porch)
      st.pos.set(4.4, 0, 0.8);
      st.scanTimer -= delta;
      if (st.scanTimer <= 0) {
        st.scanTimer = 3.2 + Math.sin(t) * 1.5;
        st.scanAngle = Math.sin(t * 0.6) * 0.35;
      }
      st.targetRotY = -Math.PI / 3 + st.scanAngle;
    }

    // Smooth rotational damping
    st.rotY = THREE.MathUtils.damp(st.rotY, st.targetRotY, 7.5, delta);

    if (guardGroupRef.current) {
      guardGroupRef.current.position.copy(st.pos);
      guardGroupRef.current.rotation.y = st.rotY;
    }

    // ─── 2. ARTICULATED BIOMECHANICAL ANATOMY KINEMATICS ───
    if (isWalking) {
      const walkSpeed = (activePhase === "WALKING_TO_VEHICLE" || activePhase === "WALKING_TO_POST") ? 8.0 : 4.0;
      const walkSin = Math.sin(t * walkSpeed);
      const walkCos = Math.cos(t * walkSpeed);
      const legStride = walkSin * ((activePhase === "WALKING_TO_VEHICLE" || activePhase === "WALKING_TO_POST") ? 0.45 : 0.22);
      const armSwing = walkSin * 0.28;
      const pelvicBounce = Math.abs(walkSin) * 0.028;

      if (guardGroupRef.current) guardGroupRef.current.position.y = pelvicBounce;
      if (torsoRef.current) torsoRef.current.rotation.set(0.06, walkCos * 0.08, 0);
      if (leftLegRef.current) leftLegRef.current.rotation.set(legStride, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-legStride, 0, 0);

      if (activePhase === "INSPECTING_UNDERCARRIAGE") {
        // Bend forward leaning down to sweep undercarriage mirror beneath chassis
        if (torsoRef.current) torsoRef.current.rotation.set(0.24, walkCos * 0.05, 0);
        if (headRef.current) headRef.current.rotation.set(0.38, -walkCos * 0.06, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.7, 0.25, 0.1);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.35 + Math.sin(t * 2.2) * 0.15, -0.15, -0.2);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.85 + Math.sin(t * 2.2) * 0.2, 0, 0);
      } else if (activePhase === "INSPECTING_CARGO_PROHIBITED") {
        // Look up and into truck bed / cargo box with inspection beam
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.22, Math.sin(t * 2.5) * 0.4, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.95, 0.35, 0.15);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.25 + Math.sin(t * 2.5) * 0.2, -0.25, 0.15);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(-0.2, 0, 0);
      } else {
        if (headRef.current) headRef.current.rotation.set(0, -walkCos * 0.05, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, 0.25, 0.15);
        if (rightArmRef.current) rightArmRef.current.rotation.set(armSwing, -0.1, 0.1);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.1, 0, 0);
      }
    } else {
      if (guardGroupRef.current) guardGroupRef.current.position.y = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);

      const breath = Math.sin(t * 1.5) * 0.015;

      if (activePhase === "INSPECTING_DRIVER_PPE") {
        // Checking driver pass & PPE compliance
        const checkTick = Math.sin(t * 6.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.10, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.22 + checkTick, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.1, 0.35, 0.15);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.15 + checkTick, -0.2, 0.1);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.15, 0, 0);
      } else if (activePhase === "LOGGING_MANIFEST") {
        // Signing vehicle manifest logbook with blue pen
        const writeTick = Math.sin(t * 12.0) * 0.07;
        const nod = Math.sin(t * 3.0) * 0.04;
        if (torsoRef.current) torsoRef.current.rotation.set(0.12, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0.32 + nod, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.2, 0.4, 0.2);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.25 + writeTick, -0.25, writeTick * 0.3);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.15, 0, 0);
      } else if (activePhase === "WAVING_CLEARANCE" || activePhase === "VEHICLE_PASSING") {
        // Classic Filipino Traffic Marshal sweeping clearance wave ("Sige po diretso lang!")
        const waveSweep = Math.sin(t * 4.2);
        if (torsoRef.current) torsoRef.current.rotation.set(0.04, 0.12, 0);
        if (headRef.current) headRef.current.rotation.set(-0.04, 0.25, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.7, 0.2, 0.1);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.35 + waveSweep * 0.4, -0.35, -0.25 + waveSweep * 0.3);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.3, 0, 0);
      } else {
        // SENTRY_POST
        const headScan = Math.sin(t * 0.7) * 0.18;
        if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, breath);
        if (headRef.current) headRef.current.rotation.set(0.02, headScan, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, 0.2, 0.1);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-0.15, 0, 0.08);
        if (mirrorWandRef.current) mirrorWandRef.current.rotation.set(0.1, 0, 0);
      }
    }

    // Toggle inspection spotlight during inspection phases
    if (searchlightRef.current) {
      const isInspecting = activePhase === "INSPECTING_UNDERCARRIAGE" || activePhase === "INSPECTING_CARGO_PROHIBITED";
      searchlightRef.current.intensity = isInspecting ? 2.5 : 0;
      searchlightRef.current.visible = isInspecting;
    }

    if (guardGroupRef.current) {
      guardGroupRef.current.getWorldPosition(scratchJimmyWorldPos);
      registerLivePersonnelPosition("SEC_RONALD_MALTO", scratchJimmyWorldPos, guardGroupRef.current);
    }
  });

  return (
    <group
      ref={guardGroupRef}
      position={[4.4, 0, 0.8]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectPerson) onSelectPerson("SEC_RONALD_MALTO");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Invisible Raycast Collider for effortless click selection */}
      <mesh position={[0, 0.95, 0]} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* ── SG Roberto "Bert" Dizon Realistic Filipino Security Guard Anatomy ── */}
      {/* Searchlight / UV Inspection Flashlight SpotLight */}
      <spotLight
        ref={searchlightRef}
        visible={false}
        position={[0, 0.7, 0.2]}
        target-position={[0, -0.5, 1.2]}
        angle={0.5}
        penumbra={0.4}
        intensity={0}
        color="#E0F2FE"
        distance={6}
      />

      {/* Head with SOSIA Uniform Security Peak Cap & Gold Badge */}
      <group ref={headRef} position={[0, 1.28, 0]}>
        {/* Anatomical Cervical Neck Cylinder into white uniform collar */}
        <mesh position={[0, -0.04, 0]} material={MAT_SKIN_BRONZE}>
          <cylinderGeometry args={[0.07, 0.085, 0.12, 12]} />
        </mesh>
        {/* Head Mesh with Moreno Filipino Skin */}
        <mesh position={[0, 0.08, 0]} material={MAT_SKIN_BRONZE}>
          <boxGeometry args={[0.22, 0.24, 0.22]} />
        </mesh>
        {/* Official SOSIA Security Guard Navy Blue Peak Cap */}
        <group position={[0, 0.20, 0]}>
          <mesh material={MAT_SHIRT_BLAZER_NAVY}>
            <cylinderGeometry args={[0.13, 0.12, 0.08, 12]} />
          </mesh>
          {/* Black Peak Visor */}
          <mesh position={[0, -0.02, 0.08]} rotation={[0.2, 0, 0]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.18, 0.02, 0.12]} />
          </mesh>
          {/* Gold SOSIA Security Shield Badge on Cap */}
          <mesh position={[0, 0.02, 0.122]} material={MAT_GOLD_ACCENT}>
            <boxGeometry args={[0.04, 0.05, 0.01]} />
          </mesh>
        </group>
        {/* Aviator Sunglasses */}
        <mesh position={[0, 0.09, 0.115]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.16, 0.04, 0.02]} />
        </mesh>
      </group>

      {/* Articulated Torso (White Security Uniform Shirt + Navy Blue Shoulder Straps) */}
      <group ref={torsoRef} position={[0, 0.88, 0]}>
        {/* Upper White Collared Shirt */}
        <mesh position={[0, 0.15, 0]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[0.38, 0.44, 0.22]} />
        </mesh>
        {/* Navy Blue Epaulets with Gold Rank Bars */}
        {[-0.17, 0.17].map((xOff, idx) => (
          <mesh key={`ep-${idx}`} position={[xOff, 0.35, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
            <boxGeometry args={[0.08, 0.03, 0.14]} />
          </mesh>
        ))}
        {/* SCIC / SOSIA Security Gold Chest Badge (Left Pocket) */}
        <mesh position={[-0.10, 0.22, 0.115]} material={MAT_GOLD_ACCENT}>
          <boxGeometry args={[0.06, 0.07, 0.01]} />
        </mesh>
        {/* White PVC Nameplate "R. DIZON - SG" (Right Pocket) */}
        <mesh position={[0.10, 0.22, 0.115]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[0.08, 0.03, 0.01]} />
        </mesh>
        {/* Heavy Duty Duty-Belt (Gun Holster, Pepper Spray, Handcuff Pouch, Flashlight) */}
        <mesh position={[0, -0.08, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.40, 0.09, 0.24]} />
        </mesh>
        {/* Side Holstered Handgun */}
        <mesh position={[0.21, -0.12, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.05, 0.16, 0.08]} />
        </mesh>
        {/* Security Walkie-Talkie Radio on Left Shoulder with Antenna */}
        <group position={[-0.18, 0.26, 0.08]}>
          <mesh material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.05, 0.12, 0.04]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.005, 0.005, 0.10, 6]} />
          </mesh>
        </group>
      </group>

      {/* Left Arm: Holding Aluminum Manifest Clipboard */}
      <group ref={leftArmRef} position={[-0.24, 1.15, 0]}>
        <mesh position={[0, -0.18, 0]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[0.11, 0.36, 0.11]} />
        </mesh>
        <mesh position={[0, -0.38, 0]} material={MAT_SKIN_BRONZE}>
          <boxGeometry args={[0.09, 0.12, 0.09]} />
        </mesh>
        {/* Heavy-Duty Manifest Clipboard */}
        <group position={[0, -0.42, 0.12]} rotation={[0.4, 0, 0]}>
          <mesh material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.24, 0.32, 0.02]} />
          </mesh>
          {/* White Paper Manifest Sheet */}
          <mesh position={[0, 0, 0.012]} material={MAT_ID_BADGE_WHITE}>
            <boxGeometry args={[0.20, 0.28, 0.005]} />
          </mesh>
          {/* Blue Signing Ballpen */}
          <mesh position={[0.08, 0.02, 0.02]} rotation={[0, 0, 0.2]} material={MAT_WORKER_VEST_ROYAL}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
          </mesh>
        </group>
      </group>

      {/* Right Arm: Articulated Hand with Inspection Mirror Wand / Flashlight */}
      <group ref={rightArmRef} position={[0.24, 1.15, 0]}>
        <mesh position={[0, -0.18, 0]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[0.11, 0.36, 0.11]} />
        </mesh>
        <mesh position={[0, -0.38, 0]} material={MAT_SKIN_BRONZE}>
          <boxGeometry args={[0.09, 0.12, 0.09]} />
        </mesh>
        {/* Telescopic Vehicle Inspection Mirror Wand */}
        <group ref={mirrorWandRef} position={[0, -0.42, 0.15]}>
          {/* Long Telescopic Wand Shaft */}
          <mesh position={[0, -0.35, 0.25]} rotation={[0.5, 0, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
            <cylinderGeometry args={[0.012, 0.012, 0.85, 8]} />
          </mesh>
          {/* Convex Mirror Head Disk at Tip */}
          <group position={[0, -0.68, 0.55]} rotation={[-0.4, 0, 0]}>
            <mesh material={MAT_YELLOW_SAFETY}>
              <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
            </mesh>
            <mesh position={[0, 0.018, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.11, 0.11, 0.01, 16]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Left & Right Legs (Dark Navy Blue Slacks + Glossy Black Combat Boots) */}
      <group ref={leftLegRef} position={[-0.10, 0.44, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
          <boxGeometry args={[0.13, 0.44, 0.14]} />
        </mesh>
        <mesh position={[0, -0.46, 0.02]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.12, 0.10, 0.20]} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.10, 0.44, 0]}>
        <mesh position={[0, -0.22, 0]} material={MAT_SHIRT_BLAZER_NAVY}>
          <boxGeometry args={[0.13, 0.44, 0.14]} />
        </mesh>
        <mesh position={[0, -0.46, 0.02]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.12, 0.10, 0.20]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── CHECKPOINT HOLOGRAPHIC TELEMETRY HUD ──────────────────────────────────
function CheckpointInspectionHUD({
  checkpointRef,
  checkpointPhase,
  activeVehDir = 1,
}: {
  checkpointRef?: React.MutableRefObject<CheckpointState>;
  checkpointPhase?: CheckpointInspectionPhase;
  activeVehDir?: 1 | -1;
}) {
  const hudRef = useRef<THREE.Group>(null);
  const scanLineRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const cp = checkpointRef?.current;
    const activePhase = cp ? cp.phase : (checkpointPhase || "SENTRY_POST");
    const activeDir = cp ? cp.activeVehDir : activeVehDir;

    const isInspecting =
      activePhase === "INSPECTING_DRIVER_PPE" ||
      activePhase === "INSPECTING_UNDERCARRIAGE" ||
      activePhase === "INSPECTING_CARGO_PROHIBITED" ||
      activePhase === "LOGGING_MANIFEST" ||
      activePhase === "WAVING_CLEARANCE";

    if (hudRef.current) {
      hudRef.current.visible = isInspecting;
      if (isInspecting) {
        const t = clock.getElapsedTime();
        hudRef.current.position.x = activeDir === 1 ? 1.8 : -1.8;
        hudRef.current.position.y = 3.6 + Math.sin(t * 1.8) * 0.06;
      }
    }
    if (scanLineRef.current) {
      const t = clock.getElapsedTime();
      scanLineRef.current.position.x = Math.sin(t * 4.0) * 1.5;
    }
  });

  return (
    <group ref={hudRef} position={[1.8, 3.6, 0]} visible={false}>
      {/* HUD Holographic Glass Backdrop */}
      <mesh material={MAT_GLASS_BLUE}>
        <planeGeometry args={[3.8, 1.1]} />
      </mesh>
      {/* Outer Cyan Cyber Frame */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[1.75, 1.85, 4]} />
        <meshBasicMaterial color="#38BDF8" wireframe />
      </mesh>

      {/* Header Banner */}
      <mesh position={[0, 0.35, 0.02]}>
        <planeGeometry args={[3.6, 0.28]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.2} />
      </mesh>

      {/* Animated Scan Beam Line */}
      <mesh ref={scanLineRef} position={[0, -0.05, 0.03]}>
        <planeGeometry args={[0.08, 0.6]} />
        <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={3.0} />
      </mesh>
    </group>
  );
}

function SecurityGateCheckpointSystem({
  checkpointRef,
  gateAngle,
  onSelectPerson,
}: {
  checkpointRef?: React.MutableRefObject<CheckpointState>;
  gateAngle?: number;
  onSelectPerson?: (id: string) => void;
}) {
  const gateArmRef = useRef<THREE.Group>(null);
  const gateLedMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const rootGroupRef = useRef<THREE.Group>(null);
  const [showGateLights, setShowGateLights] = useState(false);
  const { camera } = useThree();

  // Guardhouse Checkpoint System placed strictly outside the TEMFACIL compound
  // Sitting solidly on ground level Y = 14.15m BESIDE the generator/substation (no overlap)
  const gateTransform = useMemo(() => {
    return {
      point: new THREE.Vector3(95.5, 14.15, -75.5),
      yaw: 2.30,
    };
  }, []);

  useFrame(() => {
    if (rootGroupRef.current) {
      const distSq = camera.position.distanceToSquared(gateTransform.point);
      const inRange = distSq < 40000; // 200 meters
      if (rootGroupRef.current.visible !== inRange) {
        rootGroupRef.current.visible = inRange;
      }
      const near = distSq < 3600; // 60 meters
      if (near !== showGateLights) {
        setShowGateLights(near);
      }
    }

    const cp = checkpointRef?.current;
    const isGateOpen = cp
      ? (cp.phase === "WAVING_CLEARANCE" || cp.phase === "VEHICLE_PASSING")
      : (gateAngle !== undefined && Math.abs(gateAngle) > 0.1);

    const targetAngle = isGateOpen ? -Math.PI / 2.2 : 0;
    if (gateArmRef.current) {
      gateArmRef.current.rotation.z = THREE.MathUtils.lerp(gateArmRef.current.rotation.z, targetAngle, 0.08);
    }
    if (gateLedMatRef.current) {
      const col = isGateOpen ? "#22C55E" : "#EF4444";
      gateLedMatRef.current.color.set(col);
      gateLedMatRef.current.emissive.set(col);
    }
  });

  return (
    <group ref={rootGroupRef} position={[gateTransform.point.x, gateTransform.point.y, gateTransform.point.z]} rotation={[0, gateTransform.yaw, 0]}>
      {/* ═══ 1. ELEVATED SECURITY GUARDHOUSE WITH SOLID FOUNDATION PLINTH (Right Shoulder) ═══ */}
      <group position={[4.6, 0, 0]}>
        {/* Finished Raised Foundation Plinth Slab on Grade (Y = 14.15m) */}
        <mesh position={[0, 0.14, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[3.4, 0.28, 3.4]} />
        </mesh>

        {/* ═══ 2. RED & WHITE SCIC SECURITY GUARDHOUSE BOOTH ═══ */}
        <mesh position={[0, 1.54, 0]} castShadow receiveShadow material={MAT_RED_BOOTH}>
          <boxGeometry args={[2.4, 2.8, 2.4]} />
        </mesh>
        {/* White Trim Pillars */}
        {[-1.18, 1.18].map((xP, i) =>
          [-1.18, 1.18].map((zP, j) => (
            <mesh key={`trim-${i}-${j}`} position={[xP, 1.52, zP]} material={MAT_ID_BADGE_WHITE}>
              <boxGeometry args={[0.08, 2.82, 0.08]} />
            </mesh>
          ))
        )}
        {/* Guardhouse Overhanging Eaves Roof */}
        <mesh position={[0, 2.96, 0]} castShadow material={MAT_STEEL_DARK}>
          <boxGeometry args={[2.9, 0.18, 2.9]} />
        </mesh>

        {/* Road-Facing Glass Sliding Inspection Window */}
        <mesh position={[-1.22, 1.64, 0]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_FRAME}>
          <boxGeometry args={[1.4, 1.0, 0.06]} />
        </mesh>
        <mesh position={[-1.22, 1.64, 0]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_CLEAR}>
          <boxGeometry args={[1.3, 0.9, 0.03]} />
        </mesh>

        {/* Interior Security Workstation Desk & CRT Monitor */}
        <mesh position={[-0.6, 0.89, 0]} material={MAT_TIMBER_STAKE}>
          <boxGeometry args={[0.8, 0.1, 1.8]} />
        </mesh>
        {/* CCTV Monitor Screen (Glowing Green Telemetry) */}
        <mesh position={[-0.6, 1.19, 0.35]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.45]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
        {/* Interior Ambient Booth Light */}
        {showGateLights && <pointLight position={[0, 2.44, 0]} color="#FEF08A" intensity={0.8} distance={5} />}

        {/* SCIC Main Gate Security Signboard Above Window */}
        <group position={[-1.24, 2.44, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh material={MAT_SIGNBOARD_TEAL}>
            <boxGeometry args={[2.0, 0.4, 0.04]} />
          </mesh>
          <mesh position={[0, 0, 0.024]} material={MAT_ID_BADGE_WHITE}>
            <boxGeometry args={[1.85, 0.28, 0.01]} />
          </mesh>
        </group>

        {/* Rear Exterior Aircon Condenser Unit */}
        <mesh position={[1.25, 1.84, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.3, 0.5, 0.7]} />
        </mesh>
      </group>

      {/* ═══ 3. ROAD SPEED BUMPS / RUBBER RUMBLE STRIPS ACROSS ROAD ═══ */}
      {[-2.0, 2.0].map((zBump, i) => (
        <group key={`bump-${i}`} position={[0, 0.04, zBump]}>
          {/* Black Rubber Base */}
          <mesh material={MAT_STEEL_DARK}>
            <boxGeometry args={[7.2, 0.06, 0.4]} />
          </mesh>
          {/* Yellow Chevron Stripes */}
          {[-2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7].map((xS, j) => (
            <mesh key={`stripe-${j}`} position={[xS, 0.035, 0]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.35, 0.02, 0.42]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ═══ 4. TRAFFIC SAFETY CONES (Demarcating Inspection Lane) ═══ */}
      {[-1.5, -0.5, 0.5, 1.5].map((zC, i) => (
        <group key={`cone-${i}`} position={[3.4, 0, zC]}>
          <mesh position={[0, 0.02, 0]} material={MAT_SAFETY_RED}>
            <boxGeometry args={[0.26, 0.04, 0.26]} />
          </mesh>
          <mesh position={[0, 0.26, 0]} material={MAT_SAFETY_RED}>
            <cylinderGeometry args={[0.02, 0.10, 0.50, 8]} />
          </mesh>
          {/* White Reflective Band */}
          <mesh position={[0, 0.26, 0]} material={MAT_ID_BADGE_WHITE}>
            <cylinderGeometry args={[0.055, 0.075, 0.12, 8]} />
          </mesh>
        </group>
      ))}

      {/* ═══ 5. HIGH SECURITY MAST POLE (CCTV DOME & SOLAR FLOODLIGHT) ═══ */}
      <group position={[3.8, 0, -1.6]}>
        <mesh position={[0, 2.8, 0]} material={MAT_STEEL_DARK}>
          <cylinderGeometry args={[0.06, 0.08, 5.6, 8]} />
        </mesh>
        {/* CCTV Dome Camera */}
        <mesh position={[0, 5.4, 0.15]} material={MAT_ID_BADGE_WHITE}>
          <sphereGeometry args={[0.12, 10, 10]} />
        </mesh>
        {/* Solar Photovoltaic Panel */}
        <mesh position={[0, 5.7, -0.2]} rotation={[0.6, 0, 0]} material={MAT_GLASS_BLUE}>
          <boxGeometry args={[0.6, 0.04, 0.8]} />
        </mesh>
        {/* LED Security Floodlight Illuminating Checkpoint */}
        <mesh position={[0, 5.1, 0.2]} rotation={[0.4, 0, 0]} material={MAT_HEADLIGHT_ON}>
          <boxGeometry args={[0.35, 0.2, 0.15]} />
        </mesh>
        {showGateLights && <pointLight position={[0, 4.8, 1.2]} color="#FFFFFF" intensity={1.5} distance={12} />}
      </group>

      {/* ═══ 6. AUTOMATIC BOOM BARRIER GATE MECHANISM ═══ */}
      {/* Heavy Yellow Barrier Post */}
      <mesh position={[3.8, 0.6, 0]} material={MAT_YELLOW_SAFETY}>
        <cylinderGeometry args={[0.16, 0.16, 1.2, 10]} />
      </mesh>
      {/* Steel Base Mount */}
      <mesh position={[3.8, 0.06, 0]} material={MAT_STEEL_DARK}>
        <boxGeometry args={[0.45, 0.12, 0.45]} />
      </mesh>

      {/* Red / Green Clearance LED Signal Light */}
      <mesh position={[3.8, 1.26, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial
          ref={gateLedMatRef}
          color="#EF4444"
          emissive="#EF4444"
          emissiveIntensity={3.5}
        />
      </mesh>

      {/* Rotating Boom Barrier Arm ($7.4m span across road) */}
      <group ref={gateArmRef} position={[3.8, 1.0, 0]}>
        <mesh position={[-3.7, 0, 0]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[7.4, 0.10, 0.06]} />
        </mesh>
        {/* Red Reflective Stripes */}
        {[-1.2, -2.4, -3.6, -4.8, -6.0].map((xOff, i) => (
          <mesh key={`stripe-${i}`} position={[xOff, 0, 0]} material={MAT_RED_BOOTH}>
            <boxGeometry args={[0.32, 0.11, 0.07]} />
          </mesh>
        ))}
      </group>

      {/* ═══ 7. FLOATING 3D HOLOGRAPHIC VISUAL INSPECTION TELEMETRY HUD ═══ */}
      <CheckpointInspectionHUD checkpointRef={checkpointRef} />

      {/* ═══ 8. 🇵🇭 FULLY ANIMATED DOLE/SOSIA FILIPINO SECURITY GUARD ═══ */}
      <AnimatedSecurityGateOfficer
        checkpointRef={checkpointRef}
        onSelectPerson={onSelectPerson}
      />
    </group>
  );
}

// ─── STATIC OBSTACLES FOR DYNAMIC VEHICLE SENSOR MATRIX ─────────────────────
const STATIC_VEHICLE_OBSTACLES: { id: string; pos: THREE.Vector3; radius: number }[] = [
  // Parked Ferrari 458 Italia in VIP Bay
  { id: "PARKED_FERRARI", pos: new THREE.Vector3(116.5, 14.12, -90.5), radius: 2.1 },
  // Tool Staging Shed Material Bundles (Teal Crates)
  { id: "TOOL_SHED_TARP_L", pos: new THREE.Vector3(103.5, 14.8, -79.5), radius: 2.2 },
  { id: "TOOL_SHED_TARP_R", pos: new THREE.Vector3(112.5, 14.8, -79.5), radius: 2.2 },
  // Security Checkpoint Guardhouse Sentry Booth & Island
  { id: "SECURITY_BOOTH", pos: new THREE.Vector3(95.0, 14.15, -77.0), radius: 2.0 },
  // Key Personnel Initial / Standing Compound Coordinates (Zero-lag fallback)
  { id: "STAFF_ALFREDO_ARIZ", pos: new THREE.Vector3(111.0, 14.15, -88.0), radius: 0.8 },
  { id: "STAFF_ROMEO_SESE", pos: new THREE.Vector3(116.5, 14.15, -94.2), radius: 0.8 },
  { id: "STAFF_ROVIGAIL_ABELLAR", pos: new THREE.Vector3(113.5, 14.15, -97.5), radius: 0.8 },
  { id: "STAFF_RUSSELLE_ALCANTARA", pos: new THREE.Vector3(115.0, 14.15, -96.0), radius: 0.8 },
  { id: "GUARD_RONALD_MALTO", pos: new THREE.Vector3(97.5, 14.15, -78.0), radius: 0.8 },
];

// ─── AUTONOMOUS SITE TRAFFIC & PEDESTRIAN LIFE SYSTEM ───────────────────────
function AutonomousSiteTrafficSystem({
  gateAngle,
  onGateAngleChange,
  onSelectPerson,
  timeMode = "day",
}: {
  gateAngle: number;
  onGateAngleChange: (angle: number) => void;
  onSelectPerson?: (id: string) => void;
  timeMode?: "morning" | "day" | "sunset" | "night";
}) {
  // Vehicle Refs
  const vDumpRef = useRef<THREE.Group>(null);
  const vPickupRef = useRef<THREE.Group>(null);
  const vVanRef = useRef<THREE.Group>(null);
  const vPatrolRef = useRef<THREE.Group>(null);
  const timeModeRef = useRef(timeMode);
  timeModeRef.current = timeMode;

  // Pedestrian Refs
  const ped1Ref = useRef<THREE.Group>(null);
  const ped2Ref = useRef<THREE.Group>(null);
  const ped3Ref = useRef<THREE.Group>(null);

  // ─── CHECKPOINT CONTROLLER STATE MACHINE ───
  const checkpointRef = useRef({
    phase: "SENTRY_POST" as CheckpointInspectionPhase,
    activeVehId: null as string | null,
    activeVehDir: 1 as 1 | -1,
    timer: 0,
    walkProgress: 0,
  });

  // Staggered Vehicle Starting States with Dedicated Purpose-Driven Loop Splines
  const vehiclesRef = useRef([
    {
      id: "DUMP_TRUCK",
      spline: DUMP_TRUCK_SPLINE,
      u: 0.12, // Climbing mountain road from Quarry
      speed: 0.015,
      maxCruiseSpeed: 0.015,
      state: "HAULING",
      stateTimer: 0,
      isBraking: false,
      hazardLights: false,
      bedAngle: 0,
      avoidanceOffset: 0,
      pos: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      ref: vDumpRef,
      inboundGate: { stopU: 0.27, clearU: 0.35 },
      outboundGate: { stopU: 0.64, clearU: 0.72 },
      routines: [
        { u: 0.48, duration: 4.5, type: "DEPOT_DUMPING", done: false, targetBedAngle: 0.45 },
        { u: 0.99, duration: 4.0, type: "QUARRY_LOADING", done: false, targetBedAngle: 0.0 },
      ],
    },
    {
      id: "CREW_VAN",
      spline: CREW_VAN_SPLINE,
      u: 0.88, // Descending mountain road or returning to terminal
      speed: 0.017,
      maxCruiseSpeed: 0.017,
      state: "CRUISING",
      stateTimer: 0,
      isBraking: false,
      hazardLights: false,
      bedAngle: 0,
      avoidanceOffset: 0,
      pos: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      ref: vVanRef,
      inboundGate: { stopU: 0.27, clearU: 0.35 },
      outboundGate: { stopU: 0.63, clearU: 0.71 },
      routines: [
        { u: 0.48, duration: 3.5, type: "OFFICE_DROPOFF", done: false, targetBedAngle: 0.0 },
        { u: 0.99, duration: 3.5, type: "STAFF_BOARDING", done: false, targetBedAngle: 0.0 },
      ],
    },
    {
      id: "SITE_PICKUP",
      spline: QAQC_PICKUP_SPLINE,
      u: 0.38, // Approaching Switchyard Substation
      speed: 0.019,
      maxCruiseSpeed: 0.019,
      state: "INSPECTION_PATROL",
      stateTimer: 0,
      isBraking: false,
      hazardLights: false,
      bedAngle: 0,
      avoidanceOffset: 0,
      pos: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      ref: vPickupRef,
      outboundGate: { stopU: 0.11, clearU: 0.19 },
      inboundGate: { stopU: 0.82, clearU: 0.90 },
      routines: [
        { u: 0.45, duration: 3.0, type: "SWITCHYARD_INSPECT", done: false, targetBedAngle: 0.0 },
        { u: 0.56, duration: 2.5, type: "PORTAL_INSPECT", done: false, targetBedAngle: 0.0 },
        { u: 0.99, duration: 3.0, type: "QAQC_STAGING", done: false, targetBedAngle: 0.0 },
      ],
    },
    {
      id: "SECURITY_PATROL",
      spline: SAFETY_PATROL_SPLINE,
      u: 0.05, // Patrolling TEMFACIL compound perimeter
      speed: 0.017,
      maxCruiseSpeed: 0.017,
      state: "PERIMETER_PATROL",
      stateTimer: 0,
      isBraking: false,
      hazardLights: true,
      bedAngle: 0,
      avoidanceOffset: 0,
      pos: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      ref: vPatrolRef,
      outboundGate: { stopU: 0.47, clearU: 0.55 },
      inboundGate: { stopU: 0.85, clearU: 0.93 },
      routines: [
        { u: 0.01, duration: 2.5, type: "TOOL_SHED_CHECK", done: false, targetBedAngle: 0.0 },
        { u: 0.68, duration: 2.5, type: "MOUNTAIN_PERIMETER_CHECK", done: false, targetBedAngle: 0.0 },
      ],
    },
  ]);

  // Pedestrian Crew Walkers with Dedicated Paver Pathways & Zero Wall Clipping
  const pedestriansRef = useRef([
    {
      id: "WALKER_1",
      spline: PEDESTRIAN_PATH_1_SPLINE,
      u: 0.20,
      dir: 1 as 1 | -1,
      speed: 0.013, // 1.15 m/s (~4.15 km/h) natural human walking pace on 88.97m paver loop
      role: "SURVEYOR",
      vestColor: MAT_WORKER_VEST_ORANGE,
      hardhatColor: MAT_WORKER_HARDHAT_WHITE,
      pos: new THREE.Vector3(),
      ref: ped1Ref,
    },
    {
      id: "WALKER_2",
      spline: PEDESTRIAN_PATH_2_SPLINE,
      u: 0.55,
      dir: -1 as 1 | -1,
      speed: 0.0044, // 1.15 m/s (~4.13 km/h) natural shoulder patrol walk on 260.5m mountain spline
      role: "SAFETY_INSPECTOR",
      vestColor: MAT_WORKER_VEST_GREEN,
      hardhatColor: MAT_WORKER_HARDHAT_GREEN,
      pos: new THREE.Vector3(),
      ref: ped2Ref,
    },
    {
      id: "WALKER_3",
      spline: PEDESTRIAN_PATH_3_SPLINE,
      u: 0.70,
      dir: 1 as 1 | -1,
      speed: 0.0048, // 1.25 m/s (~4.50 km/h) purposeful supervisor inspection walk on 260.5m mountain spline
      role: "CIVIL_FOREMAN",
      vestColor: MAT_WORKER_VEST_BLUE,
      hardhatColor: MAT_WORKER_HARDHAT_YELLOW,
      pos: new THREE.Vector3(),
      ref: ped3Ref,
    },
  ]);

  useEffect(() => {
    return () => {
      unregisterLivePersonnel("ENGR_ELGINE_MANGCUPANG");
      unregisterLivePersonnel("CIVIL_JAIME_CANO");
      unregisterLivePersonnel("CIVIL_HENRY_ESTRADA");
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const cp = checkpointRef.current;
    const vehicles = vehiclesRef.current;
    const pedestrians = pedestriansRef.current;

    // Delta clamp prevents frame-hiccup leaping or teleportation across all autonomous entities
    const safeDelta = Math.min(delta, 0.04);

    // ─── 1. SIMULATE WALKING PEDESTRIANS WITH DEDICATED PAVER PATHWAYS & WALL COLLISION AVOIDANCE ───
    pedestrians.forEach((ped) => {
      ped.u = (ped.u + ped.dir * ped.speed * safeDelta + 1.0) % 1.0;

      const rawTransform = getSplineTransform(ped.spline, ped.u, 0, 0.0);
      const safe = resolveBuildingCollisions(rawTransform.point, rawTransform.tangent, 0.6);
      safe.adjustedPos.y = getSiteSurfaceY(safe.adjustedPos.x, safe.adjustedPos.z);
      ped.pos.copy(safe.adjustedPos);

      if (ped.ref.current) {
        const yaw = Math.atan2(safe.adjustedForward.x, safe.adjustedForward.z) + (ped.dir === -1 ? Math.PI : 0);
        ped.ref.current.position.set(safe.adjustedPos.x, safe.adjustedPos.y, safe.adjustedPos.z);
        ped.ref.current.rotation.set(0, yaw, 0);

        // Maintain continuous live positioning for personnel locator beacon
        if (ped.id === "WALKER_1") {
          registerLivePersonnelPosition("ENGR_ELGINE_MANGCUPANG", safe.adjustedPos, ped.ref.current);
        } else if (ped.id === "WALKER_2") {
          registerLivePersonnelPosition("CIVIL_JAIME_CANO", safe.adjustedPos, ped.ref.current);
        } else if (ped.id === "WALKER_3") {
          registerLivePersonnelPosition("CIVIL_HENRY_ESTRADA", safe.adjustedPos, ped.ref.current);
        }
      }
    });

    // ─── 2. ADVANCE CENTRAL SECURITY CHECKPOINT STATE MACHINE ───
    // A. Detect nearest vehicle approaching an active stop line
    if (cp.activeVehId === null && cp.phase === "SENTRY_POST") {
      let candidateVeh: (typeof vehicles)[0] | null = null;
      let candidateDir: 1 | -1 = 1;
      let minDistance = 999;

      vehicles.forEach((v) => {
        // Inbound Stop Line Approach (Uphill into TEMFACIL)
        const distIn = v.inboundGate.stopU - v.u;
        if (distIn > 0 && distIn < 0.055 && distIn < minDistance) {
          minDistance = distIn;
          candidateVeh = v;
          candidateDir = 1;
        }
        // Outbound Stop Line Approach (Downhill out of TEMFACIL)
        const distOut = v.outboundGate.stopU - v.u;
        if (distOut > 0 && distOut < 0.055 && distOut < minDistance) {
          minDistance = distOut;
          candidateVeh = v;
          candidateDir = -1;
        }
      });

      if (candidateVeh) {
        cp.activeVehId = (candidateVeh as any).id;
        cp.activeVehDir = candidateDir;
        cp.phase = "WALKING_TO_VEHICLE";
        cp.walkProgress = 0;
        cp.timer = 0;
      }
    }

    // B. Progress Checkpoint Protocol Sub-routines with Visual Inspection Routine (~8.5s total)
    if (cp.phase === "WALKING_TO_VEHICLE") {
      // Guard steps forward to vehicle driver's window holding clipboard and inspection wand
      cp.walkProgress = Math.min(1.0, cp.walkProgress + safeDelta * 0.9);
      if (cp.walkProgress >= 1.0) {
        cp.phase = "INSPECTING_DRIVER_PPE";
        cp.timer = 2.2; // 2.2s verifying Driver ID, Gate Pass, Hardhat, and Safety Vest
      }
    } else if (cp.phase === "INSPECTING_DRIVER_PPE") {
      cp.timer -= safeDelta;
      if (cp.timer <= 0) {
        cp.phase = "INSPECTING_UNDERCARRIAGE";
        cp.timer = 2.2; // 2.2s convex mirror inspection of undercarriage & chassis with searchlight
      }
    } else if (cp.phase === "INSPECTING_UNDERCARRIAGE") {
      cp.timer -= safeDelta;
      if (cp.timer <= 0) {
        cp.phase = "INSPECTING_CARGO_PROHIBITED";
        cp.timer = 2.0; // 2.0s cargo bed prohibited contraband / cargo inspection
      }
    } else if (cp.phase === "INSPECTING_CARGO_PROHIBITED") {
      cp.timer -= safeDelta;
      if (cp.timer <= 0) {
        cp.phase = "LOGGING_MANIFEST";
        cp.timer = 1.6; // 1.6s signing approval manifest logbook & stamping pass
      }
    } else if (cp.phase === "LOGGING_MANIFEST") {
      cp.timer -= safeDelta;
      if (cp.timer <= 0) {
        cp.phase = "WAVING_CLEARANCE";
        cp.timer = 1.6; // 1.6s clearance wave and upward boom barrier lift (Green LED)
      }
    } else if (cp.phase === "WAVING_CLEARANCE") {
      cp.timer -= safeDelta;
      if (cp.timer <= 0) {
        cp.phase = "VEHICLE_PASSING";
      }
    } else if (cp.phase === "VEHICLE_PASSING") {
      // Check if active vehicle has completely cleared the gate boundary
      const activeVeh = vehicles.find((v) => v.id === cp.activeVehId);
      let isCleared = true;
      if (activeVeh) {
        if (cp.activeVehDir === 1) {
          isCleared = activeVeh.u >= activeVeh.inboundGate.clearU || activeVeh.u < activeVeh.inboundGate.stopU - 0.05;
        } else {
          isCleared = activeVeh.u >= activeVeh.outboundGate.clearU || activeVeh.u < activeVeh.outboundGate.stopU - 0.05;
        }
      }
      if (isCleared) {
        cp.phase = "WALKING_TO_POST";
        cp.activeVehId = null;
      }
    } else if (cp.phase === "WALKING_TO_POST") {
      // Guard steps safely back to sentry post, lowering boom barrier
      cp.walkProgress = Math.max(0.0, cp.walkProgress - safeDelta * 0.9);
      if (cp.walkProgress <= 0.0) {
        cp.phase = "SENTRY_POST";
      }
    }

    // C. Control Boom Barrier Angle (Lifts UPWARDS with Green LED when Cleared)
    const isGateOpen = cp.phase === "WAVING_CLEARANCE" || cp.phase === "VEHICLE_PASSING";
    onGateAngleChange(isGateOpen ? -Math.PI / 2.2 : 0);

    // ─── B. VEHICLE DISPATCH, ANTI-COLLISION & ATMOSPHERE ROUTINES ───
    vehicles.forEach((veh, i) => {
      // 1. NIGHT MODE PARKING LOGIC
      if (timeModeRef.current === "night") {
        if (veh.id === "DUMP_TRUCK") {
          veh.speed = 0;
          veh.isBraking = true;
          veh.pos.set(86.0, 14.85, -96.5);
          veh.forward.set(-1, 0, 0);
          if (vDumpRef.current) {
            vDumpRef.current.position.set(86.0, 14.85, -96.5);
            vDumpRef.current.rotation.set(0, -Math.PI / 2, 0);
          }
          return;
        } else if (veh.id === "CREW_VAN") {
          veh.speed = 0;
          veh.isBraking = true;
          veh.pos.set(77.0, 14.15, -95.0);
          veh.forward.set(0, 0, 1);
          if (vVanRef.current) {
            vVanRef.current.position.set(77.0, 14.15, -95.0);
            vVanRef.current.rotation.set(0, 0, 0);
          }
          return;
        } else if (veh.id === "SITE_PICKUP") {
          veh.speed = 0;
          veh.isBraking = true;
          veh.pos.set(135.0, 14.15, -74.5);
          veh.forward.set(1, 0, 0);
          if (vPickupRef.current) {
            vPickupRef.current.position.set(135.0, 14.15, -74.5);
            vPickupRef.current.rotation.set(0, Math.PI / 2, 0);
          }
          return;
        }
        // SECURITY_PATROL continues night patrol!
      }

      // Checkpoint and Routine Timers
      if (veh.stateTimer > 0) {
        veh.stateTimer -= safeDelta;
        veh.speed = THREE.MathUtils.damp(veh.speed, 0, 8.0, safeDelta);
        veh.isBraking = true;

        if (veh.id === "DUMP_TRUCK") {
          const targetBed = veh.state === "DEPOT_DUMPING" ? 0.45 : 0;
          veh.bedAngle = THREE.MathUtils.lerp(veh.bedAngle, targetBed, 0.08);
          if (vDumpRef.current) {
            const tipperBed = vDumpRef.current.getObjectByName("dumpTipperBed");
            if (tipperBed) tipperBed.rotation.x = -veh.bedAngle;
          }
        }
        return;
      }

      let targetSpeed = veh.maxCruiseSpeed;
      let hardBrake = false;

      // 2. Checkpoint Stop Line Compliance
      const checkGateStop = (stopU: number, clearU: number) => {
        const distToStop = stopU - veh.u;
        if (distToStop >= 0 && distToStop < 0.045) {
          if (veh.id === cp.activeVehId) {
            if (cp.phase !== "WAVING_CLEARANCE" && cp.phase !== "VEHICLE_PASSING") {
              if (distToStop < 0.005) {
                targetSpeed = 0;
                hardBrake = true;
              } else {
                targetSpeed = Math.min(targetSpeed, (distToStop / 0.04) * veh.maxCruiseSpeed * 0.45);
              }
            } else {
              targetSpeed = veh.maxCruiseSpeed * 0.85;
            }
          } else {
            // Must wait behind stop line or behind lead vehicle without snapping coordinates
            if (distToStop < 0.008) {
              targetSpeed = 0;
              hardBrake = true;
            } else {
              targetSpeed = Math.min(targetSpeed, (distToStop / 0.04) * veh.maxCruiseSpeed * 0.45);
            }
          }
        }
      };

      checkGateStop(veh.inboundGate.stopU, veh.inboundGate.clearU);
      checkGateStop(veh.outboundGate.stopU, veh.outboundGate.clearU);

      // 3. INTELLIGENT DYNAMIC OBSTACLE AVOIDANCE & LATERAL REROUTING SYSTEM
      // Vehicles actively detect personnel, pedestrians, static objects, and other fleet vehicles,
      // steering laterally around them on the road, and coming to a smooth yielding stop if blocked.
      const vehRadius = veh.id === "DUMP_TRUCK" ? 2.0 : veh.id === "CREW_VAN" ? 1.6 : 1.5;
      const sensorRange = veh.id === "DUMP_TRUCK" ? 16.0 : 14.0;
      const maxEvasionOffset = veh.id === "DUMP_TRUCK" ? 2.1 : 2.4;

      // Baseline spline transform at current position
      const dCenter = getSplineTransform(veh.spline, veh.u, 0, 0.04);
      const basePt = dCenter.point;
      const fwd = dCenter.tangent.clone().setY(0).normalize();
      // Right normal vector perpendicular to vehicle forward travel (X-Z plane)
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();

      let desiredOffset = 0;
      let minSafeSpeed = veh.maxCruiseSpeed;
      let yieldStop = false;

      // A. Evaluate Fleet Vehicles (Oncoming passing, follow-distance & queue management)
      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const other = vehicles[j];
        const dist = basePt.distanceTo(other.pos);

        if (dist < 24.0) {
          const toOther = new THREE.Vector3().subVectors(other.pos, basePt);
          const fwdDist = toOther.dot(fwd);
          const latDist = toOther.dot(right);
          const headingDot = fwd.dot(other.forward);

          if (headingDot < -0.35) {
            // Oncoming vehicle traveling opposite direction (e.g. 2-lane mountain incline / compound road)
            // Steer right (Philippine standard traffic convention) to widen passing clearance
            if (fwdDist > 0.5 && fwdDist < 18.0) {
              desiredOffset = Math.max(desiredOffset, 1.2);
              if (fwdDist < 7.5 && Math.abs(latDist) < 3.2) {
                minSafeSpeed = Math.min(minSafeSpeed, veh.maxCruiseSpeed * 0.45);
                if (fwdDist < 4.2 && Math.abs(latDist) < 2.4) {
                  yieldStop = true;
                }
              }
            }
          } else if (fwdDist > 0.5 && fwdDist < 22.0) {
            // Following lead vehicle ahead in same direction
            if (fwdDist < 9.5) {
              yieldStop = true;
            } else {
              const followSpeed = ((fwdDist - 9.5) / 12.5) * veh.maxCruiseSpeed;
              minSafeSpeed = Math.min(minSafeSpeed, Math.max(0, followSpeed));
            }
          }
        }
      }

      // B. Dynamic Obstacle Sensing & Lateral Evasion Helper
      const checkObstacle = (obsPos: THREE.Vector3, obsRadius: number) => {
        const dx = obsPos.x - basePt.x;
        const dz = obsPos.z - basePt.z;
        // Fast broad-phase AABB test
        if (Math.abs(dx) > sensorRange || Math.abs(dz) > sensorRange) return;
        if (Math.abs(obsPos.y - basePt.y) > 3.8) return; // Disregard entities on different terrace elevations

        const forwardDist = dx * fwd.x + dz * fwd.z;
        if (forwardDist <= 0.3 || forwardDist >= sensorRange) return; // Behind vehicle or out of sensor cone

        const lateralDist = dx * right.x + dz * right.z;
        const requiredClearance = vehRadius + obsRadius + 0.6; // Minimum safe lateral clearance

        // If obstacle is within our road clearance corridor:
        if (Math.abs(lateralDist) < requiredClearance + 1.2) {
          // Calculate needed lateral deflection to steer around obstacle
          let steerNeeded = 0;
          if (lateralDist >= 0) {
            // Obstacle is on our right or center -> steer LEFT
            steerNeeded = lateralDist - requiredClearance;
          } else {
            // Obstacle is on our left -> steer RIGHT
            steerNeeded = lateralDist + requiredClearance;
          }

          steerNeeded = Math.max(-maxEvasionOffset, Math.min(maxEvasionOffset, steerNeeded));

          if (Math.abs(steerNeeded) > Math.abs(desiredOffset)) {
            desiredOffset = steerNeeded;
          }

          // Check if current vehicle position & evasion offset would intersect
          const effectiveGap = lateralDist - veh.avoidanceOffset;
          if (Math.abs(effectiveGap) < requiredClearance) {
            if (forwardDist < 4.4) {
              // Obstacle dead ahead with insufficient clearance -> yield to complete stop
              yieldStop = true;
            } else if (forwardDist < 10.5) {
              // Smooth deceleration to allow vehicle to steer around safely
              const frac = (forwardDist - 4.4) / (10.5 - 4.4);
              const approachSpeed = veh.maxCruiseSpeed * Math.max(0.002, frac * 0.55);
              minSafeSpeed = Math.min(minSafeSpeed, approachSpeed);
            }
          }
        }
      };

      // C. Evaluate Moving Pedestrians (Walkers 1, 2, 3)
      pedestrians.forEach((ped) => {
        checkObstacle(ped.pos, 0.7);
      });

      // D. Evaluate All Registered Live Workforce Personnel Across Site
      LIVE_PERSONNEL_WORLD_POSITIONS.forEach((pPos) => {
        checkObstacle(pPos, 0.75);
      });

      // E. Evaluate Static Crates, Tool Shed Bundles, Parked Ferrari & Key Infrastructure
      STATIC_VEHICLE_OBSTACLES.forEach((obs) => {
        checkObstacle(obs.pos, obs.radius);
      });

      // Combine speed throttling
      if (yieldStop || minSafeSpeed <= 0.003) {
        targetSpeed = 0;
        hardBrake = true;
      } else {
        targetSpeed = Math.min(targetSpeed, minSafeSpeed);
      }

      // Smoothly damp vehicle velocity
      veh.isBraking = hardBrake;
      veh.speed = THREE.MathUtils.damp(veh.speed, targetSpeed, hardBrake ? 6.5 : 2.5, safeDelta);
      veh.u = (veh.u + veh.speed * safeDelta) % 1.0;

      // 4. Trigger Routines
      veh.routines.forEach((rt) => {
        const distToRoutine = Math.abs(veh.u - rt.u);
        if (distToRoutine < 0.014 && !rt.done && veh.stateTimer <= 0) {
          veh.state = rt.type;
          veh.stateTimer = rt.duration;
          rt.done = true;
          veh.hazardLights = true;
        } else if (distToRoutine > 0.15) {
          rt.done = false;
        }
      });

      // 5. Smoothly Damp Lateral Avoidance Offset
      veh.avoidanceOffset = THREE.MathUtils.damp(
        veh.avoidanceOffset,
        desiredOffset,
        hardBrake ? 2.5 : 3.8,
        safeDelta
      );

      // 6. Compute 3D Transform, Dynamic Steering Yaw & Hard Wall Collision Resolution
      // Base point on road spline at updated u
      const dUpdated = getSplineTransform(veh.spline, veh.u, 0, 0.04);
      const updatedBase = dUpdated.point;
      const updatedFwd = dUpdated.tangent.clone().setY(0).normalize();
      const updatedRight = new THREE.Vector3(-updatedFwd.z, 0, updatedFwd.x).normalize();

      // Apply lateral avoidance offset along road normal (right vector)
      const reroutedPos = updatedBase.clone().addScaledVector(updatedRight, veh.avoidanceOffset);

      // Sample ahead and behind for pitch and dynamic steering yaw
      const aheadU = (veh.u + 0.012) % 1.0;
      const behindU = (veh.u - 0.012 + 1.0) % 1.0;
      const dAhead = getSplineTransform(veh.spline, aheadU, 0, 0.04);
      const dBehind = getSplineTransform(veh.spline, behindU, 0, 0.04);

      const aheadFwd = dAhead.tangent.clone().setY(0).normalize();
      const aheadRight = new THREE.Vector3(-aheadFwd.z, 0, aheadFwd.x).normalize();
      const anticipatedOffset = THREE.MathUtils.lerp(veh.avoidanceOffset, desiredOffset, 0.35);
      const reroutedAhead = dAhead.point.clone().addScaledVector(aheadRight, anticipatedOffset);

      const dynamicForward = new THREE.Vector3().subVectors(reroutedAhead, reroutedPos).setY(0).normalize();
      if (dynamicForward.lengthSq() < 0.001) {
        dynamicForward.copy(updatedFwd);
      }

      // Hard Boundary Defense: Push-out against rigid buildings, fences, and crates
      const safeTransform = resolveBuildingCollisions(reroutedPos, dynamicForward, vehRadius);

      // Dual-Axle Ground Sampling & Local 'YXZ' Incline Kinematics
      const isDump = veh.id === "DUMP_TRUCK";
      const wheelbase = isDump ? 4.4 : 3.2;
      const halfL = wheelbase * 0.5;

      const fwdVec = safeTransform.adjustedForward.clone().setY(0).normalize();
      const frontAxle = safeTransform.adjustedPos.clone().addScaledVector(fwdVec, halfL);
      const rearAxle = safeTransform.adjustedPos.clone().addScaledVector(fwdVec, -halfL);

      const yFront = getSiteSurfaceY(frontAxle.x, frontAxle.z);
      const yRear = getSiteSurfaceY(rearAxle.x, rearAxle.z);

      const centerGroundY = (yFront + yRear) * 0.5 + 0.04;
      safeTransform.adjustedPos.y = Math.max(safeTransform.adjustedPos.y, centerGroundY);

      // In Three.js with 'YXZ' Euler order:
      // Negative rotation around local X tilts the front UP when ascending an incline (yFront > yRear)
      const rawPitch = -Math.atan2(yFront - yRear, wheelbase);
      const clampedPitch = Math.max(-0.28, Math.min(0.28, rawPitch));
      const yaw = Math.atan2(safeTransform.adjustedForward.x, safeTransform.adjustedForward.z);

      veh.pos.copy(safeTransform.adjustedPos);
      veh.forward.copy(safeTransform.adjustedForward);

      if (veh.ref.current) {
        veh.ref.current.position.set(safeTransform.adjustedPos.x, safeTransform.adjustedPos.y, safeTransform.adjustedPos.z);
        veh.ref.current.rotation.set(clampedPitch, yaw, 0, "YXZ");
      }
    });
  });

  return (
    <group>
      {/* ═══ 1. INTERACTIVE TEMFACIL SECURITY CHECKPOINT BOOM GATE WITH FILIPINO OFFICER ═══ */}
      <SecurityGateCheckpointSystem
        checkpointRef={checkpointRef}
        onSelectPerson={onSelectPerson}
      />

      {/* ═══ 2. VEHICLE FLEET WITH DISTINCT MISSIONS & COLLISION AVOIDANCE ═══ */}
      {/* Vehicle 1: Heavy 10-Wheeler Dump Truck (Quarry Logistics) */}
      <group ref={vDumpRef}>
        <SCICHeavyDumpTruck bodyColor="#DC2626" headlightsOn={timeModeRef.current === "sunset" || timeModeRef.current === "night"} />
      </group>

      {/* Vehicle 2: SCIC 4x4 Site Pickup (QA/QC Inspection Patrol) */}
      <group ref={vPickupRef}>
        <SCICSitePickupTruck bodyColor="#FFFFFF" headlightsOn={timeModeRef.current === "sunset" || timeModeRef.current === "night"} />
      </group>

      {/* Vehicle 3: Toyota HiAce Crew Commuter Van (Shift Workforce Transfer) */}
      <group ref={vVanRef}>
        <ToyotaHiaceCrewVan bodyColor="#E2E8F0" headlightsOn={timeModeRef.current === "sunset" || timeModeRef.current === "night"} />
      </group>

      {/* Vehicle 4: Safety Patrol 4x4 with Flashing Strobe */}
      <group ref={vPatrolRef}>
        <SCICSitePickupTruck bodyColor="#F59E0B" headlightsOn={timeModeRef.current === "sunset" || timeModeRef.current === "night"} />
      </group>

      {/* ═══ 3. DEDICATED WALKING PEDESTRIANS (ANIMATED BIOMECHANICAL STRIDE) ═══ */}
      {/* Pedestrian 1: Lead QA/QC Head (Engr. Elgine Mangcupang) */}
      <group ref={ped1Ref}>
        <HydroProjectPersonMesh
          personnelId="ENGR_ELGINE_MANGCUPANG"
          onSelectPerson={onSelectPerson}
          isPatrolling={true}
          gender="FEMALE"
          skinTone="LIGHT"
          hairStyle="WOMAN_PONYTAIL"
          hairColor="BLACK"
          hasGlasses
          hasHardhat
          hardhatColor="#FFFFFF"
          hasVest
          vestColor="#EA580C"
          pantsStyle="JEANS"
          accessory="TABLET"
        />
      </group>

      {/* Pedestrian 2: Civil Works Supervisor (Jaime Cano) walking on shoulder */}
      <group ref={ped2Ref}>
        <HydroProjectPersonMesh
          personnelId="CIVIL_JAIME_CANO"
          onSelectPerson={onSelectPerson}
          isPatrolling={true}
          skinTone="MEDIUM"
          hasHardhat
          hardhatColor="#16A34A"
          hasVest
          vestColor="#EA580C"
          pantsStyle="JEANS"
          accessory="NONE"
        />
      </group>

      {/* Pedestrian 3: Civil Works & 4S Supervisor (Henry Estrada) with Blender Rigged Skeletal Locomotion */}
      <group
        ref={ped3Ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPerson?.("CIVIL_HENRY_ESTRADA");
        }}
      >
        <RealisticSCICCivilForemanModel currentAction="Foreman_Walk" />
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 👷 ENGR. JIMMY M. AQUINO (QC ENGINEER — CIVIL STRUCTURES & TAILRACE HYDRAULIC INSPECTION)
// ═══════════════════════════════════════════════════════════════════════════
function TailraceCivilQCEngineer({ onSelectPerson }: { onSelectPerson?: (id: string) => void }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const hammerRef = useRef<THREE.Group>(null);
  const clipboardRef = useRef<THREE.Group>(null);
  const radioRef = useRef<THREE.Group>(null);
  const laserRef = useRef<THREE.Group>(null);
  const frameTickRef = useRef<number>(0);

  React.useEffect(() => {
    return () => {
      unregisterLivePersonnel("QC_JIMMY_AQUINO");
    };
  }, []);

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();

    // 50-second continuous structural QA/QC inspection routine along dry concrete apron walkway
    const cycle = t % 50.0;
    const walkwayX = -10.8;
    const walkwayY = 0.55; // Solidly grounded on the concrete apron floor next to floodwall

    let targetX = walkwayX;
    let targetZ = 7.5;
    let targetY = walkwayY;
    let rotY = 0;
    let isWalking = false;
    let task = "WALKING";

    if (cycle < 12.0) {
      // Phase 1: Walking south along floodwall inspection walkway
      const p = cycle / 12.0;
      targetZ = THREE.MathUtils.lerp(7.5, 16.5, p);
      rotY = 0; // facing south
      isWalking = true;
      task = "WALKING";
    } else if (cycle < 22.0) {
      // Phase 2: Schmidt Rebound Hammer NDT compressive testing on concrete joint
      targetZ = 16.5;
      rotY = 0.25; // angled toward concrete floodwall
      task = "SCHMIDT_TEST";
    } else if (cycle < 30.0) {
      // Phase 3: Leaning on yellow safety railing, inspecting tailrace boil turbulence & staff gauge
      targetZ = 16.5;
      rotY = Math.PI / 2; // facing east toward tailrace water
      task = "RAILING_INSPECT";
    } else if (cycle < 38.0) {
      // Phase 4: Logging technical readings on QA/QC checklist clipboard
      targetZ = 16.5;
      rotY = Math.PI / 2;
      task = "LOGGING_CLIPBOARD";
    } else if (cycle < 44.0) {
      // Phase 5: Two-way radio check reporting clearance to Powerhouse Control Room
      targetZ = 16.5;
      rotY = Math.PI / 2;
      task = "RADIO_REPORT";
    } else {
      // Phase 6: Walking north back toward draft tube headwall
      const p = (cycle - 44.0) / 6.0;
      targetZ = THREE.MathUtils.lerp(16.5, 7.5, p);
      rotY = Math.PI; // facing north
      isWalking = true;
      task = "WALKING";
    }

    // Update root position
    rootRef.current.position.set(targetX, targetY, targetZ);
    rootRef.current.rotation.y = rotY;

    // Register live position for Engr. Jimmy
    rootRef.current.getWorldPosition(scratchJimmyWorldPos);
    registerLivePersonnelPosition("QC_JIMMY_AQUINO", scratchJimmyWorldPos, rootRef.current);

    // Biomechanical Kinematics
    if (isWalking) {
      const walkT = t * 6.0;
      const legStride = Math.sin(walkT) * 0.48;
      const armSwing = Math.sin(walkT) * 0.38;
      const bounce = Math.abs(Math.sin(walkT)) * 0.035;

      rootRef.current.position.y = targetY + bounce;

      if (leftLegRef.current) leftLegRef.current.rotation.set(legStride, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-legStride, 0, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, 0.25, 0.05); // holding clipboard firmly
      if (rightArmRef.current) rightArmRef.current.rotation.set(armSwing, -0.08, 0.05);
      if (torsoRef.current) torsoRef.current.rotation.set(0.04, Math.cos(walkT) * 0.05, 0);
      if (headRef.current) headRef.current.rotation.set(0.05, 0, 0);

      if (hammerRef.current) hammerRef.current.visible = false;
      if (laserRef.current) laserRef.current.visible = false;
      if (radioRef.current) radioRef.current.visible = false;
      if (clipboardRef.current) clipboardRef.current.visible = true;
    } else if (task === "SCHMIDT_TEST") {
      // Schmidt Rebound Hammer NDT
      const hammerPress = Math.sin(t * 3.5);
      if (leftLegRef.current) leftLegRef.current.rotation.set(0.15, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(-0.25, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.18, 0.1, 0);
      if (headRef.current) headRef.current.rotation.set(0.32, -0.15, 0);

      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.15 + hammerPress * 0.08, -0.2, 0.1);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.65, 0.35, 0);

      if (hammerRef.current) hammerRef.current.visible = true;
      if (laserRef.current) laserRef.current.visible = false;
      if (radioRef.current) radioRef.current.visible = false;
      if (clipboardRef.current) clipboardRef.current.visible = false;
    } else if (task === "RAILING_INSPECT") {
      // Leaning over yellow safety railing inspecting water elevation & floodgate
      const laserScan = Math.sin(t * 1.5) * 0.12;
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.14, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0.24 + laserScan * 0.5, 0, 0);

      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.25 + laserScan, -0.1, -0.05);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.75, 0.25, 0.1); // resting on railing

      if (laserRef.current) laserRef.current.visible = true;
      if (hammerRef.current) hammerRef.current.visible = false;
      if (radioRef.current) radioRef.current.visible = false;
      if (clipboardRef.current) clipboardRef.current.visible = false;
    } else if (task === "LOGGING_CLIPBOARD") {
      // Writing inspection notes onto clipboard
      const writeMotion = Math.sin(t * 5.0) * 0.04;
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.06, 0, 0);
      if (headRef.current) headRef.current.rotation.set(0.38, 0, 0);

      if (leftArmRef.current) leftArmRef.current.rotation.set(-1.15, 0.35, 0.1);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.25 + writeMotion, -0.3, 0.15);

      if (clipboardRef.current) clipboardRef.current.visible = true;
      if (hammerRef.current) hammerRef.current.visible = false;
      if (laserRef.current) laserRef.current.visible = false;
      if (radioRef.current) radioRef.current.visible = false;
    } else if (task === "RADIO_REPORT") {
      // Two-way radio check
      const headNod = Math.sin(t * 2.5) * 0.08;
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.02, 0, 0);
      if (headRef.current) headRef.current.rotation.set(headNod, 0.12, 0);

      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.65, -0.25, -0.15); // radio to ear
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, 0.25, 0.05);

      if (radioRef.current) radioRef.current.visible = true;
      if (clipboardRef.current) clipboardRef.current.visible = true;
      if (hammerRef.current) hammerRef.current.visible = false;
      if (laserRef.current) laserRef.current.visible = false;
    }
  });

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        if (onSelectPerson) {
          e.stopPropagation();
          onSelectPerson("QC_JIMMY_AQUINO");
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Invisible Raycast Collider for effortless click selection */}
      <mesh position={[0, 0.95, 0]} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Legs */}
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

      {/* Torso with High-Vis Orange Safety Vest & ID Badge */}
      <group ref={torsoRef} position={[0, 0.82, 0]}>
        <mesh position={[0, 0.26, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
          <boxGeometry args={[0.38, 0.52, 0.22]} />
        </mesh>
        {/* High-Vis Orange Safety Vest */}
        <mesh position={[0, 0.26, 0]} material={MAT_WORKER_VEST_ORANGE}>
          <boxGeometry args={[0.39, 0.50, 0.23]} />
        </mesh>
        {/* Silver Reflective Safety Stripes */}
        <mesh position={[0, 0.32, 0.118]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.36, 0.035, 0.005]} />
        </mesh>
        <mesh position={[0, 0.16, 0.118]} material={MAT_FOOD_STAINLESS_TRAY}>
          <boxGeometry args={[0.36, 0.035, 0.005]} />
        </mesh>
        {/* QA/QC ID Badge Lanyard */}
        <mesh position={[-0.08, 0.22, 0.12]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[0.06, 0.09, 0.005]} />
        </mesh>

        {/* Sculpted Filipino Character Head with White Engineer Hardhat */}
        <group ref={headRef} position={[0, 0.54, 0]}>
          <FilipinoCharacterHead skinTone="MEDIUM" headwear="HARDHAT_WHITE" />
        </group>

        {/* Left Arm & Clipboard */}
        <group ref={leftArmRef} position={[-0.23, 0.42, 0]}>
          <mesh position={[0, -0.20, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.42, 0.095]} />
          </mesh>

          {/* QA/QC Structural Inspection Checklist Clipboard */}
          <group ref={clipboardRef} position={[0, -0.32, 0.12]}>
            {/* Hardboard Base */}
            <mesh position={[0, 0, 0]} material={MAT_TIMBER_STAKE}>
              <boxGeometry args={[0.22, 0.32, 0.012]} />
            </mesh>
            {/* Checklist White Sheet */}
            <mesh position={[0, -0.01, 0.008]} material={MAT_ID_BADGE_WHITE}>
              <boxGeometry args={[0.19, 0.28, 0.002]} />
            </mesh>
            {/* Aluminum Clip Header */}
            <mesh position={[0, 0.14, 0.012]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.09, 0.035, 0.015]} />
            </mesh>
          </group>
        </group>

        {/* Right Arm & Handheld Instruments */}
        <group ref={rightArmRef} position={[0.23, 0.42, 0]}>
          <mesh position={[0, -0.20, 0]} material={MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.095, 0.42, 0.095]} />
          </mesh>

          {/* 🔨 Schmidt Concrete Rebound Hammer NDT Tester */}
          <group ref={hammerRef} position={[0, -0.36, 0.12]} visible={false}>
            {/* Red Impact Body */}
            <mesh position={[0, 0, 0]} material={MAT_SCHMIDT_HAMMER_RED}>
              <cylinderGeometry args={[0.028, 0.028, 0.24, 10]} />
            </mesh>
            {/* Steel Plunger Rod */}
            <mesh position={[0, -0.16, 0]} material={MAT_SCHMIDT_HAMMER_CHROME}>
              <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
            </mesh>
            {/* Calibrated PSI Dial */}
            <mesh position={[0.02, 0.02, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <boxGeometry args={[0.02, 0.06, 0.03]} />
            </mesh>
          </group>

          {/* 📏 Laser Distance & Water Elevation Meter */}
          <group ref={laserRef} position={[0, -0.32, 0.10]} visible={false}>
            <mesh position={[0, 0, 0]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.055, 0.12, 0.04]} />
            </mesh>
            <mesh position={[0, 0.07, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
              <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
            </mesh>
          </group>

          {/* 📻 Motorola Site Two-Way Radio */}
          <group ref={radioRef} position={[0, -0.30, 0.08]} visible={false}>
            <mesh position={[0, 0, 0]} material={MAT_STEEL_DARK}>
              <boxGeometry args={[0.048, 0.12, 0.032]} />
            </mesh>
            {/* Flexible Antenna */}
            <mesh position={[-0.015, 0.10, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.004, 0.004, 0.14, 6]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. MAIN EXPORT: ANIMATED SITE ENTITIES & WORKFORCE LIFE SIMULATION
   ═══════════════════════════════════════════════════════════════════════════ */


// ═══════════════════════════════════════════════════════════════════════════
// 🏭 DYNAMIC WAREHOUSE & LAYDOWN YARD INSPECTION & LOGISTICS ROUTINES
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 🏭 REALISTIC WAREHOUSE LOGISTICS RECEIVING DESK & WORKFORCE STATIONS
// ═══════════════════════════════════════════════════════════════════════════
function WarehouseDynamicOperations({
  onSelectPerson,
}: {
  onSelectPerson?: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const WAREHOUSE_POS = useMemo(() => new THREE.Vector3(89.5, 14.85, -96.3), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const distSq = camera.position.distanceToSquared(WAREHOUSE_POS);
    const inRange = distSq < 32400; // 180 meters
    if (groupRef.current.visible !== inRange) {
      groupRef.current.visible = inRange;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 📋 WAREHOUSE RECEIVING LOGISTICS DESK & STAGING APPARATUS (Open Concrete Apron) */}
      <group position={[89.5, 14.85, -96.3]} rotation={[0, 0, 0]}>
        {/* Heavy-Duty Steel Frame Warehouse Desk (Standing Waist Height 0.75m) */}
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[1.40, 0.05, 0.75]} />
          <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Steel Tubular Legs (0.725m, resting solidly on the apron slab) */}
        {[-0.62, 0.62].map((lx, i) =>
          [-0.30, 0.30].map((lz, j) => (
            <mesh key={`wdesk-leg-${i}-${j}`} position={[lx, 0.3625, lz]}>
              <cylinderGeometry args={[0.025, 0.025, 0.725, 8]} />
              <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.8} />
            </mesh>
          ))
        )}
        {/* Rugged Industrial Panasonic Toughbook Laptop */}
        <group position={[-0.32, 0.79, 0.05]} rotation={[0, 0.1, 0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.02, 0.24]} />
            <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.7} />
          </mesh>
          <group position={[0, 0.01, -0.11]} rotation={[-0.3, 0, 0]}>
            <mesh position={[0, 0.11, 0]}>
              <boxGeometry args={[0.34, 0.22, 0.015]} />
              <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.11, 0.009]}>
              <planeGeometry args={[0.31, 0.19]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
          </group>
        </group>
        {/* Rebar Mill Test Certificates & Delivery Manifests */}
        <mesh position={[0.22, 0.78, 0.02]} rotation={[0, -0.15, 0]}>
          <boxGeometry args={[0.28, 0.015, 0.36]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
        </mesh>
        {/* Industrial Handheld Barcode Scanner on Dock */}
        <group position={[0.48, 0.80, -0.10]} rotation={[0, -0.3, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.04, 0.14]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* 📦 1. Warehouse Area Lead — Vincent Dickenson Andallo */}
      {/* Positioned comfortably behind his receiving desk, reviewing manifests and inventory */}
      <HydroProjectPersonMesh
        personnelId="WAREHOUSE_VINCENT_ANDALLO"
        onSelectPerson={onSelectPerson}
        position={[89.5, 14.85, -97.0]}
        rotation={[0, 0, 0]}
        skinTone="BRONZE"
        hairStyle="SHORT"
        facialHair="GOATEE"
        hasHardhat
        hardhatColor="#0284C7"
        hasVest
        vestColor="#EAB308"
        pantsStyle="JEANS"
        accessory="TABLET"
      />

      {/* 🚜 2. Heavy Equipment & Fleet Supervisor — Howell Gene Samson */}
      {/* Positioned on the open inspection apron, clear of material bundles */}
      <HydroProjectPersonMesh
        personnelId="EQUIP_HOWELL_SAMSON"
        onSelectPerson={onSelectPerson}
        position={[86.5, 14.85, -94.8]}
        rotation={[0, -Math.PI / 3, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#EAB308"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="RADIO"
      />

      {/* 📋 3. Warehouse Dispatch Lead / Materials Inspector */}
      {/* Stationed at the arrival staging apron with clipboard, inspecting incoming deliveries */}
      <HydroProjectPersonMesh
        onSelectPerson={onSelectPerson}
        position={[92.5, 14.85, -95.5]}
        rotation={[0, 0.15, 0]}
        role="MATERIALS_INSPECTOR"
        skinTone="DEEP"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0D9488"
        pantsStyle="CARGO"
        accessory="CLIPBOARD"
      />
    </group>
  );
}

export function AnimatedSiteEntities({
  onSelectPerson,
  timeMode = "day",
}: {
  onSelectPerson?: (id: string) => void;
  timeMode?: "morning" | "day" | "sunset" | "night" | "MORNING" | "AFTERNOON" | "SUNSET" | "NIGHT";
}) {
  const [currentGateAngle, setCurrentGateAngle] = useState<number>(0);

  const normalizedTime: "morning" | "day" | "sunset" | "night" = useMemo(() => {
    const t = timeMode?.toLowerCase();
    if (t === "afternoon" || t === "day") return "day";
    if (t === "morning") return "morning";
    if (t === "sunset") return "sunset";
    if (t === "night") return "night";
    return "day";
  }, [timeMode]);

  const y1 = useMemo(() => getSiteSurfaceY(76, -110), []);
  const y2 = useMemo(() => getSiteSurfaceY(90, -96), []);
  const y3 = useMemo(() => getSiteSurfaceY(96, -96), []);

  return (
    <group>
      {/* ═══ 1. HIGH-PRECISION POWERHOUSE, DAM & TUNNEL FIELD WORKFORCE ═══ */}
      {/* 👷 Tailrace Civil QA/QC Quality Engineer (Engr. Jimmy M. Aquino) on dry concrete apron floor */}
      <TailraceCivilQCEngineer onSelectPerson={onSelectPerson} />

      {/* ⚡ Powerhouse Mechanical Commissioning Engineer (Supt. Eugenio Hanopol) at Turbine Bay TU-01 */}
      <HydroProjectPersonMesh
        personnelId="SUPT_EUGENIO_HANOPOL"
        onSelectPerson={onSelectPerson}
        position={[-2.0, 0.55, 0.0]}
        rotation={[0, 0, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasGlasses={false}
        facialHair="MUSTACHE"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="CLIPBOARD"
      />


      {/* ⚡ Electrical Superintendent (Eduardo G. De Francia) on dry switchyard platform */}
      <HydroProjectPersonMesh
        personnelId="SUPT_EDUARDO_DEFRANCIA"
        onSelectPerson={onSelectPerson}
        position={[18.0, 0.55, -6.0]}
        rotation={[0, Math.PI / 4, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasGlasses={false}
        facialHair="MUSTACHE"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="RADIO"
      />

      {/* ⚡ Supervisor III - Electrical Works (Josue A. Abellera) at Powerhouse IPB Busduct Yard */}
      <HydroProjectPersonMesh
        personnelId="ELEC_JOSUE_ABELLERA"
        onSelectPerson={onSelectPerson}
        position={[12.0, 0.55, 2.0]}
        rotation={[0, -Math.PI / 2, 0]}
        skinTone="BRONZE"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#0284C7"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="CLIPBOARD"
      />

      {/* ⚡ Foreman I - Electrical (Warlito D. De Francia) at Powerhouse Control Cubicle Bay */}
      <HydroProjectPersonMesh
        personnelId="FOREMAN_WARLITO_DEFRANCIA"
        onSelectPerson={onSelectPerson}
        position={[4.0, 6.2, -2.0]}
        rotation={[0, Math.PI, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#0284C7"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="BINDER"
      />

      {/* 🏗️ Supervisor III - Civil Works (Jaime B. Caño Jr.) at Powerhouse Apron */}
      <HydroProjectPersonMesh
        personnelId="CIVIL_JAIME_CANO"
        onSelectPerson={onSelectPerson}
        position={[8.0, 0.55, -12.0]}
        rotation={[0, -Math.PI / 3, 0]}
        skinTone="BRONZE"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="CLIPBOARD"
      />


      {/* 🏗️ Foreman III - Civil Structures (Anthony B. Rosales) on concrete Lower Penstock Anchor Block TB-04 slab */}
      <HydroProjectPersonMesh
        personnelId="FOREMAN_ANTHONY_ROSALES"
        onSelectPerson={onSelectPerson}
        position={[-4.0, 4.0, -7.5]}
        rotation={[0, Math.PI / 6, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="TORQUE_WRENCH"
      />

      {/* 📐 Surveyor III - Lead Geodetic Surveyor (Johnny P. Farong-ey) at Mountain Ridge Sighting Station */}
      <HydroProjectPersonMesh
        personnelId="SURVEYOR_JOHNNY_FARONGEY"
        onSelectPerson={onSelectPerson}
        position={[14.0, sampleTerrainY(14.0, -22.0), -22.0]}
        rotation={[0, -Math.PI / 2, 0]}
        skinTone="BRONZE"
        hasHardhat
        hardhatColor="#EAB308"
        hasVest
        vestColor="#EA580C"
        pantsStyle="KHAKI"
        accessory="TOTAL_STATION"
      />

      {/* 🪨 Field Geological Assistant (Amor M. Floresca) at Mountain Slope Rock Face Cut */}
      <HydroProjectPersonMesh
        personnelId="GEO_AMOR_FLORESCA"
        onSelectPerson={onSelectPerson}
        position={[3.0, sampleTerrainY(3.0, -18.0), -18.0]}
        rotation={[0, Math.PI / 4, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="HAMMER"
      />


      {/* 🔬 QC Engineer II - Tunnel & Geotechnical (Engr. Jairuz O. Batac) on Headrace Tunnel Portal Foundation Bench */}
      <HydroProjectPersonMesh
        personnelId="QC_JAIRUZ_BATAC"
        onSelectPerson={onSelectPerson}
        position={[-6.0, 17.50, -27.5]}
        rotation={[0, Math.PI / 2, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="TABLET"
      />

      {/* 🚇 Foreman III - Head Tunneling & Underground Works (Richard A. Pinasen) at Tunnel Portal Heading */}
      <HydroProjectPersonMesh
        personnelId="TUNNEL_RICHARD_PINASEN"
        onSelectPerson={onSelectPerson}
        position={[-8.2, 17.50, -27.0]}
        rotation={[0, Math.PI / 4, 0]}
        skinTone="DEEP"
        hairStyle="SHORT"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="RADIO"
      />

      {/* 🚇 Foreman III - Underground Tunneling Excavation (Rudy C. Marcos) at Adit Laydown Staging */}
      <HydroProjectPersonMesh
        personnelId="TUNNEL_RUDY_MARCOS"
        onSelectPerson={onSelectPerson}
        position={[-10.0, 17.50, -25.5]}
        rotation={[0, 0, 0]}
        skinTone="BRONZE"
        hairStyle="SHORT"
        facialHair="MUSTACHE"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="CLIPBOARD"
      />

      {/* ⛏️ Tunnel Worker III - Lead Jumbo Drill Specialist (Benjamin C. Fomeg-as) at Rig Service Staging */}
      <HydroProjectPersonMesh
        personnelId="WORKER_BENJAMIN_FOMEGAS"
        onSelectPerson={onSelectPerson}
        position={[-4.2, 17.50, -28.5]}
        rotation={[0, -Math.PI / 3, 0]}
        skinTone="DEEP"
        hairStyle="SHORT"
        facialHair="STUBBLE"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="NONE"
      />

      {/* ═══ 2. STRUCTURAL SLAB ROOF REBAR & SURVEY TEAMS (Z = -110m) ═══ */}
      {/* Skilled Rebar Worker / Steelman (Anthony Rosales) */}
      <HydroProjectPersonMesh
        personnelId="FOREMAN_ANTHONY_ROSALES"
        onSelectPerson={onSelectPerson}
        position={[76, y1, -110]}
        rotation={[0, Math.PI / 6, 0]}
        skinTone="MEDIUM"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
      />

      {/* ═══ 3. DYNAMIC WAREHOUSE & LAYDOWN YARD WORKFORCE ROUTINES ═══ */}
      <WarehouseDynamicOperations
        onSelectPerson={onSelectPerson}
      />

      {/* ═══ 4. EXECUTIVE SITE OFFICE PARKING STALLS ═══ */}
      <group position={[77, getSiteSurfaceY(77, -95) + 0.02, -95]} rotation={[0, 0, 0]}>
        <SCICSitePickupTruck bodyColor="#1E293B" headlightsOn={false} />
      </group>

      {/* ═══ 5. DESIGNATED MOTORCYCLE PARKING BAYS ═══ */}
      <group position={[108, getSiteSurfaceY(108, -56) + 0.02, -56]}>
        <PhilippineSiteMotorcycle color="#EA580C" kickstandUp={false} />
      </group>
      <group position={[112, getSiteSurfaceY(112, -56) + 0.02, -56]}>
        <PhilippineSiteMotorcycle color="#0284C7" kickstandUp={false} />
      </group>

      {/* ═══ 6. AUTONOMOUS SITE TRAFFIC & WORKFORCE FLOW ═══ */}
      <AutonomousSiteTrafficSystem
        gateAngle={currentGateAngle}
        onGateAngleChange={setCurrentGateAngle}
        onSelectPerson={onSelectPerson}
        timeMode={normalizedTime}
      />

      {/* ═══ 7. TIME-BASED WORKFORCE ROUTINES & GATHERINGS ═══ */}
      {/* Morning & Day: Safety Toolbox Meeting on the basketball court stage with full workforce formation */}
      {(normalizedTime === "morning" || normalizedTime === "day") && (
        <CourtToolboxMeetingDirector onSelectPerson={onSelectPerson} />
      )}

      {/* Sunset & Night: Executive and Admin Staff active in offices & verandas */}
      {(normalizedTime === "sunset" || normalizedTime === "night") && (
        <DaytimeExecutiveAndAdminStaff onSelectPerson={onSelectPerson} />
      )}

      {/* Sunset: Filipino 3-on-3 Basketball Match on the court with cheering spectators */}
      {normalizedTime === "sunset" && (
        <TemfacilBasketballGame onSelectPerson={onSelectPerson} />
      )}

      {/* Morning & Day: Active Construction Workers in Maintenance Bays & Yard */}
      {(normalizedTime === "morning" || normalizedTime === "day") && (
        <group>
          {/* Welder in Laydown Fabrication Bay with structural member, dynamic welding sparks and blue arc light */}
          <group position={[82.0, 14.85, -96.0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Structural Steel Fabrication Trestle & Seam Beam resting on the slab */}
            <mesh position={[0, 0.42, 0.65]} receiveShadow material={MAT_STEEL_DARK}>
              <boxGeometry args={[3.2, 0.80, 0.30]} />
            </mesh>
            <mesh position={[0, 0.88, 0.65]} castShadow receiveShadow material={MAT_STEEL_FRAME}>
              <boxGeometry args={[3.6, 0.12, 0.20]} />
            </mesh>
            <ActiveConstructionWorkerMesh actionType="WELDING" vestColor="#0284C7" hardhatColor="#16A34A" />
          </group>
          {/* Aggregate Shoveler at Laydown Aggregate Stockpile */}
          <group position={[75.0, 14.85, -112.0]} rotation={[0, -Math.PI / 4, 0]}>
            <ActiveConstructionWorkerMesh actionType="SHOVELING" vestColor="#EA580C" hardhatColor="#16A34A" />
          </group>
          {/* Structural Rebar Worker on Roof Slab */}
          <group position={[78.0, y1, -108.0]} rotation={[0, Math.PI / 3, 0]}>
            <ActiveConstructionWorkerMesh actionType="REBAR_TYING" vestColor="#EA580C" hardhatColor="#16A34A" />
          </group>
        </group>
      )}

      {/* Night: Roving Night Security Watchmen with Spotlights patrolling perimeter & warehouse */}
      {normalizedTime === "night" && (
        <RovingNightWatchmen onSelectPerson={onSelectPerson} />
      )}
    </group>
  );
}

