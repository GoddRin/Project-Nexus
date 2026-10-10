/**
 * Checks the Twin v2 scene shell (docs/twin-v2/P01-foundation.md, P01b "Pass when") in a real browser.
 *
 *   node scripts/twin/check-shell.mjs [--base=http://localhost:3000] [--browser=chrome|msedge|firefox|webkit]
 *        [--headed] [--force-webgl] [--reloads=20] [--label=dev-chrome] [--out=docs/twin-v2/review/P01b]
 *
 * Prints one line per check and writes check-<label>.json and its captures to the --out folder. Exit code 1 if any
 * check fails. The React re-render check only means something against the dev server (React does not
 * report commits to a Profiler in a production build); it is reported as "not measured" otherwise.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";
import sharp from "sharp";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const BASE = arg("base", "http://localhost:3000");
const BROWSER = arg("browser", "chrome");
const HEADED = process.argv.includes("--headed");
const FORCE = process.argv.includes("--force-webgl");
const RELOADS = Number(arg("reloads", "20"));
const LABEL = arg("label", `${BROWSER}${FORCE ? "-forced-webgl" : ""}`);
const OUT = arg("out", path.join("docs", "twin-v2", "review", "P01b"));
fs.mkdirSync(OUT, { recursive: true });

const CHROMIUM_ARGS = [
  "--use-angle=d3d11",
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--enable-unsafe-webgpu",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-background-timer-throttling",
];
const VIEW = { width: 1440, height: 900 };
const OVERVIEW = { pos: [75, 120, 160], target: [30, 8, -25] };
const PLACES = {
  temfacil: { pos: [135, 60, -40], target: [125, 15, -100] },
  switchyard: { pos: [36, 14, 12], target: [24, 2, -2] },
};

const launcher = BROWSER === "firefox" ? firefox : BROWSER === "webkit" ? webkit : chromium;
const browser = await launcher.launch({
  headless: !HEADED,
  ...(launcher === chromium ? { channel: BROWSER === "chromium" ? undefined : BROWSER, args: CHROMIUM_ARGS } : {}),
});

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass === true ? "PASS" : pass === false ? "FAIL" : "----"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const url = (query = "") => `${BASE}/digital-twin?v=2&debug=1${FORCE ? "&force=webgl" : ""}${query}`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(context, query = "") {
  const page = await context.newPage();
  const errors = [];
  // (signed out, the dashboard frame around the twin makes calls that answer 401; those are not the twin's)
  page.on("console", (m) => m.type() === "error" && !/status of 401/.test(m.text()) && errors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
  // count the GPU contexts asked for: more than one per canvas means a second renderer was started
  await page.addInitScript(() => {
    window.__contexts = 0;
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
      if ((kind === "webgpu" || kind === "webgl2") && this.isConnected) window.__contexts++;
      return get.call(this, kind, ...rest);
    };
  });
  const t0 = Date.now();
  await page.goto(url(query), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.loop.frames() > 10 && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 120000 });
  // (since P01c the loading screen stays up while the start-up probe picks a tier, on a first visit)
  await page.waitForSelector("select[aria-label='Go to a place']", { timeout: 120000 });
  return { page, errors, startMs: Date.now() - t0 };
}
const pose = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__TWIN__.rig.pose())));
const flying = (page) => page.evaluate(() => window.__TWIN__.rig.isFlying());
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__TWIN__.store.getState())));
const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
const atPose = async (page, want, tol = 0.6) => {
  const p = await pose(page);
  return dist(p.pos, want.pos) < tol && dist(p.target, want.target) < tol;
};
async function settle(page, want, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!(await flying(page)) && (await atPose(page, want))) return true;
    await sleep(100);
  }
  return false;
}
/** A capture of the twin's own area only: the dashboard around it is not part of the review. */
async function shot(page, file) {
  const clip = await page.locator("canvas").first().boundingBox();
  await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 85, ...(clip ? { clip } : {}) });
}
async function brightness(page) {
  const png = await page.screenshot({ clip: { x: 300, y: 250, width: 840, height: 500 } });
  const { channels } = await sharp(png).stats();
  return (channels[0].mean + channels[1].mean + channels[2].mean) / 3;
}

// ---------------------------------------------------------------------------------------------------
const context = await browser.newContext({ viewport: VIEW });

