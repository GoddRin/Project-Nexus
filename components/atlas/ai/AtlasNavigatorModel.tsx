"use client";

import React, { useRef, useEffect, useLayoutEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Lightformer } from "@react-three/drei";
import {
  AtlasNavigatorState,
  AtlasNavigatorReaction,
  AtlasNavigatorGazeTarget,
  ATLAS_NAVIGATOR_MODEL_URL,
} from "@/components/atlas/AtlasTokens";
import type { LipSyncTelemetry } from "./useLipSync";
import { navigatorBus } from "./navigatorBus";
import {
  GESTURES,
  advanceDirector,
  createDirector,
  type DirectorState,
  type PoseSlot,
} from "./navigatorGestures";
import { VISEME_IDS } from "@/lib/atlas-ai/visemes";
import { FACE_CHANNELS, resolveRecipes, type FaceChannel } from "./navigatorFace";
import { EXPRESSIONS, EXPRESSION_CHANNELS, EXPRESSION_STRENGTH, MICRO_EXPRESSIONS, pickExpression, type ExpressionId } from "./navigatorExpressions";
import { getPersonality } from "./navigatorLines";

useGLTF.preload(ATLAS_NAVIGATOR_MODEL_URL);

export interface AtlasNavigatorModelProps {
  state: AtlasNavigatorState;
  reaction: AtlasNavigatorReaction;
  gazeTarget: AtlasNavigatorGazeTarget;
  visualMode: "companion" | "bust" | "heroic_center";
  /** The computer asks for less motion. He is not frozen: he keeps breathing, looking and
   *  gesturing gently while he speaks ("calm"), and leaves out the big reactions and recorded moves. */
  reducedMotion?: boolean;
  lipSyncRef?: React.MutableRefObject<LipSyncTelemetry>;
  isTapInteracting?: boolean;
  /** Bumped by the avatar whenever a tap/hover reaction should play (id from navigatorBus.pendingReaction) */
  reactionNonce?: number;
  /** Base map style, so the rim light matches the scene he stands in front of */
  mapStyle?: "DARK" | "LIGHT" | "SATELLITE";
}

// ─── Pose maths ──────────────────────────────────────────────────────────────
// Every procedural rotation is authored in MODEL SPACE (three.js / glTF): +X = character's left,
// +Y = up, +Z = the way the character faces. At load we record each driven bone's model-space
// orientation `A` in the relaxed arms-down pose and its local quaternion `LA`; per frame
//   bone.quaternion = LA * (A⁻¹ · G · A)
// where G is the accumulated model-space rotation for that bone. This is independent of how the
// rig's bones happen to be rolled/oriented, so no per-rig axis guessing is needed.

const SLOTS: PoseSlot[] = [
  "spine", "spine1", "spine2", "neck", "head",
  "lShoulder", "rShoulder", "lArm", "rArm", "lFore", "rFore", "lHand", "rHand",
];
const SLOT_INDEX = Object.fromEntries(SLOTS.map((s, i) => [s, i])) as Record<PoseSlot, number>;
const LIMB_SLOTS = new Set<PoseSlot>(["lArm", "rArm", "lFore", "rFore", "lHand", "rHand", "lShoulder", "rShoulder"]);

type DrivenKey = PoseSlot | "hips" | "eyeL" | "eyeR";
const DRIVEN: DrivenKey[] = [...SLOTS, "hips", "eyeL", "eyeR"];
const DRIVEN_INDEX = Object.fromEntries(DRIVEN.map((s, i) => [s, i])) as Record<DrivenKey, number>;

const BONE_NAMES: Record<DrivenKey, string> = {
  hips: "Hips", spine: "Spine", spine1: "Spine1", spine2: "Spine2", neck: "Neck", head: "Head",
  lShoulder: "LeftShoulder", rShoulder: "RightShoulder",
  lArm: "LeftArm", rArm: "RightArm", lFore: "LeftForeArm", rFore: "RightForeArm",
  lHand: "LeftHand", rHand: "RightHand", eyeL: "LeftEye", eyeR: "RightEye",
};

const DEG = Math.PI / 180;

// Critically damped spring (no overshoot) — silky and frame-rate independent
interface Spring { p: number; v: number }
function stepSpring(s: Spring, target: number, omega: number, dt: number): number {
  const x = s.p - target;
  const e = Math.exp(-omega * dt);
  const t = (s.v + omega * x) * dt;
  s.v = (s.v - omega * t) * e;
  s.p = target + (x + t) * e;
  return s.p;
}
const mkSpring = (): Spring => ({ p: 0, v: 0 });

// Overlay arm poses, [flex, twist, abduct]. Solved against the rig (scripts/blender/solve_pose.py)
// so that they only use movements a real arm has: the shoulder turns freely, the elbow is a hinge
// (forearm `flex`) plus forearm rotation (`twist`), and the forearm is never bent sideways
// (forearm `abduct` stays 0 - that sideways elbow is what made the old wave look dislocated).
// They also keep the hand inside his narrow frame.
type E3 = [number, number, number];
// (elbow by the ribs, forearm up in front of the shoulder, open palm: solved with pose_render.py.
//  The earlier pose and the Mixamo "Waving" recording both held the upper arm out sideways at
//  shoulder height, which the user called bent / "halfway sideways".)
const WAVE = { arm: [0.55, -0.6, 0.05] as E3, fore: [2.3, 1.2, 0] as E3 };
const PRESENT = { arm: [-0.63, 0.2, 0.27] as E3, fore: [2.01, -0.81, 0] as E3 };
const POINT = { arm: [-0.48, -0.58, 0.25] as E3, fore: [1.69, 1.3, 0] as E3 };
/** "Easy / hold on": one hand low in front, palm down */
const EASY = { arm: [-0.2, 0.2, 0.19] as E3, fore: [1.3, 1.2, 0] as E3 };

/**
 * Reactions that have a motion-capture clip in the model (Mesh2Motion / Quaternius, CC0, retargeted
 * with scripts/blender/retarget_m2m_animations.py). `start` / `end` pick the useful stretch of the
 * clip in seconds. When the model has no clips, the posed version of the reaction is used instead.
 */
type ShotDef = {
  clip: string; start: number; end: number; speed: number; loop?: boolean;
  /** How much of the recording is played (1 = as performed). A "hard" nod and a full bow are
   *  large movements: at 1 they read as him bowing to the floor. */
  gain?: number;
};
const SHOT_CLIPS: Record<string, ShotDef> = {
  // Mixamo motion capture (male performer, exported on Y Bot; scripts/blender/add_mixamo_clips.py).
  // Each was reviewed on him frame by frame (scripts/blender/render_clip_review.py).
  // 2026-10-03: the user lifted the earlier limits (hand on hip / chest / chin, head tilts, hip
  // sway), so the recordings now play as performed, head included.
  // `start` / `end` cut each recording to its useful stretch. His RIGHT arm is on screen-left.
  // Tap reactions ("nod", "salute") are NOT recordings: Mixamo's nods are big, and stacked on his
  // own small nod they had him bowing at every tap. They stay the short posed nod of section 4b.
  // (no recorded wave: Mixamo's holds the upper arm straight out to the side. The wave is posed.)
  shrug: { clip: "shrug", start: 0.2, end: 1.5, speed: 1 },
  bow: { clip: "bow", start: 0.2, end: 2.65, speed: 1, gain: 0.55 },
  presentRight: { clip: "presentL", start: 0.2, end: 3.3, speed: 1.1 }, // toward screen-right
  presentLeft: { clip: "presentR", start: 0.2, end: 3.3, speed: 1.1 },
};
/** The same recordings as speaking gestures (navigatorGestures.ts `shot`), by clip */
const GESTURE_SHOTS: Record<string, ShotDef> = {
  presentR: { clip: "presentR", start: 0.2, end: 3.3, speed: 1 },
  presentL: { clip: "presentL", start: 0.2, end: 3.3, speed: 1 },
  presentBoth: { clip: "presentBoth", start: 0.2, end: 3.0, speed: 1 },
  // (the recording opens with a long look at the floor: only the point itself is used)
  pointR: { clip: "pointR", start: 1.75, end: 3.4, speed: 1 },
  pointL: { clip: "pointL", start: 1.75, end: 3.4, speed: 1 },
  // played in full: a hand to the chest as he starts, and (explainTwo) a hand on the hip to finish
  explainOne: { clip: "explainOne", start: 0.2, end: 3.6, speed: 1 },
  explainTwo: { clip: "explainTwo", start: 0.2, end: 3.8, speed: 1 },
  offer: { clip: "offer", start: 0.2, end: 2.8, speed: 1 },
  shrug: { clip: "shrug", start: 0.2, end: 1.5, speed: 1 },
  nod: { clip: "nodFirm", start: 0.1, end: 1.55, speed: 1, gain: 0.5 },
};
/**
 * Parts of each recorded gesture that are NOT played. Hips, legs and feet always stay his own
 * (planted, square to the viewer). For arm gestures the neck and head stay with the gaze solver,
 * so he keeps looking where he should and the head stays level; nods and the bow keep theirs.
 */
