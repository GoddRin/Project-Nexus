/**
 * LocomotionLaboratoryModal.tsx
 *
 * Interactive 3D Humanoid Walking Locomotion Laboratory & Verification Studio
 *
 * Allows real-time testing and multi-camera inspection of the realistic walking physics
 * in an empty test chamber with grid markings, telemetry readouts, speed controls,
 * path routing (straight line, circle, figure-8, manual steer), and role selection.
 */

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  RealisticHumanoidMesh,
  HydroWorkforceRole,
  GaitPoseTelemetry,
  computeRealisticWalkingGait,
} from "./RealisticHumanoidMesh";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Activity,
  UserCheck,
  Compass,
  Gauge,
  Eye,
  Layers,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 EMPTY STUDIO ROOM & WALKING PATH SIMULATION ACTOR
// ═══════════════════════════════════════════════════════════════════════════
function WalkingSubjectInEmptyRoom({
  role,
  walkSpeed,
  isWalking,
  pathType,
  onTelemetry,
}: {
  role: HydroWorkforceRole;
  walkSpeed: number;
  isWalking: boolean;
  pathType: "CIRCLE" | "LINE" | "FIGURE_8";
  onTelemetry: (t: GaitPoseTelemetry) => void;
}) {
  const actorGroupRef = useRef<THREE.Group>(null);
  const pathProgressRef = useRef(0);

  useFrame((_, delta) => {
    if (!actorGroupRef.current) return;

    if (isWalking) {
      pathProgressRef.current += delta * walkSpeed * 0.45;
    }
    const t = pathProgressRef.current;

    let px = 0;
    let pz = 0;
    let heading = 0;

    if (pathType === "CIRCLE") {
      const radius = 3.2;
      px = Math.sin(t) * radius;
      pz = Math.cos(t) * radius;
      heading = t + Math.PI / 2;
    } else if (pathType === "LINE") {
      const length = 5.5;
      const cycle = Math.sin(t * 0.6);
      pz = cycle * (length / 2);
      px = 0;
      heading = Math.cos(t * 0.6) >= 0 ? 0 : Math.PI;
    } else if (pathType === "FIGURE_8") {
      const scale = 3.0;
      px = Math.sin(t) * scale;
      pz = Math.sin(t * 2.0) * (scale / 2);
      // Tangent derivative for smooth orientation
      const dx = Math.cos(t) * scale;
      const dz = Math.cos(t * 2.0) * scale;
      heading = Math.atan2(dx, dz);
    }

    actorGroupRef.current.position.set(px, 0, pz);
    actorGroupRef.current.rotation.y = heading;
  });

  return (
    <group ref={actorGroupRef}>
      <RealisticHumanoidMesh
        role={role}
        isWalking={isWalking}
        walkSpeed={walkSpeed}
        onGaitTelemetry={onTelemetry}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 EMPTY ROOM ENVIRONMENT WITH PRECISE METRIC GRID TILES & STUDIO LIGHTS
// ═══════════════════════════════════════════════════════════════════════════
function EmptyChamberEnvironment() {
  return (
    <group>
      {/* Metric 1m Grid Floor */}
      <Grid
        args={[24, 24]}
        cellSize={1.0}
        cellThickness={1.2}
        cellColor="#0284C7"
        sectionSize={5.0}
        sectionThickness={2.0}
        sectionColor="#38BDF8"
        fadeDistance={30}
        fadeStrength={1.5}
        position={[0, 0.001, 0]}
      />

      {/* Clean Studio Floor Slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0F172A" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Circular Target Center Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[3.15, 3.25, 64]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.4} />
      </mesh>

      {/* Wall Corner Markers */}
      {[-8, 8].flatMap((x) =>
        [-8, 8].map((z) => (
          <group key={`corner-${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 3.0, 8]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 3.0, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
          </group>
        ))
      )}

      {/* Studio Lighting Rig */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 12, 8]} intensity={1.8} castShadow shadow-mapSize={2048} />
      <directionalLight position={[-8, 8, -6]} intensity={0.8} color="#38BDF8" />
      <pointLight position={[0, 4, 0]} intensity={1.2} color="#F8FAFC" />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔬 MAIN MODAL CONTAINER WITH TELEMETRY DASHBOARD & INSPECTION CONTROLS
// ═══════════════════════════════════════════════════════════════════════════
export function LocomotionLaboratoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<HydroWorkforceRole>("PROJECT_MANAGER");
  const [walkSpeed, setWalkSpeed] = useState<number>(1.0);
  const [isWalking, setIsWalking] = useState<boolean>(true);
  const [pathType, setPathType] = useState<"CIRCLE" | "LINE" | "FIGURE_8">("CIRCLE");
  const [telemetry, setTelemetry] = useState<GaitPoseTelemetry | null>(null);

  if (!isOpen) return null;

  const roleCategories: { label: string; roles: HydroWorkforceRole[] }[] = [
    {
      label: "Management & Safety",
      roles: ["PROJECT_MANAGER", "SAFETY_HEAD", "SAFETY_OFFICER", "HR_ADMIN_HEAD", "SITE_NURSE"],
    },
    {
      label: "Engineering & Technical",
      roles: ["TURBINE_MECHANICAL_ENG", "ELECTRICAL_SWITCHYARD_ENG", "CIVIL_SURVEYOR", "AUTOCAD_BIM_OPERATOR", "IT_SCADA_SPECIALIST"],
    },
    {
      label: "Operations & Trades",
      roles: ["PED_SUPERVISOR", "FOREMAN_CAPATAZ", "MASTER_WELDER", "RIGGER_CRANE_SPOTTER", "SKILLED_ELECTRICIAN", "SKILLED_CARPENTER"],
    },
    {
      label: "Workers & Canteen Staff",
      roles: ["GENERAL_WORKER_ORANGE", "GENERAL_WORKER_GREEN", "GENERAL_WORKER_BLUE", "CARINDERIA_HEAD_COOK", "CARINDERIA_GRIDDLE_MASTER", "CARINDERIA_RICE_MASTER", "CARINDERIA_PREP_CHEF"],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-7xl h-[90vh] bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Activity className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Humanoid Locomotion Physics Laboratory
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 font-mono text-[10px]">
                  THREE.JS GAIT DYNAMICS v2.0
                </Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Empty test chamber verification with multi-joint articulated skeleton & 20+ specialized roles
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0 relative overflow-hidden">
          {/* Left Panel: Role Selector & Path Controls */}
          <div className="p-4 bg-slate-900/60 border-r border-white/10 overflow-y-auto space-y-4 max-h-full">
            <div>
              <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
                Select Workforce Profession
              </label>
              <div className="space-y-3">
                {roleCategories.map((cat, idx) => (
                  <div key={`cat-${idx}`} className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">{cat.label}</span>
                    <div className="grid grid-cols-1 gap-1">
                      {cat.roles.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRole(r)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                            selectedRole === r
                              ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{r.replace(/_/g, " ")}</span>
                          {selectedRole === r && <UserCheck className="h-3 w-3 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Walking Path Options */}
            <div className="pt-2 border-t border-white/10">
              <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
                Walking Trajectory Path
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["CIRCLE", "LINE", "FIGURE_8"] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={pathType === p ? "default" : "outline"}
                    className={`text-[11px] h-7 ${
                      pathType === p ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "border-white/10 text-slate-300"
                    }`}
                    onClick={() => setPathType(p)}
                  >
                    {p.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Speed & Animation Toggle */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Gait Velocity</span>
                <span className="text-xs font-mono text-cyan-400 font-bold">{walkSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={walkSpeed}
                onChange={(e) => setWalkSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isWalking ? "default" : "outline"}
                  onClick={() => setIsWalking(!isWalking)}
                  className={`flex-1 h-8 text-xs gap-1.5 ${
                    isWalking ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-white/10 text-slate-300"
                  }`}
                >
                  {isWalking ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isWalking ? "Pause Walk" : "Resume Walk"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWalkSpeed(1.0)}
                  className="h-8 px-2.5 border-white/10 text-slate-300 hover:text-white"
                  title="Reset Speed"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Center 3D Viewport: The Empty Test Chamber */}
          <div className="col-span-1 lg:col-span-2 relative bg-slate-950">
            <Canvas
              shadows
              camera={{ position: [0, 2.5, 6.5], fov: 45 }}
              className="w-full h-full"
            >
              <EmptyChamberEnvironment />
              <WalkingSubjectInEmptyRoom
                role={selectedRole}
                walkSpeed={walkSpeed}
                isWalking={isWalking}
                pathType={pathType}
                onTelemetry={setTelemetry}
              />
              <OrbitControls
                makeDefault
                minDistance={1.5}
                maxDistance={14.0}
                maxPolarAngle={Math.PI / 2 - 0.05}
                target={[0, 0.9, 0]}
              />
            </Canvas>

            {/* Quick Camera Tip Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 flex items-center gap-2 pointer-events-none">
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              <span>Left-Drag: Orbit camera | Right-Drag: Pan | Scroll: Zoom</span>
            </div>
          </div>

          {/* Right Panel: Real-Time Biomechanical Telemetry & Joint Metrics */}
          <div className="p-4 bg-slate-900/60 border-l border-white/10 overflow-y-auto space-y-4 max-h-full font-mono">
            <div>
              <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5 font-sans">
                <Gauge className="h-3.5 w-3.5" />
                Live Skeletal Telemetry
              </label>

              {telemetry ? (
                <div className="space-y-2 text-xs">
                  {/* Pelvic Metrics */}
                  <div className="bg-slate-950/80 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[11px] text-cyan-300 font-bold uppercase font-sans flex items-center justify-between">
                      <span>Pelvis 6-DOF Root</span>
                      <span className="text-emerald-400 font-mono">ACTIVE</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vertical Dip (Y):</span>
                      <span className="text-white">{(telemetry.pelvisY * 100).toFixed(1)} cm</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Lateral Sway (Roll):</span>
                      <span className="text-white">{(telemetry.pelvisRoll * (180 / Math.PI)).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Pelvic Yaw:</span>
                      <span className="text-white">{(telemetry.pelvisYaw * (180 / Math.PI)).toFixed(1)}°</span>
                    </div>
                  </div>

                  {/* Leg Joint Angles */}
                  <div className="bg-slate-950/80 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[11px] text-cyan-300 font-bold uppercase font-sans">
                      Lower Limb Kinematics
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Left Thigh:</span>
                        <span className="text-white">{(telemetry.leftThighRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Right Thigh:</span>
                        <span className="text-white">{(telemetry.rightThighRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Left Knee:</span>
                        <span className="text-amber-400">{(telemetry.leftKneeRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Right Knee:</span>
                        <span className="text-amber-400">{(telemetry.rightKneeRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Left Ankle:</span>
                        <span className="text-cyan-400">{(telemetry.leftAnkleRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Right Ankle:</span>
                        <span className="text-cyan-400">{(telemetry.rightAnkleRotX * (180 / Math.PI)).toFixed(0)}°</span>
                      </div>
                    </div>
                  </div>

                  {/* Upper Body & Reciprocal Arms */}
                  <div className="bg-slate-950/80 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[11px] text-cyan-300 font-bold uppercase font-sans">
                      Torso & Arm Balance
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Torso Counter-Yaw:</span>
                      <span className="text-white">{(telemetry.torsoYaw * (180 / Math.PI)).toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Left Shoulder/Elbow:</span>
                      <span className="text-white">
                        {(telemetry.leftShoulderRotX * (180 / Math.PI)).toFixed(0)}° / {(telemetry.leftElbowRotX * (180 / Math.PI)).toFixed(0)}°
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Right Shoulder/Elbow:</span>
                      <span className="text-white">
                        {(telemetry.rightShoulderRotX * (180 / Math.PI)).toFixed(0)}° / {(telemetry.rightElbowRotX * (180 / Math.PI)).toFixed(0)}°
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Head Stabilization:</span>
                      <span className="text-emerald-400">{(telemetry.headRotY * (180 / Math.PI)).toFixed(1)}°</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Initializing telemetry stream...</p>
              )}
            </div>

            {/* Three.js Reference Notes */}
            <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/20 rounded-lg text-[11px] text-cyan-300 font-sans space-y-1">
              <span className="font-semibold block flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Gait Model Reference
              </span>
              <p className="text-slate-400 leading-tight">
                Modeled after Three.js skinning & additive blending dynamics with 6-DOF pelvic motion and double-support compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
