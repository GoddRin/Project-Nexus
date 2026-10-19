/**
 * Pass checks for the v2 terrain (P03a), in a visible Chrome window against a running server.
 *
 *   node scripts/twin/check-terrain-v2.mjs [--base=http://localhost:3000] [--out=docs/twin-v2/review/P03a] [--force-webgl]
 *
 * 1. Sampler against the drawn surface: at 200 seeded random points of the near square (not inside a
 *    ground patch), the height the graphics card draws (read back from a one-pixel render straight
 *    down, world/terrain-tiles.ts `drawnHeights`) against the sampler the camera and the people use.
 *    Pass: every point within 3 cm.
 * 2. Cracks while flying: a low flight across the square with the tiles changing level; each frame is
 *    read back at a row of pixels just below the horizon and any pixel of the clear colour (nothing
 *    drawn) is a crack. Pass: none.
 * Writes terrain-checks.json in --out.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BASE = arg("base", "http://localhost:3000");
const OUT = arg("out", path.join("docs", "twin-v2", "review", "P03a"));
const FORCE = process.argv.includes("--force-webgl");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
await page.goto(`${BASE}/digital-twin?v=2&debug=1&dynres=0&q=medium&t=1215${FORCE ? "&force=webgl" : ""}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__TWIN__?.terrain, null, { timeout: 180000 });
await page.waitForTimeout(3000);

// 1. sampler against the drawn surface
const sampler = await page.evaluate(async () => {
  const t = window.__TWIN__.terrain;
  let seed = 20261016;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pts = [];
  const half = 512 - 48;
  while (pts.length < 200) {
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    if (t.manifest.holes.some((r) => x > r[0] - 1 && x < r[2] + 1 && z > r[1] - 1 && z < r[3] + 1)) continue;
    pts.push([x, z]);
  }
  const drawn = await t.drawnHeights(window.__TWIN__.renderer, pts);
  const rows = pts.map(([x, z], i) => ({ x: +x.toFixed(2), z: +z.toFixed(2), sampler: t.terrainY(x, z), drawn: drawn[i] }));
  const diffs = rows.map((r) => Math.abs(r.sampler - r.drawn));
  return { points: rows.length, worstCm: Math.max(...diffs) * 100, meanCm: (diffs.reduce((a, b) => a + b, 0) / diffs.length) * 100, missing: drawn.filter((v) => !Number.isFinite(v)).length, over3cm: diffs.filter((d) => !(d <= 0.03)).length, rows };
});
console.log(`sampler vs drawn: ${sampler.points} points, worst ${sampler.worstCm.toFixed(2)} cm, mean ${sampler.meanCm.toFixed(3)} cm, ${sampler.over3cm} over 3 cm, ${sampler.missing} not drawn`);

// 2. cracks: a low flight across the square with the tiles changing level
const flight = await page.evaluate(async () => {
  const T = window.__TWIN__;
  const { renderer, scene, terrain, rig } = T;
  const camera = T.camera;
  const THREE = T.three;
  // (512 wide: WebGPU pads each row read back to 256 bytes, and 512 x 4 bytes needs none)
  const W = 512;
  const H = 320;
  const target = new THREE.RenderTarget(W, H);
  const wait = () => new Promise((r) => requestAnimationFrame(() => r()));
  // the terrain alone: everything else hidden (the sky, plants, the gate). The gate's ground patch fills a
  // hole in the terrain, so the part of the picture its square covers is not judged
  const hidden = [];
  scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || !o.visible) return;
    for (let p = o; p; p = p.parent) if (p === terrain.root) return;
    o.visible = false;
    hidden.push(o);
  });
  const patchBoxes = () =>
    terrain.manifest.holes.map(([x0, z0, x1, z1]) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, behind = false;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]])
        for (const dy of [-2, 12]) {
          const v = new THREE.Vector3(x, terrain.terrainY(x, z) + dy, z).project(camera);
          if (v.z > 1) behind = true;
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
      // (in pixels of the target, row 0 at the top)
      return behind ? null : [((minX + 1) / 2) * W - 2, ((1 - maxY) / 2) * H - 2, ((maxX + 1) / 2) * W + 2, ((1 - minY) / 2) * H + 2];
    }).filter(Boolean);
  const fog = scene.fogNode;
  const bg = scene.background;
  scene.fogNode = null;
  scene.background = new THREE.Color(1, 0, 1);
  const legs = [
    [-430, 0, 430, 0],
    [0, -430, 0, 430],
    [-400, -400, 400, 400],
    [400, -380, -380, 400],
  ];
  let frames = 0;
  let worst = 0;
  const bad = [];
  for (const [x0, z0, x1, z1] of legs)
    for (let k = 0; k <= 40; k++) {
      const x = x0 + ((x1 - x0) * k) / 40;
      const z = z0 + ((z1 - z0) * k) / 40;
      for (const up of [6, 40]) {
        const y = terrain.sampleY(x, z) + up;
        const dx = x1 - x0;
        const dz = z1 - z0;
        const len = Math.hypot(dx, dz);
        rig.flyToPose([x, y, z], [x + (dx / len) * 200, y - up * 0.6, z + (dz / len) * 200], 0);
        await wait();
        await wait();
        // drawn again, terrain alone, into a small target, as the frame's own camera sees it
        terrain.update(camera);
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        const px = await renderer.readRenderTargetPixelsAsync(target, 0, 0, W, H);
        // the sky's side of the picture is the edge row with more magenta: scanning from it, the first
        // pixel that is not magenta is the skyline; magenta after that is a hole in the ground
        const isMagenta = (i) => px[i] > 200 && px[i + 1] < 60 && px[i + 2] > 200;
        let topSky = 0;
        let bottomSky = 0;
        for (let col = 0; col < W; col++) {
          if (isMagenta(col * 4)) topSky++;
          if (isMagenta(((H - 1) * W + col) * 4)) bottomSky++;
        }
        const fromRow0 = topSky >= bottomSky;
        let holes = 0;
        const boxes = patchBoxes();
        for (let col = 0; col < W; col++) {
          let ground = false;
          for (let k = 0; k < H; k++) {
            const row = fromRow0 ? k : H - 1 - k;
            const i = (row * W + col) * 4;
            if (!isMagenta(i)) ground = true;
            else if (ground && !boxes.some((b) => col >= b[0] && col <= b[2] && row >= b[1] && row <= b[3])) holes++;
          }
        }
        frames++;
        worst = Math.max(worst, holes);
        if (holes > 0) bad.push({ x: Math.round(x), z: Math.round(z), up, holes, fromRow0 });
      }
    }
  scene.background = bg;
  scene.fogNode = fog;
  target.dispose();
  for (const o of hidden) o.visible = true;
  return { frames, framesWithHoles: bad.length, worstHolePixels: worst, bad: bad.sort((a, b) => b.holes - a.holes).slice(0, 20) };
});
console.log(`cracks: ${flight.frames} frames flown low, ${flight.framesWithHoles} with a hole (worst ${flight.worstHolePixels} px)`);
for (const [name, pose] of [
  ["lod-ring", [0, 60, 380, 0, 0, -200]],
  ["low-across", [-300, 40, 0, 300, -20, 0]],
]) {
  await page.evaluate((p) => window.__TWIN__.rig.flyToPose([p[0], window.__TWIN__.terrain.sampleY(p[0], p[2]) + p[1], p[2]], [p[3], window.__TWIN__.terrain.sampleY(p[3], p[5]) + p[4], p[5]], 0), pose);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `check-${name}.jpg`), quality: 85, type: "jpeg" });
}

fs.writeFileSync(path.join(OUT, "terrain-checks.json"), JSON.stringify({ sampler, flight, errors }, null, 1));
console.log(errors.length ? `page errors: ${errors.join(" | ")}` : "no page errors");
await browser.close();
process.exit(sampler.over3cm || sampler.missing ? 1 : 0);
