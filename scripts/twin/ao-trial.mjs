/**
 * The occlusion trial (P02e): what each screen-space occlusion setting costs at the gate, on the
 * production build, at the owner's full-HD screen. Each setting is opened in a page of its own
 * (`?ao=&aosamples=&aoup=`, engine/post.ts), the gate's loop is held at a quiet moment, and the frame
 * time is the median of several runs with the frame cap off, as in scripts/twin/cost.mjs.
 *
 *   npx next build && npx next start -p 3100      # (the "twin-bench" preview)
 *   node scripts/twin/ao-trial.mjs [label] [--size=1920x1080] [--repeat=5] [--seconds=4] [--only=off,half8,...]
 *
 * Writes .cache/bench/twin2-ao-<label>.json and prints a table. The look is judged from stills taken
 * with scripts/twin/capture-gate.mjs --query=ao=...&aosamples=...&aoup=... in a visible window.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const LABEL = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "run";
const BASE = arg("base", "http://localhost:3100");
const [VW, VH] = arg("size", "1920x1080").split("x").map(Number);
const REPEAT = Number(arg("repeat", "5"));
const SECONDS = Number(arg("seconds", "4"));
const PLACE = arg("place", "gate-approach");

export const SETTINGS = {
  off: "ao=off",
  half8: "ao=half&aosamples=8&aoup=0",
  half6: "ao=half&aosamples=6&aoup=0",
  half4: "ao=half&aosamples=4&aoup=0",
  half6up: "ao=half&aosamples=6&aoup=1",
  quarter8up: "ao=quarter&aosamples=8&aoup=1",
  quarter6up: "ao=quarter&aosamples=6&aoup=1",
  quarter4up: "ao=quarter&aosamples=4&aoup=1",
  full16: "ao=full&aosamples=16&aoup=0",
};
const ONLY = arg("only", Object.keys(SETTINGS).join(",")).split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
});

async function measure(name, query) {
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/digital-twin?v=2&debug=1&t=1200&dynres=0&q=medium&place=${PLACE}&${query}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => window.__TWIN__?.lamps && window.__TWIN__.gate.status().actors >= 5 && window.__TWIN__.streaming.stats().tasksQueued === 0 && window.__TWIN__.lamps.isReady(), null, { timeout: 300_000 });
  await page.evaluate(() => {
    window.__TWIN__.gate.seek(14);
    window.__TWIN__.gate.hold(true);
  });
  await sleep(5000);
  const runs = [];
  for (let i = 0; i < REPEAT; i++) {
    runs.push(
      await page.evaluate(
        (dur) =>
          new Promise((resolve) => {
            let frames = 0;
            const start = performance.now();
            const tick = (now) => {
              frames++;
              if (now - start < dur) requestAnimationFrame(tick);
              else resolve((now - start) / frames);
            };
            requestAnimationFrame(tick);
          }),
        SECONDS * 1000,
      ),
    );
  }
  const stats = await page.evaluate(() => {
    const s = window.__TWIN__.stats();
    return { programs: s.programs, calls: s.calls, pixelRatio: s.pixelRatio };
  });
  await context.close();
  const ms = median(runs);
  return { name, query, ms: Number(ms.toFixed(2)), fps: Number((1000 / ms).toFixed(1)), runs: runs.map((r) => Number(r.toFixed(2))), ...stats, errors };
}

const rows = [];
for (const name of ONLY) {
  const row = await measure(name, SETTINGS[name]);
  rows.push(row);
  console.log(`${name.padEnd(12)} ${row.ms.toFixed(2)} ms  ${row.fps} fps  pipelines ${row.programs}  runs ${row.runs.join(" ")}${row.errors.length ? `  errors: ${row.errors[0]}` : ""}`);
}
await browser.close();
const off = rows.find((r) => r.name === "off");
if (off) for (const r of rows) console.log(`${r.name.padEnd(12)} occlusion costs ${(r.ms - off.ms).toFixed(2)} ms`);
fs.mkdirSync(path.join(".cache", "bench"), { recursive: true });
const file = path.join(".cache", "bench", `twin2-ao-${LABEL}.json`);
fs.writeFileSync(file, JSON.stringify({ label: LABEL, at: new Date().toISOString(), size: [VW, VH], place: PLACE, rows }, null, 1));
console.log(`wrote ${file}`);
