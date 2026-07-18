/**
 * GDACS Tropical Cyclone Feed
 *
 * GDACS (Global Disaster Alert and Coordination System) provides a reliable
 * structured XML feed of active tropical cyclones worldwide.
 *
 * Feed URL: https://www.gdacs.org/xml/rss_tc.xml
 * Updated: Every ~3 hours during active events
 *
 * This serves as a THIRD independent data source alongside JTWC and PAGASA,
 * used as a fallback when the others are unavailable or returning empty results.
 */

import { calculateDistance } from "./distance";

const GDACS_TC_FEED = "https://www.gdacs.org/xml/rss_tc.xml";
const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

// ============================================================
// PAR (Philippine Area of Responsibility) Polygon
// ============================================================
// The PAR is defined by PAGASA as the area bounded by:
//   21°N, 116°E (NW corner)
//   25°N, 135°E (NE corner)
//    7°N, 135°E (E corner)
//    4°N, 128°E (SE corner, notch)
//    4°N, 116°E (SW corner)
// Simplified to a conservative rectangular bounds for fast checking.
const PAR_BOUNDS = {
  minLat: 4,
  maxLat: 25,
  minLng: 115,
  maxLng: 135,
};

export function isWithinPAR(lat: number, lng: number): boolean {
  if (
    lat < PAR_BOUNDS.minLat ||
    lat > PAR_BOUNDS.maxLat ||
    lng < PAR_BOUNDS.minLng ||
    lng > PAR_BOUNDS.maxLng
  ) {
    return false;
  }
  // Handle the bottom-right notch: below 7°N must be east of 128°E
  if (lat < 7 && lng < 128) {
    return false;
  }
  return true;
}

export interface GdacsStorm {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  windSpeedKph: number;
  windSpeedKnots: number;
  pressureHpa: number;
  alertLevel: string; // "Green" | "Orange" | "Red"
  distanceKm: number;
  isWithinPAR: boolean;
  pubDate: string;
}

function extractXmlField(xml: string, tag: string): string {
  // Handle both namespaced and non-namespaced tags: <gdacs:name>, <geo:lat>, etc.
  const patterns = [
    new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, "i"),
    new RegExp(`<[a-z]+:${tag.split(":").pop()}>([^<]*)<\\/[a-z]+:${tag.split(":").pop()}>`, "i"),
  ];
  for (const regex of patterns) {
    const match = xml.match(regex);
    if (match) return match[1].trim();
  }
  return "";
}

function parseWindFromSeverity(severity: string): number {
  // GDACS severity format: "Tropical storm, Wind speed 63 km/h"
  const match = severity.match(/Wind speed\s+([\d.]+)\s*km\/h/i);
  if (match) return parseFloat(match[1]);
  // Try knots
  const knotMatch = severity.match(/(\d+)\s*kt/i);
  if (knotMatch) return Math.round(parseInt(knotMatch[1]) * 1.852);
  return 0;
}

function classifyFromWind(kph: number): string {
  const knots = kph / 1.852;
  if (knots >= 130) return "Super Typhoon";
  if (knots >= 64) return "Typhoon";
  if (knots >= 48) return "Severe Tropical Storm";
  if (knots >= 34) return "Tropical Storm";
  return "Tropical Depression";
}

export async function fetchGdacsStorms(): Promise<GdacsStorm[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(GDACS_TC_FEED, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "ProjectNexus-WeatherMonitor/1.0",
        Accept: "application/rss+xml,application/xml,text/xml",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`GDACS feed returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    return parseGdacsFeed(xml);
  } catch (error) {
    console.error("Failed to fetch GDACS TC feed:", error);
    return [];
  }
}

function parseGdacsFeed(xml: string): GdacsStorm[] {
  const storms: GdacsStorm[] = [];

  // Split into <item> blocks
  const items = xml.split(/<item[^>]*>/i).slice(1);

  for (const item of items) {
    // Extract closing tag content
    const block = item.split("</item>")[0];

    // Only process TC events
    const eventType = extractXmlField(block, "gdacs:eventtype") || extractXmlField(block, "eventtype");
    if (eventType && eventType.toUpperCase() !== "TC") continue;

    // Position — try geo:lat/geo:long first, then gdacs:lat/gdacs:long
    let lat = 0;
    let lng = 0;
    const geoLat = block.match(/<geo:lat>([\d.-]+)<\/geo:lat>/i);
    const geoLng = block.match(/<geo:long>([\d.-]+)<\/geo:long>/i);
    if (geoLat) lat = parseFloat(geoLat[1]);
    if (geoLng) lng = parseFloat(geoLng[1]);

    if (!geoLat) {
      const dLat = block.match(/<gdacs:lat>([\d.-]+)<\/gdacs:lat>/i);
      if (dLat) lat = parseFloat(dLat[1]);
    }
    if (!geoLng) {
      const dLng = block.match(/<gdacs:long>([\d.-]+)<\/gdacs:long>/i);
      if (dLng) lng = parseFloat(dLng[1]);
    }

    if (lat === 0 && lng === 0) continue; // Skip if no valid position

    const inPAR = isWithinPAR(lat, lng);

    // Event metadata
    const eventId = extractXmlField(block, "gdacs:eventid") || `GDACS-${Date.now()}`;
    const name = extractXmlField(block, "gdacs:name") || extractXmlField(block, "name") || "Unknown TC";
    const severity = extractXmlField(block, "gdacs:severity") || "";
    const alertLevel = extractXmlField(block, "gdacs:alertlevel") || "Green";
    const pubDate = extractXmlField(block, "pubDate") || new Date().toISOString();

    const windKph = parseWindFromSeverity(severity);
    const windKnots = Math.round(windKph / 1.852);
    const category = classifyFromWind(windKph);

    // Estimate pressure from wind
    let pressureHpa = 1000;
    if (windKnots >= 130) pressureHpa = 920;
    else if (windKnots >= 100) pressureHpa = 945;
    else if (windKnots >= 64) pressureHpa = 970;
    else if (windKnots >= 34) pressureHpa = 995;

    const distanceKm = Math.round(calculateDistance(lat, lng, SITE_LAT, SITE_LNG));

    storms.push({
      id: `GDACS-${eventId}`,
      name: name.toUpperCase(),
      category,
      lat,
      lng,
      windSpeedKph: windKph,
      windSpeedKnots: windKnots,
      pressureHpa,
      alertLevel,
      distanceKm,
      isWithinPAR: inPAR,
      pubDate,
    });
  }

  return storms;
}
