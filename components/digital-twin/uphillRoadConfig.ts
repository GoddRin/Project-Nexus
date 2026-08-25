/**
 * uphillRoadConfig.ts
 *
 * Centralized Mathematical Splines, Obstacle-Free Multi-Branch Routes,
 * and Real-Time Rigid Building Collision Avoidance Engine for TEMFACIL and Powerhouse.
 */

import * as THREE from "three";
import { sampleTerrainY } from "./AnimatedSiteEntities";

export const UPHILL_ROAD_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(20.0, 0.48, 18.0),    // 0: Powerhouse Lower Portal / Quarry Hub (EL. 0.5m)
  new THREE.Vector3(39.0, 0.65, 10.0),    // 1: Switchyard Bypass Turnaround
  new THREE.Vector3(48.0, 1.80, -8.0),    // 2: Foothill Incline Entry
  new THREE.Vector3(58.0, 4.20, -28.0),   // 3: Sierra Madre Lower Slope
  new THREE.Vector3(72.0, 7.50, -48.0),   // 4: Mid-Mountain Scenic Climb
  new THREE.Vector3(84.0, 10.8, -64.0),   // 5: Upper Hillside Curve
  new THREE.Vector3(92.0, 13.0, -74.0),   // 6: Plateau Approach
  new THREE.Vector3(98.0, 14.15, -78.0),  // 7: TEMFACIL Security Gate Checkpoint (EL. 14.15m)
  new THREE.Vector3(103.0, 14.15, -84.0), // 8: TEMFACIL Entrance Apron
  new THREE.Vector3(104.0, 14.15, -93.0), // 9: Central Paved Boulevard
  new THREE.Vector3(120.0, 14.15, -93.0), // 10: Office Drop-Off Bay
];

export const UPHILL_ROAD_SPLINE = new THREE.CatmullRomCurve3(UPHILL_ROAD_WAYPOINTS, false, "centripetal");

// ─── 1. DUMP TRUCK ROUTE: QUARRY <-> WAREHOUSE & WESTERN LAYDOWN YARD ────────
// Strictly avoids the Warehouse body (X in [83.25, 96.75], Z in [-117.25, -100.75])
// Operates on the front apron (Z = -96 to -98) and the Western Laydown yard (X <= 80).
export const DUMP_TRUCK_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(20.0, 0.48, 18.0),   // Quarry Loading Hub (u ≈ 0.00, Loading)
  new THREE.Vector3(39.0, 0.65, 10.0),   // Switchyard Junction
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Incline
  new THREE.Vector3(58.0, 4.20, -28.0),  // Sierra Madre Lower Slope
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Climb
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Hillside Curve
  new THREE.Vector3(92.0, 13.0, -74.0),  // Inbound Gate Stop Line (u ≈ 0.28)
  new THREE.Vector3(98.0, 14.15, -78.0), // TEMFACIL Gate (u ≈ 0.31)
  new THREE.Vector3(103.0, 14.15, -84.0),// Entrance Apron
  new THREE.Vector3(102.0, 14.15, -92.0),// Boulevard Approach
  new THREE.Vector3(96.0, 14.35, -96.0), // Dirt Road Incline Branch (In front of Warehouse)
  new THREE.Vector3(88.0, 14.65, -97.0), // Warehouse Front Apron (South of shutter door)
  new THREE.Vector3(78.0, 14.85, -98.0), // Western Laydown Entrance
  new THREE.Vector3(76.0, 14.85, -108.0),// Western Laydown Aggregate Stockpile Pad (u ≈ 0.48, Tipping)
  new THREE.Vector3(76.0, 14.85, -118.0),// Western Laydown Northwest Arc
  new THREE.Vector3(80.0, 14.85, -122.0),// Laydown North Turnaround Loop
  new THREE.Vector3(78.0, 14.85, -100.0),// Laydown South Return Lane
  new THREE.Vector3(88.0, 14.65, -96.0), // Warehouse Front Apron Return
  new THREE.Vector3(98.0, 14.35, -94.0), // Merging to Boulevard
  new THREE.Vector3(101.0, 14.15, -84.0),// Outbound Gate Stop Line (u ≈ 0.64)
  new THREE.Vector3(98.0, 14.15, -78.0), // TEMFACIL Gate Outbound (u ≈ 0.67)
  new THREE.Vector3(92.0, 13.0, -74.0),  // Downhill Haul Road
  new THREE.Vector3(84.0, 10.8, -64.0),  // Mountain Descent
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Scenic Descent
  new THREE.Vector3(58.0, 4.20, -28.0),  // Lower Slope Descent
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Curve
  new THREE.Vector3(39.0, 0.65, 10.0),   // Switchyard Curve
  new THREE.Vector3(22.0, 0.48, 16.0),   // Quarry Return Approach
];
export const DUMP_TRUCK_SPLINE = new THREE.CatmullRomCurve3(DUMP_TRUCK_WAYPOINTS, true, "centripetal");

