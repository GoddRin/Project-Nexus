/**
 * What one page downloads, grouped by where it comes from (Playwright, headless, production build).
 *
 *   node scripts/bench-network.mjs /dashboard/projects-map [seconds] [phone]
 *
 * Lists every group of requests the page makes in its first N seconds (default 20) with the
 * number of requests and the bytes received, largest first, then the ten largest single files.
 */
import { chromium } from "playwright";

const BASE = process.env.BENCH_BASE || "http://localhost:3100";
const url = process.argv[2] || "/dashboard/projects-map";
const seconds = Number(process.argv[3] || 20);
const phone = process.argv[4] === "phone";

const browser = await chromium.launch();
try {
  const context = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => window.sessionStorage.setItem("nexus-intro", "1"));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  const byId = new Map();
  cdp.on("Network.responseReceived", (e) => byId.set(e.requestId, { url: e.response.url, type: e.type, bytes: 0 }));
  cdp.on("Network.loadingFinished", (e) => {
    const r = byId.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });
  const t0 = Date.now();
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(seconds * 1000);
  const rows = [...byId.values()];
  const groupOf = (u) => {
    const x = new URL(u);
    if (x.host !== new URL(BASE).host) return x.host + "/" + x.pathname.split("/").slice(1, 3).join("/").replace(/\d+/g, "#");
    const p = x.pathname;
    if (p.startsWith("/_next/static")) return "app: scripts and styles (/_next/static)";
    if (p.startsWith("/_next/image")) return "app: optimised images (/_next/image)";
    return "app: " + p.split("/").slice(0, 3).join("/") + (p.split("/").length > 3 ? "/…" : "");
  };
  const groups = new Map();
  for (const r of rows) {
    const g = groupOf(r.url);
    const cur = groups.get(g) ?? { n: 0, bytes: 0 };
    cur.n++;
    cur.bytes += r.bytes;
    groups.set(g, cur);
  }
  const total = rows.reduce((n, r) => n + r.bytes, 0);
  console.log(`${url} (${phone ? "phone" : "desktop"}): ${rows.length} requests, ${(total / 1048576).toFixed(1)} MB in ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const [g, v] of [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 22)) console.log(`  ${(v.bytes / 1024).toFixed(0).padStart(7)} KB  ${String(v.n).padStart(3)} req  ${g}`);
  console.log("  largest files:");
  for (const r of rows.sort((a, b) => b.bytes - a.bytes).slice(0, 12)) console.log(`  ${(r.bytes / 1024).toFixed(0).padStart(7)} KB  ${r.type.padEnd(10)} ${r.url.replace(BASE, "").slice(0, 110)}`);
} finally {
  await browser.close();
}
