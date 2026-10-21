import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import icons from '../data/localIcons.json';
import { BUFF_DATABASE } from './buffDatabase';
import { localIcon } from './localIcons';

describe('local icons', () => {
  it('every mapped icon exists in public/', () => {
    for (const [key, url] of Object.entries(icons as Record<string, string>)) {
      expect(fs.existsSync(path.join(process.cwd(), 'public', url)), key).toBe(true);
    }
  });

  it('every buff icon key names a real buff', () => {
    const names = new Set(Object.values(BUFF_DATABASE).map((b) => b.name));
    for (const key of Object.keys(icons)) {
      if (key.startsWith('buff:')) expect(names.has(key.slice(5)), key).toBe(true);
    }
  });

  it('returns null for names without an icon', () => {
    expect(localIcon('buff', 'Radiant')).toBe('/icons/radiant.webp');
    expect(localIcon('mod', 'Ammo Generation')).toBeNull();
  });
});
