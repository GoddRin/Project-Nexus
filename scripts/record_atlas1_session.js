const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function recordSession() {
  const artifactsDir = 'C:\\Users\\Harrold\\.gemini\antigravity-ide\\brain\\b117bd5e-4655-44dc-9078-f8af53ab1dee';
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: artifactsDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  console.log('Navigating to map...');
  await page.goto('http://localhost:3000/dashboard/projects-map', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 5s for 3D load...');
  await page.waitForTimeout(5000);

  // Hover over avatar in companion mode
  console.log('Hovering over companion avatar...');
  await page.mouse.move(1520, 820);
  await page.waitForTimeout(1000);
  await page.mouse.move(1550, 800);
  await page.waitForTimeout(1000);

  // Click avatar to open workspace
  console.log('Opening workspace...');
  const avatarBtn = page.locator('button[aria-label*="SCIC Atlas Navigator"]');
  if (await avatarBtn.count() > 0) {
    await avatarBtn.first().click();
  } else {
    await page.mouse.click(1530, 820);
  }
  await page.waitForTimeout(2000);

  // Click a prompt chip
  console.log('Clicking prompt chip...');
  const promptChip = page.locator('button:has-text("Show ongoing hydropower projects")');
  if (await promptChip.count() > 0) {
    await promptChip.first().click();
    await page.waitForTimeout(4000);
  }

  // Take screenshot of query result
  const queryResultPath = path.join(artifactsDir, 'atlas1_live_query_result.png');
  await page.screenshot({ path: queryResultPath });
  console.log(`Saved query result screenshot: ${queryResultPath}`);

  await context.close();
  await browser.close();
  console.log('Session recording complete.');
}

recordSession().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});
