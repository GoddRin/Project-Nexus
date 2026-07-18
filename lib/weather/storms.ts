import { calculateDistance } from "@/lib/weather/distance";
import { fetchActiveStorms, Storm } from "@/lib/weather/jtwc";
import { fetchPagasaSignals, pagasaToStormData } from "@/lib/weather/pagasa";
import { fetchGdacsStorms, isWithinPAR, GdacsStorm } from "@/lib/weather/gdacs";

// Tumauini HEPP Coordinates
const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

export interface MergedStormsResult {
  storms: Storm[];
  source: string;
  parClear: boolean; // true when all sources confirm no TC within PAR
  sourcesChecked: string[]; // which sources responded
  sourcesWithData: string[]; // which sources returned storm data
}

export async function getMergedStorms(isMock = false): Promise<MergedStormsResult> {
  if (isMock) {
    const mockStorms: Storm[] = [
      {
        id: "WP052026",
        name: "INDAY",
        category: "Typhoon",
        lat: 18.4,
        lng: 129.8,
        windSpeedKnots: 89,
        windSpeedKph: 165,
        pressureHpa: 970,
        direction: "Northwestward",
        speedKph: 15,
        distanceKm: Math.round(calculateDistance(18.4, 129.8, SITE_LAT, SITE_LNG)),
        closestApproach: {
          distanceKm: 640,
          eta: new Date(Date.now() + 3600000 * 24).toISOString(),
        },
        forecast: [
          { time: "Current", lat: 18.6, lng: 129.6, windKph: 204 },
          { time: "12 Hours", lat: 19.6, lng: 128.5, windKph: 194 },
          { time: "24 Hours", lat: 21.1, lng: 127.0, windKph: 194 },
          { time: "36 Hours", lat: 23.1, lng: 125.5, windKph: 185 },
          { time: "48 Hours", lat: 25.2, lng: 123.5, windKph: 176 },
          { time: "72 Hours", lat: 29.3, lng: 119.0, windKph: 111 },
        ],
        pastTrack: [
          { lat: 18.1, lng: 119.6, hoursAgo: 72 },
          { lat: 18.2, lng: 122.9, hoursAgo: 48 },
          { lat: 18.3, lng: 126.3, hoursAgo: 24 },
          { lat: 18.4, lng: 128.9, hoursAgo: 6 },
        ],
        uncertaintyCone: [
          { lat: 18.6, lng: 129.6 },
          { lat: 19.6, lng: 128.5 },
          { lat: 21.1, lng: 127.0 },
          { lat: 23.1, lng: 125.5 },
          { lat: 25.2, lng: 123.5 },
          { lat: 27.3, lng: 121.1 },
          { lat: 29.3, lng: 119.0 },
          { lat: 29.7, lng: 118.6 },
          { lat: 25.6, lng: 123.1 },
          { lat: 21.5, lng: 126.6 },
          { lat: 18.6, lng: 129.6 },
        ],
        windRadii: { r34: 220, r50: 120, r64: 60 },
      },
    ];
    return {
      storms: mockStorms,
      source: "mocked",
      parClear: false,
      sourcesChecked: ["mock"],
      sourcesWithData: ["mock"],
    };
  }

  // ============================================================
  // Fetch all three sources in parallel
  // ============================================================
  const [jtwcResult, pagasaResult, gdacsResult] = await Promise.allSettled([
    fetchActiveStorms(),
    fetchPagasaSignals(),
    fetchGdacsStorms(),
  ]);

  const jtwcStorms: Storm[] =
    jtwcResult.status === "fulfilled" ? jtwcResult.value : [];
  const pagasaSignals =
    pagasaResult.status === "fulfilled" ? pagasaResult.value : null;
  const gdacsStorms: GdacsStorm[] =
    gdacsResult.status === "fulfilled" ? gdacsResult.value : [];

  const sourcesChecked: string[] = [];
  const sourcesWithData: string[] = [];

  if (jtwcResult.status === "fulfilled") sourcesChecked.push("jtwc");
  if (pagasaResult.status === "fulfilled") sourcesChecked.push("pagasa");
  if (gdacsResult.status === "fulfilled") sourcesChecked.push("gdacs");

  if (jtwcStorms.length > 0) sourcesWithData.push("jtwc");
  if (pagasaSignals?.hasActiveBulletin) sourcesWithData.push("pagasa");
  if (gdacsStorms.length > 0) sourcesWithData.push("gdacs");

  // Log all sources for debugging
  console.log(`[Storms] JTWC: ${jtwcStorms.length} storms | PAGASA active: ${pagasaSignals?.hasActiveBulletin ?? "error"} | GDACS: ${gdacsStorms.length} storms`);

  // ============================================================
  // Filter JTWC storms to PAR only
  // ============================================================
  const jtwcParStorms = jtwcStorms.filter((s) => isWithinPAR(s.lat, s.lng));
  if (jtwcStorms.length > jtwcParStorms.length) {
    console.log(`[Storms] JTWC filtered: ${jtwcStorms.length} total → ${jtwcParStorms.length} within PAR`);
  }

  // Filter GDACS to PAR only
  const gdacsParStorms = gdacsStorms.filter((s) => s.isWithinPAR);

  // ============================================================
  // Merge logic: PAGASA > JTWC > GDACS (priority order)
  // ============================================================
  let storms: Storm[] = [];
  let source = "none";

  // --- CASE 1: PAGASA has an active bulletin with position ---
  if (pagasaSignals?.hasActiveBulletin && pagasaSignals.position) {
    const pagasaStorm = pagasaToStormData(pagasaSignals);

    if (pagasaStorm) {
      const localName = pagasaSignals.tcName || pagasaStorm.name;
      const localCategory = pagasaSignals.tcCategory || pagasaStorm.category;

      if (jtwcParStorms.length === 0) {
        // PAGASA only
        storms = [pagasaStorm as unknown as Storm];
        source = "pagasa";
        console.log(`[Storms] Using PAGASA-only storm: ${localName}`);
      } else {
        // Merge PAGASA + JTWC (PAGASA position is authoritative)
        const jtwcStorm = jtwcParStorms[0];
        const windScaleRatio =
          jtwcStorm.windSpeedKph > 0
            ? pagasaStorm.windSpeedKph / jtwcStorm.windSpeedKph
            : 1;
        const clampedRatio = Math.max(0.5, Math.min(1.5, windScaleRatio));

        const mergedForecast = (
          jtwcStorm.forecast.length > 1
            ? jtwcStorm.forecast
            : pagasaStorm.forecast
        ).map((f, idx) => {
          if (idx === 0 || f.time.toLowerCase() === "current") {
            return {
              ...f,
              time: "Current",
              lat: pagasaStorm.lat,
              lng: pagasaStorm.lng,
              windKph: pagasaStorm.windSpeedKph,
            };
          }
          return { ...f, windKph: Math.round(f.windKph * clampedRatio) };
        });

        storms = [
          {
            ...jtwcStorm,
            name: localName,
            category: localCategory || jtwcStorm.category,
            lat: pagasaStorm.lat,
            lng: pagasaStorm.lng,
            windSpeedKph: pagasaStorm.windSpeedKph,
            windSpeedKnots: pagasaStorm.windSpeedKnots,
            pressureHpa: pagasaStorm.pressureHpa,
            direction: pagasaStorm.direction,
            speedKph: pagasaStorm.speedKph,
            distanceKm: pagasaStorm.distanceKm,
            closestApproach: pagasaStorm.closestApproach,
            forecast: mergedForecast,
            uncertaintyCone:
              jtwcStorm.uncertaintyCone.length > 2
                ? jtwcStorm.uncertaintyCone
                : pagasaStorm.uncertaintyCone,
            windRadii:
              jtwcStorm.windRadii.r34 > 0
                ? jtwcStorm.windRadii
                : pagasaStorm.windRadii,
            pastTrack:
              pagasaStorm.pastTrack.length > 0
                ? pagasaStorm.pastTrack
                : jtwcStorm.pastTrack || [],
          },
        ];
        source = "pagasa+jtwc";
        console.log(`[Storms] Merged PAGASA+JTWC: ${localName} @ ${pagasaStorm.lat.toFixed(1)},${pagasaStorm.lng.toFixed(1)}`);
      }
    }
  }
  // --- CASE 2: PAGASA has active bulletin but no parsed position — use JTWC with PAGASA name ---
  else if (pagasaSignals?.hasActiveBulletin && jtwcParStorms.length > 0) {
    const localName = pagasaSignals.tcName || jtwcParStorms[0].name;
    const localCategory = pagasaSignals.tcCategory || jtwcParStorms[0].category;
    storms = [
      {
        ...jtwcParStorms[0],
        name: localName,
        category: localCategory,
      },
    ];
    source = "jtwc+pagasa-name";
    console.log(`[Storms] PAGASA bulletin active (no position), using JTWC for ${localName}`);
  }
  // --- CASE 3: JTWC has PAR storms, PAGASA is clear or unavailable ---
  else if (jtwcParStorms.length > 0) {
    storms = jtwcParStorms;
    source = "jtwc";
    console.log(`[Storms] JTWC-only: ${jtwcParStorms.length} storms in PAR`);
  }
  // --- CASE 4: GDACS fallback — both JTWC and PAGASA failed or returned nothing ---
  else if (gdacsParStorms.length > 0) {
    // Convert GDACS storms to the common Storm format
    storms = gdacsParStorms.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      lat: g.lat,
      lng: g.lng,
      windSpeedKnots: g.windSpeedKnots,
      windSpeedKph: g.windSpeedKph,
      pressureHpa: g.pressureHpa,
      direction: "WNW", // GDACS doesn't provide movement direction
      speedKph: 15, // GDACS doesn't provide movement speed
      distanceKm: g.distanceKm,
      closestApproach: {
        distanceKm: g.distanceKm,
        eta: new Date(Date.now() + 48 * 3600000).toISOString(),
      },
      forecast: [{ time: "Current", lat: g.lat, lng: g.lng, windKph: g.windSpeedKph }],
      pastTrack: [],
      uncertaintyCone: [],
      windRadii: { r34: 0, r50: 0, r64: 0 },
      pubDate: g.pubDate,
    }));
    source = "gdacs";
    console.log(`[Storms] GDACS fallback: ${gdacsParStorms.length} storms in PAR`);
  }

  const parClear = storms.length === 0;

  return { storms, source, parClear, sourcesChecked, sourcesWithData };
}
