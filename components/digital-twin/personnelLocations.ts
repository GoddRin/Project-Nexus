"use client";

import * as THREE from "three";
import { sampleTerrainY } from "./AnimatedSiteEntities";

export interface PersonnelLocationTarget {
  id: string;
  target: [number, number, number]; // [X, Y, Z] world position of person
  camPos: [number, number, number]; // [X, Y, Z] world camera vantage position
  zoneName: string;
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
      return "TEMFACIL Main Technical & Project Engineering Office";
    case "CAD_ELBERT_FIGURACION":
      return "TEMFACIL AutoCAD 3D Drafting Station";
    case "DOC_JAYSON_AGGABAO":
      return "TEMFACIL Document Control Command Center";
    case "QS_CRISTINE_ALMAZAN":
      return "TEMFACIL Quantity Surveying & Cost Control Office";
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
      return "Mountain Slope Geotechnical Rock Face Cut";
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
      return "TEMFACIL Central Motorpool & Heavy Equipment Yard";
    case "WAREHOUSE_VINCENT_ANDALLO":
      return "TEMFACIL Central Materials Warehouse & Laydown Yard";
    case "SUPT_EUGENIO_HANOPOL":
      return "Powerhouse Turbine Hall Bay TU-01 (EL. 180.00m)";
    case "SUPT_EDUARDO_DEFRANCIA":
      return "69kV Switchyard GSU Transformer Bay (TR-GSU-01)";
    case "ELEC_JOSUE_ABELLERA":
      return "Powerhouse IPB Busduct Yard & Cable Vaults";
    case "FOREMAN_WARLITO_DEFRANCIA":
      return "Powerhouse Electrical Control Room Mezzanine";
    default:
      return "TEMFACIL Central Headquarters";
  }
}

/**
 * High-Precision 3D World Positions & Camera Offsets for all 32 Site Workforce Personnel.
 * Automatically checks and prefers live dynamic 3D positions if the person is moving/patrolling.
 */
