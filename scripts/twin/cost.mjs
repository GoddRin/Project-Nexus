/**
 * Marginal cost of each kind of content on this machine (P02c). Opens the gate slice on the
 * production build, holds the camera and the gate's loop still, then adds copies of real assets
 * through `window.__TWIN__.cost` (components/twin/engine/cost-probe.ts) and times the frames.
 * Every step is measured against a baseline taken just before it, so slow drift of the laptop's
 * clocks does not pile up into the result.
 *
 *   npx next build && npx next start -p 3100      # (the "twin-bench" preview)
 *   node scripts/twin/cost.mjs [label] [--only=people,trees,...] [--repeat=3] [--seconds=3]
 *       [--place=gate-approach] [--dsf=1] [--size=1440x900] [--force-webgl] [--browser=chrome]
 *
 * Groups: people, animals, vehicles, trees, plants, lights, shadows, occlusion, tiers.
 * Frame cap off; dynamic resolution off. Writes .cache/bench/twin2-cost-<label>.json and prints a table.
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
const PLACE = arg("place", "gate-approach");
const REPEAT = Number(arg("repeat", "5"));
const SECONDS = Number(arg("seconds", "4"));
const DSF = Number(arg("dsf", "1"));
const [VW, VH] = arg("size", "1440x900").split("x").map(Number);
const FORCE = flag("force-webgl");
const ONLY = arg("only", "people,animals,vehicles,trees,plants,lights,shadows,occlusion,tiers").split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 2) => Number(n.toFixed(d));
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch({
  headless: !flag("headed"),
  channel: arg("browser", "chrome"),
  args: [
    "--use-angle=d3d11",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-webgpu",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

async function open(extra = "") {
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text().slice(0, 200)));
  const url = `${BASE}/digital-twin?v=2&debug=1&t=1200&dynres=0&q=medium&place=${PLACE}${FORCE ? "&force=webgl" : ""}${extra}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => window.__TWIN__?.cost && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 180_000 });
  await page.waitForFunction(() => { const s = window.__TWIN__.streaming.stats(); return s.zonesLoaded > 0 && s.zonesLoading === 0 && s.tasksQueued === 0; }, null, { timeout: 300_000 });
  await page.waitForFunction(() => window.__TWIN__.gate.status().actors >= 5, null, { timeout: 300_000 });
  // the loop held at a quiet moment: everyone in place, the pickup at the barrier
  await page.evaluate(() => { window.__TWIN__.gate.seek(14); window.__TWIN__.gate.hold(true); });
  await sleep(4000);
  return { page, context, errors };
}

/** Mean frame time (ms) and the renderer's counts over `SECONDS`, the median of REPEAT runs. */
async function sample(page) {
  const runs = [];
  for (let i = 0; i < REPEAT; i++) {
    runs.push(
      await page.evaluate(
        (dur) =>
          new Promise((resolve) => {
            let frames = 0;
            const acc = { calls: 0, tris: 0, n: 0 };
            const start = performance.now();
            const tick = (now) => {
              frames++;
              // counts change from frame to frame (far shadow cascades are redrawn every other or third frame):
              // average every frame (sampling every few frames locks onto one phase of that cycle)
              {
                const r = window.__TWIN__.renderer.info.render;
                acc.calls += r.drawCalls;
                acc.tris += r.triangles;
                acc.n++;
              }
              if (now - start < dur) requestAnimationFrame(tick);
              else {
                const s = window.__TWIN__.stats();
                resolve({ ms: (now - start) / frames, cpuMs: s.cpuMs, calls: acc.calls / Math.max(1, acc.n), tris: acc.tris / Math.max(1, acc.n), programs: s.programs, lights: s.lights, gpuMB: s.gpuMB });
              }
            };
            requestAnimationFrame(tick);
          }),
        SECONDS * 1000,
      ),
    );
  }
  const ms = median(runs.map((r) => r.ms));
  const last = runs[runs.length - 1];
  return { ms: round(ms), cpuMs: round(median(runs.map((r) => r.cpuMs))), fps: round(1000 / ms, 1), calls: Math.round(median(runs.map((r) => r.calls))), tris: Math.round(median(runs.map((r) => r.tris))), programs: last.programs, lights: last.lights, gpuMB: round(last.gpuMB, 1) };
}

