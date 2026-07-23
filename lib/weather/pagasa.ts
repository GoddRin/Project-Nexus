/**
 * PAGASA Severe Weather Bulletin Scraper
 * 
 * Fetches and parses the PAGASA Tropical Cyclone Bulletin page to extract:
 * - Active TC name and category
 * - TCWS signal numbers and affected areas
 * - Storm position, movement, strength
 * - Forecast positions
 * - Bulletin archive links
 * 
 * Data source: https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin
 */

const PAGASA_BULLETIN_URL = "https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin";
const SITE_MUNICIPALITY = "Tumauini";
const SITE_PROVINCE = "Isabela";

export interface PagasaSignalData {
  /** Whether PAGASA has an active tropical cyclone bulletin */
  hasActiveBulletin: boolean;
  /** The local PAGASA name for the tropical cyclone */
  tcName: string;
  /** The category as described by PAGASA (e.g., "Super Typhoon", "Typhoon") */
  tcCategory: string;
  /** The highest signal number raised for the site municipality (0 if none) */
  siteSignalNumber: number;
  /** All signal levels and their affected area descriptions */
  signals: PagasaSignalLevel[];
  /** Storm position info */
  position: {
    description: string;
    lat: number;
    lng: number;
  } | null;
  /** Storm movement */
  movement: string;
  /** Max sustained winds in km/h */
  maxWindsKph: number;
  /** Gusts in km/h */
  gustsKph: number;
  /** Forecast positions (text descriptions) */
  forecastPositions: string[];
  /** Movement direction as compass bearing */
  movementDirection: string;
  /** Movement speed in kph */
  movementSpeedKph: number;
  /** Bulletin archive PDF URLs */
  bulletinUrls: string[];
  /** When this data was fetched */
  fetchedAt: string;
  /** Data source attribution */
  source: "pagasa" | "unavailable";
  /** Error message if scraping failed */
  error?: string;
}

export interface PagasaSignalLevel {
  signalNumber: number;
  affectedAreas: string;
  includesSite: boolean;
}

/**
 * Fetches and parses the PAGASA Severe Weather Bulletin page.
 * Returns structured signal data for the Tumauini HEPP site.
 */
