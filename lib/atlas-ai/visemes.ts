/**
 * Text → viseme timeline for lip-sync (client-safe, no Node imports).
 *
 * Gemini TTS returns audio only (no phoneme timings), so we derive a plausible viseme sequence
 * from the spoken text with simple grapheme rules, time-stretch it across the real audio
 * duration, and let live audio energy gate it (see useLipSync). Viseme names follow the
 * Oculus/ReadyPlayerMe set so any compatible face model works.
 */

export type VisemeId =
  | "sil" | "PP" | "FF" | "TH" | "DD" | "kk" | "CH" | "SS"
  | "nn" | "RR" | "aa" | "E" | "I" | "O" | "U";

export const VISEME_IDS: VisemeId[] = [
  "sil", "PP", "FF", "TH", "DD", "kk", "CH", "SS", "nn", "RR", "aa", "E", "I", "O", "U",
];

export type VisemeWeights = Partial<Record<VisemeId, number>>;

export interface VisemeUnit {
  v: VisemeId;
  /** relative duration weight */
  w: number;
  /** emphasis hint [0..1]: stressed vowels / word starts open slightly wider */
  emph: number;
}

export interface VisemeTimeline {
  units: VisemeUnit[];
  total: number;
  /** cumulative start offset of each unit (same length as units) */
  starts: number[];
  /** char index into the source text for each unit (for onboundary resync) */
  chars: number[];
}

const DIGRAPHS: Array<[string, VisemeId]> = [
  ["th", "TH"], ["sh", "CH"], ["ch", "CH"], ["ph", "FF"], ["ng", "kk"], ["ck", "kk"], ["qu", "kk"],
  ["ee", "I"], ["ea", "I"], ["oo", "U"], ["ou", "O"], ["ow", "O"], ["oa", "O"], ["ai", "E"], ["ay", "E"],
  ["ie", "I"], ["ei", "E"], ["au", "O"], ["aw", "O"],
];

const SINGLE: Record<string, VisemeId> = {
  a: "aa", e: "E", i: "I", o: "O", u: "U", y: "I",
  p: "PP", b: "PP", m: "PP",
  f: "FF", v: "FF",
  t: "DD", d: "DD",
  k: "kk", c: "kk", g: "kk", q: "kk", x: "kk",
  j: "CH",
  s: "SS", z: "SS",
  n: "nn", l: "nn",
  r: "RR",
  w: "U",
};

const VOWELS = new Set<VisemeId>(["aa", "E", "I", "O", "U"]);

export function buildVisemeTimeline(text: string): VisemeTimeline {
  const src = (text || "").toLowerCase();
  const units: VisemeUnit[] = [];
  const chars: number[] = [];
  let wordStart = true;

  const push = (v: VisemeId, w: number, emph: number, ci: number) => {
    units.push({ v, w, emph });
    chars.push(ci);
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      push("sil", 0.35, 0, i);
      wordStart = true;
      i++;
      continue;
    }
    if (/[.!?;:]/.test(ch)) {
      push("sil", 3.0, 0, i);
      wordStart = true;
      i++;
      continue;
    }
    if (/[,—–-]/.test(ch)) {
      push("sil", 1.6, 0, i);
      wordStart = true;
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      // Digits are normally spelled out by cleanTextForSpeech; approximate as a vowel-ish burst
      push("O", 1.0, 0.5, i);
      i++;
      continue;
    }
    if (!/[a-z]/.test(ch)) {
      i++;
      continue;
    }

    const pair = src.slice(i, i + 2);
    const di = DIGRAPHS.find(([g]) => g === pair);
    if (di) {
      const v = di[1];
      push(v, VOWELS.has(v) ? 1.15 : 0.7, wordStart ? 0.6 : 0.3, i);
      wordStart = false;
      i += 2;
      continue;
    }

    if (ch === "h") {
      // Silent-ish / breathy: skip unless word-initial (tiny open)
      if (wordStart) push("aa", 0.25, 0, i);
      wordStart = false;
      i++;
      continue;
    }

    const v = SINGLE[ch];
    if (v) {
      const vowel = VOWELS.has(v);
      push(v, vowel ? 1.05 : 0.6, vowel && wordStart ? 0.7 : vowel ? 0.4 : 0.15, i);
      wordStart = false;
    }
    i++;
  }

  // Collapse consecutive identical visemes (aa aa -> one longer aa)
  const merged: VisemeUnit[] = [];
  const mergedChars: number[] = [];
  for (let k = 0; k < units.length; k++) {
    const last = merged[merged.length - 1];
    if (last && last.v === units[k].v) {
      last.w += units[k].w * 0.6;
      last.emph = Math.max(last.emph, units[k].emph);
    } else {
      merged.push({ ...units[k] });
      mergedChars.push(chars[k]);
    }
  }

  const starts: number[] = [];
  let total = 0;
  for (const u of merged) {
    starts.push(total);
    total += u.w;
  }

  return { units: merged, total: Math.max(total, 0.0001), starts, chars: mergedChars };
}

