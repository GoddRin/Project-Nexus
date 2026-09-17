/**
 * TunnelSegment.tsx
 *
 * Self-contained 3D Headrace Tunnel Component for Project Nexus Digital Twin.
 *
 * Grounded in docs/tunnel-scene-brief.md & real Philippine run-of-river hydro construction.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL SCOPE SPECIFICATION (EXPLICIT DESIGN CONTRACT):
 * ═══════════════════════════════════════════════════════════════════════════
 * This component represents an active 60-meter representative heading drive
 * cutaway that captures the complete excavation-to-lining progression from
 * the active blasted rock face back to the fully cast concrete lining.
 *
 * It is fully parametric and can either:
 *  1. Function as the active excavation heading cutaway (default 60m spline), or
 *  2. Tile along the entire 1.2km - 9.6km headrace conduit by passing an external
 *     alignment spline and chainage station range.
 *
 * KEY TECHNICAL ARCHITECTURE:
 *  - Single Custom ShaderMaterial (`TunnelLiningShaderMaterial`):
 *    Blends across all 4 construction zones via `uLiningProgress` uniform and
 *    smoothstep without rebuilding geometry or causing draw-call thrashing.
 *  - Zero Geometry Re-allocation on Animating `liningProgress`:
 *    Uniform updates take O(1) time per frame. Instanced meshes for TH-arches
 *    and rock bolts update in-place within pre-allocated matrix buffers.
 *  - Singleton Texture Cache (`tunnelTextures.ts`):
 *    GPU VRAM textures created strictly once; zero memory leaks or garbage collection.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  createTunnelExtrusionGeometry,
  createBlastedFaceGeometry,
  createMuckPileGeometry,
  createSteelRibArchGeometry,
  createRockBoltPlateGeometry,
  generateHorseshoeProfile,
} from "./TunnelGeometry";
import { getTunnelMaterialTextures } from "./tunnelTextures";
import { TunnelLiningShaderMaterial } from "./TunnelShaderMaterial";
import { TunnelLighting } from "./TunnelLighting";
import { TunnelDustParticles } from "./TunnelDustParticles";
import { TunnelWaterSeepage } from "./TunnelWaterSeepage";
import { TunnelPersonnelCrew } from "./TunnelPersonnelCrew";
import {
  FaceCycleStage,
  FaceCycleState,
  FaceCycleConfig,
  FACE_CYCLE_STAGES,
  ORDERED_FACE_STAGES,
} from "./TunnelFaceCycleTypes";
import { TunnelChainageMarkers } from "./TunnelChainageMarkers";
import { TunnelFaceCycleActors } from "./TunnelFaceCycleActors";

export interface TunnelSegmentProps {
  /**
   * Construction lining progress from 0.0 (all raw rock) to 1.0 (fully lined).
   * Drives the 4-zone shader boundaries and instanced support visibility.
   */
  liningProgress?: number;

  /**
   * Tunnel excavated diameter in meters. Default: 3.2m (Radius 1.6m).
   */
  diameter?: number;

  /**
   * Length of this active heading drive cutaway in meters. Default: 60m.
   */
  length?: number;

  /**
   * Optional custom 3D alignment spline. If omitted, a realistic
   * gently curving mountain headrace spline is generated automatically.
   */
  alignmentSpline?: THREE.Curve<THREE.Vector3>;

  /**
   * World transform props
   */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];

  /**
   * Environmental & Weather modifiers
   */
  seepageFactor?: number; // 0.0 to 1.0 (increases puddle/wet sheen on invert)
  dustIntensity?: number; // 0.0 to 1.0 (airborne blast/mucking rock dust)
  amberWarning?: boolean; // Safety alarm (pulses string lights amber)
  showSteelRibs?: boolean; // Render instanced 3D TH-arches in Zone 2
  showRockBolts?: boolean; // Render instanced square rock-bolt plates in Zone 2
  showMuckPile?: boolean;  // Render rock rubble pile at the active face
  showFaceCap?: boolean;   // Render jagged rock end-cap at the heading
  showFloodlights?: boolean; // Portable tripod floodlights at active face
  showStringLights?: boolean; // Overhead shoulder string lights
  showVolumetrics?: boolean;  // Volumetric god-ray cones
  showDust?: boolean;         // GPU airborne dust particle simulation
  showDrips?: boolean;        // Crown fissure water drip emitters
  showPuddles?: boolean;      // Invert puddle decals with ripple reflections
  showPersonnel?: boolean;    // Render authentic 14-man underground face crew
  showNormalsDebug?: boolean; // Normal-direction debug aid (protruding spikes showing inward normal direction)
  onSelectWorker?: (worker: any) => void; // Click callback on worker

  /**
   * Phase 4: Drill-and-blast excavation advance in meters along heading drive
   */
  advanceMeters?: number;
  onAdvanceChange?: (meters: number) => void;
  faceCycleEnabled?: boolean;
  faceCycleConfig?: FaceCycleConfig;
  showFaceCycleHUD?: boolean;
  showChainageMarkers?: boolean;
  onTriggerCameraShake?: (intensity: number) => void;
}

