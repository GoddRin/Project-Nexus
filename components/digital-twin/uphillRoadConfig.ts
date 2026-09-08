/**
 * uphillRoadConfig.ts
 *
 * Centralized Mathematical Splines, Obstacle-Free Multi-Branch Routes,
 * and Real-Time Rigid Building Collision Avoidance Engine for TEMFACIL and Powerhouse.
 */

import * as THREE from "three";
import { sampleTerrainY } from "./terrainData";

export const UPHILL_ROAD_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(20.0, 0.48, 18.0),    // 0: Powerhouse Lower Portal / Quarry Hub (EL. 0.5m)
  new THREE.Vector3(39.0, 0.65, 10.0),    // 1: Switchyard Bypass Turnaround
  new THREE.Vector3(48.0, 0.61, -8.0),    // 2: Foothill Incline Entry
  new THREE.Vector3(58.0, 8.14, -28.0),   // 3: Sierra Madre Lower Slope
  new THREE.Vector3(68.0, 12.50, -38.0),  // 4: Mid-Mountain Approach
  new THREE.Vector3(72.5, 13.20, -46.5),  // 5: Entering Access Road Corridor along tree line
  new THREE.Vector3(75.0, 13.20, -52.5),  // 6: Curving along west tree line
  new THREE.Vector3(78.5, 13.20, -57.5),  // 7: Access road curve southwest
  new THREE.Vector3(84.0, 13.20, -61.0),  // 8: Sweeping wide south of guardhouse
  new THREE.Vector3(89.5, 13.25, -63.5),  // 9: Aligning with ramp mouth from the south
  new THREE.Vector3(91.8, 13.35, -65.5),  // 10: Centered on inbound lane entering ramp
  new THREE.Vector3(92.0, 13.50, -67.5),  // 11: Inbound gate stop line (Barrier Z = -67.5)
  new THREE.Vector3(95.0, 14.15, -75.0),  // 12: Ramp Crest onto TEMFACIL Pad
  new THREE.Vector3(98.0, 14.15, -79.0),  // 13: Terminus at TEMFACIL Gate Apron (Y = 14.15m)
];

export const UPHILL_ROAD_SPLINE = new THREE.CatmullRomCurve3(UPHILL_ROAD_WAYPOINTS, false, "centripetal");

