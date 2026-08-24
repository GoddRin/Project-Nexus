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
 * High-End 3D Holographic Facility Beacon & Floating Label
 * Features:
 *   1. Dual Counter-Rotating 3D Gyroscope Hologram Rings
 *   2. Orbiting Energy Satellites / Quantum Particles
 *   3. Vertical Volumetric Locator Beam & Pulsing Ground Radar Wave
 *   4. Smooth Sinusoidal Levitation Bobbing & 3D Spatial Tilt Wobble
 *   5. Premium Glassmorphic Cyber-Industrial HUD Card with Live Status Badges
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
  beamHeight = 12.0,
  badges,
  distanceFactor = 55,
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
          glow: "rgba(16, 185, 129, 0.5)",
          border: "border-emerald-500/60",
          bg: "bg-emerald-950/80",
          text: "text-emerald-400",
          badgeBg: "bg-emerald-900/40 border-emerald-500/30 text-emerald-300",
          threeColor: new THREE.Color("#10b981"),
        };
      case "amber":
        return {
          primary: "#f59e0b",
          secondary: "#d97706",
          glow: "rgba(245, 158, 11, 0.5)",
          border: "border-amber-500/60",
          bg: "bg-amber-950/80",
          text: "text-amber-400",
          badgeBg: "bg-amber-900/40 border-amber-500/30 text-amber-300",
          threeColor: new THREE.Color("#f59e0b"),
        };
      case "blue":
        return {
          primary: "#3b82f6",
          secondary: "#2563eb",
          glow: "rgba(59, 130, 246, 0.5)",
          border: "border-blue-500/60",
          bg: "bg-blue-950/80",
          text: "text-blue-400",
          badgeBg: "bg-blue-900/40 border-blue-500/30 text-blue-300",
          threeColor: new THREE.Color("#3b82f6"),
        };
      case "cyan":
      default:
        return {
          primary: "#06b6d4",
          secondary: "#0891b2",
          glow: "rgba(6, 182, 212, 0.5)",
          border: "border-cyan-500/60",
          bg: "bg-cyan-950/80",
          text: "text-cyan-400",
          badgeBg: "bg-cyan-900/40 border-cyan-500/30 text-cyan-300",
          threeColor: new THREE.Color("#06b6d4"),
        };
    }
  }, [themeColor]);

  // Frame animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Vertical Sinusoidal Levitation Bobbing
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.8) * 0.45;
    }

    // 2. Continuous Endlessly Rotating Hologram Gyro Rings
    if (gyroRing1Ref.current) {
      gyroRing1Ref.current.rotation.y = t * 0.65;
      gyroRing1Ref.current.rotation.x = Math.sin(t * 0.5) * 0.35;
    }
    if (gyroRing2Ref.current) {
      gyroRing2Ref.current.rotation.y = -t * 0.85;
      gyroRing2Ref.current.rotation.z = Math.cos(t * 0.4) * 0.25;
    }
    if (gyroRing3Ref.current) {
      gyroRing3Ref.current.rotation.z = t * 1.1;
      gyroRing3Ref.current.rotation.y = Math.sin(t * 0.7) * 0.4;
    }

    // 3. Orbiting Energy Particles / Satellites
    if (satellitesGroupRef.current) {
      satellitesGroupRef.current.rotation.y = t * 1.25;
    }

    // 4. Ground Radar Expanding Wave Pulse
    if (groundRadarRef.current) {
      const radarScale = 1.0 + (t % 2.5) * 1.8;
      const radarOpacity = Math.max(0, 1.0 - (t % 2.5) / 2.5);
      groundRadarRef.current.scale.set(radarScale, radarScale, 1);
      if (groundRadarRef.current.material instanceof THREE.MeshBasicMaterial) {
        groundRadarRef.current.material.opacity = radarOpacity * 0.6;
      }
    }

    // 5. Vertical Laser Beacon Opacity Pulse
    if (beamRef.current && beamRef.current.material instanceof THREE.MeshBasicMaterial) {
      beamRef.current.material.opacity = 0.25 + Math.sin(t * 3.0) * 0.12;
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
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, groundY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ 2. VERTICAL VOLUMETRIC LASER LOCATOR BEAM ═══ */}
      <mesh
        ref={beamRef}
        position={[0, groundY + actualBeamHeight / 2, 0]}
      >
        <cylinderGeometry args={[0.08, 0.35, actualBeamHeight, 16, 1, true]} />
        <meshBasicMaterial
          color={colors.threeColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ═══ 3. FLOATING BEACON CORE & 3D GYROSCOPE RINGS ═══ */}
      <group ref={groupRef} position={[0, position[1], 0]}>
        {/* Core Glowing Orb */}
        <mesh>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 1: Primary Outer Ring */}
        <mesh ref={gyroRing1Ref}>
          <torusGeometry args={[2.2, 0.04, 16, 48]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 2: Counter-Rotating Middle Ring */}
        <mesh ref={gyroRing2Ref}>
          <torusGeometry args={[1.7, 0.035, 16, 48]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Gyro Ring 3: Tilted Fast Ring */}
        <mesh ref={gyroRing3Ref}>
          <torusGeometry args={[1.2, 0.03, 16, 36]} />
          <meshBasicMaterial
            color={colors.threeColor}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 4 Orbiting Satellites / Energy Nodes */}
        <group ref={satellitesGroupRef}>
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
            <group key={`sat-${i}`} position={[Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2]}>
              <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.9}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.22, 16, 16]} />
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

        {/* ═══ 4. MEDIUM-SIZED GLASSMORPHIC CYBER HUD FLOATING LABEL ═══ */}
        <Html
          position={[0, 1.8, 0]}
          center
          distanceFactor={distanceFactor}
          className="select-none pointer-events-auto"
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
            {/* Outer Cyberpunk Frame with Glassmorphism */}
            <div
              className={`relative overflow-hidden rounded-xl border ${colors.border} bg-black/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ring-1 ring-white/10 hover:ring-2`}
              style={{
                boxShadow: hovered
                  ? `0 0 35px ${colors.glow}, 0 20px 25px -5px rgba(0, 0, 0, 0.8)`
                  : `0 0 20px ${colors.glow}, 0 10px 15px -3px rgba(0, 0, 0, 0.7)`,
              }}
            >
              {/* Corner Cyber Brackets */}
              <div className="absolute top-1 left-1.5 text-[8px] font-mono text-white/40 select-none">⌜</div>
              <div className="absolute top-1 right-1.5 text-[8px] font-mono text-white/40 select-none">⌝</div>
              <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-white/40 select-none">⌞</div>
              <div className="absolute bottom-1 right-1.5 text-[8px] font-mono text-white/40 select-none">⌟</div>

              {/* Header Bar: Status Indicator, Facility Code & Elevation */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: colors.primary }}
                    />
                  </span>
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-white/90">
                    {facilityCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[8.5px] text-white/60">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    {elevation}
                  </span>
                  <span className="hidden sm:inline text-white/40 font-mono text-[8px]">
                    {coordinates}
                  </span>
                </div>
              </div>

              {/* Main Medium-Sized Facility Title & Description */}
              <div className="flex flex-col mb-2">
                <h3 className="font-sans text-[13px] font-black tracking-wide text-white uppercase drop-shadow-md flex items-center gap-1.5">
                  <span>{title}</span>
                  <span className={`text-[10px] ${colors.text} font-mono font-normal`}>// ACTIVE</span>
                </h3>
                <p className="font-mono text-[9.5px] text-white/70 tracking-tight">
                  {subtitle}
                </p>
              </div>

              {/* Live Telemetry Mini-Badges */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 flex-wrap">
                {badges.map((b, idx) => (
                  <div
                    key={`badge-${idx}`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8.5px] font-mono font-semibold ${colors.badgeBg} transition-colors hover:brightness-125`}
                  >
                    {b.icon && <span>{b.icon}</span>}
                    <span className="text-white/60">{b.label}:</span>
                    <span className="text-white font-bold">{b.value}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Subtle Interactive Hint */}
              <div className="mt-1 flex items-center justify-between text-[7.5px] font-mono text-white/40">
                <span>[ SPATIAL DIGITAL TWIN ]</span>
                <span className="animate-pulse flex items-center gap-0.5 text-white/60">
                  CLICK TO INSPECT ➜
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