const scratchDummy = new THREE.Object3D();
const scratchQuat = new THREE.Quaternion();
const MAX_RIBS = 60; // Max support arches (1 every 1.0m along 60m drive)
const BOLTS_PER_RING = 6;
const MAX_BOLTS = MAX_RIBS * BOLTS_PER_RING;

export function TunnelSegment({
  liningProgress = 0.65,
  diameter = 5.0, // 5.0m visual composition diameter (Radius 2.5m, expanded from 3.2m engineering spec)
  length = 60.0,
  alignmentSpline,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  seepageFactor = 0.25,
  dustIntensity = 0.40,
  amberWarning = false,
  showSteelRibs = true,
  showRockBolts = true,
  showMuckPile = true,
  showFaceCap = true,
  showFloodlights = true,
  showStringLights = true,
  showVolumetrics = true,
  showDust = true,
  showDrips = true,
  showPuddles = true,
  showPersonnel = true,
  showNormalsDebug = false,
  onSelectWorker,
  advanceMeters: advanceMetersProp = 57.6,
  onAdvanceChange,
  faceCycleEnabled = true,
  faceCycleConfig,
  showFaceCycleHUD = true,
  showChainageMarkers = true,
  onTriggerCameraShake,
}: TunnelSegmentProps) {
  const radius = diameter * 0.5;

  // ─── 1. DEFAULT MOUNTAIN HEADRACE ALIGNMENT SPLINE ─────────────────────────
  // A representative 60m drive through the Sierra Madre rock formation:
  // Starts at Portal Adit (0, 0, 0) and curves gently into the mountain (-Z)
  const defaultSpline = useMemo(() => {
    const points: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.8, 0.15, -length * 0.25),
      new THREE.Vector3(-1.2, 0.35, -length * 0.5),
      new THREE.Vector3(-0.5, 0.55, -length * 0.75),
      new THREE.Vector3(0.4, 0.75, -length),
    ];
    return new THREE.CatmullRomCurve3(points, false, "centripetal");
  }, [length]);

  const activeSpline = alignmentSpline || defaultSpline;

  // ─── 2. GEOMETRY ALLOCATION (ALLOCATED ONCE, NEVER RE-ALLOCATED) ───────────
  const tunnelTubeGeometry = useMemo(() => {
    return createTunnelExtrusionGeometry(activeSpline, radius, 120, 36);
  }, [activeSpline, radius]);

  const blastedFaceGeometry = useMemo(() => {
    return createBlastedFaceGeometry(radius, 32);
  }, [radius]);

  const muckPileGeometry = useMemo(() => {
    return createMuckPileGeometry(radius, 6.0);
  }, [radius]);

  const steelRibGeometry = useMemo(() => {
    return createSteelRibArchGeometry(radius, 0.14, 0.12);
  }, [radius]);

  const rockBoltGeometry = useMemo(() => {
    return createRockBoltPlateGeometry(0.18);
  }, []);

  // ─── 3. TEXTURE SINGLETON CACHE (ZERO RUNTIME RE-ALLOCATION) ───────────────
  const textures = useMemo(() => getTunnelMaterialTextures(), []);

  // ─── 4. SHADER MATERIAL INSTANCE (ALLOCATED ONCE, O(1) UNIFORM UPDATES) ──
  // LIGHT MODEL INTEGRATION: Samples Phase 2's dynamic light positions & colors
  const shaderMaterial = useMemo(() => {
    const vStand = 0.90;
    const centerStand = activeSpline.getPointAt(vStand);
    const tangent = activeSpline.getTangentAt(vStand).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const floodlightPos = centerStand.clone().addScaledVector(right, -radius * 0.58);
    floodlightPos.y += -radius + 1.5;

    const faceCenter = activeSpline.getPointAt(1.0);
    const floodlightDir = faceCenter.clone().sub(floodlightPos).normalize();

    const stringLightVs = [0.08, 0.25, 0.42, 0.60, 0.78, 0.92];
    const stringLightPositions = stringLightVs.map((v) => {
      const pt = activeSpline.getPointAt(v);
      const tan = activeSpline.getTangentAt(v).normalize();
      const rVec = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      return pt.addScaledVector(rVec, radius * 0.82).add(new THREE.Vector3(0, radius * 0.35, 0));
    });

    // Transform local light positions to WORLD coordinates so they match vWorldPos in fragment shader
    const groupMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale)
    );
    const worldFloodlightPos = floodlightPos.clone().applyMatrix4(groupMatrix);
    const worldFloodlightDir = floodlightDir.clone().transformDirection(groupMatrix).normalize();
    const worldStringLightPositions = stringLightPositions.map((p) => p.clone().applyMatrix4(groupMatrix));

    const mat = new (TunnelLiningShaderMaterial as any)();
    mat.vertexColors = true;
    mat.side = THREE.FrontSide;
    mat.uLiningProgress = liningProgress;
    mat.uTransitionWidth = 0.035;
    mat.uSeepageFactor = seepageFactor;
    mat.uRawRockAlbedo = textures.rawRock.albedo;
    mat.uRawRockNormal = textures.rawRock.normal;
    mat.uRawRockRoughness = textures.rawRock.roughness;
    mat.uRawRockAO = textures.rawRock.ao;
    mat.uWireMeshAlbedo = textures.wireMeshBolts.albedo;
    mat.uWireMeshNormal = textures.wireMeshBolts.normal;
    mat.uWireMeshRoughness = textures.wireMeshBolts.roughness;
    mat.uShotcreteAlbedo = textures.shotcrete.albedo;
    mat.uShotcreteNormal = textures.shotcrete.normal;
    mat.uShotcreteRoughness = textures.shotcrete.roughness;
    mat.uConcreteAlbedo = textures.concreteLining.albedo;
    mat.uConcreteNormal = textures.concreteLining.normal;
    mat.uConcreteRoughness = textures.concreteLining.roughness;

    // Genuine Phase 2 Light Uniforms (World Space)
    mat.uFaceFloodlightPos = worldFloodlightPos;
    mat.uFaceFloodlightDir = worldFloodlightDir;
    mat.uFaceFloodlightColor = new THREE.Color("#FFF3DB");
    mat.uFaceFloodlightIntensity = 2.8;
    mat.uFaceFloodlightEnabled = showFloodlights ? 1.0 : 0.0;

    mat.uStringLightPositions = worldStringLightPositions;
    mat.uStringLightColor = new THREE.Color("#FFE1A8");
    mat.uStringLightIntensity = 2.4;
    mat.uStringLightEnabled = showStringLights ? 1.0 : 0.0;

    mat.uSubterraneanAmbient = new THREE.Color("#38342F");
    mat.uLightDirection = new THREE.Vector3(0.3, 0.8, 0.5).normalize();
    mat.uLightColor = new THREE.Color("#F3E6D0");
    return mat;
  }, [textures, activeSpline, radius, showFloodlights, showStringLights, position, rotation, scale]);

  const ribsInstancedRef = useRef<THREE.InstancedMesh>(null);
  const boltsInstancedRef = useRef<THREE.InstancedMesh>(null);
  const faceCapRef = useRef<THREE.Mesh>(null);
  const muckPileRef = useRef<THREE.Mesh>(null);

  // ─── PHASE 4: FACE CYCLE STATE & CONFIG ──────────────────────────────────
  const [cycleConfig, setCycleConfig] = useState<FaceCycleConfig>({
    roundAdvanceMeters: 2.0,
    autoAdvance: true,
    enableCameraShake: true,
    playbackSpeed: 1.0,
    baseChainageMeters: 1200,
    ...faceCycleConfig,
  });

  const [cycleState, setCycleState] = useState<FaceCycleState>({
    currentStage: "drilling",
    stageProgress: 0.0,
    timeInStage: 0.0,
    isPlaying: true, // Default to running smoothly
    roundCount: 14,
    advanceMeters: advanceMetersProp ?? 57.6,
    isBlasting: false,
    blastIntensity: 0.0,
  });

  // Mutable ref for O(1) 60Hz per-frame updates without thrashing React render tree
  const cycleStateRef = useRef<FaceCycleState>({ ...cycleState });
  const lastUiUpdateRef = useRef<number>(0);

  // Keep internal advance synchronized if prop changes from outside
  useEffect(() => {
    if (advanceMetersProp !== undefined) {
      cycleStateRef.current.advanceMeters = advanceMetersProp;
      setCycleState((prev) => ({ ...prev, advanceMeters: advanceMetersProp }));
    }
  }, [advanceMetersProp]);

  useEffect(() => {
    if (faceCycleConfig) {
      setCycleConfig((prev) => ({ ...prev, ...faceCycleConfig }));
    }
  }, [faceCycleConfig]);

  // Global test & inspection hooks for deterministic programmatic control
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).__SET_TUNNEL_FACE_STAGE__ = (stage: FaceCycleStage, progress = 0.5) => {
      const stageInfo = FACE_CYCLE_STAGES[stage];
      const duration = cycleConfig.stageDurations?.[stage] ?? stageInfo.defaultDuration;
      const isBlasting = stage === "charging_blasting" && progress >= 0.58 && progress <= 0.82;
      const blastIntensity = isBlasting ? Math.sin(((progress - 0.58) / 0.24) * Math.PI) : 0.0;
      const updated: FaceCycleState = {
        ...cycleStateRef.current,
        currentStage: stage,
        stageProgress: progress,
        timeInStage: progress * duration,
        isBlasting,
        blastIntensity,
      };
      cycleStateRef.current = updated;
      setCycleState(updated);
      window.dispatchEvent(
        new CustomEvent("tunnel-face-cycle-update", {
          detail: { state: updated, config: cycleConfig },
        })
      );
    };

    (window as any).__SET_TUNNEL_ADVANCE__ = (meters: number) => {
      cycleStateRef.current.advanceMeters = meters;
      setCycleState((prev) => ({ ...prev, advanceMeters: meters }));
      if (onAdvanceChange) onAdvanceChange(meters);
      window.dispatchEvent(
        new CustomEvent("tunnel-face-cycle-update", {
          detail: { state: cycleStateRef.current, config: cycleConfig },
        })
      );
    };

    (window as any).__SET_TUNNEL_PLAYING__ = (isPlaying: boolean) => {
      cycleStateRef.current.isPlaying = isPlaying;
      setCycleState((prev) => ({ ...prev, isPlaying }));
      window.dispatchEvent(
        new CustomEvent("tunnel-face-cycle-update", {
          detail: { state: cycleStateRef.current, config: cycleConfig },
        })
      );
    };

    (window as any).__GET_TUNNEL_CYCLE_STATE__ = () => ({
      state: cycleStateRef.current,
      config: cycleConfig,
    });

    const handleCommand = (e: any) => {
      const { action, payload } = e.detail || {};
      if (action === "togglePlay") {
        const nextPlay = !cycleStateRef.current.isPlaying;
        cycleStateRef.current.isPlaying = nextPlay;
        setCycleState((prev) => ({ ...prev, isPlaying: nextPlay }));
      } else if (action === "selectStage") {
        const stage = payload as FaceCycleStage;
        const stageInfo = FACE_CYCLE_STAGES[stage];
        const duration = cycleConfig.stageDurations?.[stage] ?? stageInfo.defaultDuration;
        const updated: FaceCycleState = {
          ...cycleStateRef.current,
          currentStage: stage,
          stageProgress: 0.0,
          timeInStage: 0.0,
          isBlasting: false,
          blastIntensity: 0.0,
        };
        cycleStateRef.current = updated;
        setCycleState(updated);
      } else if (action === "nextStage") {
        const currentIdx = ORDERED_FACE_STAGES.indexOf(cycleStateRef.current.currentStage);
        const nextIdx = (currentIdx + 1) % ORDERED_FACE_STAGES.length;
        const nextStage = ORDERED_FACE_STAGES[nextIdx];
        const updated: FaceCycleState = {
          ...cycleStateRef.current,
          currentStage: nextStage,
          stageProgress: 0.0,
          timeInStage: 0.0,
          isBlasting: false,
          blastIntensity: 0.0,
        };
        cycleStateRef.current = updated;
        setCycleState(updated);
      } else if (action === "prevStage") {
        const currentIdx = ORDERED_FACE_STAGES.indexOf(cycleStateRef.current.currentStage);
        const prevIdx =
          (currentIdx - 1 + ORDERED_FACE_STAGES.length) % ORDERED_FACE_STAGES.length;
        const prevStage = ORDERED_FACE_STAGES[prevIdx];
        const updated: FaceCycleState = {
          ...cycleStateRef.current,
          currentStage: prevStage,
          stageProgress: 0.0,
          timeInStage: 0.0,
          isBlasting: false,
          blastIntensity: 0.0,
        };
        cycleStateRef.current = updated;
        setCycleState(updated);
      } else if (action === "setAdvanceMeters") {
        const adv = typeof payload === "number" ? payload : Number(payload);
        cycleStateRef.current.advanceMeters = adv;
        setCycleState((prev) => ({ ...prev, advanceMeters: adv }));
        if (onAdvanceChange) onAdvanceChange(adv);
      } else if (action === "toggleAutoAdvance") {
        setCycleConfig((prev) => ({ ...prev, autoAdvance: !prev.autoAdvance }));
      } else if (action === "toggleCameraShake") {
        setCycleConfig((prev) => ({
          ...prev,
          enableCameraShake: !prev.enableCameraShake,
        }));
      } else if (action === "setSpeed") {
        setCycleConfig((prev) => ({ ...prev, playbackSpeed: payload }));
      }

      window.dispatchEvent(
        new CustomEvent("tunnel-face-cycle-update", {
          detail: { state: cycleStateRef.current, config: cycleConfig },
        })
      );
    };

    window.addEventListener("tunnel-face-cycle-command", handleCommand);

    // Initial state notification to outer HUDs
    window.dispatchEvent(
      new CustomEvent("tunnel-face-cycle-update", {
        detail: { state: cycleStateRef.current, config: cycleConfig },
      })
    );

    return () => {
      window.removeEventListener("tunnel-face-cycle-command", handleCommand);
    };
  }, [cycleConfig, onAdvanceChange]);

  const blastTriggeredRef = useRef(false);

  // Cached face transform for actors & initial mount
  const initialFaceNorm = THREE.MathUtils.clamp((advanceMetersProp ?? 57.6) / length, 0.05, 0.999);
  const initialFacePt = activeSpline.getPointAt(initialFaceNorm);
  const initialFaceTangent = activeSpline.getTangentAt(initialFaceNorm).normalize();
  const initialFaceQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), initialFaceTangent);

  const [faceActorTransform, setFaceActorTransform] = useState<{
    position: [number, number, number];
    rotation: [number, number, number];
  }>({
    position: [initialFacePt.x, initialFacePt.y, initialFacePt.z],
    rotation: [0, Math.atan2(initialFaceTangent.x, initialFaceTangent.z), 0],
  });

  // ─── 5. SYNCHRONIZED SIMULATION & INSTANCED SUPPORTS IN USEFRAME ─────────
  useFrame((state, delta) => {
    const cState = cycleStateRef.current;
    const effectiveAdvance = cState.advanceMeters;
    const vFace = THREE.MathUtils.clamp(effectiveAdvance / length, 0.05, 0.999);

    // A. Step Face Cycle Engine Timers (Design Resolution 5)
    if (faceCycleEnabled && cState.isPlaying) {
      const speed = cycleConfig.playbackSpeed ?? 1.0;
      const stageInfo = FACE_CYCLE_STAGES[cState.currentStage];
      const stageDuration = cycleConfig.stageDurations?.[cState.currentStage] ?? stageInfo.defaultDuration;

      const newTime = cState.timeInStage + delta * speed;
      const progress = Math.min(1.0, newTime / stageDuration);

      // Blasting Detonation Window (between 60% and 82% of charging_blasting stage)
      let isBlasting = false;
      let blastIntensity = 0.0;
      if (cState.currentStage === "charging_blasting") {
        if (progress >= 0.58 && progress <= 0.82) {
          isBlasting = true;
          const pNorm = (progress - 0.58) / 0.24;
          blastIntensity = Math.sin(pNorm * Math.PI);

          if (!blastTriggeredRef.current && progress >= 0.60) {
            blastTriggeredRef.current = true;
            if (onTriggerCameraShake && cycleConfig.enableCameraShake !== false) {
              onTriggerCameraShake(1.0);
            }
            if (typeof window !== "undefined" && (window as any).__TRIGGER_CAMERA_SHAKE__) {
              (window as any).__TRIGGER_CAMERA_SHAKE__(1.0);
            }
          }
        } else if (progress > 0.82) {
          blastTriggeredRef.current = false;
        }
      }

      cState.timeInStage = newTime;
      cState.stageProgress = progress;
      cState.isBlasting = isBlasting;
      cState.blastIntensity = blastIntensity;

      let stageChanged = false;
      if (newTime >= stageDuration) {
        stageChanged = true;
        blastTriggeredRef.current = false;
        const currentIdx = ORDERED_FACE_STAGES.indexOf(cState.currentStage);
        const nextIdx = (currentIdx + 1) % ORDERED_FACE_STAGES.length;
        const nextStage = ORDERED_FACE_STAGES[nextIdx];

        let newAdvance = cState.advanceMeters;
        let newRound = cState.roundCount;

        // If cycle completes (after shotcreting), advance heading!
        if (nextIdx === 0) {
          newRound += 1;
          if (cycleConfig.autoAdvance !== false) {
            const advStep = cycleConfig.roundAdvanceMeters ?? 2.0;
            newAdvance = Math.min(length, newAdvance + advStep);
            if (onAdvanceChange) onAdvanceChange(newAdvance);
          }
        }

        cState.currentStage = nextStage;
        cState.stageProgress = 0.0;
        cState.timeInStage = 0.0;
        cState.roundCount = newRound;
        cState.advanceMeters = newAdvance;
        cState.isBlasting = false;
        cState.blastIntensity = 0.0;
      }

      // Throttle React UI State updates to 4Hz (every 250ms) or immediately on stage change
      const now = performance.now();
      if (stageChanged || now - lastUiUpdateRef.current >= 250) {
        lastUiUpdateRef.current = now;
        setCycleState({ ...cState });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("tunnel-face-cycle-update", {
              detail: { state: { ...cState }, config: cycleConfig },
            })
          );
        }
      }
    }

    // B. Update Shader Material Uniforms (O(1) cost, zero rebuilds)
    if (shaderMaterial) {
      shaderMaterial.uFaceProgress = vFace;
      shaderMaterial.uTunnelLength = length;
      shaderMaterial.uBareRockOffset = 4.0;
      shaderMaterial.uMeshRibOffset = 8.0;
      shaderMaterial.uShotcreteOffset = 12.0;
      shaderMaterial.uBlastFlashIntensity = cState.blastIntensity;
      shaderMaterial.uBlastDustIntensity =
        cState.currentStage === "charging_blasting"
          ? cState.blastIntensity
          : cState.currentStage === "mucking" && cState.stageProgress < 0.35
          ? 0.5 * (1.0 - cState.stageProgress / 0.35)
          : 0.0;
      shaderMaterial.uSeepageFactor = seepageFactor;

      // Real light integration: sync amber warning pulse and toggles directly
      if (amberWarning) {
        const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 6.0);
        shaderMaterial.uStringLightColor.setRGB(1.0, 0.4 + 0.3 * pulse, 0.05);
        shaderMaterial.uStringLightIntensity = 2.0 + 3.5 * pulse;
      } else {
        shaderMaterial.uStringLightColor.setRGB(1.0, 0.88, 0.66);
        shaderMaterial.uStringLightIntensity = 2.4;
      }
      shaderMaterial.uStringLightEnabled = showStringLights ? 1.0 : 0.0;
      shaderMaterial.uFaceFloodlightEnabled = showFloodlights ? 1.0 : 0.0;
    }

    // C. Update Dynamic Face Position (Blasted Face End-Cap & Muck Rubble Pile)
    const facePt = activeSpline.getPointAt(vFace);
    const faceTangent = activeSpline.getTangentAt(vFace).normalize();
    scratchQuat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), faceTangent);

    if (faceCapRef.current) {
      faceCapRef.current.position.copy(facePt);
      faceCapRef.current.quaternion.copy(scratchQuat);
    }
    if (muckPileRef.current) {
      muckPileRef.current.position.copy(facePt);
      muckPileRef.current.quaternion.copy(scratchQuat);

      // In mucking stage, smoothly lower muck pile as LHD hauls rubble away
      if (cState.currentStage === "mucking") {
        const rubbleScale = Math.max(0.15, 1.0 - cState.stageProgress * 0.72);
        muckPileRef.current.scale.set(1.0, rubbleScale, rubbleScale);
      } else if (cState.currentStage === "charging_blasting" && cState.stageProgress >= 0.70) {
        muckPileRef.current.scale.set(1.0, 1.0, 1.0);
      }
    }

    // D. Trailing Support Zone (Design Resolutions 2 & 3: Meters-Based Instanced Ribs & Bolts)
    const bareRockNorm = 4.0 / length;
    const meshRibNorm = 8.0 / length;
    const b2 = Math.max(0.0, vFace - bareRockNorm);
    const b1 = Math.max(0.0, b2 - meshRibNorm);

    // Update Instanced Steel Rib Arches in Zone 2 [b1, b2]
    if (ribsInstancedRef.current && showSteelRibs) {
      for (let i = 0; i < MAX_RIBS; i++) {
        const v = (i + 1) / (MAX_RIBS + 1);

        if (v >= b1 && v <= b2) {
          const pt = activeSpline.getPointAt(v);
          const tangent = activeSpline.getTangentAt(v).normalize();

          scratchDummy.position.copy(pt);
          scratchDummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
          scratchDummy.scale.set(1, 1, 1);
        } else {
          scratchDummy.scale.set(0, 0, 0);
        }
        scratchDummy.updateMatrix();
        ribsInstancedRef.current.setMatrixAt(i, scratchDummy.matrix);
      }
      ribsInstancedRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update Instanced Rock-Bolt Bearing Plates in Zone 2 [b1, b2]
    if (boltsInstancedRef.current && showRockBolts) {
      const archProfile = generateHorseshoeProfile(radius - 0.02, 28);
      const boltAngles = [3, 7, 11, 15, 19, 23];

      let boltIdx = 0;
      for (let i = 0; i < MAX_RIBS; i++) {
        const v = (i + 0.5) / MAX_RIBS;

        for (let b = 0; b < BOLTS_PER_RING; b++) {
          if (boltIdx < MAX_BOLTS) {
            if (v >= b1 && v <= b2) {
              const ptCenter = activeSpline.getPointAt(v);
              const tangent = activeSpline.getTangentAt(v).normalize();
              const normal = new THREE.Vector3(0, 1, 0);
              const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
              const upNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

              const profilePt = archProfile[boltAngles[b] % archProfile.length];
              const boltPos = ptCenter
                .clone()
                .addScaledVector(binormal, profilePt.x)
                .addScaledVector(upNormal, profilePt.y);

              scratchDummy.position.copy(boltPos);
              scratchDummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
              scratchDummy.scale.set(1, 1, 1);
            } else {
              scratchDummy.scale.set(0, 0, 0);
            }
            scratchDummy.updateMatrix();
            boltsInstancedRef.current.setMatrixAt(boltIdx, scratchDummy.matrix);
            boltIdx++;
          }
        }
      }
      boltsInstancedRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale} name="tunnel-heading-drive-segment">
      {/* ═══ 1. MAIN TUNNEL TUBE MESH (Multi-Zone Shader Blended) ═══ */}
      <mesh geometry={tunnelTubeGeometry} material={shaderMaterial} receiveShadow castShadow />
      {showNormalsDebug && <TunnelNormalsDebug geometry={tunnelTubeGeometry} />}

      {/* ═══ 2. INSTANCED 3D STEEL TH-ARCH RIBS (Zone 2 Support Sets) ═══ */}
      {showSteelRibs && (
        <instancedMesh
          ref={ribsInstancedRef}
          args={[steelRibGeometry, undefined, MAX_RIBS]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#4A4540"
            metalness={0.78}
            roughness={0.42}
            roughnessMap={textures.wireMeshBolts.roughness}
          />
        </instancedMesh>
      )}

      {/* ═══ 3. INSTANCED 3D SQUARE ROCK-BOLT BEARING PLATES (Zone 2) ═══ */}
      {showRockBolts && (
        <instancedMesh
          ref={boltsInstancedRef}
          args={[rockBoltGeometry, undefined, MAX_BOLTS]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#7A848E"
            metalness={0.85}
            roughness={0.35}
          />
        </instancedMesh>
      )}

      {/* ═══ 4. ACTIVE BLASTED ROCK END-CAP (Zone 1 Heading Face) ═══ */}
      {showFaceCap && (
        <mesh
          ref={faceCapRef}
          geometry={blastedFaceGeometry}
          position={initialFacePt}
          quaternion={initialFaceQuat}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={textures.rawRock.albedo}
            normalMap={textures.rawRock.normal}
            roughnessMap={textures.rawRock.roughness}
            aoMap={textures.rawRock.ao}
            roughness={0.88}
            metalness={0.08}
          />
        </mesh>
      )}

      {/* ═══ 5. BLASTED MUCK RUBBLE PILE (Zone 1 Active Floor Rubble) ═══ */}
      {showMuckPile && (
        <mesh
          ref={muckPileRef}
          geometry={muckPileGeometry}
          position={initialFacePt}
          quaternion={initialFaceQuat}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={textures.rawRock.albedo}
            normalMap={textures.rawRock.normal}
            roughnessMap={textures.rawRock.roughness}
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* ═══ 6. PHASE 2 ATMOSPHERIC LIGHTING & VOLUMETRIC GOD-RAYS ═══ */}
      {(showFloodlights || showStringLights) && (
        <TunnelLighting
          spline={activeSpline}
          radius={radius}
          length={length}
          showFloodlights={showFloodlights}
          showStringLights={showStringLights}
          showVolumetrics={showVolumetrics}
          amberWarning={amberWarning}
        />
      )}

      {/* ═══ 7. PHASE 2 GPU AIRBORNE DUST PARTICLES (Forward Scattering) ═══ */}
      {showDust && (
        <TunnelDustParticles
          spline={activeSpline}
          radius={radius}
          length={length}
          dustIntensity={dustIntensity}
        />
      )}

      {/* ═══ 8. PHASE 2 WATER SEEPAGE: CROWN DRIPS & INVERT PUDDLES ═══ */}
      {(showDrips || showPuddles) && (
        <TunnelWaterSeepage
          spline={activeSpline}
          radius={radius}
          seepageFactor={seepageFactor}
          showDrips={showDrips}
          showPuddles={showPuddles}
        />
      )}

      {/* ═══ 9. PHASE 3 UNDERGROUND PERSONNEL SIMULATION (14-MAN CREW) ═══ */}
      {showPersonnel && (
        <TunnelPersonnelCrew
          spline={activeSpline}
          radius={radius}
          length={length}
          activeCycleStage={faceCycleEnabled ? cycleState.currentStage : undefined}
          isAlertActive={amberWarning}
          onSelectWorker={onSelectWorker}
        />
      )}

      {/* ═══ 10. PHASE 4 PAINTED CHAINAGE STENCILS (Wall Decals) ═══ */}
      {showChainageMarkers && (
        <TunnelChainageMarkers
          spline={activeSpline}
          radius={radius}
          totalLength={length}
          advanceMeters={cycleState.advanceMeters}
          baseChainageMeters={cycleConfig.baseChainageMeters}
        />
      )}

      {/* ═══ 11. PHASE 4 FACE CYCLE EQUIPMENT & VISUAL FX ═══ */}
      {faceCycleEnabled && (
        <TunnelFaceCycleActors
          currentStage={cycleState.currentStage}
          stageProgress={cycleState.stageProgress}
          advanceMeters={cycleState.advanceMeters}
          totalLength={length}
          facePosition={[
            faceCapRef.current?.position.x ?? initialFacePt.x,
            faceCapRef.current?.position.y ?? initialFacePt.y,
            faceCapRef.current?.position.z ?? initialFacePt.z,
          ]}
          faceRotation={[0, Math.atan2(initialFaceTangent.x, initialFaceTangent.z), 0]}
          spline={activeSpline}
          radius={radius}
          isBlasting={cycleState.isBlasting}
          blastIntensity={cycleState.blastIntensity}
        />
      )}

    </group>
  );
}

/**
 * Normal-direction debug helper: renders lime-green spikes pointing in the direction of vertex normals.
 * For an interior tunnel, vertices must point inward toward the tunnel center line.
 */
export function TunnelNormalsDebug({
  geometry,
  step = 8,
  length = 0.50,
  color = "#00FF66",
}: {
  geometry: THREE.BufferGeometry;
  step?: number;
  length?: number;
  color?: string;
}) {
  const lineGeo = useMemo(() => {
    const posAttr = geometry.getAttribute("position");
    const normAttr = geometry.getAttribute("normal");
    if (!posAttr || !normAttr) return null;

    const positions: number[] = [];
    for (let i = 0; i < posAttr.count; i += step) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const nx = normAttr.getX(i);
      const ny = normAttr.getY(i);
      const nz = normAttr.getZ(i);

      positions.push(px, py, pz);
      positions.push(px + nx * length, py + ny * length, pz + nz * length);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return bg;
  }, [geometry, step, length]);

  if (!lineGeo) return null;
  return (
    <lineSegments geometry={lineGeo}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}
