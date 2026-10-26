// Takes screenshots of the main screens in one theme, for looking at the design.
//
//   npm run dev
//   node scripts/shoot.mjs light            (or dark)  -> audit-shots/<theme>-<screen>.png
//   node scripts/shoot.mjs light --phone
//
// Uses your installed Chrome or Edge through playwright-core; set CHROME_PATH to override.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const scheme = args.find((a) => a === 'light' || a === 'dark') ?? 'light';
const phone = args.includes('--phone');
const BASE = 'http://localhost:3000';
const OUT = path.resolve('audit-shots');
fs.mkdirSync(OUT, { recursive: true });

const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const view = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: scheme, viewport: view });
// The site has its own theme setting (default dark); the OS scheme only matters when it is set to System.
await context.addInitScript((t) => { try { localStorage.setItem('site-settings', JSON.stringify({ state: { theme: t }, version: 2 })); } catch {} }, scheme);
const suffix = `${scheme}${phone ? '-phone' : ''}`;

const SUNSHOT = '/editor?w=2907129557&m=pve';
const HAWK = '/editor?w=3856705927&m=pve';
const shots = [
  { name: 'home', path: '/', full: true },
  { name: 'editor-top', path: SUNSHOT, ready: '.editor-grid' },
  { name: 'editor-perks', path: HAWK, ready: '.editor-grid', scrollTo: 'Weapon Perks' },
  { name: 'editor-effects', path: HAWK, ready: '.editor-grid', scrollTo: 'Perk Effects' },
  { name: 'editor-data', path: SUNSHOT, ready: '.editor-grid', scrollTo: 'Weapon Data' },
  { name: 'credits', path: '/credits', full: true },
  { name: 'filters', path: SUNSHOT, ready: '.editor-grid', act: async (page) => { await page.getByTitle('Filters').click(); await page.waitForTimeout(600); } },
  { name: 'settings', path: SUNSHOT, ready: '.editor-grid', act: async (page) => { await page.getByTitle(/settings/i).first().click(); await page.waitForTimeout(600); } },
  { name: 'compare', path: SUNSHOT, ready: '.editor-grid', act: async (page) => { await page.getByRole('button', { name: /add to compare/i }).first().click(); await page.waitForTimeout(300); await page.getByRole('tab', { name: /compare/i }).or(page.getByRole('button', { name: /^compare/i })).first().click(); await page.waitForTimeout(900); } },
  { name: 'buffs', path: HAWK, ready: '.editor-grid', scrollTo: 'External Buffs', act: async (page) => { await page.getByRole('heading', { name: /external buffs/i }).click(); await page.waitForTimeout(700); } },
];
for (const s of shots) {
  const page = await context.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  if (s.ready) { await page.waitForSelector(s.ready, { timeout: 30000 }); await page.waitForTimeout(1200); }
  if (s.scrollTo) {
    await page.evaluate((t) => { const el = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim().startsWith(t)); el?.scrollIntoView({ block: 'start' }); }, s.scrollTo);
    await page.waitForTimeout(500);
  }
  if (s.act) { try { await s.act(page); } catch (e) { console.log('act failed', s.name, String(e).slice(0, 120)); } }
  await page.screenshot({ path: path.join(OUT, `${suffix}-${s.name}.png`), fullPage: !!s.full });
  await page.close();
}
await browser.close();
console.log(`saved ${shots.length} screenshots to audit-shots/ (${suffix})`);
