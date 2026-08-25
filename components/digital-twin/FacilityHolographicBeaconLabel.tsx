"use client";

import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export interface FacilityHolographicBeaconProps {
  title: string;
  facilityCode: string;
  subtitle: string;
  elevation: string;
  coordinates: string;
  themeColor?: "cyan" | "emerald" | "amber" | "blue";
  position: [number, number, number];
  groundY?: number;
  beamHeight?: number;
  badges: Array<{ label: string; value: string; icon?: string }>;
  distanceFactor?: number;
  onClick?: () => void;
}

/**
 * High-End 3D Holographic Facility Beacon & Wide-Format Cyber HUD Banner
 * Features:
 *   1. Wide-format horizontal cyber HUD banner (non-mobile, cinematic layout)
 *   2. Dual Counter-Rotating 3D Gyroscope Hologram Rings
 *   3. Orbiting Energy Satellites / Quantum Particles
 *   4. Vertical Volumetric Locator Beam & Pulsing Ground Radar Wave
 *   5. Smooth Sinusoidal Levitation Bobbing & 3D Spatial Tilt Wobble
 *   6. High-contrast typography with zero line-wrapping
 */
export function FacilityHolographicBeaconLabel({
  title,
  facilityCode,
  subtitle,
  elevation,
  coordinates,
  themeColor = "cyan",
  position,
  groundY = 14.0,
  beamHeight = 24.0,
  badges,
  distanceFactor = 65,
  onClick,
}: FacilityHolographicBeaconProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gyroRing1Ref = useRef<THREE.Mesh>(null);
  const gyroRing2Ref = useRef<THREE.Mesh>(null);
  const gyroRing3Ref = useRef<THREE.Mesh>(null);
  const satellitesGroupRef = useRef<THREE.Group>(null);
  const groundRadarRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);

  // Theme Color Palettes
  const colors = useMemo(() => {
    switch (themeColor) {
      case "emerald":
        return {
          primary: "#10b981",
          secondary: "#059669",
          glow: "rgba(16, 185, 129, 0.45)",
          border: "border-emerald-500/50",
          borderHover: "border-emerald-400",
          bg: "bg-emerald-950/90",
          text: "text-emerald-400",
          badgeBg: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300",
          threeColor: new THREE.Color("#10b981"),
        };
      case "amber":
        return {
          primary: "#f59e0b",
          secondary: "#d97706",
          glow: "rgba(245, 158, 11, 0.45)",
          border: "border-amber-500/50",
          borderHover: "border-amber-400",
          bg: "bg-amber-950/90",
          text: "text-amber-400",
          badgeBg: "bg-amber-950/70 border-amber-500/40 text-amber-300",
          threeColor: new THREE.Color("#f59e0b"),
        };
      case "blue":
        return {
          primary: "#3b82f6",
          secondary: "#2563eb",
          glow: "rgba(59, 130, 246, 0.45)",
          border: "border-blue-500/50",
          borderHover: "border-blue-400",
          bg: "bg-blue-950/90",
          text: "text-blue-400",
          badgeBg: "bg-blue-950/70 border-blue-500/40 text-blue-300",
          threeColor: new THREE.Color("#3b82f6"),
        };
      case "cyan":
      default:
        return {
          primary: "#06b6d4",
          secondary: "#0891b2",
          glow: "rgba(6, 182, 212, 0.45)",
          border: "border-cyan-500/50",
          borderHover: "border-cyan-400",
          bg: "bg-cyan-950/90",
          text: "text-cyan-400",
          badgeBg: "bg-cyan-950/70 border-cyan-500/40 text-cyan-300",
          threeColor: new THREE.Color("#06b6d4"),
        };
    }
  }, [themeColor]);

  // Frame animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Vertical Sinusoidal Levitation Bobbing
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.45;
    }

    // 2. Continuous Endlessly Rotating Hologram Gyro Rings
    if (gyroRing1Ref.current) {
      gyroRing1Ref.current.rotation.y = t * 0.55;
      gyroRing1Ref.current.rotation.x = Math.sin(t * 0.4) * 0.3;
    }
    if (gyroRing2Ref.current) {
      gyroRing2Ref.current.rotation.y = -t * 0.75;
      gyroRing2Ref.current.rotation.z = Math.cos(t * 0.35) * 0.25;
    }
    if (gyroRing3Ref.current) {
      gyroRing3Ref.current.rotation.z = t * 0.95;
      gyroRing3Ref.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    }

    // 3. Orbiting Energy Particles / Satellites
    if (satellitesGroupRef.current) {
      satellitesGroupRef.current.rotation.y = t * 1.1;
    }

    // 4. Ground Radar Expanding Wave Pulse
    if (groundRadarRef.current) {
      const radarScale = 1.0 + (t % 2.5) * 2.2;
      const radarOpacity = Math.max(0, 1.0 - (t % 2.5) / 2.5);
      groundRadarRef.current.scale.set(radarScale, radarScale, 1);
      if (groundRadarRef.current.material instanceof THREE.MeshBasicMaterial) {
        groundRadarRef.current.material.opacity = radarOpacity * 0.6;
      }
    }

    // 5. Vertical Laser Beacon Opacity Pulse
    if (beamRef.current && beamRef.current.material instanceof THREE.MeshBasicMaterial) {
      beamRef.current.material.opacity = 0.25 + Math.sin(t * 2.8) * 0.1;
    }
  });

  const actualBeamHeight = position[1] - groundY;

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* ═══ 1. GROUND RADAR PULSE RING & ANCHOR LOCATOR ═══ */}
      <mesh
        ref={groundRadarRef}
        position={[0, groundY + 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.0, 2.8, 36]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, groundY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 36]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ 2. DELICATE HOLOGRAPHIC TETHER LINE ═══ */}
      <mesh
        ref={beamRef}
        position={[0, groundY + actualBeamHeight / 2, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, actualBeamHeight, 8, 1, true]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ 3. FLOATING BEACON CORE & 3D GYROSCOPE RINGS ═══ */}
      <group ref={groupRef} position={[0, position[1], 0]}>
        {/* Core Glowing Orb */}
        <mesh>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 1: Primary Outer Ring */}
        <mesh ref={gyroRing1Ref}>
          <torusGeometry args={[3.2, 0.05, 16, 48]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 2: Counter-Rotating Middle Ring */}
        <mesh ref={gyroRing2Ref}>
          <torusGeometry args={[2.5, 0.04, 16, 48]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 3: Tilted Fast Ring */}
        <mesh ref={gyroRing3Ref}>
          <torusGeometry args={[1.8, 0.035, 16, 36]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 4 Orbiting Satellites / Energy Nodes */}
        <group ref={satellitesGroupRef}>
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
            <group key={`sat-${i}`} position={[Math.cos(angle) * 3.2, 0, Math.sin(angle) * 3.2]}>
              <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.9}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial
                  color={colors.threeColor}
                  transparent
                  opacity={0.4}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          ))}
        </group>

        {/* ═══ 4. WIDE-FORMAT HORIZONTAL CYBER HUD BANNER ═══ */}
        <Html
          position={[0, 2.6, 0]}
          center
          distanceFactor={distanceFactor}
          className="select-none pointer-events-auto whitespace-nowrap"
        >
          <div
            className={`relative group cursor-pointer transition-all duration-300 transform ${
              hovered ? "scale-105" : "scale-100"
            }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            {/* Outer Cyberpunk Frame with Wide Landscape Geometry */}
            <div
              className={`relative w-[480px] max-w-[90vw] overflow-hidden rounded-xl border ${
                hovered ? colors.borderHover : colors.border
              } bg-[#060a0ecc]/95 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ring-1 ring-white/10`}
              style={{
                boxShadow: hovered
                  ? `0 0 35px ${colors.glow}, 0 20px 30px -5px rgba(0, 0, 0, 0.85)`
                  : `0 0 20px ${colors.glow}, 0 10px 20px -3px rgba(0, 0, 0, 0.75)`,
              }}
            >
              {/* Corner Cyber Brackets */}
              <div className="absolute top-1.5 left-2 text-[9px] font-mono text-white/50 select-none">⌜</div>
              <div className="absolute top-1.5 right-2 text-[9px] font-mono text-white/50 select-none">⌝</div>
              <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-white/50 select-none">⌞</div>
              <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-white/50 select-none">⌟</div>

              {/* ─── ROW 1: TOP SYSTEM META RIBBON (Horizontal Alignment) ─── */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                {/* Facility Code with Pulsing LED */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ backgroundColor: colors.primary }}
                    />
                  </span>
                  <span className="font-mono text-[10.5px] font-black tracking-widest uppercase text-white/95">
                    {facilityCode}
                  </span>
                  <span className="text-white/30 text-[10px]">|</span>
                  <span className={`font-mono text-[9.5px] font-bold ${colors.text} tracking-wider`}>
                    ONLINE 24/7
                  </span>
                </div>

                {/* Elevation & Real GPS Coordinates */}
                <div className="flex items-center gap-2 font-mono text-[9px] text-white/70">
                  <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white font-semibold">
                    {elevation}
                  </span>
                  <span className="text-white/50 font-mono text-[8.5px]">
                    {coordinates}
                  </span>
                </div>
              </div>

              {/* ─── ROW 2: PRIMARY FACILITY TITLE & SUBTITLE ─── */}
              <div className="flex flex-col mb-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-[14px] font-black tracking-wide text-white uppercase drop-shadow-sm flex items-center gap-2">
                    <span>{title}</span>
                  </h3>
                  <span className={`text-[9.5px] font-mono font-bold uppercase ${colors.text} bg-white/5 px-2 py-0.5 rounded border border-white/10`}>
                    FACILITY BEACON
                  </span>
                </div>
                <p className="font-mono text-[10px] text-white/70 tracking-tight mt-0.5">
                  {subtitle}
                </p>
              </div>

              {/* ─── ROW 3: HORIZONTAL 4-COLUMN TELEMETRY GRID ─── */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
                {badges.map((b, idx) => (
                  <div
                    key={`badge-${idx}`}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center ${colors.badgeBg} transition-all duration-200 hover:brightness-125`}
                  >
                    <div className="flex items-center gap-1 text-[9px] text-white/70 font-mono">
                      {b.icon && <span className="text-[10px]">{b.icon}</span>}
                      <span className="text-[8px] uppercase tracking-wider">{b.label}</span>
                    </div>
                    <span className="text-[10.5px] font-bold text-white tracking-tight mt-0.5">
                      {b.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ─── ROW 4: INTERACTIVE BOTTOM STATUS & CLICK HINT ─── */}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/40">
                <span className="flex items-center gap-1 text-white/50">
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  [ SPATIAL DIGITAL TWIN ACTIVE ]
                </span>
                <span className={`font-semibold tracking-wider flex items-center gap-1 ${colors.text} group-hover:text-white transition-colors`}>
                  CLICK TO FOCUS CAMERA ➜
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
