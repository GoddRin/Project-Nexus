/**
 * TunnelWaterSeepage.tsx
 *
 * Authentic Mountain Hydro Seepage, Crown Drip Emitters, and Invert Puddle Decals.
 * Grounded in docs/tunnel-scene-brief.md & real Philippine rainy season fissure percolation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL DESIGN CONTRACT (RESOLVED REFLECTION METHODOLOGY):
 * ═══════════════════════════════════════════════════════════════════════════
 * PUDDLE REFLECTION ARCHITECTURE:
 * Invert puddle reflections use a FAKED procedural reflection approach:
 *  - Screen-space Fresnel reflection + specular normal perturbation.
 *  - Distorted sample of atmospheric ambient gradient and overhead string-light
 *    specular highlights driven by dynamic concentric ripple normal waves.
 *
 * THIS IS EXPLICITLY NOT A REAL PLANAR-REFLECTION RENDER PASS.
 * A secondary reflection camera pass would duplicate scene draw calls and
 * destroy the 60 FPS mobile/desktop digital-twin performance budget.
 * DO NOT replace this with a secondary render pass.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export interface TunnelWaterSeepageProps {
  /**
   * Tunnel alignment spline.
   */
  spline: THREE.Curve<THREE.Vector3>;

  /**
   * Tunnel radius in meters. Default: 2.5m.
   */
  radius?: number;

  /**
   * Seepage factor: 0.0 (dry rock) to 1.0 (heavy storm/monsoon saturation).
   * Default: 0.28. Scales drip frequency, puddle area, and wet gloss.
   */
  seepageFactor?: number;

  /**
   * Whether to render crown drip emitters. Default: true.
   */
  showDrips?: boolean;

  /**
   * Whether to render invert puddles. Default: true.
   */
  showPuddles?: boolean;
}

// ─── PUDDLE SHADER (Faked Normal-Distorted Environment Reflections) ─────────
const PuddleShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSeepageFactor;
    uniform vec3 uStringLightPositions[3];
    uniform vec3 uStringLightColor;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      // 1. Edge shape mask: irregular organic puddle perimeter
      vec2 centeredUv = vUv - vec2(0.5);
      float distFromCenter = length(centeredUv * vec2(1.0, 2.5)); // Elongated along tunnel axis
      
      // Organic noise border
      float borderNoise = sin(centeredUv.x * 14.0) * cos(centeredUv.y * 18.0) * 0.08;
      float maxRadius = 0.42 * clamp(uSeepageFactor * 1.4, 0.2, 1.0) + borderNoise;
      
      if (distFromCenter > maxRadius) discard;
      float edgeAlpha = smoothstep(maxRadius, maxRadius - 0.08, distFromCenter);

      // 2. Animated Concentric Impact Ripples (from crown drip strikes)
      // Drip impact centers on UV plane
      vec2 dripCenter1 = vec2(0.48, 0.45);
      vec2 dripCenter2 = vec2(0.53, 0.72);

      float r1 = length(vUv - dripCenter1);
      float r2 = length(vUv - dripCenter2);

      // Concentric wave equations
      float wave1 = sin(r1 * 48.0 - uTime * 6.5) * exp(-r1 * 12.0);
      float wave2 = sin(r2 * 36.0 - uTime * 5.0) * exp(-r2 * 10.0);
      float totalWave = (wave1 + wave2) * clamp(uSeepageFactor * 1.5, 0.2, 1.0);

      // Perturb surface normal based on wave gradients
      vec3 normalPerturb = vec3(
        cos(r1 * 48.0 - uTime * 6.5) * (vUv.x - dripCenter1.x) * 0.4,
        1.0,
        cos(r1 * 48.0 - uTime * 6.5) * (vUv.y - dripCenter1.y) * 0.4
      );
      vec3 N = normalize(normalPerturb);

      // 3. FAKED REFLECTIONS (Atmospheric Sky + Tunnel Light Specular Gleam)
      vec3 V = normalize(cameraPosition - vWorldPosition);
      float NdotV = max(dot(N, V), 0.0);
      float fresnel = pow(1.0 - NdotV, 3.5);

      // Ambient subterranean water color (dark murky mountain drainage water)
      vec3 waterBaseColor = vec3(0.06, 0.07, 0.08);

      // Overhead faked environmental reflection (tunnel crown arch / warm light bounce)
      vec3 skyReflectColor = vec3(0.24, 0.28, 0.32);
      vec3 reflectColor = mix(waterBaseColor, skyReflectColor, fresnel * 0.75);

      // Specular glints from overhead string lights
      vec3 specularAcc = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        vec3 L = normalize(uStringLightPositions[i] - vWorldPosition);
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float spec = pow(NdotH, 64.0) * 0.9;
        specularAcc += uStringLightColor * spec;
      }

      vec3 finalColor = reflectColor + specularAcc;
      float finalAlpha = clamp(0.75 * edgeAlpha * (0.4 + uSeepageFactor * 0.6), 0.0, 0.92);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};

// Crown drip emitter count and simulation
const DRIP_COUNT = 32;

