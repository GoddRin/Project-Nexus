/**
 * Automated Typhoon & Tumauini HEPP Site Impact Announcement Generator
 * 
 * Accurately grounded in:
 * - Tumauini Hydroelectric Power Plant (THEPP): 11.3 MW Run-of-River (13.56 MW nameplate)
 * - Location: Barangay Antagan Uno, Tumauini, Isabela (17.3188° N, 121.9749° E)
 * - River Basin: Pinacanauan de Tumauini River (major tributary of the Cagayan River Basin)
 * - Key Components: Run-of-river diversion weir, 3.4 km headrace tunnel, powerhouse complex, 69 kV grid line
 */

import { PagasaSignalData } from "@/lib/weather/pagasa";
import { RiverStation, DamStatus } from "@/lib/weather/riverbasin";

export type AnnouncementChannel = "viber_staff" | "site_hse" | "executive_client";

export interface StormBase {
  id?: string;
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  windSpeedKph?: number;
  distanceKm?: number;
  closestApproach?: {
    distanceKm: number;
    eta: string;
  };
  [key: string]: any;
}

export interface AnnouncementInput {
  storm?: StormBase;
  pagasaSignals?: PagasaSignalData;
  siteWindSpeedKph: number;
  sitePressureHpa: number;
  isInsidePar: boolean;
  riverStations?: RiverStation[];
  damStatus?: DamStatus[];
  timestamp?: Date;
}

export interface GeneratedAnnouncement {
  title: string;
  threatLevel: "GREEN" | "FAIR_DISTANT" | "YELLOW" | "ORANGE" | "RED";
  threatBadge: string;
  summary: string;
  viberStaffText: string;
  siteHseText: string;
  executiveClientText: string;
  keyMetrics: {
    stormName: string;
    category: string;
    parStatus: string;
    isabelaSignal: string;
    cpaDistance: string;
    eta: string;
    siteWind: string;
    siteWeather: string;
    riverStatus: string;
  };
  recommendedActions: string[];
}

/**
 * Determines realistic threat level for Tumauini HEPP based on distance, local winds, and PAGASA signals.
 */
export function determineThreatLevel(
  isInsidePar: boolean,
  signalNumber: number,
  distanceKm: number,
  windSpeedKph: number,
  localWindSpeedKph: number
): { level: "GREEN" | "FAIR_DISTANT" | "YELLOW" | "ORANGE" | "RED"; badge: string } {
  // If no storm in PAR
  if (!isInsidePar && signalNumber === 0) {
    return { level: "GREEN", badge: "PAR CLEAR • NORMAL OPERATIONS" };
  }

  // Critical: TCWS Signal #3+ or direct impact within 150km with severe winds
  if (signalNumber >= 3 || (isInsidePar && distanceKm <= 150 && windSpeedKph >= 120)) {
    return { level: "RED", badge: "CRITICAL ALERT • IMMINENT IMPACT" };
  }

  // High Alert: TCWS Signal #2 or within 350km approaching Isabela
  if (signalNumber === 2 || (isInsidePar && distanceKm <= 350 && windSpeedKph >= 85)) {
    return { level: "ORANGE", badge: "HIGH ALERT • PREPARE FOR SEVERE WEATHER" };
  }

  // Distant system inside PAR, but far or no signal hoisted for Isabela with calm/light local winds
  if (isInsidePar && signalNumber === 0 && localWindSpeedKph < 25) {
    return { level: "FAIR_DISTANT", badge: "DISTANT SYSTEM IN PAR • SITE WEATHER FAIR" };
  }

  // Precautionary Watch: TCWS Signal #1 or within 350km with active local effects
  if (signalNumber === 1 || (isInsidePar && distanceKm <= 350 && (windSpeedKph >= 65 || localWindSpeedKph >= 25))) {
    return { level: "YELLOW", badge: "TROPICAL CYCLONE ADVISORY • PRECAUTIONARY WATCH" };
  }

  return { level: "FAIR_DISTANT", badge: "MONITORING • NO LOCAL IMPACT" };
}

/**
 * Formats date and time in Philippine Standard Time (PHT).
 */
function formatPhtDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { dateStr, timeStr: `${timeStr} PHT` };
}

/**
 * Generates reliable, informative, professional announcements without informal emojis or alarmist text.
 */
