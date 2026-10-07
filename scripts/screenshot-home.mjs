/**
 * Screenshots of Nexus Home in light and dark, at 1440 px and 390 px (Playwright, headless).
 *
 *   HOME_SHOT_STATE=<storageState.json> node scripts/screenshot-home.mjs
 *
 * Needs the dev server on http://localhost:3000 (or HOME_SHOT_BASE). /home is behind sign-in, so
 * a signed-in Playwright storage state must be supplied (HOME_SHOT_STATE); without one nothing
 * is captured. HOME_SHOT_PATH and HOME_SHOT_NAME choose another page and file name.
 * Auth is never bypassed. Output: .cache/home-shots/<name>-<theme>-<width>.png
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.HOME_SHOT_BASE || "http://localhost:3000";
const PAGE = process.env.HOME_SHOT_PATH || "/home";
const STATE = process.env.HOME_SHOT_STATE;
const REDUCED = process.env.HOME_SHOT_REDUCED === "1";
const OUT = path.join(".cache", "home-shots");
const name = (process.env.HOME_SHOT_NAME || PAGE.split("/").filter(Boolean).pop() || "home") + (REDUCED ? "-reduced" : "");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 1,
        colorScheme: theme,
        reducedMotion: REDUCED ? "reduce" : "no-preference",
        ...(STATE ? { storageState: STATE } : {}),
      });
      // next-themes reads this key before first paint
      await context.addInitScript((t) => window.localStorage.setItem("theme", t), theme);
      const page = await context.newPage();
      const res = await page.goto(BASE + PAGE, { waitUntil: "networkidle", timeout: 120_000 });
      if (page.url().includes("/sign-in")) {
        console.log(`${PAGE} needs a signed-in session: nothing captured (supply HOME_SHOT_STATE).`);
        await context.close();
        continue;
      }
      // let in-view reveals play: walk down the page once, then return to the top
      await page.evaluate(async () => {
        const scroller = document.querySelector("main") || document.scrollingElement;
        const target = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : document.scrollingElement;
        for (let y = 0; y < target.scrollHeight; y += 500) {
          target.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        target.scrollTo(0, 0);
      });
      // the app scrolls inside its own panel, so "full page" would stop at one screen:
      // grow the window until that panel no longer needs to scroll
      const extra = await page.evaluate(() => {
        let most = 0;
        for (const el of document.querySelectorAll("main, div")) {
          const style = getComputedStyle(el);
          if (!/(auto|scroll)/.test(style.overflowY)) continue;
          most = Math.max(most, el.scrollHeight - el.clientHeight);
        }
        return most;
      });
      if (extra > 0) await page.setViewportSize({ width, height: Math.min(12000, (width === 390 ? 844 : 900) + extra) });
      await page.waitForTimeout(1500);
      const file = path.join(OUT, `${name}-${theme}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const info = await page.evaluate(() => ({
        dark: document.documentElement.classList.contains("dark"),
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      console.log(`${res?.status()} ${file} dark=${info.dark} horizontal-overflow=${info.overflowX}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
