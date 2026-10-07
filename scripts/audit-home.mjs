/**
 * Accessibility, layout and weight audit of Nexus Home (Playwright + axe-core, headless).
 *
 *   node scripts/audit-home.mjs
 *
 * Runs against the dev server on http://localhost:3000. /home is behind sign-in, so it needs a
 * signed-in Playwright storage state: HOME_SHOT_STATE=<storageState.json> (sign in once in a
 * Playwright browser and save the state; sign-in is never bypassed). It reports:
 *   - axe-core violations inside the page's own content (WCAG 2 A and AA), in both themes;
 *   - the heading outline, and controls without an accessible name;
 *   - horizontal overflow at 320, 390, 768, 1024, 1440 and 1920 px;
 *   - touch targets under 24 px on a phone;
 *   - what still moves under prefers-reduced-motion;
 *   - layout shift after load, the number of DOM nodes, and what the page downloads.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.HOME_SHOT_BASE || "http://localhost:3000";
const PAGE = process.env.HOME_SHOT_PATH || "/home";
const STATE = process.env.HOME_SHOT_STATE;
const ROOT = "main .max-w-7xl"; // the page's own content (the app's sidebar and top bar are not part of this audit)
const axeSource = fs.readFileSync(path.join("node_modules", "axe-core", "axe.min.js"), "utf8");

const browser = await chromium.launch();
const open = async (opts) => {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...(STATE ? { storageState: STATE } : {}), ...opts });
  await context.addInitScript((t) => {
    window.localStorage.setItem("theme", t);
    window.sessionStorage.setItem("nexus-intro", "1");
  }, opts.colorScheme);
  const page = await context.newPage();
  await page.goto(BASE + PAGE, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForSelector("#legacy", { timeout: 180_000 });
  // walk the page once so every in-view reveal has played, then return to the top
  await page.evaluate(async (root) => {
    // (whichever element scrolls at this width: step through the page's own blocks)
    const blocks = [...document.querySelector(root).querySelectorAll("section, header, footer, [id], .glass-scic-card")];
    for (const el of blocks) {
      el.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 120));
    }
    document.querySelector(root).scrollIntoView({ block: "start" });
  }, ROOT);
  await page.waitForTimeout(3500);
  return { context, page };
};

try {
  // ── axe, both themes ─────────────────────────────────────────────────────────────────────
  for (const colorScheme of ["dark", "light"]) {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme });
    await page.evaluate(axeSource);
    const result = await page.evaluate(async (root) => {
      const r = await window.axe.run(document.querySelector(root), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${(n.any[0]?.message || n.failureSummary || "").slice(0, 150)}`) }));
    }, ROOT);
    console.log(`\n[axe · ${colorScheme}] ${result.length ? result.length + " rule(s) with violations" : "no violations"}`);
    for (const v of result) console.log(`  ${v.impact} · ${v.id} (${v.n}): ${v.help}\n${v.sample.map((s) => "      " + s).join("\n")}`);

    if (colorScheme === "dark") {
      const outline = await page.evaluate((root) => [...document.querySelector(root).querySelectorAll("h1,h2,h3,h4")].filter((h) => h.offsetParent !== null || h.classList.contains("sr-only")).map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 44)}`), ROOT);
      const h1 = outline.filter((o) => o.startsWith("H1")).length;
      console.log(`\n[headings] ${outline.length} headings, ${h1} h1`);
      let last = 0;
      const jumps = [];
      for (const o of outline) {
        const level = Number(o[1]);
        if (last && level > last + 1) jumps.push(o);
        last = level;
      }
      console.log(jumps.length ? "  skipped levels at: " + jumps.join(" | ") : "  no skipped levels");
      const unnamed = await page.evaluate((root) =>
        [...document.querySelector(root).querySelectorAll("a[href], button, [role=button], [role=tab], [role=slider], input, select, textarea")]
          .filter((el) => el.offsetParent !== null)
          .filter((el) => !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent.trim() || el.getAttribute("title") || el.querySelector("img[alt]:not([alt=''])")))
          .map((el) => el.outerHTML.slice(0, 120)), ROOT);
      console.log(`[names] controls without an accessible name: ${unnamed.length}${unnamed.length ? "\n  " + unnamed.slice(0, 6).join("\n  ") : ""}`);
      const stats = await page.evaluate((root) => ({
        nodes: document.querySelector(root).querySelectorAll("*").length,
        imgsNoAlt: [...document.querySelector(root).querySelectorAll("img:not([alt])")].length,
        tabStops: [...document.querySelector(root).querySelectorAll("a[href], button:not([disabled]), [tabindex='0'], input, select, textarea")].filter((el) => el.offsetParent !== null && el.tabIndex >= 0).length,
      }), ROOT);
      console.log(`[size] ${stats.nodes} DOM nodes in the page content · ${stats.tabStops} tab stops · images without alt: ${stats.imgsNoAlt}`);
    }
    await context.close();
  }

  // ── widths: overflow ─────────────────────────────────────────────────────────────────────
  console.log("\n[widths]");
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const { context, page } = await open({ viewport: { width, height: 900 }, colorScheme: "dark" });
    const r = await page.evaluate((root) => {
      const over = document.documentElement.scrollWidth > window.innerWidth + 1;
      const wide = [...document.querySelector(root).querySelectorAll("*")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          if (!b.width || b.right <= window.innerWidth + 1) return false;
          // (things inside a sideways scroller are meant to run past the edge)
          for (let p = el.parentElement; p; p = p.parentElement) if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return false;
          return true;
        })
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")}`);
      return { over, wide: [...new Set(wide)].slice(0, 5) };
    }, ROOT);
    console.log(`  ${String(width).padStart(4)} px: ${r.over ? "PAGE SCROLLS SIDEWAYS" : "no sideways scroll"}${r.wide.length ? " · past the edge: " + r.wide.join(", ") : ""}`);
    if (width === 390) {
      // (the map's markers grow in over about three seconds once the map has been seen)
      await page.evaluate(() => document.querySelector(".home-dotmap")?.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(4500);
      const small = await page.evaluate((root) =>
        [...document.querySelector(root).querySelectorAll("a[href], button, [role=tab]")]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ el, b: el.getBoundingClientRect() }))
          .filter(({ b }) => b.width > 0 && (b.width < 24 || b.height < 24))
          .map(({ el, b }) => `${Math.round(b.width)}x${Math.round(b.height)} ${(el.getAttribute("aria-label") || el.textContent.trim()).slice(0, 40)}`), ROOT);
      console.log(`       touch targets under 24 px: ${small.length}${small.length ? "\n         " + [...new Set(small)].slice(0, 12).join("\n         ") : ""}`);
    }
    await context.close();
  }

  // ── reduced motion ───────────────────────────────────────────────────────────────────────
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
    const moving = await page.evaluate((root) =>
      document.getAnimations().filter((a) => a.playState === "running" && document.querySelector(root).contains(a.effect?.target))
        .map((a) => `${a.animationName || a.transitionProperty || "anim"} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(" ")[0]} (${a.effect.getTiming().iterations === Infinity ? "endless" : "once"})`), ROOT);
    console.log(`\n[reduced motion] animations still running: ${moving.length}${moving.length ? "\n  " + [...new Set(moving)].slice(0, 12).join("\n  ") : ""}`);
    await context.close();
  }

  // ── weight and stability ─────────────────────────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", ...(STATE ? { storageState: STATE } : {}) });
    await context.addInitScript(() => {
      window.sessionStorage.setItem("nexus-intro", "1");
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        const e = list.getEntries().pop();
        window.__lcp = { t: Math.round(e.startTime), what: (e.element?.tagName || "") + " " + String(e.url || e.element?.textContent || "").slice(-60) };
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const page = await context.newPage();
    const got = [];
    page.on("response", async (r) => {
      const type = r.request().resourceType();
      const len = Number(r.headers()["content-length"] || 0);
      got.push({ type, len, url: r.url() });
    });
    await page.goto(BASE + PAGE, { waitUntil: "domcontentloaded", timeout: 240_000 });
    await page.waitForSelector("#legacy", { timeout: 180_000 });
    await page.waitForTimeout(6000);
    const first = await page.evaluate(() => ({ cls: Number(window.__cls.toFixed(3)), lcp: window.__lcp }));
    const byType = {};
    for (const g of got) {
      byType[g.type] ??= { n: 0, kb: 0 };
      byType[g.type].n++;
      byType[g.type].kb += g.len / 1024;
    }
    console.log(`\n[first screen, before any scrolling] layout shift (CLS): ${first.cls} · largest paint: ${first.lcp?.what} at ${first.lcp?.t} ms (dev server: not a production timing)`);
    console.log("  requests: " + Object.entries(byType).map(([t, v]) => `${t} ${v.n} (${Math.round(v.kb)} KB)`).join(" · "));
    const imgs = got.filter((g) => g.type === "image").sort((a, b) => b.len - a.len).slice(0, 5).map((g) => `${Math.round(g.len / 1024)} KB ${decodeURIComponent(g.url).split("/").pop().slice(0, 70)}`);
    console.log("  largest images: " + imgs.join(" | "));
    await context.close();
  }
} catch (err) {
  console.log("AUDIT ERROR", String(err).slice(0, 500));
} finally {
  await browser.close();
}
