/**
 * Facial expressions for the Atlas Navigator.
 *
 * What the face says follows what he is doing: listening, working something out, looking for a
 * place on the map, explaining, warning, pleased with a result, caught out by an error. On top of
 * that, small passing expressions (a brow flick, a half smile, pressed lips) come and go while he
 * is idle, so the face is never held perfectly still.
 *
 * His manner is a site engineer's: expressions are readable but restrained, and several are
 * one-sided (a raised brow, a half smile), which is what makes a face look like a person's rather
 * than a mask. Each value is how far a face channel is pushed, 0..1 (see navigatorFace.ts).
 */
import type { NarrationHint } from "@/lib/atlas-ai/visemes";

export type ExpressionChannel =
  | "smile" | "smirk" | "squint" | "browUp" | "browCock" | "browDown" | "browIn"
  | "eyesWide" | "frown" | "lipPress" | "purse";

export const EXPRESSION_CHANNELS: ExpressionChannel[] = [
  "smile", "smirk", "squint", "browUp", "browCock", "browDown", "browIn", "eyesWide", "frown", "lipPress", "purse",
];

export type ExpressionId =
  | "atEase" | "friendly" | "attentive" | "thinking" | "searching" | "pleased" | "concerned"
  | "explaining" | "greeting" | "serious" | "asking" | "counting";

type Weights = Partial<Record<ExpressionChannel, number>>;

export const EXPRESSIONS: Record<ExpressionId, Weights> = {
  /** standing by: relaxed, a trace of a smile reaching the eyes */
  atEase: { smile: 0.2, squint: 0.08 },
  /** the user is pointing at him: open, welcoming */
  friendly: { smile: 0.5, squint: 0.22, browUp: 0.2 },
  /** listening to the user: brows up, eyes open, ready */
  attentive: { browUp: 0.38, eyesWide: 0.14, smile: 0.1 },
  /** working it out: brows drawn together, eyes narrowed, lips pressed, one brow lifted */
  thinking: { browIn: 0.55, browDown: 0.18, squint: 0.3, lipPress: 0.45, browCock: 0.3 },
  /** looking for something on the map: eyes narrowed, intent */
  searching: { squint: 0.32, browDown: 0.22, browIn: 0.2, purse: 0.15 },
  /** it worked: a real smile, eyes creased */
  pleased: { smile: 0.72, squint: 0.4, browUp: 0.18 },
  /** something went wrong: worried brows (up and together), mouth turned down */
  concerned: { browIn: 0.7, browUp: 0.3, frown: 0.42, lipPress: 0.25 },

  // while speaking, by what the line is about
  /** plain explanation: engaged, a slight smile */
  explaining: { smile: 0.22, squint: 0.12, browUp: 0.2 },
  /** hello / welcome: warm */
  greeting: { smile: 0.55, squint: 0.3, browUp: 0.28 },
  /** warnings, risks, delays, weather: no smile, brows down */
  serious: { browDown: 0.45, browIn: 0.5, frown: 0.25, squint: 0.15 },
  /** asking the user something: one brow up */
  asking: { browCock: 0.5, browUp: 0.22, smile: 0.12 },
  /** figures and lists: precise, focused */
  counting: { browIn: 0.3, squint: 0.2, browUp: 0.15, smile: 0.08 },
};

/** Which expression fits what he is doing right now. */
export function pickExpression(input: {
  state: string;
  speaking: boolean;
  hover: boolean;
  hint: NarrationHint;
}): ExpressionId {
  const { state, speaking, hover, hint } = input;
  if (speaking) {
    if (hint === "warning") return "serious";
    if (hint === "greeting") return "greeting";
    if (hint === "question") return "asking";
    if (hint === "number" || hint === "list") return "counting";
    return "explaining";
  }
  switch (state) {
    case "ERROR": return "concerned";
    case "SUCCESS": return "pleased";
    case "THINKING": return "thinking";
    case "SEARCHING":
    case "NAVIGATING": return "searching";
    case "LISTENING": return "attentive";
    default: return hover ? "friendly" : "atEase";
  }
}

/** Passing expressions while idle: [what moves, how long it lasts in seconds] */
export const MICRO_EXPRESSIONS: Array<{ weights: Weights; seconds: number }> = [
  { weights: { browUp: 0.4 }, seconds: 0.6 }, // brow flick
  { weights: { smirk: 0.4, squint: 0.15 }, seconds: 1.6 }, // half smile
  { weights: { lipPress: 0.45 }, seconds: 0.9 }, // lips pressed, a thought passing
  { weights: { browCock: 0.42 }, seconds: 1.1 }, // one brow up: noticed something
  { weights: { squint: 0.3, browIn: 0.25 }, seconds: 1.4 }, // reading the map
  { weights: { smile: 0.3, squint: 0.2 }, seconds: 1.8 }, // a quiet smile
  { weights: { purse: 0.3, browDown: 0.15 }, seconds: 1.2 }, // weighing something up
];

/** How strongly the personality shows on the face. */
export const EXPRESSION_STRENGTH: Record<string, number> = { professional: 0.75, friendly: 1, playful: 1.2 };