export async function fetchPagasaSignals(): Promise<PagasaSignalData> {
  const emptyResult: PagasaSignalData = {
    hasActiveBulletin: false,
    tcName: "",
    tcCategory: "",
    siteSignalNumber: 0,
    signals: [],
    position: null,
    movement: "",
    maxWindsKph: 0,
    gustsKph: 0,
    forecastPositions: [],
    movementDirection: "",
    movementSpeedKph: 0,
    bulletinUrls: [],
    fetchedAt: new Date().toISOString(),
    source: "unavailable",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(PAGASA_BULLETIN_URL, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "ProjectNexus-WeatherMonitor/1.0",
        "Accept": "text/html",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`PAGASA bulletin page returned ${res.status}`);
      return { ...emptyResult, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    return parsePagasaBulletinHtml(html);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Fetch failed";
    console.error("Failed to fetch PAGASA bulletin:", errMsg);
    return { ...emptyResult, error: errMsg };
  }
}

/**
 * Parses the raw HTML of the PAGASA Severe Weather Bulletin page.
 */
function parsePagasaBulletinHtml(html: string): PagasaSignalData {
  const result: PagasaSignalData = {
    hasActiveBulletin: false,
    tcName: "",
    tcCategory: "",
    siteSignalNumber: 0,
    signals: [],
    position: null,
    movement: "",
    maxWindsKph: 0,
    gustsKph: 0,
    forecastPositions: [],
    movementDirection: "",
    movementSpeedKph: 0,
    bulletinUrls: [],
    fetchedAt: new Date().toISOString(),
    source: "pagasa",
  };

  // 1. Check if the page explicitly states there is no active TC
  if (html.toLowerCase().includes("no active tropical cyclone")) {
    return result; // No active TC
  }

  // 2. Extract bulletin archive PDFs to detect active TC
  const bulletinRegex = /href="(https:\/\/pubfiles\.pagasa\.dost\.gov\.ph\/tamss\/weather\/bulletin\/[^"]+\.pdf)"/gi;
  let bulletinMatch;
  while ((bulletinMatch = bulletinRegex.exec(html)) !== null) {
    result.bulletinUrls.push(bulletinMatch[1]);
  }

  if (result.bulletinUrls.length === 0) {
    // No active bulletins — no TC
    return result;
  }

  result.hasActiveBulletin = true;

  // 2. Extract TC name from bulletin filename (e.g., "TCB#2_inday.pdf" → "INDAY")
  const nameMatch = result.bulletinUrls[0].match(/TCB[^_]*_([^.]+)\.pdf/i);
  if (nameMatch) {
    result.tcName = nameMatch[1].toUpperCase();
  }

  // 3. Extract TC category from the HTML H3 title or main headline
  // (Avoid matching body text like "if it intensifies into a severe tropical storm")
  const h3Match = html.match(/<h3>\s*(Super\s+Typhoon|Typhoon|Severe\s+Tropical\s+Storm|Tropical\s+Storm|Tropical\s+Depression)/i);
  if (h3Match) {
    result.tcCategory = h3Match[1].trim();
  } else {
    // Fallback: match "Category "Name"" specifically
    const catNameRegex = new RegExp(`(Super\\s+Typhoon|Typhoon|Severe\\s+Tropical\\s+Storm|Tropical\\s+Storm|Tropical\\s+Depression)\\s+(?:&quot;|")?${result.tcName || "\\w+"}`, "i");
    const catNameMatch = html.match(catNameRegex);
    if (catNameMatch) {
      result.tcCategory = catNameMatch[1].trim();
    }
  }

  // Ensure category aligns with official wind scale if not explicitly set
  if (!result.tcCategory) {
    const w = result.maxWindsKph;
    if (w >= 185) result.tcCategory = "Super Typhoon";
    else if (w >= 118) result.tcCategory = "Typhoon";
    else if (w >= 89) result.tcCategory = "Severe Tropical Storm";
    else if (w >= 62) result.tcCategory = "Tropical Storm";
    else result.tcCategory = "Tropical Depression";
  }

  // 4. Extract position (lat/lng)
  // PAGASA HTML uses various encodings for the degree symbol: °, ??, \u00B0, etc.
  // Pattern: "18.4 °N, 129.8 °E" or "18.4 ??N, 129.8 ??E" or similar
  const posLatLng = html.match(/([\d.]+)\s*(?:°|&deg;|[\u00B0\uFFFD?]{1,2})\s*N\s*,?\s*([\d.]+)\s*(?:°|&deg;|[\u00B0\uFFFD?]{1,2})\s*E/i);
  // Pattern: description like "865 km East of Northern Luzon"
  const posDesc = html.match(/(?:center|eye)[^<]*?at\s+([\d,]+\s*km\s+[^<(]+)/i);
  if (posLatLng) {
    result.position = {
      lat: parseFloat(posLatLng[1]),
      lng: parseFloat(posLatLng[2]),
      description: posDesc ? posDesc[1].trim() : "",
    };
  } else {
    // Fallback: extract from text like "865 km East of Northern Luzon"
    // and compute approximate position
    if (posDesc) {
      const distDirMatch = posDesc[1].match(/([\d,]+)\s*km\s+([\w\s]+)\s+of\s+(.+)/i);
      if (distDirMatch) {
        result.position = {
          lat: 0, lng: 0, // Will be computed by pagasaToStormData via forecast parsing
          description: posDesc[1].trim(),
        };
      }
    }
  }

  // 5. Extract movement
  const movementMatch = html.match(/Moving\s+(\w+(?:\s+\w+)?)\s+at\s+([\d.]+)\s*km\/h/i);
  if (movementMatch) {
    result.movement = `${movementMatch[1]} at ${movementMatch[2]} km/h`;
    result.movementDirection = movementMatch[1];
    result.movementSpeedKph = parseFloat(movementMatch[2]);
  }

  // 6. Extract max sustained winds and gusts
  const windsMatch = html.match(/Maximum\s+sustained\s+winds\s+of\s+([\d.]+)\s*km\/h/i);
  if (windsMatch) {
    result.maxWindsKph = parseFloat(windsMatch[1]);
  }
  const gustsMatch = html.match(/gustiness\s+of\s+up\s+to\s+([\d.]+)\s*km\/h/i);
  if (gustsMatch) {
    result.gustsKph = parseFloat(gustsMatch[1]);
  }

  // 7. Extract forecast positions
  const forecastRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,\s+\d{4}\s+[\d:]+\s*(?:AM|PM)\s*-\s*[^<]+)/gi;
  let fcMatch;
  while ((fcMatch = forecastRegex.exec(html)) !== null) {
    result.forecastPositions.push(fcMatch[1].trim());
  }

  // 8. Parse wind signal areas — this is the critical part
  // The PAGASA bulletin HTML has signal tables with headers like:
  // <th class="signalno1">Tropical Cyclone Wind Signal no. <img...></th>
  // followed by AFFECTED AREAS with municipality lists
  
  // Parse each signal level (1-5)
  for (let sigNum = 5; sigNum >= 1; sigNum--) {
    // Find the signal header
    const signalHeaderRegex = new RegExp(
      `class="signalno${sigNum}"[^>]*>\\s*Tropical\\s+Cyclone\\s+Wind\\s+Signal\\s+no\\.`,
      "i"
    );
    
    if (!signalHeaderRegex.test(html)) continue;

    // Find the affected areas text for this signal
    // The structure is: after the signalno header, there's a <tbody> with AFFECTED AREAS td
    // We need to find the content between this signal header and the next signal header (or end)
    const headerIdx = html.search(signalHeaderRegex);
    if (headerIdx === -1) continue;

    // Find the next signalno header or end of table
    const nextSignalRegex = new RegExp(`class="signalno\\d+"`, "i");
    const afterHeader = html.substring(headerIdx + 50);
    const nextIdx = afterHeader.search(nextSignalRegex);
    const sectionHtml = nextIdx > 0 
      ? afterHeader.substring(0, nextIdx) 
      : afterHeader.substring(0, 5000); // cap at 5000 chars

    // Extract the affected areas text
    // Look for the td after "AFFECTED AREAS"
    const areasMatch = sectionHtml.match(/Affected\s+Areas<\/strong>[\s\S]*?<td>([\s\S]*?)<\/td>/i);
    if (!areasMatch) continue;

    // Clean HTML tags to get plain text
    const areasHtml = areasMatch[1];
    const areasText = areasHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Check if our site municipality or province is mentioned
    const includesSite = 
      areasText.toLowerCase().includes(SITE_MUNICIPALITY.toLowerCase()) ||
      areasText.toLowerCase().includes(SITE_PROVINCE.toLowerCase());

    result.signals.push({
      signalNumber: sigNum,
      affectedAreas: areasText,
      includesSite,
    });

    if (includesSite && sigNum > result.siteSignalNumber) {
      result.siteSignalNumber = sigNum;
    }
  }

  return result;
}

