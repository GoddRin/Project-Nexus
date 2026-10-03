/**
 * Narration body-language library + director for the Atlas Navigator.
 *
 * A gesture is a *pose* (per-bone-slot Euler deltas in the bone's local frame) plus optional
 * beat modulation. The director picks gestures by weight, narration hint and availability,
 * enforces min/max dwell time and never repeats the same gesture twice in a row, so a long
 * narration looks varied instead of looping one animation.
 */
import type { NarrationHint } from "@/lib/atlas-ai/visemes";

export type PoseSlot =
  | "spine" | "spine1" | "spine2" | "head" | "neck"
  | "lShoulder" | "rShoulder"
  | "lArm" | "rArm" | "lFore" | "rFore" | "lHand" | "rHand";

export type Euler3 = [number, number, number];
export type PoseDelta = Partial<Record<PoseSlot, Euler3>>;

export type GestureId =
  | "composed" | "beat" | "openPalms" | "mapPoint" | "countOff" | "tabletGlance"
  | "thoughtful" | "leanEmphasis" | "shoulderRoll" | "presentLeft" | "explainBoth" | "handOnChest" | "talkClip";

export interface Gesture {
  id: GestureId;
  pose: PoseDelta;
  /** Amount of the pose driven by speech energy beats (0..1) */
  beat: number;
  /** Which slots receive beat modulation */
  beatSlots: PoseSlot[];
  dwell: [number, number];
  weight: number;
  /** Only eligible when a map peek target exists */
  needsPeek?: boolean;
  /** Narration hints that boost this gesture */
  hints?: NarrationHint[];
  /** Look-down at wrist tablet while active */
  glanceTablet?: boolean;
  /** Extra torso lean (radians, pitch) */
  lean?: number;
  /** A motion-capture clip in the model that IS this gesture (the pose is then left empty) */
  clip?: string;
}

// Euler3 = [flex, twist, abduct], right-arm convention, relative to the relaxed arms-down pose:
//   flex   > 0 raises the limb forward        abduct > 0 swings it outward
//   twist  > 0 turns the upper arm inward so a bent forearm crosses the chest
// Left-side values are the mirror image (negated twist/abduct), see `mirror()`.
// The elbow is a hinge: forearm values use `flex` (bend) and `twist` (palm up / down) only, never
// `abduct`. Poses are solved against the rig so the hands stay in front of the torso and inside
// his narrow frame (scripts/blender/solve_pose.py renders them headless to check).
const mirror = (e: Euler3): Euler3 => [e[0], -e[1], -e[2]];

function both(r: { arm: Euler3; fore: Euler3; hand?: Euler3 }): PoseDelta {
  return {
    rArm: r.arm, rFore: r.fore, rHand: r.hand ?? [0, 0, 0],
    lArm: mirror(r.arm), lFore: mirror(r.fore), lHand: mirror(r.hand ?? [0, 0, 0]),
  };
}

