/**
 * ============================================================
 * AtlasAnimatedMarkers.ts
 * Sta. Clara Project Atlas — 60 FPS Hardware-Accelerated Dynamic Marker Engines
 * ============================================================
 *
 * Implements native MapLibre StyleImageInterface animated canvas textures:
 * 1. radar-pulse-ongoing     (Emerald dual sonar ping + breathing core + telemetry blip)
 * 2. orbit-ring-upcoming     (Amber rotating dashed gear/orbit + mobilization caution pulse)
 * 3. aura-ring-completed     (Corporate sky-blue architectural halo + periodic inspection shimmer)
 * 4. cluster-pulse-halo      (Deep ocean ambient geo-density breathing aura)
 * 5. sector-wave-ripple      (Renewable energy & water hydrodynamic wave ripples)
 */

import type * as maplibregl from "maplibre-gl";

export interface AnimatedMarkerImageConfig {
  size: number;
  duration?: number;
}

/**
 * Global Configuration Flags for Visual Inspection & Easy Modular Tuning
 */
export const ATLAS_EFFECTS_CONFIG = {
  enableOngoingSonarPulse: true,
  enableOngoingBreathingGlow: true,
  enableOngoingTelemetryBlip: true,
  enableUpcomingRotatingOrbit: true,
  enableUpcomingCautionStrobe: true,
  enableCompletedArchitecturalAura: true,
  enableCompletedInspectionShimmer: true,
  enableSelectedCyberneticReticle: true,
  enableSelectedGroundDropBeacon: true,
  enableSectorMicroEffects: true,
  enableClusterBreathingHalo: true,
};

/**
 * 1. Ongoing Projects: Dual-Ring Radar Sonar Ping + Breathing Core + Telemetry Blip
 */
