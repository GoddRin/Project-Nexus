/**
 * Encodes the pre-generated voice lines (voice-bank/atlas-tts/*.wav) as small MP3s in public/voice,
 * plus a manifest of what exists. The deployed site plays these straight from the CDN
 * (lib/atlas-ai/staticVoice.ts) instead of calling a server function on every tap.
 *
 *   node scripts/build-voice-static.mjs
 *
 * Needs ffmpeg on PATH (run locally, then commit public/voice). Already-encoded clips are skipped.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "voice-bank", "atlas-tts");
const OUT = path.join(process.cwd(), "public", "voice");

fs.mkdirSync(OUT, { recursive: true });
const wavs = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((n) => n.endsWith(".wav")) : [];
let encoded = 0;
for (const name of wavs) {
  const mp3 = path.join(OUT, name.replace(/\.wav$/, ".mp3"));
  if (fs.existsSync(mp3)) continue;
  // mono 48 kbps: about an eighth of the WAV, still clear speech
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", path.join(SRC, name), "-ac", "1", "-b:a", "48k", mp3]);
  encoded += 1;
}
const hashes = fs.readdirSync(OUT).filter((n) => n.endsWith(".mp3")).map((n) => n.replace(/\.mp3$/, "")).sort();
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(hashes));
console.log(`public/voice: ${encoded} clip(s) encoded, ${hashes.length} in the manifest`);