const BODY_ONLY = /(Hips|UpLeg|Leg|Foot|ToeBase|Toe_End|Neck|Head|HeadTop_End|Eye)\.(quaternion|position|scale)$/;
const BODY_AND_HEAD = /(Hips|UpLeg|Leg|Foot|ToeBase|Toe_End|Eye)\.(quaternion|position|scale)$/;
const GESTURE_CLIP_FILTER: Record<string, RegExp> = {
  // (the pointing recording looks at the floor first: its head stays with the gaze solver)
  pointR: BODY_ONLY, pointL: BODY_ONLY, wave: BODY_ONLY,
  // head as recorded (tilts and all); feet stay planted
  presentR: BODY_AND_HEAD, presentL: BODY_AND_HEAD, presentBoth: BODY_AND_HEAD,
  explainOne: BODY_AND_HEAD, explainTwo: BODY_AND_HEAD, shrug: BODY_AND_HEAD, offer: BODY_AND_HEAD,
  nodFirm: BODY_AND_HEAD, acknowledge: BODY_AND_HEAD, bow: BODY_AND_HEAD, nodListen: BODY_AND_HEAD,
  // idleNeutral is not filtered: the weight on one leg and the turned hips ARE the stance
};
/** Thinking: hand at the jaw (solved with solve_pose.py against the chin, rendered to check) */
const CHIN = { arm: [-0.74, 1.23, 0.69] as [number, number, number], fore: [2.4, 0.48, 0] as [number, number, number] };
function withoutTracks(source: THREE.AnimationClip, drop: RegExp): THREE.AnimationClip {
  const clip = source.clone();
  clip.tracks = clip.tracks.filter((track) => !drop.test(track.name));
  return clip;
}
/**
 * Standing loops, and the parts of each that are NOT taken from the recording (see steadyClip).
 * The library's idle stands with the hips turned about 25 degrees and the weight on one leg, the
 * spine and neck turned back the other way; arms-folded does the same with the hips and head.
 */
const STEADY_CLIPS: Record<string, RegExp> = {
  // Mixamo "Breathing Idle": already square-on; the legs and head are still left to the model
  idleBreathing: /(Hips|UpLeg|Leg|Foot|ToeBase|Toe_End|Neck|Head)\.(quaternion|position)$/,
  idleSubtle: /(Hips|UpLeg|Leg|Foot|ToeBase|Spine\d?|Neck|Head)\.(quaternion|position)$/,
  foldArms: /(Hips|UpLeg|Leg|Foot|ToeBase|Head)\.(quaternion|position)$/,
};

/**
 * A standing loop squared up to the viewer: the turned hips, the one-legged stance and the
 * counter-turned spine are left out, so those bones stay in the model's own upright stance (the
 * breathing, gaze and lean are added in code). The wrists are held at their first frame; the
 * library's idle turns them through about 20 degrees.
 */
function steadyClip(source: THREE.AnimationClip): THREE.AnimationClip {
  const clip = source.clone();
  const left = STEADY_CLIPS[source.name];
  clip.tracks = clip.tracks.filter((track) => !left.test(track.name));
  for (const track of clip.tracks) {
    const v = track.values;
    if (/Hand\.quaternion$/.test(track.name)) {
      for (let i = 4; i < v.length; i++) v[i] = v[i % 4];
    }
  }
  return clip;
}

/** Camera while he walks: far enough back to show the whole figure */
const WALK_CAM_POS = new THREE.Vector3(0, 1.0, 3.5);
const WALK_CAM_LOOK = new THREE.Vector3(0, 0.94, 0);

/** How much larger expressions are played in the small companion view (see section 9) */
const COMPANION_EXPRESSION_GAIN = 1.8;

/** Position of each expression channel in the per-frame face arrays */
const FX = Object.fromEntries(EXPRESSION_CHANNELS.map((ch, i) => [ch, i])) as Record<(typeof EXPRESSION_CHANNELS)[number], number>;

/** Clips that are scrubbed by hand as one-shots (their own clock is stopped) */
const SHOT_CLIP_NAMES = new Set([...Object.values(SHOT_CLIPS), ...Object.values(GESTURE_SHOTS)].map((x) => x.clip));

interface AnimLayer {
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  weights: Record<string, number>;
}

const OVERLAY_DURATIONS: Record<string, number> = {
  bow: 2.4, presentRight: 1.9, presentLeft: 1.9, wave: 1.7, nod: 0.7, surprise: 1.0, tilt: 1.2, shrug: 1.5, salute: 0.8, greet: 1.8, point: 2.0, shake: 1.3,
};

interface FaceBinding {
  /** unique (influences array, index) pairs */
  slots: Array<{ inf: number[]; idx: number }>;
  acc: Float32Array;
  /** channel → [slotIndex, weight][] */
  channels: Record<FaceChannel, Array<[number, number]>>;
}

interface Rig {
  bones: Array<THREE.Object3D | null>;
  A: THREE.Quaternion[];
  Ainv: THREE.Quaternion[];
  LA: THREE.Quaternion[];
  face: FaceBinding | null;
  /** Right-hand finger joints: relaxed curl and the opened hand used while waving */
  fingers: Array<{ bone: THREE.Object3D; relaxed: THREE.Quaternion; open: THREE.Quaternion }>;
  ready: boolean;
}

function findBone(scene: THREE.Object3D, name: string): THREE.Object3D | null {
  return (
    scene.getObjectByName(`mixamorig_${name}`) ||
    scene.getObjectByName(`mixamorig:${name}`) ||
    scene.getObjectByName(`mixamorig${name}`) ||
    scene.getObjectByName(name) ||
    null
  );
}