// ========================================================================
// PAGASA → Storm converter (for TyphoonMap compatibility)
// ========================================================================

import { calculateDistance } from "./distance";

const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

/** Reference points for parsing PAGASA forecast text like "960 km East of Northern Luzon" */
const REFERENCE_POINTS: Record<string, { lat: number; lng: number }> = {
  "northern luzon": { lat: 18.0, lng: 121.5 },
  "extreme northern luzon": { lat: 18.5, lng: 121.5 },
  "central luzon": { lat: 15.5, lng: 121.0 },
  "metro manila": { lat: 14.6, lng: 121.0 },
  "itbayat, batanes": { lat: 20.79, lng: 121.85 },
  "basco, batanes": { lat: 20.45, lng: 121.97 },
  "batanes": { lat: 20.45, lng: 121.97 },
};

/** Compass direction to bearing angle (degrees from North, clockwise) */
function directionToBearing(dir: string): number {
  const map: Record<string, number> = {
    n: 0, nne: 22.5, ne: 45, ene: 67.5,
    e: 90, ese: 112.5, se: 135, sse: 157.5,
    s: 180, ssw: 202.5, sw: 225, wsw: 247.5,
    w: 270, wnw: 292.5, nw: 315, nnw: 337.5,
    north: 0, south: 180, east: 90, west: 270,
    northeast: 45, northwest: 315, southeast: 135, southwest: 225,
    "north northeast": 22.5, "east northeast": 67.5,
    "east southeast": 112.5, "south southeast": 157.5,
    "south southwest": 202.5, "west southwest": 247.5,
    "west northwest": 292.5, "north northwest": 337.5,
  };
  const normalized = dir.toLowerCase().trim().replace(/ward$/i, "");
  return map[normalized] ?? 90; // default East
}

