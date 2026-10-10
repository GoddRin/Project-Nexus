/**
 * Frame-rate and budget bench of Twin v2 on the real graphics card (Playwright, Chrome with the GPU
 * on). The port of scripts/bench-twin.mjs to `?v=2`.
 *
 *   npx next build && npx next start -p 3100      # in another terminal (or the "twin-bench" preview)
 *   node scripts/twin/bench.mjs [label] [options]
 *
 *   --base=http://localhost:3100   server to measure
 *   --profiles=desktop,phone       desktop is 1440 x 900 on the Medium tier; phone is 390 x 844 at 2x on Low
 *   --tier=<tier>                  measure every profile on this tier instead
 *   --testzone                     include zones marked as test (the P01c pipeline test yard)
 *   --capped                       leave the display's frame cap on (the default takes it off)
 *   --force-webgl                  run the renderer's WebGL2 fallback
 *   --browser=chrome|msedge        --headed
 *   --dwell=2.5                    seconds at each place of the fly-through
 *   --soak=<minutes>               repeat the fly-through for this long and judge the heap trend on it
 *
 * For each profile it measures: a cold open (download size, time to a usable view), a warm reload
 * (first usable view), the overview held still, a scripted fly-through of every place in
 * components/twin/data/cameras.json, one run per zone, and the JS heap sampled throughout. The result
 * is compared with the budget table in docs/twin-v2/MASTER-BRIEF.md section 5: one PASS or FAIL per
 * line, printed and written to .cache/bench/twin2-<label>.json.
 *
 * With the frame cap off, frames per second is the figure to trust; p95 is steadier with --capped
 * (docs/twin-v2/review/P01a/REPORT.md). Dynamic resolution is switched off (?dynres=0) so every run
 * shades the same number of pixels.
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
const BASE = arg("base", process.env.BENCH_BASE || "http://localhost:3100");
const CAPPED = flag("capped");
const FORCE = flag("force-webgl");
const TESTZONE = flag("testzone");
const DWELL = Number(arg("dwell", "2.5"));
const SOAK_MIN = Number(arg("soak", "0"));
const TIER = arg("tier", null);

const ALL_PROFILES = {
  desktop: { tier: "medium", context: { viewport: { width: 1440, height: 900 } } },
  phone: { tier: "low", context: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
};
const PROFILES = arg("profiles", "desktop,phone").split(",").filter((p) => ALL_PROFILES[p]);

/** docs/twin-v2/MASTER-BRIEF.md section 5 (starting targets; P02c rewrites them). */
const BUDGET = {
  desktop: { fps: 45, p95: 33, calls: 350, tris: 700_000, programs: 40, lights: 9, firstViewS: 6, firstViewMB: 12, siteMB: 70 },
  phone: { fps: 30, p95: 50, calls: 200, tris: 300_000, programs: 30, lights: 5, firstViewS: 8, firstViewMB: 8, siteMB: 40 },
};
/** JS heap growth, in MB a minute, under which the heap counts as having no trend. */
const HEAP_TREND_MB_PER_MIN = 1;

const cameras = JSON.parse(fs.readFileSync(path.join("components", "twin", "data", "cameras.json"), "utf8")).cameras;
const zoneIndex = JSON.parse(fs.readFileSync(path.join("components", "twin", "data", "zones", "index.json"), "utf8")).filter((z) => TESTZONE || !z.test);

