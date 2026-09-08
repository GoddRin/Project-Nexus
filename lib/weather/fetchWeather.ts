import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, LucideIcon, CloudDrizzle, Wind } from "lucide-react";

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
    precipitation?: number[];
    rain?: number[];
    showers?: number[];
    wind_speed_10m?: number[];
    relative_humidity_2m?: number[];
    apparent_temperature?: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    precipitation_hours?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
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

export interface ShiftForecast {
  period: "day" | "night";
  shiftName: string; // "Day Shift" | "Night Shift"
  timeRange: string; // "07:00 – 16:00" | "19:00 – 04:00"
  label: string;
  precipSumMm: number;
  precipProbMax: number;
  tempAvg: number;
  maxWindKph: number;
  hasStorm: boolean;
  code: number;
  icon: LucideIcon;
  iconName: string;
  rainWindow: string | null;
}

export interface DayOperationalEvaluation {
  dayIndex: number;
  dateStr: string;
  isToday: boolean;
  intent: "favorable" | "caution" | "suspend";
  badgeLabel: "Favorable" | "Caution" | "Suspend";
  conditionLabel: string;
  operationalGuidance: string;
  rainfallExpectedMm: number;
  rainfallText: string;
  peakRainWindow: string | null;
  dayShiftPrecipMm: number;
  nightShiftPrecipMm: number;
  dayShiftMaxWindKph: number;
  tempMax: number;
  tempMin: number;
  icon: LucideIcon;
  iconName: string;
  shiftBreakdown: {
    dayShift: ShiftForecast;   // 07:00 – 16:00 (7 AM - 4 PM)
    nightShift: ShiftForecast; // 19:00 – 04:00 (7 PM - 4 AM)
  };
}

export type SerializableShiftForecast = Omit<ShiftForecast, "icon">;

export type SerializableDayOperationalEvaluation = Omit<DayOperationalEvaluation, "icon" | "shiftBreakdown"> & {
  shiftBreakdown: {
    dayShift: SerializableShiftForecast;
    nightShift: SerializableShiftForecast;
  };
};

export function toSerializableEvaluation(evalData: DayOperationalEvaluation): SerializableDayOperationalEvaluation {
  const { icon: _icon, shiftBreakdown, ...rest } = evalData;
  const { icon: _dIcon, ...dayShiftRest } = shiftBreakdown.dayShift;
  const { icon: _nIcon, ...nightShiftRest } = shiftBreakdown.nightShift;
  return {
    ...rest,
    shiftBreakdown: {
      dayShift: dayShiftRest,
      nightShift: nightShiftRest,
    },
  };
}

/**
 * Intelligent, shift-aware operational recommendation evaluator.
 * Evaluates the two project site shifts:
 * 1. Day Shift: 07:00 – 16:00 (7 AM – 4 PM)
 * 2. Night Shift: 19:00 – 04:00 (7 PM – 4 AM)
 */
