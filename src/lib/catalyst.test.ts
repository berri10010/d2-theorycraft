import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { buildRollParams } from './shareRoll';
import { findCatalystEntry } from './catalystStats';
import type { ClarityEntry } from './clarity';
import { useWeaponStore } from '../store/useWeaponStore';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const clarity = rd('clarity.json') as Record<string, ClarityEntry>;
const exotic = (name: string) => weapons.find((w) => w.rarity === 'Exotic' && w.name === name)!;

describe('catalyst data', () => {
  const exotics = weapons.filter((w) => w.rarity === 'Exotic');

  it('most exotics carry their catalyst, and only exotics do', () => {
    expect(exotics.filter((w) => w.catalyst).length).toBeGreaterThan(100);
    expect(weapons.filter((w) => w.rarity !== 'Exotic' && w.catalyst)).toEqual([]);
    for (const w of exotics) if (w.catalyst) expect(w.catalyst.name, w.name).toMatch(/Catalyst$/i);
  });

  it('flat stat bonuses are known for a good share, and only for stats the weapon has', () => {
    const withStats = exotics.filter((w) => w.catalyst && Object.keys(w.catalyst.stats).length > 0);
    expect(withStats.length).toBeGreaterThan(35);
    for (const w of withStats) for (const [stat, value] of Object.entries(w.catalyst!.stats)) {
      expect(Object.keys(w.baseStats), `${w.name} ${stat}`).toContain(stat);
      expect(value, `${w.name} ${stat}`).not.toBe(0);
    }
  });

  it('known catalysts: Sunshot +30 Range +20 Stability, Hawkmoon +10 Magazine, Thorn', () => {
    expect(exotic('Sunshot').catalyst!.stats).toEqual({ Range: 30, Stability: 20 });
    expect(exotic('Hawkmoon').catalyst!.stats).toEqual({ Magazine: 10 });
    expect(exotic('Thorn').catalyst!.stats).toEqual({ Range: 15, Stability: 5, 'Airborne Effectiveness': 5 });
  });

  it("finds Clarity's description even when it is keyed by another hash", () => {
    const sunshot = exotic('Sunshot');
    expect(clarity[sunshot.catalyst!.hash]).toBeUndefined();
    expect(findCatalystEntry(clarity, sunshot)?.itemName).toBe('Sunshot');
    expect(findCatalystEntry(clarity, exotic('Hawkmoon'))?.name).toBe('Hawkmoon Catalyst');
  });
});

describe('catalyst in the builder', () => {
  beforeEach(() => { useWeaponStore.getState().loadWeapon(exotic('Sunshot')); });

  it('adds its stat bonuses only while switched on', () => {
    const store = useWeaponStore.getState;
    const off = store().getCalculatedStats();
    store().setCatalystActive(true);
    const on = store().getCalculatedStats();
    expect(on.Range).toBeGreaterThan(off.Range);
    expect(on.Stability).toBeGreaterThan(off.Stability);
    expect(on.Handling).toBe(off.Handling);
    store().setCatalystActive(false);
    expect(store().getCalculatedStats()).toEqual(off);
  });

  it('starts off again on a new weapon and after Clear Roll', () => {
    const store = useWeaponStore.getState;
    store().setCatalystActive(true);
    store().loadWeapon(exotic('Hawkmoon'));
    expect(store().catalystActive).toBe(false);
    store().setCatalystActive(true);
    store().clearRoll();
    expect(store().catalystActive).toBe(false);
  });

  it('goes into the share link only for a weapon that has a catalyst', () => {
    const base = { selectedPerks: {}, mode: 'pve' as const, masterworkStat: null, weaponsStat: 0, activeBuffs: [], weaponTier: 1 };
    expect(buildRollParams({ ...base, weapon: exotic('Sunshot'), catalystActive: true }).get('cat')).toBe('1');
    expect(buildRollParams({ ...base, weapon: exotic('Sunshot'), catalystActive: false }).get('cat')).toBeNull();
    const legendary = weapons.find((w) => w.rarity === 'Legendary')!;
    expect(buildRollParams({ ...base, weapon: legendary, catalystActive: true }).get('cat')).toBeNull();
  });
});