// ─── 2. CREW COMMUTER VAN ROUTE: POWERHOUSE <-> MAIN ADMIN OFFICE DROP-OFF ───
// Strictly travels on the central open asphalt boulevard and eastern roundabout (Z = -93 to -82).
export const CREW_VAN_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(20.0, 0.48, 18.0),   // Powerhouse Lower Terminal (u ≈ 0.00, Boarding)
  new THREE.Vector3(39.0, 0.65, 10.0),   // Switchyard Bypass Lane
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Incline
  new THREE.Vector3(58.0, 4.20, -28.0),  // Sierra Madre Lower Slope
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mountain Climb
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Hillside Curve
  new THREE.Vector3(92.0, 13.0, -74.0),  // Inbound Gate Stop Line (u ≈ 0.28)
  new THREE.Vector3(98.0, 14.15, -78.0), // TEMFACIL Gate (u ≈ 0.31)
  new THREE.Vector3(103.0, 14.15, -84.0),// Paved Entrance Boulevard
  new THREE.Vector3(104.0, 14.15, -92.0),// Boulevard past Tool Shed
  new THREE.Vector3(105.0, 14.15, -94.0),// Main Site Office Drop-Off Curb (u ≈ 0.48, Staff Drop-Off)
  new THREE.Vector3(116.0, 14.15, -93.0),// Office Frontage Boulevard
  new THREE.Vector3(126.0, 14.15, -93.0),// Staff House Frontage Boulevard
  new THREE.Vector3(138.0, 14.15, -90.0),// Eastern Roundabout Arc East
  new THREE.Vector3(138.0, 14.15, -82.0),// Eastern Roundabout Arc West (Between Staff House & Court)
  new THREE.Vector3(126.0, 14.15, -82.0),// Boulevard Return
  new THREE.Vector3(116.0, 14.15, -82.0),// Tool Shed Frontage
  new THREE.Vector3(104.0, 14.15, -82.0),// Outbound Gate Stop Line (u ≈ 0.64)
  new THREE.Vector3(98.0, 14.15, -78.0), // TEMFACIL Gate Outbound (u ≈ 0.67)
  new THREE.Vector3(92.0, 13.0, -74.0),  // Downhill Haul Road
  new THREE.Vector3(84.0, 10.8, -64.0),  // Mountain Descent
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Descent
  new THREE.Vector3(58.0, 4.20, -28.0),  // Lower Slope Descent
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Curve
  new THREE.Vector3(39.0, 0.65, 10.0),   // Switchyard Curve
  new THREE.Vector3(22.0, 0.48, 16.0),   // Powerhouse Terminal Return
];
export const CREW_VAN_SPLINE = new THREE.CatmullRomCurve3(CREW_VAN_WAYPOINTS, true, "centripetal");

