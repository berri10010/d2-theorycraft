import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseWeaponStatSheet, mergeWeaponStats, sheetIsMidUpdate } from './weaponStatSheet';
import { lookupWeaponStat, type WeaponStatEntry } from './weaponStats';
import { calculateTTK } from './damageMath';
import { calcDps } from './dpsCalc';

// ── Fixtures: the two tabs, abridged ─────────────────────────────────────────

const DATA_HEADER = 'lookup,sort,type,ammo,frame,note,damageModel,body scalar,crit scalar,crit offset,body damage,crit damage,shot delay,burst delay,"sub-\nburst delay","charge\nms",shots per burst,shots per sub,ref RPM';
const dataRow = (lookup: string, f: Record<string, string | number> = {}) => {
  const [type, ammo, ...frame] = lookup.split('_');
  const v = { body: '', crit: '', shot: '', burst: '', charge: '', perBurst: '', perSub: '', rpm: '', ...f };
  return `${lookup},1,${type},${ammo},${frame.join('_')},,${lookup},,,0,${v.body},${v.crit},${v.shot},${v.burst},,${v.charge},${v.perBurst},${v.perSub},${v.rpm}`;
};
const data = (...rows: string[]) => [DATA_HEADER, ...rows].join('\n');

const CHART_HEAD = [
  '"CURRENTLY UPDATING SORRY!\nTHINGS MAY BIT INACCURATE",,,,,,,',
  'discord: huwugo_,D2 MoT: 9.7.0.3,make a copy,,,,,',
  'type,frame,body,head,RPM,ammo,(sort),lookup,fr1,fr2,fr3,charge,burst1,burst2',
];
const chart = (...rows: string[]) => [...CHART_HEAD, ...rows].join('\n');
const chartRow = (type: string, frame: string, ammo: string, lookup: string) => `${type},${frame},1,1,.,${ammo},1,${lookup},1,0,0,0,1,1`;

const AUTO = dataRow('Auto_p_Adaptive', { body: 15.504, crit: 27.209, shot: 3, rpm: 600 });
const PULSE = dataRow('Pulse_p_Aggressive Burst', { body: 15.504, crit: 30.553, shot: 10, burst: 2, perBurst: 4, rpm: 450 });
const FUSION = dataRow('Fusion_s_Adaptive', { body: 46.303, crit: 46.303, shot: 15, charge: 667, perSub: 7, rpm: 66.67 });
const SHOTGUN = dataRow('Shotgun_s_Aggressive', { body: 27.999, crit: 31.019, shot: 33, perSub: 12, rpm: 54.5 });
const BOW = dataRow('Bow_p_Precision', { body: 100.793, crit: 131.427, charge: 667 });
const HC = dataRow('Hand Cannon_p_Adaptive', { body: 44.526, crit: 80, shot: 13 });
const MELEE = dataRow('Melee_p_Melee', { body: 99.475, crit: 99.475 });
const PLACEHOLDER = '.,4000100,,,,,,,,,,,,,,,,,';

