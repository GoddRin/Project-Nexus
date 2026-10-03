"use client";

import { useRef, useCallback, useEffect } from "react";
import {
  buildVisemeTimeline,
  progressForChar,
  estimateSpeechDuration,
  unitIndexAt,
  computeEnvelope,
  alignTimeline,
  unitAtTime,
  lastUnitAt,
  envelopeAt,
  compressPauses,
  VISEME_IDS,
  type VisemeTimeline,
  type VisemeId,
  type AudioAlignment,
} from "@/lib/atlas-ai/visemes";

export interface LipSyncTelemetry {
  /** Instantaneous audio volume / energy [0.0 - 1.0] */
  energy: number;
  /** Spring-smoothed speech envelope for continuous organic animation [0.0 - 1.0] */
  smoothedEnergy: number;
  /** Low-frequency vocal resonance (chest tone) [0.0 - 1.0] */
  bass: number;
  /** Mid-frequency formant band (vowels / jaw opening) [0.0 - 1.0] */
  mid: number;
  /** High-frequency presence (consonant / sibilance) [0.0 - 1.0] */
  presence: number;
  /** Whether the voice is audibly playing right now (false while TTS is still being synthesized) */
  isPlaying: boolean;
  /** Current playback time in seconds (output-latency compensated) */
  currentTime: number;
  /** Total duration of current audio in seconds */
  duration: number;
  /** Currently dominant viseme (Oculus set) */
  viseme: VisemeId;
  /** Per-viseme blend weights [0..1], smoothed; consumed by the face rig */
  visemeWeights: Record<string, number>;
  /** Jaw opening [0..1] derived from visemes */
  jawOpen: number;
  /** Speech is driven by a synthetic clock (browser TTS) rather than decoded audio */
  synthetic: boolean;
  /** Index into the spoken text of the character being voiced (subtitle / bubble sync); -1 before speech */
  charIndex: number;
  /** Length of the spoken text */
  textLength: number;
}

export interface PlayAudioOptions {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  /** Called every animation frame while playing (not the 4 Hz media `timeupdate`) */
  onTimeUpdate?: (currentTime: number, duration: number, charIndex: number) => void;
  /** Inside a speech session: where this clip's text starts in the whole line (keeps captions absolute) */
  charBase?: number;
}

export interface UseLipSyncReturn {
  /** Reactive ref containing 60fps audio metrics consumed synchronously by Three.js render loop */
  lipSyncRef: React.MutableRefObject<LipSyncTelemetry>;
  /** Decode + play audio with audio-aligned lip-sync. Resolves true once playback has started. */
  playAudio: (source: string | Blob, options?: PlayAudioOptions) => Promise<boolean>;
  /** Stop active audio playback immediately and close the mouth */
  stopAudio: () => void;
  /** A line spoken as several clips in a row (sentence by sentence): he stays "speaking" across
   *  the short gaps between clips and captions count through the whole line. */
  beginSpeechSession: (totalTextLength: number) => void;
  endSpeechSession: () => void;
  /** Provide the text being spoken so a viseme timeline can be built (call before playAudio) */
  setSpeechText: (text: string | null) => void;
  /** Browser speechSynthesis fallback: start a synthetic speech clock (no decoded audio available) */
  startSyntheticSpeech: (text: string, rate?: number) => void;
  /** Resync synthetic clock from SpeechSynthesisEvent.charIndex */
  syncSyntheticChar: (charIndex: number, charLength?: number) => void;
  /** Stop synthetic speech clock */
  stopSyntheticSpeech: () => void;
  /** Play a subtle high-tech holographic UI chime for tactile tap feedback */
  playHolographicChime: (variant?: "wake" | "acknowledge" | "deactivate") => void;
}

const makeDefaultTelemetry = (): LipSyncTelemetry => ({
  energy: 0,
  smoothedEnergy: 0,
  bass: 0,
  mid: 0,
  presence: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  viseme: "sil",
  visemeWeights: {},
  jawOpen: 0,
  synthetic: false,
  charIndex: -1,
  textLength: 0,
});

/** Mouth shapes form slightly before the sound is heard; sample the timeline this far ahead. */
const VISEME_LEAD_S = 0.07;
/** Captions follow the voice a touch late rather than early: a word lighting up before it is heard
 *  reads as "text running ahead", one landing just after its onset reads as in sync. */
