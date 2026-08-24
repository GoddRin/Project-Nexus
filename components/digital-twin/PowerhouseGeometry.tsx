"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import gisTerrainData from "@/public/data/gis-terrain-mesh.json";
import { sampleTerrainY } from "./AnimatedSiteEntities";
import { UPHILL_ROAD_SPLINE, ROAD_CONSTANTS, getRoadTransform } from "./uphillRoadConfig";

/* ═══════════════════════════════════════════════════════════
   RealisticRiverFlowShaderMaterial
   Photorealistic 60 FPS GLSL fluid flow shader featuring:
   - 2D Simplex noise wave dynamics & caustics
   - Shoreline depth gradient (shallow emerald to deep river blue)
   - Tailrace discharge confluence turbulence & white-water foam
   - Fresnel specular sun reflection gleams
   ═══════════════════════════════════════════════════════════ */
const RealisticRiverFlowShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uDeepColor: new THREE.Color("#0284C7"),
    uShallowColor: new THREE.Color("#0D9488"),
    uFoamColor: new THREE.Color("#F0F9FF"),
    uSkyColor: new THREE.Color("#BAE6FD"),
    uFlowSpeed: 1.1,
  },
  /* Vertex Shader */
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* Fragment Shader */
  `
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform vec3 uSkyColor;
    uniform float uFlowSpeed;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // 1. Flow UV Coordinates (Longitudinal flow along X, cross-channel along Y)
      vec2 flowUv1 = vec2(vUv.x * 28.0 - uTime * uFlowSpeed * 1.2, vUv.y * 5.0);
      vec2 flowUv2 = vec2(vUv.x * 52.0 - uTime * uFlowSpeed * 1.8, vUv.y * 10.0 + sin(uTime) * 0.2);

      // 2. Dual Wave Noise Harmonics
      float n1 = snoise(flowUv1);
      float n2 = snoise(flowUv2);
      float waterWaves = (n1 * 0.65 + n2 * 0.35);

      // 3. Shoreline Edge Gradient & Depth Transition
      float edgeDist = min(vUv.y, 1.0 - vUv.y);
      float shoreFactor = smoothstep(0.01, 0.24, edgeDist);
      
      // Shoreline water is shallow emerald, channel center is deep river blue
      vec3 baseWater = mix(uShallowColor, uDeepColor, shoreFactor);

      // Add caustics and wave ripple highlights
      baseWater += uSkyColor * waterWaves * 0.18;

      // 4. Shoreline & Tailrace Discharge White-Water Foam
      float shoreFoam = smoothstep(0.12, 0.01, edgeDist) * (0.5 + 0.5 * snoise(vec2(vUv.x * 40.0 - uTime * 2.0, 0.0)));

      // Tailrace Outfall Confluence White-Water Mixing (vUv.x ~ 0.42 to 0.52)
      float confluence = smoothstep(0.38, 0.45, vUv.x) * (1.0 - smoothstep(0.48, 0.62, vUv.x));
      float tailraceTurbulence = confluence * smoothstep(0.3, 0.0, abs(vUv.y - 0.45)) * (0.6 + 0.4 * snoise(flowUv2 * 1.5));

      float totalFoam = clamp(shoreFoam * 0.6 + tailraceTurbulence * 0.85 + max(0.0, waterWaves - 0.55) * 0.4, 0.0, 1.0);
      vec3 finalWater = mix(baseWater, uFoamColor, totalFoam);

      // 5. Fresnel Specular Sun Highlights
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float NdotV = clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0);
      float fresnel = pow(clamp(1.0 - NdotV, 0.0, 1.0), 3.2);
      finalWater += uSkyColor * fresnel * 0.45;

      // 6. Smooth Opacity (shallow shorelines are translucent, deep water is opaque)
      float alpha = mix(0.55, 0.95, shoreFactor);

      gl_FragColor = vec4(finalWater, alpha);
    }
  `
);

extend({ RealisticRiverFlowShaderMaterial });
import {
  MAT_CONCRETE_PRIMARY,
  MAT_CONCRETE_DARK,
  MAT_CONCRETE_LIGHT,
  MAT_CONCRETE_HEADER,
  MAT_PAVER_WALKWAY,
  MAT_ROOF_BLUE,
  MAT_ROOF_FASCIA,
  MAT_STEEL_FRAME,
  MAT_STEEL_RAILING,
  MAT_STEEL_BLUE,
  MAT_STEEL_FIN,
  MAT_INSULATOR_AMBER,
  MAT_INSULATOR_CYAN,
  MAT_GLASS_BLUE,
  MAT_ASPHALT_DARK,
  MAT_WHITE_PAINT,
  MAT_YELLOW_SAFETY,
  MAT_CONCRETE_SLAB,
  MAT_STEEL_DARK,
  MAT_GRANITE_BASE,
  MAT_DIRT_ROAD_HAUL,
  MAT_DIRT_ROAD_RUTS,
  MAT_DIRT_SHOULDER_EMBANKMENT,
  MAT_DIRT_WALKWAY_TRAIL,
  MAT_LOG_BARRIER,
  MAT_TIMBER_STAKE,
  MAT_TIMBER_POLE,
  MAT_SITE_FLOODLIGHT_BODY,
  MAT_HEADLIGHT_ON,
  MAT_CHROME,
  MAT_FOOD_STAINLESS_TRAY,
  MAT_CARABAO_HIDE,
} from "./SharedMaterials";

/* ═══════════════════════════════════════════════════════════
   MATERIAL CONSTANTS — Photorealistic PBR values matched
   against Tumauini HEPP construction photos & DED drawings.
   ═══════════════════════════════════════════════════════════ */

const CONCRETE = {
  primary: "#B8B4AE",
  light: "#C5C0B8",
  dark: "#908C85",
  stained: "#A09B93",
};

const BLUE_STEEL = {
  roof: "#1E5488",
  fascia: "#2563A8",
  dark: "#163D66",
  light: "#2A6AAA",
};

const METAL = {
  frame: "#2C3038",
  railing: "#4A5568",
  structural: "#3D4852",
};

const XRAY_COLOR = "#1FB6A6";

// Global material instance cache to ensure Three.js batches WebGL draw calls
const powerhouseMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getCachedPowerhouseMaterial(color: string, roughness = 0.9, metalness = 0.05, isXRay = false, isRoof = false): THREE.MeshStandardMaterial {
  const key = `${color}_${roughness}_${metalness}_${isXRay}_${isRoof}`;
  if (!powerhouseMaterialCache.has(key)) {
    powerhouseMaterialCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: isXRay ? "#00F0FF" : color,
        wireframe: isXRay,
        transparent: isXRay,
        opacity: isXRay ? (isRoof ? 0.25 : 0.4) : 1.0,
        emissive: isXRay ? "#00F0FF" : "#000000",
        emissiveIntensity: isXRay ? 0.35 : 0,
        roughness: isXRay ? 0.1 : roughness,
        metalness: isXRay ? 0.9 : metalness,
        depthWrite: !isXRay,
      })
    );
  }
  return powerhouseMaterialCache.get(key)!;
}

/* ═══════════════════════════════════════════════════════════
   RealisticPowerhouseBuilding
   Two-story reinforced concrete powerhouse with blue steel
   roof, external staircase, pilasters, and windows.
   ═══════════════════════════════════════════════════════════ */

interface PowerhouseBuildingProps {
  isXRay?: boolean;
}

