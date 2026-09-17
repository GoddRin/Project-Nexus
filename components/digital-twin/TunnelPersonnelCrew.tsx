/**
 * TunnelPersonnelCrew.tsx
 *
 * Full Underground Hydro Face Crew Container Component for Project Nexus Digital Twin.
 * Grounded in docs/tunnel-scene-brief.md (Philippine drill-and-blast 14-man shift crew).
 */

"use client";

import React, { useMemo, useState, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  TunnelWorkerInstance,
  TunnelWorkerRole,
  WorkerAnimationState,
} from "./TunnelWorkerTypes";
import { FaceCycleStage } from "./TunnelFaceCycleTypes";
import { TunnelWorker } from "./TunnelWorker";
import { TunnelWorkerImpostors } from "./TunnelWorkerImpostors";

export interface TunnelPersonnelCrewProps {
  /**
   * Tunnel alignment spline used to calculate station coordinates.
   */
  spline: THREE.Curve<THREE.Vector3>;

  /**
   * Tunnel radius in meters. Default: 2.5m.
   */
  radius?: number;

  /**
   * Tunnel length in meters. Default: 60m.
   */
  length?: number;

  /**
   * Active face cycle stage (synchronizes worker working states with cycle)
   */
  activeCycleStage?: FaceCycleStage;

  /**
   * Whether an emergency alert / gas alarm is active.
   * If true, switches all crew instances to "alert" evacuation walk.
   */
  isAlertActive?: boolean;

  /**
   * Click handler when user selects a worker avatar in 3D.
   */
  onSelectWorker?: (worker: TunnelWorkerInstance) => void;
}

