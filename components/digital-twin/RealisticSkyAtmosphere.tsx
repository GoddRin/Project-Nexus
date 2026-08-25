"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REALISTIC SIERRA MADRE SKY & ATMOSPHERE DOME SHADER
 * 
 * Physically-inspired atmospheric Rayleigh & Mie scattering covering:
 * - 🌅 Morning: Soft golden-amber dawn horizon, luminous cerulean sky & morning sun
 * - ☀️ Afternoon: Crisp high-altitude tropical mountain azure blue with intense sun disk
 * - 🌇 Sunset: Fiery Alpenglow (crimson/orange -> magenta -> twilight indigo)
 * - 🌙 Night: Midnight deep space dome with twinkling stars & lunar glow
 * - 🌧️ Storm: Heavy dark slate overcast canopy
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AtmosphereTimeMode = "MORNING" | "AFTERNOON" | "SUNSET" | "NIGHT";

interface SkyAtmosphereProps {
  timeMode: AtmosphereTimeMode;
  isStormActive?: boolean;
}

export function RealisticSkyAtmosphere({ timeMode, isStormActive = false }: SkyAtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Target color palettes based on Sierra Madre geographical conditions
  const targetColors = useMemo(() => {
    if (isStormActive) {
      return {
        top: new THREE.Color("#0F172A"),     // Dark stormy slate
        middle: new THREE.Color("#1E293B"),  // Heavy rain cloud grey
        bottom: new THREE.Color("#182230"),  // Horizon mist
        sun: new THREE.Color("#475569"),     // Obscured sun
        sunPos: new THREE.Vector3(0.3, 0.5, 0.4).normalize(),
        sunSize: 0.01,
        ambientGlow: 0.1,
      };
    }

    switch (timeMode) {
      case "MORNING":
        return {
          top: new THREE.Color("#1E40AF"),     // Deep tropical morning blue
          middle: new THREE.Color("#60A5FA"),  // Luminous cerulean sky
          bottom: new THREE.Color("#FED7AA"),  // Warm golden peach/amber sunrise at horizon
          sun: new THREE.Color("#FFFBEB"),     // Bright golden sun
          sunPos: new THREE.Vector3(0.7, 0.35, 0.6).normalize(), // Low Eastern sunrise
          sunSize: 0.045,
          ambientGlow: 0.65,
        };
      case "AFTERNOON":
        return {
          top: new THREE.Color("#0284C7"),     // High mountain azure blue
          middle: new THREE.Color("#38BDF8"),  // Bright tropical sky
          bottom: new THREE.Color("#E0F2FE"),  // Pale mountain haze horizon
          sun: new THREE.Color("#FFFFFF"),     // Intense white-gold midday sun
          sunPos: new THREE.Vector3(0.25, 0.88, 0.38).normalize(), // High solar zenith
          sunSize: 0.055,
          ambientGlow: 0.85,
        };
      case "SUNSET":
        return {
          top: new THREE.Color("#311B92"),     // Deep twilight indigo zenith
          middle: new THREE.Color("#8E24AA"),  // Alpenglow magenta-violet
          bottom: new THREE.Color("#FF5722"),  // Fiery crimson-orange Sierra Madre sunset horizon
          sun: new THREE.Color("#FFA726"),     // Radiant amber-orange sunset disk
          sunPos: new THREE.Vector3(-0.75, 0.18, -0.64).normalize(), // Low Western ridge sunset
          sunSize: 0.065,
          ambientGlow: 0.55,
        };
      case "NIGHT":
      default:
        return {
          top: new THREE.Color("#030712"),     // Deep midnight void
          middle: new THREE.Color("#0B132B"),  // Night sky indigo
          bottom: new THREE.Color("#050B14"),  // Dark mountain horizon
          sun: new THREE.Color("#BAE6FD"),     // Soft celestial moon glow
          sunPos: new THREE.Vector3(-0.4, 0.6, -0.6).normalize(), // Moonlight vector
          sunSize: 0.035,
          ambientGlow: 0.15,
        };
    }
  }, [timeMode, isStormActive]);

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color("#0284C7") },
      uMiddleColor: { value: new THREE.Color("#38BDF8") },
      uBottomColor: { value: new THREE.Color("#E0F2FE") },
      uSunColor: { value: new THREE.Color("#FFFFFF") },
      uSunPos: { value: new THREE.Vector3(0.25, 0.88, 0.38).normalize() },
      uSunSize: { value: 0.055 },
      uAmbientGlow: { value: 0.85 },
      uIsNight: { value: 0.0 },
    };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uTime.value = clock.getElapsedTime();

    const lerpSpeed = Math.min(delta * 3.5, 0.15);
    u.uTopColor.value.lerp(targetColors.top, lerpSpeed);
    u.uMiddleColor.value.lerp(targetColors.middle, lerpSpeed);
    u.uBottomColor.value.lerp(targetColors.bottom, lerpSpeed);
    u.uSunColor.value.lerp(targetColors.sun, lerpSpeed);
    u.uSunPos.value.lerp(targetColors.sunPos, lerpSpeed);
    u.uSunSize.value = THREE.MathUtils.lerp(u.uSunSize.value, targetColors.sunSize, lerpSpeed);
    u.uAmbientGlow.value = THREE.MathUtils.lerp(u.uAmbientGlow.value, targetColors.ambientGlow, lerpSpeed);
    u.uIsNight.value = THREE.MathUtils.lerp(u.uIsNight.value, timeMode === "NIGHT" ? 1.0 : 0.0, lerpSpeed);
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      {/* Sky Dome covering the entire mountain horizon (radius 750m) */}
      <sphereGeometry args={[750, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorldPos;
          varying vec3 vNormal;

          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormal = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uTopColor;
          uniform vec3 uMiddleColor;
          uniform vec3 uBottomColor;
          uniform vec3 uSunColor;
          uniform vec3 uSunPos;
          uniform float uSunSize;
          uniform float uAmbientGlow;
          uniform float uIsNight;

          varying vec3 vWorldPos;
          varying vec3 vNormal;

          void main() {
            vec3 dir = normalize(vNormal);
            float h = clamp(dir.y, 0.0, 1.0);

            // 1. Rayleigh Atmospheric Scattering Gradient
            vec3 skyGradient;
            if (h < 0.35) {
              float t = h / 0.35;
              skyGradient = mix(uBottomColor, uMiddleColor, smoothstep(0.0, 1.0, t));
            } else {
              float t = (h - 0.35) / 0.65;
              skyGradient = mix(uMiddleColor, uTopColor, smoothstep(0.0, 1.0, t));
            }

            // 2. Solar Disk & Mie Forward Scattering Corona
            vec3 sunDir = normalize(uSunPos);
            float sunDot = max(dot(dir, sunDir), 0.0);
            float sunDisk = smoothstep(1.0 - uSunSize * 0.25, 1.0, sunDot);
            float sunHalo = pow(sunDot, 16.0) * uAmbientGlow;
            float sunCorona = pow(sunDot, 4.0) * uAmbientGlow * 0.45;

            vec3 finalColor = skyGradient + uSunColor * (sunDisk * 2.5 + sunHalo * 0.9 + sunCorona * 0.4);

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
}
