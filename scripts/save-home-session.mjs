/**
 * Saves a signed-in browser session for the Nexus Home scripts (screenshot-home.mjs, audit-home.mjs).
 *
 *   node scripts/save-home-session.mjs
 *
 * Opens a browser window on the sign-in page of the dev server. YOU sign in there, by hand: the
 * script never types or reads a password. When the app reaches /home it saves the session's
 * cookies to .cache/home-auth.json (a git-ignored folder) and closes the window. Then:
 *
 *   HOME_SHOT_STATE=.cache/home-auth.json node scripts/audit-home.mjs
 *
 * The file is a login session: treat it like a password and delete it when you are done.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.HOME_SHOT_BASE || "http://localhost:3000";
const OUT = path.join(".cache", "home-auth.json");
const WAIT_MS = 10 * 60_000;
fs.mkdirSync(".cache", { recursive: true });

const browser = await chromium.launch({ headless: false });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/home`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  console.log("A browser window is open on the sign-in page. Sign in there; this waits up to ten minutes.");
  await page.waitForURL((url) => url.pathname === "/home", { timeout: WAIT_MS });
  await page.waitForSelector("#legacy", { timeout: 180_000 });
  await context.storageState({ path: OUT });
  console.log(`Signed in. Session saved to ${OUT}.`);
} catch (err) {
  console.log("No session was saved:", String(err).slice(0, 200));
  process.exitCode = 1;
} finally {
  await browser.close();
}
