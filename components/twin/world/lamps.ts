/**
 * The lamps of the loaded zones as real lights: a flood lamp is a spot light aimed where the zone
 * says, a window or a pole lamp a point light. Each is lit during its own hours and fades in and
 * out over a couple of seconds; `air.lamps` follows, so lamp surfaces glow with them.
 *
 * A lamp stays in the scene with no brightness while it is off: adding or removing a light changes
 * the set every shader was built for, and the rebuild would stall the frame at dusk. For the same
 * reason a zone's lamps are added before its draws are compiled (engine/streaming.ts).
 *
 * Brightness is not in physical units, because the sun here is not either: lumens are scaled so a
 * 9,000 lm flood lamp lights a road about as a lamp of that size does to a dark-adapted eye.
 */
import * as THREE from "three/webgpu";
import type { ZoneLight } from "../data/types";
import { loop } from "../engine/loop";
import { tierSettings } from "../engine/tiers";
import { clock } from "../sim/clock";
import { air } from "./air";
import { kelvin } from "./SkyLight";

/** Light units per lumen for a lamp shining all round; a spot puts the same light into a quarter of the sphere. */
const PER_LUMEN = 0.02 / (4 * Math.PI);
const FADE_SECONDS = 1.8;
/** When lamp surfaces glow if no zone with lamps is loaded: 17:30 to 06:15. */
const DEFAULT_HOURS: [number, number] = [1050, 375];

type Lamp = { light: THREE.SpotLight | THREE.PointLight; hours: [number, number]; full: number; level: number };

let scene: THREE.Scene | null = null;
const byZone = new Map<string, Lamp[]>();
let stop: (() => void) | null = null;
/**
 * Shadow-casting spot lights taken out of the scene, to be used again. Disposing one left its
 * shadow map on the graphics card (4 MB and one texture more after every load and unload of a zone).
 */
const spare: THREE.SpotLight[] = [];
let glow = 0;

function lit(minutes: number, [from, to]: [number, number]): boolean {
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

function count(): number {
  let n = 0;
  for (const list of byZone.values()) n += list.length;
  return n;
}

function tick(dt: number) {
  const minutes = clock.minutes();
  const step = dt / FADE_SECONDS;
  const wanted = lit(minutes, DEFAULT_HOURS) ? 1 : 0;
  glow += Math.sign(wanted - glow) * Math.min(Math.abs(wanted - glow), step);
  let brightest = byZone.size ? 0 : glow;
  for (const list of byZone.values()) {
    for (const lamp of list) {
      const target = lit(minutes, lamp.hours) ? 1 : 0;
      lamp.level += Math.sign(target - lamp.level) * Math.min(Math.abs(target - lamp.level), step);
      lamp.light.intensity = lamp.full * lamp.level * lamp.level;
      // an unlit lamp keeps its shadow map but stops redrawing it
      if (lamp.light.castShadow) lamp.light.shadow.autoUpdate = lamp.level > 0;
      brightest = Math.max(brightest, lamp.level);
    }
  }
  air.lamps.value = brightest;
}

export const lamps = {
  /** Start lighting `target`. Returns the function that removes every lamp and stops. */
  attach(target: THREE.Scene): () => void {
    scene = target;
    stop = loop.add("sim", tick);
    return () => {
      stop?.();
      stop = null;
      for (const zone of [...byZone.keys()]) lamps.clear(zone);
      scene = null;
      air.lamps.value = 0;
    };
  },

  /** Add a zone's lamps (as many as the tier's light budget still allows). */
  set(zone: string, lights: ZoneLight[]) {
    if (!scene || byZone.has(zone)) return;
    const budget = tierSettings().lights;
    const colour = new THREE.Color();
    const list: Lamp[] = [];
    for (const spec of lights) {
      if (count() + list.length >= budget) break;
      kelvin(spec.colorK, colour);
      let light: THREE.SpotLight | THREE.PointLight;
      let full: number;
      if (spec.aim) {
        // the first flood lamp of a zone casts shadows where the tier draws them at all
        const casts = tierSettings().shadowCascades > 1 && !list.some((l) => l.light.castShadow);
        const reused = casts ? spare.pop() : undefined;
        const spot = reused ?? new THREE.SpotLight(colour, 0, 45, THREE.MathUtils.degToRad(58), 0.7, 2);
        spot.color.copy(colour);
        spot.intensity = 0;
        spot.position.set(...spec.p);
        spot.target.position.set(...spec.aim);
        scene.add(spot.target);
        if (casts && !reused) {
          spot.castShadow = true;
          spot.shadow.mapSize.set(1024, 1024);
          spot.shadow.camera.near = 0.5;
          spot.shadow.camera.far = 45;
          spot.shadow.bias = -0.0006;
          spot.shadow.normalBias = 0.04;
          spot.shadow.autoUpdate = false;
        }
        light = spot;
        full = spec.lumens * PER_LUMEN * 4;
      } else {
        const point = new THREE.PointLight(colour, 0, spec.kind === "window" ? 12 : 30, 2);
        point.position.set(...spec.p);
        light = point;
        full = spec.lumens * PER_LUMEN;
      }
      light.name = `lamp:${zone}:${spec.kind}`;
      scene.add(light);
      list.push({ light, hours: spec.hours, full, level: lit(clock.minutes(), spec.hours) ? 1 : 0 });
    }
    byZone.set(zone, list);
  },

  clear(zone: string) {
    const list = byZone.get(zone);
    if (!list) return;
    byZone.delete(zone);
    for (const { light } of list) {
      light.removeFromParent();
      if ((light as THREE.SpotLight).isSpotLight) (light as THREE.SpotLight).target.removeFromParent();
      if ((light as THREE.SpotLight).isSpotLight && light.castShadow) spare.push(light as THREE.SpotLight);
      else light.dispose();
    }
  },

  count,
};
