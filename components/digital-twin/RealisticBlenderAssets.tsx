"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";

/**
 * RealisticBlenderAssets.tsx
 *
 * High-Fidelity 3D PBR Modules & Props Generated via Headless Blender 5.2 LTS
 * for Project Nexus (Tumauini HEPP Digital Twin).
 *
 * 100% Free Open-Source Asset Pipeline:
 *  - Custom PBR Materials (Metallic/Roughness/Specular/Sheen/Transmission)
 *  - MeshOptimizer & Draco compression for fast WebGL loading and high 60 FPS performance
 */

export interface BlenderModelProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

// ─── 1. COMMERCIAL CARINDERIA FOOD WARMING STATION ──────────────────────────
export function CanteenWarmingStationModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/props/canteen_warming_station.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 2. COMMERCIAL 5-GALLON WATER DISPENSER ─────────────────────────────────
export function CanteenWaterDispenserModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/props/canteen_water_dispenser.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 3. HEAVY-DUTY CANTEEN DINING TABLE & BENCH SET ─────────────────────────
export function CanteenDiningTableSetModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/props/canteen_dining_table_set.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 4. CORRUGATED GALVANIZED IRON (CGI) ROOF MODULE ────────────────────────
export function CorrugatedMetalRoofModule(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/corrugated_metal_roof.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 5. INDUSTRIAL HVAC VENTILATION LOUVER ──────────────────────────────────
export function IndustrialHvacLouverModule(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/industrial_hvac_louver.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 6. PHILIPPINE CARABAO (KALABAW) 3D MODEL ──────────────────────────────
export function PhilippineCarabaoModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/wildlife/philippine_carabao.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 7. PHILIPPINE EAGLE (HARING IBON) 3D MODEL ─────────────────────────────
export function PhilippineEagleModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/wildlife/philippine_eagle.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 8. PHILIPPINE WILD BOAR (BABOY RAMO) 3D MODEL ──────────────────────────
export function PhilippineWildBoarModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/wildlife/philippine_wild_boar.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 9. 2-STORY MODULAR WORKER BARRACKS DORMITORY BLOCK ─────────────────────
export function BarracksDormitoryBlockModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/barracks_dormitory_block.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 10. 3D CORRUGATED GABLE ROOF WITH GUTTERS & DOWNPIPES ──────────────────
export function BarracksCorrugatedRoofModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/barracks_corrugated_gable_roof.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 11. FOREMAN & SENIOR STAFF HOUSE MODEL ─────────────────────────────────
export function ForemanStaffHouseModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/foreman_staff_house.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 12. CANTEEN DINING PAVILION INDUSTRIAL TRUSS STRUCTURE ─────────────────
export function CanteenPavilionStructureModel(props: BlenderModelProps) {
  const { scene } = useGLTF("/models/architecture/canteen_pavilion_structure.glb");
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <group {...props}>
      <primitive object={clone} />
    </group>
  );
}

// ─── 13. REALISTIC SCIC CIVIL WORKS FOREMAN 3D RIGGED CHARACTER ─────────────
export interface SCICForemanModelProps extends BlenderModelProps {
  currentAction?: "Foreman_Walk" | "Foreman_Idle" | "Foreman_Inspect" | "Foreman_Wave";
}

export function RealisticSCICCivilForemanModel({
  currentAction = "Foreman_Walk",
  ...props
}: SCICForemanModelProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/characters/scic_civil_foreman.glb");
  const { actions } = useAnimations(animations, groupRef);

  React.useEffect(() => {
    if (actions && actions[currentAction]) {
      actions[currentAction]?.reset().fadeIn(0.25).play();
      return () => {
        actions[currentAction]?.fadeOut(0.25);
      };
    }
  }, [actions, currentAction]);

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

// ─── PRELOAD ALL GLB ASSETS FOR INSTANT SMOOTH RENDERING ─────────────────────
useGLTF.preload("/models/characters/scic_civil_foreman.glb");
useGLTF.preload("/models/props/canteen_warming_station.glb");
useGLTF.preload("/models/props/canteen_water_dispenser.glb");
useGLTF.preload("/models/props/canteen_dining_table_set.glb");
useGLTF.preload("/models/architecture/corrugated_metal_roof.glb");
useGLTF.preload("/models/architecture/industrial_hvac_louver.glb");
useGLTF.preload("/models/architecture/barracks_dormitory_block.glb");
useGLTF.preload("/models/architecture/barracks_corrugated_gable_roof.glb");
useGLTF.preload("/models/architecture/foreman_staff_house.glb");
useGLTF.preload("/models/architecture/canteen_pavilion_structure.glb");
useGLTF.preload("/models/wildlife/philippine_carabao.glb");
useGLTF.preload("/models/wildlife/philippine_eagle.glb");
useGLTF.preload("/models/wildlife/philippine_wild_boar.glb");

