"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REALISTIC SIERRA MADRE SKY & PROCEDURAL CLOUDS ATMOSPHERE SHADER
 * 
 * Physically-inspired atmospheric scattering with procedural Fractal
 * Brownian Motion (fBm) cloud canopy covering:
 * - 🌅 Morning: Soft golden-amber dawn horizon, luminous sky & wispy morning stratus
 * - ☀️ Afternoon: High-altitude azure sky with magnificent billowy mountain cumulus clouds
 * - 🌇 Sunset: Fiery Alpenglow (crimson/orange -> magenta -> twilight indigo)
 * - 🌙 Night: Midnight deep celestial dome with twinkling stars & moon glow
 * - 🌧️ Storm: Heavy dark slate overcast storm canopy
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
        cloudCoverage: 0.85,
        cloudDensity: 0.95,
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
          cloudCoverage: 0.32,
          cloudDensity: 0.55,
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
          cloudCoverage: 0.48,                // Rich billowy cumulus cloud cover
          cloudDensity: 0.78,
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
          cloudCoverage: 0.38,
          cloudDensity: 0.65,
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
          cloudCoverage: 0.18,
          cloudDensity: 0.30,
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
      uCloudCoverage: { value: 0.48 },
      uCloudDensity: { value: 0.78 },
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
    u.uCloudCoverage.value = THREE.MathUtils.lerp(u.uCloudCoverage.value, targetColors.cloudCoverage, lerpSpeed);
    u.uCloudDensity.value = THREE.MathUtils.lerp(u.uCloudDensity.value, targetColors.cloudDensity, lerpSpeed);
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
          uniform float uCloudCoverage;
          uniform float uCloudDensity;
          uniform float uIsNight;

          varying vec3 vWorldPos;
          varying vec3 vNormal;

          // 2D Hash & Value Noise for Fractal Brownian Motion Clouds
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = rot * p * 2.02 + vec2(17.3);
              a *= 0.5;
            }
            return v;
          }

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

            vec3 baseSky = skyGradient + uSunColor * (sunDisk * 2.5 + sunHalo * 0.9 + sunCorona * 0.4);

            // 3. Realistic Fractal Mountain Cumulus Cloud Layer
            vec3 finalColor = baseSky;

            if (h > 0.04 && uCloudCoverage > 0.05) {
              // Project spherical direction onto a curved cloud ceiling
              float denom = max(h + 0.12, 0.08);
              vec2 cloudCoord = (dir.xz / denom) * 2.2;
              // Slow majestic tropical trade wind drift
              vec2 windDrift = vec2(uTime * 0.006, uTime * 0.003);
              vec2 uv = cloudCoord + windDrift;

              // Multi-octave cloud density
              float rawFbm = fbm(uv);
              float rawFbmDetail = fbm(uv * 2.5 - windDrift * 0.5);
              float combinedNoise = mix(rawFbm, rawFbmDetail, 0.35);

              // Cloud coverage thresholding & billowy cumulus curve
              float threshold = 1.0 - uCloudCoverage;
              float cloudAlpha = smoothstep(threshold, threshold + 0.32, combinedNoise);

              // Horizon fade to seamlessly blend with mountain mist
              float horizonFade = smoothstep(0.04, 0.18, h) * (1.0 - smoothstep(0.75, 0.98, h));
              cloudAlpha *= horizonFade * uCloudDensity;

              if (cloudAlpha > 0.001) {
                // Directional sun lighting on clouds (silver lining & underside shadow)
                float sunScatter = pow(sunDot, 2.5);
                vec3 sunlitCloudColor = mix(vec3(0.98, 0.98, 1.0), uSunColor * 1.25, sunScatter * 0.7);
                // Underside cloud shadow matches atmospheric blue/indigo ambient
                vec3 shadowCloudColor = mix(uMiddleColor * 0.75, vec3(0.55, 0.65, 0.78), 0.5);
                
                // Height gradient inside cloud (bright puff tops, soft shadowed bases)
                float cloudHeightGrad = smoothstep(threshold, threshold + 0.28, combinedNoise);
                vec3 cloudRgb = mix(shadowCloudColor, sunlitCloudColor, cloudHeightGrad);

                // Silver lining rim highlight when facing towards the sun
                cloudRgb += uSunColor * pow(sunDot, 5.0) * 0.6 * (1.0 - cloudHeightGrad);

                // Alpha blend cloud canopy over base sky
                finalColor = mix(finalColor, cloudRgb, cloudAlpha * (1.0 - uIsNight * 0.5));
              }
            }

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
}
