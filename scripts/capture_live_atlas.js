const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/dashboard/projects-map...');
  await page.goto('http://localhost:3000/dashboard/projects-map', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 5s for WebGL and 3D Canvas initialization...');
  await page.waitForTimeout(5000);

  const artifactsDir = 'C:\\Users\\Harrold\\.gemini\\antigravity-ide\\brain\\b117bd5e-4655-44dc-9078-f8af53ab1dee';
  const companionPath = path.join(artifactsDir, 'atlas1_live_companion.png');
  await page.screenshot({ path: companionPath });
  console.log(`Saved companion screenshot: ${companionPath}`);

  // Find and click the avatar button
  console.log('Looking for avatar button...');
  const avatarBtn = page.locator('button[aria-label*="SCIC Atlas Navigator"]');
  if (await avatarBtn.count() > 0) {
    console.log('Clicking avatar button to open workspace...');
    await avatarBtn.first().click();
    await page.waitForTimeout(2000);

    const workspacePath = path.join(artifactsDir, 'atlas1_live_workspace.png');
    await page.screenshot({ path: workspacePath });
    console.log(`Saved workspace screenshot: ${workspacePath}`);
  } else {
    console.log('Avatar button selector not found directly, clicking bottom right area...');
    await page.mouse.click(1860, 980);
    await page.waitForTimeout(2000);
    const workspacePath = path.join(artifactsDir, 'atlas1_live_workspace.png');
    await page.screenshot({ path: workspacePath });
    console.log(`Saved workspace screenshot: ${workspacePath}`);
  }

  await browser.close();
  console.log('Browser closed cleanly.');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
