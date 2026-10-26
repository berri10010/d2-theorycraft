import { describe, it, expect } from 'vitest';
import { BUFF_DATABASE, getBuffKeyForPerk } from './buffDatabase';
import { loadRealData } from '../test/realData';

// BUG_REPORT_2 N1: a misspelt perk name leaves the buff with no perk to attach to, and nothing noticed.
describe('buff perk names match real perks (BUG_REPORT_2 N1)', () => {
  // The whole perk table, not just socket columns: exotic traits (Rat Pack, String of Curses, ...) live outside them.
  const perkNames = new Set(Object.values(loadRealData().pack.perks as Record<string, { name: string }>).map((p) => p.name.toLowerCase()));

  it('every buff perk name that is not an "Enhanced ..." name is the name of a real perk', () => {
    const missing: string[] = [];
    for (const [key, buff] of Object.entries(BUFF_DATABASE)) {
      for (const name of buff.perkNames) {
        if (name.startsWith('Enhanced ')) continue;
        if (!perkNames.has(name.toLowerCase())) missing.push(`${key}: "${name}"`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('finds One for All however the name is capitalised', () => {
    expect(getBuffKeyForPerk('One for All')).toBe('one_for_all');
    expect(getBuffKeyForPerk('one for all')).toBe('one_for_all');
  });
});