describe('parseWeaponStatSheet', () => {
  const parsed = parseWeaponStatSheet(
    chart(
      chartRow('Hand Cannon', 'Adaptive / Lightweight', 'Primary', 'Hand Cannon_p_Adaptive'),
      chartRow('Trace', 'Lodestar', 'Primary', 'Pulse_p_Aggressive Burst'),
    ),
    data(AUTO, PULSE, FUSION, SHOTGUN, BOW, HC, MELEE, PLACEHOLDER),
  );
  const by = (k: string) => parsed.entries.find((e) => e.lookup === k)!;

  it('reads damage, timing, bullets per trigger and projectiles per bullet', () => {
    expect(by('Auto_p_Adaptive')).toMatchObject({
      type: 'Auto', ammo: 'p', frame: 'Adaptive', bodyDamage: 15.504, critDamage: 27.209,
      shotDelay: 3, burstDelay: null, chargeMs: null, shotsPerBurst: null, pellets: null, rpm: 600,
    });
    expect(by('Pulse_p_Aggressive Burst')).toMatchObject({ shotDelay: 10, burstDelay: 2, shotsPerBurst: 4, pellets: null });
    expect(by('Shotgun_s_Aggressive')).toMatchObject({ shotDelay: 33, shotsPerBurst: null, pellets: 12 });
    expect(by('Fusion_s_Adaptive')).toMatchObject({ chargeMs: 667, shotDelay: 15, pellets: 7 });
    expect(by('Bow_p_Precision')).toMatchObject({ chargeMs: 667, shotDelay: null });
  });

  it('skips the placeholder rows and rows with no timing, and says so', () => {
    expect(parsed.entries.some((e) => e.lookup === '.' || e.lookup.startsWith('Melee'))).toBe(false);
    expect(parsed.skipped).toEqual(['Melee_p_Melee']);
  });

  it('gives every frame of a combined chart row its own entry', () => {
    expect(by('Hand Cannon_p_Lightweight')).toMatchObject({ frame: 'Lightweight', bodyDamage: 44.526, shotDelay: 13 });
    expect(by('Pulse_p_Lodestar')).toMatchObject({ type: 'Pulse', shotsPerBurst: 4 });
  });

  it('reports the chart banner and version', () => {
    expect(parsed.version).toBe('D2 MoT: 9.7.0.3');
    expect(sheetIsMidUpdate(parsed.banner)).toBe(true);
    expect(sheetIsMidUpdate('')).toBe(false);
  });

  it('fails loudly if the sheet layout changes', () => {
    expect(() => parseWeaponStatSheet(chart(), 'a,b\n1,2')).toThrow(/WeaponData header/);
    expect(() => parseWeaponStatSheet('a,b\n1,2', data(AUTO))).toThrow(/WeaponStat Chart header/);
    expect(() => parseWeaponStatSheet(chart(), 'lookup,type\nx,y')).toThrow(/column/);
  });
});

describe('mergeWeaponStats', () => {
  const old = (lookup: string, p: Partial<WeaponStatEntry> = {}): WeaponStatEntry => ({
    lookup, type: 'T', ammo: 'p', frame: 'F', bodyDamage: 1, critDamage: 2, shotDelay: 3, burstDelay: null,
    chargeMs: null, shotsPerBurst: null, pellets: null, rpm: null, ...p,
  });
  const fresh = parseWeaponStatSheet(chart(), data(AUTO, SHOTGUN)).entries;

  it('takes everything from the sheet for frames it lists (including pellet counts)', () => {
    const { entries, updated } = mergeWeaponStats([old('Shotgun_s_Aggressive', { shotsPerBurst: 10 })], fresh);
    const e = entries.find((x) => x.lookup === 'Shotgun_s_Aggressive')!;
    expect(updated).toBe(1);
    expect(e.pellets).toBe(12);
    expect(e.shotsPerBurst).toBeNull();
  });
  it('adds new frames and keeps frames the sheet dropped', () => {
    const { entries, added, kept } = mergeWeaponStats([old('Legacy_p_Gone')], fresh);
    expect(added).toBe(2);
    expect(kept).toBe(1);
    expect(entries.map((e) => e.lookup)).toContain('Legacy_p_Gone');
  });
  it('fills in the pellets field on frames kept from before it existed', () => {
    const legacy = { ...old('Legacy_p_Gone') } as Partial<WeaponStatEntry>;
    delete legacy.pellets;
    const { entries } = mergeWeaponStats([legacy as WeaponStatEntry], fresh);
    expect(entries.find((e) => e.lookup === 'Legacy_p_Gone')!.pellets).toBeNull();
  });
});