// ─── 1. DUMP TRUCK ROUTE: QUARRY <-> TEMFACIL AGGREGATE STOCKPILE ────────────
// Dual-lane right-hand traffic: Follows the curved access road along tree line south of guardhouse into ramp
export const DUMP_TRUCK_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(22.0, 0.48, 22.0),   // Quarry Loading Hub (Heavy Haul Loop)
  new THREE.Vector3(40.2, 0.65, 11.5),   // Switchyard Junction (Uphill Lane)
  new THREE.Vector3(49.4, 0.86, -7.2),   // Foothill Incline (Uphill Lane)
  new THREE.Vector3(59.4, 9.44, -27.2),  // Sierra Madre Lower Slope (Uphill Lane)
  new THREE.Vector3(68.0, 12.50, -38.0), // Mid-Mountain Approach
  new THREE.Vector3(72.5, 13.20, -46.5), // Entering Access Road Corridor along tree line
  new THREE.Vector3(75.0, 13.20, -52.5), // Curving along west tree line
  new THREE.Vector3(78.5, 13.20, -57.5), // Access road curve southwest
  new THREE.Vector3(84.0, 13.20, -61.0), // Sweeping wide south of guardhouse
  new THREE.Vector3(89.5, 13.25, -63.5), // Aligning with ramp mouth from the south
  new THREE.Vector3(91.8, 13.35, -65.5), // Centered on inbound lane entering ramp
  new THREE.Vector3(92.0, 13.50, -67.5), // Inbound gate stop line (Stop at barrier Z = -67.5)
  new THREE.Vector3(93.0, 13.85, -71.0), // Mid-ramp climb
  new THREE.Vector3(95.0, 14.15, -75.0), // Ramp crest onto TEMFACIL pad
  new THREE.Vector3(98.0, 14.15, -79.0), // TEMFACIL Gate Apron Entry
  new THREE.Vector3(103.0, 14.15, -84.0),// Entrance Apron
  new THREE.Vector3(101.0, 14.15, -88.0),// Ramp Incline Approach
  new THREE.Vector3(96.0, 14.62, -91.0), // Ascending Warehouse Apron Ramp
  new THREE.Vector3(88.0, 14.85, -96.0), // Warehouse Front Apron
  new THREE.Vector3(76.0, 14.85, -98.0), // Western Laydown Driveway Entrance (Shifted west to clear crates)
  new THREE.Vector3(74.0, 14.85, -108.0),// Western Laydown Driveway Lane (Clear of crates at X = 81.6)
  new THREE.Vector3(73.0, 14.85, -114.0),// Western Laydown Aggregate Stockpile Pad (Tipping Hub)
  new THREE.Vector3(73.0, 14.85, -120.0),// Stockpile Northwest Loop
  new THREE.Vector3(77.0, 14.85, -122.0),// Laydown North Turnaround Loop
  new THREE.Vector3(76.0, 14.85, -102.0),// Laydown South Return Lane
  new THREE.Vector3(88.0, 14.85, -96.0), // Warehouse Front Apron Return
  new THREE.Vector3(96.0, 14.62, -91.0), // Descending Warehouse Apron Ramp
  new THREE.Vector3(101.0, 14.15, -88.0),// Merging to Boulevard
  new THREE.Vector3(100.5, 14.15, -84.0),// Outbound Gate Approach
  new THREE.Vector3(99.5, 14.15, -78.5), // TEMFACIL Gate Outbound Approach
  new THREE.Vector3(99.0, 14.15, -75.0), // Outbound Ramp Incline Crest
  new THREE.Vector3(98.5, 13.85, -71.0), // Outbound Mid-Ramp Descent
  new THREE.Vector3(98.0, 13.50, -67.5), // Outbound Checkpoint Passing (Under Barrier)
  new THREE.Vector3(97.0, 13.35, -65.0), // Exiting south of ramp
  new THREE.Vector3(93.5, 13.25, -62.5), // Merging onto access road curve
  new THREE.Vector3(87.5, 13.20, -59.5), // Sweeping west along access road
  new THREE.Vector3(81.5, 13.20, -56.0), // Access road downhill lane
  new THREE.Vector3(77.5, 13.20, -50.5), // Following tree line north-northwest
  new THREE.Vector3(73.5, 12.80, -43.0), // Mid-mountain descent
  new THREE.Vector3(56.6, 7.01, -28.8),  // Lower Slope Descent (Downhill Lane)
  new THREE.Vector3(46.6, 0.36, -8.8),   // Foothill Curve (Downhill Lane)
  new THREE.Vector3(37.8, 0.65, 8.5),    // Switchyard Curve (Downhill Lane)
  new THREE.Vector3(24.0, 0.48, 20.0),   // Quarry Return Approach
];
export const DUMP_TRUCK_SPLINE = new THREE.CatmullRomCurve3(DUMP_TRUCK_WAYPOINTS, true, "centripetal");

