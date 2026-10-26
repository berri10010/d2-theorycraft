import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { shareRecord, buildPreview, previewMetaTags, escapeHtml, weaponHashParam, type ShareRecord } from './sharePreview';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const sunshot = weapons.find((w) => w.rarity === 'Exotic' && w.name === 'Sunshot')!;

describe('shareRecord', () => {
  const rec = shareRecord(sunshot);

  it('is small and describes the weapon', () => {
    expect(rec.n).toBe('Sunshot');
    expect(rec.t).toBe('Hand Cannon');
    expect(rec.e).toBe('solar');
    expect(rec.r).toBe('Exotic');
    expect(JSON.stringify(rec).length).toBeLessThan(8000);
  });

  it('has an absolute picture URL', () => {
    expect(rec.s).toMatch(/^https:\/\/www\.bungie\.net\/.+/);
  });

  it('names every perk the weapon can roll, enhanced ones too', () => {
    const hashes = sunshot.perkSockets.flatMap((c) => c.perks.map((p) => p.hash));
    expect(hashes.length).toBeGreaterThan(0);
    for (const h of hashes) expect(rec.p[h], h).toBeTruthy();
  });

  it('every weapon has a record with a name and a picture', () => {
    for (const w of weapons) { const r = shareRecord(w); expect(r.n.length, w.hash).toBeGreaterThan(0); }
    expect(weapons.filter((w) => !shareRecord(w).s).length).toBeLessThan(weapons.length * 0.01);
  });
});

describe('buildPreview', () => {
  const rec: ShareRecord = { n: 'Abyss Defiant', t: 'Auto Rifle', e: 'solar', r: 'Legendary', v: null, s: 'https://www.bungie.net/x.jpg', p: { '1': 'Eager Edge', '2': 'Burning Ambition', '3': 'Rampage' } };
  const params = (q: string) => new URLSearchParams(q);

  it('names the weapon and the mode in the title', () => {
    expect(buildPreview(rec, params('w=5&m=pvp')).title).toBe('Abyss Defiant · PvP roll · D2 Theorycraft');
    expect(buildPreview(rec, params('w=5&m=pve')).title).toContain('PvE roll');
    expect(buildPreview(rec, params('w=5')).title).toContain('PvE roll');
  });

  it('lists the roll\'s perks in order, once each, and skips ones it does not know', () => {
    const d = buildPreview(rec, params('w=5&p=2,1,2,999,3')).description;
    expect(d).toContain('Roll: Burning Ambition / Eager Edge / Rampage');
    expect(d.match(/Burning Ambition/g)).toHaveLength(1);
  });

  it('describes the weapon, masterwork, catalyst and buffs', () => {
    const d = buildPreview(rec, params('w=5&p=1&mw=Range&cat=1&b=a,b')).description;
    expect(d).toContain('Auto Rifle · Solar');
    expect(d).toContain('Masterwork: Range');
    expect(d).toContain('Catalyst complete');
    expect(d).toContain('2 external buffs');
  });

  it('works for a bare link with no roll', () => {
    const p = buildPreview(rec, params('w=5'));
    expect(p.description).toContain('Auto Rifle');
    expect(p.description).not.toContain('Roll:');
    expect(p.image).toBe(rec.s);
  });

  it('keeps long rolls to eight perks', () => {
    const many: ShareRecord = { ...rec, p: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i), `Perk ${i}`])) };
    const d = buildPreview(many, params('w=5&p=' + Array.from({ length: 12 }, (_, i) => i).join(','))).description;
    expect(d).toContain('Perk 7');
    expect(d).not.toContain('Perk 8');
  });
});

describe('previewMetaTags', () => {
  it('escapes everything it puts in an attribute', () => {
    const html = previewMetaTags({ title: 'A "quoted" <b>name</b> & more', description: "it's <script>", image: 'https://x/y.jpg?a=1&b=2' }, 'https://site/editor?w=1&m=pve');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('A &quot;quoted&quot; &lt;b&gt;name&lt;/b&gt; &amp; more');
    expect(html).toContain('og:url" content="https://site/editor?w=1&amp;m=pve"');
    expect(html).toContain('twitter:card" content="summary_large_image"');
  });

  it('falls back to a small card without a picture', () => {
    const html = previewMetaTags({ title: 't', description: 'd', image: null }, 'https://site/editor');
    expect(html).toContain('twitter:card" content="summary"');
    expect(html).not.toContain('og:image');
  });

  it('escapeHtml handles all five characters', () => {
    expect(escapeHtml(`&<>"`)).toBe('&amp;&lt;&gt;&quot;');
  });
});

describe('weaponHashParam', () => {
  it('only accepts digits, so it is safe in a file path', () => {
    expect(weaponHashParam(new URLSearchParams('w=2907129557'))).toBe('2907129557');
    for (const bad of ['', '../x', '12/34', 'abc', '1e5', '1234567890123']) expect(weaponHashParam(new URLSearchParams({ w: bad })), bad).toBeNull();
    expect(weaponHashParam(new URLSearchParams(''))).toBeNull();
  });
});

describe('deployment setup', () => {
  it('runs the worker first for /editor, otherwise Cloudflare would serve the static page without it', () => {
    const toml = fs.readFileSync(path.join(process.cwd(), 'wrangler.toml'), 'utf8');
    expect(toml).toMatch(/run_worker_first\s*=\s*\[[^\]]*"\/editor"/);
  });

  it('the build writes the share data after the export', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.scripts['build:ci']).toContain('build-share-data');
    expect(pkg.scripts.build).toContain('build-share-data');
  });
});