export function createOngoingRadarPulseImage(map: maplibregl.Map, size = 180): maplibregl.StyleImageInterface {
  let context: CanvasRenderingContext2D | null = null;
  const data = new Uint8Array(size * size * 4);

  return {
    width: size,
    height: size,
    data,
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      context = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!context) return false;
      const now = performance.now();
      const duration = 2400; // 2.4s cycle
      const t = (now % duration) / duration;
      const center = size / 2;

      context.clearRect(0, 0, size, size);

      // --- Wave 1: Primary expanding emerald sonar wave ---
      if (ATLAS_EFFECTS_CONFIG.enableOngoingSonarPulse) {
        const radius1 = 18 + (size / 2 - 24) * t;
        const opacity1 = Math.max(0, (1 - t) * 0.85);

        context.beginPath();
        context.arc(center, center, radius1, 0, Math.PI * 2);
        context.fillStyle = `rgba(16, 185, 129, ${opacity1 * 0.22})`;
        context.fill();

        context.strokeStyle = `rgba(52, 211, 153, ${opacity1})`;
        context.lineWidth = 2.2;
        context.stroke();

        // --- Wave 2: Staggered secondary ring (offset by 0.5 cycle) ---
        const t2 = (t + 0.5) % 1;
        const radius2 = 18 + (size / 2 - 24) * t2;
        const opacity2 = Math.max(0, (1 - t2) * 0.65);

        context.beginPath();
        context.arc(center, center, radius2, 0, Math.PI * 2);
        context.strokeStyle = `rgba(16, 185, 129, ${opacity2})`;
        context.lineWidth = 1.4;
        context.setLineDash([4, 4]);
        context.stroke();
        context.setLineDash([]);
      }

      // --- Breathing Core Glow (Sinusoidal oscillation) ---
      if (ATLAS_EFFECTS_CONFIG.enableOngoingBreathingGlow) {
        const breath = (Math.sin(now / 380) + 1) / 2; // 0..1
        const coreRadius = 22 + breath * 7;
        const grad = context.createRadialGradient(center, center, 6, center, center, coreRadius);
        grad.addColorStop(0, `rgba(52, 211, 153, ${0.45 + breath * 0.35})`);
        grad.addColorStop(0.5, `rgba(16, 185, 129, ${0.25 + breath * 0.2})`);
        grad.addColorStop(1, "rgba(16, 185, 129, 0)");

        context.beginPath();
        context.arc(center, center, coreRadius, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();
      }

      // --- Active Telemetry Blip (1.2 Hz beacon on top-right quadrant) ---
      if (ATLAS_EFFECTS_CONFIG.enableOngoingTelemetryBlip) {
        const blipCycle = (now % 800) / 800;
        if (blipCycle < 0.45) {
          const blipX = center + 14;
          const blipY = center - 14;
          context.beginPath();
          context.arc(blipX, blipY, 3, 0, Math.PI * 2);
          context.fillStyle = "#A7F3D0";
          context.shadowColor = "#10B981";
          context.shadowBlur = 8;
          context.fill();
          context.shadowBlur = 0;
        }
      }

      // Copy buffer to MapLibre WebGL data array
      const imgData = context.getImageData(0, 0, size, size);
      this.data = imgData.data;
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * 2. Upcoming Projects: Rotating Dashed Gear Orbit + Caution Strobe
 */
export function createUpcomingOrbitImage(map: maplibregl.Map, size = 160): maplibregl.StyleImageInterface {
  let context: CanvasRenderingContext2D | null = null;
  const data = new Uint8Array(size * size * 4);

  return {
    width: size,
    height: size,
    data,
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      context = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!context) return false;
      const now = performance.now();
      const center = size / 2;

      context.clearRect(0, 0, size, size);

      // --- Rotating Dashed Orbit Ring ---
      if (ATLAS_EFFECTS_CONFIG.enableUpcomingRotatingOrbit) {
        const angle = (now / 1800) % (Math.PI * 2); // Slow smooth 360 rotation
        const orbitRadius = 28;

        context.save();
        context.translate(center, center);
        context.rotate(angle);

        context.beginPath();
        context.arc(0, 0, orbitRadius, 0, Math.PI * 2);
        context.strokeStyle = "rgba(245, 158, 11, 0.85)"; // Amber-500
        context.lineWidth = 2.2;
        context.setLineDash([5, 5]);
        context.stroke();

        // Staging orbital pips
        for (let i = 0; i < 4; i++) {
          const pipAngle = (i * Math.PI) / 2;
          const px = Math.cos(pipAngle) * orbitRadius;
          const py = Math.sin(pipAngle) * orbitRadius;
          context.beginPath();
          context.arc(px, py, 2.2, 0, Math.PI * 2);
          context.fillStyle = "#FDE68A";
          context.fill();
        }

        context.restore();
      }

      // --- Caution Mobilization Strobe (Soft double pulse every 3.5s) ---
      if (ATLAS_EFFECTS_CONFIG.enableUpcomingCautionStrobe) {
        const strobeTime = now % 3500;
        let strobeAlpha = 0.15;
        if (strobeTime < 250 || (strobeTime > 400 && strobeTime < 650)) {
          strobeAlpha = 0.55;
        }

        const grad = context.createRadialGradient(center, center, 10, center, center, 32);
        grad.addColorStop(0, `rgba(245, 158, 11, ${strobeAlpha})`);
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");

        context.beginPath();
        context.arc(center, center, 32, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();
      }

      const imgData = context.getImageData(0, 0, size, size);
      this.data = imgData.data;
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * 3. Completed Projects: Architectural Halo Ring + Periodic Inspection Shimmer
 */
export function createCompletedAuraImage(map: maplibregl.Map, size = 150): maplibregl.StyleImageInterface {
  let context: CanvasRenderingContext2D | null = null;
  const data = new Uint8Array(size * size * 4);

  return {
    width: size,
    height: size,
    data,
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      context = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!context) return false;
      const now = performance.now();
      const center = size / 2;

      context.clearRect(0, 0, size, size);

      // --- Still Architectural Halo (Prestige Sky-Blue) ---
      if (ATLAS_EFFECTS_CONFIG.enableCompletedArchitecturalAura) {
        const baseRadius = 24;

        // Subtle ambient ground wash
        const grad = context.createRadialGradient(center, center, 14, center, center, baseRadius + 6);
        grad.addColorStop(0, "rgba(2, 132, 199, 0.28)");
        grad.addColorStop(0.7, "rgba(2, 132, 199, 0.12)");
        grad.addColorStop(1, "rgba(2, 132, 199, 0)");

        context.beginPath();
        context.arc(center, center, baseRadius + 6, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();

        // Crisp solid outer architectural rim
        context.beginPath();
        context.arc(center, center, baseRadius, 0, Math.PI * 2);
        context.strokeStyle = "rgba(56, 189, 248, 0.65)";
        context.lineWidth = 1.6;
        context.stroke();
      }

      // --- Periodic Inspection Shimmer (Sweeps every 8 seconds) ---
      if (ATLAS_EFFECTS_CONFIG.enableCompletedInspectionShimmer) {
        const shimmerCycle = now % 8000;
        if (shimmerCycle < 1400) {
          const progress = shimmerCycle / 1400;
          const shimmerAngle = progress * Math.PI * 2;
          const arcLength = Math.PI / 3; // 60 degrees arc

          context.beginPath();
          context.arc(center, center, 24, shimmerAngle - arcLength, shimmerAngle);
          context.strokeStyle = "#BAE6FD";
          context.lineWidth = 2.5;
          context.shadowColor = "#38BDF8";
          context.shadowBlur = 10;
          context.stroke();
          context.shadowBlur = 0;
        }
      }

      const imgData = context.getImageData(0, 0, size, size);
      this.data = imgData.data;
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * 4. Cluster Ambient Breathing Geo-Density Halo
 */
export function createClusterPulseImage(map: maplibregl.Map, size = 180): maplibregl.StyleImageInterface {
  let context: CanvasRenderingContext2D | null = null;
  const data = new Uint8Array(size * size * 4);

  return {
    width: size,
    height: size,
    data,
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      context = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!context) return false;
      const now = performance.now();
      const center = size / 2;

      context.clearRect(0, 0, size, size);

      if (ATLAS_EFFECTS_CONFIG.enableClusterBreathingHalo) {
        const breath = (Math.sin(now / 550) + 1) / 2;
        const radius = 32 + breath * 12;
        const opacity = 0.15 + breath * 0.15;

        const grad = context.createRadialGradient(center, center, 18, center, center, radius);
        grad.addColorStop(0, `rgba(3, 105, 161, ${opacity * 1.5})`);
        grad.addColorStop(0.6, `rgba(2, 132, 199, ${opacity * 0.8})`);
        grad.addColorStop(1, "rgba(2, 132, 199, 0)");

        context.beginPath();
        context.arc(center, center, radius, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();
      }

      const imgData = context.getImageData(0, 0, size, size);
      this.data = imgData.data;
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * 5. Sector-Specific Micro-Effects (Hydropower & Water Dynamic Wave Ripples)
 */
export function createSectorWaveRippleImage(map: maplibregl.Map, size = 160): maplibregl.StyleImageInterface {
  let context: CanvasRenderingContext2D | null = null;
  const data = new Uint8Array(size * size * 4);

  return {
    width: size,
    height: size,
    data,
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      context = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!context) return false;
      const now = performance.now();
      const center = size / 2;

      context.clearRect(0, 0, size, size);

      if (ATLAS_EFFECTS_CONFIG.enableSectorMicroEffects) {
        const duration = 2600;
        const t = (now % duration) / duration;
        const rippleRadius = 20 + 35 * t;
        const rippleAlpha = Math.max(0, (1 - t) * 0.7);

        // Hydrodynamic wave ripple (Cyan / Teal)
        context.beginPath();
        context.arc(center, center, rippleRadius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(6, 182, 212, ${rippleAlpha})`;
        context.lineWidth = 1.8;
        context.stroke();
      }

      const imgData = context.getImageData(0, 0, size, size);
      this.data = imgData.data;
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * Registers all dynamic animated WebGL images into the MapLibre instance.
 */
export function ensureAtlasAnimatedImages(map: maplibregl.Map): void {
  const images = [
    { name: "radar-pulse-ongoing", factory: () => createOngoingRadarPulseImage(map, 180) },
    { name: "orbit-ring-upcoming", factory: () => createUpcomingOrbitImage(map, 160) },
    { name: "aura-ring-completed", factory: () => createCompletedAuraImage(map, 150) },
    { name: "cluster-pulse-halo", factory: () => createClusterPulseImage(map, 180) },
    { name: "sector-wave-ripple", factory: () => createSectorWaveRippleImage(map, 160) },
  ];

  for (const item of images) {
    if (map.hasImage(item.name)) {
      map.removeImage(item.name);
    }
    try {
      map.addImage(item.name, item.factory(), { pixelRatio: 2 });
    } catch (err) {
      console.warn(`[AtlasAnimatedMarkers] Failed to register dynamic image ${item.name}:`, err);
    }
  }
}
