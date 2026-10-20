import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseWeaponStatSheet, mergeWeaponStats, sheetIsMidUpdate } from './weaponStatSheet';
import { lookupWeaponStat, type WeaponStatEntry } from './weaponStats';

const HEADER_ROWS = [
  '"CURRENTLY UPDATING SORRY!\nTHINGS MAY BIT INACCURATE",,,,,,,',
  ',,,,,,,',
  'discord: huwugo_,D2 MoT: 9.7.0.3,make a copy,,,,,',
  'Weapon Details,,Damage Model,,,,,,interburst,intraburst,subburst,ms,burst count,subburst count',
  'type,frame,body,head,RPM,ammo,(sort),lookup,fr1,fr2,fr3,charge,burst1,burst2',
];

const sheet = (rows: string[]) => [...HEADER_ROWS, ...rows].join('\n');

const AUTO = 'Auto,Adaptive,15.504,27.209,600.0,Primary,1,Auto_p_Adaptive,3,0,0,0,1,1';
const PULSE = 'Pulse,Aggressive Burst,15.504,30.553,450.0,Primary,2,Pulse_p_Aggressive Burst,10,2,0,0,4,1';
const FUSION = 'Fusion,Adaptive,46.303,46.303,667ms,Special,3,Fusion_s_Adaptive,15,0,2,667,1,7';
const SHOTGUN = 'Shotgun,Aggressive,27.999,31.019,72.7,Special,4,Shotgun_s_Aggressive,24.75,0,0,0,1,12';
const NA = 'Scout,Polaris Lance,#N/A,#N/A,.,Primary,5,Scout_p_Polaris Lance,#N/A,#N/A,#N/A,#N/A,#N/A,#N/A';
const ZERO = 'Grenade Launcher,Wave-Frame,0.000,0.000,72.0,Special,6,Grenade Launcher_s_Wave-Frame,25,0,0,0,1,1';
const COMBINED = 'Hand Cannon,Adaptive / Lightweight,44.526,80.0,140.0,Primary,7,Hand Cannon_p_Adaptive,13,0,0,0,1,1';
const PR55 = 'Pulse,Lightweight / PR-55,18.817,30.0,390.0,Primary,8,Pulse_p_Lightweight,8,2,0,0,3,1';
const RENAMED = 'Fusion,Vex Mythoclast,22.004,39.479,400.0,Primary,9,Fusion_p_Timeless Mythoclast,4.5,0,0,0,1,1';
const MELEE = 'Melee,Melee,99.475,99.475,.,Primary,10,Melee_p_Melee,0,0,0,0,1,1';

describe('parseWeaponStatSheet', () => {
  const parsed = parseWeaponStatSheet(sheet([AUTO, PULSE, FUSION, SHOTGUN, NA, ZERO]));
  const by = (k: string) => parsed.entries.find((e) => e.lookup === k)!;

  it('reads damage, timing and burst data into the existing model', () => {
    expect(by('Auto_p_Adaptive')).toMatchObject({
      type: 'Auto', ammo: 'p', frame: 'Adaptive', bodyDamage: 15.504, critDamage: 27.209,
      shotDelay: 3, burstDelay: null, chargeMs: null, shotsPerBurst: null, rpm: 600,
    });
    expect(by('Pulse_p_Aggressive Burst')).toMatchObject({ shotDelay: 10, burstDelay: 2, shotsPerBurst: 4, rpm: 450 });
  });
  it('reads charge time in ms and keeps fractional frame delays', () => {
    expect(by('Fusion_s_Adaptive')).toMatchObject({ chargeMs: 667, shotDelay: 15, rpm: null, ammo: 's' });
    expect(by('Shotgun_s_Aggressive').shotDelay).toBe(24.75);
  });
  it('skips #N/A rows and rows with no damage, and says so', () => {
    expect(parsed.entries.some((e) => e.lookup.includes('Polaris') || e.lookup.includes('Wave-Frame'))).toBe(false);
    expect(parsed.skipped).toEqual(['Scout_p_Polaris Lance', 'Grenade Launcher_s_Wave-Frame']);
  });
  it('gives every frame of a combined row its own entry', () => {
    const p = parseWeaponStatSheet(sheet([COMBINED, PR55])).entries.map((e) => e.lookup);
    expect(p).toEqual([
      'Hand Cannon_p_Adaptive', 'Hand Cannon_p_Lightweight',
      'Pulse_p_Lightweight', 'Pulse_p_Legacy PR-55 Frame',
    ]);
  });
  it("follows the sheet's own lookup when a frame was renamed", () => {
    const e = parseWeaponStatSheet(sheet([RENAMED])).entries;
    // the sheet's key first, then the frame name shown in the row (both weapons share the numbers)
    expect(e.map((x) => x.lookup)).toEqual(['Fusion_p_Timeless Mythoclast', 'Fusion_p_Vex Mythoclast']);
    expect(e[0]).toMatchObject({ type: 'Fusion', ammo: 'p', frame: 'Timeless Mythoclast' });
  });
  it('skips rows with no timing', () => {
    const parsed = parseWeaponStatSheet(sheet([MELEE]));
    expect(parsed.entries).toEqual([]);
    expect(parsed.skipped).toEqual(['Melee_p_Melee']);
  });
  it('reports the sheet banner and version', () => {
    expect(parsed.version).toBe('D2 MoT: 9.7.0.3');
    expect(sheetIsMidUpdate(parsed.banner)).toBe(true);
    expect(sheetIsMidUpdate('')).toBe(false);
  });
  it('fails loudly if the sheet layout changes', () => {
    expect(() => parseWeaponStatSheet('a,b,c\n1,2,3')).toThrow(/header/);
    expect(() => parseWeaponStatSheet('type,frame,body,head\nAuto,Adaptive,1,2')).toThrow(/column/);
  });
});

