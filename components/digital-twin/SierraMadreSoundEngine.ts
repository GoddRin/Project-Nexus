"use client";

import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA MADRE HYDROELECTRIC POWER PLANT PROCEDURAL SOUND ENGINE
 * 
 * 100% Zero-Dependency Web Audio API Procedural Synthesis:
 * - 🌊 River Rapids & Hydro Tailrace Water Rush
 * - 🌲 Mountain Forest Valley Wind & Canopy Rustle
 * - ⚡ Powerhouse Generator & 60Hz Electrical Transformer Hum
 * - 🐦 Morning: Sierra Madre Dawn Chorus & Mountain Swallows
 * - 🦗 Afternoon: Tropical Mountain Cicadas & Soaring Eagle Calls
 * - 🐸 Sunset/Night: Evening Tree Frogs, Riparian Crickets & Nightjar
 * - 🌧️ Storm: Heavy Monsoon Rain & Wind Gusts
 * ═══════════════════════════════════════════════════════════════════════════
 */

class SierraMadreSoundEngineImpl {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isMuted = true;
  private masterGain: GainNode | null = null;

  // Continuous Sound Nodes
  private riverGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private hydroHumGain: GainNode | null = null;
  private wildlifeGain: GainNode | null = null;
  private stormGain: GainNode | null = null;