// 1. Starts, draws, reports its cost
{
  const { page, errors, startMs } = await open(context, "&t=1200");
  await sleep(1500);
  const info = await page.evaluate(() => {
    const t = window.__TWIN__;
    const c = t.renderer.domElement;
    return { backend: t.backend, canvas: [c.width, c.height], stats: t.stats(), hud: !!document.querySelector("select[aria-label='Go to a place']") };
  });
  const lum = await brightness(page);
  record("starts and draws", lum > 20 && info.canvas[0] > 300 && errors.length === 0, `backend ${info.backend}, canvas ${info.canvas.join("x")}, ready in ${startMs} ms, mean brightness ${lum.toFixed(0)}, console errors ${errors.length}`);
  if (errors.length) console.log("       " + errors.slice(0, 3).join("\n       "));
  const s = info.stats;
  record("stats() reports", s.fps > 0 && s.calls > 0 && s.tris > 0, `fps ${s.fps.toFixed(1)}, ms ${s.ms.toFixed(1)}, p95 ${s.p95.toFixed(1)}, calls ${s.calls}, tris ${s.tris}, pipelines ${s.programs}, textures ${s.textures}, geometries ${s.geometries}, heap ${s.heapMB.toFixed(0)} MB`);
  results.info = info;
  results.noon = lum;
  await shot(page, `shell-${LABEL}-noon-overview.jpg`);

  // 2. Fly-to is cancelled by drag, wheel, key
  const cancelBy = async (name, act, maxDrift = 12) => {
    await page.evaluate(() => window.__TWIN__.rig.overview());
    await settle(page, OVERVIEW);
    await page.mouse.move(720, 450);
    await page.evaluate(() => window.__TWIN__.rig.flyTo("temfacil"));
    await sleep(250);
    const was = await flying(page);
    await act();
    const still = await flying(page); // read straight after the input, before another frame is needed
    await frame(page);
    const a = await pose(page);
    await sleep(600);
    const b = await pose(page);
    const drift = dist(a.pos, b.pos);
    const far = dist(b.pos, PLACES.temfacil.pos);
    const place = (await state(page)).camera.place;
    record(`fly-to cancelled by ${name}`, was && !still && far > 20 && drift < maxDrift && place === null, `flying before ${was}, after ${still}; moved ${drift.toFixed(2)} m in the next 0.6 s; ${far.toFixed(0)} m short of the place; place=${place}`);
  };
  await cancelBy("drag", async () => {
    await page.mouse.down();
    await page.mouse.move(724, 452, { steps: 2 });
    await page.mouse.up();
  });
  // (one wheel notch is itself a zoom of 18% of the distance to the ground under the cursor)
  await cancelBy("wheel", () => page.mouse.wheel(0, -100), 60);
  await cancelBy("key", async () => {
    await page.keyboard.down("KeyW");
    await sleep(30);
    await page.keyboard.up("KeyW");
  });

  // 3. Escape returns to the overview from any state
  const escapeFrom = async (name, prepare) => {
    await prepare();
    await page.keyboard.press("Escape");
    const ok = await settle(page, OVERVIEW, 6000);
    const s2 = await state(page);
    record(`Escape to overview: ${name}`, ok && s2.selection.kind === null && s2.camera.following === null && s2.camera.place === null, ok ? "at the overview, selection and following cleared" : `not at overview: ${JSON.stringify(await pose(page))}`);
  };
  await escapeFrom("at a place", async () => {
    await page.evaluate(() => window.__TWIN__.rig.flyTo("switchyard"));
    await settle(page, PLACES.switchyard);
  });
  await escapeFrom("in the middle of a fly-to", async () => {
    await page.evaluate(() => window.__TWIN__.rig.flyTo("temfacil"));
    await sleep(300);
  });
  await escapeFrom("with a selection and a follow target", async () => {
    await page.evaluate(() => {
      window.__TWIN__.store.setState({ selection: { kind: "person", id: "PM_ROMEO_SESE" }, camera: { place: null, following: "PM_ROMEO_SESE" } });
    });
  });
  await escapeFrom("after free movement", async () => {
    await page.mouse.move(600, 500);
    await page.mouse.wheel(0, -400);
    await page.mouse.down();
    await page.mouse.move(800, 420, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.down("KeyD");
    await sleep(400);
    await page.keyboard.up("KeyD");
  });
  await escapeFrom("with focus in the places list", async () => {
    await page.evaluate(() => window.__TWIN__.rig.flyTo("switchyard"));
    await sleep(200);
    await page.focus("select[aria-label='Go to a place']");
  });

  // 4. Wheel zooms towards the point under the cursor; double-click focuses it
  {
    const at = [520, 560];
    await page.mouse.move(...at);
    const before = await page.evaluate(([x, y]) => ({ p: window.__TWIN__.pick(x, y), cam: window.__TWIN__.rig.pose().pos }), at);
    await page.mouse.wheel(0, -300);
    await sleep(900);
    const after = await page.evaluate(([x, y]) => ({ p: window.__TWIN__.pick(x, y), cam: window.__TWIN__.rig.pose().pos }), at);
    if (!before.p || !after.p) {
      const why = await page.evaluate(() => ({ pose: window.__TWIN__.rig.pose(), flying: window.__TWIN__.rig.isFlying(), ground: !!window.__TWIN__.scene.getObjectByName("ground"), focus: document.activeElement?.tagName }));
      console.log("       nothing under the cursor:", JSON.stringify({ before, after, why }));
      before.p ??= [0, 0, 0];
      after.p ??= [1e6, 0, 0];
    }
    const d0 = dist(before.cam, before.p);
    const d1 = dist(after.cam, before.p);
    const slip = dist(before.p, after.p);
    record("wheel zooms towards the cursor point", d1 < d0 * 0.7 && slip < d0 * 0.02, `distance to the point ${d0.toFixed(1)} m to ${d1.toFixed(1)} m; the point under the cursor moved ${slip.toFixed(2)} m`);

    const at2 = [900, 520];
    const hit = (await page.evaluate(([x, y]) => window.__TWIN__.pick(x, y), at2)) ?? [1e6, 0, 0];
    await page.mouse.dblclick(...at2);
    await sleep(1200);
    const p = await pose(page);
    record("double-click focuses the clicked point", dist(p.target, hit) < 0.5, `orbit centre ${dist(p.target, hit).toFixed(2)} m from the clicked point`);
  }

  // 5. Keys move the camera; the camera stays above the ground
  {
    await page.keyboard.press("Escape");
    await settle(page, OVERVIEW, 6000);
    const moves = {};
    for (const [key, axis] of [["KeyW", "ahead"], ["KeyD", "right"], ["KeyE", "up"], ["KeyQ", "down"], ["ArrowLeft", "left"]]) {
      const a = await pose(page);
      await page.keyboard.down(key);
      await sleep(500);
      await page.keyboard.up(key);
      await sleep(400);
      const b = await pose(page);
      moves[axis] = [b.pos[0] - a.pos[0], b.pos[1] - a.pos[1], b.pos[2] - a.pos[2]].map((v) => Number(v.toFixed(1)));
    }
    const a = await pose(page);
    await page.keyboard.down("Shift");
    await page.keyboard.down("KeyW");
    await sleep(500);
    await page.keyboard.up("KeyW");
    await page.keyboard.up("Shift");
    await sleep(400);
    const b = await pose(page);
    const plain = Math.hypot(...moves.ahead);
    const fast = dist(a.pos, b.pos);
    record("WASD / arrows move, Q and E lower and raise, Shift is faster", plain > 5 && Math.abs(moves.ahead[1]) < 0.5 && moves.up[1] > 3 && moves.down[1] < -3 && Math.hypot(...moves.right) > 5 && fast > plain * 1.5, `ahead ${JSON.stringify(moves.ahead)}, right ${JSON.stringify(moves.right)}, E ${JSON.stringify(moves.up)}, Q ${JSON.stringify(moves.down)}; with Shift ${fast.toFixed(1)} m against ${plain.toFixed(1)} m`);

    await page.evaluate(() => window.__TWIN__.rig.flyToPose([118, -40, -95], [150, -45, -120], 0.5));
    await sleep(1200);
    const under = await pose(page);
    await page.keyboard.down("KeyQ");
    await sleep(1500);
    await page.keyboard.up("KeyQ");
    await sleep(300);
    const low = await pose(page);
    // (the camp pad is cut level at 13.0 m in v1's terrain)
    record("camera cannot go below the terrain", under.pos[1] >= 14.19 && low.pos[1] >= 14.19, `asked for Y = -40 over the camp pad (ground 13.0 m): camera at Y = ${under.pos[1].toFixed(2)}; after holding Q, Y = ${low.pos[1].toFixed(2)}`);
  }

  // 6. No React re-render per frame
  {
    await page.keyboard.press("Escape");
    await settle(page, OVERVIEW, 6000);
    const before = await page.evaluate(() => ({ commits: window.__TWIN__.reactCommits(), frames: window.__TWIN__.loop.frames() }));
    await page.mouse.move(500, 450);
    await page.mouse.down();
    const end = Date.now() + 5000;
    let i = 0;
    while (Date.now() < end) {
      i++;
      await page.mouse.move(720 + Math.sin(i / 20) * 300, 450 + Math.cos(i / 15) * 60);
      await sleep(16);
    }
    await page.mouse.up();
    const after = await page.evaluate(() => ({ commits: window.__TWIN__.reactCommits(), frames: window.__TWIN__.loop.frames() }));
    const commits = after.commits - before.commits;
    const frames = after.frames - before.frames;
    const measured = after.commits > 0; // a production build never reports a commit
    record("no React re-render per frame (5 s of orbiting)", measured ? commits === 0 : null, measured ? `${commits} React commits over ${frames} frames` : `not measured in this build: ${frames} frames drawn`);
    await shot(page, `shell-${LABEL}-noon-orbited.jpg`);
  }

  // 7. URL follows the store
  {
    await page.evaluate(() => window.__TWIN__.rig.flyTo("switchyard"));
    await sleep(1200);
    const withPlace = new URL(page.url()).searchParams;
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 100);
    await page.evaluate(() => window.__TWIN__.sim.clock.setLive());
    await sleep(1200);
    const cleared = new URL(page.url()).searchParams;
    await page.evaluate(() => window.__TWIN__.store.setState({ selection: { kind: "facility", id: "powerhouse" } }));
    await page.evaluate(() => window.__TWIN__.sim.clock.setManual(6 * 60 + 5, 0));
    await sleep(1200);
    const more = new URL(page.url()).searchParams;
    record("store changes reach the URL", withPlace.get("place") === "switchyard" && withPlace.get("t") === "1200" && cleared.get("place") === null && cleared.get("t") === null && more.get("sel") === "facility:powerhouse" && more.get("t") === "0605" && more.get("v") === "2" && more.get("debug") === "1", `after fly-to: ?${withPlace}; after wheel and Live: ?${cleared}; after select and 06:05: ?${more}`);
  }

  // 8. A lost device is rebuilt with the view kept
  {
    await page.evaluate(() => window.__TWIN__.rig.flyTo("switchyard"));
    await settle(page, PLACES.switchyard);
    await page.evaluate(() => {
      window.__oldRenderer = window.__TWIN__.renderer;
      window.__TWIN__.renderer.onDeviceLost({ api: "test", message: "simulated loss", reason: null });
    });
    let rebuilt = false;
    try {
      await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.renderer !== window.__oldRenderer && window.__TWIN__.loop.frames() > 0 && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 60000 });
      rebuilt = true;
    } catch {}
    await sleep(1500);
    const kept = rebuilt && (await atPose(page, PLACES.switchyard, 1));
    const lum2 = rebuilt ? await brightness(page) : 0;
    record("lost device: renderer rebuilt, view kept", rebuilt && kept && lum2 > 20, rebuilt ? `new renderer drawing, mean brightness ${lum2.toFixed(0)}, camera ${kept ? "where it was" : "moved"}` : "no new renderer within 60 s");
  }
  await page.close();
}

