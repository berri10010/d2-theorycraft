// Dumps the accessibility tree (what a screen reader is given) of the main screens as YAML, for reading by eye.
//
//   npm run dev
//   node scripts/aria-dump.mjs            -> audit-shots/aria-<screen>.yml
//   node scripts/aria-dump.mjs --phone
//
// Uses your installed Chrome or Edge through playwright-core; set CHROME_PATH to override.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const phone = process.argv.includes('--phone');
const BASE = 'http://localhost:3000';
const OUT = path.resolve('audit-shots');
fs.mkdirSync(OUT, { recursive: true });

const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce', viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
const suffix = phone ? '-phone' : '';

const screens = [
  { name: 'home', path: '/' },
  { name: 'editor', path: '/editor?w=3856705927&m=pve', ready: '.editor-grid' },
  { name: 'credits', path: '/credits' },
];
for (const s of screens) {
  const page = await context.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  if (s.ready) { await page.waitForSelector(s.ready, { timeout: 30000 }); await page.waitForTimeout(1200); }
  const tree = await page.locator('body').ariaSnapshot();
  fs.writeFileSync(path.join(OUT, `aria-${s.name}${suffix}.yml`), tree);
  console.log(s.name, tree.split('\n').length, 'lines');
  await page.close();
}
await browser.close();
