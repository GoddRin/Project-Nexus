/**
 * Face channel → morph-target recipes for the Atlas Navigator.
 *
 * The character ships a Faceshift-style blendshape set (MouthOpen, Jaw_Down, Smile_Left ...),
 * not Oculus visemes, so each logical channel (a viseme, a blink, a smile) is composed from
 * several source shapes at runtime. Models that already expose `viseme_*` shapes are driven
 * directly (see `resolveRecipes`).
 */
import type { VisemeId } from "@/lib/atlas-ai/visemes";

export type FaceChannel =
  | `viseme_${VisemeId}`
  | "blinkL" | "blinkR" | "browUp" | "browDown" | "smile" | "frown" | "jawOpen" | "eyesWide" | "squint"
  // one-sided and compound shapes used by the expressions (navigatorExpressions.ts)
  | "smirk" | "browCock" | "browIn" | "lipPress" | "purse";

type Recipe = Array<[string, number]>;

const both = (base: string, w: number): Recipe => [[`${base}_Left`, w], [`${base}_Right`, w]];

/** Faceshift-style source shapes (this project's character). */
const FACESHIFT: Record<FaceChannel, Recipe> = {
  viseme_sil: [],
  viseme_PP: [["UpperLipIn", 0.7], ["LowerLipIn", 0.7], ["Jaw_Up", 0.25]],
  viseme_FF: [["LowerLipIn", 1.0], ...both("UpperLipUp", 0.35), ["Jaw_Down", 0.12]],
  viseme_TH: [["Jaw_Down", 0.3], ["TongueUp", 0.45], ["MouthOpen", 0.08]],
  viseme_DD: [["Jaw_Down", 0.34], ["TongueUp", 0.6], ...both("LowerLipDown", 0.2)],
  viseme_kk: [["Jaw_Down", 0.4], ["MouthOpen", 0.1]],
  viseme_CH: [["Jaw_Down", 0.24], ...both("MouthNarrow", 0.7), ...both("MouthWhistle_NarrowAdjust", 0.5), ["LowerLipOut", 0.5], ["UpperLipOut", 0.5]],
  viseme_SS: [["Jaw_Down", 0.18], ...both("Smile", 0.3), ...both("LowerLipDown", 0.3)],
  viseme_nn: [["Jaw_Down", 0.25], ["TongueUp", 0.5]],
  viseme_RR: [["Jaw_Down", 0.25], ...both("MouthNarrow", 0.6), ...both("MouthWhistle_NarrowAdjust", 0.3)],
  viseme_aa: [["MouthOpen", 0.55], ["Jaw_Down", 0.4]],
  viseme_E: [["Jaw_Down", 0.48], ...both("Smile", 0.32), ...both("LowerLipDown", 0.25)],
  viseme_I: [["Jaw_Down", 0.26], ...both("Smile", 0.55)],
  viseme_O: [["MouthOpen", 0.5], ...both("MouthNarrow", 1.0), ...both("MouthWhistle_NarrowAdjust", 0.6)],
  viseme_U: [["MouthOpen", 0.16], ...both("MouthNarrow", 1.0), ...both("MouthWhistle_NarrowAdjust", 1.0), ["LowerLipOut", 0.4], ["UpperLipOut", 0.4]],
  blinkL: [["Blink_Left", 1]],
  blinkR: [["Blink_Right", 1]],
  browUp: both("BrowsUp", 1),
  browDown: [...both("BrowsDown", 1), ...both("BrowsIn", 0.5)],
  smile: [...both("Smile", 1), ...both("Squint", 0.25)],
  frown: both("Frown", 1),
  jawOpen: [["Jaw_Down", 1]],
  eyesWide: both("EyesWide", 1),
  squint: both("Squint", 1),
  // a half smile on one side, with that eye creasing
  smirk: [["Smile_Left", 1], ["Squint_Left", 0.3], ["Smile_Right", 0.25]],
  // one brow up, the other settling a little
  browCock: [["BrowsUp_Right", 1], ["BrowsDown_Left", 0.3]],
  browIn: both("BrowsIn", 1),
  lipPress: [["UpperLipIn", 0.55], ["LowerLipIn", 0.55], ["Jaw_Up", 0.2]],
  purse: [...both("MouthNarrow", 0.55), ["LowerLipOut", 0.3], ["UpperLipOut", 0.2]],
};

/** Oculus / ARKit named models: one-to-one. */
const STANDARD: Partial<Record<FaceChannel, Recipe>> = {
  blinkL: [["eyeBlinkLeft", 1]],
  blinkR: [["eyeBlinkRight", 1]],
  browUp: [["browInnerUp", 1]],
  browDown: [["browDownLeft", 1], ["browDownRight", 1], ["browDown", 1]],
  smile: [["mouthSmileLeft", 1], ["mouthSmileRight", 1], ["mouthSmile", 1]],
  frown: [["mouthFrownLeft", 1], ["mouthFrownRight", 1], ["mouthFrown", 1]],
  jawOpen: [["jawOpen", 1]],
  eyesWide: [["eyeWideLeft", 1], ["eyeWideRight", 1]],
  squint: [["eyeSquintLeft", 1], ["eyeSquintRight", 1]],
  smirk: [["mouthSmileLeft", 1], ["eyeSquintLeft", 0.3], ["mouthSmileRight", 0.25]],
  browCock: [["browOuterUpRight", 1], ["browDownLeft", 0.3]],
  browIn: [["browDownLeft", 0.5], ["browDownRight", 0.5], ["browInnerUp", 0.3]],
  lipPress: [["mouthPressLeft", 1], ["mouthPressRight", 1]],
  purse: [["mouthPucker", 0.6]],
};

export const FACE_CHANNELS = Object.keys(FACESHIFT) as FaceChannel[];

/** Pick the recipe set that matches the morph targets a loaded model actually has. */
export function resolveRecipes(available: Set<string>): Record<FaceChannel, Recipe> {
  if (available.has("viseme_aa")) {
    const out = {} as Record<FaceChannel, Recipe>;
    for (const ch of FACE_CHANNELS) {
      out[ch] = ch.startsWith("viseme_") ? [[ch, 1]] : STANDARD[ch] ?? [];
    }
    return out;
  }
  return FACESHIFT;
}
