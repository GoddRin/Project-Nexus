"use client";

/**
 * 🔊 Web Audio API Synthesizer for Supercar Sound FX
 * Zero external audio dependencies — generated entirely in real-time in the browser.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 🔑 Remote Key Fob Lock/Unlock Chirp (Dual High-Pitch Beep)
 */
export function playKeyFobBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Chirp 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(2400, now);
  osc1.frequency.exponentialRampToValueAtTime(3200, now + 0.04);
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.05);

  // Chirp 2 (Short delay)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(2800, now + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(3600, now + 0.12);
  gain2.gain.setValueAtTime(0.18, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.13);
}

/**
 * 🏎️ Ferrari Naturally Aspirated 4.5L V8 Engine Throttle Rev & Exhaust Roar
 */
export function playEngineRev() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.8;

  // 1. Low V8 Harmonic Rumble
  const oscLow = ctx.createOscillator();
  const gainLow = ctx.createGain();
  oscLow.type = "sawtooth";
  oscLow.frequency.setValueAtTime(85, now);
  oscLow.frequency.exponentialRampToValueAtTime(380, now + 0.5); // Rev up to 8,000 RPM equivalent
  oscLow.frequency.exponentialRampToValueAtTime(140, now + 1.2); // Decel & overrun
  oscLow.frequency.linearRampToValueAtTime(80, now + duration);

  gainLow.gain.setValueAtTime(0.01, now);
  gainLow.gain.linearRampToValueAtTime(0.22, now + 0.2);
  gainLow.gain.exponentialRampToValueAtTime(0.01, now + duration);

  // 2. High Exhaust Scream
  const oscHigh = ctx.createOscillator();
  const gainHigh = ctx.createGain();
  oscHigh.type = "sawtooth";
  oscHigh.frequency.setValueAtTime(170, now);
  oscHigh.frequency.exponentialRampToValueAtTime(760, now + 0.5);
  oscHigh.frequency.exponentialRampToValueAtTime(280, now + 1.2);
  oscHigh.frequency.linearRampToValueAtTime(160, now + duration);

  gainHigh.gain.setValueAtTime(0.01, now);
  gainHigh.gain.linearRampToValueAtTime(0.15, now + 0.35);
  gainHigh.gain.exponentialRampToValueAtTime(0.005, now + duration);

  // Filter for throaty induction roar
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(1800, now + 0.5);
  filter.frequency.exponentialRampToValueAtTime(400, now + duration);
  filter.Q.value = 2.5;

  oscLow.connect(filter);
  oscHigh.connect(filter);
  filter.connect(gainLow);
  gainLow.connect(ctx.destination);

  oscLow.start(now);
  oscHigh.start(now);
  oscLow.stop(now + duration);
  oscHigh.stop(now + duration);
}

/**
 * 💨 Nitrous Oxide (NOS) / Cryo Purge Pressure Hiss
 */
export function playNosPurge() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.6; // 600ms noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3200, now);
  filter.Q.value = 1.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.58);
}

/**
 * 📢 Dual-Tone European Sports Car Horn
 */
export function playHornBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.28;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(420, now); // Low tone
  osc2.frequency.setValueAtTime(505, now); // High tone

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}