// ─── 2. CREW COMMUTER VAN ROUTE: POWERHOUSE <-> MAIN ADMIN OFFICE DROP-OFF ───
// Dual-lane right-hand traffic: Follows curved access road into ramp and compound
export const CREW_VAN_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(18.0, 0.48, 16.5),   // Main Powerhouse Passenger Boarding Canopy
  new THREE.Vector3(40.2, 0.65, 11.5),   // Switchyard Junction (Uphill Lane)
  new THREE.Vector3(49.4, 0.86, -7.2),   // Foothill Incline (Uphill Lane)
  new THREE.Vector3(59.4, 9.44, -27.2),  // Sierra Madre Lower Slope (Uphill Lane)
  new THREE.Vector3(68.0, 12.50, -38.0), // Mid-Mountain Approach
  new THREE.Vector3(72.5, 13.20, -46.5), // Entering Access Road Corridor
  new THREE.Vector3(75.0, 13.20, -52.5), // Curving along west tree line
  new THREE.Vector3(78.5, 13.20, -57.5), // Access road curve southwest
  new THREE.Vector3(84.0, 13.20, -61.0), // Sweeping wide south of guardhouse
  new THREE.Vector3(89.5, 13.25, -63.5), // Aligning with ramp mouth from south
  new THREE.Vector3(91.8, 13.35, -65.5), // Inbound lane entrance
  new THREE.Vector3(92.0, 13.50, -67.5), // Inbound Gate Stop Line (At Checkpoint Barrier)
  new THREE.Vector3(93.0, 13.85, -71.0), // Mid-Ramp Climb
  new THREE.Vector3(95.0, 14.15, -75.0), // Ramp Crest onto TEMFACIL Pad
  new THREE.Vector3(98.0, 14.15, -79.0), // TEMFACIL Gate Entry
  new THREE.Vector3(103.0, 14.15, -84.0),// Paved Entrance Boulevard
  new THREE.Vector3(104.0, 14.15, -90.0),// Boulevard past Tool Shed
  new THREE.Vector3(106.0, 14.15, -93.0),// Main Site Office Drop-Off Curb (Staff Drop-Off)
  new THREE.Vector3(116.0, 14.15, -93.0),// Office Frontage Boulevard
  new THREE.Vector3(126.0, 14.15, -93.0),// Staff House Frontage Boulevard
  new THREE.Vector3(138.0, 14.15, -90.0),// Eastern Roundabout Arc East
  new THREE.Vector3(138.0, 14.15, -85.0),// Eastern Roundabout Arc West (Between Staff House & Court)
  new THREE.Vector3(126.0, 14.15, -87.0),// Boulevard Return
  new THREE.Vector3(114.0, 14.15, -87.0),// Clear Boulevard between Office & Tool Shed
  new THREE.Vector3(105.0, 14.15, -85.5),// Apron West Approach
  new THREE.Vector3(100.5, 14.15, -84.0),// Outbound Gate Approach
  new THREE.Vector3(99.5, 14.15, -78.5), // TEMFACIL Gate Outbound
  new THREE.Vector3(99.0, 14.15, -75.0), // Outbound Ramp Incline Crest
  new THREE.Vector3(98.5, 13.85, -71.0), // Outbound Mid-Ramp Descent
  new THREE.Vector3(98.0, 13.50, -67.5), // Outbound Checkpoint Passing (Under Barrier)
  new THREE.Vector3(97.0, 13.35, -65.0), // Exiting south of ramp
  new THREE.Vector3(93.5, 13.25, -62.5), // Merging onto access road curve
  new THREE.Vector3(87.5, 13.20, -59.5), // Sweeping west along access road
  new THREE.Vector3(81.5, 13.20, -56.0), // Access road downhill lane
  new THREE.Vector3(77.5, 13.20, -50.5), // Following tree line north-northwest
  new THREE.Vector3(73.5, 12.80, -43.0), // Mid-Mountain Descent (Downhill Lane)
  new THREE.Vector3(56.6, 7.01, -28.8),  // Lower Slope Descent (Downhill Lane)
  new THREE.Vector3(46.6, 0.36, -8.8),   // Foothill Curve (Downhill Lane)
  new THREE.Vector3(37.8, 0.65, 8.5),    // Switchyard Curve (Downhill Lane)
  new THREE.Vector3(20.0, 0.48, 16.0),   // Powerhouse Terminal Return Approach
];
export const CREW_VAN_SPLINE = new THREE.CatmullRomCurve3(CREW_VAN_WAYPOINTS, true, "centripetal");

