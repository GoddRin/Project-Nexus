/**
 * Typed access to the location and camera data files.
 */
import locationsFile from "./locations.json";
import camerasFile from "./cameras.json";
import type { CameraPlace, Location, LocationId } from "./types";

export const LOCATIONS = locationsFile.locations as unknown as Location[];
export const CAMERA_PLACES = camerasFile.cameras as unknown as CameraPlace[];

/** v1's presets are in the powerhouse frame, so they are offered only at this location. */
export const CAMERA_PLACES_LOCATION: LocationId = "powerhouse";

export function getLocation(id: LocationId): Location {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[LOCATIONS.length - 1];
}

export function getCameraPlace(id: string | null, location: LocationId): CameraPlace | null {
  if (!id || location !== CAMERA_PLACES_LOCATION) return null;
  return CAMERA_PLACES.find((c) => c.id === id) ?? null;
}
