/**
 * The lamps of the loaded zones as real lights: a flood lamp is a spot light aimed where the zone
 * says, a window or a pole lamp a point light. Each is lit during its own hours and fades in and
 * out over a couple of seconds; `air.lamps` follows, so lamp surfaces glow with them.
 *
 * A lamp is a light only while it is lit (P02e). Every light in the scene costs every lit pixel
 * about 1.3 ms on the office laptop whether it shines or not, so by day the lamps are not in the
 * scene at all and their surfaces are the only sign of them.
 *
 * Adding or removing a light changes the set every shader was built for, and building them again
 * would stall the frame at dusk. So the lamps move in and out of the scene together, as one set
 * (all of them in from the moment the first is lit until the last has faded; each still fades on
 * its own hours, so they come on in sequence), and every material is compiled ahead for both
 * sets, the lamps in and the lamps out (engine/precompile.ts). The set changes only once that
 * compile has finished (`ready`); until then the lamps wait dark.
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

/** A light that joins and leaves the scene with the lamps. `wanted` says whether it should shine now. */
type Member = {
  light: THREE.SpotLight | THREE.PointLight;
  parent: () => THREE.Object3D | null;
  full: number;
  level: number;
  wanted: () => boolean;
};

let scene: THREE.Scene | null = null;
const byZone = new Map<string, Member[]>();
/** Lights owned by moving things (a vehicle's headlamps), by name. */
const extras = new Map<string, Member>();
let stop: (() => void) | null = null;
/**
 * Shadow-casting spot lights taken out of the scene, to be used again. Disposing one left its
 * shadow map on the graphics card (4 MB and one texture more after every load and unload of a zone).
 */
const spare: THREE.SpotLight[] = [];
let glow = 0;
/** Whether the lamps are in the scene now. */
let live = false;
/** Raised whenever the set of lamps changes; `ready` names the version compiled for. */
let version = 0;
let readyVersion = 0;
const listeners = new Set<() => void>();
/** Frames left of a rehearsal: the lamps in the scene at no brightness (see `rehearse`). */
let rehearsal = 0;
/** For measuring (`force`): the lamps held in the scene, dark, as they were before P02e. */
let forced = false;

function lit(minutes: number, [from, to]: [number, number]): boolean {
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/** 0 to 8 minutes, fixed by where the lamp stands. */
function stagger([x, y, z]: [number, number, number]): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return Math.floor((h - Math.floor(h)) * 9);
}

function* members(): Generator<Member> {
  for (const list of byZone.values()) yield* list;
  yield* extras.values();
}

function count(): number {
  let n = 0;
  for (const list of byZone.values()) n += list.length;
  return n;
}

function changed() {
  version++;
  for (const fn of listeners) fn();
}

/** Put every lamp into the scene (`on`) or take every lamp out. Synchronous. */
function place(on: boolean) {
  for (const m of members()) {
    const light = m.light;
    const spot = (light as THREE.SpotLight).isSpotLight ? (light as THREE.SpotLight) : null;
    if (on) {
      const parent = m.parent();
      if (!parent) continue;
      if (light.parent !== parent) parent.add(light);
      if (spot && spot.target.parent !== parent) parent.add(spot.target);
    } else {
      light.removeFromParent();
      spot?.target.removeFromParent();
    }
  }
}

