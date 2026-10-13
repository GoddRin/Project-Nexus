/**
 * Records the gate's staged loop (sim/gate-scene.ts) as a video, in a visible Chrome window.
 *
 *   node scripts/twin/record-gate.mjs [--base=http://localhost:3000] [--out=docs/twin-v2/review/P02b]
 *        [--place=gate-approach] [--tier=medium] [--shots=noon,night] [--seconds=30] [--from=6]
 *
 * One file per shot, <place>-<shot>.webm, starting `--from` seconds into the loop. The frame rate of
 * the recording is the page's own at the time: it is evidence of the motion, not of performance.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const BASE = arg("base", "http://localhost:3000");
const OUT = arg("out", path.join("docs", "twin-v2", "review", "P02b"));
const PLACE = arg("place", "gate-approach");
const TIER = arg("tier", "medium");
const SECONDS = Number(arg("seconds", "30"));
const FROM = Number(arg("from", "6"));
const MOMENTS = { noon: "1215", golden: "1705", night: "2100" };
const SHOTS = arg("shots", "noon,night").split(",");
const SIZE = { width: 1280, height: 720 };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const shot of SHOTS) {
  // the scene is loaded and settled in one page first, so the recording does not start on a loading screen
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
  const page = await context.newPage();
  await page.goto(`${BASE}/digital-twin?v=2&debug=1&dynres=0&q=${TIER}&place=${PLACE}&t=${MOMENTS[shot] ?? shot}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.loop.frames() > 10, null, { timeout: 120000 });
  await page.waitForFunction(
    () => {
      const s = window.__TWIN__.streaming;
      return s.zones().some((z) => z.state === "in") && s.stats().tasksQueued === 0 && !window.__TWIN__.rig.isFlying() && window.__TWIN__.gate.status().actors > 0;
    },
    null,
    { timeout: 180000 },
  );
  await page.evaluate((s) => window.__TWIN__.gate.seek(s), FROM);
  const started = Date.now();
  await sleep(SECONDS * 1000);
  const stats = await page.evaluate(() => ({ fps: +window.__TWIN__.stats().fps.toFixed(1), gate: window.__TWIN__.gate.status() }));
  const video = page.video();
  await context.close();
  const file = path.join(OUT, `${PLACE}-${shot}.webm`);
  fs.rmSync(file, { force: true });
  fs.renameSync(await video.path(), file);
  // (the file also holds the loading before the loop was sought: say where the loop starts in it)
  console.log(`${file}  ${SECONDS} s of the loop from ${FROM} s, at the end of the file; ${stats.fps} fps while recording; ${JSON.stringify(stats.gate)}; ${((Date.now() - started) / 1000).toFixed(0)} s`);
}
await browser.close();