// ─── 3. QA/QC PICKUP ROUTE: QA/QC OFFICE <-> SWITCHYARD <-> POWERHOUSE ───────
export const QAQC_PICKUP_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(135.0, 14.15, -74.5), // QA/QC Design Office Bay (u ≈ 0.00, Staging)
  new THREE.Vector3(135.0, 14.15, -82.0), // Passing South of Basketball Court
  new THREE.Vector3(122.0, 14.15, -82.0), // Boulevard Approach
  new THREE.Vector3(104.0, 14.15, -82.0), // Outbound Gate Stop Line (u ≈ 0.11)
  new THREE.Vector3(98.0, 14.15, -78.0),  // TEMFACIL Gate Outbound (u ≈ 0.14)
  new THREE.Vector3(92.0, 13.0, -74.0),  // Mountain Road Descent
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Mountain Curve
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Curve
  new THREE.Vector3(58.0, 4.20, -28.0),  // Sierra Madre Lower Slope
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Curve
  new THREE.Vector3(39.0, 0.65, 10.0),   // Approaching Switchyard Bypass
  new THREE.Vector3(34.0, 0.55, 11.5),   // Switchyard Inspection Bay (Outside South Floodwall / Transformer Bay)
  new THREE.Vector3(26.0, 0.50, 12.0),   // Approaching Powerhouse Yard
  new THREE.Vector3(20.0, 0.48, 18.0),   // Powerhouse Lower Portal Civil Inspection (u ≈ 0.56)
  new THREE.Vector3(28.0, 0.50, 14.0),   // Returning uphill via parking lot lane
  new THREE.Vector3(39.0, 0.65, 10.0),   // Switchyard Bypass Curve
  new THREE.Vector3(48.0, 1.80, -8.0),   // Foothill Incline
  new THREE.Vector3(58.0, 4.20, -28.0),  // Sierra Madre Climb
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Scenic Climb
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Hillside Curve
  new THREE.Vector3(92.0, 13.0, -74.0),  // Inbound Gate Stop Line (u ≈ 0.82)
  new THREE.Vector3(98.0, 14.15, -78.0),  // TEMFACIL Gate Inbound (u ≈ 0.85)
  new THREE.Vector3(104.0, 14.15, -84.0), // Entering TEMFACIL
  new THREE.Vector3(122.0, 14.15, -82.0), // Open Boulevard
  new THREE.Vector3(135.0, 14.15, -80.0), // Turning into QA/QC Bay
];
export const QAQC_PICKUP_SPLINE = new THREE.CatmullRomCurve3(QAQC_PICKUP_WAYPOINTS, true, "centripetal");

// ─── 4. SAFETY PATROL ROUTE: COMPOUND PERIMETER & ROAD SECURITY PATROL ───────
export const SAFETY_PATROL_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(101.0, 14.15, -82.0), // Tool & Equipment Staging Shed (u ≈ 0.00, Equipment Check)
  new THREE.Vector3(103.0, 14.15, -92.0), // Boulevard Crossing
  new THREE.Vector3(94.0, 14.35, -96.0),  // Warehouse Dirt Incline
  new THREE.Vector3(78.0, 14.85, -98.0),  // Western Laydown Entrance
  new THREE.Vector3(76.0, 14.85, -118.0), // Western Laydown Perimeter
  new THREE.Vector3(80.0, 14.85, -122.0), // Laydown North Turnaround
  new THREE.Vector3(78.0, 14.85, -100.0), // Laydown Return
  new THREE.Vector3(88.0, 14.65, -96.0),  // Warehouse Front Apron
  new THREE.Vector3(104.0, 14.15, -93.0), // Passing Admin Office
  new THREE.Vector3(126.0, 14.15, -93.0), // Staff House & Kitchen Perimeter
  new THREE.Vector3(138.0, 14.15, -90.0), // East Turnaround Arc
  new THREE.Vector3(138.0, 14.15, -82.0), // South Court Perimeter
  new THREE.Vector3(116.0, 14.15, -82.0), // Tool Shed Frontage
  new THREE.Vector3(104.0, 14.15, -82.0), // Outbound Gate Stop Line (u ≈ 0.47)
  new THREE.Vector3(98.0, 14.15, -78.0),  // TEMFACIL Gate Outbound (u ≈ 0.50)
  new THREE.Vector3(92.0, 13.0, -74.0),  // Mountain Road Patrol Descent
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Mountain Curve Patrol
  new THREE.Vector3(72.0, 7.50, -48.0),  // Mid-Mountain Viewpoint Arc (u ≈ 0.68)
  new THREE.Vector3(74.0, 7.80, -50.0),  // Turning back uphill
  new THREE.Vector3(84.0, 10.8, -64.0),  // Upper Mountain Climb
  new THREE.Vector3(92.0, 13.0, -74.0),  // Plateau Approach (u ≈ 0.84)
  new THREE.Vector3(98.0, 14.15, -78.0),  // TEMFACIL Gate Inbound (u ≈ 0.87)
  new THREE.Vector3(103.0, 14.15, -82.0), // Returning to Tool Staging Hub
];
export const SAFETY_PATROL_SPLINE = new THREE.CatmullRomCurve3(SAFETY_PATROL_WAYPOINTS, true, "centripetal");

