"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Image from "next/image";
import { FILIPINO_PERSONNEL_REGISTRY } from "./personnelData";
import { getPersonnelLocationTarget, getLivePersonnelWorldPosition } from "./personnelLocations";

const RING_GEO_1 = new THREE.RingGeometry(0.8, 1.0, 32);
const RING_GEO_2 = new THREE.RingGeometry(1.4, 1.6, 32);
const CYL_GEO = new THREE.CylinderGeometry(0.5, 0.8, 4.0, 24, 1, true);

interface PersonnelLocatorBeaconProps {
  personnelId: string;
  onDismiss?: () => void;
}

export function PersonnelLocatorBeacon({ personnelId, onDismiss }: PersonnelLocatorBeaconProps) {
  const loc = getPersonnelLocationTarget(personnelId);
  const person = FILIPINO_PERSONNEL_REGISTRY[personnelId];
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Dynamically lock locator beacon position to the live 3D coordinates of the moving person
    const livePos = getLivePersonnelWorldPosition(personnelId);
    if (groupRef.current) {
      if (livePos) {
        groupRef.current.position.set(livePos.x, livePos.y, livePos.z);
      } else if (loc) {
        const floorY = loc.floorY ?? (loc.target[1] - 1.15);
        groupRef.current.position.set(loc.target[0], floorY, loc.target[2]);
      }
    }

    if (ring1Ref.current) {
      const s1 = 1.0 + Math.sin(t * 4.0) * 0.15;
      ring1Ref.current.scale.set(s1, s1, 1.0);
    }
    if (ring2Ref.current) {
      const s2 = 1.0 + Math.cos(t * 3.0) * 0.2;
      ring2Ref.current.scale.set(s2, s2, 1.0);
    }
    if (beamRef.current) {
      beamRef.current.rotation.y = t * 0.8;
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.25 + Math.sin(t * 3.0) * 0.12;
      }
    }
  });

  if (!loc || !person) return null;

  const initialFloorY = loc.floorY ?? (loc.target[1] - 1.15);

  return (
    <group ref={groupRef} position={[loc.target[0], initialFloorY, loc.target[2]]}>
      {/* ─── Ground Concentric Holographic Radar Rings ─── */}
      <mesh ref={ring1Ref} geometry={RING_GEO_1} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} geometry={RING_GEO_2} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ─── Vertical Holographic Beacon Light Beam ─── */}
      <mesh ref={beamRef} geometry={CYL_GEO} position={[0, 2.0, 0]}>
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* ─── Floating 3D HTML Radar Badge (Crisp, Perfectly Scaled, Never Blown Out) ─── */}
      <Html position={[0, 2.15, 0]} center className="pointer-events-auto select-none z-30">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
          <div
            className="relative flex items-center gap-3 bg-slate-950/95 border-2 border-cyan-400 shadow-2xl shadow-cyan-500/50 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl text-white max-w-[340px] shrink-0"
            style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
          >
            {/* High-definition Avatar thumbnail */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-cyan-400 shadow-md shadow-cyan-500/30 shrink-0 bg-slate-900 ring-1 ring-cyan-300/40">
              <Image
                src={person.avatarUrl}
                alt={person.name}
                fill
                unoptimized
                priority
                className="object-cover"
                style={{ imageRendering: "auto" }}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl pointer-events-none" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[9.5px] font-mono uppercase font-bold text-cyan-300 tracking-wider">
                  TARGET LOCATED
                </span>
              </div>
              <div className="text-sm font-extrabold text-white leading-tight drop-shadow-sm truncate">{person.nickname}</div>
              <div className="text-[11px] font-medium text-cyan-100/90 leading-snug line-clamp-2">{person.role}</div>
            </div>

            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800/90 text-slate-300 hover:text-white hover:bg-cyan-600 hover:scale-105 border border-slate-700 hover:border-cyan-400 text-xs ml-1 shrink-0 transition"
                title="Dismiss Locator"
              >
                ✕
              </button>
            )}
          </div>

          {/* Pointer down triangle */}
          <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-cyan-400 drop-shadow-lg" />
        </div>
      </Html>
    </group>
  );
}