/** Index of the unit active at normalised progress p ∈ [0,1] (binary search). */
export function unitIndexAt(tl: VisemeTimeline, p: number): number {
  if (tl.units.length === 0) return -1;
  const target = Math.min(Math.max(p, 0), 0.99999) * tl.total;
  let lo = 0;
  let hi = tl.units.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tl.starts[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Progress [0,1] at which a given source character index is spoken (for speechSynthesis boundary resync). */
export function progressForChar(tl: VisemeTimeline, charIndex: number): number {
  if (tl.units.length === 0) return 0;
  let idx = 0;
  for (let k = 0; k < tl.chars.length; k++) {
    if (tl.chars[k] <= charIndex) idx = k;
    else break;
  }
  return tl.starts[idx] / tl.total;
}

/** Rough speaking duration in seconds when no audio clock exists (browser TTS fallback). */
export function estimateSpeechDuration(text: string, rate = 1): number {
  const words = (text.match(/\S+/g) || []).length;
  return Math.max(0.6, (words / 2.6) / Math.max(rate, 0.5));
}

/**
 * Lightweight content classifier used to pick matching body language for a narration.
 */
export type NarrationHint = "number" | "list" | "warning" | "greeting" | "question" | "explain" | null;

export function classifyNarration(text: string): NarrationHint {
  const t = (text || "").toLowerCase();
  if (!t) return null;
  if (/\b(warning|caution|alert|typhoon|delay|risk|issue|error|unable)\b/.test(t)) return "warning";
  if (/\b(hello|hi|good (morning|afternoon|evening)|welcome|how can i help)\b/.test(t)) return "greeting";
  if (/\?/.test(t) && t.length < 140) return "question";
  if (/\d/.test(t) || /\b(megawatts?|kilometers?|million liters|mw|mld)\b/.test(t)) return "number";
  if (/(,\s*[^,]+){2,}\band\b|\b(first|second|third|several|following|including)\b/.test(t)) return "list";
  return "explain";
}

// ─── Audio-aligned timing ────────────────────────────────────────────────────
// TTS audio has leading/trailing silence and pauses between phrases. Stretching the text
// uniformly over the clip makes lips (and subtitles) drift. Instead we measure where the voice
// is actually audible and lay the text out over those voiced stretches only.

export interface AudioAlignment {
  /** start time (s) of every timeline unit */
  unitStart: Float32Array;
  /** voiced [start, end] stretches in seconds */
  segments: Array<[number, number]>;
  /** normalised RMS envelope, one value per `hop` seconds */
  env: Float32Array;
  hop: number;
  duration: number;
}

/** 20 ms RMS envelope sampled every `hop` seconds, normalised to the clip's loud level. */
export function computeEnvelope(samples: Float32Array, sampleRate: number, hop = 0.01): Float32Array {
  const hopN = Math.max(1, Math.round(sampleRate * hop));
  const win = hopN * 2;
  const n = Math.max(1, Math.floor(samples.length / hopN));
  const env = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const s = k * hopN;
    const e = Math.min(samples.length, s + win);
    let sum = 0;
    for (let i = s; i < e; i++) sum += samples[i] * samples[i];
    env[k] = Math.sqrt(sum / Math.max(1, e - s));
  }
  // normalise by the 95th percentile so one loud plosive doesn't flatten everything else
  const sorted = Float32Array.from(env).sort();
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1e-6;
  for (let k = 0; k < n; k++) env[k] = Math.min(1, env[k] / ref);
  return env;
}

export function alignTimeline(tl: VisemeTimeline, env: Float32Array, hop: number, duration: number): AudioAlignment {
  // 1. voiced stretches
  const THR = 0.07;
  const raw: Array<[number, number]> = [];
  let start = -1;
  for (let k = 0; k < env.length; k++) {
    const on = env[k] > THR;
    if (on && start < 0) start = k;
    if (!on && start >= 0) {
      raw.push([start * hop, k * hop]);
      start = -1;
    }
  }
  if (start >= 0) raw.push([start * hop, env.length * hop]);
  // bridge short gaps (stop consonants), drop clicks
  const segments: Array<[number, number]> = [];
  for (const s of raw) {
    const last = segments[segments.length - 1];
    if (last && s[0] - last[1] < 0.14) last[1] = s[1];
    else segments.push([s[0], s[1]]);
  }
  const voiced = segments.filter((s) => s[1] - s[0] >= 0.05);
  if (voiced.length === 0) voiced.push([0, duration]);

  // 2. text weight that consumes voiced time (punctuation pauses consume none: they ARE the gaps)
  const n = tl.units.length;
  const vw = new Float32Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const u = tl.units[i];
    vw[i] = u.v === "sil" ? (u.w >= 1.6 ? 0 : 0.15) : u.w;
    total += vw[i];
  }
  const D = voiced.reduce((a, s) => a + (s[1] - s[0]), 0);
  const toReal = (v: number): number => {
    let acc = 0;
    for (const s of voiced) {
      const d = s[1] - s[0];
      if (v <= acc + d) return s[0] + (v - acc);
      acc += d;
    }
    return voiced[voiced.length - 1][1];
  };
  const unitStart = new Float32Array(n);
  let cum = 0;
  for (let i = 0; i < n; i++) {
    unitStart[i] = toReal((cum / Math.max(total, 1e-6)) * D);
    cum += vw[i];
  }
  refineWithSyllablePeaks(tl, unitStart, voiced, env, hop);
  return { unitStart, segments: voiced, env, hop, duration };
}

