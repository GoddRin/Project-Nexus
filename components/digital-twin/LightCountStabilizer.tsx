"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Keeps the number of lamps the renderer sees on a few fixed steps, so switching view or time
 * of day does not freeze the page.
 *
 * WHY. three.js writes the number of point and spot lights into every lit shader, so each new
 * pair of counts means every lit material's shader is built again: about 40 programs, 4 to 8
 * seconds of a frozen page on an integrated graphics card. The site's lamps come and go with
 * the view and the hour (29 point / 3 spot by day, 40 / 6 at night, and 30/4, 41/5, 43/4, 27/5
 * on the way between them), so one press of "Night" walked through several pairs and froze for
 * 20 to 35 seconds, every time (measured with a CPU profile: 98% of it inside the driver's
 * shader link).
 *
 * WHAT. Just before each frame is drawn, the lamps in view are counted and black, zero-strength
 * stand-ins are switched on to bring each count up to the next of a few fixed levels. A stand-in adds no light at
 * all, so the picture is unchanged; the count simply stops wandering, and a pair that has been
 * built once is reused from then on.
 *
 * AHEAD OF TIME. That still leaves one long stall the first time each level is reached (the
 * first press of "Night"). So once the scene has settled, the shaders for the levels not yet
 * seen are built in the background: a little work a few times a second, with the stand-ins
 * switched on, or real lamps put aside, for a moment (nothing is drawn meanwhile), and the driver linking on its own
 * threads. By the time a level is really needed its shaders are ready.
 *
 * `?lightpad=off` in the address turns all of this off, `?prewarm=off` only the building ahead;
 * `window.__TWIN_LIGHTS__` reports the counts and the progress.
 */

// The counts the renderer is ever given. Fewer levels mean fewer shader builds (each one a long
// stall the first time); more levels mean fewer stand-ins to shade. Past the last level the
// count goes up in whole steps.
const POINT_LEVELS = [24, 32, 48]; // (overview has about 20 in view, the site by day about 30, by night 40 to 48)
const SPOT_LEVELS = [4, 6];
// at the top point level (night, when the lamps come on) the spots have levels of their own:
// the site by night shows up to 14
const NIGHT_SPOT_LEVELS = [6, 14];
const POINT_STEP = 16;
const SPOT_STEP = 8;

const WARM_START_MS = 6000; // nothing is built ahead until the scene has been up this long...
const WARM_QUIET_MS = 3000; // ...and the renderer has stopped making programs of its own for this long
const WARM_EVERY_MS = 300;
const WARM_BUDGET_MS = 24; // work per turn (one new program can overrun it; it is checked between materials)
const STRAGGLERS = 32; // fewer unbuilt materials than this is a material made a moment ago, not a level still to build
const WARM_RESCAN_MS = 4000; // when everything is built: how often to look for newly mounted materials

type Drawable = THREE.Object3D & { material?: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry };

/** What decides which shader a drawable gets, besides the lamps: its material and its own kind */
function shaderKey(o: Drawable): string | null {
  const m = o.material;
  if (!m) return null;
  const x = o as unknown as { isSkinnedMesh?: boolean; isInstancedMesh?: boolean; isBatchedMesh?: boolean; instanceColor?: unknown; isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
  const g = o.geometry;
  // (not the material's version: handing a see-through two-sided material to the renderer raises it, and it would be built again for ever)
  let k = Array.isArray(m) ? m.map((y) => y.uuid).join(",") : m.uuid;
  k += `|${x.isSkinnedMesh ? "s" : ""}${x.isInstancedMesh ? "i" : ""}${x.isBatchedMesh ? "b" : ""}${x.instanceColor ? "c" : ""}${x.isPoints ? "p" : ""}${x.isLine ? "l" : ""}${x.isSprite ? "t" : ""}`;
  if (g) {
    k += "|";
    for (const name of ["color", "tangent", "normal", "uv", "uv1", "uv2", "uv3"]) if (g.attributes[name]) k += name;
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) k += "m";
  }
  return k;
}

function carriesLight(o: THREE.Object3D): boolean {
  if ((o as THREE.Light).isLight) return true;
  for (const c of o.children) if (carriesLight(c)) return true;
  return false;
}

function level(count: number, levels: number[], step: number): number {
  for (const l of levels) if (count <= l) return l;
  const top = levels[levels.length - 1] ?? 0;
  return top + Math.ceil((count - top) / step) * step;
}

export interface LightReport {
  enabled: boolean;
  point: number;
  spot: number;
  pointDrawn: number;
  spotDrawn: number;
  setEnabled: (on: boolean) => void;
  /** For measuring: the levels in use (may be replaced at run time) */
  pointLevels: number[];
  spotLevels: number[];
  /** Building ahead: materials handed to the renderer for a level not yet on screen, and the time it took */
  warmed: number;
  warmMs: number;
  warmLongestMs: number;
  /** nothing left to build for any level reachable from here */
  warmDone: boolean;
}

