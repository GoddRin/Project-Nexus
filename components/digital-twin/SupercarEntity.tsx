"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { sampleTerrainY } from "./AnimatedSiteEntities";

// ═══ HIGH-PERFORMANCE SHARED MODULE-SCOPE BUFFERGEOMETRIES ═══
const GEO_UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const GEO_UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const GEO_UNIT_SPHERE = new THREE.SphereGeometry(1, 12, 12);
const GEO_UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const GEO_UNIT_RING = new THREE.RingGeometry(0.8, 1.0, 24);


export interface SupercarCustomization {
  bodyColor: string;
  rimsColor: string;
  caliperColor: string;
  glassColor: string;
  isDriving: boolean;
}

export const SUPERCAR_PRESET_COLORS = [
  { name: "Rosso Corsa", hex: "#D90429", desc: "Classic Ferrari Racing Red" },
  { name: "Giallo Modena", hex: "#EAB308", desc: "Canary Modena Yellow" },
  { name: "Nero Daytona", hex: "#0F172A", desc: "Metallic Obsidian Black" },
  { name: "Grigio Silverstone", hex: "#475569", desc: "Satin Titanium Gunmetal" },
  { name: "Blu Corsa", hex: "#0284C7", desc: "Deep Metallic Azure" },
  { name: "Bianco Avus", hex: "#F8FAFC", desc: "Pearlescent Arctic White" },
  { name: "Verde Mantis", hex: "#10B981", desc: "Electric Hyper Green" },
];

export const SUPERCAR_RIMS_PRESETS = [
  { name: "Liquid Chrome", hex: "#F8FAFC" },
  { name: "Satin Gunmetal", hex: "#334155" },
  { name: "Champagne Gold", hex: "#D97706" },
];

