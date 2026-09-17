/**
 * TunnelWorker.tsx
 *
 * Self-Contained Worker Presentation Component with <Detailed> LOD & Spatial Audio.
 * Grounded in docs/tunnel-scene-brief.md & real Philippine hydro drill-and-blast operations.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL CONTRACTS:
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. PURE PRESENTATION SIGNATURE:
 *    Takes `{ id, role, animationState, position, rotation, onClick }`.
 *    Zero internal data fetching; wired by parent container / Supabase in Phase 5.
 *
 * 2. <Detailed> LOD DISTANCE CUTOFF (18m):
 *    - LOD 0 (0m - 18m): Full skinned rigged GLTF model + animated skeleton +
 *      role props + dynamic headlamp volumetric cone.
 *    - LOD 1 (> 18m): Lightweight low-poly silhouette matching helmet/vest colors,
 *      bypassing CPU/GPU skeletal matrix evaluations for crowds of 20-50 workers.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { Detailed } from "@react-three/drei";
import {
  TunnelWorkerRole,
  WorkerAnimationState,
  ROLE_PROFILES,
} from "./TunnelWorkerTypes";
import { TunnelWorkerModel } from "./TunnelWorkerModel";
import { TunnelPositionalAudio } from "./TunnelPositionalAudio";

export interface TunnelWorkerProps {
  id: string;
  name?: string;
  role: TunnelWorkerRole;
  animationState?: WorkerAnimationState;
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick?: (id: string) => void;
  showHeadlamp?: boolean;
  isNearby?: boolean; // When false (>18m), rendered via TunnelWorkerImpostors GPU instance
}

export function TunnelWorker({
  id,
  name,
  role,
  animationState = "working",
  position,
  rotation = [0, 0, 0],
  onClick,
  showHeadlamp = true,
  isNearby = true,
}: TunnelWorkerProps) {
  const groupRef = useRef<THREE.Group>(null);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick) onClick(id);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      name={`tunnel-worker-${id}`}
    >
      {/* ═══ 1. INVISIBLE INTERACTION CLICK COLLIDER (Always Active) ═══ */}
      <mesh visible={false} position={[0, 0.95, 0]} onClick={handleClick}>
        <boxGeometry args={[0.75, 1.9, 0.75]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* ═══ 2. LOD 0: FULL SKINNED MODEL & PROCEDURAL BONE POSING (0m-18m) ═══ */}
      {isNearby && (
        <>
          <TunnelWorkerModel
            role={role}
            animationState={animationState}
            showHeadlamp={showHeadlamp}
          />

          {/* Procedural 3D Positional Audio (Budget Capped at 6 nearest voices) */}
          <TunnelPositionalAudio
            role={role}
            animationState={animationState}
            position={[0, 1.2, 0]}
          />
        </>
      )}
    </group>
  );
}