// 9. Reloading a URL with ?place= and ?t= restores that view and time
{
  const { page } = await open(context, "&place=switchyard&t=1830");
  await sleep(800);
  const s = await state(page);
  const exact = await page.evaluate(() => window.__TWIN__.sim.clock.minutes());
  const okPose = await atPose(page, PLACES.switchyard);
  const dusk = await brightness(page);
  await shot(page, `shell-${LABEL}-1830-switchyard.jpg`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.loop.frames() > 10 && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 120000 });
  await sleep(800);
  const s2 = await state(page);
  const okPose2 = await atPose(page, PLACES.switchyard);
  const q = new URL(page.url()).searchParams;
  record("?place= and ?t= restore the view and the time", okPose && okPose2 && s.clock.mode === "manual" && exact === 1110 && s2.clock.minutes === 1110 && s2.camera.place === "switchyard" && q.get("place") === "switchyard" && q.get("t") === "1830", `camera at the switchyard view on load ${okPose} and after reload ${okPose2}; clock ${s2.clock.mode} at ${s2.clock.minutes} minutes; URL ?${q}`);

  // v1's ?preset= key, and the time of day actually changing the light
  await page.goto(url("&preset=temfacil&t=0200"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TWIN__ && window.__TWIN__.loop.frames() > 10 && window.__TWIN__.scene.getObjectByName("ground"), null, { timeout: 120000 });
  await sleep(1200);
  const night = await brightness(page);
  const q2 = new URL(page.url()).searchParams;
  const nightTris = await page.evaluate(() => window.__TWIN__.stats().tris);
  await shot(page, `shell-${LABEL}-0200-camp.jpg`);
  record("?preset= maps to ?place=; night is darker than noon and not black", (await atPose(page, PLACES.temfacil)) && q2.get("place") === "temfacil" && q2.get("preset") === null && nightTris > 0 && night < results.noon * 0.6 && night > 20 && dusk > 20, `URL ?${q2}; mean brightness 12:00 ${results.noon.toFixed(0)}, 18:30 ${dusk.toFixed(0)}, 02:00 ${night.toFixed(0)}`);
  await page.close();
}
await context.close();

