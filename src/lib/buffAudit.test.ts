import { describe, it, expect } from 'vitest';
import { BUFF_DATABASE, buffForMode, buffApplies, resolveBuffMultiplier, resolveBuffEffects, type DamageBuff } from './buffDatabase';

const b = (key: string) => BUFF_DATABASE[key];
const find = (name: string) => Object.values(BUFF_DATABASE).find((x) => x.name === name)!;

/** Values checked against Blueberries' buff/debuff tables and Clarity's perk text (October 2026). */
describe('general buffs and debuffs differ between PvE and PvP', () => {
  const cases: Array<[string, number, number]> = [
    ['Radiant', 1.25, 1.1],
    ['Empowering Rift', 1.2, 1.15],
    ['Well of Radiance', 1.25, 1.25],
    ['Banner Shield', 1.4, 1.35],
    ['Sentinel Shield', 1.4, 1.35],
    ['Blessing of the Sky', 1.35, 1.15],
    ['Noble Rounds (Lumina)', 1.35, 1.15],
    ['Worm Byproduct', 1.35, 1.25],
    ['Helm of Saint-14', 1.25, 1.25],
    ['Weaken', 1.15, 1.075],
    ['Divinity', 1.15, 1.075],
    ['Tractor Cannon', 1.3, 1.5],
    ['Shadowshot Tether', 1.3, 1.5],
    ['Moebius Quiver', 1.3, 1.5],
    ['Deadfall', 1.3, 1.5],
    ["Felwinter's Helm", 1.3, 1.3],
    ['Flash Counter', 1.2, 1.2],
  ];
  for (const [name, pve, pvp] of cases) {
    it(`${name}: PvE ${pve}, PvP ${pvp}`, () => {
      const buff = find(name);
      expect(buff, name).toBeDefined();
      expect(resolveBuffMultiplier(buff, 'pve', null)).toBeCloseTo(pve, 3);
      expect(resolveBuffMultiplier(buff, 'pvp', null)).toBeCloseTo(pvp, 3);
    });
  }

  it("Gyrfalcon's Hauberk does nothing in the Crucible", () => {
    expect(resolveBuffMultiplier(find("Gyrfalcon's Hauberk"), 'pve', null)).toBe(1.35);
    expect(resolveBuffMultiplier(find("Gyrfalcon's Hauberk"), 'pvp', null)).toBe(1);
  });
});

describe('weapon perk buffs use the current numbers', () => {
  it('Rampage is 10 / 21 / 33.1%, Adrenaline Junkie 6.7% a stack', () => {
    expect(b('rampage').stacks!.map((s) => s.multiplier)).toEqual([1.1, 1.21, 1.331]);
    expect(b('adrenaline_junkie').stacks![0].multiplier).toBeCloseTo(1.067, 3);
    expect(b('adrenaline_junkie').multiplier).toBeCloseTo(1.333, 3);
  });

  it('High Ground and Killing Tally are weaker in PvP', () => {
    expect(resolveBuffMultiplier(b('high_ground'), 'pve', null, 2)).toBe(1.25);
    expect(resolveBuffMultiplier(b('high_ground'), 'pvp', null, 2)).toBe(1.15);
    expect(resolveBuffMultiplier(b('killing_tally'), 'pve', null, 2)).toBe(1.3);
    expect(resolveBuffMultiplier(b('killing_tally'), 'pvp', null, 2)).toBe(1.15);
    expect(resolveBuffMultiplier(b('killing_tally'), 'pvp', null, 0)).toBe(1.05);
  });

  it('Bait and Switch is 30%, Firing Line 20%, Target Lock 40% (25% PvP)', () => {
    expect(b('bait_and_switch').multiplier).toBe(1.3);
    expect(b('firing_line').multiplier).toBe(1.2);
    expect(resolveBuffMultiplier(b('target_lock'), 'pve', null)).toBe(1.4);
    expect(resolveBuffMultiplier(b('target_lock'), 'pvp', null)).toBe(1.25);
  });

  it('Vorpal Weapon depends on ammo type and mode', () => {
    const w = (ammoType: number) => ({ ammoType });
    expect(resolveBuffMultiplier(b('vorpal_weapon'), 'pve', w(1))).toBe(1.2);
    expect(resolveBuffMultiplier(b('vorpal_weapon'), 'pve', w(3))).toBe(1.1);
    expect(resolveBuffMultiplier(b('vorpal_weapon'), 'pvp', w(1))).toBe(1.6);
    expect(resolveBuffMultiplier(b('vorpal_weapon'), 'pvp', w(3))).toBe(1.2);
  });

  it('Explosive Light is +60% on grenade launchers, +25% on rocket launchers', () => {
    expect(resolveBuffMultiplier(b('explosive_light'), 'pve', { itemTypeDisplayName: 'Grenade Launcher' })).toBe(1.6);
    expect(resolveBuffMultiplier(b('explosive_light'), 'pve', { itemTypeDisplayName: 'Rocket Launcher' })).toBe(1.25);
  });

  it('Surrounded gives swords 35% instead of 40%', () => {
    expect(resolveBuffMultiplier(b('surrounded'), 'pve', { itemTypeDisplayName: 'Sword' })).toBe(1.35);
    expect(resolveBuffMultiplier(b('surrounded'), 'pve', { itemTypeDisplayName: 'Hand Cannon' })).toBe(1.4);
  });

  it('timing perks are not damage buffs', () => {
    const warmUp = b('successful_warm_up');
    expect(warmUp.multiplier).toBe(1);
    expect(resolveBuffEffects(warmUp, 'pve', null).chargeMultiplier).toBe(0.625);
    const desperado = b('desperado');
    expect(desperado.multiplier).toBe(1);
    expect(resolveBuffEffects(desperado, 'pve', null).shotDelayMultiplier).toBe(0.7);
  });

  it('removed what was not a weapon-damage buff', () => {
    for (const key of ['one_two_punch', 'all_at_once']) expect(BUFF_DATABASE[key], key).toBeUndefined();
    for (const name of ['Sect of Force', 'Sect of Insight', 'Judgment']) expect(find(name), name).toBeUndefined();
  });

  it('Sever, Whisper of Hedrons, On Your Mark and Heat Rises no longer add damage', () => {
    for (const name of ['Sever', 'Whisper of Hedrons', 'On Your Mark', 'Heat Rises']) {
      expect(resolveBuffMultiplier(find(name), 'pve', null), name).toBe(1);
      expect(resolveBuffMultiplier(find(name), 'pvp', null), name).toBe(1);
    }
  });
});