describe('shipped weaponStats.json', () => {
  const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'weaponStats.json'), 'utf8')) as WeaponStatEntry[];

  it('is internally consistent', () => {
    const seen = new Set<string>();
    for (const e of file) {
      expect(e.lookup, 'lookup is type_ammo_frame').toBe(`${e.type}_${e.ammo}_${e.frame}`);
      expect(seen.has(e.lookup), `duplicate ${e.lookup}`).toBe(false);
      seen.add(e.lookup);
      expect(e.bodyDamage, e.lookup).toBeGreaterThan(0);
      expect(e.critDamage, e.lookup).toBeGreaterThanOrEqual(e.bodyDamage);
      expect(e.shotDelay !== null || e.chargeMs !== null, `${e.lookup} has timing`).toBe(true);
      expect(e.pellets === null || e.pellets > 1, e.lookup).toBe(true);
    }
  });

  it('carries pellet and bolt counts for shotguns and fusion rifles', () => {
    for (const k of ['Shotgun_s_Aggressive', 'Shotgun_s_Lightweight', 'Fusion_s_Adaptive', 'Fusion_s_Rapid Fire']) {
      expect(file.find((e) => e.lookup === k)?.pellets, k).toBeGreaterThan(4);
    }
  });

  it('includes frames added in the 9.7 chart and the merged Lightweight frames', () => {
    expect(file.some((e) => e.lookup === 'Pulse_p_Red Death Reformed')).toBe(true);
    expect(lookupWeaponStat(6, 1, 'Lightweight Frame')).not.toBeNull();
    expect(lookupWeaponStat(9, 1, 'Lightweight Frame')).not.toBeNull();
  });
});

// ── The engine uses those numbers the way the sheet does ────────────────────

describe('shotguns, fusion rifles and bows', () => {
  const info = (subType: number, ammo: number, frame: string) => ({ itemSubType: subType, ammoType: ammo, intrinsicTrait: { name: frame } });

  it('a shotgun is a one-shot kill up close: all pellets land, every pellet counts', () => {
    const r = calculateTTK('pvp', info(7, 2, 'Aggressive Frame'), 1, 230, 'Minor')!;
    expect(r.shotsToKill).toBe(1);
    expect(r.ttk).toBe(0);
  });

  it('a fusion rifle fires all its bolts per shot (it used to need 5 shots)', () => {
    const r = calculateTTK('pvp', info(11, 2, 'Adaptive Frame'), 1, 230, 'Minor')!;
    expect(r.shotsToKill).toBeLessThanOrEqual(2);
  });

  it('bows assume the first arrow is already drawn', () => {
    const bow = calculateTTK('pvp', info(31, 1, 'Precision Frame'), 1, 230, 'Minor')!;
    expect(bow.shotsToKill).toBe(2);
    expect(bow.ttk).toBeCloseTo(0.667, 2); // one draw for the second arrow, none for the first
  });

  it('follow-up fusion shots pay for a fresh charge plus the recovery gap', () => {
    // Weak enough to need several shots: (shots - 1) * (0.667s charge + 15 frames recovery)
    const r = calculateTTK('pvp', info(11, 2, 'Adaptive Frame'), 0.05, 230, 'Minor')!;
    expect(r.shotsToKill).toBeGreaterThan(2);
    expect(r.ttk).toBeCloseTo((r.shotsToKill - 1) * (0.667 + 0.5), 1);
  });

  it('DPS counts every pellet and bolt', () => {
    const shotgun = calcDps(7, 2, 'Aggressive Frame', 'Shotgun', 50, 50)!;
    expect(shotgun.critDamage).toBeCloseTo(31.0185 * 12, 0);
    const fusion = calcDps(11, 2, 'Adaptive Frame', 'Fusion Rifle', 50, 50)!;
    expect(fusion.critDamage).toBeCloseTo(46.3031 * 7, 0);
    expect(fusion.optimalDpsPvp).toBeGreaterThan(200);
  });

  it('a bow draws and releases with no extra gap between draws', () => {
    const bow = calcDps(31, 1, 'Precision Frame', 'Combat Bow', 50, 50)!;
    expect(bow.rpm).toBe(Math.round(60 / 0.667));
  });
});
