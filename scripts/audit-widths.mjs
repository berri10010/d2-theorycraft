// Sweeps the site across window widths and reports layout problems.
//
//   npm run dev                      (in one terminal)
//   npm run audit:widths             (in another)
//   npm run audit:widths -- --shots  (also saves a screenshot per page and width to audit-shots/)
//
// For every page and width it checks: no horizontal page scroll, no element poking out of the window, and (on
// the editor) that the one/two-column layout matches the width the editor area has. Exits 1 on any problem.
// Uses your installed Chrome or Edge through playwright-core (no browser download); set CHROME_PATH to override.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };

const BASE = opt('url', 'http://localhost:3000');
const WIDTHS = [320, 375, 480, 640, 720, 768, 900, 1024, 1280, 1440, 1600, 1920];
const PAGES = [{ name: 'home', path: '/' }, { name: 'editor', path: '/editor' }, { name: 'credits', path: '/credits' }];
const SHOTS = path.resolve('audit-shots');

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

/** Runs in the page: anything wider than the window, and the editor's column layout. */
function inspect() {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
    // Ignore things clipped by a scroller or overflow-hidden ancestor that itself fits, and fixed overlays.
    let a = e.parentElement;
    let clipped = false;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      if (cs.position === 'fixed') { clipped = true; break; }
      if (/(hidden|auto|scroll|clip)/.test(cs.overflowX)) {
        const ar = a.getBoundingClientRect();
        if (ar.right <= vw + 1 && ar.left >= -1) { clipped = true; break; }
      }
      a = a.parentElement;
    }
    if (!clipped) bad.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  const shell = document.querySelector('.editor-shell');
  const grid = document.querySelector('.editor-grid');
  let editor = null;
  if (shell && grid) {
    const cs = getComputedStyle(shell);
    const content = shell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    editor = { content: Math.round(content), columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length };
  }
  return { vw, pageOverflow: document.documentElement.scrollWidth - vw, bad: bad.slice(0, 5), nbad: bad.length, editor };
}

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
if (flag('shots')) fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const rows = [];
for (const w of WIDTHS) {
  const page = await context.newPage();
  await page.setViewportSize({ width: w, height: 900 });
  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
    if (p.name === 'editor') await page.waitForSelector('.editor-grid', { timeout: 30000 });
    await page.waitForTimeout(300);
    const r = await page.evaluate(inspect);
    const problems = [];
    if (r.pageOverflow > 0) problems.push(`page scrolls sideways by ${r.pageOverflow}px`);
    if (r.nbad > 0) problems.push(`${r.nbad} element(s) outside the window, e.g. ${r.bad[0]}`);
    if (r.editor) {
      const wantTwo = r.editor.content >= 640;
      if ((r.editor.columns === 2) !== wantTwo) problems.push(`editor is ${r.editor.columns} column(s) at ${r.editor.content}px of room`);
    }
    if (problems.length) failures++;
    rows.push(`${String(w).padStart(5)}  ${p.name.padEnd(8)} ${r.editor ? `${r.editor.columns} col @ ${r.editor.content}px`.padEnd(18) : ''.padEnd(18)} ${problems.length ? 'FAIL ' + problems.join('; ') : 'ok'}`);
    if (flag('shots')) await page.screenshot({ path: path.join(SHOTS, `${p.name}-${w}.png`) });
  }
  await page.close();
}
await browser.close();

console.log('width  page     layout             result');
console.log(rows.join('\n'));
console.log(failures ? `\n${failures} problem(s) found.` : `\nAll ${rows.length} checks passed.`);
process.exit(failures ? 1 : 0);
