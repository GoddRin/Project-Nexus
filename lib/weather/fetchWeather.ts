import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, LucideIcon, CloudDrizzle } from "lucide-react";

export interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
}

export interface HistoricalWeatherData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

export interface WeatherRecommendation {
  label: string;
  intent: "favorable" | "caution" | "suspend";
  icon: LucideIcon;
  conditionLabel: string;
}

export function getWeatherInfo(code: number): WeatherRecommendation {
  // Clear sky
  if (code === 0 || code === 1) {
    return {
      label: "Favorable for all outdoor work",
      intent: "favorable",
      icon: Sun,
      conditionLabel: code === 0 ? "Clear sky" : "Mainly clear",
    };
  }
  // Partly cloudy / Overcast
  if (code === 2 || code === 3) {
    return {
      label: "Good conditions, monitor afternoon weather",
      intent: "favorable",
      icon: Cloud,
      conditionLabel: code === 2 ? "Partly cloudy" : "Overcast",
    };
  }
  // Fog
  if (code === 45 || code === 48) {
    return {
      label: "Reduced visibility — crane/elevated work not recommended",
      intent: "caution",
      icon: CloudFog,
      conditionLabel: "Fog",
    };
  }
  // Drizzle
  if (code === 51 || code === 53 || code === 55) {
    return {
      label: "Light precipitation — concrete work not recommended",
      intent: "caution",
      icon: CloudDrizzle,
      conditionLabel: "Drizzle",
    };
  }
  // Rain (slight or showers slight)
  if (code === 61 || code === 80) {
    return {
      label: "Outdoor work with caution — secure materials",
      intent: "caution",
      icon: CloudRain,
      conditionLabel: "Light Rain",
    };
  }
  // Rain (moderate/heavy)
  if (code === 63 || code === 65 || code === 81 || code === 82) {
    return {
      label: "Suspend outdoor work — implement weather protocols",
      intent: "suspend",
      icon: CloudRain,
      conditionLabel: "Moderate/Heavy Rain",
    };
  }
  // Thunderstorm
  if (code === 95 || code === 96 || code === 99) {
    return {
      label: "HALT ALL OUTDOOR WORK — lightning hazard",
      intent: "suspend",
      icon: CloudLightning,
      conditionLabel: "Thunderstorm",
    };
  }
  // Snow (fallbacks just in case)
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return {
      label: "Suspend outdoor work — unusual conditions",
      intent: "suspend",
      icon: CloudSnow,
      conditionLabel: "Snow/Ice",
    };
  }

  // Fallback
  return {
    label: "Conditions unknown, proceed with caution",
    intent: "caution",
    icon: Cloud,
    conditionLabel: "Unknown",
  };
}

interface WttrHourlyData {
  chanceofrain?: string;
  weatherCode: string;
  tempC: string;
  precipMM?: string;
}

interface WttrWeatherData {
  date: string;
  maxtempC: string;
  mintempC: string;
  totalSnow_cm?: string;
  hourly: WttrHourlyData[];
}

function mapWwoCodeToWmo(wwoCode: number): number {
  if (wwoCode === 113) return 0;
  if (wwoCode === 116) return 2;
  if (wwoCode === 119 || wwoCode === 122) return 3;
  if (wwoCode === 143 || wwoCode === 248 || wwoCode === 260) return 45;
  if (wwoCode === 263 || wwoCode === 266 || wwoCode === 281 || wwoCode === 284) return 51;
  if (wwoCode === 176 || wwoCode === 293 || wwoCode === 296 || wwoCode === 353) return 61;
  if (wwoCode === 302 || wwoCode === 356) return 63;
  if (wwoCode === 305 || wwoCode === 308 || wwoCode === 359 || wwoCode === 389) return 65;
  if (wwoCode === 386 || wwoCode === 392 || wwoCode === 395) return 95;
  return 0;
}


