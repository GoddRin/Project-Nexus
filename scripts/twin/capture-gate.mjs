/**
 * Review captures of a place in Twin v2 at chosen times of day and weather, in a visible Chrome
 * window (a hidden or headless one throttles or software-renders, and is no evidence of the look).
 *
 *   node scripts/twin/capture-gate.mjs [--base=http://localhost:3000] [--out=docs/twin-v2/review/P02a]
 *        [--place=gate-approach] [--tier=medium] [--shots=noon,night] [--label=] [--force-webgl] [--settle=3500]
 *        [--uncapped] [--query=shadows=0] [--gate=9,16,24] [--pose=x,y,z,tx,ty,tz --name=guard-close]
 *
 * Shots are named moments (docs/twin-v2/QUALITY-BAR.md section 7): dawn, morning, noon, golden, dusk,
 * night, rain; or `name:HHMM:weather` for any other. Each is written as <place>-<name><label>.jpg with
 * the frame's numbers (draw calls, triangles, frame rate) in captures<label>.json, and any console
 * error is printed. `--uncapped` takes the display's frame cap off, so the frame rate printed is what
 * the card can do rather than the screen's 60 (use it against the production build, with a longer
 * --settle); `--query` adds test switches to the address. `--gate` holds the gate's staged loop
 * (sim/gate-scene.ts) at each of the given seconds and takes a picture there, named ...-g<seconds>.jpg.
 * `--pose` looks from a point at a point instead of from the place's own camera (files are named by `--name`).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const BASE = arg("base", "http://localhost:3000");
const OUT = arg("out", path.join("docs", "twin-v2", "review", "P02a"));
const PLACES = arg("place", "gate-approach").split(",");
const TIER = arg("tier", "medium");
const LABEL = arg("label", "");
const SETTLE = Number(arg("settle", "3500"));
const FORCE = process.argv.includes("--force-webgl");
const UNCAPPED = process.argv.includes("--uncapped");
const QUERY = arg("query", "");
const GATE = arg("gate", "").split(",").filter(Boolean).map(Number);
const POSE = arg("pose", "").split(",").filter(Boolean).map(Number);
const NAME = arg("name", "");
const MOMENTS = {
  dawn: ["0548", "clear"],
  morning: ["0810", "clear"],
  noon: ["1215", "clear"],
  golden: ["1705", "clear"],
  dusk: ["1758", "clear"],
  night: ["2100", "clear"],
  rain: ["1400", "rain"],
};
const SHOTS = arg("shots", Object.keys(MOMENTS).join(",")).split(",").map((s) => {
  const [name, time, weather] = s.split(":");
  return time ? { name, time, weather: weather ?? "clear" } : { name, time: MOMENTS[name][0], weather: MOMENTS[name][1] };
});
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", ...(UNCAPPED ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"] : [])],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let failed = false;

for (const place of PLACES) {
  for (const shot of SHOTS) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text().slice(0, 400)));
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));
    const query = `v=2&debug=1&dynres=0&q=${TIER}&place=${place}&t=${shot.time}${shot.weather !== "clear" ? `&wx=${shot.weather}` : ""}${FORCE ? "&force=webgl" : ""}${QUERY ? `&${QUERY}` : ""}`;
    await page.goto(`${BASE}/digital-twin?${query}`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.loop.frames() > 10, null, { timeout: 120000 });
      await page.waitForFunction(
        () => {
          const s = window.__TWIN__.streaming;
          return s.zones().every((z) => z.state !== "loading") && s.zones().some((z) => z.state === "in") && s.stats().tasksQueued === 0 && !window.__TWIN__.rig.isFlying();
        },
        null,
        { timeout: 180000 },
      );
    } catch (e) {
      errors.push(`did not settle: ${String(e).slice(0, 200)}`);
    }
    if (POSE.length === 6) {
      await page.evaluate((p) => window.__TWIN__.rig.flyToPose([p[0], p[1], p[2]], [p[3], p[4], p[5]], 0), POSE);
      await page.waitForFunction(() => !window.__TWIN__.rig.isFlying(), null, { timeout: 15000 }).catch(() => {});
    }
    await sleep(SETTLE);
    const stats = await page.evaluate(() => {
      const t = window.__TWIN__;
      const s = t.stats();
      return { backend: t.backend, fps: +s.fps.toFixed(1), p95: +s.p95.toFixed(1), calls: s.calls, tris: s.tris, programs: s.programs, lights: s.lights, gpuMB: +s.gpuMB.toFixed(1), heapMB: +s.heapMB.toFixed(0), lod: s.streaming.lod, zones: t.streaming.zones() };
    });
    const clip = await page.locator("canvas").first().boundingBox();
    const view = POSE.length === 6 && NAME ? NAME : place;
    let file = `${view}-${shot.name}${LABEL}.jpg`;
    if (GATE.length === 0) await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 90, ...(clip ? { clip } : {}) });
    // (since P02e the gate's actors load after its zone: wait for them, and for the lamps' warm-up)
    if (GATE.length) await page.waitForFunction(() => window.__TWIN__.gate.status().actors >= 5 && (!window.__TWIN__.lamps || window.__TWIN__.lamps.isReady()), null, { timeout: 300_000 }).catch(() => console.log("   (actors not all in)"));
    for (const seconds of GATE) {
      // the staged loop held at a moment: seek a little before it and let it run in, so clips have blended
      await page.evaluate((s) => {
        window.__TWIN__.gate.hold(false);
        window.__TWIN__.gate.seek(Math.max(0, s - 1.5));
      }, seconds);
      await sleep(1500);
      // (the window is on the owner's screen: a stray drag or scroll moves the view, so it is put back)
      await page.evaluate(
        ([id, p]) => {
          window.__TWIN__.gate.hold(true);
          if (p.length === 6) window.__TWIN__.rig.flyToPose([p[0], p[1], p[2]], [p[3], p[4], p[5]], 0);
          else if (window.__TWIN__.store.getState().camera.place !== id) window.__TWIN__.rig.flyTo(id);
        },
        [place, POSE],
      );
      await page.waitForFunction(() => !window.__TWIN__.rig.isFlying(), null, { timeout: 15000 }).catch(() => {});
      await sleep(400);
      file = `${view}-${shot.name}${LABEL}-g${String(seconds).padStart(2, "0")}.jpg`;
      await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 90, ...(clip ? { clip } : {}) });
      console.log(`   ${file}  ${JSON.stringify(await page.evaluate(() => window.__TWIN__.gate.status()))}`);
    }
    results.push({ place, ...shot, file, ...stats, errors });
    console.log(`${file.padEnd(34)} ${stats.backend}  ${String(stats.fps).padStart(5)} fps  p95 ${stats.p95} ms  ${stats.calls} calls  ${stats.tris} tris  ${stats.programs} pipelines  ${stats.lights} lights  gpu ${stats.gpuMB} MB`);
    for (const e of errors) {
      failed = true;
      console.log(`   ERROR ${e}`);
    }
    await page.close();
  }
}
fs.writeFileSync(path.join(OUT, `captures${LABEL}.json`), JSON.stringify(results, null, 1) + "\n");
await browser.close();
process.exit(failed ? 1 : 0);