// ─── 5. DEDICATED PEDESTRIAN PAVER PATHWAYS (NO BUILDING CLIPPING) ───────────
// Pathway 1: Main Admin Office <-> Staff House <-> QA/QC Office Paver Loop
export const PED_ADMIN_CIRCUIT_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(104.0, 14.15, -94.0), // Office Frontage
  new THREE.Vector3(120.0, 14.15, -94.0), // Admin-Staffhouse Connector
  new THREE.Vector3(136.0, 14.15, -94.0), // Staffhouse East Paver
  new THREE.Vector3(136.0, 14.15, -80.0), // QA/QC Office South Walkway
  new THREE.Vector3(120.0, 14.15, -80.0), // Boulevard Return
  new THREE.Vector3(104.0, 14.15, -80.0), // Office Drop-Off
];
export const PED_ADMIN_CIRCUIT_SPLINE = new THREE.CatmullRomCurve3(PED_ADMIN_CIRCUIT_WAYPOINTS, true, "centripetal");

// Pathway 2: Natural Roadside Mountain Shoulder (Civil Mason Uphill Commute)
export const PED_SHOULDER_UPHILL_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(22.0, 0.48, 20.0),   // Powerhouse Footpath Base
  new THREE.Vector3(39.0, 0.65, 12.0),   // Switchyard Shoulder Footpath
  new THREE.Vector3(49.0, 1.80, -6.0),   // Foothill Path
  new THREE.Vector3(59.0, 4.20, -26.0),  // Lower Slope Shoulder
  new THREE.Vector3(73.0, 7.50, -46.0),  // Mid-Mountain Shoulder
  new THREE.Vector3(85.0, 10.8, -62.0),  // Upper Slope Footpath
  new THREE.Vector3(93.0, 13.0, -72.0),  // Plateau Approach Shoulder
  new THREE.Vector3(99.0, 14.15, -76.0), // TEMFACIL Pedestrian Turnstile
  new THREE.Vector3(104.0, 14.15, -80.0),// Arrival at Entrance Hub
];
export const PED_SHOULDER_UPHILL_SPLINE = new THREE.CatmullRomCurve3(PED_SHOULDER_UPHILL_WAYPOINTS, false, "centripetal");

// Pathway 3: Natural Roadside Mountain Shoulder (Surveyor Downhill Commute)
export const PED_SHOULDER_DOWNHILL_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(104.0, 14.15, -80.0),// Departure from Entrance Hub
  new THREE.Vector3(99.0, 14.15, -76.0), // TEMFACIL Pedestrian Turnstile
  new THREE.Vector3(93.0, 13.0, -72.0),  // Plateau Approach Shoulder
  new THREE.Vector3(85.0, 10.8, -62.0),  // Upper Slope Footpath
  new THREE.Vector3(73.0, 7.50, -46.0),  // Mid-Mountain Shoulder
  new THREE.Vector3(59.0, 4.20, -26.0),  // Lower Slope Shoulder
  new THREE.Vector3(49.0, 1.80, -6.0),   // Foothill Path
  new THREE.Vector3(39.0, 0.65, 12.0),   // Switchyard Shoulder Footpath
  new THREE.Vector3(22.0, 0.48, 20.0),   // Powerhouse Footpath Base
];
export const PED_SHOULDER_DOWNHILL_SPLINE = new THREE.CatmullRomCurve3(PED_SHOULDER_DOWNHILL_WAYPOINTS, false, "centripetal");

// Backwards compatibility aliases
export const PEDESTRIAN_PATH_1_SPLINE = PED_ADMIN_CIRCUIT_SPLINE;
export const PEDESTRIAN_PATH_2_SPLINE = PED_SHOULDER_UPHILL_SPLINE;
export const PEDESTRIAN_PATH_3_SPLINE = PED_SHOULDER_DOWNHILL_SPLINE;

