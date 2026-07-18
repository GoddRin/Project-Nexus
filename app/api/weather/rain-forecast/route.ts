import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tumauini, Isabela project site coordinates
const SITE_LAT = 17.27;
const SITE_LON = 121.81;

// WMO Weather interpretation codes
function weatherCodeToDescription(code: number): string {
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
  return map[code] || "Unknown";
}

function classifySiteImpact(mmPerHr: number): {
  level: string;
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
      recommendation:
        "Monitor conditions. Slippery surfaces possible. Secure loose materials.",
    };
  }
  if (mmPerHr <= 7.5) {
    return {
      level: "MODERATE",
      color: "#F97316",
      recommendation:
        "Suspend outdoor welding and painting. Reduce crane operations. Check drainage.",
    };
  }
  if (mmPerHr <= 15) {
    return {
      level: "HEAVY",
      color: "#EF4444",
      recommendation:
        "Suspend all elevated work immediately. Evacuate slopes and tunnel faces. Activate pumps.",
    };
  }
  return {
    level: "EXTREME",
    color: "#DC2626",
    recommendation:
      "FULL SITE SUSPENSION. Execute emergency evacuation protocol. All personnel to safe zones.",
  };
}

export async function GET() {
  try {
    // Fetch from Open-Meteo: current weather + 48h hourly forecast
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
      throw new Error(`Open-Meteo API returned ${res.status}`);
    }

    const data = await res.json();

    // Parse current conditions
    const current = data.current;
    const currentRainMm = current?.precipitation ?? 0;
    const currentWindSpeed = current?.wind_speed_10m ?? 0;
    const currentPressure = current?.surface_pressure ?? 0;
    const currentImpact = classifySiteImpact(currentRainMm);

    // Parse hourly forecast (next 24 hours only)
    const hourlyTimes: string[] = data.hourly?.time ?? [];
    const hourlyPrecip: number[] = data.hourly?.precipitation ?? [];
    const hourlyProb: number[] =
      data.hourly?.precipitation_probability ?? [];
    const hourlyWeatherCode: number[] = data.hourly?.weather_code ?? [];
    const hourlyTemp: number[] = data.hourly?.temperature_2m ?? [];

    const now = new Date();
    const hourlyForecast: Array<{
      time: string;
      precipitationMm: number;
      probability: number;
      weatherCode: number;
      weatherDescription: string;
      temperature: number;
    }> = [];

    // Find the next rain event
    let nextRainInMinutes: number | null = null;
    let peakRainMm = 0;
    let peakRainTime = "";

    for (let i = 0; i < Math.min(hourlyTimes.length, 48); i++) {
      const forecastTime = new Date(hourlyTimes[i]);
      // Only include future hours, up to 24h
      if (forecastTime <= now) continue;

      const hoursAhead =
        (forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursAhead > 24) break;

      const precip = hourlyPrecip[i] ?? 0;
      const prob = hourlyProb[i] ?? 0;
      const wCode = hourlyWeatherCode[i] ?? 0;
      const temp = hourlyTemp[i] ?? 0;

      hourlyForecast.push({
        time: hourlyTimes[i],
        precipitationMm: precip,
        probability: prob,
        weatherCode: wCode,
        weatherDescription: weatherCodeToDescription(wCode),
        temperature: temp,
      });

      // Track next rain and peak
      if (precip > 0.1 && nextRainInMinutes === null) {
        nextRainInMinutes = Math.round(hoursAhead * 60);
      }
      if (precip > peakRainMm) {
        peakRainMm = precip;
        peakRainTime = hourlyTimes[i];
      }
    }

    // Compute upcoming worst-case impact (max rain in next 3 hours)
    const next3hPrecip = hourlyForecast
      .slice(0, 3)
      .reduce((max, h) => Math.max(max, h.precipitationMm), 0);
    const upcomingImpact = classifySiteImpact(next3hPrecip);

    // Total rainfall expected in next 24h
    const total24hMm = hourlyForecast.reduce(
      (sum, h) => sum + h.precipitationMm,
      0
    );

    const response = {
      // Current conditions
      currentRainMm,
      currentWeatherCode: current?.weather_code ?? 0,
      currentWeatherDescription: weatherCodeToDescription(
        current?.weather_code ?? 0
      ),
      temperature: current?.temperature_2m ?? 0,
      humidity: current?.relative_humidity_2m ?? 0,
      windSpeed: currentWindSpeed,
      pressure: Math.round(currentPressure),
      cloudCover: current?.cloud_cover ?? 0,

      // Site impact
      currentImpact,
      upcomingImpact,

      // Rain prediction
      nextRainInMinutes,
      peakRainMm,
      peakRainTime,
      total24hMm: Math.round(total24hMm * 10) / 10,

      // Hourly timeline
      hourlyForecast,

      // Meta
      siteName: "Tumauini HEPP",
      coordinates: { lat: SITE_LAT, lon: SITE_LON },
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching rain forecast:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: errMsg,
        currentRainMm: 0,
        currentImpact: {
          level: "UNKNOWN",
          color: "#6B7280",
          recommendation: "Unable to fetch weather data.",
        },
        upcomingImpact: {
          level: "UNKNOWN",
          color: "#6B7280",
          recommendation: "Unable to fetch weather data.",
        },
        hourlyForecast: [],
        nextRainInMinutes: null,
        fetchedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
