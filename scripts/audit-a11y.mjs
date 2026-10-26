// Runs axe-core (WCAG 2.1 A and AA plus best practices) over the site's main screens, in both themes and at desktop
// and phone width, with the interactive states that matter open (filter panel, search suggestions, catalyst card).
//
//   npm run dev                      (in one terminal)
//   npm run audit:a11y               (in another)
//   npm run audit:a11y -- --verbose  (also print the offending HTML)
//
// Uses your installed Chrome or Edge through playwright-core. Exits 1 when anything is found. axe cannot judge
// everything (reading order, whether a label makes sense), so it complements a keyboard and screen-reader check
// rather than replacing one.
// If none is found in the usual places (typical on Linux or in a container, or with a Playwright-downloaded
// Chromium), set CHROME_PATH to the browser executable, for example
//   CHROME_PATH=/path/to/chromium/chrome-linux64/chrome npm run audit:a11y
import fs from 'fs';
import { createRequire } from 'module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const args = process.argv.slice(2);
const BASE = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3000';
const VERBOSE = args.includes('--verbose');

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH to a browser executable.');
  return found;
}

const SUNSHOT = '/editor?w=2907129557&m=pve'; // an exotic with a catalyst
// On a phone the weapon list is a drawer behind the bottom nav's Weapons button.
const openWeaponList = async (page) => {
  const phone = (page.viewportSize()?.width ?? 1440) < 720;
  // dispatched, not clicked: the dev server's overlay sits on top of this button.
  if (phone) { await page.getByRole('button', { name: 'Weapons', exact: true }).dispatchEvent('click'); await page.waitForTimeout(500); }
};
const ready = async (page) => { await page.waitForSelector('.editor-grid', { timeout: 30000 }); await page.waitForTimeout(600); };

const SCREENS = [
  { name: 'home', path: '/' },
  { name: 'credits', path: '/credits' },
  { name: 'editor', path: SUNSHOT, wait: ready },
  { name: 'editor, filter panel open', path: SUNSHOT, wait: ready, act: async (page) => { await openWeaponList(page); await page.getByTitle('Filters').click(); await page.waitForTimeout(500); } },
  {
    name: 'editor, search suggestions open', path: SUNSHOT, wait: ready, desktopOnly: true,
    act: async (page) => { const box = page.getByPlaceholder('Search weapons…'); await box.click(); await box.fill('spread'); await page.waitForTimeout(500); },
  },
  {
    name: 'editor, catalyst switched on', path: SUNSHOT, wait: ready,
    act: async (page) => { const sw = page.getByRole('switch', { name: /complete/i }); await sw.scrollIntoViewIfNeeded(); await sw.click(); await page.waitForTimeout(500); },
  },
  {
    name: 'compare', path: SUNSHOT, wait: ready,
    act: async (page) => { await page.getByRole('tab', { name: /compare/i }).or(page.getByRole('button', { name: /^compare/i })).first().click(); await page.waitForTimeout(800); },
  },
];

const VIEWS = [
  { name: 'desktop dark', width: 1440, height: 900, scheme: 'dark' },
  { name: 'desktop light', width: 1440, height: 900, scheme: 'light' },
  { name: 'phone dark', width: 375, height: 812, scheme: 'dark' },
  { name: 'phone light', width: 375, height: 812, scheme: 'light' },
];

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const axeSource = fs.readFileSync(AXE_PATH, 'utf8');
let problems = 0;
const lines = [];

for (const view of VIEWS) {
  const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: view.scheme, viewport: { width: view.width, height: view.height } });
  // The site has its own theme setting (default dark); the OS scheme only matters when it is set to System.
  await context.addInitScript((t) => { try { localStorage.setItem('site-settings', JSON.stringify({ state: { theme: t }, version: 2 })); } catch {} }, view.scheme);
  for (const screen of SCREENS) {
    if (screen.desktopOnly && view.width < 720) continue;
    const page = await context.newPage();
    try {
      await page.goto(BASE + screen.path, { waitUntil: 'networkidle' });
      if (screen.wait) await screen.wait(page);
      if (screen.act) await screen.act(page);
      await page.evaluate(axeSource);
      const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
      for (const v of results.violations) {
        problems += v.nodes.length;
        lines.push(`[${view.name}] ${screen.name}: ${v.id} (${v.impact}) x${v.nodes.length} - ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) {
          lines.push(`    ${n.target.join(' ')}`);
          if (VERBOSE) lines.push(`      ${n.html.slice(0, 160)}\n      ${(n.any[0] ?? n.all[0] ?? n.none[0])?.message ?? ''}`);
        }
      }
    } catch (e) {
      problems++;
      lines.push(`[${view.name}] ${screen.name}: could not run - ${String(e.message).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await context.close();
}
await browser.close();

console.log(lines.length ? lines.join('\n') : 'No violations.');
console.log(problems ? `\n${problems} problem(s) found.` : '\nAll screens passed.');
process.exit(problems ? 1 : 0);
