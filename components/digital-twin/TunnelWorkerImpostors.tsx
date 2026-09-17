/**
 * TunnelWorkerImpostors.tsx
 *
 * GPU-Instanced Billboard Impostors for Headrace Tunnel Personnel (LOD 1 > 18m).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL CONTRACT:
 * ═══════════════════════════════════════════════════════════════════════════
 * Rather than rendering individual SkinnedMeshes or 1 draw-call-per-instance
 * at distances > 18m, all distant workers are batched into 4 GPU InstancedMeshes
 * grouped strictly by helmet-color silhouette:
 *  1. YELLOW: Drill Operator, Mucker, Rock Bolting Crew, Shotcrete Operator
 *  2. WHITE:  Tunnel Supervisor, Surveyor, Geologist
 *  3. GREEN:  Safety Officer
 *  4. RED:    Licensed Blaster
 *
 * Result: Maximum 4 GPU draw calls for the entire distant crowd (whether 14,
 * 24, or 50 workers), with zero skeletal CPU updates or skinning passes.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TunnelWorkerInstance, TunnelWorkerRole } from "./TunnelWorkerTypes";

export interface TunnelWorkerImpostorsProps {
  workers: TunnelWorkerInstance[];
  lodCutoff?: number; // Default 18m
}

type HelmetCategory = "YELLOW" | "WHITE" | "GREEN" | "RED";

function getHelmetCategory(role: TunnelWorkerRole): HelmetCategory {
  switch (role) {
    case "SAFETY_OFFICER":
      return "GREEN";
    case "BLASTER":
      return "RED";
    case "TUNNEL_SUPERVISOR":
    case "SURVEYOR":
    case "GEOLOGIST":
      return "WHITE";
    case "DRILL_OPERATOR":
    case "MUCKER_LABORER":
    case "ROCK_BOLTING_CREW":
    case "SHOTCRETE_OPERATOR":
    default:
      return "YELLOW";
  }
}

// ─── SINGLETON PROCEDURAL BILLBOARD TEXTURE GENERATOR ────────────────────────
const billboardTextureCache: Partial<Record<HelmetCategory, THREE.CanvasTexture>> = {};

function getBillboardTexture(category: HelmetCategory): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture(null as any);
  }

  if (billboardTextureCache[category]) {
    return billboardTextureCache[category]!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);

    let hardhatColor = "#EAB308";
    let vestColor = "#F97316";
    let pantsColor = "#334155";

    switch (category) {
      case "WHITE":
        hardhatColor = "#FFFFFF";
        vestColor = "#0F766E";
        pantsColor = "#1E293B";
        break;
      case "GREEN":
        hardhatColor = "#16A34A";
        vestColor = "#84CC16";
        pantsColor = "#1E293B";
        break;
      case "RED":
        hardhatColor = "#DC2626";
        vestColor = "#EA580C";
        pantsColor = "#334155";
        break;
      case "YELLOW":
      default:
        hardhatColor = "#EAB308";
        vestColor = "#F97316";
        pantsColor = "#27303F";
        break;
    }

    // Boots (bottom)
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(40, 230, 20, 24);
    ctx.fillRect(68, 230, 20, 24);

    // Trousers / Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(42, 140, 18, 92);
    ctx.fillRect(68, 140, 18, 92);

    // Hi-Vis Vest & Torso
    ctx.fillStyle = vestColor;
    ctx.beginPath();
    ctx.roundRect(36, 68, 56, 74, [6, 6, 0, 0]);
    ctx.fill();

    // 3M Reflective Silver Tape on Vest
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(36, 92, 56, 8);  // Horizontal chest band
    ctx.fillRect(36, 118, 56, 8); // Horizontal waist band
    ctx.fillRect(46, 68, 8, 50);  // Left vertical harness
    ctx.fillRect(74, 68, 8, 50);  // Right vertical harness

    // Arms
    ctx.fillStyle = vestColor;
    ctx.fillRect(26, 72, 12, 60);
    ctx.fillRect(90, 72, 12, 60);

    // Head / Face
    ctx.fillStyle = "#C28E64";
    ctx.beginPath();
    ctx.arc(64, 48, 16, 0, Math.PI * 2);
    ctx.fill();

    // Hardhat Dome
    ctx.fillStyle = hardhatColor;
    ctx.beginPath();
    ctx.arc(64, 38, 20, Math.PI, 0, false);
    ctx.fill();

    // Hardhat Brim
    ctx.fillRect(40, 38, 48, 6);

    // Headlamp Glow Dot
    ctx.fillStyle = "#FFFBEB";
    ctx.beginPath();
    ctx.arc(64, 36, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  billboardTextureCache[category] = tex;
  return tex;
}

const dummy = new THREE.Object3D();
const MAX_INSTANCES_PER_GROUP = 32;

export function TunnelWorkerImpostors({
  workers,
  lodCutoff = 18.0,
}: TunnelWorkerImpostorsProps) {
  const { camera } = useThree();

  const yellowMeshRef = useRef<THREE.InstancedMesh>(null);
  const whiteMeshRef = useRef<THREE.InstancedMesh>(null);
  const greenMeshRef = useRef<THREE.InstancedMesh>(null);
  const redMeshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const localCam = useRef(new THREE.Vector3());

  // Shared billboard geometry anchored at feet
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.78, 1.85);
    geo.translate(0, 0.925, 0); // Anchor Y=0 at feet
    return geo;
  }, []);

  // 4 Materials corresponding to the 4 hardhat categories
  const materials = useMemo(() => {
    const createMat = (cat: HelmetCategory) =>
      new THREE.MeshBasicMaterial({
        map: getBillboardTexture(cat),
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        depthWrite: true,
      });

    return {
      YELLOW: createMat("YELLOW"),
      WHITE: createMat("WHITE"),
      GREEN: createMat("GREEN"),
      RED: createMat("RED"),
    };
  }, []);

  useFrame(() => {
    const counts: Record<HelmetCategory, number> = {
      YELLOW: 0,
      WHITE: 0,
      GREEN: 0,
      RED: 0,
    };

    const meshRefs: Record<HelmetCategory, React.RefObject<THREE.InstancedMesh | null>> = {
      YELLOW: yellowMeshRef,
      WHITE: whiteMeshRef,
      GREEN: greenMeshRef,
      RED: redMeshRef,
    };

    if (groupRef.current) {
      localCam.current.copy(camera.position);
      groupRef.current.worldToLocal(localCam.current);
    } else {
      localCam.current.copy(camera.position);
    }

    workers.forEach((worker) => {
      const [wx, wy, wz] = worker.position;
      const dist = localCam.current.distanceTo(new THREE.Vector3(wx, wy, wz));

      // ONLY workers beyond LOD cutoff (> 18m) are drawn by GPU-instanced impostors
      if (dist > lodCutoff) {
        const cat = getHelmetCategory(worker.role);
        const currentCount = counts[cat];
        const mesh = meshRefs[cat].current;

        if (mesh && currentCount < MAX_INSTANCES_PER_GROUP) {
          // Cylindrical Y-billboard facing camera in local coordinate space
          const angle = Math.atan2(localCam.current.x - wx, localCam.current.z - wz);

          dummy.position.set(wx, wy, wz);
          dummy.rotation.set(0, angle, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          mesh.setMatrixAt(currentCount, dummy.matrix);
          counts[cat]++;
        }
      }
    });

    // Update active draw counts and notify GPU
    (Object.keys(counts) as HelmetCategory[]).forEach((cat) => {
      const mesh = meshRefs[cat].current;
      if (mesh) {
        mesh.count = counts[cat];
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  });

  return (
    <group ref={groupRef} name="tunnel-worker-impostors-gpu">
      <instancedMesh
        ref={yellowMeshRef}
        args={[geometry, materials.YELLOW, MAX_INSTANCES_PER_GROUP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={whiteMeshRef}
        args={[geometry, materials.WHITE, MAX_INSTANCES_PER_GROUP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={greenMeshRef}
        args={[geometry, materials.GREEN, MAX_INSTANCES_PER_GROUP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={redMeshRef}
        args={[geometry, materials.RED, MAX_INSTANCES_PER_GROUP]}
        frustumCulled={false}
      />
    </group>
  );
}
