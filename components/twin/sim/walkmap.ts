/**
 * A zone's walk map (P02d), baked from the zone's own geometry by scripts/blender/twin/bake_walkmap.py:
 * how high a walkable top (a slab, an apron, a step) stands above the ground, what is in the way of a
 * dog or a person, and where undergrowth makes a detour worth it. From it:
 *
 *   standY      the height to stand at: the highest walkable top under a body's footprint, so feet
 *               rest on a slab instead of sinking into it (absolute heights: right before the
 *               ground patch has streamed in)
 *   findPath    a route round what is in the way (A* over the grid with the body's clearance, then
 *               straightened where nothing is in the way), never up a step higher than the body takes
 *   nearestFree the nearest place a body fits (a script's spot that lies in a wall is moved out)
 *
 * It is a grid for the slice. P09a's navigation mesh (recast-navigation, baked at build time) takes
 * over routing for the whole site; the height and clearance here are what it will be checked against.
 * No React here.
 */
import * as THREE from "three/webgpu";
import { groundY } from "../engine/picking";

export type WalkMeta = { url: string; origin: [number, number]; cell: number; size: [number, number]; base: number };

/** A body that walks: how wide (metres from its middle), whether body-height things are in its way, how high a step it takes. */
export type Body = { radius: number; tall: boolean; step: number };
export const PERSON: Body = { radius: 0.26, tall: true, step: 0.32 };
export const DOG: Body = { radius: 0.2, tall: false, step: 0.4 };

const LOW = 1;
const HIGH = 2;

export class WalkMap {
  readonly w: number;
  readonly h: number;
  /** Height to stand at, metres (absolute: the ground patch or a walkable top on it). */
  private readonly lift: Float32Array;
  private readonly flags: Uint8Array;
  private readonly cost: Uint8Array;
  /** Metres from each cell to the nearest cell in the way: of anything low (for a dog), and of anything (for a person). */
  private readonly clearLow: Float32Array;
  private readonly clearAll: Float32Array;

  private constructor(
    private readonly meta: WalkMeta,
    pixels: Uint8ClampedArray,
  ) {
    const [w, h] = meta.size;
    this.w = w;
    this.h = h;
    this.lift = new Float32Array(w * h);
    this.flags = new Uint8Array(w * h);
    this.cost = new Uint8Array(w * h);
    // (the image's first row is the grid's last: rows count up from the image's bottom)
    for (let y = 0; y < h; y++) {
      const j = h - 1 - y;
      for (let i = 0; i < w; i++) {
        const p = (y * w + i) * 4;
        const k = j * w + i;
        this.lift[k] = meta.base + (pixels[p] * 256 + pixels[p + 2]) / 100;
        this.flags[k] = pixels[p + 1] & 3;
        this.cost[k] = (pixels[p + 1] >> 2) * 4;
      }
    }
    this.clearLow = this.clearance(LOW);
    this.clearAll = this.clearance(LOW | HIGH);
  }

