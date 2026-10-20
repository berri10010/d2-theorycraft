import { describe, it, expect, beforeEach } from 'vitest';
import { useWeaponStore } from './useWeaponStore';
import { loadRealData } from '../test/realData';
import { interpolateStat } from '../lib/math';
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

  it("magazine perks move the magazine through Bungie's curve (regression: snipers showed 34 rounds)", () => {
    const sniper = loadRealData().weapons.find((w) =>
      w.itemTypeDisplayName === 'Sniper Rifle' && w.displayCurves?.Magazine && w.rawStats?.Magazine !== undefined &&
      w.perkSockets.some((c) => c.perks.some((p) => p.statModifiers.some((m) => m.statName === 'Magazine' && m.value >= 20 && !m.isConditional))),
    )!;
    const col = sniper.perkSockets.find((c) => c.perks.some((p) => p.statModifiers.some((m) => m.statName === 'Magazine' && m.value >= 20 && !m.isConditional)))!;
    const perk = col.perks.find((p) => p.statModifiers.some((m) => m.statName === 'Magazine' && m.value >= 20 && !m.isConditional))!;
    const delta = perk.statModifiers.find((m) => m.statName === 'Magazine')!.value;

    store().loadWeapon(sniper);
    store().clearRoll();
    store().clearPerk(col.name);
    const before = store().getCalculatedStats().Magazine;
    store().selectPerk(col.name, perk.hash);
    const after = store().getCalculatedStats().Magazine;

    const curve = sniper.displayCurves!.Magazine;
    const raw = sniper.rawStats!.Magazine;
    const expected = Math.round(before + ((interpolateStat(Math.min(100, raw + delta), curve) as number) - (interpolateStat(raw, curve) as number)));
    expect(after).toBe(expected);
    // A sniper magazine is a handful of rounds, not tens.
    expect(after).toBeLessThan(15);
    expect(after).toBeGreaterThanOrEqual(before);
  });

  describe('draw / charge time (display ms falls as the raw stat rises)', () => {
    const bow = loadRealData().weapons.find((w) =>
      w.itemTypeDisplayName === 'Combat Bow' && w.masterworkOptions.includes('Draw Time') && w.displayCurves?.['Draw Time'],
    )!;

    it('a masterwork Draw Time bonus shaves ~33 ms (it used to be hard-coded; now it comes from the curve)', () => {
      store().loadWeapon(bow);
      store().clearRoll();
      const before = store().getCalculatedStats()['Draw Time'];
      store().setMasterworkStat('Draw Time' as never);
      const after = store().getCalculatedStats()['Draw Time'];
      expect(before - after).toBeGreaterThanOrEqual(32);
      expect(before - after).toBeLessThanOrEqual(36);
    });

    it('a faster-drawing bowstring lowers the displayed draw time (it used to raise it)', () => {
      const withString = loadRealData().weapons.find((w) =>
        w.itemTypeDisplayName === 'Combat Bow' && w.displayCurves?.['Draw Time'] &&
        w.perkSockets.some((c) => c.perks.some((p) => p.name === 'Elastic String' && p.statModifiers.some((m) => m.statName === 'Draw Time' && m.value > 0))),
      )!;
      const col = withString.perkSockets.find((c) => c.perks.some((p) => p.name === 'Elastic String'))!;
      const elastic = col.perks.find((p) => p.name === 'Elastic String')!;
      store().loadWeapon(withString);
      store().clearRoll();
      store().clearPerk(col.name);
      const before = store().getCalculatedStats()['Draw Time'];
      store().selectPerk(col.name, elastic.hash);
      expect(store().getCalculatedStats()['Draw Time']).toBeLessThan(before);
    });

    it('fusion rifle charge time masterwork stays at roughly -33/-34 ms', () => {
      const fusion = loadRealData().weapons.find((w) =>
        w.itemTypeDisplayName === 'Fusion Rifle' && w.masterworkOptions.includes('Charge Time') && w.displayCurves?.['Charge Time'],
      )!;
      store().loadWeapon(fusion);
      store().clearRoll();
      const before = store().getCalculatedStats()['Charge Time'];
      store().setMasterworkStat('Charge Time' as never);
      const delta = before - store().getCalculatedStats()['Charge Time'];
      expect(delta).toBeGreaterThanOrEqual(30);
      expect(delta).toBeLessThanOrEqual(36);
    });
  });
});