// ─── 6. REAL-WORLD RIGID BUILDING COLLIDERS & OBSTACLE MAP ───────────────────
export interface BuildingCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const TEMFACIL_BUILDING_COLLIDERS: BuildingCollider[] = [
  {
    id: "WAREHOUSE_BODY",
    minX: 83.25,
    maxX: 96.75,
    minZ: -117.25,
    maxZ: -100.75,
  },
  {
    id: "MAIN_SITE_OFFICE",
    minX: 107.75,
    maxX: 120.25,
    minZ: -118.0,
    maxZ: -96.0,
  },
  {
    id: "STAFF_HOUSE",
    minX: 123.7,
    maxX: 136.3,
    minZ: -114.5,
    maxZ: -99.5,
  },
  {
    id: "FOREMAN_HOUSE",
    minX: 128.0,
    maxX: 144.0,
    minZ: -143.0,
    maxZ: -128.0,
  },
  {
    id: "WORKERS_BARRACKS",
    minX: 145.0,
    maxX: 165.0,
    minZ: -120.0,
    maxZ: -94.0,
  },
  {
    id: "TOOL_STAGING_SHED",
    minX: 103.7,
    maxX: 112.3,
    minZ: -87.0,
    maxZ: -83.0,
  },
  {
    id: "QAQC_DESIGN_OFFICE",
    minX: 137.9,
    maxX: 143.1,
    minZ: -78.9,
    maxZ: -70.1,
  },
  {
    id: "SECURITY_GUARDHOUSE_BOOTH",
    minX: 93.0,
    maxX: 96.5,
    minZ: -79.0,
    maxZ: -75.0,
  },
  {
    id: "SWITCHYARD_FLOODWALL",
    minX: 15.2,
    maxX: 34.8,
    minZ: -8.8,
    maxZ: 8.8,
  },
  {
    id: "POWERHOUSE_MAIN_BUILDING",
    minX: -10.5,
    maxX: 10.5,
    minZ: -7.5,
    maxZ: 7.5,
  },
];

/**
 * Real-time hard wall collision resolution engine:
 * Detects if a 3D position penetrates or violates the safety clearance of any rigid building.
 * If so, dynamically deflects and pushes the position outside the wall boundary so entities
 * smoothly slide along the exterior facade without clipping through walls.
 */
export function resolveBuildingCollisions(
  pos: THREE.Vector3,
  forward: THREE.Vector3,
  safetyRadius: number = 1.8
): { adjustedPos: THREE.Vector3; adjustedForward: THREE.Vector3; collided: boolean } {
  const adjustedPos = pos.clone();
  const adjustedForward = forward.clone();
  let collided = false;

  for (let i = 0; i < TEMFACIL_BUILDING_COLLIDERS.length; i++) {
    const b = TEMFACIL_BUILDING_COLLIDERS[i];
    const minX = b.minX - safetyRadius;
    const maxX = b.maxX + safetyRadius;
    const minZ = b.minZ - safetyRadius;
    const maxZ = b.maxZ + safetyRadius;

    // Check 2D bounding box in X-Z plane
    if (adjustedPos.x >= minX && adjustedPos.x <= maxX && adjustedPos.z >= minZ && adjustedPos.z <= maxZ) {
      collided = true;

      // Find shortest penetration depth to push out cleanly
      const distLeft = adjustedPos.x - minX;
      const distRight = maxX - adjustedPos.x;
      const distBack = adjustedPos.z - minZ;
      const distFront = maxZ - adjustedPos.z;

      const minDist = Math.min(distLeft, distRight, distBack, distFront);

      if (minDist === distLeft) {
        adjustedPos.x = minX;
        if (adjustedForward.x > 0) adjustedForward.x = 0;
      } else if (minDist === distRight) {
        adjustedPos.x = maxX;
        if (adjustedForward.x < 0) adjustedForward.x = 0;
      } else if (minDist === distBack) {
        adjustedPos.z = minZ;
        if (adjustedForward.z > 0) adjustedForward.z = 0;
      } else {
        adjustedPos.z = maxZ;
        if (adjustedForward.z < 0) adjustedForward.z = 0;
      }
      adjustedForward.normalize();
    }
  }

  return { adjustedPos, adjustedForward, collided };
}

export const ROAD_CONSTANTS = {
  ROAD_WIDTH: 7.2,          // Natural unpaved mountain haul road width (3.6m per lane)
  LANE_UPHILL_OFFSET: 1.6,  // Inbound / Uphill vehicle right lane
  LANE_DOWNHILL_OFFSET: -1.6, // Outbound / Downhill vehicle right lane
  SIDEWALK_OFFSET: 4.2,     // Pedestrian natural walking trail on mountain shoulder
  POWERHOUSE_U: 0.05,       // Spline parameter 'u' at Powerhouse Lower Portal
  SWITCHYARD_U: 0.15,       // Spline parameter 'u' at Switchyard Turnaround
  GATE_PROGRESS_U: 0.655,   // Spline parameter 'u' at TEMFACIL Main Security Checkpoint & Road Entrance Tip
  TEMFACIL_OFFICE_U: 0.85,  // Spline parameter 'u' at Staff Office Drop-Off
  TEMFACIL_DEPOT_U: 0.96,   // Spline parameter 'u' at Material Laydown Depot Turnaround
};