  static async load(meta: WalkMeta): Promise<WalkMap> {
    const response = await fetch(meta.url);
    if (!response.ok) throw new Error(`walk map ${meta.url}: ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("walk map: no 2D context");
    const { width, height } = bitmap;
    g.drawImage(bitmap, 0, 0);
    bitmap.close();
    return new WalkMap(meta, g.getImageData(0, 0, width, height).data);
  }

  /** Two-pass chamfer distance (metres) to the nearest cell with any of `mask`'s flags. */
  private clearance(mask: number): Float32Array {
    const { w, h } = this;
    const c = this.meta.cell;
    const d = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) d[k] = this.flags[k] & mask ? 0 : 1e6;
    const a = c;
    const b = c * Math.SQRT2;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        let v = d[k];
        if (i > 0) v = Math.min(v, d[k - 1] + a);
        if (j > 0) {
          v = Math.min(v, d[k - w] + a);
          if (i > 0) v = Math.min(v, d[k - w - 1] + b);
          if (i < w - 1) v = Math.min(v, d[k - w + 1] + b);
        }
        d[k] = v;
      }
    }
    for (let j = h - 1; j >= 0; j--) {
      for (let i = w - 1; i >= 0; i--) {
        const k = j * w + i;
        let v = d[k];
        if (i < w - 1) v = Math.min(v, d[k + 1] + a);
        if (j < h - 1) {
          v = Math.min(v, d[k + w] + a);
          if (i < w - 1) v = Math.min(v, d[k + w + 1] + b);
          if (i > 0) v = Math.min(v, d[k + w - 1] + b);
        }
        d[k] = v;
      }
    }
    return d;
  }

  private cellOf(x: number, z: number): [number, number] {
    const { origin, cell } = this.meta;
    return [Math.floor((x - origin[0]) / cell), Math.floor((z - origin[1]) / cell)];
  }

  private inside(i: number, j: number) {
    return i >= 0 && j >= 0 && i < this.w && j < this.h;
  }

  /** The height to stand at at a point: the ground or a walkable top on it (the location's ground off the map). */
  heightAt(x: number, z: number): number {
    const [i, j] = this.cellOf(x, z);
    return this.inside(i, j) ? this.lift[j * this.w + i] : groundY(x, z);
  }

  /**
   * The height to stand at: the ground, raised to the highest walkable top under a footprint of
   * `radius` round the point (feet are never in a slab; at its edge the body steps up onto it).
   */
  standY(x: number, z: number, radius = 0.12): number {
    let top = this.heightAt(x, z);
    for (let n = 0; n < 6; n++) {
      const a = (n / 6) * Math.PI * 2;
      top = Math.max(top, this.heightAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius));
    }
    return top;
  }

  private fits(i: number, j: number, body: Body): boolean {
    if (!this.inside(i, j)) return false;
    const k = j * this.w + i;
    return (body.tall ? this.clearAll[k] : this.clearLow[k]) >= body.radius;
  }

  /** The nearest point at which `body` fits, within `reach` metres (the point itself if it fits). */
  nearestFree(p: THREE.Vector3, body: Body, reach = 3): THREE.Vector3 {
    const [i0, j0] = this.cellOf(p.x, p.z);
    if (this.fits(i0, j0, body)) return p.clone();
    const r = Math.ceil(reach / this.meta.cell);
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        const d = di * di + dj * dj;
        if (d < bestD && this.fits(i0 + di, j0 + dj, body)) {
          bestD = d;
          best = [i0 + di, j0 + dj];
        }
      }
    }
    return best ? this.centre(best[0], best[1], p.y) : p.clone();
  }

  private centre(i: number, j: number, y = 0) {
    const { origin, cell } = this.meta;
    return new THREE.Vector3(origin[0] + (i + 0.5) * cell, y, origin[1] + (j + 0.5) * cell);
  }

  /** Nothing in the way of `body` on the straight line from a to b, and no step too high on it. */
  lineFree(a: THREE.Vector3, b: THREE.Vector3, body: Body): boolean {
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / (this.meta.cell * 0.5)));
    let last = this.heightAt(a.x, a.z);
    for (let s = 1; s <= n; s++) {
      const x = a.x + ((b.x - a.x) * s) / n;
      const z = a.z + ((b.z - a.z) * s) / n;
      const [i, j] = this.cellOf(x, z);
      if (!this.fits(i, j, body)) return false;
      const l = this.lift[j * this.w + i];
      if (Math.abs(l - last) > body.step) return false;
      if (this.cost[j * this.w + i] > 120) return false;
      last = l;
    }
    return true;
  }

  /**
   * A route from a to b round what is in the way of `body`: A* over the cells it fits in (eight
   * ways; undergrowth costs more; no step higher than it takes), then straightened wherever the
   * straight line is free. Ends at b's nearest free point. Returns [a, ..., b]; [a, b] if no route.
   */
  findPath(a: THREE.Vector3, b: THREE.Vector3, body: Body): THREE.Vector3[] {
    const start = this.nearestFree(a, body);
    const goal = this.nearestFree(b, body);
    if (this.lineFree(start, goal, body)) return dedupe([a.clone(), start, goal]);
    const { w, h } = this;
    const [si, sj] = this.cellOf(start.x, start.z);
    const [gi, gj] = this.cellOf(goal.x, goal.z);
    const total = w * h;
    const g = new Float32Array(total).fill(Infinity);
    const from = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const heap = new Heap();
    const s0 = sj * w + si;
    const goalK = gj * w + gi;
    g[s0] = 0;
    heap.push(s0, 0);
    const steps: [number, number, number][] = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    ];
    let found = false;
    let budget = 400000;
    while (heap.size && budget-- > 0) {
      const k = heap.pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === goalK) {
        found = true;
        break;
      }
      const i = k % w;
      const j = (k - i) / w;
      for (const [di, dj, len] of steps) {
        const ni = i + di;
        const nj = j + dj;
        if (!this.fits(ni, nj, body)) continue;
        const nk = nj * w + ni;
        if (closed[nk]) continue;
        if (Math.abs(this.lift[nk] - this.lift[k]) > body.step) continue;
        const c = g[k] + len * (1 + (this.cost[nk] / 255) * 4);
        if (c < g[nk]) {
          g[nk] = c;
          from[nk] = k;
          heap.push(nk, c + Math.hypot(gi - ni, gj - nj));
        }
      }
    }
    if (!found) return [a.clone(), b.clone()];
    const cells: THREE.Vector3[] = [];
    for (let k = goalK; k !== -1; k = from[k]) cells.push(this.centre(k % w, Math.floor(k / w)));
    cells.reverse();
    cells[0] = start;
    cells[cells.length - 1] = goal;
    // straighten: from each kept point, go as far along as the line stays free
    const out = [start];
    let at = 0;
    while (at < cells.length - 1) {
      let next = cells.length - 1;
      while (next > at + 1 && !this.lineFree(cells[at], cells[next], body)) next--;
      out.push(cells[next]);
      at = next;
    }
    return dedupe([a.clone(), ...out]);
  }
}

function dedupe(points: THREE.Vector3[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const p of points) if (!out.length || out[out.length - 1].distanceTo(p) > 0.02) out.push(p);
  return out;
}

/** A small binary heap of grid cells by priority. */
class Heap {
  private keys: number[] = [];
  private pri: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(key: number, priority: number) {
    const { keys, pri } = this;
    keys.push(key);
    pri.push(priority);
    let n = keys.length - 1;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (pri[p] <= pri[n]) break;
      [keys[p], keys[n]] = [keys[n], keys[p]];
      [pri[p], pri[n]] = [pri[n], pri[p]];
      n = p;
    }
  }
  pop(): number {
    const { keys, pri } = this;
    const top = keys[0];
    const lastK = keys.pop()!;
    const lastP = pri.pop()!;
    if (keys.length) {
      keys[0] = lastK;
      pri[0] = lastP;
      let n = 0;
      for (;;) {
        const l = 2 * n + 1;
        const r = l + 1;
        let m = n;
        if (l < keys.length && pri[l] < pri[m]) m = l;
        if (r < keys.length && pri[r] < pri[m]) m = r;
        if (m === n) break;
        [keys[m], keys[n]] = [keys[n], keys[m]];
        [pri[m], pri[n]] = [pri[n], pri[m]];
        n = m;
      }
    }
    return top;
  }
}

/** Length along a polyline, and the point and direction at a distance along it. */
export class Polyline {
  readonly lengths: number[] = [0];
  readonly total: number;
  constructor(readonly points: THREE.Vector3[]) {
    for (let n = 1; n < points.length; n++) this.lengths.push(this.lengths[n - 1] + points[n - 1].distanceTo(points[n]));
    this.total = this.lengths[this.lengths.length - 1];
  }
  at(s: number, out: THREE.Vector3): THREE.Vector3 {
    const { points, lengths } = this;
    if (points.length < 2) return out.copy(points[0]);
    const d = Math.min(Math.max(0, s), this.total);
    let n = 1;
    while (n < lengths.length - 1 && lengths[n] < d) n++;
    const seg = lengths[n] - lengths[n - 1];
    return out.copy(points[n - 1]).lerp(points[n], seg > 0 ? (d - lengths[n - 1]) / seg : 0);
  }
  /** Heading (radians, three.js rotation.y) of the way at `s`, looking a little ahead so corners are rounded. */
  heading(s: number): number {
    const a = this.at(s - 0.15, new THREE.Vector3());
    const b = this.at(s + 0.45, new THREE.Vector3());
    if (a.distanceToSquared(b) < 1e-8) {
      const n = this.points.length;
      return Math.atan2(this.points[n - 1].x - this.points[0].x, this.points[n - 1].z - this.points[0].z);
    }
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}