export function TunnelPersonnelCrew({
  spline,
  radius = 2.5,
  length = 60.0,
  activeCycleStage,
  isAlertActive = false,
  onSelectWorker,
}: TunnelPersonnelCrewProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const tempWorkerPos = useRef(new THREE.Vector3());
  const [nearbyMap, setNearbyMap] = useState<Record<string, boolean>>({});
  const lastCheckRef = useRef(0);

  // ─── 1. AUTHENTIC 14-MAN UNDERGROUND CREW ROSTER & STATION POSITIONS ───────
  // Precomputed ONCE at initialization / spline change — ZERO per-frame matrix work!
  // Precomputed with stage coordination — heading cleared during blasting, operators at sidewalls during drilling/mucking
  const crewMembers = useMemo<TunnelWorkerInstance[]>(() => {
    const getCoords = (
      v: number,
      lateralOffset: number,
      rotY: number = 0
    ): { position: [number, number, number]; rotation: [number, number, number] } => {
      const pt = spline.getPointAt(v);
      const tangent = spline.getTangentAt(v).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Invert floor is at Y = -radius relative to spline centerline
      const pos = pt.clone().addScaledVector(right, lateralOffset);
      pos.y += -radius;

      // Base rotation aligned with tunnel direction (towards heading face) plus local facing angle
      const tangentAngle = Math.atan2(-tangent.x, -tangent.z);
      return {
        position: [pos.x, pos.y, pos.z],
        rotation: [0, tangentAngle + rotY, 0],
      };
    };

    const isBlastingStage = activeCycleStage === "charging_blasting";

    // When blasting, all heading personnel evacuate behind the blast safety barrier (v <= 0.70)
    if (isBlastingStage) {
      return [
        // ─── EVACUATED CREW AT SAFETY SHELTER ZONE (v ≈ 0.62 - 0.72) ───
        {
          id: "WORKER_DRILL_01",
          name: "Danilo Roxas",
          role: "DRILL_OPERATOR",
          chainageStation: "STA 1+268",
          ...getCoords(0.67, -1.45, 0), // Evacuated, observing down heading
        },
        {
          id: "WORKER_DRILL_02",
          name: "Arnel Bautista",
          role: "DRILL_OPERATOR",
          chainageStation: "STA 1+267",
          ...getCoords(0.66, 1.45, 0),
        },
        {
          id: "WORKER_BLASTER_01",
          name: "Reynaldo Ramos",
          role: "BLASTER",
          chainageStation: "STA 1+269",
          ...getCoords(0.69, -1.2, 0), // At exploder firing box
        },
        {
          id: "WORKER_GEOLOGIST_01",
          name: "Engr. Camille Dizon",
          role: "GEOLOGIST",
          chainageStation: "STA 1+266",
          ...getCoords(0.65, 1.4, 0),
        },
        {
          id: "WORKER_MUCKER_01",
          name: "Eduardo Santos",
          role: "MUCKER_LABORER",
          chainageStation: "STA 1+264",
          ...getCoords(0.63, -1.4, 0),
        },
        {
          id: "WORKER_SHOTCRETE_01",
          name: "Ramon Valderama",
          role: "SHOTCRETE_OPERATOR",
          chainageStation: "STA 1+265",
          ...getCoords(0.64, 1.25, 0),
        },
        {
          id: "WORKER_BOLT_01",
          name: "Nestor Mendoza",
          role: "ROCK_BOLTING_CREW",
          chainageStation: "STA 1+263",
          ...getCoords(0.62, 1.45, 0),
        },
        {
          id: "WORKER_SAFETY_01",
          name: "Officer Jerome Panganiban",
          role: "SAFETY_OFFICER",
          chainageStation: "STA 1+270",
          ...getCoords(0.70, 0.0, 0), // Enforcing evacuation perimeter
        },
        {
          id: "WORKER_SURVEYOR_01",
          name: "Engr. Marco Villanueva",
          role: "SURVEYOR",
          chainageStation: "STA 1+272",
          ...getCoords(0.72, -1.25, 0),
        },
        {
          id: "WORKER_SUPERVISOR_01",
          name: "Shift Boss Carlito Garcia",
          role: "TUNNEL_SUPERVISOR",
          chainageStation: "STA 1+268",
          ...getCoords(0.68, 1.15, 0),
        },
        {
          id: "WORKER_LABORER_02",
          name: "Lito Manalo",
          role: "MUCKER_LABORER",
          chainageStation: "STA 1+260",
          ...getCoords(0.60, -0.85, 0),
        },
        {
          id: "WORKER_TECH_01",
          name: "Benjie Cruz",
          role: "SAFETY_OFFICER",
          chainageStation: "STA 1+242",
          ...getCoords(0.42, 1.35, 0),
        },
        {
          id: "WORKER_BOLT_02",
          name: "Ferdinand Aquino",
          role: "ROCK_BOLTING_CREW",
          chainageStation: "STA 1+232",
          ...getCoords(0.32, -1.35, 0),
        },
        {
          id: "WORKER_LABORER_03",
          name: "Joel Pineda",
          role: "MUCKER_LABORER",
          chainageStation: "STA 1+222",
          ...getCoords(0.22, 0.85, 0),
        },
      ];
    }

    // Dynamic Stage-Driven Crew Allocation:
    // Only active equipment operators are stationed at heading (v ≈ 0.89 - 0.91);
    // Non-active trades remain in safety/staging bays (v ≤ 0.76).
    // This clears the central inspection camera corridor (v ≈ 0.78 - 0.88) so equipment reads cleanly.
    let drill1_v = 0.65, drill1_lat = -1.45;
    let drill2_v = 0.64, drill2_lat = 1.45;
    let mucker1_v = 0.63, mucker1_lat = -1.4;
    let shotcrete1_v = 0.62, shotcrete1_lat = 1.4;
    let bolt1_v = 0.61, bolt1_lat = -1.4;
    let bolt2_v = 0.32, bolt2_lat = -0.85;

    if (activeCycleStage === "drilling") {
      drill1_v = 0.905; drill1_lat = -1.65;
      drill2_v = 0.895; drill2_lat = -1.75;
    } else if (activeCycleStage === "mucking") {
      mucker1_v = 0.905; mucker1_lat = -1.70;
    } else if (activeCycleStage === "scaling_support") {
      bolt1_v = 0.895; bolt1_lat = -1.65;
      bolt2_v = 0.885; bolt2_lat = -1.75;
    } else if (activeCycleStage === "shotcreting") {
      shotcrete1_v = 0.895; shotcrete1_lat = -1.70;
    }

    return [
      // ─── ACTIVE HEADING OPERATORS (Stationed alongside equipment on left walkway) ───
      {
        id: "WORKER_DRILL_01",
        name: "Danilo Roxas",
        role: "DRILL_OPERATOR",
        chainageStation: drill1_v > 0.8 ? "STA 1+292" : "STA 1+268",
        ...getCoords(drill1_v, drill1_lat, 0.15),
      },
      {
        id: "WORKER_DRILL_02",
        name: "Arnel Bautista",
        role: "DRILL_OPERATOR",
        chainageStation: drill2_v > 0.8 ? "STA 1+291" : "STA 1+267",
        ...getCoords(drill2_v, drill2_lat, -0.15),
      },
      {
        id: "WORKER_MUCKER_01",
        name: "Eduardo Santos",
        role: "MUCKER_LABORER",
        chainageStation: mucker1_v > 0.8 ? "STA 1+290" : "STA 1+266",
        ...getCoords(mucker1_v, mucker1_lat, 0.0),
      },
      {
        id: "WORKER_SHOTCRETE_01",
        name: "Ramon Valderama",
        role: "SHOTCRETE_OPERATOR",
        chainageStation: shotcrete1_v > 0.8 ? "STA 1+289" : "STA 1+265",
        ...getCoords(shotcrete1_v, shotcrete1_lat, -0.15),
      },
      {
        id: "WORKER_BOLT_01",
        name: "Nestor Mendoza",
        role: "ROCK_BOLTING_CREW",
        chainageStation: bolt1_v > 0.8 ? "STA 1+289" : "STA 1+264",
        ...getCoords(bolt1_v, bolt1_lat, 0.3),
      },

      // ─── SUPPORT & SAFETY CREW (Stationed at safe observation distance v ≤ 0.76) ───
      {
        id: "WORKER_BLASTER_01",
        name: "Reynaldo Ramos",
        role: "BLASTER",
        chainageStation: "STA 1+276",
        ...getCoords(0.76, -1.5, 0.1),
      },
      {
        id: "WORKER_GEOLOGIST_01",
        name: "Engr. Camille Dizon",
        role: "GEOLOGIST",
        chainageStation: "STA 1+275",
        ...getCoords(0.75, -1.5, -0.1),
      },
      {
        id: "WORKER_SAFETY_01",
        name: "Officer Jerome Panganiban",
        role: "SAFETY_OFFICER",
        chainageStation: "STA 1+272",
        ...getCoords(0.72, -1.45, -0.1),
      },
      {
        id: "WORKER_SURVEYOR_01",
        name: "Engr. Marco Villanueva",
        role: "SURVEYOR",
        chainageStation: "STA 1+270",
        ...getCoords(0.70, -1.2, 0),
      },
      {
        id: "WORKER_SUPERVISOR_01",
        name: "Shift Boss Carlito Garcia",
        role: "TUNNEL_SUPERVISOR",
        chainageStation: "STA 1+268",
        ...getCoords(0.68, 1.15, Math.PI * 0.2),
      },
      {
        id: "WORKER_LABORER_02",
        name: "Lito Manalo",
        role: "MUCKER_LABORER",
        chainageStation: "STA 1+260",
        ...getCoords(0.58, -0.75, Math.PI),
      },

      // ─── TRANSIT & UTILITY TRADES (v ≤ 0.45) ───
      {
        id: "WORKER_TECH_01",
        name: "Benjie Cruz",
        role: "SAFETY_OFFICER",
        chainageStation: "STA 1+242",
        ...getCoords(0.42, 1.05, 0),
      },
      {
        id: "WORKER_BOLT_02",
        name: "Ferdinand Aquino",
        role: "ROCK_BOLTING_CREW",
        chainageStation: bolt2_v > 0.8 ? "STA 1+289" : "STA 1+232",
        ...getCoords(bolt2_v, bolt2_lat, Math.PI * 0.3),
      },
      {
        id: "WORKER_LABORER_03",
        name: "Joel Pineda",
        role: "MUCKER_LABORER",
        chainageStation: "STA 1+222",
        ...getCoords(0.22, 0.35, 0),
      },
    ];
  }, [spline, radius, activeCycleStage]);

  // Proximity throttled check for LOD switching (0-18m Near, >18m Far)
  // Distance checked in TRUE WORLD SPACE via group.localToWorld()
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastCheckRef.current < 0.15) return;
    lastCheckRef.current = now;

    if (!groupRef.current) return;

    let changed = false;
    const nextMap: Record<string, boolean> = {};

    crewMembers.forEach((w) => {
      tempWorkerPos.current.set(...w.position);
      groupRef.current!.localToWorld(tempWorkerPos.current);
      const dist = camera.position.distanceTo(tempWorkerPos.current);
      const isNear = dist <= 18.0; // Strictly 18.0m per Phase 3 spec
      nextMap[w.id] = isNear;
      if (nearbyMap[w.id] !== isNear) changed = true;
    });

    if (changed) {
      setNearbyMap(nextMap);
    }
  });

  return (
    <group ref={groupRef} name="tunnel-personnel-crew">
      {/* ═══ 1. INDIVIDUAL WORKERS (LOD 0: SKINNED MODEL WHEN <= 18M) ═══ */}
      {crewMembers.map((worker) => {
        // Dynamic animation state: alert overrides all to evacuation walk; activeCycleStage coordinates working crew
        let effectiveState: WorkerAnimationState = "idle";
        if (isAlertActive) {
          effectiveState = "alert";
        } else if (activeCycleStage) {
          if (activeCycleStage === "drilling" && worker.role === "DRILL_OPERATOR") {
            effectiveState = "working";
          } else if (activeCycleStage === "charging_blasting" && worker.role === "BLASTER") {
            effectiveState = "working";
          } else if (activeCycleStage === "mucking" && worker.role === "MUCKER_LABORER") {
            effectiveState = "working";
          } else if (activeCycleStage === "scaling_support" && (worker.role === "ROCK_BOLTING_CREW" || worker.role === "GEOLOGIST")) {
            effectiveState = "working";
          } else if (activeCycleStage === "shotcreting" && worker.role === "SHOTCRETE_OPERATOR") {
            effectiveState = "working";
          } else if (worker.role === "SURVEYOR" || worker.role === "TUNNEL_SUPERVISOR" || worker.role === "SAFETY_OFFICER") {
            effectiveState = "working";
          } else {
            effectiveState = "idle";
          }
        } else {
          effectiveState =
            worker.role === "SURVEYOR" ||
            worker.role === "DRILL_OPERATOR" ||
            worker.role === "SHOTCRETE_OPERATOR" ||
            worker.role === "ROCK_BOLTING_CREW" ||
            worker.role === "SAFETY_OFFICER" ||
            worker.role === "GEOLOGIST" ||
            worker.role === "TUNNEL_SUPERVISOR"
              ? "working"
              : "idle";
        }

        const isNearby = nearbyMap[worker.id] ?? true;

        return (
          <TunnelWorker
            key={worker.id}
            id={worker.id}
            name={worker.name}
            role={worker.role}
            animationState={effectiveState}
            position={worker.position}
            rotation={worker.rotation}
            isNearby={isNearby}
            onClick={() => {
              if (onSelectWorker) onSelectWorker(worker);
            }}
          />
        );
      })}

      {/* ═══ 2. GPU-INSTANCED BILLBOARD IMPOSTORS (LOD 1: WHEN > 18M) ═══ */}
      {/* Batches all far-away workers into 4 single draw calls grouped by helmet color */}
      <TunnelWorkerImpostors workers={crewMembers} lodCutoff={18.0} />
    </group>
  );
}
