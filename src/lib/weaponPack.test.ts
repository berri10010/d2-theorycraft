import { describe, it, expect } from 'vitest';
import { packWeapons, unpackWeapons } from './weaponPack';
import { loadRealData } from '../test/realData';
import type { Weapon, Perk, WeaponModOption } from '../types/weapon';

const perk = (hash: string, extra: Partial<Perk> = {}): Perk => ({
  hash, name: `Perk ${hash}`, icon: '/i.png', description: '', statModifiers: [],
  isEnhanced: false, isConditional: false, buffKey: null, tier: null,
  activation: null, activation2: null, enhancedVersion: null, ...extra,
});

const mod = (hash: string, enhancedVersion?: WeaponModOption | null): WeaponModOption => ({
  hash, name: `Mod ${hash}`, description: '', statChanges: {}, ...(enhancedVersion !== undefined ? { enhancedVersion } : {}),
});

function weapon(hash: string, p: Partial<Weapon> = {}): Weapon {
  return {
    hash, name: hash, baseName: hash, variantLabel: null, isAdept: false, hasCraftedPattern: false,
    icon: '', iconWatermark: null, seasonName: null, seasonNumber: null, screenshot: null, flavorText: null,
    rarity: 'Legendary', itemTypeDisplayName: 'Hand Cannon', itemSubType: 9, damageType: 'kinetic', ammoType: 1,
    rpm: 140, baseStats: {}, intrinsicTrait: null, perkSockets: [], statCurves: {}, source: null,
    masterworkOptions: [], weaponMods: [], foundry: null, ...p,
  };
}

describe('weaponPack (synthetic)', () => {
  const base = perk('1');
  const enhanced = perk('2', { isEnhanced: true });
  const weapons = [
    weapon('w1', {
      intrinsicTrait: perk('9'),
      perkSockets: [
        { name: 'Perk 1', columnType: 'perk', perks: [{ ...base, enhancedVersion: enhanced }, perk('3')] },
        // same base perk in another slot WITHOUT an upgrade — the real data does this
        { name: 'Perk 2', columnType: 'perk', perks: [base] },
      ],
      weaponMods: [mod('m1', mod('m2')), mod('m3', null)],
    }),
    weapon('w2', { perkSockets: [{ name: 'Barrel', columnType: 'barrel', perks: [perk('3')] }], weaponMods: [mod('m1', mod('m2'))] }),
  ];

  it('round-trips losslessly (treating absent and null enhancedVersion alike)', () => {
    const back = unpackWeapons(JSON.parse(JSON.stringify(packWeapons(weapons))));
    const norm = (o: unknown) => JSON.stringify(o, (k, v) => (k === 'enhancedVersion' && v === null ? undefined : v));
    expect(norm(back)).toBe(norm(weapons));
  });

  it('stores each perk and mod once', () => {
    const pack = packWeapons(weapons);
    expect(Object.keys(pack.perks).sort()).toEqual(['1', '2', '3', '9']);
    expect(Object.keys(pack.mods).sort()).toEqual(['m1', 'm2', 'm3']);
  });

  it('keeps the per-slot enhanced link', () => {
    const back = unpackWeapons(packWeapons(weapons));
    const [col1, col2] = back[0].perkSockets;
    expect(col1.perks[0].enhancedVersion?.hash).toBe('2');
    expect(col2.perks[0].enhancedVersion).toBeNull();
  });

  it('shares perk objects by reference after unpacking', () => {
    const back = unpackWeapons(packWeapons(weapons));
    expect(back[0].perkSockets[0].perks[1]).toBe(back[1].perkSockets[0].perks[0]);
  });

  it('refuses to merge conflicting definitions', () => {
    const a = weapon('a', { perkSockets: [{ name: 'P', columnType: 'perk', perks: [perk('1', { name: 'One' })] }] });
    const b = weapon('b', { perkSockets: [{ name: 'P', columnType: 'perk', perks: [perk('1', { name: 'Uno' })] }] });
    expect(() => packWeapons([a, b])).toThrow(/conflicting/);
  });

  it('fails loudly on a dangling reference', () => {
    const pack = packWeapons(weapons);
    delete pack.perks['3'];
    expect(() => unpackWeapons(pack)).toThrow(/missing perk 3/);
  });
});

describe('weaponPack (real data)', () => {
  const { pack, weapons } = loadRealData();

  it('loads the full catalogue', () => {
    expect(weapons.length).toBeGreaterThan(1000);
    expect(new Set(weapons.map((w) => w.hash)).size).toBe(weapons.length);
  });

  it('resolves every reference', () => {
    for (const w of pack.weapons) {
      for (const col of w.perkSockets) {
        for (const ref of col.perks) {
          for (const h of typeof ref === 'string' ? [ref] : ref) {
            expect(pack.perks[h], `perk ${h} on ${w.name}`).toBeDefined();
          }
        }
      }
      for (const ref of w.weaponMods) {
        for (const h of typeof ref === 'string' ? [ref] : ref) {
          expect(pack.mods[h], `mod ${h} on ${w.name}`).toBeDefined();
        }
      }
    }
  });

  it('every weapon has the fields the UI depends on', () => {
    for (const w of weapons) {
      expect(w.name).toBeTruthy();
      expect(w.baseName).toBeTruthy();
      expect(typeof w.itemSubType).toBe('number');
      expect(w.baseStats).toBeTypeOf('object');
      expect(Array.isArray(w.perkSockets)).toBe(true);
    }
  });
});
