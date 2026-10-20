import { describe, it, expect } from 'vitest';
import { calculateTTK, calculateTTKCurve, getFalloffFloor, PVE_HEALTH_TIERS } from './damageMath';
import { ammoFromStats } from './ttkAmmo';
import { calcDps } from './dpsCalc';
import { findWeapon } from '../test/realData';

// A Legendary primary hand cannon — a weapon type with real timing data.
const hc = findWeapon((w) => w.itemTypeDisplayName === 'Hand Cannon' && w.rarity === 'Legendary' && w.ammoType === 1);
const info = { itemSubType: hc.itemSubType, ammoType: hc.ammoType, intrinsicTrait: hc.intrinsicTrait };
const intrinsic = hc.intrinsicTrait?.name ?? null;

describe('calculateTTK', () => {
  it('returns a sensible kill in PvP and PvE', () => {
    for (const mode of ['pvp', 'pve'] as const) {
      const r = calculateTTK(mode, info, 1, 230, 'Major / Elite');
      expect(r).not.toBeNull();
      expect(r!.ttk).toBeGreaterThan(0);
      expect(r!.shotsToKill).toBeGreaterThan(0);
      expect(r!.crits + r!.bodies).toBeGreaterThan(0);
    }
  });

  it('never gets slower with more damage', () => {
    const slow = calculateTTK('pve', info, 1, 230, 'Boss')!;
    const fast = calculateTTK('pve', info, 2, 230, 'Boss')!;
    expect(fast.ttk).toBeLessThanOrEqual(slow.ttk);
    expect(fast.shotsToKill).toBeLessThanOrEqual(slow.shotsToKill);
  });

  it('needs at least as many shots against a boss as a minor', () => {
    const minor = calculateTTK('pve', info, 1, 230, 'Minor')!;
    const boss = calculateTTK('pve', info, 1, 230, 'Boss')!;
    expect(boss.shotsToKill).toBeGreaterThanOrEqual(minor.shotsToKill);
  });

  it('knows every PvE health tier', () => {
    for (const tier of Object.keys(PVE_HEALTH_TIERS)) {
      expect(calculateTTK('pve', info, 1, 230, tier)).not.toBeNull();
    }
  });
});

describe('calculateTTKCurve', () => {
  const curve = calculateTTKCurve('pvp', info, 1, 230, 'Minor', 20, 60, 0.5);

  it('samples from 0 to the max distance', () => {
    expect(curve[0].distance).toBe(0);
    expect(curve[curve.length - 1].distance).toBeCloseTo(60, 6);
  });
  it('TTK never improves as damage falls off with range', () => {
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].ttk).toBeGreaterThanOrEqual(curve[i - 1].ttk - 1e-9);
    }
  });
});

describe('getFalloffFloor', () => {
  it('defaults to 50% and overrides linear fusion rifles', () => {
    expect(getFalloffFloor(9)).toBe(0.5);
    expect(getFalloffFloor(22)).toBe(0.85);
  });
});

describe('calcDps', () => {
  const run = (reload: number, mag: number) =>
    calcDps(hc.itemSubType, hc.ammoType, intrinsic, hc.itemTypeDisplayName, reload, mag, 'Major / Elite');

  it('produces positive numbers', () => {
    const dps = run(60, 50)!;
    expect(dps).not.toBeNull();
    for (const v of [dps.optimalDpsPvp, dps.sustainedDpsPvp, dps.optimalDpsPve, dps.rpm, dps.magSize]) {
      expect(v).toBeGreaterThan(0);
    }
  });
  it('sustained DPS (with reloads) never beats continuous fire', () => {
    const dps = run(60, 50)!;
    expect(dps.sustainedDpsPvp).toBeLessThanOrEqual(dps.optimalDpsPvp);
    expect(dps.sustainedDpsPve).toBeLessThanOrEqual(dps.optimalDpsPve);
  });
  it('faster reloads never lower sustained DPS', () => {
    expect(run(100, 50)!.sustainedDpsPvp).toBeGreaterThanOrEqual(run(10, 50)!.sustainedDpsPvp);
  });
});

describe('reload-aware TTK', () => {
  const ammo = { magSize: 10, reloadSeconds: 2 };

  it('is unchanged when the kill fits in one magazine', () => {
    const short = calculateTTK('pvp', info, 1, 230, 'Minor')!;
    expect(short.shotsToKill).toBeLessThanOrEqual(ammo.magSize);
    expect(calculateTTK('pvp', info, 1, 230, 'Minor', ammo)).toEqual({ ...short, reloads: 0 });
  });

  it('adds one reload per full magazine spent before the last shot', () => {
    const plain = calculateTTK('pve', info, 0.2, 230, 'Boss')!; // weak enough to need many shots
    expect(plain.shotsToKill).toBeGreaterThan(ammo.magSize * 2);
    const withAmmo = calculateTTK('pve', info, 0.2, 230, 'Boss', ammo)!;
    const reloads = Math.floor((plain.shotsToKill - 1) / ammo.magSize);
    expect(withAmmo.reloads).toBe(reloads);
    expect(withAmmo.shotsToKill).toBe(plain.shotsToKill);
    expect(withAmmo.ttk).toBeCloseTo(plain.ttk + reloads * ammo.reloadSeconds, 2);
  });

  it('ignores reloads when reload speed is unknown', () => {
    const plain = calculateTTK('pve', info, 0.2, 230, 'Boss')!;
    expect(calculateTTK('pve', info, 0.2, 230, 'Boss', { magSize: 10, reloadSeconds: null })!.ttk).toBe(plain.ttk);
  });

  it('the TTK curve includes reloads too', () => {
    const noAmmo = calculateTTKCurve('pve', info, 0.2, 230, 'Boss', 20, 60, 0.5);
    const withAmmo = calculateTTKCurve('pve', info, 0.2, 230, 'Boss', 20, 60, 0.5, ammo);
    expect(withAmmo[0].ttk).toBeGreaterThan(noAmmo[0].ttk);
    expect(withAmmo[0].reloads).toBeGreaterThan(0);
  });

  it('builds ammo from calculated stats', () => {
    const a = ammoFromStats(hc, { Magazine: 11, Reload: 50 })!;
    expect(a.magSize).toBe(11);
    expect(a.reloadSeconds).toBeGreaterThan(1);
    expect(a.reloadSeconds).toBeLessThan(4);
    expect(ammoFromStats(hc, { Reload: 50 })).toBeUndefined();
  });
});
