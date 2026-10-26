import fs from 'fs';
import path from 'path';
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

/** Exotic perk effects, from Clarity's perk text (October 2026). */
describe('exotic perk buffs', () => {
  const dmg = (key: string, mode: 'pve' | 'pvp', stack?: number) => resolveBuffMultiplier(b(key), mode, null, stack);
  const fx = (key: string, mode: 'pve' | 'pvp', stack?: number) => resolveBuffEffects(b(key), mode, null, stack);

  it("Hawkmoon's Paracausal Charge is 21% to 66.3% against combatants and nothing against Guardians", () => {
    expect(dmg('paracausal_charge', 'pve', 0)).toBeCloseTo(1.21, 3);
    expect(dmg('paracausal_charge', 'pve', 6)).toBeCloseTo(1.663, 3);
    expect(dmg('paracausal_charge', 'pve', 2)).toBeCloseTo(1.476, 3);
    expect(dmg('paracausal_charge', 'pvp', 6)).toBe(1);
  });

  it('flat damage perks', () => {
    expect(dmg('death_at_first_glance', 'pve')).toBeCloseTo(1.325, 3);
    expect(dmg('impetus', 'pve')).toBe(1.5);
    expect(dmg('superconductor', 'pve')).toBeCloseTo(1.1, 3);
  });

  it("Bad Juju's String of Curses is 20% a stack in PvE and 10% in PvP", () => {
    expect(dmg('string_of_curses', 'pve', 4)).toBeCloseTo(2, 3);
    expect(dmg('string_of_curses', 'pvp', 4)).toBeCloseTo(1.5, 3);
    expect(dmg('string_of_curses', 'pvp', 0)).toBeCloseTo(1.1, 3);
  });

  it("The Manticore's Swooping Talons is 10% a hit (2% in PvP), up to 10 hits", () => {
    expect(b('swooping_talons').stacks).toHaveLength(10);
    expect(dmg('swooping_talons', 'pve', 9)).toBeCloseTo(2, 3);
    expect(dmg('swooping_talons', 'pvp', 9)).toBeCloseTo(1.2, 3);
  });

  it('Outbreak Perfected and Dead Man\'s Tale', () => {
    expect(dmg('parasitism', 'pve', 4)).toBeCloseTo(2.5, 3);
    expect(dmg('parasitism', 'pvp', 4)).toBeCloseTo(1.75, 3);
    expect(dmg('cranial_spike', 'pve', 4)).toBeCloseTo(1.17, 3);
    expect(dmg('cranial_spike', 'pvp', 4)).toBe(1);
  });

  it('rate-of-fire perks shorten the shot delay: Thunderlord 0.75x then 0.6x, New Land Beyond +5%', () => {
    expect(fx('lightning_rounds', 'pve', 0).shotDelayMultiplier).toBeCloseTo(0.75, 3);
    expect(fx('lightning_rounds', 'pve', 1).shotDelayMultiplier).toBeCloseTo(0.6, 3);
    expect(fx('bullseye_bolster', 'pve').shotDelayMultiplier).toBeCloseTo(1 / 1.05, 3);
  });

  it('Tarrabah unleashed: +187% body / +99% precision in PvE (+120% / +52.7% in PvP), 0.8x fire recovery delay', () => {
    const body = dmg('ravenous_beast', 'pve');
    expect(body).toBeCloseTo(2.87, 3);
    expect(body * fx('ravenous_beast', 'pve').critMultiplier!).toBeCloseTo(1.99, 2);
    expect(fx('ravenous_beast', 'pve').shotDelayMultiplier).toBeCloseTo(0.8, 3);
    const pvp = dmg('ravenous_beast', 'pvp');
    expect(pvp).toBeCloseTo(2.2, 3);
    expect(pvp * fx('ravenous_beast', 'pvp').critMultiplier!).toBeCloseTo(1.527, 2);
  });

  it('The Last Word: +88% precision damage in PvE only (PvP value unpublished)', () => {
    expect(fx('fan_fire', 'pve').critMultiplier).toBe(1.88);
    expect(fx('fan_fire', 'pvp').critMultiplier).toBe(1);
    expect(dmg('fan_fire', 'pve')).toBe(1);
  });

  it('every perk with a buff is linked to it in the shipped perk data (rerun the data refresh if this fails)', () => {
    const perks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'perks.json'), 'utf8')) as Record<string, { name: string; isEnhanced: boolean; buffKey: string | null; isConditional: boolean }>;
    const missing: string[] = [];
    for (const [key, buff] of Object.entries(BUFF_DATABASE)) for (const p of Object.values(perks)) {
      if (buff.weaponNames) continue; // linked per weapon, checked below
      if (p.isEnhanced || !buff.perkNames.includes(p.name)) continue;
      if (p.buffKey !== key || !p.isConditional) missing.push(`${p.name} -> ${key}`);
    }
    expect(missing).toEqual([]);
  });
});