// 10. Touch cancels a fly-to
{
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(BROWSER === "firefox" ? {} : { isMobile: true }), deviceScaleFactor: 2 });
  const { page } = await open(touch, "&t=1200");
  await sleep(500);
  const start = await pose(page);
  await page.evaluate(() => window.__TWIN__.rig.flyTo("temfacil"));
  await sleep(250);
  const was = await flying(page);
  await page.touchscreen.tap(195, 500);
  const still = await flying(page);
  await frame(page);
  const a = await pose(page);
  await sleep(600);
  const b = await pose(page);
  record("fly-to cancelled by touch", was && !still && dist(a.pos, b.pos) < 1 && dist(b.pos, PLACES.temfacil.pos) > 20, `flying before ${was}, after ${still}; moved ${dist(a.pos, b.pos).toFixed(2)} m in the next 0.6 s`);
  record("upright screen: overview stands further back", dist(start.pos, OVERVIEW.target) > dist(OVERVIEW.pos, OVERVIEW.target) * 1.3, `camera ${dist(start.pos, OVERVIEW.target).toFixed(0)} m from the site centre against ${dist(OVERVIEW.pos, OVERVIEW.target).toFixed(0)} m on a wide screen`);
  await shot(page, `shell-${LABEL}-phone.jpg`);
  await touch.close();
}

