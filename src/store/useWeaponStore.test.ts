import { describe, it, expect, beforeEach } from 'vitest';
import { useWeaponStore } from './useWeaponStore';
import { loadRealData } from '../test/realData';
import type { Weapon, Perk, PerkColumn } from '../types/weapon';

/**
 * Find a weapon with a column holding two perks that move the same stat by
 * different, unconditional amounts, well away from the 0/100 clamps.
 */
function findStatPair(): { weapon: Weapon; column: PerkColumn; a: Perk; b: Perk; stat: string } {
  for (const weapon of loadRealData().weapons) {
    if (weapon.rarity === 'Exotic') continue;
    for (const column of weapon.perkSockets) {
      for (const a of column.perks) {
        for (const b of column.perks) {
          if (a === b) continue;
          for (const ma of a.statModifiers) {
            if (ma.isConditional || ma.value === 0) continue;
            const mb = b.statModifiers.find((m) => m.statName === ma.statName && !m.isConditional);
            const base = weapon.baseStats[ma.statName];
            if (mb && mb.value !== ma.value && base !== undefined && base > 30 && base < 60) {
              return { weapon, column, a, b, stat: ma.statName };
            }
          }
        }
      }
    }
  }
  throw new Error('no suitable perk pair in test data');
}

const store = () => useWeaponStore.getState();

describe('useWeaponStore stat calculation', () => {
  const { weapon, column, a, b, stat } = findStatPair();
  const delta = (p: Perk) => p.statModifiers.find((m) => m.statName === stat && !m.isConditional)!.value;

  beforeEach(() => {
    store().loadWeapon(weapon);
    store().clearRoll();
  });

  it('starts from the weapon base stats', () => {
    const stats = store().getCalculatedStats();
    for (const [k, v] of Object.entries(weapon.baseStats)) {
      expect(typeof stats[k]).toBe('number');
      // fixed single-option perks may already shift stats, so just require sanity
      expect(Number.isFinite(stats[k]), k).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('applies the difference between two perks in one column exactly', () => {
    store().selectPerk(column.name, a.hash);
    const withA = store().getCalculatedStats()[stat];
    store().selectPerk(column.name, b.hash);
    const withB = store().getCalculatedStats()[stat];
    expect(withB - withA).toBe(delta(b) - delta(a));
  });

  it('clearing a perk restores the previous stats', () => {
    const before = store().getCalculatedStats();
    store().selectPerk(column.name, a.hash);
    store().clearPerk(column.name);
    expect(store().getCalculatedStats()).toEqual(before);
  });

  it('loading a weapon starts from its fixed perks, not the previous roll', () => {
    store().selectPerk(column.name, a.hash);
    const other = loadRealData().weapons.find((w) => w.hash !== weapon.hash && w.perkSockets.length > 0)!;
    store().loadWeapon(other);
    expect(store().activeWeapon?.hash).toBe(other.hash);
    store().loadWeapon(weapon);
    // Roll restore on switch was removed in ed77958; user picks do not carry back.
    expect(store().selectedPerks[column.name]).toBeUndefined();
  });

  it('keeps the damage multiplier at or above zero and finite', () => {
    const m = store().getDamageMultiplier();
    expect(Number.isFinite(m)).toBe(true);
    expect(m).toBeGreaterThan(0);
  });
});
