/**
 * VolumetricLightBeam.tsx
 *
 * Lightweight procedural volumetric light cone shader for Project Nexus Headrace Tunnel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL LOD BUDGET & CROWD PERFORMANCE CONTRACT:
 * ═══════════════════════════════════════════════════════════════════════════
 * This component is designed for dual reuse:
 *  1. Face Floodlights (1-2 active shafts at the heading face).
 *  2. Worker Headlamps in Phase 4 (where 30-50 visible crew members may exist).
 *
 * STRICT PERFORMANCE RULE:
 * True volumetric cone geometry MUST NOT be rendered for all 30-50 workers.
 * In Phase 4, only workers within a configurable distance of the active camera
 * (LOD cutoff: `maxLODDistance = 15.0m`) or workers actively stationed at the
 * heading face (Zone 1/2) may render an active `<VolumetricLightBeam />`.
 * Distant workers MUST use a simple unlit spot decal or no beam geometry.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export interface VolumetricLightBeamProps {
  /**
   * Length of the light beam cone in meters. Default: 8.5m
   */
  length?: number;

  /**
   * Radius at apex / lens face. Default: 0.14m
   */
  radiusTop?: number;

  /**
   * Radius at cone base / target face. Default: 1.6m
   */
  radiusBottom?: number;

  /**
   * Base beam color. Default: "#FFF2D6" (Warm daylight 5000K floodlight)
   */
  color?: string | THREE.Color;

  /**
   * Beam opacity / visual density. Default: 0.42
   */
  intensity?: number;

  /**
   * Shimmer / dust noise animation speed. Default: 1.0
   */
  shimmerSpeed?: number;

  /**
   * Maximum distance from camera beyond which volumetric cone is culled (LOD).
   * Default: 40.0m for floodlights, 15.0m for worker headlamps.
   */
  maxLODDistance?: number;

  /**
   * Transform props
   */
  position?: [number, number, number];
  rotation?: [number, number, number];
  targetPosition?: [number, number, number];
}

const VolumetricShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vec4 mvPosition = viewMatrix * worldPos;
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;
    uniform float uLength;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      // Longitudinal falloff along cone axis (vUv.y: 0.0 at top/lens -> 1.0 at base/face)
      float zProgress = vUv.y;
      float longitudinalFalloff = pow(1.0 - zProgress, 1.4);

      // Fresnel edge softening: soft rim falloff so cylinder borders are gradual, not hard edges
      vec3 V = normalize(vViewPosition);
      vec3 N = normalize(vNormal);
      float fresnel = clamp(dot(V, N), 0.0, 1.0);
      float edgeSoftness = pow(fresnel, 1.8);

      // Micro-particulate atmospheric dust shimmer (simulates dancing dust in beam)
      float dustNoise = sin(vWorldPosition.x * 6.0 + uTime * 1.5) *
                        sin(vWorldPosition.y * 7.0 - uTime * 1.8) *
                        sin(vWorldPosition.z * 5.0 + uTime * 1.2);
      float dustFlicker = 0.88 + 0.12 * dustNoise;

      float alpha = uIntensity * longitudinalFalloff * edgeSoftness * dustFlicker;

      gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
    }
  `,
};

export function VolumetricLightBeam({
  length = 8.5,
  radiusTop = 0.14,
  radiusBottom = 1.6,
  color = "#FFF2D6",
  intensity = 0.42,
  shimmerSpeed = 1.0,
  maxLODDistance = 40.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  targetPosition,
}: VolumetricLightBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const beamColor = useMemo(() => {
    return color instanceof THREE.Color ? color : new THREE.Color(color);
  }, [color]);

  // Cylinder tapered to cone. In Three.js, cylinder height is along Y.
  // Center cylinder so top/lens is at Y = 0 and base is at Y = -length.
  const coneGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      length,
      24,
      1,
      true // open-ended so endcaps don't show hard circles
    );
    geo.translate(0, -length / 2, 0); // Origin at top lens face
    return geo;
  }, [length, radiusTop, radiusBottom]);

  const uniforms = useMemo(() => {
    return {
      uColor: { value: beamColor },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
      uLength: { value: length },
    };
  }, [beamColor, intensity, length]);

  useFrame((state, delta) => {
    if (!matRef.current || !meshRef.current) return;

    // Check camera distance for LOD budget culling
    const meshWorldPos = meshRef.current.getWorldPosition(new THREE.Vector3());
    const distToCam = camera.position.distanceTo(meshWorldPos);

    if (distToCam > maxLODDistance) {
      meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;

    // Fade out smoothly near max LOD distance
    const lodFade = THREE.MathUtils.clamp(1.0 - (distToCam - (maxLODDistance - 8.0)) / 8.0, 0.0, 1.0);

    matRef.current.uniforms.uTime.value += delta * shimmerSpeed;
    matRef.current.uniforms.uIntensity.value = intensity * lodFade;

    // If targetPosition is supplied, aim the beam towards target
    if (targetPosition) {
      const targetVec = new THREE.Vector3(...targetPosition);
      const originVec = new THREE.Vector3(...position);
      const dir = targetVec.clone().sub(originVec).normalize();

      // Cylinder default points along -Y (since origin at top, extending to -Y).
      // Align -Y with dir.
      const down = new THREE.Vector3(0, -1, 0);
      meshRef.current.quaternion.setFromUnitVectors(down, dir);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={coneGeometry}
      position={position}
      rotation={targetPosition ? undefined : rotation}
      renderOrder={10} // Render after opaque geometry for clean additive blending
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={VolumetricShader.vertexShader}
        fragmentShader={VolumetricShader.fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
