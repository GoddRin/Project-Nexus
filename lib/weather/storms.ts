import { calculateDistance } from "@/lib/weather/distance";
import { fetchActiveStorms, Storm } from "@/lib/weather/jtwc";
import { fetchPagasaSignals, pagasaToStormData } from "@/lib/weather/pagasa";

// Tumauini HEPP Coordinates
const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

export interface MergedStormsResult {
  storms: Storm[];
  source: string;
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
    return { storms: mockStorms, source: "mocked" };
  }

  // Fetch JTWC and PAGASA data in parallel
  const [jtwcStorms, pagasaSignals] = await Promise.all([
    fetchActiveStorms(),
    fetchPagasaSignals(),
  ]);

  let storms = jtwcStorms;
  let source = "jtwc";

  if (pagasaSignals.hasActiveBulletin && pagasaSignals.position) {
    const pagasaStorm = pagasaToStormData(pagasaSignals);

    if (pagasaStorm) {
      // Always use PAGASA local name (e.g., "INDAY") instead of JTWC international name (e.g., "BAVI")
      const localName = pagasaSignals.tcName || pagasaStorm.name;
      const localCategory = pagasaSignals.tcCategory || pagasaStorm.category;

      if (storms.length === 0) {
        // JTWC failed/empty but PAGASA has active TC — use PAGASA data
        storms = [pagasaStorm as unknown as Storm];
        source = "pagasa";
        console.log(`Storms Helper: JTWC empty, using PAGASA storm data for ${localName}`);
      } else {
        // Both have data — ALWAYS prefer PAGASA position since it's the local authority
        const jtwcStorm = storms[0];
        
        // If PAGASA has valid coordinates, ALWAYS use them
        const usePagasaPos = pagasaStorm.lat > 0 && pagasaStorm.lng > 0;
        
        if (usePagasaPos) {
          const posDiff = calculateDistance(jtwcStorm.lat, jtwcStorm.lng, pagasaStorm.lat, pagasaStorm.lng);
          console.log(
            `Storms Helper: Using PAGASA position (${pagasaStorm.lat.toFixed(1)},${pagasaStorm.lng.toFixed(1)}) over JTWC (${jtwcStorm.lat.toFixed(1)},${jtwcStorm.lng.toFixed(1)}), diff: ${posDiff.toFixed(0)}km`
          );

          // Get JTWC's current forecast point to calculate scale ratio
          const jtwcCurrentFc = jtwcStorm.forecast.find(f => f.time.toLowerCase() === "current") || jtwcStorm.forecast[0];
          const jtwcCurrentWind = jtwcCurrentFc ? jtwcCurrentFc.windKph : jtwcStorm.windSpeedKph;
          
          // Calculate wind scale ratio so the forecast profile scales down/up proportionally
          const windScaleRatio = jtwcCurrentWind > 0 ? (pagasaStorm.windSpeedKph / jtwcCurrentWind) : 1;
          // Clamp ratio between 0.5 and 1.5 to keep it realistic
          const clampedRatio = Math.max(0.5, Math.min(1.5, windScaleRatio));

          // Merge and scale forecast
          const mergedForecast = (jtwcStorm.forecast.length > 1 ? jtwcStorm.forecast : pagasaStorm.forecast).map((f, idx) => {
            const isCurrent = idx === 0 || f.time.toLowerCase() === "current";
            if (isCurrent) {
              return {
                ...f,
                time: "Current",
                lat: pagasaStorm.lat,
                lng: pagasaStorm.lng,
                windKph: pagasaStorm.windSpeedKph,
              };
            } else {
              // Scale the predicted wind speeds proportionally and round to nearest integer
              return {
                ...f,
                windKph: Math.round(f.windKph * clampedRatio),
              };
            }
          });

          storms = [{
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
            uncertaintyCone: jtwcStorm.uncertaintyCone.length > 2
              ? jtwcStorm.uncertaintyCone
              : pagasaStorm.uncertaintyCone,
            windRadii: jtwcStorm.windRadii.r34 > 0 ? jtwcStorm.windRadii : pagasaStorm.windRadii,
            pastTrack: pagasaStorm.pastTrack.length > 0 ? pagasaStorm.pastTrack : (jtwcStorm.pastTrack || []),
          }];
          source = "pagasa+jtwc";
        } else {
          // PAGASA position not available — use JTWC but with PAGASA name
          const mergedForecast = jtwcStorm.forecast.map((f, idx) => {
            const isCurrent = idx === 0 || f.time.toLowerCase() === "current";
            if (isCurrent) {
              return {
                ...f,
                time: "Current",
                lat: jtwcStorm.lat,
                lng: jtwcStorm.lng,
                windKph: jtwcStorm.windSpeedKph,
              };
            }
            return f;
          });

          storms[0] = {
            ...storms[0],
            name: localName,
            category: localCategory || storms[0].category,
            forecast: mergedForecast,
          };
          source = "jtwc+pagasa";
        }
      }
    }
  }

  return { storms, source };
}
