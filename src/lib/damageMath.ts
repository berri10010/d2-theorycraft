/**
 * damageMath.ts
 *
 * Exact-engine TTK calculations using Massive Breakdowns weapon stat data.
 *
 * Timing rules (all delays are in 30fps engine frames — divide by 30 for seconds):
 *
 *   Standard:  TTK = (shots - 1) * (shotDelay / 30)
 *
 *   Charge/Draw (Fusions, LFRs, Bows):
 *              TTK = (chargeMs / 1000) + ((shots - 1) * (shotDelay / 30))
 *              where "shots" = trigger pulls; damage = bodyDamage * shotsPerBurst
 *
 *   Burst (Pulse Rifles, burst Sidearms/SMGs — no charge phase):
 *              fullBursts     = Math.floor((shots - 1) / shotsPerBurst)
 *              remainderShots = (shots - 1) % shotsPerBurst
 *              TTK = (fullBursts * burstDelay / 30) + (remainderShots * shotDelay / 30)
 *              where "shots" = total individual bullets
 */

import { GameMode } from '../types/weapon';
import { lookupWeaponStat, isChargeWeapon, isBurstWeapon, WeaponStatEntry } from './weaponStats';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * PvE enemies have ~3× the damage resistance relative to the spreadsheet's
 * PvP-calibrated damage values.  This scalar keeps existing PvE health tiers
 * (calibrated against the old archetype data) meaningful with the new numbers.
 */
const PVE_DAMAGE_SCALAR = 3.0;

/** PvE enemy health tiers used in the TTK panel selector. */
export const PVE_HEALTH_TIERS: Record<string, number> = {
  'Minor (Dreg/Grunt)': 336,
  'Major (Elite)':      1344,
  'Champion':           3024,
};

// ── Result type ───────────────────────────────────────────────────────────────

