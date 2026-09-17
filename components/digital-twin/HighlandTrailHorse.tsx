import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { getSiteSurfaceY } from "./uphillRoadConfig";

useGLTF.preload("/models/wildlife/horse.glb");

export function HighlandTrailHorse() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/wildlife/horse.glb");
  const { camera } = useThree();

  const { clonedScene, mixer, runAction } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
          mat.roughness = 0.75;
          mat.metalness = 0.02;
          mesh.material = mat;
        }
      }
    });

    const m = new THREE.AnimationMixer(clone);
    const clip = animations.find((a) => a.name === "horse_A_") || animations[0];
    const act = clip ? m.clipAction(clip) : null;
    if (act) {
      act.play();
    }

    return { clonedScene: clone, mixer: m, runAction: act };
  }, [scene, animations]);

  // Trail path along the open scenic mountain switchback trail overlooking the penstock and river gorge
  const progressRef = useRef<number>(0);
  const TRAIL_CENTER = useMemo(() => new THREE.Vector2(-14, -22), []);
  const RADIUS_X = 15;
  const RADIUS_Z = 9;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta, 0.05);

    // Distance culling check
    const distSq = camera.position.distanceToSquared(groupRef.current.position);
    if (distSq > 220 * 220) return;

    // Advance along the mountain trail loop
    progressRef.current += safeDelta * 0.22;
    const angle = progressRef.current;

    const posX = TRAIL_CENTER.x + Math.sin(angle) * RADIUS_X;
    const posZ = TRAIL_CENTER.y + Math.cos(angle) * RADIUS_Z;
    const groundY = getSiteSurfaceY(posX, posZ);

    const dx = Math.cos(angle) * RADIUS_X;
    const dz = -Math.sin(angle) * RADIUS_Z;
    const headingYaw = Math.atan2(dx, dz);

    groupRef.current.position.set(posX, groundY, posZ);
    groupRef.current.rotation.set(0, headingYaw, 0);

    // Update morph target run animation
    if (runAction) {
      mixer.update(safeDelta * 0.95); // relaxed mountain trot
    }
  });

  return (
    <group ref={groupRef} name="highland-trail-horse">
      <primitive object={clonedScene} scale={[0.012, 0.012, 0.012]} />
    </group>
  );
}