/**
 * Accurately determines the true ground / slab / road surface elevation at (x, z)
 * taking into account all engineered civil platforms, concrete slabs, ramps, and terrain.
 */
export function getSiteSurfaceY(x: number, z: number): number {
  const terrainY = sampleTerrainY(x, z);

  // 1. Powerhouse Operations Yard, Parking Lot & Switchyard Platform
  // Concrete yard is X in [-28, 42], Z in [-16, 18]
  if (x >= -28.0 && x <= 42.0 && z >= -16.0 && z <= 18.0) {
    // Switchyard elevated pad (X: 16 to 35, Z: -8.5 to 8.5)
    if (x >= 16.0 && x <= 35.0 && z >= -8.5 && z <= 8.5) {
      return Math.max(0.65, terrainY);
    }
    // Switchyard Bypass road / parking perimeter (X: 35 to 42, Z: -10 to 14)
    if (x >= 35.0) {
      return Math.max(0.65, terrainY);
    }
    // Powerhouse Parking Bays & Logistics Yard (X: 16 to 35, Z: 8.5 to 16)
    if (x >= 16.0 && z >= 8.5) {
      return Math.max(0.48, terrainY);
    }
    // Main Powerhouse civil operations apron (X: -28 to 16, Z: -16 to 16)
    return Math.max(0.38, terrainY);
  }

  // 2. Powerhouse Lower Portal / Quarry Hub (X: 16 to 30, Z: 12 to 24)
  if (x >= 16.0 && x <= 30.0 && z >= 12.0 && z <= 24.0) {
    return Math.max(0.48, terrainY);
  }

  // 3. TEMFACIL Elevated Facility Plateau, Slabs, Warehouses & Laydown Yards
  if (x >= 68.0 && z <= -58.0) {
    // Western Laydown Yard & Aggregate Stockpile (X: 70 to 86, Z: -126 to -96)
    if (x <= 86.0 && z <= -96.0) {
      return Math.max(14.85, terrainY);
    }
    // Warehouse Front Ramp & Apron (X: 86 to 100, Z: -102 to -93)
    if (x <= 100.0 && z <= -93.0) {
      return Math.max(14.40, terrainY);
    }
    // Standard TEMFACIL Paved Compound, Slabs & Parking
    return Math.max(14.12, terrainY);
  }

  return terrainY;
}

/**
 * Calculates smooth position, tangent, and lateral normal on any CatmullRomCurve3 at spline parameter u.
 * Ensures the entity is placed solidly on top of elevated slabs, ramps, and terrain with zero submersion.
 */
export function getSplineTransform(
  spline: THREE.CatmullRomCurve3,
  u: number,
  lateralOffset: number = 0,
  yOffset: number = 0.04
) {
  const safeU = (u % 1.0 + 1.0) % 1.0;
  const clampedU = Math.max(0.0001, Math.min(0.9999, safeU));
  const pt = spline.getPointAt(clampedU);
  const tangent = spline.getTangentAt(clampedU).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  const finalX = pt.x + normal.x * lateralOffset;
  const finalZ = pt.z + normal.z * lateralOffset;

  // The true surface is the maximum of the spline's engineered grade (pt.y),
  // the structural floor / slab height, and the terrain height.
  const surfaceY = Math.max(pt.y, getSiteSurfaceY(finalX, finalZ));
  const groundY = surfaceY + yOffset;

  return {
    point: new THREE.Vector3(finalX, groundY, finalZ),
    tangent,
    normal,
    yaw: Math.atan2(tangent.x, tangent.z),
  };
}

/**
 * Backward compatibility wrapper for UPHILL_ROAD_SPLINE.
 */
export function getRoadTransform(u: number, lateralOffset: number = 0, yOffset: number = 0.04) {
  return getSplineTransform(UPHILL_ROAD_SPLINE, u, lateralOffset, yOffset);
}