export interface TTKResult {
  ttk: number;
  /** "Shots" appropriate for the weapon category:
   *   Standard / Burst → total individual bullets.
   *   Charge           → trigger pulls.
   */
  shotsToKill: number;
  /** Crit (headshot) count in the optimal kill pattern. */
  crits: number;
  /** Body-shot count in the optimal kill pattern. */
  bodies: number;
  optimalPattern: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPattern(crits: number, bodies: number): string {
  const parts: string[] = [];
  if (crits  > 0) parts.push(`${crits}× Head`);
  if (bodies > 0) parts.push(`${bodies}× Body`);
  return parts.join(' + ') || '—';
}

/**
 * Find the minimum number of shots whose optimal crit-heavy mix reaches
 * `targetHp`.  Returns [shots, crits, bodies] or null if unreachable.
 */
function findOptimalShots(
  bodyDmg: number,
  critDmg: number,
  targetHp: number,
  maxShots = 200,
): [shots: number, crits: number, bodies: number] | null {
  for (let shots = 1; shots <= maxShots; shots++) {
    for (let c = shots; c >= 0; c--) {
      const b = shots - c;
      if (c * critDmg + b * bodyDmg >= targetHp) {
        return [shots, c, b];
      }
    }
  }
  return null;
}

// ── TTK formulae ──────────────────────────────────────────────────────────────

function ttkStandard(shots: number, shotDelay: number): number {
  return (shots - 1) * (shotDelay / 30);
}

function ttkCharge(
  shots: number,
  chargeMs: number,
  shotDelay: number | null,
): number {
  // If the weapon has a per-shot delay between trigger pulls, use it;
  // otherwise fall back to treating each subsequent trigger as another full charge.
  const interShotSec = shotDelay != null ? shotDelay / 30 : chargeMs / 1000;
  return (chargeMs / 1000) + (shots - 1) * interShotSec;
}

function ttkBurst(
  shots: number,
  shotsPerBurst: number,
  burstDelay: number,
  shotDelay: number,
): number {
  const fullBursts     = Math.floor((shots - 1) / shotsPerBurst);
  const remainderShots = (shots - 1) % shotsPerBurst;
  return (fullBursts * burstDelay / 30) + (remainderShots * shotDelay / 30);
}

// ── Core calculation ──────────────────────────────────────────────────────────

function calcFromEntry(
  entry: WeaponStatEntry,
  targetHp: number,
  multiplier: number,
  mode: GameMode,
): TTKResult | null {
  const modeScalar = mode === 'pve' ? PVE_DAMAGE_SCALAR : 1.0;

  if (isChargeWeapon(entry)) {
    // Damage per trigger pull = per-projectile × projectiles-per-trigger.
    const spb  = entry.shotsPerBurst ?? 1;
    const body = entry.bodyDamage * spb * modeScalar * multiplier;
    const crit = entry.critDamage  * spb * modeScalar * multiplier;

    const found = findOptimalShots(body, crit, targetHp);
    if (!found) return null;
    const [shots, crits, bodies] = found;

    return {
      ttk: Math.round(ttkCharge(shots, entry.chargeMs!, entry.shotDelay) * 1000) / 1000,
      shotsToKill: shots,
      crits,
      bodies,
      optimalPattern: fmtPattern(crits, bodies),
    };

  } else if (isBurstWeapon(entry)) {
    if (entry.burstDelay == null || entry.shotDelay == null) return null;

    const body = entry.bodyDamage * modeScalar * multiplier;
    const crit = entry.critDamage  * modeScalar * multiplier;

    const found = findOptimalShots(body, crit, targetHp);
    if (!found) return null;
    const [shots, crits, bodies] = found;

    return {
      ttk: Math.round(ttkBurst(shots, entry.shotsPerBurst!, entry.burstDelay, entry.shotDelay) * 1000) / 1000,
      shotsToKill: shots,
      crits,
      bodies,
      optimalPattern: fmtPattern(crits, bodies),
    };

  } else {
    if (entry.shotDelay == null) return null;

    const body = entry.bodyDamage * modeScalar * multiplier;
    const crit = entry.critDamage  * modeScalar * multiplier;

    const found = findOptimalShots(body, crit, targetHp);
    if (!found) return null;
    const [shots, crits, bodies] = found;

    return {
      ttk: Math.round(ttkStandard(shots, entry.shotDelay) * 1000) / 1000,
      shotsToKill: shots,
      crits,
      bodies,
      optimalPattern: fmtPattern(crits, bodies),
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Minimal weapon fields needed for TTK lookup — subset of the `Weapon` type. */
export interface TTKWeaponInfo {
  itemSubType: number;
  ammoType: number;
  intrinsicTrait: { name: string } | null;
}

export function calculatePvpTTK(
  weapon: TTKWeaponInfo,
  guardianHp: number,
  multiplier: number,
): TTKResult | null {
  const entry = lookupWeaponStat(
    weapon.itemSubType,
    weapon.ammoType,
    weapon.intrinsicTrait?.name ?? null,
  );
  if (!entry) return null;
  return calcFromEntry(entry, guardianHp, multiplier, 'pvp');
}

export function calculatePveTTK(
  weapon: TTKWeaponInfo,
  enemyHp: number,
  multiplier: number,
): TTKResult | null {
  const entry = lookupWeaponStat(
    weapon.itemSubType,
    weapon.ammoType,
    weapon.intrinsicTrait?.name ?? null,
  );
  if (!entry) return null;
  return calcFromEntry(entry, enemyHp, multiplier, 'pve');
}

/**
 * Unified TTK entry point.
 *
 * @param mode         'pvp' | 'pve'
 * @param weapon       Weapon identity fields (itemSubType, ammoType, intrinsicTrait)
 * @param multiplier   Combined damage multiplier from active buffs / mods
 * @param pvpHp        Guardian HP for PvP (typically 230)
 * @param enemyHealth  Enemy HP tier for PvE
 */
export function calculateTTK(
  mode: GameMode,
  weapon: TTKWeaponInfo,
  multiplier: number,
  pvpHp: number,
  enemyHealth: number,
): TTKResult | null {
  if (mode === 'pvp') return calculatePvpTTK(weapon, pvpHp, multiplier);
  return calculatePveTTK(weapon, enemyHealth, multiplier);
}