function buildRig(scene: THREE.Object3D): Rig {
  // 1. Restore the pristine rest pose (the cached glTF scene survives HMR / StrictMode re-runs)
  const orig: Map<string, THREE.Quaternion> = (scene.userData.__atlasRest ??= new Map());
  scene.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const saved = orig.get(o.uuid);
    if (saved) o.quaternion.copy(saved);
    else orig.set(o.uuid, o.quaternion.clone());
  });
  scene.updateMatrixWorld(true);

  const invScene = scene.getWorldQuaternion(new THREE.Quaternion()).invert();
  const W = new THREE.Quaternion();
  const tmp = new THREE.Quaternion();
  const modelQ = (b: THREE.Object3D, out: THREE.Quaternion) =>
    out.copy(invScene).multiply(b.getWorldQuaternion(tmp));
  /** Rotate a bone by a model-space quaternion, in its current pose. */
  const rotModel = (b: THREE.Object3D | null, x: number, y: number, z: number) => {
    if (!b) return;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG, "XYZ"));
    modelQ(b, W);
    b.quaternion.multiply(W.clone().invert().multiply(q).multiply(W));
    b.updateMatrixWorld(true);
  };

  // 2. Relaxed standing pose from the T-pose: arms hanging close to the body, elbows a little
  //    bent, the backs of the hands turned forward and the fingers loosely curled (a man standing
  //    at ease, rather than arms held away from the sides with open hands)
  const bones = DRIVEN.map((k) => findBone(scene, BONE_NAMES[k]));
  const get = (k: DrivenKey) => bones[DRIVEN_INDEX[k]];
  rotModel(get("lShoulder"), 0, 0, -7);
  rotModel(get("rShoulder"), 0, 0, 7);
  rotModel(get("lArm"), 0, 0, -75);
  rotModel(get("rArm"), 0, 0, 75);
  rotModel(get("lArm"), -4, 0, 0);
  rotModel(get("rArm"), -4, 0, 0);
  rotModel(get("lFore"), -20, 0, 0);
  rotModel(get("rFore"), -20, 0, 0);
  rotModel(get("lFore"), 0, 40, 0);
  rotModel(get("rFore"), 0, -40, 0);
  const fingers: Rig["fingers"] = [];
  for (const side of ["Left", "Right"] as const) {
    const s = side === "Left" ? -1 : 1;
    for (const finger of ["Index", "Middle", "Ring", "Pinky"]) {
      for (let j = 1; j <= 3; j++) {
        const fb = findBone(scene, `${side}Hand${finger}${j}`);
        rotModel(fb, 0, 0, s * (j === 1 ? 22 : 30));
        if (fb && side === "Right") {
          // the same joint with the hand opened (used while waving), then back to relaxed
          const relaxed = fb.quaternion.clone();
          rotModel(fb, 0, 0, -s * (j === 1 ? 16 : 22));
          fingers.push({ bone: fb, relaxed, open: fb.quaternion.clone() });
          fb.quaternion.copy(relaxed);
          fb.updateMatrixWorld(true);
        }
      }
    }
    rotModel(findBone(scene, `${side}HandThumb2`), 0, 0, s * 10);
  }
  scene.updateMatrixWorld(true);

  const A = bones.map((b) => (b ? modelQ(b, new THREE.Quaternion()) : new THREE.Quaternion()));
  const Ainv = A.map((q) => q.clone().invert());
  const LA = bones.map((b) => (b ? b.quaternion.clone() : new THREE.Quaternion()));

  // 3. Meshes: materials + face morph bindings
  const morphMeshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // Skinned bounds drift with animation — never frustum cull the avatar (prevents pop-out/flicker)
    mesh.frustumCulled = false;
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphMeshes.push(mesh);

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !mat.isMeshStandardMaterial) return;
      mat.envMapIntensity = 0.9;
      if (mat.map) mat.map.anisotropy = 8;
      if (/MikeAlger/i.test(mat.name)) {
        // photo-scanned albedo: keep it matte so skin/cloth never look plastic
        mat.metalness = 0;
        mat.roughness = Math.max(mat.roughness, 0.62);
      }
    });
  });

  let face: FaceBinding | null = null;
  if (morphMeshes.length) {
    const available = new Set<string>();
    morphMeshes.forEach((m) => Object.keys(m.morphTargetDictionary!).forEach((n) => available.add(n)));
    const recipes = resolveRecipes(available);
    const slots: FaceBinding["slots"] = [];
    const slotOf = new Map<string, number[]>(); // morph name → slot indices (one per mesh)
    morphMeshes.forEach((m) => {
      for (const [name, idx] of Object.entries(m.morphTargetDictionary!)) {
        const list = slotOf.get(name) ?? [];
        list.push(slots.length);
        slots.push({ inf: m.morphTargetInfluences!, idx });
        slotOf.set(name, list);
      }
    });
    const channels = {} as FaceBinding["channels"];
    for (const ch of FACE_CHANNELS) {
      channels[ch] = [];
      for (const [name, w] of recipes[ch]) {
        for (const si of slotOf.get(name) ?? []) channels[ch].push([si, w]);
      }
    }
    face = { slots, acc: new Float32Array(slots.length), channels };
  }

  return { bones, A, Ainv, LA, face, fingers, ready: true };
}