class Stabilizer {
  private points: THREE.PointLight[] = [];
  private spots: THREE.SpotLight[] = [];
  private group = new THREE.Group();
  private counts = { point: 0, spot: 0 };
  /** the real lamps counted this frame */
  private real = { point: [] as THREE.Object3D[], spot: [] as THREE.Object3D[] };
  readonly report: LightReport = {
    enabled: true,
    point: 0,
    spot: 0,
    pointDrawn: 0,
    spotDrawn: 0,
    setEnabled: (on: boolean) => {
      this.report.enabled = on;
    },
    pointLevels: POINT_LEVELS,
    spotLevels: SPOT_LEVELS,
    warmed: 0,
    warmMs: 0,
    warmLongestMs: 0,
    warmDone: false,
  };

  // building ahead
  warm = true;
  private born = performance.now();
  private programs = -1;
  private quietSince = 0;
  private lastWarm = 0;
  private restUntil = 0;
  private built = new Map<string, Set<string>>();
  private queue: Drawable[] = [];
  private queueFor: [number, number] | null = null;
  private batch = 0;
  /** programs handed to the driver and not yet reported linked */
  private linking: { isReady?: () => boolean }[] = [];
  private target: THREE.WebGLRenderTarget | null = null;

  /** Every pair of counts the renderer can be given (see `step`) */
  private pairs(): [number, number][] {
    const out: [number, number][] = [];
    const { pointLevels, spotLevels } = this.report;
    pointLevels.forEach((p, i) => {
      for (const sp of i < pointLevels.length - 1 ? spotLevels : NIGHT_SPOT_LEVELS) out.push([p, sp]);
    });
    return out;
  }

  private setPads(wantPoint: number, wantSpot: number) {
    while (this.points.length < wantPoint) {
      const l = new THREE.PointLight(0x000000, 0);
      l.matrixAutoUpdate = false;
      this.points.push(l);
      this.group.add(l);
    }
    while (this.spots.length < wantSpot) {
      const l = new THREE.SpotLight(0x000000, 0);
      l.matrixAutoUpdate = false;
      this.spots.push(l);
      this.group.add(l);
    }
    for (let i = 0; i < this.points.length; i++) this.points[i].visible = i < wantPoint;
    for (let i = 0; i < this.spots.length; i++) this.spots[i].visible = i < wantSpot;
  }

  /** One turn of building ahead. The stand-ins are left as it needs them: `step` sets them right again before the frame is drawn. */
  private warmTurn(scene: THREE.Scene, camera: THREE.Camera, gl: THREE.WebGLRenderer, point: number, spot: number, drawn: [number, number]) {
    const now = performance.now();
    // only once the scene's own shaders are built, so loading is not slowed
    const programs = gl.info.programs?.length ?? 0;
    if (programs !== this.programs && !this.queue.length) {
      this.programs = programs;
      this.quietSince = now;
    }
    if (now - this.born < WARM_START_MS || now - this.quietSince < WARM_QUIET_MS) return;
    if (now - this.lastWarm < WARM_EVERY_MS || now < this.restUntil || document.hidden) return;
    this.lastWarm = now;
    // never more than one program in the driver's queue: a frame that suddenly needs a shader of
    // its own must not wait behind a backlog of ours
    this.linking = this.linking.filter((x) => x.isReady?.() === false);
    if (this.linking.length) return;

    if (!this.queue.length) {
      // the level nearest to the one on screen that still has something unbuilt (the nearest is the likeliest to be needed next)
      const far = (x: [number, number]) => Math.abs(x[0] - drawn[0]) * 100 + Math.abs(x[1] - drawn[1]);
      const pairs = this.pairs()
        .filter(([p, sp]) => !(p === drawn[0] && sp === drawn[1]))
        .sort((a, b) => far(a) - far(b));
      // (a level with real work to do goes before one with only a few stragglers, however near)
      this.queueFor = null;
      let few: Drawable[] = [];
      let fewFor: [number, number] | null = null;
      for (const pair of pairs) {
        const id = pair.join("/");
        let done = this.built.get(id);
        if (!done) this.built.set(id, (done = new Set()));
        const fresh = new Set<string>();
        const found: Drawable[] = [];
        scene.traverse((o) => {
          const d = o as Drawable & { isMesh?: boolean; isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
          if (!(d.isMesh || d.isPoints || d.isLine || d.isSprite)) return;
          const k = shaderKey(d);
          if (!k || done.has(k) || fresh.has(k)) return;
          fresh.add(k);
          found.push(d);
        });
        if (found.length >= STRAGGLERS) {
          this.queue = found;
          this.queueFor = pair;
          break;
        }
        if (found.length && !fewFor) {
          few = found;
          fewFor = pair;
        }
      }
      if (!this.queueFor && fewFor) {
        this.queue = few;
        this.queueFor = fewFor;
      }
      this.batch = this.queue.length;
      if (!this.queue.length) {
        this.report.warmDone = true;
        this.restUntil = now + WARM_RESCAN_MS;
        return;
      }
      this.report.warmDone = false;
    }

    const pair = this.queueFor!;
    const done = this.built.get(pair.join("/"))!;
    // show the renderer exactly this level's counts: stand-ins to go up, real lamps put aside
    // for a moment to go down (they are back before anything is drawn)
    this.setPads(Math.max(0, pair[0] - point), Math.max(0, pair[1] - spot));
    const aside: THREE.Object3D[] = [];
    for (let i = pair[0]; i < point; i++) aside.push(this.real.point[i]);
    for (let i = pair[1]; i < spot; i++) aside.push(this.real.spot[i]);
    for (const l of aside) l.visible = false;
    // (shaders differ for drawing into a buffer, as the scene is, and straight to the screen)
    this.target ??= new THREE.WebGLRenderTarget(1, 1);
    const before = gl.getRenderTarget();
    gl.setRenderTarget(this.target);
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < WARM_BUDGET_MS) {
      const o = this.queue.pop()!;
      const k = shaderKey(o);
      if (!k) continue;
      done.add(k);
      // (an object carrying a lamp of its own would have that lamp counted twice: it is left to the frame that first draws it)
      if (!o.parent || carriesLight(o)) continue;
      const had = gl.info.programs?.length ?? 0;
      gl.compile(o, camera, scene);
      this.report.warmed++;
      // one new program a turn: the driver builds it on the side, and several at once make the picture stutter
      const list = gl.info.programs as unknown as { isReady?: () => boolean }[] | null;
      if (list && list.length > had) {
        this.linking.push(...list.slice(had));
        break;
      }
    }
    gl.setRenderTarget(before);
    for (const l of aside) l.visible = true;
    const took = performance.now() - t0;
    this.report.warmMs += took;
    if (took > this.report.warmLongestMs) this.report.warmLongestMs = took;
    this.programs = gl.info.programs?.length ?? 0;
    // a handful of stragglers (a material made a moment ago) is not worth a turn every half second
    if (!this.queue.length && this.batch < STRAGGLERS) {
      this.report.warmDone = true;
      this.restUntil = performance.now() + WARM_RESCAN_MS;
    }
  }

