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

export type Bounds = { min: Vec3; max: Vec3 };

/** One row of `assets.json`, written by scripts/twin/build-assets.mjs (CONTRACTS section 4.1). */
export type AssetEntry = {
  id: string;
  url: string;
  bytes: number;
  /** Triangles per LOD; 0 where the asset has no such level. */
  tris: [number, number, number];
  /** Metres where LOD1 and LOD2 begin, at the reference view (engine/lod.ts). */
  lodDistances: [number, number];
  bounds: Bounds;
  materials: number;
  credits: string[];
};

export type StageId = "cleared" | "excavation" | "rebar" | "formwork" | "poured" | "finished" | "commissioned";

export type Placement = { asset: string; p: Vec3; r: Vec3; s: number; stage?: StageId[]; pick?: string };

/** `zones/<zone id>.json`, written by scripts/blender/twin/export_zone.py (CONTRACTS section 4.2). */
export type Zone = {
  id: string;
  title: string;
  bounds: Bounds;
  streamIn: number;
  streamOut: number;
  shell: string | null;
  /** Optional, added in P01c: a zone that loads only when asked for with ?testzone=1. */
  test?: boolean;
  placements: Placement[];
  lights: { kind: "lamp" | "window" | "flood"; p: Vec3; colorK: number; lumens: number; hours: [number, number] }[];
  cameras: { id: string; title: string; pos: Vec3; target: Vec3 }[];
};

/** One row of `zones/index.json`: what streaming needs to know about a zone before loading it. */
export type ZoneIndexEntry = Pick<Zone, "id" | "title" | "bounds" | "streamIn" | "streamOut" | "shell" | "test"> & {
  location: LocationId;
  assets: string[];
  placements: number;
};
