"use client";

import * as THREE from "three";
import { sampleTerrainY } from "./AnimatedSiteEntities";

export interface PersonnelLocationTarget {
  id: string;
  target: [number, number, number]; // [X, Y, Z] world position of person
  camPos: [number, number, number]; // [X, Y, Z] world camera vantage position
  zoneName: string;
  floorY?: number; // Floor level for ground radar rings
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 GLOBAL REAL-TIME 3D WORKFORCE POSITIONS & OBJECT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
export const LIVE_PERSONNEL_WORLD_POSITIONS = new Map<string, THREE.Vector3>();
export const LIVE_PERSONNEL_OBJECTS = new Map<string, THREE.Object3D>();

export function registerLivePersonnelPosition(id: string, worldPos: THREE.Vector3, obj?: THREE.Object3D) {
  const existing = LIVE_PERSONNEL_WORLD_POSITIONS.get(id);
  if (existing) {
    existing.copy(worldPos);
  } else {
    LIVE_PERSONNEL_WORLD_POSITIONS.set(id, worldPos.clone());
  }
  if (obj) {
    LIVE_PERSONNEL_OBJECTS.set(id, obj);
  }
}

export function unregisterLivePersonnel(id: string) {
  LIVE_PERSONNEL_WORLD_POSITIONS.delete(id);
  LIVE_PERSONNEL_OBJECTS.delete(id);
}

export function getLivePersonnelWorldPosition(id: string): THREE.Vector3 | null {
  return LIVE_PERSONNEL_WORLD_POSITIONS.get(id) || null;
}

/**
 * Returns human-readable zone description for each personnel ID
 */
export function getPersonnelZoneName(id: string): string {
  switch (id) {
    case "PM_ROMEO_SESE":
      return "TEMFACIL Central Briefing Stage & Executive Wing";
    case "DEPUTY_NATHANIEL_PRINCIPE":
      return "TEMFACIL Main Office Executive Veranda";
    case "ENGR_NOEL_LAVAPIE":
      return "TEMFACIL Main Technical & Project Engineering Office (Lead Standing Desk)";
    case "CAD_ELBERT_FIGURACION":
      return "TEMFACIL AutoCAD 3D Drafting Station";
    case "DOC_JAYSON_AGGABAO":
      return "TEMFACIL Document Control Command Center";
    case "QS_JOHN_RICK_HERNAEZ":
      return "TEMFACIL Quantity Surveying & Cost Control Office (Lead QS)";
    case "QS_CRISTINE_ALMAZAN":
      return "TEMFACIL Quantity Surveying & Cost Control Office (Junior QS)";
    case "PLANNING_MAY_PARALLAG":
      return "TEMFACIL Project Planning & Scheduling Office";
    case "ENGR_ELGINE_MANGCUPANG":
      return "Main Site Access Corridor (Active QA/QC Field Inspection)";
    case "QC_JIMMY_AQUINO":
      return "Tailrace Outfall Dry Concrete Walkway & Training Wall";
    case "QC_JAIRUZ_BATAC":
      return "Surge Tank / Headrace Tunnel Portal Concrete Foundation Bench";
    case "QC_JHON_JAYME":
      return "TEMFACIL QA/QC Materials Testing Laboratory";
    case "SURVEYOR_JOHNNY_FARONGEY":
      return "Penstock Ridge Geodetic Sighting Station";
    case "GEO_AMOR_FLORESCA":
      return "TEMFACIL Geotechnical Engineering & Rock Mechanics Station";
    case "CIVIL_JAIME_CANO":
      return "Powerhouse Entrance Apron & Access Area";
    case "CIVIL_HENRY_ESTRADA":
      return "Dam Spillway Outfall Bank & 4S Safety Observation Area";
    case "FOREMAN_ANTHONY_ROSALES":
      return "Penstock Lower Anchor Block (TB-04) Platform";
    case "TUNNEL_RICHARD_PINASEN":
      return "Headrace Tunnel Excavation Portal Heading";
    case "TUNNEL_RUDY_MARCOS":
      return "Headrace Portal Laydown Staging Area";
    case "WORKER_BENJAMIN_FOMEGAS":
      return "Surge Tank / Headrace Portal Jumbo Drill Staging";
    case "ESH_ALFREDO_ARIZ":
      return "TEMFACIL ESH Command & Safety Operations Center";
    case "NURSE_RUSSELLE_ALCANTARA":
      return "TEMFACIL Medical Clinic & First Aid Post";
    case "SEC_RONALD_MALTO":
      return "TEMFACIL Perimeter Security Checkpoint Gate";
    case "HR_ROVIGAIL_ABELLAR":
      return "TEMFACIL HR & Administration Wing Entrance";
    case "HR_JOSHUA_ADMIN":
      return "TEMFACIL HR Administration Office";
    case "HR_RANDY_GAMBOA":
      return "TEMFACIL Timekeeping & Labor Relations Walkway";
    case "IT_MARC_SALVA":
      return "TEMFACIL Communications & IT Server Facility";
    case "EQUIP_HOWELL_SAMSON":
      return "TEMFACIL Heavy Equipment Yard & Dispatch Bay";
    case "WAREHOUSE_VINCENT_ANDALLO":
      return "TEMFACIL Warehouse Materials & Spare Parts Facility";
    case "DOG_BRUNSON_CHUCHU":
      return "TEMFACIL Site Compound Walkway";
    case "MECH_ANDREW_SILVA":
      return "TEMFACIL Mechanical Works Engineering Station";
    case "SUPT_EUGENIO_HANOPOL":
      return "TEMFACIL Mechanical Superintendent Desk & Powerhouse Unit 1";
    case "SUPT_EDUARDO_DEFRANCIA":
      return "Outdoor Switchyard & 69kV Substation Bay";
    case "ELEC_JOSUE_ABELLERA":
      return "Powerhouse Electrical Gallery & IPB Busduct Yard";
    case "FOREMAN_WARLITO_DEFRANCIA":
      return "Powerhouse Control Room & Switchgear Bay";
    default:
      return "Tumauini Hydroelectric Power Plant Complex";
  }
}

/**
 * Returns camera vantage coordinates [camX, camY, camZ] and character focus target [tarX, tarY, tarZ]
 * Prioritizes dynamic real-time 3D world coordinates if the person is actively mounted in the scene.
 */
export function getPersonnelLocationTarget(id: string): PersonnelLocationTarget {
  // If the character is currently mounted and active in the scene, retrieve their live world position!
  const livePos = LIVE_PERSONNEL_WORLD_POSITIONS.get(id);
  const zone = getPersonnelZoneName(id);

  if (livePos) {
    return {
      id,
      target: [livePos.x, livePos.y + 1.15, livePos.z],
      camPos: [livePos.x + 3.8, livePos.y + 2.8, livePos.z + 6.5],
      zoneName: zone,
      floorY: livePos.y,
    };
  }

  // Exact fallback coordinates matching physical 3D scene placement & parent offsets
  switch (id) {
    // ─── 1. MANAGEMENT & EXECUTIVE WING ───
    case "PM_ROMEO_SESE":
      return {
        id,
        floorY: 14.10,
        target: [126.0, 15.25, -82.5],
        camPos: [129.5, 17.9, -76.0],
        zoneName: zone,
      };

    case "DEPUTY_NATHANIEL_PRINCIPE":
      // TemfacilFacility [118, 14, -95] + [-2.5, 0.1, 0.5] -> Main Office Executive Veranda
      return {
        id,
        floorY: 14.10,
        target: [115.5, 15.25, -94.5],
        camPos: [119.2, 17.9, -88.0],
        zoneName: zone,
      };

    // ─── 2. TECHNICAL & PROJECT ENGINEERING WING (Main Office [114.0, 14.0, -107.0]) ───
    case "ENGR_NOEL_LAVAPIE":
      // Office interior standing desk: [-5.05, 0.05, 2.72] -> [108.95, 14.05, -104.28]
      return {
        id,
        floorY: 14.05,
        target: [108.95, 15.20, -104.28],
        camPos: [113.20, 15.80, -102.50],
        zoneName: zone,
      };

    case "CAD_ELBERT_FIGURACION":
      // Office interior drafting station: [-2.5, 0.05, -0.62] -> [111.50, 14.05, -107.62]
      return {
        id,
        floorY: 14.05,
        target: [111.50, 15.20, -107.62],
        camPos: [113.60, 15.80, -104.50],
        zoneName: zone,
      };

    case "DOC_JAYSON_AGGABAO":
      // Office interior doc control cubicle: [-3.8, 0.05, 7.85] -> [110.20, 14.05, -99.15]
      // Elevated diagonal angle looking directly over low partition onto Sir Jayson and his desk
      return {
        id,
        floorY: 14.05,
        target: [110.20, 14.80, -99.15],
        camPos: [112.50, 16.50, -102.50],
        zoneName: zone,
      };

    case "QS_JOHN_RICK_HERNAEZ":
      // Office interior Lead QS desk: [-5.98, 0.05, -1.8] -> [108.02, 14.05, -108.80]
      return {
        id,
        floorY: 14.05,
        target: [108.02, 15.20, -108.80],
        camPos: [113.20, 15.80, -105.50],
        zoneName: zone,
      };

    case "QS_CRISTINE_ALMAZAN":
      // Office interior Junior QS desk: [-5.2, 0.05, -3.12] -> [108.80, 14.05, -110.12]
      return {
        id,
        floorY: 14.05,
        target: [108.80, 15.20, -110.12],
        camPos: [113.40, 15.80, -106.50],
        zoneName: zone,
      };

    case "PLANNING_MAY_PARALLAG":
      // Office interior planning desk: [-4.42, 0.05, -1.8] -> [109.58, 14.05, -108.80]
      return {
        id,
        floorY: 14.05,
        target: [109.58, 15.20, -108.80],
        camPos: [113.50, 15.80, -105.00],
        zoneName: zone,
      };

    case "GEO_AMOR_FLORESCA":
      // Office interior geology desk: [-3.16, 0.05, -1.8] -> [110.84, 14.05, -108.80]
      return {
        id,
        floorY: 14.05,
        target: [110.84, 15.20, -108.80],
        camPos: [113.60, 15.80, -105.50],
        zoneName: zone,
      };

    // ─── 3. QA/QC & MATERIALS TESTING ───
    case "ENGR_ELGINE_MANGCUPANG":
      return {
        id,
        floorY: 14.00,
        target: [85.0, 15.15, -60.0],
        camPos: [88.8, 17.80, -53.5],
        zoneName: zone,
      };

    case "QC_JIMMY_AQUINO":
      return {
        id,
        floorY: 0.55,
        target: [-10.8, 1.70, 12.0],
        camPos: [-7.0, 4.30, 18.5],
        zoneName: zone,
      };

    case "QC_JAIRUZ_BATAC":
      return {
        id,
        floorY: 17.50,
        target: [-6.0, 18.65, -27.5],
        camPos: [-2.2, 21.20, -21.0],
        zoneName: zone,
      };

    case "QC_JHON_JAYME":
      // TemfacilFacility [118, 14, -95] + [23.0, 0.1, 24.5] -> Materials Testing Lab
      return {
        id,
        floorY: 14.10,
        target: [141.0, 15.25, -70.5],
        camPos: [144.8, 17.90, -64.0],
        zoneName: zone,
      };

    // ─── 4. GEODETIC & GEOTECHNICAL ENGINEERING ───
    case "SURVEYOR_JOHNNY_FARONGEY": {
      const gY = sampleTerrainY(14.0, -22.0);
      return {
        id,
        floorY: gY,
        target: [14.0, gY + 1.25, -22.0],
        camPos: [17.8, gY + 3.85, -15.5],
        zoneName: zone,
      };
    }

    case "GEO_AMOR_FLORESCA":
      // Office interior Geotechnical station: [-3.16, 0.05, -1.8] -> [110.84, 14.05, -108.80]
      return {
        id,
        floorY: 14.05,
        target: [110.84, 15.20, -108.80],
        camPos: [114.40, 17.80, -102.40],
        zoneName: zone,
      };

    // ─── 5. CIVIL STRUCTURES & UNDERGROUND TUNNELING ───
    case "CIVIL_JAIME_CANO":
      return {
        id,
        floorY: 0.55,
        target: [8.0, 1.70, -12.0],
        camPos: [11.8, 4.30, -5.5],
        zoneName: zone,
      };

    case "CIVIL_HENRY_ESTRADA":
      return {
        id,
        floorY: 0.55,
        target: [-14.0, 1.70, 22.0],
        camPos: [-10.2, 4.30, 28.5],
        zoneName: zone,
      };

    case "FOREMAN_ANTHONY_ROSALES":
      return {
        id,
        floorY: 4.00,
        target: [-4.0, 5.15, -7.5],
        camPos: [-0.2, 7.80, -1.0],
        zoneName: zone,
      };

    case "TUNNEL_RICHARD_PINASEN":
      return {
        id,
        floorY: 17.50,
        target: [-8.2, 18.65, -27.0],
        camPos: [-4.4, 21.20, -20.5],
        zoneName: zone,
      };

    case "TUNNEL_RUDY_MARCOS":
      return {
        id,
        floorY: 17.50,
        target: [-10.0, 18.65, -25.5],
        camPos: [-6.2, 21.20, -19.0],
        zoneName: zone,
      };

    case "WORKER_BENJAMIN_FOMEGAS":
      return {
        id,
        floorY: 17.50,
        target: [-4.2, 18.65, -28.5],
        camPos: [-0.4, 21.20, -22.0],
        zoneName: zone,
      };

    // ─── 6. SAFETY, HEALTH & CLINIC (ESH) ───
    case "ESH_ALFREDO_ARIZ":
      // Office interior ESH Station: [2.0, 0.05, -1.9] -> [116.00, 14.05, -108.90]
      return {
        id,
        floorY: 14.05,
        target: [116.00, 15.20, -108.90],
        camPos: [113.80, 15.80, -106.00],
        zoneName: zone,
      };

    case "NURSE_RUSSELLE_ALCANTARA":
      // Office interior Medical Clinic: [5.2, 0.05, -3.4] -> [119.20, 14.05, -110.40]
      return {
        id,
        floorY: 14.05,
        target: [119.20, 15.20, -110.40],
        camPos: [114.50, 15.80, -108.00],
        zoneName: zone,
      };

    case "SEC_RONALD_MALTO":
      return {
        id,
        floorY: 14.00,
        target: [68.0, 15.15, -56.0],
        camPos: [71.8, 17.80, -49.5],
        zoneName: zone,
      };

    // ─── 7. ADMIN, HR & IT SYSTEMS ───
    case "HR_ROVIGAIL_ABELLAR":
      // Office interior HR Station: [1.8, 0.05, 9.8] -> [115.80, 14.05, -97.20]
      return {
        id,
        floorY: 14.05,
        target: [115.80, 15.20, -97.20],
        camPos: [113.80, 15.80, -100.50],
        zoneName: zone,
      };

    case "HR_JOSHUA_ADMIN":
      // Office interior HR Admin: [3.8, 0.05, 7.7] -> [117.80, 14.05, -99.30]
      return {
        id,
        floorY: 14.05,
        target: [117.80, 15.20, -99.30],
        camPos: [114.00, 15.80, -102.50],
        zoneName: zone,
      };

    case "HR_RANDY_GAMBOA":
      // Office interior Timekeeping: [5.0, 0.05, 7.7] -> [119.00, 14.05, -99.30]
      return {
        id,
        floorY: 14.05,
        target: [119.00, 15.20, -99.30],
        camPos: [114.50, 15.80, -102.50],
        zoneName: zone,
      };

    case "IT_MARC_SALVA":
      // Office interior IT Workstation: [-2.1, 0.05, -4.48] -> [111.90, 14.05, -111.48]
      return {
        id,
        floorY: 14.05,
        target: [111.90, 15.20, -111.48],
        camPos: [114.20, 15.80, -108.00],
        zoneName: zone,
      };

    // ─── 8. LOGISTICS & FLEET ───
    case "EQUIP_HOWELL_SAMSON":
      return {
        id,
        floorY: 14.85,
        target: [86.5, 16.00, -94.8],
        camPos: [89.8, 18.60, -88.0],
        zoneName: zone,
      };

    case "WAREHOUSE_VINCENT_ANDALLO":
      return {
        id,
        floorY: 14.85,
        target: [89.5, 16.00, -97.0],
        camPos: [93.3, 18.60, -90.5],
        zoneName: zone,
      };

    case "DOG_BRUNSON_CHUCHU":
      return {
        id,
        floorY: 14.00,
        target: [90.0, 14.80, -96.0],
        camPos: [93.8, 17.40, -89.5],
        zoneName: zone,
      };

    // ─── 9. MECHANICAL & ELECTRICAL WORKS ───
    case "MECH_ANDREW_SILVA":
      // Office interior Mech Station: [-4.1, 0.05, -4.48] -> [109.90, 14.05, -111.48]
      return {
        id,
        floorY: 14.05,
        target: [109.90, 15.20, -111.48],
        camPos: [113.50, 15.80, -108.00],
        zoneName: zone,
      };

    case "SUPT_EUGENIO_HANOPOL":
      // Office interior Mech Superintendent: [-5.9, 0.05, -4.52] -> [108.10, 14.05, -111.52]
      return {
        id,
        floorY: 14.05,
        target: [108.10, 15.20, -111.52],
        camPos: [113.00, 15.80, -108.00],
        zoneName: zone,
      };

    case "SUPT_EDUARDO_DEFRANCIA":
      return {
        id,
        floorY: 0.55,
        target: [18.0, 1.70, -6.0],
        camPos: [21.8, 4.30, 0.5],
        zoneName: zone,
      };

    case "ELEC_JOSUE_ABELLERA":
      return {
        id,
        floorY: 0.55,
        target: [12.0, 1.70, 2.0],
        camPos: [15.8, 4.30, 8.5],
        zoneName: zone,
      };

    case "FOREMAN_WARLITO_DEFRANCIA":
      return {
        id,
        floorY: 6.20,
        target: [4.0, 7.35, -2.0],
        camPos: [8.2, 10.0, 5.7],
        zoneName: zone,
      };


    default:
      return {
        id,
        target: [118.0, 15.25, -95.0],
        camPos: [122.2, 18.0, -87.3],
        zoneName: zone,
      };
  }
}
