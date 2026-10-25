import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { buildRollParams } from './shareRoll';
import { findCatalystEntry } from './catalystStats';
import type { ClarityEntry } from './clarity';
import { useWeaponStore } from '../store/useWeaponStore';
import { CATALYST_EFFECTS } from '../data/catalystEffects';
import { catalystEffectId } from './effectPerks';
import { BUFF_DATABASE } from './buffDatabase';
import { lookupWeaponStat } from './weaponStats';

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

describe('catalyst damage effects', () => {
  const store = useWeaponStore.getState;
  const setup = (name: string, on = true) => {
    useWeaponStore.setState({ activeEffects: {}, activeBuffs: [], buffStacks: {}, mode: 'pve' });
    store().loadWeapon(exotic(name));
    store().setCatalystActive(on);
  };

  it('only lists real buffs, on exotics that have a catalyst and damage the site can calculate', () => {
    for (const [name, keys] of Object.entries(CATALYST_EFFECTS)) {
      const w = exotic(name);
      expect(w?.catalyst, name).toBeTruthy();
      expect(lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name), `${name} has no timing data`).not.toBeNull();
      for (const key of keys) expect(BUFF_DATABASE[key], `${name}: ${key}`).toBeDefined();
    }
  });

  it("Cerberus+1's catalyst gives +50% damage (+10% in PvP), but only with the catalyst on and the effect switched on", () => {
    setup('Cerberus+1');
    const key = catalystEffectId('catalyst_cerberus_kill');
    expect(store().getDamageMultiplier()).toBe(1);
    store().setEffectState(key, 1);
    expect(store().getDamageMultiplier()).toBeCloseTo(1.5, 3);
    useWeaponStore.setState({ mode: 'pvp' });
    expect(store().getDamageMultiplier()).toBeCloseTo(1.1, 3);
    useWeaponStore.setState({ mode: 'pve' });
    store().setCatalystActive(false);
    expect(store().getDamageMultiplier()).toBe(1);
  });

  it("Whisper of the Worm: +35% precision, and +10.77% to everything against PvE combatants only", () => {
    setup('Whisper of the Worm');
    store().setEffectState(catalystEffectId('catalyst_whispered_breathing'), 1);
    expect(store().getDamageMultiplier()).toBeCloseTo(1.1077, 4);
    expect(store().getWeaponEffects().critMult).toBeCloseTo(1.35, 3);
    useWeaponStore.setState({ mode: 'pvp' });
    expect(store().getDamageMultiplier()).toBe(1);
    expect(store().getWeaponEffects().critMult).toBeCloseTo(1.35, 3);
  });

  it('Alethonym and Wish-Ender reuse One For All (+35%)', () => {
    for (const name of ['Alethonym', 'Wish-Ender']) {
      setup(name);
      store().setEffectState(catalystEffectId('one_for_all'), 1);
      expect(store().getDamageMultiplier(), name).toBeCloseTo(1.35, 3);
    }
  });

  it("Hawkmoon's last round: Paracausal Shot at 7 stacks is +1736% in PvE and +509% in PvP, replacing the charge bonus", () => {
    useWeaponStore.setState({ activeEffects: {}, activeBuffs: [], buffStacks: {}, mode: 'pve' });
    const w = exotic('Hawkmoon');
    store().loadWeapon(w);
    store().setEffectState(w.intrinsicTrait!.hash, 14);
    expect(store().getDamageMultiplier()).toBeCloseTo(18.36, 2);
    store().setEffectState(w.intrinsicTrait!.hash, 8);
    expect(store().getDamageMultiplier()).toBeCloseTo(3.92, 2);
    useWeaponStore.setState({ mode: 'pvp' });
    store().setEffectState(w.intrinsicTrait!.hash, 14);
    expect(store().getDamageMultiplier()).toBeCloseTo(6.09, 2);
    store().setEffectState(w.intrinsicTrait!.hash, 8);
    expect(store().getDamageMultiplier()).toBeCloseTo(1.3, 3);
  });
});