export const SUPERCAR_CALIPER_PRESETS = [
  { name: "Brembo Yellow", hex: "#F59E0B" },
  { name: "Racing Red", hex: "#DC2626" },
  { name: "Carbon Black", hex: "#1E293B" },
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
 * 🏎️ Ultra-Realistic Ferrari 458 Italia Supercar Component
 * 
 * Features:
 * - Multi-layer MeshPhysicalMaterial clearcoat automotive shaders.
 * - Articulated driver-side door with aerodynamic wing mirror and opening/closing animation.
 * - Seated Planning Head Engineer in cockpit with hands gripping steering wheel.
 * - Dynamic wheel spin (v = omega * r), Ackerman front steering, and cockpit steering wheel link.
 * - Acceleration pitch squat, brake dive, and cornering roll physics.
 * - Strict standby headlight behavior (OFF when parked, ON when driving).
 * - Photorealistic contact ambient occlusion ground shadow.
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

  // Wheel node references
  const wheelFLRef = useRef<THREE.Object3D | null>(null);
  const wheelFRRef = useRef<THREE.Object3D | null>(null);
  const wheelRLRef = useRef<THREE.Object3D | null>(null);
  const wheelRRRef = useRef<THREE.Object3D | null>(null);
  const steeringWheelRef = useRef<THREE.Object3D | null>(null);

  // Configuration options
  const bodyColor = customization?.bodyColor || "#D90429";
  const rimsColor = customization?.rimsColor || "#F8FAFC";
  const caliperColor = customization?.caliperColor || "#F59E0B";
  const glassColor = customization?.glassColor || "#FFFFFF";
  const isDrivingAuto = customization?.isDriving ?? false;

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

  // Create High-End MeshPhysicalMaterial & MeshStandardMaterial instances
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(bodyColor),
      metalness: 0.92,
      roughness: 0.42,
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
      roughness: 0.16,
    });
  }, [rimsColor]);

  const caliperMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(caliperColor),
      metalness: 0.75,
      roughness: 0.28,
    });
  }, [caliperColor]);

  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(glassColor),
      metalness: 0.25,
      roughness: 0.0,
      transmission: 0.92,
      transparent: true,
      opacity: 0.88,
      ior: 1.52,
      thickness: 0.5,
    });
  }, [glassColor]);

  const carbonMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#111827"),
      metalness: 0.65,
      roughness: 0.5,
    });
  }, []);

  const leatherMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1E293B"),
      metalness: 0.1,
      roughness: 0.85,
    });
  }, []);

  const chromeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F8FAFC"),
      metalness: 0.98,
      roughness: 0.1,
    });
  }, []);

  // Traverse model and assign upgraded materials + find wheel nodes
  useEffect(() => {
    if (!clonedScene) return;

    // Locate wheel nodes for physics
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
        } else if (name.includes("leather") || name.includes("interior")) {
          child.material = leatherMaterial;
        } else if (name === "chrome" || name === "metal") {
          child.material = chromeMaterial;
        }
      }
    });
  }, [clonedScene, bodyMaterial, rimsMaterial, caliperMaterial, glassMaterial, carbonMaterial, leatherMaterial, chromeMaterial]);

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

  // Frame animation loop for realistic acceleration, wheel spin, and kinematics
  useFrame((state, delta) => {
    if (!rootRef.current) return;
    const t = state.clock.getElapsedTime();

    if (manualPosition) {
      // ══════════════════════════════════════════════════════════════════════
      // A. MANUAL OVERRIDE (GTA PLAYER CONTROL OR AUTONOMOUS SITE VISIT ROUTINE)
      // ══════════════════════════════════════════════════════════════════════
      rootRef.current.position.set(manualPosition[0], manualPosition[1], manualPosition[2]);
      if (manualRotationY !== undefined) {
        rootRef.current.rotation.y = manualRotationY;
      }

      if (chassisRef.current) {
        chassisRef.current.rotation.x = manualPitch;
        chassisRef.current.rotation.z = manualRoll;
      }

      const speed = manualSpeed ?? 0;
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
      // ══════════════════════════════════════════════════════════════════════
      // B. EXECUTIVE VIP SHOWCASE PARKED MODE (IN FRONT OF STAFF OFFICE)
      // ══════════════════════════════════════════════════════════════════════
      currentSpeedRef.current = THREE.MathUtils.damp(currentSpeedRef.current, 0, 4.0, delta);
      steerAngleRef.current = THREE.MathUtils.damp(steerAngleRef.current, 0.22, 3.0, delta);
      pitchAngleRef.current = THREE.MathUtils.damp(pitchAngleRef.current, 0, 4.0, delta);
      rollAngleRef.current = THREE.MathUtils.damp(rollAngleRef.current, 0, 4.0, delta);

      rootRef.current.position.lerp(PARKED_POS, 0.1);
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, PARKED_ROT_Y, 0.1);
      rootRef.current.rotation.x = 0;
      rootRef.current.rotation.z = 0;

      if (wheelFLRef.current) wheelFLRef.current.rotation.y = steerAngleRef.current;
      if (wheelFRRef.current) wheelFRRef.current.rotation.y = steerAngleRef.current;
      if (steeringWheelRef.current) steeringWheelRef.current.rotation.y = -steerAngleRef.current * 3.5;

      if (headlightsGroupRef.current) {
        headlightsGroupRef.current.visible = false;
      }
    } else {
      // ══════════════════════════════════════════════════════════════════════
      // C. AUTONOMOUS CRUISE & ACCELERATION MODE
      // ══════════════════════════════════════════════════════════════════════
      targetSpeedRef.current = 12.0 + Math.sin(t * 0.5) * 3.0;
      currentSpeedRef.current = THREE.MathUtils.damp(currentSpeedRef.current, targetSpeedRef.current, 2.5, delta);

      const speed = currentSpeedRef.current;
      const progressIncrement = (speed * delta) / circuitSpline.getLength();
      pathDistanceRef.current = (pathDistanceRef.current + progressIncrement) % 1.0;

      const u = pathDistanceRef.current;
      const currentPt = circuitSpline.getPointAt(u);
      const tangent = circuitSpline.getTangentAt(u).normalize();

      const terrainY = sampleTerrainY(currentPt.x, currentPt.z);
      const targetY = Math.max(currentPt.y, terrainY + 0.05);

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
  });

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
          rotation={[0, driverDoorAngle, 0]}
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

        {/* ─── SEATED PLANNING HEAD ENGINEER IN COCKPIT (WHEN DRIVING) ─── */}
        {isDriverInside && (
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
            {/* Left Arm Gripping Steering Wheel */}
            <group position={[-0.22, 0.40, 0.08]} rotation={[-1.15, 0.35, -0.15]}>
              <mesh geometry={GEO_UNIT_BOX} scale={[0.10, 0.36, 0.10]} position={[0, -0.18, 0]}>
                <meshStandardMaterial color="#B48A64" roughness={0.75} />
              </mesh>
            </group>
            {/* Right Arm Gripping Steering Wheel */}
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

        {/* Dynamic Projector Headlights & Taillights */}
        <group ref={headlightsGroupRef} visible={false}>
          {/* Dual LED Projector High-Beam Cones */}
          <pointLight position={[0, 0.65, 2.4]} color="#FFFBEB" intensity={16.0} distance={35} />
          {/* Rear Taillight Rings */}
          <pointLight position={[0, 0.72, -2.3]} color="#EF4444" intensity={8.0} distance={12} />
        </group>
      </group>

      {/* Ambient Occlusion Ground Contact Shadow Plane */}
      <mesh geometry={GEO_UNIT_PLANE} scale={[2.4, 4.8, 1]}
        ref={shadowRef}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

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