/**
 * Spreading text evenly over a voiced stretch assumes every sound takes its average time; real
 * speech does not. Each spoken syllable shows up as a bump in loudness, so within every stretch
 * the vowels of the text are pinned to the loudness peaks actually present in the audio and the
 * sounds in between are warped to follow. Shifts are capped, so a miscount (silent letters, a
 * swallowed syllable) can only nudge the timing, never scramble it.
 */
function refineWithSyllablePeaks(
  tl: VisemeTimeline,
  unitStart: Float32Array,
  voiced: Array<[number, number]>,
  env: Float32Array,
  hop: number
): void {
  const n = unitStart.length;
  if (n === 0 || env.length < 8) return;
  // 50 ms moving average: one bump per syllable rather than per pitch period
  const R = Math.max(1, Math.round(0.025 / hop));
  const sm = new Float32Array(env.length);
  for (let k = 0; k < env.length; k++) {
    let sum = 0;
    let cnt = 0;
    for (let j = Math.max(0, k - R); j <= Math.min(env.length - 1, k + R); j++) {
      sum += env[j];
      cnt++;
    }
    sm[k] = sum / cnt;
  }
  const MAX_SHIFT = 0.16;
  const MIN_GAP = 0.11;

  for (const [s0, s1] of voiced) {
    // units laid out in this stretch
    let a = -1;
    let b = -1;
    for (let i = 0; i < n; i++) {
      if (unitStart[i] >= s0 - 1e-4 && unitStart[i] < s1) {
        if (a < 0) a = i;
        b = i;
      }
    }
    if (a < 0 || b - a < 3) continue;

    // vowel centres as currently estimated
    const vowels: number[] = [];
    for (let i = a; i <= b; i++) {
      if (!VOWELS.has(tl.units[i].v)) continue;
      const end = i < b ? unitStart[i + 1] : s1;
      vowels.push((unitStart[i] + end) / 2);
    }

    // loudness peaks in the stretch
    const k0 = Math.max(1, Math.floor(s0 / hop));
    const k1 = Math.min(sm.length - 2, Math.ceil(s1 / hop));
    const peaks: number[] = [];
    for (let k = k0; k <= k1; k++) {
      if (sm[k] < 0.22 || sm[k] < sm[k - 1] || sm[k] <= sm[k + 1]) continue;
      const t = k * hop;
      const last = peaks.length - 1;
      if (last >= 0 && t - peaks[last] < MIN_GAP) {
        if (sm[k] > sm[Math.round(peaks[last] / hop)]) peaks[last] = t;
      } else {
        peaks.push(t);
      }
    }
    const M = vowels.length;
    const P = peaks.length;
    if (M < 2 || P < 2) continue;
    const ratio = P / M;
    if (ratio < 0.6 || ratio > 1.7) continue;

    // anchors (estimated time → real time), monotone in both
    const src: number[] = [s0];
    const dst: number[] = [s0];
    const count = Math.min(M, P);
    for (let q = 0; q < count; q++) {
      const vi = M <= P ? q : Math.round((q * (M - 1)) / (P - 1));
      const pi = M <= P ? Math.round((q * (P - 1)) / (M - 1)) : q;
      const from = vowels[vi];
      const to = Math.min(from + MAX_SHIFT, Math.max(from - MAX_SHIFT, peaks[pi]));
      if (from <= src[src.length - 1] + 0.01 || to <= dst[dst.length - 1] + 0.01) continue;
      if (to >= s1 - 0.01 || from >= s1 - 0.01) continue;
      src.push(from);
      dst.push(to);
    }
    src.push(s1);
    dst.push(s1);
    if (src.length < 3) continue;

    for (let i = a; i <= b; i++) {
      const t = unitStart[i];
      let j = 0;
      while (j < src.length - 2 && t > src[j + 1]) j++;
      const span = Math.max(1e-6, src[j + 1] - src[j]);
      unitStart[i] = dst[j] + ((t - src[j]) / span) * (dst[j + 1] - dst[j]);
    }
  }
}

