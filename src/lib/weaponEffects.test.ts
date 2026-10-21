import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { applyEffects, combineEffects, NO_EFFECTS } from './weaponEffects';
import { BUFF_DATABASE } from './buffDatabase';
import { lookupWeaponStat } from './weaponStats';
import { calculateTTK } from './damageMath';
import { calcDps } from './dpsCalc';
import { loadRealData } from '../test/realData';

const EXOTIC_TRAIT_KEYS = ['business_time', 'desperation', 'rat_pack', 'silkbound_slayer', 'ignition_trigger', 'all_at_once', 'release_the_wolves'];
const effectBuffs = EXOTIC_TRAIT_KEYS.map((k) => BUFF_DATABASE[k]);
const fx = (key: string) => combineEffects([BUFF_DATABASE[key]]);
const info = (subType: number, ammo: number, frame: string) => ({ itemSubType: subType, ammoType: ammo, intrinsicTrait: { name: frame } });

describe('combineEffects / applyEffects', () => {
  it('multiplies every active buff together and ignores the rest', () => {
    const out = combineEffects([{ shotDelayMultiplier: 0.5 }, { shotDelayMultiplier: 0.5, critMultiplier: 0.8 }, {}]);
    expect(out).toEqual({ critMult: 0.8, shotDelayMult: 0.25, chargeMult: 1 });
  });

  it('leaves the entry untouched when nothing is active', () => {
    const e = lookupWeaponStat(6, 1, 'Adaptive Frame')!;
    expect(applyEffects(e, NO_EFFECTS)).toBe(e);
    expect(applyEffects(e, undefined)).toBe(e);
  });

  it('scales crit, shot delay and charge but not body damage', () => {
    const e = lookupWeaponStat(6, 1, 'Adaptive Frame')!;
    const out = applyEffects(e, { critMult: 0.5, shotDelayMult: 0.5, chargeMult: 2 });
    expect(out.bodyDamage).toBe(e.bodyDamage);
    expect(out.critDamage).toBeCloseTo(e.critDamage * 0.5);
    expect(out.shotDelay).toBeCloseTo((e.shotDelay as number) * 0.5);
    expect(out.chargeMs).toBeNull();
  });
});

describe('exotic trait buffs', () => {
  it('are linked to a perk that exists in the shipped perk data', () => {
    const perks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'perks.json'), 'utf8'));
    const list = (Array.isArray(perks) ? perks : Object.values(perks)) as Array<{ name: string; buffKey?: string | null }>;
    expect(effectBuffs.every(Boolean)).toBe(true);
    for (const b of effectBuffs) {
      const linked = list.filter((p) => b.perkNames.includes(p.name));
      expect(linked.length, b.name).toBeGreaterThan(0);
      for (const p of linked) expect(p.buffKey, `${p.name} buffKey`).toBe(b.hash);
    }
  });

  it('Business Time takes Sweet Business from 360 to 900 RPM', () => {
    const base = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50)!;
    const maxed = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50, 'Major / Elite', fx('business_time'))!;
    expect(base.rpm).toBe(360);
    expect(maxed.rpm).toBe(900);
    expect(maxed.optimalDpsPvp).toBeGreaterThan(base.optimalDpsPvp * 2);
  });

  it('Rat Pack speeds Rat King up by about 15%', () => {
    const base = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50)!;
    const packed = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50, 'Major / Elite', fx('rat_pack'))!;
    expect(packed.rpm / base.rpm).toBeCloseTo(1 / 0.87, 1);
  });

  it('Silkbound Slayer draws 30% faster and hits for +50% body / +20% crit', () => {
    const e = lookupWeaponStat(31, 1, 'Wish-Keeper')!;
    const f = fx('silkbound_slayer');
    const sped = applyEffects(e, f);
    expect(sped.chargeMs).toBeCloseTo((e.chargeMs as number) * 0.7);
    // body follows the shared damage multiplier (1.5); crit gets 1.5 * 0.8 = 1.2 in total
    expect(BUFF_DATABASE.silkbound_slayer.multiplier * f.critMult).toBeCloseTo(1.2);
    const without = calculateTTK('pvp', info(31, 1, 'Wish-Keeper'), 1, 230, 'Minor')!;
    const withEffect = calculateTTK('pvp', info(31, 1, 'Wish-Keeper'), 1.5, 230, 'Minor', undefined, f)!;
    expect(withEffect.ttk).toBeLessThan(without.ttk);
  });
});

describe('exotic stat lookup', () => {
  it('finds an exotic by weapon name even though its intrinsic is not a frame', () => {
    expect(lookupWeaponStat(6, 1, 'Payday', 'Sweet Business')?.lookup).toBe('Auto_p_Sweet Business');
    expect(lookupWeaponStat(24, 1, 'Whatever', 'The Huckleberry')?.lookup).toBe('SMG_p_Huckleberry');
    expect(lookupWeaponStat(6, 1, 'Payday')).toBeNull();
  });

  it('keeps using the frame for legendaries', () => {
    expect(lookupWeaponStat(6, 1, 'Adaptive Frame', 'Some Legendary')?.lookup).toBe('Auto_p_Adaptive');
  });

  it('gives most exotic weapons timing data in the real app', () => {
    const exotics = loadRealData().weapons.filter((w) => w.rarity === 'Exotic' && [1, 2, 3].includes(w.ammoType));
    const covered = exotics.filter((w) => lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.baseName ?? w.name));
    expect(covered.length / exotics.length).toBeGreaterThan(0.45);
    for (const name of ['Sweet Business', 'Rat King', 'Wish-Keeper', "Tommy's Matchbook", 'Lord of Wolves', 'Necrochasm', 'Final Warning']) {
      const w = exotics.find((x) => (x.baseName ?? x.name) === name);
      expect(w, name).toBeDefined();
      expect(lookupWeaponStat(w!.itemSubType, w!.ammoType, w!.intrinsicTrait?.name ?? null, w!.baseName ?? w!.name), name).not.toBeNull();
    }
  });
});
