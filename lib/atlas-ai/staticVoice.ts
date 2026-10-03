"use client";

import { ATLAS_VOICES, DEFAULT_ATLAS_VOICE, cleanTextForSpeech } from "./speechService";

/**
 * Pre-generated Gemini voice lines served as static MP3s from the CDN (public/voice, built by
 * scripts/build-voice-static.mjs from voice-bank/). No server function runs, so there is no cold
 * start: on a deployed site a tap plays as fast as it does locally. Clips are named by the same
 * hash the server cache uses, so the browser can work out a line's file by itself.
 */
const BASE = "/voice";

let manifestPromise: Promise<Set<string>> | null = null;
const clipCache = new Map<string, Promise<Blob | null>>();

function loadManifest(): Promise<Set<string>> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: string[]) => new Set(Array.isArray(list) ? list : []))
      .catch(() => {
        manifestPromise = null; // offline: try again next time
        return new Set<string>();
      });
  }
  return manifestPromise;
}

function resolveVoice(requested?: string): string {
  const wanted = (requested || "").trim().toLowerCase();
  const key = Object.keys(ATLAS_VOICES).find((k) => k.toLowerCase() === wanted);
  return key ? ATLAS_VOICES[key].id : DEFAULT_ATLAS_VOICE;
}

const hashCache = new Map<string, Promise<string | null>>();
function clipHash(voice: string, text: string): Promise<string | null> {
  const id = `${resolveVoice(voice)}:::${cleanTextForSpeech(text)}`;
  let hit = hashCache.get(id);
  if (!hit) {
    hit = (async () => {
      try {
        if (!globalThis.crypto?.subtle) return null; // not a secure context
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      } catch {
        return null;
      }
    })();
    hashCache.set(id, hit);
  }
  return hit;
}

/** True when this line has a static clip on the CDN */
export async function hasStaticClip(voice: string, text: string): Promise<boolean> {
  const [manifest, hash] = await Promise.all([loadManifest(), clipHash(voice, text)]);
  return !!hash && manifest.has(hash);
}

function fetchClip(hash: string): Promise<Blob | null> {
  let hit = clipCache.get(hash);
  if (!hit) {
    hit = fetch(`${BASE}/${hash}.mp3`)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    clipCache.set(hash, hit);
    hit.then((b) => {
      if (!b) clipCache.delete(hash);
    });
  }
  return hit;
}

/** The static clip for a line, or null when there is none (the caller then asks the server) */
export async function getStaticClip(voice: string, text: string): Promise<Blob | null> {
  const [manifest, hash] = await Promise.all([loadManifest(), clipHash(voice, text)]);
  if (!hash || !manifest.has(hash)) return null;
  return fetchClip(hash);
}

/** Pull clips into memory ahead of time (a few at a time), so the first tap needs no network */
export async function preloadStaticClips(voice: string, texts: string[]): Promise<void> {
  const manifest = await loadManifest();
  const hashes: string[] = [];
  for (const t of texts) {
    const h = await clipHash(voice, t);
    if (h && manifest.has(h) && !clipCache.has(h)) hashes.push(h);
  }
  const workers = Array.from({ length: 4 }, async () => {
    while (hashes.length) await fetchClip(hashes.shift() as string);
  });
  await Promise.all(workers);
}
