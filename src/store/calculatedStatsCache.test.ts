import { describe, it, expect, beforeEach } from 'vitest';
import { useWeaponStore, DEFAULT_ARMOR_MODS } from './useWeaponStore';
import { loadRealData } from '../test/realData';

// CODE_REVIEW G: getCalculatedStats ran in about seven places per change; now one result is shared until an input changes.
const store = () => useWeaponStore.getState();
const weapon = loadRealData().weapons.find((w) => w.rarity === 'Legendary' && w.perkSockets.some((c) => c.perks.length > 1) && w.masterworkOptions.length > 1)!;
const choosable = weapon.perkSockets.find((c) => c.perks.length > 1)!;

describe('getCalculatedStats is computed once per change (CODE_REVIEW G)', () => {
  beforeEach(() => { store().loadWeapon(weapon); store().clearRoll(); store().setMode('pve'); });

  it('returns the same object while nothing it depends on changes', () => {
    const first = store().getCalculatedStats();
    expect(store().getCalculatedStats()).toBe(first);
    expect(store().getCalculatedStats()).toBe(first);
  });

  it('is not recomputed for state it does not read (mode, enemy, power delta, weapons stat)', () => {
    const first = store().getCalculatedStats();
    store().setMode('pvp');
    store().setEnemyTier('Boss');
    store().setPowerDelta(-10);
    store().setWeaponsStat(80);
    expect(store().getCalculatedStats()).toBe(first);
  });

  it('is recomputed, with the new numbers, when a perk, masterwork, mod or armor mod changes', () => {
    const before = store().getCalculatedStats();

    store().selectPerk(choosable.name, choosable.perks[0].hash);
    const afterPerk = store().getCalculatedStats();
    expect(afterPerk).not.toBe(before);

    store().setMasterworkStat(weapon.masterworkOptions[0]);
    const afterMw = store().getCalculatedStats();
    expect(afterMw).not.toBe(afterPerk);
    expect(afterMw[weapon.masterworkOptions[0]]).toBeGreaterThanOrEqual(afterPerk[weapon.masterworkOptions[0]]);

    store().setArmorMods({ ...DEFAULT_ARMOR_MODS, loader: 3 });
    const afterArmor = store().getCalculatedStats();
    expect(afterArmor).not.toBe(afterMw);
    expect(afterArmor['Reload']).toBeGreaterThan(afterMw['Reload'] ?? 0);

    const mod = store().activeWeapon!.weaponMods?.[0];
    if (mod) {
      store().toggleBuff('amplified');
      expect(store().getCalculatedStats()).not.toBe(afterArmor);
    }
  });

  it('gives the same numbers as before once a change is undone', () => {
    const before = { ...store().getCalculatedStats() };
    store().setMasterworkStat(weapon.masterworkOptions[0]);
    store().getCalculatedStats();
    store().setMasterworkStat(null);
    expect(store().getCalculatedStats()).toEqual(before);
  });

  it('follows a switch to another weapon', () => {
    const first = store().getCalculatedStats();
    const other = loadRealData().weapons.find((w) => w.hash !== weapon.hash && w.itemSubType !== weapon.itemSubType)!;
    store().loadWeapon(other);
    const second = store().getCalculatedStats();
    expect(second).not.toBe(first);
    expect(second).toEqual(expect.objectContaining({ Range: expect.any(Number) }));
  });
});