  // Wildlife Interval Timers
  private wildlifeInterval: number | null = null;
  private currentTimeMode: AtmosphereTimeMode = "MORNING";
  private isStorm = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupRiverSound();
      this.setupWindSound();
      this.setupHydroHumSound();
      this.setupStormSound();
      this.startWildlifeScheduler();

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or initialized:", e);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.isInitialized && !muted) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended" && !muted) {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      const target = muted ? 0.0 : 0.65;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.8);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const clamped = Math.max(0.0, Math.min(1.0, vol));
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(clamped * 0.75, this.ctx.currentTime + 0.1);
    }
  }

  public updateAtmosphere(timeMode: AtmosphereTimeMode, isStorm: boolean) {
    this.currentTimeMode = timeMode;
    this.isStorm = isStorm;
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Adjust layer volumes dynamically
    if (this.riverGain) {
      const riverVol = isStorm ? 0.75 : timeMode === "MORNING" ? 0.55 : 0.45;
      this.riverGain.gain.linearRampToValueAtTime(riverVol, now + 1.5);
    }
    if (this.windGain) {
      const windVol = isStorm ? 0.65 : timeMode === "AFTERNOON" ? 0.35 : 0.22;
      this.windGain.gain.linearRampToValueAtTime(windVol, now + 1.5);
    }
    if (this.hydroHumGain) {
      const humVol = isStorm ? 0.15 : timeMode === "NIGHT" ? 0.35 : 0.25;
      this.hydroHumGain.gain.linearRampToValueAtTime(humVol, now + 1.5);
    }
    if (this.stormGain) {
      const stormVol = isStorm ? 0.8 : 0.0;
      this.stormGain.gain.linearRampToValueAtTime(stormVol, now + 1.5);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. River Rapids & Tailrace Rushing Water Synthesis (Brown/Pink Noise + Filters)
  // ───────────────────────────────────────────────────────────────────────────
  private setupRiverSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise approximation
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Cascaded Bandpass & Lowpass filters for organic water slosh & rush
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);
    lowpass.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(280, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // LFO for slow turbulent surging
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(80, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    lfo.start();

    this.riverGain = this.ctx.createGain();
    this.riverGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    whiteNoise.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(this.riverGain);
    this.riverGain.connect(this.masterGain);
    whiteNoise.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Mountain Forest Valley Wind & Canopy Rustle
  // ───────────────────────────────────────────────────────────────────────────
  private setupWindSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(320, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Wind gust LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(160, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);
    lfo.start();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    windSource.connect(bandpass);
    bandpass.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSource.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Powerhouse Turbine & 60Hz Electrical Transformer Hum
  // ───────────────────────────────────────────────────────────────────────────
  private setupHydroHumSound() {
    if (!this.ctx || !this.masterGain) return;

    // 60Hz Electrical Grid Fundamental
    const osc60 = this.ctx.createOscillator();
    osc60.type = "sine";
    osc60.frequency.setValueAtTime(60, this.ctx.currentTime);

    // 120Hz 2nd Harmonic (Transformer core magnetostriction)
    const osc120 = this.ctx.createOscillator();
    osc120.type = "sine";
    osc120.frequency.setValueAtTime(120, this.ctx.currentTime);

    // 240Hz 4th Harmonic
    const osc240 = this.ctx.createOscillator();
    osc240.type = "triangle";
    osc240.frequency.setValueAtTime(240, this.ctx.currentTime);

    const osc60Gain = this.ctx.createGain();
    osc60Gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    const osc120Gain = this.ctx.createGain();
    osc120Gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    const osc240Gain = this.ctx.createGain();
    osc240Gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.hydroHumGain = this.ctx.createGain();
    this.hydroHumGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    osc60.connect(osc60Gain);
    osc120.connect(osc120Gain);
    osc240.connect(osc240Gain);

    osc60Gain.connect(this.hydroHumGain);
    osc120Gain.connect(this.hydroHumGain);
    osc240Gain.connect(this.hydroHumGain);

    this.hydroHumGain.connect(this.masterGain);

    osc60.start();
    osc120.start();
    osc240.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Storm Rain & Gusts Layer
  // ───────────────────────────────────────────────────────────────────────────
  private setupStormSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.stormGain = this.ctx.createGain();
    this.stormGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    rainSource.connect(highpass);
    highpass.connect(this.stormGain);
    this.stormGain.connect(this.masterGain);
    rainSource.start();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Sierra Madre Dynamic Wildlife Scheduler
  // ───────────────────────────────────────────────────────────────────────────
  private startWildlifeScheduler() {
    if (typeof window === "undefined") return;

    const triggerWildlifeSound = () => {
      if (this.isMuted || !this.ctx || this.ctx.state === "suspended") {
        this.wildlifeInterval = window.setTimeout(triggerWildlifeSound, 3000);
        return;
      }

      if (this.isStorm) {
        this.wildlifeInterval = window.setTimeout(triggerWildlifeSound, 5000);
        return;
      }

      switch (this.currentTimeMode) {
        case "MORNING":
          this.playMorningBirdChirp();
          break;
        case "AFTERNOON":
          if (Math.random() > 0.65) {
            this.playEagleScreech();
          } else {
            this.playCicadaChirp();
          }
          break;
        case "SUNSET":
          this.playEveningFrogChirp();
          break;
        case "NIGHT":
        default:
          this.playNightCricketChirp();
          break;
      }

      // Next call randomized between 2.5s and 6.5s
      const nextDelay = 2500 + Math.random() * 4000;
      this.wildlifeInterval = window.setTimeout(triggerWildlifeSound, nextDelay);
    };

    this.wildlifeInterval = window.setTimeout(triggerWildlifeSound, 2000);
  }

  // ─── 🌄 Morning: Philippine Mountain Birds & Coucal ───────────────────────
  private playMorningBirdChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";

    // Fast melodious chirps (2.2 kHz -> 3.6 kHz -> 2.8 kHz)
    const baseFreq = 2400 + Math.random() * 800;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + 0.16);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ─── ☀️ Afternoon: Mountain Cicada Resonance ──────────────────────────────
  private playCicadaChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";

    osc.frequency.setValueAtTime(4200 + Math.random() * 400, now);
    // Tremolo modulation for cicada buzz
    const tremolo = this.ctx.createOscillator();
    tremolo.frequency.setValueAtTime(24, now);
    const tremoloGain = this.ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.06, now);
    tremolo.connect(tremoloGain);
    tremoloGain.connect(gain.gain);
    tremolo.start(now);
    tremolo.stop(now + 1.2);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  // ─── 🦅 Afternoon: Philippine Eagle High-Altitude Screech ─────────────────
  private playEagleScreech() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";

    // High piercing cry with downward frequency bend (3.4 kHz -> 1.8 kHz)
    osc.frequency.setValueAtTime(3400, now);
    osc.frequency.exponentialRampToValueAtTime(2100, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  // ─── 🌇 Sunset: Mountain Riverbank Tree Frogs ─────────────────────────────
  private playEveningFrogChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";

    // Low resonant frog croak (280 Hz -> 360 Hz)
    osc.frequency.setValueAtTime(280 + Math.random() * 60, now);
    osc.frequency.linearRampToValueAtTime(380, now + 0.08);
    osc.frequency.linearRampToValueAtTime(240, now + 0.18);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // ─── 🌙 Night: Riparian Crickets ──────────────────────────────────────────
  private playNightCricketChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";

    osc.frequency.setValueAtTime(4600 + Math.random() * 300, now);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public destroy() {
    if (this.wildlifeInterval) {
      clearTimeout(this.wildlifeInterval);
      this.wildlifeInterval = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

export const sierraMadreSoundEngine = new SierraMadreSoundEngineImpl();
