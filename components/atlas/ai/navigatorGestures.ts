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
  | "thoughtful" | "leanEmphasis" | "shoulderRoll" | "presentLeft" | "explainBoth" | "handOnChest" | "talkClip"
  | "mocapPresent" | "mocapPoint" | "mocapPresentBoth" | "mocapExplainOne" | "mocapExplainTwo" | "mocapShrug" | "mocapNod" | "mocapOffer";

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
  /**
   * A recorded one-shot (Mixamo motion capture, see GESTURE_SHOTS in AtlasNavigatorModel.tsx),
   * played once from start to finish; `dwell` is its length. "present" and "point" pick the arm
   * on the side of the map. Only offered when the model carries the recordings.
   */
  shot?: "present" | "point" | "presentBoth" | "explainOne" | "explainTwo" | "shrug" | "nod" | "offer";
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
    beat: 1.0, beatSlots: ["rFore", "rHand"], dwell: [2.2, 4.0], weight: 2.4, hints: ["explain", "greeting", "status"],
  },
  {
    id: "openPalms",
    pose: both({ arm: [-0.3, 0.54, 0.23], fore: [1.59, -0.65, 0] }),
    beat: 0.4, beatSlots: ["rFore", "lFore"], dwell: [2.4, 4.2], weight: 1.1, hints: ["list", "explain", "people"],
  },
  {
    id: "mapPoint",
    pose: { rArm: [-0.48, -0.58, 0.25], rFore: [1.69, 1.3, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.15, beatSlots: ["rFore"], dwell: [2.5, 4.5], weight: 2.5, needsPeek: true, lean: 0.03, hints: ["location"],
  },
  {
    id: "countOff",
    pose: { rArm: [0.05, 0.3, 0.12], rFore: [1.7, 0.2, 0], rHand: [0.1, 0, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.9, beatSlots: ["rHand", "rFore"], dwell: [2.0, 3.4], weight: 1.4, hints: ["number", "list", "compare"],
  },
  {
    id: "tabletGlance",
    pose: { lArm: [0.35, -0.9, -0.1], lFore: [1.05, 0, 0], lHand: [0.2, 0, 0], rArm: [0.05, 0, 0.04], rFore: [0.12, 0, 0] },
    beat: 0.1, beatSlots: ["lHand"], dwell: [2.0, 3.0], weight: 1.4, hints: ["number", "status"], glanceTablet: true,
  },
  {
    id: "thoughtful",
    // weighing it up: one hand held low in front, palm down, and still (never a hand at the face)
    pose: { rArm: [-0.2, 0.2, 0.19], rFore: [1.3, 1.2, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.1, beatSlots: ["rHand"], dwell: [2.2, 3.6], weight: 0.9, hints: ["question", "compare"], lean: 0.02,
  },
  {
    id: "leanEmphasis",
    pose: both({ arm: [-0.2, 0.2, 0.19], fore: [1.3, 1.2, 0] }),
    beat: 0.5, beatSlots: ["rFore", "lFore"], dwell: [1.6, 2.6], weight: 1.4, hints: ["warning", "number"], lean: 0.1,
  },
  {
    id: "presentLeft",
    pose: { rArm: [-0.63, 0.2, 0.27], rFore: [2.01, -0.81, 0], lArm: [0.05, 0, -0.04], lFore: [0.14, 0, 0] },
    beat: 0.3, beatSlots: ["rFore"], dwell: [2.2, 3.8], weight: 1.0, hints: ["list", "location", "people"],
  },
  {
    id: "explainBoth",
    pose: both({ arm: [-0.22, 0.36, 0.19], fore: [1.4, 0.42, 0] }),
    beat: 0.8, beatSlots: ["rFore", "lFore", "rHand", "lHand"], dwell: [2.0, 3.6], weight: 1.5, hints: ["explain", "compare"],
  },
  // ── Recorded gestures (motion capture) ──
  { id: "mocapPresent", pose: {}, beat: 0, beatSlots: [], dwell: [3.1, 3.1], weight: 1.5, shot: "present", hints: ["location", "list"], lean: 0.02 },
  { id: "mocapPoint", pose: {}, beat: 0, beatSlots: [], dwell: [1.65, 1.65], weight: 0.9, shot: "point", needsPeek: true, hints: ["location"] },
  { id: "mocapPresentBoth", pose: {}, beat: 0, beatSlots: [], dwell: [2.8, 2.8], weight: 1.1, shot: "presentBoth", hints: ["explain", "list"] },
  { id: "mocapExplainOne", pose: {}, beat: 0, beatSlots: [], dwell: [3.4, 3.4], weight: 1.6, shot: "explainOne", hints: ["explain", "people", "status"] },
  { id: "mocapExplainTwo", pose: {}, beat: 0, beatSlots: [], dwell: [3.6, 3.6], weight: 1.3, shot: "explainTwo", hints: ["explain", "compare"] },
  { id: "mocapOffer", pose: {}, beat: 0, beatSlots: [], dwell: [2.6, 2.6], weight: 0.9, shot: "offer", hints: ["greeting", "question", "people"] },
  // only when the words call for them: "we have no record of that" / "yes, that's right"
  { id: "mocapShrug", pose: {}, beat: 0, beatSlots: [], dwell: [1.3, 1.3], weight: 0, shot: "shrug", hints: ["unknown"] },
  { id: "mocapNod", pose: {}, beat: 0, beatSlots: [], dwell: [1.45, 1.45], weight: 0, shot: "nod", hints: ["confirm"] },
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

/** What he is doing while he speaks: a tour guide shows the site, an answer is presented by topic */
export type SpeechActivity = "tour" | "answer" | "line" | null;
export interface DirectorOpts {
  hasPeek: boolean;
  hint: NarrationHint;
  activity?: SpeechActivity;
  /** The model carries the recorded gestures */
  hasClips?: boolean;
}

/**
 * Tour guide: points out the site and presents it with an open arm toward the map, with energy;
 * he hardly looks at his tablet or stands weighing things up. Answering: the topic of the answer
 * matters more than chance (location -> point at the map, figures -> count off / check the tablet,
 * comparison -> both hands, people -> open palms).
 */
const ACTIVITY_BOOST: Record<"tour" | "answer", Partial<Record<GestureId, number>>> = {
  tour: {
    mocapPresent: 5, mocapPresentBoth: 2.2, mocapPoint: 1.8, mocapExplainOne: 1.1, mocapExplainTwo: 1.0,
    mapPoint: 1.3, presentLeft: 0.8, beat: 1.2, explainBoth: 1.2, tabletGlance: 0.35, thoughtful: 0.3, shoulderRoll: 0.3, composed: 0.4,
  },
  answer: { composed: 0.6, shoulderRoll: 0.5 },
};

export function createDirector(now: number): DirectorState {
  const current = GESTURES.find((g) => g.id === "composed") ?? GESTURES[0];
  return { current, since: now, until: now + 1.2, history: [current.id] };
}

/** Pick the next gesture. Pure (given rand) so it can be unit-tested. */
export function pickGesture(
  history: GestureId[],
  opts: DirectorOpts,
  rand: () => number = Math.random
): Gesture {
  const last = history[history.length - 1];
  const recent = new Set(history.slice(-3));
  const pool = GESTURES.filter((g) => {
    if (g.id === last) return false;
    if (g.needsPeek && !opts.hasPeek) return false;
    if (g.shot && !opts.hasClips) return false;
    return true;
  });

  const weights = pool.map((g) => {
    let w = g.weight;
    if (opts.hint && g.hints?.includes(opts.hint)) w *= opts.activity === "answer" ? 3.2 : 2.2;
    const boost = opts.activity === "tour" || opts.activity === "answer" ? ACTIVITY_BOOST[opts.activity][g.id] : undefined;
    if (boost) w *= boost;
    // the words ask for it outright
    if (g.id === "mocapShrug" && opts.hint === "unknown") w = 9;
    if (g.id === "mocapNod" && opts.hint === "confirm") w = 9;
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
  opts: DirectorOpts,
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
