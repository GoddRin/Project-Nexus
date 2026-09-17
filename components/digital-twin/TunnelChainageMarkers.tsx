/**
 * TunnelChainageMarkers.tsx
 *
 * Painted Tunnel Sidewall Chainage Stencils & Station Decals.
 * Grounded in Philippine Hydroelectric Tunnel Surveying Practices (Tumauini HEPP).
 *
 * Renders high-visibility survey chainage marks along the tunnel wall at 10m intervals
 * (e.g. "STA 1+200", "STA 1+210", "STA 1+220", "STA 1+240", "STA 1+260").
 * Textures generated once via dynamic HTML Canvas with stenciled lettering, elevation
 * datum (EL. 271.45m), and alignment crosshairs.
 */

"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export interface TunnelChainageMarkersProps {
  spline: THREE.Curve<THREE.Vector3>;
  radius?: number;
  totalLength?: number;
  advanceMeters?: number; // Current excavated advance along tunnel (0m to 60m)
  baseChainageMeters?: number; // Starting chainage in meters, default 1200 (STA 1+200)
  intervalMeters?: number; // Spacing between painted station markers, default 10m
}

interface StationMarkerData {
  stationText: string;
  elevationText: string;
  distanceAlong: number;
  position: [number, number, number];
  rotation: [number, number, number];
  texture: THREE.CanvasTexture;
}

/**
 * Creates a crisp painted stencil texture for a chainage station.
 */
function createStationTexture(stationText: string, elevationText: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Clear transparent background
    ctx.clearRect(0, 0, 512, 256);

    // Weathered spray-stencil background plate
    ctx.fillStyle = "rgba(18, 20, 22, 0.72)";
    ctx.roundRect(16, 16, 480, 224, 12);
    ctx.fill();

    // High-visibility safety border
    ctx.strokeStyle = "#F59E0B"; // Amber/yellow reflective paint
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 472, 216);

    // Header label
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 24px 'Inter', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("HEADING SURVEY DATUM", 36, 56);

    // Station text (Big stenciled lettering)
    ctx.fillStyle = "#FDE047"; // Bright Stencil Yellow
    ctx.font = "900 68px 'JetBrains Mono', 'Courier New', monospace";
    ctx.fillText(stationText, 36, 134);

    // Alignment crosshair & elevation datum
    ctx.fillStyle = "#38BDF8"; // Sky Blue
    ctx.font = "bold 28px 'JetBrains Mono', monospace";
    ctx.fillText(`⊕ ${elevationText}`, 36, 184);

    // Contractor & project stamp
    ctx.fillStyle = "#64748B";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText("SCIC • TUMAUINI HEPP LOT-2", 36, 218);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function TunnelChainageMarkers({
  spline,
  radius = 2.5,
  totalLength = 60.0,
  advanceMeters = 57.6,
  baseChainageMeters = 1200,
  intervalMeters = 10.0,
}: TunnelChainageMarkersProps) {
  // Precompute marker positions along spline
  const markers = useMemo<StationMarkerData[]>(() => {
    if (typeof document === "undefined") return [];

    const list: StationMarkerData[] = [];
    const count = Math.floor(totalLength / intervalMeters);

    for (let i = 0; i <= count; i++) {
      const dist = i * intervalMeters;
      const v = Math.min(dist / totalLength, 0.999);

      const pt = spline.getPointAt(v);
      const tangent = spline.getTangentAt(v).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Mount on left sidewall at springline:
      // Lateral offset: -radius + 0.08m (flush against curved sidewall)
      // Height: -radius + 1.45m (eye level of workers)
      const pos = pt.clone().addScaledVector(right, -radius + 0.08);
      pos.y += -radius + 1.45;

      // Rotation facing inward toward tunnel centerline
      const baseAngle = Math.atan2(tangent.x, tangent.z);
      // Face perpendicular to tangent pointing into the tunnel (facing +right direction)
      const rotY = baseAngle - Math.PI * 0.5;

      const stationNum = baseChainageMeters + dist;
      const km = Math.floor(stationNum / 1000);
      const m = Math.floor(stationNum % 1000);
      const mStr = m.toString().padStart(3, "0");
      const stationText = `STA ${km}+${mStr}`;
      const elevationText = `EL. ${(271.45 + dist * 0.002).toFixed(2)}m`;

      const texture = createStationTexture(stationText, elevationText);

      list.push({
        stationText,
        elevationText,
        distanceAlong: dist,
        position: [pos.x, pos.y, pos.z],
        rotation: [0, rotY, 0],
        texture,
      });
    }

    return list;
  }, [spline, radius, totalLength, baseChainageMeters, intervalMeters]);

  return (
    <group name="tunnel-chainage-markers">
      {markers.map((marker) => {
        // Only visible if this station has already been excavated!
        const isExcavated = marker.distanceAlong <= advanceMeters;
        if (!isExcavated) return null;

        return (
          <group
            key={marker.stationText}
            position={marker.position}
            rotation={marker.rotation}
          >
            {/* Painted stencil rectangular plate */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.92, 0.46]} />
              <meshBasicMaterial
                map={marker.texture}
                transparent
                polygonOffset
                polygonOffsetFactor={-1.5}
                polygonOffsetUnits={-1.5}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