function tick(dt: number) {
  const minutes = clock.minutes();
  const step = dt / FADE_SECONDS;
  const wantedGlow = lit(minutes, DEFAULT_HOURS) ? 1 : 0;
  glow += Math.sign(wantedGlow - glow) * Math.min(Math.abs(wantedGlow - glow), step);

  let anyWanted = false;
  let anyShining = false;
  for (const m of members()) {
    if (m.wanted()) anyWanted = true;
    if (m.level > 0) anyShining = true;
  }
  if (forced) {
    if (!live && scene) {
      place(true);
      live = true;
    }
    return;
  }
  // a rehearsal: in, dark, for one drawn frame, then out again
  if (rehearsal > 0 && !live && scene) {
    place(rehearsal-- > 1);
    air.lamps.value = byZone.size ? 0 : glow;
    return;
  }
  // in together once the shaders for that are built; out together once the last has faded
  if (!live && anyWanted && readyVersion === version && scene) {
    place(true);
    live = true;
  } else if (live && !anyWanted && !anyShining) {
    place(false);
    live = false;
  }

  let brightest = byZone.size ? 0 : glow;
  for (const m of members()) {
    // (a lamp that is not in the scene waits dark: its surface does not glow ahead of its light)
    const target = live && m.wanted() ? 1 : 0;
    m.level += Math.sign(target - m.level) * Math.min(Math.abs(target - m.level), step);
    m.light.intensity = m.full * m.level * m.level;
    // an unlit lamp keeps its shadow map but stops redrawing it
    if (m.light.castShadow) m.light.shadow.autoUpdate = m.level > 0;
    if (!extras.has(m.light.name)) brightest = Math.max(brightest, m.level);
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
      live = false;
      air.lamps.value = 0;
    };
  },

  /** Add a zone's lamps (as many as the tier's light budget still allows). */
  set(zone: string, lights: ZoneLight[]) {
    if (!scene || byZone.has(zone)) return;
    const budget = tierSettings().lights;
    const colour = new THREE.Color();
    const list: Member[] = [];
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
      // real lamps on their own photocells and switches do not all change at the same minute:
      // each is set a few minutes off its zone's hours, the same few minutes every day
      const shift = stagger(spec.p);
      const hours: [number, number] = [(spec.hours[0] + shift) % 1440, (spec.hours[1] + shift) % 1440];
      list.push({ light, parent: () => scene, full, level: 0, wanted: () => lit(clock.minutes(), hours) });
    }
    byZone.set(zone, list);
    // (a new lamp joins the lit set: until the shaders are built for it, the lamps stay out)
    if (live) place(false);
    live = false;
    changed();
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
    changed();
  },

  /**
   * A light that belongs to something that moves (a vehicle's headlamps): it joins the scene
   * with the lamps, under `parent`, and shines at `full` times the level `wanted` asks for.
   * Returns the function that takes it away.
   */
  extra(name: string, light: THREE.SpotLight | THREE.PointLight, parent: THREE.Object3D, full: number, wanted: () => boolean): () => void {
    light.name = name;
    light.intensity = 0;
    extras.set(name, { light, parent: () => parent, full, level: 0, wanted });
    if (live) place(false);
    live = false;
    changed();
    return () => {
      if (extras.get(name)?.light !== light) return;
      extras.delete(name);
      light.removeFromParent();
      (light as THREE.SpotLight).target?.removeFromParent();
      changed();
    };
  },

  count,
  /** For the checks: each lamp's name, level and whether it is in the scene. */
  levels: () => [...members()].map((m) => ({ name: m.light.name, level: Math.round(m.level * 1000) / 1000, inScene: !!m.light.parent })),
  /** Whether there are lamps at all: if not, there is only one set of lights to compile for. */
  any: () => count() > 0 || extras.size > 0,
  /** Whether the lamps are in the scene now. */
  live: () => live,
  /**
   * Run `fn` with the lamps in the scene (`on`) or out of it, then put them back as they were.
   * For compiling a draw for the set of lights it is not drawn with now: everything in `fn` must be synchronous.
   */
  within<T>(on: boolean, fn: () => T): T {
    if (on === live) return fn();
    place(on);
    try {
      return fn();
    } finally {
      place(live);
    }
  },
  /** The version of the set of lamps, raised whenever one is added or taken away. */
  version: () => version,
  /** Everything has been compiled for both sets of version `v`: the lamps may join the scene. */
  ready(v: number) {
    readyVersion = v;
  },
  /** New things to compile for the lamps: they may not join the scene until `ready` again. */
  hold() {
    readyVersion = -1;
  },
  isReady: () => readyVersion === version,
  /**
   * Put the lamps into the scene, dark, for one drawn frame and take them out again. Whatever three
   * and the graphics driver still had to finish for the lamps-in set of lights is done then, during
   * loading, instead of on the frame they come on at dusk (P02e: compiling and drawing each object
   * ahead left 0.6 s of it). The picture does not change: a light at no brightness adds nothing.
   */
  rehearse() {
    if (!live) rehearsal = 2;
  },
  /** Whether a rehearsal is under way. */
  rehearsing: () => rehearsal > 0,
  /** For measuring what the lamps cost by day (scripts/twin/cost.mjs): hold them in the scene, dark, or let them go. */
  force(on: boolean) {
    forced = on;
    if (!on && live) {
      place(false);
      live = false;
    }
  },
  /** Called whenever the set of lamps changes. */
  onChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
