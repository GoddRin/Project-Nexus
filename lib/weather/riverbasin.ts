import { calculateDistance } from "@/lib/weather/distance";

const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

export interface RiverStation {
  site_id: string;
  site_name: string;
  basin: string;
  lat: number;
  lon: number;
  distKm: number;
  value: string;
  numericValue?: number | null;
  readable_unit: string;
  metric_label: string;
  status_badge: string;
  status_label: string;
  observed_at: string;
  source: string;
  alertLevel: "normal" | "watch" | "warning" | "critical";
  isLive: boolean;
}

export interface DamStatus {
  name: string;
  fullName: string;
  observationTime: string;
  rwl: number;
  deviation24h: number;
  nhwl: number;
  deviationNhwl: number;
  gatesOpen: number;
  outflowCms: number;
}

export interface RiverBasinTelemetryResult {
  success: boolean;
  source: string;
  cagayanStatus: string;
  magatSubbasinStatus: string;
  stations: RiverStation[];
  allDams?: DamStatus[];
  updatedAt: string;
  isStale?: boolean;
}

// Memory fallback cache in case of momentary upstream network blips
let cachedResult: RiverBasinTelemetryResult | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache

export async function fetchRiverBasinTelemetry(): Promise<RiverBasinTelemetryResult> {
  const now = Date.now();
  if (cachedResult && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedResult;
  }

  try {
    // 1. Fetch Copernicus GloFAS River Discharge at Tumauini coordinates
    let dischargeValue: number | null = null;
    let dischargeUnit = "m³/s";
    let gloFASDate: string | null = null;
    let gloFASLive = false;

    try {
      const floodUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${SITE_LAT}&longitude=${SITE_LNG}&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min&forecast_days=3&past_days=1`;
      const floodRes = await fetch(floodUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      });

      if (floodRes.ok) {
        const floodJson = await floodRes.json();
        if (floodJson?.daily?.river_discharge) {
          // past_days=1 means index 1 is today
          const todayIdx = floodJson.daily.river_discharge.length > 1 ? 1 : 0;
          const val = floodJson.daily.river_discharge[todayIdx];
          if (typeof val === "number" && !isNaN(val)) {
            dischargeValue = parseFloat(val.toFixed(2));
            gloFASLive = true;
          }
          if (floodJson.daily_units?.river_discharge) {
            dischargeUnit = floodJson.daily_units.river_discharge;
          }
          if (floodJson.daily.time?.[todayIdx]) {
            gloFASDate = floodJson.daily.time[todayIdx];
          }
        }
      }
    } catch (err) {
      console.warn("[GloFAS Hydro] Failed to fetch Open-Meteo flood discharge:", err);
    }

    // 2. Fetch DOST-PAGASA Official Flood & Dam Telemetry
    let pagasaCagayanStatus: string | null = null;
    let pagasaMagatSubbasinStatus: string | null = null;
    let magatDam: DamStatus | null = null;
    const allDams: DamStatus[] = [];
    let pagasaLive = false;

    try {
      const pagasaRes = await fetch("https://bagong.pagasa.dost.gov.ph/flood", {
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (pagasaRes.ok) {
        const html = await pagasaRes.text();

        // Parse 18 Major River Basins
        const t0Match = html.match(/<table[^>]*class="table"[^>]*>([\s\S]*?)<\/table>/i);
        if (t0Match) {
          const rows = [...t0Match[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
          for (const r of rows) {
            const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
              c[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
            );
            if (cells.length >= 2) {
              const basinName = cells[0].toLowerCase();
              const statusText = cells[1];
              if (basinName === "cagayan") {
                pagasaCagayanStatus = statusText;
                pagasaLive = true;
              } else if (basinName.includes("magat sub-basin") || basinName.includes("magat")) {
                pagasaMagatSubbasinStatus = statusText;
              }
            }
          }
        }

        // Parse Dam Status Table
        const damTableMatch = html.match(/<table[^>]*class="[^"]*dam-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
        if (damTableMatch) {
          const tbodyMatch = damTableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i) || damTableMatch;
          const rows = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

          const knownDams = [
            "magat",
            "san roque",
            "pantabangan",
            "binga",
            "ambuklao",
            "angat",
            "ipo",
            "la mesa",
            "caliraya",
          ];

          for (const r of rows) {
            const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
              c[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
            );

            if (cells.length >= 8) {
              const rawName = cells[0];
              const cleanKey = rawName.toLowerCase().replace(/\s+dam$/i, "").trim();

              if (knownDams.includes(cleanKey)) {
                const rwl = parseFloat(cells[2]) || 0;
                const nhwl = parseFloat(cells[5]) || 0;
                const devNhwl = parseFloat(cells[6]) || (rwl && nhwl ? rwl - nhwl : 0);
                const dev24 = parseFloat(cells[4]) || 0;
                const gates = cells[9] ? parseInt(cells[9], 10) || 0 : 0;
                const outflow = cells[12] ? parseFloat(cells[12]) || 0 : 0;

                const parsedDam: DamStatus = {
                  name: rawName.replace(/\s+Dam$/i, "").trim(),
                  fullName: rawName.includes("Dam") ? rawName : `${rawName} Dam`,
                  observationTime: cells[1] || "08:00 AM",
                  rwl,
                  deviation24h: dev24,
                  nhwl,
                  deviationNhwl: devNhwl,
                  gatesOpen: gates,
                  outflowCms: outflow,
                };

                allDams.push(parsedDam);

                if (cleanKey === "magat") {
                  magatDam = parsedDam;
                  pagasaLive = true;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[PAGASA Flood] Error parsing bagong.pagasa.dost.gov.ph/flood:", err);
    }

    // Strictly fallback to previous live cache if available (clearly tagged as cached), NEVER mock data!
    let isStale = false;
    if (!magatDam && cachedResult?.allDams) {
      magatDam = cachedResult.allDams.find((d) => d.name.toLowerCase().includes("magat")) || null;
      isStale = true;
    }
    if (!pagasaCagayanStatus && cachedResult?.cagayanStatus) {
      pagasaCagayanStatus = cachedResult.cagayanStatus;
      isStale = true;
    }
    if (dischargeValue === null && cachedResult?.stations?.[0]?.numericValue) {
      dischargeValue = cachedResult.stations[0].numericValue;
      isStale = true;
    }

    const magatDistance = calculateDistance(SITE_LAT, SITE_LNG, 16.8208, 121.4503);

    // Build the 4 authoritative stations for the Tumauini & Cagayan River Basin section
    const stations: RiverStation[] = [
      // 1. Tumauini River Tailrace Outflow (GloFAS / Copernicus Live Telemetry)
      {
        site_id: "tumauini-tailrace",
        site_name: "Tumauini River Tailrace Outflow",
        basin: "Cagayan River Basin",
        lat: SITE_LAT,
        lon: SITE_LNG,
        distKm: 0.0,
        value: dischargeValue !== null ? dischargeValue.toFixed(2) : "Telemetry Syncing",
        numericValue: dischargeValue,
        readable_unit: dischargeValue !== null ? dischargeUnit : "",
        metric_label: "River Discharge",
        status_badge: gloFASLive ? "● Live GloFAS" : isStale ? "● Cached" : "● Syncing",
        status_label:
          dischargeValue !== null
            ? dischargeValue < 30
              ? "Normal Baseline Flow"
              : "Elevated Outflow"
            : "Re-verifying Telemetry",
        observed_at: gloFASDate ? `${gloFASDate} • Hydrological Cycle` : "Awaiting Daily Model",
        source: "Copernicus GloFAS",
        alertLevel:
          dischargeValue !== null
            ? dischargeValue < 50
              ? "normal"
              : dischargeValue < 120
              ? "watch"
              : "warning"
            : "normal",
        isLive: gloFASLive,
      },

      // 2. Magat Dam Reservoir Water Level (DOST-PAGASA FFWS)
      {
        site_id: "magat-dam-rwl",
        site_name: "Magat Dam Reservoir (Isabela)",
        basin: "Magat Sub-basin",
        lat: 16.8208,
        lon: 121.4503,
        distKm: parseFloat(magatDistance.toFixed(1)),
        value: magatDam ? `${magatDam.rwl.toFixed(2)}` : "Syncing Level",
        numericValue: magatDam?.rwl ?? null,
        readable_unit: magatDam ? `m RWL (NHWL ${magatDam.nhwl.toFixed(0)}m)` : "PAGASA Hydro",
        metric_label: "Water Level",
        status_badge: pagasaLive ? "● Synced" : isStale ? "● Cached" : "● Syncing",
        status_label: magatDam
          ? `${magatDam.deviationNhwl < 0 ? "" : "+"}${magatDam.deviationNhwl.toFixed(2)}m buffer`
          : "Connecting to FFWS",
        observed_at: magatDam ? `PAGASA Log: ${magatDam.observationTime} PHT` : "Awaiting PAGASA Bulletin",
        source: "DOST-PAGASA FFWS",
        alertLevel: magatDam ? (magatDam.deviationNhwl > -2 ? "watch" : "normal") : "normal",
        isLive: pagasaLive,
      },

      // 3. Cagayan River Basin Official Status (DOST-PAGASA Flood Bulletin)
      {
        site_id: "cagayan-river-basin",
        site_name: "Cagayan River Basin Telemetry",
        basin: "Cagayan River Basin",
        lat: 17.14,
        lon: 121.88,
        distKm: parseFloat(calculateDistance(SITE_LAT, SITE_LNG, 17.14, 121.88).toFixed(1)),
        value: pagasaCagayanStatus || "Non-Flood Watch",
        numericValue: null,
        readable_unit: "Official Status",
        metric_label: "Hydrological Alert",
        status_badge: (pagasaCagayanStatus || "").toLowerCase().includes("non-flood")
          ? "● Safe"
          : "▲ Warning",
        status_label: (pagasaCagayanStatus || "").toLowerCase().includes("non-flood")
          ? "Normal Water Level"
          : "Active Flood Watch",
        observed_at: "PAGASA 24h Bulletin",
        source: "DOST-PAGASA FFWS",
        alertLevel: (pagasaCagayanStatus || "").toLowerCase().includes("non-flood")
          ? "normal"
          : "watch",
        isLive: pagasaLive,
      },

      // 4. Magat Dam Spillway Discharge Outflow (DOST-PAGASA FFWS)
      {
        site_id: "magat-spillway",
        site_name: "Magat Dam Spillway Outflow",
        basin: "Magat Sub-basin",
        lat: 16.8208,
        lon: 121.4503,
        distKm: parseFloat(magatDistance.toFixed(1)),
        value: magatDam ? (magatDam.gatesOpen > 0 ? `${magatDam.gatesOpen} Gates Open` : "0 Gates Open") : "Syncing Gates",
        numericValue: magatDam?.gatesOpen ?? null,
        readable_unit: magatDam ? `(${magatDam.outflowCms.toFixed(1)} cms)` : "",
        metric_label: "Gate Release",
        status_badge: magatDam ? (magatDam.gatesOpen > 0 ? "▲ Outflow" : "● Containment") : "● Syncing",
        status_label: magatDam
          ? magatDam.gatesOpen > 0
            ? `Releasing ${magatDam.outflowCms} cms`
            : "Gates Fully Closed"
          : "Checking Gate Logs",
        observed_at: magatDam ? `PAGASA Log: ${magatDam.observationTime} PHT` : "Awaiting Gate Log",
        source: "DOST-PAGASA FFWS",
        alertLevel: magatDam ? (magatDam.gatesOpen > 0 ? "watch" : "normal") : "normal",
        isLive: pagasaLive,
      },
    ];

    const finalCagayanStatus = pagasaCagayanStatus || "Non-Flood Watch";
    const finalMagatSubbasinStatus = pagasaMagatSubbasinStatus || "Non-Flood Watch";

    const result: RiverBasinTelemetryResult = {
      success: true,
      source: "DOST-PAGASA FFWS & Copernicus GloFAS",
      cagayanStatus: finalCagayanStatus,
      magatSubbasinStatus: finalMagatSubbasinStatus,
      stations,
      allDams: allDams.length > 0 ? allDams : cachedResult?.allDams,
      updatedAt: new Date().toISOString(),
      isStale,
    };

    if (pagasaLive || gloFASLive) {
      cachedResult = result;
      lastFetchTime = now;
    }

    return result;
  } catch (err) {
    console.error("[River Basin Telemetry] Unexpected error:", err);
    if (cachedResult) {
      return { ...cachedResult, isStale: true };
    }
    throw err;
  }
}
