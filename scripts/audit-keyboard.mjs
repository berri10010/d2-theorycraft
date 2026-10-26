// Checks what axe cannot: that the editor works from the keyboard alone.
//
//   npm run dev                       (in one terminal)
//   npm run audit:keyboard            (in another)
//
// Uses your installed Chrome or Edge through playwright-core. Exits 1 on any failure.
// If none is found in the usual places (typical on Linux or in a container, or with a Playwright-downloaded
// Chromium), set CHROME_PATH to the browser executable, for example
//   CHROME_PATH=/path/to/chromium/chrome-linux64/chrome npm run audit:keyboard
import fs from 'fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3000';

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

const SUNSHOT = '/editor?w=2907129557&m=pve';
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const browser = await chromium.launch({ executablePath: findChrome(), headless: true });

async function open(width, height, path = SUNSHOT) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForSelector('.editor-grid', { timeout: 30000 });
  await page.waitForTimeout(600);
  return { context, page };
}
const activeInfo = (page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.getAttribute('role') ? '[' + a.getAttribute('role') + ']' : ''} ${a.getAttribute('aria-label') ?? a.textContent?.trim().slice(0, 30) ?? ''}` : 'none'; });

// ── Desktop ──
{
  const { context, page } = await open(1440, 900);

  // Skip link is the first Tab stop and goes to the main content.
  await page.keyboard.press('Tab');
  check('the first Tab stop is the skip link', /skip to main content/i.test(await activeInfo(page)), await activeInfo(page));

  // View tabs: arrow keys move between and select tabs; only the selected tab is a Tab stop.
  const editorTab = page.getByRole('tab', { name: 'editor', exact: true });
  const compareTab = page.getByRole('tab', { name: /^compare/i });
  await editorTab.focus();
  await page.keyboard.press('ArrowRight');
  check('ArrowRight moves to Compare and selects it', (await compareTab.getAttribute('aria-selected')) === 'true' && /compare/i.test(await activeInfo(page)), await activeInfo(page));
  check('only the selected view tab is a Tab stop', (await editorTab.getAttribute('tabindex')) === '-1' && (await compareTab.getAttribute('tabindex')) === '0');
  await page.keyboard.press('Home');
  check('Home goes back to the first tab', (await editorTab.getAttribute('aria-selected')) === 'true');

  // Weapon data tabs.
  await page.waitForTimeout(500);
  const tabs = page.getByRole('tablist', { name: 'Weapon data' }).getByRole('tab');
  const haveTabs = await tabs.first().waitFor({ timeout: 8000 }).then(() => true, () => false);
  check('the Weapon Data tab list is on the page', haveTabs);
  if (haveTabs) {
    await tabs.first().scrollIntoViewIfNeeded();
    await tabs.first().focus();
    await page.keyboard.press('End');
    check('End selects the last Weapon Data tab', (await tabs.last().getAttribute('aria-selected')) === 'true');
  }

  // Shortcut legend dialog: focus moves in, Tab stays in, Escape closes.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+?');
  const legend = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await legend.waitFor({ timeout: 3000 }).catch(() => {});
  const legendOpen = (await legend.count()) > 0;
  check('? opens the keyboard shortcut dialog', legendOpen);
  if (legendOpen) {
    await page.waitForTimeout(200);
    const inside = () => legend.evaluate((el) => el.contains(document.activeElement));
    check('focus is inside the dialog', await inside());
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    check('Tab stays inside the dialog', await inside());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check('Escape closes the dialog', (await legend.count()) === 0);
  }

  // Search suggestions: type, ArrowDown, Enter adds the filter.
  const search = page.getByPlaceholder('Search weapons…');
  await search.click();
  await search.fill('spread shot');
  await page.waitForTimeout(400);
  check('typing offers filters in a listbox', (await page.getByRole('listbox', { name: 'Add a filter' }).count()) === 1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('ArrowDown then Enter adds the filter and clears the text', (await search.inputValue()) === '' && (await page.getByText(/Spread Shot/).count()) > 0);

  // Every Tab stop on the editor should show where focus is.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  const invisible = [];
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.tagName.toLowerCase() === "nextjs-portal") return null; // the dev server's error overlay, not the site
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow && cs.boxShadow !== 'none';
      const label = `${el.tagName.toLowerCase()} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 28) ?? ''}`;
      return { visible: outline || shadow, label };
    });
    if (r && !r.visible) invisible.push(r.label);
  }
  check('every one of the first 70 Tab stops shows a focus indicator', invisible.length === 0, invisible.slice(0, 8).join(' | '));
  await context.close();
}

// ── Phone ──
{
  const { context, page } = await open(375, 812);
  await page.getByRole('button', { name: 'More' }).click();
  const sheet = page.getByRole('dialog', { name: 'More actions' });
  await sheet.waitFor({ timeout: 3000 }).catch(() => {});
  const sheetOpen = (await sheet.count()) > 0;
  check('More opens a dialog', sheetOpen);
  if (sheetOpen) {
    await page.waitForTimeout(300);
    check('focus moves into the sheet', await sheet.evaluate((el) => el.contains(document.activeElement)));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check('Escape closes it and focus returns to More', (await sheet.count()) === 0 && /more/i.test(await activeInfo(page)), await activeInfo(page));
  }
  await context.close();
}

await browser.close();
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok || !r.detail ? '' : '  (' + r.detail + ')'}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} checks failed.` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
