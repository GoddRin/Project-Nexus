"use client";

import * as THREE from "three";

export type GTAPlayerMode =
  | "INACTIVE"
  | "ON_FOOT"
  | "ENTERING_VEHICLE"
  | "DRIVING"
  | "EXITING_VEHICLE";

export type GTACameraView = "CHASE_FAR" | "CHASE_NEAR" | "HOOD";

export interface GTARuntimeState {
  isActive: boolean;
  mode: GTAPlayerMode;
  cameraView: GTACameraView;
  playerPos: THREE.Vector3;
  playerRotY: number;
  playerIsWalking: boolean;
  playerIsRunning: boolean;
  carPos: THREE.Vector3;
  carRotY: number;
  carPitch: number;
  carRoll: number;
  carSpeed: number;
  carSteer: number;
  carDoorAngle: number;
  isDriverInside: boolean;
  headlightsOn: boolean;
  nearCar: boolean;
  collisionImpact: number;
}

/**
 * Global zero-overhead mutable singleton for 60fps GTA simulation.
 */
export const gtaRuntime: GTARuntimeState = {
  isActive: false,
  mode: "INACTIVE",
  cameraView: "CHASE_FAR",
  playerPos: new THREE.Vector3(116.0, 14.12, -88.0), // Open VIP courtyard in front of Ferrari
  playerRotY: Math.PI * 0.28,
  playerIsWalking: false,
  playerIsRunning: false,
  carPos: new THREE.Vector3(116.5, 14.12, -90.5), // VIP Bay facing South-West down the road
  carRotY: -Math.PI * 0.72,
  carPitch: 0,
  carRoll: 0,
  carSpeed: 0,
  carSteer: 0,
  carDoorAngle: 0,
  isDriverInside: false,
  headlightsOn: false,
  nearCar: false,
  collisionImpact: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧱 SOLID WORLD COLLISION OBSTACLES (TRUE EXTERIOR WALLS & STRUCTURES)
// ═══════════════════════════════════════════════════════════════════════════
export interface BoxObstacle {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CylinderObstacle {
  name: string;
  x: number;
  z: number;
  radius: number;
}

export const SITE_BOX_OBSTACLES: BoxObstacle[] = [
  // 1. TEMFACIL Staff Office Solid Main Building (Back interior wall only)
  { name: "Staff Office Main", minX: 108.5, maxX: 121.5, minZ: -112.0, maxZ: -97.0 },
  // 2. Workers Barracks Complex #1 & #2
  { name: "Barracks Complex", minX: 130.0, maxX: 147.0, minZ: -96.0, maxZ: -66.0 },
  // 3. TEMFACIL Mess Hall, Kitchen & Canteen
  { name: "Canteen & Kitchen", minX: 120.0, maxX: 134.0, minZ: -98.0, maxZ: -83.0 },
  // 4. Supply Warehouse & Material Storage Depot
  { name: "Supply Warehouse", minX: 86.0, maxX: 105.0, minZ: -120.0, maxZ: -103.0 },
  // 5. Basketball Court Fencing Perimeter
  { name: "Court North Fence", minX: 122.0, maxX: 142.0, minZ: -85.0, maxZ: -84.0 },
  { name: "Court South Fence", minX: 122.0, maxX: 142.0, minZ: -64.0, maxZ: -63.0 },
  { name: "Court East Fence", minX: 141.5, maxX: 142.5, minZ: -84.5, maxZ: -63.5 },
  // 6. Security Guardhouse Booth
  { name: "Guardhouse Booth", minX: 86.0, maxX: 94.0, minZ: -74.0, maxZ: -67.0 },
  // 7. Powerhouse Main Building (Turbine Hall & Generator Bay)
  { name: "Powerhouse Building", minX: -16.0, maxX: 16.0, minZ: -16.0, maxZ: 16.0 },
  // 8. 69kV Switchyard Transformer Yard Platform
  { name: "Switchyard Platform", minX: 20.0, maxX: 50.0, minZ: -16.0, maxZ: 16.0 },
  // 9. Surge Tank Base & Hillside Trench Retaining Walls
  { name: "Surge Tank Base", minX: -14.0, maxX: 14.0, minZ: 25.0, maxZ: 60.0 },
  // 10. Perimeter Security Boundary Retaining Walls
  { name: "Compound North Retaining Wall", minX: 80.0, maxX: 155.0, minZ: -125.0, maxZ: -123.0 },
  { name: "Compound East Retaining Wall", minX: 152.0, maxX: 155.0, minZ: -125.0, maxZ: -55.0 },
];

export const SITE_CYLINDER_OBSTACLES: CylinderObstacle[] = [
  // Basketball Court Goal Posts
  { name: "Hoop Post West", x: 123.5, z: -74.0, radius: 0.25 },
  { name: "Hoop Post East", x: 140.5, z: -74.0, radius: 0.25 },
  // High-Voltage GSU Transformer Pads
  { name: "Transformer TR-01", x: 32.0, z: -3.0, radius: 2.2 },
  { name: "Transformer TR-02", x: 38.0, z: 3.0, radius: 2.2 },
];

/**
 * Resolves 2D collision against all site obstacles.
 * Returns updated collision position, penetration depth, and normal vector.
 */
export function resolveWorldCollision(
  x: number,
  z: number,
  radius: number
): { x: number; z: number; collided: boolean; normalX: number; normalZ: number } {
  let curX = x;
  let curZ = z;
  let collided = false;
  let normalX = 0;
  let normalZ = 0;

  // 1. Check Box Obstacles
  for (const box of SITE_BOX_OBSTACLES) {
    const closestX = Math.max(box.minX, Math.min(curX, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(curZ, box.maxZ));

    const dx = curX - closestX;
    const dz = curZ - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const nx = dx / dist;
        const nz = dz / dist;
        const penetration = radius - dist;
        curX += nx * penetration;
        curZ += nz * penetration;
        normalX = nx;
        normalZ = nz;
      } else {
        const dMinX = Math.abs(curX - box.minX);
        const dMaxX = Math.abs(curX - box.maxX);
        const dMinZ = Math.abs(curZ - box.minZ);
        const dMaxZ = Math.abs(curZ - box.maxZ);
        const minVal = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);

        if (minVal === dMinX) {
          curX = box.minX - radius;
          normalX = -1;
        } else if (minVal === dMaxX) {
          curX = box.maxX + radius;
          normalX = 1;
        } else if (minVal === dMinZ) {
          curZ = box.minZ - radius;
          normalZ = -1;
        } else {
          curZ = box.maxZ + radius;
          normalZ = 1;
        }
      }
    }
  }

  // 2. Check Cylinder Obstacles
  for (const cyl of SITE_CYLINDER_OBSTACLES) {
    const dx = curX - cyl.x;
    const dz = curZ - cyl.z;
    const minDist = radius + cyl.radius;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const nx = dx / dist;
        const nz = dz / dist;
        const penetration = minDist - dist;
        curX += nx * penetration;
        curZ += nz * penetration;
        normalX = nx;
        normalZ = nz;
      }
    }
  }

  return { x: curX, z: curZ, collided, normalX, normalZ };
}
