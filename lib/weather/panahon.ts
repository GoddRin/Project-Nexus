import { cache } from "react";
import { calculateDistance } from "@/lib/weather/distance";
import { Storm } from "@/lib/weather/jtwc";

const PANAHON_BASE = "https://panahon.gov.ph";

interface CachedToken {
  token: string;
  cookies: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

// Memory cache for API responses (granular per-layer TTL)
const responseCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Returns reasonable caching TTL (in seconds) based on data layer refresh frequency.
 */
export function getLayerTtlSeconds(endpointPath: string): number {
  if (
    endpointPath.includes("radar") ||
    endpointPath.includes("himawari") ||
    endpointPath.includes("lightning")
  ) {
    return 120; // 2 mins: high frequency radar, satellite & lightning
  }
  if (endpointPath.includes("cap-alerts") || endpointPath.includes("cyclone")) {
    return 300; // 5 mins: CAP warning alerts & cyclone track
  }
  if (
    endpointPath.includes("aws") ||
    endpointPath.includes("synop") ||
    endpointPath.includes("riverbasin")
  ) {
    return 600; // 10 mins: station weather telemetry
  }
  if (endpointPath.includes("hazard") || endpointPath.includes("tiles")) {
    return 3600; // 1 hour: static hazard maps
  }
  return 300; // 5 mins default
}

/**
 * Retrieves an active CSRF token and session cookie from panahon.gov.ph.
 * Caches the token for 30 minutes to minimize overhead.
 */
export async function getPanahonToken(): Promise<{ token: string; cookies: string }> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return { token: tokenCache.token, cookies: tokenCache.cookies };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(PANAHON_BASE, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`PANaHON root page returned ${res.status}`);
    }

    const html = await res.text();
    const tokenMatch = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
    const token = tokenMatch ? tokenMatch[1] : "";
    const cookies = res.headers.get("set-cookie") || "";

    if (!token) {
      throw new Error("CSRF token not found in PANaHON HTML");
    }

    tokenCache = {
      token,
      cookies,
      expiresAt: now + 30 * 60 * 1000, // 30 mins
    };

    return { token, cookies };
  } catch (err) {
    console.error("[PANaHON Session] Error getting token:", err);
    // Return stale token if available as emergency fallback
    if (tokenCache) {
      return { token: tokenCache.token, cookies: tokenCache.cookies };
    }
    throw err;
  }
}

/**
 * Proxy fetch helper for PANaHON API endpoints with CSRF authentication
 * and automatic stale-while-revalidate memory fallback.
 */