export const GESTURES: Gesture[] = [
  {
    id: "composed",
    pose: { rArm: [0.05, 0, 0.04], rFore: [0.12, 0, 0], lArm: [0.05, 0, -0.04], lFore: [0.12, 0, 0] },
    beat: 0.1, beatSlots: ["rHand", "lHand"], dwell: [1.8, 3.2], weight: 1.0,
  },
  {
    // Dominant hand chops on stressed syllables
    id: "beat",
    pose: { rArm: [-0.19, 0.32, 0.18], rFore: [1.43, 0.41, 0], rHand: [0.12, 0, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 1.0, beatSlots: ["rFore", "rHand"], dwell: [2.2, 4.0], weight: 2.4, hints: ["explain", "greeting"],
  },
  {
    id: "openPalms",
    pose: both({ arm: [-0.3, 0.54, 0.23], fore: [1.59, -0.65, 0] }),
    beat: 0.4, beatSlots: ["rFore", "lFore"], dwell: [2.4, 4.2], weight: 1.1, hints: ["list", "explain"],
  },
  {
    id: "mapPoint",
    pose: { rArm: [-0.48, -0.58, 0.25], rFore: [1.69, 1.3, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.15, beatSlots: ["rFore"], dwell: [2.5, 4.5], weight: 2.5, needsPeek: true, lean: 0.03,
  },
  {
    id: "countOff",
    pose: { rArm: [0.05, 0.3, 0.12], rFore: [1.7, 0.2, 0], rHand: [0.1, 0, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.9, beatSlots: ["rHand", "rFore"], dwell: [2.0, 3.4], weight: 1.4, hints: ["number", "list"],
  },
  {
    id: "tabletGlance",
    pose: { lArm: [0.35, -0.9, -0.1], lFore: [1.05, 0, 0], lHand: [0.2, 0, 0], rArm: [0.05, 0, 0.04], rFore: [0.12, 0, 0] },
    beat: 0.1, beatSlots: ["lHand"], dwell: [2.0, 3.0], weight: 1.4, hints: ["number"], glanceTablet: true,
  },
  {
    id: "thoughtful",
    // weighing it up: one hand held low in front, palm down, and still (never a hand at the face)
    pose: { rArm: [-0.2, 0.2, 0.19], rFore: [1.3, 1.2, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.1, beatSlots: ["rHand"], dwell: [2.2, 3.6], weight: 0.9, hints: ["explain", "question"], lean: 0.02,
  },
  {
    id: "leanEmphasis",
    pose: both({ arm: [-0.2, 0.2, 0.19], fore: [1.3, 1.2, 0] }),
    beat: 0.5, beatSlots: ["rFore", "lFore"], dwell: [1.6, 2.6], weight: 1.4, hints: ["warning", "number"], lean: 0.1,
  },
  {
    id: "presentLeft",
    pose: { rArm: [-0.63, 0.2, 0.27], rFore: [2.01, -0.81, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.3, beatSlots: ["rFore"], dwell: [2.2, 3.8], weight: 1.0, hints: ["list"],
  },
  {
    id: "explainBoth",
    pose: both({ arm: [-0.22, 0.36, 0.19], fore: [1.4, 0.42, 0] }),
    beat: 0.8, beatSlots: ["rFore", "lFore", "rHand", "lHand"], dwell: [2.0, 3.6], weight: 1.5, hints: ["explain"],
  },
  {
    // Reset / weight shift: keeps the body from freezing in any one pose
    id: "shoulderRoll",
    pose: { lShoulder: [0, 0, 0.06], rShoulder: [0, 0, -0.06], rArm: [0.06, 0, 0.04], rFore: [0.14, 0, 0], lArm: [0.06, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.1, beatSlots: [], dwell: [1.0, 1.6], weight: 0.5,
  },
];

export interface DirectorState {
  current: Gesture;
  since: number;
  until: number;
  history: GestureId[];
}

export function createDirector(now: number): DirectorState {
  const current = GESTURES.find((g) => g.id === "composed") ?? GESTURES[0];
  return { current, since: now, until: now + 1.2, history: [current.id] };
}

/** Pick the next gesture. Pure (given rand) so it can be unit-tested. */
export function pickGesture(
  history: GestureId[],
  opts: { hasPeek: boolean; hint: NarrationHint },
  rand: () => number = Math.random
): Gesture {
  const last = history[history.length - 1];
  const recent = new Set(history.slice(-3));
  const pool = GESTURES.filter((g) => {
    if (g.id === last) return false;
    if (g.needsPeek && !opts.hasPeek) return false;
    return true;
  });

  const weights = pool.map((g) => {
    let w = g.weight;
    if (opts.hint && g.hints?.includes(opts.hint)) w *= 2.2;
    if (recent.has(g.id)) w *= 0.35;
    if (g.id === "mapPoint" && opts.hasPeek) w *= 1.8;
    return w;
  });

  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function advanceDirector(
  d: DirectorState,
  now: number,
  opts: { hasPeek: boolean; hint: NarrationHint },
  rand: () => number = Math.random
): void {
  if (now < d.until) return;
  const g = pickGesture(d.history, opts, rand);
  d.current = g;
  d.since = now;
  d.until = now + g.dwell[0] + rand() * (g.dwell[1] - g.dwell[0]);
  d.history.push(g.id);
  if (d.history.length > 6) d.history.shift();
}

/** Idle-life micro gestures used when not speaking (subtle, rare). */
export const IDLE_GESTURES: GestureId[] = ["shoulderRoll", "composed"];
