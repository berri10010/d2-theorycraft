import { describe, it, expect } from 'vitest';
import { calcDps } from './dpsCalc';
import { loadRealData } from '../test/realData';

describe('sustained DPS never beats optimal DPS (finding 10)', () => {
  it('holds for every weapon with timing data, at stock stats and at extreme reload and magazine stats', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const w of loadRealData().weapons) {
      const stock = { reload: w.baseStats['Reload'] ?? 0, mag: w.baseStats['Magazine'] ?? 1 };
      for (const { reload, mag } of [stock, { reload: 100, mag: stock.mag }, { reload: 100, mag: 1 }, { reload: 100, mag: 200 }]) {
        const r = calcDps(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.itemTypeDisplayName, reload, mag, 'Major / Elite', undefined, w.baseName ?? w.name);
        if (!r) continue;
        checked++;
        if (r.sustainedDpsPvp > r.optimalDpsPvp || r.sustainedDpsPve > r.optimalDpsPve) {
          bad.push(`${w.name} reload ${reload} mag ${mag}: sustained ${r.sustainedDpsPvp}/${r.sustainedDpsPve}, optimal ${r.optimalDpsPvp}/${r.optimalDpsPve}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
