// DPS calculation using weaponStats timing data and reloadTimes formulas.

import { lookupWeaponStat, isChargeWeapon, isBurstWeapon, pveMultiplier } from './weaponStats';
import { calcReloadTime } from './reloadTimes';
import rawCombatantScalars from '../data/combatantScalars.json';
import { sheetSubType } from './subtypes';
import { applyEffects, type WeaponEffects } from './weaponEffects';

export interface DpsResult {
  /** Continuous fire, all-crit (PvP damage). */
  optimalDpsPvp: number;
  /** Mag + reload cycle, all-crit (PvP damage). */
  sustainedDpsPvp: number;
  optimalDpsPve: number;
  sustainedDpsPve: number;
  bodyDamage: number;
  critDamage: number;
  /** Projectiles per trigger pull (>1 for burst/fusion/pellet shotgun). */
  burstSize: number;
  reloadMs: number | null;
  magSize: number;
  /** RPM derived from timing data. */
  rpm: number;
}

const COMBATANT_SCALARS = rawCombatantScalars as Record<string, Record<string, number>>;
const FALLBACK_PVE_SCALAR = 3.0;

function getPveScalar(itemSubType: number, enemyTier: string): number {
  return COMBATANT_SCALARS[String(sheetSubType(itemSubType))]?.[enemyTier] ?? FALLBACK_PVE_SCALAR;
}

export function calcDps(
  itemSubType: number,
  ammoType: number,
  intrinsicName: string | null,
  itemTypeDisplayName: string,
  reloadStat: number,
  magStat: number,
  enemyTier = 'Major / Elite',
  effects?: WeaponEffects,
  weaponName?: string,
  /** Damage multiplier from buffs, mods, surge and the weapons stat, per mode (1 = no change). */
  damageMult: { pvp: number; pve: number } = { pvp: 1, pve: 1 },
): DpsResult | null {
  const base = lookupWeaponStat(itemSubType, ammoType, intrinsicName, weaponName);
  if (!base) return null;
  const entry = applyEffects(base, effects);

  const burstSize = entry.shotsPerBurst ?? 1;
  const pellets   = entry.pellets ?? 1; // projectiles per bullet (shotgun pellets, fusion bolts)
  const reloadMs  = calcReloadTime(itemTypeDisplayName, ammoType, reloadStat);
  const magSize   = Math.max(1, Math.round(magStat));

  // ── Time per trigger pull (seconds) ────────────────────────────────────────
  let timePerShot_s: number;

  if (isChargeWeapon(entry)) {
    const chargeS   = (entry.chargeMs ?? 500) / 1000;
    // Every trigger pull needs a fresh charge/draw, plus the recovery gap (none for bows).
    const betweenS  = entry.shotDelay != null ? entry.shotDelay / 30 : 0;
    timePerShot_s   = chargeS + betweenS;
  } else if (isBurstWeapon(entry)) {
    const intra  = entry.burstDelay ?? 1;
    const inter  = entry.shotDelay  ?? 1;
    const cycleF = (burstSize - 1) * intra + inter;
    timePerShot_s = cycleF / 30;
  } else {
    timePerShot_s = (entry.shotDelay ?? 30) / 30;
  }

  const rpm = Math.round(60 / timePerShot_s);

  // ── Optimal DPS (continuous fire, all crits) ───────────────────────────────
  const pveScalar      = getPveScalar(itemSubType, enemyTier) * pveMultiplier(base, enemyTier);
  const critPerTrigger = entry.critDamage * burstSize * pellets;
  const optimalDpsPvp  = critPerTrigger * damageMult.pvp / timePerShot_s;
  const optimalDpsPve  = critPerTrigger * damageMult.pve / timePerShot_s * pveScalar;

  // ── Sustained DPS (mag + reload) ───────────────────────────────────────────
  let magDuration_s: number;

  if (isChargeWeapon(entry)) {
    const chargeS  = (entry.chargeMs ?? 500) / 1000;
    const betweenS = entry.shotDelay != null ? entry.shotDelay / 30 : 0; // bows have no recovery gap
    // First shot: just charge. Subsequent shots: charge + gap between shots.
    magDuration_s = chargeS + (magSize - 1) * (chargeS + betweenS);
  } else {
    magDuration_s = (magSize - 1) * timePerShot_s;
  }

  const totalDmg       = magSize * critPerTrigger;
  const reloadS        = reloadMs != null ? reloadMs / 1000 : 2.0;
  // The next shot can never come sooner than one shot delay after the last, so a reload shorter than
  // that gap (shotguns, snipers at high Reload) cannot make the cycle shorter than the mag at full rate.
  const cycleTime_s    = Math.max(magDuration_s + reloadS, magSize * timePerShot_s);
  const sustainedDpsPvp = totalDmg * damageMult.pvp / cycleTime_s;
  const sustainedDpsPve = totalDmg * damageMult.pve / cycleTime_s * pveScalar;

  return {
    optimalDpsPvp:  Math.round(optimalDpsPvp),
    sustainedDpsPvp: Math.round(sustainedDpsPvp),
    optimalDpsPve:  Math.round(optimalDpsPve),
    sustainedDpsPve: Math.round(sustainedDpsPve),
    bodyDamage:  Math.round(entry.bodyDamage  * burstSize * pellets * 100) / 100,
    critDamage:  Math.round(entry.critDamage  * burstSize * pellets * 100) / 100,
    burstSize,
    reloadMs,
    magSize,
    rpm,
  };
}
