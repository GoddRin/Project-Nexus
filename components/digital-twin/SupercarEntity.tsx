"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { getSiteSurfaceY } from "./uphillRoadConfig";
import { gtaRuntime } from "./gtaRuntime";

// ═══ HIGH-PERFORMANCE SHARED MODULE-SCOPE BUFFERGEOMETRIES ═══
const GEO_UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const GEO_UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const GEO_UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const GEO_UNIT_RING = new THREE.RingGeometry(0.8, 1.0, 24);

export interface SupercarCustomization {
  bodyColor: string;
  rimsColor: string;
  caliperColor: string;
  glassColor: string;
  isDriving: boolean;
  // 🌟 NEON UNDERGLOW ILLUMINATION
  underglowEnabled?: boolean;
  underglowColor?: string; // Hex string or "RAINBOW"
  underglowMode?: "STEADY" | "PULSE" | "STROBE" | "SPEED_REACTIVE" | "RAINBOW_WAVE";
  underglowIntensity?: number; // 0.5 to 3.0
  // 🏎️ PERFORMANCE & AERO PACKAGES
  headlightMode?: "OFF" | "DRL" | "FULL" | "STROBE";
  exhaustFlames?: boolean;
  nosPurge?: boolean;
  airSuspensionLowered?: boolean;
  doorOpen?: boolean;
  policeStrobe?: boolean;
}

export const SUPERCAR_PRESET_COLORS = [
  { name: "Rosso Corsa", hex: "#D90429", desc: "Classic Ferrari Racing Red" },
  { name: "Giallo Modena", hex: "#EAB308", desc: "Canary Modena Yellow" },
  { name: "Nero Daytona", hex: "#0F172A", desc: "Metallic Obsidian Black" },
  { name: "Grigio Silverstone", hex: "#475569", desc: "Satin Titanium Gunmetal" },
  { name: "Blu Corsa", hex: "#0284C7", desc: "Deep Metallic Azure" },
  { name: "Bianco Avus", hex: "#F8FAFC", desc: "Pearlescent Arctic White" },
  { name: "Verde Mantis", hex: "#10B981", desc: "Electric Hyper Green" },
  { name: "Viola Pasifae", hex: "#7C3AED", desc: "Midnight Royal Purple" },
];

export const SUPERCAR_RIMS_PRESETS = [
  { name: "Liquid Chrome", hex: "#F8FAFC" },
  { name: "Satin Gunmetal", hex: "#334155" },
  { name: "Champagne Gold", hex: "#D97706" },
  { name: "Gloss Black", hex: "#0F172A" },
];

export const SUPERCAR_CALIPER_PRESETS = [
  { name: "Brembo Yellow", hex: "#F59E0B" },
  { name: "Racing Red", hex: "#DC2626" },
  { name: "Toxic Green", hex: "#10B981" },
  { name: "Carbon Black", hex: "#1E293B" },
];

export const SUPERCAR_UNDERGLOW_PRESETS = [
  { name: "Cyberpunk Cyan", hex: "#00F5FF" },
  { name: "Synthwave Magenta", hex: "#D946EF" },
  { name: "Toxic Lime", hex: "#22C55E" },
  { name: "Ferrari Hyper Red", hex: "#EF4444" },
  { name: "Electric Ice Blue", hex: "#38BDF8" },
  { name: "Golden Amber", hex: "#F59E0B" },
  { name: "Arctic Xenon", hex: "#F8FAFC" },
  { name: "🌈 Rainbow Cycle", hex: "RAINBOW" },
];

interface SupercarEntityProps {
  customization?: Partial<SupercarCustomization>;
  onSelect?: () => void;
  isSelected?: boolean;
  manualPosition?: [number, number, number];
  manualRotationY?: number;
  manualPitch?: number;
  manualRoll?: number;
  manualSpeed?: number;
  manualSteer?: number;
  driverDoorAngle?: number;
  isDriverInside?: boolean;
  headlightsOn?: boolean;
  isPlayerControlled?: boolean;
}

/**
 * Helper to build high-resolution contoured diffusion texture for realistic neon underglow.
 * Strictly contoured to rocker panels, front lip, and rear diffuser with inverse-square falloff,
 * central floorpan occlusion cutout, and tire contact patch cutouts.
 */
