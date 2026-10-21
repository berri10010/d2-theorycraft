import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CREDITS, CREDIT_GROUPS, DATA_FILE_CREDITS, FOOTER_CREDIT_IDS, creditById } from './credits';

const list = (dir: string) =>
  fs.readdirSync(path.join(process.cwd(), dir)).filter((f) => /\.(json|ts)$/.test(f) && !f.endsWith('.test.ts')).map((f) => `${dir}/${f}`);

describe('credits', () => {
  it('ids are unique and every group exists', () => {
    const ids = CREDITS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CREDITS) expect(CREDIT_GROUPS[c.group], c.id).toBeDefined();
  });

  it('every credit says what it is used for and where', () => {
    for (const c of CREDITS) {
      expect(c.name.length, c.id).toBeGreaterThan(1);
      expect(c.what.length, `${c.id} what`).toBeGreaterThan(5);
      expect(c.where.length, `${c.id} where`).toBeGreaterThan(3);
    }
  });

  it('links are https', () => {
    for (const c of CREDITS) for (const url of [c.url, ...(c.links ?? []).map((l) => l.url)]) {
      if (url) expect(url, c.id).toMatch(/^https:\/\//);
    }
  });

  it('every shipped data file is credited to sources that exist', () => {
    const files = [...list('public/data'), ...list('src/data')];
    for (const f of files) expect(DATA_FILE_CREDITS[f], `${f} is not credited in DATA_FILE_CREDITS`).toBeDefined();
    for (const [f, ids] of Object.entries(DATA_FILE_CREDITS)) {
      expect(fs.existsSync(path.join(process.cwd(), f)), `${f} no longer exists`).toBe(true);
      for (const id of ids) expect(creditById(id), `${f} -> ${id}`).toBeDefined();
    }
  });

  it('every source the build reads is credited', () => {
    const build = fs.readFileSync(path.join(process.cwd(), 'scripts', 'build-static-data.ts'), 'utf8');
    const pairs: Array<[RegExp, string]> = [
      [/docs\.google\.com\/spreadsheets\/d\/\$\{SHEET_ID\}/, 'aegis'],
      [/PRIDE_SHEET_ID/, 'pride'],
      [/SAX_SHEET_ID/, 'sax'],
      [/WEAPON_STAT_SHEET_ID/, 'huwugo'],
      [/PVP_WISHLIST_URL/, 'crucibleguidebook'],
      [/DestinyItemManager\/d2-additional-info/, 'dim'],
      [/clarity/i, 'clarity'],
      [/bungie/i, 'bungie'],
    ];
    for (const [re, id] of pairs) if (re.test(build)) expect(creditById(id), id).toBeDefined();
  });

  it('the footer only lists credits that exist', () => {
    for (const id of FOOTER_CREDIT_IDS) expect(creditById(id), id).toBeDefined();
  });
});
