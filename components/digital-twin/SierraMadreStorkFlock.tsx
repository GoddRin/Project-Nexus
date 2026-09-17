import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

// Preload the Three.js Stork GLB
useGLTF.preload("/models/wildlife/stork.glb");

interface StorkBirdProps {
  id: string;
  center: [number, number]; // [X, Z] orbit center over the river canyon
  radiusX: number;
  radiusZ: number;
  baseAltitude: number;
  speed: number;
  phaseOffset: number;
  scale: number;
  thermalDraftSpeed?: number;
}

function StorkBird({
  id,
  center,
  radiusX,
  radiusZ,
  baseAltitude,
  speed,
  phaseOffset,
  scale,
  thermalDraftSpeed = 0.35,
}: StorkBirdProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/wildlife/stork.glb");

  // Deep clone mesh & isolated morph target influences for this instance
  const { clonedScene, mixer, flyAction } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        // Optimize material for bright mountain sunlight
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
          mat.roughness = 0.65;
          mat.metalness = 0.05;
          mesh.material = mat;
        }
      }
    });

    const m = new THREE.AnimationMixer(clone);
    const clip = animations.find((a) => a.name === "storkFly_B_") || animations[0];
    const act = clip ? m.clipAction(clip) : null;
    if (act) {
      act.play();
      act.time = (phaseOffset * 10) % (clip.duration || 1);
    }

    return { clonedScene: clone, mixer: m, flyAction: act };
  }, [scene, animations, phaseOffset]);

  const progressRef = useRef<number>(phaseOffset * Math.PI * 2);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    // Advance orbital trajectory around the river gorge
    progressRef.current += speed * safeDelta;
    const angle = progressRef.current;

    // Elliptical flight trajectory
    const posX = center[0] + Math.cos(angle) * radiusX;
    const posZ = center[1] + Math.sin(angle) * radiusZ;

    // Tangent derivative for forward flight heading
    const dx = -Math.sin(angle) * radiusX;
    const dz = Math.cos(angle) * radiusZ;
    const headingYaw = Math.atan2(dx, dz) + Math.PI;

    // Thermal updraft altitude oscillation (rising on warm air off canyon cliffs)
    const thermalLift = Math.sin(t * thermalDraftSpeed + phaseOffset * 3.0) * 5.5;
    const microTurbulence = Math.sin(t * 1.8 + phaseOffset) * 0.6;
    const posY = baseAltitude + thermalLift + microTurbulence;

    groupRef.current.position.set(posX, posY, posZ);

    // Aerodynamic banking: roll into turns + pitch slightly according to thermal ascent/descent
    const turnCurvature = Math.cos(angle);
    const bankRoll = -0.28 - 0.12 * turnCurvature; // inward bank
    const climbPitch = Math.cos(t * thermalDraftSpeed + phaseOffset * 3.0) * 0.08;

    groupRef.current.rotation.set(climbPitch, headingYaw, bankRoll, "YXZ");

    // Dynamic wing flap vs majestic thermal glide cycles:
    // Flaps for ~40% of the time, then glides with wide outstretched wings for ~60%
    const flapCyclePeriod = 7.0; // 7-second thermal cycle
    const cyclePhase = (t + phaseOffset * 5.0) % flapCyclePeriod;
    const isFlappingPhase = cyclePhase < 2.8;

    if (flyAction) {
      if (isFlappingPhase) {
        // Active flapping climb
        mixer.update(safeDelta * 1.15);
      } else {
        // Slow soaring glide with gentle wing tilt
        mixer.update(safeDelta * 0.18);
      }
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Sierra Madre River Storks & Soaring Raptors Flock
 * Soaring above the Pinacanauan River canyon between the Tumauini Powerhouse and Intake Ridge
 */
export function SierraMadreStorkFlock() {
  // Center of Pinacanauan River gorge canyon
  const CANYON_CENTER: [number, number] = [8, 18];

  const flockMembers = useMemo(
    () => [
      {
        id: "stork-lead-alpha",
        center: CANYON_CENTER,
        radiusX: 46,
        radiusZ: 38,
        baseAltitude: 76,
        speed: 0.14,
        phaseOffset: 0.0,
        scale: 0.028, // ~5.5m wingspan for majestic visibility against vast mountain range
        thermalDraftSpeed: 0.32,
      },
      {
        id: "stork-wing-bravo",
        center: [CANYON_CENTER[0] + 4, CANYON_CENTER[1] - 3] as [number, number],
        radiusX: 52,
        radiusZ: 42,
        baseAltitude: 82,
        speed: 0.135,
        phaseOffset: 0.28,
        scale: 0.025,
        thermalDraftSpeed: 0.28,
      },
      {
        id: "stork-trailer-charlie",
        center: [CANYON_CENTER[0] - 5, CANYON_CENTER[1] + 4] as [number, number],
        radiusX: 42,
        radiusZ: 34,
        baseAltitude: 71,
        speed: 0.145,
        phaseOffset: 0.62,
        scale: 0.024,
        thermalDraftSpeed: 0.36,
      },
    ],
    []
  );

  return (
    <group name="sierra-madre-stork-flock">
      {flockMembers.map((bird) => (
        <StorkBird key={bird.id} {...bird} />
      ))}
    </group>
  );
}