const CAPTION_LAG_S = 0.09;
/** Browser voices report `start` well before sound leaves the speakers: the mouth stays shut for
 *  this long, or until the voice reports its first word, whichever comes first. */
const SYNTH_START_LAG_S = 0.3;
/** Below this (normalised) loudness the voice is silent and the mouth is closed. */
const SILENCE_LEVEL = 0.08;

export function useLipSync(): UseLipSyncReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const loopRef = useRef<() => void>(() => {});
  /** Monotonic id: any async step that finishes after a newer play/stop is discarded */
  const playSeqRef = useRef(0);
  const lastDriveRef = useRef(0);

  // Synchronous ref accessed at 60fps by R3F useFrame
  const lipSyncRef = useRef<LipSyncTelemetry>(makeDefaultTelemetry());

  const timelineRef = useRef<VisemeTimeline | null>(null);
  const alignmentRef = useRef<AudioAlignment | null>(null);
  const clipRef = useRef<{ startAt: number; duration: number; options?: PlayAudioOptions; seq: number; charBase: number } | null>(null);
  const sessionRef = useRef<{ active: boolean; total: number; started: boolean }>({ active: false, total: 0, started: false });
  const syntheticRef = useRef<{
    active: boolean;
    startedAt: number;
    offset: number;
    duration: number;
    /** When the utterance began (never moved by resyncs): measures the voice's real pace */
    beganAt: number;
    /** Clock ceiling from the last word boundary: the end of the word being spoken */
    limit: number;
    /** The voice has reported at least one word boundary (its clock is now tied to the real voice) */
    synced: boolean;
  }>({
    active: false,
    startedAt: 0,
    offset: 0,
    duration: 0,
    beganAt: 0,
    limit: Infinity,
    synced: false,
  });

  // Initialize or resume Web Audio AudioContext (lazily on first user interaction)
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }

    return audioContextRef.current;
  }, []);

  const setSpeechText = useCallback((text: string | null) => {
    timelineRef.current = text ? buildVisemeTimeline(text) : null;
    // (inside a session the line's total length and running caption position are kept;
    //  playAudio reads this clip's own length from here before restoring the total)
    lipSyncRef.current.textLength = text ? text.length : 0;
    if (!sessionRef.current.active) lipSyncRef.current.charIndex = -1;
  }, []);

  /** Smoothly drive per-viseme weights toward the active unit. */
  const driveVisemes = useCallback((tel: LipSyncTelemetry, active: VisemeId, amp: number) => {
    const w = tel.visemeWeights;
    const nowMs = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastDriveRef.current) / 1000));
    lastDriveRef.current = nowMs;
    const kAttack = 1 - Math.exp(-dt / 0.03);
    const kRelease = 1 - Math.exp(-dt / 0.07);
    let jaw = 0;
    for (const id of VISEME_IDS) {
      const prev = w[id] || 0;
      const target = id === active && id !== "sil" ? amp : 0;
      // frame-rate independent: ~30 ms attack, ~70 ms release (was per-frame, so lips lagged at low fps)
      const next = prev + (target - prev) * (target > prev ? kAttack : kRelease);
      w[id] = next < 0.004 ? 0 : next;
      if (id === "aa") jaw += w[id];
      else if (id === "O" || id === "E") jaw += w[id] * 0.7;
      else if (id === "U" || id === "I" || id === "CH") jaw += w[id] * 0.35;
      else if (id !== "sil" && id !== "PP") jaw += w[id] * 0.25;
    }
    tel.viseme = active;
    tel.jawOpen = Math.min(1, jaw);
  }, []);

  // 60fps sampling loop: audio clock → envelope + aligned viseme
  const sampleAudioLoop = useCallback(() => {
    const tel = lipSyncRef.current;
    const syn = syntheticRef.current;
    const clip = clipRef.current;
    const ctx = audioContextRef.current;
    const tl = timelineRef.current;

    // A. Decoded TTS clip: everything is read from the audio clock, so it cannot drift
    if (clip && ctx && tel.isPlaying && !tel.synthetic) {
      const latency = (ctx.outputLatency || ctx.baseLatency || 0);
      const t = ctx.currentTime - clip.startAt - latency;
      tel.currentTime = Math.max(0, Math.min(t, clip.duration));
      tel.duration = clip.duration;

      const al = alignmentRef.current;
      const raw = al && t >= 0 ? envelopeAt(al, t) : 0;
      tel.energy = raw;
      tel.smoothedEnergy += (raw - tel.smoothedEnergy) * (raw > tel.smoothedEnergy ? 0.55 : 0.22);
      tel.mid = raw * 0.7;
      tel.bass = raw * 0.45;
      tel.presence = raw * 0.35;

      // The sound itself decides WHEN and HOW FAR the mouth opens (that is what the eye checks
      // against the ear, and the audio cannot be out of step with itself). The text only decides
      // the SHAPE the mouth takes while it is open.
      let active: VisemeId = "sil";
      let amp = 0;
      if (al && t >= -VISEME_LEAD_S) {
        const tv = t + VISEME_LEAD_S;
        const loud = envelopeAt(al, tv);
        if (loud > SILENCE_LEVEL) {
          let shape: VisemeId = loud > 0.5 ? "aa" : "E";
          let emph = 0.3;
          if (tl && tl.units.length) {
            let ui = unitAtTime(tl, al, tv);
            if (ui < 0) ui = Math.max(0, lastUnitAt(al, tv));
            // sound is audible but the text says "pause" here: borrow the nearest spoken sound
            for (let d = 0; d <= 3 && tl.units[ui]?.v === "sil"; d++) {
              if (tl.units[ui + d] && tl.units[ui + d].v !== "sil") ui = ui + d;
              else if (tl.units[ui - d] && tl.units[ui - d].v !== "sil") ui = ui - d;
            }
            const u = tl.units[ui];
            if (u && u.v !== "sil") {
              shape = u.v;
              emph = u.emph;
            }
          }
          active = shape;
          amp = Math.min(1, Math.pow(loud, 0.75) * (0.95 + emph * 0.3));
        }
        if (tl) {
          const li = lastUnitAt(al, t - CAPTION_LAG_S);
          if (li >= 0) tel.charIndex = clip.charBase + tl.chars[li];
        }
      }
      driveVisemes(tel, active, amp);
      clip.options?.onTimeUpdate?.(tel.currentTime, clip.duration, tel.charIndex);
      animFrameRef.current = requestAnimationFrame(() => loopRef.current());
      return;
    }

    // B. Synthetic speech (browser TTS): believable envelope on a wall clock, resynced per word
    if (syn.active && tel.synthetic) {
      // Never run past the word the voice has actually reached (when it reports word boundaries)
      const t = Math.max(0, Math.min(syn.offset + (performance.now() - syn.startedAt) / 1000, syn.limit));
      tel.currentTime = Math.min(t, syn.duration);
      tel.duration = syn.duration;
      let active: VisemeId = "sil";
      let env = 0;
      if (t > syn.duration) {
        // The real voice is still talking past our estimate: keep the mouth moving naturally
        // rather than freezing shut mid-sentence.
        active = (["aa", "E", "O", "nn"] as VisemeId[])[Math.floor(t * 6.5) % 4];
        env = 0.42 + 0.2 * Math.sin(t * 9);
      } else if (tl) {
        const ui = Math.max(0, unitIndexAt(tl, tel.currentTime / syn.duration));
        const u = tl.units[ui];
        if (u && u.v !== "sil") {
          active = u.v;
          env = 0.5 + u.emph * 0.4;
        }
        const ci = Math.max(0, unitIndexAt(tl, Math.max(0, tel.currentTime - CAPTION_LAG_S) / syn.duration));
        tel.charIndex = tl.chars[ci] ?? tel.charIndex;
      }
      const raw = Math.min(1, env * (0.85 + 0.15 * Math.sin(t * 23)));
      tel.energy = raw;
      tel.smoothedEnergy += (raw - tel.smoothedEnergy) * (raw > tel.smoothedEnergy ? 0.55 : 0.22);
      tel.mid = raw * 0.7;
      tel.bass = raw * 0.4;
      tel.presence = raw * 0.35;
      driveVisemes(tel, active, raw);
      animFrameRef.current = requestAnimationFrame(() => loopRef.current());
      return;
    }

    // C. Nothing playing: close the mouth quickly and stop the loop
    tel.smoothedEnergy *= 0.8;
    tel.energy *= 0.7;
    tel.bass *= 0.7;
    tel.mid *= 0.7;
    tel.presence *= 0.7;
    driveVisemes(tel, "sil", 0);
    if (tel.smoothedEnergy > 0.005 || tel.jawOpen > 0.01 || sessionRef.current.active) {
      // (between two clips of one line the mouth rests shut, but he is still mid-sentence)
      animFrameRef.current = requestAnimationFrame(() => loopRef.current());
    } else {
      const keep = { charIndex: tel.charIndex, textLength: tel.textLength };
      lipSyncRef.current = { ...makeDefaultTelemetry(), ...keep };
      animFrameRef.current = null;
    }
  }, [driveVisemes]);

  useEffect(() => {
    loopRef.current = sampleAudioLoop;
  }, [sampleAudioLoop]);

  const startLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  const startSyntheticSpeech = useCallback(
    (text: string, rate = 1) => {
      timelineRef.current = compressPauses(buildVisemeTimeline(text));
      const duration = estimateSpeechDuration(text, rate);
      const now = performance.now();
      syntheticRef.current = {
        active: true,
        startedAt: now + SYNTH_START_LAG_S * 1000,
        offset: 0,
        duration,
        beganAt: now + SYNTH_START_LAG_S * 1000,
        limit: Infinity,
        synced: false,
      };
      const tel = lipSyncRef.current;
      tel.isPlaying = true;
      tel.synthetic = true;
      tel.duration = duration;
      tel.currentTime = 0;
      tel.textLength = text.length;
      tel.charIndex = 0;
      startLoop();
    },
    [startLoop]
  );

  const syncSyntheticChar = useCallback((charIndex: number, charLength?: number) => {
    const tl = timelineRef.current;
    const syn = syntheticRef.current;
    if (!tl || !syn.active) return;
    const now = performance.now();
    const progress = progressForChar(tl, charIndex);
    if (!syn.synced) {
      // first word reported: this is when the voice really started
      syn.synced = true;
      syn.beganAt = now - progress * syn.duration * 1000;
    }
    // Learn this voice's real pace as it speaks: a word boundary tells us exactly how far it has got
    const elapsed = (now - syn.beganAt) / 1000;
    if (progress > 0.1 && elapsed > 0.8) {
      const implied = elapsed / progress;
      if (implied > syn.duration * 0.5 && implied < syn.duration * 2) syn.duration = syn.duration * 0.45 + implied * 0.55;
    }
    syn.offset = progress * syn.duration;
    syn.startedAt = now;
    // ...and the clock may coast only to the end of this word until the next boundary arrives
    const wordEnd = charIndex + (charLength && charLength > 0 ? charLength : 7) + 1;
    syn.limit = progressForChar(tl, wordEnd) * syn.duration;
    lipSyncRef.current.duration = syn.duration;
  }, []);

  const stopSyntheticSpeech = useCallback(() => {
    syntheticRef.current.active = false;
    const tel = lipSyncRef.current;
    if (tel.synthetic) {
      tel.synthetic = false;
      tel.isPlaying = false;
      startLoop();
    }
  }, [startLoop]);

  /** Stop the clip that is playing. `keepSession` is used between the clips of one line. */
  const haltClip = useCallback((keepSession: boolean) => {
    playSeqRef.current += 1; // invalidates any decode/play still in flight
    if (!keepSession) sessionRef.current.active = false;
    const node = sourceNodeRef.current;
    if (node) {
      node.onended = null;
      try {
        node.stop();
      } catch {}
      try {
        node.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    clipRef.current = null;
    alignmentRef.current = null;
    syntheticRef.current.active = false;
    const tel = lipSyncRef.current;
    tel.isPlaying = keepSession && sessionRef.current.active && sessionRef.current.started;
    tel.synthetic = false;
    // let the loop ease the mouth shut instead of freezing it open
    startLoop();
  }, [startLoop]);

  const stopAudio = useCallback(() => haltClip(false), [haltClip]);

  const beginSpeechSession = useCallback(
    (totalTextLength: number) => {
      haltClip(false);
      // "speaking" only begins when the first clip is actually audible
      sessionRef.current = { active: true, total: totalTextLength, started: false };
      const tel = lipSyncRef.current;
      tel.isPlaying = false;
      tel.synthetic = false;
      tel.charIndex = -1;
      tel.textLength = totalTextLength;
      startLoop();
    },
    [haltClip, startLoop]
  );

  const endSpeechSession = useCallback(() => {
    if (!sessionRef.current.active) return;
    sessionRef.current.active = false;
    const tel = lipSyncRef.current;
    tel.isPlaying = false;
    tel.charIndex = tel.textLength;
    startLoop();
  }, [startLoop]);

  const playAudio = useCallback(
    async (source: string | Blob, options?: PlayAudioOptions): Promise<boolean> => {
      // Preserve the viseme timeline that setSpeechText() just provided
      const pendingTimeline = timelineRef.current;
      const pendingLen = lipSyncRef.current.textLength;
      const session = sessionRef.current;
      const charBase = session.active ? options?.charBase ?? 0 : 0;
      const keepChar = lipSyncRef.current.charIndex;
      haltClip(session.active);
      timelineRef.current = pendingTimeline;
      lipSyncRef.current.textLength = session.active ? session.total : pendingLen;
      const seq = playSeqRef.current;

      const ctx = getAudioContext();
      if (!ctx) {
        options?.onError?.(new Error("Web Audio unavailable"));
        return false;
      }

      try {
        const bytes =
          typeof source === "string" ? await fetch(source).then((r) => r.arrayBuffer()) : await source.arrayBuffer();
        const buffer = await ctx.decodeAudioData(bytes);
        if (seq !== playSeqRef.current) return false; // superseded while decoding

        if (ctx.state === "suspended") await ctx.resume();
        if (ctx.state !== "running") throw new Error("AudioContext blocked (no user gesture yet)");
        if (seq !== playSeqRef.current) return false;

        // Measure where the voice is actually audible, then lay the text over those stretches
        const HOP = 0.01;
        const env = computeEnvelope(buffer.getChannelData(0), buffer.sampleRate, HOP);
        const empty: VisemeTimeline = { units: [], total: 1, starts: [], chars: [] };
        alignmentRef.current = alignTimeline(timelineRef.current ?? empty, env, HOP, buffer.duration);
        if (!timelineRef.current) alignmentRef.current.unitStart = new Float32Array(0);

        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(ctx.destination);
        sourceNodeRef.current = node;

        const startAt = ctx.currentTime + 0.04;
        clipRef.current = { startAt, duration: buffer.duration, options, seq, charBase };
        node.onended = () => {
          if (seq !== playSeqRef.current) return;
          sourceNodeRef.current = null;
          clipRef.current = null;
          if (sessionRef.current.active) {
            // more clips of this line may follow: stay "speaking", captions hold at this clip's end
            lipSyncRef.current.charIndex = Math.min(sessionRef.current.total, charBase + pendingLen);
          } else {
            lipSyncRef.current.isPlaying = false;
            lipSyncRef.current.charIndex = lipSyncRef.current.textLength;
          }
          options?.onEnded?.();
        };
        node.start(startAt);

        const tel = lipSyncRef.current;
        tel.isPlaying = true;
        if (session.active) session.started = true;
        tel.synthetic = false;
        tel.duration = buffer.duration;
        tel.currentTime = 0;
        tel.charIndex = session.active && charBase > 0 ? keepChar : -1;
        options?.onStart?.();
        startLoop();
        return true;
      } catch (err) {
        if (seq !== playSeqRef.current) return false;
        console.warn("[Atlas LipSync Play Exception]:", err);
        options?.onError?.(err);
        return false;
      }
    },
    [getAudioContext, startLoop, haltClip]
  );

  /**
   * Tactile High-Tech Audio Feedback (Synthesized via Web Audio oscillator)
   */
  const playHolographicChime = useCallback(
    (variant: "wake" | "acknowledge" | "deactivate" = "wake") => {
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (variant === "wake") {
          // Crisp high-frequency wake-up chirp (587Hz -> 880Hz / D5 -> A5)
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (variant === "acknowledge") {
          // Double harmonic acknowledgement ping (784Hz & 1046Hz / G5 & C6)
          osc.type = "triangle";
          osc.frequency.setValueAtTime(783.99, now);
          osc.frequency.setValueAtTime(1046.5, now + 0.05);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.14);
        } else {
          // Soft power-down glide (659Hz -> 330Hz)
          osc.type = "sine";
          osc.frequency.setValueAtTime(659.25, now);
          osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.12);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.14);
        }
      } catch {}
    },
    [getAudioContext]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const node = sourceNodeRef.current;
      if (node) {
        node.onended = null;
        try {
          node.stop();
        } catch {}
      }
    };
  }, []);

  return {
    lipSyncRef,
    playAudio,
    stopAudio,
    beginSpeechSession,
    endSpeechSession,
    setSpeechText,
    startSyntheticSpeech,
    syncSyntheticChar,
    stopSyntheticSpeech,
    playHolographicChime,
  };
}
