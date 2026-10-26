import { describe, it, expect, beforeEach } from 'vitest';
import { useWeaponStore } from '../store/useWeaponStore';
import { calcDps } from './dpsCalc';
import { calculateTTK } from './damageMath';
import { loadRealData } from '../test/realData';

// ACCURACY_REPORT X3: Firing Line is "+20% Precision Damage", so it must not touch body shots.
const store = () => useWeaponStore.getState();
const gun = loadRealData().weapons.find((w) => w.rarity === 'Legendary' && w.itemTypeDisplayName === 'Pulse Rifle' && w.ammoType === 1)!;
const intrinsic = gun.intrinsicTrait?.name ?? null;

describe('Firing Line is precision-only (ACCURACY_REPORT X3)', () => {
  beforeEach(() => {
    store().loadWeapon(gun);
    for (const key of [...store().activeBuffs]) store().toggleBuff(key);
    store().setSurgeStacks(0);
    store().setWeaponsStat(0);
  });

  it('leaves the shared damage multiplier (body shots) alone in both modes', () => {
    store().toggleBuff('firing_line');
    expect(store().getDamageMultiplier('pve')).toBe(1);
    expect(store().getDamageMultiplier('pvp')).toBe(1);
  });

  it('adds a x1.2 precision multiplier in both modes', () => {
    store().toggleBuff('firing_line');
    store().setMode('pve');
    expect(store().getWeaponEffects().critMult).toBeCloseTo(1.2, 6);
    store().setMode('pvp');
    expect(store().getWeaponEffects().critMult).toBeCloseTo(1.2, 6);
    store().setMode('pve');
  });

  it('DPS: body damage per pull is unchanged and crit damage is 1.2x', () => {
    const plain = calcDps(gun.itemSubType, gun.ammoType, intrinsic, gun.itemTypeDisplayName, 50, 50)!;
    store().toggleBuff('firing_line');
    const on = calcDps(gun.itemSubType, gun.ammoType, intrinsic, gun.itemTypeDisplayName, 50, 50, 'Major / Elite', store().getWeaponEffects(), undefined,
      { pvp: store().getDamageMultiplier('pvp'), pve: store().getDamageMultiplier('pve') })!;
    expect(on.bodyDamage).toBe(plain.bodyDamage);
    expect(on.critDamage).toBeCloseTo(plain.critDamage * 1.2, 1);
    expect(on.optimalDpsPvp).toBeCloseTo(plain.optimalDpsPvp * 1.2, -1);
  });

  it('TTK sees the same thing: faster than without the buff, never faster than the old all-damage x1.2', () => {
    store().toggleBuff('firing_line');
    const effects = store().getWeaponEffects();
    const info = { itemSubType: gun.itemSubType, ammoType: gun.ammoType, intrinsicTrait: gun.intrinsicTrait };
    const without = calculateTTK('pve', info, 1, 230, 'Boss')!;
    const withBuff = calculateTTK('pve', info, store().getDamageMultiplier('pve'), 230, 'Boss', undefined, effects)!;
    const oldBehaviour = calculateTTK('pve', info, 1.2, 230, 'Boss')!;
    expect(withBuff.ttk).toBeLessThanOrEqual(without.ttk);
    expect(withBuff.ttk).toBeGreaterThanOrEqual(oldBehaviour.ttk);
  });
});