export function RealisticPowerhouseBuilding({ isXRay = false }: PowerhouseBuildingProps) {
  // Architectural CAD Wireframe Blueprint helper variables
  const cc = (c: string) => (isXRay ? "#00F0FF" : c);
  const cR = isXRay ? 0.1 : 0.92;
  const cM = isXRay ? 0.9 : 0.05;
  const cT = isXRay;
  const cO = isXRay ? 0.35 : 1;
  const dW = !isXRay;

  const sR = isXRay ? 0.1 : 0.32;
  const sM = isXRay ? 0.9 : 0.85;
  const sO = isXRay ? 0.25 : 1;

  const bMat = (baseColor: string, isRoof = false) => (
    <primitive
      object={getCachedPowerhouseMaterial(baseColor, isRoof ? 0.35 : 0.9, isRoof ? 0.82 : 0.05, isXRay, isRoof)}
      attach="material"
    />
  );

  return (
    <group>
      {/* ═══════════ FOUNDATION / PLINTH ═══════════ */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[21.5, 0.4, 15.5]} />
      </mesh>

      {/* ═══════════ LOWER LEVEL — Draft Tube / Tailrace Access ═══════════ */}

      {/* Back wall */}
      <mesh position={[0, 3, -6.6]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[20, 5.5, 0.8]} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-9.6, 3, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[0.8, 5.5, 14]} />
      </mesh>
      {/* Right wall */}
      <mesh position={[9.6, 3, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[0.8, 5.5, 14]} />
      </mesh>

      {/* Front wall — left pier */}
      <mesh position={[-7.2, 3, 6.6]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[4, 5.5, 0.8]} />
      </mesh>
      {/* Front wall — center pier */}
      <mesh position={[0, 3, 6.6]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[2.2, 5.5, 0.8]} />
      </mesh>
      {/* Front wall — right pier */}
      <mesh position={[7.2, 3, 6.6]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[4, 5.5, 0.8]} />
      </mesh>
      {/* Front wall — upper lintel connecting piers */}
      <mesh position={[0, 5.35, 6.6]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[20, 0.6, 0.8]} />
      </mesh>

      {/* Draft-tube dark void openings */}
      <mesh position={[-3.6, 2.1, 6.65]} material={MAT_STEEL_FRAME}>
        <boxGeometry args={[5, 4.2, 0.2]} />
      </mesh>
      <mesh position={[3.6, 2.1, 6.65]} material={MAT_STEEL_FRAME}>
        <boxGeometry args={[5, 4.2, 0.2]} />
      </mesh>

      {/* Floor slab between levels */}
      <mesh position={[0, 5.7, 0]} castShadow receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[20.4, 0.4, 14.4]} />
      </mesh>

      {/* ═══════════ PHYSICAL 3D INTERIOR TURBINE & GENERATOR EQUIPMENT ═══════════ */}
      <group position={[0, 5.7, 0]}>
        {/* ═══ BIG TURBINE #1 (8.5 MW) ═══ */}
        <group position={[-4, 0, 0]}>
          {/* Concrete Foundation Pit Base */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[2.2, 2.4, 0.4, 24]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Francis Turbine Spiral Scroll Case */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <torusGeometry args={[1.3, 0.45, 16, 32]} />
            <meshStandardMaterial color="#0284C7" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Main Generator Stator Housing */}
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.5, 1.0, 24]} />
            <meshStandardMaterial color="#0369A1" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Generator Rotor Shaft & Exciter Cap */}
          <mesh position={[0, 2.1, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.2} metalness={0.9} emissive="#F59E0B" emissiveIntensity={isXRay ? 0.6 : 0.2} />
          </mesh>
        </group>

        {/* ═══ SMALL TURBINE #2 (2.8 MW) ═══ */}
        <group position={[4, 0, 0]}>
          {/* Concrete Foundation Base */}
          <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[1.7, 1.9, 0.4, 24]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          {/* Spiral Scroll Case */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <torusGeometry args={[0.95, 0.35, 16, 32]} />
            <meshStandardMaterial color="#059669" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Generator Stator Housing */}
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 0.9, 24]} />
            <meshStandardMaterial color="#047857" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Generator Exciter Cap */}
          <mesh position={[0, 1.95, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.2} metalness={0.9} emissive="#F59E0B" emissiveIntensity={isXRay ? 0.6 : 0.2} />
          </mesh>
        </group>

        {/* ═══ SCADA CONTROL & GOVERNOR CONSOLES ═══ */}
        <group position={[0, 0, -3.5]}>
          {/* Main SCADA Cabinet */}
          <mesh position={[-1.2, 0.9, 0]} castShadow>
            <boxGeometry args={[1.2, 1.8, 0.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Governor Control Cabinet */}
          <mesh position={[1.2, 0.9, 0]} castShadow>
            <boxGeometry args={[1.2, 1.8, 0.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Glowing Screen Panels */}
          <mesh position={[-1.2, 1.2, 0.31]}>
            <planeGeometry args={[0.8, 0.5]} />
            <meshBasicMaterial color="#00F0FF" />
          </mesh>
          <mesh position={[1.2, 1.2, 0.31]}>
            <planeGeometry args={[0.8, 0.5]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>
        </group>
      </group>

      {/* ═══════════ UPPER LEVEL — Turbine & Generator Hall ═══════════ */}

      {/* Back wall */}
      <mesh position={[0, 8.4, -6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 5, 0.8]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Left wall */}
      <mesh position={[-9.6, 8.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5, 14]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Right wall */}
      <mesh position={[9.6, 8.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 5, 14]} />
        {bMat(CONCRETE.light)}
      </mesh>
      {/* Front wall (upper) */}
      <mesh position={[0, 8.4, 6.6]} castShadow receiveShadow>
        <boxGeometry args={[20, 5, 0.8]} />
        {bMat(CONCRETE.light)}
      </mesh>

      {/* ═══ WINDOWS — upper-level front face ═══ */}
      {[-6, -2, 2, 6].map((x, i) => (
        <group key={`win-${i}`}>
          {/* Dark steel frame */}
          <mesh position={[x, 8.5, 6.98]} castShadow>
            <boxGeometry args={[2.3, 2.5, 0.12]} />
            {bMat(METAL.frame)}
          </mesh>
          {/* Glass pane */}
          <mesh position={[x, 8.5, 7.02]}>
            <boxGeometry args={[1.9, 2.1, 0.06]} />
            {bMat("#6B8DAB")}
          </mesh>
        </group>
      ))}

      {/* Back-wall windows (smaller) */}
      {[-5, 0, 5].map((x, i) => (
        <group key={`bwin-${i}`}>
          <mesh position={[x, 8.5, -6.98]} castShadow>
            <boxGeometry args={[1.8, 2.0, 0.12]} />
            {bMat(METAL.frame)}
          </mesh>
          <mesh position={[x, 8.5, -7.02]}>
            <boxGeometry args={[1.4, 1.6, 0.06]} />
            {bMat("#6B8DAB")}
          </mesh>
        </group>
      ))}

      {/* ═══ CONCRETE PILASTERS — vertical facade columns ═══ */}
      {[-9.3, -4.5, 0, 4.5, 9.3].map((x, i) => (
        <mesh key={`pil-${i}`} position={[x, 5.5, 7.0]} castShadow>
          <boxGeometry args={[0.55, 11, 0.35]} />
          {bMat(CONCRETE.dark)}
        </mesh>
      ))}

      {/* ═══ CONCRETE DRIP EDGE — transition between levels ═══ */}
      <mesh position={[0, 5.9, 7.05]} castShadow>
        <boxGeometry args={[20.6, 0.12, 0.5]} />
        {bMat(CONCRETE.dark)}
      </mesh>
      <mesh position={[0, 5.9, -7.05]} castShadow>
        <boxGeometry args={[20.6, 0.12, 0.5]} />
        {bMat(CONCRETE.dark)}
      </mesh>

      {/* ═══════════ BLUE STEEL FASCIA BAND ═══════════ */}
      {/* Front */}
      <mesh position={[0, 10.7, 6.75]} castShadow>
        <boxGeometry args={[20.6, 0.9, 0.25]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Back */}
      <mesh position={[0, 10.7, -6.75]} castShadow>
        <boxGeometry args={[20.6, 0.9, 0.25]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Left */}
      <mesh position={[-9.9, 10.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.9, 13.8]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>
      {/* Right */}
      <mesh position={[9.9, 10.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.9, 13.8]} />
        {bMat(BLUE_STEEL.fascia)}
      </mesh>

      {/* ═══════════ STEEL ROOF FRAME — visible trusses ═══════════ */}
      {/* Horizontal purlins (front-to-back) */}
      {[-7, -3.5, 0, 3.5, 7].map((x, i) => (
        <mesh key={`purlin-${i}`} position={[x, 11.0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.3, 14.8]} />
          {bMat(BLUE_STEEL.dark)}
        </mesh>
      ))}
      {/* Cross beams (left-to-right) */}
      {[-5, 0, 5].map((z, i) => (
        <mesh key={`xbeam-${i}`} position={[0, 11.0, z]} castShadow>
          <boxGeometry args={[20.4, 0.25, 0.2]} />
          {bMat(BLUE_STEEL.dark)}
        </mesh>
      ))}

      {/* ═══════════ BLUE STEEL ROOF PANELS ═══════════ */}
      <mesh position={[0, 11.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[22, 0.5, 16]} />
        {bMat(BLUE_STEEL.light, true)}
      </mesh>
      {/* Roof ridge cap */}
      <mesh position={[0, 11.72, 0]} castShadow>
        <boxGeometry args={[22.5, 0.12, 1.0]} />
        {bMat(BLUE_STEEL.fascia, true)}
      </mesh>
      {/* Roof edge trim — front */}
      <mesh position={[0, 11.2, 8.0]} castShadow>
        <boxGeometry args={[22.4, 0.2, 0.3]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — back */}
      <mesh position={[0, 11.2, -8.0]} castShadow>
        <boxGeometry args={[22.4, 0.2, 0.3]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — left */}
      <mesh position={[-11.0, 11.2, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 16.5]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>
      {/* Roof edge trim — right */}
      <mesh position={[11.0, 11.2, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 16.5]} />
        {bMat(BLUE_STEEL.dark, true)}
      </mesh>

      {/* ═══════════ CORRUGATED ROOF & GUTTER DETAIL ═══════════ */}
      {/* Corrugation ridge ribs across roof surface */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`rib-${i}`} position={[-8 + i * 2.8, 11.68, 0]} castShadow>
          <boxGeometry args={[0.08, 0.12, 16.2]} />
          {bMat(BLUE_STEEL.dark, true)}
        </mesh>
      ))}
      {/* Rain gutter — front eave */}
      <mesh position={[0, 11.05, 8.3]} castShadow>
        <boxGeometry args={[22.6, 0.15, 0.3]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>
      {/* Rain gutter — back eave */}
      <mesh position={[0, 11.05, -8.3]} castShadow>
        <boxGeometry args={[22.6, 0.15, 0.3]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>
      {/* Downspout pipes at front corners */}
      {[-10.5, 10.5].map((x, i) => (
        <mesh key={`dp-${i}`} position={[x, 5.5, 8.3]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 11.0, 8]} />
          <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
        </mesh>
      ))}
      {/* Roof exhaust vent housing */}
      <mesh position={[0, 12.1, -2]} castShadow>
        <boxGeometry args={[1.2, 0.7, 1.0]} />
        <meshStandardMaterial color={cc(METAL.structural)} roughness={0.4} metalness={0.65} transparent={cT} opacity={isXRay ? 0.2 : 1} />
      </mesh>

      {/* ═══════════ EXTERNAL CONCRETE STAIRCASE — left side ═══════════ */}

      {/* Staircase support wall / stringer */}
      <mesh position={[-11.8, 2.85, 2.5]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 5.7, 5.0]} />
        <meshStandardMaterial color={cc(CONCRETE.primary)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
      </mesh>

      {/* Individual concrete steps (14 steps, 0.38m rise, 0.3m run) */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={`step-${i}`}
          position={[-11.8, 0.45 + i * 0.38, 4.8 - i * 0.32]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.4, 0.18, 0.55]} />
          <meshStandardMaterial color={cc(CONCRETE.light)} roughness={cR} metalness={cM} transparent={cT} opacity={cO} />
        </mesh>
      ))}

      {/* Upper landing platform */}
      <mesh position={[-11.5, 5.85, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.3, 2.2]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.9} metalness={0.05} transparent={cT} opacity={cO} />
      </mesh>

      {/* Metal railing posts */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`rail-${i}`} position={[-10.6, 1.3 + i * 0.52, 4.6 - i * 0.52]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
          <meshStandardMaterial color={cc(METAL.railing)} roughness={0.4} metalness={0.7} transparent={cT} opacity={isXRay ? 0.15 : 1} />
        </mesh>
      ))}
      {/* Railing top bar */}
      <mesh
        position={[-10.6, 3.6, 2.3]}
        rotation={[0, 0, Math.atan2(5.3, 6.5)]}
        castShadow
      >
        <boxGeometry args={[0.06, 8.0, 0.06]} />
        <meshStandardMaterial color={cc(METAL.railing)} roughness={0.35} metalness={0.75} transparent={cT} opacity={isXRay ? 0.15 : 1} />
      </mesh>

      {/* ═══════════ ENTRANCE DOOR — left wall (accessed via staircase) ═══════════ */}
      <mesh position={[-9.3, 7.4, 0.5]}>
        <boxGeometry args={[0.15, 2.8, 1.8]} />
        <meshStandardMaterial color={cc(METAL.frame)} roughness={0.5} metalness={0.55} transparent={cT} opacity={isXRay ? 0.12 : 1} />
      </mesh>

      {/* ═══════════ CONCRETE PERIMETER DRAIN CHANNEL ═══════════ */}
      <mesh position={[0, 0.12, 8.2]} receiveShadow>
        <boxGeometry args={[24, 0.24, 1.2]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.95} metalness={0.03} transparent={cT} opacity={cO} />
      </mesh>
      {/* Side drain — left */}
      <mesh position={[-11.0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[0.8, 0.24, 16]} />
        <meshStandardMaterial color={cc(CONCRETE.dark)} roughness={0.95} metalness={0.03} transparent={cT} opacity={cO} />
      </mesh>

      {/* ═══════════ CONCRETE COPING — top of upper walls ═══════════ */}
      <mesh position={[0, 10.95, 6.85]} castShadow>
        <boxGeometry args={[20.8, 0.1, 0.6]} />
        <meshStandardMaterial color={cc(CONCRETE.stained)} roughness={0.9} metalness={0.04} transparent={cT} opacity={cO} />
      </mesh>
      <mesh position={[0, 10.95, -6.85]} castShadow>
        <boxGeometry args={[20.8, 0.1, 0.6]} />
        <meshStandardMaterial color={cc(CONCRETE.stained)} roughness={0.9} metalness={0.04} transparent={cT} opacity={cO} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticSwitchyard
   Elevated concrete platform with floodwall perimeter.
   ═══════════════════════════════════════════════════════════ */

export function RealisticSwitchyard() {
  return (
    <group>
      {/* Elevated concrete pad */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[18, 2.0, 16]} />
      </mesh>

      {/* Gravel surface */}
      <mesh position={[0, 2.06, 0]} receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[16.8, 0.08, 14.8]} />
      </mesh>

      {/* ═══ FLOODWALLS ═══ */}
      {/* North wall */}
      <mesh position={[0, 3.2, -8.3]} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
        <boxGeometry args={[18.6, 4.4, 0.8]} />
      </mesh>
      {/* South wall */}
      <mesh position={[0, 3.2, 8.3]} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
        <boxGeometry args={[18.6, 4.4, 0.8]} />
      </mesh>
      {/* East wall */}
      <mesh position={[9.5, 3.2, 0]} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
        <boxGeometry args={[0.8, 4.4, 17.4]} />
      </mesh>
      {/* West wall (partial, open for cable bus) */}
      <mesh position={[-9.5, 3.2, -4]} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
        <boxGeometry args={[0.8, 4.4, 8.6]} />
      </mesh>

      {/* Floodwall coping (top cap) */}
      <mesh position={[0, 5.5, -8.3]} castShadow material={MAT_CONCRETE_HEADER}>
        <boxGeometry args={[19.0, 0.15, 1.2]} />
      </mesh>
      <mesh position={[0, 5.5, 8.3]} castShadow material={MAT_CONCRETE_HEADER}>
        <boxGeometry args={[19.0, 0.15, 1.2]} />
      </mesh>
      <mesh position={[9.5, 5.5, 0]} castShadow material={MAT_CONCRETE_HEADER}>
        <boxGeometry args={[1.2, 0.15, 17.8]} />
      </mesh>

      {/* Equipment pad foundations (4 concrete plinths) */}
      {[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z], i) => (
        <mesh key={`epad-${i}`} position={[x, 2.35, z]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
          <boxGeometry args={[3.5, 0.6, 3.5]} />
        </mesh>
      ))}

      {/* ═══ SWITCHYARD EQUIPMENT SILHOUETTES ═══ */}

      {/* PAD 0 [-3, -3]: GSU Step-Up Transformer (15 MVA) */}
      <group position={[-3, 2.65, -3]}>
        {/* Oil-filled transformer tank body */}
        <mesh position={[0, 1.0, 0]} castShadow material={MAT_STEEL_BLUE}>
          <boxGeometry args={[2.4, 2.0, 1.6]} />
        </mesh>
        {/* Conservator tank (horizontal cylinder on top) */}
        <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT_STEEL_BLUE}>
          <cylinderGeometry args={[0.2, 0.2, 1.8, 12]} />
        </mesh>
        {/* HV Bushings (3 tall porcelain insulators) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`hv-${i}`} position={[offset, 2.8, -0.3]} castShadow material={MAT_INSULATOR_AMBER}>
            <cylinderGeometry args={[0.06, 0.1, 1.4, 8]} />
          </mesh>
        ))}
        {/* LV Bushings (3 shorter) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`lv-${i}`} position={[offset, 2.4, 0.4]} castShadow material={MAT_INSULATOR_AMBER}>
            <cylinderGeometry args={[0.05, 0.08, 0.8, 8]} />
          </mesh>
        ))}
        {/* Radiator fin banks — left side */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`fin-l-${i}`} position={[-1.3, 0.8, -0.5 + i * 0.25]} castShadow material={MAT_STEEL_FIN}>
            <boxGeometry args={[0.08, 1.4, 0.18]} />
          </mesh>
        ))}
        {/* Radiator fin banks — right side */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`fin-r-${i}`} position={[1.3, 0.8, -0.5 + i * 0.25]} castShadow material={MAT_STEEL_FIN}>
            <boxGeometry args={[0.08, 1.4, 0.18]} />
          </mesh>
        ))}
      </group>

      {/* PAD 1 [3, -3]: SF6 Gas Circuit Breaker */}
      <group position={[3, 2.65, -3]}>
        {/* Support frame base */}
        <mesh position={[0, 0.3, 0]} castShadow material={MAT_CONCRETE_HEADER}>
          <boxGeometry args={[2.2, 0.6, 1.4]} />
        </mesh>
        {/* 3 Interrupter chamber columns + chambers */}
        {[-0.6, 0, 0.6].map((offset, i) => (
          <group key={`cb-col-${i}`}>
            {/* Support column */}
            <mesh position={[offset, 1.3, 0]} castShadow material={MAT_STEEL_RAILING}>
              <cylinderGeometry args={[0.08, 0.1, 1.6, 8]} />
            </mesh>
            {/* Interrupter chamber */}
            <mesh position={[offset, 2.4, 0]} castShadow material={MAT_INSULATOR_CYAN}>
              <cylinderGeometry args={[0.18, 0.18, 0.8, 12]} />
            </mesh>
          </group>
        ))}
        {/* Operating mechanism cabinet */}
        <mesh position={[0, 0.6, 0.5]} castShadow material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.8, 1.0, 0.5]} />
        </mesh>
      </group>

      {/* PAD 2 [-3, 3]: Motorized Disconnect Switch */}
      <group position={[-3, 2.65, 3]}>
        {/* 3 Post insulators */}
        {[-0.6, 0, 0.6].map((offset, i) => (
          <mesh key={`ds-post-${i}`} position={[offset, 1.0, 0]} castShadow material={MAT_INSULATOR_AMBER}>
            <cylinderGeometry args={[0.07, 0.12, 2.0, 8]} />
          </mesh>
        ))}
        {/* Rotating blade arm */}
        <mesh position={[0, 2.1, 0]} rotation={[0, 0, 0.3]} castShadow material={MAT_PAVER_WALKWAY}>
          <boxGeometry args={[1.8, 0.06, 0.06]} />
        </mesh>
        {/* Motor drive housing */}
        <mesh position={[0, 0.4, 0.4]} castShadow material={MAT_STEEL_FRAME}>
          <boxGeometry args={[0.6, 0.6, 0.4]} />
        </mesh>
      </group>

      {/* PAD 3 [3, 3]: Surge Arrester & CT/PT Metering Set */}
      <group position={[3, 2.65, 3]}>
        {/* 3 Surge arrester stacks (tall porcelain) */}
        {[-0.5, 0, 0.5].map((offset, i) => (
          <mesh key={`sa-${i}`} position={[offset, 1.5, -0.2]} castShadow material={MAT_INSULATOR_AMBER}>
            <cylinderGeometry args={[0.08, 0.12, 2.8, 8]} />
          </mesh>
        ))}
        {/* CT (Current Transformer) */}
        <mesh position={[-0.5, 0.6, 0.5]} castShadow material={MAT_CONCRETE_HEADER}>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
        </mesh>
        {/* PT (Potential Transformer) */}
        <mesh position={[0.5, 0.6, 0.5]} castShadow material={MAT_CONCRETE_HEADER}>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
        </mesh>
        {/* Base mounting plate */}
        <mesh position={[0, 0.05, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[2.5, 0.1, 1.8]} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   MountainTerrain
   Multi-layered hillside with exposed rock, soil, and
   tropical vegetation matching the construction site photos.
   ═══════════════════════════════════════════════════════════ */

export function MountainTerrain() {
  const gisGeometry = useMemo(() => {
    const positions = new Float32Array(gisTerrainData.positions);

    // Excavate Tailrace Canal, Level TEMFACIL Pad, & Grade Smooth Continuous Hillside Slope
    const ax = 34.0, az = -22.0;
    const bx = 95.0, bz = -75.0;
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const terrainColors = new Float32Array(gisTerrainData.colors);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // 1. Tailrace Canal & Outfall Channel
      if (x >= -14.0 && x <= 14.0 && z >= 6.0 && z <= 48.0) {
        positions[i + 1] = Math.min(y, -0.45);
        continue;
      }

      // 2. TEMFACIL Expanded Base Land Pad & Mountain Slope Transition
      // TEMFACIL Compound base platform extends x from 80 to 175, z from -142 to -66
      const dxPad = Math.max(80.0 - x, 0, x - 175.0);
      const dzPad = Math.max(-142.0 - z, 0, z - (-66.0));
      const distPad = Math.hypot(dxPad, dzPad);

      if (distPad === 0) {
        // Flat TEMFACIL compound ground at y = 14.0 (covers all 3 barracks, staff house, office, warehouse)
        positions[i + 1] = 14.0;
        terrainColors[i] = 0.30;
        terrainColors[i + 1] = 0.28;
        terrainColors[i + 2] = 0.24;
      } else if (distPad < 28.0) {
        // Natural mountain slope rising behind (z < -126) and around TEMFACIL
        const t = distPad / 28.0;
        const smoothT = t * t * (3.0 - 2.0 * t);
        const origY = Math.max(14.0, y);
        positions[i + 1] = 14.0 * (1.0 - smoothT) + origY * smoothT;

        // Rich tropical forest green & mountain soil colors on the slope behind and beside TEMFACIL
        const cGreenR = 0.14, cGreenG = 0.23, cGreenB = 0.11; // Dark forest green
        const cSoilR = 0.26, cSoilG = 0.21, cSoilB = 0.15;  // Mountain earth soil

        const mixSoil = (Math.sin(x * 0.12) * 0.35 + 0.35) * (1.0 - t * 0.4);
        terrainColors[i] = THREE.MathUtils.lerp(cGreenR, cSoilR, mixSoil);
        terrainColors[i + 1] = THREE.MathUtils.lerp(cGreenG, cSoilG, mixSoil);
        terrainColors[i + 2] = THREE.MathUtils.lerp(cGreenB, cSoilB, mixSoil);
      }

      // 3. Smooth Continuous Linear Slope Grade from TEMFACIL (x: 95, z: -75, y=14) down to Powerhouse (x: 34, z: -22, y=0.5)
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
      const projX = ax + t * dx;
      const projZ = az + t * dz;
      const distToSlopeLine = Math.hypot(x - projX, z - projZ);

      if (distToSlopeLine < 28.0 && x >= 30.0 && x <= 98.0 && z >= -80.0 && z <= -20.0) {
        const slopeY = 0.5 + t * 13.5;
        const fade = Math.min(1.0, distToSlopeLine / 28.0);
        positions[i + 1] = slopeY * (1.0 - fade) + positions[i + 1] * fade;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(terrainColors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(gisTerrainData.uvs, 2));
    geo.setIndex(gisTerrainData.indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* ═══ 4-ZONE VERTEX-COLORED TERRACED GIS TERRAIN MESH (360m) ═══ */}
      <mesh geometry={gisGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.92}
          metalness={0.02}
          flatShading={false}
        />
      </mesh>

      {/* ═══ 600M EXTENDED BACKGROUND MOUNTAIN LANDSCAPE (Fills Empty Scene Void) ═══ */}
      <ExtendedBackgroundMountains />
    </group>
  );
}

function ExtendedBackgroundMountains() {
  const geo = useMemo(() => {
    const SIZE = 600;
    const SEG = 75;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const cGrass = new THREE.Color("#4B633A");
    const cRock = new THREE.Color("#5C5A4D");

    for (let r = 0; r <= SEG; r++) {
      for (let c = 0; c <= SEG; c++) {
        const x = -SIZE / 2 + (c / SEG) * SIZE;
        const z = -SIZE / 2 + (r / SEG) * SIZE;

        const distFromCenter = Math.hypot(x, z);
        let y = -0.2;
        if (distFromCenter > 165) {
          const outerFactor = (distFromCenter - 165) / 135;
          y = (Math.sin(x * 0.02) * Math.cos(z * 0.02) * 22.0 + Math.sin(x * 0.035 + z * 0.025) * 12.0 + 10.0) * outerFactor - 0.2;
        }

        positions.push(x, y, z);

        const col = y > 14 ? cRock : cGrass;
        colors.push(col.r, col.g, col.b);

        if (r < SEG && c < SEG) {
          const i0 = r * (SEG + 1) + c;
          const i1 = i0 + 1;
          const i2 = (r + 1) * (SEG + 1) + c;
          const i3 = i2 + 1;
          indices.push(i0, i2, i1);
          indices.push(i1, i2, i3);
        }
      }
    }

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    bGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    bGeo.setIndex(indices);
    bGeo.computeVertexNormals();
    return bGeo;
  }, []);

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════
   TailraceWater
   Animated water surface for the tailrace outflow channel
   with subtle shimmer and depth.
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   AnimatedWaterFlowStreaks
   Directional elongated foam flow ribbons aligned flush with
   water surface to create realistic streamflow streaks without round spheres.
   ═══════════════════════════════════════════════════════════ */
function AnimatedWaterFlowStreaks() {
  const canalRef = useRef<THREE.Group>(null);
  const riverRef = useRef<THREE.Group>(null);

  // 18 Tailrace Canal Flow Streaks
  const canalStreaks = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      speed: 7.0 + (i % 3) * 1.5,
      xOff: (i % 5 - 2) * 2.4,
      timeOff: i * 0.35,
      w: 0.4 + (i % 3) * 0.2,
      len: 2.4 + (i % 4) * 0.8,
    }));
  }, []);

  // 24 River Current Flow Streaks
  const riverStreaks = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      speed: 14.0 + (i % 4) * 2.0,
      zRel: ((i % 5) - 2) * 3.2,
      timeOff: i * 0.4,
      w: 0.5 + (i % 3) * 0.25,
      len: 3.5 + (i % 4) * 1.2,
    }));
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    // Animate Canal Flow Streaks (z: 7m -> 38m)
    if (canalRef.current) {
      canalRef.current.children.forEach((child, i) => {
        const s = canalStreaks[i];
        if (!s) return;
        const dist = ((elapsed * s.speed + s.timeOff * 10) % 31.0);
        const z = 7.0 + dist;
        const x = s.xOff;
        const y = sampleTerrainY(x, z) + 0.38;
        child.position.set(x, y, z);
      });
    }

    // Animate River Current Flow Streaks (x: -120m -> +140m)
    if (riverRef.current) {
      riverRef.current.children.forEach((child, i) => {
        const s = riverStreaks[i];
        if (!s) return;
        const dist = ((elapsed * s.speed + s.timeOff * 15) % 260.0);
        const x = -120.0 + dist;
        const u = (x + 130.0) / 270.0;
        const zCenter = 42.0 + Math.sin(u * Math.PI * 2.2) * 9.0;
        const z = zCenter + s.zRel;
        const y = sampleTerrainY(x, z) + 0.48;

        // Tangent angle of meandering river path
        const dz = Math.cos(u * Math.PI * 2.2) * 9.0 * (Math.PI * 2.2 / 270.0);
        const angle = Math.atan2(dz, 1.0);

        child.position.set(x, y, z);
        child.rotation.set(-Math.PI / 2, 0, angle);
      });
    }
  });

  return (
    <group>
      {/* Canal Flow Streaks (aligned along Z axis) */}
      <group ref={canalRef}>
        {canalStreaks.map((s, i) => (
          <mesh key={`cs-${i}`} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[s.w, s.len]} />
            <meshStandardMaterial
              color="#F0F9FF"
              roughness={0.9}
              emissive="#E0F2FE"
              emissiveIntensity={0.6}
              transparent
              opacity={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* River Current Flow Streaks (aligned along river current direction) */}
      <group ref={riverRef}>
        {riverStreaks.map((s, i) => (
          <mesh key={`rs-${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[s.w, s.len]} />
            <meshStandardMaterial
              color="#E0F2FE"
              roughness={0.85}
              emissive="#BAE6FD"
              emissiveIntensity={0.4}
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   TailraceWater & Terrain-Anchored Discharge System
   ═══════════════════════════════════════════════════════════ */

export function TailraceWater() {
  const foamPlume1Ref = useRef<THREE.Mesh>(null);
  const foamPlume2Ref = useRef<THREE.Mesh>(null);
  const tailraceShaderRef = useRef<THREE.ShaderMaterial>(null);

  // Compute 3D Sloped Tailrace Water Surface Geometry
  const tailraceMesh = useMemo(() => {
    const SEGMENTS = 16;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const progress = i / SEGMENTS;
      const z = 6.8 + progress * 39.2; // z: 6.8m to 46.0m (overlaps into river ribbon)
      const flare = progress > 0.5 ? ((progress - 0.5) / 0.5) * 2.6 : 0.0;
      const xLeft = -8.2 - flare;
      const xRight = 8.2 + flare;
      const yL = sampleTerrainY(xLeft, z) + 0.38;
      const yR = sampleTerrainY(xRight, z) + 0.38;
      const yWater = Math.max(0.35, (yL + yR) * 0.5);

      positions.push(xLeft, yWater, z);
      positions.push(xRight, yWater, z);

      uvs.push(0, progress * 7.0);
      uvs.push(1, progress * 7.0);

      if (i < SEGMENTS) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (foamPlume1Ref.current) {
      const s = 1.0 + Math.sin(t * 8.0) * 0.15;
      foamPlume1Ref.current.scale.set(s, 1.0, s * 1.15);
    }
    if (foamPlume2Ref.current) {
      const s = 1.0 + Math.cos(t * 8.0 + 1.5) * 0.15;
      foamPlume2Ref.current.scale.set(s, 1.0, s * 1.15);
    }
    if (tailraceShaderRef.current) {
      tailraceShaderRef.current.uniforms.uTime.value = t;
    }
  });

  const yDraftOut = sampleTerrainY(0, 6.8);

  return (
    <group>
      {/* ═══ 1. DRAFT TUBE CONCRETE OUTFALL PORTALS ═══ */}
      <group position={[0, yDraftOut + 0.2, 6.8]}>
        {/* Unit 1 Draft Tube Portal */}
        <mesh position={[-3.6, 0.6, 0]} castShadow receiveShadow material={MAT_CONCRETE_DARK}>
          <boxGeometry args={[4.2, 2.4, 0.8]} />
        </mesh>
        <mesh position={[-3.6, 0.5, 0.42]} material={MAT_CONCRETE_PRIMARY}>
          <boxGeometry args={[3.2, 1.6, 0.1]} />
        </mesh>
        {/* Unit 2 Draft Tube Portal */}
        <mesh position={[3.6, 0.6, 0]} castShadow receiveShadow material={MAT_CONCRETE_DARK}>
          <boxGeometry args={[4.2, 2.4, 0.8]} />
        </mesh>
        <mesh position={[3.6, 0.5, 0.42]} material={MAT_CONCRETE_PRIMARY}>
          <boxGeometry args={[3.2, 1.6, 0.1]} />
        </mesh>
      </group>

      {/* Concrete Tailrace Channel Lining Slab (excavated channel floor extending to river) */}
      <mesh position={[0, -0.28, 25.8]} receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[18.5, 0.2, 38.0]} />
      </mesh>

      {/* ═══ 2. PHOTOREALISTIC SLOPED CONCRETE TAILRACE WATER SURFACE ═══ */}
      <mesh geometry={tailraceMesh} receiveShadow>
        {/* @ts-ignore */}
        <realisticRiverFlowShaderMaterial ref={tailraceShaderRef} uFlowSpeed={1.8} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* ═══ 3. ANIMATED TURBULENT DISCHARGE FOAM ═══ */}
      <mesh ref={foamPlume1Ref} position={[-3.6, yDraftOut + 0.55, 9.2]}>
        <boxGeometry args={[4.8, 0.08, 3.2]} />
        <meshStandardMaterial color="#F0F9FF" roughness={0.9} emissive="#E0F2FE" emissiveIntensity={1.0} transparent opacity={0.9} />
      </mesh>
      <mesh ref={foamPlume2Ref} position={[3.6, yDraftOut + 0.55, 9.2]}>
        <boxGeometry args={[4.8, 0.08, 3.2]} />
        <meshStandardMaterial color="#F0F9FF" roughness={0.9} emissive="#E0F2FE" emissiveIntensity={1.0} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, yDraftOut + 0.48, 15.0]}>
        <boxGeometry args={[14.2, 0.06, 7.5]} />
        <meshStandardMaterial color="#BAE6FD" roughness={0.7} emissive="#38BDF8" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>

      {/* ═══ 4. SIDE WALL RIPRAP DISSIPATOR BOULDERS (Flanking Outfall Wall) ═══ */}
      <group position={[0, 0, 38.0]}>
        {[-8.5, -8.0, 8.0, 8.5].map((xOff, i) =>
          [-2.0, 0.0, 2.0].map((zOff, j) => {
            const yB = sampleTerrainY(xOff, 38 + zOff) + 0.15;
            return (
              <mesh key={`riprap-${i}-${j}`} position={[xOff, yB, zOff]} castShadow receiveShadow>
                <dodecahedronGeometry args={[0.45 + ((i + j) % 2) * 0.15, 1]} />
                <meshStandardMaterial color={i % 2 === 0 ? "#475569" : "#334155"} roughness={0.9} metalness={0.1} />
              </mesh>
            );
          })
        )}
      </group>

      {/* ═══ 5. REAL-TIME ANIMATED DIRECTIONAL WATER FLOW STREAKS ═══ */}
      <AnimatedWaterFlowStreaks />

      {/* ═══ 6. 100% VISIBLE MEANDERING RIVER SYSTEM ═══ */}
      <MeanderingRiverSystem />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   MeanderingRiverSystem
   High-visibility 3D river ribbon anchored flush on top of
   GIS terrain across the entire mountain valley.
   ═══════════════════════════════════════════════════════════ */
export function MeanderingRiverSystem() {
  const riverShaderRef = useRef<THREE.ShaderMaterial>(null);

  const { riverGeo, bedGeo, riverbankRocks } = useMemo(() => {
    const SEGMENTS = 60;
    const RIVER_WIDTH = 24.0;
    const riverPositions: number[] = [];
    const bedPositions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const x = -130.0 + u * 270.0;
      const zCenter = 42.0 + Math.sin(u * Math.PI * 2.2) * 9.0;

      const zSouth = zCenter - RIVER_WIDTH * 0.5;
      const zNorth = zCenter + RIVER_WIDTH * 0.5;

      const isConfluenceZone = x >= -16.0 && x <= 16.0;

      const ySouth = isConfluenceZone
        ? Math.max(0.35, sampleTerrainY(x, zSouth) + 0.38)
        : sampleTerrainY(x, zSouth) + 0.45;
      const yNorth = sampleTerrainY(x, zNorth) + 0.45;

      const yBedSouth = isConfluenceZone ? -1.2 : sampleTerrainY(x, zSouth) + 0.1;
      const yBedNorth = sampleTerrainY(x, zNorth) + 0.1;
      const zBedSouth = isConfluenceZone ? zSouth + 2.0 : zSouth - 3.0;

      // River Water Surface Vertices
      riverPositions.push(x, ySouth, zSouth);
      riverPositions.push(x, yNorth, zNorth);

      // River Bed Channel Vertices (depressed below concrete apron at confluence)
      bedPositions.push(x - 2, yBedSouth, zBedSouth);
      bedPositions.push(x + 2, yBedNorth, zNorth + 3);

      uvs.push(u * 10.0, 0);
      uvs.push(u * 10.0, 1);

      if (i < SEGMENTS) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute("position", new THREE.Float32BufferAttribute(riverPositions, 3));
    rGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    rGeo.setIndex(indices);
    rGeo.computeVertexNormals();

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute("position", new THREE.Float32BufferAttribute(bedPositions, 3));
    bGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    bGeo.setIndex(indices);
    bGeo.computeVertexNormals();

    // Riverbank Boulders
    const rocks: Array<{ pos: [number, number, number]; scale: number }> = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const x = -120.0 + u * 250.0;
      const zCenter = 42.0 + Math.sin(u * Math.PI * 2.2) * 9.0;
      const zS = zCenter - RIVER_WIDTH * 0.5 - 1.4;
      const zN = zCenter + RIVER_WIDTH * 0.5 + 1.4;
      const yS = sampleTerrainY(x, zS) + 0.5;
      const yN = sampleTerrainY(x, zN) + 0.5;

      // Omit south bank rocks at the tailrace confluence mouth (x: -16m to +16m)
      if (x < -16.0 || x > 16.0) {
        rocks.push({ pos: [x, yS, zS], scale: 0.85 + (i % 3) * 0.3 });
      }
      rocks.push({ pos: [x + 1.5, yN, zN], scale: 0.95 + (i % 2) * 0.4 });
    }

    return { riverGeo: rGeo, bedGeo: bGeo, riverbankRocks: rocks };
  }, []);

  useFrame(({ clock }) => {
    if (riverShaderRef.current) {
      riverShaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Dark Wet Riverbed Gravel Trough */}
      <mesh geometry={bedGeo} receiveShadow>
        <meshStandardMaterial color="#1C2617" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Photorealistic GLSL Flowing River Water Ribbon */}
      <mesh geometry={riverGeo} receiveShadow>
        {/* @ts-ignore */}
        <realisticRiverFlowShaderMaterial ref={riverShaderRef} uFlowSpeed={1.2} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Natural Riverbank Boulders */}
      {riverbankRocks.map((r, idx) => (
        <mesh key={`rb-boulder-${idx}`} position={r.pos} castShadow receiveShadow>
          <dodecahedronGeometry args={[r.scale, 1]} />
          <meshStandardMaterial color={idx % 2 === 0 ? "#475569" : "#334155"} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

export function Guardhouse() {
  return null;
}

export function Cistern() {
  return (
    <group position={[6, 0, -11]}>
      {/* Main tank body */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[5.5, 4.4, 4.5]} />
      </mesh>
      {/* Access hatch */}
      <mesh position={[0, 4.45, 0]} material={MAT_STEEL_FRAME}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 16]} />
      </mesh>
      {/* Inlet pipe stub */}
      <mesh position={[-2.8, 3.0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_STEEL_BLUE}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 12]} />
      </mesh>
      {/* Foundation */}
      <mesh position={[0, 0.12, 0]} receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[6.0, 0.24, 5.0]} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   🌊 Helper: Riverbank Shoreline Curve Function
   Calculates the exact Z-coordinate of the riverfront waterline
   matching the natural meander of the Pinacanauan River.
   ═══════════════════════════════════════════════════════════ */
export function getRiverBankZ(x: number): number {
  const u = (x + 130.0) / 270.0;
  const zCenter = 42.0 + Math.sin(u * Math.PI * 2.2) * 9.0;
  // Northern waterline edge of river channel facing the plant
  return zCenter - 12.0;
}

/* ═══════════════════════════════════════════════════════════
   🌊 TailraceFloodwall
   Reinforced concrete training walls flanking the central tailrace
   discharge channel from the powerhouse outfall (Z = 7.0m) down to
   the river confluence (Z = 26.0m - 29.8m), terminating into heavy
   bullnose piers that key into the riverfront floodwall.
   ═══════════════════════════════════════════════════════════ */
export function TailraceFloodwall() {
  const wallData = useMemo(() => {
    const sections = [];
    const NUM_SECTIONS = 6;
    for (let i = 0; i < NUM_SECTIONS; i++) {
      const zStart = 7.0 + i * 4.2;
      const zEnd = zStart + 4.2;
      const zMid = (zStart + zEnd) * 0.5;

      const yGroundL = sampleTerrainY(-8.8, zMid);
      const yGroundR = sampleTerrainY(8.8, zMid);

      // Crest slopes gracefully from EL. 195.50m (Y = 7.8m) at headwall to Y = 5.2m at river confluence
      const targetCrestL = 7.8 - (i / (NUM_SECTIONS - 1)) * 2.6;
      const targetCrestR = 7.8 - (i / (NUM_SECTIONS - 1)) * 2.6;

      const wallHL = Math.max(3.8, targetCrestL - yGroundL + 0.4);
      const wallHR = Math.max(3.8, targetCrestR - yGroundR + 0.4);

      sections.push({
        zMid,
        leftPos: [-8.8, yGroundL + wallHL * 0.5 - 0.2, zMid] as [number, number, number],
        leftArgs: [1.1, wallHL, 4.3] as [number, number, number],
        leftCapPos: [-8.8, yGroundL + wallHL + 0.1 - 0.2, zMid] as [number, number, number],
        rightPos: [8.8, yGroundR + wallHR * 0.5 - 0.2, zMid] as [number, number, number],
        rightArgs: [1.1, wallHR, 4.3] as [number, number, number],
        rightCapPos: [8.8, yGroundR + wallHR + 0.1 - 0.2, zMid] as [number, number, number],
      });
    }
    return sections;
  }, []);

  return (
    <group>
      {/* Left & Right Elevated Concrete Training Floodwalls */}
      {wallData.map((sec, idx) => (
        <group key={`tw-sec-${idx}`}>
          {/* Left Concrete Wall Segment */}
          <mesh position={sec.leftPos} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
            <boxGeometry args={sec.leftArgs} />
          </mesh>
          <mesh position={sec.leftCapPos} castShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[1.35, 0.22, sec.leftArgs[2] + 0.1]} />
          </mesh>
          {/* Right Concrete Wall Segment */}
          <mesh position={sec.rightPos} castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
            <boxGeometry args={sec.rightArgs} />
          </mesh>
          <mesh position={sec.rightCapPos} castShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[1.35, 0.22, sec.rightArgs[2] + 0.1]} />
          </mesh>
        </group>
      ))}

      {/* Heavy Substructure Footing Apron connecting to Powerhouse Substructure */}
      <mesh position={[0, 0.2, 7.5]} receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[18.7, 0.5, 3.0]} />
      </mesh>

      {/* Continuous OSHA Safety Yellow Crest Handrails on Training Walls */}
      {[-9.35, 9.35].map((xR, sideIdx) => (
        <group key={`tw-crest-rails-${sideIdx}`} position={[xR, 0, 0]}>
          {Array.from({ length: 6 }, (_, i) => {
            const zPos = 8.5 + i * 4.0;
            const crestY = 7.8 - (i / 5) * 2.6;
            return (
              <group key={`tw-crest-post-${i}`} position={[0, crestY, zPos]}>
                <mesh position={[0, 0.55, 0]} material={MAT_STEEL_RAILING}>
                  <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
                </mesh>
                <mesh position={[0, 1.1, 0]} material={MAT_YELLOW_SAFETY}>
                  <boxGeometry args={[0.06, 0.06, 4.1]} />
                </mesh>
                <mesh position={[0, 0.55, 0]} material={MAT_STEEL_RAILING}>
                  <boxGeometry args={[0.04, 0.04, 4.1]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   🌊 TailraceFloodgate — Unified Monolithic Floodwall & Vertical-Lift Gate
   
   Architecture (Plan View):
                          POWERHOUSE
                     ┌─────────────────┐
                     │    Tailrace     │
   ◄── WEST WALL ────┤   (open flow)   ├──── EAST WALL ──►
   X=-55  to  X=-8.8 │    ║ GATE ║    │ X=+8.8  to  X=+55
   Along riverbank Z  └─────────────────┘ Along riverbank Z
                          ↓ RIVER ↓
   
   - Each floodwall runs ALONG the riverbank (X-direction)
     at Z = getRiverBankZ(x), blocking flood surges from reaching
     the powerhouse facility.
   - One single monolithic wall per side (no segments).
   - Central vertical-lift gate at the tailrace-river confluence.
   ═══════════════════════════════════════════════════════════ */

/** Single unified floodwall along the riverbank on one side of the tailrace */
function UnifiedFloodwall({ side }: { side: "west" | "east" }) {
  const isWest = side === "west";

  // Always order endpoints from West-most (-X) to East-most (+X) for uniform world-space normals
  const xStart = isWest ? -55.0 : 8.8;
  const xEnd = isWest ? -8.8 : 55.0;

  // Calculate riverbank Z at both endpoints
  const zStart = getRiverBankZ(xStart) - 0.8;
  const zEnd = getRiverBankZ(xEnd) - 0.8;

  // Wall geometry: single straight line from West to East
  const xMid = (xStart + xEnd) * 0.5;
  const zMid = (zStart + zEnd) * 0.5;
  const wallLength = Math.hypot(xEnd - xStart, zEnd - zStart);
  const wallAngle = Math.atan2(zEnd - zStart, xEnd - xStart);

  // Sample terrain along wall path for proper vertical anchoring
  const { yMin, yMax } = useMemo(() => {
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = xStart + (xEnd - xStart) * t;
      const z = zStart + (zEnd - zStart) * t;
      const y = sampleTerrainY(x, z);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { yMin: minY, yMax: maxY };
  }, [xStart, xEnd, zStart, zEnd]);

  // Wall dimensions: massive, imposing flood defense
  const wallBase = yMin - 2.0;       // Foundation 2m below grade
  const crestElev = yMax + 6.5;      // Crest 6.5m above highest ground
  const wallHeight = crestElev - wallBase;
  const wallThickness = 1.8;         // 1.8m thick reinforced concrete
  const yCenter = (crestElev + wallBase) * 0.5;

  // Buttress positions (every ~10m along wall length, on land side = away from river)
  const buttressSpacing = 10.0;
  const numButtresses = Math.floor(wallLength / buttressSpacing) + 1;

  // Land-side offset for buttresses (toward powerhouse, away from river)
  const landDirZ = -1; // Buttresses face toward powerhouse (negative Z)

  return (
    <group position={[xMid, 0, zMid]} rotation={[0, -wallAngle, 0]}>
      {/* ─── A. Main Monolithic Concrete Wall Body ─── */}
      <mesh
        position={[0, yCenter, 0]}
        castShadow
        receiveShadow
        material={MAT_CONCRETE_PRIMARY}
      >
        <boxGeometry args={[wallLength + 0.5, wallHeight, wallThickness]} />
      </mesh>

      {/* ─── B. Waterline Staining / Wet Splash Band (river side, lower 2.5m) ─── */}
      <mesh
        position={[0, yMin + 1.0, 0.05]}
        material={MAT_CONCRETE_DARK}
      >
        <boxGeometry args={[wallLength + 0.55, 2.5, wallThickness + 0.06]} />
      </mesh>

      {/* ─── C. Structural Buttress Piers (land side) ─── */}
      {Array.from({ length: numButtresses }, (_, idx) => {
        const localX = -wallLength * 0.5 + idx * buttressSpacing;
        const buttressH = wallHeight - 1.0;
        return (
          <group key={`buttress-${side}-${idx}`} position={[localX, wallBase + buttressH * 0.5 + 0.5, landDirZ * (wallThickness * 0.5 + 0.9)]}>
            {/* Buttress stem */}
            <mesh castShadow receiveShadow material={MAT_CONCRETE_LIGHT}>
              <boxGeometry args={[1.2, buttressH, 1.8]} />
            </mesh>
            {/* Buttress haunch */}
            <mesh position={[0, buttressH * 0.35, landDirZ * -0.4]} material={MAT_CONCRETE_HEADER}>
              <boxGeometry args={[1.0, buttressH * 0.3, 1.0]} />
            </mesh>
          </group>
        );
      })}

      {/* ─── D. Drainage Weepholes (river side, staggered) ─── */}
      {Array.from({ length: numButtresses }, (_, idx) => {
        const localX = -wallLength * 0.5 + idx * buttressSpacing;
        return (
          <group key={`weep-${side}-${idx}`}>
            {[0, 1].map((row) => (
              <mesh
                key={`weep-pipe-${side}-${idx}-${row}`}
                position={[
                  localX + (row === 1 ? buttressSpacing * 0.5 : 0),
                  yMin + 1.6 + row * 2.2,
                  wallThickness * 0.5 + 0.02,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
                material={MAT_STEEL_DARK}
              >
                <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* ─── E. Coping Cap (continuous top cap with drip edge) ─── */}
      <mesh
        position={[0, crestElev + 0.15, 0]}
        castShadow
        material={MAT_CONCRETE_HEADER}
      >
        <boxGeometry args={[wallLength + 0.8, 0.3, wallThickness + 0.5]} />
      </mesh>

      {/* ─── F. Safety Handrail System along crest ─── */}
      <group position={[0, crestElev + 0.3, landDirZ * 0.5]}>
        {/* Top rail (yellow) */}
        <mesh position={[0, 1.05, 0]} material={MAT_YELLOW_SAFETY}>
          <boxGeometry args={[wallLength + 0.5, 0.05, 0.05]} />
        </mesh>
        {/* Mid rail */}
        <mesh position={[0, 0.55, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[wallLength + 0.5, 0.04, 0.04]} />
        </mesh>
        {/* Vertical posts */}
        {Array.from({ length: Math.ceil(wallLength / 3) + 1 }, (_, i) => {
          const px = -wallLength * 0.5 + i * 3.0;
          if (px > wallLength * 0.5 + 0.5) return null;
          return (
            <mesh key={`rail-post-${side}-${i}`} position={[px, 0.55, 0]} material={MAT_STEEL_RAILING}>
              <boxGeometry args={[0.04, 1.1, 0.04]} />
            </mesh>
          );
        })}
      </group>

      {/* ─── G. Wall End Pilasters (flared ends for architectural finish) ─── */}
      {[-wallLength * 0.5 - 0.2, wallLength * 0.5 + 0.2].map((endX, i) => (
        <mesh
          key={`pilaster-${side}-${i}`}
          position={[endX, yCenter, 0]}
          castShadow
          material={MAT_CONCRETE_HEADER}
        >
          <boxGeometry args={[0.8, wallHeight + 0.2, wallThickness + 0.4]} />
        </mesh>
      ))}
    </group>
  );
}


/** Heavy rounded bullnose concrete piers at the confluence corners (X = ±8.8m) */
function ConfluenceTerminalPiers() {
  return (
    <group>
      {[-8.8, 8.8].map((xPier, i) => {
        const zPier = getRiverBankZ(xPier) - 0.8;
        const yGround = sampleTerrainY(xPier, zPier);
        return (
          <group key={`confl-pier-${i}`} position={[xPier, yGround, zPier]}>
            {/* Bullnose cylindrical concrete column */}
            <mesh position={[0, 2.2, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
              <cylinderGeometry args={[1.1, 1.3, 6.4, 16]} />
            </mesh>
            {/* Pier cap header with chamfer */}
            <mesh position={[0, 5.5, 0]} castShadow material={MAT_CONCRETE_HEADER}>
              <cylinderGeometry args={[1.35, 1.35, 0.35, 16]} />
            </mesh>
            {/* Warning beacon / navigation lantern */}
            <group position={[0, 5.7, 0]}>
              <mesh material={MAT_STEEL_DARK}>
                <cylinderGeometry args={[0.08, 0.08, 0.2, 8]} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.25, 12]} />
                <meshStandardMaterial
                  color="#F59E0B"
                  emissive="#F59E0B"
                  emissiveIntensity={3.0}
                  roughness={0.1}
                />
              </mesh>
            </group>
            {/* Riverfront safety floodlight */}
            <mesh position={[0, 7.0, 0]} material={MAT_STEEL_DARK}>
              <cylinderGeometry args={[0.05, 0.07, 2.6, 8]} />
            </mesh>
            <group position={[i === 0 ? 0.3 : -0.3, 8.2, 0]} rotation={[0.35, 0, i === 0 ? -0.3 : 0.3]}>
              <mesh castShadow material={MAT_SITE_FLOODLIGHT_BODY}>
                <boxGeometry args={[0.45, 0.3, 0.22]} />
              </mesh>
              <mesh position={[0, 0, 0.12]} material={MAT_HEADLIGHT_ON}>
                <planeGeometry args={[0.4, 0.24]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Animated floodwall effects — mist spray, waterline foam, pulsing warning lights */
function FloodwallAnimatedEffects() {
  const pointsRef = useRef<THREE.Points>(null);
  const foamGroupRef = useRef<THREE.Group>(null);
  const beaconGroupRef = useRef<THREE.Group>(null);
  const PARTICLE_COUNT = 300;

  // Procedural water droplet sprite texture
  const splashTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.3, "rgba(224, 242, 254, 0.85)");
      grad.addColorStop(0.7, "rgba(186, 230, 253, 0.35)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Define impact zones along the riverbank where both walls sit
  const impactZones = useMemo(() => {
    const zones: Array<{ x: number; z: number; span: number; isConfluence?: boolean }> = [];
    // West wall waterline (along riverbank from X=-8.8 to X=-55)
    for (const wx of [-12.0, -22.0, -32.0, -42.0, -50.0]) {
      zones.push({ x: wx, z: getRiverBankZ(wx) - 0.5, span: 6.0 });
    }
    // Confluence outfall corners (where water discharges from tailrace into river)
    zones.push({ x: -8.8, z: getRiverBankZ(-8.8) - 0.5, span: 3.0, isConfluence: true });
    zones.push({ x: 8.8, z: getRiverBankZ(8.8) - 0.5, span: 3.0, isConfluence: true });
    // East wall waterline (along riverbank from X=+8.8 to X=+55)
    for (const ex of [12.0, 22.0, 32.0, 42.0, 50.0]) {
      zones.push({ x: ex, z: getRiverBankZ(ex) - 0.5, span: 6.0 });
    }
    return zones;
  }, []);

  // Particle state
  const particles = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const life = new Float32Array(PARTICLE_COUNT);
    const maxLife = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const zone = impactZones[i % impactZones.length];
      const yWater = sampleTerrainY(zone.x, zone.z) + 0.5;
      pos[i * 3] = zone.x + (Math.random() - 0.5) * zone.span;
      pos[i * 3 + 1] = yWater;
      pos[i * 3 + 2] = zone.z + (Math.random() - 0.5) * 2.0;
      vel[i * 3] = 0; vel[i * 3 + 1] = 0; vel[i * 3 + 2] = 0;
      life[i] = Math.random() * 1.5;
      maxLife[i] = 1.0 + Math.random() * 1.2;
    }
    return { pos, vel, life, maxLife };
  }, [impactZones]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    const waveSurge = Math.sin(t * 2.2);
    const stormPulse = Math.sin(t * 0.75);
    const isMajor = stormPulse > 0.65;

    // Particle physics
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.life[i] -= dt;

        if (particles.life[i] <= 0) {
          const zone = impactZones[i % impactZones.length];
          const yWater = sampleTerrainY(zone.x, zone.z) + 0.5;
          const phase = Math.sin(t * 2.4 + zone.x * 0.15 + zone.z * 0.1);

          if (phase > 0.25 || isMajor) {
            particles.life[i] = particles.maxLife[i];
            posArr[i * 3] = zone.x + (Math.random() - 0.5) * zone.span;
            posArr[i * 3 + 1] = yWater + Math.random() * 0.3;
            posArr[i * 3 + 2] = zone.z + (Math.random() - 0.5) * 1.5;

            const energy = (zone.isConfluence || isMajor ? 1.4 : 1.0) * (0.8 + Math.random() * 0.5);
            particles.vel[i * 3] = (Math.random() - 0.5) * 2.0;
            particles.vel[i * 3 + 1] = (4.0 + Math.random() * 5.0) * energy;
            particles.vel[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
          } else {
            particles.life[i] = 0.15;
            posArr[i * 3 + 1] = yWater;
            particles.vel[i * 3 + 1] = 0;
          }
        } else {
          particles.vel[i * 3 + 1] -= 9.8 * dt;
          particles.vel[i * 3] *= (1.0 - 0.5 * dt);
          particles.vel[i * 3 + 2] *= (1.0 - 0.4 * dt);

          posArr[i * 3] += particles.vel[i * 3] * dt;
          posArr[i * 3 + 1] += particles.vel[i * 3 + 1] * dt;
          posArr[i * 3 + 2] += particles.vel[i * 3 + 2] * dt;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate foam swell sheets
    if (foamGroupRef.current) {
      foamGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const phase = Math.sin(t * 2.2 + idx * 0.7);
        const swell = Math.max(0.1, 0.6 + phase * 0.55 + (isMajor ? 0.5 : 0.0));
        mesh.scale.set(1.0 + phase * 0.15, swell, 1.0);
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = THREE.MathUtils.lerp(0.3, 0.85, Math.max(0, phase));
        }
      });
    }

    // Animate pulsing warning beacons
    if (beaconGroupRef.current) {
      beaconGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          const pulse = Math.sin(t * 3.5 + idx * 1.2) * 0.5 + 0.5;
          mesh.material.emissiveIntensity = 1.0 + pulse * 4.0;
        }
      });
    }
  });

  return (
    <group>
      {/* Spray particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles.pos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          map={splashTexture || undefined}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#F0F9FF"
        />
      </points>

      {/* Waterline foam swell sheets */}
      <group ref={foamGroupRef}>
        {impactZones.map((zone, idx) => {
          const yWater = sampleTerrainY(zone.x, zone.z) + 0.7;
          return (
            <mesh
              key={`foam-${idx}`}
              position={[zone.x, yWater + 0.3, zone.z]}
              rotation={[-0.1, 0, 0]}
            >
              <planeGeometry args={[zone.isConfluence ? 4.2 : 3.5, 1.4]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#BAE6FD"
                emissiveIntensity={0.6}
                transparent
                opacity={0.7}
                roughness={0.1}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* Pulsing warning beacons atop floodwall buttresses along riverbank */}
      <group ref={beaconGroupRef}>
        {[-20.0, -35.0, -50.0, 20.0, 35.0, 50.0].map((bx, bi) => {
          const bz = getRiverBankZ(bx) - 0.8;
          const yTop = sampleTerrainY(bx, bz) + 9.5;
          return (
            <mesh key={`beacon-${bx}-${bi}`} position={[bx, yTop, bz]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#EF4444"
                emissive="#EF4444"
                emissiveIntensity={3.0}
                roughness={0.1}
              />
            </mesh>
          );
        })}
      </group>

      {/* Tailrace confluence boiling foam */}
      {[-5.0, 0, 5.0].map((xR, i) => {
        const zR = getRiverBankZ(xR) + 0.8;
        const yR = sampleTerrainY(xR, zR) + 0.45;
        return (
          <mesh key={`plunge-roil-${i}`} position={[xR, yR, zR]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 2.2, 16]} />
            <meshStandardMaterial
              color="#F0FDFA"
              emissive="#38BDF8"
              emissiveIntensity={0.8}
              transparent
              opacity={0.6}
              roughness={0.2}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function TailraceFloodgate() {
  return (
    <group>
      {/* ═══ 1. POWERHOUSE DRAFT TUBE OUTLET STOPLOG SLOTS ═══ */}
      <group position={[0, 0, 6.8]}>
        <mesh position={[0, 6.4, 0.2]} castShadow material={MAT_STEEL_FRAME}>
          <boxGeometry args={[12.4, 0.26, 0.22]} />
        </mesh>
        {[-5.4, -1.8, 1.8, 5.4].map((xBrk, i) => (
          <mesh key={`dt-brk-${i}`} position={[xBrk, 6.55, 0.05]} material={MAT_STEEL_DARK}>
            <boxGeometry args={[0.22, 0.55, 0.28]} />
          </mesh>
        ))}
        <group position={[0, 6.0, 0.2]}>
          <mesh castShadow material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.75, 0.45, 0.5]} />
          </mesh>
          <mesh position={[0, -0.4, 0]} material={MAT_STEEL_DARK}>
            <cylinderGeometry args={[0.02, 0.02, 0.55, 8]} />
          </mesh>
          <mesh position={[0, -0.72, 0]} material={MAT_YELLOW_SAFETY}>
            <boxGeometry args={[0.22, 0.26, 0.15]} />
          </mesh>
        </group>
        {[-5.4, -1.8, 1.8, 5.4].map((xSlot, i) => (
          <mesh key={`dt-slot-${i}`} position={[xSlot, 2.4, 0.05]} material={MAT_FOOD_STAINLESS_TRAY}>
            <boxGeometry args={[0.16, 4.8, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* ═══ 2. WEST UNIFIED MONOLITHIC FLOODWALL (Riverbank X = -8.8m to -55m) ═══ */}
      <UnifiedFloodwall side="west" />

      {/* ═══ 3. EAST UNIFIED MONOLITHIC FLOODWALL (Riverbank X = +8.8m to +55m) ═══ */}
      <UnifiedFloodwall side="east" />

      {/* ═══ 4. CONFLUENCE CORNER TERMINAL PIERS (X = ±8.8m) ═══ */}
      <ConfluenceTerminalPiers />

      {/* ═══ 5. ANIMATED EFFECTS (spray, foam, beacons, tailrace plunge roils) ═══ */}
      <FloodwallAnimatedEffects />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   ElectricalBusSystem
   3D Generator IPB Busducts, Cable Bus Bridge, Switchyard 69kV
   Tubular Busbars, Steel Gantry Towers, and Transmission Takeoff.
   ═══════════════════════════════════════════════════════════ */

export function ElectricalBusSystem({ isXRay = false }: { isXRay?: boolean }) {
  const wireMat = (
    <meshStandardMaterial
      color="#00F0FF"
      emissive="#00F0FF"
      emissiveIntensity={isXRay ? 3.0 : 1.8}
      roughness={0.1}
      metalness={0.9}
    />
  );

  return (
    <group>
      {/* ═══ 1. INTERIOR GENERATOR ISOLATED PHASE BUS (IPB) DUCTS ═══ */}
      {/* IPB duct from Big Turbine #1 (-4, 7.6, 0) along upper wall to East Wall Exit */}
      <mesh position={[-4, 7.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.8, 16]} />
        {wireMat}
      </mesh>
      <mesh position={[2.8, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 13.6, 16]} />
        {wireMat}
      </mesh>

      {/* IPB duct from Small Turbine #2 (4, 7.6, 0) up to wall IPB */}
      <mesh position={[4, 7.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 16]} />
        {wireMat}
      </mesh>

      {/* ═══ 2. EAST WALL BUSHING & CABLE CONDUIT TO SWITCHYARD ═══ */}
      {/* Wall Bushing Flange on East Powerhouse Wall (x = 9.6, y = 8.4, z = 0) */}
      <mesh position={[9.8, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* 100% CONNECTED 3-PHASE ELECTRICAL FEEDER BUSBAR SYSTEM */}
      {[-0.4, 0, 0.4].map((zOff, i) => {
        // A. Generator IPB Output: Powerhouse East Wall (9.8, 8.4, zOff) -> GSU Step-Up Transformer (22.0, 4.6, -3 + zOff)
        const pGen = new THREE.Vector3(9.8, 8.4, zOff);
        const pTr = new THREE.Vector3(22.0, 4.6, -3 + zOff);
        const pMidGen = new THREE.Vector3().addVectors(pGen, pTr).multiplyScalar(0.5);
        pMidGen.y -= 0.6;
        const curveGen = new THREE.CatmullRomCurve3([pGen, pMidGen, pTr]);

        // B. GSU Transformer HV Output (22.0, 4.6, -3 + zOff) -> SF6 Circuit Breaker (28.0, 4.6, -3 + zOff)
        const pBreaker = new THREE.Vector3(28.0, 4.6, -3 + zOff);
        const curveBus1 = new THREE.CatmullRomCurve3([
          pTr,
          new THREE.Vector3(22.0, 5.8, -3 + zOff),
          new THREE.Vector3(28.0, 5.8, -3 + zOff),
          pBreaker,
        ]);

        // C. SF6 Breaker Output (28.0, 5.8, -3 + zOff) -> Gantry 2 Top Takeoff Insulator (30.0, 11.0, (i - 1) * 4.5)
        const pGantryIns = new THREE.Vector3(30.0, 11.0, (i - 1) * 4.5);
        const curveRiser = new THREE.CatmullRomCurve3([
          pBreaker,
          new THREE.Vector3(29.0, 7.5, -3 + zOff),
          pGantryIns,
        ]);

        return (
          <group key={`substation-wire-${i}`}>
            {/* Feeder Conductor */}
            <mesh castShadow>
              <tubeGeometry args={[curveGen, 16, 0.05, 8, false]} />
              {wireMat}
            </mesh>
            {/* Overhead Busbar */}
            <mesh castShadow>
              <tubeGeometry args={[curveBus1, 16, 0.05, 8, false]} />
              {wireMat}
            </mesh>
            {/* Gantry Takeoff Riser Conductor */}
            <mesh castShadow>
              <tubeGeometry args={[curveRiser, 16, 0.05, 8, false]} />
              {wireMat}
            </mesh>
          </group>
        );
      })}

      {/* Circuit Breaker Bushings (x = 28, y = 4.6, z = -3) */}
      {[-0.5, 0, 0.5].map((offset, i) => (
        <mesh key={`cb-bush-${i}`} position={[28, 4.6, -3 + offset]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 1.0, 12]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.25} metalness={0.8} />
        </mesh>
      ))}

      {/* ═══ 4. STEEL GANTRY TOWERS & OVERHEAD GRID TRANSMISSION TAKEOFF ═══ */}
      {/* Gantry A-Frame Lattice Tower 1 (West Switchyard Side, x = 20, z = 0) */}
      <group position={[20, 2.0, 0]}>
        {/* Left Column */}
        <mesh position={[0, 4.5, -6]} rotation={[0.08, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Right Column */}
        <mesh position={[0, 4.5, 6]} rotation={[-0.08, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Top Crossarm */}
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 13.0]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
      </group>

      {/* Gantry A-Frame Lattice Tower 2 (East Switchyard Side, x = 30, z = 0) */}
      <group position={[30, 2.0, 0]}>
        {/* Left Column */}
        <mesh position={[0, 4.5, -6]} rotation={[0.08, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Right Column */}
        <mesh position={[0, 4.5, 6]} rotation={[-0.08, 0, 0.08]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, 9.0, 8]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
        {/* Top Crossarm */}
        <mesh position={[0, 9.0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.4, 13.0]} />
          <meshStandardMaterial color={isXRay ? "#38BDF8" : "#64748B"} roughness={0.25} metalness={0.8} transparent={isXRay} opacity={isXRay ? 0.85 : 1} />
        </mesh>
      </group>

      {/* 69kV Overhead Grid 3-Phase Multi-Tower Transmission Line Spans */}
      <DynamicTransmissionSpan />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   DynamicTransmissionSpan & Multi-Tower Transmission System
   3-Phase High-Voltage Catenary Conductors spanning continuously
   between Switchyard Gantry, Tower 1, Tower 2, and Tower 3 Grid Line
   ═══════════════════════════════════════════════════════════ */
function DynamicTransmissionSpan() {
  const linePulseRef = useRef<THREE.Group>(null);

  // Terrain Y sampled at exact tower world locations (local x + 12.0)
  const t1Y = useMemo(() => sampleTerrainY(42.0, -35.0), []);
  const t2Y = useMemo(() => sampleTerrainY(22.0, -75.0), []);
  const t3Y = useMemo(() => sampleTerrainY(-3.0, -120.0), []);

  useFrame(({ clock }) => {
    if (linePulseRef.current) {
      linePulseRef.current.position.z = -((clock.getElapsedTime() * 18.0) % 120.0);
    }
  });

  const phases = [-4.5, 0, 4.5];

  return (
    <group>
      {/* 3 Lattice Transmission Towers Aligned along Grid Corridor */}
      <TransmissionTakeoffTower position={[30.0, t1Y, -35.0]} label="T1 Takeoff Pylon" />
      <TransmissionTakeoffTower position={[10.0, t2Y, -75.0]} label="T2 Ridge Pylon" />
      <TransmissionTakeoffTower position={[-15.0, t3Y, -120.0]} label="T3 Interconnect Pylon" />

      {/* 3-Phase Continuous Catenary Wire Spans */}
      {phases.map((zOffset, i) => {
        // Local Attachment Points
        const p0 = new THREE.Vector3(30.0, 11.0, zOffset); // Switchyard Gantry 2 Insulator
        const p1 = new THREE.Vector3(30.0, t1Y + 11.4, -35.0 + zOffset); // Tower 1 Insulator
        const p2 = new THREE.Vector3(10.0, t2Y + 11.4, -75.0 + zOffset); // Tower 2 Insulator
        const p3 = new THREE.Vector3(-15.0, t3Y + 11.4, -120.0 + zOffset); // Tower 3 Insulator

        // Span 1: Gantry 2 -> Tower 1
        const pMid1 = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
        pMid1.y -= 1.0;
        const curve1 = new THREE.CatmullRomCurve3([p0, pMid1, p1]);

        // Span 2: Tower 1 -> Tower 2
        const pMid2 = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        pMid2.y -= 1.8;
        const curve2 = new THREE.CatmullRomCurve3([p1, pMid2, p2]);

        // Span 3: Tower 2 -> Tower 3 (National Grid Line Interconnect)
        const pMid3 = new THREE.Vector3().addVectors(p2, p3).multiplyScalar(0.5);
        pMid3.y -= 2.4;
        const curve3 = new THREE.CatmullRomCurve3([p2, pMid3, p3]);

        return (
          <group key={`tx-phase-${i}`}>
            <mesh castShadow>
              <tubeGeometry args={[curve1, 20, 0.05, 8, false]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.15} metalness={0.9} emissive="#00F0FF" emissiveIntensity={0.6} />
            </mesh>
            <mesh castShadow>
              <tubeGeometry args={[curve2, 28, 0.05, 8, false]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.15} metalness={0.9} emissive="#00F0FF" emissiveIntensity={0.6} />
            </mesh>
            <mesh castShadow>
              <tubeGeometry args={[curve3, 32, 0.05, 8, false]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.15} metalness={0.9} emissive="#00F0FF" emissiveIntensity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   TransmissionTakeoffTower
   Steel lattice transmission pylon anchored flush to terrain
   with concrete foundation pad and insulator crossarms.
   ═══════════════════════════════════════════════════════════ */

export function TransmissionTakeoffTower({
  position = [30.0, 15.0, -35.0],
}: {
  position?: [number, number, number];
  label?: string;
}) {
  return (
    <group position={position}>
      {/* Heavy Reinforced Concrete Foundation Pad Anchored to Hillside */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 0.8, 5.2]} />
        <meshStandardMaterial color="#64748B" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Foundation Steel Anchor Plates */}
      {[-2.0, 2.0].map((x, i) =>
        [-2.0, 2.0].map((z, j) => (
          <mesh key={`anc-${i}-${j}`} position={[x, 0.85, z]} castShadow>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
          </mesh>
        ))
      )}

      {/* Steel Lattice Transmission Tower (A-Frame 4 legs) */}
      <mesh position={[-1.6, 6.0, -1.6]} rotation={[0.06, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[1.6, 6.0, -1.6]} rotation={[0.06, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[-1.6, 6.0, 1.6]} rotation={[-0.06, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[1.6, 6.0, 1.6]} rotation={[-0.06, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 12.0, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Lattice Crossbracing */}
      {[3, 6, 9].map((y, i) => (
        <mesh key={`br-${i}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[2.8 - i * 0.4, 0.12, 2.8 - i * 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Top Crossarm (holds the 3-phase 69kV transmission lines) */}
      <mesh position={[0, 12.0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 13.0]} />
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* High-Voltage Porcelain Insulator Strings (3 sets) */}
      {[-4.5, 0, 4.5].map((z, i) => (
        <group key={`ins-${i}`} position={[0, 11.4, z]}>
          <mesh castShadow material={MAT_INSULATOR_AMBER}>
            <cylinderGeometry args={[0.08, 0.14, 0.8, 12]} />
          </mesh>
          <pointLight color="#00F0FF" intensity={2.5} distance={6} />
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticSurgeTank
   Reinforced concrete cylindrical surge shaft tower built in
   16 concrete lifts, with headrace tunnel portal, scaffolding,
   and safety netting — modeled directly from project site photos.
   ═══════════════════════════════════════════════════════════ */

export function RealisticSurgeTank({ isXRay = false }: { isXRay?: boolean }) {
  const stMat = (baseColor: string) => (
    <meshStandardMaterial
      color={isXRay ? "#00F0FF" : baseColor}
      wireframe={isXRay}
      transparent={isXRay}
      opacity={isXRay ? 0.35 : 1.0}
      emissive={isXRay ? "#00F0FF" : "#000000"}
      emissiveIntensity={isXRay ? 0.35 : 0}
      roughness={isXRay ? 0.1 : 0.9}
      metalness={isXRay ? 0.9 : 0.05}
      depthWrite={!isXRay}
    />
  );

  return (
    <group position={[-6, 17.5, -26]}>
      {/* Heavy Square Concrete Foundation Pad */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.5, 0.8, 8.5]} />
        {stMat("#8A8580")}
      </mesh>

      {/* 16 Concrete Lifts — Main Cylindrical Shaft Tower (EL. 271.46m) */}
      <mesh position={[0, 6.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.3, 11.2, 32]} />
        {stMat("#B8B4AE")}
      </mesh>

      {/* 16 Concrete Lift Grooves / Ring Segments */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`lift-${i}`} position={[0, 1.2 + i * 0.7, 0]} castShadow>
          <cylinderGeometry args={[3.26, 3.26, 0.08, 32]} />
          {stMat("#9E9A92")}
        </mesh>
      ))}

      {/* Scaffold & Safety Mesh Wrapping around Upper Lifts (Lifts 10-16) */}
      {!isXRay && (
        <group>
          {/* Green Safety Netting Curtain */}
          <mesh position={[0, 8.8, 0]}>
            <cylinderGeometry args={[3.6, 3.6, 6.0, 32, 1, true]} />
            <meshStandardMaterial color="#15803D" roughness={0.9} transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          {/* Steel Scaffolding Poles */}
          {Array.from({ length: 12 }, (_, i) => {
            const rad = (i * Math.PI * 2) / 12;
            return (
              <mesh key={`scaff-${i}`} position={[Math.sin(rad) * 3.65, 8.8, Math.cos(rad) * 3.65]}>
                <cylinderGeometry args={[0.04, 0.04, 6.2, 8]} />
                <meshStandardMaterial color="#64748B" roughness={0.3} metalness={0.8} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Top Rebar Cage & Formwork Steel Extensions */}
      <group position={[0, 12.3, 0]}>
        {Array.from({ length: 16 }, (_, i) => {
          const rad = (i * Math.PI * 2) / 16;
          return (
            <mesh key={`rebar-${i}`} position={[Math.sin(rad) * 3.1, 0.6, Math.cos(rad) * 3.1]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
              <meshStandardMaterial color="#D97706" roughness={0.3} metalness={0.8} />
            </mesh>
          );
        })}
      </group>

      {/* ═══ HEADRACE TUNNEL PORTAL INTO MOUNTAIN ROCK ═══ */}
      <group position={[-5.2, 1.5, -2]}>
        {/* Concrete Horseshoe Arch Portal */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 3.6, 2.5]} />
          {stMat("#78746D")}
        </mesh>
        {/* Dark Tunnel Opening */}
        <mesh position={[0, 1.5, 1.28]}>
          <planeGeometry args={[2.4, 2.6]} />
          <meshBasicMaterial color="#0B1013" />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   RealisticPenstockAssembly
   2.70m I.D. ASTM A516 Grade 60 Steel Penstock Pipe running down
   the 32° hillside trench with concrete shotcrete rock face,
   Upper/Lower Anchor Blocks (TB-01 / TB-04),intermediate saddle
   supports, and Y-bifurcation manifold into powerhouse.
   ═══════════════════════════════════════════════════════════ */

export function RealisticPenstockAssembly({ isXRay = false }: { isXRay?: boolean }) {
  const pipeColor = isXRay ? "#38BDF8" : "#2C343E";

  // Point A (Top Surge Tank Anchor Block) & Point B (Bottom Powerhouse Anchor Block)
  const pTop = useMemo(() => new THREE.Vector3(-6.0, 16.8, -24.5), []);
  const pBottom = useMemo(() => new THREE.Vector3(-4.2, 4.2, -7.5), []);

  const midPoint = useMemo(() => {
    return new THREE.Vector3().addVectors(pTop, pBottom).multiplyScalar(0.5);
  }, [pTop, pBottom]);

  const pipeLength = useMemo(() => {
    return pTop.distanceTo(pBottom);
  }, [pTop, pBottom]);

  const pipeQuaternion = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(pTop, pBottom).normalize();
    const up = new THREE.Vector3(0, 1, 0); // Cylinder Y-axis points along direction vector
    return new THREE.Quaternion().setFromUnitVectors(up, dir);
  }, [pTop, pBottom]);

  return (
    <group>
      {/* ═══ SHOTCRETE MOUNTAIN SLOPE TRENCH BED ═══ */}
      <mesh
        position={[midPoint.x, midPoint.y - 0.6, midPoint.z]}
        quaternion={pipeQuaternion}
        receiveShadow
      >
        <boxGeometry args={[4.8, pipeLength + 1.0, 0.4]} />
        <meshStandardMaterial color="#A39F97" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ═══ CONCRETE ANCHOR BLOCK 1 (TB-01 / Upper Anchor near Surge Tank) ═══ */}
      <mesh position={[-6.0, 16.5, -24.5]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 3.8, 4.2]} />
        <meshStandardMaterial color="#969288" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ═══ CONCRETE ANCHOR BLOCK 2 (TB-04 / Lower Anchor near Powerhouse) ═══ */}
      <mesh position={[-4.2, 4.0, -7.5]} castShadow receiveShadow>
        <boxGeometry args={[5.0, 4.2, 4.6]} />
        <meshStandardMaterial color="#969288" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* ═══ CONCRETE SADDLE SUPPORTS (5 intermediate supports along slope) ═══ */}
      {Array.from({ length: 5 }, (_, i) => {
        const t = (i + 1) / 6;
        const p = new THREE.Vector3().lerpVectors(pBottom, pTop, t);
        return (
          <mesh key={`saddle-${i}`} position={[p.x, p.y - 0.75, p.z]} castShadow receiveShadow>
            <boxGeometry args={[3.8, 1.4, 1.2]} />
            <meshStandardMaterial color="#8A8580" roughness={0.92} />
          </mesh>
        );
      })}

      {/* ═══ 2.70m MAIN STEEL PENSTOCK PIPE ═══ */}
      <mesh
        position={[midPoint.x, midPoint.y, midPoint.z]}
        quaternion={pipeQuaternion}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1.35, 1.35, pipeLength, 32]} />
        <meshStandardMaterial
          color={pipeColor}
          roughness={0.25}
          metalness={0.85}
          emissive={isXRay ? "#38BDF8" : "#000000"}
          emissiveIntensity={isXRay ? 0.5 : 0}
        />
      </mesh>

      {/* Blue Steel Expansion Joint & Welding Ring Flanges along Penstock */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        const p = new THREE.Vector3().lerpVectors(pBottom, pTop, t);
        return (
          <mesh key={`flange-${i}`} position={[p.x, p.y, p.z]} quaternion={pipeQuaternion} castShadow>
            <cylinderGeometry args={[1.45, 1.45, 0.35, 32]} />
            <meshStandardMaterial color="#1E5488" roughness={0.3} metalness={0.8} />
          </mesh>
        );
      })}

      {/* ═══ Y-BIFURCATION MANIFOLD (TB-03 / Branching into Powerhouse Rear Wall) ═══ */}
      <group position={[-4.2, 4.2, -6.6]}>
        {/* Left Branch Pipe -> Big Turbine #1 (-4, 6.0, 0) */}
        <mesh position={[-0.8, 0.4, 0.6]} rotation={[0.1, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 2.2, 24]} />
          <meshStandardMaterial color={pipeColor} roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Right Branch Pipe -> Small Turbine #2 (4, 6.0, 0) */}
        <mesh position={[0.8, 0.4, 0.6]} rotation={[0.1, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 2.2, 24]} />
          <meshStandardMaterial color={pipeColor} roughness={0.25} metalness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   SurgeTankHillside (Surge Tank Foundation & Civil Structures)
   Heavy reinforced concrete foundation ring, headrace portal
   anchor block, shotcrete retaining wall, and concrete penstock
   saddle supports seated directly on the GIS terrain bench.
   ═══════════════════════════════════════════════════════════ */

export function SurgeTankHillside() {
  return (
    <group>
      {/* ═══ 1. SURGE TANK HEAVY CONCRETE FOUNDATION SLAB ═══ */}
      {/* Main octagonal/circular reinforced concrete foundation ring (Y: 16.6 to 17.4) */}
      <mesh position={[-6, 17.0, -26]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <cylinderGeometry args={[4.6, 4.8, 0.8, 16]} />
      </mesh>
      {/* Concrete outer curb ring */}
      <mesh position={[-6, 17.45, -26]} castShadow receiveShadow material={MAT_CONCRETE_DARK}>
        <cylinderGeometry args={[4.8, 4.8, 0.15, 16]} />
      </mesh>

      {/* ═══ 2. HEADRACE TUNNEL PORTAL & UPPER ANCHOR BLOCK ═══ */}
      {/* Heavy concrete anchor block joining headrace tunnel & surge shaft */}
      <mesh position={[-6, 18.2, -29.5]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[7.5, 4.2, 4.5]} />
      </mesh>
      {/* Tunnel portal portal arch portal structure */}
      <mesh position={[-6, 18.5, -31.5]} castShadow receiveShadow material={MAT_CONCRETE_DARK}>
        <boxGeometry args={[6.0, 4.8, 1.2]} />
      </mesh>
      {/* Dark tunnel opening bore */}
      <mesh position={[-6, 18.2, -31.0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_STEEL_FRAME}>
        <cylinderGeometry args={[1.8, 1.8, 1.8, 16]} />
      </mesh>

      {/* ═══ 3. SHOTCRETE CUT-SLOPE RETAINING WALL ═══ */}
      {/* Anchored shotcrete retaining wall behind the surge tank terrace */}
      <mesh position={[-6, 19.8, -30.0]} rotation={[-0.15, 0, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[20.0, 5.5, 0.6]} />
      </mesh>
      {/* Coping cap on retaining wall top */}
      <mesh position={[-6, 22.5, -30.4]} rotation={[-0.15, 0, 0]} castShadow material={MAT_CONCRETE_LIGHT}>
        <boxGeometry args={[20.6, 0.25, 0.9]} />
      </mesh>
      {/* Rock bolt anchor plates (grid on retaining wall face) */}
      {[-8, -4, 0, 4, 8].map((xOff, i) => (
        <group key={`rb-col-${i}`}>
          {[18.5, 20.5].map((yVal, j) => (
            <mesh key={`rb-${i}-${j}`} position={[-6 + xOff, yVal, -29.6]} castShadow material={MAT_STEEL_RAILING}>
              <boxGeometry args={[0.3, 0.3, 0.1]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ═══ 4. PENSTOCK CONCRETE SADDLE BLOCKS (Along 32° slope) ═══ */}
      {/* Saddle 1 (Top / Surge Tank Junction): Z = -22.5, Y = 13.8 */}
      <mesh position={[-5.5, 13.5, -22.5]} rotation={[0.45, 0, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
      </mesh>
      {/* Saddle 2 (Mid-Upper Slope): Z = -18.0, Y = 9.8 */}
      <mesh position={[-5.1, 9.5, -18.0]} rotation={[0.45, 0, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
      </mesh>
      {/* Saddle 3 (Mid-Lower Slope): Z = -13.5, Y = 6.0 */}
      <mesh position={[-4.7, 5.7, -13.5]} rotation={[0.45, 0, 0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[3.2, 1.4, 1.8]} />
      </mesh>
      {/* Saddle 4 (Lower Anchor Block at Powerhouse back wall): Z = -9.0, Y = 2.2 */}
      <mesh position={[-4.3, 2.0, -9.0]} castShadow receiveShadow material={MAT_CONCRETE_PRIMARY}>
        <boxGeometry args={[3.8, 2.2, 2.4]} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   PenstockTrenchWalls
   Concrete-lined retaining walls flanking both sides of
   the penstock trench cut along the 32° mountain slope.
   ═══════════════════════════════════════════════════════════ */

export function PenstockTrenchWalls() {
  const segments = [
    { y: 15, z: -23, h: 4.5 },
    { y: 11, z: -19, h: 4.5 },
    { y: 7.5, z: -15, h: 4 },
    { y: 4.5, z: -11, h: 3.5 },
  ];

  return (
    <group>
      {/* West-side retaining walls (mountain-side) */}
      {segments.map((seg, i) => (
        <mesh key={`ptw-w-${i}`} position={[-10, seg.y, seg.z]} castShadow receiveShadow>
          <boxGeometry args={[0.5, seg.h, 4.5]} />
          <meshStandardMaterial color="#A39F97" roughness={0.93} metalness={0.04} />
        </mesh>
      ))}
      {/* East-side retaining walls (valley-side) */}
      {segments.map((seg, i) => (
        <mesh key={`ptw-e-${i}`} position={[-1, seg.y, seg.z]} castShadow receiveShadow>
          <boxGeometry args={[0.5, seg.h, 4.5]} />
          <meshStandardMaterial color="#A39F97" roughness={0.93} metalness={0.04} />
        </mesh>
      ))}
      {/* Coping caps on wall tops */}
      {segments.map((seg, i) => (
        <group key={`ptw-cap-${i}`}>
          <mesh position={[-10, seg.y + seg.h / 2 + 0.08, seg.z]} castShadow>
            <boxGeometry args={[0.8, 0.12, 4.7]} />
            <meshStandardMaterial color="#B0ACA3" roughness={0.88} metalness={0.06} />
          </mesh>
          <mesh position={[-1, seg.y + seg.h / 2 + 0.08, seg.z]} castShadow>
            <boxGeometry args={[0.8, 0.12, 4.7]} />
            <meshStandardMaterial color="#B0ACA3" roughness={0.88} metalness={0.06} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════
   AccessRoad — Natural Mountain Haul Road
   Natural unpaved mountain access track connecting Powerhouse (0.5m)
   up the Sierra Madre slope directly to the TEMFACIL Entrance Gate (14.0m).
   Features:
   - Natural vertex-colored packed earth & crushed river gravel
   - Smoothly blended shoulders matching the Sierra Madre forest terrain
   - Terminates cleanly at TEMFACIL entrance with zero intrusion into compound
   ═══════════════════════════════════════════════════════════ */

export function AccessRoad() {
  const roadGeometry = useMemo(() => {
    const SEGMENTS = 90;
    const pts = UPHILL_ROAD_SPLINE.getSpacedPoints(SEGMENTS);
    const tangents = pts.map((_, i) => UPHILL_ROAD_SPLINE.getTangentAt(i / SEGMENTS).normalize());

    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Cross-section profile offsets across road width (from outer left shoulder to outer right shoulder)
    const profileOffsets = [-4.6, -3.2, -1.6, 0.0, 1.6, 3.2, 4.6];
    const NUM_COLS = profileOffsets.length; // 7 vertices per row

    // Base color tones for natural mountain haul road blending
    const cForestGrass = new THREE.Color(0.24, 0.32, 0.18); // Sierra Madre forest grass
    const cDryEarth = new THREE.Color(0.50, 0.44, 0.35);     // Packed dry mountain dirt
    const cCompactedRut = new THREE.Color(0.40, 0.34, 0.25); // Darkened compacted wheel rut

    for (let i = 0; i <= SEGMENTS; i++) {
      const p = pts[i];
      const tan = tangents[i];
      const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const u = i / SEGMENTS;

      // End transition blend (fades naturally into Powerhouse yard and TEMFACIL compound entrance)
      let endBlend = 1.0;
      if (u < 0.05) endBlend = u / 0.05;
      else if (u > 0.95) endBlend = (1.0 - u) / 0.05;

      for (let col = 0; col < NUM_COLS; col++) {
        const lateralDist = profileOffsets[col];
        const px = p.x + norm.x * lateralDist;
        const pz = p.z + norm.z * lateralDist;
        const py = sampleTerrainY(px, pz) + 0.025; // 2.5cm terrain drape

        positions.push(px, py, pz);
        uvs.push(col / (NUM_COLS - 1), (u * 18.0));

        // Vertex Color calculation based on cross-section position
        const colColor = new THREE.Color();
        const absDist = Math.abs(lateralDist);

        if (absDist > 3.6) {
          // Outer shoulder: blend between forest grass and dry dirt
          const tShoulder = (absDist - 3.6) / 1.0;
          colColor.lerpColors(cDryEarth, cForestGrass, tShoulder);
        } else if (Math.abs(absDist - 1.6) < 0.8) {
          // Wheel rut zones (left & right travel tracks)
          const tRut = 1.0 - Math.abs(absDist - 1.6) / 0.8;
          colColor.lerpColors(cDryEarth, cCompactedRut, tRut * 0.7);
        } else {
          // Center and inner carriageway
          colColor.copy(cDryEarth);
        }

        // Apply endpoint blend
        if (endBlend < 1.0) {
          colColor.lerp(cForestGrass, 1.0 - endBlend);
        }

        colors.push(colColor.r, colColor.g, colColor.b);
      }

      // Build quad indices
      if (i < SEGMENTS) {
        const row1 = i * NUM_COLS;
        const row2 = (i + 1) * NUM_COLS;

        for (let col = 0; col < NUM_COLS - 1; col++) {
          const a = row1 + col;
          const b = row1 + col + 1;
          const c = row2 + col;
          const d = row2 + col + 1;

          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* Natural Mountain Haul Road Surface (Conforming directly to Sierra Madre terrain) */}
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0.01}
          flatShading={false}
        />
      </mesh>
    </group>
  );
}

export function PerimeterFence() {
  const southY = useMemo(() => sampleTerrainY(5, 14.5), []);
  const eastY = useMemo(() => sampleTerrainY(40, 8), []);
  const westY = useMemo(() => sampleTerrainY(-20, 8), []);

  return (
    <group>
      {/* ═══ SOUTH FENCE: FAR-WEST WING (From West Boundary X=-27.5m to West Flood Wall Abutment X=-24.0m) ═══ */}
      <group position={[-25.75, southY, 14.5]}>
        {/* Concrete Footing Header Base */}
        <mesh position={[0, 0.1, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[3.5, 0.2, 0.25]} />
        </mesh>
        {/* Chain-Link Mesh Barrier Panel */}
        <mesh position={[0, 1.3, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[3.4, 2.2, 0.04]} />
        </mesh>
        {/* Galvanized Steel Fence Posts */}
        <group position={[-1.7, 0, 0]}>
          <mesh position={[0, 0.2, 0]} receiveShadow material={MAT_CONCRETE_HEADER}>
            <boxGeometry args={[0.28, 0.35, 0.28]} />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow material={MAT_STEEL_RAILING}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
          </mesh>
        </group>
        {/* Top & Bottom Tension Rails */}
        <mesh position={[0, 2.35, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[3.5, 0.06, 0.06]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[3.5, 0.06, 0.06]} />
        </mesh>
        {/* Heavy End Gatepost anchoring to West Flood Wall (X=-24.0m) */}
        <mesh position={[1.75, 1.3, 0]} castShadow material={MAT_YELLOW_SAFETY}>
          <cylinderGeometry args={[0.10, 0.10, 2.6, 8]} />
        </mesh>
      </group>

      {/* ═══ SOUTH FENCE: FAR-EAST WING (From Road Portal X=36.0m to East Boundary X=40.0m) ═══ */}
      <group position={[38.0, southY, 14.5]}>
        <mesh position={[0, 0.1, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[4.0, 0.2, 0.25]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[3.9, 2.2, 0.04]} />
        </mesh>
        {/* Heavy End Gatepost (Portal Right Side at X=36.0m) */}
        <mesh position={[-2.0, 1.3, 0]} castShadow material={MAT_YELLOW_SAFETY}>
          <cylinderGeometry args={[0.10, 0.10, 2.6, 8]} />
        </mesh>
        <mesh position={[2.0, 1.3, 0]} castShadow material={MAT_STEEL_RAILING}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
        </mesh>
        <mesh position={[0, 2.35, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[4.0, 0.06, 0.06]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[4.0, 0.06, 0.06]} />
        </mesh>
      </group>

      {/* ═══ EAST FENCE ═══ */}
      <group position={[40, eastY, 4]}>
        <mesh position={[0, 0.1, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[0.25, 0.2, 22]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.04, 2.2, 21.8]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={`efp-${i}`} position={[0, 0, -10 + i * 4.2]}>
            <mesh position={[0, 0.2, 0]} receiveShadow material={MAT_CONCRETE_HEADER}>
              <boxGeometry args={[0.28, 0.35, 0.28]} />
            </mesh>
            <mesh position={[0, 1.3, 0]} castShadow material={MAT_STEEL_RAILING}>
              <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.35, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[0.06, 0.06, 22]} />
        </mesh>
      </group>

      {/* ═══ WEST FENCE ═══ */}
      <group position={[-20, westY, 4]}>
        <mesh position={[0, 0.1, 0]} receiveShadow material={MAT_CONCRETE_SLAB}>
          <boxGeometry args={[0.25, 0.2, 22]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={MAT_STEEL_DARK}>
          <boxGeometry args={[0.04, 2.2, 21.8]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={`wfp-${i}`} position={[0, 0, -10 + i * 4.2]}>
            <mesh position={[0, 0.2, 0]} receiveShadow material={MAT_CONCRETE_HEADER}>
              <boxGeometry args={[0.28, 0.35, 0.28]} />
            </mesh>
            <mesh position={[0, 1.3, 0]} castShadow material={MAT_STEEL_RAILING}>
              <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.35, 0]} material={MAT_STEEL_RAILING}>
          <boxGeometry args={[0.06, 0.06, 22]} />
        </mesh>
      </group>
    </group>
  );
}
