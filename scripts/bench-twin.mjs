/**
 * Frame-rate bench of the Digital Twin on the real graphics card (Playwright, headless Chromium
 * with the GPU on and the 60 fps cap off).
 *
 *   npx next build && npx next start -p 3100      # in another terminal
 *   node scripts/bench-twin.mjs [label] [--probe]
 *
 * It loads /digital-twin at a desktop size and a phone size, waits for the scene to settle and
 * measures how fast frames are drawn (frames a second, and the 95th-percentile frame time),
 * with the scene's own counters (draw calls, triangles). With --probe it then switches parts
 * of the scene off, one at a time, to show where the time goes: the lamps, half of the meshes,
 * half of the resolution. Nothing is changed in the project: the switches are flipped in the
 * page only. `?` options after the path can be passed with BENCH_QUERY ("lights=all").
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BENCH_BASE || "http://localhost:3100";
const QUERY = process.env.BENCH_QUERY ? `?${process.env.BENCH_QUERY}` : "";
const LABEL = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "run";
const PROBE = process.argv.includes("--probe");
const PROFILES = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
fs.mkdirSync(path.join(".cache", "bench"), { recursive: true });

const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const out = [];
const frames = (page, ms = 6000) =>
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
            const info = window.__R3F_INFO__ || {};
            resolve({ fps: Number(((gaps.length / dur) * 1000).toFixed(1)), ms: Number((dur / gaps.length).toFixed(1)), p95: Number((gaps[Math.floor(gaps.length * 0.95)] || 0).toFixed(1)), calls: info.calls, tris: info.triangles });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms
  );

try {
  for (const profile of PROFILES) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: !!profile.isMobile, hasTouch: !!profile.hasTouch, deviceScaleFactor: profile.deviceScaleFactor ?? 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
    const t0 = Date.now();
    await page.goto(`${BASE}/digital-twin${QUERY}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => window.__R3F_INFO__ && window.__R3F_INFO__.calls > 200, null, { timeout: 180_000 });
    // settled: the scene has stopped adding geometry and compiling materials for ten seconds
    let stable = 0;
    let lastSig = "";
    for (let i = 0; i < 60 && stable < 5; i++) {
      await page.waitForTimeout(2000);
      const sig = await page.evaluate(() => `${window.__R3F_INFO__.geometries}|${window.__THREE_GL__.info.programs.length}|${window.__TWIN_BATCH__?.batched ?? 0}`);
      stable = sig === lastSig ? stable + 1 : 0;
      lastSig = sig;
    }
    const readyMs = Date.now() - t0;
    await frames(page, 3000); // (one throwaway pass)
    const gpu = await page.evaluate(() => {
      const gl = window.__THREE_GL__;
      const c = gl.getContext();
      const e = c.getExtension("WEBGL_debug_renderer_info");
      let lights = 0;
      let lit = 0;
      window.__THREE_SCENE__.traverse((o) => {
        if (o.isPointLight || o.isSpotLight) {
          lights++;
          let v = true;
          for (let x = o; x; x = x.parent) if (!x.visible) v = false;
          if (v) lit++;
        }
      });
      return { renderer: e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \(|, D3D11\)| Direct3D11.*/g, "") : "?", canvas: `${gl.domElement.width}x${gl.domElement.height}`, programs: gl.info.programs.length, lights, lit, managed: window.__TWIN_OPT__ || null };
    });
    const base = await frames(page);
    const row = { label: LABEL, profile: profile.name, readyMs, ...gpu, base, errors: errors.slice(0, 2) };
    // the same page with static batching switched off, then on again: a like-for-like comparison
    if (await page.evaluate(() => !!window.__TWIN_BATCH__)) {
      row.batch = await page.evaluate(() => ({ batches: window.__TWIN_BATCH__.batches, batched: window.__TWIN_BATCH__.batched, handedBack: window.__TWIN_BATCH__.handedBack, rebuilds: window.__TWIN_BATCH__.rebuilds }));
      await page.evaluate(() => window.__TWIN_BATCH__.setEnabled(false));
      await page.waitForTimeout(1500);
      row.batchingOff = await frames(page);
      await page.evaluate(() => window.__TWIN_BATCH__.setEnabled(true));
      await page.waitForTimeout(6000);
      row.batchingOnAgain = await frames(page);
      row.batchAfter = await page.evaluate(() => ({ batches: window.__TWIN_BATCH__.batches, batched: window.__TWIN_BATCH__.batched, rebuilds: window.__TWIN_BATCH__.rebuilds }));
    }
    if (PROBE) {
      // 1. the lamps off (point and spot lights): how much of a frame is lighting
      await page.evaluate(() => {
        window.__probe = [];
        window.__THREE_SCENE__.traverse((o) => {
          if ((o.isPointLight || o.isSpotLight) && o.visible) {
            window.__probe.push(o);
            o.visible = false;
          }
        });
      });
      await page.waitForTimeout(6000); // (materials recompile for the new light count)
      row.noLamps = await frames(page);
      await page.evaluate(() => window.__probe.forEach((o) => (o.visible = true)));
      await page.waitForTimeout(5000);
      // 2. every second mesh hidden: how much of a frame is the number of things drawn
      await page.evaluate(() => {
        window.__probe = [];
        let i = 0;
        window.__THREE_SCENE__.traverse((o) => {
          if (o.isMesh && o.visible && i++ % 2) {
            window.__probe.push(o);
            o.visible = false;
          }
        });
      });
      await page.waitForTimeout(1500);
      row.halfMeshes = await frames(page);
      await page.evaluate(() => window.__probe.forEach((o) => (o.visible = true)));
      // 3. half the resolution: how much of a frame is the number of pixels shaded
      await page.evaluate(() => {
        const gl = window.__THREE_GL__;
        window.__pr = gl.getPixelRatio();
        gl.setPixelRatio(window.__pr / 2);
      });
      await page.waitForTimeout(1500);
      row.halfRes = await frames(page);
      await page.evaluate(() => window.__THREE_GL__.setPixelRatio(window.__pr));
    }
    out.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
} catch (err) {
  console.log("BENCH ERROR", String(err).slice(0, 400));
} finally {
  await browser.close();
  fs.writeFileSync(path.join(".cache", "bench", `twin-${LABEL}.json`), JSON.stringify(out, null, 1));
}