export const AtlasNavigatorModel: React.FC<AtlasNavigatorModelProps> = ({
  state,
  reaction,
  gazeTarget,
  visualMode,
  reducedMotion = false,
  lipSyncRef,
  isTapInteracting = false,
  reactionNonce = 0,
  mapStyle = "DARK",
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ATLAS_NAVIGATOR_MODEL_URL);
  const { camera, gl } = useThree();

  const rigRef = useRef<Rig | null>(null);
  // Motion-capture layer: recorded body motion underneath, with gaze, face and the posed arm
  // gestures applied on top each frame. Absent when the model carries no clips.
  const animRef = useRef<AnimLayer | null>(null);
  useLayoutEffect(() => {
    rigRef.current = buildRig(scene);
    if (!animations?.length) {
      animRef.current = null;
      return;
    }
    const mixer = new THREE.AnimationMixer(scene);
    const actions: Record<string, THREE.AnimationAction> = {};
    const weights: Record<string, number> = {};
    for (const source of animations) {
      const clip = STEADY_CLIPS[source.name]
        ? steadyClip(source)
        : GESTURE_CLIP_FILTER[source.name]
        ? withoutTracks(source, GESTURE_CLIP_FILTER[source.name])
        : source;
      const action = mixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveWeight(0);
      if (SHOT_CLIP_NAMES.has(clip.name)) action.timeScale = 0;
      action.play();
      actions[clip.name] = action;
      weights[clip.name] = 0;
    }
    animRef.current = { mixer, actions, weights };
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      animRef.current = null;
    };
  }, [scene, animations]);

  // ── Per-frame state (all preallocated; zero GC in the render loop) ──
  const S = useRef({
    camPos: new THREE.Vector3(0, 1.47, 1.58),
    camLook: new THREE.Vector3(0, 1.41, 0),
    tPos: new THREE.Vector3(),
    tLook: new THREE.Vector3(),
    G: DRIVEN.map(() => new THREE.Quaternion()),
    tmpQ: new THREE.Quaternion(),
    tmpE: new THREE.Euler(),
    tgt: new Float32Array(SLOTS.length * 3),
    pos: SLOTS.map(() => [mkSpring(), mkSpring(), mkSpring()]),
    gEyeYaw: mkSpring(), gEyePitch: mkSpring(),
    gHeadYaw: mkSpring(), gHeadPitch: mkSpring(),
    gNeckYaw: mkSpring(), gNeckPitch: mkSpring(),
    gSpineYaw: mkSpring(),
    headRoll: mkSpring(), headNod: mkSpring(), leanSp: mkSpring(), dragSpring: mkSpring(),
    fingerOpen: mkSpring(),
    armW: { l: 0, r: 0 },
    shot: null as null | (ShotDef & { t0: number; gesture?: boolean; cut?: boolean }),
    lastGestureSince: -1,
    idleSince: 0,
    walkW: 0,
    invScene: new THREE.Quaternion(),
    // the mixer's own output for every bone we adjust (see 8a)
    animCache: DRIVEN.map(() => new THREE.Quaternion()),
    fingerCache: [] as THREE.Quaternion[],
    cacheRig: null as Rig | null,
    wq: new THREE.Quaternion(),
    wq2: new THREE.Quaternion(),
    // current value and target of every expression channel (see navigatorExpressions.ts)
    face: new Float32Array(EXPRESSION_CHANNELS.length),
    faceT: new Float32Array(EXPRESSION_CHANNELS.length),
    expression: "atEase" as ExpressionId,
    micro: { index: -1, t0: 0, nextAt: 4 },
    strength: 1, strengthCheckedAt: -10,
    nextBlinkAt: 1.5, blinkT: -1, doubleBlink: false,
    director: createDirector(0) as DirectorState,
    speakW: 0,
    lastEnergy: 0, beatPulse: 0, emph: 0,
    overlay: { id: "", t0: -10, dur: 0 },
    lastNonce: reactionNonce,
    lastRect: 0,
    canvasCenter: { x: 0, y: 0 },
    telemetry: {} as Record<string, unknown>,
  });

  const fireOverlay = (id: string, now: number) => {
    const o = S.current.overlay;
    o.id = id;
    o.t0 = now;
    o.dur = OVERLAY_DURATIONS[id] ?? 1.4;
    const shot = SHOT_CLIPS[id];
    if (shot && animRef.current?.actions[shot.clip]) {
      // play the recorded motion; the reaction lasts as long as its clip
      S.current.shot = { ...shot, t0: now };
      o.dur = (shot.end - shot.start) / shot.speed;
    }
  };

  useEffect(() => {
    if (reactionNonce === S.current.lastNonce) return;
    S.current.lastNonce = reactionNonce;
    const pr = navigatorBus.pendingReaction;
    if (pr) fireOverlay(pr.id, performance.now() * 0.001);
  }, [reactionNonce]);

  useEffect(() => {
    if (reaction === "SUBTLE_WAVE") fireOverlay("wave", performance.now() * 0.001);
    else if (reaction === "ATTENTIVE_NOD") fireOverlay("nod", performance.now() * 0.001);
    else if (reaction === "TECHNICAL_ACKNOWLEDGE") fireOverlay("salute", performance.now() * 0.001);
  }, [reaction]);

  useEffect(() => {
    if (isTapInteracting) fireOverlay("nod", performance.now() * 0.001);
  }, [isTapInteracting]);

  useFrame((_, delta) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const st = S.current;
    const r = rigRef.current;
    if (!r || !r.ready) return;

    const dt = Math.min(delta, 0.05);
    const now = performance.now() * 0.001;
    const t = now;

    // 1. Camera framing (waist-up: face stays readable, hands stay in frame for gestures) --------
    if (visualMode === "bust") {
      st.tPos.set(0, 1.67, 0.72); st.tLook.set(0, 1.655, 0);
    } else if (visualMode === "heroic_center") {
      st.tPos.set(0, 1.46, 1.7); st.tLook.set(0, 1.39, 0);
    } else {
      st.tPos.set(0, 1.45, 1.68); st.tLook.set(0, 1.39, 0);
    }
    // Walking to a new spot: the camera steps back to show him head to boots, and returns after
    const walkNow = navigatorBus.walk;
    const walking = !!walkNow && performance.now() < walkNow.until && !reducedMotion && visualMode === "companion";
    st.walkW += ((walking ? 1 : 0) - st.walkW) * (1 - Math.exp(-dt / 0.22));
    if (st.walkW > 0.002) {
      st.tPos.lerp(WALK_CAM_POS, st.walkW);
      st.tLook.lerp(WALK_CAM_LOOK, st.walkW);
    }
    const camK = 1 - Math.exp(-4.5 * dt);
    st.camPos.lerp(st.tPos, camK);
    st.camLook.lerp(st.tLook, camK);
    camera.position.copy(st.camPos);
    camera.lookAt(st.camLook);

    // Canvas centre (viewport px) for look-at; throttled DOM read
    if (now - st.lastRect > 0.12) {
      st.lastRect = now;
      const rc = gl.domElement.getBoundingClientRect();
      st.canvasCenter.x = rc.left + rc.width / 2;
      st.canvasCenter.y = rc.top + rc.height * 0.3; // head height within the frame
      navigatorBus.avatarCenter = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
      // where the map is from where he stands now (he can be moved anywhere on the page)
      const mapEl = typeof document !== "undefined" ? document.querySelector(".maplibregl-map") : null;
      if (mapEl) {
        const mr = mapEl.getBoundingClientRect();
        navigatorBus.mapCenter = { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2 };
      }
    }

    // 2. Speech telemetry -----------------------------------------------------
    const lip = lipSyncRef?.current;
    // Dev-only inspection hook: window.__atlasNavDebug = { speaking, gesture, peek, viseme, overlay }
    const dbg = (typeof window !== "undefined" && process.env.NODE_ENV !== "production"
      ? (window as unknown as { __atlasNavDebug?: { speaking?: boolean; gesture?: string; peek?: { x: number; y: number } | null; viseme?: string; overlay?: string; expression?: string; clip?: { name: string; time: number }; pose?: Partial<Record<PoseSlot, [number, number, number]>> } }).__atlasNavDebug
      : undefined);
    if (dbg?.overlay) {
      fireOverlay(dbg.overlay, now);
      dbg.overlay = undefined;
    }
    // Body language only while the voice is actually audible (never during TTS synthesis delay)
    const speaking = !!lip?.isPlaying || !!dbg?.speaking;
    const energy = lip?.smoothedEnergy ?? 0;
    const rawEnergy = lip?.energy ?? 0;
    const hover = navigatorBus.pointer.isDirectHover;

    st.speakW = THREE.MathUtils.damp(st.speakW, speaking ? (reducedMotion ? 0.55 : 1) : 0, 4, dt);

    // Beat detector: positive energy derivative = stressed syllable
    const rise = Math.max(0, rawEnergy - st.lastEnergy);
    st.lastEnergy = rawEnergy;
    st.beatPulse = Math.max(st.beatPulse * Math.exp(-9 * dt), Math.min(1, rise * 5));

    // The words that carry the weight (a figure, a project's name): as he reaches them he leans
    // in a touch, the brows lift and the gesturing hand lands, the way a person stresses a number.
    let onKeyWord = false;
    const cues = navigatorBus.speechCues;
    if (speaking && cues && lip && lip.charIndex >= 0) {
      for (const [a, b] of cues.emphasis) {
        if (lip.charIndex >= a - 2 && lip.charIndex <= b) { onKeyWord = true; break; }
      }
    }
    st.emph = THREE.MathUtils.damp(st.emph, onKeyWord ? 1 : 0, onKeyWord ? 14 : 5, dt);
    st.beatPulse = Math.max(st.beatPulse, st.emph * 0.85);

    // 3. Reset accumulators ---------------------------------------------------
    for (let i = 0; i < st.G.length; i++) st.G[i].identity();
    st.tgt.fill(0);

    const T = st.tgt;
    const setT = (slot: PoseSlot, a: number, b: number, c: number) => {
      const i = SLOT_INDEX[slot] * 3;
      T[i] += a; T[i + 1] += b; T[i + 2] += c;
    };
    /** An overlay takes the limb over (weight w) rather than stacking on the talking gesture:
     *  two large arm poses added together fold the arm through the body. */
    const blendT = (slot: PoseSlot, e: readonly [number, number, number], w: number, flexAdd = 0) => {
      const i = SLOT_INDEX[slot] * 3;
      T[i] = T[i] * (1 - w) + (e[0] + flexAdd) * w;
      T[i + 1] = T[i + 1] * (1 - w) + e[1] * w;
      T[i + 2] = T[i + 2] * (1 - w) + e[2] * w;
    };
    const mirrorE = (e: readonly [number, number, number]): [number, number, number] => [e[0], -e[1], -e[2]];
    let fingerOpenTarget = 0;
    /** Accumulate a model-space rotation (radians) on a driven bone. */
    const addModel = (key: DrivenKey, x: number, y: number, z: number) => {
      st.tmpE.set(x, y, z, "XYZ");
      st.G[DRIVEN_INDEX[key]].multiply(st.tmpQ.setFromEuler(st.tmpE));
    };

    // 4. Poses: gestures while speaking, state poses otherwise ----------------
    const poseState: AtlasNavigatorState =
      navigatorBus.voiceActive && (state === "IDLE" || state === "LISTENING") ? "LISTENING" : state;
    const peek = dbg?.peek !== undefined ? dbg.peek : navigatorBus.peek;
    const peekAge = now * 1000 - navigatorBus.peekChangedAt;
    let glanceWrist = false;
    let leanTarget = st.emph * 0.03;
    let faceSmile = 0, faceBrow = 0, faceBrowDown = 0, faceFrown = 0, faceWide = 0;
    const headRollTarget = 0; // the head stays level
    let headNodTarget = st.emph * 0.035;
    let yawExtra = 0;

    // What he looks and points at, measured from where he actually stands: the selected or
    // clicked project, else the spot the user is working on (click, drag, zoom), else the map.
    const freshPeek = !!peek && (dbg?.peek ? true : peekAge < 6000);
    const attention = navigatorBus.attention && now * 1000 - navigatorBus.attentionAt < 3500 ? navigatorBus.attention : null;
    const target = freshPeek ? peek : attention ?? navigatorBus.mapCenter;
    const activity = speaking ? navigatorBus.activity : null;
    /** -1..1: how far to his screen-left (-) or screen-right (+) the target is */
    const targetSide = target ? THREE.MathUtils.clamp((target.x - st.canvasCenter.x) / 600, -1, 1) : -0.7;

    if (true) { // (calm mode still gestures while speaking, at about half size: see speakW)
      // a tour guide always has the site to show, and "where is it" is answered at the map
      const hasPeek = freshPeek || (!!target && (activity === "tour" || (activity === "answer" && navigatorBus.narrationHint === "location")));
      const hasClips = !!animRef.current?.actions.presentR;
      advanceDirector(st.director, t, { hasPeek, hint: navigatorBus.narrationHint, activity, hasClips });
      // A recorded gesture: played once, start to finish, when the director picks it. The side he
      // presents or points to is the side the map (or the named project) is on.
      if (st.director.since !== st.lastGestureSince) {
        st.lastGestureSince = st.director.since;
        const kind = st.director.current.shot;
        if (kind && speaking && animRef.current) {
          const id =
            kind === "present" ? (targetSide < 0 ? "presentR" : "presentL") : kind === "point" ? (targetSide < 0 ? "pointR" : "pointL") : kind;
          const def = GESTURE_SHOTS[id];
          if (def && animRef.current.actions[def.clip]) st.shot = { ...def, t0: t, gesture: true };
        }
      }
      if (dbg?.gesture) {
        const forced = GESTURES.find((x) => x.id === dbg.gesture);
        if (forced) { st.director.current = forced; st.director.until = t + 5; }
      }
      const g = st.director.current;

      if (dbg?.pose) {
        // live tuning: window.__atlasNavDebug.pose = { rArm: [flex, twist, abduct], ... }
        for (const slot of SLOTS) {
          const p = dbg.pose[slot];
          if (p) setT(slot, p[0], p[1], p[2]);
        }
      } else if (st.speakW > 0.01) {
        const w = st.speakW;
        for (const slot of SLOTS) {
          const p = g.pose[slot];
          if (p) setT(slot, p[0] * w, p[1] * w, p[2] * w);
        }
        // Beat modulation on stressed syllables
        const b = st.beatPulse * g.beat * w;
        for (const slot of g.beatSlots) {
          setT(slot, b * 0.2, 0, slot.startsWith("l") ? -b * 0.04 : b * 0.04);
        }
        if (g.lean) leanTarget += g.lean * w;
        glanceWrist = !!g.glanceTablet;
        // point toward the peek target (arm swings to the side the target is on)
        if (g.id === "mapPoint" && target) setT("rArm", 0, 0, -targetSide * 0.45 * w);
        // presenting the site: the open arm sweeps toward the map's side of him
        if (g.id === "presentLeft" && target) setT("rArm", 0, 0, -targetSide * 0.3 * w);
        // a tour guide squares up to what he is showing, a little (not a turn of the hips)
        if (activity === "tour") yawExtra += targetSide * 0.12 * w;
      } else {
        switch (poseState) {
          case "LISTENING":
            leanTarget += 0.05; faceBrow += 0.25; // leans in, head level
            headNodTarget += Math.max(0, Math.sin(t * 1.3)) * Math.max(0, Math.sin(t * 0.37)) * 0.06;
            break;
          case "THINKING":
            // working it out: brow down, chin dropped a touch, a hand at the jaw
            faceBrowDown += 0.3; headNodTarget += 0.04;
            setT("rArm", CHIN.arm[0], CHIN.arm[1], CHIN.arm[2]);
            setT("rFore", CHIN.fore[0], CHIN.fore[1], CHIN.fore[2]);
            break;
          case "SEARCHING":
          case "NAVIGATING": {
            const mp = GESTURES.find((x) => x.id === "mapPoint")!;
            for (const slot of SLOTS) { const p = mp.pose[slot]; if (p) setT(slot, p[0] * 0.8, p[1], p[2]); }
            break;
          }
          case "SUCCESS":
            faceSmile += 0.7; leanTarget += 0.03;
            break;
          case "ERROR":
            faceFrown += 0.6; faceBrow += 0.4; headNodTarget += 0.05;
            break;
          default:
            if (hover) { faceSmile += 0.4; leanTarget += 0.04; faceBrow += 0.15; }
            break;
        }
      }
    }

    // 4b. One-shot reactions (tap / hover / events) -----------------------------
    // How he carries himself: a site engineer, at ease and economical. These tap reactions are
    // small on purpose (a nod is one firm down-and-up): he is tapped often, and a big movement
    // on every tap reads as bowing. The larger, freer movements are the recorded gestures.
    const ov = st.overlay;
    if (ov.id && !reducedMotion) {
      const lt = t - ov.t0;
      if (lt > ov.dur) {
        ov.id = "";
      } else {
        const u = lt / ov.dur;
        // in, hold, ease out
        const env = Math.min(1, u / 0.2) * Math.min(1, (1 - u) / 0.3);
        // a single down-and-up over the first part of the reaction
        const once = Math.sin(Math.min(1, u * 1.6) * Math.PI);
        switch (ov.id) {
          case "wave":
          case "greet":
            // a raised hand, held for a beat, with a short chin-up: "hey"
            blendT("rArm", WAVE.arm, env);
            blendT("rFore", WAVE.fore, env, Math.sin(lt * 4.2) * 0.05);
            blendT("rHand", [0, 0, 0], env);
            fingerOpenTarget = env;
            faceSmile += 0.6 * env; faceBrow += 0.15 * env; headNodTarget += -0.05 * once;
            break;
          case "nod":
            headNodTarget += 0.13 * once;
            faceSmile += 0.25 * env;
            break;
          case "salute":
            // "got it": one firm nod
            headNodTarget += 0.15 * once;
            faceSmile += 0.4 * env;
            break;
          case "shake":
            // a slow shake of the head and one hand pressing down: "easy"
            yawExtra += Math.sin(lt * 8.5) * 0.17 * env;
            blendT("rArm", EASY.arm, env);
            blendT("rFore", EASY.fore, env, once * 0.08);
            faceFrown += 0.25 * env;
            break;
          case "surprise":
            // head back, brows up, shoulders lift for a moment (hands stay down)
            leanTarget += -0.06 * env; headNodTarget += -0.06 * env; faceBrow += 0.8 * env; faceWide += 0.7 * env;
            setT("lShoulder", 0, 0, -0.08 * env); setT("rShoulder", 0, 0, 0.08 * env);
            break;
          case "tilt":
            // attentive: chin up a touch, brows, a slight lean in (no head tilt)
            headNodTarget += -0.05 * env; faceBrow += 0.35 * env; leanTarget += 0.03 * env;
            break;
          case "shrug":
            // one open hand turned up, one shoulder: "your call"
            setT("rShoulder", 0, 0, 0.12 * env); setT("lShoulder", 0, 0, -0.05 * env);
            blendT("rArm", PRESENT.arm, env); blendT("rFore", PRESENT.fore, env);
            fingerOpenTarget = env;
            faceBrow += 0.4 * env;
            break;
          case "point":
            blendT("rArm", POINT.arm, env); blendT("rFore", POINT.fore, env);
            break;
          case "presentRight":
            // a panel opened on the viewer's right: turn to it and present with the near (left) arm
            blendT("lArm", mirrorE(PRESENT.arm), env); blendT("lFore", mirrorE(PRESENT.fore), env);
            yawExtra += 0.42 * env; faceBrow += 0.2 * env;
            break;
          case "presentLeft":
            blendT("rArm", PRESENT.arm, env); blendT("rFore", PRESENT.fore, env);
            fingerOpenTarget = env;
            yawExtra -= 0.42 * env; faceBrow += 0.2 * env;
            break;
        }
      }
    }

    // 5. Spring the pose targets and write into the model-space accumulators ----
    const omega = 7.5;
    for (let i = 0; i < SLOTS.length; i++) {
      const sp = st.pos[i];
      const a = stepSpring(sp[0], T[i * 3], omega, dt);
      const b = stepSpring(sp[1], T[i * 3 + 1], omega, dt);
      const c = stepSpring(sp[2], T[i * 3 + 2], omega, dt);
      if (Math.abs(a) + Math.abs(b) + Math.abs(c) < 0.0005) continue;
      const slot = SLOTS[i];
      if (LIMB_SLOTS.has(slot)) {
        // Gesture Euler3 = [flex forward, twist, abduct outward (right-side convention)]
        //   flex   → about model X, negative angle raises a hanging limb toward +Z (forward)
        //   twist  → about model Y (the hanging limb's own axis)
        //   abduct → about model Z, negative angle swings the right arm outward (−X)
        addModel(slot, -a, b, -c);
      } else {
        addModel(slot, a, b, c);
      }
    }

    // 5b. Shoulder girdle follows the arm (scapulohumeral rhythm): a raised arm lifts its
    //     clavicle. Without this the upper arm pivots on a fixed shoulder and looks dislocated.
    {
      const rI = SLOT_INDEX.rArm, lI = SLOT_INDEX.lArm;
      const rElev = Math.max(0, st.pos[rI][2].p) + 0.45 * Math.max(0, st.pos[rI][0].p);
      const lElev = Math.max(0, -st.pos[lI][2].p) + 0.45 * Math.max(0, st.pos[lI][0].p);
      if (rElev > 0.01) addModel("rShoulder", 0, 0, -Math.min(0.3, rElev * 0.3));
      if (lElev > 0.01) addModel("lShoulder", 0, 0, Math.min(0.3, lElev * 0.3));
    }

    // 6. Breathing, weight shift, lean ----------------------------------------
    if (true) { // breathing is kept in calm mode
      const breath = Math.sin(t * 1.65);
      addModel("spine1", -breath * 0.012, 0, 0);
      addModel("spine2", -breath * 0.016, 0, 0);
      addModel("lShoulder", 0, 0, breath * 0.012);
      addModel("rShoulder", 0, 0, -breath * 0.012);
      // a slow shift of the weight, turning from the hips; no side-to-side roll
      addModel("hips", 0, Math.sin(t * 0.21) * 0.01, 0);
    }
    const lean = stepSpring(st.leanSp, leanTarget, 6, dt);
    if (Math.abs(lean) > 0.0005) {
      addModel("spine1", lean * 0.5, 0, 0);
      addModel("spine2", lean * 0.7, 0, 0);
    }

    // 7. Gaze solver (eyes lead, head follows, neck/spine trail) --------------
    // yaw  > 0 → look toward screen-right (+X);  pitch > 0 → look up
    let yaw = 0;
    let pitch = 0;
    const px = navigatorBus.pointer;
    const peekActive = !!peek && (dbg?.peek ? true : peekAge < 4500) && !hover;
    const glancePeek = peekActive && (!speaking || Math.sin(t * 0.55) > -0.2);

    if (true) { // so is where he looks
      if (hover) {
        yaw = 0; pitch = 0.02; // eye contact
      } else if (glanceWrist) {
        yaw = 0.3; pitch = -0.42; // down at the left wrist
      } else if (glancePeek && peek) {
        const dx = peek.x - st.canvasCenter.x;
        const dy = peek.y - st.canvasCenter.y;
        const winW = typeof window !== "undefined" ? window.innerWidth : 1920;
        const winH = typeof window !== "undefined" ? window.innerHeight : 1080;
        // Angle toward the target as if the map plane sat ~0.55 screen-widths in front of him
        yaw = THREE.MathUtils.clamp(Math.atan2(dx, winW * 0.55), -1.05, 1.05);
        pitch = THREE.MathUtils.clamp(Math.atan2(-dy, winH * 0.7), -0.45, 0.4);
      } else if (attention && !speaking) {
        // the user is working on the map: he follows what they do
        const dx = attention.x - st.canvasCenter.x;
        const dy = attention.y - st.canvasCenter.y;
        const winW = typeof window !== "undefined" ? window.innerWidth : 1920;
        const winH = typeof window !== "undefined" ? window.innerHeight : 1080;
        yaw = THREE.MathUtils.clamp(Math.atan2(dx, winW * 0.55), -1.05, 1.05);
        pitch = THREE.MathUtils.clamp(Math.atan2(-dy, winH * 0.7), -0.45, 0.4);
      } else if (poseState === "THINKING") {
        yaw = 0.3; pitch = 0.2; // up and away while he works it out
      } else if (activity === "tour" && target) {
        // tour guide: shows the site, then turns back to the audience, in a steady rhythm
        const atSite = (t % 6.5) < 4 || st.director.current.id === "mapPoint";
        yaw = atSite ? THREE.MathUtils.clamp(targetSide * 0.75, -0.9, 0.9) : 0;
        pitch = atSite ? -0.04 : 0.02;
      } else if (gazeTarget === "MAP" || poseState === "SEARCHING" || poseState === "NAVIGATING") {
        // toward the map from where he stands (he can be moved to either side of it)
        const side = target ? targetSide : -0.7;
        yaw = THREE.MathUtils.clamp(side * 0.6, visualMode === "companion" ? -0.55 : -0.35, visualMode === "companion" ? 0.55 : 0.35);
        if (Math.abs(yaw) < 0.12) yaw = 0.12 * Math.sign(side || -1); // map behind him: a clear glance, not a stare at the viewer
        pitch = 0.03;
      } else if (px.isHovering) {
        yaw = THREE.MathUtils.clamp(px.x * 0.32, -0.32, 0.32);
        pitch = THREE.MathUtils.clamp(px.y * 0.18, -0.18, 0.18);
      }
      if (reaction === "MAP_SCAN") yaw += Math.sin(t * 3) * 0.3;
      if (speaking) {
        pitch += Math.sin(t * 9.5) * energy * 0.035;
        yaw += Math.sin(t * 2.7) * energy * 0.03;
      }
      // idle micro-saccades keep the eyes alive
      yaw += Math.sin(t * 0.9) * 0.012 + Math.sin(t * 2.3) * 0.006;
    }
    yaw += yawExtra;

    // Eyes snap fast, head follows ~120 ms later, neck/spine trail → natural saccade-then-settle
    const eyeYaw = stepSpring(st.gEyeYaw, THREE.MathUtils.clamp(yaw, -0.6, 0.6), 22, dt);
    const eyePitch = stepSpring(st.gEyePitch, THREE.MathUtils.clamp(pitch, -0.4, 0.4), 22, dt);
    const headYaw = stepSpring(st.gHeadYaw, yaw * 0.55, 9, dt);
    const headPitch = stepSpring(st.gHeadPitch, pitch * 0.6, 9, dt);
    const neckYaw = stepSpring(st.gNeckYaw, yaw * 0.27, 7, dt);
    const neckPitch = stepSpring(st.gNeckPitch, pitch * 0.28, 7, dt);
    const spineYaw = stepSpring(st.gSpineYaw, yaw * 0.12, 5, dt);
    const roll = stepSpring(st.headRoll, headRollTarget, 7, dt);
    const nod = stepSpring(st.headNod, headNodTarget, 12, dt);

    addModel("spine2", 0, spineYaw, 0);
    addModel("neck", -neckPitch + nod * 0.4, neckYaw, 0);
    addModel("head", -headPitch + nod * 0.6, headYaw, roll);
    // Eyes take the residual so the gaze lands on target while the head is still catching up
    const eyeResYaw = THREE.MathUtils.clamp(eyeYaw - (headYaw + neckYaw + spineYaw), -0.45, 0.45);
    const eyeResPitch = THREE.MathUtils.clamp(eyePitch - (headPitch + neckPitch), -0.3, 0.3);
    addModel("eyeL", -eyeResPitch, eyeResYaw, 0);
    addModel("eyeR", -eyeResPitch, eyeResYaw, 0);

    // 8. Commit ------------------------------------------------------------------
    const an = animRef.current;
    const fo = THREE.MathUtils.clamp(stepSpring(st.fingerOpen, fingerOpenTarget, 9, dt), 0, 1);
    if (!an) {
      // No clips in the model: fully posed.  local = LA · (A⁻¹ · G · A)
      for (let i = 0; i < DRIVEN.length; i++) {
        const bone = r.bones[i];
        if (!bone) continue;
        st.tmpQ.copy(r.Ainv[i]).multiply(st.G[i]).multiply(r.A[i]);
        bone.quaternion.copy(r.LA[i]).multiply(st.tmpQ);
      }
      for (const fg of r.fingers) fg.bone.quaternion.slerpQuaternions(fg.relaxed, fg.open, fo);
    } else {
      // 8a. Which recorded motion is the body doing?
      const gesture = st.director.current;
      const idle = !speaking && poseState === "IDLE" && !st.overlay.id;
      if (!idle) st.idleSince = t;
      const idleFor = t - st.idleSince;
      const standing = an.actions.idleBreathing ? "idleBreathing" : "idleSubtle";
      let base = standing;
      if (speaking && st.speakW > 0.3) base = gesture.clip && an.actions[gesture.clip] ? gesture.clip : standing;
      // listening to the microphone: the recorded attentive nod
      else if (poseState === "LISTENING" && an.actions.nodListen) base = "nodListen";
      // a change of stance now and then: arms folded, or the weight on one leg
      else if (idle && idleFor > 24 && idleFor % 44 < 13) {
        const alt = Math.floor(idleFor / 44) % 2 === 1 && an.actions.idleNeutral ? "idleNeutral" : "foldArms";
        if (an.actions[alt]) base = alt;
      }

      // on his way to a new spot: the recorded walk (in place; the page moves him across the screen)
      if (walking && walkNow && an.actions.walk) {
        base = "walk";
        an.actions.walk.timeScale = walkNow.rate;
        st.shot = null;
      }

      // one-shot reaction clip, scrubbed by hand
      let shotW = 0;
      const shot = st.shot;
      if (shot) {
        const lt = t - shot.t0;
        // he stopped speaking (or was interrupted): a speaking gesture winds down at once
        if (shot.gesture && !speaking && !shot.cut) {
          shot.cut = true;
          shot.end = Math.min(shot.end, shot.start + (lt + 0.35) * shot.speed);
        }
        const dur = (shot.end - shot.start) / shot.speed;
        const action = an.actions[shot.clip];
        if (lt >= dur || !action || reducedMotion) {
          st.shot = null;
        } else {
          const played = shot.start + lt * shot.speed;
          action.time = shot.loop ? played % Math.max(0.05, action.getClip().duration) : played;
          shotW = Math.min(1, lt / 0.25) * Math.min(1, (dur - lt) / 0.35) * (shot.gain ?? 1);
        }
      }
      const k = 1 - Math.exp(-dt / 0.16);
      // dev: window.__atlasNavDebug.clip = { name: "greet", time: 2 } freezes one clip at one moment
      const frozen = dbg?.clip && an.actions[dbg.clip.name] ? dbg.clip : null;
      for (const name in an.actions) {
        const isShot = !!st.shot && st.shot.clip === name;
        const target = frozen ? (name === frozen.name ? 1 : 0) : isShot ? shotW : name === base ? 1 - shotW : 0;
        // the reaction's own envelope is already smooth; base loops cross-fade
        const w = frozen ? target : isShot ? shotW : an.weights[name] + (target - an.weights[name]) * k;
        an.weights[name] = w < 0.001 && target === 0 ? 0 : w;
        an.actions[name].setEffectiveWeight(an.weights[name]);
        if (frozen && name === frozen.name) an.actions[name].time = frozen.time;
      }
      // The mixer skips writing a bone whose animated value did not change since the last frame.
      // Our gaze / lean / arm adjustments are applied ON TOP of the animated value, so each frame
      // must begin from that value again: otherwise a bone that holds still keeps last frame's
      // adjusted result and the adjustment piles up frame after frame (the body twisting away).
      if (st.cacheRig === r) {
        for (let i = 0; i < DRIVEN.length; i++) r.bones[i]?.quaternion.copy(st.animCache[i]);
        for (let i = 0; i < r.fingers.length; i++) r.fingers[i].bone.quaternion.copy(st.fingerCache[i]);
      }
      an.mixer.update(reducedMotion ? dt * 0.6 : dt); // calm: the standing loop runs, slower
      for (let i = 0; i < DRIVEN.length; i++) {
        const bone = r.bones[i];
        if (bone) st.animCache[i].copy(bone.quaternion);
      }
      for (let i = 0; i < r.fingers.length; i++) {
        (st.fingerCache[i] ??= new THREE.Quaternion()).copy(r.fingers[i].bone.quaternion);
      }
      st.cacheRig = r;

      // 8b. Posed arm gestures (pointing, presenting, counting...) take an arm over from the clip
      const armBusy = (side: "l" | "r") => {
        let sum = 0;
        for (const slot of side === "l" ? (["lShoulder", "lArm", "lFore", "lHand"] as const) : (["rShoulder", "rArm", "rFore", "rHand"] as const)) {
          const sp = st.pos[SLOT_INDEX[slot]];
          sum += Math.abs(sp[0].p) + Math.abs(sp[1].p) + Math.abs(sp[2].p);
        }
        return sum > 0.07 ? 1 : 0;
      };
      const ka = 1 - Math.exp(-dt / 0.14);
      st.armW.l += (armBusy("l") - st.armW.l) * ka;
      st.armW.r += (armBusy("r") - st.armW.r) * ka;
      const wl = st.armW.l * (1 - shotW);
      const wr = st.armW.r * (1 - shotW);
      for (let i = 0; i < DRIVEN.length; i++) {
        const key = DRIVEN[i];
        const bone = r.bones[i];
        if (!bone || !LIMB_SLOTS.has(key as PoseSlot)) continue;
        const w = key.startsWith("l") ? wl : wr;
        if (w < 0.002) continue;
        st.tmpQ.copy(r.Ainv[i]).multiply(st.G[i]).multiply(r.A[i]);
        st.wq.copy(r.LA[i]).multiply(st.tmpQ);
        bone.quaternion.slerp(st.wq, w);
      }
      if (wr > 0.002) {
        for (const fg of r.fingers) {
          st.wq.slerpQuaternions(fg.relaxed, fg.open, fo);
          fg.bone.quaternion.slerp(st.wq, wr);
        }
      }

      // 8c. Gaze, lean, nod and breathing are ADDED to the recorded spine / neck / head / eyes:
      //     the same model-space rotation G, expressed in each bone's current animated frame
      scene.updateMatrixWorld(true);
      scene.getWorldQuaternion(st.invScene).invert();
      for (let i = 0; i < DRIVEN.length; i++) {
        const key = DRIVEN[i];
        const bone = r.bones[i];
        if (!bone || LIMB_SLOTS.has(key as PoseSlot) || key === "hips") continue;
        const G = st.G[i];
        if (Math.abs(G.w) > 0.999999) continue;
        bone.getWorldQuaternion(st.wq2);
        st.wq.copy(st.invScene).multiply(st.wq2); // W: the bone's model-space orientation right now
        st.tmpQ.copy(st.wq).invert().multiply(G).multiply(st.wq);
        bone.quaternion.multiply(st.tmpQ);
      }
    }

    // 9. Face: blink, brows, smile, visemes ------------------------------------
    const f = r.face;
    if (f) {
      // Blink scheduler: every 2–6 s, 15 % double blink; never mid-surprise
      if (st.blinkT < 0 && t >= st.nextBlinkAt) {
        st.blinkT = 0;
        st.doubleBlink = Math.random() < 0.15;
      }
      let blink = 0;
      if (st.blinkT >= 0) {
        st.blinkT += dt;
        const bt = st.blinkT;
        blink = bt < 0.07 ? bt / 0.07 : bt < 0.19 ? 1 - (bt - 0.07) / 0.12 : 0;
        if (bt >= 0.19) {
          if (st.doubleBlink) { st.doubleBlink = false; st.blinkT = 0; }
          else { st.blinkT = -1; st.nextBlinkAt = t + 2 + Math.random() * 4; }
        }
      }
      // The expression that fits what he is doing, at the strength his personality shows it
      if (t - st.strengthCheckedAt > 2) {
        st.strengthCheckedAt = t;
        st.strength = EXPRESSION_STRENGTH[getPersonality()] ?? 1;
      }
      const dbgExpr = dbg?.expression && EXPRESSIONS[dbg.expression as ExpressionId] ? (dbg.expression as ExpressionId) : null;
      const expr = dbgExpr ?? pickExpression({ state: poseState, speaking, hover, hint: navigatorBus.narrationHint });
      if (expr !== st.expression) {
        st.expression = expr;
        // people blink as their expression changes
        if (st.blinkT < 0) st.blinkT = 0;
      }
      const ft = st.faceT;
      ft.fill(0);
      const preset = EXPRESSIONS[expr];
      // In the small companion view his face is only about 45 px wide: an expression that reads
      // well close up disappears at that size, so it is played larger there (as on a stage).
      const gain = st.strength * (visualMode === "companion" ? COMPANION_EXPRESSION_GAIN : 1);
      for (let i = 0; i < EXPRESSION_CHANNELS.length; i++) ft[i] = (preset[EXPRESSION_CHANNELS[i]] ?? 0) * gain;

      // Passing expressions while standing by, so the face is never held still
      const mi = st.micro;
      if (mi.index < 0 && t >= mi.nextAt && expr === "atEase" && !reducedMotion) {
        mi.index = Math.floor(Math.random() * MICRO_EXPRESSIONS.length);
        mi.t0 = t;
      }
      if (mi.index >= 0) {
        const m = MICRO_EXPRESSIONS[mi.index];
        const u = (t - mi.t0) / m.seconds;
        if (u >= 1 || expr !== "atEase") {
          mi.index = -1;
          mi.nextAt = t + 4 + Math.random() * 7;
        } else {
          const env = Math.sin(u * Math.PI);
          for (let i = 0; i < EXPRESSION_CHANNELS.length; i++) ft[i] += (m.weights[EXPRESSION_CHANNELS[i]] ?? 0) * env * gain;
        }
      }

      // Reactions (tap, wave, surprise...) and the stress of the voice add to it
      ft[FX.smile] += faceSmile;
      ft[FX.browUp] += faceBrow + (speaking ? st.beatPulse * 0.65 : 0);
      ft[FX.browDown] += faceBrowDown;
      ft[FX.frown] += faceFrown;
      ft[FX.eyesWide] += faceWide;
      // eyes crease with a real smile
      ft[FX.squint] += faceSmile * 0.4;

      // faces move into an expression quickly and let go of it slowly
      const ff = st.face;
      for (let i = 0; i < ff.length; i++) {
        const target = Math.min(1, ft[i]);
        ff[i] = THREE.MathUtils.damp(ff[i], target, target > ff[i] ? 9 : 4.5, dt);
      }

      const acc = f.acc;
      acc.fill(0);
      const drive = (ch: FaceChannel, v: number) => {
        if (v <= 0.001) return;
        const list = f.channels[ch];
        for (let i = 0; i < list.length; i++) acc[list[i][0]] += v * list[i][1];
      };
      drive("blinkL", blink);
      drive("blinkR", blink);
      const jaw = lip?.jawOpen ?? 0;
      // a talking mouth owns the lips: mouth expressions ease off while the jaw is open
      // (a smile is kept in part, so a greeting is still spoken with a smile)
      const mouthFree = 1 - Math.min(1, jaw * 1.5);
      const smileKept = 1 - Math.min(0.65, jaw * 1.2);
      drive("smile", ff[FX.smile] * smileKept);
      drive("smirk", ff[FX.smirk] * smileKept);
      drive("squint", ff[FX.squint]);
      drive("browUp", ff[FX.browUp]);
      drive("browCock", ff[FX.browCock]);
      drive("browDown", ff[FX.browDown]);
      drive("browIn", ff[FX.browIn]);
      drive("eyesWide", ff[FX.eyesWide]);
      drive("frown", ff[FX.frown] * mouthFree);
      drive("lipPress", ff[FX.lipPress] * mouthFree);
      drive("purse", ff[FX.purse] * mouthFree);

      const vw = lip?.visemeWeights;
      if (dbg?.viseme) {
        drive(`viseme_${dbg.viseme}` as FaceChannel, 1);
      } else if (vw) {
        for (let i = 0; i < VISEME_IDS.length; i++) {
          const id = VISEME_IDS[i];
          drive(`viseme_${id}` as FaceChannel, vw[id] || 0);
        }
      }
      for (let i = 0; i < f.slots.length; i++) {
        const v = acc[i];
        f.slots[i].inf[f.slots[i].idx] = v > 1 ? 1 : v;
      }
    }

    // 10. Click-and-drag "turntable" nudge (springs back to centre on release)
    if (groupRef.current) {
      // (walking: he turns to face the way he is going, and squares up again on arrival)
      const walkYaw = walking && walkNow ? walkNow.dir * 1.2 : 0;
      groupRef.current.rotation.y = stepSpring(st.dragSpring, reducedMotion ? 0 : navigatorBus.dragYaw + walkYaw, walking ? 7 : 10, dt);
    }

    // 11. Telemetry for behavioural verification --------------------------------
    if (typeof window !== "undefined") {
      const tel = st.telemetry;
      tel.state = state;
      tel.reaction = reaction;
      tel.gesture = st.director.current.id;
      tel.clips = animRef.current ? { ...animRef.current.weights } : null;
      tel.shot = st.shot?.clip ?? null;
      tel.armW = [st.armW.l, st.armW.r];
      {
        const hb = r.bones[DRIVEN_INDEX.head];
        const sb = r.bones[DRIVEN_INDEX.spine2];
        tel.headQ = hb ? [hb.quaternion.x, hb.quaternion.y, hb.quaternion.z, hb.quaternion.w].map((v) => +v.toFixed(4)) : null;
        tel.spineQ = sb ? [sb.quaternion.x, sb.quaternion.y, sb.quaternion.z, sb.quaternion.w].map((v) => +v.toFixed(4)) : null;
      }
      tel.gestureHistory = st.director.history.slice();
      tel.gaze = { yaw, pitch, head: [headYaw, headPitch], eyes: [eyeYaw, eyePitch] };
      tel.peek = peek;
      tel.peekActive = peekActive;
      tel.canvasCenter = st.canvasCenter;
      tel.viseme = lip?.viseme;
      tel.jawOpen = lip?.jawOpen;
      tel.energy = lip?.energy;
      tel.audioTime = lip?.currentTime;
      tel.speaking = speaking;
      tel.hasFace = !!f;
      tel.bones = r.bones.filter(Boolean).length;
      tel.overlay = st.overlay.id;
      tel.expression = st.expression;
      tel.frameAt = performance.now();
      (window as unknown as { __atlasNavigatorTelemetry?: unknown }).__atlasNavigatorTelemetry = tel;
    }
  });

  return (
    <group ref={groupRef} name="atlas-navigator-character-root">
      {/* Image-based lighting built from lightformers (no network HDRI): gives skin, fabric and
          the hard-hat plastic real reflections instead of flat "game" shading */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#0d1722"]} />
        <Lightformer form="rect" intensity={3.2} color="#fff1e0" position={[1.6, 2.6, 2.6]} scale={[2.6, 2.6, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#dbe9ff" position={[-2.4, 1.6, 1.8]} scale={[2.2, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#4E9DC2" position={[-1.8, 2.2, -2.4]} scale={[1.6, 2.4, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#1e293b" position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
      </Environment>
      <directionalLight position={[1.4, 2.6, 2.6]} intensity={1.7} color="#fff3e6" />
      <directionalLight position={[-1.8, 1.6, 2.0]} intensity={0.45} color="#e6efff" />
      {/* Rim light takes its colour from the map behind him: cool on the dark map, soft white on
          the light map, warm sun on satellite imagery */}
      <directionalLight
        position={[-1.8, 2.4, -1.8]}
        intensity={(mapStyle === "LIGHT" ? 0.55 : mapStyle === "SATELLITE" ? 1.2 : 1.1) * (visualMode === "heroic_center" ? 1.3 : 1)}
        color={mapStyle === "LIGHT" ? "#ffffff" : mapStyle === "SATELLITE" ? "#ffd9a0" : "#7FBAD6"}
      />
      <primitive object={scene} />
    </group>
  );
};