/** Timeline unit being spoken at time t, or -1 while the voice is silent. */
export function unitAtTime(tl: VisemeTimeline, al: AudioAlignment, t: number): number {
  let voiced = false;
  for (const s of al.segments) {
    if (t >= s[0] - 0.02 && t <= s[1] + 0.02) {
      voiced = true;
      break;
    }
  }
  if (!voiced) return -1;
  let lo = 0;
  let hi = al.unitStart.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (al.unitStart[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Index of the last unit that has started by time t (ignores silences) — for subtitles. */
export function lastUnitAt(al: AudioAlignment, t: number): number {
  let lo = 0;
  let hi = al.unitStart.length - 1;
  if (hi < 0 || t < al.unitStart[0]) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (al.unitStart[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function envelopeAt(al: AudioAlignment, t: number): number {
  const k = t / al.hop;
  const i = Math.floor(k);
  if (i < 0 || i >= al.env.length) return 0;
  const j = Math.min(al.env.length - 1, i + 1);
  return al.env[i] + (al.env[j] - al.env[i]) * (k - i);
}

/**
 * Browser speech synthesis barely pauses at punctuation, unlike the neural voice. Shrink the
 * pause units (and drop the trailing one) so a clock-driven timeline doesn't finish the text early.
 */
export function compressPauses(tl: VisemeTimeline, factor = 0.25): VisemeTimeline {
  const units = tl.units.map((u) => (u.v === "sil" && u.w >= 1.6 ? { ...u, w: u.w * factor } : { ...u }));
  for (let i = units.length - 1; i >= 0 && units[i].v === "sil"; i--) units[i].w = 0.01;
  const starts: number[] = [];
  let total = 0;
  for (const u of units) {
    starts.push(total);
    total += u.w;
  }
  return { units, total: Math.max(total, 0.0001), starts, chars: tl.chars.slice() };
}
