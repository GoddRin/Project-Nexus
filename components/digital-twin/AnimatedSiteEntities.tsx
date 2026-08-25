"use client";

import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
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
} from "./uphillRoadConfig";
import { FILIPINO_PERSONNEL_REGISTRY } from "./personnelData";
import { FilipinoCharacterHead } from "./TemfacilFacility";

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
  const sampledY = y0 * (1 - fz) + y1 * fz;

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

/* ═══════════════════════════════════════════════════════════════════════════
   1. DYNAMIC ANATOMICAL HYDRO PROJECT PERSON MESH
   ═══════════════════════════════════════════════════════════════════════════ */

export interface HydroProjectPersonMeshProps {
  personnelId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  gender?: "MALE" | "FEMALE";
  role?: string;
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
  accessory?: "NONE" | "CLIPBOARD" | "BINDER" | "TABLET" | "RADIO" | "MIC";
  bodyScale?: [number, number, number];
  shiftOffset?: number;
  isPatrolling?: boolean;
  patrolPoints?: [number, number, number][];
  onSelectPerson?: (id: string) => void;
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

export function HydroProjectPersonMesh({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  gender = "MALE",
  speakerType,
  pose = "DEFAULT",
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
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const eyeOpenRef = useRef<THREE.Group>(null);
  const eyeClosedRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const prayingHandsRef = useRef<THREE.Group>(null);

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

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // 1. Dynamic Speaker Motion on Stage
    const speakerState = speakerType ? getSpeakerTransform(t) : null;
    let currentPose = pose;
    let isCurrentlyWalking = isPatrolling;

    if (speakerState) {
      groupRef.current.position.set(...speakerState.pos);
      groupRef.current.rotation.y = speakerState.rotY;
      currentPose = speakerState.activePose;
      isCurrentlyWalking = speakerState.isWalking;
    }

    // 2. Toolbox Meeting Crowd State Cycling
    if (pose === "TOOLBOX_CROWD") {
      const meetingT = (t + shiftOffset * 0.2) % 180.0;
      currentPose = meetingT < 15.0 ? "PRAYER" : (meetingT >= 55.0 && meetingT < 85.0) ? "DANCE" : "DEFAULT";
    }

    // ═══ SUPERB REALISTIC BIPEDAL WALKING KINEMATICS ═══
    if (isCurrentlyWalking) {
      if (eyeOpenRef.current) eyeOpenRef.current.visible = true;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = false;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = false;

      const walkCadence = 6.2;
      const walkT = t * walkCadence + shiftOffset;
      const strideSin = Math.sin(walkT);
      const strideCos = Math.cos(walkT);

      // Leg forward/back angular stride
      const legStrideL = strideSin * 0.52;
      const legStrideR = -strideSin * 0.52;

      // Natural counter arm swing with dynamic elbow flare
      const armSwing = strideSin * 0.44;

      // Biomechanical Pelvic Bounce (double frequency peak on each step)
      const pelvicBounce = Math.abs(strideSin) * 0.042;
      // Lateral pelvic sway & weight shift
      const lateralSway = Math.sin(walkT * 0.5) * 0.025;
      // Transverse Torso Counter-twist
      const torsoTwist = strideCos * 0.08;

      groupRef.current.position.y = (speakerState ? speakerState.pos[1] : position[1]) + pelvicBounce;

      if (torsoRef.current) torsoRef.current.rotation.set(0.04, torsoTwist, lateralSway);
      if (headRef.current) headRef.current.rotation.set(-0.02, -torsoTwist * 0.6, -lateralSway * 0.5);

      if (leftLegRef.current) {
        leftLegRef.current.rotation.set(legStrideL, 0, -lateralSway);
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.set(legStrideR, 0, -lateralSway);
      }

      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(-armSwing, 0.10, -0.08);
      }
      if (rightArmRef.current) {
        if (speakerState?.isHoldingMic) {
          rightArmRef.current.rotation.set(-1.4, -0.15, -0.1);
        } else {
          rightArmRef.current.rotation.set(armSwing, -0.10, 0.08);
        }
      }
      return;
    }

    // ═══ POSE 1: REVERENT OPENING PRAYER ═══
    if (currentPose === "PRAYER") {
      const prayerBreath = Math.sin(t * 1.5 + shiftOffset) * 0.015;
      if (headRef.current) headRef.current.rotation.set(0.28 + prayerBreath, 0, 0); // Head bowed solemnly
      if (torsoRef.current) torsoRef.current.rotation.set(0.05, 0, 0);
      if (eyeOpenRef.current) eyeOpenRef.current.visible = false;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = true;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = true;

      const breath = Math.sin(t * 1.4 + shiftOffset) * 0.015;
      if (headRef.current) headRef.current.rotation.set(0.35 + breath, 0, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.08 + breath * 0.5, 0, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-1.15, 0.45, 0.25);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.15, -0.45, -0.25);
      if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      return;
    }

