"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { sampleTerrainY } from "./AnimatedSiteEntities";
import {
  gtaRuntime,
  resolveWorldCollision,
  type GTAPlayerMode,
  type GTACameraView,
} from "./gtaRuntime";
import { Car } from "lucide-react";

export type { GTAPlayerMode, GTACameraView };

interface GTAPlayerControllerProps {
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  customization?: {
    bodyColor?: string;
    rimsColor?: string;
    caliperColor?: string;
    glassColor?: string;
  };
}

/**
 * 🎮 High-Performance GTA-Style Player & Supercar Driving Controller
 * 
 * Features:
 * - Authentic 3rd-person behind-the-car camera view (looking forward over trunk & roof down the road).
 * - Instant, responsive WASD walking, sprinting, and Ferrari driving controls.
 * - Solid obstacle collision detection preventing clipping through walls.
 * - Smooth proximity embarkation/disembarkation with articulated door animations.
 * - Zero React re-renders in useFrame loop for rock-solid 60 FPS performance.
 */
export function GTAPlayerController({
  isActive,
  onToggleActive,
}: GTAPlayerControllerProps) {
  const { camera } = useThree();

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animTimerRef = useRef(0);
  const impactShakeRef = useRef(0);
  const camYawRef = useRef(0);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);

  // Initialize GTA mode state when toggled
  useEffect(() => {
    gtaRuntime.isActive = isActive;
    if (isActive) {
      if (gtaRuntime.mode === "INACTIVE") {
        gtaRuntime.mode = "ON_FOOT";
        // Spawn Planning Engineer in open VIP courtyard near the Ferrari
        gtaRuntime.playerPos.set(116.0, 14.12, -87.5);
        gtaRuntime.playerRotY = -Math.PI * 0.72;
        // Park Ferrari facing South-West down the road
        gtaRuntime.carPos.set(116.5, 14.12, -90.5);
        gtaRuntime.carRotY = -Math.PI * 0.72;
        gtaRuntime.carSpeed = 0;
        camYawRef.current = -Math.PI * 0.72;
      }
    } else {
      gtaRuntime.mode = "INACTIVE";
    }
  }, [isActive]);

  // Keyboard and Mouse Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      keysRef.current[e.code.toLowerCase()] = true;

      if (!gtaRuntime.isActive) return;

      // [F] or [E] to Enter / Exit Ferrari
      if (key === "f" || key === "e") {
        if (gtaRuntime.mode === "ON_FOOT" && gtaRuntime.nearCar) {
          gtaRuntime.mode = "ENTERING_VEHICLE";
          animTimerRef.current = 0;
        } else if (gtaRuntime.mode === "DRIVING" && Math.abs(gtaRuntime.carSpeed) < 2.0) {
          gtaRuntime.mode = "EXITING_VEHICLE";
          animTimerRef.current = 0;
        }
      }

      // [V] or [C] to switch GTA Camera View
      if (key === "v" || key === "c") {
        if (gtaRuntime.cameraView === "CHASE_FAR") gtaRuntime.cameraView = "CHASE_NEAR";
        else if (gtaRuntime.cameraView === "CHASE_NEAR") gtaRuntime.cameraView = "HOOD";
        else gtaRuntime.cameraView = "CHASE_FAR";
      }

      // [L] to toggle Headlights
      if (key === "l") {
        gtaRuntime.headlightsOn = !gtaRuntime.headlightsOn;
      }

      // [Escape] to exit GTA Mode
      if (key === "escape") {
        onToggleActive(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
      keysRef.current[e.code.toLowerCase()] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.clientX;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !gtaRuntime.isActive) return;
      const dx = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      camYawRef.current -= dx * 0.005;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onToggleActive]);

  // 60FPS Physics & Camera Loop (Zero React State Dispatches)
  useFrame((state, delta) => {
    if (!gtaRuntime.isActive || gtaRuntime.mode === "INACTIVE") return;

    const dt = Math.min(delta, 0.05);
    const keys = keysRef.current;
    const forward = keys["w"] || keys["arrowup"] || false;
    const backward = keys["s"] || keys["arrowdown"] || false;
    const left = keys["a"] || keys["arrowleft"] || false;
    const right = keys["d"] || keys["arrowright"] || false;
    const sprint = keys["shift"] || keys["shiftleft"] || keys["shiftright"] || false;
    const handbrake = keys[" "] || keys["space"] || false;

    // Driver door world position
    const driverDoorWorldPos = new THREE.Vector3(-1.0, 0, -0.2)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), gtaRuntime.carRotY)
      .add(gtaRuntime.carPos);

    const distToDoor = gtaRuntime.playerPos.distanceTo(driverDoorWorldPos);
    const distToCar = gtaRuntime.playerPos.distanceTo(gtaRuntime.carPos);
    gtaRuntime.nearCar = distToDoor < 3.2 || distToCar < 3.0;

    // Decay impact camera shake
    if (impactShakeRef.current > 0.001) {
      impactShakeRef.current = THREE.MathUtils.damp(impactShakeRef.current, 0, 8.0, dt);
    } else {
      impactShakeRef.current = 0;
    }
    gtaRuntime.collisionImpact = impactShakeRef.current;

    // ═════════════════════════════════════════════════════════════════════════
    // 1. ON-FOOT THIRD-PERSON CONTROLLER (PLANNING HEAD ENGINEER)
    // ═════════════════════════════════════════════════════════════════════════
    if (gtaRuntime.mode === "ON_FOOT") {
      gtaRuntime.isDriverInside = false;
      gtaRuntime.carDoorAngle = THREE.MathUtils.damp(gtaRuntime.carDoorAngle, 0, 8.0, dt);

      const moveSpeed = sprint ? 6.5 : 3.2;
      let inputX = 0;
      let inputZ = 0;

      if (forward) inputZ += 1;
      if (backward) inputZ -= 1;
      if (left) inputX -= 1;
      if (right) inputX += 1;

      const isMoving = inputX !== 0 || inputZ !== 0;
      gtaRuntime.playerIsWalking = isMoving && !sprint;
      gtaRuntime.playerIsRunning = isMoving && sprint;

      if (isMoving) {
        // Move relative to camera yaw
        const moveAngle = Math.atan2(inputX, inputZ) + camYawRef.current;
        const moveDir = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle)).normalize();

        // Smooth character heading towards movement direction
        gtaRuntime.playerRotY = THREE.MathUtils.damp(gtaRuntime.playerRotY, moveAngle, 16.0, dt);

        let nextX = gtaRuntime.playerPos.x + moveDir.x * moveSpeed * dt;
        let nextZ = gtaRuntime.playerPos.z + moveDir.z * moveSpeed * dt;

        // Solid obstacle collision check (character radius = 0.35m)
        const col = resolveWorldCollision(nextX, nextZ, 0.35);
        gtaRuntime.playerPos.x = col.x;
        gtaRuntime.playerPos.z = col.z;

        const groundY = sampleTerrainY(gtaRuntime.playerPos.x, gtaRuntime.playerPos.z);
        gtaRuntime.playerPos.y = THREE.MathUtils.damp(
          gtaRuntime.playerPos.y,
          Math.max(groundY + 0.05, 14.12),
          15.0,
          dt
        );
      }

      // ── Third-Person Camera Following Planning Engineer ──
      const charHeadPos = new THREE.Vector3(
        gtaRuntime.playerPos.x,
        gtaRuntime.playerPos.y + 1.45,
        gtaRuntime.playerPos.z
      );

      const camDistance = 3.8;
      const camHeight = 1.6;
      const camOffset = new THREE.Vector3(
        -Math.sin(camYawRef.current) * camDistance,
        camHeight,
        -Math.cos(camYawRef.current) * camDistance
      );

      const idealCamPos = charHeadPos.clone().add(camOffset);
      camera.position.lerp(idealCamPos, 0.15);
      camera.lookAt(charHeadPos);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. ENTERING VEHICLE SEQUENCE
    // ═════════════════════════════════════════════════════════════════════════
    else if (gtaRuntime.mode === "ENTERING_VEHICLE") {
      animTimerRef.current += dt;
      const t = animTimerRef.current;

      if (t < 0.6) {
        const u = t / 0.6;
        gtaRuntime.carDoorAngle = THREE.MathUtils.lerp(0, 0.88, u);
        gtaRuntime.playerPos.lerp(driverDoorWorldPos, 0.15);
      } else if (t < 1.4) {
        const u = (t - 0.6) / 0.8;
        const seatPos = new THREE.Vector3(-0.35, 0.45, -0.1)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), gtaRuntime.carRotY)
          .add(gtaRuntime.carPos);
        gtaRuntime.playerPos.lerp(seatPos, u);
        gtaRuntime.carDoorAngle = 0.88;
      } else if (t < 2.0) {
        const u = (t - 1.4) / 0.6;
        gtaRuntime.carDoorAngle = THREE.MathUtils.lerp(0.88, 0, u);
        gtaRuntime.isDriverInside = true;
      } else {
        gtaRuntime.carDoorAngle = 0;
        gtaRuntime.isDriverInside = true;
        gtaRuntime.headlightsOn = true;
        gtaRuntime.mode = "DRIVING";
      }

      const targetLook = gtaRuntime.carPos.clone().add(new THREE.Vector3(0, 1.0, 0));
      camera.lookAt(targetLook);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. FERRARI 458 DRIVING MODE (CYBERPUNK / GTA BEHIND-THE-CAR 3RD PERSON VIEW)
    // ═════════════════════════════════════════════════════════════════════════
    else if (gtaRuntime.mode === "DRIVING") {
      gtaRuntime.isDriverInside = true;
      gtaRuntime.carDoorAngle = 0;

      const MAX_FORWARD_SPEED = 26.0; // ~94 km/h
      const MAX_REVERSE_SPEED = -9.0; // ~32 km/h
      const ACCELERATION_RATE = 12.0; // m/s^2
      const BRAKING_RATE = 18.0;      // m/s^2
      const NATURAL_DRAG = 2.8;

      let speed = gtaRuntime.carSpeed;

      if (forward) {
        if (speed < 0) {
          // Braking while reversing
          speed += BRAKING_RATE * dt;
        } else {
          // Accelerating forward down the road
          speed += ACCELERATION_RATE * dt;
          if (speed > MAX_FORWARD_SPEED) speed = MAX_FORWARD_SPEED;
        }
      } else if (backward) {
        if (speed > 0.5) {
          // Braking while moving forward
          speed -= BRAKING_RATE * dt;
        } else {
          // Reverse gear
          speed -= ACCELERATION_RATE * 0.65 * dt;
          if (speed < MAX_REVERSE_SPEED) speed = MAX_REVERSE_SPEED;
        }
      } else {
        // Coasting deceleration
        if (speed > 0) speed = Math.max(0, speed - NATURAL_DRAG * dt);
        else if (speed < 0) speed = Math.min(0, speed + NATURAL_DRAG * dt);
      }

      if (handbrake) {
        speed = THREE.MathUtils.damp(speed, 0, 14.0, dt);
      }

      // Steering
      const MAX_STEER = 0.52; // ~30 degrees
      let targetSteer = 0;
      if (left) targetSteer = MAX_STEER;
      if (right) targetSteer = -MAX_STEER;

      gtaRuntime.carSteer = THREE.MathUtils.damp(gtaRuntime.carSteer, targetSteer, 12.0, dt);

      // Ackerman turn rate: omega = (v / wheelbase) * tan(steer)
      const WHEELBASE = 2.65;
      if (Math.abs(speed) > 0.1) {
        const turnRate = (speed / WHEELBASE) * Math.sin(gtaRuntime.carSteer);
        gtaRuntime.carRotY += turnRate * dt;
      }

      // In ferrari.glb, +Z is local front (headlights), -Z is local rear (taillights)
      const forwardHeadingVec = new THREE.Vector3(
        Math.sin(gtaRuntime.carRotY),
        0,
        Math.cos(gtaRuntime.carRotY)
      ).normalize();

      let nextX = gtaRuntime.carPos.x + forwardHeadingVec.x * speed * dt;
      let nextZ = gtaRuntime.carPos.z + forwardHeadingVec.z * speed * dt;

      // Solid collision resolution (Ferrari bumper radius = 1.35m)
      const col = resolveWorldCollision(nextX, nextZ, 1.35);

      if (col.collided) {
        nextX = col.x;
        nextZ = col.z;

        if (Math.abs(speed) > 1.5) {
          impactShakeRef.current = Math.min(0.28, Math.abs(speed) * 0.018);
          // Solid bumper bounce
          speed = -speed * 0.35;
        } else {
          speed = 0;
        }
      }

      gtaRuntime.carSpeed = speed;
      gtaRuntime.carPos.x = nextX;
      gtaRuntime.carPos.z = nextZ;

      // Terrain Elevation Conforming
      const groundY = sampleTerrainY(gtaRuntime.carPos.x, gtaRuntime.carPos.z);
      gtaRuntime.carPos.y = THREE.MathUtils.damp(
        gtaRuntime.carPos.y,
        Math.max(groundY + 0.05, 14.12),
        16.0,
        dt
      );

      // Pitch & Roll Dynamics
      const accel = forward ? ACCELERATION_RATE : backward ? -BRAKING_RATE : 0;
      const targetPitch = THREE.MathUtils.clamp(-accel * 0.003, -0.04, 0.04);
      const targetRoll = THREE.MathUtils.clamp(
        -gtaRuntime.carSteer * (speed / 15.0) * 0.06,
        -0.08,
        0.08
      );

      gtaRuntime.carPitch = THREE.MathUtils.damp(gtaRuntime.carPitch, targetPitch, 8.0, dt);
      gtaRuntime.carRoll = THREE.MathUtils.damp(gtaRuntime.carRoll, targetRoll, 8.0, dt);

      // Sync character position inside cockpit
      gtaRuntime.playerPos.copy(gtaRuntime.carPos);
      gtaRuntime.playerRotY = gtaRuntime.carRotY;

      // ─── EXACT CYBERPUNK / GTA 3RD PERSON BEHIND-THE-CAR CHASE CAMERA ───
      // Rear vector points behind the taillights (-forwardHeadingVec)
      const rearVector = new THREE.Vector3(
        -forwardHeadingVec.x,
        0,
        -forwardHeadingVec.z
      );

      const shake = (Math.random() - 0.5) * impactShakeRef.current;

      if (gtaRuntime.cameraView === "CHASE_FAR") {
        // Camera sits 7.2m behind the rear bumper, 2.3m elevated
        const camDistance = 7.2 + (Math.abs(speed) / MAX_FORWARD_SPEED) * 1.5;
        const camHeight = 2.3;

        const idealCamPos = gtaRuntime.carPos
          .clone()
          .addScaledVector(rearVector, camDistance)
          .add(new THREE.Vector3(shake, camHeight, shake));

        camera.position.lerp(idealCamPos, 0.15);

        // Look at a target point 15 meters in front of the headlights down the road
        const lookTarget = gtaRuntime.carPos
          .clone()
          .addScaledVector(forwardHeadingVec, 15.0)
          .add(new THREE.Vector3(0, 1.2, 0));

        camera.lookAt(lookTarget);
      } else if (gtaRuntime.cameraView === "CHASE_NEAR") {
        // Closer dynamic chase cam (5.0m behind, 1.6m high)
        const camDistance = 5.0;
        const camHeight = 1.6;

        const idealCamPos = gtaRuntime.carPos
          .clone()
          .addScaledVector(rearVector, camDistance)
          .add(new THREE.Vector3(shake, camHeight, shake));

        camera.position.lerp(idealCamPos, 0.2);

        const lookTarget = gtaRuntime.carPos
          .clone()
          .addScaledVector(forwardHeadingVec, 12.0)
          .add(new THREE.Vector3(0, 1.1, 0));

        camera.lookAt(lookTarget);
      } else {
        // Cockpit / Hood Line-of-Sight
        const hoodPos = gtaRuntime.carPos
          .clone()
          .addScaledVector(forwardHeadingVec, 0.4)
          .add(new THREE.Vector3(-0.35, 0.95, 0));

        camera.position.copy(hoodPos);

        const hoodLook = gtaRuntime.carPos
          .clone()
          .addScaledVector(forwardHeadingVec, 20.0)
          .add(new THREE.Vector3(0, 0.95, 0));

        camera.lookAt(hoodLook);
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. EXITING VEHICLE SEQUENCE
    // ═════════════════════════════════════════════════════════════════════════
    else if (gtaRuntime.mode === "EXITING_VEHICLE") {
      animTimerRef.current += dt;
      const t = animTimerRef.current;

      if (t < 0.6) {
        const u = t / 0.6;
        gtaRuntime.carDoorAngle = THREE.MathUtils.lerp(0, 0.88, u);
      } else if (t < 1.4) {
        const u = (t - 0.6) / 0.8;
        gtaRuntime.playerPos.lerp(driverDoorWorldPos, u);
        gtaRuntime.carDoorAngle = 0.88;
        gtaRuntime.isDriverInside = false;
      } else if (t < 2.0) {
        const u = (t - 1.4) / 0.6;
        gtaRuntime.carDoorAngle = THREE.MathUtils.lerp(0.88, 0, u);
      } else {
        gtaRuntime.carDoorAngle = 0;
        gtaRuntime.isDriverInside = false;
        gtaRuntime.headlightsOn = false;
        gtaRuntime.mode = "ON_FOOT";
        camYawRef.current = gtaRuntime.carRotY;
      }

      const targetLook = gtaRuntime.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      camera.lookAt(targetLook);
    }
  });

  return null;
}