export function getPersonnelLocationTarget(id: string): PersonnelLocationTarget {
  // If the character is currently mounted and active in the scene, retrieve their live world position!
  const livePos = LIVE_PERSONNEL_WORLD_POSITIONS.get(id);
  const zone = getPersonnelZoneName(id);

  if (livePos) {
    return {
      id,
      target: [livePos.x, livePos.y + 0.8, livePos.z],
      camPos: [livePos.x + 3.0, livePos.y + 2.5, livePos.z + 5.0],
      zoneName: zone,
    };
  }

  // Exact fallback coordinates matching physical 3D scene placement & parent offsets
  switch (id) {
    // ─── 1. MANAGEMENT & EXECUTIVE WING ───
    case "PM_ROMEO_SESE":
      return {
        id,
        target: [126.0, 14.10, -82.5],
        camPos: [126.0, 16.5, -76.5],
        zoneName: zone,
      };

    case "DEPUTY_NATHANIEL_PRINCIPE":
      // TemfacilFacility [118, 14, -95] + [-4.0, 0.1, -0.8]
      return {
        id,
        target: [114.0, 14.10, -95.8],
        camPos: [114.0, 16.5, -90.0],
        zoneName: zone,
      };

    // ─── 2. TECHNICAL & PROJECT ENGINEERING WING ───
    case "ENGR_NOEL_LAVAPIE":
      // TemfacilFacility [118, 14, -95] + [22.5, 0.1, 18.5]
      return {
        id,
        target: [140.5, 14.10, -76.5],
        camPos: [140.5, 16.5, -71.5],
        zoneName: zone,
      };

    case "CAD_ELBERT_FIGURACION":
      // TemfacilFacility [118, 14, -95] + [24.2, 0.1, 21.0]
      return {
        id,
        target: [142.2, 14.10, -74.0],
        camPos: [142.2, 16.5, -69.0],
        zoneName: zone,
      };

    case "DOC_JAYSON_AGGABAO":
      // TemfacilFacility [118, 14, -95] + [21.0, 0.1, 22.0]
      return {
        id,
        target: [139.0, 14.10, -73.0],
        camPos: [139.0, 16.5, -68.0],
        zoneName: zone,
      };

    case "QS_CRISTINE_ALMAZAN":
      // TemfacilFacility [118, 14, -95] + [-6.2, 0.1, -14.0]
      return {
        id,
        target: [111.8, 14.10, -109.0],
        camPos: [111.8, 16.5, -104.0],
        zoneName: zone,
      };

    case "PLANNING_MAY_PARALLAG":
      return {
        id,
        target: [123.5, 14.10, -76.5],
        camPos: [123.5, 16.5, -71.5],
        zoneName: zone,
      };

    // ─── 3. QA/QC & MATERIALS TESTING ───
    case "ENGR_ELGINE_MANGCUPANG":
      return {
        id,
        target: [85.0, 14.10, -60.0],
        camPos: [85.0, 16.5, -55.0],
        zoneName: zone,
      };

    case "QC_JIMMY_AQUINO":
      return {
        id,
        target: [-10.8, 0.55, 12.0],
        camPos: [-10.8, 3.2, 6.0],
        zoneName: zone,
      };

    case "QC_JAIRUZ_BATAC":
      return {
        id,
        target: [-6.0, 17.50, -27.5],
        camPos: [-6.0, 20.0, -21.5],
        zoneName: zone,
      };

    case "QC_JHON_JAYME":
      // TemfacilFacility [118, 14, -95] + [23.0, 0.1, 24.5]
      return {
        id,
        target: [141.0, 14.10, -70.5],
        camPos: [141.0, 16.5, -65.5],
        zoneName: zone,
      };

    // ─── 4. GEODETIC & GEOTECHNICAL ENGINEERING ───
    case "SURVEYOR_JOHNNY_FARONGEY": {
      const gY = sampleTerrainY(14.0, -22.0);
      return {
        id,
        target: [14.0, gY + 0.8, -22.0],
        camPos: [14.0, gY + 3.0, -16.0],
        zoneName: zone,
      };
    }

    case "GEO_AMOR_FLORESCA": {
      const gY = sampleTerrainY(3.0, -18.0);
      return {
        id,
        target: [3.0, gY + 0.8, -18.0],
        camPos: [3.0, gY + 3.0, -12.0],
        zoneName: zone,
      };
    }

    // ─── 5. CIVIL STRUCTURES & UNDERGROUND TUNNELING ───
    case "CIVIL_JAIME_CANO":
      return {
        id,
        target: [8.0, 0.55, -12.0],
        camPos: [8.0, 3.2, -6.0],
        zoneName: zone,
      };

    case "CIVIL_HENRY_ESTRADA":
      return {
        id,
        target: [-14.0, 0.55, 22.0],
        camPos: [-14.0, 3.2, 16.0],
        zoneName: zone,
      };

    case "FOREMAN_ANTHONY_ROSALES":
      return {
        id,
        target: [-4.0, 4.0, -7.5],
        camPos: [-4.0, 6.5, -1.5],
        zoneName: zone,
      };

    case "TUNNEL_RICHARD_PINASEN":
      return {
        id,
        target: [-8.2, 17.50, -27.0],
        camPos: [-8.2, 20.0, -21.0],
        zoneName: zone,
      };

    case "TUNNEL_RUDY_MARCOS":
      return {
        id,
        target: [-10.0, 17.50, -25.5],
        camPos: [-10.0, 20.0, -19.5],
        zoneName: zone,
      };

    case "WORKER_BENJAMIN_FOMEGAS":
      return {
        id,
        target: [-4.2, 17.50, -28.5],
        camPos: [-4.2, 20.0, -22.5],
        zoneName: zone,
      };

    // ─── 6. SAFETY, HEALTH & CLINIC (ESH) ───
    case "ESH_ALFREDO_ARIZ":
      return {
        id,
        target: [126.0, 14.10, -82.5],
        camPos: [126.0, 16.5, -76.5],
        zoneName: zone,
      };

    case "NURSE_RUSSELLE_ALCANTARA":
      return {
        id,
        target: [123.5, 14.10, -81.0],
        camPos: [123.5, 16.5, -75.0],
        zoneName: zone,
      };

    case "SEC_RONALD_MALTO":
      return {
        id,
        target: [68.0, 14.10, -56.0],
        camPos: [68.0, 16.5, -50.0],
        zoneName: zone,
      };

    // ─── 7. ADMIN, HR & IT SYSTEMS ───
    case "HR_ROVIGAIL_ABELLAR":
      return {
        id,
        target: [126.0, 14.10, -82.5],
        camPos: [126.0, 16.5, -76.5],
        zoneName: zone,
      };

    case "HR_JOSHUA_ADMIN":
      // TemfacilFacility [118, 14, -95] + [-2.5, 0.1, -8.0]
      return {
        id,
        target: [115.5, 14.10, -103.0],
        camPos: [115.5, 16.5, -97.0],
        zoneName: zone,
      };

    case "HR_RANDY_GAMBOA":
      // TemfacilFacility [118, 14, -95] + [4.0, 0.1, 0.0]
      return {
        id,
        target: [122.0, 14.10, -95.0],
        camPos: [122.0, 16.5, -89.0],
        zoneName: zone,
      };

    case "IT_MARC_SALVA":
      // TemfacilFacility [118, 14, -95] + [-7.5, 0.1, -6.5]
      return {
        id,
        target: [110.5, 14.10, -101.5],
        camPos: [110.5, 16.5, -95.5],
        zoneName: zone,
      };

    // ─── 8. LOGISTICS & FLEET ───
    case "EQUIP_HOWELL_SAMSON":
      return {
        id,
        target: [90.0, 14.10, -96.0],
        camPos: [90.0, 16.5, -90.0],
        zoneName: zone,
      };

    case "WAREHOUSE_VINCENT_ANDALLO":
      // TemfacilFacility [118, 14, -95] + [-28.0, 0.9, -5.0]
      return {
        id,
        target: [90.0, 14.90, -100.0],
        camPos: [90.0, 17.5, -94.0],
        zoneName: zone,
      };

    // ─── 9. MECHANICAL & ELECTRICAL WORKS ───
    case "SUPT_EUGENIO_HANOPOL":
      return {
        id,
        target: [-2.0, 0.55, 0.0],
        camPos: [-2.0, 3.2, 6.0],
        zoneName: zone,
      };

    case "SUPT_EDUARDO_DEFRANCIA":
      return {
        id,
        target: [18.0, 0.55, -6.0],
        camPos: [18.0, 3.2, 0.0],
        zoneName: zone,
      };

    case "ELEC_JOSUE_ABELLERA":
      return {
        id,
        target: [12.0, 0.55, 2.0],
        camPos: [12.0, 3.2, 8.0],
        zoneName: zone,
      };

    case "FOREMAN_WARLITO_DEFRANCIA":
      return {
        id,
        target: [4.0, 6.20, -2.0],
        camPos: [4.0, 8.5, 4.0],
        zoneName: zone,
      };

    default:
      return {
        id,
        target: [118.0, 14.10, -95.0],
        camPos: [118.0, 17.0, -88.0],
        zoneName: zone,
      };
  }
}
