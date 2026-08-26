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
        groupRef.current.position.set(loc.target[0], loc.target[1], loc.target[2]);
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

  return (
    <group ref={groupRef} position={[loc.target[0], loc.target[1], loc.target[2]]}>
      {/* ─── Ground Concentric Holographic Radar Rings ─── */}
      <mesh ref={ring1Ref} geometry={RING_GEO_1} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} geometry={RING_GEO_2} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ─── Vertical Holographic Beacon Light Beam ─── */}
      <mesh ref={beamRef} geometry={CYL_GEO} position={[0, 2.0, 0]}>
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* ─── Floating 3D HTML Radar Badge ─── */}
      <Html position={[0, 2.8, 0]} center distanceFactor={25} className="pointer-events-auto select-none z-30">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
          <div className="relative flex items-center gap-2.5 bg-slate-950/90 border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/40 rounded-xl px-3 py-1.5 backdrop-blur-md text-white min-w-[210px]">
            {/* Avatar thumbnail */}
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-cyan-400 shrink-0">
              <Image src={person.avatarUrl} alt={person.name} fill className="object-cover" sizes="32px" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[9px] font-mono uppercase font-bold text-cyan-300 tracking-wider">
                  TARGET LOCATED
                </span>
              </div>
              <div className="text-xs font-bold text-slate-100 truncate">{person.nickname}</div>
              <div className="text-[10px] text-slate-300 truncate">{person.role}</div>
            </div>

            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 text-[10px] ml-1 transition"
                title="Dismiss Locator"
              >
                ✕
              </button>
            )}
          </div>

          {/* Pointer down triangle */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-400/90 drop-shadow-md" />
        </div>
      </Html>
    </group>
  );
}
