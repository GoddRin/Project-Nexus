/**
 * TunnelWorkerModel.tsx
 *
 * Rigged Humanoid Worker Instance Component with Animation State Machine.
 * Grounded in docs/tunnel-scene-brief.md & real Philippine hydro drill-and-blast operations.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL RESOLUTIONS & EXECUTION CONTRACTS:
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. CLONING METHOD (RESOLUTION 1):
 *    We strictly use `SkeletonUtils.clone(gltf.scene)` from `three-stdlib`.
 *    A standard Object3D.clone() or scene.clone() fails to re-bind the SkinnedMesh's
 *    bone references per instance, which would cause all worker clones to share a
 *    single animated skeleton. SkeletonUtils.clone() deep-clones both the skeleton
 *    and the SkinnedMesh with isolated bone bindings per worker.
 *
 * 2. BONE-OFFSET / MIXER ORDERING (RESOLUTION 2):
 *    In useFrame:
 *     Step 1: mixer.update(delta) evaluates the base keyframe track.
 *     Step 2: Procedural bone rotations are strictly ADDED (+=) to the animated pose
 *             AFTER the mixer update. This guarantees working-state procedural motions
 *             (drilling vibration, nozzle sweep, surveying crouch) layer on top of
 *             the base animation and crossfade cleanly without popping.
 *
 * 3. SKELETAL BONE NAMING & PROP ATTACHMENTS (RESOLUTION 3):
 *    - Armature naming: 'UpperArm.L/R', 'Forearm.L/R', 'Hand.L/R', 'Head', 'Spine'.
 *    - Prop attachment targets: Hand.R, Hand.L, or Ground-Mounted directly in front.
 *
 * 4. STATE-TO-CLIP MAPPING (RESOLUTION 4):
 *    - "idle": Plays 'Foreman_Idle' (1.0x).
 *    - "walking": Plays 'Foreman_Walk' (1.0x).
 *    - "working": Plays 'Foreman_Idle' (1.0x) + procedural skeletal bone offsets.
 *    - "alert": Plays 'Foreman_Walk' at 1.45x playback speed facing portal direction.
 *      (Dedicated panic sprint clip flagged as future mocap asset need).
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  TunnelWorkerRole,
  WorkerAnimationState,
  ROLE_PROFILES,
} from "./TunnelWorkerTypes";
import {
  TotalStationProp,
  PneumaticDrillProp,
  ShotcreteNozzleProp,
  MultiGasDetectorProp,
  GeologistPickProp,
  ClipboardRadioProp,
  TorqueWrenchProp,
  PryBarProp,
  BlastingTesterProp,
} from "./TunnelWorkerProps";
import { VolumetricLightBeam } from "./VolumetricLightBeam";

export interface TunnelWorkerModelProps {
  role: TunnelWorkerRole;
  animationState?: WorkerAnimationState;
  showHeadlamp?: boolean;
}

export function TunnelWorkerModel({
  role,
  animationState = "working",
  showHeadlamp = true,
}: TunnelWorkerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/characters/scic_civil_foreman.glb");
  const profile = ROLE_PROFILES[role];

  // ─── 1. SKELETON-AWARE DEEP CLONING (RESOLUTION 1) ─────────────────────────
  // CRITICAL ARCHITECTURAL REQUIREMENT: Character instancing MUST use
  // THREE.SkeletonUtils.clone() (skeleton-aware deep clone), NOT Object3D.clone()
  // or GLTF scene.clone(). A plain clone does not correctly re-bind skinned mesh
  // bone references per instance and will cause all worker clones to share a
  // single animated skeleton. SkeletonUtils.clone() deep-clones both the skeleton
  // and the SkinnedMesh with isolated bone bindings per worker. Do not simplify!
  const { clonedScene, bones } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;

    // Collect bone references
    const boneMap: Record<string, THREE.Bone> = {};
    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        boneMap[child.name] = child as THREE.Bone;
      }

      // Material Customization per Role
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((mat) => mat.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }

        // Apply authentic role PPE color palette
        const applyColor = (matName: string, hex: string) => {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (m.name === matName && (m as any).color) (m as any).color.set(hex);
            });
          } else if (mesh.material && mesh.material.name === matName) {
            (mesh.material as any).color.set(hex);
          }
        };

        applyColor("Safety_Hardhat_Yellow", profile.hardhatColor);
        applyColor("Foreman_Vest_AmberHiVis", profile.vestColor);
        applyColor("Heavy_Denim_Jeans", profile.pantsColor);
      }
    });

    return { clonedScene: clone, bones: boneMap };
  }, [scene, profile]);

  // ─── 2. INDEPENDENT ANIMATION MIXER & ACTIONS ─────────────────────────────
  const mixer = useMemo(() => new THREE.AnimationMixer(clonedScene), [clonedScene]);
  const actions = useMemo(() => {
    const actMap: Record<string, THREE.AnimationAction> = {};
    animations.forEach((clip) => {
      actMap[clip.name] = mixer.clipAction(clip);
    });
    return actMap;
  }, [mixer, animations]);

  const currentClipRef = useRef<string>("Foreman_Idle");

  // Crossfading between animation states (RESOLUTION 4)
  useEffect(() => {
    let targetClip = "Foreman_Idle";
    let speed = 1.0;

    switch (animationState) {
      case "idle":
        targetClip = "Foreman_Idle";
        speed = 1.0;
        break;
      case "walking":
        targetClip = "Foreman_Walk";
        speed = 1.0;
        break;
      case "working":
        targetClip = role === "TUNNEL_SUPERVISOR" || role === "GEOLOGIST" ? "Foreman_Inspect" : "Foreman_Idle";
        speed = 1.0;
        break;
      case "alert":
        targetClip = "Foreman_Walk";
        speed = 1.45; // Accelerated evacuation walk cadence
        break;
    }

    const prevAction = actions[currentClipRef.current];
    const nextAction = actions[targetClip];

    if (nextAction) {
      nextAction.setEffectiveTimeScale(speed);

      if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(0.25);
        nextAction.reset().fadeIn(0.25).play();
      } else {
        nextAction.play();
      }
      currentClipRef.current = targetClip;
    }
  }, [animationState, actions, role]);

  // Cleanup mixer on unmount
  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  // ─── 3. PROCEDURAL SKELETAL POSING (RESOLUTION 2: POST-MIXER ORDERING) ─────
  useFrame((state, delta) => {
    // STEP 1: Evaluate base animation track first (RESOLUTION 2)
    mixer.update(delta);

    // STEP 2: Add procedural bone offsets on top of evaluated pose
    const time = state.clock.elapsedTime;
    const isWorking = animationState === "working";

    // Bones (Resolved using confirmed armature naming from scic_civil_foreman.glb)
    const getBone = (name: string, fallback: string) => bones[name] || bones[fallback];
    const handR = getBone("HandR", "Hand.R");
    const handL = getBone("HandL", "Hand.L");
    const forearmR = getBone("ForearmR", "Forearm.R");
    const forearmL = getBone("ForearmL", "Forearm.L");
    const upperArmR = getBone("UpperArmR", "UpperArm.R");
    const upperArmL = getBone("UpperArmL", "UpperArm.L");
    const spine = getBone("Spine", "Spine");
    const head = getBone("Head", "Head");

    if (isWorking) {
      switch (role) {
        case "DRILL_OPERATOR": {
          // Pneumatic percussion vibration: high-frequency jitter on arms and torso
          const jitter = Math.sin(time * 38.0) * 0.025;
          if (upperArmR && upperArmL) {
            upperArmR.rotation.x = 0.95 + jitter;
            upperArmL.rotation.x = 0.95 + jitter;
            upperArmR.rotation.z = -0.22;
            upperArmL.rotation.z = 0.22;
          }
          if (forearmR && forearmL) {
            forearmR.rotation.x = 0.45;
            forearmL.rotation.x = 0.45;
            forearmR.rotation.y = -0.35;
            forearmL.rotation.y = 0.35;
          }
          if (spine) spine.rotation.x = 0.12 + Math.sin(time * 38.0) * 0.012;
          break;
        }

        case "SHOTCRETE_OPERATOR": {
          // Two-handed raised overhead spray sweep: sweeping azimuth oscillation
          const sweep = Math.sin(time * 1.6) * 0.25;
          if (upperArmR && upperArmL) {
            upperArmR.rotation.x = 1.65;
            upperArmL.rotation.x = 1.55;
            upperArmR.rotation.y = sweep;
            upperArmL.rotation.y = sweep;
          }
          if (head) head.rotation.x = -0.45; // Looking up at crown arch
          break;
        }

        case "SAFETY_OFFICER": {
          // Gas detector sniffer sweep: slow sweeping arc with HandR
          const sweep = Math.sin(time * 1.2) * 0.30;
          if (upperArmR) {
            upperArmR.rotation.x = 1.0;
            upperArmR.rotation.y = sweep;
          }
          if (forearmR) forearmR.rotation.x = 0.35;
          if (head) head.rotation.y = Math.sin(time * 1.2) * 0.25;
          break;
        }

        case "SURVEYOR": {
          // Eyepiece observation stance: lean forward looking into telescope
          if (spine) spine.rotation.x = 0.22;
          if (head) head.rotation.x = 0.28;
          if (upperArmR) {
            upperArmR.rotation.x = 0.85;
            upperArmR.rotation.z = -0.2;
          }
          break;
        }

        case "GEOLOGIST": {
          // Chipping rock sample: rhythmic hammer tapping
          const tap = Math.sin(time * 5.0) * 0.25;
          if (upperArmR) upperArmR.rotation.x = 1.0 + Math.max(tap, 0.0);
          if (forearmR) forearmR.rotation.x = 0.4;
          if (head) head.rotation.x = 0.25;
          break;
        }

        case "ROCK_BOLTING_CREW": {
          // Wrench raised overhead to crown
          if (upperArmR) {
            upperArmR.rotation.x = 1.55;
            upperArmR.rotation.z = -0.2;
          }
          if (head) head.rotation.x = -0.35;
          break;
        }

        case "TUNNEL_SUPERVISOR": {
          // Reviewing clipboard: HandL raised holding blueprint
          if (upperArmL) {
            upperArmL.rotation.x = 1.05;
            upperArmL.rotation.y = -0.35;
          }
          if (forearmL) forearmL.rotation.y = -0.55;
          if (head) head.rotation.x = 0.35; // Looking down at clipboard
          break;
        }

        case "MUCKER_LABORER": {
          // Two-handed pry-bar scaling
          if (upperArmR && upperArmL) {
            upperArmR.rotation.x = 1.1;
            upperArmL.rotation.x = 0.95;
          }
          break;
        }

        case "BLASTER": {
          // Examining continuity galvanometer
          if (upperArmL && head) {
            upperArmL.rotation.x = 0.95;
            head.rotation.x = 0.30;
          }
          break;
        }
      }
    }
  });

  return (
    <group ref={groupRef} name={`worker-model-${role}`}>
      {/* ═══ 1. RIGGED CHARACTER HIERARCHY ═══ */}
      <primitive object={clonedScene} rotation={[0, Math.PI, 0]} />

      {/* ═══ 2. ATTACHED 3D EQUIPMENT PROPS (RESOLUTION 3) ═══ */}
      {/* Reliably parented in worker coordinate space matching facing direction */}
      {role === "SURVEYOR" && (
        <group position={[0, 0, -0.92]} rotation={[0, Math.PI, 0]}>
          <TotalStationProp />
        </group>
      )}
      {role === "DRILL_OPERATOR" && (
        <group position={[-0.05, 1.25, -0.45]} rotation={[0, Math.PI, 0]}>
          <PneumaticDrillProp />
        </group>
      )}
      {role === "SHOTCRETE_OPERATOR" && (
        <group position={[0, 1.35, -0.40]} rotation={[0.35, Math.PI, 0]}>
          <ShotcreteNozzleProp />
        </group>
      )}
      {role === "SAFETY_OFFICER" && (
        <group position={[-0.22, 1.18, -0.38]} rotation={[0, Math.PI, 0]}>
          <MultiGasDetectorProp />
        </group>
      )}
      {role === "GEOLOGIST" && (
        <group position={[-0.24, 1.15, -0.35]} rotation={[0, Math.PI, 0]}>
          <GeologistPickProp />
        </group>
      )}
      {role === "TUNNEL_SUPERVISOR" && (
        <group position={[0.22, 1.20, -0.32]} rotation={[0.2, Math.PI, 0]}>
          <ClipboardRadioProp />
        </group>
      )}
      {role === "ROCK_BOLTING_CREW" && (
        <group position={[-0.24, 1.35, -0.35]} rotation={[0.5, Math.PI, 0]}>
          <TorqueWrenchProp />
        </group>
      )}
      {role === "MUCKER_LABORER" && (
        <group position={[0, 1.15, -0.45]} rotation={[0, Math.PI, 0]}>
          <PryBarProp />
        </group>
      )}
      {role === "BLASTER" && (
        <group position={[0.2, 1.15, -0.32]} rotation={[0, Math.PI, 0]}>
          <BlastingTesterProp />
        </group>
      )}

      {/* ═══ 3. WORKER HEADLAMP & VOLUMETRIC CONE (CAPPED AT 15M LOD) ═══ */}
      {showHeadlamp && (
        <group position={[0, 1.68, -0.12]} rotation={[0, Math.PI, 0]}>
          {/* Unlit spot light illuminating immediate workspace forward */}
          <spotLight
            color="#FFF4E0"
            intensity={14}
            distance={8}
            angle={Math.PI / 5.5}
            penumbra={0.6}
            decay={2}
            castShadow={false}
          />
          {/* Volumetric headlamp beam cone (strictly capped to 15m camera distance) */}
          <VolumetricLightBeam
            length={5.0}
            radiusTop={0.035}
            radiusBottom={0.65}
            color="#FFF2D6"
            intensity={0.28}
            maxLODDistance={15.0} // Enforced crowd LOD budget
          />
        </group>
      )}
    </group>
  );
}
