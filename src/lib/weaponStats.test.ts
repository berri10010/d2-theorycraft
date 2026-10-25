import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { lookupWeaponStat, statBasis, EXOTIC_FRAME_FALLBACK } from './weaponStats';

interface W { name: string; baseName: string; rarity: string; itemSubType: number; ammoType: number; rpm: number | null; intrinsicTrait: { name: string } | null }
const weapons: W[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'weapons.json'), 'utf8'));
const exotic = (name: string) => weapons.find((w) => w.rarity === 'Exotic' && w.name === name);

describe('exotic frame fallback', () => {
  it('every borrowed frame still matches the weapon\'s own rate of fire (within 4%)', () => {
    const problems: string[] = [];
    for (const [name, frame] of Object.entries(EXOTIC_FRAME_FALLBACK)) {
      const w = exotic(name);
      if (!w) { problems.push(`${name}: not in the weapon data`); continue; }
      const e = lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name);
      if (!e) { problems.push(`${name}: no ${frame} row for this weapon type`); continue; }
      if (e.approxFrom !== frame) { problems.push(`${name}: not marked as borrowed from ${frame}`); continue; }
      if (!e.rpm || !w.rpm || Math.abs(e.rpm - w.rpm) / w.rpm > 0.04) problems.push(`${name}: rpm ${w.rpm} vs ${frame} ${e.rpm}`);
    }
    expect(problems).toEqual([]);
  });

  it('returns the frame row\'s numbers and says where they came from', () => {
    const w = exotic('Hawkmoon')!;
    const e = lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name)!;
    expect(e.lookup).toBe('Hand Cannon_p_Adaptive');
    expect(statBasis(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name)).toBe('Adaptive');
  });

  it('an exotic with its own sheet row is exact, not borrowed', () => {
    const w = exotic('Sweet Business')!;
    const e = lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name)!;
    expect(e).toBeTruthy();
    expect(e.approxFrom ?? null).toBeNull();
  });

  it('gives no numbers for exotics it cannot back up (rockets, swords)', () => {
    for (const name of ['Gjallarhorn', 'Worldline Zero']) {
      const w = exotic(name)!;
      expect(lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name)).toBeNull();
    }
  });
});
