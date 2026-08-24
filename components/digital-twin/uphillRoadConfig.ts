/**
 * uphillRoadConfig.ts
 *
 * Centralized Mathematical Spline & Configuration for the Main Engineered
 * Uphill Haul Road connecting Powerhouse Facility (EL. 0.5m) to TEMFACIL Compound (EL. 14.0m).
 * Shared across Road Geometry rendering, Tree clearance calculations, and Autonomous Traffic Simulation.
 */

import * as THREE from "three";
import { sampleTerrainY } from "./AnimatedSiteEntities";

export const UPHILL_ROAD_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(20.0, 0.45, 18.0),    // 0: Powerhouse Lower Portal / Quarry Hub (EL. 0.5m)
  new THREE.Vector3(38.0, 0.65, 10.0),    // 1: Switchyard Bypass Turnaround
  new THREE.Vector3(48.0, 1.80, -8.0),    // 2: Foothill Incline Entry
  new THREE.Vector3(58.0, 4.20, -28.0),   // 3: Sierra Madre Lower Slope
  new THREE.Vector3(72.0, 7.50, -48.0),   // 4: Mid-Mountain Scenic Climb
  new THREE.Vector3(84.0, 10.8, -64.0),   // 5: Upper Hillside Curve
  new THREE.Vector3(92.0, 13.0, -74.0),   // 6: Plateau Approach
  new THREE.Vector3(98.0, 14.0, -78.0),   // 7: TEMFACIL Security Gate Checkpoint & Red Guardhouse (EL. 14.0m)
  new THREE.Vector3(108.0, 14.0, -86.0),  // 8: TEMFACIL Internal Entrance Boulevard & Admin Bay
  new THREE.Vector3(120.0, 14.0, -100.0), // 9: Staff Office & Clinic Drop-Off Loop
  new THREE.Vector3(128.0, 14.0, -114.0), // 10: Material Laydown Depot & Turnaround Loop
];

export const UPHILL_ROAD_SPLINE = new THREE.CatmullRomCurve3(UPHILL_ROAD_WAYPOINTS, false, "centripetal");

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
 * Calculates smooth position, tangent, and lateral normal on the road at spline parameter u with lateral offset.
 */
export function getRoadTransform(u: number, lateralOffset: number = 0, yOffset: number = 0.08) {
  const safeU = Math.max(0.001, Math.min(0.999, u));
  const pt = UPHILL_ROAD_SPLINE.getPointAt(safeU);
  const tangent = UPHILL_ROAD_SPLINE.getTangentAt(safeU).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  const finalX = pt.x + normal.x * lateralOffset;
  const finalZ = pt.z + normal.z * lateralOffset;
  const groundY = sampleTerrainY(finalX, finalZ) + yOffset;

  return {
    point: new THREE.Vector3(finalX, groundY, finalZ),
    tangent,
    normal,
    yaw: Math.atan2(tangent.x, tangent.z),
  };
}
