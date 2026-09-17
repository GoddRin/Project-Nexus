import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { getSiteSurfaceY } from "./uphillRoadConfig";

// Preload the Three.js Soldier GLB
useGLTF.preload("/models/characters/security_patrol.glb");

interface Waypoint {
  pos: [number, number]; // [X, Z]
  pauseDuration: number; // seconds to pause and inspect
  inspectionYaw?: number; // direction to face during inspection
}

// 4-Point Perimeter Patrol around Temfacil & Switchyard Perimeter
const PATROL_WAYPOINTS: Waypoint[] = [
  {
    pos: [94.5, -67.0], // Temfacil Guardhouse Entrance Gate
    pauseDuration: 5.0,
    inspectionYaw: -Math.PI / 4, // Facing entrance barrier
  },
  {
    pos: [83.0, -56.0], // Security Fence Corner & Transformer Access Road
    pauseDuration: 4.0,
    inspectionYaw: -Math.PI / 2, // Scanning switchyard fence
  },
  {
    pos: [69.0, -42.0], // High-Voltage Switchyard Perimeter Lookout
    pauseDuration: 6.0,
    inspectionYaw: -Math.PI * 0.75, // Facing main step-up transformers
  },
  {
    pos: [79.0, -51.0], // Security Walkway Return Post
    pauseDuration: 3.5,
    inspectionYaw: 0, // Scanning uphill access
  },
];

export function PerimeterSecurityPatrol({
  onSelectGuard,
}: {
  onSelectGuard?: (info: { id: string; name: string; status: string }) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/characters/security_patrol.glb");
  const { camera } = useThree();

  // 1. Deep clone skeletal skinned mesh and materials
  const { clonedScene, mixer, actions } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((m) => m.clone());
          } else {
            mesh.material = mesh.material.clone();
          }
        }
      }
    });

    const m = new THREE.AnimationMixer(clone);
    const actMap: Record<string, THREE.AnimationAction> = {};
    animations.forEach((clip) => {
      actMap[clip.name] = m.clipAction(clip);
    });

    return { clonedScene: clone, mixer: m, actions: actMap };
  }, [scene, animations]);

  // Patrol State Machine
  const waypointIdxRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const pauseTimerRef = useRef<number>(0);
  const currentPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      PATROL_WAYPOINTS[0].pos[0],
      getSiteSurfaceY(PATROL_WAYPOINTS[0].pos[0], PATROL_WAYPOINTS[0].pos[1]),
      PATROL_WAYPOINTS[0].pos[1]
    )
  );
  const currentHeadingRef = useRef<number>(0);
  const currentActionRef = useRef<string>("Idle");

  // Initial animation action setup
  useEffect(() => {
    if (actions["Idle"]) {
      actions["Idle"].play();
      currentActionRef.current = "Idle";
    }
    return () => {
      Object.values(actions).forEach((act) => act.stop());
    };
  }, [actions]);

  // Smooth Action Cross-Fader
  const fadeToAction = (name: string, duration = 0.35) => {
    if (currentActionRef.current === name) return;
    const prevAction = actions[currentActionRef.current];
    const nextAction = actions[name];
    if (nextAction) {
      nextAction.reset();
      nextAction.fadeIn(duration).play();
      if (prevAction) {
        prevAction.fadeOut(duration);
      }
      currentActionRef.current = name;
    }
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta, 0.05);

    // Distance culling check
    const camDistSq = camera.position.distanceToSquared(currentPosRef.current);
    if (camDistSq > 200 * 200) {
      // Beyond 200m, pause skeletal animation updates to maintain 60 FPS
      return;
    }

    mixer.update(safeDelta);

    const targetWp = PATROL_WAYPOINTS[waypointIdxRef.current];
    const targetX = targetWp.pos[0];
    const targetZ = targetWp.pos[1];

    if (isPausedRef.current) {
      // Officer is in IDLE inspection stance
      pauseTimerRef.current -= safeDelta;

      // Subtle inspection head/body scan during idle
      if (targetWp.inspectionYaw !== undefined) {
        const scanOffset = Math.sin(pauseTimerRef.current * 1.5) * 0.22;
        const targetRot = targetWp.inspectionYaw + scanOffset;
        currentHeadingRef.current = THREE.MathUtils.lerp(
          currentHeadingRef.current,
          targetRot,
          safeDelta * 3.0
        );
      }

      if (pauseTimerRef.current <= 0) {
        // Resume walking to next waypoint
        isPausedRef.current = false;
        waypointIdxRef.current = (waypointIdxRef.current + 1) % PATROL_WAYPOINTS.length;
        fadeToAction("Walk", 0.4);
      }
    } else {
      // Officer is WALKING towards target waypoint
      const dx = targetX - currentPosRef.current.x;
      const dz = targetZ - currentPosRef.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.35) {
        // Arrived at checkpoint
        isPausedRef.current = true;
        pauseTimerRef.current = targetWp.pauseDuration;
        fadeToAction("Idle", 0.45);
      } else {
        // Walk forward
        const walkSpeed = 1.35; // realistic walking speed ~1.35 m/s (~4.8 km/h)
        const moveStep = Math.min(walkSpeed * safeDelta, dist);
        const dirX = dx / dist;
        const dirZ = dz / dist;

        currentPosRef.current.x += dirX * moveStep;
        currentPosRef.current.z += dirZ * moveStep;
        currentPosRef.current.y = getSiteSurfaceY(
          currentPosRef.current.x,
          currentPosRef.current.z
        );

        // Turn towards path direction
        const targetYaw = Math.atan2(dirX, dirZ);
        // Normalize angle difference for shortest rotation arc
        let diff = targetYaw - currentHeadingRef.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        currentHeadingRef.current += diff * Math.min(safeDelta * 6.0, 1.0);
      }
    }

    // Apply synchronized position & rotation to 3D group
    groupRef.current.position.copy(currentPosRef.current);
    groupRef.current.rotation.set(0, currentHeadingRef.current, 0);
  });

  return (
    <group
      ref={groupRef}
      name="scic-perimeter-security-patrol"
      onClick={(e) => {
        e.stopPropagation();
        onSelectGuard?.({
          id: "guard-patrol-01",
          name: "SCIC Security Patrol - Shift Alpha",
          status: isPausedRef.current ? "Inspecting Perimeter Fence" : "Active Roving Patrol",
        });
      }}
    >
      {/* 
        Soldier.glb native height is 183.18 units in Z-up armature coordinate space.
        Scale 0.010 brings it to exact 1.83m real-world human scale.
      */}
      <primitive
        object={clonedScene}
        scale={[0.010, 0.010, 0.010]}
      />
    </group>
  );
}
