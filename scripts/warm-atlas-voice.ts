/**
 * Generates the neural (Gemini) voice for every fixed line the Atlas Navigator can say, so each
 * one is served instantly from .cache/atlas-tts and never falls back to another voice.
 *
 *   npx tsx scripts/warm-atlas-voice.ts            fixed lines only
 *   npx tsx scripts/warm-atlas-voice.ts --projects also the lines built around each project name
 *   npx tsx scripts/warm-atlas-voice.ts --list     print the lines and whether each is ready
 *
 * Needs the dev server running (it calls /api/atlas-ai/tts, which writes the cache). The speech
 * model has a small daily quota: the script stops at the first refusal and can simply be run
 * again later; lines already generated are skipped.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import projects from "../lib/data/scicAtlasInitialProjects.json";
import { allStockLines, projectStockLines } from "../components/atlas/ai/navigatorLines";
import { buildSpokenAlignment, limitSpokenText, MAX_SPOKEN_CHARS } from "../lib/atlas-ai/spokenText";

const BASE = process.env.ATLAS_URL || "http://localhost:3000";
const VOICE = process.env.ATLAS_VOICE || "Charon";
const GAP_MS = Number(process.env.ATLAS_GAP_MS || 7000);
const args = new Set(process.argv.slice(2));

const spoken = (raw: string) => limitSpokenText(buildSpokenAlignment(raw).spokenText, MAX_SPOKEN_CHARS);

async function cachedFlags(texts: string[]): Promise<boolean[]> {
  const out: boolean[] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await fetch(`${BASE}/api/atlas-ai/tts/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: texts.slice(i, i + 50), voice: VOICE }),
    });
    if (!res.ok) throw new Error(`status check failed: HTTP ${res.status}`);
    out.push(...((await res.json()) as { cached: boolean[] }).cached);
  }
  return out;
}

async function main() {
  const groups: Array<{ name: string; lines: string[] }> = [{ name: "fixed lines", lines: allStockLines() }];
  if (args.has("--projects")) {
    const lines: string[] = [];
    for (const p of projects as Array<{ name: string; category?: string | null }>) lines.push(...projectStockLines(p.name, p.category));
    groups.push({ name: "project lines", lines: [...new Set(lines)] });
  }

  for (const group of groups) {
    const texts = group.lines.map(spoken);
    const flags = await cachedFlags(texts);
    const missing = texts.filter((_, i) => !flags[i]);
    console.log(`\n${group.name}: ${texts.length} total, ${texts.length - missing.length} ready, ${missing.length} to generate`);
    if (args.has("--list")) {
      texts.forEach((t, i) => console.log(`${flags[i] ? "ready  " : "MISSING"}  ${t}`));
      continue;
    }
    let done = 0;
    for (const text of missing) {
      const res = await fetch(`${BASE}/api/atlas-ai/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: VOICE }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.log(`stopped: HTTP ${res.status} ${detail.slice(0, 200)}`);
        console.log(`generated ${done} of ${missing.length}; ${missing.length - done} still to do (run again later)`);
        return;
      }
      await res.arrayBuffer();
      done += 1;
      console.log(`  [${done}/${missing.length}] ${text.slice(0, 70)}`);
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    console.log(`${group.name}: all ready`);
  }
}

/** Copy every generated line into voice-bank/ (committed), so the deployed site has the same voice */
function syncVoiceBank() {
  const from = path.join(process.cwd(), ".cache", "atlas-tts");
  const to = path.join(process.cwd(), "voice-bank", "atlas-tts");
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  let added = 0;
  for (const name of fs.readdirSync(from)) {
    if (name.endsWith(".wav") && !fs.existsSync(path.join(to, name))) {
      fs.copyFileSync(path.join(from, name), path.join(to, name));
      added += 1;
    }
  }
  console.log(`
voice-bank: ${added} new line(s) copied`);
  // and as small MP3s on the CDN (public/voice) for the deployed site
  execFileSync("node", ["scripts/build-voice-static.mjs"], { stdio: "inherit" });
  console.log("commit voice-bank/ and public/voice/ so the deployed site has them");
}

main().then(syncVoiceBank).catch((err) => {
  console.error(err);
  process.exit(1);
});
