import { calculateDistance } from "@/lib/weather/distance";
import { fetchActiveStorms, Storm } from "@/lib/weather/jtwc";
import { fetchPagasaSignals, pagasaToStormData } from "@/lib/weather/pagasa";
import { fetchGdacsStorms, isWithinPAR, GdacsStorm } from "@/lib/weather/gdacs";
import { fetchPanahonCycloneTrackStorms } from "@/lib/weather/panahon";

// Tumauini HEPP Coordinates
const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

/**
 * Determines if a tropical cyclone is relevant to the Philippines and should be rendered.
 * 
 * Relevant criteria:
 * 1. Currently inside the Philippine Area of Responsibility (PAR).
 * 2. Forecast track passes through or approaches inside PAR.
 * 3. Located in the Eastern Approach Corridor (Philippine Sea / Western Pacific: lng >= 115°E to 155°E, lat 0°N to 30°N)
 *    and within reasonable monitoring distance (< 3,500 km).
 * 
 * Unrelated (FILTERED OUT):
 * - Systems west of PAR (lng < 115°E, e.g. Gulf of Tonkin, Vietnam, Hainan, South China inland)
 *   moving further inland/away from the Philippines.
 * - Systems outside the Western Pacific approach domain (e.g. Southern Hemisphere, Indian Ocean, far North Pacific > 30°N).
 */
export function isRelevantToPhilippines(storm: Partial<Storm>): boolean {
  const lat = storm.lat ?? 0;
  const lng = storm.lng ?? 0;

  // 1. If currently inside PAR, definitely relevant
  if (storm.isWithinPAR || isWithinPAR(lat, lng)) {
    return true;
  }

  // 2. If any forecast point enters PAR, definitely relevant
  if (storm.forecast?.some((f) => isWithinPAR(f.lat, f.lng))) {
    return true;
  }

  // 3. Reject storms located west of the Philippines (lng < 115°E, e.g. Vietnam, Gulf of Tonkin, Laos, Thailand)
  if (lng < 115) {
    return false;
  }

  // 4. Must be in the Tropical / Subtropical Northwest Pacific Approach Corridor
  // (lat 0°N to 30°N, lng 115°E to 155°E) and within 3,500 km
  const inNorthwestPacificApproach =
    lng >= 115 && lng <= 155 && lat >= 0 && lat <= 30;

  const distance = storm.distanceKm ?? calculateDistance(lat, lng, SITE_LAT, SITE_LNG);
  if (inNorthwestPacificApproach && distance <= 3500) {
    return true;
  }

  return false;
}

