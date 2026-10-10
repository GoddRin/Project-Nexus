/**
 * Checks the Twin v2 asset pipeline in a real browser (docs/twin-v2/P01-foundation.md, P01c "Pass when"):
 * the streamed test zone, its draw calls, LOD levels, unloading and GPU memory, the stand-in shell,
 * sliced uploads, quality tiers, the start-up probe and dynamic resolution.
 *
 *   node scripts/twin/check-pipeline.mjs [--base=http://localhost:3100] [--browser=chrome|msedge|firefox|webkit]
 *        [--headed] [--force-webgl] [--label=prod-chrome]
 *
 * Prints one line per check and writes docs/twin-v2/review/P01c/check-<label>.json. Exit code 1 if a
 * check fails. Run it against the production build: the dev server's timings are not the app's.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const BASE = arg("base", "http://localhost:3100");
const BROWSER = arg("browser", "chrome");
const HEADED = process.argv.includes("--headed");
const FORCE = process.argv.includes("--force-webgl");
const LABEL = arg("label", `${BROWSER}${FORCE ? "-forced-webgl" : ""}`);
const OUT = path.join("docs", "twin-v2", "review", "P01c");
fs.mkdirSync(OUT, { recursive: true });

const ZONE = "powerhouse.pipeline-test";
const VIEW = { width: 1440, height: 900 };
/** Far enough from the test zone (more than its streamOut of 520 m) for it to unload. */
const FAR = { pos: [900, 300, 900], target: [120, 13, -110] };
const NEAR = { pos: [78, 16, -146], target: [92, 13, -132] };
const CHROMIUM_ARGS = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"];

const launcher = BROWSER === "firefox" ? firefox : BROWSER === "webkit" ? webkit : chromium;
const browser = await launcher.launch({ headless: !HEADED, ...(launcher === chromium ? { channel: BROWSER === "chromium" ? undefined : BROWSER, args: CHROMIUM_ARGS } : {}) });

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass === true ? "PASS" : pass === false ? "FAIL" : "----"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// (dynamic resolution is held still unless a check is about it: on a busy machine it would resize the
// canvas in the middle of a memory comparison)
const url = (query = "") => `${BASE}/digital-twin?v=2&debug=1&t=1200${/dynres=/.test(query) ? "" : "&dynres=0"}${FORCE ? "&force=webgl" : ""}${query}`;
const allErrors = [];

async function open(context, query) {
  const page = await context.newPage();
  // (signed out, the dashboard frame around the twin makes calls that answer 401; those are not the twin's)
  page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && allErrors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => allErrors.push(String(e).slice(0, 300)));
  const t0 = Date.now();
  await page.goto(url(query), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("select[aria-label='Go to a place']", { timeout: 180000 });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 60000 });
  return { page, readyMs: Date.now() - t0 };
}
const stats = (page) => page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__TWIN__.stats(), assets: window.__TWIN__.assets.stats(), canvas: [window.__TWIN__.renderer.domElement.width, window.__TWIN__.renderer.domElement.height] })));
const goTo = async (page, pose, wait = 400) => {
  await page.evaluate((p) => window.__TWIN__.rig.flyToPose(p.pos, p.target, 0.05), pose);
  await sleep(wait);
};
const overview = async (page) => {
  await page.keyboard.press("Escape");
  await sleep(300);
};
async function waitZone(page, want, ms = 60000) {
  const t0 = Date.now();
  await page.waitForFunction(([id, state]) => window.__TWIN__.streaming.zones().find((z) => z.id === id)?.state === state && window.__TWIN__.streaming.stats().tasksQueued === 0, [ZONE, want], { timeout: ms });
  return Date.now() - t0;
}
async function shot(page, file) {
  const clip = await page.locator("canvas").first().boundingBox();
  await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 88, ...(clip ? { clip } : {}) });
}
const mb = (n) => `${n.toFixed(1)} MB`;

// ---------------------------------------------------------------------------------------------------
const context = await browser.newContext({ viewport: VIEW });

// 1. The starting value: the same scene with no zone, seen from the far pose
let start;
{
  const { page } = await open(context, "&q=medium");
  await sleep(800);
  const atOverview = await stats(page);
  await goTo(page, FAR, 1500);
  start = { ...(await stats(page)), overviewCalls: atOverview.calls, overviewTris: atOverview.tris };
  record("empty world: starting values", start.calls > 0, `overview ${atOverview.calls} draw calls, ${atOverview.tris} triangles; from the far pose: GPU ${mb(start.gpuMB)}, ${start.textures} textures, ${start.geometries} geometries, ${start.programs} pipelines`);
  await page.close();
}

