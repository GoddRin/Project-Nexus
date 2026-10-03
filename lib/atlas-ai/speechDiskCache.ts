import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  ATLAS_VOICES,
  DEFAULT_ATLAS_VOICE,
  cleanTextForSpeech,
  synthesizeAtlasSpeech,
  type SynthesizeSpeechOptions,
} from "./speechService";

/**
 * Disk cache in front of the speech model (server only: speechService.ts is also imported by
 * client code for its voice list, so nothing there may touch the filesystem).
 *
 * A line is synthesized once and then served instantly, across restarts too. Tour narrations and
 * navigator lines are fixed text, so after their first play they never wait on (or spend quota of)
 * the speech model again. Best effort: on a read-only host the cache is simply skipped.
 */
const DISK_CACHE_DIR = path.join(process.cwd(), ".cache", "atlas-tts");

function resolveVoice(requested?: string): string {
  const wanted = (requested || "").trim().toLowerCase();
  const key = Object.keys(ATLAS_VOICES).find((k) => k.toLowerCase() === wanted);
  return key ? ATLAS_VOICES[key].id : DEFAULT_ATLAS_VOICE;
}

/** True when this exact line has already been generated for this voice (so it will be served instantly). */
export function isSpeechCached(text: string, requestedVoice?: string): boolean {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return false;
  const voice = resolveVoice(requestedVoice);
  try {
    return fs.existsSync(
      path.join(DISK_CACHE_DIR, `${crypto.createHash("sha256").update(`${voice}:::${cleaned}`).digest("hex")}.wav`)
    );
  } catch {
    return false;
  }
}

export async function synthesizeAtlasSpeechCached(
  options: SynthesizeSpeechOptions
): Promise<{ buffer: Buffer; mimeType: string; cached: boolean; voice: string }> {
  const voice = resolveVoice(options.voice);
  const cleaned = cleanTextForSpeech(options.text);
  const file = cleaned
    ? path.join(DISK_CACHE_DIR, `${crypto.createHash("sha256").update(`${voice}:::${cleaned}`).digest("hex")}.wav`)
    : null;

  if (file) {
    try {
      if (fs.existsSync(file)) {
        return { buffer: fs.readFileSync(file), mimeType: "audio/wav", cached: true, voice };
      }
    } catch {
      // unreadable cache entry: fall through and synthesize
    }
  }

  const result = await synthesizeAtlasSpeech(options);

  if (file && result.mimeType === "audio/wav") {
    try {
      fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, result.buffer);
    } catch {
      // read-only filesystem (serverless): the in-memory cache still applies
    }
  }
  return result;
}