async function fetchWeatherFromWttr(): Promise<WeatherData | null> {
  const url = "https://wttr.in/Tumauini?format=j1";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("wttr.in API returned an error:", res.status, res.statusText);
      return null;
    }
    const wttrData = await res.json();
    if (!wttrData || !wttrData.current_condition || !wttrData.weather) {
      console.error("wttr.in returned unexpected data format");
      return null;
    }

    const currentCondition = wttrData.current_condition[0];
    const current = {
      time: new Date().toISOString(),
      temperature_2m: parseFloat(currentCondition.temp_C),
      relative_humidity_2m: parseFloat(currentCondition.humidity),
      apparent_temperature: parseFloat(currentCondition.FeelsLikeC),
      precipitation: parseFloat(currentCondition.precipMM || "0"),
      weather_code: mapWwoCodeToWmo(parseInt(currentCondition.weatherCode)),
      wind_speed_10m: parseFloat(currentCondition.windspeedKmph),
      wind_direction_10m: parseFloat(currentCondition.winddirDegree),
    };

    const hourlyTime: string[] = [];
    const hourlyTemp: number[] = [];
    const hourlyPrecipProb: number[] = [];
    const hourlyCode: number[] = [];

    const dailyTime: string[] = [];
    const dailyCode: number[] = [];
    const dailyTempMax: number[] = [];
    const dailyTempMin: number[] = [];
    const dailyPrecipSum: number[] = [];
    const dailyPrecipProbMax: number[] = [];

    const len = wttrData.weather.length;
    for (let i = 0; i < len; i++) {
      const day = wttrData.weather[i] as WttrWeatherData;
      dailyTime.push(day.date);
      
      const maxProb = Math.max(...day.hourly.map((h) => parseFloat(h.chanceofrain || "0")));
      const codes = day.hourly.map((h) => mapWwoCodeToWmo(parseInt(h.weatherCode)));
      const modeCode = codes.reduce((a, b, _, arr) => 
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      , codes[0]);

      dailyCode.push(modeCode);
      dailyTempMax.push(parseFloat(day.maxtempC));
      dailyTempMin.push(parseFloat(day.mintempC));
      dailyPrecipSum.push(Number(day.hourly.reduce((sum, h) => sum + parseFloat(h.precipMM || "0"), 0).toFixed(1)));
      dailyPrecipProbMax.push(maxProb);

      for (let h = 0; h < 24; h++) {
        const formattedHour = String(h).padStart(2, "0");
        hourlyTime.push(`${day.date}T${formattedHour}:00`);
        
        const hourlyIndex = Math.floor(h / 3);
        const hData = day.hourly[hourlyIndex] || day.hourly[day.hourly.length - 1];
        
        hourlyTemp.push(parseFloat(hData.tempC));
        hourlyPrecipProb.push(parseFloat(hData.chanceofrain || "0"));
        hourlyCode.push(mapWwoCodeToWmo(parseInt(hData.weatherCode)));
      }
    }

    return {
      current,
      hourly: {
        time: hourlyTime,
        temperature_2m: hourlyTemp,
        precipitation_probability: hourlyPrecipProb,
        weather_code: hourlyCode,
      },
      daily: {
        time: dailyTime,
        weather_code: dailyCode,
        temperature_2m_max: dailyTempMax,
        temperature_2m_min: dailyTempMin,
        precipitation_sum: dailyPrecipSum,
        precipitation_probability_max: dailyPrecipProbMax,
      }
    } as WeatherData;
  } catch (error) {
    console.error("Failed to fetch weather from wttr.in fallback:", error);
    return null;
  }
}

export async function fetchWeather(): Promise<WeatherData | null> {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=16.9833&longitude=122.0833&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FManila&forecast_days=7";

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn("Open-Meteo API returned an error, falling back to wttr.in:", res.status, res.statusText);
      return await fetchWeatherFromWttr();
    }
    const data = await res.json();
    return data as WeatherData;
  } catch (error) {
    console.warn("Failed to fetch weather data from Open-Meteo, falling back to wttr.in:", error);
    return await fetchWeatherFromWttr();
  }
}

export async function fetchHistoricalWeather(): Promise<HistoricalWeatherData | null> {
  const end = new Date();
  end.setDate(end.getDate() - 1); // Yesterday
  const start = new Date(end);
  start.setDate(start.getDate() - 365); // 365 days before yesterday

  // Format YYYY-MM-DD
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDate = format(start);
  const endDate = format(end);

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=16.9833&longitude=122.0833&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Asia%2FManila`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      console.error("Open-Meteo Archive API returned an error:", res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    return data as HistoricalWeatherData;
  } catch (error) {
    console.error("Failed to fetch historical weather data:", error);
    return null;
  }
}