export async function fetchPanahonEndpoint(
  endpointPath: string,
  queryParams: Record<string, string> = {}
): Promise<{ data: any; source: "live" | "cached"; error?: string }> {
  const cacheKey = `${endpointPath}?${new URLSearchParams(queryParams).toString()}`;
  const now = Date.now();

  try {
    const { token, cookies } = await getPanahonToken();

    const params = new URLSearchParams(queryParams);
    if (!params.has("token")) {
      params.set("token", token);
    }

    const fullUrl = `${PANAHON_BASE}${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${PANAHON_BASE}/`,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
        ...(cookies ? { Cookie: cookies } : {}),
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 401 || res.status === 403) {
      // Invalidate token cache on auth error and throw to trigger fallback
      tokenCache = null;
      throw new Error(`PANaHON Auth Error: HTTP ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(`PANaHON API HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let resultData: any;

    if (contentType.includes("json")) {
      resultData = await res.json();
    } else {
      resultData = await res.text();
    }

    // Save to memory fallback cache
    responseCache.set(cacheKey, { data: resultData, timestamp: now });

    return { data: resultData, source: "live" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[PANaHON Proxy] Call to ${endpointPath} failed (${errMsg}). Checking fallback cache...`);

    // Check memory fallback cache
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return { data: cached.data, source: "cached", error: errMsg };
    }

    return { data: null, source: "cached", error: errMsg };
  }
}

/**
 * Raw binary image proxy helper for PANaHON image endpoints (Radar, Himawari IR, NWP)
 */
export async function fetchPanahonImage(
  endpointPath: string,
  queryParams: Record<string, string> = {}
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const { token, cookies } = await getPanahonToken();
    const params = new URLSearchParams(queryParams);
    if (!params.has("token")) {
      params.set("token", token);
    }

    const fullUrl = `${PANAHON_BASE}${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}?${params.toString()}`;

    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: `${PANAHON_BASE}/`,
        "X-Requested-With": "XMLHttpRequest",
        ...(cookies ? { Cookie: cookies } : {}),
      },
    });

    if (!res.ok) {
      console.warn(`[PANaHON Image] ${endpointPath} returned HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } catch (err) {
    console.error(`[PANaHON Image] Error fetching ${endpointPath}:`, err);
    return null;
  }
}

import { isWithinPAR } from "@/lib/weather/gdacs";

/**
 * Parses PANaHON cyclone-track vector data into Storm objects (only for active recent systems).
 */
export async function fetchPanahonCycloneTrackStorms(): Promise<Storm[]> {
  try {
    const res = await fetchPanahonEndpoint("/api/v1/cyclone-track");
    if (!res.data) return [];
    const items = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    if (items.length === 0) return [];

    const storms: Storm[] = [];
    const SITE_LAT = 17.318823;
    const SITE_LNG = 121.9749251;

    for (const item of items) {
      if (!item.cyclone_name || !item.info) continue;
      const cleanName = item.cyclone_name.replace(/[{}\d]/g, "").trim() || "Cyclonic System";
      const entries = Object.entries(item.info);
      if (entries.length === 0) continue;

      // Sort chronological
      entries.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

      const points = entries
        .map(([timeKey, p]: [string, any]) => {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          return {
            time: timeKey,
            lat,
            lng,
            type: (p.cyclone_type || "TD").toUpperCase(),
            date: p.date,
          };
        })
        .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng) && isFinite(pt.lat) && isFinite(pt.lng));

      if (points.length === 0) continue;

      const latestPoint = points[points.length - 1];
      const latestTimeStr = latestPoint.time.includes("T") ? latestPoint.time : latestPoint.time.replace(" ", "T") + "+08:00";
      const latestTimestamp = new Date(latestTimeStr).getTime();
      const hoursOld = (Date.now() - latestTimestamp) / (1000 * 60 * 60);

      // Ignore dissipated / historical tracks whose latest observation point is older than 12 hours
      // or weakened LPAs older than 6 hours
      if (hoursOld > 12 || (latestPoint.type === "LPA" && hoursOld > 6)) {
        console.log(`[PANaHON Cyclone Track] Ignoring stale track "${cleanName}" (latest point was ${hoursOld.toFixed(1)}h ago at ${latestPoint.time})`);
        continue;
      }

      const isLpa = latestPoint.type === "LPA";
      const category = isLpa
        ? "Low Pressure Area"
        : latestPoint.type === "TD"
        ? "Tropical Depression"
        : "Tropical Storm";
      const displayName = isLpa ? `${cleanName} (LPA)` : cleanName;

      // Build past track array for Storm interface
      const pastTrack = points.map((pt) => {
        const hoursAgo = Math.round(
          (Date.now() - new Date(pt.time.replace(" ", "T") + "+08:00").getTime()) / 3600000
        );
        return {
          lat: pt.lat,
          lng: pt.lng,
          hoursAgo: Math.max(0, hoursAgo),
          time: pt.time,
          type: pt.type,
        };
      });

      const distanceKm = Math.round(calculateDistance(latestPoint.lat, latestPoint.lng, SITE_LAT, SITE_LNG));
      const inPAR = isWithinPAR(latestPoint.lat, latestPoint.lng);

      storms.push({
        id: `PANAHON-${cleanName}`,
        name: displayName,
        category,
        lat: latestPoint.lat,
        lng: latestPoint.lng,
        windSpeedKnots: isLpa ? 20 : 30,
        windSpeedKph: isLpa ? 35 : 55,
        pressureHpa: 1004,
        direction: "WNW",
        speedKph: 15,
        distanceKm,
        closestApproach: {
          distanceKm,
          eta: latestPoint.time,
        },
        forecast: [{ time: "Current", lat: latestPoint.lat, lng: latestPoint.lng, windKph: isLpa ? 35 : 55 }],
        pastTrack,
        uncertaintyCone: [],
        windRadii: { r34: 0, r50: 0, r64: 0 },
        isWithinPAR: inPAR,
        source: "panahon",
      } as Storm);
    }

    return storms;
  } catch (err) {
    console.error("[PANaHON Cyclone Track] Error parsing track:", err);
    return [];
  }
}
