import { calculateDistance } from "./distance";

const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

export interface StormForecast {
  time: string;
  lat: number;
  lng: number;
  windKph: number;
}

export interface Storm {
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
  closestApproach: {
    distanceKm: number;
    eta: string;
  };
  forecast: StormForecast[];
  pastTrack: { lat: number; lng: number; hoursAgo: number }[];
  uncertaintyCone: { lat: number; lng: number }[];
  windRadii: {
    r34: number;
    r50: number;
    r64: number;
  };
  pubDate?: string;
}

function degreesToDirection(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return directions[val % 16];
}

/** Convert compass bearing (degrees) to reverse bearing for extrapolating backwards */
function reverseBearing(deg: number): number {
  return (deg + 180) % 360;
}

/** Calculate destination point given start coordinates, bearing (degrees), and distance (km) */
function destPoint(lat: number, lng: number, bearingDeg: number, distKm: number): { lat: number; lng: number } {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const d = distKm / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
}

export async function fetchActiveStorms(): Promise<Storm[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    const res = await fetch("https://www.metoc.navy.mil/jtwc/rss/jtwc.rss", {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(id);

    if (!res.ok) {
      throw new Error(`JTWC RSS returned status ${res.status}`);
    }

    const xmlText = await res.text();
    return await parseJtwcRss(xmlText);
  } catch (error) {
    console.error("Error fetching active storms from JTWC:", error);
    return [];
  }
}

function parseWarningText(text: string, stormId: string, stormName: string, pubDate?: string): Storm | null {
  // Extract Current Position
  let posRegex = /POSITION\s+NEAR\s+0?(\d+\.\d+)([NS])\s+0?(\d+\.\d+)([EW])/i;
  let posMatch = text.match(posRegex);
  if (!posMatch) {
    posRegex = /0?(\d+\.\d+)([NS])\s+0?(\d+\.\d+)([EW])/i;
    posMatch = text.match(posRegex);
  }
  if (!posMatch) return null;
  
  let lat = parseFloat(posMatch[1]);
  if (posMatch[2].toUpperCase() === "S") lat = -lat;
  let lng = parseFloat(posMatch[3]);
  if (posMatch[4].toUpperCase() === "W") lng = -lng;
  
  // Extract Max sustained winds
  const windRegex = /MAX\s+SUSTAINED\s+WINDS\s+-\s+(\d+)\s+KT/i;
  const windMatch = text.match(windRegex);
  const knots = windMatch ? parseInt(windMatch[1]) : 30;
  const windKph = Math.round(knots * 1.852);
  
  // Central pressure (if available in remarks, else calculate placeholder)
  const pressRegex = /MINIMUM\s+CENTRAL\s+PRESSURE\s+AT\s+\d+Z\s+IS\s+(\d+)\s+MB/i;
  const pressMatch = text.match(pressRegex);
  const pressure = pressMatch ? parseInt(pressMatch[1]) : (knots >= 100 ? 940 : knots >= 64 ? 970 : 995);
  
  // Derive category
  let category = "Tropical Depression";
  if (knots >= 64) {
    category = knots >= 130 ? "Super Typhoon" : "Typhoon";
  } else if (knots >= 34) {
    category = "Tropical Storm";
  }
  
  // Extract movement: MOVEMENT PAST SIX HOURS - 290 DEGREES AT 16 KTS
  const moveRegex = /MOVEMENT\s+PAST\s+SIX\s+HOURS\s*-\s*(\d+)\s+DEGREES\s+AT\s+(\d+)\s+KTS/i;
  const moveMatch = text.match(moveRegex);
  let direction = "WNW";
  let speedKph = 15;
  if (moveMatch) {
    const deg = parseInt(moveMatch[1]);
    const knotsMove = parseInt(moveMatch[2]);
    direction = degreesToDirection(deg);
    speedKph = Math.round(knotsMove * 1.852);
  }

  // Parse forecasts:
  // 12 HRS, VALID AT:
  // 061200Z --- 15.1N 142.5E
  // MAX SUSTAINED WINDS - 145 KT
  const forecast: StormForecast[] = [{ time: "Current", lat, lng, windKph }];
  const forecastRegex = /(\d+)\s+HRS,\s+VALID\s+AT:[\s\S]*?---\s*0?(\d+\.\d+)([NS])\s+0?(\d+\.\d+)([EW])[\s\S]*?MAX\s+SUSTAINED\s+WINDS\s+-\s+(\d+)\s+KT/gi;
  let fMatch;
  while ((fMatch = forecastRegex.exec(text)) !== null) {
    let fLat = parseFloat(fMatch[2]);
    if (fMatch[3].toUpperCase() === 'S') fLat = -fLat;
    let fLng = parseFloat(fMatch[4]);
    if (fMatch[5].toUpperCase() === 'W') fLng = -fLng;
    const fKnots = parseInt(fMatch[6]);
    forecast.push({
      time: `${fMatch[1]} Hours`,
      lat: fLat,
      lng: fLng,
      windKph: Math.round(fKnots * 1.852)
    });
  }
  
  // Build uncertainty cone polygon based on forecast tracks
  const uncertaintyCone = forecast.map(f => ({ lat: f.lat, lng: f.lng }));
  if (uncertaintyCone.length > 1) {
    const numPoints = uncertaintyCone.length;
    for (let i = numPoints - 1; i >= 0; i--) {
      const p = uncertaintyCone[i];
      uncertaintyCone.push({ lat: p.lat + 0.4, lng: p.lng - 0.4 });
    }
  }

  // Parse wind radii in NM, convert to KM
  const getRadius = (ktValue: number) => {
    const rRegex = new RegExp(`RADIUS\\s+OF\\s+0?${ktValue}\\s+KT\\s+WINDS\\s*-\\s*(\\d+)\\s*NM`, 'i');
    const rMatch = text.match(rRegex);
    if (rMatch) {
      return Math.round(parseInt(rMatch[1]) * 1.852); // NM to KM
    }
    return ktValue === 34 ? 120 : ktValue === 50 ? 60 : 0;
  };

  const distance = Math.round(calculateDistance(lat, lng, SITE_LAT, SITE_LNG));

  // Calculate closest approach dynamically based on forecast points
  let closestDistance = distance;
  let closestEta = new Date(Date.now() + 3600000 * 24).toISOString(); // fallback

  if (forecast.length > 0) {
    let minD = Infinity;
    let closestIdx = 0;
    forecast.forEach((f, idx) => {
      const d = calculateDistance(f.lat, f.lng, SITE_LAT, SITE_LNG);
      if (d < minD) {
        minD = d;
        closestIdx = idx;
      }
    });
    closestDistance = Math.round(minD);
    const closestForecast = forecast[closestIdx];
    if (closestForecast.time === "Current") {
      closestEta = new Date().toISOString();
    } else {
      const hrsMatch = closestForecast.time.match(/(\d+)\s*Hours/i);
      if (hrsMatch) {
        const hrs = parseInt(hrsMatch[1]);
        closestEta = new Date(Date.now() + hrs * 3600000).toISOString();
      }
    }
  }

  // Generate past track by extrapolating BACKWARDS from current position
  // using movement direction and speed. This shows where the storm came from.
  const pastTrack: { lat: number; lng: number; hoursAgo: number }[] = [];
  if (moveMatch) {
    const moveBearing = parseInt(moveMatch[1]); // direction storm is MOVING toward
    const backBearing = reverseBearing(moveBearing); // reverse to go backwards
    const moveSpeedKmh = speedKph;
    // Generate points for -6h, -12h, -18h, -24h, -36h, -48h, -72h
    const hoursBack = [6, 12, 18, 24, 36, 48, 72];
    for (const h of hoursBack) {
      const d = moveSpeedKmh * h;
      const pt = destPoint(lat, lng, backBearing, d);
      pastTrack.push({ lat: pt.lat, lng: pt.lng, hoursAgo: h });
    }
    pastTrack.reverse(); // oldest first
  }

  return {
    id: stormId,
    name: stormName,
    category,
    lat,
    lng,
    windSpeedKnots: knots,
    windSpeedKph: windKph,
    pressureHpa: pressure,
    direction,
    speedKph,
    distanceKm: distance,
    closestApproach: {
      distanceKm: closestDistance,
      eta: closestEta,
    },
    forecast,
    pastTrack,
    uncertaintyCone,
    windRadii: {
      r34: getRadius(34),
      r50: getRadius(50),
      r64: getRadius(64),
    },
    pubDate,
  };
}

export async function parseJtwcRss(xmlText: string): Promise<Storm[]> {
  const storms: Storm[] = [];
  const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  for (const match of itemMatches) {
    const itemContent = match[1];
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubDate = pubDateMatch ? pubDateMatch[1] : undefined;
    
    if (!titleMatch) continue;
    const title = titleMatch[1];
    const description = descMatch ? descMatch[1] : "";
    
    // NWPAC systems are summarized in this item
    if (title.includes("Northwest Pacific") || title.includes("NWPAC") || title.toUpperCase().includes("NORTHWEST PACIFIC")) {
      const sections = description.split(/<p><b>/i);
      
      for (const section of sections) {
        const nameMatch = section.match(/(?:TC|Tropical Storm|Tropical Depression|Typhoon|Super Typhoon)?\s*(\d+\w+)\s+\((.*?)\)/i);
        const linkMatch = section.match(/href='(https:\/\/www.metoc.navy.mil\/jtwc\/products\/wp\d+web.txt)'/i) ||
                          section.match(/href='(https:\/\/www.metoc.navy.mil\/jtwc\/products\/tc\d+web.txt)'/i);
                          
        if (nameMatch && linkMatch) {
          const stormId = nameMatch[1];
          const stormName = nameMatch[2].toUpperCase();
          const warningUrl = linkMatch[1];
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const warningRes = await fetch(warningUrl, {
              signal: controller.signal,
              cache: "no-store",
            });
            clearTimeout(timeoutId);
            
            if (warningRes.ok) {
              const warningText = await warningRes.text();
              const parsedStorm = parseWarningText(warningText, stormId, stormName, pubDate);
              if (parsedStorm) {
                storms.push(parsedStorm);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch warning details for ${stormName}:`, err);
          }
        }
      }
    }
  }
  
  return storms;
}
