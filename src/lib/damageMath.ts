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

import { applyEffects, type WeaponEffects } from './weaponEffects';
import { GameMode } from '../types/weapon';
import { lookupWeaponStat, isChargeWeapon, isBurstWeapon, pveMultiplier, WeaponStatEntry } from './weaponStats';
import rawCombatantScalars from '../data/combatantScalars.json';
import { sheetSubType } from './subtypes';
import { roundTo3 } from './math';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * PvE enemies have ~3× the damage resistance relative to the spreadsheet's
 * PvP-calibrated damage values.  This scalar keeps existing PvE health tiers
 * (calibrated against the old archetype data) meaningful with the new numbers.
 */
const PVE_DAMAGE_SCALAR = 3.0;

/**
 * Per-archetype falloff floor — minimum damage fraction at maximum falloff
 * distance.  Defaults to 0.5 (50%).  Overrides are community-sourced.
 * itemSubType values match Bungie's DestinyItemSubType enum.
 */
export const FALLOFF_FLOORS: Partial<Record<number, number>> = {
  22: 0.85, // Linear Fusion Rifle — long-range precision frame, high damage floor
};

/** Returns the damage floor fraction for the given weapon subtype. */
export function getFalloffFloor(itemSubType: number): number {
  return FALLOFF_FLOORS[itemSubType] ?? 0.5;
}

/** PvE enemy health tiers used in the TTK panel selector. */
export const PVE_HEALTH_TIERS: Record<string, number> = {
  'Minor':         336,
  'Major / Elite': 1344,
  'Miniboss':      2500,
  'Boss':          4000,
  'Champion':      3024,
};

// ── Combatant scalar lookup ───────────────────────────────────────────────────

/**
 * Per-archetype PvE damage scalars sourced from MossyMax's Outgoing Damage
 * Scaling Spreadsheet.  Normalised so Major/Elite = 3.0 for every archetype,
 * so existing HP-tier calibration is preserved while each weapon type now
 * correctly varies in effectiveness across Boss / Minor / Champion tiers.
 */
const COMBATANT_SCALARS = rawCombatantScalars as Record<string, Record<string, number>>;

