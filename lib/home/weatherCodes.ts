import type { WeatherGlyphKind } from "./types";

/**
 * Open-Meteo WMO weather code -> glyph (shared by the server loaders and the glyph component).
 * 0 clear · 1-2 mainly clear / partly cloudy · 3 overcast · 45, 48 fog · 51-57 drizzle ·
 * 61, 63, 80, 81 rain · 65-67, 82 heavy rain · 71-77, 85, 86 snow (drawn as rain: it does not
 * occur at these sites) · 95-99 thunderstorm.
 */
export function glyphForWmo(code: number, isNight = false): WeatherGlyphKind {
  if (code === 0) return isNight ? "clear-night" : "clear-day";
  if (code === 1 || code === 2) return isNight ? "clear-night" : "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "thunderstorm";
  if (code === 65 || code === 66 || code === 67 || code === 82) return "heavy-rain";
  if ((code >= 51 && code <= 64) || code === 80 || code === 81 || (code >= 71 && code <= 86)) return "rain";
  return "cloudy";
}

/** Night for the glyphs: 18:00 to 05:59 */
export function isNightHour(hour: number): boolean {
  return hour >= 18 || hour < 6;
}
