import { unstable_cache } from "next/cache";
import { evaluateDayOperationalStatus, fetchWeather, getWeatherInfo } from "@/lib/weather/fetchWeather";
import { fetchPagasaSignals, type PagasaSignalData } from "@/lib/weather/pagasa";
import { FLAGSHIP } from "./companyFacts";
import { withLastGood } from "./lastGood";
import { CACHE_TAGS, SERVER_TTL, nextRefreshAt } from "./refreshPolicy";
import type { WeatherGlance, WeatherSiteKey } from "./types";
import { glyphForWmo, isNightHour } from "./weatherCodes";

/**
 * The weather glance for one site: conditions now, today's range, the next twelve hours, and for
 * the Tumauini construction site the go / caution / hold verdict the Weather page uses
 * (evaluateDayOperationalStatus). Cached ten minutes per site.
 */

export const WEATHER_SITES: Record<WeatherSiteKey, { name: string; lat: number; lon: number; pagasaAreas: RegExp | null }> = {
  // (the site's own signal comes from PAGASA's siteSignalNumber)
  tumauini: { name: "Tumauini Site", lat: FLAGSHIP.lat, lon: FLAGSHIP.lon, pagasaAreas: null },
  manila: { name: "Manila HQ", lat: 14.5995, lon: 120.9842, pagasaAreas: /\b(metro manila|national capital region|ncr)\b/i },
};

/** The wind signal over a site: Tumauini's own figure, or for Manila the highest level whose listed areas name Metro Manila */
function signalFor(siteKey: WeatherSiteKey, pagasa: PagasaSignalData | null): number {
  if (!pagasa || pagasa.source !== "pagasa" || !pagasa.hasActiveBulletin) return 0;
  if (siteKey === "tumauini") return pagasa.siteSignalNumber || 0;
  const areas = WEATHER_SITES[siteKey].pagasaAreas;
  if (!areas) return 0;
  return pagasa.signals.filter((s) => areas.test(s.affectedAreas)).reduce((max, s) => Math.max(max, s.signalNumber), 0);
}

async function loadGlance(siteKey: WeatherSiteKey): Promise<WeatherGlance> {
  const site = WEATHER_SITES[siteKey];
  const [weather, pagasa] = await Promise.all([
    // (no argument for Tumauini: the same request, and the same fallback, as the Weather page)
    siteKey === "tumauini" ? fetchWeather() : fetchWeather({ lat: site.lat, lon: site.lon }),
    fetchPagasaSignals().catch(() => null),
  ]);
  if (!weather?.current || !weather.daily?.time?.length) throw new Error(`no forecast for ${site.name}`);

  const { current, hourly, daily } = weather;
  // Open-Meteo answers in Asia/Manila local time ("2026-10-05T14:00")
  const nowHour = Number(current.time.slice(11, 13));
  const start = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
  const hours = hourly.time.slice(start, start + 24).map((time, i) => {
    const k = start + i;
    const code = hourly.weather_code[k] ?? 0;
    return {
      time,
      tempC: Math.round(hourly.temperature_2m[k] ?? current.temperature_2m),
      rainChance: Math.round(hourly.precipitation_probability[k] ?? 0),
      rainMm: Math.round((hourly.precipitation?.[k] ?? 0) * 10) / 10,
      windKph: Math.round(hourly.wind_speed_10m?.[k] ?? 0),
      code,
      icon: glyphForWmo(code, isNightHour(Number(time.slice(11, 13)))),
    };
  });

  const signal = signalFor(siteKey, pagasa);
  const stormName = pagasa?.hasActiveBulletin && pagasa.tcName ? pagasa.tcName : undefined;
  const glance: WeatherGlance = {
    siteKey,
    site: { name: site.name, lat: site.lat, lon: site.lon },
    now: {
      tempC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      humidity: Math.round(current.relative_humidity_2m),
      windKph: Math.round(current.wind_speed_10m),
      windDir: Math.round(current.wind_direction_10m),
      precipMm: Math.round((current.precipitation ?? 0) * 10) / 10,
      code: current.weather_code,
      label: getWeatherInfo(current.weather_code).conditionLabel,
      icon: glyphForWmo(current.weather_code, isNightHour(nowHour)),
      isNight: isNightHour(nowHour),
    },
    today: {
      maxC: Math.round(daily.temperature_2m_max[0]),
      minC: Math.round(daily.temperature_2m_min[0]),
      rainChance: Math.round(daily.precipitation_probability_max[0] ?? 0),
      rainMm: Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
    },
    hours,
    bulletin: {
      available: pagasa?.source === "pagasa",
      active: pagasa?.source === "pagasa" && !!pagasa.hasActiveBulletin,
      stormName,
    },
    status: { source: "Weather forecast · PAGASA", updatedAt: new Date().toISOString(), ok: true, nextRefreshAt: nextRefreshAt(SERVER_TTL.weather) },
  };

  if (siteKey === "tumauini") {
    const day = evaluateDayOperationalStatus({ dayIndex: 0, weather, siteSignalNumber: signal, isToday: true });
    glance.operational = {
      verdict: day.intent === "favorable" ? "GO" : day.intent === "caution" ? "CAUTION" : "HOLD",
      headline: day.conditionLabel,
      detail: day.operationalGuidance,
      dayShiftMm: Math.round(day.dayShiftPrecipMm * 10) / 10,
      nightShiftMm: Math.round(day.nightShiftPrecipMm * 10) / 10,
      dayShiftMaxWindKph: Math.round(day.dayShiftMaxWindKph),
      peakRainWindow: day.peakRainWindow,
    };
  }
  if (signal >= 1) {
    glance.alert = {
      level: signal >= 3 ? "RED" : signal === 2 ? "ORANGE" : "YELLOW",
      signal,
      stormName,
      message: `Tropical Cyclone Wind Signal No. ${signal} is up over ${siteKey === "tumauini" ? "the Tumauini site" : "Metro Manila"}${stormName ? ` (${stormName})` : ""}.`,
    };
  }
  return glance;
}

const cached: Record<WeatherSiteKey, () => Promise<WeatherGlance>> = {
  tumauini: unstable_cache(() => loadGlance("tumauini"), ["home-weather-glance", "tumauini", "v2"], {
    revalidate: SERVER_TTL.weather,
    tags: [CACHE_TAGS.weather, `${CACHE_TAGS.weather}:tumauini`],
  }),
  manila: unstable_cache(() => loadGlance("manila"), ["home-weather-glance", "manila", "v2"], {
    revalidate: SERVER_TTL.weather,
    tags: [CACHE_TAGS.weather, `${CACHE_TAGS.weather}:manila`],
  }),
};

/** Null only when the forecast has never loaded on this server; otherwise the last good copy, marked not-ok */
export async function getWeatherGlance(siteKey: WeatherSiteKey = "tumauini"): Promise<WeatherGlance | null> {
  const { data, ok } = await withLastGood(`weather:${siteKey}`, cached[siteKey]);
  if (!data) return null;
  return ok ? data : { ...data, status: { ...data.status, ok: false } };
}
