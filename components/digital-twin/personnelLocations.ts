"use client";

import { sampleTerrainY } from "./AnimatedSiteEntities";

export interface PersonnelLocationTarget {
  id: string;
  target: [number, number, number]; // [X, Y, Z] world position of person
  camPos: [number, number, number]; // [X, Y, Z] world camera vantage position
  zoneName: string;
}

/**
 * High-Precision 3D World Positions & Camera Offsets for all 32 Site Workforce Personnel
 */
export function getPersonnelLocationTarget(id: string): PersonnelLocationTarget {
  switch (id) {
    // ─── 1. MANAGEMENT & EXECUTIVE WING ───
    case "PM_ROMEO_SESE":
      return {
        id,
        target: [76.0, 14.8, -110.0],
        camPos: [76.0, 16.2, -105.0],
        zoneName: "TEMFACIL Executive Project Manager Office",
      };

    case "DEPUTY_NATHANIEL_PRINCIPE":
      return {
        id,
        target: [88.2, 14.8, -87.0],
        camPos: [88.2, 16.0, -82.5],
        zoneName: "TEMFACIL Deputy PM Office (Executive Wing)",
      };

    // ─── 2. TECHNICAL & PROJECT ENGINEERING WING ───
    case "ENGR_NOEL_LAVAPIE":
      return {
        id,
        target: [91.5, 14.8, -87.2],
        camPos: [91.5, 16.0, -82.7],
        zoneName: "TEMFACIL Main Technical & Project Engineering Office",
      };

    case "CAD_ELBERT_FIGURACION":
      return {
        id,
        target: [93.8, 14.8, -86.8],
        camPos: [93.8, 16.0, -82.3],
        zoneName: "TEMFACIL AutoCAD 3D Drafting Station",
      };

    case "DOC_JAYSON_AGGABAO":
      return {
        id,
        target: [95.5, 14.8, -86.8],
        camPos: [95.5, 16.0, -82.3],
        zoneName: "TEMFACIL Document Control Command Center",
      };

    case "QS_CRISTINE_ALMAZAN":
      return {
        id,
        target: [97.2, 14.8, -86.8],
        camPos: [97.2, 16.0, -82.3],
        zoneName: "TEMFACIL Quantity Surveying & Cost Control Office",
      };

    case "PLANNING_MAY_PARALLAG":
      return {
        id,
        target: [90.0, 14.8, -90.0],
        camPos: [90.0, 16.2, -85.5],
        zoneName: "TEMFACIL Project Planning & Scheduling Office",
      };

    // ─── 3. QA/QC & MATERIALS TESTING ───
    case "ENGR_ELGINE_MANGCUPANG":
      return {
        id,
        target: [8.0, 1.25, -12.0],
        camPos: [8.0, 2.6, -7.0],
        zoneName: "Powerhouse Apron & QA/QC Materials Testing Base",
      };

    case "QC_JIMMY_AQUINO":
      return {
        id,
        target: [-10.8, 1.25, 7.5],
        camPos: [-10.8, 2.6, 2.5],
        zoneName: "Tailrace Outfall Dry Concrete Walkway & Training Wall",
      };

    case "QC_JAIRUZ_BATAC":
      return {
        id,
        target: [-6.0, 18.20, -27.5],
        camPos: [-6.0, 19.8, -22.5],
        zoneName: "Surge Tank / Headrace Tunnel Portal Concrete Bench",
      };

    case "QC_JHON_JAYME":
      return {
        id,
        target: [91.5, 14.8, -83.2],
        camPos: [91.5, 16.0, -78.7],
        zoneName: "TEMFACIL QA/QC Field Testing & Sample Inspection Base",
      };

    // ─── 4. GEODETIC & GEOTECHNICAL ENGINEERING ───
    case "SURVEYOR_JOHNNY_FARONGEY": {
      const gY = sampleTerrainY(14.0, -22.0);
      return {
        id,
        target: [14.0, gY + 0.8, -22.0],
        camPos: [14.0, gY + 2.2, -17.0],
        zoneName: "Penstock Ridge Geodetic Sighting Station",
      };
    }

    case "GEO_AMOR_FLORESCA": {
      const gY = sampleTerrainY(3.0, -18.0);
      return {
        id,
        target: [3.0, gY + 0.8, -18.0],
        camPos: [3.0, gY + 2.2, -13.0],
        zoneName: "Mountain Slope Geotechnical Rock Face Cut",
      };
    }

    // ─── 5. CIVIL STRUCTURES & UNDERGROUND TUNNELING ───
    case "CIVIL_JAIME_CANO":
      return {
        id,
        target: [-6.0, 1.25, 8.0],
        camPos: [-6.0, 2.6, 3.0],
        zoneName: "Powerhouse Draft Tube & Tailrace Civil Outfall Area",
      };

    case "CIVIL_HENRY_ESTRADA":
      return {
        id,
        target: [-12.0, 1.25, 14.0],
        camPos: [-12.0, 2.6, 9.0],
        zoneName: "Dam Spillway Staging & Tailrace Training Wall",
      };

    case "FOREMAN_ANTHONY_ROSALES":
      return {
        id,
        target: [-4.0, 4.70, -7.5],
        camPos: [-4.0, 6.0, -2.5],
        zoneName: "Penstock Lower Anchor Block (TB-04) Platform",
      };

    case "TUNNEL_RICHARD_PINASEN":
      return {
        id,
        target: [-8.2, 18.20, -27.0],
        camPos: [-8.2, 19.8, -22.0],
        zoneName: "Headrace Tunnel Excavation Portal & Adit Heading",
      };

    case "TUNNEL_RUDY_MARCOS":
      return {
        id,
        target: [-10.0, 18.20, -25.5],
        camPos: [-10.0, 19.8, -20.5],
        zoneName: "Surge Tank Mucking Platform & Tunnel Drive",
      };

    case "WORKER_BENJAMIN_FOMEGAS":
      return {
        id,
        target: [-4.2, 18.20, -28.5],
        camPos: [-4.2, 19.8, -23.5],
        zoneName: "Surge Tank Rock Anchor & Jumbo Drill Rig Station",
      };

    // ─── 6. SAFETY, HEALTH & CLINIC (ESH) ───
    case "ESH_ALFREDO_ARIZ":
      return {
        id,
        target: [88.0, 14.8, -68.0],
        camPos: [88.0, 16.2, -63.5],
        zoneName: "TEMFACIL ESH Command & Safety Operations Center",
      };

    case "NURSE_RUSSELLE_ALCANTARA":
      return {
        id,
        target: [84.0, 14.8, -96.0],
        camPos: [84.0, 16.2, -91.5],
        zoneName: "TEMFACIL Medical Clinic & Emergency First Aid Station",
      };

    case "SEC_RONALD_MALTO":
      return {
        id,
        target: [80.0, 14.8, -66.0],
        camPos: [80.0, 16.2, -61.5],
        zoneName: "TEMFACIL Security Gate 1 & Vehicle Checkpoint",
      };

    // ─── 7. ADMIN, HR & IT SYSTEMS ───
    case "HR_ROVIGAIL_ABELLAR":
      return {
        id,
        target: [82.0, 14.8, -85.0],
        camPos: [82.0, 16.2, -80.5],
        zoneName: "TEMFACIL HR & Administration Wing Entrance",
      };

    case "HR_JOSHUA_ADMIN":
      return {
        id,
        target: [93.8, 14.8, -83.2],
        camPos: [93.8, 16.0, -78.7],
        zoneName: "TEMFACIL HR Administration Office",
      };

    case "HR_RANDY_GAMBOA":
      return {
        id,
        target: [95.5, 14.8, -83.2],
        camPos: [95.5, 16.0, -78.7],
        zoneName: "TEMFACIL HR Records & Manpower Support Office",
      };

    case "IT_MARC_SALVA":
      return {
        id,
        target: [97.2, 14.8, -83.2],
        camPos: [97.2, 16.0, -78.7],
        zoneName: "TEMFACIL IT Operations & Telemetry Server Room",
      };

    // ─── 8. LOGISTICS & FLEET ───
    case "EQUIP_HOWELL_SAMSON":
      return {
        id,
        target: [102.0, 14.8, -78.0],
        camPos: [102.0, 16.5, -73.0],
        zoneName: "TEMFACIL Central Motorpool & Heavy Equipment Yard",
      };

    case "WAREHOUSE_VINCENT_ANDALLO":
      return {
        id,
        target: [88.2, 14.8, -83.2],
        camPos: [88.2, 16.0, -78.7],
        zoneName: "TEMFACIL Warehouse & Logistics Compound",
      };

    // ─── 9. MECHANICAL & ELECTRICAL WORKS ───
    case "SUPT_EUGENIO_HANOPOL":
      return {
        id,
        target: [-2.0, 1.25, 0.0],
        camPos: [-2.0, 2.6, 5.0],
        zoneName: "Powerhouse Turbine Hall Bay TU-01 (EL. 180.00m)",
      };

    case "SUPT_EDUARDO_DEFRANCIA":
      return {
        id,
        target: [18.0, 1.25, -6.0],
        camPos: [18.0, 2.6, -1.0],
        zoneName: "69kV Switchyard GSU Transformer Bay (TR-GSU-01)",
      };

    case "ELEC_JOSUE_ABELLERA":
      return {
        id,
        target: [12.0, 1.25, 2.0],
        camPos: [12.0, 2.6, 7.0],
        zoneName: "Powerhouse IPB Busduct Yard & Cable Vaults",
      };

    case "FOREMAN_WARLITO_DEFRANCIA":
      return {
        id,
        target: [4.0, 6.90, -2.0],
        camPos: [4.0, 8.2, 3.0],
        zoneName: "Powerhouse Electrical Control Room Mezzanine",
      };

    default:
      return {
        id,
        target: [90.0, 14.8, -85.0],
        camPos: [90.0, 17.0, -78.0],
        zoneName: "TEMFACIL Central Headquarters",
      };
  }
}
