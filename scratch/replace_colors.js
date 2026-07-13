/* eslint-disable */
const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'app/(dashboard)/dashboard/sitemap/SiteMapSVG.tsx',
  'app/(dashboard)/dashboard/sitemap/SiteMapClient.tsx',
  'app/(dashboard)/dashboard/weather/HistoricalWeatherCharts.tsx',
  'app/(dashboard)/dashboard/weather/page.tsx',
  'app/(dashboard)/dashboard/weather/WeatherChart.tsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace utility classes
  content = content.replace(/bg-\[#080E12\]/g, 'bg-bg-base');
  content = content.replace(/bg-\[#0f1115\]/g, 'bg-bg-panel');
  content = content.replace(/bg-\[#0B1418\]/g, 'bg-bg-base');
  content = content.replace(/border-white\/10/g, 'border-border-hairline');
  content = content.replace(/border-white\/\[0\.08\]/g, 'border-border-hairline');
  content = content.replace(/bg-white\/5/g, 'dark:bg-white/5 bg-black/5');
  content = content.replace(/bg-white\/10/g, 'dark:bg-white/10 bg-black/10');
  content = content.replace(/hover:bg-white\/10/g, 'dark:hover:bg-white/10 hover:bg-black/10');
  content = content.replace(/bg-white\/\[0\.02\]/g, 'dark:bg-white/[0.02] bg-black/[0.02]');
  content = content.replace(/bg-white\/\[0\.03\]/g, 'dark:bg-white/[0.03] bg-black/[0.03]');
  content = content.replace(/bg-white\/\[0\.04\]/g, 'dark:bg-white/[0.04] bg-black/[0.04]');
  content = content.replace(/hover:bg-white\/\[0\.04\]/g, 'dark:hover:bg-white/[0.04] hover:bg-black/[0.04]');
  content = content.replace(/ring-white\/10/g, 'ring-border-hairline');
  content = content.replace(/text-white\/70/g, 'text-text-muted');
  content = content.replace(/hover:text-white/g, 'hover:text-text-primary');
  content = content.replace(/text-white/g, 'text-text-primary');
  
  // Custom SVG replacements for SiteMapSVG
  if (file.includes('SiteMapSVG.tsx')) {
    content = content.replace(/fill="#0A1210"/g, 'fill="var(--bg-base)"');
    content = content.replace(/fill="#0D1612"/g, 'fill="var(--bg-base)"');
    content = content.replace(/fill="#152018"/g, 'fill="var(--bg-panel-raised)"');
    content = content.replace(/fill="#090d0b"/g, 'fill="var(--bg-panel-raised)"');
    content = content.replace(/stroke="#1E2E23"/g, 'stroke="var(--border-hairline)"');
    content = content.replace(/fill="white"/g, 'fill="var(--text-primary)"');
    content = content.replace(/fill="#FFFFFF"/g, 'fill="var(--text-primary)"');
    content = content.replace(/stroke="#E2E8F0"/g, 'stroke="var(--border-hairline)"');
  }

  // WeatherCharts specific
  if (file.includes('HistoricalWeatherCharts.tsx') || file.includes('WeatherChart.tsx')) {
    content = content.replace(/stroke="rgba\(255,255,255,0\.1\)"/g, 'stroke="var(--border-hairline)"');
    content = content.replace(/fill="rgba\(255,255,255,0\.5\)"/g, 'fill="var(--text-muted)"');
    content = content.replace(/fill="#EDEFF1"/g, 'fill="var(--text-primary)"');
  }
  
  fs.writeFileSync(fullPath, content);
  console.log('Updated ' + file);
});