/**
 * 🎮 GTA Controls DOM Overlay (Rendered outside Canvas with direct high-perf DOM updates)
 */
export function GTAControlsHUD({
  isActive,
  onExit,
}: {
  isActive: boolean;
  onExit: () => void;
}) {
  const [hudData, setHudData] = useState({
    mode: "INACTIVE",
    nearCar: false,
    speedKmH: 0,
    rpm: 850,
    gear: "P",
    cameraView: "CHASE_FAR",
  });

  // Low-overhead 10Hz UI polling (avoids 60fps React state churn)
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const mode = gtaRuntime.mode;
      const speedKmH = Math.round(Math.abs(gtaRuntime.carSpeed) * 3.6);
      const rpm = gtaRuntime.carSpeed < 0.2 ? 850 : Math.round(1800 + (speedKmH / 90) * 6400);
      const gear =
        gtaRuntime.carSpeed < -0.1
          ? "R"
          : gtaRuntime.carSpeed < 0.5
          ? "1"
          : gtaRuntime.carSpeed < 8
          ? "2"
          : gtaRuntime.carSpeed < 16
          ? "3"
          : "4";

      setHudData({
        mode,
        nearCar: gtaRuntime.nearCar,
        speedKmH,
        rpm,
        gear,
        cameraView: gtaRuntime.cameraView,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || hudData.mode === "INACTIVE") return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2 pointer-events-none select-none animate-in fade-in slide-in-from-bottom-5">
      {/* Proximity Interaction Banner */}
      {hudData.mode === "ON_FOOT" && hudData.nearCar && (
        <div className="bg-amber-500/95 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 border-2 border-amber-300 animate-bounce">
          <Car className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wider font-semibold">
            Press <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">[F]</span> or <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">[E]</span> to Enter Ferrari 458
          </span>
        </div>
      )}

      {/* Driving Telemetry / Vehicle HUD */}
      {hudData.mode === "DRIVING" && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white flex items-center gap-6">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Speed</div>
            <div className="text-3xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-1">
              {hudData.speedKmH}
              <span className="text-xs text-slate-400 font-normal">km/h</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">V8 RPM</div>
            <div className="text-lg font-bold text-slate-200 font-mono">
              {hudData.rpm.toLocaleString()}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="w-9 h-9 rounded-lg bg-red-950 border border-red-500/50 flex items-center justify-center font-mono font-bold text-lg text-red-400">
            {hudData.gear}
          </div>
        </div>
      )}

      {/* GTA Controls Legend Card */}
      <div className="bg-slate-950/85 border border-slate-800 rounded-xl px-3.5 py-2.5 backdrop-blur-md text-[11px] text-slate-300 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">WASD</span>
          <span>{hudData.mode === "DRIVING" ? "Drive & Steer" : "Walk"}</span>
        </div>
        {hudData.mode === "ON_FOOT" && (
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">Shift</span>
            <span>Sprint</span>
          </div>
        )}
        {hudData.mode === "DRIVING" && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">Space</span>
              <span>Handbrake</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">V</span>
              <span>Camera ({hudData.cameraView.replace("_", " ")})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">L</span>
              <span>Lights</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white text-[10px] border border-slate-700">Esc</span>
          <span>Exit GTA Mode</span>
        </div>
      </div>
    </div>
  );
}