describe('mergeWeaponStats', () => {
  const old = (p: Partial<WeaponStatEntry> & { lookup: string }): WeaponStatEntry => ({
    type: 'T', ammo: 'p', frame: 'F', bodyDamage: 1, critDamage: 2, shotDelay: 3, burstDelay: null,
    chargeMs: null, shotsPerBurst: null, rpm: null, ...p,
  });
  const fresh = parseWeaponStatSheet(sheet([AUTO, SHOTGUN])).entries;

  it('takes damage and timing from the sheet for frames we already track', () => {
    const { entries, updated } = mergeWeaponStats([old({ lookup: 'Auto_p_Adaptive', bodyDamage: 15.02 })], fresh);
    expect(updated).toBe(1);
    expect(entries.find((e) => e.lookup === 'Auto_p_Adaptive')!.bodyDamage).toBe(15.504);
  });
  it('keeps our curated pellet count when the sheet only has a flat pellet column', () => {
    const { entries } = mergeWeaponStats([old({ lookup: 'Shotgun_s_Aggressive', shotsPerBurst: 10 })], fresh);
    expect(entries.find((e) => e.lookup === 'Shotgun_s_Aggressive')!.shotsPerBurst).toBe(10);
  });
  it('takes a real burst count from the sheet', () => {
    const burst = parseWeaponStatSheet(sheet([PULSE])).entries;
    const { entries } = mergeWeaponStats([old({ lookup: 'Pulse_p_Aggressive Burst', shotsPerBurst: 3 })], burst);
    expect(entries[0].shotsPerBurst).toBe(4);
  });
  it('adds new frames and keeps frames the sheet dropped', () => {
    const { entries, added, kept } = mergeWeaponStats([old({ lookup: 'Legacy_p_Gone' })], fresh);
    expect(added).toBe(2);
    expect(kept).toBe(1);
    expect(entries.map((e) => e.lookup)).toContain('Legacy_p_Gone');
  });
});

describe('shipped weaponStats.json', () => {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'weaponStats.json'), 'utf8')) as WeaponStatEntry[];

  it('is internally consistent', () => {
    const seen = new Set<string>();
    for (const e of data) {
      expect(e.lookup, 'lookup is type_ammo_frame').toBe(`${e.type}_${e.ammo}_${e.frame}`);
      expect(seen.has(e.lookup), `duplicate ${e.lookup}`).toBe(false);
      seen.add(e.lookup);
      expect(e.bodyDamage, e.lookup).toBeGreaterThan(0);
      expect(e.critDamage, e.lookup).toBeGreaterThanOrEqual(e.bodyDamage);
    }
  });

  it('has timing for every frame (a delay, a charge time or both)', () => {
    for (const e of data) expect(e.shotDelay !== null || e.chargeMs !== null, e.lookup).toBe(true);
  });

  it('includes the frames added in the 9.7 chart', () => {
    expect(lookupWeaponStat(9, 1, 'Heavy Burst Frame')).not.toBeNull();
    expect(data.some((e) => e.lookup === 'Pulse_p_Red Death Reformed')).toBe(true);
  });
});
