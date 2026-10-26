import { describe, it, expect, beforeEach } from 'vitest';
import { useWeaponStore } from '../store/useWeaponStore';

const get = () => useWeaponStore.getState();

describe('store setters reject bad numbers (finding 2)', () => {
  beforeEach(() => { get().setWeaponsStat(0); get().setWeaponTier(1); get().setSurgeStacks(0); });

  it('setWeaponsStat turns NaN into 0, clamps to 0-200 and rounds', () => {
    get().setWeaponsStat(Number.NaN); expect(get().weaponsStat).toBe(0);
    get().setWeaponsStat(Number.POSITIVE_INFINITY); expect(get().weaponsStat).toBe(0);
    get().setWeaponsStat(999); expect(get().weaponsStat).toBe(200);
    get().setWeaponsStat(-5); expect(get().weaponsStat).toBe(0);
    get().setWeaponsStat(42.6); expect(get().weaponsStat).toBe(43);
  });

  it('setWeaponTier turns NaN into 1, clamps to 1-5 and rounds', () => {
    get().setWeaponTier(Number.NaN); expect(get().weaponTier).toBe(1);
    get().setWeaponTier(9); expect(get().weaponTier).toBe(5);
    get().setWeaponTier(0); expect(get().weaponTier).toBe(1);
    get().setWeaponTier(2.4); expect(get().weaponTier).toBe(2);
  });

  it('setSurgeStacks keeps a whole number from 0 to 4', () => {
    get().setSurgeStacks(9 as 4); expect(get().surgeStacks).toBe(4);
    get().setSurgeStacks(-1 as 0); expect(get().surgeStacks).toBe(0);
    get().setSurgeStacks(Number.NaN as 0); expect(get().surgeStacks).toBe(0);
    get().setSurgeStacks(2.2 as 2); expect(get().surgeStacks).toBe(2);
  });
});