    // ═══ POSE 2: SYNCHRONIZED CALISTHENICS & MORNING SAFETY EXERCISES ═══
    if (currentPose === "DANCE" || currentPose === "TOOLBOX_CROWD") {
      if (eyeOpenRef.current) eyeOpenRef.current.visible = true;
      if (eyeClosedRef.current) eyeClosedRef.current.visible = false;
      if (prayingHandsRef.current) prayingHandsRef.current.visible = false;

      const syncT = t + shiftOffset * 0.04;
      const stretchPhase = (syncT * 0.8) % 30.0;
      const basePosY = speakerState ? speakerState.pos[1] : position[1];

      if (stretchPhase < 7.5) {
        // Move 1: Torso Lateral Reach & Side Stretch
        const beat = Math.sin(syncT * 1.4);
        const breathY = Math.abs(Math.sin(syncT * 1.4)) * 0.02;
        groupRef.current.position.y = basePosY + breathY;
        if (torsoRef.current) torsoRef.current.rotation.set(0, beat * 0.18, beat * 0.12);
        if (headRef.current) headRef.current.rotation.set(-0.05, beat * 0.12, beat * 0.08);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-2.2 + beat * 0.35, 0.15, -0.35 + beat * 0.35);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-2.2 + beat * 0.35, -0.15, 0.35 + beat * 0.35);
        if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      } else if (stretchPhase < 15.0) {
        // Move 2: Coordinated Shoulder Circles & Overhead Extension with Calf Raises
        const beat = Math.sin(syncT * 1.8);
        const calfRaise = Math.max(0, beat) * 0.045;
        groupRef.current.position.y = basePosY + calfRaise;
        if (torsoRef.current) torsoRef.current.rotation.set(-0.04, 0, 0);
        if (headRef.current) headRef.current.rotation.set(-0.15, 0, 0);
        const armArc = -1.3 + beat * 1.1;
        if (leftArmRef.current) leftArmRef.current.rotation.set(armArc, 0.12, -0.25);
        if (rightArmRef.current) rightArmRef.current.rotation.set(armArc, -0.12, 0.25);
        if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      } else if (stretchPhase < 22.5) {
        // Move 3: Chest Expansion & Gentle Torso Rotation
        const twist = Math.sin(syncT * 1.5);
        groupRef.current.position.y = basePosY;
        if (torsoRef.current) torsoRef.current.rotation.set(0, twist * 0.32, 0);
        if (headRef.current) headRef.current.rotation.set(0, twist * 0.40, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.45, 0.35 + twist * 0.3, -0.4);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.45, -0.35 + twist * 0.3, 0.4);
        if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
      } else {
        // Move 4: Gentle Rhythmic Knee Dips & Breathing Calisthenics
        const dip = Math.sin(syncT * 1.2);
        const dipDepth = -Math.max(0, dip) * 0.06;
        groupRef.current.position.y = basePosY + dipDepth;
        if (torsoRef.current) torsoRef.current.rotation.set(0.06, 0, 0);
        if (headRef.current) headRef.current.rotation.set(0, 0, 0);
        if (leftArmRef.current) leftArmRef.current.rotation.set(-1.1, 0.15, -Math.abs(dip) * 0.4);
        if (rightArmRef.current) rightArmRef.current.rotation.set(-1.1, -0.15, Math.abs(dip) * 0.4);
        if (leftLegRef.current) leftLegRef.current.rotation.set(Math.max(0, dip) * 0.15, 0, 0);
        if (rightLegRef.current) rightLegRef.current.rotation.set(Math.max(0, dip) * 0.15, 0, 0);
      }
      return;
    }

    // ═══ POSE 3: PODIUM SPEAKER ORATOR GESTURING ═══
    if (currentPose === "SPEAKING") {
      const speechT = t * 2.2 + shiftOffset;
      const gesture = Math.sin(speechT) * 0.28;
      const headTurn = Math.sin(speechT * 0.5) * 0.22;
      const headNod = Math.sin(speechT * 0.9) * 0.06;

      if (headRef.current) headRef.current.rotation.set(headNod, headTurn, 0);
      if (torsoRef.current) torsoRef.current.rotation.set(0.03, headTurn * 0.15, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.75 + gesture, 0.35, 0.18);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-1.45, -0.15, -0.1);
      return;
    }

    // ═══ POSE 4: DEFAULT NATURAL IDLE & WEIGHT-SHIFTING ═══
    const breath = Math.sin(t * 1.6 + shiftOffset) * 0.015;
    const weightShift = Math.sin(t * 0.4 + shiftOffset) * 0.03;
    if (torsoRef.current) torsoRef.current.rotation.set(0, weightShift * 0.5, weightShift * 0.3);
    if (headRef.current) headRef.current.rotation.set(breath * 0.15, weightShift * 0.8, 0);
    if (leftArmRef.current) leftArmRef.current.rotation.set(0.04, 0, -0.06 + breath * 0.05);
    if (rightArmRef.current) rightArmRef.current.rotation.set(0.04, 0, 0.06 - breath * 0.05);
    if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
    if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
  });

  const isCrowd = pose === "TOOLBOX_CROWD";

  if (isCrowd) {
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={bodyScale}
      >
        {/* 🧍 OPTIMIZED HIGH-PERFORMANCE WORKFORCE TORSO WITH HI-VIS VEST & 3M BANDS */}
        <group ref={torsoRef} position={[0, 0.85, 0]}>
          <mesh position={[0, 0.25, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.38, 0.46, 0.22]} />
          </mesh>
          {/* Reflective Bands (Consolidated clean bands) */}
          <mesh position={[0, 0.25, 0.115]}>
            <boxGeometry args={[0.36, 0.28, 0.01]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.25, -0.115]}>
            <boxGeometry args={[0.36, 0.28, 0.01]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
          </mesh>

          {/* 🗣️ HEAD & SAFETY HARD HAT */}
          <group ref={headRef} position={[0, 0.58, 0]}>
            {/* Cranium & Jaw */}
            <mesh material={skinMat}>
              <boxGeometry args={[0.22, 0.24, 0.22]} />
            </mesh>
            {/* Hard Hat Dome */}
            <mesh position={[0, 0.13, 0]} material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
              <boxGeometry args={[0.26, 0.11, 0.28]} />
            </mesh>
            {/* Hard Hat Visor Brim */}
            <mesh position={[0, 0.09, 0.06]} material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
              <boxGeometry args={[0.28, 0.02, 0.18]} />
            </mesh>
            {/* SCIC Safety Crest Logo */}
            <mesh position={[0, 0.14, 0.142]} material={MAT_SIGNBOARD_TEAL}>
              <boxGeometry args={[0.075, 0.04, 0.005]} />
            </mesh>
            {/* Eyes & Mustache */}
            <mesh position={[-0.045, 0.02, 0.112]} material={MAT_HAIR_BLACK}>
              <boxGeometry args={[0.03, 0.015, 0.006]} />
            </mesh>
            <mesh position={[0.045, 0.02, 0.112]} material={MAT_HAIR_BLACK}>
              <boxGeometry args={[0.03, 0.015, 0.006]} />
            </mesh>
            <mesh position={[0, -0.04, 0.114]} material={MAT_MUSTACHE_BLACK}>
              <boxGeometry args={[0.08, 0.02, 0.01]} />
            </mesh>
          </group>

          {/* 🦾 ARMS & WORK GLOVES */}
          <group ref={leftArmRef} position={[-0.24, 0.40, 0]}>
            <mesh position={[0, -0.22, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
              <boxGeometry args={[0.10, 0.42, 0.10]} />
            </mesh>
            <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.085, 0.09, 0.085]} />
            </mesh>
          </group>

          <group ref={rightArmRef} position={[0.24, 0.40, 0]}>
            <mesh position={[0, -0.22, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
              <boxGeometry args={[0.10, 0.42, 0.10]} />
            </mesh>
            <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
              <boxGeometry args={[0.085, 0.09, 0.085]} />
            </mesh>
          </group>
        </group>

        {/* 🥾 LEGS & WORK BOOTS */}
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
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={bodyScale}
    >
      {/* 🧍 TORSO & CHEST (WITH DOLE/SCIC SAFETY PPE HI-VIS VEST & RETROREFLECTIVE BANDS) */}
      <group ref={torsoRef} position={[0, 0.85, 0]}>
        <mesh position={[0, 0.25, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
          <boxGeometry args={[0.38, 0.46, 0.22]} />
        </mesh>

        {/* 🦺 ANSI/ISEA CLASS 2 RETROREFLECTIVE HIGH-VISIBILITY SAFETY HARNESS STRIPES */}
        {hasVest && (
          <>
            {/* Front Horizontal Reflective Chest Band (50mm 3M Silver Microprismatic) */}
            <mesh position={[0, 0.35, 0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            {/* Front Horizontal Reflective Waist Band */}
            <mesh position={[0, 0.15, 0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            {/* Rear Horizontal Reflective Bands */}
            <mesh position={[0, 0.35, -0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.15, -0.115]}>
              <boxGeometry args={[0.36, 0.04, 0.01]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            {/* Vertical Shoulder Over-the-Top Reflective Bands */}
            <mesh position={[-0.11, 0.26, 0]}>
              <boxGeometry args={[0.035, 0.45, 0.23]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.11, 0.26, 0]}>
              <boxGeometry args={[0.035, 0.45, 0.23]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.15} metalness={0.9} emissive="#F1F5F9" emissiveIntensity={0.5} />
            </mesh>

            {/* 🪪 DOLE / SCIC LAMINATED SECURITY ID BADGE (Left Chest Pocket) */}
            <group position={[-0.11, 0.28, 0.12]}>
              <mesh>
                <boxGeometry args={[0.06, 0.08, 0.01]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
              </mesh>
              {/* Photo Area */}
              <mesh position={[0, 0.015, 0.006]}>
                <boxGeometry args={[0.04, 0.035, 0.002]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} />
              </mesh>
              {/* Safety Clearance Teal / Green Hologram Bar */}
              <mesh position={[0, -0.025, 0.006]}>
                <boxGeometry args={[0.05, 0.012, 0.002]} />
                <meshStandardMaterial color="#0D9488" roughness={0.3} metalness={0.6} />
              </mesh>
            </group>
          </>
        )}

        {/* 🗣️ HIGH-DETAIL SCULPTED FILIPINO HEAD & ANATOMICAL FACIAL FEATURES */}
        <group ref={headRef} position={[0, 0.58, 0]}>
          {/* Main Cranium */}
          <mesh material={skinMat}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
          </mesh>

          {/* Tapered Filipino Jaw & Chin */}
          <mesh position={[0, -0.11, 0.02]} material={skinMat}>
            <boxGeometry args={[0.16, 0.08, 0.16]} />
          </mesh>

          {/* Anatomical Ears */}
          <mesh position={[-0.115, 0.01, -0.01]} material={skinMat}>
            <boxGeometry args={[0.015, 0.065, 0.038]} />
          </mesh>
          <mesh position={[0.115, 0.01, -0.01]} material={skinMat}>
            <boxGeometry args={[0.015, 0.065, 0.038]} />
          </mesh>

          {/* ⛑️ HIGH-IMPACT POLYCARBONATE INDUSTRIAL SAFETY HARD HAT (DOLE/SCIC SPEC) */}
          {hasHardhat && (
            <group position={[0, 0.13, 0]}>
              {/* Main Hard Hat Dome Shell */}
              <mesh material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
                <boxGeometry args={[0.26, 0.11, 0.28]} />
              </mesh>
              {/* Front Visor Sun & Impact Brim */}
              <mesh position={[0, -0.04, 0.06]} material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
                <boxGeometry args={[0.28, 0.02, 0.18]} />
              </mesh>
              {/* Top Central Structural Reinforcing Spine Ridge */}
              <mesh position={[0, 0.065, 0]} material={customHardhatMat || MAT_WORKER_HARDHAT_WHITE}>
                <boxGeometry args={[0.045, 0.03, 0.25]} />
              </mesh>
              {/* Front Center SCIC Company / Safety Logo Crest Badge */}
              <mesh position={[0, 0.01, 0.142]} material={MAT_SIGNBOARD_TEAL}>
                <boxGeometry args={[0.075, 0.04, 0.005]} />
              </mesh>
              {/* 3M Silver Reflective Safety Wrap Strip Around Hard Hat Perimeter */}
              <mesh position={[0, -0.025, 0]}>
                <boxGeometry args={[0.265, 0.015, 0.285]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.9} emissive="#FFFFFF" emissiveIntensity={0.4} />
              </mesh>
            </group>
          )}

          {/* 💇 AUTHENTIC FILIPINO HAIRSTYLES (WHEN HARD HAT IS OFF OR VISIBLE FRINGE) */}
          {hairStyle === "WOMAN_PONYTAIL" && (
            <group position={[0, 0.08, -0.02]}>
              {/* Top Hair Volume */}
              <mesh material={hairMat}>
                <boxGeometry args={[0.23, 0.09, 0.23]} />
              </mesh>
              {/* Side Bangs */}
              <mesh position={[-0.10, -0.06, 0.06]} material={hairMat}>
                <boxGeometry args={[0.03, 0.12, 0.06]} />
              </mesh>
              <mesh position={[0.10, -0.06, 0.06]} material={hairMat}>
                <boxGeometry args={[0.03, 0.12, 0.06]} />
              </mesh>
              {/* Rear Ponytail Extension */}
              <mesh position={[0, -0.04, -0.16]} rotation={[0.4, 0, 0]} material={hairMat}>
                <cylinderGeometry args={[0.035, 0.02, 0.22, 8]} />
              </mesh>
              {/* Hair Tie Band */}
              <mesh position={[0, 0.03, -0.13]} rotation={[Math.PI / 2, 0, 0]} material={MAT_HAIR_TIE_PINK}>
                <torusGeometry args={[0.035, 0.01, 8, 16]} />
              </mesh>
            </group>
          )}

          {hairStyle === "POMPADOUR" && (
            <group position={[0, 0.12, 0]}>
              <mesh material={hairMat}>
                <boxGeometry args={[0.23, 0.07, 0.24]} />
              </mesh>
              <mesh position={[0, 0.03, 0.04]} material={hairMat}>
                <boxGeometry args={[0.18, 0.04, 0.12]} />
              </mesh>
            </group>
          )}

          {hairStyle === "CHEF_BANDANA" && (
            <group position={[0, 0.08, 0]}>
              <mesh material={MAT_ID_BADGE_WHITE}>
                <boxGeometry args={[0.24, 0.06, 0.24]} />
              </mesh>
              <mesh position={[0, 0.03, -0.13]} material={MAT_ID_BADGE_WHITE}>
                <boxGeometry args={[0.06, 0.10, 0.02]} />
              </mesh>
            </group>
          )}

          {!hasHardhat && hairStyle === "SHORT" && (
            <mesh position={[0, 0.11, -0.01]} material={hairMat}>
              <boxGeometry args={[0.23, 0.06, 0.23]} />
            </mesh>
          )}

          {/* 👁️ SCULPTED FILIPINO EYES, SCLERA, DARK BROWN IRIS & PUPIL */}
          <group ref={eyeOpenRef} position={[0, 0.035, 0.112]}>
            {/* Left Eye Whites (Sclera) */}
            <mesh position={[-0.052, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.038, 0.020, 0.005]} />
            </mesh>
            {/* Left Dark Brown Iris */}
            <mesh position={[-0.052, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.022, 0.018, 0.003]} />
            </mesh>
            {/* Left Black Center Pupil */}
            <mesh position={[-0.052, 0, 0.005]} material={MAT_FACE_EYE_PUPIL}>
              <boxGeometry args={[0.012, 0.012, 0.002]} />
            </mesh>

            {/* Right Eye Whites (Sclera) */}
            <mesh position={[0.052, 0, 0]} material={MAT_FACE_EYE_WHITE}>
              <boxGeometry args={[0.038, 0.020, 0.005]} />
            </mesh>
            {/* Right Dark Brown Iris */}
            <mesh position={[0.052, 0, 0.003]} material={MAT_FACE_EYE_IRIS}>
              <boxGeometry args={[0.022, 0.018, 0.003]} />
            </mesh>
            {/* Right Black Center Pupil */}
            <mesh position={[0.052, 0, 0.005]} material={MAT_FACE_EYE_PUPIL}>
              <boxGeometry args={[0.012, 0.012, 0.002]} />
            </mesh>
          </group>

          {/* Closed Eyes during Prayer */}
          <group ref={eyeClosedRef} position={[0, 0.035, 0.115]} visible={false}>
            <mesh position={[-0.052, 0, 0]} material={hairColor === "SALT_PEPPER" ? MAT_FACE_EYEBROW_GREY : MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.038, 0.006, 0.005]} />
            </mesh>
            <mesh position={[0.052, 0, 0]} material={hairColor === "SALT_PEPPER" ? MAT_FACE_EYEBROW_GREY : MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.038, 0.006, 0.005]} />
            </mesh>
          </group>

          {/* Distinct Arched Eyebrows */}
          <group position={[0, 0.065, 0.115]}>
            <mesh position={[-0.052, 0, 0]} rotation={[0, 0, 0.05]} material={hairColor === "SALT_PEPPER" ? MAT_FACE_EYEBROW_GREY : MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.045, 0.008, 0.006]} />
            </mesh>
            <mesh position={[0.052, 0, 0]} rotation={[0, 0, -0.05]} material={hairColor === "SALT_PEPPER" ? MAT_FACE_EYEBROW_GREY : MAT_FACE_EYEBROW}>
              <boxGeometry args={[0.045, 0.008, 0.006]} />
            </mesh>
          </group>

          {/* 👃 SCULPTED FILIPINO NOSE (BRIDGE & FLARED NOSTRIL WINGS) */}
          <group position={[0, 0.005, 0.122]}>
            {/* Nasal Bridge */}
            <mesh position={[0, 0.015, 0]} material={skinMat}>
              <boxGeometry args={[0.026, 0.045, 0.022]} />
            </mesh>
            {/* Rounded Nasal Tip */}
            <mesh position={[0, -0.015, 0.006]} material={skinMat}>
              <sphereGeometry args={[0.018, 6, 6]} />
            </mesh>
            {/* Left & Right Nostril Flares */}
            <mesh position={[-0.020, -0.018, 0.002]} material={skinMat}>
              <boxGeometry args={[0.014, 0.014, 0.015]} />
            </mesh>
            <mesh position={[0.020, -0.018, 0.002]} material={skinMat}>
              <boxGeometry args={[0.014, 0.014, 0.015]} />
            </mesh>
          </group>

          {/* 👄 SCULPTED CONTOURED LIPS & MOUTH */}
          <group position={[0, -0.055, 0.116]}>
            {/* Upper Lip with Cupid's Bow */}
            <mesh ref={mouthRef} material={gender === "FEMALE" ? MAT_FACE_LIPS_FEMALE : MAT_FACE_LIPS_MALE}>
              <boxGeometry args={[0.055, 0.012, 0.010]} />
            </mesh>
            {/* Lower Lip */}
            <mesh position={[0, -0.012, -0.001]} material={gender === "FEMALE" ? MAT_FACE_LIPS_FEMALE : MAT_FACE_LIPS_MALE}>
              <boxGeometry args={[0.048, 0.014, 0.010]} />
            </mesh>
          </group>

          {/* 👨‍🦰 FILIPINO FACIAL HAIR (MUSTACHE, GOATEE, BEARD, STUBBLE) */}
          {(facialHair === "MUSTACHE" || (!facialHair && role?.includes("Foreman"))) && (
            <mesh position={[0, -0.040, 0.126]} material={hairColor === "SALT_PEPPER" ? MAT_MUSTACHE_SALT_PEPPER : MAT_MUSTACHE_BLACK}>
              <boxGeometry args={[0.095, 0.020, 0.014]} />
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

          {(hasBeard || facialHair === "BEARD") && (
            <mesh position={[0, -0.08, 0.06]} material={hairMat}>
              <boxGeometry args={[0.18, 0.08, 0.14]} />
            </mesh>
          )}

          {facialHair === "STUBBLE" && (
            <mesh position={[0, -0.07, 0.06]} material={MAT_STUBBLE_SHADOW}>
              <boxGeometry args={[0.19, 0.09, 0.15]} />
            </mesh>
          )}

          {/* 🥽 UV-RATED INDUSTRIAL SAFETY EYEWEAR / GLASSES */}
          {hasGlasses && (
            <group position={[0, 0.035, 0.125]}>
              <mesh position={[-0.052, 0, 0]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.048, 0.032, 0.008]} />
              </mesh>
              <mesh position={[-0.052, 0, 0.003]} material={MAT_SAFETY_GLASSES_LENS}>
                <boxGeometry args={[0.042, 0.026, 0.004]} />
              </mesh>
              <mesh position={[0.052, 0, 0]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.048, 0.032, 0.008]} />
              </mesh>
              <mesh position={[0.052, 0, 0.003]} material={MAT_SAFETY_GLASSES_LENS}>
                <boxGeometry args={[0.042, 0.026, 0.004]} />
              </mesh>
              <mesh position={[0, 0.008, 0]} material={MAT_STEEL_DARK}>
                <boxGeometry args={[0.035, 0.008, 0.008]} />
              </mesh>
            </group>
          )}
        </group>

        {/* 🤲 CLASPED PRAYING HANDS (Active during Prayer Phase) */}
        <group ref={prayingHandsRef} position={[0, 0.18, 0.22]} visible={false}>
          <mesh material={skinMat}>
            <boxGeometry args={[0.08, 0.09, 0.07]} />
          </mesh>
        </group>

        {/* 🦾 LEFT ARM & CUT-RESISTANT SAFETY GRIP GLOVES */}
        <group ref={leftArmRef} position={[-0.24, 0.40, 0]}>
          <mesh position={[0, -0.22, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.10, 0.42, 0.10]} />
          </mesh>
          {/* Heavy-Duty Safety Work Glove */}
          <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.085, 0.09, 0.085]} />
          </mesh>
        </group>

        {/* 🦾 RIGHT ARM & CUT-RESISTANT SAFETY GRIP GLOVES */}
        <group ref={rightArmRef} position={[0.24, 0.40, 0]}>
          <mesh position={[0, -0.22, 0]} material={customVestMat || MAT_SHIRT_LIGHT_BLUE}>
            <boxGeometry args={[0.10, 0.42, 0.10]} />
          </mesh>
          {/* Heavy-Duty Safety Work Glove */}
          <mesh position={[0, -0.46, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.085, 0.09, 0.085]} />
          </mesh>
          {/* Handheld Microphone for Orator / Speakers */}
          {accessory === "MIC" && (
            <group position={[0, -0.52, 0.05]}>
              <mesh material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
              </mesh>
              <mesh position={[0, 0.07, 0]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshStandardMaterial color="#94A3B8" roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* 🥾 LEFT LEG & REINFORCED STEEL-TOE SAFETY WORK BOOT */}
      <group ref={leftLegRef} position={[-0.10, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} material={pantsMat}>
          <boxGeometry args={[0.14, 0.78, 0.14]} />
        </mesh>
        {/* Leather Safety Boot Body */}
        <mesh position={[0, -0.83, 0.03]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
        </mesh>
        {/* Reinforced Steel Toe Cap */}
        <mesh position={[0, -0.83, 0.12]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.135, 0.11, 0.04]} />
        </mesh>
        {/* Yellow Safety Sole Welt Edge */}
        <mesh position={[0, -0.885, 0.03]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.145, 0.015, 0.225]} />
        </mesh>
      </group>

      {/* 🥾 RIGHT LEG & REINFORCED STEEL-TOE SAFETY WORK BOOT */}
      <group ref={rightLegRef} position={[0.10, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} material={pantsMat}>
          <boxGeometry args={[0.14, 0.78, 0.14]} />
        </mesh>
        {/* Leather Safety Boot Body */}
        <mesh position={[0, -0.83, 0.03]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
        </mesh>
        {/* Reinforced Steel Toe Cap */}
        <mesh position={[0, -0.83, 0.12]} material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.135, 0.11, 0.04]} />
        </mesh>
        {/* Yellow Safety Sole Welt Edge */}
        <mesh position={[0, -0.885, 0.03]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[0.145, 0.015, 0.225]} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. TUESDAY MORNING SAFETY TOOLBOX MEETING DIRECTOR & WORKFORCE FORMATION
   ═══════════════════════════════════════════════════════════════════════════ */

export function CourtToolboxMeetingDirector() {
  return (
    <group>
      {/* ── KEY HEADS, SUPERVISORS & ENGINEERS (ON STAGE WITH WHITE HARD HATS) ── */}
      <HydroProjectPersonMesh
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

      {/* Planning Engineer Head */}
      <HydroProjectPersonMesh
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
        <mesh position={[0, 0.58, 0]} material={MAT_SKIN_MEDIUM}>
          <boxGeometry args={[0.22, 0.25, 0.22]} />
        </mesh>
        {/* Safety Hard Hat */}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[0.26, 0.11, 0.28]} />
          <meshStandardMaterial color={hardhatColor} roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.68, 0.06]}>
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
    }
  });

  return (
    <group
      ref={guardGroupRef}
      position={[4.4, 0, 0.8]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectPerson) onSelectPerson("SG_ROBERTO_DIZON");
      }}
    >
      {/* ── SG Roberto "Bert" Dizon Realistic Filipino Security Guard Anatomy ── */}
      {/* Searchlight / UV Inspection Flashlight SpotLight */}
      <spotLight
        ref={searchlightRef}
        position={[0, 0.7, 0.2]}
        target-position={[0, -0.5, 1.2]}
        angle={0.5}
        penumbra={0.4}
        intensity={0}
        color="#E0F2FE"
        distance={6}
      />

      {/* Head with SOSIA Uniform Security Peak Cap & Gold Badge */}
      <group ref={headRef} position={[0, 1.35, 0]}>
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

  useFrame(() => {
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

  // Guardhouse is located directly at the TEMFACIL entrance tip (ROAD_CONSTANTS.GATE_PROGRESS_U = 0.655)
  const gateTransform = useMemo(() => {
    return getRoadTransform(ROAD_CONSTANTS.GATE_PROGRESS_U, 0, 0.12);
  }, []);

  return (
    <group position={[gateTransform.point.x, gateTransform.point.y, gateTransform.point.z]} rotation={[0, gateTransform.yaw, 0]}>
      {/* ═══ 1. CONCRETE CHECKPOINT FOUNDATION PLINTH (Right Shoulder) ═══ */}
      <mesh position={[5.2, 0.08, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
        <boxGeometry args={[3.2, 0.16, 3.2]} />
      </mesh>

      {/* ═══ 2. RED & WHITE SCIC SECURITY GUARDHOUSE BOOTH ═══ */}
      <mesh position={[5.2, 1.48, 0]} castShadow receiveShadow material={MAT_RED_BOOTH}>
        <boxGeometry args={[2.4, 2.8, 2.4]} />
      </mesh>
      {/* White Trim Pillars */}
      {[-1.18, 1.18].map((xP, i) =>
        [-1.18, 1.18].map((zP, j) => (
          <mesh key={`trim-${i}-${j}`} position={[5.2 + xP, 1.48, zP]} material={MAT_ID_BADGE_WHITE}>
            <boxGeometry args={[0.08, 2.82, 0.08]} />
          </mesh>
        ))
      )}
      {/* Guardhouse Overhanging Eaves Roof */}
      <mesh position={[5.2, 2.92, 0]} castShadow material={MAT_STEEL_DARK}>
        <boxGeometry args={[2.9, 0.18, 2.9]} />
      </mesh>

      {/* Road-Facing Glass Sliding Inspection Window */}
      <mesh position={[3.98, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_FRAME}>
        <boxGeometry args={[1.4, 1.0, 0.06]} />
      </mesh>
      <mesh position={[3.98, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={MAT_GLASS_CLEAR}>
        <boxGeometry args={[1.3, 0.9, 0.03]} />
      </mesh>

      {/* Interior Security Workstation Desk & CRT Monitor */}
      <mesh position={[4.6, 0.85, 0]} material={MAT_TIMBER_STAKE}>
        <boxGeometry args={[0.8, 0.1, 1.8]} />
      </mesh>
      {/* CCTV Monitor Screen (Glowing Green Telemetry) */}
      <mesh position={[4.6, 1.15, 0.35]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.1, 0.35, 0.45]} />
        <meshBasicMaterial color="#10B981" />
      </mesh>
      {/* Interior Ambient Booth Light */}
      <pointLight position={[5.2, 2.4, 0]} color="#FEF08A" intensity={0.8} distance={5} />

      {/* SCIC Main Gate Security Signboard Above Window */}
      <group position={[3.96, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={MAT_SIGNBOARD_TEAL}>
          <boxGeometry args={[2.0, 0.4, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.024]} material={MAT_ID_BADGE_WHITE}>
          <boxGeometry args={[1.85, 0.28, 0.01]} />
        </mesh>
      </group>

      {/* Rear Exterior Aircon Condenser Unit */}
      <mesh position={[6.45, 1.8, 0]} material={MAT_FOOD_STAINLESS_TRAY}>
        <boxGeometry args={[0.3, 0.5, 0.7]} />
      </mesh>

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
        <pointLight position={[0, 4.8, 1.2]} color="#FFFFFF" intensity={1.5} distance={12} />
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

// ─── AUTONOMOUS SITE TRAFFIC & PEDESTRIAN LIFE SYSTEM ───────────────────────
function AutonomousSiteTrafficSystem({
  gateAngle,
  onGateAngleChange,
  onSelectPerson,
}: {
  gateAngle: number;
  onGateAngleChange: (angle: number) => void;
  onSelectPerson?: (id: string) => void;
}) {
  // Vehicle Refs
  const vDumpRef = useRef<THREE.Group>(null);
  const vPickupRef = useRef<THREE.Group>(null);
  const vVanRef = useRef<THREE.Group>(null);
  const vPatrolRef = useRef<THREE.Group>(null);

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
      speed: 0.012,
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
      speed: 0.010,
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
      speed: 0.014,
      role: "CIVIL_FOREMAN",
      vestColor: MAT_WORKER_VEST_BLUE,
      hardhatColor: MAT_WORKER_HARDHAT_YELLOW,
      pos: new THREE.Vector3(),
      ref: ped3Ref,
    },
  ]);

  useFrame(({ clock }, delta) => {
    const cp = checkpointRef.current;
    const vehicles = vehiclesRef.current;
    const pedestrians = pedestriansRef.current;

    // ─── 1. SIMULATE WALKING PEDESTRIANS WITH DEDICATED PAVER PATHWAYS & WALL COLLISION AVOIDANCE ───
    pedestrians.forEach((ped) => {
      ped.u = (ped.u + ped.dir * ped.speed * delta + 1.0) % 1.0;

      const rawTransform = getSplineTransform(ped.spline, ped.u, 0, 0.28);
      const safe = resolveBuildingCollisions(rawTransform.point, rawTransform.tangent, 0.6);
      ped.pos.copy(safe.adjustedPos);

      if (ped.ref.current) {
        const yaw = Math.atan2(safe.adjustedForward.x, safe.adjustedForward.z) + (ped.dir === -1 ? Math.PI : 0);
        ped.ref.current.position.set(safe.adjustedPos.x, safe.adjustedPos.y, safe.adjustedPos.z);
        ped.ref.current.rotation.set(0, yaw, 0);
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
      cp.walkProgress = Math.min(1.0, cp.walkProgress + delta * 0.9);
      if (cp.walkProgress >= 1.0) {
        cp.phase = "INSPECTING_DRIVER_PPE";
        cp.timer = 2.2; // 2.2s verifying Driver ID, Gate Pass, Hardhat, and Safety Vest
      }
    } else if (cp.phase === "INSPECTING_DRIVER_PPE") {
      cp.timer -= delta;
      if (cp.timer <= 0) {
        cp.phase = "INSPECTING_UNDERCARRIAGE";
        cp.timer = 2.2; // 2.2s convex mirror inspection of undercarriage & chassis with searchlight
      }
    } else if (cp.phase === "INSPECTING_UNDERCARRIAGE") {
      cp.timer -= delta;
      if (cp.timer <= 0) {
        cp.phase = "INSPECTING_CARGO_PROHIBITED";
        cp.timer = 2.0; // 2.0s cargo bed prohibited contraband / cargo inspection
      }
    } else if (cp.phase === "INSPECTING_CARGO_PROHIBITED") {
      cp.timer -= delta;
      if (cp.timer <= 0) {
        cp.phase = "LOGGING_MANIFEST";
        cp.timer = 1.6; // 1.6s signing approval manifest logbook & stamping pass
      }
    } else if (cp.phase === "LOGGING_MANIFEST") {
      cp.timer -= delta;
      if (cp.timer <= 0) {
        cp.phase = "WAVING_CLEARANCE";
        cp.timer = 1.6; // 1.6s clearance wave and upward boom barrier lift (Green LED)
      }
    } else if (cp.phase === "WAVING_CLEARANCE") {
      cp.timer -= delta;
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
      cp.walkProgress = Math.max(0.0, cp.walkProgress - delta * 0.9);
      if (cp.walkProgress <= 0.0) {
        cp.phase = "SENTRY_POST";
      }
    }

    // C. Control Boom Barrier Angle (Lifts UPWARDS with Green LED when Cleared)
    const isGateOpen = cp.phase === "WAVING_CLEARANCE" || cp.phase === "VEHICLE_PASSING";
    onGateAngleChange(isGateOpen ? -Math.PI / 2.2 : 0);

    // ─── 3. SIMULATE AUTONOMOUS VEHICLES ALONG DEDICATED PURPOSE-DRIVEN ROUTES ───
    vehicles.forEach((veh, i) => {
      // 1. Handle on-site functional work pauses (Tipping, Drop-offs, QA Inspections)
      if (veh.stateTimer > 0) {
        veh.stateTimer -= delta;
        veh.speed = 0;
        veh.isBraking = true;

        if (veh.id === "DUMP_TRUCK") {
          const targetBed = veh.state === "DEPOT_DUMPING" ? 0.45 : 0;
          veh.bedAngle = THREE.MathUtils.lerp(veh.bedAngle, targetBed, 0.08);
          if (vDumpRef.current) {
            const tipperBed = vDumpRef.current.getObjectByName("dumpTipperBed");
            if (tipperBed) tipperBed.rotation.x = -veh.bedAngle;
          }
        }

        if (veh.stateTimer <= 0) {
          veh.hazardLights = veh.id === "SECURITY_PATROL";
        }
        return;
      }

      // Smoothly lower tipper bed if moving
      if (veh.id === "DUMP_TRUCK" && veh.bedAngle > 0) {
        veh.bedAngle = THREE.MathUtils.lerp(veh.bedAngle, 0, 0.08);
        if (vDumpRef.current) {
          const tipperBed = vDumpRef.current.getObjectByName("dumpTipperBed");
          if (tipperBed) tipperBed.rotation.x = -veh.bedAngle;
        }
      }

      let targetSpeed = veh.maxCruiseSpeed;
      let hardBrake = false;

      // 2. Checkpoint Stop Line Compliance (Inbound & Outbound)
      const checkGateStop = (stopU: number, clearU: number) => {
        const distToStop = stopU - veh.u;
        if (distToStop >= 0 && distToStop < 0.055) {
          if (veh.id === cp.activeVehId) {
            if (cp.phase !== "WAVING_CLEARANCE" && cp.phase !== "VEHICLE_PASSING") {
              if (distToStop < 0.005) {
                targetSpeed = 0;
                hardBrake = true;
                veh.u = stopU;
              } else {
                targetSpeed = Math.min(targetSpeed, (distToStop / 0.04) * veh.maxCruiseSpeed * 0.45);
              }
            } else {
              targetSpeed = veh.maxCruiseSpeed * 0.85;
            }
          } else {
            // Must wait behind stop line
            if (distToStop < 0.005) {
              targetSpeed = 0;
              hardBrake = true;
              veh.u = stopU;
            } else {
              targetSpeed = Math.min(targetSpeed, (distToStop / 0.04) * veh.maxCruiseSpeed * 0.45);
            }
          }
        }
      };

      checkGateStop(veh.inboundGate.stopU, veh.inboundGate.clearU);
      checkGateStop(veh.outboundGate.stopU, veh.outboundGate.clearU);

      // 3. 3D Euclidean Vehicle Anti-Collision Buffer (12.0m warning, 7.5m full stop)
      for (let j = 0; j < vehicles.length; j++) {
        if (i === j) continue;
        const other = vehicles[j];
        const dist = veh.pos.distanceTo(other.pos);

        if (dist < 22.0) {
          const toOther = new THREE.Vector3().subVectors(other.pos, veh.pos).normalize();
          const dot = veh.forward.dot(toOther);

          if (dot > 0.40) { // Other vehicle is ahead along our heading
            if (dist < 7.5) {
              targetSpeed = 0;
              hardBrake = true;
            } else if (dist < 18.0) {
              const followSpeed = ((dist - 7.5) / 10.5) * veh.maxCruiseSpeed;
              targetSpeed = Math.min(targetSpeed, Math.max(0, followSpeed));
              if (targetSpeed < 0.003) hardBrake = true;
            }
          }
        }
      }

      // 4. Pedestrian Proximity Detection
      pedestrians.forEach((ped) => {
        const distToPed = veh.pos.distanceTo(ped.pos);
        if (distToPed < 6.5) {
          const toPed = new THREE.Vector3().subVectors(ped.pos, veh.pos).normalize();
          if (veh.forward.dot(toPed) > 0.4) {
            targetSpeed = 0;
            hardBrake = true;
          }
        }
      });

      // Apply dynamic velocity with smooth acceleration and braking
      veh.isBraking = hardBrake;
      const accelRate = hardBrake ? 6.0 : 2.5;
      veh.speed = THREE.MathUtils.damp(veh.speed, targetSpeed, accelRate, delta);

      // Advance smoothly along dedicated loop spline
      veh.u = (veh.u + veh.speed * delta) % 1.0;

      // 5. Trigger Dedicated Functional Routines at Work Locations
      veh.routines.forEach((rt) => {
        const distToRoutine = Math.abs(veh.u - rt.u);
        if (distToRoutine < 0.014 && !rt.done && veh.stateTimer <= 0) {
          veh.state = rt.type;
          veh.stateTimer = rt.duration;
          rt.done = true;
          veh.hazardLights = true;
        } else if (distToRoutine > 0.15) {
          rt.done = false; // Reset for next loop cycle
        }
      });

      // 6. Compute 3D Transform, Pitch & Orientation with Active Hard Wall Collision Resolution
      const dCenter = getSplineTransform(veh.spline, veh.u, 0, 0.08);
      const dAhead = getSplineTransform(veh.spline, veh.u + 0.012, 0, 0.08);
      const dBehind = getSplineTransform(veh.spline, veh.u - 0.012, 0, 0.08);

      // Active Hard Wall Collision Avoidance & Exterior Boundary Push-Out
      const safeTransform = resolveBuildingCollisions(dCenter.point, dCenter.tangent, 2.2);

      veh.pos.copy(safeTransform.adjustedPos);
      veh.forward.copy(safeTransform.adjustedForward);

      if (veh.ref.current) {
        const pitch = Math.max(-0.25, Math.min(0.25, Math.atan2(dAhead.point.y - dBehind.point.y, 2.8)));
        const yaw = Math.atan2(safeTransform.adjustedForward.x, safeTransform.adjustedForward.z);
        veh.ref.current.position.set(safeTransform.adjustedPos.x, safeTransform.adjustedPos.y, safeTransform.adjustedPos.z);
        veh.ref.current.rotation.set(pitch, yaw, 0);
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
        <SCICHeavyDumpTruck bodyColor="#DC2626" headlightsOn={true} />
      </group>

      {/* Vehicle 2: SCIC 4x4 Site Pickup (QA/QC Inspection Patrol) */}
      <group ref={vPickupRef}>
        <SCICSitePickupTruck bodyColor="#FFFFFF" headlightsOn={true} />
      </group>

      {/* Vehicle 3: Toyota HiAce Crew Commuter Van (Shift Workforce Transfer) */}
      <group ref={vVanRef}>
        <ToyotaHiaceCrewVan bodyColor="#E2E8F0" headlightsOn={true} />
      </group>

      {/* Vehicle 4: Safety Patrol 4x4 with Flashing Strobe */}
      <group ref={vPatrolRef}>
        <SCICSitePickupTruck bodyColor="#F59E0B" headlightsOn={true} />
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

      {/* Pedestrian 2: Civil Mason walking uphill on shoulder */}
      <group ref={ped2Ref}>
        <HydroProjectPersonMesh
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

      {/* Pedestrian 3: Senior Surveyor walking downhill on shoulder */}
      <group ref={ped3Ref}>
        <HydroProjectPersonMesh
          personnelId="SURVEYOR_JOHNNY_FARONGEY"
          onSelectPerson={onSelectPerson}
          isPatrolling={true}
          skinTone="BRONZE"
          facialHair="NONE"
          hasHardhat
          hardhatColor="#EAB308"
          hasVest
          vestColor="#EA580C"
          pantsStyle="CARGO"
          accessory="RADIO"
        />
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

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    frameTickRef.current++;
    if (frameTickRef.current % 2 !== 0) return;
    const t = clock.getElapsedTime();

    // 50-second continuous structural QA/QC inspection routine along dry elevated West Walkway
    const cycle = t % 50.0;
    const walkwayX = -10.8;
    const walkwayY = 5.72;

    let targetX = walkwayX;
    let targetZ = 7.5;
    let targetY = walkwayY;
    let rotY = 0;
    let isWalking = false;
    let task = "WALKING";

    if (cycle < 12.0) {
      // Phase 1: Walking south along elevated floodwall inspection walkway
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
    >
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
        <group ref={headRef} position={[0, 0.60, 0]}>
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

export function AnimatedSiteEntities({
  onSelectPerson,
}: {
  onSelectPerson?: (id: string) => void;
}) {
  const [currentGateAngle, setCurrentGateAngle] = useState<number>(0);

  const y1 = useMemo(() => sampleTerrainY(76, -110) + 2.5, []);
  const y2 = useMemo(() => sampleTerrainY(94, -96), []);
  const y3 = useMemo(() => sampleTerrainY(96, -96), []);

  return (
    <group>
      {/* ═══ 1. HIGH-PRECISION CIVIL CONSTRUCTION WORKFORCE (HEPP SITE CREWS) ═══ */}
      {/* 👷 Tailrace Civil QA/QC Quality Engineer (Engr. Jimmy M. Aquino) on dry elevated walkway */}
      <TailraceCivilQCEngineer onSelectPerson={onSelectPerson} />

      {/* Electrical Superintendent (Eduardo De Francia) on dry switchyard platform */}
      <HydroProjectPersonMesh
        personnelId="SUPT_EDUARDO_DEFRANCIA"
        onSelectPerson={onSelectPerson}
        position={[18, 1.20, -6]}
        rotation={[0, Math.PI / 4, 0]}
        skinTone="MEDIUM"
        hairStyle="SHORT"
        hasGlasses={false}
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="RADIO"
      />
      {/* Civil Works Supervisor (Foreman Jaime Caño Jr.) on dry powerhouse entrance apron */}
      <HydroProjectPersonMesh
        personnelId="CIVIL_JAIME_CANO"
        onSelectPerson={onSelectPerson}
        position={[8, 0.80, -12]}
        rotation={[0, -Math.PI / 3, 0]}
        skinTone="BRONZE"
        hasHardhat
        hardhatColor="#16A34A"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
        accessory="CLIPBOARD"
      />

      {/* ═══ 2. STRUCTURAL SLAB ROOF REBAR & SURVEY TEAMS (Z = -110m) ═══ */}
      {/* Skilled Rebar Worker / Steelman (Green Hard Hat) */}
      <HydroProjectPersonMesh
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
      {/* Survey Engineer / Staff (White Hard Hat) */}
      <HydroProjectPersonMesh
        personnelId="SURVEYOR_JOHNNY_FARONGEY"
        onSelectPerson={onSelectPerson}
        position={[78, y1, -112]}
        rotation={[0, -Math.PI / 2, 0]}
        skinTone="BRONZE"
        hasHardhat
        hardhatColor="#EAB308"
        hasVest
        vestColor="#EA580C"
        pantsStyle="KHAKI"
        accessory="CLIPBOARD"
      />

      {/* ═══ 3. TEMFACIL COMPOUND DISPATCH WORKERS (Z = -96m) ═══ */}
      {/* Heavy Equipment & Fleet Supervisor (Howell Gene Samson) */}
      <HydroProjectPersonMesh
        personnelId="EQUIP_HOWELL_SAMSON"
        onSelectPerson={onSelectPerson}
        position={[94, y2, -96]}
        rotation={[0, Math.PI, 0]}
        hardhatColor="#EAB308"
        hasVest
        vestColor="#EA580C"
        pantsStyle="JEANS"
      />
      {/* Dispatch Lead / Warehouse Foreman (White Hard Hat) */}
      <HydroProjectPersonMesh
        position={[96, y3, -96]}
        rotation={[0, 0, 0]}
        skinTone="DEEP"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0D9488"
        pantsStyle="CARGO"
        accessory="RADIO"
      />

      {/* Field Inspection Supervisors along Main Access Road (White Hard Hats) */}
      <HydroProjectPersonMesh
        position={[85, sampleTerrainY(85, -60), -60]}
        rotation={[0, Math.PI / 3, 0]}
        skinTone="BRONZE"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#0284C7"
        pantsStyle="JEANS"
        accessory="TABLET"
      />
      <HydroProjectPersonMesh
        position={[25, sampleTerrainY(25, 20), 20]}
        rotation={[0, -Math.PI / 2, 0]}
        skinTone="MEDIUM"
        hasHardhat
        hardhatColor="#FFFFFF"
        hasVest
        vestColor="#EA580C"
        pantsStyle="KHAKI"
        accessory="CLIPBOARD"
      />

      {/* ═══ 4. EXECUTIVE SITE OFFICE PARKING STALLS ═══ */}
      <group position={[77, sampleTerrainY(77, -95), -95]} rotation={[0, 0, 0]}>
        <SCICSitePickupTruck bodyColor="#1E293B" headlightsOn={false} />
      </group>

      {/* ═══ 5. DESIGNATED MOTORCYCLE PARKING BAYS ═══ */}
      <group position={[108, sampleTerrainY(108, -56), -56]}>
        <PhilippineSiteMotorcycle color="#EA580C" kickstandUp={false} />
      </group>
      <group position={[112, sampleTerrainY(112, -56), -56]}>
        <PhilippineSiteMotorcycle color="#0284C7" kickstandUp={false} />
      </group>

      {/* ═══ 6. AUTONOMOUS SITE TRAFFIC & WORKFORCE FLOW ═══ */}
      <AutonomousSiteTrafficSystem gateAngle={currentGateAngle} onGateAngleChange={setCurrentGateAngle} />

      {/* ═══ 7. TUESDAY SAFETY TOOLBOX MEETING DIRECTOR & WORKFORCE FORMATION ═══ */}
      <CourtToolboxMeetingDirector />
    </group>
  );
}