// ─── 3. QA/QC PICKUP ROUTE: QA/QC OFFICE <-> SWITCHYARD <-> POWERHOUSE ───────
export const QAQC_PICKUP_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(135.0, 14.15, -74.5), // QA/QC Design Office Bay (Staging Hub)
  new THREE.Vector3(135.0, 14.15, -83.0), // Passing West of QA/QC Office
  new THREE.Vector3(124.0, 14.15, -87.0), // Boulevard Approach
  new THREE.Vector3(114.0, 14.15, -87.0), // Clear Boulevard
  new THREE.Vector3(105.0, 14.15, -85.5), // Open Apron
  new THREE.Vector3(100.5, 14.15, -84.0), // Outbound Gate Approach
  new THREE.Vector3(99.5, 14.15, -78.5),  // TEMFACIL Gate Outbound
  new THREE.Vector3(99.0, 14.15, -75.0),  // Outbound Ramp Incline Crest
  new THREE.Vector3(98.5, 13.85, -71.0),  // Outbound Mid-Ramp Descent
  new THREE.Vector3(98.0, 13.50, -67.5),  // Outbound Checkpoint Passing (Under Barrier)
  new THREE.Vector3(97.0, 13.35, -65.0),  // Exiting south of ramp
  new THREE.Vector3(93.5, 13.25, -62.5),  // Merging onto access road curve
  new THREE.Vector3(87.5, 13.20, -59.5),  // Sweeping west along access road
  new THREE.Vector3(81.5, 13.20, -56.0),  // Access road downhill lane
  new THREE.Vector3(77.5, 13.20, -50.5),  // Following tree line north-northwest
  new THREE.Vector3(73.5, 12.80, -43.0),  // Mid-Mountain Curve (Downhill Lane)
  new THREE.Vector3(56.6, 7.01, -28.8),   // Sierra Madre Lower Slope (Downhill Lane)
  new THREE.Vector3(46.6, 0.36, -8.8),    // Foothill Curve (Downhill Lane)
  new THREE.Vector3(37.8, 0.65, 8.5),     // Approaching Switchyard Parking Lane
  new THREE.Vector3(32.0, 0.48, 12.5),    // Switchyard Parking Stall #2 (Electrical Audit Stop)
  new THREE.Vector3(26.0, 0.48, 14.0),    // Exiting Stall into Civil Access Lane
  new THREE.Vector3(10.0, 0.48, 22.0),    // Lower Tailrace Portal Overlook (Civil Survey Stop)
  new THREE.Vector3(18.0, 0.48, 20.0),    // Tailrace Return Lane (Completely clear of passenger canopy)
  new THREE.Vector3(28.0, 0.48, 14.0),    // Returning uphill via east parking lot lane
  new THREE.Vector3(40.2, 0.65, 11.5),    // Switchyard Bypass Curve (Uphill Lane)
  new THREE.Vector3(49.4, 0.86, -7.2),    // Foothill Incline (Uphill Lane)
  new THREE.Vector3(59.4, 9.44, -27.2),   // Sierra Madre Climb (Uphill Lane)
  new THREE.Vector3(68.0, 12.50, -38.0),  // Mid-Mountain Approach
  new THREE.Vector3(72.5, 13.20, -46.5),  // Access Road Corridor
  new THREE.Vector3(75.0, 13.20, -52.5),  // Curving along west tree line
  new THREE.Vector3(78.5, 13.20, -57.5),  // Access road curve southwest
  new THREE.Vector3(84.0, 13.20, -61.0),  // Sweeping wide south of guardhouse
  new THREE.Vector3(89.5, 13.25, -63.5),  // Aligning with ramp mouth from south
  new THREE.Vector3(91.8, 13.35, -65.5),  // Inbound lane entrance
  new THREE.Vector3(92.0, 13.50, -67.5),  // Inbound Gate Stop Line (At Checkpoint Barrier)
  new THREE.Vector3(93.0, 13.85, -71.0),  // Mid-Ramp Climb
  new THREE.Vector3(95.0, 14.15, -75.0),  // Ramp Crest onto TEMFACIL Pad
  new THREE.Vector3(98.0, 14.15, -79.0),  // TEMFACIL Gate Inbound
  new THREE.Vector3(103.0, 14.15, -84.0), // Entering TEMFACIL
  new THREE.Vector3(114.0, 14.15, -87.0), // Open Boulevard
  new THREE.Vector3(124.0, 14.15, -87.0), // Past Staff House
  new THREE.Vector3(135.0, 14.15, -83.0), // Turning into QA/QC Bay
  new THREE.Vector3(135.0, 14.15, -74.5), // QA/QC Bay Return
];
export const QAQC_PICKUP_SPLINE = new THREE.CatmullRomCurve3(QAQC_PICKUP_WAYPOINTS, true, "centripetal");