const results = [];
/** Measure the baseline, run `apply`, wait for it to settle, measure, undo. */
async function step(page, group, name, n, apply, undo = () => page.evaluate(() => window.__TWIN__.cost.clear())) {
  const base = await sample(page);
  await apply();
  await sleep(3500); // (pipelines compile on first draw)
  await sample(page); // (throwaway: late compiles)
  const with_ = await sample(page);
  await undo();
  await sleep(1500);
  const delta = with_.ms - base.ms;
  const row = {
    group,
    name,
    n,
    baseMs: base.ms,
    withMs: with_.ms,
    deltaMs: round(delta),
    perCopyMs: n ? round(delta / n, 3) : null,
    cpuMs: [base.cpuMs, with_.cpuMs],
    perCopyCpuMs: n ? round((with_.cpuMs - base.cpuMs) / n, 3) : null,
    fps: [base.fps, with_.fps],
    calls: [base.calls, with_.calls],
    tris: [base.tris, with_.tris],
    programs: [base.programs, with_.programs],
    gpuMB: [base.gpuMB, with_.gpuMB],
  };
  results.push(row);
  console.log(
    `${group.padEnd(10)} ${name.padEnd(34)} n=${String(n).padStart(3)}  ${base.ms.toFixed(2)} -> ${with_.ms.toFixed(2)} ms  (${delta >= 0 ? "+" : ""}${delta.toFixed(2)}${n ? `, ${(delta / n).toFixed(3)}/copy` : ""})  cpu ${base.cpuMs}->${with_.cpuMs}  calls ${base.calls}->${with_.calls}  tris ${base.tris}->${with_.tris}  pipes ${base.programs}->${with_.programs}`,
  );
  return row;
}

const add = (page, id, n, options) => () => page.evaluate(([i, k, o]) => window.__TWIN__.cost.add(i, k, o), [id, n, options]);

const { page, context, errors } = await open();
const info = await page.evaluate(() => ({ backend: window.__TWIN__.backend, canvas: [window.__TWIN__.renderer.domElement.width, window.__TWIN__.renderer.domElement.height], pixelRatio: window.__TWIN__.renderer.getPixelRatio(), tier: window.__TWIN__.store.getState().quality.tier }));
console.log(`backend ${info.backend}, canvas ${info.canvas.join("x")}, pixel ratio ${info.pixelRatio}, tier ${info.tier}, place ${PLACE}`);
const baseline = await sample(page);
console.log("baseline", baseline);