export function TunnelWaterSeepage({
  spline,
  radius = 2.5,
  seepageFactor = 0.28,
  showDrips = true,
  showPuddles = true,
}: TunnelWaterSeepageProps) {
  // ─── 1. DRIP EMITTER STATIONS (In unlined Zone 1 & 2 rock fissures) ───────
  // Crown fissures occur around v ≈ 0.70 to 0.95
  const dripStations = useMemo(() => {
    const stations: {
      crownPos: THREE.Vector3;
      invertPos: THREE.Vector3;
      v: number;
    }[] = [];

    // 5 primary fissure locations distributed across all construction zones
    const fissureVs = [0.36, 0.52, 0.72, 0.84, 0.94];

    fissureVs.forEach((v) => {
      const pt = spline.getPointAt(v);
      const tangent = spline.getTangentAt(v).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Crown drip point
      const crownPos = pt.clone().addScaledVector(right, radius * 0.25);
      crownPos.y += radius - 0.05;

      // Invert puddle location: resting safely above concrete/rock floor (y = -radius + 0.025m)
      const invertPos = pt.clone().addScaledVector(right, radius * 0.25);
      invertPos.y += -radius + 0.025;

      stations.push({ crownPos, invertPos, v });
    });

    return stations;
  }, [spline, radius]);

  // ─── 2. DRIP PARTICLES INSTANCED GEOMETRY ─────────────────────────────────
  const dripsRef = useRef<THREE.InstancedMesh>(null);
  const dripDummy = useMemo(() => new THREE.Object3D(), []);

  // Droplet physical state: station index, current fall progress [0..1], speed
  const dripStates = useMemo(() => {
    return Array.from({ length: DRIP_COUNT }, (_, i) => ({
      stationIdx: i % dripStations.length,
      progress: Math.random(), // 0.0 (crown) -> 1.0 (invert)
      speed: 0.55 + Math.random() * 0.45,
      delay: Math.random() * 2.0,
      active: true,
    }));
  }, [dripStations]);

  // Water drop geometry: clearly readable elongated teardrop droplet
  const dropGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.016, 0.024, 0.12, 6);
    return geo;
  }, []);

  const dropMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#BAE6FD",
      emissive: new THREE.Color("#38BDF8"),
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });
  }, []);

  // ─── 3. INVERT PUDDLE DECALS ──────────────────────────────────────────────
  // Puddles placed along the invert drainage swale and floor depression
  const puddleMeshes = useMemo(() => {
    return dripStations.map((st, idx) => {
      const width = radius * 1.05 + (idx % 2) * 0.35;
      const length = radius * 1.8 + (idx % 2) * 0.5;
      const geo = new THREE.PlaneGeometry(width, length);
      geo.rotateX(-Math.PI / 2); // Lay flat on invert floor
      return {
        geo,
        position: st.invertPos.clone(),
        v: st.v,
      };
    });
  }, [dripStations, radius]);

  // Puddle shader material
  const puddleMatRef = useRef<THREE.ShaderMaterial>(null);
  const puddleUniforms = useMemo(() => {
    // 3 string light positions for specular glints
    const stringLightPositions = [
      spline.getPointAt(0.15).clone().add(new THREE.Vector3(radius * 0.82, radius * 0.35, 0)),
      spline.getPointAt(0.55).clone().add(new THREE.Vector3(radius * 0.82, radius * 0.35, 0)),
      spline.getPointAt(0.85).clone().add(new THREE.Vector3(radius * 0.82, radius * 0.35, 0)),
    ];

    return {
      uTime: { value: 0 },
      uSeepageFactor: { value: seepageFactor },
      uStringLightPositions: { value: stringLightPositions },
      uStringLightColor: { value: new THREE.Color("#FFE1A8") },
    };
  }, [spline, seepageFactor]);

  // ─── 4. ANIMATION FRAME: GRAVITY DROP SIMULATION ───────────────────────────
  useFrame((state, delta) => {
    // Update puddle shader time & seepage
    if (puddleMatRef.current) {
      puddleMatRef.current.uniforms.uTime.value += delta;
      puddleMatRef.current.uniforms.uSeepageFactor.value = seepageFactor;
    }

    if (!showDrips || !dripsRef.current) return;

    // Rate of drip spawn scales directly with seepageFactor
    const effectiveSpeedMultiplier = 0.4 + seepageFactor * 1.8;

    for (let i = 0; i < DRIP_COUNT; i++) {
      const drip = dripStates[i];
      const station = dripStations[drip.stationIdx];

      drip.progress += delta * drip.speed * effectiveSpeedMultiplier;

      if (drip.progress >= 1.0) {
        drip.progress = 0.0;
        // Small lateral jitter around fissure
        drip.stationIdx = (drip.stationIdx + 1) % dripStations.length;
      }

      // Physics: fall under gravity (accelerating downwards)
      // Height H from crown to invert ≈ 3.28m
      const t = drip.progress;
      const currentY = THREE.MathUtils.lerp(station.crownPos.y, station.invertPos.y, t * t);
      const currentX = THREE.MathUtils.lerp(station.crownPos.x, station.invertPos.x, t);
      const currentZ = THREE.MathUtils.lerp(station.crownPos.z, station.invertPos.z, t);

      dripDummy.position.set(currentX, currentY, currentZ);
      dripDummy.scale.set(1, 1 + t * 1.5, 1); // Elongate drop as it accelerates
      dripDummy.updateMatrix();

      dripsRef.current.setMatrixAt(i, dripDummy.matrix);
    }

    dripsRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="tunnel-water-seepage">
      {/* ═══ 1. FALLING WATER DRIP PARTICLES ═══ */}
      {showDrips && (
        <instancedMesh
          ref={dripsRef}
          args={[dropGeometry, dropMaterial, DRIP_COUNT]}
        />
      )}

      {/* ═══ 2. INVERT PUDDLE DECALS (Normal-Mapped Specular Waves) ═══ */}
      {showPuddles && (
        <group name="invert-puddle-decals">
          {puddleMeshes.map((puddle, idx) => (
            <mesh
              key={`puddle-decal-${idx}`}
              geometry={puddle.geo}
              position={puddle.position}
            >
              <shaderMaterial
                ref={idx === 0 ? puddleMatRef : undefined}
                vertexShader={PuddleShader.vertexShader}
                fragmentShader={PuddleShader.fragmentShader}
                uniforms={puddleUniforms}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