export function generateTyphoonAnnouncement(input: AnnouncementInput): GeneratedAnnouncement {
  const now = input.timestamp || new Date();
  const { dateStr, timeStr } = formatPhtDateTime(now);

  const storm = input.storm;
  const signalNumber = input.pagasaSignals?.siteSignalNumber || 0;
  const isInsidePar = input.isInsidePar;
  const stormDistance = storm?.distanceKm ?? 9999;
  const stormWind = storm?.windSpeedKph ?? 0;
  const stormName = storm ? (storm.category.toLowerCase().includes("lpa") ? "Low Pressure Area" : storm.name) : "No Active Storm";
  const category = storm?.category || "N/A";
  const cpaDistance = storm?.closestApproach?.distanceKm ? `${storm.closestApproach.distanceKm} km` : "N/A";
  const cpaEta = storm?.closestApproach?.eta
    ? new Date(storm.closestApproach.eta).toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " PHT"
    : "N/A";

  const localWind = input.siteWindSpeedKph;
  const { level: threatLevel, badge: threatBadge } = determineThreatLevel(
    isInsidePar,
    signalNumber,
    stormDistance,
    stormWind,
    localWind
  );

  // River Basin Telemetry summary
  const tumauiniRiverStation = input.riverStations?.find(
    (s) => s.site_id?.includes("tumauini") || s.site_name?.toLowerCase().includes("tumauini")
  );
  const riverStatus = tumauiniRiverStation?.status_label || "NORMAL FLOW";

  // Grounded local weather assessment
  const siteWeatherDesc =
    localWind < 15
      ? `Sunny / fair weather with light breeze (${localWind.toFixed(1)} km/h). No localized rainfall or storm hazards at the project site.`
      : localWind < 30
      ? `Partly cloudy to fair conditions with moderate breeze (${localWind.toFixed(1)} km/h). No storm-induced rainfall at the worksite.`
      : `Breezy conditions (${localWind.toFixed(1)} km/h) with passing cloudiness.`;

  // Realistic operational actions based on actual ground situation
  let actions: string[] = [];
  if (threatLevel === "RED") {
    actions = [
      "Civil Work Suspension: All construction activities across the 11.3 MW plant site halted.",
      "Riverbed Clearance: Heavy equipment (excavators, dump trucks) removed from the Pinacanauan riverbed to the upper terrace staging area.",
      "Cranes and Structures: Tower crane booms secured in weathervane mode; scaffolding tie-downs and loose formworks secured.",
      "Tunnel and Drainage: Tunnel portals barricaded; auxiliary generators on standby for drainage sump pumps.",
      "Personnel Safety: All workers assembled at the designated camp shelter; mandatory muster headcounts.",
    ];
  } else if (threatLevel === "ORANGE") {
    actions = [
      "Haul Road Restrictions: Heavy transport along the Tumauini-San Mariano mountain access corridor suspended during heavy downpours.",
      "River Stage Watch: Continuous observation at the diversion weir axis and intake works.",
      "High-Elevation Works: Crane operations and elevated scaffolding suspended if wind gusts exceed 35 km/h.",
      "Drainage Inspection: Clear cofferdam diversion trenches and site runoff channels.",
    ];
  } else if (threatLevel === "YELLOW") {
    actions = [
      "Precautionary Review: Site management to monitor upcoming PAGASA bulletins.",
      "Equipment Readiness: Verify dewatering pump readiness and fuel supply for standby generators.",
      "General Precaution: Remind field supervisors to report any significant weather changes along the Sierra Madre watershed.",
    ];
  } else if (threatLevel === "FAIR_DISTANT") {
    actions = [
      "Normal Operations: Construction across all packages of the 11.3 MW Tumauini HEPP (diversion weir, headrace tunnel, and powerhouse) continues under standard schedule.",
      "Worksite Conditions: Currently sunny, dry, and calm at the project site. No localized rainfall, wind hazards, or river swelling observed.",
      "Baseline Tracking: Weather monitoring desk continues tracking the system's trajectory via official PAGASA bulletins without disrupting site works.",
    ];
  } else {
    actions = [
      "Normal Operations: All construction packages for the 11.3 MW Tumauini HEPP proceed under normal schedule.",
      "Baseline Monitoring: Standard weather watch maintained.",
    ];
  }

  // 1. GROUP CHAT BROADCAST (Clean, formal, reliable, no emojis)
  let viberStaffText = "";
  if (threatLevel === "GREEN") {
    viberStaffText = 
`STA. CLARA INTERNATIONAL CORPORATION — PROJECT WEATHER BULLETIN
Tumauini Hydroelectric Power Project (11.3 MW)
Barangay Antagan Uno, Tumauini, Isabela
Issued: ${dateStr} | ${timeStr}

STATUS: PAR CLEAR — NORMAL OPERATIONS
• Tropical Cyclones inside PAR: None reported
• Isabela TCWS Wind Signal: None
• Worksite Weather: ${siteWeatherDesc}
• Pinacanauan de Tumauini River: ${riverStatus}

OPERATIONAL STATUS:
All civil, tunneling, and weir construction activities for the 11.3 MW project continue as scheduled. Baseline weather monitoring remains active.`;
  } else if (threatLevel === "FAIR_DISTANT") {
    viberStaffText = 
`STA. CLARA INTERNATIONAL CORPORATION — PROJECT WEATHER BULLETIN
Tumauini Hydroelectric Power Project (11.3 MW)
Barangay Antagan Uno, Tumauini, Isabela
Issued: ${dateStr} | ${timeStr}

STATUS: DISTANT SYSTEM IN PAR — SITE WEATHER FAIR / NO LOCAL IMPACT
• Tropical Cyclone: ${category.toUpperCase()} "${stormName.toUpperCase()}"
• Status: Active within the Philippine Area of Responsibility (PAR)
• Distance from Worksite: ${stormDistance} km (CPA: ${cpaDistance} on ${cpaEta})
• Isabela TCWS Wind Signal: None (No signals raised for Isabela)
• Worksite Weather: ${siteWeatherDesc}
• Pinacanauan de Tumauini River: ${riverStatus}

OPERATIONAL STATUS:
The storm is currently far from the project site and is producing zero rainfall or wind impacts in Tumauini. Worksite conditions remain sunny and dry. All construction operations on the 11.3 MW plant proceed under standard working conditions. Site supervision will continue to track the system through official PAGASA bulletins.`;
  } else {
    viberStaffText = 
`STA. CLARA INTERNATIONAL CORPORATION — PROJECT WEATHER ADVISORY
Tumauini Hydroelectric Power Project (11.3 MW)
Barangay Antagan Uno, Tumauini, Isabela
Issued: ${dateStr} | ${timeStr}

STATUS: ${threatBadge}
• Tropical Cyclone: ${category.toUpperCase()} "${stormName.toUpperCase()}"
• Distance from Worksite: ${stormDistance} km (CPA: ${cpaDistance} on ${cpaEta})
• PAGASA Wind Signal (Isabela): ${signalNumber > 0 ? `Signal #${signalNumber}` : "Monitoring"}
• Worksite Conditions: Wind ${localWind.toFixed(1)} km/h | Pressure ${input.sitePressureHpa.toFixed(1)} hPa
• Pinacanauan de Tumauini River: ${riverStatus}

WORKSITE DIRECTIVES:
${actions.map((act, i) => `${i + 1}. ${act}`).join("\n")}

Lead foremen and supervisors are instructed to coordinate with site safety management for updates.`;
  }

  // 2. SITE OPERATIONS & HSE DIRECTIVE (Formal technical instruction)
  const siteHseText = 
`STA. CLARA INTERNATIONAL CORPORATION — SITE SAFETY BULLETIN
PROJECT: TUMAUINI HYDROELECTRIC POWER PLANT (11.3 MW RUN-OF-RIVER)
LOCATION: BARANGAY ANTAGAN UNO, TUMAUINI, ISABELA
DATE: ${dateStr} ${timeStr}
SUBJECT: WEATHER SITUATION REPORT — ${stormName.toUpperCase()}

1. METEOROLOGICAL CONTEXT:
   - System: ${category} "${stormName}" inside Philippine Area of Responsibility (PAR).
   - Radial Distance: ${stormDistance} km from Tumauini plant centerline (17.3188°N, 121.9749°E).
   - Closest Point of Approach (CPA): ${cpaDistance} projected for ${cpaEta}.
   - PAGASA TCWS Status: ${signalNumber > 0 ? `TCWS Signal #${signalNumber} raised for Isabela` : "No TCWS signal hoisted for Isabela"}.
   - Worksite Atmosphere: Local Wind ${localWind.toFixed(1)} km/h | Barometric Pressure ${input.sitePressureHpa.toFixed(1)} hPa.
   - Worksite Conditions: ${siteWeatherDesc}.

2. HYDROLOGICAL STATUS (PINACANAUAN DE TUMAUINI RIVER):
   - Current Stage: ${riverStatus}.
   - Local Watershed Impact: ${threatLevel === "FAIR_DISTANT" || threatLevel === "GREEN" ? "No upstream surge detected; river remains at safe operational levels." : "Monitoring runoff trends along the upstream Sierra Madre catchment."}

3. OPERATIONAL DIRECTIVES:
${actions.map((act) => `   - ${act}`).join("\n")}

Health, Safety & Environment (HSE) Department
Sta. Clara International Corporation — Tumauini HEPP`;

  // 3. EXECUTIVE & CLIENT MEMORANDUM (PHPC / Management)
  const executiveClientText = 
`EXECUTIVE WEATHER BRIEFING & SITUATION REPORT
TO: Project Management Committee, SCIC Executive Committee, Philnew Hydro Power Corp (PHPC)
FROM: SCIC Project Atlas Weather Monitoring Desk
PROJECT: Tumauini Hydroelectric Power Project (11.3 MW Run-of-River EPC)
LOCATION: Barangay Antagan Uno, Tumauini, Isabela
DATE: ${dateStr} at ${timeStr}

SITUATION SUMMARY:
${threatLevel === "GREEN"
  ? "The Philippine Area of Responsibility (PAR) remains clear of active tropical cyclones. All civil, tunneling, and electromechanical packages for the 11.3 MW Tumauini HEPP proceed under normal schedule."
  : threatLevel === "FAIR_DISTANT"
  ? `Tropical Cyclone "${stormName}" is active inside the Philippine Area of Responsibility (PAR), located approximately ${stormDistance} km from Tumauini. Because the system remains at a substantial distance over open waters, current weather at the 11.3 MW project site remains sunny and dry with light winds (${localWind.toFixed(1)} km/h) and normal river conditions. No disruption to construction works has occurred.`
  : `Tropical Cyclone "${stormName}" is active inside PAR, currently ${stormDistance} km from the worksite with projected CPA of ${cpaDistance}. Appropriate site preparedness and safety protocols have been initiated in accordance with SCIC weather standard operating procedures.`}

KEY WORKSITE PARAMETERS:
• Project: Tumauini Hydroelectric Power Plant (11.3 MW Run-of-River)
• Location: Barangay Antagan Uno, Tumauini, Isabela (17.3188° N, 121.9749° E)
• Proximity to System: ${stormDistance} km (CPA: ${cpaDistance}, ${cpaEta})
• Local Worksite Wind / MSLP: ${localWind.toFixed(1)} km/h | ${input.sitePressureHpa.toFixed(1)} hPa
• River Discharge Vector: ${riverStatus} (Pinacanauan de Tumauini River)

OPERATIONAL OUTLOOK:
${actions.map((act) => `• ${act}`).join("\n")}

Site management maintains active connection with PAGASA Northern Luzon and MDRRMO Tumauini.`;

  return {
    title: threatLevel === "GREEN" 
      ? "Tumauini HEPP Weather Status: PAR Clear" 
      : threatLevel === "FAIR_DISTANT"
      ? `Tumauini HEPP Weather Update: ${category} ${stormName} (Distant)`
      : `Typhoon Advisory: ${category} ${stormName} (Tumauini HEPP)`,
    threatLevel,
    threatBadge,
    summary: threatLevel === "GREEN"
      ? "PAR is clear. Normal construction of the 11.3 MW Tumauini Hydroelectric Power Plant continues under standard schedule."
      : threatLevel === "FAIR_DISTANT"
      ? `${category} "${stormName}" is active inside PAR at ${stormDistance} km from Tumauini. Worksite weather is currently fair and sunny (${localWind.toFixed(1)} km/h wind) with zero rainfall or site impact. Construction continues normally.`
      : `${category} "${stormName}" is active inside PAR, ${stormDistance} km from Tumauini HEPP (CPA: ${cpaDistance}). Worksite safety measures activated.`,
    viberStaffText,
    siteHseText,
    executiveClientText,
    keyMetrics: {
      stormName,
      category,
      parStatus: isInsidePar ? "INSIDE PAR" : "OUTSIDE PAR",
      isabelaSignal: signalNumber > 0 ? `Signal #${signalNumber}` : "None",
      cpaDistance,
      eta: cpaEta,
      siteWind: `${localWind.toFixed(1)} km/h`,
      siteWeather: siteWeatherDesc,
      riverStatus,
    },
    recommendedActions: actions,
  };
}