export interface MergedStormsResult {
  storms: Storm[];
  parStorms: Storm[];
  regionalStorms: Storm[];
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
          { time: "Current", timestamp: new Date().toISOString(), lat: 18.4, lng: 129.8, windKph: 165, windKnots: 89, category: "Typhoon", categoryCode: "TY", distanceKm: Math.round(calculateDistance(18.4, 129.8, SITE_LAT, SITE_LNG)) },
          { time: "+12h", timestamp: new Date(Date.now() + 12 * 3600000).toISOString(), lat: 19.6, lng: 128.5, windKph: 194, windKnots: 105, category: "Typhoon", categoryCode: "TY", distanceKm: Math.round(calculateDistance(19.6, 128.5, SITE_LAT, SITE_LNG)) },
          { time: "+24h", timestamp: new Date(Date.now() + 24 * 3600000).toISOString(), lat: 21.1, lng: 127.0, windKph: 204, windKnots: 110, category: "Typhoon", categoryCode: "TY", distanceKm: Math.round(calculateDistance(21.1, 127.0, SITE_LAT, SITE_LNG)) },
          { time: "+36h", timestamp: new Date(Date.now() + 36 * 3600000).toISOString(), lat: 23.1, lng: 125.5, windKph: 185, windKnots: 100, category: "Typhoon", categoryCode: "TY", distanceKm: Math.round(calculateDistance(23.1, 125.5, SITE_LAT, SITE_LNG)) },
          { time: "+48h", timestamp: new Date(Date.now() + 48 * 3600000).toISOString(), lat: 25.2, lng: 123.5, windKph: 176, windKnots: 95, category: "Typhoon", categoryCode: "TY", distanceKm: Math.round(calculateDistance(25.2, 123.5, SITE_LAT, SITE_LNG)) },
          { time: "+72h", timestamp: new Date(Date.now() + 72 * 3600000).toISOString(), lat: 29.3, lng: 119.0, windKph: 111, windKnots: 60, category: "Severe Tropical Storm", categoryCode: "STS", distanceKm: Math.round(calculateDistance(29.3, 119.0, SITE_LAT, SITE_LNG)) },
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
        isWithinPAR: true,
      },
    ];
    return {
      storms: mockStorms,
      parStorms: mockStorms,
      regionalStorms: [],
      source: "mocked",
      parClear: false,
      sourcesChecked: ["mock"],
      sourcesWithData: ["mock"],
    };
  }

  // ============================================================
  // Fetch all four sources in parallel
  // ============================================================
  const [jtwcResult, pagasaResult, gdacsResult, panahonTrackResult] = await Promise.allSettled([
    fetchActiveStorms(),
    fetchPagasaSignals(),
    fetchGdacsStorms(),
    fetchPanahonCycloneTrackStorms(),
  ]);

  const jtwcStorms: Storm[] =
    jtwcResult.status === "fulfilled" ? jtwcResult.value : [];
  const pagasaSignals =
    pagasaResult.status === "fulfilled" ? pagasaResult.value : null;
  const gdacsStorms: GdacsStorm[] =
    gdacsResult.status === "fulfilled" ? gdacsResult.value : [];
  const panahonTrackStorms: Storm[] =
    panahonTrackResult.status === "fulfilled" ? panahonTrackResult.value : [];

  const sourcesChecked: string[] = [];
  const sourcesWithData: string[] = [];

  if (jtwcResult.status === "fulfilled") sourcesChecked.push("jtwc");
  if (pagasaResult.status === "fulfilled") sourcesChecked.push("pagasa");
  if (gdacsResult.status === "fulfilled") sourcesChecked.push("gdacs");
  if (panahonTrackResult.status === "fulfilled") sourcesChecked.push("panahon");

  if (jtwcStorms.length > 0) sourcesWithData.push("jtwc");
  if (pagasaSignals?.hasActiveBulletin) sourcesWithData.push("pagasa");
  if (gdacsStorms.length > 0) sourcesWithData.push("gdacs");
  if (panahonTrackStorms.length > 0) sourcesWithData.push("panahon");

  // Log all sources for debugging
  console.log(`[Storms] JTWC: ${jtwcStorms.length} | PAGASA active: ${pagasaSignals?.hasActiveBulletin ?? "error"} | GDACS: ${gdacsStorms.length} | PANaHON Track: ${panahonTrackStorms.length}`);

  // Filter storms strictly to those relevant to the Philippines (Inside PAR or in Eastern Approach Corridor)
  const relevantJtwcStorms = jtwcStorms.filter((s) => isRelevantToPhilippines(s));
  const jtwcParStorms = relevantJtwcStorms.filter((s) => isWithinPAR(s.lat, s.lng));
  const jtwcRegionalStorms = relevantJtwcStorms.filter((s) => !isWithinPAR(s.lat, s.lng));

  // Separate GDACS storms into PAR vs Regional (filtered to Philippines relevance)
  const relevantGdacsStorms = gdacsStorms.filter((s) => isRelevantToPhilippines(s as unknown as Storm));
  const gdacsParStorms = relevantGdacsStorms.filter((s) => s.isWithinPAR);
  const gdacsRegionalStorms = relevantGdacsStorms.filter((s) => !s.isWithinPAR);

  // ============================================================
  // Merge logic: PAGASA > JTWC > GDACS > PANaHON
  // ============================================================
  let parStorms: Storm[] = [];
  let regionalStorms: Storm[] = [...jtwcRegionalStorms];
  let source = "none";

  // --- CASE 1: PAGASA has an active bulletin with position ---
  if (pagasaSignals?.hasActiveBulletin && pagasaSignals.position) {
    const pagasaStorm = pagasaToStormData(pagasaSignals);

    if (pagasaStorm) {
      const localName = pagasaSignals.tcName || pagasaStorm.name;
      const localCategory = pagasaSignals.tcCategory || pagasaStorm.category;

      if (jtwcParStorms.length === 0) {
        // PAGASA only for PAR
        parStorms = [{ ...(pagasaStorm as unknown as Storm), isWithinPAR: true }];
        source = "pagasa";
        console.log(`[Storms] Using PAGASA-only storm in PAR: ${localName}`);
      } else {
        // Merge PAGASA + JTWC (PAGASA position is authoritative)
        const jtwcStorm = jtwcParStorms[0];
        const windScaleRatio =
          jtwcStorm.windSpeedKph > 0
            ? pagasaStorm.windSpeedKph / jtwcStorm.windSpeedKph
            : 1;
        const clampedRatio = Math.max(0.5, Math.min(1.5, windScaleRatio));

        const mergedForecast = (
          pagasaStorm.forecast && pagasaStorm.forecast.length > 1
            ? pagasaStorm.forecast
            : jtwcStorm.forecast
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

        parStorms = [
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
            isWithinPAR: true,
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
    parStorms = [
      {
        ...jtwcParStorms[0],
        name: localName,
        category: localCategory,
        isWithinPAR: true,
      },
    ];
    source = "jtwc+pagasa-name";
    console.log(`[Storms] PAGASA bulletin active (no position), using JTWC for ${localName}`);
  }
  // --- CASE 3: JTWC has PAR storms, PAGASA is clear or unavailable ---
  else if (jtwcParStorms.length > 0) {
    parStorms = jtwcParStorms.map((s) => ({ ...s, isWithinPAR: true }));
    source = "jtwc";
    console.log(`[Storms] JTWC-only: ${jtwcParStorms.length} storms in PAR`);
  }
  // --- CASE 4: GDACS fallback for PAR ---
  else if (gdacsParStorms.length > 0) {
    parStorms = gdacsParStorms.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      lat: g.lat,
      lng: g.lng,
      windSpeedKnots: g.windSpeedKnots,
      windSpeedKph: g.windSpeedKph,
      pressureHpa: g.pressureHpa,
      direction: "WNW",
      speedKph: 15,
      distanceKm: g.distanceKm,
      closestApproach: {
        distanceKm: g.distanceKm,
        eta: new Date(Date.now() + 48 * 3600000).toISOString(),
      },
      forecast: [{ time: "Current", lat: g.lat, lng: g.lng, windKph: g.windSpeedKph }],
      pastTrack: [],
      uncertaintyCone: [],
      windRadii: { r34: 0, r50: 0, r64: 0 },
      isWithinPAR: true,
      pubDate: g.pubDate,
    }));
    source = "gdacs";
    console.log(`[Storms] GDACS fallback: ${gdacsParStorms.length} storms in PAR`);
  }
  // --- CASE 5: PANaHON Track (only if active system within PAR) ---
  else if (panahonTrackStorms.length > 0 && panahonTrackStorms.some((s) => s.isWithinPAR)) {
    parStorms = panahonTrackStorms.filter((s) => s.isWithinPAR);
    source = "panahon";
    console.log(`[Storms] Using PANaHON track for active system in PAR: ${parStorms[0].name}`);
  } else {
    // PAR is clear!
    if (jtwcRegionalStorms.length > 0) {
      source = "jtwc-regional";
    } else if (pagasaSignals?.source === "pagasa") {
      source = "pagasa-clear";
    } else {
      source = "clear";
    }
  }

  // Combine storms: PAR storms first, followed by Regional storms sorted by distance
  const allStorms = [
    ...parStorms.map((s) => ({ ...s, isWithinPAR: true })),
    ...regionalStorms.map((s) => ({ ...s, isWithinPAR: false })),
  ];

  // PAR is strictly clear if no active tropical cyclones are inside PAR
  const parClear =
    parStorms.length === 0 ||
    parStorms.every((s) => s.category.toLowerCase().includes("low pressure"));

  // Add alias fields (latitude, longitude, maxWinds, maxWindsKph) to guarantee compatibility across all client apps
  const enrichedStorms = allStorms.map((s) => ({
    ...s,
    latitude: s.lat,
    longitude: s.lng,
    maxWinds: s.windSpeedKph,
    maxWindsKph: s.windSpeedKph,
  }));

  const enrichedParStorms = parStorms.map((s) => ({
    ...s,
    latitude: s.lat,
    longitude: s.lng,
    maxWinds: s.windSpeedKph,
    maxWindsKph: s.windSpeedKph,
    isWithinPAR: true,
  }));

  const enrichedRegionalStorms = regionalStorms.map((s) => ({
    ...s,
    latitude: s.lat,
    longitude: s.lng,
    maxWinds: s.windSpeedKph,
    maxWindsKph: s.windSpeedKph,
    isWithinPAR: false,
  }));

  return {
    storms: enrichedStorms as any,
    parStorms: enrichedParStorms as any,
    regionalStorms: enrichedRegionalStorms as any,
    source,
    parClear,
    sourcesChecked,
    sourcesWithData,
  };
}
