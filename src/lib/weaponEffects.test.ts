import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { applyEffects, combineEffects, NO_EFFECTS } from './weaponEffects';
import { BUFF_DATABASE, buffForMode, resolveBuffEffects } from './buffDatabase';
import { lookupWeaponStat } from './weaponStats';
import { calculateTTK } from './damageMath';
import { calcDps } from './dpsCalc';
import { loadRealData } from '../test/realData';

const EXOTIC_TRAIT_KEYS = ['business_time', 'desperation', 'rat_pack', 'silkbound_slayer', 'ignition_trigger', 'release_the_wolves'];
const effectBuffs = EXOTIC_TRAIT_KEYS.map((k) => BUFF_DATABASE[k]);
/** The timing / crit effects of one buff at a stack level, as the store would fold them. */
const fx = (key: string, mode: 'pve' | 'pvp' = 'pvp', stack?: number) =>
  combineEffects([resolveBuffEffects(BUFF_DATABASE[key], mode, null, stack)]);
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

  it('every buff linked to a perk in the shipped data still exists', () => {
    const perks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'perks.json'), 'utf8'));
    const list = (Array.isArray(perks) ? perks : Object.values(perks)) as Array<{ name: string; buffKey?: string | null }>;
    for (const p of list) if (p.buffKey) expect(BUFF_DATABASE[p.buffKey], `${p.name} -> ${p.buffKey}`).toBeDefined();
  });

  it('Business Time raises Sweet Business fire rate by 60% (360 to 576 RPM)', () => {
    const base = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50)!;
    const maxed = calcDps(6, 1, 'Sweet Business', 'Auto Rifle', 50, 50, 'Major / Elite', fx('business_time'))!;
    expect(base.rpm).toBe(360);
    expect(maxed.rpm).toBe(576);
    expect(maxed.optimalDpsPvp).toBeGreaterThan(base.optimalDpsPvp * 1.5);
  });

  it('Desperation is +20% fire rate', () => {
    const base = calcDps(6, 1, 'Necrochasm', 'Auto Rifle', 50, 50)!;
    const up = calcDps(6, 1, 'Necrochasm', 'Auto Rifle', 50, 50, 'Major / Elite', fx('desperation'))!;
    expect(up.rpm / base.rpm).toBeCloseTo(1.2, 1);
  });

  it('Rat Pack scales with the number of allies: nothing at x1, +40% at x5', () => {
    const base = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50)!;
    const x1 = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50, 'Major / Elite', fx('rat_pack', 'pvp', 0))!;
    const x2 = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50, 'Major / Elite', fx('rat_pack', 'pvp', 1))!;
    const x5 = calcDps(17, 1, 'Rat King', 'Sidearm', 50, 50, 'Major / Elite', fx('rat_pack', 'pvp', 4))!;
    expect(x1.rpm).toBe(base.rpm);
    expect(x2.rpm / base.rpm).toBeCloseTo(1.13, 1);
    expect(x5.rpm / base.rpm).toBeCloseTo(1.4, 1);
  });

  it('Silkbound Slayer: 30% faster draw; +125% body / +50% precision in PvE, +44% / +20% in PvP', () => {
    const e = lookupWeaponStat(31, 1, 'Wish-Keeper')!;
    expect(applyEffects(e, fx('silkbound_slayer')).chargeMs).toBeCloseTo((e.chargeMs as number) * 0.7);
    for (const [mode, body, crit] of [['pve', 2.25, 1.5], ['pvp', 1.44, 1.2]] as const) {
      const b = buffForMode(BUFF_DATABASE.silkbound_slayer, mode);
      expect(b.multiplier, `${mode} body`).toBeCloseTo(body, 2);
      // crit damage = shared multiplier x the extra crit factor
      expect(b.multiplier * fx('silkbound_slayer', mode).critMult, `${mode} crit`).toBeCloseTo(crit, 2);
    }
    const without = calculateTTK('pvp', info(31, 1, 'Wish-Keeper'), 1, 230, 'Minor')!;
    const withEffect = calculateTTK('pvp', info(31, 1, 'Wish-Keeper'), 1.44, 230, 'Minor', undefined, fx('silkbound_slayer'))!;
    expect(withEffect.ttk).toBeLessThan(without.ttk);
  });

  it('Ignition Trigger is +100% in PvE and +50% in PvP', () => {
    expect(buffForMode(BUFF_DATABASE.ignition_trigger, 'pve').multiplier).toBe(2);
    expect(buffForMode(BUFF_DATABASE.ignition_trigger, 'pvp').multiplier).toBe(1.5);
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