{
  const { page, readyMs } = await open(context, "&q=medium&testzone=1");
  const backend = await page.evaluate(() => window.__TWIN__.backend);

  // 2. The zone streams in; 2,500 props in 15 draw calls or fewer
  const inMs = await waitZone(page, "in");
  await sleep(1200);
  const s = await stats(page);
  const drawn = s.streaming.lod[0] + s.streaming.lod[1] + s.streaming.lod[2];
  const zoneCalls = s.calls - start.overviewCalls;
  record("test zone streams in", s.zonesLoaded === 1 && s.streaming.instances === 2500 && s.assets.cached === 5, `backend ${backend}; page usable in ${readyMs} ms, zone in ${inMs} ms later; ${s.streaming.instances} placements of ${s.assets.cached} assets (${(s.assets.bytes / 1024).toFixed(0)} KB)`);
  record("2,500 props in 15 draw calls or fewer", s.streaming.instances === 2500 && zoneCalls <= 15 && s.streaming.draws <= 15 && drawn + s.streaming.hidden === 2500 && drawn > 0, `${zoneCalls} draw calls for the zone (${s.calls} in all, ${start.overviewCalls} without it); ${drawn} props in view as LOD0/1/2 = ${s.streaming.lod.join("/")}, ${s.streaming.hidden} outside the view; ${s.tris} triangles`);
  await shot(page, `zone-${LABEL}-overview.jpg`);

  // 3. Levels of detail by distance
  await goTo(page, NEAR, 1500);
  const near = await stats(page);
  record("near the props: all three LODs in use", near.streaming.lod.every((n) => n > 0), `LOD0/1/2 = ${near.streaming.lod.join("/")}, ${near.streaming.hidden} outside the view or beyond the draw distance; ${near.calls - start.overviewCalls} draw calls for the zone, ${near.tris} triangles, ${near.fps.toFixed(1)} fps`);
  await shot(page, `zone-${LABEL}-near.jpg`);

  // a slow walk across a LOD boundary must not flip a prop back and forth: count level changes
  {
    const flips = await page.evaluate(async () => {
      const t = window.__TWIN__;
      const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
      let last = t.stats().streaming.lod.join("/");
      let changes = 0;
      // hold still for 90 frames: with hysteresis nothing may change while the camera does not move
      for (let i = 0; i < 90; i++) {
        await frame();
        const now = t.stats().streaming.lod.join("/");
        if (now !== last) changes++;
        last = now;
      }
      return changes;
    });
    record("still camera: no prop changes level", flips === 0, `${flips} changes of the LOD tally in 90 frames`);
  }

  // 4. Flying away unloads the zone and the GPU memory comes back
  await goTo(page, FAR);
  await waitZone(page, "out");
  await sleep(1500);
  const after = await stats(page);
  const drift = start.gpuMB > 0 ? Math.abs(after.gpuMB - start.gpuMB) / start.gpuMB : 1;
  const sameCanvas = after.canvas.join() === start.canvas.join();
  record("flying away unloads the zone; GPU memory within 5% of the start", after.zonesLoaded === 0 && after.assets.cached === 0 && drift <= 0.05 && after.textures === start.textures && after.geometries === start.geometries, `GPU ${mb(s.gpuMB)} with the zone, ${mb(after.gpuMB)} after, ${mb(start.gpuMB)} at the start (${(drift * 100).toFixed(1)}% apart); textures ${after.textures} against ${start.textures}, geometries ${after.geometries} against ${start.geometries}; ${after.assets.cached} assets still cached${sameCanvas ? "" : `; the canvas was ${start.canvas.join(" x ")} at the start and ${after.canvas.join(" x ")} after, so the frame buffers differ`}`);

  // 5. Streaming in does not hold a frame up
  {
    await page.evaluate(() => {
      const t = window.__TWIN__;
      t.streaming.resetLongestTask();
      window.__gaps = [];
      let last = performance.now();
      const tick = (now) => {
        if (!window.__gaps) return;
        window.__gaps.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await sleep(600);
    const before = await page.evaluate(() => window.__gaps.length);
    await overview(page);
    const ms = await waitZone(page, "in");
    await sleep(300);
    const g = await page.evaluate((from) => {
      const gaps = window.__gaps;
      window.__gaps = null;
      const still = gaps.slice(5, from).sort((a, b) => a - b);
      const during = gaps.slice(from).sort((a, b) => a - b);
      const s = window.__TWIN__.streaming.stats();
      return { median: still[Math.floor(still.length / 2)] ?? 0, worst: during[during.length - 1] ?? 0, p95: during[Math.floor(during.length * 0.95)] ?? 0, frames: during.length, task: s.longestTaskMs, kind: s.longestTaskKind };
    }, before);
    record("streaming in: no task holds a frame for more than 8 ms", g.task <= 8, `longest task ${g.task.toFixed(1)} ms (${g.kind}); zone back in ${ms} ms over ${g.frames} frames; worst frame ${g.worst.toFixed(1)} ms, p95 ${g.p95.toFixed(1)} ms, against ${g.median.toFixed(1)} ms with nothing loading`);
    results.streamIn = g;
  }

  // 6. Five more times in and out: nothing accumulates
  {
    const series = [];
    for (let i = 0; i < 5; i++) {
      await goTo(page, FAR);
      await waitZone(page, "out");
      await sleep(700);
      const out = await stats(page);
      series.push({ gpuMB: out.gpuMB, textures: out.textures, geometries: out.geometries, heapMB: out.heapMB });
      await overview(page);
      await waitZone(page, "in");
      await sleep(300);
    }
    const first = series[0];
    const last = series[series.length - 1];
    record("five loads and unloads: no growth", last.gpuMB <= first.gpuMB * 1.05 && last.textures === first.textures && last.geometries === first.geometries, `GPU after each unload: ${series.map((x) => x.gpuMB.toFixed(1)).join(", ")} MB; textures ${series.map((x) => x.textures).join(", ")}; geometries ${series.map((x) => x.geometries).join(", ")}; JS heap ${series.map((x) => x.heapMB.toFixed(0)).join(", ")} MB`);
  }

  // 7. The stand-in shell shows while the zone is out and hides when it is in
  {
    await goTo(page, FAR);
    await waitZone(page, "out");
    await page.evaluate((id) => window.__TWIN__.streaming.setShell(id, "prop.drum-red"), ZONE);
    const shell = () => page.evaluate((id) => {
      const g = window.__TWIN__.scene.getObjectByName(`shell:${id}`);
      return g ? { visible: g.visible, meshes: g.children.length } : null;
    }, ZONE);
    await sleep(1500);
    const whileOut = await shell();
    await overview(page);
    await waitZone(page, "in");
    await sleep(300);
    const whileIn = await shell();
    await goTo(page, FAR);
    await waitZone(page, "out");
    await sleep(400);
    const outAgain = await shell();
    await page.evaluate((id) => window.__TWIN__.streaming.setShell(id, null), ZONE);
    await sleep(600);
    const gone = await shell();
    const left = await stats(page);
    record("shell stand-in: shown while the zone is out, hidden while it is in", !!whileOut?.visible && whileOut.meshes > 0 && whileIn?.visible === false && !!outAgain?.visible && gone === null && left.assets.cached === 0, `out ${JSON.stringify(whileOut)}, in ${JSON.stringify(whileIn)}, out again ${JSON.stringify(outAgain)}, removed ${gone === null}; ${left.assets.cached} assets cached at the end (a prop stood in as the shell: no real shell asset exists yet)`);
  }
  await page.close();
}
await context.close();

// 8. Tiers set the pixel ratio; dynamic resolution moves it between 60% and 100%
{
  const sharp = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const { page } = await open(sharp, "&q=medium&testzone=1&dynres=1");
  await waitZone(page, "in");
  const frames = (n = 4) => page.evaluate((count) => new Promise((r) => { let i = 0; const f = () => (++i >= count ? r(null) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const ratio = () => page.evaluate(() => ({ pr: window.__TWIN__.renderer.getPixelRatio(), w: window.__TWIN__.renderer.domElement.width, css: window.__TWIN__.renderer.domElement.clientWidth, scale: window.__TWIN__.resolution.scale() }));
  const seen = {};
  for (const tier of ["low", "medium", "high", "ultra"]) {
    await page.evaluate((t) => window.__TWIN__.store.setState({ quality: { tier: t, auto: false } }), tier);
    await frames(6);
    seen[tier] = await ratio();
  }
  const css = seen.medium.css;
  record("tiers set the pixel ratio", seen.low.pr === 1 && seen.medium.pr === 1.25 && seen.high.pr === 1.5 && seen.ultra.pr === 2 && Math.abs(seen.ultra.w - css * 2) <= 2 && Object.values(seen).every((x) => x.css === css), `on a 2x screen: low ${seen.low.pr}, medium ${seen.medium.pr}, high ${seen.high.pr}, ultra ${seen.ultra.pr}; canvas ${seen.low.w}, ${seen.medium.w}, ${seen.high.w}, ${seen.ultra.w} px wide for ${css} CSS px`);

  await page.evaluate(() => window.__TWIN__.store.setState({ quality: { tier: "medium", auto: false } }));
  await frames(6);
  // feed the controller slow frames (80 ms) for five 2-second windows, all in one go so no real frame mixes in
  const down = await page.evaluate(() => {
    const r = window.__TWIN__.resolution;
    r.reset();
    let t = performance.now() + 1e7;
    const steps = [];
    for (let i = 0; i < 140; i++) if (r.frame(80, (t += 80))) steps.push(r.scale());
    return steps;
  });
  await frames(6);
  const low = await ratio();
  // then quick frames (8 ms): it must come back up, one step at a time
  const up = await page.evaluate(() => {
    const r = window.__TWIN__.resolution;
    let t = performance.now() + 2e7;
    const steps = [];
    for (let i = 0; i < 6000; i++) if (r.frame(8, (t += 8))) steps.push(r.scale());
    return steps;
  });
  await frames(6);
  const back = await ratio();
  await page.evaluate(() => window.__TWIN__.resolution.reset());
  record("dynamic resolution: down to 60% under slow frames, back to 100% when they are quick", down.join() === "0.9,0.8,0.7,0.6" && low.pr === 0.75 && low.css === css && up.join() === "0.7,0.8,0.9,1" && back.pr === 1.25, `slow frames: scale ${down.join(" > ")}, pixel ratio ${low.pr}, canvas ${low.w} px for ${low.css} CSS px; quick frames: scale ${up.join(" > ")}, pixel ratio ${back.pr}, canvas ${back.w} px`);

  // a window resize must not put React Three Fiber's own pixel ratio back
  await page.evaluate(() => {
    const r = window.__TWIN__.resolution;
    let t = performance.now() + 3e7;
    for (let i = 0; i < 30; i++) r.frame(80, (t += 80));
  });
  await frames(6);
  const before = await ratio();
  await page.setViewportSize({ width: 1300, height: 820 });
  await sleep(700);
  const resized = await ratio();
  await page.evaluate(() => window.__TWIN__.resolution.reset());
  record("dynamic resolution survives a window resize", before.scale === 0.9 && resized.pr === before.pr && resized.css !== before.css, `scale ${before.scale}: pixel ratio ${before.pr} before, ${resized.pr} after resizing from ${before.css} to ${resized.css} CSS px`);
  await sharp.close();
}

// 9. The start-up probe chooses a tier and remembers it
{
  const fresh = await browser.newContext({ viewport: VIEW });
  const first = await open(fresh, "&testzone=1");
  await sleep(500);
  const a = await first.page.evaluate(() => ({ probe: window.__TWIN__.probe(), quality: window.__TWIN__.store.getState().quality, saved: localStorage.getItem("twin.tier.v2") }));
  await first.page.close();
  const second = await open(fresh, "&testzone=1");
  await sleep(500);
  const b = await second.page.evaluate(() => ({ probe: window.__TWIN__.probe(), quality: window.__TWIN__.store.getState().quality }));
  const q = new URL(second.page.url()).searchParams.get("q");
  record("start-up probe chooses a tier and remembers it", !!a.probe && a.probe.remembered === false && a.probe.score > 0 && a.quality.auto && a.quality.tier === a.probe.tier && !!a.saved && b.probe?.remembered === true && b.quality.tier === a.quality.tier && q === null, `first visit: score ${a.probe?.score.toFixed(2)}, tier ${a.quality.tier}, usable in ${first.readyMs} ms; second visit: tier ${b.quality.tier} from memory, usable in ${second.readyMs} ms; ?q= left out of the address (${q})`);
  results.probe = a.probe;
  await fresh.close();
}

record("KTX2 textures on this renderer", null, "not measured: KTX-Software is not installed on this machine, so the build wrote WebP; the loader has KTX2 wired (engine/assets.ts) but no .ktx2 file has been through it");
record("no console errors", allErrors.length === 0, allErrors.length ? allErrors.slice(0, 3).join(" | ") : "none in any page of this run");

await browser.close();
const failed = results.filter((r) => r.pass === false);
fs.writeFileSync(path.join(OUT, `check-${LABEL}.json`), JSON.stringify({ label: LABEL, base: BASE, browser: BROWSER, forcedWebGL: FORCE, when: new Date().toISOString(), start, streamIn: results.streamIn, probe: results.probe, results }, null, 1));
console.log(`\n${results.filter((r) => r.pass === true).length} passed, ${failed.length} failed, ${results.filter((r) => r.pass === null).length} not measured`);
process.exit(failed.length ? 1 : 0);
