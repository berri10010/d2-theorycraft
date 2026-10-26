import { describe, it, expect } from 'vitest';
import { useWeaponStore } from '../store/useWeaponStore';
import { STAT_NAMES } from './statCalc';
import { loadRealData } from '../test/realData';

describe('calculated stats only contain real stat names (finding 15)', () => {
  it('perks whose modifiers use a made-up stat name (Move Speed, Ready/Stow, ...) add no stat of their own', () => {
    const { weapons } = loadRealData();
    const store = useWeaponStore.getState;
    const leaked = new Map<string, string>();
    let tried = 0;
    for (const weapon of weapons) {
      const odd = weapon.perkSockets.filter((c) => c.perks.some((p) => p.statModifiers.some((m) => !STAT_NAMES.has(m.statName))));
      if (!odd.length) continue;
      store().loadWeapon(weapon);
      for (const column of odd) {
        for (const perk of column.perks.filter((p) => p.statModifiers.some((m) => !STAT_NAMES.has(m.statName)))) {
          store().selectPerk(column.name, perk.hash);
          tried++;
          for (const stat of Object.keys(store().getCalculatedStats())) {
            if (!STAT_NAMES.has(stat) && !leaked.has(stat)) leaked.set(stat, `${weapon.name} / ${perk.name}`);
          }
        }
      }
      if (tried > 400) break; // enough variety; the data holds thousands of the same few names
    }
    expect(tried).toBeGreaterThan(0);
    expect([...leaked]).toEqual([]);
  });
});