// 11. prefers-reduced-motion turns eases into cuts
{
  const calm = await browser.newContext({ viewport: VIEW, reducedMotion: "reduce" });
  const { page } = await open(calm, "&t=1200");
  await page.evaluate(() => window.__TWIN__.rig.flyTo("switchyard"));
  const isFlying = await flying(page);
  await frame(page);
  const there = await atPose(page, PLACES.switchyard);
  await page.keyboard.press("Escape");
  await frame(page);
  const back = await atPose(page, OVERVIEW);
  record("reduced motion: fly-to and Escape are cuts", !isFlying && there && back, `at the place one frame later ${there}; back at the overview one frame after Escape ${back}`);
  await calm.close();
}

// 12. The first frame is never black (P01a saw one black start in the dev server)
if (RELOADS > 0) {
  const ctx = await browser.newContext({ viewport: VIEW });
  let dark = 0;
  let twice = 0;
  let errorsSeen = 0;
  const times = [];
  for (let i = 0; i < RELOADS; i++) {
    const { page, errors, startMs } = await open(ctx, "&t=1200");
    await sleep(400);
    const lum = await brightness(page);
    const drawn = await page.evaluate(() => ({ tris: window.__TWIN__.stats().tris, contexts: window.__contexts, rigs: window.__TWIN__.rig.builds(), hit: window.__TWIN__.pick(720, 600) }));
    if (lum < 20 || drawn.tris === 0 || !drawn.hit) dark++;
    if (drawn.contexts > 1 || drawn.rigs > 1) twice++;
    errorsSeen += errors.length;
    times.push(startMs);
    await page.close();
  }
  times.sort((a, b) => a - b);
  record(`${RELOADS} loads, none black or empty`, dark === 0 && twice === 0 && errorsSeen === 0, `${dark} dark or without terrain, ${twice} with a second renderer or camera rig started, ${errorsSeen} console errors; ready in ${times[0]} to ${times[times.length - 1]} ms, median ${times[Math.floor(times.length / 2)]} ms`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => r.pass === false);
fs.writeFileSync(path.join(OUT, `check-${LABEL}.json`), JSON.stringify({ label: LABEL, base: BASE, browser: BROWSER, forcedWebGL: FORCE, when: new Date().toISOString(), info: results.info, results }, null, 1));
console.log(`\n${results.filter((r) => r.pass === true).length} passed, ${failed.length} failed, ${results.filter((r) => r.pass === null).length} not measured`);
process.exit(failed.length ? 1 : 0);