/** Re-checked against Clarity's full database, Blueberries.gg and community guides (October 2026). */
describe('subclass and ability buffs were re-verified', () => {
  it('stat bonuses match Clarity', () => {
    expect(b('spark_of_frequency').statBonuses).toEqual({ Reload: 50, Stability: 15 });
    expect(b('thread_of_ascent').statBonuses).toEqual({ Reload: 40, 'Airborne Effectiveness': 30 });
    expect(b('flow_state').statBonuses).toEqual({ Reload: 50 });
    expect(b('heat_rises').statBonuses).toEqual({ 'Airborne Effectiveness': 20 });
    expect(b('rally_barricade').statBonuses).toEqual({ Reload: 100, Stability: 30 });
  });

  it('Amplified is +40 Handling and nothing for airborne effectiveness', () => {
    expect(b('amplified').statBonuses).toEqual({ Handling: 40 });
  });

  it('Hazardous Propulsion only buffs rocket launchers, +10% to +35% over six stacks, and nothing in the Crucible', () => {
    const hp = b('hazardous_propulsion');
    expect(hp.stacks!.map((s) => s.multiplier)).toEqual([1.1, 1.17, 1.24, 1.3, 1.33, 1.35]);
    const rocket = { itemTypeDisplayName: 'Rocket Launcher' };
    expect(resolveBuffMultiplier(hp, 'pve', rocket, 5)).toBe(1.35);
    expect(resolveBuffMultiplier(hp, 'pve', rocket, 0)).toBe(1.1);
    expect(resolveBuffMultiplier(hp, 'pve', { itemTypeDisplayName: 'Hand Cannon' }, 5)).toBe(1);
    expect(resolveBuffMultiplier(hp, 'pvp', rocket, 5)).toBe(1);
  });

  it('Weapons of Light is 25% in PvE and, from the Helm of Saint-14 listing, in PvP', () => {
    expect(resolveBuffMultiplier(b('weapons_of_light'), 'pve', null)).toBe(1.25);
    expect(resolveBuffMultiplier(b('weapons_of_light'), 'pvp', null)).toBe(1.25);
  });
});

