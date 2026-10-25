import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { intrinsicEffectPerk } from './effectPerks';
import { useWeaponStore } from '../store/useWeaponStore';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const exotic = (name: string) => weapons.find((w) => w.rarity === 'Exotic' && w.name === name)!;

describe('intrinsic effects (exotic frames)', () => {
  it('finds the effect on the intrinsic of Hawkmoon and Tarrabah, not on a weapon whose effect is a perk', () => {
    expect(intrinsicEffectPerk(exotic('Hawkmoon'))?.buffKey).toBe('paracausal_charge');
    expect(intrinsicEffectPerk(exotic('Tarrabah'))?.buffKey).toBe('ravenous_beast');
    expect(intrinsicEffectPerk(exotic('Sweet Business'))).toBeNull();
    expect(intrinsicEffectPerk(null)).toBeNull();
  });

  describe('in the damage maths', () => {
    beforeEach(() => { useWeaponStore.setState({ activeEffects: {}, activeBuffs: [], buffStacks: {}, mode: 'pve' }); });

    it('Hawkmoon: switching Paracausal Charge on at 7 stacks multiplies PvE damage by 1.66; PvP is unchanged', () => {
      const w = exotic('Hawkmoon');
      useWeaponStore.setState({ activeWeapon: w, selectedPerks: {} });
      expect(useWeaponStore.getState().getDamageMultiplier()).toBe(1);
      useWeaponStore.getState().setEffectState(w.intrinsicTrait!.hash, 7);
      expect(useWeaponStore.getState().getDamageMultiplier()).toBeCloseTo(1.66, 3);
      useWeaponStore.setState({ mode: 'pvp' });
      expect(useWeaponStore.getState().getDamageMultiplier()).toBe(1);
    });

    it('Tarrabah: Unleash the Beast raises rate of fire and splits body and precision damage', () => {
      const w = exotic('Tarrabah');
      useWeaponStore.setState({ activeWeapon: w, selectedPerks: {} });
      useWeaponStore.getState().setEffectState(w.intrinsicTrait!.hash, 1);
      expect(useWeaponStore.getState().getDamageMultiplier()).toBeCloseTo(2.87, 3);
      const fx = useWeaponStore.getState().getWeaponEffects();
      expect(fx.shotDelayMult).toBeCloseTo(1 / 1.2, 3);
      expect(2.87 * fx.critMult).toBeCloseTo(1.99, 2);
    });
  });
});