function getCombatantScalar(itemSubType: number, tier: string): number {
  const entry = COMBATANT_SCALARS[String(sheetSubType(itemSubType))];
  return entry?.[tier] ?? PVE_DAMAGE_SCALAR;
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface TTKResult {
  /** Seconds from the first trigger pull to the killing shot, including any reloads. */
  ttk: number;
  /** Reloads needed mid-kill (0 unless the kill takes more shots than the magazine holds). */
  reloads: number;
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
 * Find the minimum total shots to kill and the optimal head/body split.
 *
 * Algorithm: the minimum shot count is ceil(hp / critDmg) — assuming all
 * crits.  We then walk c downward from that minimum to find the maximum
 * number of bodies we can substitute while still killing in that same shot
 * count.  The first c where total damage drops below hp is one too few crits,
 * so we return the previous (still-valid) c.
 *
 * Returns [totalShots, crits, bodies] or null if critDmg <= 0.
 */
function findOptimalShots(
  bodyDmg: number,
  critDmg: number,
  targetHp: number,
): [shots: number, crits: number, bodies: number] | null {
  if (critDmg <= 0) return null;

  const minShots = Math.ceil(targetHp / critDmg);
  let optimalCrits  = minShots;
  let optimalBodies = 0;

  for (let c = minShots; c >= 0; c--) {
    const b      = minShots - c;
    const damage = c * critDmg + b * bodyDmg;
    if (damage >= targetHp) {
      optimalCrits  = c;
      optimalBodies = b;
    } else {
      break; // previous c was the minimum required crits
    }
  }

  return [minShots, optimalCrits, optimalBodies];
}

// ── TTK formulae ──────────────────────────────────────────────────────────────

/**
 * Standard / auto / semi-auto:
 *   shotDelay = inter-shot gap in 30fps frames
 *   TTK = (shots - 1) * shotDelay / 30
 */
function ttkStandard(shots: number, shotDelayFrames: number): number {
  return (shots - 1) * (shotDelayFrames / 30);
}

/**
 * Charge / draw weapons (Fusions, LFRs, Bows):
 *   chargeMs    = charge/draw time in ms
 *   shotDelay   = recovery gap between triggers in 30fps frames (none for bows)
 *
 * Like the WeaponStat Chart (its "pre-charge" setting, on by default) the first shot is assumed
 * to be charged / drawn before the fight starts, so only the follow-up shots pay for a fresh
 * charge:  TTK = (shots - 1) * (chargeMs/1000 + shotDelay/30)
 */
function ttkCharge(
  shots: number,
  chargeMs: number,
  shotDelayFrames: number | null,
): number {
  const gapSec = shotDelayFrames != null ? shotDelayFrames / 30 : 0;
  return (shots - 1) * (chargeMs / 1000 + gapSec);
}

/**
 * Burst weapons (Pulse Rifles, burst Sidearms/SMGs):
 *
 * MB spreadsheet naming is counter-intuitive:
 *   burstDelay  = intra-burst gap  (between consecutive bullets WITHIN a burst)
 *   shotDelay   = inter-burst gap  (from last bullet of burst N to first of N+1)
 *
 * One full burst cycle = (shotsPerBurst - 1) intra-burst gaps + 1 inter-burst gap:
 *   burstCycleFrames = (shotsPerBurst - 1) * burstDelayFrames + shotDelayFrames
 *
 * TTK:
 *   fullBursts     = floor((shots - 1) / shotsPerBurst)
 *   remainderShots = (shots - 1) % shotsPerBurst
 *   totalFrames    = fullBursts * burstCycleFrames + remainderShots * burstDelayFrames
 *   TTK            = totalFrames / 30
 */
function ttkBurst(
  shots: number,
  shotsPerBurst: number,
  burstDelayFrames: number,   // intra-burst (MB column: burst delay)
  shotDelayFrames: number,    // inter-burst (MB column: shot delay)
): number {
  const burstCycleFrames = (shotsPerBurst - 1) * burstDelayFrames + shotDelayFrames;
  const fullBursts       = Math.floor((shots - 1) / shotsPerBurst);
  const remainderShots   = (shots - 1) % shotsPerBurst;
  const totalFrames      = fullBursts * burstCycleFrames + remainderShots * burstDelayFrames;
  return totalFrames / 30;
}

// ── Core calculation ──────────────────────────────────────────────────────────

type TTKCalculator = (targetHp: number, effectiveMult: number, mode: GameMode, pveScalar: number) => TTKResult | null;

function getTtkCalculator(entry: WeaponStatEntry): TTKCalculator {
  if (isChargeWeapon(entry)) {
    return (targetHp, effectiveMult, mode, pveScalar) => {
      const modeScalar = mode === 'pve' ? pveScalar : 1.0;
      const finalMult = effectiveMult * modeScalar;
      const perTrigger = (entry.shotsPerBurst ?? 1) * (entry.pellets ?? 1);
      const body = entry.bodyDamage * perTrigger * finalMult;
      const crit = entry.critDamage * perTrigger * finalMult;
      const found = findOptimalShots(body, crit, targetHp);
      if (!found) return null;
      const [shots, crits, bodies] = found;
      return {
        ttk: roundTo3(ttkCharge(shots, entry.chargeMs!, entry.shotDelay)),
        reloads: 0,
        shotsToKill: shots,
        crits,
        bodies,
        optimalPattern: fmtPattern(crits, bodies),
      };
    };
  }

  if (isBurstWeapon(entry)) {
    return (targetHp, effectiveMult, mode, pveScalar) => {
      if (entry.burstDelay == null || entry.shotDelay == null) return null;
      const modeScalar = mode === 'pve' ? pveScalar : 1.0;
      const finalMult = effectiveMult * modeScalar;
      const perBullet = entry.pellets ?? 1;
      const body = entry.bodyDamage * perBullet * finalMult;
      const crit = entry.critDamage * perBullet * finalMult;
      const found = findOptimalShots(body, crit, targetHp);
      if (!found) return null;
      const [shots, crits, bodies] = found;
      return {
        ttk: roundTo3(ttkBurst(shots, entry.shotsPerBurst!, entry.burstDelay, entry.shotDelay)),
        reloads: 0,
        shotsToKill: shots,
        crits,
        bodies,
        optimalPattern: fmtPattern(crits, bodies),
      };
    };
  }

  return (targetHp, effectiveMult, mode, pveScalar) => {
    if (entry.shotDelay == null) return null;
    const modeScalar = mode === 'pve' ? pveScalar : 1.0;
    const finalMult = effectiveMult * modeScalar;
    const perTrigger = (entry.shotsPerBurst ?? 1) * (entry.pellets ?? 1);
    const body = entry.bodyDamage * perTrigger * finalMult;
    const crit = entry.critDamage * perTrigger * finalMult;
    const found = findOptimalShots(body, crit, targetHp);
    if (!found) return null;
    const [shots, crits, bodies] = found;
    return {
      ttk: roundTo3(ttkStandard(shots, entry.shotDelay)),
      reloads: 0,
      shotsToKill: shots,
      crits,
      bodies,
      optimalPattern: fmtPattern(crits, bodies),
    };
  };
}

function calcTTKCore(
  entry: WeaponStatEntry,
  targetHp: number,
  effectiveMultiplier: number,
  mode: GameMode,
  pveScalar = PVE_DAMAGE_SCALAR,
): TTKResult | null {
  return getTtkCalculator(entry)(targetHp, effectiveMultiplier, mode, pveScalar);
}

// ── Reloads ───────────────────────────────────────────────────────────────────

/** Magazine and reload speed, so a long kill can include the time spent reloading. */
export interface TTKAmmo {
  /** Rounds per magazine (the displayed Magazine stat). */
  magSize: number;
  /** Seconds per reload, or null when unknown (reloads are then ignored). */
  reloadSeconds: number | null;
}

/**
 * Add reload time to a kill that needs more shots than one magazine holds.
 * Every shot (a trigger pull, or each bullet of a burst) uses one round, so a kill of N shots
 * needs floor((N - 1) / magSize) reloads before the last shot.
 */
function withReloads(result: TTKResult, ammo: TTKAmmo | undefined): TTKResult {
  if (!ammo || ammo.reloadSeconds == null || ammo.magSize < 1) return result;
  const reloads = Math.floor((result.shotsToKill - 1) / Math.floor(ammo.magSize));
  if (reloads <= 0) return result;
  return { ...result, reloads, ttk: roundTo3(result.ttk + reloads * ammo.reloadSeconds) };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Minimal weapon fields needed for TTK lookup — subset of the `Weapon` type. */
export interface TTKWeaponInfo {
  itemSubType: number;
  ammoType: number;
  intrinsicTrait: { name: string } | null;
  /** Used to find an exotic's own stat row; the frame name alone can't. */
  baseName?: string;
  name?: string;
}

/**
 * Unified TTK entry point.
 *
 * @param mode         'pvp' | 'pve'
 * @param weapon       Weapon identity fields (itemSubType, ammoType, intrinsicTrait)
 * @param multiplier   Combined damage multiplier from active buffs / mods
 * @param pvpHp        Guardian HP for PvP (typically 230)
 * @param enemyTier    Key from PVE_HEALTH_TIERS (e.g. 'Minor', 'Boss') — ignored for pvp
 * @param ammo         Magazine + reload speed; when given, reloads needed mid-kill are included
 * @param effects      Timing / crit changes from active exotic traits
 */
export function calculateTTK(
  mode: GameMode,
  weapon: TTKWeaponInfo,
  multiplier: number,
  pvpHp: number,
  enemyTier: string,
  ammo?: TTKAmmo,
  effects?: WeaponEffects,
): TTKResult | null {
  const base = lookupWeaponStat(
    weapon.itemSubType,
    weapon.ammoType,
    weapon.intrinsicTrait?.name ?? null,
    weapon.baseName ?? weapon.name,
  );
  if (!base) return null;
  const entry = applyEffects(base, effects);
  const hp        = mode === 'pvp' ? pvpHp : (PVE_HEALTH_TIERS[enemyTier] ?? 336);
  const pveScalar = mode === 'pve' ? getCombatantScalar(weapon.itemSubType, enemyTier) * pveMultiplier(base, enemyTier) : 1.0;
  const result = calcTTKCore(entry, hp, multiplier, mode, pveScalar);
  return result ? withReloads(result, ammo) : null;
}

// ── TTK vs Distance (breakpoint visualization) ────────────────────────────────

export interface TTKBreakpoint {
  distance: number;
  ttk: number;
  reloads: number;
  shotsToKill: number;
  crits: number;
  bodies: number;
}

/**
 * Build a TTK-vs-distance curve showing breakpoint changes.
 *
 * Returns an array of points sampled across the falloff range.
 * Each point represents the TTK at that distance given the damage falloff fraction.
 *
 * @param falloffStart  Distance at which falloff begins (meters)
 * @param maxDist       Maximum distance to sample (meters)
 * @param falloffFloor  Minimum damage fraction at max distance (default 0.5)
 */
export function calculateTTKCurve(
  mode: GameMode,
  weapon: TTKWeaponInfo,
  multiplier: number,
  pvpHp: number,
  enemyTier: string,
  falloffStart: number,
  maxDist: number,
  falloffFloor = 0.5,
  ammo?: TTKAmmo,
  effects?: WeaponEffects,
): TTKBreakpoint[] {
  const base = lookupWeaponStat(
    weapon.itemSubType,
    weapon.ammoType,
    weapon.intrinsicTrait?.name ?? null,
    weapon.baseName ?? weapon.name,
  );
  if (!base) return [];
  const entry = applyEffects(base, effects);

  const hp        = mode === 'pvp' ? pvpHp : (PVE_HEALTH_TIERS[enemyTier] ?? 336);
  const pveScalar = mode === 'pve' ? getCombatantScalar(weapon.itemSubType, enemyTier) * pveMultiplier(base, enemyTier) : 1.0;
  const steps = 40;
  const result: TTKBreakpoint[] = [];
  const calc = getTtkCalculator(entry);

  for (let i = 0; i <= steps; i++) {
    const dist = (i / steps) * maxDist;
    let frac: number;
    if (dist <= falloffStart) {
      frac = 1.0;
    } else {
      const t = Math.min(1, (dist - falloffStart) / (maxDist - falloffStart));
      frac = 1.0 - (1.0 - falloffFloor) * t;
    }

    const raw = calc(hp, multiplier * frac, mode, pveScalar);
    const ttkResult = raw ? withReloads(raw, ammo) : null;
    if (ttkResult) {
      result.push({
        distance: dist,
        ttk: ttkResult.ttk,
        reloads: ttkResult.reloads,
        shotsToKill: ttkResult.shotsToKill,
        crits: ttkResult.crits,
        bodies: ttkResult.bodies,
      });
    }
  }

  return result;
}
