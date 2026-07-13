/**
 * Calculates the geodetic distance between two points on the Earth's surface
 * using the Haversine formula.
 * 
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Geodetic distance in kilometers (km)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Derives the PAGASA storm signal number based on sustained wind speeds in kph.
 * Signal 1: 30–60 kph
 * Signal 2: 61–120 kph
 * Signal 3: 121–185 kph
 * Signal 4+: >185 kph
 * 
 * @param windSpeedKph Maximum sustained wind speed of the storm in kph
 * @param distanceKm Distance from the site in km (only signals if threatening, e.g. within 1000km)
 * @returns Signal number (0 for none, 1-4 for signal levels)
 */
export function getPagasasSignalNumber(windSpeedKph: number, distanceKm: number): number {
  if (distanceKm > 1000) return 0;
  
  if (windSpeedKph > 185) return 4;
  if (windSpeedKph >= 121) return 3;
  if (windSpeedKph >= 61) return 2;
  if (windSpeedKph >= 30) return 1;
  
  return 0;
}