export function evaluateDayOperationalStatus({
  dayIndex,
  weather,
  siteSignalNumber = 0,
  isToday = false,
}: {
  dayIndex: number;
  weather: WeatherData;
  siteSignalNumber?: number;
  isToday?: boolean;
}): DayOperationalEvaluation {
  const { daily, hourly, current } = weather;
  const dateStr = daily.time[dayIndex] || "";
  const tempMax = daily.temperature_2m_max[dayIndex] ?? 30;
  const tempMin = daily.temperature_2m_min[dayIndex] ?? 23;
  const day24hPrecipSum = daily.precipitation_sum?.[dayIndex] ?? 0;
  const day24hProbMax = daily.precipitation_probability_max?.[dayIndex] ?? 0;

  // Hourly index offsets
  const startHourIdx = dayIndex * 24;
  const nextStartHourIdx = (dayIndex + 1) * 24;

  const dayShiftHours: { h: number; code: number; temp: number; precip: number; prob: number; wind: number }[] = [];
  const nightShiftHours: { h: number; code: number; temp: number; precip: number; prob: number; wind: number }[] = [];

  const hasHourly = Array.isArray(hourly?.time);

  if (hasHourly) {
    // Day Shift: 07:00 to 16:00 (hours 7 to 15 inclusive = 9 hours)
    for (let h = 7; h <= 15; h++) {
      const idx = startHourIdx + h;
      if (idx < hourly.time.length) {
        dayShiftHours.push({
          h,
          code: hourly.weather_code?.[idx] ?? 0,
          temp: hourly.temperature_2m?.[idx] ?? 25,
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: hourly.wind_speed_10m?.[idx] ?? 0,
        });
      }
    }

    // Night Shift: 19:00 to 04:00 (hours 19 to 23 of today, plus hours 0 to 3 of tomorrow)
    for (let h = 19; h <= 23; h++) {
      const idx = startHourIdx + h;
      if (idx < hourly.time.length) {
        nightShiftHours.push({
          h,
          code: hourly.weather_code?.[idx] ?? 0,
          temp: hourly.temperature_2m?.[idx] ?? 24,
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: hourly.wind_speed_10m?.[idx] ?? 0,
        });
      }
    }

    for (let h = 0; h <= 3; h++) {
      const idx = nextStartHourIdx + h;
      if (idx < hourly.time.length) {
        nightShiftHours.push({
          h,
          code: hourly.weather_code?.[idx] ?? 0,
          temp: hourly.temperature_2m?.[idx] ?? 23,
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: hourly.wind_speed_10m?.[idx] ?? 0,
        });
      }
    }
  }

  const dayShiftPrecip = dayShiftHours.length > 0
    ? dayShiftHours.reduce((s, x) => s + x.precip, 0)
    : day24hPrecipSum * 0.5;
  const nightShiftPrecip = nightShiftHours.length > 0
    ? nightShiftHours.reduce((s, x) => s + x.precip, 0)
    : day24hPrecipSum * 0.5;

  const dayShiftMaxWind = dayShiftHours.length > 0
    ? Math.max(...dayShiftHours.map((x) => x.wind), 0)
    : (daily.wind_speed_10m_max?.[dayIndex] ?? 10);
  const nightShiftMaxWind = nightShiftHours.length > 0
    ? Math.max(...nightShiftHours.map((x) => x.wind), 0)
    : 8;

  const dayShiftMaxProb = dayShiftHours.length > 0
    ? Math.max(...dayShiftHours.map((x) => x.prob), 0)
    : day24hProbMax;
  const nightShiftMaxProb = nightShiftHours.length > 0
    ? Math.max(...nightShiftHours.map((x) => x.prob), 0)
    : day24hProbMax;

  const dayHasStorm = dayShiftHours.some((x) => x.code >= 95);
  const nightHasStorm = nightShiftHours.some((x) => x.code >= 95);
  const dayHasRain = dayShiftHours.some((x) => x.code >= 51 && x.code <= 82 && x.precip >= 0.5);
  const nightHasRain = nightShiftHours.some((x) => x.code >= 51 && x.code <= 82 && x.precip >= 0.5);

  // Peak Rain Timing during Day vs Night Shift
  let peakRainWindow: string | null = null;
  const dayRainHours = dayShiftHours.filter((x) => x.precip >= 0.4 || x.code >= 80 || x.code >= 95);
  const nightRainHours = nightShiftHours.filter((x) => x.precip >= 0.4 || x.code >= 80 || x.code >= 95);

  const fmtHour = (hour: number) => {
    const norm = ((hour % 24) + 24) % 24;
    const period = norm >= 12 ? "PM" : "AM";
    const h12 = norm % 12 === 0 ? 12 : norm % 12;
    return `${h12}:00 ${period}`;
  };

  if (dayRainHours.length > 0 && nightRainHours.length > 0) {
    const firstH = dayRainHours[0].h;
    const lastH = Math.min(dayRainHours[dayRainHours.length - 1].h + 1, 16);
    peakRainWindow = `Day (${fmtHour(firstH)}–${fmtHour(lastH)}) & Night Rain`;
  } else if (dayRainHours.length > 0) {
    const firstH = dayRainHours[0].h;
    const lastH = Math.min(dayRainHours[dayRainHours.length - 1].h + 1, 16);
    peakRainWindow = `Day: ${fmtHour(firstH)} – ${fmtHour(lastH)}`;
  } else if (nightRainHours.length > 0) {
    const firstH = nightRainHours[0].h;
    const lastH = (nightRainHours[nightRainHours.length - 1].h + 1) % 24;
    peakRainWindow = `Night: ${fmtHour(firstH)} – ${fmtHour(lastH)}`;
  }

  let intent: "favorable" | "caution" | "suspend" = "favorable";
  let conditionLabel = "Mainly Clear";
  let operationalGuidance = "";
  let icon: LucideIcon = Sun;

  // 1. MANDATORY SUSPENSION
  if (siteSignalNumber >= 2) {
    intent = "suspend";
    conditionLabel = `PAGASA Signal #${siteSignalNumber} Raised`;
    operationalGuidance = "HALT ALL OUTDOOR SITE WORK — Statutory tropical cyclone safety protocol active for Day & Night shifts.";
    icon = CloudLightning;
  } else if (
    dayShiftPrecip >= 25 ||
    dayShiftMaxWind >= 45 ||
    (dayHasStorm && dayShiftPrecip >= 20)
  ) {
    intent = "suspend";
    conditionLabel =
      dayShiftPrecip >= 25
        ? "Heavy Monsoon Rain"
        : dayShiftMaxWind >= 45
        ? "Severe Wind Hazard"
        : "Severe Thunderstorm Hazard";
    operationalGuidance =
      "Suspend outdoor Day Shift operations — torrential downpour or dangerous high wind conditions.";
    icon = dayShiftMaxWind >= 45 ? Wind : dayShiftPrecip >= 25 ? CloudRain : CloudLightning;
  }
  // 2. CAUTION (Requires active advisory, moderate rain >= 6.5mm, or high winds >= 28kph)
  else if (
    siteSignalNumber === 1 ||
    (dayHasStorm && dayShiftPrecip >= 7.0) ||
    dayShiftPrecip >= 6.5 ||
    dayShiftMaxWind >= 28 ||
    (nightHasStorm && nightShiftPrecip >= 12.0) ||
    nightShiftPrecip >= 15.0 ||
    (isToday && current?.weather_code >= 51 && current?.precipitation >= 1.5)
  ) {
    intent = "caution";

    if (siteSignalNumber === 1) {
      conditionLabel = "PAGASA Signal #1 Precaution";
      operationalGuidance = "Crane lifting and elevated work restricted. Ground operations permitted with monitoring.";
      icon = Wind;
    } else if (dayHasStorm && dayShiftPrecip >= 7.0) {
      conditionLabel = "Clear Morning • Late Afternoon Storm Risk";
      operationalGuidance = `Favorable morning work. Complete sensitive concrete pours & monitor crane booms before afternoon rain window (${dayShiftPrecip.toFixed(1)} mm expected).`;
      icon = CloudLightning;
    } else if (dayShiftPrecip >= 6.5) {
      conditionLabel = "Day Shift Rain Showers";
      operationalGuidance = `Proceed with caution on Day Shift (${dayShiftPrecip.toFixed(1)} mm expected). Prepare rain tarps and monitor site drainage.`;
      icon = CloudRain;
    } else if (nightHasStorm || nightShiftPrecip >= 15.0) {
      conditionLabel = "Favorable Day Shift • Night Rain Risk";
      operationalGuidance = `Day shift is favorable (${dayShiftPrecip.toFixed(1)} mm). Secure site materials before Night Shift rain window (${nightShiftPrecip.toFixed(1)} mm expected).`;
      icon = Cloud;
    } else {
      conditionLabel = "Scattered Afternoon Showers";
      operationalGuidance = `Proceed with caution (${dayShiftPrecip.toFixed(1)} mm shift rain). Light precipitation may affect elevated activities.`;
      icon = CloudRain;
    }
  }
  // 3. FAVORABLE (Normal construction schedule, trace or light passing showers)
  else {
    intent = "favorable";
    if (isToday && (current?.weather_code === 0 || current?.weather_code === 1)) {
      conditionLabel = current.weather_code === 0 ? "Clear Sky" : "Mainly Clear";
      operationalGuidance = "Favorable for Day & Night shifts. Ideal conditions for concrete pouring, earthworks, and crane operations.";
      icon = Sun;
    } else if (dayShiftPrecip >= 2.0) {
      conditionLabel = "Favorable Day • Passing PM Shower Watch";
      operationalGuidance = `Favorable daytime shift (${dayShiftPrecip.toFixed(1)} mm expected). Brief passing shower not expected to impede routine site operations.`;
      icon = Cloud;
    } else if (dayShiftPrecip > 0 || nightShiftPrecip > 0) {
      conditionLabel = "Partly Cloudy • Favorable Shifts";
      operationalGuidance = "Favorable working conditions. Trace precipitation (< 2 mm) not expected to impede site operations.";
      icon = Cloud;
    } else {
      const modeCode = daily.weather_code[dayIndex] ?? 1;
      conditionLabel = modeCode <= 1 ? "Clear / Sunny" : "Partly Cloudy";
      operationalGuidance = "Favorable for all outdoor work. Normal construction schedule in effect for Day & Night shifts.";
      icon = modeCode <= 1 ? Sun : Cloud;
    }
  }

  // Rainfall text formatting
  let rainfallText = "";
  if (dayShiftPrecip >= 1.0) {
    rainfallText = `${dayShiftPrecip.toFixed(1)} mm (Day Shift)`;
  } else if (dayShiftPrecip > 0) {
    rainfallText = `< 1.0 mm (Trace Day Rain)`;
  } else {
    rainfallText = `0.0 mm (Dry Day Shift)`;
  }

  // Sub-shift generator for Day vs Night
  const createShiftForecast = (
    hours: typeof dayShiftHours,
    period: "day" | "night",
    shiftName: string,
    timeRange: string,
    precipSum: number,
    probMax: number,
    maxWind: number,
    hasStorm: boolean
  ): ShiftForecast => {
    if (hours.length === 0) {
      return {
        period,
        shiftName,
        timeRange,
        label: "Normal",
        precipSumMm: 0,
        precipProbMax: 0,
        tempAvg: period === "day" ? 28 : 24,
        maxWindKph: 8,
        hasStorm: false,
        code: 1,
        icon: period === "day" ? Sun : Cloud,
        iconName: period === "day" ? "Sun" : "Cloud",
        rainWindow: null,
      };
    }

    const tempAvg = Math.round(hours.reduce((s, x) => s + x.temp, 0) / hours.length);
    const worstCode = Math.max(...hours.map((x) => x.code));

    // Shift-specific rain timing window
    const rainHours = hours.filter((x) => x.precip >= 0.4 || x.code >= 80 || x.code >= 95);
    let rainWindow: string | null = null;
    if (rainHours.length > 0) {
      const firstH = rainHours[0].h;
      const lastH = (rainHours[rainHours.length - 1].h + 1) % 24;
      const fH = (h: number) => {
        const norm = ((h % 24) + 24) % 24;
        const p = norm >= 12 ? "PM" : "AM";
        const h12 = norm % 12 === 0 ? 12 : norm % 12;
        return `${h12}${p}`;
      };
      rainWindow = `${fH(firstH)}–${fH(lastH)}`;
    }

    let label = "Clear";
    let subIcon: LucideIcon = period === "day" ? Sun : Cloud;
    if (hasStorm) {
      label = "Thunderstorm";
      subIcon = CloudLightning;
    } else if (precipSum >= 5) {
      label = "Moderate Rain";
      subIcon = CloudRain;
    } else if (precipSum >= 0.5) {
      label = "Passing Shower";
      subIcon = CloudRain;
    } else if (worstCode === 2 || worstCode === 3) {
      label = worstCode === 2 ? "Partly Cloudy" : "Overcast";
      subIcon = Cloud;
    } else {
      label = period === "day" ? "Clear / Sunny" : "Clear Sky";
      subIcon = period === "day" ? Sun : Cloud;
    }

    const iconName =
      subIcon === Sun ? "Sun" : subIcon === CloudLightning ? "CloudLightning" : subIcon === CloudRain ? "CloudRain" : "Cloud";

    return {
      period,
      shiftName,
      timeRange,
      label,
      precipSumMm: Number(precipSum.toFixed(1)),
      precipProbMax: probMax,
      tempAvg,
      maxWindKph: Math.round(maxWind),
      hasStorm,
      code: worstCode,
      icon: subIcon,
      iconName,
      rainWindow,
    };
  };

  const iconName =
    icon === Sun
      ? "Sun"
      : icon === CloudLightning
      ? "CloudLightning"
      : icon === CloudRain
      ? "CloudRain"
      : icon === Wind
      ? "Wind"
      : "Cloud";

  return {
    dayIndex,
    dateStr,
    isToday,
    intent,
    badgeLabel: intent === "favorable" ? "Favorable" : intent === "caution" ? "Caution" : "Suspend",
    conditionLabel,
    operationalGuidance,
    rainfallExpectedMm: Number(dayShiftPrecip.toFixed(1)),
    rainfallText,
    peakRainWindow,
    dayShiftPrecipMm: Number(dayShiftPrecip.toFixed(1)),
    nightShiftPrecipMm: Number(nightShiftPrecip.toFixed(1)),
    dayShiftMaxWindKph: Math.round(dayShiftMaxWind),
    tempMax: Math.round(tempMax),
    tempMin: Math.round(tempMin),
    icon,
    iconName,
    shiftBreakdown: {
      dayShift: createShiftForecast(
        dayShiftHours,
        "day",
        "Day Shift",
        "07:00 – 16:00",
        dayShiftPrecip,
        dayShiftMaxProb,
        dayShiftMaxWind,
        dayHasStorm
      ),
      nightShift: createShiftForecast(
        nightShiftHours,
        "night",
        "Night Shift",
        "19:00 – 04:00",
        nightShiftPrecip,
        nightShiftMaxProb,
        nightShiftMaxWind,
        nightHasStorm
      ),
    },
  };
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
    const hourlyPrecip: number[] = [];
    const hourlyWind: number[] = [];

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
        hourlyPrecip.push(parseFloat(hData.precipMM || "0") / 3);
        hourlyWind.push(parseFloat(currentCondition.windspeedKmph || "10"));
      }
    }

    return {
      current,
      hourly: {
        time: hourlyTime,
        temperature_2m: hourlyTemp,
        precipitation_probability: hourlyPrecipProb,
        weather_code: hourlyCode,
        precipitation: hourlyPrecip,
        wind_speed_10m: hourlyWind,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blendMultiModelResponse(data: any): WeatherData {
  const hourly = data.hourly;
  const daily = data.daily;

  const hasMulti =
    hourly &&
    Array.isArray(hourly.precipitation_ecmwf_ifs025) &&
    Array.isArray(hourly.precipitation_gfs_seamless) &&
    Array.isArray(hourly.precipitation_icon_global);

  if (!hasMulti) {
    return data as WeatherData;
  }

  const timeLen = hourly.time.length;
  const blendedPrecip: number[] = new Array(timeLen);
  const blendedTemp: number[] = new Array(timeLen);
  const blendedProb: number[] = new Array(timeLen);
  const blendedCode: number[] = new Array(timeLen);
  const blendedWind: number[] = new Array(timeLen);

  for (let i = 0; i < timeLen; i++) {
    const pE = hourly.precipitation_ecmwf_ifs025?.[i] ?? 0;
    const pG = hourly.precipitation_gfs_seamless?.[i] ?? 0;
    const pI = hourly.precipitation_icon_global?.[i] ?? 0;
    // 50% ECMWF (world benchmark), 25% GFS (NOAA), 25% ICON (DWD)
    blendedPrecip[i] = Number((0.50 * pE + 0.25 * pG + 0.25 * pI).toFixed(2));

    const tE = hourly.temperature_2m_ecmwf_ifs025?.[i] ?? 25;
    const tG = hourly.temperature_2m_gfs_seamless?.[i] ?? tE;
    const tI = hourly.temperature_2m_icon_global?.[i] ?? tE;
    blendedTemp[i] = Number((0.50 * tE + 0.25 * tG + 0.25 * tI).toFixed(1));

    const probE = hourly.precipitation_probability_ecmwf_ifs025?.[i] ?? 0;
    const probG = hourly.precipitation_probability_gfs_seamless?.[i] ?? probE;
    const probI = hourly.precipitation_probability_icon_global?.[i] ?? probE;
    blendedProb[i] = Math.round(0.50 * probE + 0.25 * probG + 0.25 * probI);

    const wE = hourly.wind_speed_10m_ecmwf_ifs025?.[i] ?? 10;
    const wG = hourly.wind_speed_10m_gfs_seamless?.[i] ?? wE;
    const wI = hourly.wind_speed_10m_icon_global?.[i] ?? wE;
    blendedWind[i] = Number((0.50 * wE + 0.25 * wG + 0.25 * wI).toFixed(1));

    const cE = hourly.weather_code_ecmwf_ifs025?.[i] ?? 0;
    const cG = hourly.weather_code_gfs_seamless?.[i] ?? 0;
    const cI = hourly.weather_code_icon_global?.[i] ?? 0;
    blendedCode[i] = cE || cG || cI || 0;
  }

  const daysLen = daily.time.length;
  const blendedDailyPrecip: number[] = new Array(daysLen);
  const blendedDailyTempMax: number[] = new Array(daysLen);
  const blendedDailyTempMin: number[] = new Array(daysLen);
  const blendedDailyCode: number[] = new Array(daysLen);
  const blendedDailyProbMax: number[] = new Array(daysLen);
  const blendedDailyWindMax: number[] = new Array(daysLen);

  for (let d = 0; d < daysLen; d++) {
    const pE = daily.precipitation_sum_ecmwf_ifs025?.[d] ?? 0;
    const pG = daily.precipitation_sum_gfs_seamless?.[d] ?? 0;
    const pI = daily.precipitation_sum_icon_global?.[d] ?? 0;
    blendedDailyPrecip[d] = Number((0.50 * pE + 0.25 * pG + 0.25 * pI).toFixed(1));

    const tMaxE = daily.temperature_2m_max_ecmwf_ifs025?.[d] ?? 30;
    const tMaxG = daily.temperature_2m_max_gfs_seamless?.[d] ?? tMaxE;
    const tMaxI = daily.temperature_2m_max_icon_global?.[d] ?? tMaxE;
    blendedDailyTempMax[d] = Number((0.50 * tMaxE + 0.25 * tMaxG + 0.25 * tMaxI).toFixed(1));

    const tMinE = daily.temperature_2m_min_ecmwf_ifs025?.[d] ?? 23;
    const tMinG = daily.temperature_2m_min_gfs_seamless?.[d] ?? tMinE;
    const tMinI = daily.temperature_2m_min_icon_global?.[d] ?? tMinE;
    blendedDailyTempMin[d] = Number((0.50 * tMinE + 0.25 * tMinG + 0.25 * tMinI).toFixed(1));

    blendedDailyCode[d] = daily.weather_code_ecmwf_ifs025?.[d] ?? 1;
    blendedDailyProbMax[d] = Math.max(
      daily.precipitation_probability_max_ecmwf_ifs025?.[d] ?? 0,
      daily.precipitation_probability_max_gfs_seamless?.[d] ?? 0,
      daily.precipitation_probability_max_icon_global?.[d] ?? 0
    );
    blendedDailyWindMax[d] = daily.wind_speed_10m_max_ecmwf_ifs025?.[d] ?? 10;
  }

  const current = data.current || {
    time: new Date().toISOString(),
    temperature_2m: blendedTemp[0] ?? 30,
    relative_humidity_2m: 80,
    apparent_temperature: blendedTemp[0] ?? 30,
    precipitation: blendedPrecip[0] ?? 0,
    weather_code: blendedCode[0] ?? 1,
    wind_speed_10m: blendedWind[0] ?? 10,
    wind_direction_10m: 0,
  };

  return {
    current,
    hourly: {
      time: hourly.time,
      temperature_2m: blendedTemp,
      precipitation_probability: blendedProb,
      precipitation: blendedPrecip,
      rain: blendedPrecip,
      showers: blendedPrecip,
      weather_code: blendedCode,
      wind_speed_10m: blendedWind,
    },
    daily: {
      time: daily.time,
      weather_code: blendedDailyCode,
      temperature_2m_max: blendedDailyTempMax,
      temperature_2m_min: blendedDailyTempMin,
      precipitation_sum: blendedDailyPrecip,
      precipitation_probability_max: blendedDailyProbMax,
      wind_speed_10m_max: blendedDailyWindMax,
    },
  };
}

export async function fetchWeather(): Promise<WeatherData | null> {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=17.318823&longitude=121.974925&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=Asia%2FManila&forecast_days=8&models=ecmwf_ifs025,gfs_seamless,icon_global";

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn("Open-Meteo API returned an error, falling back to wttr.in:", res.status, res.statusText);
      return await fetchWeatherFromWttr();
    }
    const data = await res.json();
    return blendMultiModelResponse(data);
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

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=17.318823&longitude=121.974925&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Asia%2FManila`;

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