// ─── 4. SAFETY PATROL ROUTE: COMPOUND PERIMETER & ROAD SECURITY PATROL ───────
export const SAFETY_PATROL_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(105.0, 14.15, -86.5), // Tool & Equipment Staging Shed (Audit Hub)
  new THREE.Vector3(104.0, 14.15, -92.0), // Boulevard Crossing
  new THREE.Vector3(94.0, 14.85, -94.0),  // Warehouse Front Apron Inspection Point (Stays on wide apron)
  new THREE.Vector3(96.0, 14.85, -92.0),  // Wide Apron Turnaround (DOES NOT enter laydown aggregate track!)
  new THREE.Vector3(104.0, 14.15, -93.0), // Passing Admin Office
  new THREE.Vector3(126.0, 14.15, -93.0), // Staff House & Kitchen Perimeter
  new THREE.Vector3(138.0, 14.15, -90.0), // East Turnaround Arc
  new THREE.Vector3(138.0, 14.15, -85.0), // South Court Perimeter
  new THREE.Vector3(124.0, 14.15, -87.0), // Boulevard Return
  new THREE.Vector3(114.0, 14.15, -87.0), // Tool Shed North Clearance
  new THREE.Vector3(105.0, 14.15, -85.5), // Apron West Approach
  new THREE.Vector3(100.5, 14.15, -84.0), // Outbound Gate Approach
  new THREE.Vector3(99.5, 14.15, -78.5),  // TEMFACIL Gate Outbound
  new THREE.Vector3(99.0, 14.15, -75.0),  // Outbound Ramp Incline Crest
  new THREE.Vector3(98.5, 13.85, -71.0),  // Outbound Mid-Ramp Descent
  new THREE.Vector3(98.0, 13.50, -67.5),  // Outbound Checkpoint Passing (Under Barrier)
  new THREE.Vector3(97.0, 13.35, -65.0),  // Exiting south of ramp
  new THREE.Vector3(93.5, 13.25, -62.5),  // Merging onto access road curve
  new THREE.Vector3(87.5, 13.20, -59.5),  // Sweeping west along access road
  new THREE.Vector3(81.5, 13.20, -56.0),  // Access road downhill lane
  new THREE.Vector3(77.5, 13.20, -50.5),  // Following tree line north-northwest
  new THREE.Vector3(73.5, 12.80, -43.0),  // Mid-Mountain Viewpoint Arc (Perimeter Check Stop)
  new THREE.Vector3(72.5, 13.20, -46.5),  // Crossing over to Uphill Lane
  new THREE.Vector3(75.0, 13.20, -52.5),  // Curving along west tree line
  new THREE.Vector3(78.5, 13.20, -57.5),  // Access road curve southwest
  new THREE.Vector3(84.0, 13.20, -61.0),  // Sweeping wide south of guardhouse
  new THREE.Vector3(89.5, 13.25, -63.5),  // Aligning with ramp mouth from south
  new THREE.Vector3(91.8, 13.35, -65.5),  // Inbound lane entrance
  new THREE.Vector3(92.0, 13.50, -67.5),  // Inbound Gate Stop Line (At Checkpoint Barrier)
  new THREE.Vector3(93.0, 13.85, -71.0),  // Mid-Ramp Climb
  new THREE.Vector3(95.0, 14.15, -75.0),  // Ramp Crest onto TEMFACIL Pad
  new THREE.Vector3(98.0, 14.15, -79.0),  // TEMFACIL Gate Inbound
  new THREE.Vector3(101.0, 14.15, -82.0), // Plateau Approach
  new THREE.Vector3(105.0, 14.15, -86.5), // Returning to Tool Staging Hub
];
export const SAFETY_PATROL_SPLINE = new THREE.CatmullRomCurve3(SAFETY_PATROL_WAYPOINTS, true, "centripetal");

// ─── 5. DEDICATED PEDESTRIAN PAVER PATHWAYS (NO BUILDING CLIPPING) ───────────
// Pathway 1: Main Admin Office <-> Staff House <-> QA/QC Office Paver Loop
export const PED_ADMIN_CIRCUIT_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(104.0, 14.15, -91.0), // Main Site Office Plaza
  new THREE.Vector3(114.0, 14.15, -91.0), // Main Office Front Walkway
  new THREE.Vector3(122.0, 14.15, -91.0), // Central Courtyard Intersection
  new THREE.Vector3(122.0, 14.15, -82.0), // Boulevard Walkway (West of Court, East of Tool Shed)
  new THREE.Vector3(124.0, 14.15, -74.0), // North Court Apron (South of Canteen)
  new THREE.Vector3(135.0, 14.15, -74.0), // QA/QC Office Front Inspection Bay
  new THREE.Vector3(135.0, 14.15, -77.0), // QA/QC Office Veranda Walkway
  new THREE.Vector3(124.0, 14.15, -77.0), // Return across Promenade
  new THREE.Vector3(120.0, 14.15, -85.0), // Boulevard Walkway heading South
  new THREE.Vector3(116.0, 14.15, -89.5), // Tool Shed East Clearance
  new THREE.Vector3(106.0, 14.15, -90.5), // Admin Apron Return
];
export const PED_ADMIN_CIRCUIT_SPLINE = new THREE.CatmullRomCurve3(PED_ADMIN_CIRCUIT_WAYPOINTS, true, "centripetal");

