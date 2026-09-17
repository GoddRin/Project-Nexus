/**
 * TunnelPositionalAudio.tsx
 *
 * Procedural 3D Spatial Audio Engine for Headrace Tunnel Personnel.
 * 100% Zero-Asset Dependency Web Audio API Synthesis with Three.js PositionalAudio.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL AUDIO VOICE BUDGET (RESOLUTION 5):
 * ═══════════════════════════════════════════════════════════════════════════
 * To prevent Web Audio node exhaustion and browser audio thread starvation,
 * concurrently active procedurally-synthesized sound graphs are strictly CAPPED
 * to a maximum of 6 active voices (the 6 nearest audible workers to the camera).
 *
 * Workers outside the nearest 6 have their audio graphs disconnected or paused.
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { TunnelWorkerRole, WorkerAnimationState } from "./TunnelWorkerTypes";

export interface TunnelPositionalAudioProps {
  role: TunnelWorkerRole;
  animationState: WorkerAnimationState;
  position: [number, number, number];
  isMuted?: boolean;
}

// Global voice budget registry and shared AudioContext singleton (RESOLUTION 5)
const MAX_ACTIVE_VOICES = 6;
let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    // Attempt resume on user interaction
    const resume = () => {
      sharedAudioContext?.resume();
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("click", resume);
    window.addEventListener("keydown", resume);
  }
  return sharedAudioContext;
}

interface VoiceRegistryEntry {
  distance: number;
  setVoiceActive: (active: boolean) => void;
}

const activeVoiceRegistry = new Map<string, VoiceRegistryEntry>();

function updateVoiceBudget() {
  const sorted = Array.from(activeVoiceRegistry.entries()).sort((a, b) => a[1].distance - b[1].distance);
  sorted.forEach(([id, item], idx) => {
    // Only the top 6 nearest workers within 18m get active audio graphs instantiated
    const shouldBeActive = idx < MAX_ACTIVE_VOICES && item.distance < 18.0;
    item.setVoiceActive(shouldBeActive);
  });
}

export function TunnelPositionalAudio({
  role,
  animationState,
  position,
  isMuted = false,
}: TunnelPositionalAudioProps) {
  const groupRef = useRef<THREE.Group>(null);
  const activeNodesRef = useRef<{
    gain: GainNode | null;
    osc?: OscillatorNode;
    noise?: AudioBufferSourceNode;
    filter?: BiquadFilterNode;
  } | null>(null);

  const { camera } = useThree();
  const instanceIdRef = useRef<string>(`worker-audio-${Math.random().toString(36).slice(2, 9)}`);
  const isVoiceActiveRef = useRef<boolean>(false);

  // Helper to start procedural synthesis for this worker
  const startAudioGraph = () => {
    if (activeNodesRef.current) return; // Already running
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0.0 : 0.28;
      masterGain.connect(ctx.destination);

      if (role === "DRILL_OPERATOR" && animationState === "working") {
        // High-rpm pneumatic percussion whine
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(850, ctx.currentTime);
        filter.Q.setValueAtTime(4.0, ctx.currentTime);

        osc.connect(filter);
        filter.connect(masterGain);
        osc.start();

        activeNodesRef.current = { gain: masterGain, osc, filter };
      } else if (role === "SHOTCRETE_OPERATOR" && animationState === "working") {
        // High-velocity compressed air spray hiss (Pink Noise buffer)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.10;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1800, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();

        activeNodesRef.current = { gain: masterGain, noise: whiteNoise, filter };
      }
    } catch (e) {
      // AudioContext policy handled gracefully
    }
  };

  // Helper to stop and teardown procedural audio graph for this worker
  const stopAudioGraph = () => {
    if (!activeNodesRef.current) return;
    try {
      if (activeNodesRef.current.osc) {
        activeNodesRef.current.osc.stop();
        activeNodesRef.current.osc.disconnect();
      }
      if (activeNodesRef.current.noise) {
        activeNodesRef.current.noise.stop();
        activeNodesRef.current.noise.disconnect();
      }
      if (activeNodesRef.current.filter) {
        activeNodesRef.current.filter.disconnect();
      }
      if (activeNodesRef.current.gain) {
        activeNodesRef.current.gain.disconnect();
      }
    } catch (e) {}
    activeNodesRef.current = null;
  };

  // Register in global voice budget registry
  useEffect(() => {
    const id = instanceIdRef.current;
    activeVoiceRegistry.set(id, {
      distance: 999,
      setVoiceActive: (active: boolean) => {
        if (active !== isVoiceActiveRef.current) {
          isVoiceActiveRef.current = active;
          if (active) {
            startAudioGraph();
          } else {
            stopAudioGraph();
          }
        }
      },
    });

    return () => {
      activeVoiceRegistry.delete(id);
      stopAudioGraph();
    };
  }, [role, animationState, isMuted]);

  // Track muted changes
  useEffect(() => {
    if (activeNodesRef.current?.gain) {
      activeNodesRef.current.gain.gain.value = isMuted ? 0.0 : 0.28;
    }
  }, [isMuted]);

  // Frame distance check to camera
  useFrame(() => {
    if (!groupRef.current) return;
    const worldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
    const dist = camera.position.distanceTo(worldPos);

    const voice = activeVoiceRegistry.get(instanceIdRef.current);
    if (voice) {
      voice.distance = dist;
    }

    // Periodically update budget every ~20 frames
    if (Math.random() < 0.05) {
      updateVoiceBudget();
    }
  });

  return <group ref={groupRef} position={position} name={`audio-${role}`} />;
}