describe('restrictions', () => {
  it('No Backup Plans only helps shotguns', () => {
    const nbp = find('No Backup Plans');
    expect(buffApplies(nbp, { itemTypeDisplayName: 'Shotgun' })).toBe(true);
    expect(buffApplies(nbp, { itemTypeDisplayName: 'Auto Rifle' })).toBe(false);
    expect(resolveBuffMultiplier(nbp, 'pve', { itemTypeDisplayName: 'Auto Rifle' })).toBe(1);
    expect(resolveBuffMultiplier(nbp, 'pve', { itemTypeDisplayName: 'Shotgun' })).toBe(1.35);
    expect(resolveBuffMultiplier(nbp, 'pvp', { itemTypeDisplayName: 'Shotgun' })).toBe(1.1);
  });

  it('Disruption Break only boosts kinetic weapons and stacks with other debuffs', () => {
    const db = find('Disruption Break');
    expect(db.stackType).toBe('multiplicative');
    expect(resolveBuffMultiplier(db, 'pve', { damageType: 'kinetic' })).toBe(1.5);
    expect(resolveBuffMultiplier(db, 'pve', { damageType: 'solar' })).toBe(1);
  });
});

describe('data integrity', () => {
  const all = Object.values(BUFF_DATABASE);

  it('every PvP override is a sensible number', () => {
    for (const buff of all) {
      const pvp = buffForMode(buff, 'pvp');
      expect(pvp.multiplier, buff.name).toBeGreaterThan(0);
      for (const s of pvp.stacks ?? []) expect(s.multiplier, `${buff.name} stack`).toBeGreaterThan(0);
    }
  });

  it('stack levels are in increasing order and do not shrink the damage', () => {
    for (const buff of all) for (const stacks of [buff.stacks, buff.pvp?.stacks]) {
      stacks?.forEach((s, i) => {
        if (i === 0) return;
        expect(s.count, `${buff.name} count`).toBeGreaterThan(stacks[i - 1].count);
        expect(s.multiplier, `${buff.name} multiplier`).toBeGreaterThanOrEqual(stacks[i - 1].multiplier);
      });
    }
  });

  it('empowering buffs and debuffs are mutually exclusive categories, everything else stacks', () => {
    const kinds = new Set(all.map((x: DamageBuff) => x.stackType));
    expect([...kinds].sort()).toEqual(['debuff', 'empowering', 'multiplicative']);
  });

  it('buff keys match their hash field', () => {
    for (const [key, buff] of Object.entries(BUFF_DATABASE)) expect(buff.hash, key).toBe(key);
  });
});
