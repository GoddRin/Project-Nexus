"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { AtlasNavigatorState } from "@/components/atlas/AtlasTokens";

export interface NavigatorFXProps {
  state: AtlasNavigatorState;
  reducedMotion?: boolean;
  visualMode?: "companion" | "bust" | "heroic_center";
}

/**
 * Restrained, corporate GIS holographic effects system for the SCIC Atlas Navigator.
 * Features:
 * - BaseRing: Subtle concentric cyan rings at ground pedestal
 * - WristHologram: Mini glowing holographic console disc above left forearm
 * - SearchReticle: Rotating holographic radar reticle during SEARCHING
 * - NavigationPing: Directional pulse indicator during NAVIGATING
 * - StatusGlow: Subtle transient affirmation (cyan) or warning (amber) glow
 */
export const NavigatorFX: React.FC<NavigatorFXProps> = ({
  state,
  reducedMotion = false,
  visualMode = "companion",
}) => {
  const baseRingGroupRef = useRef<THREE.Group>(null);
  const wristHoloGroupRef = useRef<THREE.Group>(null);
  const searchReticleRef = useRef<THREE.Group>(null);
  const thinkingHoloRef = useRef<THREE.Group>(null);
  const navPingRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const safeDelta = Math.min(delta, 0.05);

    // 1. Subtle steady base ring pulse
    if (baseRingGroupRef.current) {
      baseRingGroupRef.current.rotation.z += safeDelta * 0.3;
    }

    // 2. Wrist hologram micro-rotation when thinking / searching
    if (wristHoloGroupRef.current && (state === "THINKING" || state === "SEARCHING")) {
      wristHoloGroupRef.current.rotation.z -= safeDelta * 1.5;
    }

    // 3. Search reticle radar sweep
    if (searchReticleRef.current && state === "SEARCHING") {
      searchReticleRef.current.rotation.z += safeDelta * 2.2;
    }

    // 4. Thinking GIS hologram slow concentric rotation
    if (thinkingHoloRef.current && state === "THINKING") {
      thinkingHoloRef.current.rotation.z += safeDelta * 1.2;
    }

    // 5. Navigation ping pulse
    if (navPingRef.current && state === "NAVIGATING") {
      const scale = 1.0 + Math.sin(Date.now() * 0.006) * 0.14;
      navPingRef.current.scale.set(scale, scale, scale);
    }
  });

  const isThinking = state === "THINKING";
  const isSearching = state === "SEARCHING";
  const isNavigating = state === "NAVIGATING";
  const isSuccess = state === "SUCCESS";
  const isError = state === "ERROR";

  return (
    <group name="navigator-fx-root">
      {/* ─── 1. PEDESTAL BASE RINGS (Only visible in companion full-body mode) ─── */}
      {visualMode === "companion" && (
        <group
          ref={baseRingGroupRef}
          position={[0, 0.015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/* Inner ring */}
          <mesh>
            <ringGeometry args={[0.28, 0.295, 32]} />
            <meshBasicMaterial
              color="#00E5FF"
              transparent
              opacity={state === "OFFLINE" ? 0.05 : isSuccess ? 0.7 : 0.28}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer dashed ring */}
          <mesh>
            <ringGeometry args={[0.34, 0.35, 24]} />
            <meshBasicMaterial
              color="#2F82AB"
              transparent
              opacity={state === "OFFLINE" ? 0.02 : 0.18}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Pedestal subtle glow disc */}
          <mesh position={[0, 0, -0.005]}>
            <circleGeometry args={[0.32, 24]} />
            <meshBasicMaterial
              color="#2F82AB"
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* ─── 2. WRIST TERMINAL HOLOGRAPHIC PROJECTION ─── */}
      {/* Positioned near left forearm/wrist of front-facing character (+X) */}
      <group
        ref={wristHoloGroupRef}
        position={[0.24, 1.06, 0.12]}
        rotation={[-Math.PI / 3, 0, -Math.PI / 6]}
        visible={isThinking}
      >
        {/* Holographic Projection Disc */}
        <mesh>
          <ringGeometry args={[0.035, 0.055, 20]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[0.018, 0.025, 16]} />
          <meshBasicMaterial
            color="#4E9DC2"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Small cyan point light projecting on forearm */}
        <pointLight color="#00E5FF" intensity={0.4} distance={0.4} />
      </group>

      {/* ─── 3. SEARCH RETICLE (Active during SEARCHING) ─── */}
      <group
        ref={searchReticleRef}
        position={[0, visualMode === "bust" ? 1.50 : 1.34, 0.26]}
        rotation={[-0.15, 0, 0]}
        visible={isSearching}
      >
        <mesh>
          <ringGeometry args={[0.11, 0.116, 32]} />
          <meshBasicMaterial
            color="#4E9DC2"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Crosshair ticks */}
        {[-0.11, 0.11].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <planeGeometry args={[0.02, 0.003]} />
            <meshBasicMaterial color="#00E5FF" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      {/* ─── 4. THINKING GIS HOLOGRAM (Active during THINKING / AI Generation) ─── */}
      <group
        ref={thinkingHoloRef}
        position={[0, visualMode === "bust" ? 1.50 : 1.34, 0.26]}
        rotation={[-0.15, 0, 0]}
        visible={isThinking}
      >
        {/* Outer concentric HUD ring */}
        <mesh>
          <ringGeometry args={[0.08, 0.088, 32]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Inner spinning data ring */}
        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[0.045, 0.052, 24]} />
          <meshBasicMaterial
            color="#4E9DC2"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Central pulsing core node */}
        <mesh position={[0, 0, 0.008]}>
          <circleGeometry args={[0.015, 16]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ─── 5. NAVIGATION DIRECTIONAL PING (Active during NAVIGATING) ─── */}
      <group
        ref={navPingRef}
        position={[-0.20, visualMode === "bust" ? 1.50 : 1.34, 0.24]}
        rotation={[0.2, 0.4, 0]}
        visible={isNavigating}
      >
        {/* Directional beam ring towards screen-left map canvas */}
        <mesh>
          <ringGeometry args={[0.06, 0.075, 20]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight color="#00E5FF" intensity={0.5} distance={0.5} />
      </group>

      {/* ─── 6. STATUS AMBIENT FLASH (Success / Warning) ─── */}
      {isSuccess && (
        <pointLight
          position={[0, 1.45, 0.4]}
          color="#129450"
          intensity={0.6}
          distance={0.8}
        />
      )}
      {isError && (
        <pointLight
          position={[0, 1.45, 0.4]}
          color="#F59E0B"
          intensity={0.5}
          distance={0.7}
        />
      )}
    </group>
  );
};
