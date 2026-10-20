import { describe, it, expect } from 'vitest';
import { sheetSubType } from './subtypes';
import { lookupWeaponStat } from './weaponStats';
import { calculateTTK } from './damageMath';
import { calcDps } from './dpsCalc';
import { calcReloadTime } from './reloadTimes';
import { loadRealData } from '../test/realData';

describe('sheetSubType', () => {
  it('converts only the three types the spreadsheets number differently', () => {
    expect(sheetSubType(18)).toBe(34); // Sword
    expect(sheetSubType(23)).toBe(25); // Grenade Launcher
    expect(sheetSubType(25)).toBe(29); // Trace Rifle
    for (const same of [6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 22, 24, 31, 33]) expect(sheetSubType(same)).toBe(same);
  });
});

describe('weapon-type lookups use Bungie subtype numbers', () => {
  it('finds Trace Rifle data for Bungie subtype 25 (it used to look under Grenade Launcher)', () => {
    const entry = lookupWeaponStat(25, 2, 'Adaptive Frame');
    expect(entry?.type).toBe('Trace');
  });

  it('every real weapon with timing data resolves to its own weapon type', () => {
    const typeWords: Record<string, string> = {
      'Auto Rifle': 'Auto', 'Hand Cannon': 'Hand Cannon', 'Pulse Rifle': 'Pulse', 'Scout Rifle': 'Scout',
      'Sidearm': 'Sidearm', 'Submachine Gun': 'SMG', 'Combat Bow': 'Bow', 'Trace Rifle': 'Trace',
      'Shotgun': 'Shotgun', 'Sniper Rifle': 'Sniper', 'Fusion Rifle': 'Fusion', 'Machine Gun': 'Machine Gun',
      'Linear Fusion Rifle': 'Linear Fusion', 'Glaive': 'Glaive',
    };
    let resolved = 0;
    for (const w of loadRealData().weapons) {
      const entry = lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null);
      if (!entry) continue;
      resolved++;
      const expected = typeWords[w.itemTypeDisplayName];
      // Exotic entries sit under the spreadsheet's own type names (e.g. "Lodestar"); only check regular ones.
      if (expected && entry.frame && !/^[A-Z][a-z]+'?s? [A-Z]/.test(entry.type)) expect(entry.type, w.name).toBe(expected);
    }
    expect(resolved).toBeGreaterThan(500);
  });

  it('Trace rifles get TTK and DPS numbers', () => {
    const trace = loadRealData().weapons.find((w) => w.itemSubType === 25 && lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null));
    if (!trace) return; // no trace rifle with a matching frame in this data build
    const info = { itemSubType: trace.itemSubType, ammoType: trace.ammoType, intrinsicTrait: trace.intrinsicTrait };
    expect(calculateTTK('pve', info, 1, 230, 'Major / Elite')).not.toBeNull();
    expect(calcDps(trace.itemSubType, trace.ammoType, trace.intrinsicTrait?.name ?? null, trace.itemTypeDisplayName, 50, 50)).not.toBeNull();
  });
});

describe('calcReloadTime', () => {
  it('combat bows stop improving above 85 Reload', () => {
    expect(calcReloadTime('Combat Bow', 1, 100)).toBe(calcReloadTime('Combat Bow', 1, 85));
    expect(calcReloadTime('Combat Bow', 1, 85)!).toBeLessThan(calcReloadTime('Combat Bow', 1, 60)!);
  });
  it('other weapons keep improving to 100', () => {
    expect(calcReloadTime('Hand Cannon', 1, 100)!).toBeLessThan(calcReloadTime('Hand Cannon', 1, 85)!);
  });
});
