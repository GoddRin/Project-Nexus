/**
 * The lamps at dusk (P02e): plays the gate from 17:30 to 18:30 at speed and records every frame,
 * to show that the lamps joining the scene does not stall it (no frame over 50 ms) and that they
 * still come on one after another. Run against the production build on port 3100.
 *
 *   node scripts/twin/check-dusk.mjs [label] [--size=1920x1080] [--from=1720] [--to=1840] [--speed=60]
 *       [--q=medium] [--dawn] [--headed] [--force-webgl] [--vsync] [--extra=&key=value] [--override={json}]
 *
 * `--dawn` plays 06:00 to 06:30 instead, when the lamps leave the scene.
 * Writes .cache/bench/twin2-dusk-<label>.json.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const flag = (k) => process.argv.includes(`--${k}`);
const LABEL = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "run";
const BASE = arg("base", "http://localhost:3100");
const [VW, VH] = arg("size", "1920x1080").split("x").map(Number);
const DAWN = flag("dawn");
const FROM = Number(arg("from", DAWN ? "355" : "1035")); // minutes: 17:15 (lamps from 17:30 on the gate)
const TO = Number(arg("to", DAWN ? "395" : "1110"));
const SPEED = Number(arg("speed", "60"));
const TIER = arg("q", "medium");
/** Extra address parameters (for example `&shadows=0`) and tier settings to override (JSON), for finding a cost. */
const EXTRA = arg("extra", "");
const OVERRIDE = arg("override", "");
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(Math.round(m % 60)).padStart(2, "0")}`;

const browser = await chromium.launch({
  headless: !flag("headed"),
  channel: arg("browser", "chrome"),
  // (`--vsync`: frames paced by the display, as a viewer sees them; without it the frame cap is off and a
  // GPU-bound page queues work seconds ahead, so a stall shows up wherever the queue happens to fill)
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...(flag("vsync") ? [] : ["--disable-gpu-vsync", "--disable-frame-rate-limit"])],
});
const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text().slice(0, 300)));
await page.goto(`${BASE}/digital-twin?v=2&debug=1&t=${hhmm(FROM)}&dynres=0&q=${TIER}&place=gate-approach${flag("force-webgl") ? "&force=webgl" : ""}${EXTRA}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForFunction(() => window.__TWIN__?.lamps && (window.__TWIN__.terrain || window.__TWIN__.scene.getObjectByName("ground")), null, { timeout: 180_000 });
// (before the zone streams in, so its lamps are made under the override)
if (OVERRIDE) await page.evaluate((o) => window.__TWIN__.cost.override(JSON.parse(o)), OVERRIDE);
await page.waitForFunction(() => { const s = window.__TWIN__.streaming.stats(); return s.zonesLoaded > 0 && s.zonesLoading === 0 && s.tasksQueued === 0; }, null, { timeout: 300_000 });
await page.waitForFunction(() => window.__TWIN__.gate.status().actors >= 5, null, { timeout: 300_000 });
const readyAt = Date.now();
await page.waitForFunction(() => window.__TWIN__.lamps.isReady() && window.__TWIN__.streaming.stats().tasksQueued === 0, null, { timeout: 300_000 });
const readyWaitMs = Date.now() - readyAt;
await page.waitForTimeout(3000);
if (flag("prewarm")) {
  // (experiment: draw with the lamps in for a few seconds first, then go back before dusk)
  const t0 = Date.now();
  await page.evaluate(() => window.__TWIN__.sim.clock.setManual(1080, 0));
  await page.waitForTimeout(5000);
  await page.evaluate((m) => window.__TWIN__.sim.clock.setManual(m, 0), FROM);
  await page.waitForTimeout(5000);
  console.log(`prewarm took ${Date.now() - t0} ms`);
}

const result = await page.evaluate(
  ({ from, to, speed }) =>
    new Promise((resolve) => {
      const T = window.__TWIN__;
      T.sim.clock.setManual(from, speed);
      const frames = [];
      const events = [];
      const seen = new Map();
      let last = performance.now();
      let wasLive = T.lamps.live();
      const lightsAt = () => { const s = T.stats(); return { lights: s.lights, programs: s.programs }; };
      const tick = (now) => {
        const minutes = T.sim.clock.minutes();
        const ms = now - last;
        last = now;
        const r = T.renderer;
        frames.push([Math.round(minutes * 100) / 100, Math.round(ms * 10) / 10, r._nodes.nodeBuilderCache.size, r._pipelines.caches.size, r.info.memory.textures, T.lamps.levels().map((l) => l.level).join('/')]);
        const live = T.lamps.live();
        if (live !== wasLive) {
          events.push({ minutes, what: live ? "lamps in" : "lamps out", frameMs: ms, ...lightsAt() });
          wasLive = live;
        }
        for (const l of T.lamps.levels()) {
          if (l.level > 0.5 && !seen.has(l.name)) {
            seen.set(l.name, minutes);
            events.push({ minutes, what: `${l.name} lit`, frameMs: ms });
          }
        }
        if (minutes < to && minutes >= from - 1) requestAnimationFrame(tick);
        else {
          T.sim.clock.setSpeed(0);
          resolve({ frames, events, end: lightsAt() });
        }
      };
      requestAnimationFrame((now) => { last = now; requestAnimationFrame(tick); });
    }),
  { from: FROM, to: TO, speed: SPEED },
);

const times = result.frames.slice(5).map((f) => f[1]);
const sorted = times.slice().sort((a, b) => a - b);
const worst = result.frames.slice(5).reduce((a, f) => (f[1] > a[1] ? f : a), [0, 0]);
const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
const over50 = result.frames.slice(5).filter((f) => f[1] > 50);
const envTimes = await page.evaluate(() => (window.__twinEnvTimes ?? []).slice());
const summary = {
  label: LABEL, size: [VW, VH], tier: TIER, from: FROM, to: TO, speed: SPEED, frames: times.length,
  readyWaitMs,
  medianMs: p(0.5), p95Ms: p(0.95), p99Ms: p(0.99), longestMs: worst[1], longestAtMinutes: worst[0],
  over50: over50.length, over50At: over50.slice(0, 20),
  events: result.events, end: result.end, errors: errors.slice(0, 10),
  envRefreshes: envTimes.length, envRefreshMs: envTimes.length ? { cpuMedian: envTimes.map((e) => e.cpuMs).sort((a, b) => a - b)[Math.floor(envTimes.length / 2)], gpuMedian: envTimes.map((e) => e.gpuMs).sort((a, b) => a - b)[Math.floor(envTimes.length / 2)] } : null,
};
console.log(JSON.stringify({ ...summary, events: undefined, over50At: undefined }, null, 1));
for (const e of result.events) console.log(`  ${Math.floor(e.minutes / 60)}:${String(Math.floor(e.minutes % 60)).padStart(2, "0")}  ${e.what}  (frame ${e.frameMs.toFixed(1)} ms${e.lights !== undefined ? `, lights ${e.lights}, pipelines ${e.programs}` : ""})`);
if (over50.length) console.log("frames over 50 ms (minutes, ms, builds, pipelines, textures, lamp levels):", over50.filter((f) => f[1] > 100).slice(0, 20).map((f) => f.join(":")).join("  "));
fs.mkdirSync(path.join(".cache", "bench"), { recursive: true });
const file = path.join(".cache", "bench", `twin2-dusk-${LABEL}.json`);
fs.writeFileSync(file, JSON.stringify({ ...summary, frames: result.frames }, null, 1));
console.log(`wrote ${file}`);
await browser.close();
process.exit(worst[1] > 50 ? 1 : 0);
