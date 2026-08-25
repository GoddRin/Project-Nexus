"use client";

import React, { Suspense, useRef, useState, useMemo, useEffect } from "react";

// WebGL Context Attributes Polyfill to prevent EffectComposer 'null (reading alpha)' on context loss / HMR
if (typeof window !== "undefined") {
  const patchContext = (proto: any) => {
    if (proto && proto.getContextAttributes) {
      const orig = proto.getContextAttributes;
      proto.getContextAttributes = function () {
        const res = orig.call(this);
        return res || { alpha: true, depth: true, stencil: false, antialias: false, premultipliedAlpha: true };
      };
    }
  };
  if (typeof WebGLRenderingContext !== "undefined") patchContext(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== "undefined") patchContext(WebGL2RenderingContext.prototype);
}

import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Grid,
  Html,
  shaderMaterial,
  useGLTF,
  ContactShadows,
} from "@react-three/drei";
import { EffectComposer, Bloom, BrightnessContrast, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Camera,
  Eye,
  Zap,
  ScanEye,
  CloudRain,
  Activity,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ChevronDown,
  ChevronUp,
  Move,
  RotateCcw,
  Unlock,
  Lock,
  Building2,
  Car,
  Gamepad2,
  FlaskConical,
  Palette,
  Sun,
  SunMedium,
  Moon,
  Sunset,
  Users,
  ShieldAlert,
  Waves,
  Layers,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlantSceneLoading } from "./PlantSceneLoading";
import {
  RealisticPowerhouseBuilding,
  RealisticSwitchyard,
  MountainTerrain,
  TailraceWater,
  TailraceFloodwall,
  TailraceFloodgate,
  ElectricalBusSystem,
  RealisticSurgeTank,
  RealisticPenstockAssembly,
  SurgeTankHillside,
  PenstockTrenchWalls,
  AccessRoad,
  PerimeterFence,
} from "./PowerhouseGeometry";
import { TemfacilFacility } from "./TemfacilFacility";
import { ForestVegetation } from "./ForestVegetation";
import { ForestWildlife } from "./ForestWildlife";
import { AnimatedSiteEntities } from "./AnimatedSiteEntities";
import { SupercarEntity, type SupercarCustomization } from "./SupercarEntity";
import { GTAPlayerController } from "./GTAPlayerController";
import { LocomotionLaboratoryModal } from "./LocomotionLaboratoryModal";
import { FacilityHolographicBeaconLabel } from "./FacilityHolographicBeaconLabel";
import { SupercarConfiguratorOverlay } from "./SupercarConfiguratorOverlay";
import { PersonnelProfileModal } from "./PersonnelProfileModal";
import { EquipmentDetailDrawer, type EquipmentWithLocation } from "./EquipmentDetailDrawer";
import { getEquipmentByLocation } from "@/app/(dashboard)/dashboard/sitemap/actions";
import type { PagasaSignalData } from "@/lib/weather/pagasa";
import { isWithinPAR } from "@/lib/weather/gdacs";
import { RealisticSkyAtmosphere, type AtmosphereTimeMode } from "./RealisticSkyAtmosphere";
import { MountainAtmosphereEffects } from "./MountainAtmosphereEffects";
import { SiteAudioControls } from "./SiteAudioControls";
import { cn } from "@/lib/utils";

/**
 * Camera Preset Identifiers
 */
export type CameraPresetKey =
  | "overview"
  | "turbine-hall"
  | "switchyard"
  | "tailrace-floodgate"
  | "temfacil"
  | "temfacil-guardhouse"
  | "temfacil-barracks"
  | "temfacil-office";

/**
 * Flow Teal CSS color token value: #1FB6A6 (rgb(31, 182, 166))
 */
const FLOW_TEAL = "#1FB6A6";

/**
 * GLTF Model Node Structure
 */
type GLTFResult = {
  nodes: {
    Intake_Structure: THREE.Mesh;
    Penstock_Pipe: THREE.Mesh;
    TurbineHall_Shell: THREE.Mesh;
    Switchyard_Platform: THREE.Mesh;
  };
  materials: Record<string, THREE.Material>;
};

// Preload the Tumauini Powerhouse GLTF Model
useGLTF.preload("/models/tumauini_powerhouse.glb");

/**
 * Material presets for the plant GLTF geometry & scene elements.
 * Vibrant architectural metallic palette with crisp edge highlights.
 */
const MATERIALS = {
  powerhouse: {
    color: "#B8B4AE",
    roughness: 0.92,
    metalness: 0.05,
  },
  powerhouseRoof: {
    color: "#1E5488",
    roughness: 0.35,
    metalness: 0.82,
  },
  intake: {
    color: "#A8A49B",
    roughness: 0.9,
    metalness: 0.06,
  },
  penstock: {
    color: "#5A6A7A",
    roughness: 0.3,
    metalness: 0.65,
  },
  switchyardBase: {
    color: "#A8A49B",
    roughness: 0.9,
    metalness: 0.06,
  },
  switchyardEquipment: {
    color: "#7A8A9A",
    roughness: 0.25,
    metalness: 0.7,
  },
  groundPad: {
    color: "#5A6050",
    roughness: 0.95,
    metalness: 0.03,
  },
  waterChannel: {
    color: "#1A6B6B",
    roughness: 0.15,
    metalness: 0.3,
  },
};

/**
 * 3D Curved Energy Flow Path Waypoints
 * Traces path: Intake Headworks -> Penstock Pipe -> Turbine Hall -> Generator Bay -> Switchyard & Substation
 */
const FLOW_PATH_POINTS = [
  new THREE.Vector3(-6, 20.0, -30),   // 1. Dam Intake Headworks (Top Hillside)
  new THREE.Vector3(-6, 17.5, -26),   // 2. Upper Penstock Entry
  new THREE.Vector3(-5, 11.0, -16),   // 3. Penstock Mid Conduit
  new THREE.Vector3(-4, 4.5, -6),     // 4. Lower Penstock Bifurcation (Powerhouse Rear Wall)
  new THREE.Vector3(-4, 6.2, 0),      // 5. Big Turbine #1 (TU-01)
  new THREE.Vector3(4, 6.2, 0),       // 6. Small Turbine #2 (TU-02)
  new THREE.Vector3(9.6, 8.4, 0),     // 7. Powerhouse East Wall IPB Busduct Exit Bushing
  new THREE.Vector3(15.8, 6.8, -1.5), // 8. Cable Bus Bridge Support Structure
  new THREE.Vector3(22.0, 4.8, -3),   // 9. TR-GSU-01 Transformer Low-Voltage Bushing
  new THREE.Vector3(28.0, 4.8, -3),   // 10. CB-69KV-01 SF6 Gas Circuit Breaker
  new THREE.Vector3(28.0, 4.8, 3),    // 11. LA-69KV-01 Surge Arrester & CT/PT Set
  new THREE.Vector3(30.0, 11.0, 0),   // 12. 69kV Switchyard Gantry Steel Tower
  new THREE.Vector3(50.0, 26.0, 0),   // 13. 69kV Grid Transmission Line Takeoff (Mountain Top)
];

/**
 * Custom GPU Shader Material for Energy Conduit Path
 * Computes hardware anti-aliased, silky 60-120 FPS scrolling energy pulses directly on GPU.
 */
const EnergyFlowShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#1FB6A6"),
    uEmissiveIntensity: 2.2,
    uDashCount: 20.0,
    uDashRatio: 0.3,
    uFlowSpeed: 0.6,
  },
  /* Vertex Shader */
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* Fragment Shader */
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uEmissiveIntensity;
    uniform float uDashCount;
    uniform float uDashRatio;
    uniform float uFlowSpeed;
    varying vec2 vUv;

    void main() {
      float progress = fract(vUv.x * uDashCount - uTime * uFlowSpeed);
      float pulse = smoothstep(0.0, 0.04, progress) - smoothstep(uDashRatio - 0.04, uDashRatio, progress);
      pulse = max(0.0, pulse);

      vec3 darkBase = vec3(0.08, 0.12, 0.18);
      vec3 glowingColor = uColor * uEmissiveIntensity;

      vec3 finalColor = mix(darkBase, glowingColor, pulse);
      float alpha = mix(0.5, 1.0, pulse);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

/**
 * Custom Fresnel X-Ray Shader Material
 * Lerps smoothly between solid matte material (uMixFactor = 0) and X-Ray scan mode (uMixFactor = 1).
 * Fresnel formula: pow(1.0 - abs(dot(viewDir, normal)), uFresnelPower)
 */
const XRayFresnelShaderMaterial = shaderMaterial(
  {
    uMixFactor: 0.0,
    uBaseColor: new THREE.Color("#3b4856"),
    uRimColor: new THREE.Color("#1FB6A6"),
    uFresnelPower: 3.5,
    uMinOpacity: 0.05,
    uMaxOpacity: 0.85,
  },
  /* Vertex Shader */
  `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* Fragment Shader */
  `
    uniform float uMixFactor;
    uniform vec3 uBaseColor;
    uniform vec3 uRimColor;
    uniform float uFresnelPower;
    uniform float uMinOpacity;
    uniform float uMaxOpacity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float NdotV = max(0.0, abs(dot(normalize(vNormal), viewDir)));
      float fresnel = pow(1.0 - NdotV, uFresnelPower);

      vec3 solidColor = uBaseColor;
      float solidAlpha = 1.0;

      // Front-facing faces (fresnel ~0) fade to near 95% transparent; grazing edges (fresnel ~1) bloom in vibrant teal
      vec3 xrayColor = mix(uBaseColor * 0.15, uRimColor * 2.2, fresnel);
      float xrayAlpha = mix(uMinOpacity, uMaxOpacity, fresnel);

      vec3 finalColor = mix(solidColor, xrayColor, uMixFactor);
      float finalAlpha = mix(solidAlpha, xrayAlpha, uMixFactor);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `
);

/**
 * Custom Penstock Pressure-Pulse Shader Material
 * Renders a metallic steel pipe surface with two emissive ring bands
 * that pulse from intake end toward powerhouse end on a ~3.5s cycle.
 * Bands positioned at ~12% and ~88% along the pipe's UV-X axis (flange positions).
 * Includes an anisotropic-style specular highlight along the pipe length.
 */
const PenstockPressurePulseShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color("#475569"),
    uPulseColor: new THREE.Color("#1FB6A6"),
    uEmissiveIntensity: 0.8,
    uMetalness: 0.6,
    uRoughness: 0.3,
    uBoundsMin: new THREE.Vector3(-1, -1, -1),
    uBoundsMax: new THREE.Vector3(1, 1, 1),
  },
  /* Vertex Shader — uses object-space position (no UVs needed) */
  `
    uniform vec3 uBoundsMin;
    uniform vec3 uBoundsMax;

    varying float vPipeT; // 0..1 along the pipe's longest local axis
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      // Normalize object-space position along the pipe's longest axis (Y)
      vec3 range = uBoundsMax - uBoundsMin;
      float maxRange = max(range.x, max(range.y, range.z));
      if (maxRange == range.x) {
        vPipeT = (position.x - uBoundsMin.x) / range.x;
      } else if (maxRange == range.y) {
        vPipeT = (position.y - uBoundsMin.y) / range.y;
      } else {
        vPipeT = (position.z - uBoundsMin.z) / range.z;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* Fragment Shader */
  `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uPulseColor;
    uniform float uEmissiveIntensity;
    uniform float uMetalness;
    uniform float uRoughness;

    varying float vPipeT;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      // --- Pressure-pulse ring bands ---
      // Cycle period ~3.5s, bands scroll along pipe from intake to powerhouse
      float cycle = fract(uTime / 3.5);

      // Two flange positions at 12% and 88% along pipe length
      float band1Center = mod(0.12 + cycle, 1.0);
      float band2Center = mod(0.88 + cycle, 1.0);

      // Gaussian falloff for each band (width ~0.04 in normalized pipe space)
      float bandWidth = 0.04;
      float dist1 = abs(vPipeT - band1Center);
      float dist2 = abs(vPipeT - band2Center);
      float pulse1 = exp(-dist1 * dist1 / (2.0 * bandWidth * bandWidth));
      float pulse2 = exp(-dist2 * dist2 / (2.0 * bandWidth * bandWidth));
      float pulse = max(pulse1, pulse2);

      // --- Anisotropic-style specular highlight along pipe length ---
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewDir);
      float NdotV = max(dot(N, V), 0.0);

      // Fresnel reflectance for metallic surface
      float fresnel = pow(1.0 - NdotV, 4.0) * uMetalness;

      // Anisotropic-inspired highlight: brighter when view aligns with pipe cross-section
      float aniso = pow(NdotV, 1.0 / max(uRoughness, 0.01)) * 0.15 * uMetalness;

      // --- Combine ---
      vec3 baseShading = uBaseColor * (0.3 + 0.7 * NdotV);
      vec3 specular = vec3(fresnel * 0.4 + aniso);
      vec3 emissive = uPulseColor * pulse * uEmissiveIntensity;

      vec3 finalColor = baseShading + specular + emissive;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ EnergyFlowShaderMaterial, XRayFresnelShaderMaterial, PenstockPressurePulseShaderMaterial });

interface EnergyFlowParticlesProps {
  flowIntensity?: number; // 0.0 to 1.0 (driven by plant status / capacity)
}

function EnergyFlowParticles({ flowIntensity = 0.85 }: EnergyFlowParticlesProps) {
  const materialRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null);

  const flowCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(FLOW_PATH_POINTS, false, "catmullrom", 0.35);
  }, []);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(flowCurve, 128, 0.12, 12, false);
  }, [flowCurve]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uTime = clock.getElapsedTime();
    }
  });

  return (
    <mesh geometry={tubeGeometry}>
      {/* @ts-expect-error - Custom JSX element energyFlowShaderMaterial */}
      <energyFlowShaderMaterial
        ref={materialRef}
        uTime={0}
        uColor={new THREE.Color(FLOW_TEAL)}
        uEmissiveIntensity={2.2}
        uDashCount={20.0}
        uDashRatio={0.3}
        uFlowSpeed={0.6 * Math.max(0.2, flowIntensity)}
        transparent
      />
    </mesh>
  );
}

/**
 * InstancedMesh Rain Stream Component
 * 220 rain streaks animated continuously down the Y-axis.
 */
function RainParticles({ count = 150 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const rainData = useRef<{
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    speed: Float32Array;
    length: Float32Array;
  } | null>(null);

  if (rainData.current == null) {
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const z = new Float32Array(count);
    const speed = new Float32Array(count);
    const length = new Float32Array(count);

    let seed = 12345;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      x[i] = (lcg() - 0.5) * 90;
      y[i] = lcg() * 50 + 5;
      z[i] = (lcg() - 0.5) * 90;
      speed[i] = lcg() * 20 + 40;     // fast streaks: 40-60 m/s
      length[i] = lcg() * 1.5 + 2.0;  // taller streaks: 2-3.5m for motion-blur look
    }

    rainData.current = { x, y, z, speed, length };
  }

  useFrame((_, delta) => {
    if (!meshRef.current || !rainData.current) return;
    const { x, y, z, speed, length } = rainData.current;

    for (let i = 0; i < count; i++) {
      y[i] -= speed[i] * delta;
      if (y[i] < 0) {
        y[i] = 50;
      }

      dummy.position.set(x[i], y[i], z[i]);
      dummy.rotation.set(0.08, 0, -0.12); // slight wind angle
      dummy.scale.set(0.6, length[i], 0.6);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <cylinderGeometry args={[0.015, 0.015, 1.0, 4]} />
      <meshBasicMaterial color="#a0b8d0" transparent opacity={0.28} depthWrite={false} />
    </instancedMesh>
  );
}



function getFormattedPHTime(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
}

function getAutomaticPHTimeMode(): AtmosphereTimeMode {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(formatter.format(now), 10);
  if (hour >= 5 && hour < 11) return "MORNING";
  if (hour >= 11 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 19) return "SUNSET";
  return "NIGHT";
}

function PhilippineTimeChip({ effectiveTime }: { effectiveTime: AtmosphereTimeMode }) {
  const [phTimeStr, setPhTimeStr] = useState<string>("");

  useEffect(() => {
    setPhTimeStr(getFormattedPHTime());
    const interval = setInterval(() => {
      setPhTimeStr(getFormattedPHTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn(
      "rounded-lg border px-2.5 py-1 font-mono text-[11px] shadow-xl backdrop-blur-md flex items-center gap-1.5 shrink-0 transition-all",
      effectiveTime === "MORNING" && "border-amber-500/40 bg-black/85 text-amber-300",
      effectiveTime === "AFTERNOON" && "border-sky-500/40 bg-black/85 text-sky-300",
      effectiveTime === "SUNSET" && "border-orange-500/50 bg-black/85 text-orange-300",
      effectiveTime === "NIGHT" && "border-indigo-500/40 bg-black/85 text-indigo-300"
    )}>
      {effectiveTime === "MORNING" ? (
        <SunMedium className="h-3 w-3 text-amber-400 animate-spin-slow" />
      ) : effectiveTime === "AFTERNOON" ? (
        <Sun className="h-3 w-3 text-sky-300" />
      ) : effectiveTime === "SUNSET" ? (
        <Sunset className="h-3 w-3 text-orange-400 animate-pulse" />
      ) : (
        <Moon className="h-3 w-3 text-indigo-300" />
      )}
      <span className="font-semibold text-white/90">PHT:</span>
      <span className="font-bold tracking-wider">{phTimeStr || "--:--:--"}</span>
      <span className={cn(
        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
        effectiveTime === "MORNING" && "bg-amber-500/20 text-amber-300 border-amber-500/30",
        effectiveTime === "AFTERNOON" && "bg-sky-500/20 text-sky-300 border-sky-500/30",
        effectiveTime === "SUNSET" && "bg-orange-500/20 text-orange-300 border-orange-500/30",
        effectiveTime === "NIGHT" && "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
      )}>
        {effectiveTime}
      </span>
    </div>
  );
}


/**
 * Reusable Structure Mesh supporting X-Ray Fresnel Shader Material
 */
interface StructureMeshProps {
  geometry: THREE.BufferGeometry;
  baseColor: string;
  isXRay: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function StructureMesh({
  geometry,
  baseColor,
  isXRay,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  castShadow = true,
  receiveShadow = true,
}: StructureMeshProps) {
  const materialRef = useRef<THREE.ShaderMaterial & { uMixFactor: number }>(null);

  useFrame((_, delta) => {
    if (materialRef.current) {
      const targetMix = isXRay ? 1.0 : 0.0;
      materialRef.current.uMixFactor = THREE.MathUtils.lerp(
        materialRef.current.uMixFactor,
        targetMix,
        Math.min(delta * 5, 0.15)
      );
    }
  });

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {/* @ts-expect-error - Custom JSX element xRayFresnelShaderMaterial */}
      <xRayFresnelShaderMaterial
        ref={materialRef}
        uMixFactor={0.0}
        uBaseColor={new THREE.Color(baseColor)}
        uRimColor={new THREE.Color(FLOW_TEAL)}
        uFresnelPower={3.5}
        uMinOpacity={0.05}
        uMaxOpacity={0.85}
        transparent
      />
    </mesh>
  );
}





/**
 * Screen-Space Clamped HTML Equipment Label
 */
interface ClampedMarkerHtmlProps {
  capRef: React.RefObject<THREE.Mesh | null>;
  preferredLeaderHeight: number;
  showFullLabel: boolean;
  isSelected: boolean;
  hovered: boolean;
  markerColor: string;
  equipmentTag: string;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

const _scratchCapVec = new THREE.Vector3();

function ClampedMarkerHtml({
  capRef,
  preferredLeaderHeight,
  showFullLabel,
  isSelected,
  hovered,
  markerColor,
  equipmentTag,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: ClampedMarkerHtmlProps) {
  const lineRef = useRef<HTMLDivElement>(null);

  useFrame(({ camera, size }) => {
    if (!showFullLabel || !capRef.current || !lineRef.current) return;

    capRef.current.getWorldPosition(_scratchCapVec);
    const capNDC = _scratchCapVec.project(camera);
    const capPixelY = (-capNDC.y * 0.5 + 0.5) * size.height;

    const TOP_SAFE_BOUND_PX = 96;
    const CARD_HEIGHT_PX = 22;
    const maxAllowedLeader = capPixelY - TOP_SAFE_BOUND_PX - CARD_HEIGHT_PX;
    const newLeaderHeight = Math.max(4, Math.min(preferredLeaderHeight, maxAllowedLeader));

    lineRef.current.style.height = `${newLeaderHeight}px`;
  });

  return (
    <Html
      position={[0, 2.6, 0]}
      distanceFactor={35}
      className="pointer-events-none select-none z-10"
      style={{ transform: "translate(-50%, -100%)" }}
    >
      {showFullLabel ? (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "rounded border px-2 py-0.5 font-mono text-[9px] font-bold shadow-md transition-all backdrop-blur-sm flex items-center gap-1.5 pointer-events-auto cursor-pointer whitespace-nowrap",
              isSelected
                ? "border-flow-teal bg-black/90 text-flow-teal scale-110 shadow-flow-teal/30 ring-1 ring-flow-teal/50"
                : hovered
                ? "border-white/30 bg-black/80 text-white scale-105"
                : "border-white/10 bg-black/70 text-text-muted"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onPointerOver={onHoverStart}
            onPointerOut={onHoverEnd}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: markerColor }} />
            <span>{equipmentTag}</span>
          </div>

          <div
            ref={lineRef}
            className="w-[1.5px] bg-gradient-to-b from-flow-teal/80 to-transparent transition-all"
            style={{ height: `${preferredLeaderHeight}px` }}
          />
        </div>
      ) : (
        <div
          className="pointer-events-auto cursor-pointer p-1 group flex flex-col items-center -translate-y-1"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={onHoverStart}
          onPointerOut={onHoverEnd}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-lg block transition-transform group-hover:scale-125"
            style={{ backgroundColor: markerColor }}
          />
        </div>
      )}
    </Html>
  );
}

const SPINNER_HUB_GEOM = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16);
const SPINNER_BLADE_GEOM = new THREE.BoxGeometry(0.12, 0.08, 0.35);
const SPINNER_RING_GEOM = new THREE.TorusGeometry(0.65, 0.03, 16, 32);
const PULSE_WAVE_GEOM = new THREE.RingGeometry(1.5, 1.8, 36);
const PULSE_BASE_GEOM = new THREE.RingGeometry(1.4, 1.55, 36);

/**
 * Animated Spinning Francis Turbine Runner Detail for COMMISSIONED Equipment
 */
function TurbineRunnerSpinner({ color = "#1FB6A6" }: { color?: string }) {
  const runnerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (runnerRef.current) {
      runnerRef.current.rotation.y += delta * 4.0; // Smooth 60rpm spinning velocity
    }
  });

  return (
    <group ref={runnerRef} position={[0, 3.25, 0]}>
      {/* Central Impeller Hub */}
      <mesh geometry={SPINNER_HUB_GEOM} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* 6 Curved Francis Impeller Blades */}
      {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <mesh
            key={idx}
            geometry={SPINNER_BLADE_GEOM}
            position={[Math.sin(rad) * 0.45, 0, Math.cos(rad) * 0.45]}
            rotation={[0, rad + Math.PI / 4, 0.2]}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2.0}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        );
      })}
      {/* Outer Halo Protection Ring */}
      <mesh geometry={SPINNER_RING_GEOM} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

/**
 * Expanding Selection Radial Wave Ring-Out Effect on Click
 */
function SelectionPulseRing({ color = "#1FB6A6" }: { color?: string }) {
  const waveRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!waveRef.current) return;
    progressRef.current = (progressRef.current + delta * 0.85) % 1.0;
    const progress = progressRef.current;
    const currentScale = 1.0 + progress * 1.8; // Expands scale from 1.0 -> 2.8
    const currentOpacity = (1.0 - progress) * 0.85; // Fades opacity 0.85 -> 0.0

    waveRef.current.scale.set(currentScale, currentScale, 1.0);
    const mat = waveRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      mat.opacity = currentOpacity;
    }
  });

  return (
    <group position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Expanding Wave Ring */}
      <mesh ref={waveRef} geometry={PULSE_WAVE_GEOM}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Static Focus Base Ring */}
      <mesh geometry={PULSE_BASE_GEOM}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * 3D Equipment Marker Mesh Component
 */
interface EquipmentMarkerProps {
  equipment: EquipmentWithLocation;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (eq: EquipmentWithLocation) => void;
  activePreset: CameraPresetKey;
  targetZone: string;
  leaderHeight?: number;
}

function EquipmentMarker({
  equipment,
  position,
  isSelected,
  onSelect,
  activePreset,
  targetZone,
  leaderHeight = 24,
}: EquipmentMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const capRef = useRef<THREE.Mesh>(null);

  const markerColor = useMemo(() => {
    if (equipment.condition === "CRITICAL" || equipment.condition === "POOR") {
      return "#E35A5A";
    }
    switch (equipment.status) {
      case "COMMISSIONED":
        return "#1FB6A6";
      case "UNDER_MAINTENANCE":
        return "#E8A33D";
      case "INSTALLED":
      case "DECOMMISSIONED":
      case "PENDING_DELIVERY":
      default:
        return "#64748B";
    }
  }, [equipment.status, equipment.condition]);

  const isEmissive =
    equipment.status === "COMMISSIONED" ||
    equipment.status === "UNDER_MAINTENANCE" ||
    equipment.condition === "CRITICAL" ||
    equipment.condition === "POOR";

  const emissiveColor = isEmissive ? markerColor : "#000000";
  const emissiveIntensity = isEmissive ? 1.5 : 0;

  const isRelevantZone =
    activePreset === "overview" ||
    (activePreset === "switchyard" && targetZone === "SWITCHYARD") ||
    (activePreset === "turbine-hall" && targetZone === "TURBINE_HALL");

  const showFullLabel = isRelevantZone && (activePreset !== "overview" || hovered || isSelected);

  return (
    <group position={position}>
      <mesh
        castShadow
        receiveShadow
        position={[0, 1.2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(equipment);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2.4, 2.2, 2.4]} />
        <meshStandardMaterial
          color={hovered || isSelected ? "#475569" : "#334155"}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>

      <mesh
        ref={capRef}
        castShadow
        position={[0, 2.6, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(equipment);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.7, 0.8, 0.7, 16]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>

      {/* Animated Rotating Francis Turbine Runner for COMMISSIONED equipment (active generation signal) */}
      {equipment.status === "COMMISSIONED" && (
        <TurbineRunnerSpinner color={markerColor} />
      )}

      {/* Animated Selection Pulse / Ring-Out Wave Effect on Click */}
      {isSelected ? (
        <SelectionPulseRing color={markerColor} />
      ) : (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.6, 32]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isRelevantZone && (
        <ClampedMarkerHtml
          capRef={capRef}
          preferredLeaderHeight={leaderHeight}
          showFullLabel={showFullLabel}
          isSelected={isSelected}
          hovered={hovered}
          markerColor={markerColor}
          equipmentTag={equipment.equipmentTag}
          onSelect={() => onSelect(equipment)}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        />
      )}
    </group>
  );
}

/**
 * High-Tech Engineering Zone Telemetry Label Component
 */
interface ZoneTelemetryLabelProps {
  title: string;
  subtitle?: string;
  position: [number, number, number];
  distanceFactor?: number;
}

function ZoneTelemetryLabel({
  title,
  subtitle,
  position,
  distanceFactor = 45,
}: ZoneTelemetryLabelProps) {
  return (
    <Html
      position={position}
      center
      distanceFactor={distanceFactor}
      className="pointer-events-none select-none z-10 whitespace-nowrap"
    >
      <div className="rounded-lg border border-flow-teal/40 bg-black/90 px-3 py-1 font-mono shadow-2xl backdrop-blur-md flex items-center gap-2 ring-1 ring-flow-teal/30 transition-all hover:border-flow-teal/60">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-flow-teal animate-pulse" />
        <span className="text-[11px] font-bold tracking-wider text-white uppercase whitespace-nowrap">
          {title}
        </span>
        {subtitle && (
          <>
            <span className="text-white/20 text-[10px]">•</span>
            <span className="text-[10px] font-medium text-flow-teal/90 whitespace-nowrap">
              {subtitle}
            </span>
          </>
        )}
      </div>
    </Html>
  );
}

/**
 * Main Hydroelectric Powerhouse Facility GLTF & Scene Geometry Component
 */
interface PowerhouseBlockoutProps {
  activePreset: CameraPresetKey;
  equipments: EquipmentWithLocation[];
  selectedEquipment: EquipmentWithLocation | null;
  onSelectEquipment: (eq: EquipmentWithLocation) => void;
  flowIntensity?: number;
  isXRay?: boolean;
  onSelectPerson?: (id: string) => void;
  onSelectPreset?: (preset: CameraPresetKey) => void;
}

function PowerhouseBlockout({
  activePreset,
  equipments,
  selectedEquipment,
  onSelectEquipment,
  flowIntensity = 0.85,
  isXRay = false,
  onSelectPerson,
  onSelectPreset,
}: PowerhouseBlockoutProps) {
  // Load real GLTF model geometry named meshes
  const gltf = useGLTF("/models/tumauini_powerhouse.glb") as unknown as GLTFResult;
  const { nodes } = gltf;

  // Compute 3D surface vertex normals for all GLTF geometries (enables lighting & fresnel shaders)
  const gltfGeometries = useMemo(() => {
    if (!nodes) return null;
    const processGeom = (mesh?: THREE.Mesh) => {
      if (!mesh || !mesh.geometry) return null;
      const geom = mesh.geometry.clone();
      geom.computeVertexNormals();
      return geom;
    };
    return {
      Intake_Structure: processGeom(nodes.Intake_Structure),
      Penstock_Pipe: processGeom(nodes.Penstock_Pipe),
      TurbineHall_Shell: processGeom(nodes.TurbineHall_Shell),
      Switchyard_Platform: processGeom(nodes.Switchyard_Platform),
    };
  }, [nodes]);

  const switchyardEquipments = useMemo(
    () => equipments.filter((e) => e.zone === "SWITCHYARD" || e.siteLocation?.slug === "switchyard"),
    [equipments]
  );

  const turbineEquipments = useMemo(
    () => equipments.filter((e) => e.zone === "TURBINE_HALL" || e.siteLocation?.slug === "powerhouse"),
    [equipments]
  );

  const intakeEquipments = useMemo(
    () => equipments.filter((e) => e.zone === "INTAKE" || e.siteLocation?.slug === "dam-intake"),
    [equipments]
  );

  const penstockEquipments = useMemo(
    () => equipments.filter((e) => e.zone === "PENSTOCK" || e.siteLocation?.slug === "penstock"),
    [equipments]
  );

  const switchyardLayoutPositions: [number, number, number][] = [
    [-3, 2.65, -3], // Pad 0 (Top-West / Upper-Left): TR-GSU-01 Transformer
    [3, 2.65, -3],  // Pad 1 (Top-East / Upper-Right): CB-69KV-01 SF6 Circuit Breaker
    [-3, 2.65, 3],  // Pad 2 (Bottom-West / Lower-Left): DS-69KV-01 Motorized Disconnect Switch
    [3, 2.65, 3],   // Pad 3 (Bottom-East / Lower-Right): LA-69KV-01 Surge Arrester & CT/PT Set
  ];

  const turbineLayoutPositions: [number, number, number][] = [
    [-4, 6.0, 0],  // TU-01 Big Turbine #1 (8.5MW) — Left Generator Bay
    [4, 6.0, 0],   // TU-02 Small Turbine #2 (2.8MW) — Right Generator Bay
  ];

  const turbineLeaderHeights = [20, 48, 20];
  const switchyardLeaderHeights = [20, 44, 20, 44, 20];

  return (
    <group position={[0, 0, 0]}>
      {/* Animated GPU Shader Energy Flow Conduit */}
      <EnergyFlowParticles flowIntensity={flowIntensity} />

      {/* --- MOUNTAIN SLOPE BACKDROP & INTERCEPTOR DRAINAGE CHANNELS --- */}
      <MountainTerrain />

      {/* --- PHASE 3: INSTANCED FOREST VEGETATION --- */}
      <ForestVegetation />

      {/* --- HIGH-DENSITY MOUNTAIN FOREST WILDLIFE ECOSYSTEM --- */}
      <ForestWildlife />

      {/* --- LIVE ANIMATED SITE WORKERS, ENGINEERS & NAVIGATING VEHICLES --- */}
      <AnimatedSiteEntities onSelectPerson={onSelectPerson} />

      {/* --- SURGE TANK HILLSIDE TERRAIN (fixes floating surge tank) --- */}
      <SurgeTankHillside />

      {/* --- PENSTOCK TRENCH RETAINING WALLS (flanking slope walls) --- */}
      <PenstockTrenchWalls />

      {/* --- GROUND VOID-FILL BACKDROP (below 360m GIS terrain mesh) --- */}
      <mesh position={[0, -6.0, 0]} receiveShadow>
        <boxGeometry args={[800, 0.3, 800]} />
        <meshStandardMaterial color="#3A4B29" roughness={0.96} metalness={0.02} />
      </mesh>

      {/* --- TAILRACE OUTFLOW WATER CHANNEL --- */}
      <TailraceWater />

      {/* --- SURGE TANK & HEADRACE TUNNEL PORTAL (Top Hillside Shaft at EL. 271.46m) --- */}
      <RealisticSurgeTank isXRay={isXRay} />

      {intakeEquipments.map((eq) => (
        <EquipmentMarker
          key={eq.id}
          equipment={eq}
          position={[-6, 26.0, -26]}
          isSelected={selectedEquipment?.id === eq.id}
          onSelect={onSelectEquipment}
          activePreset={activePreset}
          targetZone="INTAKE"
          leaderHeight={20}
        />
      ))}

      {activePreset === "overview" && (
        <ZoneTelemetryLabel
          title="SURGE TANK & HEADRACE PORTAL"
          subtitle="EL. 271.46m • 16-LIFT CONCRETE SHAFT"
          position={[-6, 31.0, -26]}
        />
      )}

      {/* --- 2.70m STEEL PENSTOCK ASSEMBLY (32° Shotcrete Hillside Trench) --- */}
      <RealisticPenstockAssembly isXRay={isXRay} />

      {penstockEquipments.map((eq) => (
        <EquipmentMarker
          key={eq.id}
          equipment={eq}
          position={[-4.2, 5.5, -6.2]}
          isSelected={selectedEquipment?.id === eq.id}
          onSelect={onSelectEquipment}
          activePreset={activePreset}
          targetZone="PENSTOCK"
          leaderHeight={18}
        />
      ))}

      {activePreset === "overview" && (
        <ZoneTelemetryLabel
          title="MAIN PENSTOCK CONDUIT"
          subtitle="11.3 MW FLOW"
          position={[-5, 13.5, -16]}
        />
      )}

      {/* --- TURBINE HALL / MAIN POWERHOUSE BUILDING (38.65m DED Layout) --- */}
      <group position={[0, 0, 0]}>
        {/* Photorealistic Procedural Powerhouse Building — modeled from DED drawings & construction photos */}
        <RealisticPowerhouseBuilding isXRay={isXRay} />
        {/* 3D Electrical Busducts, Cable Bridge, Switchyard Busbars & Steel Gantry Towers */}
        <ElectricalBusSystem isXRay={isXRay} />
        {/* Tailrace Floodwall Infrastructure & Dual Hydraulic Floodgates */}
        <TailraceFloodwall />
        <TailraceFloodgate />

        {turbineEquipments.map((eq, idx) => {
          const pos = turbineLayoutPositions[idx % turbineLayoutPositions.length];
          const leaderH = turbineLeaderHeights[idx % turbineLeaderHeights.length];
          return (
            <EquipmentMarker
              key={eq.id}
              equipment={eq}
              position={pos}
              isSelected={selectedEquipment?.id === eq.id}
              onSelect={onSelectEquipment}
              activePreset={activePreset}
              targetZone="TURBINE_HALL"
              leaderHeight={leaderH}
            />
          );
        })}

        {/* ═══ 🏷️ POWERHOUSE FACILITY 3D HOLOGRAPHIC ROTATING BEACON & HUD LABEL ═══ */}
        <FacilityHolographicBeaconLabel
          title="11.3 MW HYDROELECTRIC POWERHOUSE"
          facilityCode="TUMAUINI-HEPP-01"
          subtitle="Generator Hall • 2x Francis Hydro Turbines • 69kV Switchyard Substation"
          elevation="EL. 0.5m MSL"
          coordinates="17.0621° N, 121.8410° E"
          themeColor="cyan"
          position={[0, 28.5, 0]}
          groundY={0.5}
          beamHeight={28.0}
          distanceFactor={65}
          badges={[
            { label: "CAPACITY", value: "11.3 MW", icon: "⚡" },
            { label: "UNITS", value: "2x Francis", icon: "🌊" },
            { label: "SPEED", value: "600 RPM", icon: "🔄" },
            { label: "GRID", value: "69kV Online", icon: "🔋" },
          ]}
          onClick={() => onSelectPreset?.("turbine-hall")}
        />
      </group>

      {/* --- SWITCHYARD & SUBSTATION AREA (Right / East Elevated Platform) --- */}
      <group position={[25, 0, 0]}>
        {/* Photorealistic Switchyard Platform with Floodwalls */}
        <RealisticSwitchyard />

        {switchyardEquipments.map((eq, idx) => {
          const pos = switchyardLayoutPositions[idx % switchyardLayoutPositions.length];
          const leaderH = switchyardLeaderHeights[idx % switchyardLeaderHeights.length];
          return (
            <EquipmentMarker
              key={eq.id}
              equipment={eq}
              position={pos}
              isSelected={selectedEquipment?.id === eq.id}
              onSelect={onSelectEquipment}
              activePreset={activePreset}
              targetZone="SWITCHYARD"
              leaderHeight={leaderH}
            />
          );
        })}
      </group>

      {/* --- ACCESS ROAD & PERIMETER INFRASTRUCTURE --- */}
      <AccessRoad />
      <PerimeterFence />

      {/* --- TEMFACIL (MAIN TEMPORARY FACILITY & BARRACKS COMPOUND) --- */}
      <TemfacilFacility isXRay={isXRay} onSelectPerson={onSelectPerson} activePreset={activePreset} />

      {/* ═══ 🏷️ TEMFACIL COMPOUND 3D HOLOGRAPHIC ROTATING BEACON & HUD LABEL ═══ */}
      <FacilityHolographicBeaconLabel
        title="TEMFACIL SITE HEADQUARTERS"
        facilityCode="SCIC-TEMFACIL-01"
        subtitle="Administrative Complex • Engineering Bay • Logistics Depot & Barracks"
        elevation="EL. 14.0m MSL"
        coordinates="17.0654° N, 121.8471° E"
        themeColor="amber"
        position={[118, 38.5, -95]}
        groundY={14.0}
        beamHeight={24.5}
        distanceFactor={65}
        badges={[
          { label: "PERSONNEL", value: "28 On-Duty", icon: "👥" },
          { label: "FLEET", value: "4 Logistics", icon: "🚛" },
          { label: "SECURITY", value: "Active Sentry", icon: "🛡️" },
          { label: "STATUS", value: "Operational", icon: "🟢" },
        ]}
        onClick={() => onSelectPreset?.("temfacil")}
      />
    </group>
  );
}

/**
 * CameraController component — animates camera position & OrbitControls target smoothly in useFrame
 */
/**
 * CameraController component — animates camera position & OrbitControls target smoothly in useFrame
 */
interface CameraControllerProps {
  activePreset: CameraPresetKey;
  isFreeNav: boolean;
  onUserInteract: () => void;
  resetToken: number;
  isGtaModeActive?: boolean;
}

function CameraController({
  activePreset,
  isFreeNav,
  onUserInteract,
  resetToken,
  isGtaModeActive = false,
}: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isAnimatingRef = useRef<boolean>(true);
  const prevPresetRef = useRef<CameraPresetKey>(activePreset);
  const prevResetTokenRef = useRef<number>(resetToken);
  const focusTargetRef = useRef<THREE.Vector3 | null>(null);
  const focusCamPosRef = useRef<THREE.Vector3 | null>(null);
  const { gl, camera, scene } = useThree();
  const keysDownRef = useRef<Record<string, boolean>>({});

  const presets = useMemo(
    () => ({
      overview: {
        pos: new THREE.Vector3(75, 120, 160),
        target: new THREE.Vector3(30, 8, -25),
      },
      "turbine-hall": {
        pos: new THREE.Vector3(18, 20, 26),
        target: new THREE.Vector3(4, 6, 4),
      },
      switchyard: {
        pos: new THREE.Vector3(36, 14, 12),
        target: new THREE.Vector3(24, 2, -2),
      },
      "tailrace-floodgate": {
        pos: new THREE.Vector3(-4, 28, 58),
        target: new THREE.Vector3(0, 4, 26),
      },
      temfacil: {
        pos: new THREE.Vector3(135, 60, -40),
        target: new THREE.Vector3(125, 15, -100),
      },
      "temfacil-guardhouse": {
        pos: new THREE.Vector3(76, 18.0, -56),
        target: new THREE.Vector3(88, 12.5, -70),
      },
      "temfacil-barracks": {
        pos: new THREE.Vector3(155, 23, -84),
        target: new THREE.Vector3(155, 15, -107),
      },
      "temfacil-office": {
        pos: new THREE.Vector3(118, 18, -78),
        target: new THREE.Vector3(118, 15.5, -95),
      },
    }),
    []
  );

  // Wheel listener directly on canvas DOM element: instantly unlocks Free Nav & cancels preset lerping
  useEffect(() => {
    const domElement = gl.domElement;
    const handleWheel = () => {
      isAnimatingRef.current = false;
      focusTargetRef.current = null;
      focusCamPosRef.current = null;
      onUserInteract();
    };

    const handlePointerDown = () => {
      isAnimatingRef.current = false;
      focusTargetRef.current = null;
      focusCamPosRef.current = null;
      onUserInteract();
    };

    domElement.addEventListener("wheel", handleWheel, { passive: true });
    domElement.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => {
      domElement.removeEventListener("wheel", handleWheel);
      domElement.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [gl, onUserInteract]);

  // Step Zoom handler for HUD Zoom + and Zoom - buttons
  useEffect(() => {
    const handleStepZoom = (e: Event) => {
      const customEvent = e as CustomEvent<{ deltaY: number }>;
      if (!controlsRef.current) return;
      isAnimatingRef.current = false;
      focusTargetRef.current = null;
      focusCamPosRef.current = null;
      onUserInteract();

      const deltaY = customEvent.detail?.deltaY ?? 1;
      const zoomFactor = deltaY < 0 ? 0.75 : 1.35; // deltaY < 0 is Zoom In, deltaY > 0 is Zoom Out
      const offset = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target);
      offset.multiplyScalar(zoomFactor);

      // Clamp distance between 1.5m and 850m
      const len = offset.length();
      if (len < 1.5) offset.setLength(1.5);
      if (len > 850) offset.setLength(850);

      camera.position.addVectors(controlsRef.current.target, offset);
      controlsRef.current.update();
    };

    window.addEventListener("plant-scene-step-zoom", handleStepZoom);
    return () => window.removeEventListener("plant-scene-step-zoom", handleStepZoom);
  }, [camera, onUserInteract]);

  // Keyboard Pan Controls (WASD / Arrow keys / Space / Q / Shift)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      keysDownRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Smooth Double-click raycast focus: re-centers OrbitControls target and smoothly glides camera closer
  useEffect(() => {
    const domElement = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleDblClick = (event: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const validHit = intersects.find((hit) => hit.distance > 0.3 && hit.point.y > -20);

      if (validHit && controlsRef.current) {
        const hitPoint = validHit.point;
        focusTargetRef.current = hitPoint.clone();

        // Calculate a comfortable inspection camera offset
        const currentOffset = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target);
        let dist = currentOffset.length();
        if (dist > 75) {
          currentOffset.normalize().multiplyScalar(42);
        } else if (dist < 8) {
          currentOffset.normalize().multiplyScalar(12);
        }
        // Ensure camera stays above ground
        const targetCamPos = hitPoint.clone().add(currentOffset);
        if (targetCamPos.y < hitPoint.y + 3) {
          targetCamPos.y = hitPoint.y + 6;
        }
        focusCamPosRef.current = targetCamPos;

        isAnimatingRef.current = false;
        onUserInteract();
      }
    };

    domElement.addEventListener("dblclick", handleDblClick);
    return () => domElement.removeEventListener("dblclick", handleDblClick);
  }, [gl, camera, scene, onUserInteract]);

  useEffect(() => {
    if (prevPresetRef.current !== activePreset || prevResetTokenRef.current !== resetToken) {
      prevPresetRef.current = activePreset;
      prevResetTokenRef.current = resetToken;
      focusTargetRef.current = null;
      focusCamPosRef.current = null;
      isAnimatingRef.current = true;
    }
  }, [activePreset, resetToken]);

  useFrame((state, delta) => {
    if (!controlsRef.current || isGtaModeActive) return;

    // Handle WASD / Arrow Key continuous camera & target translation
    const keys = keysDownRef.current;
    if (
      keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"] ||
      keys["ArrowUp"] || keys["ArrowDown"] || keys["ArrowLeft"] || keys["ArrowRight"] ||
      keys["KeyQ"] || keys["KeyE"] || keys["Space"]
    ) {
      isAnimatingRef.current = false;
      focusTargetRef.current = null;
      focusCamPosRef.current = null;
      onUserInteract();

      const forward = new THREE.Vector3();
      state.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, state.camera.up).normalize();

      const moveSpeed = (keys["ShiftLeft"] || keys["ShiftRight"] ? 55 : 24) * delta;
      const move = new THREE.Vector3();

      if (keys["KeyW"] || keys["ArrowUp"]) move.addScaledVector(forward, moveSpeed);
      if (keys["KeyS"] || keys["ArrowDown"]) move.addScaledVector(forward, -moveSpeed);
      if (keys["KeyD"] || keys["ArrowRight"]) move.addScaledVector(right, moveSpeed);
      if (keys["KeyA"] || keys["ArrowLeft"]) move.addScaledVector(right, -moveSpeed);
      if (keys["KeyE"] || keys["Space"]) move.y += moveSpeed * 0.75;
      if (keys["KeyQ"]) move.y -= moveSpeed * 0.75;

      if (move.lengthSq() > 0) {
        state.camera.position.add(move);
        controlsRef.current.target.add(move);
        controlsRef.current.update();
      }
    }

    // Handle smooth double-click focus animation
    if (focusTargetRef.current && focusCamPosRef.current) {
      const step = Math.min(delta * 5.5, 0.18);
      state.camera.position.lerp(focusCamPosRef.current, step);
      controlsRef.current.target.lerp(focusTargetRef.current, step);
      controlsRef.current.update();

      if (
        state.camera.position.distanceTo(focusCamPosRef.current) < 0.1 &&
        controlsRef.current.target.distanceTo(focusTargetRef.current) < 0.1
      ) {
        focusTargetRef.current = null;
        focusCamPosRef.current = null;
      }
      return;
    }

    // Handle preset animation
    if (!isFreeNav && isAnimatingRef.current) {
      const active = presets[activePreset];
      const step = Math.min(delta * 4.5, 0.15);
      state.camera.position.lerp(active.pos, step);
      controlsRef.current.target.lerp(active.target, step);
      controlsRef.current.update();

      const distPos = state.camera.position.distanceTo(active.pos);
      const distTarget = controlsRef.current.target.distanceTo(active.target);
      if (distPos < 0.08 && distTarget < 0.08) {
        isAnimatingRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isGtaModeActive}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={1.0}
      zoomSpeed={2.2}
      panSpeed={1.4}
      screenSpacePanning={true}
      minDistance={0.8}
      maxDistance={1200}
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI / 2 + 0.08}
      onStart={() => {
        isAnimatingRef.current = false;
        focusTargetRef.current = null;
        focusCamPosRef.current = null;
        onUserInteract();
      }}
    />
  );
}

/**
 * Dynamically adjusts renderer toneMappingExposure for storm mode and daytime.
 * Ensures natural dynamic range without blown-out whites.
 */
function StormExposureControl({ isStormActive }: { isStormActive: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = isStormActive ? 1.35 : 1.0;
  }, [gl, isStormActive]);
  return null;
}

/**
 * Inner R3F Scene with Environmental Storm & Time-of-Day (Morning, Afternoon, Night) Support
 */
function PlantSceneInner({
  activePreset,
  equipments,
  selectedEquipment,
  onSelectEquipment,
  flowIntensity = 0.85,
  isXRay = false,
  isStormActive = false,
  effectiveTime = "MORNING",
  isFreeNav = false,
  onUserInteract,
  resetToken = 0,
  supercarCustomization,
  isGtaModeActive = false,
  onSelectPerson,
  onSelectPreset,
}: {
  activePreset: CameraPresetKey;
  equipments: EquipmentWithLocation[];
  selectedEquipment: EquipmentWithLocation | null;
  onSelectEquipment: (eq: EquipmentWithLocation) => void;
  flowIntensity?: number;
  isXRay?: boolean;
  isStormActive?: boolean;
  effectiveTime?: AtmosphereTimeMode;
  isFreeNav?: boolean;
  onUserInteract: () => void;
  resetToken?: number;
  supercarCustomization?: SupercarCustomization;
  isGtaModeActive?: boolean;
  onSelectPerson?: (id: string) => void;
  onSelectPreset?: (preset: CameraPresetKey) => void;
}) {
  const isNight = effectiveTime === "NIGHT";
  const isMorning = effectiveTime === "MORNING";
  const isAfternoon = effectiveTime === "AFTERNOON";
  const isSunset = effectiveTime === "SUNSET";

  const ambientColor = isStormActive
    ? "#8899aa"
    : isNight
    ? "#0B132B"
    : isSunset
    ? "#FF8A65"
    : isMorning
    ? "#FFF1D0"
    : "#F1F5F9";

  const ambientIntensity = isStormActive
    ? 0.45
    : isNight
    ? 0.28
    : isSunset
    ? 0.65
    : isMorning
    ? 0.72
    : 0.8;

  const hemiTopColor = isStormActive
    ? "#5a7090"
    : isNight
    ? "#1E293B"
    : isSunset
    ? "#8E24AA"
    : isMorning
    ? "#60A5FA"
    : "#38BDF8";

  const hemiGroundColor = isStormActive
    ? "#5A6050"
    : isNight
    ? "#020617"
    : isSunset
    ? "#2A1B28"
    : isMorning
    ? "#3B4830"
    : "#2C3E25";

  const sunLightParams = isNight
    ? { pos: [-50, 75, -45] as [number, number, number], color: "#93C5FD", intensity: 0.75 }
    : isSunset
    ? { pos: [-110, 24, -55] as [number, number, number], color: "#FF7043", intensity: 2.1 }
    : isMorning
    ? { pos: [110, 48, 65] as [number, number, number], color: "#FFE2A0", intensity: 2.3 }
    : { pos: [35, 88, 30] as [number, number, number], color: "#FFFDF0", intensity: 2.4 };

  const fogArgs: [string, number, number] = isStormActive
    ? ["#182230", 40, 200]
    : isNight
    ? ["#050B14", 90, 380]
    : isSunset
    ? ["#FF8A65", 140, 480]
    : isMorning
    ? ["#FED7AA", 180, 520]
    : ["#E0F2FE", 200, 580];

  return (
    <>
      {/* Dynamically adjust tone mapping exposure for storm legibility */}
      <StormExposureControl isStormActive={isStormActive} />
      <PerspectiveCamera makeDefault position={[75, 120, 160]} fov={45} near={0.5} far={2000} />
      <CameraController
        activePreset={activePreset}
        isFreeNav={isFreeNav}
        onUserInteract={onUserInteract}
        resetToken={resetToken}
        isGtaModeActive={isGtaModeActive}
      />

      {/* 🏔️ Realistic Sierra Madre Atmospheric Sky Dome (Rayleigh/Mie Scattering) */}
      <RealisticSkyAtmosphere timeMode={effectiveTime} isStormActive={isStormActive} />

      {/* PBR Lighting Rig — Dynamic Time of Day (Morning / Afternoon / Sunset / Night) */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <hemisphereLight intensity={isNight ? 0.35 : 0.55} color={hemiTopColor} groundColor={hemiGroundColor} />
      <Environment preset="apartment" environmentIntensity={isStormActive ? 0.25 : isNight ? 0.12 : 0.38} />

      {/* Primary Key Light (Sun / Moon) */}
      <directionalLight
        position={sunLightParams.pos}
        intensity={sunLightParams.intensity}
        color={sunLightParams.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={380}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0003}
      />

      {/* Cool Sky Fill Light */}
      <directionalLight
        position={[-40, 45, -30]}
        intensity={isStormActive ? 0.3 : isNight ? 0.15 : isSunset ? 0.35 : 0.45}
        color={isStormActive ? "#6688aa" : isNight ? "#1E293B" : isSunset ? "#8E24AA" : "#B0D4FF"}
      />

      {/* Warm Ground Bounce */}
      <directionalLight
        position={[0, -15, 0]}
        intensity={isStormActive ? 0.15 : isNight ? 0.08 : 0.22}
        color={isSunset ? "#FF7043" : isMorning ? "#FED7AA" : "#DEB887"}
      />

      {/* Atmospheric Fog Harmonized with Horizon */}
      <fog attach="fog" args={fogArgs} />

      {/* 🌲 Sierra Madre Mountain Biophysical & Particle Effects Engine */}
      <MountainAtmosphereEffects timeMode={effectiveTime} isStormActive={isStormActive} />

      {/* 🌧️ TYPHOON STORM: Rain Streaks */}
      {isStormActive && <RainParticles count={180} />}

      <Grid
        position={[0, 0.01, 0]}
        args={[350, 350]}
        cellColor="#4A5A4A"
        sectionColor="#5A6A5A"
        cellThickness={0.8}
        sectionThickness={1.2}
        fadeDistance={200}
        sectionSize={10}
        cellSize={2}
        infiniteGrid
      />

      <PowerhouseBlockout
        activePreset={activePreset}
        equipments={equipments}
        selectedEquipment={selectedEquipment}
        onSelectEquipment={onSelectEquipment}
        flowIntensity={flowIntensity}
        isXRay={isXRay}
        onSelectPerson={onSelectPerson}
        onSelectPreset={onSelectPreset}
      />

      {/* --- SUPERCAR SHOWCASE (Ferrari 458 Italia) --- */}
      <SupercarEntity
        customization={supercarCustomization}
        isPlayerControlled={isGtaModeActive}
      />

      {/* --- GTA-STYLE PLAYER CONTROLLER (Walking/Driving Mode) --- */}
      {isGtaModeActive && (
        <GTAPlayerController isActive={isGtaModeActive} onToggleActive={() => {}} />
      )}

      {/* Cinematic Post-Processing Stack with Ultra-Sharp SMAA Anti-Aliasing (Optimized 60 FPS) */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.88}
          luminanceSmoothing={0.04}
          intensity={isStormActive ? 0.3 : 0.55}
        />
        <BrightnessContrast
          brightness={isStormActive ? 0.08 : 0.02}
          contrast={isStormActive ? 0.12 : 0.1}
        />
        <SMAA />
      </EffectComposer>
    </>
  );
}

interface AlertLogEntry {
  id: string;
  timestamp: string;
  equipmentTag: string;
  equipmentName: string;
  type: "ONLINE" | "MAINTENANCE" | "ALERT";
  message: string;
}

/**
 * Collapsible Equipment Alerts & Event Log Feed Panel
 */
function AlertsFeedPanel({ equipments }: { equipments: EquipmentWithLocation[] }) {
  const [isOpen, setIsOpen] = useState(true);

  const logs = useMemo<AlertLogEntry[]>(() => {
    const entries: AlertLogEntry[] = [];

    equipments.forEach((eq) => {
      // 1. Check for database maintenance logs on equipment
      if (eq.maintenanceLogs && eq.maintenanceLogs.length > 0) {
        eq.maintenanceLogs.forEach((mLog) => {
          const isMaint = eq.status === "UNDER_MAINTENANCE";
          const isAlert = eq.condition === "CRITICAL" || eq.condition === "POOR";
          const dateStr = new Date(mLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          entries.push({
            id: `db-log-${mLog.id}`,
            timestamp: dateStr,
            equipmentTag: eq.equipmentTag,
            equipmentName: eq.name,
            type: isAlert ? "ALERT" : isMaint ? "MAINTENANCE" : "ONLINE",
            message: mLog.description || `${mLog.type}: Logged for ${eq.equipmentTag}`,
          });
        });
      } else {
        // 2. Derive log entry directly from live equipment status & condition
        if (eq.status === "UNDER_MAINTENANCE") {
          entries.push({
            id: `maint-${eq.id}`,
            timestamp: "14:35 PM",
            equipmentTag: eq.equipmentTag,
            equipmentName: eq.name,
            type: "MAINTENANCE",
            message: "Status: UNDER_MAINTENANCE • Scheduled annual SF6 gas pressure & contact testing",
          });
        } else if (eq.condition === "CRITICAL" || eq.condition === "POOR") {
          entries.push({
            id: `alert-${eq.id}`,
            timestamp: "09:15 AM",
            equipmentTag: eq.equipmentTag,
            equipmentName: eq.name,
            type: "ALERT",
            message: `Condition: ${eq.condition} • Sensor warning threshold exceeded`,
          });
        } else if (eq.status === "COMMISSIONED") {
          entries.push({
            id: `online-${eq.id}`,
            timestamp: "11:10 AM",
            equipmentTag: eq.equipmentTag,
            equipmentName: eq.name,
            type: "ONLINE",
            message: "Status: COMMISSIONED • Synchronized to grid & operating normally",
          });
        }
      }
    });

    // Sort logs so MAINTENANCE & ALERT events appear at top
    return entries
      .sort((a, b) => {
        if (a.type === b.type) return 0;
        if (a.type === "ONLINE") return 1;
        if (b.type === "ONLINE") return -1;
        return 0;
      })
      .slice(0, 5);
  }, [equipments]);

  return (
    <Card className="w-80 border border-black/10 dark:border-white/10 bg-black/85 dark:bg-[#0B1013]/90 shadow-2xl backdrop-blur-md text-text-primary overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors border-b border-black/10 dark:border-white/10 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-flow-teal" />
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-white">
            EQUIPMENT ALERTS & LOGS
          </span>
          <span className="rounded-full bg-flow-teal/20 px-2 py-0.5 font-mono text-[10px] text-flow-teal font-bold border border-flow-teal/30">
            {logs.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      log.type === "ONLINE" && "bg-flow-teal",
                      log.type === "MAINTENANCE" && "bg-amber-400 animate-pulse",
                      log.type === "ALERT" && "bg-red-400 animate-ping"
                    )}
                  />
                  <span className="text-white">{log.equipmentTag}</span>
                </div>
                <span className="text-[10px] text-text-muted">{log.timestamp}</span>
              </div>
              <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                {log.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const DEFAULT_EQUIPMENTS: EquipmentWithLocation[] = [
  {
    id: "eq-tu-01",
    projectId: "proj-1",
    equipmentTag: "TU-01",
    name: "Francis Turbine Unit 1 (5.65 MW)",
    category: "TURBINE",
    manufacturer: "ANDRITZ Hydro",
    model: "FR-V-1250",
    serialNumber: "AND-2025-FT01",
    installationDate: null,
    commissionDate: null,
    location: "Powerhouse Main Bay (Unit 1)",
    siteLocationId: "loc-powerhouse",
    zone: "TURBINE_HALL",
    positionX: 52,
    positionY: 60,
    status: "COMMISSIONED",
    condition: "EXCELLENT",
    specifications: { "Rated Power": "5.65 MW", "Rated Head": "45 m", "Rated Flow": "14.2 m³/s" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-gen-01",
    projectId: "proj-1",
    equipmentTag: "GEN-01",
    name: "Synchronous Generator Unit 1",
    category: "GENERATOR",
    manufacturer: "ANDRITZ Hydro",
    model: "SG-V-6250",
    serialNumber: "AND-2025-GEN01",
    installationDate: null,
    commissionDate: null,
    location: "Powerhouse Generator Floor (Unit 1)",
    siteLocationId: "loc-powerhouse",
    zone: "TURBINE_HALL",
    positionX: 50,
    positionY: 58,
    status: "COMMISSIONED",
    condition: "GOOD",
    specifications: { "Output Voltage": "6.3 kV", "Power Factor": "0.8" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-tr-gsu-01",
    projectId: "proj-1",
    equipmentTag: "TR-GSU-01",
    name: "Main GSU Step-Up Transformer (15 MVA)",
    category: "TRANSFORMER",
    manufacturer: "Hyundai Heavy Industries",
    model: "GSU-12.5M",
    serialNumber: "HHI-2025-TR01",
    installationDate: null,
    commissionDate: null,
    location: "Outdoor Switchyard Transformer Bay 1",
    siteLocationId: "loc-switchyard",
    zone: "SWITCHYARD",
    positionX: 72,
    positionY: 68,
    status: "COMMISSIONED",
    condition: "EXCELLENT",
    specifications: { "Rated Power": "15 MVA", "Primary Voltage": "6.3 kV", "Secondary Voltage": "69 kV" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-cb-69kv-01",
    projectId: "proj-1",
    equipmentTag: "CB-69KV-01",
    name: "69kV SF6 Gas Circuit Breaker",
    category: "CIRCUIT_BREAKER",
    manufacturer: "Schneider Electric",
    model: "SF6-69K",
    serialNumber: "SE-SF6-69-882",
    installationDate: null,
    commissionDate: null,
    location: "Outdoor Switchyard Feeder 1",
    siteLocationId: "loc-switchyard",
    zone: "SWITCHYARD",
    positionX: 76,
    positionY: 72,
    status: "UNDER_MAINTENANCE",
    condition: "FAIR",
    specifications: { "Rated Voltage": "69 kV", "Rated Current": "1200 A" },
    maintenanceLogs: [
      {
        id: "log-cb-69kv-01",
        type: "Scheduled Inspection",
        description: "Status: UNDER_MAINTENANCE • Scheduled annual SF6 gas pressure & contact testing in progress",
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-ds-69kv-01",
    projectId: "proj-1",
    equipmentTag: "DS-69KV-01",
    name: "69kV Motorized Disconnect & Grounding Switch",
    category: "CIRCUIT_BREAKER",
    manufacturer: "ABB / Hitachi Energy",
    model: "SDF-69K",
    serialNumber: "ABB-DS-2025-04",
    installationDate: null,
    commissionDate: null,
    location: "Outdoor Switchyard Bus Bay 1",
    siteLocationId: "loc-switchyard",
    zone: "SWITCHYARD",
    positionX: 74,
    positionY: 70,
    status: "COMMISSIONED",
    condition: "EXCELLENT",
    specifications: { "Rated Voltage": "69 kV", "Continuous Current": "1200 A", "Operation": "Motorized Gang" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-la-69kv-01",
    projectId: "proj-1",
    equipmentTag: "LA-69KV-01",
    name: "69kV Surge Arrester & PT/CT Metering Set",
    category: "PROTECTION_RELAY",
    manufacturer: "Siemens Energy",
    model: "3EK4-69K",
    serialNumber: "SIE-LA-2025-09",
    installationDate: null,
    commissionDate: null,
    location: "Outdoor Switchyard Line Entry Bay",
    siteLocationId: "loc-switchyard",
    zone: "SWITCHYARD",
    positionX: 78,
    positionY: 74,
    status: "COMMISSIONED",
    condition: "EXCELLENT",
    specifications: { "MCOV": "54 kV", "Discharge Class": "Class 3", "PT Ratio": "69kV / 110V" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-gov-01",
    projectId: "proj-1",
    equipmentTag: "GOV-01",
    name: "Digital Governor Unit 1",
    category: "GOVERNOR",
    manufacturer: "Voith Hydro",
    model: "HydroGyn-PLC",
    serialNumber: "VH-2025-GOV01",
    installationDate: null,
    commissionDate: null,
    location: "Powerhouse Control Room Level",
    siteLocationId: "loc-powerhouse",
    zone: "TURBINE_HALL",
    positionX: 48,
    positionY: 55,
    status: "COMMISSIONED",
    condition: "EXCELLENT",
    specifications: { "Control System": "Siemens S7-1500 PLC" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-int-gate-01",
    projectId: "proj-1",
    equipmentTag: "INT-GATE-01",
    name: "Main Intake Radial Gate",
    category: "GATE_VALVE",
    manufacturer: "DSD Noell",
    model: "RAD-GATE-4X4",
    serialNumber: "DSD-2025-G01",
    installationDate: null,
    commissionDate: null,
    location: "Upper Dam Intake Structure",
    siteLocationId: "loc-intake",
    zone: "INTAKE",
    positionX: 20,
    positionY: 25,
    status: "INSTALLED",
    condition: "GOOD",
    specifications: { "Gate Dimensions": "4.0 m x 4.0 m" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-pen-valve-01",
    projectId: "proj-1",
    equipmentTag: "PEN-VALVE-01",
    name: "Penstock Butterfly Valve",
    category: "GATE_VALVE",
    manufacturer: "VAG Group",
    model: "BFV-2200-PN10",
    serialNumber: "VAG-2025-PV01",
    installationDate: null,
    commissionDate: null,
    location: "Penstock Intake Chamber",
    siteLocationId: "loc-penstock",
    zone: "PENSTOCK",
    positionX: 35,
    positionY: 40,
    status: "INSTALLED",
    condition: "GOOD",
    specifications: { "Nominal Diameter": "2200 mm" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
  {
    id: "eq-scada-01",
    projectId: "proj-1",
    equipmentTag: "SCADA-01",
    name: "SCADA Master Control Station",
    category: "SCADA_PLC",
    manufacturer: "GE Digital",
    model: "iFIX-Nexus-6.5",
    serialNumber: "GE-SCADA-01",
    installationDate: null,
    commissionDate: null,
    location: "Powerhouse Server Room",
    siteLocationId: "loc-powerhouse",
    zone: "TURBINE_HALL",
    positionX: 45,
    positionY: 52,
    status: "COMMISSIONED",
    condition: "GOOD",
    specifications: { "Software": "iFIX 6.5 Proficy" },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
  },
];

interface PerfStats {
  fps: number;
  ms: number;
  calls: number;
  tris: number;
}

function RenderInfoLogger({ onStatsUpdate }: { onStatsUpdate?: (stats: PerfStats) => void }) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const lastCalls = useRef(0);
  const lastTris = useRef(0);

  // Disable auto-reset so EffectComposer doesn't zero out counters before we read them
  useEffect(() => {
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = true; };
  }, [gl]);

  // Run AFTER render (high renderPriority = late execution after EffectComposer)
  useFrame(() => {
    // Capture stats AFTER the render pass completed
    const calls = gl.info.render.calls;
    const tris = gl.info.render.triangles;
    // Only store non-zero reads (EffectComposer may read mid-pass)
    if (calls > 0 || tris > 0) {
      lastCalls.current = calls;
      lastTris.current = tris;
    }
    // Manually reset for next frame (since autoReset is disabled)
    gl.info.reset();

    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 400) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      const ms = parseFloat((delta / frameCount.current).toFixed(1));
      frameCount.current = 0;
      lastTime.current = now;

      // Update DOM directly for zero React re-render overhead
      if (typeof document !== "undefined") {
        const elFps = document.getElementById("perf-hud-fps");
        const elMs = document.getElementById("perf-hud-ms");
        const elCalls = document.getElementById("perf-hud-calls");
        const elTris = document.getElementById("perf-hud-tris");
        if (elFps) elFps.textContent = `${fps} FPS`;
        if (elMs) elMs.textContent = `${ms} ms`;
        if (elCalls) elCalls.textContent = `${lastCalls.current} Calls`;
        if (elTris) elTris.textContent = `${(lastTris.current / 1000).toFixed(1)}k Tris`;
      }
    }

    if (typeof window !== "undefined") {
      (window as unknown as { __R3F_INFO__?: Record<string, number> }).__R3F_INFO__ = {
        calls: lastCalls.current,
        triangles: lastTris.current,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      };
    }
  }, 1000); // renderPriority=1000: run AFTER scene render + EffectComposer
  return null;
}

/**
 * Main PlantScene Client Component
 */
interface PlantSceneProps {
  flowIntensity?: number; // 0.0 to 1.0 configurable prop for plant capacity/flow rate
}

export default function PlantScene({ flowIntensity = 0.85 }: PlantSceneProps) {
  const [activePreset, setActivePreset] = useState<CameraPresetKey>("temfacil");
  const [isFreeNav, setIsFreeNav] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<number>(0);
  const [zoomStepToken, setZoomStepToken] = useState<number>(0);
  const [isXRay, setIsXRay] = useState<boolean>(false);
  const [devStormToggle, setDevStormToggle] = useState<boolean>(false);
  const [isCameraPanelOpen, setIsCameraPanelOpen] = useState<boolean>(true);
  const [weatherData, setWeatherData] = useState<PagasaSignalData | null>(null);
  const [equipments, setEquipments] = useState<EquipmentWithLocation[]>(DEFAULT_EQUIPMENTS);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithLocation | null>(null);
  const [isLocomotionLabOpen, setIsLocomotionLabOpen] = useState<boolean>(false);

  // Time-of-day visual mode (initialized dynamically from live Philippine Time)
  const [timeMode, setTimeMode] = useState<AtmosphereTimeMode>(getAutomaticPHTimeMode);

  // Filipino Personnel Dossier & Workforce modal state
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState<boolean>(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  // Supercar Showcase & Configurator state
  const [supercarCustomization, setSupercarCustomization] = useState<SupercarCustomization>({
    bodyColor: "#D90429",
    rimsColor: "#F8FAFC",
    caliperColor: "#F59E0B",
    glassColor: "#1E3A5F",
    isDriving: false,
  });
  const [isSupercarConfigOpen, setIsSupercarConfigOpen] = useState<boolean>(false);

  // GTA-style Player Controller mode
  const [isGtaModeActive, setIsGtaModeActive] = useState<boolean>(false);

  const handleSelectPreset = (preset: CameraPresetKey) => {
    setActivePreset(preset);
    setIsFreeNav(false);
  };

  const handleResetCamera = () => {
    setResetToken((prev) => prev + 1);
    setIsFreeNav(false);
  };

  const handleStepZoom = (deltaY: number) => {
    setIsFreeNav(true);
    setZoomStepToken((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent("plant-scene-step-zoom", { detail: { deltaY } }));
  };

  const handleToggleFreeNav = () => {
    setIsFreeNav((prev) => !prev);
  };

  // Fetch real plant equipment records via reverse lookup server action
  useEffect(() => {
    let isMounted = true;
    async function loadEquipments() {
      try {
        const records = await getEquipmentByLocation("all");
        if (isMounted && records && records.length > 0) {
          setEquipments(records as unknown as EquipmentWithLocation[]);
        }
      } catch (err) {
        console.error("Failed to load digital twin equipments:", err);
      }
    }
    loadEquipments();
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll live PAGASA Severe Weather Bulletin API every 60s
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      try {
        const res = await fetch("/api/weather/pagasa-signals");
        if (!res.ok) return;
        const data: PagasaSignalData = await res.json();
        if (isMounted && data) {
          setWeatherData(data);
        }
      } catch (err) {
        console.error("Failed to fetch PAGASA weather signals:", err);
      }
    }
    loadWeather();
    const interval = setInterval(loadWeather, 60000); // 60s real-time poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Determine active storm environmental overlay state based on live PAR boundary and hoisted signals
  const isStormInPar = Boolean(
    weatherData?.position && isWithinPAR(weatherData.position.lat, weatherData.position.lng)
  );
  const isSignalHoisted = Boolean(
    weatherData?.siteSignalNumber && weatherData.siteSignalNumber > 0
  );
  const isRealStorm = isSignalHoisted || isStormInPar;
  const isStormActive = isRealStorm || devStormToggle;

  const activeSignalNumber = devStormToggle
    ? 2
    : weatherData?.siteSignalNumber && weatherData.siteSignalNumber > 0
    ? weatherData.siteSignalNumber
    : 0;

  const maintCount = useMemo(() => {
    return equipments.filter((e) => e.status === "UNDER_MAINTENANCE").length;
  }, [equipments]);

  const alertCount = useMemo(() => {
    return equipments.filter((e) => e.condition === "CRITICAL" || e.condition === "POOR").length;
  }, [equipments]);

  const onlineCount = useMemo(() => {
    return equipments.filter(
      (e) =>
        e.status === "COMMISSIONED" &&
        e.condition !== "CRITICAL" &&
        e.condition !== "POOR"
    ).length;
  }, [equipments]);

  const totalAssetsCount = useMemo(() => {
    return equipments.length;
  }, [equipments]);

  const commissionPct = useMemo(() => {
    if (equipments.length === 0) return 100;
    return Math.round((onlineCount / equipments.length) * 100);
  }, [onlineCount, equipments.length]);

  const currentOutputMw = useMemo(() => {
    return (11.3 * flowIntensity * (commissionPct / 100)).toFixed(1);
  }, [flowIntensity, commissionPct]);

  return (
    <div className="relative h-full w-full bg-[var(--bg-base,#0B1013)] overflow-hidden">
      <Suspense fallback={<PlantSceneLoading />}>
        <Canvas
          shadows
          dpr={[1, 1.2]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          className="h-full w-full"
        >
          <RenderInfoLogger />
          <PlantSceneInner
            activePreset={activePreset}
            equipments={equipments}
            selectedEquipment={selectedEquipment}
            onSelectEquipment={(eq) => setSelectedEquipment(eq)}
            flowIntensity={flowIntensity}
            isXRay={isXRay}
            isStormActive={isStormActive}
            effectiveTime={timeMode}
            isFreeNav={isFreeNav}
            onUserInteract={() => setIsFreeNav(true)}
            resetToken={resetToken}
            supercarCustomization={supercarCustomization}
            isGtaModeActive={isGtaModeActive}
            onSelectPerson={(id) => {
              setSelectedPersonnelId(id);
              setIsPersonnelModalOpen(true);
            }}
            onSelectPreset={handleSelectPreset}
          />
        </Canvas>
      </Suspense>

      {/* ─── HUD Top Bar: Status Chips (Left) & Alerts Panel (Right) ─── */}
      <div className="absolute top-20 left-6 right-6 z-20 pointer-events-none flex items-start justify-between gap-4">
        {/* Left Side: Real-time Telemetry & Navigation Status Chips */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-2">
          {/* 🇵🇭 Real-Time Philippine Time & Time-of-Day Status Chip */}
          <PhilippineTimeChip effectiveTime={timeMode} />

          {/* 🔊 Sierra Madre Soundscape & Audio Controls */}
          <SiteAudioControls timeMode={timeMode} isStormActive={isStormActive} />

          {/* Environmental Weather Status Chip */}
          <div
            className={cn(
              "rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium backdrop-blur-md flex items-center gap-1.5 shadow-xl transition-all shrink-0",
              isStormActive
                ? isSignalHoisted
                  ? "border-red-500/50 bg-black/85 text-red-400 shadow-red-500/20 ring-1 ring-red-500/30"
                  : "border-amber-500/50 bg-black/85 text-amber-400 shadow-amber-500/20 ring-1 ring-amber-500/30"
                : weatherData?.hasActiveBulletin
                ? "border-sky-500/40 bg-black/85 text-sky-400"
                : "border-emerald-500/30 bg-black/75 text-emerald-400"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isStormActive
                  ? isSignalHoisted
                    ? "bg-red-500 animate-ping"
                    : "bg-amber-400 animate-ping"
                  : weatherData?.hasActiveBulletin
                  ? "bg-sky-400 animate-pulse"
                  : "bg-emerald-400"
              )}
            />
            <span>
              {devStormToggle
                ? "TYPHOON SIMULATION • TCWS #2"
                : isSignalHoisted
                ? `TYPHOON: ${weatherData?.tcName} • TCWS #${weatherData?.siteSignalNumber}`
                : isStormInPar
                ? `TYPHOON: ${weatherData?.tcName} (PAR) • MONITORING`
                : weatherData?.hasActiveBulletin
                ? `PAR CLEAR • TRACKING ${weatherData?.tcName || "OBET"}`
                : "ATMOSPHERE: CLEAR • PAR CLEAR"}
            </span>
          </div>

          {/* Live Commissioning % & Output Gauge Chip */}
          <div className="rounded-lg border border-flow-teal/30 bg-black/85 text-white px-2.5 py-1 font-mono text-[11px] shadow-xl backdrop-blur-md flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-flow-teal font-semibold">
              <Gauge className="h-3 w-3" />
              <span>{commissionPct}%</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1 text-white">
              <Zap className="h-3 w-3 text-flow-teal fill-flow-teal/20" />
              <span>{currentOutputMw} / 11.3 MW</span>
              <span className="h-1.5 w-1.5 rounded-full bg-flow-teal animate-pulse" />
            </div>
          </div>

          {/* Equipment Status Count Summary Chip */}
          <div className="rounded-lg border border-white/10 bg-black/85 text-white px-2.5 py-1 font-mono text-[11px] shadow-xl backdrop-blur-md flex items-center gap-1.5 shrink-0">
            <span className="text-flow-teal font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {onlineCount} Online
            </span>
            <span className="text-white/20">•</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {maintCount} Maint
            </span>
            {alertCount > 0 && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-red-400 font-semibold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount} Critical
                </span>
              </>
            )}
            <span className="text-white/20">|</span>
            <span className="text-text-muted">{totalAssetsCount} Total</span>
          </div>

          {/* Navigation Mode Status Indicator Chip */}
          <div
            className={cn(
              "rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-xl transition-all cursor-pointer shrink-0",
              isFreeNav
                ? "border-flow-teal/50 bg-black/85 text-flow-teal shadow-flow-teal/20 ring-1 ring-flow-teal/40"
                : "border-white/10 bg-black/75 text-text-muted hover:text-white"
            )}
            onClick={handleToggleFreeNav}
            title={isFreeNav ? "Click to lock to preset camera view" : "Click to unlock free orbit & pan"}
          >
            {isFreeNav ? (
              <>
                <Unlock className="h-3 w-3 text-flow-teal animate-pulse" />
                <span>FREE NAV</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-text-muted" />
                <span className="uppercase truncate max-w-[130px]">PRESET: {activePreset}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Collapsible Equipment Alerts Feed Panel or Equipment Detail Drawer */}
        <div className="pointer-events-auto shrink-0">
          {!selectedEquipment && <AlertsFeedPanel equipments={equipments} />}
          {selectedEquipment && (
            <EquipmentDetailDrawer
              equipment={selectedEquipment}
              onClose={() => setSelectedEquipment(null)}
            />
          )}
        </div>
      </div>

      {/* ─── HUD Bottom Bar: Facility Navigation (Left), Model Badge (Center), Perf Telemetry (Right) ─── */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex items-end justify-between gap-4">
        {/* Left Side: Facility Navigation Card */}
        <div className="pointer-events-auto shrink-0">
          <Card className="border border-white/10 bg-black/85 backdrop-blur-md text-white p-2.5 shadow-2xl transition-all w-[304px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-flow-teal">
                <Camera className="h-3.5 w-3.5" />
                <span>FACILITY NAVIGATION</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-text-muted hover:text-white"
                onClick={() => setIsCameraPanelOpen(!isCameraPanelOpen)}
              >
                {isCameraPanelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {isCameraPanelOpen && (
              <div className="space-y-1.5 pt-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={activePreset === "overview" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "overview" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("overview")}
                    title="Powerhouse Overview"
                  >
                    <Eye className="h-3 w-3 mr-1.5 shrink-0" />
                    <span className="truncate">Overview</span>
                  </Button>
                  <Button
                    variant={activePreset === "turbine-hall" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "turbine-hall" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("turbine-hall")}
                    title="Turbine Hall Interior"
                  >
                    <Zap className="h-3 w-3 mr-1.5 shrink-0 text-flow-teal" />
                    <span className="truncate">Turbine Hall</span>
                  </Button>
                  <Button
                    variant={activePreset === "switchyard" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "switchyard" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("switchyard")}
                    title="69kV High-Voltage Switchyard"
                  >
                    <ScanEye className="h-3 w-3 mr-1.5 shrink-0 text-amber-400" />
                    <span className="truncate">Switchyard</span>
                  </Button>
                  <Button
                    variant={activePreset === "tailrace-floodgate" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "tailrace-floodgate" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("tailrace-floodgate")}
                    title="Tailrace Floodgate & River Outlet"
                  >
                    <Waves className="h-3 w-3 mr-1.5 shrink-0 text-cyan-400" />
                    <span className="truncate">Tailrace Gate</span>
                  </Button>
                  <Button
                    variant={activePreset === "temfacil" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "temfacil" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("temfacil")}
                    title="TEMFACIL Temporary Facility Compound"
                  >
                    <Building2 className="h-3 w-3 mr-1.5 shrink-0 text-amber-400" />
                    <span className="truncate">Temfacil Site</span>
                  </Button>
                  <Button
                    variant={activePreset === "temfacil-guardhouse" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "temfacil-guardhouse" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("temfacil-guardhouse")}
                    title="Security Gate 1 & Vehicle Inspection"
                  >
                    <ShieldAlert className="h-3 w-3 mr-1.5 shrink-0 text-emerald-400" />
                    <span className="truncate">Guardhouse</span>
                  </Button>
                  <Button
                    variant={activePreset === "temfacil-barracks" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "temfacil-barracks" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("temfacil-barracks")}
                    title="Workers Barracks & Kusina Canteen"
                  >
                    <Building2 className="h-3 w-3 mr-1.5 shrink-0 text-orange-400" />
                    <span className="truncate">Barracks & Food</span>
                  </Button>
                  <Button
                    variant={activePreset === "temfacil-office" && !isFreeNav ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "font-mono text-[11px] h-7 px-2 justify-start transition-all",
                      activePreset === "temfacil-office" && !isFreeNav && "border-flow-teal bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => handleSelectPreset("temfacil-office")}
                    title="Engineering Staff Office"
                  >
                    <Building2 className="h-3 w-3 mr-1.5 shrink-0 text-teal-400" />
                    <span className="truncate">Staff Office</span>
                  </Button>
                </div>

                {/* Time of Day Cycle Buttons */}
                <div className="pt-1.5 border-t border-white/10 flex flex-col gap-1">
                  <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">Atmosphere Time (Sierra Madre)</span>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant={timeMode === "MORNING" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "font-mono text-[10px] h-6 px-1.5 justify-center transition-all",
                        timeMode === "MORNING" && "border-amber-400/80 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
                      )}
                      onClick={() => setTimeMode("MORNING")}
                      title="Morning Dawn & Valley Mist (05:00 - 11:00)"
                    >
                      <SunMedium className="h-3 w-3 mr-1 text-amber-400" />
                      Morning
                    </Button>
                    <Button
                      variant={timeMode === "AFTERNOON" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "font-mono text-[10px] h-6 px-1.5 justify-center transition-all",
                        timeMode === "AFTERNOON" && "border-sky-400/80 bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40"
                      )}
                      onClick={() => setTimeMode("AFTERNOON")}
                      title="Tropical Midday & Cumulus Clouds (11:00 - 17:00)"
                    >
                      <Sun className="h-3 w-3 mr-1 text-sky-300" />
                      Day
                    </Button>
                    <Button
                      variant={timeMode === "SUNSET" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "font-mono text-[10px] h-6 px-1.5 justify-center transition-all",
                        timeMode === "SUNSET" && "border-orange-400/80 bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/40"
                      )}
                      onClick={() => setTimeMode("SUNSET")}
                      title="Alpenglow Sunset & Twilight (17:00 - 19:00)"
                    >
                      <Sunset className="h-3 w-3 mr-1 text-orange-400" />
                      Sunset
                    </Button>
                    <Button
                      variant={timeMode === "NIGHT" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "font-mono text-[10px] h-6 px-1.5 justify-center transition-all",
                        timeMode === "NIGHT" && "border-indigo-400/80 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/40"
                      )}
                      onClick={() => setTimeMode("NIGHT")}
                      title="Starry Night & Fireflies (19:00 - 05:00)"
                    >
                      <Moon className="h-3 w-3 mr-1 text-indigo-300" />
                      Night
                    </Button>
                  </div>
                </div>

                {/* Free-Nav Stepped Zoom & Reset Orbit Tools */}
                <div className="pt-1.5 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-[11px] h-6 px-2 flex-1 justify-center"
                      onClick={() => handleStepZoom(-1)}
                      title="Step Zoom In"
                    >
                      Zoom +
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-[11px] h-6 px-2 flex-1 justify-center"
                      onClick={() => handleStepZoom(1)}
                      title="Step Zoom Out"
                    >
                      Zoom -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-[11px] h-6 px-2 justify-center text-text-muted hover:text-white"
                      onClick={handleResetCamera}
                      title="Reset to Preset View"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    variant={isXRay ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start font-mono text-xs transition-all",
                      isXRay && "bg-flow-teal/20 text-flow-teal border-flow-teal/50 ring-1 ring-flow-teal/30"
                    )}
                    onClick={() => setIsXRay(!isXRay)}
                  >
                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                    X-Ray Wireframe {isXRay ? "ON" : "OFF"}
                  </Button>

                  {process.env.NODE_ENV !== "production" && (
                    <Button
                      variant={devStormToggle ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-full justify-start font-mono text-xs transition-all",
                        devStormToggle && "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 ring-1 ring-amber-500/40"
                      )}
                      onClick={() => setDevStormToggle(!devStormToggle)}
                    >
                      <CloudRain className="h-3.5 w-3.5 mr-1.5" />
                      Storm Overlay (Dev)
                    </Button>
                  )}
                </div>

                {/* ─── Feature Showcase Toggles ─── */}
                <div className="pt-1.5 mt-1.5 border-t border-white/10 flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Workforce & Features</span>

                  {/* 👥 Filipino Site Personnel Roster & Dossier */}
                  <Button
                    variant={isPersonnelModalOpen ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start font-sans text-xs font-medium transition-all",
                      isPersonnelModalOpen && "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40"
                    )}
                    onClick={() => setIsPersonnelModalOpen(!isPersonnelModalOpen)}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                    Site Personnel Roster
                  </Button>

                  <Button
                    variant={isSupercarConfigOpen ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start font-sans text-xs font-medium transition-all",
                      isSupercarConfigOpen && "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 ring-1 ring-red-500/40"
                    )}
                    onClick={() => setIsSupercarConfigOpen(!isSupercarConfigOpen)}
                  >
                    <Car className="h-3.5 w-3.5 mr-1.5" />
                    Supercar Configurator
                  </Button>

                  <Button
                    variant={isGtaModeActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start font-sans text-xs font-medium transition-all",
                      isGtaModeActive && "bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30 ring-1 ring-purple-500/40"
                    )}
                    onClick={() => setIsGtaModeActive(!isGtaModeActive)}
                  >
                    <Gamepad2 className="h-3.5 w-3.5 mr-1.5" />
                    GTA Driving Mode
                  </Button>

                  <Button
                    variant={isLocomotionLabOpen ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full justify-start font-sans text-xs font-medium transition-all",
                      isLocomotionLabOpen && "bg-sky-500/20 text-sky-400 border-sky-500/50 hover:bg-sky-500/30 ring-1 ring-sky-500/40"
                    )}
                    onClick={() => setIsLocomotionLabOpen(!isLocomotionLabOpen)}
                  >
                    <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                    Locomotion Laboratory
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Center: Powerhouse Architectural Model Badge */}
        <div className="pointer-events-none select-none hidden lg:flex items-center gap-2 rounded-lg border border-white/10 bg-black/75 px-3.5 py-1.5 font-mono text-[10px] text-text-muted backdrop-blur-md shadow-xl mb-0.5">
          <Layers className="h-3.5 w-3.5 text-flow-teal shrink-0" />
          <span>11.3 MW HEPP · Powerhouse Architectural Model</span>
        </div>

        {/* Right Side: Real-time Hardware Performance Telemetry HUD Chip */}
        <div className="pointer-events-none select-none flex items-center gap-2.5 bg-black/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-3 py-1.5 font-mono text-[11px] text-emerald-400 shadow-xl mb-0.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span id="perf-hud-fps" className="font-bold">60 FPS</span>
          </div>
          <span className="text-gray-600">|</span>
          <span id="perf-hud-ms" className="text-gray-300">16.6 ms</span>
          <span className="text-gray-600">|</span>
          <span id="perf-hud-calls" className="text-cyan-400">-- Calls</span>
          <span className="text-gray-600">|</span>
          <span id="perf-hud-tris" className="text-cyan-400">--k Tris</span>
        </div>
      </div>

      {/* ─── OVERLAY MODALS ─── */}

      {/* Filipino Personnel Profile Dossier Modal */}
      {isPersonnelModalOpen && (
        <PersonnelProfileModal
          selectedPersonnelId={selectedPersonnelId}
          onClose={() => setIsPersonnelModalOpen(false)}
          onSelectPersonnel={(id) => setSelectedPersonnelId(id)}
        />
      )}

      {/* Supercar Configurator HUD Overlay */}
      {isSupercarConfigOpen && (
        <SupercarConfiguratorOverlay
          isOpen={isSupercarConfigOpen}
          customization={supercarCustomization}
          onChange={(updates) => setSupercarCustomization(prev => ({ ...prev, ...updates }))}
          onClose={() => setIsSupercarConfigOpen(false)}
        />
      )}

      {/* Locomotion Laboratory Modal */}
      <LocomotionLaboratoryModal
        isOpen={isLocomotionLabOpen}
        onClose={() => setIsLocomotionLabOpen(false)}
      />
    </div>
  );
}