/** Exotic traits added from Clarity's text and the Destiny Data Compendium (October 2026). */
describe('more exotic trait buffs', () => {
  const dmg = (key: string, mode: 'pve' | 'pvp', stack?: number) => resolveBuffMultiplier(b(key), mode, { itemTypeDisplayName: 'Sniper Rifle' }, stack);
  const fx = (key: string, mode: 'pve' | 'pvp', stack?: number) => resolveBuffEffects(b(key), mode, { itemTypeDisplayName: 'Sniper Rifle' }, stack);

  it("Izanagi's Burden: Honed Edge x2/x3/x4 body and precision bonuses, PvE and PvP", () => {
    const cases: Array<[number, number, number, 'pve' | 'pvp']> = [
      [0, 12, 79, 'pve'], [1, 25, 131, 'pve'], [2, 112, 291, 'pve'],
      [0, 20, 91, 'pvp'], [1, 45, 167, 'pvp'], [2, 165, 389, 'pvp'],
    ];
    for (const [stack, body, crit, mode] of cases) {
      const m = dmg('honed_edge', mode, stack);
      expect(m, `${mode} x${stack + 2} body`).toBeCloseTo(1 + body / 100, 3);
      expect(m * fx('honed_edge', mode, stack).critMultiplier!, `${mode} x${stack + 2} crit`).toBeCloseTo(1 + crit / 100, 2);
    }
  });

  it('Honed Edge only applies to sniper rifles', () => {
    expect(resolveBuffMultiplier(b('honed_edge'), 'pve', { itemTypeDisplayName: 'Sword' }, 2)).toBe(1);
  });

  it('Ace of Spades Memento Mori is +68% in PvE and +29% in PvP', () => {
    expect(dmg('memento_mori', 'pve')).toBeCloseTo(1.68, 3);
    expect(dmg('memento_mori', 'pvp')).toBeCloseTo(1.29, 3);
  });

  it('Monte Carlo Markov Chain is 13% a stack in PvE (6.6% in PvP) up to five', () => {
    expect(b('markov_chain').stacks).toHaveLength(5);
    expect(dmg('markov_chain', 'pve', 4)).toBeCloseTo(1.65, 3);
    expect(dmg('markov_chain', 'pvp', 4)).toBeCloseTo(1.33, 3);
    expect(dmg('markov_chain', 'pve', 0)).toBeCloseTo(1.13, 3);
  });

  it('Wavesplitter Harmonic Laser: Medium +32.2% and High +68.7% in PvE, +3% and +6.25% in PvP', () => {
    expect(dmg('harmonic_laser', 'pve', 0)).toBeCloseTo(1.322, 3);
    expect(dmg('harmonic_laser', 'pve', 1)).toBeCloseTo(1.687, 3);
    expect(dmg('harmonic_laser', 'pvp', 0)).toBeCloseTo(1.03, 3);
    expect(dmg('harmonic_laser', 'pvp', 1)).toBeCloseTo(1.0625, 4);
  });

  it('flat damage traits', () => {
    expect(dmg('cold_fusion', 'pve')).toBeCloseTo(1.8, 3);
    expect(dmg('the_fundamentals', 'pve')).toBeCloseTo(1.3, 3);
    expect(dmg('the_fundamentals', 'pvp')).toBeCloseTo(1.1, 3);
    expect(dmg('volatile_light', 'pve')).toBe(2);
    expect(dmg('volatile_light', 'pvp')).toBeCloseTo(1.35, 3);
    expect(dmg('paracausal_imbuement', 'pve')).toBeCloseTo(1.2, 3);
    expect(dmg('hail_storm', 'pve')).toBeCloseTo(1.5, 3);
    expect(dmg('phase_converter', 'pve')).toBeCloseTo(1.3, 3);
  });

  it('Borealis Ionic Return: +15% body and +37% precision', () => {
    const m = dmg('ionic_return', 'pve');
    expect(m).toBeCloseTo(1.15, 3);
    expect(m * fx('ionic_return', 'pve').critMultiplier!).toBeCloseTo(1.37, 2);
  });

  it("Bastion's Saint's Fury: +35% damage and 15% shorter charge time", () => {
    expect(dmg('saints_fury', 'pve')).toBeCloseTo(1.35, 3);
    expect(fx('saints_fury', 'pve').chargeMultiplier).toBeCloseTo(0.85, 3);
  });

  it('Red Death Reformed: +10/20/40% in PvE as the shield goes, +2/4/6% in PvP', () => {
    expect([0, 1, 2].map((i) => dmg('inverse_relationship', 'pve', i))).toEqual([1.1, 1.2, 1.4]);
    expect([0, 1, 2].map((i) => dmg('inverse_relationship', 'pvp', i))).toEqual([1.02, 1.04, 1.06]);
  });

  it('The Chaperone Roadborn: +22% precision damage and +42% rate of fire', () => {
    expect(dmg('the_roadborn', 'pve')).toBe(1);
    expect(fx('the_roadborn', 'pve').critMultiplier).toBeCloseTo(1.22, 3);
    expect(1 / fx('the_roadborn', 'pve').shotDelayMultiplier!).toBeCloseTo(1.42, 2);
  });

  it("the sword perk called Honed Edge is not linked to Izanagi's buff", () => {
    const perks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'perks.json'), 'utf8')) as Record<string, { name: string; buffKey: string | null }>;
    const named = Object.values(perks).filter((p) => p.name === 'Honed Edge');
    expect(named.length).toBeGreaterThan(1);
    expect(named.filter((p) => p.buffKey === 'honed_edge')).toHaveLength(1);
  });
});
