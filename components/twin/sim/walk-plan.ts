/**
 * A person's part as a timeline of segments (P02d): stand somewhere playing a clip, or walk from one
 * place to the next as a real person does it: turn towards the way (a turn clip), start walking,
 * walk, stop, and turn to face what comes next. Clips that move a man (walkStart, walkStop, the
 * turns) carry their travel and turn as curves in the model's extras (`twin_travel`, `twin_turn`,
 * one value a frame at 30 fps, from scripts/blender/twin/build_gate_people_clips.py), so the man is
 * moved exactly as far as his feet go. Everything is worked out from the time, so any moment can be
 * shown again; a model without the curves falls back to gliding at walking pace.
 *
 * No React and no three.js scene objects here: positions in, positions out.
 */
import * as THREE from "three/webgpu";
import { Polyline } from "./walkmap";

const CLIP_FPS = 30;
/** Turns smaller than this are made by easing the heading while standing, without a turn clip. */
const SMALL_TURN = THREE.MathUtils.degToRad(22);
const EASE_TURN = 0.6;

export type Curves = { travel: Record<string, number[]>; turn: Record<string, number[]> };

export function curvesFrom(data: Record<string, unknown> | undefined): Curves {
  return {
    travel: (data?.twin_travel ?? {}) as Record<string, number[]>,
    turn: (data?.twin_turn ?? {}) as Record<string, number[]>,
  };
}