fs.mkdirSync(path.join(".cache", "bench"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 1) => Number(n.toFixed(d));

const browser = await chromium.launch({
  headless: !flag("headed"),
  channel: arg("browser", "chrome"),
  args: [
    "--use-angle=d3d11",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-webgpu",
    "--enable-precise-memory-info",
    "--js-flags=--expose-gc",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    ...(CAPPED ? [] : ["--disable-gpu-vsync", "--disable-frame-rate-limit"]),
  ],
});

/** Frames drawn over `ms`, as frames a second and frame-time percentiles. */
const measure = (page, ms) =>
  page.evaluate(
    (dur) =>
      new Promise((resolve) => {
        const gaps = [];
        let last = performance.now();
        const end = last + dur;
        const tick = (now) => {
          gaps.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(tick);
          else {
            gaps.sort((a, b) => a - b);
            const s = window.__TWIN__.stats();
            resolve({
              fps: (gaps.length / dur) * 1000,
              p50: gaps[Math.floor(gaps.length * 0.5)] || 0,
              p95: gaps[Math.floor(gaps.length * 0.95)] || 0,
              worst: gaps[gaps.length - 1] || 0,
              calls: s.calls,
              tris: s.tris,
              programs: s.programs,
              lights: s.lights,
              textures: s.textures,
              geometries: s.geometries,
              gpuMB: s.gpuMB,
              zonesLoaded: s.zonesLoaded,
              instances: s.streaming.instances,
              lod: s.streaming.lod,
            });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
const heap = (page) =>
  page.evaluate(() => {
    window.gc?.();
    return performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
  });
const settled = (page) => page.waitForFunction(() => { const s = window.__TWIN__.streaming.stats(); return s.zonesLoading === 0 && s.tasksQueued === 0; }, null, { timeout: 120_000 });
const usable = async (page) => {
  await page.waitForSelector("select[aria-label='Go to a place']", { timeout: 180_000 });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 60_000 });
};
/** Least-squares slope of heap samples, MB a minute. */
function trend(samples) {
  if (samples.length < 3) return 0;
  const n = samples.length;
  const mx = samples.reduce((a, s) => a + s.t, 0) / n;
  const my = samples.reduce((a, s) => a + s.mb, 0) / n;
  let num = 0;
  let den = 0;
  for (const s of samples) {
    num += (s.t - mx) * (s.mb - my);
    den += (s.t - mx) ** 2;
  }
  return den ? (num / den) * 60_000 : 0;
}

const out = [];
let anyFail = false;
try {
  for (const name of PROFILES) {
    const profile = ALL_PROFILES[name];
    const tier = TIER ?? profile.tier;
    const budget = BUDGET[name];
    const url = `${BASE}/digital-twin?v=2&debug=1&t=1200&dynres=0&q=${tier}${TESTZONE ? "&testzone=1" : ""}${FORCE ? "&force=webgl" : ""}`;
    const context = await browser.newContext(profile.context);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
    page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text().slice(0, 200)));
    let bytes = 0;
    const byKind = { twinModels: 0, script: 0, other: 0 };
    page.on("requestfinished", async (request) => {
      try {
        const size = (await request.sizes()).responseBodySize;
        bytes += size;
        const u = request.url();
        if (u.includes("/models/twin/") || u.includes("/textures/twin/") || u.includes("/vendor/twin/")) byKind.twinModels += size;
        else if (request.resourceType() === "script") byKind.script += size;
        else byKind.other += size;
      } catch {
        // (the page went away before the size was known)
      }
    });

    // ---- cold open: download size and time to a usable view
    let t0 = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await usable(page);
    const coldMs = Date.now() - t0;
    await settled(page);
    const coldAllInMs = Date.now() - t0;
    await sleep(500);
    const firstViewBytes = bytes;
    const firstViewKinds = { ...byKind };
    const info = await page.evaluate(() => ({ backend: window.__TWIN__.backend, canvas: [window.__TWIN__.renderer.domElement.width, window.__TWIN__.renderer.domElement.height], pixelRatio: window.__TWIN__.renderer.getPixelRatio() }));

    // ---- warm reload: first usable view
    t0 = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    await usable(page);
    const warmMs = Date.now() - t0;
    await settled(page);
    const warmAllInMs = Date.now() - t0;
    await sleep(1500);

    const heapSamples = [];
    const heapStart = Date.now();
    const sampleHeap = async () => heapSamples.push({ t: Date.now() - heapStart, mb: await heap(page) });
    await sampleHeap();

    // ---- the overview, held still
    await measure(page, 2000); // (one throwaway pass)
    const overview = await measure(page, 8000);
    await sampleHeap();

    // ---- the fly-through: every place in cameras.json, in order
    const flight = { places: [], frames: 0, ms: 0, maxCalls: 0, maxTris: 0, maxPrograms: 0, p95: 0, worst: { id: "", fps: Infinity } };
    const flyOnce = async (keep) => {
      for (const cam of cameras) {
        await page.evaluate((id) => window.__TWIN__.rig.flyTo(id), cam.id);
        const m = await measure(page, DWELL * 1000);
        if (!keep) continue;
        flight.places.push({ id: cam.id, fps: round(m.fps), p95: round(m.p95), calls: m.calls, tris: m.tris });
        flight.frames += (m.fps * DWELL);
        flight.ms += DWELL * 1000;
        flight.maxCalls = Math.max(flight.maxCalls, m.calls);
        flight.maxTris = Math.max(flight.maxTris, m.tris);
        flight.maxPrograms = Math.max(flight.maxPrograms, m.programs);
        flight.p95 = Math.max(flight.p95, m.p95);
        if (m.fps < flight.worst.fps) flight.worst = { id: cam.id, fps: round(m.fps) };
      }
      await sampleHeap();
    };
    await flyOnce(true);
    const soakEnd = Date.now() + SOAK_MIN * 60_000;
    let laps = 1;
    while (Date.now() < soakEnd) {
      await flyOnce(false);
      laps++;
    }

    // ---- one run per zone, from above its middle
    const zones = [];
    for (const z of zoneIndex.filter((zone) => zone.location === "powerhouse")) {
      const c = [(z.bounds.min[0] + z.bounds.max[0]) / 2, (z.bounds.min[1] + z.bounds.max[1]) / 2, (z.bounds.min[2] + z.bounds.max[2]) / 2];
      const span = Math.max(z.bounds.max[0] - z.bounds.min[0], z.bounds.max[2] - z.bounds.min[2]);
      await page.evaluate(([pos, target]) => window.__TWIN__.rig.flyToPose(pos, target, 0.05), [[c[0] - span * 0.45, c[1] + span * 0.35, c[2] - span * 0.45], c]);
      await sleep(600);
      await settled(page);
      const m = await measure(page, 5000);
      zones.push({ id: z.id, placements: z.placements, fps: round(m.fps), p95: round(m.p95), calls: m.calls, tris: m.tris, lod: m.lod, gpuMB: round(m.gpuMB) });
    }
    await sampleHeap();
    // everything needed for the first view plus every twin asset fetched since (the dashboard around the
    // twin polls its own services for as long as the page is open; that is not the site's size)
    const siteBytes = firstViewBytes + (byKind.twinModels - firstViewKinds.twinModels);
    const otherBytes = bytes - siteBytes;
    const end = await page.evaluate(() => window.__TWIN__.stats());

    // ---- against the budget
    const flightFps = flight.ms ? (flight.frames / flight.ms) * 1000 : 0;
    const slope = trend(heapSamples);
    const heapMinutes = (heapSamples[heapSamples.length - 1].t - heapSamples[0].t) / 60_000;
    const worstCalls = Math.max(overview.calls, flight.maxCalls, ...zones.map((z) => z.calls));
    const worstTris = Math.max(overview.tris, flight.maxTris, ...zones.map((z) => z.tris));
    const lines = [
      ["Median frame rate, overview", `${round(overview.fps)} fps`, `${budget.fps} fps or better`, overview.fps >= budget.fps],
      ["Frame rate over the fly-through", `${round(flightFps)} fps (worst place ${flight.worst.id}: ${flight.worst.fps})`, `${budget.fps} fps or better`, flightFps >= budget.fps],
      ["p95 frame time, overview", `${round(overview.p95)} ms${CAPPED ? "" : " (frame cap off)"}`, `${budget.p95} ms or less`, overview.p95 <= budget.p95],
      ["Draw calls (most seen)", `${worstCalls}`, `${budget.calls} or fewer`, worstCalls <= budget.calls],
      ["Triangles in view (most seen)", `${worstTris}`, `${budget.tris} or fewer`, worstTris <= budget.tris],
      ["Shader programs / pipelines", `${Math.max(end.programs, flight.maxPrograms)}`, `${budget.programs} or fewer`, Math.max(end.programs, flight.maxPrograms) <= budget.programs],
      ["Real-time lights (sun included)", `${end.lights}`, `${budget.lights} or fewer`, end.lights <= budget.lights],
      ["First usable view (warm cache)", `${round(warmMs / 1000, 2)} s (everything in: ${round(warmAllInMs / 1000, 2)} s)`, `${budget.firstViewS} s or less`, warmMs / 1000 <= budget.firstViewS],
      ["Download to first view", `${round(firstViewBytes / 1048576, 2)} MB (twin assets ${round(firstViewKinds.twinModels / 1048576, 2)}, scripts ${round(firstViewKinds.script / 1048576, 2)})`, `${budget.firstViewMB} MB or less`, firstViewBytes / 1048576 <= budget.firstViewMB],
      ["Download, whole site", `${round(siteBytes / 1048576, 2)} MB`, `${budget.siteMB} MB or less`, siteBytes / 1048576 <= budget.siteMB],
      ["JS heap trend", `${slope >= 0 ? "+" : ""}${round(slope, 2)} MB a minute over ${round(heapMinutes, 1)} minutes (${heapSamples.map((s) => round(s.mb, 0)).join(", ")} MB)${SOAK_MIN >= 20 ? "" : "; the budget asks for 20 minutes: run with --soak=20"}`, "no growth trend", slope <= HEAP_TREND_MB_PER_MIN],
    ];

    console.log(`\n== ${LABEL} / ${name}: tier ${tier}, ${info.backend}, canvas ${info.canvas.join(" x ")} at pixel ratio ${info.pixelRatio}, ${CAPPED ? "frame cap on" : "frame cap off"}, ${zoneIndex.length} zone(s), ${laps} lap(s)`);
    for (const [what, got, want, pass] of lines) {
      if (!pass) anyFail = true;
      console.log(`${pass ? "PASS" : "FAIL"}  ${what.padEnd(34)} ${got}   [budget: ${want}]`);
    }
    for (const z of zones) console.log(`      zone ${z.id}: ${z.fps} fps, p95 ${z.p95} ms, ${z.calls} draw calls, ${z.tris} triangles, LOD0/1/2 ${z.lod.join("/")}, GPU ${z.gpuMB} MB`);
    if (errors.length) console.log(`      console errors: ${errors.slice(0, 3).join(" | ")}`);

    out.push({
      label: LABEL,
      profile: name,
      tier,
      ...info,
      capped: CAPPED,
      forcedWebGL: FORCE,
      testZone: TESTZONE,
      coldMs,
      coldAllInMs,
      warmMs,
      warmAllInMs,
      firstViewBytes,
      firstViewKinds,
      siteBytes,
      otherBytesAfterFirstView: otherBytes,
      overview,
      flight: { fps: round(flightFps), ...flight },
      zones,
      heap: { samples: heapSamples, mbPerMinute: round(slope, 3), minutes: round(heapMinutes, 2) },
      end,
      budget: lines.map(([what, got, want, pass]) => ({ what, got, want, pass })),
      errors: errors.slice(0, 5),
    });
    await context.close();
  }
} catch (err) {
  anyFail = true;
  console.log("BENCH ERROR", String(err).slice(0, 600));
} finally {
  await browser.close();
  const file = path.join(".cache", "bench", `twin2-${LABEL}.json`);
  fs.writeFileSync(file, JSON.stringify({ when: new Date().toISOString(), base: BASE, runs: out }, null, 1));
  console.log(`\nwritten: ${file}`);
}
process.exit(anyFail ? 1 : 0);