// Pathway 2 & 3: Closed continuous mountain road pedestrian shoulder circuit
export const PED_MOUNTAIN_SHOULDER_CIRCUIT_WAYPOINTS: THREE.Vector3[] = [
  // Climbing Uphill (East Shoulder)
  new THREE.Vector3(22.0, 0.48, 20.0),   // Powerhouse Footpath Base
  new THREE.Vector3(39.0, 0.65, 12.5),   // Switchyard Shoulder Footpath
  new THREE.Vector3(49.0, 0.76, -5.5),   // Foothill Path
  new THREE.Vector3(59.5, 9.43, -25.5),  // Lower Slope Shoulder
  new THREE.Vector3(73.5, 12.97, -45.5), // Mid-Mountain Shoulder
  new THREE.Vector3(85.5, 13.43, -61.5), // Upper Slope Footpath
  new THREE.Vector3(93.5, 13.04, -71.5), // Plateau Approach Shoulder
  new THREE.Vector3(99.5, 14.15, -73.5), // TEMFACIL Pedestrian Turnstile (North of tool shed)
  new THREE.Vector3(104.0, 14.15, -73.5),// Entrance Hub Paver Walkway (North of tool shed bundles)
  // Crossing & Descending Downhill (West Shoulder)
  new THREE.Vector3(100.0, 14.15, -73.5),// Turnstile Return Walkway
  new THREE.Vector3(95.0, 14.15, -73.5), // West Shoulder Gate Pass (Clear of guardhouse)
  new THREE.Vector3(89.5, 13.35, -73.8), // Upper Descent Shoulder
  new THREE.Vector3(82.0, 13.18, -66.5), // Mountain Curve West Shoulder
  new THREE.Vector3(70.0, 14.60, -50.0), // Mid-Mountain West Shoulder
  new THREE.Vector3(56.0, 6.82, -30.0),  // Lower Slope West Shoulder
  new THREE.Vector3(46.0, 0.25, -10.0),  // Foothill West Path
  new THREE.Vector3(37.0, 0.65, 10.0),   // Switchyard West Shoulder
  new THREE.Vector3(21.0, 0.48, 16.0),   // Powerhouse Crossing
];
export const PED_MOUNTAIN_SHOULDER_CIRCUIT_SPLINE = new THREE.CatmullRomCurve3(PED_MOUNTAIN_SHOULDER_CIRCUIT_WAYPOINTS, true, "centripetal");