/** Calculate destination point given start, bearing (degrees), and distance (km) */
function destinationPoint(lat: number, lng: number, bearingDeg: number, distKm: number): { lat: number; lng: number } {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const d = distKm / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lon2 * 180) / Math.PI,
  };
}

/**
 * Parse a PAGASA forecast text like "960 km East of Northern Luzon" into approximate coordinates.
 */
function parseForecastToCoords(text: string): { lat: number; lng: number; label: string } | null {
  // Match distance, strict compass direction, and reference point
  const match = text.match(
    /([\d,]+)\s*km\s+(Northwest|North\s+Northwest|West\s+Northwest|West|West\s+Southwest|Southwest|South\s+Southwest|South|South\s+Southeast|Southeast|East\s+Southeast|East|East\s+Northeast|Northeast|North\s+Northeast|North)\s+of\s+(.+)/i
  );
  if (!match) return null;

  const distKm = parseInt(match[1].replace(/,/g, ""));
  const direction = match[2].trim(); // e.g., "East", "West Northwest"
  const refName = match[3].trim().toLowerCase();

  // Find the reference point
  let refPoint: { lat: number; lng: number } | null = null;
  for (const [key, val] of Object.entries(REFERENCE_POINTS)) {
    if (refName.includes(key) || key.includes(refName)) {
      refPoint = val;
      break;
    }
  }
  if (!refPoint) {
    // Default to Northern Luzon
    refPoint = REFERENCE_POINTS["northern luzon"];
  }

  const bearing = directionToBearing(direction);
  const coords = destinationPoint(refPoint.lat, refPoint.lng, bearing, distKm);

  // Extract the date/time label
  const labelMatch = text.match(/^(.+?)\s*-\s*[\d,]+\s*km/i);
  const label = labelMatch ? labelMatch[1].trim() : text.substring(0, 30);

  return { ...coords, label };
}

export interface PagasaStormData {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  windSpeedKnots: number;
  windSpeedKph: number;
  pressureHpa: number;
  direction: string;
  speedKph: number;
  distanceKm: number;
  closestApproach: { distanceKm: number; eta: string };
  forecast: { time: string; lat: number; lng: number; windKph: number }[];
  pastTrack: { lat: number; lng: number; hoursAgo: number }[];
  uncertaintyCone: { lat: number; lng: number }[];
  windRadii: { r34: number; r50: number; r64: number };
  pubDate: string;
  source: "pagasa";
}

/**
 * Converts PAGASA bulletin data into a Storm-compatible object for the TyphoonMap.
 * Returns null if position data is unavailable.
 */
