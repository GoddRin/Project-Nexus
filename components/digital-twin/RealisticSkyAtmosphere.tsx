"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REALISTIC SIERRA MADRE SKY & ATMOSPHERE SHADER
 * 
 * Physically-inspired atmospheric scattering covering:
 * - 🌅 Morning: Warm golden-amber eastern sunrise fading to pale cerulean
 * - ☀️ Afternoon: Crisp high-altitude tropical mountain azure blue with sun disk
 * - 🌇 Sunset: Dramatic fiery Alpenglow (crimson/orange -> magenta -> twilight indigo)
 * - 🌙 Night: Midnight deep space with twinkling stars, nebulas & celestial dust
 * - 🌧️ Storm: Desaturated dark slate storm overcast
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
        top: new THREE.Color("#111827"),     // Dark stormy slate
        middle: new THREE.Color("#1F2937"),  // Heavy rain cloud grey
        bottom: new THREE.Color("#182230"),  // Horizon mist
        sun: new THREE.Color("#4B5563"),     // Obscured sun
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
          ambientGlow: 0.8,
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
      uTopColor: { value: new THREE.Color("#1E40AF") },
      uMiddleColor: { value: new THREE.Color("#60A5FA") },
      uBottomColor: { value: new THREE.Color("#FED7AA") },
      uSunColor: { value: new THREE.Color("#FFFBEB") },
      uSunPos: { value: new THREE.Vector3(0.7, 0.35, 0.6).normalize() },
      uSunSize: { value: 0.045 },
      uAmbientGlow: { value: 0.65 },
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
      {/* Huge Sky Dome covering the entire mountain horizon (radius 700m) */}
      <sphereGeometry args={[700, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
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

            // Atmospheric Rayleigh scattering gradient:
            // Horizon (0.0) -> Middle Sky (0.35) -> Zenith (1.0)
            vec3 skyGradient;
            if (h < 0.35) {
              float t = h / 0.35;
              skyGradient = mix(uBottomColor, uMiddleColor, smoothstep(0.0, 1.0, t));
            } else {
              float t = (h - 0.35) / 0.65;
              skyGradient = mix(uMiddleColor, uTopColor, smoothstep(0.0, 1.0, t));
            }

            // Sun Disk & Mie Atmospheric Corona Halo
            float sunDot = max(dot(dir, normalize(uSunPos)), 0.0);
            float sunDisk = smoothstep(1.0 - uSunSize * 0.25, 1.0, sunDot);
            float sunHalo = pow(sunDot, 18.0) * uAmbientGlow;
            float sunCorona = pow(sunDot, 4.5) * uAmbientGlow * 0.4;

            vec3 finalColor = skyGradient + uSunColor * (sunDisk * 2.2 + sunHalo * 0.9 + sunCorona * 0.4);

            // Subtle animated mountain horizon wisps
            if (uIsNight < 0.5) {
              float cloudWisp = sin(dir.x * 12.0 + uTime * 0.05) * cos(dir.z * 12.0 + uTime * 0.04);
              if (h > 0.05 && h < 0.45) {
                float wispAlpha = smoothstep(0.05, 0.25, h) * (1.0 - smoothstep(0.25, 0.45, h)) * 0.08;
                finalColor += vec3(1.0, 0.95, 0.9) * max(0.0, cloudWisp) * wispAlpha;
              }
            }

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
}