const lengthOf = (curve: number[]) => Math.max(0, curve.length - 1) / CLIP_FPS;
function sample(curve: number[], seconds: number): number {
  if (!curve.length) return 0;
  const x = Math.max(0, seconds * CLIP_FPS);
  const i = Math.floor(x);
  if (i >= curve.length - 1) return curve[curve.length - 1];
  return curve[i] + (curve[i + 1] - curve[i]) * (x - i);
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const headingTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

export type Segment = {
  t0: number;
  t1: number;
  kind: "stand" | "turn" | "start" | "walk" | "stop";
  clip: string;
  /** Repeat the clip (stand and walk); otherwise it is played once, its time set from the loop's clock. */
  loop: boolean;
  from: THREE.Vector3;
  /** The way walked (a route round what is in the way; two points when nothing is). */
  path: Polyline;
  heading0: number;
  heading1: number;
  /** Turn and travel curves are stretched by this to fit the turn or the walk. */
  scale: number;
  /** Metres covered before this segment, on a walk. */
  base: number;
};

export type Walker = {
  curves: Curves;
  walk: { clip: string; made: number; speed: number };
  /** The way from a to b round what is in the way (sim/walkmap.ts); a straight line without it. */
  route?: (a: THREE.Vector3, b: THREE.Vector3) => THREE.Vector3[];
};

type Turn = { clip: string; seconds: number; scale: number } | null;

function turnFor(w: Walker, delta: number): Turn {
  if (Math.abs(delta) < SMALL_TURN) return null;
  const { turn } = w.curves;
  const pick = (clip: string) => {
    const curve = turn[clip];
    if (!curve?.length || Math.abs(curve[curve.length - 1]) < 0.1) return null;
    return { clip, seconds: lengthOf(curve), scale: delta / curve[curve.length - 1] };
  };
  if (delta > 0) return pick("turnLeft");
  return (delta < -2.36 ? pick("turn180") : null) ?? pick("turnRight");
}

/** The pieces of a walk from `a` to `b`, starting facing `heading`, ending facing `faceAfter` (or the way he walked). */
function walkPieces(w: Walker, a: THREE.Vector3, b: THREE.Vector3, heading: number, faceAfter?: THREE.Vector3) {
  const path = new Polyline(w.route ? w.route(a, b) : [a.clone(), b.clone()]);
  const distance = path.total;
  const pts = path.points;
  const way = pts.length > 1 ? headingTo(pts[0], pts[1]) : heading;
  const arrive = pts.length > 1 ? headingTo(pts[pts.length - 2], pts[pts.length - 1]) : way;
  const end = faceAfter ? headingTo(b, faceAfter) : arrive;
  const start = w.curves.travel.walkStart;
  const stop = w.curves.travel.walkStop;
  const has = !!(start?.length && stop?.length);
  const ss = has ? sample(start, lengthOf(start)) : 0;
  const se = has ? sample(stop, lengthOf(stop)) : 0;
  const k = has ? Math.min(1, distance / Math.max(0.01, ss + se)) : 0;
  const walking = Math.max(0, distance - (ss + se) * k);
  return {
    path,
    way,
    arrive,
    end,
    distance,
    first: turnFor(w, wrap(way - heading)),
    last: turnFor(w, wrap(end - arrive)),
    start: has ? { seconds: lengthOf(start), k, metres: ss * k } : null,
    walk: walking / w.walk.speed,
    stop: has ? { seconds: lengthOf(stop), k, metres: se * k } : null,
  };
}

/** Seconds a walk takes, turns included (for laying out a script's times). */
export function walkSeconds(w: Walker, a: THREE.Vector3, b: THREE.Vector3, faceBefore: THREE.Vector3 | number, faceAfter?: THREE.Vector3): number {
  const heading = typeof faceBefore === "number" ? faceBefore : headingTo(a, faceBefore);
  const p = walkPieces(w, a, b, heading, faceAfter);
  return (p.first?.seconds ?? 0) + (p.start?.seconds ?? 0) + p.walk + (p.stop?.seconds ?? 0) + (p.last?.seconds ?? 0);
}

/** One beat of a script: stand doing something until `until`, or walk to `to` by then. */
export type Beat = {
  until: number;
  to?: THREE.Vector3;
  /** A point to face while standing (the pickup, the other man). */
  face?: THREE.Vector3;
  clip: string;
  once?: boolean;
};

/** Lay a list of beats out as segments. `home` is where the person starts; `heading0` how he faces then. */
export function planBeats(w: Walker, beats: Beat[], home: THREE.Vector3, heading0: number): Segment[] {
  const out: Segment[] = [];
  let at = home.clone();
  let heading = heading0;
  let t = 0;
  const push = (seg: Omit<Segment, "path" | "scale" | "base"> & Partial<Segment>) => {
    out.push({ path: new Polyline([seg.from.clone()]), scale: 1, base: 0, ...seg } as Segment);
  };
  beats.forEach((beat, i) => {
    const until = beat.until;
    if (beat.to) {
      const next = beats[i + 1];
      const p = walkPieces(w, at, beat.to, heading, next && !next.to ? next.face : undefined);
      let s = t;
      if (p.first) {
        push({ t0: s, t1: s + p.first.seconds, kind: "turn", clip: p.first.clip, loop: false, from: at.clone(), heading0: heading, heading1: p.way, scale: p.first.scale });
        s += p.first.seconds;
      }
      // (without a turn clip, a small turn eases in while he sets off)
      const base = { from: at.clone(), path: p.path, heading0: p.way, heading1: p.arrive };
      if (p.start) {
        push({ t0: s, t1: s + p.start.seconds, kind: "start", clip: "walkStart", loop: false, ...base, heading0: p.first ? p.way : heading, scale: p.start.k, base: 0 });
        s += p.start.seconds;
      }
      push({ t0: s, t1: s + p.walk, kind: "walk", clip: w.walk.clip, loop: true, ...base, heading0: p.start || p.first ? p.way : heading, base: p.start?.metres ?? 0 });
      s += p.walk;
      if (p.stop) {
        push({ t0: s, t1: s + p.stop.seconds, kind: "stop", clip: "walkStop", loop: false, ...base, scale: p.stop.k, base: p.distance - p.stop.metres });
        s += p.stop.seconds;
      }
      heading = p.arrive;
      if (p.last) {
        push({ t0: s, t1: s + p.last.seconds, kind: "turn", clip: p.last.clip, loop: false, from: beat.to.clone(), heading0: heading, heading1: p.end, scale: p.last.scale });
        s += p.last.seconds;
        heading = p.end;
      }
      // (a window longer than the walk: the last piece holds; shorter: the next beat starts late)
      out[out.length - 1].t1 = Math.max(s, until);
      t = out[out.length - 1].t1;
      at = beat.to.clone();
      return;
    }
    const want = beat.face ? headingTo(at, beat.face) : heading;
    const turn = turnFor(w, wrap(want - heading));
    let s = t;
    if (turn && Math.min(until, Infinity) - s > turn.seconds + 0.5) {
      push({ t0: s, t1: s + turn.seconds, kind: "turn", clip: turn.clip, loop: false, from: at.clone(), heading0: heading, heading1: want, scale: turn.scale });
      s += turn.seconds;
      heading = want;
    }
    push({ t0: s, t1: Math.max(s, until), kind: "stand", clip: beat.clip, loop: !beat.once, from: at.clone(), heading0: heading, heading1: want });
    heading = want;
    t = Math.max(s, until);
  });
  return out;
}

/** Where a person on `plan` is at time `t`: position, heading, and the clip with its time (null: let it run). */
export function poseAt(w: Walker, plan: Segment[], t: number, out: THREE.Vector3): { heading: number; seg: Segment; clipTime: number | null } {
  let seg = plan[plan.length - 1];
  for (const s of plan) {
    if (t < s.t1) {
      seg = s;
      break;
    }
  }
  const tau = Math.max(0, t - seg.t0);
  let heading = seg.heading1;
  let clipTime: number | null = null;
  switch (seg.kind) {
    case "turn": {
      const curve = w.curves.turn[seg.clip] ?? [];
      out.copy(seg.from);
      heading = seg.heading0 + sample(curve, tau) * seg.scale;
      clipTime = tau;
      break;
    }
    case "start": {
      const s = sample(w.curves.travel.walkStart ?? [], tau) * seg.scale;
      seg.path.at(s, out);
      // (a small turn left over eases in as he sets off)
      heading = seg.path.heading(s) + wrap(seg.heading0 - seg.path.heading(0)) * (1 - Math.min(1, tau / EASE_TURN));
      clipTime = tau;
      break;
    }
    case "walk": {
      const s = w.curves.travel.walkStart?.length ? seg.base + w.walk.speed * tau : w.walk.speed * tau;
      seg.path.at(s, out);
      heading = seg.path.heading(s) + (seg.base ? 0 : wrap(seg.heading0 - seg.path.heading(0)) * (1 - Math.min(1, tau / EASE_TURN)));
      break;
    }
    case "stop": {
      const s = seg.base + sample(w.curves.travel.walkStop ?? [], tau) * seg.scale;
      seg.path.at(s, out);
      heading = seg.path.heading(Math.min(s, seg.path.total - 0.46));
      clipTime = tau;
      break;
    }
    default: {
      out.copy(seg.from);
      heading = seg.heading0 + wrap(seg.heading1 - seg.heading0) * Math.min(1, tau / EASE_TURN);
      clipTime = seg.loop ? null : tau;
    }
  }
  return { heading, seg, clipTime };
}