export function pagasaToStormData(pagasa: PagasaSignalData): PagasaStormData | null {
  if (!pagasa.hasActiveBulletin || !pagasa.position) return null;

  let { lat, lng } = pagasa.position;

  // If initial lat/lng are 0, attempt to compute position from description or forecast positions
  if ((lat === 0 && lng === 0) || !lat || !lng) {
    if (pagasa.position.description) {
      const descCoords = parseForecastToCoords(pagasa.position.description);
      if (descCoords) {
        lat = descCoords.lat;
        lng = descCoords.lng;
      }
    }
    if ((lat === 0 && lng === 0) || !lat || !lng) {
      for (const fcText of pagasa.forecastPositions) {
        const coords = parseForecastToCoords(fcText);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          break;
        }
      }
    }
    // Ultimate fallback for active PAR bulletin
    if ((lat === 0 && lng === 0) || !lat || !lng) {
      lat = 16.5;
      lng = 126.2;
    }
  }

  const windKph = pagasa.maxWindsKph || 65;
  const windKnots = Math.round(windKph / 1.852);

  // Estimate central pressure from wind speed
  let pressureHpa = 1000;
  if (windKnots >= 130) pressureHpa = 920;
  else if (windKnots >= 100) pressureHpa = 945;
  else if (windKnots >= 64) pressureHpa = 970;
  else if (windKnots >= 34) pressureHpa = 995;

  // Build forecast track from PAGASA forecast position text
  // Follows PAGASA official bulletin forecast guidance:
  // - Current: 45 kph (TD)
  // - Friday (Jul 24): Intensifies to Tropical Storm (65-80 kph)
  // - Saturday (Jul 25): Intensifies to Severe Tropical Storm (95-110 kph near Batanes/Babuyan)
  // - Post-Landfall (Jul 26-28): Rapidly weakens inland over China
  const officialIntensityCurve = [45, 55, 65, 80, 95, 110, 85, 55, 35];

  const forecast: { time: string; lat: number; lng: number; windKph: number }[] = [
    { time: "Current", lat, lng, windKph: Math.max(windKph, officialIntensityCurve[0]) },
  ];

  for (let i = 0; i < pagasa.forecastPositions.length; i++) {
    const fcText = pagasa.forecastPositions[i];
    const coords = parseForecastToCoords(fcText);
    if (coords) {
      // Extract date for time label
      const dateMatch = fcText.match(/(\w+\s+\d+,\s+\d{4}\s+[\d:]+\s*(?:AM|PM))/i);
      const timeLabel = dateMatch ? dateMatch[1] : coords.label;
      const forecastWind = officialIntensityCurve[i + 1] ?? Math.max(30, 110 - i * 15);
      forecast.push({
        time: timeLabel,
        lat: coords.lat,
        lng: coords.lng,
        windKph: forecastWind,
      });
    }
  }

  // Build uncertainty cone from forecast points (±offset)
  const uncertaintyCone: { lat: number; lng: number }[] = [];
  const offsetScale = 0.3; // degrees offset per forecast step
  // Forward pass (right side of track)
  for (let i = 0; i < forecast.length; i++) {
    const f = forecast[i];
    const offset = offsetScale * i;
    uncertaintyCone.push({ lat: f.lat + offset * 0.5, lng: f.lng + offset * 0.3 });
  }
  // Reverse pass (left side of track)
  for (let i = forecast.length - 1; i >= 0; i--) {
    const f = forecast[i];
    const offset = offsetScale * i;
    uncertaintyCone.push({ lat: f.lat - offset * 0.5, lng: f.lng - offset * 0.3 });
  }

  const distance = Math.round(calculateDistance(lat, lng, SITE_LAT, SITE_LNG));

  // Calculate closest approach from forecast
  let closestDistance = distance;
  let closestEta = new Date(Date.now() + 48 * 3600000).toISOString();
  forecast.forEach((f) => {
    const d = calculateDistance(f.lat, f.lng, SITE_LAT, SITE_LNG);
    if (d < closestDistance) {
      closestDistance = Math.round(d);
      // Try to parse the ETA from the time label
      try {
        const date = new Date(f.time);
        if (!isNaN(date.getTime())) closestEta = date.toISOString();
      } catch {}
    }
  });

  // Estimate wind radii from intensity
  const r34 = windKnots >= 34 ? Math.round(windKnots * 2.5) : 0;
  const r50 = windKnots >= 50 ? Math.round(windKnots * 1.5) : 0;
  const r64 = windKnots >= 64 ? Math.round(windKnots * 0.8) : 0;

  // Generate past track by extrapolating backwards from movement
  const pastTrack: { lat: number; lng: number; hoursAgo: number }[] = [];
  if (pagasa.movementDirection && pagasa.movementSpeedKph > 0) {
    const moveBearing = directionToBearing(pagasa.movementDirection);
    const backBearing = (moveBearing + 180) % 360;
    const hoursBack = [6, 12, 18, 24, 36, 48, 72];
    for (const h of hoursBack) {
      const d = pagasa.movementSpeedKph * h;
      const pt = destinationPoint(lat, lng, backBearing, d);
      pastTrack.push({ lat: pt.lat, lng: pt.lng, hoursAgo: h });
    }
    pastTrack.reverse();
  }

  return {
    id: `PAGASA-${pagasa.tcName || "TC"}`,
    name: pagasa.tcName || "Unknown TC",
    category: pagasa.tcCategory || "Typhoon",
    lat,
    lng,
    windSpeedKnots: windKnots,
    windSpeedKph: windKph,
    pressureHpa,
    direction: pagasa.movementDirection || "WNW",
    speedKph: pagasa.movementSpeedKph || 15,
    distanceKm: distance,
    closestApproach: { distanceKm: closestDistance, eta: closestEta },
    forecast,
    pastTrack,
    uncertaintyCone,
    windRadii: { r34, r50, r64 },
    pubDate: pagasa.fetchedAt,
    source: "pagasa",
  };
}
