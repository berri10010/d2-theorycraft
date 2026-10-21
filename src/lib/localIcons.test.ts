import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import icons from '../data/localIcons.json';
import { BUFF_DATABASE } from './buffDatabase';
import { localIcon } from './localIcons';

const entries = Object.entries(icons as Record<string, string>);

describe('buff and armor-mod icons', () => {
  it('local icons exist in public/ and the rest are Bungie CDN paths', () => {
    for (const [key, url] of entries) {
      if (url.startsWith('/icons/')) expect(fs.existsSync(path.join(process.cwd(), 'public', url)), key).toBe(true);
      else expect(url, key).toMatch(/^\/common\/destiny2_content\/icons\/[0-9a-f]+\.(png|jpg)$/);
    }
  });

  it('every public/icons file is used', () => {
    const used = new Set(entries.map(([, u]) => u));
    for (const f of fs.readdirSync(path.join(process.cwd(), 'public', 'icons'))) expect(used.has(`/icons/${f}`), f).toBe(true);
  });

  it('every buff icon key names a real buff', () => {
    const names = new Set(Object.values(BUFF_DATABASE).map((b) => b.name));
    for (const [key] of entries) if (key.startsWith('buff:')) expect(names.has(key.slice(5)), key).toBe(true);
  });

  it('every non-perk buff has an icon', () => {
    const missing = Object.values(BUFF_DATABASE)
      .filter((b) => b.category !== 'weapon_perk' && !b.icon && !localIcon('buff', b.name))
      .map((b) => b.name);
    expect(missing).toEqual([]);
  });

  it('resolves CDN and local icons to loadable URLs', () => {
    expect(localIcon('buff', 'Radiant')).toMatch(/^https:\/\/www\.bungie\.net\/common\/destiny2_content\/icons\//);
    expect(localIcon('buff', 'Sever')).toBe('/icons/sever.webp');
    expect(localIcon('buff', 'No Such Buff')).toBeNull();
  });
});