// Backwards compatibility aliases
export const PEDESTRIAN_PATH_1_SPLINE = PED_ADMIN_CIRCUIT_SPLINE;
export const PEDESTRIAN_PATH_2_SPLINE = PED_MOUNTAIN_SHOULDER_CIRCUIT_SPLINE;
export const PEDESTRIAN_PATH_3_SPLINE = PED_MOUNTAIN_SHOULDER_CIRCUIT_SPLINE;

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
    id: "WAREHOUSE_STORAGE_RACKS",
    minX: 81.2,
    maxX: 83.5,
    minZ: -116.0,
    maxZ: -101.0,
  },
  {
    id: "MAIN_SITE_OFFICE",
    minX: 107.75,
    maxX: 120.25,
    minZ: -118.0,
    maxZ: -95.5,
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
    minX: 101.5,
    maxX: 114.5,
    minZ: -87.5,
    maxZ: -77.5,
  },
  {
    id: "QAQC_DESIGN_OFFICE",
    minX: 137.9,
    maxX: 143.1,
    minZ: -78.9,
    maxZ: -70.1,
  },
  {
    id: "CANTEEN_BUILDING",
    minX: 144.0,
    maxX: 156.0,
    minZ: -88.0,
    maxZ: -74.0,
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

      // Deflection clamp prevents unnatural multi-meter teleportation jumps if an entity touches a corner
      const maxDeflect = 0.8;
      if (minDist === distLeft) {
        adjustedPos.x = Math.max(pos.x - maxDeflect, minX);
        if (adjustedForward.x > 0) adjustedForward.x = 0;
      } else if (minDist === distRight) {
        adjustedPos.x = Math.min(pos.x + maxDeflect, maxX);
        if (adjustedForward.x < 0) adjustedForward.x = 0;
      } else if (minDist === distBack) {
        adjustedPos.z = Math.max(pos.z - maxDeflect, minZ);
        if (adjustedForward.z > 0) adjustedForward.z = 0;
      } else {
        adjustedPos.z = Math.min(pos.z + maxDeflect, maxZ);
        if (adjustedForward.z < 0) adjustedForward.z = 0;
      }
      if (adjustedForward.lengthSq() > 0.0001) {
        adjustedForward.normalize();
      } else {
        adjustedForward.copy(forward);
      }
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
  GATE_PROGRESS_U: 1.00,    // Spline parameter 'u' at TEMFACIL Main Security Checkpoint outside gate ([95.5, 14.15, -75.5])
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

  // 3. Engineered Entrance Ramp connecting mountain haul road (EL. 13.20m) to TEMFACIL compound slab (EL. 14.15m)
  // Approach corridor spans X in [83.0, 108.0], Z in [-76.0, -64.0]
  if (x >= 83.0 && x <= 108.0 && z >= -76.0 && z <= -64.0) {
    // Smooth Hermite cubic interpolation from Z = -64.0 (Y = 13.20m) up to Z = -75.0 (Y = 14.15m)
    const t = Math.max(0, Math.min(1, (-64.0 - z) / 11.0));
    const smoothT = t * t * (3.0 - 2.0 * t);
    const rampElevation = 13.20 * (1.0 - smoothT) + 14.15 * smoothT;
    return Math.max(rampElevation, terrainY);
  }

  // 4. TEMFACIL Elevated Facility Plateau, Slabs, Warehouses & Laydown Yards
  if (x >= 68.0 && z <= -70.0) {
    // Western Laydown Yard, Warehouse Footprint & Concrete Staging Apron (X: 74 to 100, Z: -126 to -92.5)
    if (x >= 74.0 && x <= 100.0 && z <= -92.5) {
      return Math.max(14.85, terrainY);
    }
    // Warehouse Front Incline Ramp down to Road Grade (X: 76 to 100, Z: -92.5 to -88.0)
    if (x >= 76.0 && x <= 100.0 && z > -92.5 && z <= -88.0) {
      const progress = (z - (-92.5)) / 4.5; // 0.0 at Z = -92.5, 1.0 at Z = -88.0
      const rampElevation = 14.85 * (1 - progress) + 14.15 * progress;
      return Math.max(rampElevation, terrainY);
    }
    // Western Perimeter Natural Cut Slope (X: 68 to 74, Z <= -96)
    if (x < 74.0 && z <= -96.0) {
      return Math.max(14.85, terrainY);
    }
    // Standard TEMFACIL Paved Compound, Slabs & Parking
    return Math.max(14.15, terrainY);
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
  const safeU = spline.closed ? ((u % 1.0 + 1.0) % 1.0) : Math.max(0.0001, Math.min(0.9999, u));
  const clampedU = Math.max(0.0001, Math.min(0.9999, safeU));
  const pt = spline.getPointAt(clampedU);
  const tangent = spline.getTangentAt(clampedU).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  const finalX = pt.x + normal.x * lateralOffset;
  const finalZ = pt.z + normal.z * lateralOffset;

  // The true surface is the exact ground surface (terrain or concrete slab) at (finalX, finalZ).
  // Math.max with pt.y ensures entities never sink underground or below engineered structures.
  const siteSurfaceY = getSiteSurfaceY(finalX, finalZ);
  const surfaceY = Math.max(pt.y, siteSurfaceY);
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
