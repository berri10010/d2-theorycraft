import { describe, it, expect } from 'vitest';
import { lookupWeaponStat, pveMultiplier } from './weaponStats';
import { calcDps } from './dpsCalc';
import { calculateTTK, PVE_HEALTH_TIERS } from './damageMath';
import scalars from '../data/combatantScalars.json';

// ACCURACY_REPORT X2b: MossyMax's current sheet and oracle_engine both give Aggressive-frame fusion rifles
// about +15% PvE damage against Elite and Minor enemies (sheet: Fusion 3.31 / 3.55, Aggressive Fusion 3.81 / 4.08).
const FUSION = 11;
const SPECIAL = 2;
const aggressive = () => lookupWeaponStat(FUSION, SPECIAL, 'Aggressive Frame', 'Some Aggressive Fusion');

describe('Aggressive Fusion Rifle frame PvE factor (ACCURACY_REPORT X2b)', () => {
  it('is +15% against Elite and Minor, and nothing against the other tiers', () => {
    const row = aggressive();
    expect(pveMultiplier(row, 'Major / Elite')).toBeCloseTo(1.151, 3);
    expect(pveMultiplier(row, 'Minor')).toBeCloseTo(1.149, 3);
    for (const tier of ['Miniboss', 'Boss', 'Champion']) expect(pveMultiplier(row, tier), tier).toBe(1);
  });

  it('leaves every other frame and weapon type alone', () => {
    for (const frame of ['Adaptive Frame', 'High-Impact Frame', 'Precision Frame', 'Rapid-Fire Frame']) {
      for (const tier of Object.keys(PVE_HEALTH_TIERS)) expect(pveMultiplier(lookupWeaponStat(FUSION, SPECIAL, frame, 'X'), tier), `${frame} ${tier}`).toBe(1);
    }
    // another weapon type with a frame called Aggressive (auto rifle)
    for (const tier of Object.keys(PVE_HEALTH_TIERS)) expect(pveMultiplier(lookupWeaponStat(6, 1, 'Aggressive Frame', 'X'), tier), tier).toBe(1);
  });

  it('does not change the shared stat row (the factor lives on a copy)', () => {
    aggressive();
    expect(lookupWeaponStat(FUSION, SPECIAL, 'Aggressive Frame', 'Other Name')).toBe(aggressive());
    expect((lookupWeaponStat(FUSION, SPECIAL, 'Adaptive Frame', 'X'))!.pveTierMult).toBeUndefined();
  });

  it('DPS: PvE damage against an Elite is the type scalar x 1.151, PvP is untouched', () => {
    const r = calcDps(FUSION, SPECIAL, 'Aggressive Frame', 'Fusion Rifle', 50, 50, 'Major / Elite', undefined, 'Some Aggressive Fusion')!;
    const eliteScalar = (scalars as Record<string, Record<string, number>>)['11']['Major / Elite'];
    expect(r.optimalDpsPve / r.optimalDpsPvp).toBeCloseTo(eliteScalar * 1.151, 1);
    const adaptive = calcDps(FUSION, SPECIAL, 'Adaptive Frame', 'Fusion Rifle', 50, 50, 'Major / Elite', undefined, 'Another Fusion')!;
    expect(adaptive.optimalDpsPve / adaptive.optimalDpsPvp).toBeCloseTo(eliteScalar, 1);
  });

  it('TTK: the factor reaches the kill maths (one trigger pull instead of two at a 1.15x damage buff)', () => {
    const info = { itemSubType: FUSION, ammoType: SPECIAL, intrinsicTrait: { name: 'Aggressive Frame' }, name: 'Some Aggressive Fusion' };
    const perTrigger = calcDps(FUSION, SPECIAL, 'Aggressive Frame', 'Fusion Rifle', 50, 50, 'Major / Elite', undefined, 'Some Aggressive Fusion')!.critDamage;
    const eliteScalar = (scalars as Record<string, Record<string, number>>)['11']['Major / Elite'];
    const hp = PVE_HEALTH_TIERS['Major / Elite'];
    const buff = 1.15;
    const withoutFactor = Math.ceil(hp / (perTrigger * eliteScalar * buff));
    const withFactor = Math.ceil(hp / (perTrigger * eliteScalar * 1.151 * buff));
    expect(withFactor).toBeLessThan(withoutFactor); // the check below can only pass if the factor is applied
    expect(calculateTTK('pve', info, buff, 230, 'Major / Elite')!.shotsToKill).toBe(withFactor);
  });
});
