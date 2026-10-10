/**
 * Types for the site data files in this folder (docs/twin-v2/CONTRACTS.md sections 3 and 4).
 * Only the shapes the scene shell reads so far; later phases add theirs here.
 */

export type LocationId = "weir" | "tunnel1" | "midway" | "tunnel2" | "powerhouse";

export const LOCATION_IDS: readonly LocationId[] = ["weir", "tunnel1", "midway", "tunnel2", "powerhouse"];

export type Vec3 = [number, number, number];

export type Location = {
  id: LocationId;
  title: string;
  origin: { easting: number; northing: number; elevation: number; lat: number; lon: number; source: string };
  yawToGridNorth: number;
  halfExtent: number;
  underground: boolean;
  overview: { pos: Vec3; target: Vec3 };
  waterOrder: number;
};

/** A named camera view. `data/cameras.json` holds v1's presets, all in the powerhouse location frame. */
export type CameraPlace = { id: string; title: string; zone: string; pos: Vec3; target: Vec3 };