if (ONLY.includes("people")) {
  for (const [level, distance, counts] of [[0, 8, [5, 10, 20]], [1, 22, [10, 20, 40]], [2, 55, [20, 40, 80]]]) {
    for (const n of counts) await step(page, "people", `char.engineer.a LOD${level} @${distance}m`, n, add(page, "char.engineer.a", n, { level, distance, clip: "idle" }));
  }
  // walking costs the same bones; a mix of the three men shares nothing but the renderer
  await step(page, "people", "three men mixed LOD0 @8m", 15, async () => {
    for (const id of ["char.guard.a", "char.engineer.a", "char.labourer.a"]) await add(page, id, 5, { level: 0, distance: 8, clip: "walk" })();
  });
}
if (ONLY.includes("animals")) {
  for (const n of [5, 10]) await step(page, "animals", "fauna.aspin.a LOD0 @8m", n, add(page, "fauna.aspin.a", n, { level: 0, distance: 8, clip: "idle" }));
}
if (ONLY.includes("vehicles")) {
  for (const n of [3, 6]) await step(page, "vehicles", "veh.pickup.a LOD0 @15m", n, add(page, "veh.pickup.a", n, { level: 0, distance: 15 }));
  for (const n of [6, 12]) await step(page, "vehicles", "veh.pickup.a LOD1 @40m", n, add(page, "veh.pickup.a", n, { level: 1, distance: 40 }));
}
if (ONLY.includes("trees")) {
  for (const n of [5, 10, 20]) await step(page, "trees", "flora.acacia.b LOD0 @25m", n, add(page, "flora.acacia.b", n, { level: 0, distance: 25, spacing: 7 }));
  for (const n of [20, 40]) await step(page, "trees", "flora.acacia.b LOD1 @50m", n, add(page, "flora.acacia.b", n, { level: 1, distance: 50, spacing: 6 }));
  for (const n of [40, 80]) await step(page, "trees", "flora.acacia.b LOD2 @110m", n, add(page, "flora.acacia.b", n, { level: 2, distance: 110, spacing: 6 }));
}
if (ONLY.includes("plants")) {
  for (const n of [50, 100]) await step(page, "plants", "flora.shrub.a LOD0 @12m", n, add(page, "flora.shrub.a", n, { level: 0, distance: 12, spacing: 1.2 }));
  for (const n of [100, 200]) await step(page, "plants", "flora.grass.a LOD0 @10m", n, add(page, "flora.grass.a", n, { level: 0, distance: 10, spacing: 0.7 }));
  for (const n of [50]) await step(page, "plants", "flora.banana.a LOD0 @18m", n, add(page, "flora.banana.a", n, { level: 0, distance: 18, spacing: 2.5 }));
}
if (ONLY.includes("lights")) {
  for (const n of [2, 4, 8]) await step(page, "lights", "point lights, no shadow", n, () => page.evaluate((k) => window.__TWIN__.cost.lights(k, { shadow: false }), n));
  for (const n of [1, 2]) await step(page, "lights", "point lights, 512 px shadow", n, () => page.evaluate((k) => window.__TWIN__.cost.lights(k, { shadow: true }), n));
}
const override = (patch) => () => page.evaluate((p) => window.__TWIN__.cost.override(p), patch);
const reset = override("reset");
if (ONLY.includes("shadows")) {
  for (const cascades of [1, 2]) await step(page, "shadows", `sun cascades 3 -> ${cascades}`, 0, override({ shadowCascades: cascades }), reset);
  await step(page, "shadows", "shadow map 1024 -> 2048", 0, override({ shadowMapSize: 2048 }), reset);
  await step(page, "shadows", "shadow map 1024 -> 512", 0, override({ shadowMapSize: 512 }), reset);
}
if (ONLY.includes("occlusion")) {
  await step(page, "occlusion", "occlusion half -> off", 0, override({ ambientOcclusion: "off" }), reset);
  await step(page, "occlusion", "occlusion half -> full", 0, override({ ambientOcclusion: "full" }), reset);
}
if (ONLY.includes("resolution")) {
  // fewer pixels: a frame bound by shading gets much faster, one bound by draws and script does not
  for (const ratio of [0.7, 0.5, 0.25]) await step(page, "resolution", `pixel ratio 1 -> ${ratio}`, 0, override({ pixelRatio: ratio }), reset);
}
if (ONLY.includes("lamps")) {
  // the zone's own lamps (unlit by day, but in the scene so dusk needs no shader rebuild)
  await step(page, "lamps", "zone lamps removed (noon)", 0, () => page.evaluate(() => { const gone = []; window.__TWIN__.scene.traverse((o) => { if (o.isLight && /^lamp:/.test(o.name)) gone.push(o); }); window.__gone = gone.map((o) => [o, o.parent]); for (const o of gone) o.removeFromParent(); }), () => page.evaluate(() => { for (const [o, parent] of window.__gone) parent.add(o); }));
}
if (ONLY.includes("tiers")) {
  for (const tier of ["low", "high", "ultra"]) {
    await step(page, "tiers", `tier medium -> ${tier}`, 0, () => page.evaluate((t) => window.__TWIN__.cost.tier(t), tier), () => page.evaluate(() => window.__TWIN__.cost.tier("medium")));
  }
}
await context.close();

// sun shadows off altogether needs a fresh page (?shadows=0 is read once at start)
if (ONLY.includes("shadows")) {
  const off = await open("&shadows=0");
  const s = await sample(off.page);
  const row = { group: "shadows", name: "sun shadows off (fresh page)", n: 0, baseMs: baseline.ms, withMs: s.ms, deltaMs: round(s.ms - baseline.ms), perCopyMs: null, fps: [baseline.fps, s.fps], calls: [baseline.calls, s.calls], tris: [baseline.tris, s.tris], programs: [baseline.programs, s.programs], gpuMB: [baseline.gpuMB, s.gpuMB] };
  results.push(row);
  console.log(`shadows    sun shadows off (fresh page)          ${baseline.ms} -> ${s.ms} ms  calls ${baseline.calls}->${s.calls}`);
  await off.context.close();
}
await browser.close();

fs.mkdirSync(path.join(".cache", "bench"), { recursive: true });
const file = path.join(".cache", "bench", `twin2-cost-${LABEL}.json`);
fs.writeFileSync(file, JSON.stringify({ label: LABEL, at: new Date().toISOString(), place: PLACE, dsf: DSF, info, baseline, results, errors: errors.slice(0, 20) }, null, 1));
console.log(`\nwrote ${file}${errors.length ? `; ${errors.length} page errors (first: ${errors[0]})` : ""}`);
