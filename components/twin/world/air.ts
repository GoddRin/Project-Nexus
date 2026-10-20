/**
 * Values of the air and the weather that any material may read: how wet surfaces are, whether the
 * lamps are lit, and the wind. One set for the whole twin, as shader uniforms, so changing the
 * weather never rebuilds a shader.
 *
 * world/SkyLight.tsx sets them every frame from the clock and the store. No React here.
 */
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

export const air = {
  /** 0 dry, 1 soaked: darkens porous surfaces, makes them shinier and fills puddles. */
  wetness: uniform(0),
  /** 0 lamps off, 1 on: scales the glow of lamp surfaces (materials named EMIT_...). */
  lamps: uniform(0),
  /** Seconds, advancing with the wind (faster in a storm), for plant movement. */
  windTime: uniform(0),
  /** 0 still air to 1 a gale. */
  windStrength: uniform(0.3),
  /** Unit direction the wind blows towards, on the ground plane (x, z). */
  windDir: uniform(new THREE.Vector2(0.86, 0.5)),
  /** 0 no rain to 1 a downpour (for P03d's rain; nothing reads it yet). */
  rain: uniform(0),
};

export type WeatherLook = {
  /** Share of direct sunlight that gets through, 0 to 1. */
  sun: number;
  /** Cloud cover of the sky dome, 0 to 1. */
  cloud: number;
  /** Haze in the sky model. */
  turbidity: number;
  /** Metres at which the haze hides 95% of what lies behind it (exponential, P03a). */
  fogFar: number;
  /** Where wetness settles, 0 to 1. */
  wet: number;
  wind: number;
  rain: number;
};

/** Look targets per weather state (docs/twin-v2/QUALITY-BAR.md section 7: rain dims the sun 60 to 90%). */
export const WEATHER_LOOK: Record<"clear" | "overcast" | "rain" | "typhoon", WeatherLook> = {
  clear: { sun: 1, cloud: 0.32, turbidity: 2.6, fogFar: 17000, wet: 0, wind: 0.28, rain: 0 },
  overcast: { sun: 0.3, cloud: 0.9, turbidity: 7, fogFar: 4500, wet: 0.12, wind: 0.36, rain: 0 },
  rain: { sun: 0.07, cloud: 1, turbidity: 10, fogFar: 380, wet: 1, wind: 0.5, rain: 0.8 },
  typhoon: { sun: 0.03, cloud: 1, turbidity: 12, fogFar: 170, wet: 1, wind: 1, rain: 1 },
};
