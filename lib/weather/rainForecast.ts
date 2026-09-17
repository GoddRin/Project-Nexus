// Tumauini, Isabela project site coordinates (11.3 MW Run-of-River HEPP)
export const SITE_LAT = 17.27;
export const SITE_LON = 121.81;

export interface HourlyRainItem {
  time: string;
  hourLabel: string;
  precipitationMm: number;
  probability: number;
  weatherCode: number;
  weatherDescription: string;
  temperature: number;
}

export interface SiteRainForecast {
  siteLocation: string;
  currentRainMm: number;
  currentRainProbability: number;
  currentWeatherDescription: string;
  currentImpact: {
    level: "CLEAR" | "LIGHT" | "MODERATE" | "HEAVY" | "EXTREME";
    color: string;
    recommendation: string;
  };
  temperature: number;
  relativeHumidity: number;
  windSpeedKph: number;
  surfacePressureHpa: number;
  cloudCoverPercent: number;
  nextRainInMinutes: number | null;
  peakRainMm: number;
  peakRainTime: string;
  total24hRainMm: number;
  hourlyForecast: HourlyRainItem[];
  timestamp: string;
}

export function weatherCodeToDescription(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Clear";
}

export function classifySiteImpact(mmPerHr: number): {
  level: "CLEAR" | "LIGHT" | "MODERATE" | "HEAVY" | "EXTREME";
  color: string;
  recommendation: string;
} {
  if (mmPerHr <= 0) {
    return {
      level: "CLEAR",
      color: "#2DD4BF",
      recommendation: "All operations normal. No precipitation detected.",
    };
  }
  if (mmPerHr <= 2.5) {
    return {
      level: "LIGHT",
      color: "#FBBF24",
      recommendation: "Light rain/drizzle. Slippery surfaces possible. Secure loose electrical gear; monitor slope work.",
    };
  }
  if (mmPerHr <= 7.5) {
    return {
      level: "MODERATE",
      color: "#F97316",
      recommendation: "Moderate rain. Suspend outdoor welding and painting. Reduce crane lifting operations. Inspect trench drainage.",
    };
  }
  if (mmPerHr <= 15) {
    return {
      level: "HEAVY",
      color: "#EF4444",
      recommendation: "Heavy rainfall. Suspend all elevated scaffold work immediately. Evacuate slopes and headrace tunnel portals. Activate dewatering pumps.",
    };
  }
  return {
    level: "EXTREME",
    color: "#DC2626",
    recommendation: "CRITICAL PRECIPITATION / CLOUDBURST. Full site suspension. Execute flash-flood evacuation protocol. All personnel assemble at TEMFACIL higher ground.",
  };
}

export async function fetchSiteRainForecast(): Promise<SiteRainForecast> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", SITE_LAT.toString());
  url.searchParams.set("longitude", SITE_LON.toString());
  url.searchParams.set("timezone", "Asia/Manila");
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,cloud_cover,surface_pressure"
  );
  url.searchParams.set(
    "hourly",
    "precipitation,precipitation_probability,weather_code,temperature_2m"
  );
  url.searchParams.set("forecast_days", "2");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Open-Meteo API returned status ${res.status}`);
  }

  const data = await res.json();
  const current = data.current;
  const currentRainMm = current?.precipitation ?? 0;
  const currentWindSpeed = current?.wind_speed_10m ?? 0;
  const currentPressure = current?.surface_pressure ?? 1013;
  const currentTemp = current?.temperature_2m ?? 28;
  const currentHumidity = current?.relative_humidity_2m ?? 75;
  const currentCloudCover = current?.cloud_cover ?? 0;
  const currentWeatherCode = current?.weather_code ?? 0;
  const currentImpact = classifySiteImpact(currentRainMm);

  const hourlyTimes: string[] = data.hourly?.time ?? [];
  const hourlyPrecip: number[] = data.hourly?.precipitation ?? [];
  const hourlyProb: number[] = data.hourly?.precipitation_probability ?? [];
  const hourlyWeatherCode: number[] = data.hourly?.weather_code ?? [];
  const hourlyTemp: number[] = data.hourly?.temperature_2m ?? [];

  const now = new Date();
  const hourlyForecast: HourlyRainItem[] = [];

  let nextRainInMinutes: number | null = null;
  let peakRainMm = 0;
  let peakRainTime = "";
  let currentRainProbability = 0;

  for (let i = 0; i < Math.min(hourlyTimes.length, 48); i++) {
    const forecastTime = new Date(hourlyTimes[i]);
    const hoursAhead = (forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Track current hour probability (closest hour)
    if (Math.abs(hoursAhead) < 1 && currentRainProbability === 0) {
      currentRainProbability = hourlyProb[i] ?? 0;
    }

    if (forecastTime <= now && hoursAhead < -0.5) continue;
    if (hoursAhead > 24) break;

    const precip = hourlyPrecip[i] ?? 0;
    const prob = hourlyProb[i] ?? 0;
    const wCode = hourlyWeatherCode[i] ?? 0;
    const temp = hourlyTemp[i] ?? 0;

    const timeDate = new Date(hourlyTimes[i]);
    const hourLabel = timeDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });

    hourlyForecast.push({
      time: hourlyTimes[i],
      hourLabel,
      precipitationMm: precip,
      probability: prob,
      weatherCode: wCode,
      weatherDescription: weatherCodeToDescription(wCode),
      temperature: temp,
    });

    if (precip > 0.1 && nextRainInMinutes === null && hoursAhead > 0) {
      nextRainInMinutes = Math.round(hoursAhead * 60);
    }
    if (precip > peakRainMm) {
      peakRainMm = precip;
      peakRainTime = hourLabel;
    }
  }

  // Fallback if current probability wasn't set
  if (currentRainProbability === 0 && hourlyForecast.length > 0) {
    currentRainProbability = hourlyForecast[0].probability;
  }

  const total24hRainMm = hourlyForecast.reduce((sum, h) => sum + h.precipitationMm, 0);

  return {
    siteLocation: "Tumauini HEPP (Barangay Antagan Uno, Isabela)",
    currentRainMm,
    currentRainProbability,
    currentWeatherDescription: weatherCodeToDescription(currentWeatherCode),
    currentImpact,
    temperature: currentTemp,
    relativeHumidity: currentHumidity,
    windSpeedKph: currentWindSpeed,
    surfacePressureHpa: currentPressure,
    cloudCoverPercent: currentCloudCover,
    nextRainInMinutes,
    peakRainMm,
    peakRainTime: peakRainTime || "None expected",
    total24hRainMm: Math.round(total24hRainMm * 10) / 10,
    hourlyForecast,
    timestamp: new Date().toISOString(),
  };
}