function createUnderglowDiffusionTexture(): THREE.CanvasTexture | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 512, 1024);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 1. Draw contoured glow ribbons strictly along side skirts, front lip & rear diffuser
    const drawContourPass = (width: number, alpha: number) => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = width;

      // Left side skirt (hugging body rocker sill between wheels)
      ctx.beginPath();
      ctx.moveTo(156, 350);
      ctx.lineTo(154, 540);
      ctx.lineTo(156, 730);
      ctx.stroke();

      // Right side skirt (hugging body rocker sill between wheels)
      ctx.beginPath();
      ctx.moveTo(356, 350);
      ctx.lineTo(358, 540);
      ctx.lineTo(356, 730);
      ctx.stroke();

      // Front bumper splitter lip (front nose at low Y)
      ctx.beginPath();
      ctx.moveTo(172, 335);
      ctx.quadraticCurveTo(256, 210, 340, 335);
      ctx.stroke();

      // Rear aero diffuser lip (rear tail at high Y)
      ctx.beginPath();
      ctx.moveTo(175, 745);
      ctx.quadraticCurveTo(256, 865, 337, 745);
      ctx.stroke();
    };

    // Layer 1: Smooth outer ambient falloff (zero bounding box artifact)
    drawContourPass(52, 0.16);
    // Layer 2: Medium ground illumination pool
    drawContourPass(28, 0.45);
    // Layer 3: High-intensity ground reflection
    drawContourPass(14, 0.80);
    // Layer 4: Razor-sharp core filament line directly under rocker panel
    drawContourPass(5, 1.0);

    // 2. Cut out tire footprints with destination-out so light never bleeds under the rubber
    // Front axle at Y ≈ 290, Rear axle at Y ≈ 800
    const tirePositions: [number, number][] = [
      [152, 290], // Front Left
      [360, 290], // Front Right
      [152, 800], // Rear Left
      [360, 800], // Rear Right
    ];
    ctx.globalCompositeOperation = "destination-out";
    tirePositions.forEach(([tx, ty]) => {
      const tireGrad = ctx.createRadialGradient(tx, ty, 10, tx, ty, 38);
      tireGrad.addColorStop(0.0, "rgba(0, 0, 0, 1.0)");
      tireGrad.addColorStop(0.75, "rgba(0, 0, 0, 0.85)");
      tireGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
      ctx.fillStyle = tireGrad;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 26, 44, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Central Chassis Undercarriage Floorpan Occlusion (Dark core under the engine tray)
    const centerCutout = ctx.createRadialGradient(256, 545, 25, 256, 545, 115);
    centerCutout.addColorStop(0.0, "rgba(0, 0, 0, 0.95)");
    centerCutout.addColorStop(0.55, "rgba(0, 0, 0, 0.70)");
    centerCutout.addColorStop(0.85, "rgba(0, 0, 0, 0.25)");
    centerCutout.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = centerCutout;
    ctx.beginPath();
    ctx.ellipse(256, 545, 75, 185, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural ambient occlusion contact shadow texture for the car chassis.
 * Soft organic silhouette matching the Ferrari's underbody, eliminating harsh box cutoffs.
 */
function createChassisShadowTexture(): THREE.CanvasTexture | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 512, 1024);

    // Main underbody ambient occlusion
    const shadowGrad = ctx.createRadialGradient(256, 512, 40, 256, 512, 190);
    shadowGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.85)");
    shadowGrad.addColorStop(0.4, "rgba(0, 0, 0, 0.65)");
    shadowGrad.addColorStop(0.75, "rgba(0, 0, 0, 0.25)");
    shadowGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(256, 512, 115, 230, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary nose & tail softer shadows
    const frontGrad = ctx.createRadialGradient(256, 330, 20, 256, 330, 110);
    frontGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.65)");
    frontGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.ellipse(256, 330, 85, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    const rearGrad = ctx.createRadialGradient(256, 690, 20, 256, 690, 110);
    rearGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.70)");
    rearGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = rearGrad;
    ctx.beginPath();
    ctx.ellipse(256, 690, 95, 95, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural forward Xenon/LED headlight low-beam tarmac projection decal texture.
 * Realistic automotive beam profile with sharp upper cutoff line and smooth lateral spread.
 */
function createProjectorBeamTexture(): THREE.CanvasTexture | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);

    const drawBeam = (cx: number) => {
      // Beam originating close to car bumper (Y=420) and casting forward down the road (Y=160)
      const grad = ctx.createRadialGradient(cx, 380, 20, cx, 200, 250);
      grad.addColorStop(0.0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.18, "rgba(240, 249, 255, 0.70)");
      grad.addColorStop(0.50, "rgba(186, 230, 253, 0.28)");
      grad.addColorStop(0.82, "rgba(186, 230, 253, 0.08)");
      grad.addColorStop(1.0, "rgba(186, 230, 253, 0.0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, 220, 68, 175, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Left & right projector beam puddles (matching Ferrari headlight stance)
    drawBeam(185);
    drawBeam(327);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Dedicated tire contact patch shadow stamp texture.
 */
function createTireContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    const grad = ctx.createRadialGradient(64, 128, 15, 64, 128, 62);
    grad.addColorStop(0.0, "rgba(0, 0, 0, 0.95)");
    grad.addColorStop(0.45, "rgba(0, 0, 0, 0.75)");
    grad.addColorStop(0.80, "rgba(0, 0, 0, 0.30)");
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(64, 128, 48, 96, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 🏎️ Ultra-Realistic Ferrari 458 Italia Supercar Component with Neon Underglow & Special FX
 */
export function SupercarEntity({
  customization,
  onSelect,
  isSelected = false,
  manualPosition,
  manualRotationY,
  manualPitch = 0,
  manualRoll = 0,
  manualSpeed,
  manualSteer = 0,
  driverDoorAngle = 0,
  isDriverInside = false,
  headlightsOn,
  isPlayerControlled = false,
}: SupercarEntityProps) {
  const rootRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const headlightsGroupRef = useRef<THREE.Group>(null);

  // Underglow Visual Mesh & Multi-Point Light Refs
  const underglowDecalRef = useRef<THREE.Mesh>(null);
  const underglowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const underglowLightLFRef = useRef<THREE.PointLight>(null);
  const underglowLightLRRef = useRef<THREE.PointLight>(null);
  const underglowLightRFRef = useRef<THREE.PointLight>(null);
  const underglowLightRRRef = useRef<THREE.PointLight>(null);
  const underglowTubeMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Road Projector Decal & F1 Rain Strobe Refs
  const projectorDecalRef = useRef<THREE.Mesh>(null);
  const projectorMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const f1RainStrobeRef = useRef<THREE.Mesh>(null);

  // Exhaust Flames & NOS Purge Refs
  const flameLRef = useRef<THREE.Group>(null);
  const flameRRef = useRef<THREE.Group>(null);
  const nosLRef = useRef<THREE.Mesh>(null);
  const nosRRef = useRef<THREE.Mesh>(null);

  // Wheel node references
  const wheelFLRef = useRef<THREE.Object3D | null>(null);
  const wheelFRRef = useRef<THREE.Object3D | null>(null);
  const wheelRLRef = useRef<THREE.Object3D | null>(null);
  const wheelRRRef = useRef<THREE.Object3D | null>(null);
  const steeringWheelRef = useRef<THREE.Object3D | null>(null);

  // Configuration options with defaults
  const bodyColor = customization?.bodyColor || "#D90429";
  const rimsColor = customization?.rimsColor || "#F8FAFC";
  const caliperColor = customization?.caliperColor || "#F59E0B";
  const glassColor = customization?.glassColor && customization.glassColor !== "#FFFFFF" ? customization.glassColor : "#0F172A";
  const isDrivingAuto = customization?.isDriving ?? false;

  // Underglow configuration
  const underglowEnabled = customization?.underglowEnabled ?? true;
  const underglowColor = customization?.underglowColor || "#00F5FF";
  const underglowMode = customization?.underglowMode || "PULSE";
  const underglowIntensity = customization?.underglowIntensity ?? 1.8;

  // Performance FX toggles
  const exhaustFlames = customization?.exhaustFlames ?? false;
  const nosPurge = customization?.nosPurge ?? false;
  const airSuspensionLowered = customization?.airSuspensionLowered ?? false;
  const doorOpen = customization?.doorOpen ?? false;
  const policeStrobe = customization?.policeStrobe ?? false;
  const headlightMode = customization?.headlightMode || "FULL";

  // Kinematic state refs for 60fps physics
  const wheelRotationAngleRef = useRef(0);
  const currentSpeedRef = useRef(0);
  const targetSpeedRef = useRef(0);
  const pathDistanceRef = useRef(0);
  const steerAngleRef = useRef(0);
  const pitchAngleRef = useRef(0);
  const rollAngleRef = useRef(0);

  // Load the Ferrari 458 Italia GLB model
  const { scene } = useGLTF("/models/ferrari.glb");

  // Clone scene so multiple instances or material re-assignments don't collide
  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  // Procedural Ground Projection & Contact Shadow Textures
  const underglowDiffusionTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createUnderglowDiffusionTexture();
  }, []);

  const chassisShadowTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createChassisShadowTexture();
  }, []);

  const projectorBeamTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createProjectorBeamTexture();
  }, []);

  const tireContactShadowTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createTireContactShadowTexture();
  }, []);

  // Create High-End Showroom Italian Lacquer & Carbon Aero Materials
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(bodyColor),
      metalness: 0.90,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 1.0,
      sheen: 0.5,
      sheenColor: new THREE.Color(bodyColor).lerp(new THREE.Color("#FFFFFF"), 0.25),
    });
  }, [bodyColor]);

  const rimsMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimsColor),
      metalness: 0.95,
      roughness: 0.15,
    });
  }, [rimsColor]);

  const caliperMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(caliperColor),
      metalness: 0.75,
      roughness: 0.25,
    });
  }, [caliperColor]);

  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(glassColor),
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.96,
      transparent: true,
      opacity: 0.35,
      ior: 1.52,
      thickness: 0.15,
      reflectivity: 0.9,
    });
  }, [glassColor]);

  const carbonMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0A0F1D"),
      metalness: 0.85,
      roughness: 0.25,
    });
  }, []);

  const leatherMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1E293B"),
      metalness: 0.1,
      roughness: 0.75,
    });
  }, []);

  const plasticTrimMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0F172A"),
      metalness: 0.2,
      roughness: 0.8,
    });
  }, []);

  const chromeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F8FAFC"),
      metalness: 0.98,
      roughness: 0.08,
    });
  }, []);

  // ─── HIGH-END EXOTIC SUPERCAR LIGHTING MATERIALS ───
  const ledDrlMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#FFFFFF"),
      emissive: new THREE.Color("#BAE6FD"),
      emissiveIntensity: 3.5,
      roughness: 0.1,
      metalness: 0.1,
      toneMapped: false,
    });
  }, []);

  const headlightLensMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFFFFF"),
      transmission: 0.92,
      roughness: 0.05,
      metalness: 0.05,
      ior: 1.52,
      emissive: new THREE.Color("#FFFDF0"),
      emissiveIntensity: 2.2,
      toneMapped: false,
    });
  }, []);

  const taillightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#880000"),
      emissive: new THREE.Color("#FF141E"),
      emissiveIntensity: 3.6,
      roughness: 0.2,
      metalness: 0.2,
      toneMapped: false,
    });
  }, []);

  const interiorLightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#18181B"), // Deep Italian Nero Charcoal Alcantara
      roughness: 0.85,
      metalness: 0.1,
    });
  }, []);

  const steeringRevLightsMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#10B981"),
      toneMapped: false,
    });
  }, []);

  const f1RainStrobeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color("#FF0033"),
      toneMapped: false,
    });
  }, []);

  // Traverse model and assign upgraded materials + find wheel nodes
  useEffect(() => {
    if (!clonedScene) return;

    wheelFLRef.current = clonedScene.getObjectByName("wheel_fl") || null;
    wheelFRRef.current = clonedScene.getObjectByName("wheel_fr") || null;
    wheelRLRef.current = clonedScene.getObjectByName("wheel_rl") || null;
    wheelRRRef.current = clonedScene.getObjectByName("wheel_rr") || null;
    steeringWheelRef.current = clonedScene.getObjectByName("steering_wheel") || null;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const name = child.name.toLowerCase();

        if (name === "body") {
          child.material = bodyMaterial;
        } else if (name.startsWith("rim")) {
          child.material = rimsMaterial;
        } else if (name.includes("brake")) {
          child.material = caliperMaterial;
        } else if (name === "glass") {
          child.material = glassMaterial;
        } else if (name.includes("carbon")) {
          child.material = carbonMaterial;
        } else if (name.includes("leather") || name.includes("interior_dark") || name === "carpet") {
          child.material = leatherMaterial;
        } else if (name === "chrome" || name === "metal") {
          child.material = chromeMaterial;
        } else if (name === "lights_red") {
          child.material = taillightMaterial;
        } else if (name === "lights") {
          child.material = headlightLensMaterial;
        } else if (name === "leds") {
          child.material = ledDrlMaterial;
        } else if (name === "interior_light") {
          child.material = interiorLightMaterial;
        } else if (name === "plastic_gray" || name === "wipers" || name === "grills") {
          child.material = plasticTrimMaterial;
        } else if (name === "steering_red_lights") {
          child.material = steeringRevLightsMaterial;
        }
      }
    });
  }, [
    clonedScene,
    bodyMaterial,
    rimsMaterial,
    caliperMaterial,
    glassMaterial,
    carbonMaterial,
    leatherMaterial,
    plasticTrimMaterial,
    chromeMaterial,
    ledDrlMaterial,
    headlightLensMaterial,
    taillightMaterial,
    interiorLightMaterial,
    steeringRevLightsMaterial,
  ]);

  // Executive VIP Standby Position in front of TEMFACIL Staff Office
  const PARKED_POS = useMemo(() => new THREE.Vector3(116.5, 14.12, -90.5), []);
  const PARKED_ROT_Y = -Math.PI * 0.72; // Angled 3/4 showcase stance facing south-west

  // Circuit Driving Spline for Autonomous Test Drive Mode
  const circuitSpline = useMemo(() => {
    const points = [
      new THREE.Vector3(116.5, 14.12, -90.5),  // Staff Office VIP Bay Start
      new THREE.Vector3(112.0, 14.12, -87.0),  // Turning into main driveway
      new THREE.Vector3(98.0, 14.10, -84.0),   // Straight run towards gate
      new THREE.Vector3(88.0, 14.05, -78.0),   // Passing entrance gate
      new THREE.Vector3(76.0, 12.80, -68.0),   // High-speed curved mountain road
      new THREE.Vector3(60.0, 10.50, -52.0),   // Fast sweep
      new THREE.Vector3(45.0, 8.20, -38.0),    // Mid-sector road
      new THREE.Vector3(32.0, 6.40, -26.0),    // Powerhouse access loop apex
      new THREE.Vector3(38.0, 6.80, -22.0),    // Hairpin turnaround
      new THREE.Vector3(55.0, 9.80, -45.0),    // Uphill return stretch
      new THREE.Vector3(72.0, 12.20, -62.0),   // Uphill acceleration
      new THREE.Vector3(86.0, 13.90, -75.0),   // Approaching gate return
      new THREE.Vector3(96.0, 14.08, -82.0),   // Entry straight
      new THREE.Vector3(110.0, 14.12, -86.0),  // Deceleration zone
      new THREE.Vector3(116.5, 14.12, -90.5),  // Smooth return to Staff Office VIP Bay
    ];
    return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.3);
  }, []);

  const scratchColor = useMemo(() => new THREE.Color(), []);

  // Frame animation loop for neon underglow, headlights, flames, and kinematics
  useFrame((state, delta) => {
    if (!rootRef.current) return;
    const t = state.clock.getElapsedTime();

    // ══════════════════════════════════════════════════════════════════════
    // 1. NEON UNDERGLOW DYNAMIC COLOR, PULSE & STROBE SHADER COMPUTATIONS
    // ══════════════════════════════════════════════════════════════════════
    let dynamicColor = scratchColor;
    if (underglowColor === "RAINBOW") {
      dynamicColor.setHSL((t * 0.35) % 1.0, 1.0, 0.55);
    } else {
      dynamicColor.set(underglowColor);
    }

    let dynamicMultiplier = underglowIntensity;
    if (!underglowEnabled) {
      dynamicMultiplier = 0;
    } else if (underglowMode === "PULSE") {
      dynamicMultiplier *= 0.65 + 0.35 * Math.sin(t * 4.0);
    } else if (underglowMode === "STROBE") {
      dynamicMultiplier *= Math.sin(t * 18.0) > 0.2 ? 1.4 : 0.08;
    } else if (underglowMode === "SPEED_REACTIVE") {
      const spdFactor = Math.min(1.0, Math.abs(currentSpeedRef.current) / 15.0);
      dynamicMultiplier *= 0.6 + spdFactor * 1.8 + 0.2 * Math.sin(t * (4.0 + spdFactor * 16.0));
    } else if (underglowMode === "RAINBOW_WAVE") {
      dynamicColor.setHSL((t * 0.5 + 0.1) % 1.0, 1.0, 0.55);
      dynamicMultiplier *= 0.85 + 0.15 * Math.sin(t * 6.0);
    }

    // Apply color and intensity to Ground Diffusion Plane & LED edge tubes
    if (underglowMatRef.current) {
      underglowMatRef.current.color.copy(dynamicColor);
      underglowMatRef.current.opacity = underglowEnabled ? Math.min(1.0, dynamicMultiplier * 0.70) : 0;
    }
    if (underglowTubeMatRef.current) {
      underglowTubeMatRef.current.color.copy(dynamicColor);
      underglowTubeMatRef.current.opacity = underglowEnabled ? Math.min(1.0, dynamicMultiplier * 0.85) : 0;
    }

    // Rocker Panel Downward Illuminators (Clean, tuned ground wash without fog/blowout)
    const lightPower = underglowEnabled ? dynamicMultiplier * 3.5 : 0;
    if (underglowLightLFRef.current) {
      underglowLightLFRef.current.color.copy(dynamicColor);
      underglowLightLFRef.current.intensity = lightPower;
    }
    if (underglowLightLRRef.current) {
      underglowLightLRRef.current.color.copy(dynamicColor);
      underglowLightLRRef.current.intensity = lightPower;
    }
    if (underglowLightRFRef.current) {
      underglowLightRFRef.current.color.copy(dynamicColor);
      underglowLightRFRef.current.intensity = lightPower;
    }
    if (underglowLightRRRef.current) {
      underglowLightRRRef.current.color.copy(dynamicColor);
      underglowLightRRRef.current.intensity = lightPower;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. EXHAUST AFTERBURNER FLAMES & BACKFIRE
    // ══════════════════════════════════════════════════════════════════════
    const isAccelerating = currentSpeedRef.current > 3.0 || isDrivingAuto;
    const shouldFlame = exhaustFlames || (isAccelerating && Math.sin(t * 14.0) > 0.4);
    const flameScale = shouldFlame ? (0.6 + Math.random() * 0.7) : 0;

    if (flameLRef.current) {
      flameLRef.current.scale.set(flameScale, flameScale * 1.5, flameScale);
      flameLRef.current.visible = shouldFlame;
    }
    if (flameRRef.current) {
      flameRRef.current.scale.set(flameScale, flameScale * 1.5, flameScale);
      flameRRef.current.visible = shouldFlame;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. NOS CRYO PURGE VAPOR STEAM
    // ══════════════════════════════════════════════════════════════════════
    if (nosLRef.current && nosRRef.current) {
      const nosActive = nosPurge;
      nosLRef.current.visible = nosActive;
      nosRRef.current.visible = nosActive;
      if (nosActive) {
        const nosS = 0.8 + Math.random() * 0.5;
        nosLRef.current.scale.set(nosS, nosS * 2.2, nosS);
        nosRRef.current.scale.set(nosS, nosS * 2.2, nosS);
      }
    }

    // Air suspension ride height offset
    const suspensionYOffset = airSuspensionLowered ? -0.045 : 0.0;

    // ══════════════════════════════════════════════════════════════════════
    // 4. KINEMATIC MOTION OR STANDBY PARKED STATE
    // ══════════════════════════════════════════════════════════════════════
    if (isPlayerControlled && gtaRuntime.isActive) {
      rootRef.current.position.set(gtaRuntime.carPos.x, gtaRuntime.carPos.y + suspensionYOffset, gtaRuntime.carPos.z);
      rootRef.current.rotation.y = gtaRuntime.carRotY;

      if (chassisRef.current) {
        chassisRef.current.rotation.x = gtaRuntime.carPitch;
        chassisRef.current.rotation.z = gtaRuntime.carRoll;
      }

      const speed = gtaRuntime.carSpeed;
      currentSpeedRef.current = speed;
      const tireRadius = 0.35;
      wheelRotationAngleRef.current += (speed * delta) / tireRadius;

      if (wheelFLRef.current) {
        wheelFLRef.current.rotation.x = wheelRotationAngleRef.current;
        wheelFLRef.current.rotation.y = gtaRuntime.carSteer;
      }
      if (wheelFRRef.current) {
        wheelFRRef.current.rotation.x = wheelRotationAngleRef.current;
        wheelFRRef.current.rotation.y = gtaRuntime.carSteer;
      }
      if (wheelRLRef.current) wheelRLRef.current.rotation.x = wheelRotationAngleRef.current;
      if (wheelRRRef.current) wheelRRRef.current.rotation.x = wheelRotationAngleRef.current;
      if (steeringWheelRef.current) steeringWheelRef.current.rotation.y = -gtaRuntime.carSteer * 4.0;

      if (headlightsGroupRef.current) {
        headlightsGroupRef.current.visible = gtaRuntime.headlightsOn;
      }
    } else if (manualPosition) {
      rootRef.current.position.set(manualPosition[0], manualPosition[1] + suspensionYOffset, manualPosition[2]);
      if (manualRotationY !== undefined) {
        rootRef.current.rotation.y = manualRotationY;
      }

      if (chassisRef.current) {
        chassisRef.current.rotation.x = manualPitch;
        chassisRef.current.rotation.z = manualRoll;
      }

      const speed = manualSpeed ?? 0;
      currentSpeedRef.current = speed;
      const tireRadius = 0.35;
      wheelRotationAngleRef.current += (speed * delta) / tireRadius;

      if (wheelFLRef.current) {
        wheelFLRef.current.rotation.x = wheelRotationAngleRef.current;
        wheelFLRef.current.rotation.y = manualSteer;
      }
      if (wheelFRRef.current) {
        wheelFRRef.current.rotation.x = wheelRotationAngleRef.current;
        wheelFRRef.current.rotation.y = manualSteer;
      }
      if (wheelRLRef.current) wheelRLRef.current.rotation.x = wheelRotationAngleRef.current;
      if (wheelRRRef.current) wheelRRRef.current.rotation.x = wheelRotationAngleRef.current;
      if (steeringWheelRef.current) steeringWheelRef.current.rotation.y = -manualSteer * 4.0;

      if (headlightsGroupRef.current) {
        headlightsGroupRef.current.visible = headlightsOn ?? Math.abs(speed) > 0.2;
      }
    } else if (!isDrivingAuto) {
      currentSpeedRef.current = THREE.MathUtils.damp(currentSpeedRef.current, 0, 4.0, delta);
      steerAngleRef.current = THREE.MathUtils.damp(steerAngleRef.current, 0.22, 3.0, delta);
      pitchAngleRef.current = THREE.MathUtils.damp(pitchAngleRef.current, 0, 4.0, delta);
      rollAngleRef.current = THREE.MathUtils.damp(rollAngleRef.current, 0, 4.0, delta);

      rootRef.current.position.lerp(new THREE.Vector3(PARKED_POS.x, PARKED_POS.y + suspensionYOffset, PARKED_POS.z), 0.1);
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, PARKED_ROT_Y, 0.1);
      rootRef.current.rotation.x = 0;
      rootRef.current.rotation.z = 0;

      if (wheelFLRef.current) wheelFLRef.current.rotation.y = steerAngleRef.current;
      if (wheelFRRef.current) wheelFRRef.current.rotation.y = steerAngleRef.current;
      if (steeringWheelRef.current) steeringWheelRef.current.rotation.y = -steerAngleRef.current * 3.5;

      if (headlightsGroupRef.current) {
        headlightsGroupRef.current.visible = headlightMode === "FULL" || headlightMode === "DRL";
      }
    } else {
      targetSpeedRef.current = 12.0 + Math.sin(t * 0.5) * 3.0;
      currentSpeedRef.current = THREE.MathUtils.damp(currentSpeedRef.current, targetSpeedRef.current, 2.5, delta);

      const speed = currentSpeedRef.current;
      const progressIncrement = (speed * delta) / circuitSpline.getLength();
      pathDistanceRef.current = (pathDistanceRef.current + progressIncrement) % 1.0;

      const u = pathDistanceRef.current;
      const currentPt = circuitSpline.getPointAt(u);
      const tangent = circuitSpline.getTangentAt(u).normalize();

      const surfaceY = getSiteSurfaceY(currentPt.x, currentPt.z);
      const targetY = Math.max(currentPt.y, surfaceY + 0.05) + suspensionYOffset;

      rootRef.current.position.set(currentPt.x, targetY, currentPt.z);

      const heading = Math.atan2(tangent.x, tangent.z);
      rootRef.current.rotation.y = heading;

      const tireRadius = 0.35;
      const wheelSpinDelta = (speed * delta) / tireRadius;
      wheelRotationAngleRef.current += wheelSpinDelta;

      if (wheelFLRef.current) wheelFLRef.current.rotation.x = wheelRotationAngleRef.current;
      if (wheelFRRef.current) wheelFRRef.current.rotation.x = wheelRotationAngleRef.current;
      if (wheelRLRef.current) wheelRLRef.current.rotation.x = wheelRotationAngleRef.current;
      if (wheelRRRef.current) wheelRRRef.current.rotation.x = wheelRotationAngleRef.current;

      const nextU = (u + 0.02) % 1.0;
      const nextTangent = circuitSpline.getTangentAt(nextU).normalize();
      const nextHeading = Math.atan2(nextTangent.x, nextTangent.z);
      let angleDiff = nextHeading - heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const targetSteer = THREE.MathUtils.clamp(angleDiff * 8.0, -0.45, 0.45);
      steerAngleRef.current = THREE.MathUtils.damp(steerAngleRef.current, targetSteer, 8.0, delta);

      if (wheelFLRef.current) wheelFLRef.current.rotation.y = steerAngleRef.current;
      if (wheelFRRef.current) wheelFRRef.current.rotation.y = steerAngleRef.current;
      if (steeringWheelRef.current) steeringWheelRef.current.rotation.y = -steerAngleRef.current * 4.0;

      const acceleration = (speed - targetSpeedRef.current);
      const targetPitch = THREE.MathUtils.clamp(acceleration * 0.015, -0.04, 0.04);
      const targetRoll = THREE.MathUtils.clamp(-steerAngleRef.current * (speed / 12.0) * 0.05, -0.06, 0.06);

      pitchAngleRef.current = THREE.MathUtils.damp(pitchAngleRef.current, targetPitch, 6.0, delta);
      rollAngleRef.current = THREE.MathUtils.damp(rollAngleRef.current, targetRoll, 6.0, delta);

      if (chassisRef.current) {
        chassisRef.current.rotation.x = pitchAngleRef.current;
        chassisRef.current.rotation.z = rollAngleRef.current;
      }

      if (headlightsGroupRef.current) {
        headlightsGroupRef.current.visible = true;
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. EXOTIC LIGHTING SIGNATURES, ROAD PROJECTOR & F1 STROBES
    // ══════════════════════════════════════════════════════════════════════
    const isHeadlightsActive = headlightsOn ?? (headlightMode === "FULL" || headlightMode === "DRL" || Math.abs(currentSpeedRef.current) > 0.2);
    if (headlightsGroupRef.current) {
      const active = isHeadlightsActive && headlightMode !== "OFF";
      headlightsGroupRef.current.visible = active;
      headlightsGroupRef.current.children.forEach((c) => {
        c.visible = active;
      });
    }
    if (projectorDecalRef.current) {
      projectorDecalRef.current.visible = isHeadlightsActive && headlightMode !== "OFF";
    }
    if (projectorMatRef.current) {
      projectorMatRef.current.opacity = headlightMode === "FULL" ? 0.70 : 0.25;
    }
    if (headlightLensMaterial) {
      headlightLensMaterial.emissiveIntensity = isHeadlightsActive ? 3.0 : 0.15;
    }
    if (ledDrlMaterial) {
      ledDrlMaterial.emissiveIntensity = isHeadlightsActive ? 4.5 : 1.2;
    }
    if (taillightMaterial) {
      const isBraking = currentSpeedRef.current < -0.1 || (!isDrivingAuto && Math.abs(currentSpeedRef.current) < 0.05);
      taillightMaterial.emissiveIntensity = isBraking ? 4.8 : 2.5;
    }

    // F1 Aerodynamic Rear Diffuser Rain Strobe (rapid dynamic double-flash)
    if (f1RainStrobeRef.current) {
      const strobeTime = (t * 5.0) % 1.0;
      const isStrobeFlash = strobeTime < 0.15 || (strobeTime > 0.25 && strobeTime < 0.40);
      f1RainStrobeRef.current.visible = underglowEnabled && isStrobeFlash;
    }

    // F1 Steering Wheel Rev Indicator LEDs
    if (steeringRevLightsMaterial) {
      const speed = Math.abs(currentSpeedRef.current);
      if (speed > 10.0) {
        steeringRevLightsMaterial.color.set(Math.sin(t * 24.0) > 0 ? "#FF0033" : "#450A0A");
      } else if (speed > 5.0) {
        steeringRevLightsMaterial.color.set("#F59E0B");
      } else {
        steeringRevLightsMaterial.color.set("#10B981");
      }
    }
  });

  const isGtaDriving = Boolean(isPlayerControlled && gtaRuntime.isActive);
  const effectiveDoorAngle = doorOpen ? 0.78 : (isGtaDriving ? gtaRuntime.carDoorAngle : driverDoorAngle);
  const effectiveDriverInside = isGtaDriving ? gtaRuntime.isDriverInside : isDriverInside;

  return (
    <group
      ref={rootRef}
      position={[116.5, 14.12, -90.5]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Dynamic Chassis Group (Supports pitch squat & cornering roll) */}
      <group ref={chassisRef}>
        {/* Ferrari 458 Italia 3D Model */}
        <primitive object={clonedScene} scale={[1, 1, 1]} position={[0, 0, 0]} />

        {/* ─── ARTICULATED DRIVER-SIDE DOOR ASSEMBLY ─── */}
        <group
          position={[-0.98, 0.45, 0.42]}
          rotation={[0, effectiveDoorAngle, 0]}
        >
          {/* Door Outer Sculpted Aero Panel */}
          <mesh geometry={GEO_UNIT_BOX} scale={[0.08, 0.48, 0.96]} position={[0, 0.18, -0.45]} castShadow material={bodyMaterial}>
          </mesh>
          {/* Upper Door Waistline Crease */}
          <mesh geometry={GEO_UNIT_BOX} scale={[0.09, 0.08, 0.94]} position={[-0.01, 0.38, -0.45]} material={bodyMaterial}>
          </mesh>
          {/* Aerodynamic Carbon Fiber Wing Mirror */}
          <group position={[-0.12, 0.42, 0.05]} rotation={[0.08, -0.2, 0]}>
            <mesh geometry={GEO_UNIT_BOX} scale={[0.18, 0.09, 0.14]} castShadow material={carbonMaterial}>
            </mesh>
            <mesh geometry={GEO_UNIT_BOX} scale={[0.01, 0.07, 0.11]} position={[-0.08, 0, -0.02]} material={chromeMaterial}>
            </mesh>
          </group>
          {/* Chrome Door Handle */}
          <mesh geometry={GEO_UNIT_BOX} scale={[0.025, 0.03, 0.12]} position={[-0.05, 0.32, -0.75]} material={chromeMaterial}>
          </mesh>
          {/* Inner Alcantara/Leather Door Card & Armrest */}
          <mesh geometry={GEO_UNIT_BOX} scale={[0.04, 0.42, 0.88]} position={[0.03, 0.18, -0.45]} material={leatherMaterial}>
          </mesh>
        </group>

        {/* ─── SEATED DRIVER IN COCKPIT (WHEN DRIVING) ─── */}
        {effectiveDriverInside && (
          <group position={[-0.38, 0.42, 0.05]}>
            {/* Seated Torso in Tan Button-up Polo Shirt */}
            <mesh geometry={GEO_UNIT_BOX} scale={[0.38, 0.48, 0.22]} position={[0, 0.28, 0]} castShadow>
              <meshStandardMaterial color="#B48A64" roughness={0.75} />
            </mesh>
            {/* Collar & Buttons */}
            <mesh geometry={GEO_UNIT_BOX} scale={[0.18, 0.04, 0.14]} position={[0, 0.50, 0.08]}>
              <meshStandardMaterial color="#B48A64" roughness={0.75} />
            </mesh>
            {/* Head with Wire Glasses & Hair */}
            <group position={[0, 0.64, 0.02]}>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.22, 0.24, 0.22]} castShadow>
                <meshStandardMaterial color="#E8BE96" roughness={0.65} />
              </mesh>
              {/* Hair */}
              <mesh geometry={GEO_UNIT_BOX} scale={[0.24, 0.10, 0.24]} position={[0, 0.10, -0.02]}>
                <meshStandardMaterial color="#1E293B" roughness={0.9} />
              </mesh>
              {/* Rectangular Eyeglasses */}
              <mesh geometry={GEO_UNIT_BOX} scale={[0.18, 0.05, 0.02]} position={[0, 0.02, 0.12]}>
                <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
            {/* Arms Gripping Steering Wheel */}
            <group position={[-0.22, 0.40, 0.08]} rotation={[-1.15, 0.35, -0.15]}>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.10, 0.36, 0.10]} position={[0, -0.18, 0]}>
                <meshStandardMaterial color="#B48A64" roughness={0.75} />
              </mesh>
            </group>
            <group position={[0.22, 0.40, 0.08]} rotation={[-1.15, -0.35, 0.15]}>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.10, 0.36, 0.10]} position={[0, -0.18, 0]}>
                <meshStandardMaterial color="#B48A64" roughness={0.75} />
              </mesh>
            </group>
            {/* Charcoal Office Slacks (Legs in Footwell) */}
            <group position={[0, -0.08, 0.22]} rotation={[0.6, 0, 0]}>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.12, 0.42, 0.14]} position={[-0.10, 0, 0]}>
                <meshStandardMaterial color="#334155" roughness={0.85} />
              </mesh>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.12, 0.42, 0.14]} position={[0.10, 0, 0]}>
                <meshStandardMaterial color="#334155" roughness={0.85} />
              </mesh>
            </group>
          </group>
        )}

        {/* ─── 🏎️ BURNT TITANIUM TRIPLE CENTER EXHAUST PIPES (REAR) ─── */}
        <group position={[0, 0.36, 2.22]}>
          {[-0.14, 0, 0.14].map((px, idx) => {
            const isCenter = idx === 1;
            const radius = isCenter ? 0.040 : 0.046;
            const length = 0.18;
            return (
              <group key={`exhaust-tip-${idx}`} position={[px, 0, isCenter ? 0.02 : 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {/* Main Polished Stainless Steel Pipe Outer Sleeve */}
                <mesh geometry={GEO_UNIT_CYL} scale={[radius * 2, length, radius * 2]} position={[0, length / 2, 0]}>
                  <meshStandardMaterial color="#94A3B8" metalness={0.96} roughness={0.12} />
                </mesh>
                {/* Burnt Titanium Flame Heat Treatment Rings */}
                {/* 1. Electric Cyan Anodized Tip Lip */}
                <mesh position={[0, length + 0.002, 0]}>
                  <cylinderGeometry args={[radius * 1.025, radius * 1.025, 0.014, 16, 1, true]} />
                  <meshBasicMaterial color="#00D4FF" toneMapped={false} />
                </mesh>
                {/* 2. Royal Purple Heat Band */}
                <mesh position={[0, length - 0.010, 0]}>
                  <cylinderGeometry args={[radius * 1.020, radius * 1.020, 0.018, 16, 1, true]} />
                  <meshStandardMaterial color="#7C3AED" metalness={0.92} roughness={0.18} />
                </mesh>
                {/* 3. Golden Straw Heat Ring */}
                <mesh position={[0, length - 0.026, 0]}>
                  <cylinderGeometry args={[radius * 1.015, radius * 1.015, 0.016, 16, 1, true]} />
                  <meshStandardMaterial color="#D97706" metalness={0.88} roughness={0.22} />
                </mesh>
                {/* Dark Perforated Inner Exhaust Barrel */}
                <mesh geometry={GEO_UNIT_CYL} scale={[radius * 1.78, 0.04, radius * 1.78]} position={[0, length - 0.01, 0]}>
                  <meshBasicMaterial color="#020617" />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* ─── 🔥 EXHAUST AFTERBURNER FLAMES (TRIPLE CENTER REAR EXHAUST) ─── */}
        <group position={[0, 0.36, 2.25]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Left Exhaust Flame Tip */}
          <group ref={flameLRef} position={[-0.14, 0, 0]} visible={false}>
            {/* Blue Plasma Inner Core */}
            <mesh position={[0, 0.18, 0]}>
              <coneGeometry args={[0.04, 0.25, 8]} />
              <meshBasicMaterial color="#00E5FF" toneMapped={false} />
            </mesh>
            {/* Orange Afterburner Flame Outer Cone */}
            <mesh position={[0, 0.30, 0]}>
              <coneGeometry args={[0.07, 0.42, 8]} />
              <meshBasicMaterial color="#FF4500" transparent opacity={0.85} toneMapped={false} />
            </mesh>
            <pointLight color="#FF4500" intensity={4.0} distance={4.0} />
          </group>

          {/* Right Exhaust Flame Tip */}
          <group ref={flameRRef} position={[0.14, 0, 0]} visible={false}>
            <mesh position={[0, 0.18, 0]}>
              <coneGeometry args={[0.04, 0.25, 8]} />
              <meshBasicMaterial color="#00E5FF" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.30, 0]}>
              <coneGeometry args={[0.07, 0.42, 8]} />
              <meshBasicMaterial color="#FF4500" transparent opacity={0.85} toneMapped={false} />
            </mesh>
            <pointLight color="#FF4500" intensity={4.0} distance={4.0} />
          </group>
        </group>

        {/* ─── 🏁 F1 AERODYNAMIC REAR DIFFUSER RAIN STROBE ─── */}
        <group position={[0, 0.16, 2.18]}>
          {/* Aero Carbon Housing Bracket */}
          <mesh geometry={GEO_UNIT_BOX} scale={[0.09, 0.055, 0.035]} material={carbonMaterial} />
          {/* Flashing Red LED Lens */}
          <mesh
            ref={f1RainStrobeRef}
            geometry={GEO_UNIT_BOX}
            scale={[0.07, 0.04, 0.015]}
            position={[0, 0, 0.015]}
            material={f1RainStrobeMaterial}
          />
          <pointLight position={[0, 0, 0.06]} color="#FF0033" intensity={underglowEnabled ? 2.5 : 0} distance={1.6} />
        </group>

        {/* ─── 💨 NOS CRYO PURGE STEAM VAPOR PLUMES (FRONT FENDERS) ─── */}
        <mesh
          ref={nosLRef}
          position={[-0.78, 0.72, -1.15]}
          rotation={[0.6, -0.4, 0]}
          visible={false}
        >
          <coneGeometry args={[0.08, 0.65, 8]} />
          <meshBasicMaterial color="#E0F2FE" transparent opacity={0.85} />
        </mesh>
        <mesh
          ref={nosRRef}
          position={[0.78, 0.72, -1.15]}
          rotation={[0.6, 0.4, 0]}
          visible={false}
        >
          <coneGeometry args={[0.08, 0.65, 8]} />
          <meshBasicMaterial color="#E0F2FE" transparent opacity={0.85} />
        </mesh>

        {/* ─── 🚨 PACE CAR EMERGENCY STROBES ─── */}
        {policeStrobe && (
          <group position={[0, 1.15, -0.2]}>
            <pointLight position={[-0.3, 0, 0]} color="#EF4444" intensity={8.0} distance={10} />
            <pointLight position={[0.3, 0, 0]} color="#0284C7" intensity={8.0} distance={10} />
          </group>
        )}

        {/* Dynamic Projector Headlights (Front -Z) & Taillights (Rear +Z) */}
        <group ref={headlightsGroupRef} visible={false}>
          {/* Dual Forward LED Projector Road Beams */}
          <spotLight visible={false} position={[0, 0.65, -2.1]} color="#FFFBEB" intensity={5.0} distance={25} angle={0.45} penumbra={0.7} />
          {/* Rear Taillight Halos */}
          <pointLight visible={false} position={[0, 0.72, 2.1]} color="#EF4444" intensity={3.5} distance={8} />
        </group>

        {/* ════════════════════════════════════════════════════════════════════
            🌟 RECESSED LED UNDERGLOW FILAMENT TUBES (ALONG SILLS & SPLITTERS)
        ════════════════════════════════════════════════════════════════════ */}
        <group position={[0, 0.04, 0]}>
          {/* Left Rocker Panel Neon Filament */}
          <mesh position={[-0.92, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 2.1, 8]} />
            <meshBasicMaterial ref={underglowTubeMatRef} color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} transparent opacity={0.95} toneMapped={false} />
          </mesh>
          {/* Right Rocker Panel Neon Filament */}
          <mesh position={[0.92, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 2.1, 8]} />
            <meshBasicMaterial color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} transparent opacity={0.95} toneMapped={false} />
          </mesh>
          {/* Front Bumper Lower Splitter Neon Filament */}
          <mesh position={[0, 0, -1.92]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 1.25, 8]} />
            <meshBasicMaterial color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} transparent opacity={0.95} toneMapped={false} />
          </mesh>
          {/* Rear Aero Diffuser Neon Filament */}
          <mesh position={[0, 0.01, 1.95]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 1.15, 8]} />
            <meshBasicMaterial color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} transparent opacity={0.95} toneMapped={false} />
          </mesh>

          {/* 4-Point Downward-Directed Rocker Tarmac Illuminators */}
          <pointLight ref={underglowLightLFRef} position={[-0.92, 0.06, -0.6]} color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} intensity={3.5} distance={2.2} decay={2.0} />
          <pointLight ref={underglowLightLRRef} position={[-0.92, 0.06, 0.7]} color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} intensity={3.5} distance={2.2} decay={2.0} />
          <pointLight ref={underglowLightRFRef} position={[0.92, 0.06, -0.6]} color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} intensity={3.5} distance={2.2} decay={2.0} />
          <pointLight ref={underglowLightRRRef} position={[0.92, 0.06, 0.7]} color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor} intensity={3.5} distance={2.2} decay={2.0} />
        </group>
      </group>

      {/* ─── 🌟 TIGHT CONTOURED NEON GROUND PROJECTION GLOW DECAL ─── */}
      <mesh
        ref={underglowDecalRef}
        position={[0, 0.024, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <planeGeometry args={[2.7, 5.3]} />
        <meshBasicMaterial
          ref={underglowMatRef}
          map={underglowDiffusionTex || undefined}
          color={underglowColor === "RAINBOW" ? "#00F5FF" : underglowColor}
          transparent
          opacity={underglowEnabled ? 0.78 : 0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── 🚗 FORWARD XENON/LED LOW-BEAM ROAD PROJECTOR PUDDLE DECAL (AHEAD OF FRONT BUMPER) ─── */}
      <mesh
        ref={projectorDecalRef}
        position={[0, 0.022, -4.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[3.2, 5.2]} />
        <meshBasicMaterial
          ref={projectorMatRef}
          map={projectorBeamTex || undefined}
          color="#F0F9FF"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ─── ⬛ SCULPTED CHASSIS AMBIENT OCCLUSION GROUND CONTACT SHADOW ─── */}
      <mesh
        ref={shadowRef}
        position={[0, 0.015, 0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[2.6, 5.2]} />
        <meshBasicMaterial
          map={chassisShadowTex || undefined}
          transparent
          opacity={0.70}
          depthWrite={false}
        />
      </mesh>

      {/* ─── 🛞 DEDICATED TIRE CONTACT OCCLUSION STAMPS ─── */}
      {[
        [-0.84, -1.15], // Front Left (Z = -1.15)
        [0.84, -1.15],  // Front Right (Z = -1.15)
        [-0.82, 1.49],  // Rear Left (Z = +1.49)
        [0.82, 1.49],   // Rear Right (Z = +1.49)
      ].map(([tx, tz], i) => (
        <mesh
          key={`tire-shadow-${i}`}
          position={[tx, 0.018, tz]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <planeGeometry args={[0.34, 0.62]} />
          <meshBasicMaterial
            map={tireContactShadowTex || undefined}
            transparent
            opacity={0.92}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* VIP Selection Ring Glow */}
      {isSelected && (
        <mesh geometry={GEO_UNIT_RING} scale={[2.7, 2.7, 1]} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#EAB308" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Preload the GLB model asset
useGLTF.preload("/models/ferrari.glb");
