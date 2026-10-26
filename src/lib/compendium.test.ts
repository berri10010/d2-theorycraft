import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { lookupWeaponStat, pveMultiplier } from './weaponStats';
import { sheetSubType } from './subtypes';
import scalars from '../data/combatantScalars.json';
import { EXOTIC_PVE, COMPENDIUM_ROWS, EXOTIC_ROW_ALIASES } from '../data/compendium';
import { calcDps } from './dpsCalc';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const exotic = (name: string) => weapons.find((w) => w.rarity === 'Exotic' && w.name === name)!;
const statFor = (name: string) => { const w = exotic(name); return lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name); };
const minorScalar = (name: string) => (scalars as Record<string, Record<string, number>>)[String(sheetSubType(exotic(name).itemSubType))].Minor;

describe('exotic PvE bonuses from the Destiny Data Compendium', () => {
  const derived = Object.entries(EXOTIC_PVE).filter(([, b]) => b.pve !== undefined);

  it('each factor is PvE / (PvP x the type\'s Minor scalar), re-derived from the figures in its evidence text', () => {
    for (const [name, b] of derived) {
      expect(b.evidence, name).toContain(`${b.pve} [${b.pvp}]`);
      expect(b.factor, name).toBeCloseTo(b.pve! / (b.pvp! * minorScalar(name)), 1);
      expect(Math.abs(b.factor - b.pve! / (b.pvp! * minorScalar(name))), name).toBeLessThan(0.01);
    }
  });

  it('the compendium PvP figure is the stat row\'s damage, which is what validates trusting its PvE figure', () => {
    for (const [name, b] of derived) {
      const e = statFor(name)!;
      expect(e, name).toBeTruthy();
      const perTrigger = e.bodyDamage * (e.pellets ?? 1) * (e.shotsPerBurst ?? 1);
      const close = (x: number) => Math.abs(x - b.pvp!) / b.pvp! < 0.03;
      expect(close(e.bodyDamage) || close(perTrigger), `${name}: sheet ${e.bodyDamage} vs compendium ${b.pvp}`).toBe(true);
    }
  });

  it('every factor sits in the believable exotic band (1.0 to 1.8); anything outside was left out', () => {
    for (const [name, b] of Object.entries(EXOTIC_PVE)) {
      expect(b.factor, name).toBeGreaterThanOrEqual(1);
      expect(b.factor, name).toBeLessThanOrEqual(1.8);
    }
  });

  it('is attached to the lookup, and nothing else changes', () => {
    expect(pveMultiplier(statFor('The Last Word'), 'Minor')).toBeCloseTo(1.33, 2);
    expect(pveMultiplier(statFor("Ager's Scepter"), 'Boss')).toBeCloseTo(1.3, 2);
    expect(pveMultiplier(statFor('Ruinous Effigy'), 'Major / Elite')).toBeCloseTo(1.4, 2);
    expect(pveMultiplier(statFor('Sweet Business'), 'Minor')).toBe(1);
    expect(pveMultiplier(null, 'Boss')).toBe(1);
  });

  it('raises PvE damage and DPS by the factor, and leaves PvP alone', () => {
    const w = exotic('The Last Word');
    const dps = () => calcDps(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.itemTypeDisplayName, 50, 100, 'Major / Elite', undefined, w.name)!;
    const withBonus = dps();
    expect(withBonus.optimalDpsPve / withBonus.optimalDpsPvp).toBeCloseTo(
      (scalars as Record<string, Record<string, number>>)[String(sheetSubType(w.itemSubType))]['Major / Elite'] * 1.33, 2);
  });
});

describe('rows taken straight from the compendium', () => {
  for (const [name, row] of Object.entries(COMPENDIUM_ROWS)) {
    it(`${name}: damage and factor match the evidence`, () => {
      const nums = [...row.evidence.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*\[(\d[\d,.]*)\]/g)].map((m) => [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))]);
      expect(nums.length, name).toBeGreaterThan(0);
      const pve = nums.reduce((a, [p]) => a + p, 0);
      const pvp = nums.reduce((a, [, p]) => a + p, 0);
      expect(row.pve, name).toBe(pve);
      expect(row.pvp, name).toBe(pvp);
      expect(row.bodyDamage, name).toBe(pvp);
      const typeMinor = (scalars as Record<string, Record<string, number>>)[String(sheetSubType(exotic(name).itemSubType))].Minor;
      expect(Math.abs(row.pveFactor - pve / (pvp * typeMinor)), name).toBeLessThan(0.01);
      // Fire delay is Bungie's rpm in 30fps frames.
      expect(row.shotDelay, name).toBeCloseTo(1800 / exotic(name).rpm!, 0);
    });

    it(`${name} is found by the lookup, with its PvE bonus and tier penalty`, () => {
      const e = statFor(name)!;
      expect(e.source).toBe('compendium');
      expect(e.bodyDamage).toBe(row.bodyDamage);
      expect(pveMultiplier(e, 'Minor')).toBe(row.pveFactor);
      for (const [tier, m] of Object.entries(row.pveTierMult ?? {})) expect(pveMultiplier(e, tier)).toBeCloseTo(row.pveFactor * m!, 5);
    });
  }

  it('the Wardcliff Coil does 80% less to Minibosses and Bosses', () => {
    const e = statFor('The Wardcliff Coil')!;
    expect(pveMultiplier(e, 'Boss') / pveMultiplier(e, 'Minor')).toBeCloseTo(0.2, 5);
  });

  it('only exotics of the right type and ammo get a compendium row', () => {
    for (const [name, row] of Object.entries(COMPENDIUM_ROWS)) expect(exotic(name).itemTypeDisplayName, name).toBe(row.type === 'Scout' ? 'Scout Rifle' : row.type);
  });
});

describe('exotics whose sheet row sits under another name', () => {
  it('Revision Zero uses its Light Burst row (450 rpm)', () => {
    for (const [name, lookup] of Object.entries(EXOTIC_ROW_ALIASES)) {
      const e = statFor(name)!;
      expect(e.lookup).toBe(lookup);
      expect(Math.round(e.rpm!)).toBe(Math.round(exotic(name).rpm!));
    }
  });
});