  constructor() {
    this.group.name = "light-pads";
  }

  /** Lamps the renderer will take this frame: every ancestor visible, on a layer the camera draws */
  private count(o: THREE.Object3D, mask: THREE.Layers) {
    if (!o.visible || o === this.group) return;
    const l = o as THREE.Light & { isPointLight?: boolean; isSpotLight?: boolean };
    if (l.isLight && o.layers.test(mask)) {
      if (l.isPointLight) this.real.point[this.counts.point++] = o;
      else if (l.isSpotLight) this.real.spot[this.counts.spot++] = o;
    }
    const children = o.children;
    for (let i = 0; i < children.length; i++) this.count(children[i], mask);
  }

  step(scene: THREE.Scene, camera: THREE.Camera, gl: THREE.WebGLRenderer) {
    if (this.group.parent !== scene) scene.add(this.group);
    this.counts.point = this.counts.spot = 0;
    this.count(scene, camera.layers);
    const { point, spot } = this.counts;
    const on = this.report.enabled;
    const pointLevel = level(point, this.report.pointLevels, POINT_STEP);
    const pointLevels = this.report.pointLevels;
    const night = pointLevel >= pointLevels[pointLevels.length - 1];
    const spotLevel = level(spot, night ? NIGHT_SPOT_LEVELS : this.report.spotLevels, SPOT_STEP);
    const wantPoint = on ? pointLevel - point : 0;
    const wantSpot = on ? spotLevel - spot : 0;
    if (on && this.warm) this.warmTurn(scene, camera, gl, point, spot, [pointLevel, spotLevel]);
    this.setPads(wantPoint, wantSpot);
    this.report.point = point;
    this.report.spot = spot;
    this.report.pointDrawn = point + wantPoint;
    this.report.spotDrawn = spot + wantSpot;
  }

  dispose() {
    this.group.removeFromParent();
    for (const l of this.points) l.dispose();
    for (const l of this.spots) l.dispose();
    this.target?.dispose();
  }
}

export function LightCountStabilizer() {
  const scene = useThree((s) => s.scene);
  // (read once, before the first frame)
  const [off] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lightpad") === "off");
  const engine = useRef<Stabilizer | null>(null);

  useEffect(() => {
    if (off) return;
    const e = new Stabilizer();
    e.warm = new URLSearchParams(window.location.search).get("prewarm") !== "off";
    engine.current = e;
    (window as unknown as { __TWIN_LIGHTS__?: LightReport }).__TWIN_LIGHTS__ = e.report;
    return () => {
      e.dispose();
      engine.current = null;
      delete (window as unknown as { __TWIN_LIGHTS__?: LightReport }).__TWIN_LIGHTS__;
    };
  }, [scene, off]);

  // last thing before the frame is drawn (the composer, priority 1): every lamp switched on or
  // off by this frame's animation callbacks is already counted
  useFrame((state) => engine.current?.step(scene, state.camera, state.gl), 0.9);

  return null;
}
