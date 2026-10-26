import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { lookupGodRoll, type GodRollDatabase, type GodRollEntry } from './godRolls';
import { loadRealData } from '../test/realData';

const entry = { weaponType: 'Test', tier: 'S' } as GodRollEntry;

describe('lookupGodRoll ignores capitalisation (BUG_REPORT_2 N2)', () => {
  it('finds an entry whose key differs from the weapon name only in case', () => {
    const db: GodRollDatabase = { 'Redback-5SI': entry };
    expect(lookupGodRoll(db, { name: 'Redback-5si', baseName: 'Redback-5si' })).toBe(entry);
  });
  it('still prefers an exact name, then the exact base name, over a case-insensitive one', () => {
    const exact = { ...entry, tier: 'A' } as GodRollEntry;
    const base = { ...entry, tier: 'B' } as GodRollEntry;
    expect(lookupGodRoll({ 'Just in Case': entry, 'Just In Case': exact }, { name: 'Just In Case', baseName: 'x' })).toBe(exact);
    expect(lookupGodRoll({ 'JUST IN CASE': entry, Base: base }, { name: 'Just in Case', baseName: 'Base' })).toBe(base);
  });
  it('returns null when nothing matches', () => {
    expect(lookupGodRoll({ Other: entry }, { name: 'Nope', baseName: 'Nope' })).toBeNull();
  });
});

describe('every key in god-rolls.json resolves to a weapon (BUG_REPORT_2 N2)', () => {
  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'god-rolls.json'), 'utf8')) as GodRollDatabase;
  const weapons = loadRealData().weapons;

  // Keys carrying a spreadsheet note on a second line ("Prosecutor\nRotN version") are a separate question:
  // whether they are other versions of the weapon or duplicates is undecided, so they are not checked yet.
  const pendingVariantKeys = Object.keys(db).filter((key) => key.includes('\n'));

  it('resolves every plain key to at least one weapon', () => {
    const unresolved = Object.keys(db)
      .filter((key) => !pendingVariantKeys.includes(key))
      .filter((key) => !weapons.some((w) => lookupGodRoll({ [key]: db[key] }, w)));
    expect(unresolved).toEqual([]);
  });
});
