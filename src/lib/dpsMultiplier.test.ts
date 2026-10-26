import { describe, it, expect, beforeEach } from 'vitest';
import { calcDps } from './dpsCalc';
import { useWeaponStore } from '../store/useWeaponStore';

const store = () => useWeaponStore.getState();

describe('calcDps damage multiplier (finding 4)', () => {
  const plain = () => calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50)!;

  it('a multiplier of 1 changes nothing', () => {
    const same = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50, 'Major / Elite', undefined, undefined, { pvp: 1, pve: 1 })!;
    expect(same).toEqual(plain());
  });

  it('scales PvP and PvE DPS with their own multiplier, leaving the other mode alone', () => {
    const base = plain();
    const buffed = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50, 'Major / Elite', undefined, undefined, { pvp: 1, pve: 1.25 })!;
    expect(buffed.optimalDpsPvp).toBe(base.optimalDpsPvp);
    expect(buffed.sustainedDpsPvp).toBe(base.sustainedDpsPvp);
    expect(buffed.optimalDpsPve).toBeCloseTo(base.optimalDpsPve * 1.25, -1);
    expect(buffed.sustainedDpsPve).toBeCloseTo(base.sustainedDpsPve * 1.25, -1);
    const pvp = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50, 'Major / Elite', undefined, undefined, { pvp: 1.1, pve: 1 })!;
    expect(pvp.optimalDpsPvp).toBeCloseTo(base.optimalDpsPvp * 1.1, -1);
    expect(pvp.optimalDpsPve).toBe(base.optimalDpsPve);
  });
});

describe('getDamageMultiplier for a chosen mode (finding 4)', () => {
  beforeEach(() => {
    store().setMode('pve');
    for (const key of [...store().activeBuffs]) store().toggleBuff(key);
  });

  it('defaults to the current mode and can be asked for the other one', () => {
    store().setSurgeStacks(4);
    expect(store().getDamageMultiplier()).toBeCloseTo(1.25, 3);
    expect(store().getDamageMultiplier('pve')).toBeCloseTo(1.25, 3);
    expect(store().getDamageMultiplier('pvp')).toBeCloseTo(1.06, 3);
    store().setMode('pvp');
    expect(store().getDamageMultiplier()).toBeCloseTo(1.06, 3);
    expect(store().getDamageMultiplier('pve')).toBeCloseTo(1.25, 3);
    store().setSurgeStacks(0);
    store().setMode('pve');
  });
});
