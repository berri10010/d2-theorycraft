import { describe, it, expect } from 'vitest';
import { useWeaponStore } from '../store/useWeaponStore';
import { calcDps } from './dpsCalc';
import { getPlDeltaMultiplier } from './plDelta';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });

describe('shared PvE target (enemy tier and power delta)', () => {
  it('defaults to Major / Elite at delta 0', () => {
    const s = useWeaponStore.getState();
    expect(s.enemyTier).toBe('Major / Elite');
    expect(s.powerDelta).toBe(0);
  });

  it('clamps and rounds the power delta to the curve range', () => {
    const { setPowerDelta } = useWeaponStore.getState();
    setPowerDelta(-99); expect(useWeaponStore.getState().powerDelta).toBe(-50);
    setPowerDelta(99);  expect(useWeaponStore.getState().powerDelta).toBe(30);
    setPowerDelta(Number.NaN); expect(useWeaponStore.getState().powerDelta).toBe(0);
    setPowerDelta(0);
  });

  it('the enemy tier changes PvE DPS but not PvP DPS', () => {
    const w = weapons.find((x) => x.rarity === 'Exotic' && x.name === 'Arbalest')!;
    const at = (tier: string) => calcDps(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.itemTypeDisplayName, 50, 100, tier, undefined, w.name)!;
    const minor = at('Minor'), elite = at('Major / Elite');
    expect(minor.optimalDpsPvp).toBe(elite.optimalDpsPvp);
    expect(minor.optimalDpsPve).not.toBe(elite.optimalDpsPve);
  });

  it('a negative delta lowers PvE damage and delta 0 is neutral', () => {
    expect(getPlDeltaMultiplier(0)).toBe(1);
    expect(getPlDeltaMultiplier(-10)).toBeLessThan(1);
  });
});
